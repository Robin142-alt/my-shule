import { BadRequestException, ConflictException, Injectable, InternalServerErrorException, NotFoundException, Optional } from '@nestjs/common';
import { DatabaseFileStorageService } from '../../common/uploads/database-file-storage.service';
import { createHash, randomUUID } from 'node:crypto';

import { createCsvReportArtifact } from '../../common/reports/report-csv-artifact';
import { createXlsxReportArtifact } from '../../common/reports/report-excel-artifact';
import { createPdfReportArtifact } from '../../common/reports/report-pdf-artifact';
import type {
  ReportArtifact,
  ReportArtifactInput,
  ReportArtifactValue,
} from '../../common/reports/report-artifact';
import { PrismaService } from '../../database/prisma.service';

type ReportFormat = 'csv' | 'xlsx' | 'pdf';

@Injectable()
export class AdminCommandOperationsService {
  constructor(private readonly prisma: PrismaService, @Optional() private readonly files?: DatabaseFileStorageService) {}

  async findReportSnapshot(tenantId: string, module: string, id: string) {
    const result = await this.readSql(`SELECT snapshot_id, report_id, title, format, artifact, manifest, manifest_checksum_sha256, created_at::text
      FROM report_snapshots WHERE tenant_id=$1 AND module=$2 AND (id::text=$3 OR snapshot_id=$3)`, [tenantId, module, id]);
    return result.rows[0] ?? null;
  }

  async notifySavedReport(tenantId: string, module: string, saved: Record<string, any>, targetRoles: string[] = []) {
    if (!targetRoles.length) return;
    await this.notifyRoles(tenantId, {
      key: `${module}-report-${saved.snapshot_id}`,
      type: `${module}.report.generated`,
      title: `${saved.title} generated`,
      body: `A ${String(saved.format).toUpperCase()} ${saved.title} was compiled from live school records.`,
      targetRoles,
      metadata: { snapshotId: saved.snapshot_id, module, reportId: saved.report_id, format: saved.format,
        manifest_checksum_sha256: saved.manifest_checksum_sha256, artifact_checksum_sha256: saved.artifact?.checksum_sha256 },
    });
  }

