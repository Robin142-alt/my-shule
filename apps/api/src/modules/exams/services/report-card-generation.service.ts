import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException, OnModuleInit, Optional } from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import { performance } from 'node:perf_hooks';
import { SchoolOperationalEventsService } from '../../events/school-operational-events.service';
import { classifyReportCardFailure, ReportCardWorkLimiter, type ReportCardFailure } from './report-card-generation-resilience';

import { DatabaseFileStorageService } from '../../../common/uploads/database-file-storage.service';
import { createPdfReportArtifact } from './report-card-pdf-artifact';
import { ExamsRepository, type ReportCardReadCache } from '../repositories/exams.repository';
import { hydrateReportCardLogoForRendering } from './report-card-logo-hydration';
import { ReportCardTemplateService } from './report-card-template.service';
import { ReportWorkService } from './report-work.service';
import { ReportCardArtifactsService } from './report-card-artifacts.service';
import { REPORT_RENDERER_VERSION, reportIdentity } from './report-artifact-identity';
import { REPORT_SCHOOL_REVISION_SQL } from './report-infrastructure-schema';

export interface GenerateStudentReportCardInput {
  tenant_id: string;
  actor_user_id: string;
  exam_series_id: string;
  student_id: string;
  generated_at?: string;
  regeneration_reason?: string;
  reuse_existing?: boolean;
  read_cache?: ReportCardReadCache;
}

export interface GenerateReportCardBatchInput {
  tenant_id: string;
  actor_user_id: string;
  exam_series_id: string;
  class_section_id?: string;
  stream_name?: string;
  batch_size?: number;
  offset?: number;
}

export interface ReportCardBatchStatus {
  id: string;
  status: string;
  queue_status: 'queued' | 'running' | 'completed' | 'failed';
  total_students: number;
  completed_students: number;
  failed_students: number;
  failures?: ReportCardFailure[];
  reused_students?: number;
  duration_ms?: number;
}

@Injectable()
export class ReportCardGenerationService implements OnModuleInit {
  private readonly logger = new Logger(ReportCardGenerationService.name);
  private readonly workLimiter = new ReportCardWorkLimiter(4);

  constructor(
    private readonly repository: ExamsRepository,
    private readonly templateService: ReportCardTemplateService,
    @Optional() private readonly fileStorage?: DatabaseFileStorageService,
    @Optional() private readonly schoolEvents?: SchoolOperationalEventsService,
    @Optional() private readonly work?: ReportWorkService,
    @Optional() private readonly artifactStore?: ReportCardArtifactsService,
  ) {}

  onModuleInit() {
    this.work?.register('generate', async row => {
      const card=await this.generateStudentReportCard({ ...row.input,tenant_id:row.tenant_id,actor_user_id:row.actor_user_id } as GenerateStudentReportCardInput);
      return { id:card.id,status:card.status,reused:card.reused,verification_code:card.verification_code,revision_number:card.revision_number };
    });
    this.work?.register('generate_batch', async (row, progress) => this.generateReportCardBatch({ ...row.input,
      tenant_id:row.tenant_id,actor_user_id:row.actor_user_id } as GenerateReportCardBatchInput, progress));
    this.work?.register('generate_scope', async (row, progress) => {
      const versions=await this.repository.executeSql(REPORT_SCHOOL_REVISION_SQL,[row.tenant_id]);
      if(versions.rows[0].revision!==row.input.source_revision) throw new ConflictException('Class data changed. Refresh readiness and retry generation.');
      const previous=row.result ?? { completed_students:0,failed_students:0,reused_students:0,failures:[],duration_ms:0 };
      const batch=await this.generateReportCardBatch({ ...row.input,tenant_id:row.tenant_id,actor_user_id:row.actor_user_id,
        batch_size:25 } as GenerateReportCardBatchInput, value=>progress({ ...value,
          completed_students:previous.completed_students+Number(value.completed_students ?? 0),total_students:row.input.total_students }));
      const result={ ...batch,total_students:row.input.total_students,
        completed_students:previous.completed_students+batch.completed_students,failed_students:previous.failed_students+batch.failed_students,
        reused_students:previous.reused_students+(batch.reused_students ?? 0),duration_ms:previous.duration_ms+(batch.duration_ms ?? 0),
        failures:[...previous.failures,...batch.failures ?? []].slice(0,200) };
      const offset=Number(row.input.offset ?? 0)+batch.total_students;
      if(offset<row.input.total_students) return { __continue:true,input:{ ...row.input,offset },result };
      return { ...result,queue_status:result.failed_students?'failed':'completed' };
    });
  }

