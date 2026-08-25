import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { NotificationPriority } from '@prisma/client';
import { randomUUID } from 'node:crypto';

import { PrismaService } from '../../database/prisma.service';
import { notificationRecipientPredicate } from './notification-recipient-predicate';

export interface CreateNotificationDto {
  schoolId: string;
  actorUserId?: string;
  targetUserId?: string;
  targetRole?: string;
  module: string;
  eventType: string;
  entityType?: string;
  entityId?: string;
  title: string;
  message: string;
  priority?: NotificationPriority;
  actionUrl?: string;
  actionLabel?: string;
  metadataJson?: Record<string, unknown>;
}

type CanonicalNotificationRow = {
  id: unknown;
  tenant_id: string;
  notification_key: string;
  recipient_user_id: unknown;
  recipient_role: string | null;
  type: string;
  title: string;
  body: string;
  status: string;
  priority: string | null;
  source_module: string | null;
  source_record_id: string | null;
  metadata: unknown;
  read_at: Date | string | null;
  created_at: Date | string;
  updated_at: Date | string;
};

export type NotificationView = {
  id: string;
  schoolId: string;
  targetUserId: string | null;
  targetRole: string | null;
  module: string;
  eventType: string;
  entityType: string | null;
  entityId: string | null;
  channel: 'IN_APP';
  title: string;
  message: string;
  priority: string;
  status: string;
  actionUrl: string | null;
  actionLabel: string | null;
  metadataJson: Record<string, unknown>;
  createdAt: Date | string;
  readAt: Date | string | null;
  created_at: Date | string;
  read_at: Date | string | null;
  is_read: boolean;
};

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async createNotification(data: CreateNotificationDto): Promise<NotificationView> {
    const notificationKey = this.buildNotificationKey(data);
    const priority = this.normalizePriority(data.priority);
    const status = data.actionUrl ? 'action_required' : 'unread';
    const metadata = {
      ...(data.metadataJson ?? {}),
      actorUserId: data.actorUserId ?? null,
      targetUserId: data.targetUserId ?? null,
      targetRole: data.targetRole ?? null,
      module: data.module,
      eventType: data.eventType,
      entityType: data.entityType ?? null,
      entityId: data.entityId ?? null,
      actionUrl: data.actionUrl ?? null,
      actionLabel: data.actionLabel ?? null,
      channel: 'IN_APP',
    };

    try {
      const rows = await this.queryForTenant<CanonicalNotificationRow>(
        data.schoolId,
        data.actorUserId ?? null,
        `
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
          VALUES ($1, $2, $3::uuid, $4, $5, $6, $7, $8, $9, $10, $11, $12::jsonb)
          ON CONFLICT (tenant_id, notification_key)
          DO UPDATE SET
            recipient_user_id = EXCLUDED.recipient_user_id,
            recipient_role = EXCLUDED.recipient_role,
            type = EXCLUDED.type,
            title = EXCLUDED.title,
            body = EXCLUDED.body,
            status = CASE
              WHEN notifications.status IN ('dismissed', 'action_taken', 'expired', 'failed')
                THEN EXCLUDED.status
              ELSE notifications.status
            END,
            priority = EXCLUDED.priority,
            source_module = EXCLUDED.source_module,
            source_record_id = EXCLUDED.source_record_id,
            metadata = EXCLUDED.metadata,
            updated_at = NOW()
          RETURNING
            id::text,
            tenant_id,
            notification_key,
            recipient_user_id::text,
            recipient_role,
            type,
            title,
            body,
            status,
            priority,
            source_module,
            source_record_id,
            metadata,
            read_at,
            created_at,
            updated_at
        `,
        [
          data.schoolId,
          notificationKey,
          data.targetUserId ?? null,
          data.targetRole ?? null,
          data.eventType,
          data.title,
          data.message,
          status,
          priority,
          data.module,
          data.entityId ?? null,
          JSON.stringify(metadata),
        ],
      );

      if (!rows[0]) {
        throw new Error('Notification persistence returned no record');
      }

      return this.toView(rows[0]);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to create tenant notification: ${message}`);
      throw error;
    }
  }

  async getUserNotifications(
    schoolId: string,
    userId: string,
    role: string,
    query: { status?: string; module?: string; limit?: string | number; skip?: string | number } = {},
  ): Promise<NotificationView[]> {
    const status = this.normalizeStatusFilter(query.status);
    const moduleName = this.optionalText(query.module);
    const limit = this.normalizeInteger(query.limit, 50, 1, 100);
    const skip = this.normalizeInteger(query.skip, 0, 0, 10_000);
    const rows = await this.queryForTenant<CanonicalNotificationRow>(
      schoolId,
      userId,
      `
        SELECT
          notification.id::text,
          notification.tenant_id,
          notification.notification_key,
          notification.recipient_user_id::text,
          notification.recipient_role,
          notification.type,
          notification.title,
          notification.body,
          notification.status,
          notification.priority,
          notification.source_module,
          notification.source_record_id,
          notification.metadata,
          notification.read_at,
          notification.created_at,
          notification.updated_at
        FROM notifications notification
        WHERE notification.tenant_id = $1
          AND ${notificationRecipientPredicate('notification', '$2', '$3')}
          AND (
            $4::text IS NULL
            OR notification.source_module = $4
            OR notification.metadata->>'module' = $4
            OR notification.metadata->>'sourceModule' = $4
          )
          AND (
            $5::text IS NULL
            OR ($5 = 'unread' AND notification.status IN ('unread', 'action_required'))
            OR notification.status = $5
          )
        ORDER BY notification.created_at DESC, notification.id DESC
        LIMIT $6::integer
        OFFSET $7::integer
      `,
      [schoolId, userId, role, moduleName, status, limit, skip],
    );

    return rows.map((row) => this.toView(row));
  }

  async getBadges(schoolId: string, userId: string, role: string) {
    const rows = await this.queryForTenant<{
      module: string | null;
      priority: string | null;
    }>(
      schoolId,
      userId,
      `
        SELECT
          COALESCE(
            notification.source_module,
            notification.metadata->>'module',
            notification.metadata->>'sourceModule',
            'system'
          ) AS module,
          notification.priority
        FROM notifications notification
        WHERE notification.tenant_id = $1
          AND ${notificationRecipientPredicate('notification', '$2', '$3')}
          AND notification.status IN ('unread', 'action_required')
      `,
      [schoolId, userId, role],
    );
    const byModule = rows.reduce<Record<string, number>>((counts, row) => {
      const moduleName = row.module || 'system';
      counts[moduleName] = (counts[moduleName] ?? 0) + 1;
      return counts;
    }, {});

    return {
      unreadCount: rows.length,
      urgentCount: rows.filter((row) => row.priority?.toLowerCase() === 'urgent').length,
      byModule,
    };
  }

  async safeMarkAsRead(
    id: string,
    schoolId: string,
    userId: string,
    role: string,
  ): Promise<NotificationView> {
    return this.updateForRecipient(id, schoolId, userId, role, `
      status = 'read',
      read_at = COALESCE(read_at, NOW()),
      updated_at = NOW()
    `);
  }

  async markAllAsRead(schoolId: string, userId: string, role: string): Promise<{ count: number }> {
    const rows = await this.queryForTenant<{ id: string }>(
      schoolId,
      userId,
      `
        UPDATE notifications notification
        SET
          status = 'read',
          read_at = COALESCE(notification.read_at, NOW()),
          updated_at = NOW()
        WHERE notification.tenant_id = $1
          AND ${notificationRecipientPredicate('notification', '$2', '$3')}
          AND notification.status IN ('unread', 'action_required')
        RETURNING notification.id::text
      `,
      [schoolId, userId, role],
    );

    return { count: rows.length };
  }

  async dismiss(
    id: string,
    schoolId: string,
    userId: string,
    role: string,
  ): Promise<NotificationView> {
    return this.updateForRecipient(id, schoolId, userId, role, `
      status = 'dismissed',
      metadata = jsonb_set(
        COALESCE(metadata, '{}'::jsonb),
        '{dismissedAt}',
        to_jsonb(NOW()::text),
        true
      ),
      updated_at = NOW()
    `);
  }

  async markActionTaken(
    id: string,
    schoolId: string,
    userId: string,
    role: string,
  ): Promise<NotificationView> {
    return this.updateForRecipient(id, schoolId, userId, role, `
      status = 'action_taken',
      metadata = jsonb_set(
        COALESCE(metadata, '{}'::jsonb),
        '{actionTakenAt}',
        to_jsonb(NOW()::text),
        true
      ),
      updated_at = NOW()
    `);
  }

  private async updateForRecipient(
    id: string,
    schoolId: string,
    userId: string,
    role: string,
    updateSql: string,
  ): Promise<NotificationView> {
    const rows = await this.queryForTenant<CanonicalNotificationRow>(
      schoolId,
      userId,
      `
        UPDATE notifications notification
        SET ${updateSql}
        WHERE notification.tenant_id = $1
          AND ${notificationRecipientPredicate('notification', '$2', '$3')}
          AND notification.id::text = $4::text
        RETURNING
          notification.id::text,
          notification.tenant_id,
          notification.notification_key,
          notification.recipient_user_id::text,
          notification.recipient_role,
          notification.type,
          notification.title,
          notification.body,
          notification.status,
          notification.priority,
          notification.source_module,
          notification.source_record_id,
          notification.metadata,
          notification.read_at,
          notification.created_at,
          notification.updated_at
      `,
      [schoolId, userId, role, id],
    );

    if (!rows[0]) {
      throw new NotFoundException('Notification was not found for the active school role');
    }

    return this.toView(rows[0]);
  }

  private async queryForTenant<T>(
    tenantId: string,
    userId: string | null,
    sql: string,
    params: unknown[],
  ): Promise<T[]> {
    return this.prisma.executeWithTenant(tenantId, userId, async (tx) => {
      const result = await tx.$queryRawUnsafe<T[]>(sql, ...params);
      return Array.isArray(result) ? result : [result];
    });
  }

  private buildNotificationKey(data: CreateNotificationDto): string {
    if (!data.entityType || !data.entityId) {
      return `notification:${randomUUID()}`;
    }

    const recipient = data.targetUserId
      ? `user:${data.targetUserId}`
      : data.targetRole
        ? `role:${data.targetRole.toLowerCase()}`
        : 'unaddressed';
    return [
      'notification',
      data.module.toLowerCase(),
      data.eventType.toLowerCase(),
      data.entityType.toLowerCase(),
      data.entityId,
      recipient,
    ].join(':');
  }

  private normalizePriority(value: NotificationPriority | undefined): string {
    return (value ?? NotificationPriority.NORMAL).toString().toLowerCase();
  }

  private normalizeStatusFilter(value: string | undefined): string | null {
    const normalized = this.optionalText(value)?.toLowerCase();
    if (!normalized || normalized === 'all') {
      return null;
    }

    const supported = new Set([
      'unread',
      'read',
      'action_required',
      'action_taken',
      'dismissed',
      'expired',
      'failed',
    ]);
    if (!supported.has(normalized)) {
      throw new BadRequestException('Unsupported notification status filter');
    }

    return normalized;
  }

  private normalizeInteger(
    value: string | number | undefined,
    fallback: number,
    minimum: number,
    maximum: number,
  ): number {
    const parsed = typeof value === 'number' ? value : Number.parseInt(value ?? '', 10);
    if (!Number.isFinite(parsed)) {
      return fallback;
    }

    return Math.min(Math.max(Math.trunc(parsed), minimum), maximum);
  }

  private optionalText(value: unknown): string | null {
    return typeof value === 'string' && value.trim() ? value.trim() : null;
  }

  private normalizeMetadata(value: unknown): Record<string, unknown> {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return value as Record<string, unknown>;
    }

    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value) as unknown;
        return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
          ? parsed as Record<string, unknown>
          : {};
      } catch {
        return {};
      }
    }

    return {};
  }

  private toView(row: CanonicalNotificationRow): NotificationView {
    const metadata = this.normalizeMetadata(row.metadata);
    const status = (row.status || 'unread').toUpperCase();
    const moduleName = this.optionalText(row.source_module)
      ?? this.optionalText(metadata.module)
      ?? this.optionalText(metadata.sourceModule)
      ?? 'system';

    return {
      id: String(row.id),
      schoolId: row.tenant_id,
      targetUserId: this.optionalText(row.recipient_user_id)
        ?? this.optionalText(metadata.targetUserId)
        ?? this.optionalText(metadata.recipientUserId)
        ?? this.optionalText(metadata.target_user_id)
        ?? this.optionalText(metadata.recipient_user_id),
      targetRole: this.optionalText(row.recipient_role)
        ?? this.optionalText(metadata.targetRole)
        ?? this.optionalText(metadata.recipientRole)
        ?? this.optionalText(metadata.target_role)
        ?? this.optionalText(metadata.recipient_role),
      module: moduleName,
      eventType: row.type,
      entityType: this.optionalText(metadata.entityType),
      entityId: this.optionalText(row.source_record_id) ?? this.optionalText(metadata.entityId),
      channel: 'IN_APP',
      title: row.title,
      message: row.body,
      priority: (row.priority || 'normal').toUpperCase(),
      status,
      actionUrl: this.optionalText(metadata.actionUrl) ?? this.optionalText(metadata.action_url),
      actionLabel: this.optionalText(metadata.actionLabel) ?? this.optionalText(metadata.action_label),
      metadataJson: metadata,
      createdAt: row.created_at,
      readAt: row.read_at,
      created_at: row.created_at,
      read_at: row.read_at,
      is_read: !['UNREAD', 'ACTION_REQUIRED'].includes(status),
    };
  }
}