  async readReportArtifact(tenantId: string, module: string, id: string, preview = false) {
    const row = await this.findReportSnapshot(tenantId, module, id);
    if (!row) throw new NotFoundException('Report was not found in this school.');
    const artifact = row.artifact ?? {};
    let content: Buffer;
    if (artifact.storage_path && this.files) {
      content = (await this.files.readForTenant({ tenantId, storagePath: artifact.storage_path })).content;
    } else if (artifact.content_base64) {
      content = Buffer.from(artifact.content_base64, 'base64');
    } else {
      throw new ConflictException('This saved report has no accessible file. Generate a new report; the saved audit record is preserved.');
    }
    if (!content.length || content.length !== Number(artifact.byte_length) ||
      createHash('sha256').update(content).digest('hex') !== artifact.checksum_sha256) {
      throw new ConflictException('The saved report failed its integrity check. Generate a new report or ask the administrator to restore its file.');
    }
    if (preview && row.format !== 'pdf') {
      // Preview the saved manifest, never current records, for historical spreadsheet reports.
      const manifest = row.manifest;
      if (!manifest?.sections) throw new ConflictException('This report has no saved preview data. Download the original file.');
      return this.createReportArtifact('pdf', { reportId: row.snapshot_id, module, title: row.title,
        filename: 'report.pdf', generatedAt: manifest.generatedAt ?? row.created_at,
        filters: manifest.filters ?? {}, headers: ['Section','Group','Record','Value'], rows: this.buildReportRows(manifest.sections) });
    }
    return { content, contentType: artifact.content_type, filename: artifact.filename, byteLength: content.length };
  }

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
    } catch (error) {
      throw new InternalServerErrorException({
        message: 'The requested school data could not be loaded.',
        detail: error instanceof Error ? error.message : 'Unknown database error',
      });
    }
  }

  async listReportSnapshots(tenantId: string, module: string, offset = 0) {
    const available = module === 'exams-manager-command' ? `CASE
      WHEN jsonb_typeof(artifact->'content_base64')='string' AND (artifact->>'byte_length') ~ '^[1-9][0-9]*$'
        AND artifact->>'checksum_sha256' ~ '^[a-f0-9]{64}$' THEN 'Ready'
      WHEN EXISTS(SELECT 1 FROM file_objects file WHERE file.tenant_id=report_snapshots.tenant_id
        AND file.storage_path=artifact->>'storage_path' AND file.sha256=artifact->>'checksum_sha256'
        AND (file.retention_expires_at IS NULL OR file.retention_expires_at>now())) THEN 'Ready'
      ELSE 'Failed' END` : "'Ready'";
    const result = await this.readSql(
      `
        SELECT
          id::text,
          snapshot_id AS "snapshotId",
          title AS "reportName",
          created_at::text AS "generatedDate",
          format AS type,
          ${available} AS status
        FROM report_snapshots
        WHERE tenant_id = $1
          AND module = $2
        ORDER BY created_at DESC, id DESC
        LIMIT 50 OFFSET $3
      `,
      [tenantId, module, offset],
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
    snapshotId?: string;
    storeFile?: boolean;
    onProgress?: (value: Record<string, any>) => Promise<void>;
  }) {
    if (input.snapshotId) {
      const existing = await this.findReportSnapshot(input.tenantId, input.module, input.snapshotId);
      if (existing) {
        await this.notifySavedReport(input.tenantId, input.module, existing, input.targetRoles);
        return { success: true, message: 'Report generated and stored', snapshotId: existing.snapshot_id,
          report: existing.manifest, artifact: existing.artifact };
      }
    }
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
    const manifestChecksum = createHash('sha256').update(manifestJson).digest('hex');
    const snapshotId = input.snapshotId ?? `${module}-${Date.now()}-${randomUUID()}`;
    const reportRows = this.buildReportRows(input.sections);
    await input.onProgress?.({ stage: 'rendering' });
    const generatedArtifact = await this.createReportArtifact(format, {
      reportId,
      module,
      title,
      filename: `${reportId}-${generatedAt.replace(/\D/g, '').slice(0, 14)}.${format}`,
      generatedAt,
      filters: input.filters ?? {},
      headers: ['Section', 'Group', 'Record', 'Value'],
      rows: reportRows,
    });
    const artifact: Record<string, unknown> = {
      kind: 'generated-report',
      filename: generatedArtifact.filename,
      content_type: generatedArtifact.contentType,
      byte_length: generatedArtifact.byteLength,
      row_count: generatedArtifact.rowCount,
      checksum_sha256: generatedArtifact.checksumSha256,
      generated_at: generatedArtifact.generatedAt,
      section_count: Object.keys(input.sections).length,
      encoding: 'base64',
    };
    await input.onProgress?.({ stage: 'saving' });
    if (input.storeFile && this.files) {
      const stored = await this.files.save({ tenantId: input.tenantId,
        storagePath: `tenant/${input.tenantId}/reports/academic/operations/${snapshotId}/${randomUUID()}.${format}`,
        originalFileName: generatedArtifact.filename, mimeType: generatedArtifact.contentType,
        sizeBytes: generatedArtifact.byteLength, buffer: generatedArtifact.content, retentionPolicy: 'report-staging',
        retentionExpiresAt: new Date(Date.now()+86400000).toISOString() });
      artifact.storage_path = stored.stored_path;
      artifact.encoding = 'object';
    } else artifact.content_base64 = generatedArtifact.content.toString('base64');
    const auditMetadata = JSON.stringify({
      title,
      format,
      snapshot_id: snapshotId,
      report_id: reportId,
      manifest_checksum_sha256: manifestChecksum,
      artifact_checksum_sha256: generatedArtifact.checksumSha256,
      byte_length: generatedArtifact.byteLength,
      section_count: Object.keys(input.sections).length,
    });
    const actorUserId = this.uuidOrNull(input.generatedByUserId);
    const auditAction = `${module}.report.generated`;

    await this.writeSql(
      `
        WITH inserted_snapshot AS (
          INSERT INTO report_snapshots (
            tenant_id, snapshot_id, module, report_id, title, format, artifact, filters,
            generated_by_user_id, manifest, manifest_checksum_sha256
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb, $9::text, $10::jsonb, $11)
          ON CONFLICT (tenant_id, snapshot_id) DO NOTHING
          RETURNING tenant_id, snapshot_id
        )${artifact.storage_path ? `, promoted_file AS (
          UPDATE file_objects SET retention_policy='academic-record', retention_expires_at=NULL
          WHERE tenant_id=$1 AND storage_path=$14 AND EXISTS (SELECT 1 FROM inserted_snapshot)
          RETURNING id
        )` : ''}, snapshot_audit AS (
          INSERT INTO report_snapshot_audit_logs (
            tenant_id, snapshot_id, action, actor_user_id, request_id, metadata
          )
          SELECT
            tenant_id,
            snapshot_id,
            'report.snapshot.created',
            $9::text,
            current_setting('app.request_id', true),
            $12::jsonb
          FROM inserted_snapshot
          RETURNING id
        ), general_audit AS (
          INSERT INTO audit_logs (
            tenant_id, actor_user_id, request_id, action, resource_type, resource_id, metadata
          )
          SELECT
            tenant_id,
            $9::uuid,
            current_setting('app.request_id', true),
            $13,
            'report_snapshot',
            NULL,
            $12::jsonb
          FROM inserted_snapshot
          RETURNING id
        )
        SELECT snapshot_id FROM inserted_snapshot
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
        actorUserId,
        manifestJson,
        manifestChecksum,
        auditMetadata,
        auditAction,
        ...(artifact.storage_path ? [artifact.storage_path] : []),
      ],
    );

    await this.notifySavedReport(input.tenantId, module, { snapshot_id: snapshotId, report_id: reportId,
      title, format, artifact, manifest_checksum_sha256: manifestChecksum }, input.targetRoles);

    return {
      success: true,
      message: 'Report generated and stored',
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
    await this.writeSql(
      `
        INSERT INTO audit_logs (
          tenant_id, actor_user_id, request_id, action, resource_type, resource_id, metadata
        )
        VALUES ($1, $2, current_setting('app.request_id', true), $3, $4, $5, $6::jsonb)
      `,
      [tenantId, this.uuidOrNull(actorUserId), action, resourceType, this.uuidOrNull(resourceId), JSON.stringify(metadata)],
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

  private async createReportArtifact(
    format: ReportFormat,
    input: ReportArtifactInput,
  ): Promise<ReportArtifact> {
    if (format === 'xlsx') {
      return createXlsxReportArtifact(input);
    }

    if (format === 'pdf') {
      return createPdfReportArtifact(input);
    }

    const csvArtifact = createCsvReportArtifact({
      reportId: input.reportId,
      title: input.title,
      filename: input.filename ?? `${input.reportId}.csv`,
      headers: input.headers,
      rows: input.rows,
      generatedAt: new Date(input.generatedAt ?? Date.now()),
    });
    const content = Buffer.from(csvArtifact.csv, 'utf8');

    return {
      filename: csvArtifact.filename,
      contentType: csvArtifact.content_type,
      byteLength: content.length,
      checksumSha256: csvArtifact.checksum_sha256,
      generatedAt: csvArtifact.generated_at,
      rowCount: csvArtifact.row_count,
      content,
    };
  }

  private buildReportRows(sections: Record<string, unknown>): ReportArtifactValue[][] {
    const rows: ReportArtifactValue[][] = [];

    for (const [sectionName, section] of Object.entries(sections)) {
      if (Array.isArray(section)) {
        this.appendReportArray(rows, sectionName, 'records', section);
        continue;
      }

      if (section && typeof section === 'object' && !(section instanceof Date)) {
        const entries = Object.entries(section as Record<string, unknown>);
        if (entries.length === 0) {
          rows.push([sectionName, 'summary', '', 'No records']);
          continue;
        }

        for (const [groupName, value] of entries) {
          if (Array.isArray(value)) {
            this.appendReportArray(rows, sectionName, groupName, value);
            continue;
          }

          if (value && typeof value === 'object' && !(value instanceof Date)) {
            const fields = Object.entries(value as Record<string, unknown>);
            if (fields.length === 0) {
              rows.push([sectionName, groupName, '', 'No records']);
              continue;
            }
            for (const [fieldName, fieldValue] of fields) {
              rows.push([sectionName, groupName, fieldName, this.serializeReportValue(fieldValue)]);
            }
            continue;
          }

          rows.push([sectionName, 'summary', groupName, this.serializeReportValue(value)]);
        }
        continue;
      }

      rows.push([sectionName, 'summary', '', this.serializeReportValue(section)]);
    }

    return rows;
  }

  private appendReportArray(
    rows: ReportArtifactValue[][],
    sectionName: string,
    groupName: string,
    records: unknown[],
  ): void {
    if (records.length === 0) {
      rows.push([sectionName, groupName, '', 'No records']);
      return;
    }

    records.forEach((record, index) => {
      rows.push([sectionName, groupName, index + 1, this.serializeReportValue(record)]);
    });
  }

  private serializeReportValue(value: unknown): ReportArtifactValue {
    if (
      value === null
      || value === undefined
      || typeof value === 'string'
      || typeof value === 'number'
      || typeof value === 'boolean'
      || value instanceof Date
    ) {
      return value;
    }

    return JSON.stringify(value);
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
