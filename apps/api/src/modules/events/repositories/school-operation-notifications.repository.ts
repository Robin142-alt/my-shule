import { Injectable } from '@nestjs/common';

import { DatabaseService } from '../../../database/database.service';

export interface MaterializeSchoolOperationNotificationInput {
  tenantId: string;
  operationId: string;
  notification: Record<string, unknown>;
}

export interface SchoolOperationNotificationView {
  id: string;
  title: string;
  detail: string;
  status: string;
  tone: 'ok' | 'warning' | 'critical';
  href: string;
  sourceModule: string;
  relatedModule: string | null;
  relatedRecordId: string | null;
  priority: string | null;
  requestStatus: string | null;
  actionType: string | null;
  originRole: string | null;
  targetRoles: string[];
  createdAt: string;
  readAt: string | null;
}

@Injectable()
export class SchoolOperationNotificationsRepository {
  constructor(private readonly databaseService: DatabaseService) {}

  async upsertFromSchoolOperation(input: MaterializeSchoolOperationNotificationInput): Promise<void> {
    const title = this.textOrDefault(input.notification.title, 'School update');
    const body = this.textOrDefault(input.notification.body, 'A school operation needs attention.');
    const type = this.textOrDefault(input.notification.type, 'school.operation.recorded');
    const notificationId = this.textOrDefault(input.notification.id, input.operationId);
    const notificationKey = `school-operation:${input.operationId}:${notificationId}`;

    await this.databaseService.query(
      `
        INSERT INTO notifications (
          tenant_id,
          notification_key,
          recipient_user_id,
          recipient_guardian_id,
          type,
          title,
          body,
          status,
          metadata
        )
        VALUES ($1, $2, NULL, NULL, $3, $4, $5, 'unread', $6::jsonb)
        ON CONFLICT (tenant_id, notification_key)
        DO UPDATE SET
          title = EXCLUDED.title,
          body = EXCLUDED.body,
          metadata = EXCLUDED.metadata,
          updated_at = NOW()
      `,
      [
        input.tenantId,
        notificationKey,
        type,
        title,
        body,
        JSON.stringify({
          ...input.notification,
          operation_id: input.operationId,
          target_roles: Array.isArray(input.notification.audienceRoles)
            ? input.notification.audienceRoles
            : [],
        }),
      ],
    );
  }

  async listForTenantRole(
    tenantId: string,
    role: string | null,
    options: { limit?: number } = {},
  ): Promise<SchoolOperationNotificationView[]> {
    const result = await this.databaseService.query(
      `
        SELECT
          id,
          notification_key,
          type,
          title,
          body,
          status,
          read_at,
          metadata,
          created_at,
          updated_at
        FROM notifications
        WHERE tenant_id = $1
          AND (
            $2::text IS NULL
            OR metadata->'target_roles' IS NULL
            OR CASE
              WHEN jsonb_typeof(metadata->'target_roles') = 'array'
                THEN jsonb_array_length(metadata->'target_roles') = 0
                  OR (metadata->'target_roles') ? $2
              ELSE true
            END
            OR CASE
              WHEN jsonb_typeof(metadata->'audienceRoles') = 'array'
                THEN (metadata->'audienceRoles') ? $2
              ELSE false
            END
            OR metadata->>'recipientRole' = $2
          )
        ORDER BY
          CASE WHEN status = 'unread' THEN 0 ELSE 1 END,
          created_at DESC
        LIMIT $3::integer
      `,
      [tenantId, role, this.normalizeLimit(options.limit)],
    );

    return result.rows.map((row) => this.toView(row));
  }

  async markReadForTenantRole(
    tenantId: string,
    role: string | null,
    notificationId: string,
  ): Promise<SchoolOperationNotificationView | null> {
    const result = await this.databaseService.query(
      `
        UPDATE notifications
        SET
          status = 'read',
          read_at = COALESCE(read_at, NOW()),
          updated_at = NOW()
        WHERE tenant_id = $1
          AND id = $2::uuid
          AND (
            $3::text IS NULL
            OR metadata->'target_roles' IS NULL
            OR CASE
              WHEN jsonb_typeof(metadata->'target_roles') = 'array'
                THEN jsonb_array_length(metadata->'target_roles') = 0
                  OR (metadata->'target_roles') ? $3
              ELSE true
            END
            OR CASE
              WHEN jsonb_typeof(metadata->'audienceRoles') = 'array'
                THEN (metadata->'audienceRoles') ? $3
              ELSE false
            END
            OR metadata->>'recipientRole' = $3
          )
        RETURNING
          id,
          notification_key,
          type,
          title,
          body,
          status,
          read_at,
          metadata,
          created_at,
          updated_at
      `,
      [tenantId, notificationId, role],
    );

    const [row] = result.rows;
    return row ? this.toView(row) : null;
  }

