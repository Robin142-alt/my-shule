import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException, OnModuleDestroy, OnModuleInit, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Job, Worker } from 'bullmq';
import { createReadStream } from 'node:fs';
import { Readable } from 'node:stream';
import { createHash, randomUUID } from 'node:crypto';
import { QueueService } from '../../../queue/queue.service';
import { RedisService } from '../../../infrastructure/redis/redis.service';
import { RequestContextService } from '../../../common/request-context/request-context.service';
import type { RequestContextSeed } from '../../../common/request-context/request-context.types';
import { DatabaseFileStorageService } from '../../../common/uploads/database-file-storage.service';
import { ModuleAccessService } from '../../module-access/module-access.service';
import { SchoolOperationalEventsService } from '../../events/school-operational-events.service';
import { ExamsService } from '../exams.service';
import { ExamsRepository } from '../repositories/exams.repository';
import { hydrateReportCardLogoForRendering } from './report-card-logo-hydration';
import { extractPersistedReportCardPayload } from './report-card-template.service';
import { createBulkReportCardPdfFile, type BulkReportCardEntry } from './report-card-pdf-artifact';
export const REPORT_CARD_EXPORT_QUEUE = 'report-card-exports';
const SYNC_CARD_LIMIT = 200;
interface ExportJob {
  query: Record<string, string | undefined>;
  context: RequestContextSeed;
}
interface ExportResult {
  paths: string[];
  count: number;
  expires_at: string;
}
@Injectable()
export class ReportCardExportService implements OnModuleInit, OnModuleDestroy {
  private worker?: Worker<ExportJob, ExportResult>;
  private readonly logger = new Logger(ReportCardExportService.name);
  constructor(
    private readonly exams: ExamsService,
    private readonly repository: ExamsRepository,
    private readonly context: RequestContextService,
    private readonly storage: DatabaseFileStorageService,
    private readonly queue: QueueService,
    private readonly redis: RedisService,
    private readonly config: ConfigService,
    private readonly moduleAccess: ModuleAccessService,
    private readonly events: SchoolOperationalEventsService,
  ) {}

