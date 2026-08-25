import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import {
  DEFAULT_ROLE_ACCOUNTANT,
  DEFAULT_ROLE_ADMISSIONS_OFFICER,
  DEFAULT_ROLE_BURSAR,
  DEFAULT_ROLE_COUNSELLOR,
  DEFAULT_ROLE_DEAN_ACADEMICS,
  DEFAULT_ROLE_DISCIPLINE_MASTER,
  DEFAULT_ROLE_ICT_MANAGER,
  DEFAULT_ROLE_LAB_TECHNICIAN,
  DEFAULT_ROLE_NURSE,
  DEFAULT_ROLE_PARENT,
  DEFAULT_ROLE_STUDENT,
  SCHOOL_STAFF_ROLE_CODES,
} from '../../auth/auth.constants';
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

const SCHOOL_AUDIENCE_ROLE_ALIASES: Readonly<Record<string, readonly string[]>> = {
  academics: [DEFAULT_ROLE_DEAN_ACADEMICS],
  admissions: [DEFAULT_ROLE_ADMISSIONS_OFFICER],
  dean_of_academics: [DEFAULT_ROLE_DEAN_ACADEMICS],
  discipline: [DEFAULT_ROLE_DISCIPLINE_MASTER],
  finance: [DEFAULT_ROLE_ACCOUNTANT, DEFAULT_ROLE_BURSAR],
  facility_manager: [DEFAULT_ROLE_ICT_MANAGER],
  guidance_counselling: [DEFAULT_ROLE_COUNSELLOR],
  ict: [DEFAULT_ROLE_ICT_MANAGER],
  laboratory_technician: [DEFAULT_ROLE_LAB_TECHNICIAN],
  medical: [DEFAULT_ROLE_NURSE],
};

const PLATFORM_ONLY_AUDIENCE_ROLES = new Set([
  'finance_admin',
  'platform_owner',
  'platform_support',
  'super_admin',
  'superadmin',
  'support',
  'support_agent',
  'support_lead',
  'system_admin',
  'system_monitor',
]);

const RESERVED_OPERATION_PAYLOAD_KEYS = [
  'schoolId',
  'school_id',
  'tenantId',
  'tenant_id',
  'actorUserId',
  'actor_user_id',
  'actorRole',
  'actor_role',
  'createdBy',
  'created_by',
  'source',
  'sourceUserId',
  'source_user_id',
  'sourceRole',
  'source_role',
  'sourceDashboard',
  'source_dashboard',
  'sourceModule',
  'source_module',
  'targetUserId',
  'target_user_id',
  'targetUserIds',
  'target_user_ids',
  'recipientUserId',
  'recipient_user_id',
  'recipientUserIds',
  'recipient_user_ids',
  'audienceUserIds',
  'audience_user_ids',
  'targetRole',
  'target_role',
  'recipientRole',
  'recipient_role',
  'targetRoles',
  'target_roles',
  'audienceRoles',
  'audience_roles',
] as const;

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
    const actorRole = this.normalizeRoleCode(this.requireText(store.role, 'active role'));
    const title = this.requireText(event.title, 'event.title');
    const body = this.requireText(event.body, 'event.body');
    const occurredAt = this.normalizeIsoDate(event.createdAt);
    const notifications = Array.isArray(dto.notifications)
      ? dto.notifications.map((notification) => ({
          ...notification,
          audienceRoles: this.normalizeAudienceRoles(notification.audienceRoles),
        })).filter((notification) => notification.audienceRoles.length > 0)
      : [];
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
      target_user_ids: this.targetUserIdsFromNotifications(notifications),
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
    const userId = this.requireText(store.user_id, 'user context');
    const role = this.optionalText(store.role);

    return {
      data: await this.schoolOperationNotificationsRepository.listForTenantRole(
        tenantId,
        userId,
        role,
        { limit: this.normalizeLimit(options.limit) },
      ),
    };
  }

  async markCurrentTenantNotificationRead(notificationId: unknown) {
    const store = this.requestContext.requireStore();
    const tenantId = this.requireText(store.tenant_id, 'tenant context');
    const userId = this.requireText(store.user_id, 'user context');
    const role = this.optionalText(store.role);
    const id = this.requireText(notificationId, 'notificationId');
    const notification = await this.schoolOperationNotificationsRepository.markReadForTenantRole(
      tenantId,
      userId,
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
      // The canonical inbox predicate gives an explicit user recipient
      // precedence over role audiences. Keep the realtime event aligned with
      // that rule so a family-specific message cannot become a role broadcast.
      if (this.exactUserRecipientIds(notification).length > 0) {
        return;
      }

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

  private targetUserIdsFromNotifications(
    notifications: SchoolOperationalNotificationInput[],
  ): string[] {
    return Array.from(new Set(
      notifications.flatMap((notification) => this.exactUserRecipientIds(notification)),
    ));
  }

  private exactUserRecipientIds(notification: SchoolOperationalNotificationInput): string[] {
    const ids: string[] = [];
    const scalarKeys = [
      'targetUserId',
      'target_user_id',
      'recipientUserId',
      'recipient_user_id',
    ] as const;
    const arrayKeys = [
      'targetUserIds',
      'target_user_ids',
      'recipientUserIds',
      'recipient_user_ids',
      'audienceUserIds',
      'audience_user_ids',
    ] as const;

    scalarKeys.forEach((key) => {
      const value = notification[key];
      if (value === undefined || value === null) {
        return;
      }
      if (typeof value !== 'string' || !value.trim()) {
        throw new BadRequestException(`Notification ${key} must be a non-empty string`);
      }
      ids.push(value.trim());
    });

    arrayKeys.forEach((key) => {
      const value = notification[key];
      if (value === undefined || value === null) {
        return;
      }
      throw new BadRequestException(
        `Notification ${key} is not supported; create one exact-recipient notification per user`,
      );
    });

    return Array.from(new Set(ids));
  }

  private normalizeAudienceRoles(value: unknown): string[] {
    if (value === undefined || value === null) {
      return [];
    }
    if (!Array.isArray(value)) {
      throw new BadRequestException('Notification audienceRoles must be an array');
    }

    const allowedRoles = new Set<string>([
      ...SCHOOL_STAFF_ROLE_CODES,
      DEFAULT_ROLE_PARENT,
      DEFAULT_ROLE_STUDENT,
    ]);
    const normalized = Array.from(new Set(value.flatMap((role) => {
      if (typeof role !== 'string' || !role.trim()) {
        throw new BadRequestException('Notification audience roles must be non-empty strings');
      }
      const roleCode = this.normalizeRoleCode(role);
      if (PLATFORM_ONLY_AUDIENCE_ROLES.has(roleCode)) {
        return [];
      }
      return SCHOOL_AUDIENCE_ROLE_ALIASES[roleCode] ?? [roleCode];
    })));

    if (normalized.some((role) => !allowedRoles.has(role))) {
      throw new BadRequestException('Notification audiences must be valid school roles');
    }
    return normalized;
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
      const payload = { ...(value as Record<string, unknown>) };
      RESERVED_OPERATION_PAYLOAD_KEYS.forEach((key) => delete payload[key]);
      return payload;
    }

    return {};
  }

  private normalizeRoleCode(value: string): string {
    return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
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
