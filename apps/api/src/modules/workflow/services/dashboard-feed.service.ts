import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../database/prisma.service';
import { notificationRecipientPredicate } from '../../notifications/notification-recipient-predicate';

export interface GetDashboardFeedInput {
  schoolId: string;
  userId: string;
  role: string;
  limit?: number;
  offset?: number;
}

type DashboardFeedRow = {
  id: string;
  source_user_id: string | null;
  source_role: string | null;
  target_roles: unknown;
  event_type: string;
  entity_type: string;
  entity_id: string | null;
  title: string;
  message: string | null;
  priority: string;
  payload: unknown;
  status: string;
  created_at: Date | string;
  updated_at: Date | string;
};

type DashboardSummaryRow = {
  open_tasks: number | bigint | string;
  unread_notifications: number | bigint | string;
  pending_approvals: number | bigint | string;
};

@Injectable()
export class DashboardFeedService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboardFeed(input: GetDashboardFeedInput): Promise<DashboardFeedRow[]> {
    const normalizedRole = this.normalizeRole(input.role);

    return this.queryForTenant<DashboardFeedRow>(input, `
      SELECT
        event.id::text,
        event.source_user_id::text,
        event.source_role,
        event.target_roles,
        event.event_type,
        event.entity_type,
        event.entity_id,
        event.title,
        event.message,
        event.priority,
        event.payload,
        event.status,
        event.created_at,
        event.updated_at
      FROM workflow_events event
      WHERE event.tenant_id::text = $1::text
        AND (
          COALESCE(
            NULLIF(event.payload->>'targetUserId', ''),
            NULLIF(event.payload->>'recipientUserId', '')
          ) = $2::text
          OR (
            COALESCE(
              NULLIF(event.payload->>'targetUserId', ''),
              NULLIF(event.payload->>'recipientUserId', '')
            ) IS NULL
            AND EXISTS (
              SELECT 1
              FROM jsonb_array_elements_text(
                CASE
                  WHEN jsonb_typeof(event.target_roles) = 'array' THEN event.target_roles
                  ELSE '[]'::jsonb
                END
              ) target_role(value)
              WHERE regexp_replace(lower(btrim(target_role.value)), '[^a-z0-9]+', '_', 'g') = $3
            )
          )
        )
      ORDER BY event.created_at DESC, event.id DESC
      LIMIT $4::integer
      OFFSET $5::integer
    `, [input.schoolId, input.userId, normalizedRole, input.limit ?? 20, input.offset ?? 0]);
  }

  async getDashboardSummary(input: GetDashboardFeedInput) {
    const normalizedRole = this.normalizeRole(input.role);
    const rows = await this.queryForTenant<DashboardSummaryRow>(input, `
      SELECT
        (
          SELECT COUNT(*)::integer
          FROM tasks task
          WHERE task.tenant_id::text = $1::text
            AND lower(task.status) IN ('open', 'pending', 'in_progress')
            AND (
              task.assigned_to_user_id::text = $2::text
              OR (
                task.assigned_to_user_id IS NULL
                AND regexp_replace(lower(btrim(COALESCE(task.assigned_to_role, ''))), '[^a-z0-9]+', '_', 'g') = $3
              )
            )
        ) AS open_tasks,
        (
          SELECT COUNT(*)::integer
          FROM notifications notification
          WHERE notification.tenant_id::text = $1::text
            AND notification.status IN ('unread', 'action_required')
            AND ${notificationRecipientPredicate('notification', '$2', '$3')}
        ) AS unread_notifications,
        (
          SELECT COUNT(*)::integer
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
        ) AS pending_approvals
    `, [input.schoolId, input.userId, normalizedRole]);
    const summary = rows[0];

    return {
      openTasks: Number(summary?.open_tasks ?? 0),
      unreadNotifications: Number(summary?.unread_notifications ?? 0),
      pendingApprovals: Number(summary?.pending_approvals ?? 0),
    };
  }

  private queryForTenant<T>(
    input: Pick<GetDashboardFeedInput, 'schoolId' | 'userId'>,
    sql: string,
    params: unknown[],
  ): Promise<T[]> {
    return this.prisma.executeWithTenant(input.schoolId, input.userId, async (tx) => {
      const rows = await tx.$queryRawUnsafe<T[]>(sql, ...params);
      return Array.isArray(rows) ? rows : [rows];
    });
  }

  private normalizeRole(value: string): string {
    return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  }
}