  async generateStudentReportCard(input: GenerateStudentReportCardInput): Promise<Record<string, unknown>> {
    if(input.reuse_existing && this.artifactStore) {
      const reusable=await this.artifactStore.reusableSnapshot(input.tenant_id,input.exam_series_id,input.student_id,true);
      if(reusable)return reusable;
    }
    const sourceRevision=await this.artifactStore?.sourceVersion(input.tenant_id,input.student_id);
    const sourceValidUntil=await this.artifactStore?.sourceValidUntil(input.tenant_id);
    const generatedAt = normalizeTimestamp(input.generated_at);
    const data = await this.repository.loadReportCardData({
      tenant_id: input.tenant_id,
      exam_series_id: input.exam_series_id,
      student_id: input.student_id,
      read_cache: input.read_cache,
      read_cache_version: sourceRevision ? JSON.stringify(JSON.parse(sourceRevision).filter(([key]:[string,string])=>key==='school')) : undefined,
    });
    if (!data.student || !data.exam_series) {
      throw new NotFoundException("Learner or exam was not found in this school");
    }
    const payload = this.templateService.buildPayload(data, generatedAt);
    this.assertReportCardGradeBoundaries(payload);
    const gradingPolicy = asRecord(data.grading_policy);
    const templateVersion = 3;
    const generationSourceVersion = reportIdentity({ templateVersion, renderer:REPORT_RENDERER_VERSION, sourceRevision, data });
    const approvedResultVersion = buildApprovedResultVersion({
      tenantId: input.tenant_id,
      examSeriesId: input.exam_series_id,
      studentId: input.student_id,
      gradingPolicy,
      subjects: payload.subjects,
    });
    const verificationCode = buildVerificationCode({
      tenantId: input.tenant_id,
      examSeriesId: input.exam_series_id,
      studentId: input.student_id,
      generatedAt,
      sourceVersion:generationSourceVersion,
    });
    const reportSnapshotId = buildReportSnapshotId(
      input.tenant_id,
      input.exam_series_id,
      input.student_id,
      verificationCode,
    );
    const reusable = await this.repository.findReusableReportCard({
      ...input, verification_code: verificationCode, approved_result_version: approvedResultVersion,
      generation_source_version: generationSourceVersion,
    });
    if (reusable) return reusable;
    const renderPayload = await hydrateReportCardLogoForRendering(
      payload,
      input.tenant_id,
      this.fileStorage,
      Boolean(this.artifactStore),
    );
    const pdfArtifact = await createPdfReportArtifact(
      renderPayload,
      verificationCode,
    );
    const snapshot = {
      tenant_id: input.tenant_id,
      actor_user_id: input.actor_user_id,
      exam_series_id: input.exam_series_id,
      student_id: input.student_id,
      report_snapshot_id: reportSnapshotId,
      verification_code: verificationCode,
      status: 'draft_generated',
      grading_policy_id: gradingPolicy?.id ?? null,
      grading_policy_version: gradingPolicy?.version ?? null,
      template_version: templateVersion,
      approved_result_version: approvedResultVersion,
      metadata: {
        generated_by: input.actor_user_id,
        generated_at: generatedAt,
        regeneration_reason: input.regeneration_reason ?? null,
        grading_policy: gradingPolicy,
        template_version: templateVersion,
        approved_result_version: approvedResultVersion,
        generation_source_version: generationSourceVersion,
        source_revision: sourceRevision,
        source_valid_until: sourceValidUntil,
        renderer_version: REPORT_RENDERER_VERSION,
        report_card: payload,
        ...(asRecord(data.comments)?.class_teacher_source==='manual' ? { class_teacher_comment:asRecord(data.comments)?.class_teacher } : {}),
        ...(asRecord(data.comments)?.principal_source==='manual' ? { principal_comment:asRecord(data.comments)?.principal } : {}),
        artifact_count: 1,
      },
      reuse_existing: input.reuse_existing === true,
      generation_source_version: generationSourceVersion,
    };
    const artifacts = await Promise.all([pdfArtifact].map(async (artifact) => ({
      artifact_type: 'pdf',
      checksum_sha256: artifact.checksumSha256,
      byte_size: artifact.byteLength,
      verification_code: verificationCode,
      generated_by_user_id: input.actor_user_id,
      ...(this.artifactStore && this.fileStorage ? { storage_key:(await this.fileStorage.save({
        tenantId:input.tenant_id,storagePath:`tenant/${input.tenant_id}/reports/academic/${randomUUID()}.pdf`,
        originalFileName:artifact.filename,mimeType:artifact.contentType,sizeBytes:artifact.byteLength,buffer:artifact.content,
        retentionPolicy:'report-staging',retentionExpiresAt:new Date(Date.now()+86400000).toISOString(),
      })).stored_path } : {}),
      metadata: {
        filename: artifact.filename,
        content_type: artifact.contentType,
        generated_at: artifact.generatedAt,
      },
    })));
    if (this.artifactStore && (sourceRevision!==await this.artifactStore.sourceVersion(input.tenant_id,input.student_id)
      || (sourceValidUntil && Date.parse(sourceValidUntil)<=Date.now()))) {
      throw new ConflictException('Report inputs changed during generation. Retry with current marks and settings.');
    }
    const action = input.regeneration_reason ? 'report_card.regenerated' : 'report_card.generated';
    return this.repository.saveGeneratedReportCard(snapshot, artifacts, {
      exam_series_id: input.exam_series_id,
      student_id: input.student_id,
      action,
      actor_user_id: input.actor_user_id,
      metadata: {
        report_snapshot_id: reportSnapshotId,
        verification_code: verificationCode,
        artifact_types: ['pdf'],
      },
    }, this.schoolEvents ? (card, tx) => this.schoolEvents!.recordSchoolOperation({
      event: {
        id: `${action}:${verificationCode}`, type: action, module: 'exams',
        title: 'Report card generated', body: 'A report-card draft is ready for academic review.',
        entityId: card.id,
        payload: { report_card_id: card.id, student_id: input.student_id, exam_series_id: input.exam_series_id },
      },
    }, tx) : undefined);
  }

