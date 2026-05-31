import { Injectable } from '@nestjs/common';

import { DatabaseService } from '../../../database/database.service';

export interface MaterializeSchoolOperationNotificationInput {
  tenantId: string;
  operationId: string;
  notification: Record<string, unknown>;
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

  private textOrDefault(value: unknown, fallback: string): string {
    return typeof value === 'string' && value.trim() ? value.trim() : fallback;
  }
}
