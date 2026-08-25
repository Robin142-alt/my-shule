import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { RequestContextService } from '../../common/request-context/request-context.service';
import { PrismaService } from '../../database/prisma.service';
import { AdminCommandOperationsService } from './admin-command-operations.service';

@Injectable()
export class IctManagerCommandService {
  constructor(
    private readonly requestContext: RequestContextService,
    private readonly prisma: PrismaService,
    private readonly operations: AdminCommandOperationsService,
  ) {}

  private requireTenantId(): string {
    const tenantId = this.requestContext.getStore()?.tenant_id;
    if (!tenantId) {
      throw new UnauthorizedException('Tenant context is required');
    }
    return tenantId;
  }

  private async executeSql<T = any>(query: string, params: any[] = []): Promise<{ rows: T[], rowCount: number }> {
    return this.prisma.query<T>(query, params);
  }

  private requireUuid(value: unknown, label: string): string {
    const normalized = this.operations.uuidOrNull(value);
    if (!normalized) {
      throw new BadRequestException(`${label} is required`);
    }
    return normalized;
  }

  private async recordMutation(
    action: string,
    entityType: string,
    entityId: string,
    record: unknown,
    message: string,
  ) {
    const tenantId = this.requireTenantId();
    const userId = this.requestContext.getStore()?.user_id ?? null;
    await this.operations.recordAudit(tenantId, action, entityType, entityId, { record }, userId);
    await this.operations.notifyRoles(tenantId, {
      key: `${action.replace(/[^a-z0-9]+/gi, '-')}-${entityId}`,
      type: action,
      title: message,
      body: message,
      targetRoles: ['ict_manager', 'principal', 'system_monitor'],
      metadata: { entityType, entityId, record },
    });
  }

  async getOverview() {
    const tenantId = this.requireTenantId();
    const metrics = await this.executeSql<{
      total_assets: number;
      issues_open: number;
      loans_active: number;
      maintenance_due: number;
    }>(`
      SELECT
        (SELECT COUNT(*)::int FROM assets WHERE tenant_id = $1) AS total_assets,
        (SELECT COUNT(*)::int FROM facility_issues WHERE tenant_id = $1 AND lower(status) IN ('open', 'reported', 'in_progress')) AS issues_open,
        (SELECT COUNT(*)::int FROM asset_assignments WHERE tenant_id = $1 AND assigned_to_type = 'loan' AND lower(status) = 'active') AS loans_active,
        (SELECT COUNT(*)::int FROM asset_repairs WHERE tenant_id = $1 AND lower(repair_status) IN ('open', 'scheduled', 'in_progress')) AS maintenance_due
    `, [tenantId]);

    const row = metrics.rows[0] ?? { total_assets: 0, issues_open: 0, loans_active: 0, maintenance_due: 0 };
    return {
      metrics: row,
      overviewList: [
        { id: 'total-assets', metric: 'Total assets', value: String(row.total_assets) },
        { id: 'issues-open', metric: 'Open facility issues', value: String(row.issues_open) },
        { id: 'loans-active', metric: 'Active loans', value: String(row.loans_active) },
        { id: 'maintenance-due', metric: 'Maintenance due', value: String(row.maintenance_due) },
      ],
    };
  }

  async getAssets() {
    const tenantId = this.requireTenantId();
    const [summary, assets] = await Promise.all([
      this.executeSql<{ total_assets: number; active: number; in_repair: number; disposed: number }>(`
        SELECT
          COUNT(*)::int AS total_assets,
          COUNT(*) FILTER (WHERE lower(status) IN ('active', 'available', 'assigned'))::int AS active,
          COUNT(*) FILTER (WHERE lower(status) IN ('in_repair', 'faulty'))::int AS in_repair,
          COUNT(*) FILTER (WHERE lower(status) IN ('disposed', 'retired'))::int AS disposed
        FROM assets
        WHERE tenant_id = $1
      `, [tenantId]),
      this.executeSql<{
        id: string;
        asset_name: string;
        asset_tag: string;
        category: string;
        location: string;
        purchase_date: string;
        status: string;
      }>(`
        SELECT
          id::text,
          title AS asset_name,
          COALESCE(NULLIF(metadata->>'asset_tag', ''), '') AS asset_tag,
          COALESCE(category, '') AS category,
          COALESCE(NULLIF(metadata->>'location', ''), NULLIF(owner_name, ''), '') AS location,
          COALESCE(NULLIF(metadata->>'purchase_date', ''), created_at::date::text) AS purchase_date,
          INITCAP(REPLACE(status, '_', ' ')) AS status
        FROM assets
        WHERE tenant_id = $1
        ORDER BY title ASC
      `, [tenantId]),
    ]);
    return {
      metrics: summary.rows[0] ?? { total_assets: 0, active: 0, in_repair: 0, disposed: 0 },
      assetsList: assets.rows,
    };
  }