  async onModuleInit() {
    if (await this.redis.ping() === 'up') this.ensureWorker();
  }
  async prepare(query: Record<string, string | undefined>) {
    const resolved = await this.confirm(query);
    if (resolved.cards.filter(card => !card.ineligible_reason).length <= SYNC_CARD_LIMIT) {
      return { state: 'ready', download_url: `/exams/report-cards/bulk-download-pdf?${new URLSearchParams(query as Record<string, string>)}` };
    }
    if (this.queue.isDegraded())
      throw new ServiceUnavailableException('Large report-card exports need the export queue. Retry when Redis is available, or export a smaller class.');
    this.ensureWorker();
    const actor = this.context.requireStore();
    // Do not put DB clients, session identifiers or tokens into the queue.
    const context: RequestContextSeed = { tenant_id: actor.tenant_id, user_id: actor.user_id, role: actor.role,
      request_id: actor.request_id, permissions: actor.permissions, is_authenticated: true, session_id: null,
      client_ip: null, user_agent: null, method: 'JOB', path: '/exams/report-cards/exports', started_at: new Date().toISOString() };
    const jobId = createHash('sha256').update(JSON.stringify([actor.tenant_id, actor.user_id, query])).digest('hex');
    const existing = await this.queue.getQueue(REPORT_CARD_EXPORT_QUEUE).getJob(jobId);
    if (existing && await existing.getState() === 'completed'
      && new Date(existing.returnvalue.expires_at).valueOf() <= Date.now()) {
      await existing.remove();
    }
    if (existing && await existing.getState() === 'failed')
      await existing.retry();
    else
      await this.queue.add('report-card.export', { query, context }, { jobId, attempts: 3,
        backoff: { type: 'exponential', delay: 3000 }, removeOnComplete: { age: 3600 }, removeOnFail: { age: 86400 } }, REPORT_CARD_EXPORT_QUEUE);
    return { state: 'queued', job_id: jobId };
  }
  private ensureWorker() {
    if (this.worker)
      return;
    this.worker = new Worker<ExportJob, ExportResult>(REPORT_CARD_EXPORT_QUEUE, job => this.context.run(job.data.context, () => this.executeJob(job)), {
      connection: this.redis.getBullConnectionOptions(), prefix: this.config.get<string>('queue.prefix') ?? 'my-shule', concurrency: 1,
    });
    this.worker.on('error', error => this.logger.error('Report-card export worker error', error.stack));
    this.worker.on('failed', (job, error) => this.logger.error(`Report-card export ${job?.id} failed`, error.stack));
  }
  async onModuleDestroy() { await this.worker?.close(); }
  private async ownedJob(jobId: string) {
    const tenant = this.exams.assertReportCardScopeAccess();
    const actor = this.context.requireStore();
    if (!/^[a-f0-9]{64}$/.test(jobId))
      throw new NotFoundException('Export job not found');
    if (this.queue.isDegraded())
      throw new ServiceUnavailableException('The export queue is unavailable. Retry shortly.');
    this.ensureWorker();
    const job = await this.queue.getQueue(REPORT_CARD_EXPORT_QUEUE).getJob(jobId) as Job<ExportJob, ExportResult> | undefined;
    if (!job || job.data.context.tenant_id !== tenant || job.data.context.user_id !== actor.user_id)
      throw new NotFoundException('Export job not found');
    return job;
  }
  async status(jobId: string) {
    const job = await this.ownedJob(jobId);
    const state = await job.getState();
    return { job_id: jobId, state, progress: job.progress,
      ...(state === 'failed' ? { message: 'Export failed. Report cards may have changed or storage is unavailable. Preview the scope and retry.' } : {}),
      ...(state === 'completed' ? { count: job.returnvalue.count, download_url: `/exams/report-cards/exports/${jobId}/download` } : {}) };
  }
  async download(jobId: string) {
    const job = await this.ownedJob(jobId);
    if (await job.getState() !== 'completed')
      throw new ConflictException('Export is not completed');
    const result = job.returnvalue;
    if (new Date(result.expires_at).valueOf() <= Date.now())
      throw new ConflictException('Export expired. Preview the scope and export again.');
    const storage = this.storage, tenantId = this.context.requireStore().tenant_id!;
    async function* chunks() {
      for (const path of result.paths)
        yield (await storage.readForTenant({ tenantId, storagePath: path })).content;
    }
    return { stream: Readable.from(chunks()), count: result.count };
  }
  private async executeJob(job: Job<ExportJob, ExportResult>): Promise<ExportResult> {
    const tenantId = this.exams.assertReportCardScopeAccess();
    if (await this.moduleAccess.findFirstMissingModule(tenantId, ['exams']))
      throw new ConflictException('The exams module is disabled');
    const artifact = await this.generate(job.data.query, async (count) => { await job.updateProgress({ rendered: count }); });
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const paths: string[] = [];
    const executionId = randomUUID();
    try {
      // Existing file-object storage is shared across replicas. Persist bounded chunks,
      // then reassemble their bytes on the server into one PDF stream at download time.
      let index = 0;
      for await (const chunk of createReadStream(artifact.path, { highWaterMark: 1024 * 1024 })) {
        const buffer = Buffer.from(chunk);
        const stored = await this.storage.save({ tenantId, storagePath: `tenant/${tenantId}/reports/report-cards/${job.id}/${executionId}-${index++}.part`,
          originalFileName: 'report-cards.pdf', mimeType: 'application/octet-stream', sizeBytes: buffer.length, buffer,
          retentionPolicy: 'reports', retentionExpiresAt: expires });
        paths.push(stored.stored_path);
      }
      await this.recordExport(artifact.cardIds, artifact.scope, artifact.count, String(job.id));
      return { paths, count: artifact.count, expires_at: expires };
    }
    finally {
      await artifact.cleanup();
    }
  }
  private async confirm(query: Record<string, string | undefined>) {
    if (!query || typeof query !== 'object' || Array.isArray(query)) {
      throw new BadRequestException('Provide a report-card scope and its confirmation token');
    }
    const resolved = await this.exams.bulkDownloadReportCards(query);
    if (!query.preview_token || query.preview_token !== resolved.preview_token)
      throw new ConflictException('Report cards changed or were not confirmed. Preview the export again.');
    if (!resolved.cards.some(card => !card.ineligible_reason))
      throw new NotFoundException('No printable report cards in this scope. Generate or repair the snapshots first.');
    return resolved;
  }
  async generate(query: Record<string, string | undefined>, progress?: (count: number) => Promise<void>, cancelled?: () => boolean) {
    const tenantId = this.exams.assertReportCardScopeAccess();
    const resolved = await this.confirm(query);
    const cards = resolved.cards.filter(card => !card.ineligible_reason);
    if (!progress && cards.length > SYNC_CARD_LIMIT)
      throw new ConflictException('Use the export job endpoint for more than 200 report cards');
    const repository = this.repository, storage = this.storage;
    const imageCache = new Map<string, ReturnType<DatabaseFileStorageService['readForTenant']>>();
    const cachedStorage = { readForTenant: (input: Parameters<DatabaseFileStorageService['readForTenant']>[0]) => {
        if (imageCache.size > 128)
          imageCache.clear();
        if (!imageCache.has(input.storagePath))
          imageCache.set(input.storagePath, storage.readForTenant(input));
        return imageCache.get(input.storagePath)!;
      } };
    async function* entries(): AsyncGenerator<BulkReportCardEntry> {
      for (let offset = 0; offset < cards.length; offset += 50) {
        if (cancelled?.())
          throw new ConflictException('Export request cancelled');
        const batch = cards.slice(offset, offset + 50);
        const rows = await repository.listReportCardIdsForBulkDownload({ ...query, tenant_id: tenantId, scope_type: 'students', report_card_ids: batch.map(card => card.id), limit: 50 });
        const byId = new Map(rows.map(row => [row.id, row]));
        for (const expected of batch) {
          const card = byId.get(expected.id);
          if (!card || card.updated_at !== expected.updated_at)
            throw new ConflictException('A report card changed during export. Preview the current scope and retry.');
          const payload = extractPersistedReportCardPayload(card.metadata);
          if (!payload || !card.verification_code)
            throw new ConflictException('A selected snapshot needs regeneration');
          yield { payload: await hydrateReportCardLogoForRendering(payload, tenantId, cachedStorage), verificationCode: card.verification_code };
        }
        await progress?.(Math.min(offset + 50, cards.length));
      }
    }
    const artifact = await createBulkReportCardPdfFile(entries());
    try {
      // Detect scope changes made while earlier pages were rendering, before exposing a file.
      await this.confirm(query);
      return { ...artifact, cardIds: cards.map(card => card.id), scope: resolved.scope };
    }
    catch (error) {
      await artifact.cleanup();
      throw error;
    }
  }
  async recordExport(cardIds: string[], scope: unknown, count: number, exportId: string) {
    const actor = this.context.requireStore();
    await this.repository.executeSql(`INSERT INTO student_report_card_audit_logs
    (tenant_id,report_card_id,exam_series_id,student_id,action,actor_user_id,metadata)
    SELECT $1,card.id,card.exam_series_id,card.student_id,'report_card.exported',$2::uuid,
    jsonb_build_object('scope',$4::jsonb,'card_count',$5::integer,'export_id',$6::text)
    FROM student_report_cards card WHERE card.tenant_id=$1 AND card.id::text=ANY($3::text[])
    AND NOT EXISTS(SELECT 1 FROM student_report_card_audit_logs log WHERE log.tenant_id=$1
      AND log.report_card_id=card.id AND log.action='report_card.exported' AND log.metadata->>'export_id'=$6)
    RETURNING id`, [actor.tenant_id, actor.user_id, cardIds, JSON.stringify(scope), count, exportId]);
    await this.events.recordSchoolOperation({ event: { id: `report-cards-export-${exportId}`, type: 'document.generated', module: 'exams', actorRole: actor.role,
        title: 'Report-card PDF generated', body: `${count} report cards prepared for download.`, payload: { scope, card_count: count, export_id: exportId } } });
  }
}
