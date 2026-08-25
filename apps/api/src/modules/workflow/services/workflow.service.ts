import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../../../database/prisma.service';

const WORKFLOW_ROLE_ALIASES: Readonly<Record<string, readonly string[]>> = {
  admissions: ['admissions_officer'],
  dean_of_academics: ['dean_academics'],
  facility_manager: ['ict_manager'],
  finance: ['accountant', 'bursar'],
  guidance_counselling: ['school_counsellor'],
  ict: ['ict_manager'],
  laboratory_technician: ['lab_technician'],
};

const PLATFORM_ONLY_WORKFLOW_ROLES = new Set([
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

const RESERVED_WORKFLOW_PAYLOAD_KEYS = [
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

export interface CreateWorkflowEventInput {
  schoolId?: string;
  sourceUserId?: string;
  sourceRole?: string;
  targetRoles: string[];
  eventType: string;
  entityType: string;
  entityId?: string;
  title: string;
  message?: string;
  priority?: 'low' | 'normal' | 'high' | 'critical';
  payload?: unknown;
}

export interface WorkflowPrincipal {
  tenantId: string;
  userId: string;
  role: string;
  requestId: string;
}

type WorkflowEventRow = {
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
  handled_by_user_id: string | null;
  created_at: Date | string;
  updated_at: Date | string;
};

@Injectable()
export class WorkflowService {
  constructor(private readonly prisma: PrismaService) {}

  async listEvents(
    principal: WorkflowPrincipal,
    limit = 50,
    offset = 0,
  ): Promise<WorkflowEventRow[]> {
    const normalizedRole = this.normalizeRole(principal.role);
    return this.queryForTenant<WorkflowEventRow>(principal, `
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
        event.handled_by_user_id::text,
        event.created_at,
        event.updated_at
      FROM workflow_events event
      WHERE event.tenant_id::text = $1::text
        AND ${this.audiencePredicate('event', '$2', '$3')}
      ORDER BY event.created_at DESC, event.id DESC
      LIMIT $4::integer
      OFFSET $5::integer
    `, [principal.tenantId, principal.userId, normalizedRole, limit, offset]);
  }

  async createWorkflowEvent(
    input: CreateWorkflowEventInput,
    principal: WorkflowPrincipal,
  ): Promise<WorkflowEventRow> {
    const targetRoles = this.normalizeTargetRoles(input.targetRoles);
    const eventType = this.requiredText(input.eventType, 'Event type', 120);
    const entityType = this.requiredText(input.entityType, 'Entity type', 120);
    const entityId = this.optionalText(input.entityId, 200);
    const title = this.requiredText(input.title, 'Event title', 180);
    const message = this.optionalText(input.message, 2_000);
    const priority = this.normalizePriority(input.priority);
    const payload = this.normalizePayload(input.payload);

    return this.prisma.executeWithTenant(principal.tenantId, principal.userId, async (tx) => {
      const matchingRoles = await tx.$queryRawUnsafe<Array<{ code: string }>>(`
        SELECT role.code
        FROM roles role
        WHERE role.tenant_id::text = $1::text
          AND regexp_replace(lower(btrim(role.code)), '[^a-z0-9]+', '_', 'g') IN (
            SELECT jsonb_array_elements_text($2::jsonb)
          )
      `, principal.tenantId, JSON.stringify(targetRoles));
      const matched = new Set(matchingRoles.map((row) => this.normalizeRole(row.code)));
      const missingRoles = targetRoles.filter((role) => !matched.has(role));
      if (missingRoles.length > 0) {
        throw new BadRequestException('Every target role must belong to the active school');
      }

      const rows = await tx.$queryRawUnsafe<WorkflowEventRow[]>(`
        INSERT INTO workflow_events (
          tenant_id,
          source_user_id,
          source_role,
          target_roles,
          event_type,
          entity_type,
          entity_id,
          title,
          message,
          priority,
          payload
        )
        VALUES ($1, $2::uuid, $3, $4::jsonb, $5, $6, $7, $8, $9, $10, $11::jsonb)
        RETURNING
          id::text,
          source_user_id::text,
          source_role,
          target_roles,
          event_type,
          entity_type,
          entity_id,
          title,
          message,
          priority,
          payload,
          status,
          handled_by_user_id::text,
          created_at,
          updated_at
      `,
      principal.tenantId,
      principal.userId,
      this.normalizeRole(principal.role),
      JSON.stringify(targetRoles),
      eventType,
      entityType,
      entityId,
      title,
      message,
      priority,
      JSON.stringify(payload),
      );
      const event = rows[0];
      if (!event) {
        throw new Error('Workflow event persistence returned no record');
      }

      await this.writeAudit(tx, principal, 'workflow.event_created', event.id, {
        eventType,
        entityType,
        entityId,
        targetRoles,
      });
      return event;
    });
  }

  async dispatchWorkflowEvent(
    eventId: string,
    principal: WorkflowPrincipal,
  ): Promise<WorkflowEventRow> {
    return this.updateEvent(eventId, principal, 'dispatched');
  }

  async markEventHandled(
    eventId: string,
    principal: WorkflowPrincipal,
  ): Promise<WorkflowEventRow> {
    return this.updateEvent(eventId, principal, 'handled');
  }

  private async updateEvent(
    eventId: string,
    principal: WorkflowPrincipal,
    status: 'dispatched' | 'handled',
  ): Promise<WorkflowEventRow> {
    const normalizedRole = this.normalizeRole(principal.role);

    return this.prisma.executeWithTenant(principal.tenantId, principal.userId, async (tx) => {
      const rows = await tx.$queryRawUnsafe<WorkflowEventRow[]>(`
        UPDATE workflow_events event
        SET
          status = $1,
          handled_by_user_id = CASE WHEN $1 = 'handled' THEN $2::uuid ELSE event.handled_by_user_id END,
          updated_at = NOW()
        WHERE event.id::text = $3::text
          AND event.tenant_id::text = $4::text
          AND (
            (
              $1 = 'dispatched'
              AND event.source_user_id::text = $2::text
              AND lower(event.status) IN ('pending', 'created', 'queued')
            )
            OR (
              $1 = 'handled'
              AND lower(event.status) = 'dispatched'
              AND ${this.audiencePredicate('event', '$2', '$5')}
            )
          )
        RETURNING
          id::text,
          source_user_id::text,
          source_role,
          target_roles,
          event_type,
          entity_type,
          entity_id,
          title,
          message,
          priority,
          payload,
          status,
          handled_by_user_id::text,
          created_at,
          updated_at
      `, status, principal.userId, eventId, principal.tenantId, normalizedRole);
      const event = rows[0];
      if (!event) {
        throw new NotFoundException('Workflow event was not found for the active school role');
      }

      await this.writeAudit(tx, principal, `workflow.event_${status}`, event.id, {
        eventType: event.event_type,
      });
      return event;
    });
  }

  private audiencePredicate(alias: string, userParameter: string, roleParameter: string): string {
    return `(
      COALESCE(
        NULLIF(${alias}.payload->>'targetUserId', ''),
        NULLIF(${alias}.payload->>'recipientUserId', '')
      ) = ${userParameter}::text
      OR (
        COALESCE(
          NULLIF(${alias}.payload->>'targetUserId', ''),
          NULLIF(${alias}.payload->>'recipientUserId', '')
        ) IS NULL
        AND EXISTS (
          SELECT 1
          FROM jsonb_array_elements_text(
            CASE
              WHEN jsonb_typeof(${alias}.target_roles) = 'array' THEN ${alias}.target_roles
              ELSE '[]'::jsonb
            END
          ) target_role(value)
          WHERE regexp_replace(lower(btrim(target_role.value)), '[^a-z0-9]+', '_', 'g') = ${roleParameter}
        )
      )
    )`;
  }

  private queryForTenant<T>(
    principal: WorkflowPrincipal,
    sql: string,
    params: unknown[],
  ): Promise<T[]> {
    return this.prisma.executeWithTenant(principal.tenantId, principal.userId, async (tx) => {
      const rows = await tx.$queryRawUnsafe<T[]>(sql, ...params);
      return Array.isArray(rows) ? rows : [rows];
    });
  }

  private async writeAudit(
    tx: { $executeRawUnsafe: (sql: string, ...params: unknown[]) => Promise<number> },
    principal: WorkflowPrincipal,
    action: string,
    eventId: string,
    metadata: Record<string, unknown>,
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
      VALUES ($1, $1, $2::uuid, $3, $4, 'workflow', 'workflow_event', $5, 'workflow_event', $4, $6::jsonb)
    `, principal.tenantId, principal.userId, principal.requestId, action, eventId, JSON.stringify(metadata));
  }

  private normalizeTargetRoles(value: unknown): string[] {
    if (!Array.isArray(value) || value.length === 0 || value.length > 20) {
      throw new BadRequestException('Select between 1 and 20 target school roles');
    }
    const normalized = Array.from(new Set(value.flatMap((role) => {
      if (typeof role !== 'string' || !role.trim()) {
        throw new BadRequestException('Target roles must be non-empty strings');
      }
      const roleCode = this.normalizeRoleToken(role);
      if (PLATFORM_ONLY_WORKFLOW_ROLES.has(roleCode)) {
        throw new BadRequestException('Workflow events cannot target platform-only roles');
      }
      return WORKFLOW_ROLE_ALIASES[roleCode] ?? [roleCode];
    })));
    if (normalized.length === 0 || normalized.length > 20 || normalized.some((role) => !role)) {
      throw new BadRequestException('Target roles must be valid role names');
    }
    return normalized;
  }

  private normalizePriority(value: CreateWorkflowEventInput['priority']): string {
    const priority = value ?? 'normal';
    if (!['low', 'normal', 'high', 'critical'].includes(priority)) {
      throw new BadRequestException('Unsupported workflow-event priority');
    }
    return priority;
  }

  private normalizePayload(value: unknown): Record<string, unknown> {
    if (value === undefined || value === null) {
      return {};
    }
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      throw new BadRequestException('Workflow-event payload must be an object');
    }
    const payload = { ...(value as Record<string, unknown>) };
    RESERVED_WORKFLOW_PAYLOAD_KEYS.forEach((key) => delete payload[key]);
    return payload;
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

  private normalizeRole(value: string): string {
    const normalized = this.normalizeRoleToken(value);
    const aliases = WORKFLOW_ROLE_ALIASES[normalized];
    return aliases?.length === 1 ? aliases[0] : normalized;
  }

  private normalizeRoleToken(value: string): string {
    return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  }
}
