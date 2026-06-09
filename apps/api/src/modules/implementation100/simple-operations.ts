import {
  BadRequestException,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';

import { RequestContextService } from '../../common/request-context/request-context.service';
import { DatabaseService } from '../../database/database.service';

export interface SimpleOperationsRecordDto {
  title: string;
  category?: string;
  owner_name?: string;
  status?: string;
  priority?: string;
  due_date?: string;
  metric_count?: number;
  notes?: string;
  metadata?: Record<string, unknown>;
}

export interface SimpleOperationsStatusDto {
  status: string;
  notes?: string;
}

export interface SimpleOperationsDashboardSummary {
  total_records: number;
  open_records: number;
  action_due: number;
  critical_records: number;
}

export interface SimpleOperationsRepositoryConfig {
  mainTable: string;
  auditTable: string;
}

export interface SimpleOperationsServiceConfig {
  permissionPrefix: string;
  moduleName: string;
  entityName: string;
  defaultStatus?: string;
}

export class SimpleOperationsRepository {
  private readonly mainTableSql: string;
  private readonly auditTableSql: string;

  constructor(
    protected readonly databaseService: DatabaseService,
    private readonly config: SimpleOperationsRepositoryConfig,
  ) {
    this.mainTableSql = quoteIdentifier(config.mainTable);
    this.auditTableSql = quoteIdentifier(config.auditTable);
  }

  async getDashboard(tenantId: string) {
    const [summary, records, activity] = await Promise.all([
      this.databaseService.query<SimpleOperationsDashboardSummary>(
        `
          SELECT
            COUNT(*)::int AS total_records,
            COUNT(*) FILTER (WHERE status IN ('open', 'active', 'submitted', 'scheduled', 'in_progress'))::int AS open_records,
            COUNT(*) FILTER (WHERE due_date IS NOT NULL AND due_date <= CURRENT_DATE AND status NOT IN ('closed', 'resolved', 'completed', 'archived'))::int AS action_due,
            COUNT(*) FILTER (WHERE priority = 'critical')::int AS critical_records
          FROM ${this.mainTableSql}
          WHERE tenant_id = $1
        `,
        [tenantId],
      ),
      this.databaseService.query(
        `
          SELECT
            id::text,
            title,
            category,
            owner_name,
            status,
            priority,
            due_date::text,
            metric_count,
            metadata,
            created_at
          FROM ${this.mainTableSql}
          WHERE tenant_id = $1
          ORDER BY created_at DESC
          LIMIT 12
        `,
        [tenantId],
      ),
      this.databaseService.query(
        `
          SELECT
            id::text,
            action,
            resource_type,
            resource_id::text,
            metadata,
            created_at
          FROM ${this.auditTableSql}
          WHERE tenant_id = $1
          ORDER BY created_at DESC
          LIMIT 8
        `,
        [tenantId],
      ),
    ]);

    return {
      ...(summary.rows[0] ?? {
        total_records: 0,
        open_records: 0,
        action_due: 0,
        critical_records: 0,
      }),
      records: records.rows,
      activity: activity.rows,
    };
  }

  async createRecord(input: Record<string, unknown>) {
    const result = await this.databaseService.query(
      `
        INSERT INTO ${this.mainTableSql} (
          tenant_id, title, category, owner_name, status, priority, due_date,
          metric_count, notes, metadata, created_by_user_id
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7::date, $8, $9, $10::jsonb, $11::uuid)
        RETURNING
          id::text,
          tenant_id,
          title,
          category,
          owner_name,
          status,
          priority,
          due_date::text,
          metric_count,
          notes,
          metadata,
          created_by_user_id::text,
          created_at,
          updated_at
      `,
      [
        input.tenant_id,
        input.title,
        input.category ?? null,
        input.owner_name ?? null,
        input.status ?? 'open',
        input.priority ?? 'normal',
        input.due_date ?? null,
        input.metric_count ?? 0,
        input.notes ?? null,
        JSON.stringify(input.metadata ?? {}),
        input.created_by_user_id,
      ],
    );

    return result.rows[0];
  }

  async updateStatus(input: Record<string, unknown>) {
    const result = await this.databaseService.query(
      `
        UPDATE ${this.mainTableSql}
        SET status = $3,
            notes = COALESCE($4, notes),
            updated_at = NOW()
        WHERE tenant_id = $1
          AND id = $2::uuid
        RETURNING
          id::text,
          tenant_id,
          title,
          category,
          owner_name,
          status,
          priority,
          due_date::text,
          metric_count,
          notes,
          metadata,
          created_by_user_id::text,
          created_at,
          updated_at
      `,
      [input.tenant_id, input.record_id, input.status, input.notes ?? null],
    );

    return result.rows[0];
  }

  async appendAuditLog(input: Record<string, unknown>) {
    await this.databaseService.query(
      `
        INSERT INTO ${this.auditTableSql} (
          tenant_id, actor_user_id, action, resource_type, resource_id, metadata
        )
        VALUES ($1, $2::uuid, $3, $4, $5::uuid, $6::jsonb)
      `,
      [
        input.tenant_id,
        input.actor_user_id ?? null,
        input.action,
        input.resource_type,
        input.resource_id ?? null,
        JSON.stringify(input.metadata ?? {}),
      ],
    ).catch(() => undefined);
  }
}

export class SimpleOperationsService {
  constructor(
    private readonly requestContext: RequestContextService,
    private readonly repository: SimpleOperationsRepository,
    private readonly config: SimpleOperationsServiceConfig,
  ) {}

  getDashboard() {
    this.assertPermission('read');

    return this.repository.getDashboard(this.requireTenantId());
  }

  async createRecord(dto: SimpleOperationsRecordDto) {
    this.assertPermission('write');
    const record = await this.repository.createRecord({
      ...dto,
      title: this.requireText(dto.title, `${this.config.entityName} title`),
      status: this.optionalText(dto.status) ?? this.config.defaultStatus ?? 'open',
      category: this.optionalText(dto.category),
      owner_name: this.optionalText(dto.owner_name),
      priority: this.optionalText(dto.priority) ?? 'normal',
      metric_count: this.optionalNonNegativeNumber(dto.metric_count, `${this.config.entityName} metric`),
      metadata: dto.metadata ?? {},
      tenant_id: this.requireTenantId(),
      created_by_user_id: this.requireUserId(),
    });

    await this.audit(`${this.config.permissionPrefix}.record.created`, record?.id, {
      title: dto.title,
      category: dto.category ?? null,
    });

    return record;
  }

  async updateStatus(recordId: string, dto: SimpleOperationsStatusDto) {
    this.assertPermission('write');
    const record = await this.repository.updateStatus({
      tenant_id: this.requireTenantId(),
      record_id: this.requireText(recordId, `${this.config.entityName} id`),
      status: this.requireText(dto.status, `${this.config.entityName} status`),
      notes: this.optionalText(dto.notes),
    });

    await this.audit(`${this.config.permissionPrefix}.record.status_updated`, record?.id, {
      status: dto.status,
    });

    return record;
  }

  private async audit(action: string, resourceId: string | undefined, metadata: unknown) {
    await this.repository.appendAuditLog({
      tenant_id: this.requireTenantId(),
      actor_user_id: this.currentUserId(),
      action,
      resource_type: this.config.entityName,
      resource_id: resourceId ?? null,
      metadata: metadata && typeof metadata === 'object' ? metadata : {},
    });
  }

  private assertPermission(action: 'read' | 'write'): void {
    const permission = `${this.config.permissionPrefix}:${action}`;
    const permissions = this.requestContext.getStore()?.permissions ?? [];

    if (
      permissions.includes('*:*')
      || permissions.includes(permission)
      || permissions.includes(`${this.config.permissionPrefix}:*`)
    ) {
      return;
    }

    throw new ForbiddenException(`${this.config.moduleName} permission is required`);
  }

  private requireTenantId(): string {
    const tenantId = this.requestContext.getStore()?.tenant_id;

    if (!tenantId) {
      throw new UnauthorizedException(`Tenant context is required for ${this.config.moduleName} operations`);
    }

    return tenantId;
  }

  private currentUserId(): string | null {
    return this.requestContext.getStore()?.user_id ?? null;
  }

  private requireUserId(): string {
    const userId = this.currentUserId();

    if (!userId) {
      throw new UnauthorizedException(`Authenticated user is required for ${this.config.moduleName} operations`);
    }

    return userId;
  }

  private requireText(value: string | undefined, fieldName: string): string {
    const normalized = value?.trim() ?? '';

    if (!normalized) {
      throw new BadRequestException(`${fieldName} is required`);
    }

    return normalized;
  }

  private optionalText(value: string | undefined): string | null {
    const normalized = value?.trim() ?? '';
    return normalized || null;
  }

  private optionalNonNegativeNumber(value: number | undefined, fieldName: string): number {
    if (value === undefined || value === null) {
      return 0;
    }

    const numeric = Number(value);

    if (!Number.isFinite(numeric) || numeric < 0) {
      throw new BadRequestException(`${fieldName} cannot be negative`);
    }

    return numeric;
  }
}

export function buildSimpleOperationsSchema(input: {
  tables: readonly string[];
  mainTable: string;
  auditTable: string;
  mainTableExtraColumns?: string;
  relatedTablesSql?: string;
  indexesSql?: string;
}) {
  return `
    CREATE EXTENSION IF NOT EXISTS pgcrypto;

    CREATE TABLE IF NOT EXISTS ${quoteIdentifier(input.mainTable)} (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id text NOT NULL,
      title text NOT NULL,
      category text,
      owner_name text,
      status text NOT NULL DEFAULT 'open',
      priority text NOT NULL DEFAULT 'normal',
      due_date date,
      metric_count integer NOT NULL DEFAULT 0,
      notes text,
      metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
      created_by_user_id uuid,
      created_at timestamptz NOT NULL DEFAULT NOW(),
      updated_at timestamptz NOT NULL DEFAULT NOW(),
      audit_log_reference uuid,
      ${input.mainTableExtraColumns ?? ''}
      CONSTRAINT ${quoteIdentifier(`uq_${input.mainTable}_tenant_id_id`)} UNIQUE (tenant_id, id),
      CONSTRAINT ${quoteIdentifier(`ck_${input.mainTable}_priority`)} CHECK (priority IN ('low', 'normal', 'high', 'critical'))
    );

    ${input.relatedTablesSql ?? ''}

    CREATE TABLE IF NOT EXISTS ${quoteIdentifier(input.auditTable)} (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id text NOT NULL,
      actor_user_id uuid,
      action text NOT NULL,
      resource_type text NOT NULL,
      resource_id uuid,
      metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
      created_at timestamptz NOT NULL DEFAULT NOW(),
      updated_at timestamptz NOT NULL DEFAULT NOW(),
      audit_log_reference uuid
    );

    CREATE INDEX IF NOT EXISTS ${quoteIdentifier(`ix_${input.mainTable}_status_due`)}
      ON ${quoteIdentifier(input.mainTable)} (tenant_id, status, due_date);
    CREATE INDEX IF NOT EXISTS ${quoteIdentifier(`ix_${input.mainTable}_priority`)}
      ON ${quoteIdentifier(input.mainTable)} (tenant_id, priority, created_at DESC);
    ${input.indexesSql ?? ''}

    ${input.tables.map((table) => `
      ALTER TABLE ${quoteIdentifier(table)} ENABLE ROW LEVEL SECURITY;
      ALTER TABLE ${quoteIdentifier(table)} FORCE ROW LEVEL SECURITY;
      DROP POLICY IF EXISTS ${quoteIdentifier(`${table}_tenant_policy`)} ON ${quoteIdentifier(table)};
      CREATE POLICY ${quoteIdentifier(`${table}_tenant_policy`)} ON ${quoteIdentifier(table)}
      FOR ALL USING (
        tenant_id = current_setting('app.tenant_id', true)
        OR NULLIF(current_setting('app.role', true), '') = 'system'
      )
      WITH CHECK (
        tenant_id = current_setting('app.tenant_id', true)
        OR NULLIF(current_setting('app.role', true), '') = 'system'
      );
    `).join('\n')}
  `;
}

function quoteIdentifier(value: string) {
  if (!/^[a-z][a-z0-9_]*$/.test(value)) {
    throw new Error(`Invalid SQL identifier: ${value}`);
  }

  return `"${value}"`;
}