  async getAssetAssignment() {
    const tenantId = this.requireTenantId();
    const [summary, assignments] = await Promise.all([
      this.executeSql<{ assigned: number; unassigned: number; pending_return: number }>(`
        SELECT
          (SELECT COUNT(DISTINCT asset_id)::int FROM asset_assignments WHERE tenant_id = $1 AND lower(status) = 'active') AS assigned,
          (
            SELECT COUNT(*)::int FROM assets asset
            WHERE asset.tenant_id = $1
              AND NOT EXISTS (
                SELECT 1 FROM asset_assignments assignment
                WHERE assignment.tenant_id = asset.tenant_id
                  AND assignment.asset_id = asset.id
                  AND lower(assignment.status) = 'active'
              )
          ) AS unassigned,
          (SELECT COUNT(*)::int FROM asset_assignments WHERE tenant_id = $1 AND lower(status) = 'active' AND due_at < NOW()) AS pending_return
      `, [tenantId]),
      this.executeSql<{
        id: string;
        asset_name: string;
        asset_tag: string;
        assigned_to: string;
        department: string;
        assigned_date: string;
        status: string;
      }>(`
        SELECT
          assignment.id::text,
          asset.title AS asset_name,
          COALESCE(NULLIF(asset.metadata->>'asset_tag', ''), '') AS asset_tag,
          COALESCE(NULLIF(assignment.assigned_to_name, ''), NULLIF(assignee.full_name, ''), assignment.assigned_to_id::text, '') AS assigned_to,
          COALESCE(assignment.department, '') AS department,
          assignment.assigned_at::text AS assigned_date,
          INITCAP(REPLACE(assignment.status, '_', ' ')) AS status
        FROM asset_assignments assignment
        INNER JOIN assets asset
          ON asset.tenant_id = assignment.tenant_id
         AND asset.id = assignment.asset_id
        LEFT JOIN users assignee
          ON assignee.id = assignment.assigned_to_id
         AND EXISTS (
           SELECT 1 FROM tenant_memberships membership
           WHERE membership.tenant_id = assignment.tenant_id
             AND membership.user_id = assignee.id
         )
        WHERE assignment.tenant_id = $1
          AND assignment.assigned_to_type <> 'loan'
        ORDER BY assignment.assigned_at DESC
      `, [tenantId]),
    ]);
    return {
      metrics: summary.rows[0] ?? { assigned: 0, unassigned: 0, pending_return: 0 },
      assetassignmentList: assignments.rows,
    };
  }

