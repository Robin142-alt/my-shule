import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class NotificationRouterService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  getUserNotifications(tenantId: string, userId: string, role: string) {
    return this.notifications.getUserNotifications(tenantId, userId, role);
  }

  async getUserTasks(tenantId: string, userId: string, role: string) {
    return this.queryForTenant(tenantId, userId, `
      SELECT task.*
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
      ORDER BY task.created_at DESC, task.id DESC
      LIMIT 50
    `, [tenantId, userId, this.normalizeRole(role)]);
  }

  async getPendingApprovals(tenantId: string, userId: string, role: string) {
    return this.queryForTenant(tenantId, userId, `
      SELECT approval.*
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
      LIMIT 50
    `, [tenantId, userId, this.normalizeRole(role)]);
  }

  markNotificationRead(tenantId: string, userId: string, role: string, notificationId: string) {
    return this.notifications.safeMarkAsRead(notificationId, tenantId, userId, role);
  }

  async markTaskCompleted(tenantId: string, userId: string, role: string, taskId: string) {
    const rows = await this.queryForTenant<{ id: string }>(tenantId, userId, `
      UPDATE tasks task
      SET
        status = 'COMPLETED',
        completed_at = COALESCE(task.completed_at, NOW()),
        updated_at = NOW()
      WHERE task.tenant_id::text = $1::text
        AND task.id::text = $2::text
        AND lower(task.status) IN ('open', 'pending', 'in_progress')
        AND (
          task.assigned_to_user_id::text = $3::text
          OR (
            task.assigned_to_user_id IS NULL
            AND regexp_replace(lower(btrim(COALESCE(task.assigned_to_role, ''))), '[^a-z0-9]+', '_', 'g') = $4
          )
        )
      RETURNING task.id::text
    `, [tenantId, taskId, userId, this.normalizeRole(role)]);
    if (!rows[0]) {
      throw new NotFoundException('Task was not found for the active school role');
    }
    return rows[0];
  }

  private queryForTenant<T = Record<string, unknown>>(
    tenantId: string,
    userId: string,
    sql: string,
    params: unknown[],
  ): Promise<T[]> {
    return this.prisma.executeWithTenant(tenantId, userId, async (tx) => {
      const rows = await tx.$queryRawUnsafe<T[]>(sql, ...params);
      return Array.isArray(rows) ? rows : [rows];
    });
  }

  private normalizeRole(value: string): string {
    return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  }
}
