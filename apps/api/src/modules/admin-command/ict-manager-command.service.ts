import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
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
    try {
      return await this.prisma.query<T>(query, params);
    } catch (e) {
      return { rows: [], rowCount: 0 };
    }
  }

  async getOverview() {
    const tenantId = this.requireTenantId();
    const metrics = await this.executeSql(`
      SELECT 
        (SELECT COUNT(*)::int FROM ict_assets WHERE tenant_id = $1) as "totalAssets",
        (SELECT COUNT(*)::int FROM ict_assets WHERE tenant_id = $1 AND status = 'assigned') as "assignedAssets",
        (SELECT COUNT(*)::int FROM ict_maintenance_logs WHERE tenant_id = $1 AND status = 'pending') as "pendingMaintenance"
    `, [tenantId]);

    const row = metrics.rows[0] || { totalAssets: 0, assignedAssets: 0, pendingMaintenance: 0 };
    return {
      metrics: {
        totalAssets: row.totalAssets || 0,
        assignedAssets: row.assignedAssets || 0,
        pendingMaintenance: row.pendingMaintenance || 0,
      },
      recentTickets: []
    };
  }

  async getAssets() {
    const tenantId = this.requireTenantId();
    const res = await this.executeSql(
      `SELECT * FROM ict_assets WHERE tenant_id = $1 ORDER BY name ASC`,
      [tenantId]
    );
    return res.rows;
  }

  async getAssetAssignment() {
    const tenantId = this.requireTenantId();
    const res = await this.executeSql(
      `SELECT * FROM ict_asset_assignments WHERE tenant_id = $1 ORDER BY assigned_date DESC`,
      [tenantId]
    );
    return res.rows;
  }

  async getLoansReturns() {
    const tenantId = this.requireTenantId();
    const res = await this.executeSql(
      `SELECT * FROM ict_asset_loans WHERE tenant_id = $1 ORDER BY loan_date DESC`,
      [tenantId]
    );
    return res.rows;
  }

  async getMaintenance() {
    const tenantId = this.requireTenantId();
    const res = await this.executeSql(
      `SELECT * FROM ict_maintenance_logs WHERE tenant_id = $1 ORDER BY created_at DESC`,
      [tenantId]
    );
    return res.rows;
  }

  async getFacilitiesIssues() {
    const tenantId = this.requireTenantId();
    const res = await this.executeSql(
      `SELECT * FROM facility_issues WHERE tenant_id = $1 ORDER BY created_at DESC`,
      [tenantId]
    );
    return res.rows;
  }

  async getReports() {
    const tenantId = this.requireTenantId();
    return this.operations.listReportSnapshots(tenantId, 'ict-manager-command');
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
