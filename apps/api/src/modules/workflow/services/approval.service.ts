import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { RequestContextService } from '../../../common/request-context/request-context.service';
import { PrismaService } from '../../../database/prisma.service';
import { EventPublisherService } from '../../events/event-publisher.service';

export interface CreateApprovalRequestInput {
  tenantId: string;
  requestedByUserId: string;
  requestedByRole: string;
  requestId: string;
  approverRole?: string | null;
  approverUserId?: string | null;
  approvalType: string;
  module?: string | null;
  recordId?: string | null;
  title: string;
  reason?: string | null;
  metadata?: Record<string, unknown>;
}

export interface DecideApprovalRequestInput {
  tenantId: string;
  approvalId: string;
  actorUserId: string;
  actorRole: string;
  requestId: string;
  decision: 'APPROVED' | 'REJECTED';
  note?: string | null;
}

export interface DecideProcurementRequestInput {
  tenantId: string;
  procurementRequestId: string;
  actorUserId: string;
  actorRole: string;
  requestId: string;
  decision: 'APPROVED' | 'REJECTED';
  note?: string | null;
}

export type ApprovalView = {
  id: string;
  title: string;
  reason: string | null;
  status: string;
  approval_type: string | null;
  module: string | null;
  record_id: string | null;
  requested_by_user_id: string | null;
  approver_user_id: string | null;
  approver_role: string | null;
  decision_note: string | null;
  priority?: string | null;
  created_at: Date | string;
  updated_at: Date | string;
};

type AddressedApprovalProjection = ApprovalView & {
  approval_key: string;
};

type ApprovalTransaction = {
  $queryRawUnsafe: <T = unknown[]>(sql: string, ...params: unknown[]) => Promise<T>;
  $executeRawUnsafe: (sql: string, ...params: unknown[]) => Promise<number>;
};