  async generateReportCardBatch(input: GenerateReportCardBatchInput, progress?: (value: Record<string, any>)=>Promise<void>): Promise<ReportCardBatchStatus> {
    const readiness = await this.repository.getReportCardBatchReadiness({
      tenant_id: input.tenant_id,
      exam_series_id: input.exam_series_id,
      class_section_id: input.class_section_id ?? null,
      stream_name: input.stream_name ?? null,
    });
    const expectedMarkCount = Number(readiness.expected_mark_count ?? 0);
    const notReadyMarkCount = Number(readiness.not_ready_mark_count ?? 0);

    if (expectedMarkCount === 0) {
      throw new BadRequestException(
        'No active learner-subject records are available for report-card generation in this exam scope',
      );
    }
    if (notReadyMarkCount > 0) {
      throw new BadRequestException(
        `${notReadyMarkCount} learner-subject mark${notReadyMarkCount === 1 ? '' : 's'} must be entered, moderated, and locked before report-card generation`,
      );
    }

    const students = await this.repository.listStudentsForReportCardBatch({
      tenant_id: input.tenant_id,
      exam_series_id: input.exam_series_id,
      class_section_id: input.class_section_id ?? null,
      stream_name: input.stream_name ?? null,
      limit: input.batch_size,
      offset: input.offset,
    });
    if (students.length === 0) {
      throw new BadRequestException(
        'No learners with locked marks are ready for report-card generation in this exam scope',
      );
    }
    const batch = await this.repository.createReportCardGenerationBatch({
      tenant_id: input.tenant_id,
      exam_series_id: input.exam_series_id,
      class_section_id: input.class_section_id ?? null,
      stream_name: input.stream_name ?? null,
      requested_by_user_id: input.actor_user_id,
      total_students: students.length,
      status: 'draft_requested',
      metadata: {
        queue_status: 'running',
      },
    });
    const startedAt = performance.now();
    let completedStudents = 0;
    let reusedStudents = 0;
    let failedStudents = 0;
    const failures: ReportCardFailure[] = [];
    const readCache: ReportCardReadCache = new Map();
    let cursor = 0;
    let abortChunk:unknown;
    const worker = async () => {
      while (cursor < students.length && !abortChunk) {
        const student = students[cursor++];
        // Keep the same verification identity across retries, including ambiguous commit responses.
        const generatedAt = new Date().toISOString();
        await this.workLimiter.run(async () => {
          for (let attempt = 1; attempt <= 3; attempt += 1) {
            try {
              const card = await this.generateStudentReportCard({
                tenant_id: input.tenant_id, actor_user_id: input.actor_user_id,
                exam_series_id: input.exam_series_id, student_id: student.id,
                generated_at: generatedAt, reuse_existing: true, read_cache: readCache,
              });
              completedStudents += 1;
              if (card.reused) reusedStudents += 1;
              break;
            } catch (error) {
              const failure = classifyReportCardFailure(error);
              if (failure.retryable && attempt < 3) {
                await delay(100 * (2 ** (attempt - 1)) + Math.floor(Math.random() * 50));
                continue;
              }
              failedStudents += 1;
              failures.push({ student_id: String(student.id), student_name: student.student_name,
                ...failure, attempts: attempt });
              this.logger.error(
                `Report-card generation failed: batch ${batch.id}, tenant ${input.tenant_id}, series ${input.exam_series_id}, student ${student.id}, code ${failure.code}, attempt ${attempt}`,
                error instanceof Error ? error.stack : undefined,
              );
              break;
            }
          }
          // Lease/progress failures abort the chunk; they must not count an
          // already saved card again or be misclassified as invalid student data.
          try {
            await progress?.({ completed_students:completedStudents,failed_students:failedStudents,total_students:students.length });
          } catch(error) { abortChunk=error; }
        });
      }
    };
    await Promise.all(Array.from({ length: Math.min(4, students.length) }, () => worker()));
    if(abortChunk) throw abortChunk;

    const status = failedStudents > 0 ? 'failed' : 'draft_generated';
    const updated = await this.repository.updateReportCardGenerationBatch({
      tenant_id: input.tenant_id,
      actor_user_id: input.actor_user_id,
      exam_series_id: input.exam_series_id,
      batch_id: batch.id,
      status,
      total_students: students.length,
      completed_students: completedStudents,
      failed_students: failedStudents,
      queue_status: failedStudents > 0 ? 'failed' : 'completed',
      failures,
      reused_students: reusedStudents,
      duration_ms: Math.round(performance.now() - startedAt),
    }, this.schoolEvents ? (tx) => this.schoolEvents!.recordSchoolOperation({
      event: {
        id: `report-generation:${batch.id}`, module: 'exams', entityId: batch.id,
        type: failedStudents ? 'report_generation.failed' : 'report_generation.completed',
        title: failedStudents ? 'Report generation needs attention' : 'Report generation completed',
        body: `${completedStudents} cards ready; ${failedStudents} failed.`,
        severity: failedStudents ? 'warning' : 'info',
        payload: { batch_id: batch.id, completed_students: completedStudents, failed_students: failedStudents },
      },
    }, tx) : undefined) as ReportCardBatchStatus | null;

    if (!updated) {
      throw new NotFoundException('Report-card generation batch was not found');
    }

    return updated;
  }

