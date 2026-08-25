import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import { PrismaService } from '../../../database/prisma.service';

export interface NotifyRolesInput {
  schoolId: string;
  targetRoles: string[];
  title: string;
  message: string;
  type: string;
  priority?: 'low' | 'normal' | 'high' | 'critical';
  entityType?: string;
  entityId?: string;
  actionUrl?: string;
}

export interface NotifyUserInput {
  schoolId: string;
  userId: string;
  title: string;
  message: string;
  type: string;
  priority?: 'low' | 'normal' | 'high' | 'critical';
  entityType?: string;
  entityId?: string;
  actionUrl?: string;
}

@Injectable()
export class NotificationService {
  constructor(private readonly prisma: PrismaService) {}

  notifyRoles(input: NotifyRolesInput) {
    return this.prisma.executeWithTenant(input.schoolId, null, async (tx) => {
      const notifications = [];
      for (const role of input.targetRoles) {
        const rows = await tx.$queryRawUnsafe<Record<string, unknown>[]>(`
          INSERT INTO notifications (
            tenant_id,
            notification_key,
            recipient_role,
            type,
            title,
            body,
            status,
            priority,
            source_record_id,
            metadata
          )
          VALUES ($1, $2, $3, $4, $5, $6, 'unread', $7, $8, $9::jsonb)
          RETURNING *
        `,
        input.schoolId,
        `workflow-role:${randomUUID()}`,
        this.normalizeRole(role),
        input.type,
        input.title,
        input.message,
        input.priority ?? 'normal',
        input.entityId ?? null,
        JSON.stringify({
          entityType: input.entityType ?? null,
          actionUrl: input.actionUrl ?? null,
        }),
        );
        if (rows[0]) notifications.push(rows[0]);
      }
      return notifications;
    });
  }

  notifyUser(input: NotifyUserInput) {
    return this.prisma.executeWithTenant(input.schoolId, null, async (tx) => {
      const rows = await tx.$queryRawUnsafe<Record<string, unknown>[]>(`
        INSERT INTO notifications (
          tenant_id,
          notification_key,
          recipient_user_id,
          type,
          title,
          body,
          status,
          priority,
          source_record_id,
          metadata
        )
        VALUES ($1, $2, $3::uuid, $4, $5, $6, 'unread', $7, $8, $9::jsonb)
        RETURNING *
      `,
      input.schoolId,
      `workflow-user:${randomUUID()}`,
      input.userId,
      input.type,
      input.title,
      input.message,
      input.priority ?? 'normal',
      input.entityId ?? null,
      JSON.stringify({
        entityType: input.entityType ?? null,
        actionUrl: input.actionUrl ?? null,
      }),
      );
      return rows[0];
    });
  }

  private normalizeRole(value: string): string {
    return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  }
}