  async getLoansReturns() {
    const tenantId = this.requireTenantId();
    const [summary, loans] = await Promise.all([
      this.executeSql<{ on_loan: number; returned_today: number; overdue: number }>(`
        SELECT
          COUNT(*) FILTER (WHERE lower(status) = 'active')::int AS on_loan,
          COUNT(*) FILTER (WHERE returned_at::date = CURRENT_DATE)::int AS returned_today,
          COUNT(*) FILTER (WHERE lower(status) = 'active' AND due_at < NOW())::int AS overdue
        FROM asset_assignments
        WHERE tenant_id = $1
          AND assigned_to_type = 'loan'
      `, [tenantId]),
      this.executeSql<{
        id: string;
        asset_name: string;
        loaned_to: string;
        loan_date: string;
        due_date: string;
        return_date: string;
        status: string;
      }>(`
        SELECT
          loan.id::text,
          asset.title AS asset_name,
          COALESCE(NULLIF(loan.assigned_to_name, ''), NULLIF(borrower.full_name, ''), loan.assigned_to_id::text, '') AS loaned_to,
          loan.assigned_at::text AS loan_date,
          COALESCE(loan.due_at::text, '') AS due_date,
          COALESCE(loan.returned_at::text, '') AS return_date,
          CASE
            WHEN lower(loan.status) = 'active' AND loan.due_at < NOW() THEN 'Overdue'
            ELSE INITCAP(REPLACE(loan.status, '_', ' '))
          END AS status
        FROM asset_assignments loan
        INNER JOIN assets asset
          ON asset.tenant_id = loan.tenant_id
         AND asset.id = loan.asset_id
        LEFT JOIN users borrower
          ON borrower.id = loan.assigned_to_id
         AND EXISTS (
           SELECT 1 FROM tenant_memberships membership
           WHERE membership.tenant_id = loan.tenant_id
             AND membership.user_id = borrower.id
         )
        WHERE loan.tenant_id = $1
          AND loan.assigned_to_type = 'loan'
        ORDER BY loan.assigned_at DESC
      `, [tenantId]),
    ]);
    return {
      metrics: summary.rows[0] ?? { on_loan: 0, returned_today: 0, overdue: 0 },
      loansreturnsList: loans.rows,
    };
  }

  async getMaintenance() {
    const tenantId = this.requireTenantId();
    const [summary, maintenance] = await Promise.all([
      this.executeSql<{ scheduled: number; in_progress: number; completed_this_month: number }>(`
        SELECT
          COUNT(*) FILTER (WHERE lower(repair_status) IN ('open', 'scheduled'))::int AS scheduled,
          COUNT(*) FILTER (WHERE lower(repair_status) = 'in_progress')::int AS in_progress,
          COUNT(*) FILTER (
            WHERE lower(repair_status) = 'completed'
              AND completed_at >= date_trunc('month', CURRENT_DATE)
          )::int AS completed_this_month
        FROM asset_repairs
        WHERE tenant_id = $1
      `, [tenantId]),
      this.executeSql<{
        id: string;
        asset_name: string;
        type: string;
        technician: string;
        scheduled_date: string;
        completed_date: string;
        status: string;
      }>(`
        SELECT
          repair.id::text,
          COALESCE(asset.title, 'Unlinked asset') AS asset_name,
          repair.issue_title AS type,
          COALESCE(repair.technician, '') AS technician,
          COALESCE(repair.scheduled_for::text, repair.created_at::date::text) AS scheduled_date,
          COALESCE(repair.completed_at::text, '') AS completed_date,
          INITCAP(REPLACE(repair.repair_status, '_', ' ')) AS status
        FROM asset_repairs repair
        LEFT JOIN assets asset
          ON asset.tenant_id = repair.tenant_id
         AND asset.id = repair.asset_id
        WHERE repair.tenant_id = $1
        ORDER BY repair.created_at DESC
      `, [tenantId]),
    ]);
    return {
      metrics: summary.rows[0] ?? { scheduled: 0, in_progress: 0, completed_this_month: 0 },
      maintenanceList: maintenance.rows,
    };
  }