  private textOrDefault(value: unknown, fallback: string): string {
    return typeof value === 'string' && value.trim() ? value.trim() : fallback;
  }

  private normalizeLimit(value: unknown): number {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      return 8;
    }

    return Math.min(Math.max(Math.trunc(value), 1), 50);
  }

  private toView(row: Record<string, unknown>): SchoolOperationNotificationView {
    const metadata = this.normalizeMetadata(row.metadata);
    const sourceModule = this.textOrDefault(
      metadata.sourceModule ?? metadata.source_module ?? metadata.module,
      'dashboard',
    );
    const relatedModule = this.optionalText(
      metadata.relatedModule ?? metadata.related_module,
    );
    const relatedRecordId = this.optionalText(
      metadata.relatedRecordId ?? metadata.related_record_id,
    );
    const explicitHref = this.optionalText(
      metadata.actionUrl ?? metadata.action_url ?? metadata.href,
    );
    const targetRoles = this.stringArray(
      metadata.target_roles ?? metadata.targetRoles ?? metadata.audienceRoles,
    );

    return {
      id: this.textOrDefault(row.id, ''),
      title: this.textOrDefault(row.title, 'School update'),
      detail: this.textOrDefault(row.body, 'A school operation needs attention.'),
      status: this.textOrDefault(row.status, 'unread'),
      tone: this.toTone(metadata.priority ?? metadata.severity),
      href: explicitHref ?? this.buildHref(sourceModule, relatedModule, relatedRecordId),
      sourceModule,
      relatedModule,
      relatedRecordId,
      priority: this.optionalText(metadata.priority ?? metadata.severity),
      requestStatus: this.optionalText(metadata.requestStatus ?? metadata.request_status),
      actionType: this.optionalText(metadata.actionType ?? metadata.action_type ?? row.type),
      originRole: this.optionalText(metadata.originRole ?? metadata.origin_role ?? metadata.createdBy),
      targetRoles,
      createdAt: this.toIsoString(row.created_at),
      readAt: row.read_at ? this.toIsoString(row.read_at) : null,
    };
  }

  private normalizeMetadata(value: unknown): Record<string, unknown> {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return value as Record<string, unknown>;
    }

    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value) as unknown;
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          return parsed as Record<string, unknown>;
        }
      } catch {
        return {};
      }
    }

    return {};
  }

  private optionalText(value: unknown): string | null {
    return typeof value === 'string' && value.trim() ? value.trim() : null;
  }

  private stringArray(value: unknown): string[] {
    if (!Array.isArray(value)) {
      return [];
    }

    return value.filter((item): item is string => typeof item === 'string' && Boolean(item.trim()));
  }

  private toTone(value: unknown): SchoolOperationNotificationView['tone'] {
    const normalized = typeof value === 'string' ? value.toLowerCase() : '';

    if (normalized === 'critical' || normalized === 'urgent' || normalized === 'high') {
      return 'critical';
    }

    if (normalized === 'warning' || normalized === 'important') {
      return 'warning';
    }

    return 'ok';
  }

  private buildHref(
    sourceModule: string,
    relatedModule: string | null,
    relatedRecordId: string | null,
  ): string {
    const moduleName = relatedModule ?? sourceModule;

    if (relatedRecordId) {
      return `/${moduleName}?record=${encodeURIComponent(relatedRecordId)}`;
    }

    return `/${moduleName}`;
  }

  private toIsoString(value: unknown): string {
    if (value instanceof Date) {
      return value.toISOString();
    }

    if (typeof value === 'string' && !Number.isNaN(Date.parse(value))) {
      return new Date(value).toISOString();
    }

    return new Date().toISOString();
  }
}
