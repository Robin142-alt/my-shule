import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import { Permissions } from '../../../auth/decorators/permissions.decorator';
import { RequestContextService } from '../../../common/request-context/request-context.service';
import { PrismaService } from '../../../database/prisma.service';

type TaskPrincipal = {
  tenantId: string;
  userId: string;
  role: string;
  requestId: string;
};

type TaskRow = {
  id: string;
  title: string;
  description: string | null;
  due_date: Date | string | null;
  status: string;
  priority: string | null;
  module: string | null;
  record_id: string | null;
  created_at: Date | string;
  updated_at: Date | string;
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

@Controller('tasks')
export class TaskController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly requestContext: RequestContextService,
  ) {}

  @Permissions('events:read')
  @Get()
  async getTasks(): Promise<TaskRow[]> {
    const principal = this.requirePrincipal();
    const normalizedRole = this.normalizeRole(principal.role);

    return this.queryForTenant<TaskRow>(principal, `
      SELECT
        task.id::text,
        task.title,
        task.description,
        task.due_date,
        lower(task.status) AS status,
        task.priority,
        task.module,
        task.record_id,
        task.created_at,
        task.updated_at
      FROM tasks task
      WHERE task.tenant_id::text = $1::text
        AND (
          task.assigned_to_user_id::text = $2::text
          OR (
            task.assigned_to_user_id IS NULL
            AND regexp_replace(lower(btrim(COALESCE(task.assigned_to_role, ''))), '[^a-z0-9]+', '_', 'g') = $3
          )
        )
        AND lower(task.status) IN ('open', 'pending', 'in_progress')
      ORDER BY
        CASE lower(COALESCE(task.priority, 'normal'))
          WHEN 'urgent' THEN 0
          WHEN 'high' THEN 1
          WHEN 'normal' THEN 2
          ELSE 3
        END,
        task.due_date ASC NULLS LAST,
        task.created_at DESC
      LIMIT 100
    `, [principal.tenantId, principal.userId, normalizedRole]);
  }

  @Permissions('users:write')
  @Post()
  async createTask(@Body() body: Record<string, unknown>): Promise<TaskRow> {
    const principal = this.requirePrincipal();
    const title = this.requiredText(body.title, 'Task title', 180);
    const description = this.optionalText(body.description, 2_000);
    const targetUserId = this.optionalUuid(body.targetUserId ?? body.userId, 'Target user');
    const targetRole = this.optionalText(body.targetRole, 100);
    const dueDate = this.optionalDate(body.dueDate ?? body.due_date);

    if (!targetUserId && !targetRole) {
      throw new BadRequestException('Assign the task to a school user or role');
    }

    await this.assertValidAudience(principal, targetUserId, targetRole);

    return this.prisma.executeWithTenant(principal.tenantId, principal.userId, async (tx) => {
      const rows = await tx.$queryRawUnsafe<TaskRow[]>(`
        INSERT INTO tasks (
          tenant_id,
          task_key,
          assigned_to_user_id,
          assigned_to_role,
          created_by_user_id,
          title,
          description,
          status,
          priority,
          due_date,
          metadata
        )
        VALUES ($1, $2, $3::uuid, $4, $5::uuid, $6, $7, 'OPEN', 'normal', $8::timestamptz, $9::jsonb)
        RETURNING
          id::text,
          title,
          description,
          due_date,
          lower(status) AS status,
          priority,
          module,
          record_id,
          created_at,
          updated_at
      `,
      principal.tenantId,
      `dashboard:${randomUUID()}`,
      targetUserId,
      targetRole ? this.normalizeRole(targetRole) : null,
      principal.userId,
      title,
      description,
      dueDate,
      JSON.stringify({ sourceDashboard: principal.role }),
      );
      const task = rows[0];
      if (!task) {
        throw new Error('Task persistence returned no record');
      }

      await this.writeAudit(tx, principal, 'task.created', task.id, {
        targetUserId,
        targetRole: targetRole ? this.normalizeRole(targetRole) : null,
      });
      return task;
    });
  }

  @Permissions('events:write')
  @Patch(':id/complete')
  async completeTask(@Param('id') id: string): Promise<TaskRow> {
    const principal = this.requirePrincipal();
    const normalizedRole = this.normalizeRole(principal.role);

    return this.prisma.executeWithTenant(principal.tenantId, principal.userId, async (tx) => {
      const rows = await tx.$queryRawUnsafe<TaskRow[]>(`
        UPDATE tasks task
        SET
          status = 'COMPLETED',
          completed_at = COALESCE(task.completed_at, NOW()),
          updated_at = NOW()
        WHERE task.id::text = $1::text
          AND task.tenant_id::text = $2::text
          AND lower(task.status) IN ('open', 'pending', 'in_progress')
          AND (
            task.assigned_to_user_id::text = $3::text
            OR (
              task.assigned_to_user_id IS NULL
              AND regexp_replace(lower(btrim(COALESCE(task.assigned_to_role, ''))), '[^a-z0-9]+', '_', 'g') = $4
            )
          )
        RETURNING
          id::text,
          title,
          description,
          due_date,
          lower(status) AS status,
          priority,
          module,
          record_id,
          created_at,
          updated_at
      `, id, principal.tenantId, principal.userId, normalizedRole);
      const task = rows[0];
      if (!task) {
        throw new NotFoundException('Task was not found for the active school role');
      }

      await this.writeAudit(tx, principal, 'task.completed', task.id);
      return task;
    });
  }

  @Permissions('users:write')
  @Patch(':id/assign')
  async assignTask(
    @Param('id') id: string,
    @Body('userId') rawUserId: unknown,
  ): Promise<TaskRow> {
    const principal = this.requirePrincipal();
    const userId = this.optionalUuid(rawUserId, 'Assigned user');
    if (!userId) {
      throw new BadRequestException('Assigned user is required');
    }
    await this.assertValidAudience(principal, userId, null);

    return this.prisma.executeWithTenant(principal.tenantId, principal.userId, async (tx) => {
      const rows = await tx.$queryRawUnsafe<TaskRow[]>(`
        UPDATE tasks task
        SET assigned_to_user_id = $1::uuid, assigned_to_role = NULL, updated_at = NOW()
        WHERE task.id::text = $2::text
          AND task.tenant_id::text = $3::text
          AND lower(task.status) IN ('open', 'pending', 'in_progress')
        RETURNING
          id::text,
          title,
          description,
          due_date,
          lower(status) AS status,
          priority,
          module,
          record_id,
          created_at,
          updated_at
      `, userId, id, principal.tenantId);
      const task = rows[0];
      if (!task) {
        throw new NotFoundException('Task was not found in the active school');
      }

      await this.writeAudit(tx, principal, 'task.assigned', task.id, { assignedToUserId: userId });
      return task;
    });
  }

  private requirePrincipal(): TaskPrincipal {
    const store = this.requestContext.requireStore();
    if (!store.is_authenticated || !store.tenant_id || !store.user_id || !store.role) {
      throw new UnauthorizedException('An authenticated school role is required');
    }
    if (!UUID_PATTERN.test(store.user_id)) {
      throw new UnauthorizedException('The authenticated school user is invalid');
    }

    return {
      tenantId: store.tenant_id,
      userId: store.user_id,
      role: store.role,
      requestId: store.request_id,
    };
  }

  private queryForTenant<T>(principal: TaskPrincipal, sql: string, params: unknown[]): Promise<T[]> {
    return this.prisma.executeWithTenant(principal.tenantId, principal.userId, async (tx) => {
      const rows = await tx.$queryRawUnsafe<T[]>(sql, ...params);
      return Array.isArray(rows) ? rows : [rows];
    });
  }

  private async assertValidAudience(
    principal: TaskPrincipal,
    targetUserId: string | null,
    targetRole: string | null,
  ): Promise<void> {
    const normalizedRole = targetRole ? this.normalizeRole(targetRole) : null;
    const rows = await this.queryForTenant<{ user_exists: boolean; role_exists: boolean }>(principal, `
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
    `, [principal.tenantId, targetUserId, normalizedRole]);

    if (!rows[0]?.user_exists) {
      throw new BadRequestException('Assigned user is not active in this school');
    }
    if (!rows[0]?.role_exists) {
      throw new BadRequestException('Assigned role does not belong to this school');
    }
  }

  private async writeAudit(
    tx: { $executeRawUnsafe: (sql: string, ...params: unknown[]) => Promise<number> },
    principal: TaskPrincipal,
    action: string,
    taskId: string,
    metadata: Record<string, unknown> = {},
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
      VALUES ($1, $1, $2::uuid, $3, $4, 'workflow', 'task', $5, 'task', $4, $6::jsonb)
    `, principal.tenantId, principal.userId, principal.requestId, action, taskId, JSON.stringify(metadata));
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

  private optionalDate(value: unknown): string | null {
    if (value === undefined || value === null || value === '') {
      return null;
    }
    if (typeof value !== 'string' || Number.isNaN(Date.parse(value))) {
      throw new BadRequestException('Due date must be a valid date');
    }
    return new Date(value).toISOString();
  }
}