  async getFacilitiesIssues() {
    const tenantId = this.requireTenantId();
    const [summary, issues] = await Promise.all([
      this.executeSql<{ open_issues: number; resolved_today: number; critical: number }>(`
        SELECT
          COUNT(*) FILTER (WHERE lower(status) IN ('open', 'reported', 'in_progress'))::int AS open_issues,
          COUNT(*) FILTER (WHERE lower(status) = 'resolved' AND resolved_at::date = CURRENT_DATE)::int AS resolved_today,
          COUNT(*) FILTER (WHERE lower(priority) = 'critical' AND lower(status) <> 'resolved')::int AS critical
        FROM facility_issues
        WHERE tenant_id = $1
      `, [tenantId]),
      this.executeSql<{
        id: string;
        title: string;
        location: string;
        reported_by: string;
        date: string;
        priority: string;
        status: string;
      }>(`
        SELECT
          issue.id::text,
          issue.title,
          issue.location,
          COALESCE(NULLIF(issue.reported_by_name, ''), NULLIF(reporter.full_name, ''), '') AS reported_by,
          issue.created_at::text AS date,
          INITCAP(REPLACE(issue.priority, '_', ' ')) AS priority,
          INITCAP(REPLACE(issue.status, '_', ' ')) AS status
        FROM facility_issues issue
        LEFT JOIN users reporter
          ON reporter.id = issue.reported_by_user_id
         AND EXISTS (
           SELECT 1 FROM tenant_memberships membership
           WHERE membership.tenant_id = issue.tenant_id
             AND membership.user_id = reporter.id
         )
        WHERE issue.tenant_id = $1
        ORDER BY issue.created_at DESC
      `, [tenantId]),
    ]);
    return {
      metrics: summary.rows[0] ?? { open_issues: 0, resolved_today: 0, critical: 0 },
      facilitiesissuesList: issues.rows,
    };
  }

  async getOptions() {
    const tenantId = this.requireTenantId();
    const [assets, staff] = await Promise.all([
      this.executeSql<{ id: string; label: string }>(`
        SELECT
          id::text,
          CONCAT_WS(' - ', NULLIF(title, ''), NULLIF(metadata->>'asset_tag', '')) AS label
        FROM assets
        WHERE tenant_id = $1
          AND lower(status) NOT IN ('disposed', 'retired')
        ORDER BY title ASC
        LIMIT 500
      `, [tenantId]),
      this.executeSql<{ id: string; label: string }>(`
        SELECT DISTINCT user_account.id::text, user_account.full_name AS label
        FROM tenant_memberships membership
        INNER JOIN users user_account ON user_account.id = membership.user_id
        WHERE membership.tenant_id = $1
          AND lower(membership.status::text) = 'active'
        ORDER BY user_account.full_name ASC
        LIMIT 500
      `, [tenantId]),
    ]);
    return { assets: assets.rows, staff: staff.rows };
  }

  async createAsset(dto: any) {
    const tenantId = this.requireTenantId();
    const userId = this.operations.uuidOrNull(this.requestContext.getStore()?.user_id);
    const title = this.operations.requiredText(dto?.asset_name ?? dto?.name ?? dto?.title, 'Asset name');
    const category = this.operations.requiredText(dto?.category ?? 'ict', 'Asset category');
    const assetTag = String(dto?.asset_tag ?? dto?.assetTag ?? '').trim();
    const location = String(dto?.location ?? '').trim();
    const purchaseDate = String(dto?.purchase_date ?? dto?.purchaseDate ?? '').trim();
    const status = String(dto?.status ?? 'available').trim().toLowerCase();
    if (!['available', 'active', 'assigned', 'in_repair', 'faulty', 'disposed', 'retired'].includes(status)) {
      throw new BadRequestException('Asset status is invalid');
    }
    if (purchaseDate && Number.isNaN(Date.parse(purchaseDate))) {
      throw new BadRequestException('Purchase date is invalid');
    }
    const result = await this.operations.writeSql(`
      WITH tag_lock AS (
        SELECT pg_advisory_xact_lock(hashtext($1 || ':' || $8))
      ), created AS (
        INSERT INTO assets (
          tenant_id, title, category, status, notes, metadata, created_by_user_id
        )
        SELECT $1, $2, $3, $4, $5, $6::jsonb, $7::uuid
        FROM tag_lock
        WHERE $8 = ''
           OR NOT EXISTS (
             SELECT 1 FROM assets existing
             WHERE existing.tenant_id = $1
               AND lower(existing.metadata->>'asset_tag') = lower($8)
           )
        RETURNING *
      )
      SELECT * FROM created
    `, [
      tenantId,
      title,
      category,
      status,
      String(dto?.notes ?? '').trim() || null,
      JSON.stringify({ asset_tag: assetTag || null, location: location || null, purchase_date: purchaseDate || null }),
      userId,
      assetTag,
    ]);
    const asset = result.rows[0] as any;
    if (!asset) throw new BadRequestException('An asset with this tag already exists in this school');
    await this.recordMutation('ict.asset_created', 'asset', asset.id, asset, `${title} was added to the ICT asset register.`);
    return { success: true, message: 'ICT asset created', asset };
  }

