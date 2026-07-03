import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';

import { PrismaService } from '../../database/prisma.service';

type ReportFormat = 'csv' | 'xlsx' | 'pdf';

@Injectable()
export class AdminCommandOperationsService {
  constructor(private readonly prisma: PrismaService) {}

  async writeSql<T = any>(query: string, params: any[] = []): Promise<{ rows: T[]; rowCount: number }> {
    try {
      return await this.query<T>(query, params);
    } catch (error) {
      throw new InternalServerErrorException({
        message: 'The requested school operation could not be completed.',
        detail: error instanceof Error ? error.message : 'Unknown database error',
      });
    }
  }

  async readSql<T = any>(query: string, params: any[] = []): Promise<{ rows: T[]; rowCount: number }> {
    try {
      return await this.query<T>(query, params);
    } catch {
      return { rows: [], rowCount: 0 };
    }
  }

  async listReportSnapshots(tenantId: string, module: string) {
    const result = await this.readSql(
      `
        SELECT
          id::text,
          snapshot_id AS "snapshotId",
          title AS "reportName",
          created_at::text AS "generatedDate",
          format AS type,
          'Ready' AS status,
          artifact,
          manifest
        FROM report_snapshots
        WHERE tenant_id = $1
          AND module = $2
        ORDER BY created_at DESC
        LIMIT 50
      `,
      [tenantId, module],
    );
    return result.rows;
  }

  async generateReportSnapshot(input: {
    tenantId: string;
    module: string;
    reportId?: string;
    title: string;
    format?: string;
    generatedByUserId?: string | null;
    sections: Record<string, unknown>;
    filters?: Record<string, unknown>;
    targetRoles?: string[];
  }) {
    const format = this.normalizeFormat(input.format);
    const module = this.safeIdentifier(input.module, 'admin-command');
    const reportId = this.safeIdentifier(input.reportId || `${module}-operations`, `${module}-operations`);
    const title = String(input.title || 'Operational report').trim().slice(0, 180);
    const generatedAt = new Date().toISOString();
    const manifest = {
      module,
      reportName: title,
      format,
      generatedAt,
      sections: input.sections,
      filters: input.filters ?? {},
    };
    const manifestJson = JSON.stringify(manifest);
    const checksum = createHash('sha256').update(manifestJson).digest('hex');
    const snapshotId = `${module}-${Date.now()}-${randomUUID()}`;
    const artifact = {
      kind: 'compiled-json-report',
      filename: `${reportId}-${Date.now()}.${format}`,
      content_type: this.contentTypeFor(format),
      row_count: this.countRows(input.sections),
      checksum_sha256: checksum,
      generated_at: generatedAt,
      section_count: Object.keys(input.sections).length,
    };

    await this.writeSql(
      `
        INSERT INTO report_snapshots (
          tenant_id, snapshot_id, module, report_id, title, format, artifact, filters, generated_by_user_id, manifest, manifest_checksum_sha256
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb, $9, $10::jsonb, $11)
      `,
      [
        input.tenantId,
        snapshotId,
        module,
        reportId,
        title,
        format,
        JSON.stringify(artifact),
        JSON.stringify(input.filters ?? {}),
        input.generatedByUserId || null,
        manifestJson,
        checksum,
      ],
    );

    await this.recordAudit(input.tenantId, `${module}.report.generated`, 'report_snapshot', snapshotId, {
      title,
      format,
      checksum,
      section_count: Object.keys(input.sections).length,
    });

    if (input.targetRoles?.length) {
      await this.notifyRoles(input.tenantId, {
        key: `${module}-report-${snapshotId}`,
        type: `${module}.report.generated`,
        title: `${title} generated`,
        body: `A ${format.toUpperCase()} ${title} was compiled from live school records.`,
        targetRoles: input.targetRoles,
        metadata: { snapshotId, module, reportId, format, checksum },
      });
    }

    return {
      success: true,
      message: 'Report compiled and stored',
      snapshotId,
      report: manifest,
      artifact,
    };
  }

