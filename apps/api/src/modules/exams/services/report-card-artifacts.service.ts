import {
  ConflictException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { DatabaseFileStorageService } from '../../../common/uploads/database-file-storage.service';
import { DatabaseService } from '../../../database/database.service';
import { RequestContextService } from '../../../common/request-context/request-context.service';
import { ExamsRepository } from '../repositories/exams.repository';
import { ReportWorkService } from './report-work.service';
import {
  reportIdentity,
  reportPdfIdentity,
  REPORT_RENDERER_VERSION,
} from './report-artifact-identity';
import { createReportCardPdfArtifact } from './report-card-pdf-artifact';
import {
  extractPersistedReportCardPayload,
  ReportCardTemplateService,
} from './report-card-template.service';
import { hydrateReportCardLogoForRendering } from './report-card-logo-hydration';

@Injectable()
export class ReportCardArtifactsService implements OnModuleInit {
  constructor(
    private readonly repository: ExamsRepository,
    private readonly storage: DatabaseFileStorageService,
    private readonly db: DatabaseService,
    private readonly context: RequestContextService,
    private readonly work: ReportWorkService,
  ) {}
  onModuleInit() {
    this.work.register('pdf', async (row) => {
      let card = await this.load(row.input.report_card_id, true);
      if (reportPdfIdentity(card) !== row.input.identity)
        throw new ConflictException('Report changed before rendering');
      if (!card.metadata?.source_revision)
        card = await this.certifyLegacySnapshot(card);
      await this.ensurePdf(card);
      return { report_card_id: card.id };
    });
  }
  async load(id: string, allowLegacy = false) {
    const tenant = this.context.requireStore().tenant_id;
    const result = await this.repository.executeSql(
      `SELECT * FROM student_report_cards WHERE tenant_id=$1 AND id=$2::uuid`,
      [tenant, id],
    );
    const card = result.rows[0];
    if (!card)
      throw new NotFoundException('Report card not found for this school');
    await this.assertFresh(card, allowLegacy);
    return card;
  }
  async assertFresh(card: Record<string, any>, allowLegacy = false) {
    if (
      !card.is_current ||
      ![
        'draft_generated',
        'draft',
        'under_review',
        'approved',
        'published',
      ].includes(card.status)
    ) {
      throw new ConflictException(
        'This report was withdrawn, superseded or needs regeneration',
      );
    }
    if (
      !extractPersistedReportCardPayload(card.metadata) ||
      !card.verification_code
    )
      throw new ConflictException('Regenerate this report before downloading');
    if (allowLegacy && !card.metadata?.source_revision) return;
    if (
      card.metadata?.source_valid_until &&
      Date.parse(card.metadata.source_valid_until) <= Date.now()
    ) {
      throw new ConflictException(
        'A grading policy became effective or expired. Regenerate this report.',
      );
    }
    const current = await this.sourceVersion(card.tenant_id, card.student_id);
    if (
      card.metadata?.source_revision !== current ||
      card.metadata?.renderer_version !== REPORT_RENDERER_VERSION
    ) {
      throw new ConflictException(
        'Report inputs or layout changed. Regenerate this report and complete its review before publishing again.',
      );
    }
  }
  async sourceVersion(tenant: string, student: string) {
    const result = await this.repository.executeSql(
      `SELECT scope_key,version::text FROM report_source_versions
      WHERE tenant_id=$1 AND scope_key IN ('school',$2) ORDER BY scope_key`,
      [tenant, `student:${student}`],
    );
    return JSON.stringify(
      result.rows.map((row) => [row.scope_key, row.version]),
    );
  }
  async sourceValidUntil(tenant: string) {
    const result = await this.repository.executeSql(
      `SELECT min(boundary)::text AS deadline FROM exam_grading_policies policy
      CROSS JOIN LATERAL (VALUES(policy.effective_from),(policy.effective_to)) dates(boundary)
      WHERE policy.tenant_id=$1 AND policy.status='active' AND boundary>now()`,
      [tenant],
    );
    return result.rows[0]?.deadline ?? null;
  }
  async reusableSnapshot(tenant: string, exam: string, student: string, certifyLegacy = false) {
    const result = await this.repository.executeSql(
      `SELECT * FROM student_report_cards
      WHERE tenant_id=$1 AND exam_series_id=$2::uuid AND student_id=$3::uuid AND is_current LIMIT 1`,
      [tenant, exam, student],
    );
    let card = result.rows[0];
    if (!card) return null;
    try {
      // Only worker callers opt in: migration may load academic inputs and
      // materialize a PDF, so it must never run in the HTTP reuse fast path.
      if (certifyLegacy && !card.metadata?.source_revision) {
        await this.assertFresh(card, true);
        card = await this.certifyLegacySnapshot(card);
        await this.ensurePdf(card);
      }
      await this.assertFresh(card);
    } catch (error) {
      if (error instanceof ConflictException) return null;
      throw error;
    }
    if (!(await this.cachedPath(card))) return null;
    return { ...card, reused: true };
  }
  async cachedPath(card: Record<string, any>): Promise<string | null> {
    const identity = reportPdfIdentity(card);
    const result = await this.repository.executeSql(
      `SELECT cache.storage_path FROM report_pdf_cache cache
      JOIN file_objects file ON file.tenant_id=cache.tenant_id AND file.storage_path=cache.storage_path
      WHERE cache.tenant_id=$1 AND cache.report_card_id=$2::uuid AND cache.identity=$3
        AND (file.retention_expires_at IS NULL OR file.retention_expires_at>now())
      UNION ALL SELECT artifact.storage_key FROM report_card_artifacts artifact
      JOIN file_objects file ON file.tenant_id=artifact.tenant_id AND file.storage_path=artifact.storage_key
      WHERE artifact.tenant_id=$1 AND artifact.report_card_id=$2::uuid AND artifact.artifact_type='pdf'
        AND artifact.metadata->>'pdf_identity'=$3 AND file.retention_expires_at IS NULL LIMIT 1`,
      [card.tenant_id, card.id, identity],
    );
    return result.rows[0]?.storage_path ?? null;
  }
  async prepare(id: string) {
    const card = await this.load(id, true);
    if (!card.metadata?.source_revision)
      return this.work.submit(
        'pdf',
        { report_card_id: id, identity: reportPdfIdentity(card) },
        [id, reportPdfIdentity(card), 'legacy'],
      );
    const path = await this.cachedPath(card);
    if (path) return { state: 'ready', ...(await this.delivery(card, path)) };
    return this.work.submit(
      'pdf',
      { report_card_id: id, identity: reportPdfIdentity(card) },
      [id, reportPdfIdentity(card)],
      { refreshCompleted: true },
    );
  }
  private async certifyLegacySnapshot(card: Record<string, any>) {
    const revision = await this.sourceVersion(card.tenant_id, card.student_id);
    const deadline = await this.sourceValidUntil(card.tenant_id);
    const payload = extractPersistedReportCardPayload(card.metadata)!;
    const data = await this.repository.loadReportCardData({
      tenant_id: card.tenant_id,
      exam_series_id: card.exam_series_id,
      student_id: card.student_id,
    });
    const current = new ReportCardTemplateService().buildPayload(
      data,
      payload.generated_at,
    );
    if (
      reportIdentity(current) !== reportIdentity(payload) ||
      revision !==
        (await this.sourceVersion(card.tenant_id, card.student_id)) ||
      (deadline && Date.parse(deadline) <= Date.now())
    ) {
      throw new ConflictException(
        'This legacy snapshot differs from current academic inputs. Use controlled regeneration and review.',
      );
    }
    const actor = this.context.requireStore();
    await this.db.withRequestTransaction(async () => {
      const saved = await this.db.query(
        `UPDATE student_report_cards SET metadata=metadata || $4::jsonb
        WHERE tenant_id=$1 AND id=$2::uuid AND verification_code=$3 AND is_current
          AND status IN ('draft_generated','draft','under_review','approved','published')
          AND metadata=$5::jsonb RETURNING id`,
        [
          card.tenant_id,
          card.id,
          card.verification_code,
          JSON.stringify({
            source_revision: revision,
            source_valid_until: deadline,
            renderer_version: REPORT_RENDERER_VERSION,
          }),
          JSON.stringify(card.metadata),
        ],
      );
      if (!saved.rows.length)
        throw new ConflictException(
          'The report changed during artifact migration',
        );
      await this.db.query(
        `INSERT INTO student_report_card_audit_logs
        (tenant_id,report_card_id,exam_series_id,student_id,action,actor_user_id,metadata)
        VALUES($1,$2::uuid,$3::uuid,$4::uuid,'report_card.artifact_migrated',$5::uuid,$6::jsonb)`,
        [
          card.tenant_id,
          card.id,
          card.exam_series_id,
          card.student_id,
          actor.user_id,
          JSON.stringify({
            source_revision: revision,
            renderer_version: REPORT_RENDERER_VERSION,
          }),
        ],
      );
    });
    return this.load(card.id);
  }
  async delivery(card: Record<string, any>, path: string) {
    const fresh = await this.load(String(card.id));
    if (reportPdfIdentity(fresh) !== reportPdfIdentity(card))
      throw new ConflictException('Report changed before download');
    const signed = await this.storage.deliveryForTenant({
      tenantId: card.tenant_id,
      storagePath: path,
      filename: `report-card-${card.verification_code}.pdf`,
    });
    return {
      ...signed,
      download_url:
        signed.download_url ?? `/exams/report-cards/${card.id}/download`,
    };
  }
  async read(id: string) {
    const card = await this.load(id);
    const path = await this.cachedPath(card);
    if (!path)
      throw new ConflictException(
        'Prepare this report PDF first; rendering runs in the report queue',
      );
    const file = await this.storage.readForTenant({
      tenantId: card.tenant_id,
      storagePath: path,
    });
    return {
      filename: `report-card-${card.verification_code}.pdf`,
      contentType: 'application/pdf',
      content: file.content,
      byteLength: file.size_bytes,
      checksumSha256: file.sha256,
      generatedAt: card.metadata.report_card.generated_at,
      rowCount: 1,
    };
  }
  async ensurePdf(card: Record<string, any>) {
    const existing = await this.cachedPath(card);
    if (existing) return existing;
    const payload = extractPersistedReportCardPayload(card.metadata)!;
    const rendered = await createReportCardPdfArtifact(
      await hydrateReportCardLogoForRendering(
        payload,
        card.tenant_id,
        this.storage,
        true,
      ),
      card.verification_code,
    );
    const path = `tenant/${card.tenant_id}/reports/academic/${randomUUID()}.pdf`;
    await this.storage.save({
      tenantId: card.tenant_id,
      storagePath: path,
      originalFileName: rendered.filename,
      mimeType: rendered.contentType,
      sizeBytes: rendered.byteLength,
      buffer: rendered.content,
      retentionPolicy: 'report-staging',
      retentionExpiresAt: new Date(Date.now() + 86400000).toISOString(),
    });
    const fresh = await this.load(card.id);
    if (reportPdfIdentity(fresh) !== reportPdfIdentity(card))
      throw new ConflictException('Report changed during rendering');
    return this.db.withRequestTransaction(async () => {
      const result = await this.db.query<{ storage_path: string }>(
        `INSERT INTO report_pdf_cache(tenant_id,report_card_id,identity,storage_path)
        VALUES($1,$2::uuid,$3,$4) ON CONFLICT(tenant_id,report_card_id,identity) DO UPDATE SET
          storage_path=CASE WHEN EXISTS(SELECT 1 FROM file_objects file WHERE file.tenant_id=$1
            AND file.storage_path=report_pdf_cache.storage_path AND (file.retention_expires_at IS NULL OR file.retention_expires_at>now()))
            THEN report_pdf_cache.storage_path ELSE EXCLUDED.storage_path END
        RETURNING storage_path`,
        [card.tenant_id, card.id, reportPdfIdentity(card), path],
      );
      const winner = result.rows[0].storage_path;
      if (winner === path) {
        const promoted = await this.db.query(
          `UPDATE file_objects SET retention_policy='academic-record',retention_expires_at=NULL
          WHERE tenant_id=$1 AND storage_path=$2 AND retention_expires_at>now() RETURNING storage_path`,
          [card.tenant_id, path],
        );
        if (!promoted.rows.length)
          throw new ConflictException(
            'Report upload expired before promotion. Retry preparation.',
          );
      }
      return winner;
    });
  }
}