  private async createAssignment(dto: any, assignmentType: 'assigned' | 'loan') {
    const tenantId = this.requireTenantId();
    const assetId = this.requireUuid(dto?.asset_id ?? dto?.assetId, 'Asset');
    const assigneeId = this.requireUuid(dto?.assigned_to_id ?? dto?.assignedToId ?? dto?.borrower_id ?? dto?.borrowerId, 'Assignee');
    const dueAt = String(dto?.due_at ?? dto?.dueDate ?? '').trim();
    if (assignmentType === 'loan' && (!dueAt || Number.isNaN(Date.parse(dueAt)))) {
      throw new BadRequestException('A valid loan due date is required');
    }
    const result = await this.operations.writeSql(`
      WITH eligible_asset AS (
        SELECT id FROM assets
        WHERE tenant_id = $1 AND id = $2::uuid
      ), eligible_assignee AS (
        SELECT user_account.id, user_account.full_name
        FROM users user_account
        INNER JOIN tenant_memberships membership
          ON membership.user_id = user_account.id
         AND membership.tenant_id = $1
         AND lower(membership.status::text) = 'active'
        WHERE user_account.id = $3::uuid
      ), created AS (
        INSERT INTO asset_assignments (
          tenant_id, asset_id, assigned_to_type, assigned_to_id, assigned_to_name,
          department, status, assigned_at, due_at, notes
        )
        SELECT $1, eligible_asset.id, $8, eligible_assignee.id,
               COALESCE(NULLIF($4, ''), eligible_assignee.full_name), NULLIF($5, ''),
               'active', NOW(), NULLIF($6, '')::timestamptz, NULLIF($7, '')
        FROM eligible_asset CROSS JOIN eligible_assignee
        WHERE NOT EXISTS (
          SELECT 1 FROM asset_assignments existing
          WHERE existing.tenant_id = $1
            AND existing.asset_id = eligible_asset.id
            AND lower(existing.status) = 'active'
        )
        RETURNING *
      ), updated_asset AS (
        UPDATE assets asset
        SET status = 'assigned', updated_at = NOW()
        WHERE asset.tenant_id = $1
          AND asset.id = $2::uuid
          AND EXISTS (SELECT 1 FROM created)
        RETURNING asset.title
      )
      SELECT created.*, updated_asset.title AS asset_name
      FROM created CROSS JOIN updated_asset
    `, [
      tenantId,
      assetId,
      assigneeId,
      String(dto?.assigned_to_name ?? dto?.assignedToName ?? dto?.borrower_name ?? '').trim(),
      String(dto?.department ?? '').trim(),
      dueAt,
      String(dto?.notes ?? '').trim(),
      assignmentType,
    ]);
    const assignment = result.rows[0] as any;
    if (!assignment) {
      throw new BadRequestException('Asset or assignee is unavailable in this school, or the asset is already assigned');
    }
    const action = assignmentType === 'loan' ? 'ict.asset_loaned' : 'ict.asset_assigned';
    await this.recordMutation(action, 'asset_assignment', assignment.id, assignment, `${assignment.asset_name} was ${assignmentType === 'loan' ? 'loaned' : 'assigned'}.`);
    return { success: true, message: assignmentType === 'loan' ? 'Asset loan recorded' : 'Asset assignment recorded', assignment };
  }

  assignAsset(dto: any) {
    return this.createAssignment(dto, 'assigned');
  }

  createLoan(dto: any) {
    return this.createAssignment(dto, 'loan');
  }

