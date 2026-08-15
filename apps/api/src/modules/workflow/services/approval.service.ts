import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import { PrismaService } from '../../../database/prisma.service';

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
  created_at: Date | string;
  updated_at: Date | string;
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

@Injectable()
export class ApprovalService {
  constructor(private readonly prisma: PrismaService) {}

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
        approval.created_at,
        approval.updated_at
      FROM approval_requests approval
      WHERE approval.tenant_id = $1
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
    const moduleName = this.optionalText(input.module, 100) ?? 'workflow';
    const recordId = this.optionalText(input.recordId, 200);
    const reason = this.optionalText(input.reason, 2_000);
    const approverUserId = this.optionalUuid(input.approverUserId, 'Approver user');
    const approverRole = this.optionalText(input.approverRole, 100);

    if (!approverUserId && !approverRole) {
      throw new BadRequestException('Select an approver user or role');
    }
    if (approverUserId === input.requestedByUserId) {
      throw new BadRequestException('The requester cannot approve their own request');
    }

    await this.assertValidApprover(input.tenantId, input.requestedByUserId, approverUserId, approverRole);

    return this.prisma.executeWithTenant(input.tenantId, input.requestedByUserId, async (tx) => {
      const rows = await tx.$queryRawUnsafe<ApprovalView[]>(`
        INSERT INTO approval_requests (
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
      `dashboard:${randomUUID()}`,
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
      const rows = await tx.$queryRawUnsafe<ApprovalView[]>(`
        UPDATE approval_requests approval
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
          AND approval.tenant_id = $6
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
        metadata: { decisionByRole: normalizedRole },
      });
      return approval;
    });
  }

  private async assertValidApprover(
    tenantId: string,
    actorUserId: string,
    approverUserId: string | null,
    approverRole: string | null,
  ): Promise<void> {
    const normalizedRole = approverRole ? this.normalizeRole(approverRole) : null;
    const rows = await this.queryForTenant<{ user_exists: boolean; role_exists: boolean }>(tenantId, actorUserId, `
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
        END AS role_exists
    `, [tenantId, approverUserId, normalizedRole]);

    if (!rows[0]?.user_exists) {
      throw new BadRequestException('Approver user is not active in this school');
    }
    if (!rows[0]?.role_exists) {
      throw new BadRequestException('Approver role does not belong to this school');
    }
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