type DomainDecisionResult = {
  module: 'procurement';
  recordId: string;
  approvalId: string;
  requestedByUserId: string;
  status: 'approved' | 'rejected';
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

@Injectable()
export class ApprovalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly requestContext: RequestContextService,
    private readonly eventPublisher: EventPublisherService,
  ) {}

  async listPendingForApprover(input: {
    tenantId: string;
    actorUserId: string;
    actorRole: string;
  }): Promise<ApprovalView[]> {
    const normalizedRole = this.normalizeRole(input.actorRole);

    return this.queryForTenant<ApprovalView>(input.tenantId, input.actorUserId, `
      SELECT
        approval.id::text,
        COALESCE(
          NULLIF(approval.metadata->>'title', ''),
          initcap(replace(COALESCE(NULLIF(approval.approval_type, ''), NULLIF(approval.module, ''), 'approval'), '_', ' '))
        ) AS title,
        approval.reason,
        lower(approval.status) AS status,
        approval.approval_type,
        approval.module,
        approval.record_id,
        approval.requested_by_user_id::text,
        approval.approver_user_id::text,
        approval.approver_role,
        approval.decision_note,
        COALESCE(NULLIF(approval.metadata->>'priority', ''), 'normal') AS priority,
        approval.created_at,
        approval.updated_at
      FROM dashboard_approval_requests approval
      WHERE approval.tenant_id::text = $1::text
        AND lower(approval.status) IN ('pending', 'pending_approval', 'changes_requested', 'escalated')
        AND approval.requested_by_user_id::text IS DISTINCT FROM $2::text
        AND (
          (approval.approver_user_id IS NOT NULL AND approval.approver_user_id::text = $2::text)
          OR (
            approval.approver_user_id IS NULL
            AND regexp_replace(lower(btrim(COALESCE(approval.approver_role, ''))), '[^a-z0-9]+', '_', 'g') = $3
          )
        )
      ORDER BY approval.created_at DESC, approval.id DESC
      LIMIT 100
    `, [input.tenantId, input.actorUserId, normalizedRole]);
  }

  async createApprovalRequest(input: CreateApprovalRequestInput): Promise<ApprovalView> {
    const title = this.requiredText(input.title, 'Approval title', 180);
    const approvalType = this.requiredText(input.approvalType, 'Approval type', 100);
    const moduleName = this.requiredText(input.module, 'Approval module', 100);
    const recordId = this.optionalUuid(input.recordId, 'Procurement request');
    const reason = this.optionalText(input.reason, 2_000);
    const approverUserId = this.optionalUuid(input.approverUserId, 'Approver user');
    const approverRole = this.optionalText(input.approverRole, 100);

    if (
      this.normalizeRole(moduleName) !== 'procurement'
      || this.normalizeRole(approvalType) !== 'procurement'
    ) {
      throw new BadRequestException(
        'The shared approval inbox can only create procurement approvals with a supported domain transition',
      );
    }
    if (!recordId) {
      throw new BadRequestException('Procurement request is required');
    }

    if (!approverUserId && !approverRole) {
      throw new BadRequestException('Select an approver user or role');
    }
    if (approverUserId === input.requestedByUserId) {
      throw new BadRequestException('The requester cannot approve their own request');
    }

    await this.assertValidApprover(input.tenantId, input.requestedByUserId, approverUserId, approverRole);

    return this.prisma.executeWithTenant(input.tenantId, input.requestedByUserId, async (tx) => {
      const requestRows = await tx.$queryRawUnsafe<Array<{ id: string }>>(`
        SELECT request.id::text
        FROM procurement_requests request
        WHERE request.tenant_id::text = $1::text
          AND request.id = $2::uuid
          AND request.requested_by_user_id = $3::uuid
          AND lower(request.status) = 'submitted'
        FOR KEY SHARE OF request
      `, input.tenantId, recordId, input.requestedByUserId);
      if (!requestRows[0]) {
        throw new NotFoundException('Submitted procurement request was not found for this school requester');
      }

      const rows = await tx.$queryRawUnsafe<ApprovalView[]>(`
        INSERT INTO dashboard_approval_requests (
          tenant_id,
          approval_key,
          requested_by_user_id,
          approver_role,
          approver_user_id,
          module,
          record_id,
          approval_type,
          reason,
          status,
          metadata
        )
        VALUES ($1, $2, $3::uuid, $4, $5::uuid, $6, $7, $8, $9, 'PENDING', $10::jsonb)
        ON CONFLICT (tenant_id, approval_key)
        DO UPDATE SET approval_key = EXCLUDED.approval_key
        RETURNING
          id::text,
          COALESCE(NULLIF(metadata->>'title', ''), initcap(replace(approval_type, '_', ' '))) AS title,
          reason,
          lower(status) AS status,
          approval_type,
          module,
          record_id,
          requested_by_user_id::text,
          approver_user_id::text,
          approver_role,
          decision_note,
          created_at,
          updated_at
      `,
      input.tenantId,
      `procurement-approval-${recordId}`,
      input.requestedByUserId,
      approverRole ? this.normalizeRole(approverRole) : null,
      approverUserId,
      moduleName,
      recordId,
      approvalType,
      reason,
      JSON.stringify({
        ...(input.metadata ?? {}),
        title,
        requestedByRole: this.normalizeRole(input.requestedByRole),
        sourceDashboard: input.requestedByRole,
      }),
      );
      const approval = rows[0];
      if (!approval) {
        throw new Error('Approval persistence returned no record');
      }

      await this.writeAudit(tx, {
        tenantId: input.tenantId,
        actorUserId: input.requestedByUserId,
        requestId: input.requestId,
        action: 'approval.requested',
        approvalId: approval.id,
        reason,
        metadata: {
          approverUserId,
          approverRole: approverRole ? this.normalizeRole(approverRole) : null,
        },
      });
      return approval;
    });
  }

  async decideRequest(input: DecideApprovalRequestInput): Promise<ApprovalView> {
    const note = this.optionalText(input.note, 2_000);
    if (input.decision === 'REJECTED' && !note) {
      throw new BadRequestException('A rejection reason is required');
    }

    const normalizedRole = this.normalizeRole(input.actorRole);
    return this.prisma.executeWithTenant(input.tenantId, input.actorUserId, async (tx) => {
      const projectionRows = await tx.$queryRawUnsafe<AddressedApprovalProjection[]>(`
        SELECT
          approval.id::text,
          approval.approval_key,
          COALESCE(
            NULLIF(approval.metadata->>'title', ''),
            initcap(replace(COALESCE(NULLIF(approval.approval_type, ''), NULLIF(approval.module, ''), 'approval'), '_', ' '))
          ) AS title,
          approval.reason,
          lower(approval.status) AS status,
          approval.approval_type,
          approval.module,
          approval.record_id,
          approval.requested_by_user_id::text,
          approval.approver_user_id::text,
          approval.approver_role,
          approval.decision_note,
          approval.created_at,
          approval.updated_at
        FROM dashboard_approval_requests approval
        WHERE approval.id::text = $1::text
          AND approval.tenant_id::text = $2::text
          AND approval.requested_by_user_id::text IS DISTINCT FROM $3::text
          AND (
            (
              lower(approval.status) IN ('pending', 'pending_approval', 'changes_requested', 'escalated')
              AND (
                (approval.approver_user_id IS NOT NULL AND approval.approver_user_id::text = $3::text)
                OR (
                  approval.approver_user_id IS NULL
                  AND regexp_replace(lower(btrim(COALESCE(approval.approver_role, ''))), '[^a-z0-9]+', '_', 'g') = $4
                )
              )
            )
            OR (
              lower(approval.status) = lower($5)
              AND approval.approver_user_id::text = $3::text
              AND regexp_replace(
                lower(btrim(COALESCE(approval.metadata->>'decisionByRole', approval.approver_role, ''))),
                '[^a-z0-9]+',
                '_',
                'g'
              ) = $4
            )
          )
        FOR UPDATE OF approval
      `,
      input.approvalId,
      input.tenantId,
      input.actorUserId,
      normalizedRole,
      input.decision,
      );
      const projection = projectionRows[0];
      if (!projection) {
        throw new NotFoundException('Approval was not found for the active school role');
      }

      if (projection.status === input.decision.toLowerCase()) {
        await this.assertCompletedProcurementDecision(tx, projection, input);
        return projection;
      }

      const domainDecision = await this.executeDomainDecision(tx, projection, input, note, normalizedRole);

      const rows = await tx.$queryRawUnsafe<ApprovalView[]>(`
        UPDATE dashboard_approval_requests approval
        SET
          status = $1,
          approver_user_id = $2::uuid,
          decision_note = $3,
          decided_at = NOW(),
          metadata = jsonb_set(
            COALESCE(approval.metadata, '{}'::jsonb),
            '{decisionByRole}',
            to_jsonb($4::text),
            true
          ),
          updated_at = NOW()
        WHERE approval.id::text = $5::text
          AND approval.tenant_id::text = $6::text
          AND lower(approval.status) IN ('pending', 'pending_approval', 'changes_requested', 'escalated')
          AND approval.requested_by_user_id::text IS DISTINCT FROM $2::text
          AND (
            (approval.approver_user_id IS NOT NULL AND approval.approver_user_id::text = $2::text)
            OR (
              approval.approver_user_id IS NULL
              AND regexp_replace(lower(btrim(COALESCE(approval.approver_role, ''))), '[^a-z0-9]+', '_', 'g') = $4
            )
          )
        RETURNING
          id::text,
          COALESCE(
            NULLIF(metadata->>'title', ''),
            initcap(replace(COALESCE(NULLIF(approval_type, ''), NULLIF(module, ''), 'approval'), '_', ' '))
          ) AS title,
          reason,
          lower(status) AS status,
          approval_type,
          module,
          record_id,
          requested_by_user_id::text,
          approver_user_id::text,
          approver_role,
          decision_note,
          created_at,
          updated_at
      `,
      input.decision,
      input.actorUserId,
      note,
      normalizedRole,
      input.approvalId,
      input.tenantId,
      );
      const approval = rows[0];
      if (!approval) {
        throw new NotFoundException('Approval was not found for the active school role');
      }

      await this.writeAudit(tx, {
        tenantId: input.tenantId,
        actorUserId: input.actorUserId,
        requestId: input.requestId,
        action: input.decision === 'APPROVED' ? 'approval.approved' : 'approval.rejected',
        approvalId: approval.id,
        reason: note,
        metadata: {
          decisionByRole: normalizedRole,
          domainModule: domainDecision.module,
          domainRecordId: domainDecision.recordId,
          domainApprovalId: domainDecision.approvalId,
          domainStatus: domainDecision.status,
        },
      });
      await this.writeProcurementRequesterNotification(tx, {
        tenantId: input.tenantId,
        approvalProjectionId: approval.id,
        procurementApprovalId: domainDecision.approvalId,
        procurementRequestId: domainDecision.recordId,
        requestedByUserId: domainDecision.requestedByUserId,
        decidedByUserId: input.actorUserId,
        decidedByRole: normalizedRole,
        decision: domainDecision.status,
        reason: note,
      });
      await this.writeProcurementDecisionEvent(tx, {
        tenantId: input.tenantId,
        actorUserId: input.actorUserId,
        actorRole: normalizedRole,
        requestId: input.requestId,
        approvalProjectionId: approval.id,
        procurementApprovalId: domainDecision.approvalId,
        procurementRequestId: domainDecision.recordId,
        requestedByUserId: domainDecision.requestedByUserId,
        decision: domainDecision.status,
        reason: note,
      });
      return approval;
    });
  }

  async decideProcurementRequest(input: DecideProcurementRequestInput): Promise<ApprovalView> {
    const procurementRequestId = this.optionalUuid(
      input.procurementRequestId,
      'Procurement request',
    );
    if (!procurementRequestId) {
      throw new BadRequestException('Procurement request is required');
    }

    const normalizedRole = this.normalizeRole(input.actorRole);
    const approvalKey = `procurement-approval-${procurementRequestId}`;
    const projectionRows = await this.queryForTenant<{ id: string }>(
      input.tenantId,
      input.actorUserId,
      `
        SELECT approval.id::text
        FROM dashboard_approval_requests approval
        WHERE approval.tenant_id::text = $1::text
          AND approval.approval_key = $2
          AND approval.record_id = $3
          AND regexp_replace(lower(btrim(COALESCE(approval.module, ''))), '[^a-z0-9]+', '_', 'g') = 'procurement'
          AND regexp_replace(lower(btrim(COALESCE(approval.approval_type, ''))), '[^a-z0-9]+', '_', 'g') = 'procurement'
          AND approval.requested_by_user_id::text IS DISTINCT FROM $4::text
          AND (
            (
              lower(approval.status) IN ('pending', 'pending_approval', 'changes_requested', 'escalated')
              AND (
                (approval.approver_user_id IS NOT NULL AND approval.approver_user_id::text = $4::text)
                OR (
                  approval.approver_user_id IS NULL
                  AND regexp_replace(lower(btrim(COALESCE(approval.approver_role, ''))), '[^a-z0-9]+', '_', 'g') = $5
                )
              )
            )
            OR (
              lower(approval.status) = lower($6)
              AND approval.approver_user_id::text = $4::text
              AND regexp_replace(
                lower(btrim(COALESCE(approval.metadata->>'decisionByRole', approval.approver_role, ''))),
                '[^a-z0-9]+',
                '_',
                'g'
              ) = $5
            )
          )
        LIMIT 1
      `,
      [
        input.tenantId,
        approvalKey,
        procurementRequestId,
        input.actorUserId,
        normalizedRole,
        input.decision,
      ],
    );
    const projection = projectionRows[0];
    if (!projection) {
      throw new NotFoundException(
        'Procurement approval was not found for the active school assignee',
      );
    }

    return this.decideRequest({
      tenantId: input.tenantId,
      approvalId: projection.id,
      actorUserId: input.actorUserId,
      actorRole: input.actorRole,
      requestId: input.requestId,
      decision: input.decision,
      note: input.note,
    });
  }

  private async assertCompletedProcurementDecision(
    tx: ApprovalTransaction,
    projection: AddressedApprovalProjection,
    input: DecideApprovalRequestInput,
  ): Promise<void> {
    if (
      this.normalizeRole(projection.module ?? '') !== 'procurement'
      || this.normalizeRole(projection.approval_type ?? '') !== 'procurement'
    ) {
      throw new BadRequestException(
        'This approval must be decided from its module workspace because the shared inbox has no safe domain transition for it',
      );
    }
    this.assertProcurementApprovalCapability();

    const recordId = projection.record_id?.trim() ?? '';
    const requestedByUserId = projection.requested_by_user_id?.trim() ?? '';
    if (!UUID_PATTERN.test(recordId) || !UUID_PATTERN.test(requestedByUserId)) {
      throw new BadRequestException('The procurement approval is not linked to a valid school request');
    }

    const decision = input.decision.toLowerCase();
    const rows = await tx.$queryRawUnsafe<Array<{ approval_id: string }>>(`
      SELECT domain_approval.id::text AS approval_id
      FROM procurement_requests request
      INNER JOIN procurement_approvals domain_approval
        ON domain_approval.tenant_id::text = request.tenant_id::text
       AND domain_approval.request_id = request.id
      WHERE request.tenant_id::text = $1::text
        AND request.id = $2::uuid
        AND request.requested_by_user_id::text = $3::text
        AND lower(request.status) = $4
        AND lower(domain_approval.decision) = $4
        AND domain_approval.approver_user_id = $5::uuid
      ORDER BY domain_approval.approved_at DESC, domain_approval.id DESC
      LIMIT 1
      FOR KEY SHARE OF request
    `, input.tenantId, recordId, requestedByUserId, decision, input.actorUserId);

    if (!rows[0]) {
      throw new NotFoundException(
        'Completed procurement decision was not found for this school approval replay',
      );
    }
  }

  private async executeDomainDecision(
    tx: ApprovalTransaction,
    projection: AddressedApprovalProjection,
    input: DecideApprovalRequestInput,
    note: string | null,
    normalizedRole: string,
  ): Promise<DomainDecisionResult> {
    if (
      this.normalizeRole(projection.module ?? '') !== 'procurement'
      || this.normalizeRole(projection.approval_type ?? '') !== 'procurement'
    ) {
      throw new BadRequestException(
        'This approval must be decided from its module workspace because the shared inbox has no safe domain transition for it',
      );
    }
    this.assertProcurementApprovalCapability();

    const recordId = projection.record_id?.trim() ?? '';
    const requestedByUserId = projection.requested_by_user_id?.trim() ?? '';
    if (!UUID_PATTERN.test(recordId) || !UUID_PATTERN.test(requestedByUserId)) {
      throw new BadRequestException('The procurement approval is not linked to a valid school request');
    }

    const requestRows = await tx.$queryRawUnsafe<Array<{
      id: string;
      status: string;
      requested_by_user_id: string;
    }>>(`
      SELECT
        request.id::text,
        lower(request.status) AS status,
        request.requested_by_user_id::text
      FROM procurement_requests request
      WHERE request.tenant_id::text = $1::text
        AND request.id = $2::uuid
        AND lower(request.status) = 'submitted'
        AND request.requested_by_user_id::text = $3::text
      FOR UPDATE OF request
    `, input.tenantId, recordId, requestedByUserId);
    if (!requestRows[0]) {
      throw new NotFoundException('Pending procurement request was not found for this school approval');
    }

    const domainDecision = input.decision.toLowerCase() as 'approved' | 'rejected';
    const approvalRows = await tx.$queryRawUnsafe<Array<{ id: string }>>(`
      INSERT INTO procurement_approvals (
        tenant_id,
        request_id,
        decision,
        reason,
        approver_user_id
      )
      VALUES ($1, $2::uuid, $3, $4, $5::uuid)
      RETURNING id::text
    `, input.tenantId, recordId, domainDecision, note, input.actorUserId);
    const procurementApproval = approvalRows[0];
    if (!procurementApproval) {
      throw new Error('Procurement approval persistence returned no record');
    }

    const transitionedRows = await tx.$queryRawUnsafe<Array<{ id: string; status: string }>>(`
      UPDATE procurement_requests request
      SET
        status = $3,
        updated_at = NOW()
      WHERE request.tenant_id::text = $1::text
        AND request.id = $2::uuid
        AND lower(request.status) = 'submitted'
      RETURNING request.id::text, lower(request.status) AS status
    `, input.tenantId, recordId, domainDecision);
    if (!transitionedRows[0]) {
      throw new NotFoundException('Pending procurement request was not found for this school approval');
    }

    await this.writeProcurementAudit(tx, {
      tenantId: input.tenantId,
      actorUserId: input.actorUserId,
      requestId: input.requestId,
      approvalProjectionId: projection.id,
      procurementApprovalId: procurementApproval.id,
      procurementRequestId: recordId,
      decision: domainDecision,
      decisionByRole: normalizedRole,
      reason: note,
    });

    return {
      module: 'procurement',
      recordId,
      approvalId: procurementApproval.id,
      requestedByUserId,
      status: domainDecision,
    };
  }

  private async assertValidApprover(
    tenantId: string,
    actorUserId: string,
    approverUserId: string | null,
    approverRole: string | null,
  ): Promise<void> {
    const normalizedRole = approverRole ? this.normalizeRole(approverRole) : null;
    const rows = await this.queryForTenant<{
      user_exists: boolean;
      role_exists: boolean;
      user_can_approve: boolean;
      role_can_approve: boolean;
    }>(tenantId, actorUserId, `
      SELECT
        CASE
          WHEN $2::text IS NULL THEN TRUE
          ELSE EXISTS (
            SELECT 1
            FROM tenant_memberships membership
            WHERE membership.tenant_id = $1
              AND membership.user_id::text = $2::text
              AND lower(membership.status) = 'active'
          )
        END AS user_exists,
        CASE
          WHEN $3::text IS NULL THEN TRUE
          ELSE EXISTS (
            SELECT 1
            FROM roles role
            WHERE role.tenant_id = $1
              AND regexp_replace(lower(btrim(role.code)), '[^a-z0-9]+', '_', 'g') = $3
          )
        END AS role_exists,
        CASE
          WHEN $2::text IS NULL THEN TRUE
          ELSE EXISTS (
            SELECT 1
            FROM (
              SELECT membership.tenant_id, membership.role_id
              FROM tenant_memberships membership
              WHERE membership.tenant_id = $1
                AND membership.user_id::text = $2::text
                AND lower(membership.status) = 'active'

              UNION

              SELECT user_role.tenant_id, user_role.role_id
              FROM user_roles user_role
              WHERE user_role.tenant_id = $1
                AND user_role.user_id::text = $2::text
                AND upper(user_role.status::text) = 'ACTIVE'
                AND user_role.deleted_at IS NULL
                AND upper(COALESCE(user_role.scope_type::text, '')) = 'SCHOOL'
                AND NULLIF(btrim(COALESCE(user_role.scope_id, '')), '') IS NULL
            ) assigned_role
            INNER JOIN role_permissions role_permission
              ON role_permission.tenant_id = assigned_role.tenant_id
             AND role_permission.role_id = assigned_role.role_id
            INNER JOIN permissions permission
              ON permission.tenant_id = role_permission.tenant_id
             AND permission.id = role_permission.permission_id
            WHERE (
                lower(btrim(COALESCE(permission.key, ''))) IN ('*:*', 'procurement:*', 'procurement:approve')
                OR (
                  lower(btrim(COALESCE(permission.resource, ''))) = '*'
                  AND lower(btrim(COALESCE(permission.action, ''))) = '*'
                )
                OR (
                  lower(btrim(COALESCE(permission.resource, ''))) = 'procurement'
                  AND lower(btrim(COALESCE(permission.action, ''))) IN ('*', 'approve')
                )
            )
          )
        END AS user_can_approve,
        CASE
          WHEN $3::text IS NULL THEN TRUE
          ELSE EXISTS (
            SELECT 1
            FROM roles role
            INNER JOIN role_permissions role_permission
              ON role_permission.tenant_id = role.tenant_id
             AND role_permission.role_id = role.id
            INNER JOIN permissions permission
              ON permission.tenant_id = role_permission.tenant_id
             AND permission.id = role_permission.permission_id
            WHERE role.tenant_id = $1
              AND regexp_replace(lower(btrim(role.code)), '[^a-z0-9]+', '_', 'g') = $3
              AND (
                lower(btrim(COALESCE(permission.key, ''))) IN ('*:*', 'procurement:*', 'procurement:approve')
                OR (
                  lower(btrim(COALESCE(permission.resource, ''))) = '*'
                  AND lower(btrim(COALESCE(permission.action, ''))) = '*'
                )
                OR (
                  lower(btrim(COALESCE(permission.resource, ''))) = 'procurement'
                  AND lower(btrim(COALESCE(permission.action, ''))) IN ('*', 'approve')
                )
              )
          )
        END AS role_can_approve
    `, [tenantId, approverUserId, normalizedRole]);

    if (!rows[0]?.user_exists) {
      throw new BadRequestException('Approver user is not active in this school');
    }
    if (!rows[0]?.role_exists) {
      throw new BadRequestException('Approver role does not belong to this school');
    }
    if (!rows[0]?.user_can_approve) {
      throw new BadRequestException('Approver user does not have procurement approval permission');
    }
    if (!rows[0]?.role_can_approve) {
      throw new BadRequestException('Approver role does not have procurement approval permission');
    }
  }

  private assertProcurementApprovalCapability(): void {
    const permissions = this.requestContext.getStore()?.permissions ?? [];
    if (
      permissions.includes('*:*')
      || permissions.includes('procurement:*')
      || permissions.includes('procurement:approve')
    ) {
      return;
    }

    throw new ForbiddenException('Procurement approval permission is required');
  }

  private queryForTenant<T>(
    tenantId: string,
    actorUserId: string,
    sql: string,
    params: unknown[],
  ): Promise<T[]> {
    return this.prisma.executeWithTenant(tenantId, actorUserId, async (tx) => {
      const rows = await tx.$queryRawUnsafe<T[]>(sql, ...params);
      return Array.isArray(rows) ? rows : [rows];
    });
  }

  private async writeAudit(
    tx: { $executeRawUnsafe: (sql: string, ...params: unknown[]) => Promise<number> },
    input: {
      tenantId: string;
      actorUserId: string;
      requestId: string;
      action: string;
      approvalId: string;
      reason: string | null;
      metadata: Record<string, unknown>;
    },
  ): Promise<void> {
    await tx.$executeRawUnsafe(`
      INSERT INTO audit_logs (
        tenant_id,
        school_id,
        actor_user_id,
        request_id,
        action,
        module,
        entity_type,
        entity_id,
        resource_type,
        reason,
        metadata
      )
      VALUES ($1, $1, $2::uuid, $3, $4, 'workflow', 'approval_request', $5, 'approval_request', $6, $7::jsonb)
    `,
    input.tenantId,
    input.actorUserId,
    input.requestId,
    input.action,
    input.approvalId,
    input.reason,
    JSON.stringify(input.metadata),
    );
  }

  private async writeProcurementAudit(
    tx: { $executeRawUnsafe: (sql: string, ...params: unknown[]) => Promise<number> },
    input: {
      tenantId: string;
      actorUserId: string;
      requestId: string;
      approvalProjectionId: string;
      procurementApprovalId: string;
      procurementRequestId: string;
      decision: 'approved' | 'rejected';
      decisionByRole: string;
      reason: string | null;
    },
  ): Promise<void> {
    await tx.$executeRawUnsafe(`
      INSERT INTO procurement_audit_logs (
        tenant_id,
        actor_user_id,
        action,
        resource_type,
        resource_id,
        metadata
      )
      VALUES (
        $1,
        $2::uuid,
        'procurement.request.approval_recorded',
        'procurement_approval',
        $3::uuid,
        $4::jsonb
      )
    `,
    input.tenantId,
    input.actorUserId,
    input.procurementApprovalId,
    JSON.stringify({
      requestId: input.procurementRequestId,
      requestCorrelationId: input.requestId,
      decision: input.decision,
      decisionByRole: input.decisionByRole,
      reason: input.reason,
      sourceApprovalId: input.approvalProjectionId,
    }),
    );
  }

  private async writeProcurementDecisionEvent(
    tx: ApprovalTransaction,
    input: {
      tenantId: string;
      actorUserId: string;
      actorRole: string;
      requestId: string;
      approvalProjectionId: string;
      procurementApprovalId: string;
      procurementRequestId: string;
      requestedByUserId: string;
      decision: 'approved' | 'rejected';
      reason: string | null;
    },
  ): Promise<void> {
    const eventName = input.decision === 'approved'
      ? 'procurement.request.approved' as const
      : 'procurement.request.rejected' as const;
    const eventKey = `${eventName}:${input.procurementRequestId}:${input.approvalProjectionId}`;
    const decidedAt = new Date().toISOString();

    await this.eventPublisher.publish({
      tenant_id: input.tenantId,
      event_key: eventKey,
      event_name: eventName,
      aggregate_type: 'procurement_request',
      aggregate_id: input.procurementRequestId,
      payload: {
        tenant_id: input.tenantId,
        request_id: input.procurementRequestId,
        approval_id: input.procurementApprovalId,
        approval_projection_id: input.approvalProjectionId,
        requested_by_user_id: input.requestedByUserId,
        decided_by_user_id: input.actorUserId,
        decided_by_role: input.actorRole,
        decision: input.decision,
        reason: input.reason,
        status: input.decision,
        decided_at: decidedAt,
      },
      headers: {
        request_id: input.requestId,
        approval_projection_id: input.approvalProjectionId,
        procurement_approval_id: input.procurementApprovalId,
      },
      actor_user_id: input.actorUserId,
      actor_role: input.actorRole,
      source_dashboard: `${input.actorRole}-dashboard`,
    }, tx);
  }

  private async writeProcurementRequesterNotification(
    tx: { $executeRawUnsafe: (sql: string, ...params: unknown[]) => Promise<number> },
    input: {
      tenantId: string;
      approvalProjectionId: string;
      procurementApprovalId: string;
      procurementRequestId: string;
      requestedByUserId: string;
      decidedByUserId: string;
      decidedByRole: string;
      decision: 'approved' | 'rejected';
      reason: string | null;
    },
  ): Promise<void> {
    const approved = input.decision === 'approved';
    await tx.$executeRawUnsafe(`
      INSERT INTO notifications (
        tenant_id,
        notification_key,
        recipient_user_id,
        recipient_role,
        type,
        title,
        body,
        status,
        priority,
        source_module,
        source_record_id,
        metadata
      )
      VALUES ($1, $2, $3::uuid, NULL, $4, $5, $6, 'unread', $7, 'procurement', $8, $9::jsonb)
      ON CONFLICT (tenant_id, notification_key) DO NOTHING
    `,
    input.tenantId,
    `procurement-decision:${input.approvalProjectionId}:${input.decision}:requester`,
    input.requestedByUserId,
    approved ? 'PROCUREMENT_REQUEST_APPROVED' : 'PROCUREMENT_REQUEST_REJECTED',
    approved ? 'Procurement request approved' : 'Procurement request rejected',
    approved
      ? 'Your procurement request was approved.'
      : `Your procurement request was rejected${input.reason ? `: ${input.reason}` : '.'}`,
    approved ? 'normal' : 'high',
    input.procurementRequestId,
    JSON.stringify({
      approvalId: input.procurementApprovalId,
      approvalProjectionId: input.approvalProjectionId,
      decision: input.decision,
      decidedByUserId: input.decidedByUserId,
      decidedByRole: input.decidedByRole,
    }),
    );
  }

  private normalizeRole(value: string): string {
    return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  }

  private requiredText(value: unknown, label: string, maximumLength: number): string {
    const normalized = this.optionalText(value, maximumLength);
    if (!normalized) {
      throw new BadRequestException(`${label} is required`);
    }
    return normalized;
  }

  private optionalText(value: unknown, maximumLength: number): string | null {
    if (value === undefined || value === null || value === '') {
      return null;
    }
    if (typeof value !== 'string') {
      throw new BadRequestException('Text fields must be strings');
    }
    const normalized = value.trim();
    if (!normalized) {
      return null;
    }
    if (normalized.length > maximumLength) {
      throw new BadRequestException(`Text must not exceed ${maximumLength} characters`);
    }
    return normalized;
  }

  private optionalUuid(value: unknown, label: string): string | null {
    if (value === undefined || value === null || value === '') {
      return null;
    }
    if (typeof value !== 'string' || !UUID_PATTERN.test(value.trim())) {
      throw new BadRequestException(`${label} must be a valid identifier`);
    }
    return value.trim();
  }
}