  private async closeAssignment(id: string, expectedType?: 'loan') {
    const tenantId = this.requireTenantId();
    const assignmentId = this.requireUuid(id, 'Assignment');
    const result = await this.operations.writeSql(`
      WITH closed AS (
        UPDATE asset_assignments
        SET status = 'returned', returned_at = NOW(), updated_at = NOW()
        WHERE tenant_id = $1
          AND id = $2::uuid
          AND lower(status) = 'active'
          AND ($3 = '' OR assigned_to_type = $3)
        RETURNING *
      ), updated_asset AS (
        UPDATE assets asset
        SET status = 'available', updated_at = NOW()
        WHERE asset.tenant_id = $1
          AND asset.id = (SELECT asset_id FROM closed)
          AND NOT EXISTS (
            SELECT 1 FROM asset_assignments active_assignment
            WHERE active_assignment.tenant_id = asset.tenant_id
              AND active_assignment.asset_id = asset.id
              AND active_assignment.id <> $2::uuid
              AND lower(active_assignment.status) = 'active'
          )
        RETURNING asset.title
      )
      SELECT closed.*, COALESCE(updated_asset.title, asset.title) AS asset_name
      FROM closed
      INNER JOIN assets asset ON asset.tenant_id = $1 AND asset.id = closed.asset_id
      LEFT JOIN updated_asset ON TRUE
    `, [tenantId, assignmentId, expectedType ?? '']);
    const assignment = result.rows[0] as any;
    if (!assignment) throw new BadRequestException('Active asset assignment was not found in this school');
    const action = expectedType === 'loan' ? 'ict.asset_loan_returned' : 'ict.asset_assignment_revoked';
    await this.recordMutation(action, 'asset_assignment', assignment.id, assignment, `${assignment.asset_name} was returned to ICT inventory.`);
    return { success: true, message: 'Asset return recorded', assignment };
  }

  revokeAssetAssignment(id: string) {
    return this.closeAssignment(id);
  }

  returnLoan(id: string) {
    return this.closeAssignment(id, 'loan');
  }

  async createMaintenance(dto: any) {
    const tenantId = this.requireTenantId();
    const assetId = this.requireUuid(dto?.asset_id ?? dto?.assetId, 'Asset');
    const issueTitle = this.operations.requiredText(dto?.type ?? dto?.issue_title ?? dto?.title, 'Maintenance issue');
    const scheduledFor = String(dto?.scheduled_date ?? dto?.scheduledFor ?? '').trim();
    if (scheduledFor && Number.isNaN(Date.parse(scheduledFor))) {
      throw new BadRequestException('Scheduled date is invalid');
    }
    const result = await this.operations.writeSql(`
      WITH created AS (
        INSERT INTO asset_repairs (
          tenant_id, asset_id, issue_title, repair_status, technician, scheduled_for, notes
        )
        SELECT $1, asset.id, $3, 'scheduled', NULLIF($4, ''), NULLIF($5, '')::date, NULLIF($6, '')
        FROM assets asset
        WHERE asset.tenant_id = $1 AND asset.id = $2::uuid
        RETURNING *
      ), updated_asset AS (
        UPDATE assets asset
        SET status = 'in_repair', updated_at = NOW()
        WHERE asset.tenant_id = $1
          AND asset.id = $2::uuid
          AND EXISTS (SELECT 1 FROM created)
        RETURNING asset.title
      )
      SELECT created.*, updated_asset.title AS asset_name
      FROM created CROSS JOIN updated_asset
    `, [
      tenantId,
      assetId,
      issueTitle,
      String(dto?.technician ?? '').trim(),
      scheduledFor,
      String(dto?.notes ?? '').trim(),
    ]);
    const maintenance = result.rows[0] as any;
    if (!maintenance) throw new BadRequestException('Asset was not found in this school');
    await this.recordMutation('ict.maintenance_scheduled', 'asset_repair', maintenance.id, maintenance, `Maintenance was scheduled for ${maintenance.asset_name}.`);
    return { success: true, message: 'Maintenance scheduled', maintenance };
  }