  async notifyRoles(
    tenantId: string,
    input: {
      key: string;
      type: string;
      title: string;
      body: string;
      targetRoles: string[];
      metadata?: Record<string, unknown>;
    },
  ) {
    const metadata = JSON.stringify({
      ...(input.metadata ?? {}),
      target_roles: input.targetRoles,
      source_module: 'admin-command',
    });

    try {
      await this.writeSql(
        `
          INSERT INTO notifications (
            tenant_id, notification_key, recipient_role, type, title, body, status, metadata
          )
          SELECT $1, $2 || '-' || role_name, role_name, $3, $4, $5, 'unread', $6::jsonb
          FROM unnest($7::text[]) AS role_name
          ON CONFLICT (tenant_id, notification_key)
          DO UPDATE SET title = EXCLUDED.title, body = EXCLUDED.body, metadata = EXCLUDED.metadata, updated_at = NOW()
        `,
        [tenantId, input.key, input.type, input.title, input.body, metadata, input.targetRoles],
      );
      return;
    } catch {
      await this.writeSql(
        `
          INSERT INTO notifications (
            tenant_id, target_role, title, message, type, priority, entity_type, entity_id, action_url, metadata_json
          )
          SELECT $1, role_name, $2, $3, $4, 'normal', 'admin_command', $5, NULL, $6::jsonb
          FROM unnest($7::text[]) AS role_name
        `,
        [tenantId, input.title, input.body, input.type, input.key, metadata, input.targetRoles],
      );
    }
  }

  async recordAudit(
    tenantId: string,
    action: string,
    resourceType: string,
    resourceId: string | null,
    metadata: Record<string, unknown>,
    actorUserId?: string | null,
  ) {
    await this.readSql(
      `
        INSERT INTO audit_logs (
          tenant_id, actor_user_id, request_id, action, resource_type, resource_id, metadata
        )
        VALUES ($1, $2, current_setting('app.request_id', true), $3, $4, $5, $6::jsonb)
      `,
      [tenantId, this.uuidOrNull(actorUserId), action, resourceType, resourceId, JSON.stringify(metadata)],
    );
  }

  async recordWorkflowAction(input: {
    tenantId: string;
    actorUserId?: string | null;
    sourceRole: string;
    targetRoles?: string[];
    eventType: string;
    entityType: string;
    entityId?: string | null;
    title: string;
    message?: string | null;
    priority?: 'low' | 'normal' | 'high' | 'critical';
    payload?: Record<string, unknown>;
  }) {
    const result = await this.writeSql(
      `
        INSERT INTO workflow_events (
          tenant_id, source_user_id, source_role, target_roles, event_type,
          entity_type, entity_id, title, message, priority, payload
        )
        VALUES ($1, $2, $3, $4::jsonb, $5, $6, $7, $8, $9, $10, $11::jsonb)
        RETURNING *
      `,
      [
        input.tenantId,
        this.uuidOrNull(input.actorUserId),
        input.sourceRole,
        JSON.stringify(input.targetRoles ?? []),
        input.eventType,
        input.entityType,
        input.entityId ?? null,
        input.title,
        input.message ?? null,
        input.priority ?? 'normal',
        JSON.stringify(input.payload ?? {}),
      ],
    );
    await this.recordAudit(input.tenantId, input.eventType, input.entityType, input.entityId ?? null, input.payload ?? {}, input.actorUserId);
    return result.rows[0];
  }

  requiredText(value: unknown, label: string): string {
    const text = String(value ?? '').trim();
    if (!text) {
      throw new BadRequestException(`${label} is required`);
    }
    return text;
  }

  positiveInteger(value: unknown, label: string): number {
    const number = Number(value);
    if (!Number.isInteger(number) || number <= 0) {
      throw new BadRequestException(`${label} must be a positive whole number`);
    }
    return number;
  }

  private async query<T = any>(query: string, params: any[] = []): Promise<{ rows: T[]; rowCount: number }> {
    if ((this.prisma as any).query) {
      return (this.prisma as any).query(query, params);
    }

    const result = await (this.prisma as any).$queryRawUnsafe(query, ...params);
    const rows = Array.isArray(result) ? result : [result];
    return { rows, rowCount: rows.length };
  }

  private normalizeFormat(value: unknown): ReportFormat {
    const normalized = String(value || '').trim().toLowerCase();
    return normalized === 'csv' || normalized === 'xlsx' || normalized === 'pdf' ? normalized : 'pdf';
  }

  private contentTypeFor(format: ReportFormat): string {
    if (format === 'csv') return 'text/csv';
    if (format === 'xlsx') return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    return 'application/pdf';
  }

  private countRows(sections: Record<string, unknown>): number {
    return Object.values(sections).reduce<number>((count, section) => {
      if (Array.isArray(section)) return count + section.length;
      if (section && typeof section === 'object' && Array.isArray((section as any).rows)) {
        return count + (section as any).rows.length;
      }
      return count + 1;
    }, 0);
  }

  private safeIdentifier(value: string, fallback: string): string {
    const safe = String(value || fallback)
      .toLowerCase()
      .replace(/attendance/g, 'attn')
      .replace(/[^a-z0-9_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
    return safe || fallback;
  }

  uuidOrNull(value: unknown): string | null {
    const text = String(value ?? '').trim();
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(text) ? text : null;
  }
}