  async getReportCardBatchStatus(input: { tenant_id: string; batch_id: string }): Promise<ReportCardBatchStatus> {
    const batch = await this.repository.getReportCardGenerationBatch(input) as ReportCardBatchStatus | null;

    if (!batch) {
      throw new NotFoundException('Report-card generation batch was not found');
    }

    return batch;
  }

  async verifyPrintedReportCard(input: { tenant_id: string; verification_code: string }) {
    const result = await this.repository.findReportCardArtifactByVerificationCode(input);

    return {
      verification_code: input.verification_code,
      status: result ? 'valid' : 'not_found',
      report_card_id: result?.report_card_id ?? null,
      student: result?.student ?? null,
      exam_series: result?.exam_series ?? null,
      artifact_types: result?.artifact_types ?? [],
      generated_at: result?.generated_at ?? null,
    };
  }

  private assertReportCardGradeBoundaries(payload: ReturnType<ReportCardTemplateService['buildPayload']>): void {
    if (payload.subjects.length === 0) {
      throw new BadRequestException(
        'No locked or published marks are available for this learner and exam series',
      );
    }

    for (const subject of payload.subjects) {
      if (subject.score_status !== 'entered') {
        continue;
      }

      if (subject.score === null) {
        throw new BadRequestException(
          `${subject.subject_name} is marked as entered but has no numeric score`,
        );
      }

      if (subject.score > subject.max_score) {
        throw new BadRequestException(
          `${subject.subject_name} score exceeds the assessment maximum on the report card`,
        );
      }

      const hasTraditionalGrade = Boolean(subject.grade_label?.trim());
      const hasCompetencyOutcome = Boolean(subject.competency_outcome?.trim() || subject.descriptor?.trim());

      if (!hasTraditionalGrade && !hasCompetencyOutcome) {
        throw new BadRequestException(
          `${subject.subject_name} has no grade boundary match for report-card generation`,
        );
      }
    }
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function buildApprovedResultVersion(input: {
  tenantId: string;
  examSeriesId: string;
  studentId: string;
  gradingPolicy: Record<string, unknown> | null;
  subjects: Array<{
    subject_id: string;
    score: number | null;
    score_status: string;
    max_score: number;
    grade_label: string | null;
    assessment_components?: Array<{
      name: string;
      weight: number | null;
      score: number | null;
      max_score: number;
      percentage: number | null;
      score_status: string;
    }>;
  }>;
}): string {
  const evidence = {
    tenant_id: input.tenantId,
    exam_series_id: input.examSeriesId,
    student_id: input.studentId,
    grading_policy_id: input.gradingPolicy?.id ?? null,
    grading_policy_version: input.gradingPolicy?.version ?? null,
    subjects: input.subjects.map((subject) => ({
      subject_id: subject.subject_id,
      score: subject.score,
      score_status: subject.score_status,
      max_score: subject.max_score,
      grade_label: subject.grade_label,
      assessment_components: subject.assessment_components ?? [],
    })),
  };

  return createHash('sha256').update(JSON.stringify(evidence)).digest('hex');
}

function normalizeTimestamp(value: string | undefined): string {
  const date = value ? new Date(value) : new Date();

  if (Number.isNaN(date.getTime())) {
    return new Date().toISOString();
  }

  return date.toISOString();
}

function buildVerificationCode(input: {
  tenantId: string;
  examSeriesId: string;
  studentId: string;
  generatedAt: string;
  sourceVersion: string;
}): string {
  return createHash('sha256')
    .update([input.tenantId, input.examSeriesId, input.studentId, input.generatedAt,input.sourceVersion].join(':'))
    .digest('hex')
    .slice(0, 20)
    .toUpperCase();
}

function buildReportSnapshotId(
  tenantId: string,
  examSeriesId: string,
  studentId: string,
  verificationCode: string,
): string {
  return `report-card:${tenantId}:${examSeriesId}:${studentId}:${verificationCode}`;
}
