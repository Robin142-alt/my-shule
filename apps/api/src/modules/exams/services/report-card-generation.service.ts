import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { createHash } from 'node:crypto';

import { createPdfReportArtifact } from './report-card-pdf-artifact';
import { ExamsRepository } from '../repositories/exams.repository';
import { ReportCardTemplateService } from './report-card-template.service';

export interface GenerateStudentReportCardInput {
  tenant_id: string;
  actor_user_id: string;
  exam_series_id: string;
  student_id: string;
  generated_at?: string;
  regeneration_reason?: string;
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
}

@Injectable()
export class ReportCardGenerationService {
  constructor(
    private readonly repository: ExamsRepository,
    private readonly templateService: ReportCardTemplateService,
  ) {}

  async generateStudentReportCard(input: GenerateStudentReportCardInput): Promise<Record<string, unknown>> {
    const generatedAt = normalizeTimestamp(input.generated_at);
    const data = await this.repository.loadReportCardData({
      tenant_id: input.tenant_id,
      exam_series_id: input.exam_series_id,
      student_id: input.student_id,
    });
    const payload = this.templateService.buildPayload(data, generatedAt);
    this.assertReportCardGradeBoundaries(payload);
    const gradingPolicy = asRecord(data.grading_policy);
    const templateVersion = 1;
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
    });
    const reportSnapshotId = buildReportSnapshotId(
      input.tenant_id,
      input.exam_series_id,
      input.student_id,
      verificationCode,
    );
    const htmlArtifact = createHtmlArtifact(
      this.templateService.renderHtml(payload, verificationCode),
      verificationCode,
      generatedAt,
    );
    const pdfArtifact = await createPdfReportArtifact(
      payload,
      verificationCode,
    );
    const reportCard = await this.repository.createGeneratedReportCardSnapshot({
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
        report_card: payload,
        artifact_count: 2,
      },
    }) as Record<string, unknown>;
    const artifacts = [];

    artifacts.push(await this.repository.recordReportCardArtifact({
      tenant_id: input.tenant_id,
      report_card_id: reportCard.id,
      artifact_type: 'html',
      storage_key: buildArtifactStorageKey(input.tenant_id, String(reportCard.id), verificationCode, 'html'),
      checksum_sha256: htmlArtifact.checksumSha256,
      byte_size: htmlArtifact.byteLength,
      verification_code: verificationCode,
      generated_by_user_id: input.actor_user_id,
      metadata: {
        filename: htmlArtifact.filename,
        content_type: htmlArtifact.contentType,
        generated_at: htmlArtifact.generatedAt,
      },
    }));
    artifacts.push(await this.repository.recordReportCardArtifact({
      tenant_id: input.tenant_id,
      report_card_id: reportCard.id,
      artifact_type: 'pdf',
      storage_key: buildArtifactStorageKey(input.tenant_id, String(reportCard.id), verificationCode, 'pdf'),
      checksum_sha256: pdfArtifact.checksumSha256,
      byte_size: pdfArtifact.byteLength,
      verification_code: verificationCode,
      generated_by_user_id: input.actor_user_id,
      metadata: {
        filename: pdfArtifact.filename,
        content_type: pdfArtifact.contentType,
        generated_at: pdfArtifact.generatedAt,
      },
    }));

    await this.repository.appendReportCardAuditLog({
      tenant_id: input.tenant_id,
      report_card_id: reportCard.id,
      exam_series_id: input.exam_series_id,
      student_id: input.student_id,
      action: input.regeneration_reason ? 'report_card.regenerated' : 'report_card.generated',
      actor_user_id: input.actor_user_id,
      metadata: {
        report_snapshot_id: reportSnapshotId,
        verification_code: verificationCode,
        artifact_types: artifacts.map((artifact) => artifact.artifact_type),
      },
    });

    return {
      ...reportCard,
      verification_code: verificationCode,
      artifacts,
    };
  }

  async generateReportCardBatch(input: GenerateReportCardBatchInput): Promise<ReportCardBatchStatus> {
    const students = await this.repository.listStudentsForReportCardBatch({
      tenant_id: input.tenant_id,
      class_section_id: input.class_section_id ?? null,
      stream_name: input.stream_name ?? null,
      limit: input.batch_size,
      offset: input.offset,
    });
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
    let completedStudents = 0;
    let failedStudents = 0;

    for (const student of students) {
      try {
        await this.generateStudentReportCard({
          tenant_id: input.tenant_id,
          actor_user_id: input.actor_user_id,
          exam_series_id: input.exam_series_id,
          student_id: student.id,
        });
        completedStudents += 1;
      } catch {
        failedStudents += 1;
      }
    }

    const status = failedStudents > 0 ? 'failed' : 'draft_generated';
    const updated = await this.repository.updateReportCardGenerationBatch({
      tenant_id: input.tenant_id,
      batch_id: batch.id,
      status,
      total_students: students.length,
      completed_students: completedStudents,
      failed_students: failedStudents,
      queue_status: failedStudents > 0 ? 'failed' : 'completed',
    }) as ReportCardBatchStatus | null;

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
}): string {
  return createHash('sha256')
    .update([input.tenantId, input.examSeriesId, input.studentId, input.generatedAt].join(':'))
    .digest('hex')
    .slice(0, 12)
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

function createHtmlArtifact(content: Buffer, verificationCode: string, generatedAt: string) {
  return {
    filename: `report-card-${verificationCode.toLowerCase()}.html`,
    contentType: 'text/html; charset=utf-8',
    byteLength: content.length,
    checksumSha256: createHash('sha256').update(content).digest('hex'),
    generatedAt,
    rowCount: 1,
    content,
  };
}

function buildArtifactStorageKey(
  tenantId: string,
  reportCardId: string,
  verificationCode: string,
  extension: 'html' | 'pdf',
): string {
  return `tenant/${tenantId}/exams/report-cards/${reportCardId}/${verificationCode}.${extension}`;
}
