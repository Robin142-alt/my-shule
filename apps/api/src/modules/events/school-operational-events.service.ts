import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import { RequestContextService } from '../../common/request-context/request-context.service';
import { EventPublisherService } from './event-publisher.service';
import { SchoolOperationRecordedPayload } from './events.types';
import { SchoolOperationNotificationsRepository } from './repositories/school-operation-notifications.repository';

interface SchoolOperationalEventInput {
  id?: unknown;
  schoolId?: unknown;
  type?: unknown;
  module?: unknown;
  actorRole?: unknown;
  title?: unknown;
  body?: unknown;
  entityId?: unknown;
  severity?: unknown;
  payload?: unknown;
  createdAt?: unknown;
}

interface SchoolOperationalNotificationInput extends Record<string, unknown> {
  audienceRoles?: unknown;
}

export interface SchoolOperationalEventSyncDto {
  schoolId?: unknown;
  event?: SchoolOperationalEventInput;
  notifications?: SchoolOperationalNotificationInput[];
  sms?: Record<string, unknown>[];
}

@Injectable()
export class SchoolOperationalEventsService {
  constructor(
    private readonly requestContext: RequestContextService,
    private readonly eventPublisher: EventPublisherService,
    private readonly schoolOperationNotificationsRepository: SchoolOperationNotificationsRepository,
  ) {}

  async recordSchoolOperation(dto: SchoolOperationalEventSyncDto) {
    const store = this.requestContext.requireStore();
    const tenantId = this.requireText(store.tenant_id, 'tenant context');
    const event = dto.event ?? {};
    const schoolId = this.requireText(dto.schoolId ?? event.schoolId ?? tenantId, 'schoolId');

    if (schoolId !== tenantId) {
      throw new BadRequestException('School operation schoolId does not match the current school');
    }

    const operationId = this.requireText(event.id, 'event.id');
    const operationType = this.requireText(event.type, 'event.type');
    const sourceModule = this.normalizeModule(event.module);
    const actorRole = this.requireText(event.actorRole, 'event.actorRole');
    const title = this.requireText(event.title, 'event.title');
    const body = this.requireText(event.body, 'event.body');
    const occurredAt = this.normalizeIsoDate(event.createdAt);
    const notifications = Array.isArray(dto.notifications) ? dto.notifications : [];
    const sms = Array.isArray(dto.sms) ? dto.sms : [];
    const payload: SchoolOperationRecordedPayload = {
      tenant_id: tenantId,
      school_id: schoolId,
      operation_id: operationId,
      operation_type: operationType,
      module: sourceModule,
      actor_role: actorRole,
      title,
      body,
      entity_id: typeof event.entityId === 'string' && event.entityId.trim() ? event.entityId.trim() : null,
      severity: this.normalizeSeverity(event.severity),
      target_roles: this.targetRolesFromNotifications(notifications),
      notifications: notifications as Record<string, unknown>[],
      sms,
      payload: this.recordPayload(event.payload),
      occurred_at: occurredAt,
    };

    const outboxEvent = await this.eventPublisher.publish({
      tenant_id: tenantId,
      event_key: `school.operation.recorded:${tenantId}:${operationId}`,
      event_name: 'school.operation.recorded',
      aggregate_type: 'school_operation',
      aggregate_id: randomUUID(),
      payload,
      headers: {
        source: 'web.dashboard',
        frontend_event_id: operationId,
        source_module: sourceModule,
        actor_role: actorRole,
      },
    });

    await Promise.all(
      notifications.map((notification) =>
        this.schoolOperationNotificationsRepository.upsertFromSchoolOperation({
          tenantId,
          operationId,
          notification,
        }),
      ),
    );

    return {
      status: 'accepted',
      tenant_id: tenantId,
      school_id: schoolId,
      event_id: outboxEvent.id,
      event_key: outboxEvent.event_key,
    };
  }

  async listCurrentTenantNotifications(options: { limit?: unknown } = {}) {
    const store = this.requestContext.requireStore();
    const tenantId = this.requireText(store.tenant_id, 'tenant context');
    const role = this.optionalText(store.role);

    return {
      data: await this.schoolOperationNotificationsRepository.listForTenantRole(
        tenantId,
        role,
        { limit: this.normalizeLimit(options.limit) },
      ),
    };
  }

  async markCurrentTenantNotificationRead(notificationId: unknown) {
    const store = this.requestContext.requireStore();
    const tenantId = this.requireText(store.tenant_id, 'tenant context');
    const role = this.optionalText(store.role);
    const id = this.requireText(notificationId, 'notificationId');
    const notification = await this.schoolOperationNotificationsRepository.markReadForTenantRole(
      tenantId,
      role,
      id,
    );

    if (!notification) {
      throw new NotFoundException('Notification was not found for the current school and role');
    }

    return { data: notification };
  }

  private targetRolesFromNotifications(notifications: SchoolOperationalNotificationInput[]): string[] {
    const roles = new Set<string>();

    notifications.forEach((notification) => {
      if (!Array.isArray(notification.audienceRoles)) {
        return;
      }

      notification.audienceRoles.forEach((role) => {
        if (typeof role === 'string' && role.trim()) {
          roles.add(role.trim());
        }
      });
    });

    return [...roles];
  }

  private normalizeModule(value: unknown): string {
    return this.requireText(value, 'event.module').toLowerCase().replace(/[^a-z0-9_-]/g, '-');
  }

  private normalizeSeverity(value: unknown): SchoolOperationRecordedPayload['severity'] {
    if (value === 'success' || value === 'warning' || value === 'critical' || value === 'info') {
      return value;
    }

    return 'info';
  }

  private normalizeIsoDate(value: unknown): string {
    if (typeof value === 'string' && !Number.isNaN(Date.parse(value))) {
      return new Date(value).toISOString();
    }

    return new Date().toISOString();
  }

  private recordPayload(value: unknown): Record<string, unknown> {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return value as Record<string, unknown>;
    }

    return {};
  }

  private requireText(value: unknown, fieldName: string): string {
    if (typeof value !== 'string' || !value.trim()) {
      throw new BadRequestException(`${fieldName} is required`);
    }

    return value.trim();
  }

  private optionalText(value: unknown): string | null {
    return typeof value === 'string' && value.trim() ? value.trim() : null;
  }

  private normalizeLimit(value: unknown): number {
    const numberValue =
      typeof value === 'string' && value.trim()
        ? Number(value)
        : typeof value === 'number'
          ? value
          : 8;

    if (!Number.isFinite(numberValue)) {
      return 8;
    }

    return Math.min(Math.max(Math.trunc(numberValue), 1), 50);
  }
}