  async completeMaintenance(id: string, dto: any = {}) {
    const tenantId = this.requireTenantId();
    const repairId = this.requireUuid(id, 'Maintenance record');
    const result = await this.operations.writeSql(`
      WITH completed AS (
        UPDATE asset_repairs
        SET repair_status = 'completed', completed_at = NOW(),
            notes = COALESCE(NULLIF($3, ''), notes), updated_at = NOW()
        WHERE tenant_id = $1
          AND id = $2::uuid
          AND lower(repair_status) <> 'completed'
        RETURNING *
      ), updated_asset AS (
        UPDATE assets asset
        SET status = 'available', updated_at = NOW()
        WHERE asset.tenant_id = $1
          AND asset.id = (SELECT asset_id FROM completed)
          AND NOT EXISTS (
            SELECT 1 FROM asset_repairs other_repair
            WHERE other_repair.tenant_id = asset.tenant_id
              AND other_repair.asset_id = asset.id
              AND other_repair.id <> $2::uuid
              AND lower(other_repair.repair_status) IN ('open', 'scheduled', 'in_progress')
          )
        RETURNING asset.title
      )
      SELECT completed.*, COALESCE(updated_asset.title, asset.title) AS asset_name
      FROM completed
      INNER JOIN assets asset ON asset.tenant_id = $1 AND asset.id = completed.asset_id
      LEFT JOIN updated_asset ON TRUE
    `, [tenantId, repairId, String(dto?.notes ?? dto?.resolution ?? '').trim()]);
    const maintenance = result.rows[0] as any;
    if (!maintenance) throw new BadRequestException('Open maintenance record was not found in this school');
    await this.recordMutation('ict.maintenance_completed', 'asset_repair', maintenance.id, maintenance, `Maintenance was completed for ${maintenance.asset_name}.`);
    return { success: true, message: 'Maintenance completed', maintenance };
  }

  async createFacilityIssue(dto: any) {
    const tenantId = this.requireTenantId();
    const userId = this.operations.uuidOrNull(this.requestContext.getStore()?.user_id);
    const title = this.operations.requiredText(dto?.title, 'Issue title');
    const location = this.operations.requiredText(dto?.location, 'Issue location');
    const priority = String(dto?.priority ?? 'normal').trim().toLowerCase();
    if (!['low', 'normal', 'high', 'critical'].includes(priority)) {
      throw new BadRequestException('Issue priority is invalid');
    }
    const result = await this.operations.writeSql(`
      INSERT INTO facility_issues (
        tenant_id, title, description, location, reported_by_user_id, reported_by_name, priority, status
      )
      VALUES ($1, $2, $3, $4, $5::uuid, $6, $7, 'open')
      RETURNING *
    `, [
      tenantId,
      title,
      String(dto?.description ?? dto?.notes ?? '').trim() || null,
      location,
      userId,
      String(dto?.reported_by ?? dto?.reportedBy ?? '').trim() || null,
      priority,
    ]);
    const issue = result.rows[0] as any;
    await this.recordMutation('ict.facility_issue_reported', 'facility_issue', issue.id, issue, `${title} was reported at ${location}.`);
    return { success: true, message: 'Facility issue reported', issue };
  }

  async resolveFacilityIssue(id: string, dto: any = {}) {
    const tenantId = this.requireTenantId();
    const issueId = this.requireUuid(id, 'Facility issue');
    const result = await this.operations.writeSql(`
      UPDATE facility_issues
      SET status = 'resolved', resolved_at = NOW(), resolution_notes = NULLIF($3, ''), updated_at = NOW()
      WHERE tenant_id = $1
        AND id = $2::uuid
        AND lower(status) <> 'resolved'
      RETURNING *
    `, [tenantId, issueId, String(dto?.notes ?? dto?.resolution ?? '').trim()]);
    const issue = result.rows[0] as any;
    if (!issue) throw new BadRequestException('Open facility issue was not found in this school');
    await this.recordMutation('ict.facility_issue_resolved', 'facility_issue', issue.id, issue, `${issue.title} was resolved.`);
    return { success: true, message: 'Facility issue resolved', issue };
  }

