import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { Readable } from 'node:stream';
import { randomUUID } from 'node:crypto';
import { RequestContextService } from '../../../common/request-context/request-context.service';
import { DatabaseFileStorageService } from '../../../common/uploads/database-file-storage.service';
import { SchoolOperationalEventsService } from '../../events/school-operational-events.service';
import { ExamsService } from '../exams.service';
import { ExamsRepository } from '../repositories/exams.repository';
import { hydrateReportCardLogoForRendering } from './report-card-logo-hydration';
import { extractPersistedReportCardPayload } from './report-card-template.service';
import {
  createBulkReportCardPdfFile,
  type BulkReportCardEntry,
} from './report-card-pdf-artifact';
import { ReportWorkService, type ReportWorkRow } from './report-work.service';
import { ReportCardArtifactsService } from './report-card-artifacts.service';

@Injectable()
export class ReportCardExportService implements OnModuleInit {
  constructor(
    private readonly exams: ExamsService,
    private readonly repository: ExamsRepository,
    private readonly context: RequestContextService,
    private readonly storage: DatabaseFileStorageService,
    private readonly work: ReportWorkService,
    private readonly artifacts: ReportCardArtifactsService,
    private readonly events: SchoolOperationalEventsService,
  ) {}

  onModuleInit() {
    this.work.register('export', (row, progress) =>
      this.executeJob(row, progress),
    );
  }
  async prepare(query: Record<string, string | undefined>) {
    const resolved = await this.confirm(query);
    if (resolved.cards.length > 20000)
      throw new BadRequestException(
        'Select an exam, form or class with at most 20,000 reports per export',
      );
    const job = await this.work.submit('export', { query }, [
      resolved.scope,
      resolved.preview_token,
    ]);
    return job.state === 'completed' ? this.status(job.job_id) : job;
  }
  recent() {
    this.exams.assertReportCardScopeAccess();
    return this.work.recent();
  }
  retry(jobId: string) {
    this.exams.assertReportCardScopeAccess();
    return this.work.retry(jobId);
  }
  async status(jobId: string) {
    const row = await this.work.owned(jobId);
    if (row.state !== 'completed') return this.work.status(jobId);
    if (row.kind === 'pdf')
      return this.artifacts.prepare(row.input.report_card_id);
    if (row.kind !== 'export') return this.work.status(jobId);
    await this.confirm(row.input.query);
    const signed = await this.storage.deliveryForTenant({
      tenantId: row.tenant_id,
      storagePath: row.result!.path,
      filename: 'report-cards.pdf',
    });
    return {
      job_id: jobId,
      state: 'completed',
      count: row.result!.count,
      download_url:
        signed.download_url ?? `/exams/report-cards/exports/${jobId}/download`,
      expires_at: signed.expires_at,
    };
  }
  async download(jobId: string) {
    const row = await this.work.owned(jobId);
    if (row.kind !== 'export' || row.state !== 'completed')
      throw new ConflictException('Report export is not ready');
    await this.confirm(row.input.query);
    const stored = await this.storage.readForTenant({
      tenantId: row.tenant_id,
      storagePath: row.result!.path,
    });
    return {
      stream: Readable.from([stored.content]),
      count: row.result!.count,
    };
  }
  private async executeJob(
    row: ReportWorkRow,
    progress: (value: Record<string, any>) => Promise<void>,
  ) {
    this.exams.assertReportCardScopeAccess();
    const scope = await this.confirm(row.input.query);
    // Jobs remain actor-owned; authorized staff in the same school can share the
    // exact confirmed artifact without rendering or storing the PDF again.
    const previous = await this.repository.executeSql(
      `SELECT work.result,work.expires_at::text FROM report_work work
      JOIN file_objects file ON file.tenant_id=work.tenant_id AND file.storage_path=work.result->>'path'
      WHERE work.tenant_id=$1 AND work.identity=$2 AND work.kind='export' AND work.state='completed'
        AND work.expires_at>now()+interval '1 minute' AND file.retention_expires_at>now()+interval '1 minute'
      ORDER BY work.expires_at DESC LIMIT 1`,
      [row.tenant_id, row.identity],
    );
    if (previous.rows[0]) {
      const cached = previous.rows[0];
      const retained = await this.repository.executeSql(
        `UPDATE report_work SET expires_at=LEAST(expires_at,$4::timestamptz)
        WHERE tenant_id=$1 AND id=$2::uuid AND lease_token=$3::uuid AND state='running' AND lease_until>now() RETURNING id`,
        [row.tenant_id, row.id, row.lease_token, cached.expires_at],
      );
      if (!retained.rows.length)
        throw new ConflictException(
          'Report worker lease lost before export reuse',
        );
      await this.recordExport(
        scope.cards
          .filter((card) => !card.ineligible_reason)
          .map((card) => card.id),
        scope.scope,
        cached.result.count,
        row.id,
      );
      return { ...cached.result, reused: true };
    }
    const artifact = await this.generate(row.input.query, async (rendered) =>
      progress({ rendered }),
    );
    const path = `tenant/${row.tenant_id}/reports/temporary/${row.id}/${randomUUID()}.pdf`;
    try {
      await progress({ rendered: artifact.count, stage: 'uploading' });
      const stored = await this.storage.saveFile({
        tenantId: row.tenant_id,
        storagePath: path,
        path: artifact.path,
        originalFileName: 'report-cards.pdf',
        mimeType: 'application/pdf',
        retentionPolicy: 'report-export',
        retentionExpiresAt: new Date(row.expires_at).toISOString(),
      });
      await this.confirm(row.input.query);
      await this.recordExport(
        artifact.cardIds,
        artifact.scope,
        artifact.count,
        row.id,
      );
      return { path: stored.stored_path, count: artifact.count };
    } finally {
      await artifact.cleanup();
    }
  }
  private async confirm(query: Record<string, string | undefined>) {
    if (!query || typeof query !== 'object' || Array.isArray(query)) {
      throw new BadRequestException(
        'Provide a report-card scope and its confirmation token',
      );
    }
    const resolved = await this.exams.bulkDownloadReportCards(query);
    if (!query.preview_token || query.preview_token !== resolved.preview_token)
      throw new ConflictException(
        'Report cards changed or were not confirmed. Preview the export again.',
      );
    if (!resolved.cards.some((card) => !card.ineligible_reason))
      throw new NotFoundException(
        'No printable report cards in this scope. Generate or repair the snapshots first.',
      );
    return resolved;
  }
  async generate(
    query: Record<string, string | undefined>,
    progress?: (count: number) => Promise<void>,
    cancelled?: () => boolean,
  ) {
    const tenantId = this.exams.assertReportCardScopeAccess();
    const resolved = await this.confirm(query);
    const cards = resolved.cards.filter((card) => !card.ineligible_reason);
    if (cards.length > 20000)
      throw new BadRequestException(
        'Select an exam, form or class with at most 20,000 reports per export',
      );
    const repository = this.repository,
      storage = this.storage;
    const imageCache = new Map<
      string,
      ReturnType<DatabaseFileStorageService['readForTenant']>
    >();
    const cachedStorage = {
      readForTenant: (
        input: Parameters<DatabaseFileStorageService['readForTenant']>[0],
      ) => {
        if (imageCache.size > 128) imageCache.clear();
        if (!imageCache.has(input.storagePath))
          imageCache.set(input.storagePath, storage.readForTenant(input));
        return imageCache.get(input.storagePath)!;
      },
    };
    async function* entries(): AsyncGenerator<BulkReportCardEntry> {
      for (let offset = 0; offset < cards.length; offset += 50) {
        if (cancelled?.())
          throw new ConflictException('Export request cancelled');
        const batch = cards.slice(offset, offset + 50);
        const rows = await repository.listReportCardIdsForBulkDownload({
          ...query,
          tenant_id: tenantId,
          scope_type: 'students',
          report_card_ids: batch.map((card) => card.id),
          limit: 50,
        });
        const byId = new Map(rows.map((row) => [row.id, row]));
        for (const expected of batch) {
          const card = byId.get(expected.id);
          if (!card || card.updated_at !== expected.updated_at)
            throw new ConflictException(
              'A report card changed during export. Preview the current scope and retry.',
            );
          const payload = extractPersistedReportCardPayload(card.metadata);
          if (!payload || !card.verification_code)
            throw new ConflictException(
              'A selected snapshot needs regeneration',
            );
          yield {
            payload: await hydrateReportCardLogoForRendering(
              payload,
              tenantId,
              cachedStorage,
              true,
            ),
            verificationCode: card.verification_code,
          };
        }
        await progress?.(Math.min(offset + 50, cards.length));
      }
    }
    const artifact = await createBulkReportCardPdfFile(entries());
    try {
      // Detect scope changes made while earlier pages were rendering, before exposing a file.
      await this.confirm(query);
      return {
        ...artifact,
        cardIds: cards.map((card) => card.id),
        scope: resolved.scope,
      };
    } catch (error) {
      await artifact.cleanup();
      throw error;
    }
  }
  async recordExport(
    cardIds: string[],
    scope: unknown,
    count: number,
    exportId: string,
  ) {
    const actor = this.context.requireStore();
    await this.repository.executeSql(
      `INSERT INTO student_report_card_audit_logs
    (tenant_id,report_card_id,exam_series_id,student_id,action,actor_user_id,metadata)
    SELECT $1,card.id,card.exam_series_id,card.student_id,'report_card.exported',$2::uuid,
    jsonb_build_object('scope',$4::jsonb,'card_count',$5::integer,'export_id',$6::text)
    FROM student_report_cards card WHERE card.tenant_id=$1 AND card.id::text=ANY($3::text[])
    AND NOT EXISTS(SELECT 1 FROM student_report_card_audit_logs log WHERE log.tenant_id=$1
      AND log.report_card_id=card.id AND log.action='report_card.exported' AND log.metadata->>'export_id'=$6)
    RETURNING id`,
      [
        actor.tenant_id,
        actor.user_id,
        cardIds,
        JSON.stringify(scope),
        count,
        exportId,
      ],
    );
    await this.events.recordSchoolOperation({
      event: {
        id: `report-cards-export-${exportId}`,
        type: 'document.generated',
        module: 'exams',
        actorRole: actor.role,
        title: 'Report-card PDF generated',
        body: `${count} report cards prepared for download.`,
        payload: { scope, card_count: count, export_id: exportId },
      },
    });
  }
}