  async getReports() {
    const tenantId = this.requireTenantId();
    const reports = await this.operations.listReportSnapshots(tenantId, 'ict-manager-command');
    return {
      metrics: { reports_generated: reports.length },
      reportsList: reports.map((report: any) => ({
        id: report.id ?? report.snapshotId,
        title: report.reportName,
        generated_at: report.generatedDate,
        type: report.type,
        status: report.status,
      })),
    };
  }

  async generateReport(dto: any) {
    const tenantId = this.requireTenantId();
    const userId = this.operations.uuidOrNull(this.requestContext.getStore()?.user_id);
    const [overview, assets, assetAssignment, loansReturns, maintenance, facilitiesIssues] = await Promise.all([
      this.getOverview(),
      this.getAssets(),
      this.getAssetAssignment(),
      this.getLoansReturns(),
      this.getMaintenance(),
      this.getFacilitiesIssues(),
    ]);
    return this.operations.generateReportSnapshot({
      tenantId,
      module: 'ict-manager-command',
      reportId: 'ict-operations',
      title: String(dto?.name || dto?.title || 'ICT operations report'),
      format: dto?.format,
      generatedByUserId: userId,
      sections: { overview, assets, assetAssignment, loansReturns, maintenance, facilitiesIssues },
      filters: { requested_from: 'ict-manager-dashboard' },
      targetRoles: ['principal', 'ict_manager', 'system_monitor'],
    });
  }

  async downloadReport(id: string) {
    const tenantId = this.requireTenantId();
    const result = await this.operations.readSql(`
      SELECT snapshot_id AS "snapshotId", title, format, artifact, manifest, created_at::text AS "generatedDate"
      FROM report_snapshots
      WHERE tenant_id = $1
        AND module = 'ict-manager-command'
        AND (id::text = $2 OR snapshot_id = $2)
      LIMIT 1
    `, [tenantId, this.operations.requiredText(id, 'Report ID')]);
    const report = result.rows[0];
    if (!report) throw new NotFoundException('ICT report was not found in this school');
    return { success: true, message: 'Report artifact ready', report };
  }

  async manageAsset(id: string, dto: any = {}) {
    const tenantId = this.requireTenantId();
    const assetId = String(id || dto?.asset_id || dto?.id || '').trim();
    if (!assetId) {
      throw new BadRequestException('ICT asset id is required');
    }

    const action = String(dto?.action || 'Review asset').trim();
    const condition = String(dto?.condition || '').trim() || null;
    const notes = String(dto?.notes || dto?.description || '').trim();
    const priority = condition === 'faulty' || condition === 'needs_maintenance' || /maintenance|repair|replace/i.test(action)
      ? 'high'
      : 'normal';

    return this.operations.recordWorkflowAction({
      tenantId,
      actorUserId: this.requestContext.getStore()?.user_id,
      sourceRole: 'ict_manager',
      targetRoles: ['ict_manager', 'system_monitor', 'principal'],
      eventType: 'ict.asset.management_requested',
      entityType: 'ict_asset',
      entityId: assetId,
      title: `ICT asset management: ${action}`,
      message: notes || `${action} requested for ICT asset ${assetId}.`,
      priority,
      payload: {
        action,
        condition,
        notes,
        asset_id: assetId,
        asset_name: dto?.asset_name ?? dto?.name ?? null,
        requested_from: 'ict-manager-dashboard',
      },
    });
  }

  async recordIctAction(action: string, dto: any = {}, entityId?: string | null) {
    const tenantId = this.requireTenantId();
    return this.operations.recordWorkflowAction({
      tenantId,
      actorUserId: this.requestContext.getStore()?.user_id,
      sourceRole: 'ict_manager',
      targetRoles: ['ict_manager', 'system_monitor', 'principal'],
      eventType: `ict.${action}`,
      entityType: 'ict_workflow',
      entityId: entityId ?? dto?.id ?? null,
      title: `ICT: ${action.replace(/[-_.]+/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase())}`,
      message: dto?.description ?? dto?.notes ?? dto?.reason ?? null,
      priority: action.includes('issue') || action.includes('maintenance') ? 'high' : 'normal',
      payload: { action, ...dto },
    });
  }
}
