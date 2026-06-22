import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  Optional,
  UnauthorizedException,
  forwardRef,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

import { RequestContextService } from '../../common/request-context/request-context.service';
import {
  BulkExamMarkUploadDto,
  BulkExamMarkUploadRowDto,
  CorrectLockedExamMarkDto,
  CreateExamAssessmentDto,
  CreateExamSeriesDto,
  EnterExamMarkDto,
  GenerateReportCardBatchDto,
  GenerateReportCardDto,
  LockExamMarksDto,
  ModerateExamMarksDto,
  PublishReportCardDto,
  CreateTimetableSlotDto,
  AssignInvigilatorDto,
  MarkExamAttendanceDto,
  ReportStudentExamCaseDto,
} from './dto/exams.dto';
import { ExamsRepository } from './repositories/exams.repository';
import { ReportCardGenerationService } from './services/report-card-generation.service';
import { SchoolOperationalEventsService } from '../events/school-operational-events.service';
import { EventPublisherService } from '../events/event-publisher.service';

const OFFICER_PERMISSIONS = new Set(['exams:review', 'exams:approve', '*:*']);
const OFFICER_ROLES = new Set(['owner', 'admin', 'platform_owner', 'superadmin', 'exams_officer']);
const PARENT_REPORT_CARD_DOWNLOAD_PURPOSE = 'exams.report_card.parent_download';
const BULK_MARK_UPLOAD_MAX_ROWS = 500;
const BULK_MARK_UPLOAD_HEADERS = [
  'exam_series_id',
  'assessment_id',
  'academic_term_id',
  'class_section_id',
  'subject_id',
  'student_id',
  'score',
  'remarks',
] as const;

interface ParentReportCardDownloadTokenPayload {
  purpose: typeof PARENT_REPORT_CARD_DOWNLOAD_PURPOSE;
  tenant_id: string;
  actor_user_id: string;
  report_card_id: string;
  student_id: string;
  report_snapshot_id: string;
  expires_at: string;
}

interface ValidatedMarkEntry {
  dto: EnterExamMarkDto;
  score: number;
  grade_boundary: Record<string, unknown> | null;
}

interface BulkMarkUploadValidationResult {
  row_number: number;
  status: 'valid' | 'invalid' | 'duplicate' | 'committed';
  errors: string[];
  student_id: string | null;
  assessment_id: string | null;
  grade_label: string | null;
}

@Injectable()
export class ExamsService {
  constructor(
    @Inject(forwardRef(() => RequestContextService))
    private readonly requestContext: RequestContextService,
    private readonly repository: ExamsRepository,
    @Optional() private readonly configService?: ConfigService,
    @Optional() private readonly reportCardGenerationService?: ReportCardGenerationService,
    @Optional() private readonly schoolEvents?: SchoolOperationalEventsService,
    @Optional() private readonly eventPublisher?: EventPublisherService,
  ) {}

  async getDashboard() {
    const tenantId = this.requireTenantId();
    const data = await this.repository.getDashboard(tenantId);
    return {
      savedConfigurations: data.savedConfigurations.map((r: any) => ({
        id: r.id,
        title: r.name,
        status: r.status,
        reviewer: 'Dean of Academics',
        savedAt: r.created_at
      })),
      examDrafts: data.examDrafts.map((r: any) => ({
        id: r.id,
        title: r.name,
        detail: `Created ${r.created_at}`,
        status: r.status,
        createdAt: r.created_at
      })),
      marksEntrySessions: data.marksEntrySessions.map((r: any) => ({
        id: r.id,
        title: 'Marks Entry Session',
        detail: `Opened at ${r.opens_at}`,
        status: r.status,
        createdAt: r.created_at
      })),
      deanReviewBatches: data.deanReviewBatches.map((r: any) => ({
        id: r.id,
        title: 'Report Card Batch',
        detail: `Sent to Dean`,
        status: r.status,
        createdAt: r.created_at
      }))
    };
  }

  async getAnalytics() {
    const tenantId = this.requireTenantId();
    return this.repository.getAnalytics(tenantId);
  }

  createSeries(dto: CreateExamSeriesDto) {
    return this.repository.createSeries({
      tenant_id: this.requireTenantId(),
      created_by_user_id: this.currentUserId(),
      academic_term_id: this.requireText(dto.academic_term_id, 'Academic term'),
      name: this.requireText(dto.name, 'Exam series name'),
      starts_on: dto.starts_on,
      ends_on: dto.ends_on,
    });
  }

  createAssessment(dto: CreateExamAssessmentDto) {
    return this.repository.createAssessment({
      tenant_id: this.requireTenantId(),
      created_by_user_id: this.currentUserId(),
      exam_series_id: this.requireText(dto.exam_series_id, 'Exam series'),
      subject_id: this.requireText(dto.subject_id, 'Subject'),
      name: this.requireText(dto.name, 'Assessment name'),
      max_score: this.requirePositiveNumber(dto.max_score, 'Max score'),
      weight: this.requirePositiveNumber(dto.weight, 'Assessment weight'),
    });
  }

  async enterMark(dto: EnterExamMarkDto) {
    const tenantId = this.requireTenantId();
    const actorUserId = this.requireUserId();
    const validated = await this.validateMarkEntry(dto, tenantId, actorUserId);

    return this.persistValidatedMark(validated, tenantId, actorUserId, 'grade.updated');
  }

  getBulkMarkUploadTemplate() {
    return {
      content_type: 'text/csv',
      max_rows: BULK_MARK_UPLOAD_MAX_ROWS,
      headers: [...BULK_MARK_UPLOAD_HEADERS],
      sample_row: {
        exam_series_id: 'series-uuid',
        assessment_id: 'assessment-uuid',
        academic_term_id: 'term-uuid',
        class_section_id: 'class-section-uuid',
        subject_id: 'subject-uuid',
        student_id: 'student-uuid',
        score: 84,
        remarks: 'Optional teacher comment',
      },
    };
  }

  async bulkUploadMarks(dto: BulkExamMarkUploadDto) {
    const tenantId = this.requireTenantId();
    const actorUserId = this.requireUserId();
    const rows = this.requireBulkRows(dto.rows);
    const mode = dto.mode === 'commit' ? 'commit' : 'preview';
    const seenKeys = new Set<string>();
    const rowResults: BulkMarkUploadValidationResult[] = [];
    const validEntries: Array<{ row_number: number; entry: ValidatedMarkEntry }> = [];

    for (const [index, row] of rows.entries()) {
      const rowNumber = Number.isInteger(row.row_number) && Number(row.row_number) > 0
        ? Number(row.row_number)
        : index + 2;
      const errors: string[] = [];
      let normalized: EnterExamMarkDto | null = null;
      let duplicate = false;
      let gradeLabel: string | null = null;

      try {
        normalized = this.normalizeBulkMarkRow(row);
        const duplicateKey = this.bulkMarkDuplicateKey(normalized);

        if (seenKeys.has(duplicateKey)) {
          duplicate = true;
          errors.push('Duplicate mark row for assessment and student in this upload');
        } else {
          seenKeys.add(duplicateKey);
        }
      } catch (error) {
        errors.push(errorMessage(error));
      }

      if (normalized && errors.length === 0) {
        try {
          const entry = await this.validateMarkEntry(normalized, tenantId, actorUserId);
          gradeLabel = textValue(entry.grade_boundary?.label);
          validEntries.push({ row_number: rowNumber, entry });
        } catch (error) {
          errors.push(errorMessage(error));
        }
      }

      rowResults.push({
        row_number: rowNumber,
        status: errors.length > 0 ? (duplicate ? 'duplicate' : 'invalid') : 'valid',
        errors,
        student_id: normalized?.student_id ?? null,
        assessment_id: normalized?.assessment_id ?? null,
        grade_label: gradeLabel,
      });
    }

    const invalidRows = rowResults.filter((row) => row.status === 'invalid' || row.status === 'duplicate').length;
    const duplicateRows = rowResults.filter((row) => row.status === 'duplicate').length;
    const previewToken = this.buildBulkMarkUploadPreviewToken(tenantId, actorUserId, validEntries);

    if (mode === 'commit') {
      if (!dto.preview_token || dto.preview_token !== previewToken) {
        throw new BadRequestException('Bulk mark upload must be previewed before commit');
      }

      if (invalidRows > 0) {
        throw new BadRequestException('Bulk mark upload contains invalid rows; preview and fix them before commit');
      }

      for (const validEntry of validEntries) {
        await this.persistValidatedMark(
          validEntry.entry,
          tenantId,
          actorUserId,
          'bulk_grade.updated',
          {
            bulk_upload: true,
            row_number: validEntry.row_number,
          },
        );
      }

      for (const row of rowResults) {
        row.status = 'committed';
      }
    }

    return {
      mode,
      total_rows: rows.length,
      valid_rows: validEntries.length,
      invalid_rows: invalidRows,
      duplicate_rows: duplicateRows,
      committed_rows: mode === 'commit' ? validEntries.length : 0,
      preview_token: previewToken,
      row_results: rowResults,
    };
  }

  async correctLockedMark(dto: CorrectLockedExamMarkDto) {
    if (!this.isExamsOfficer()) {
      throw new ForbiddenException('Exam officer approval is required to correct locked marks');
    }

    const tenantId = this.requireTenantId();
    const actorUserId = this.requireUserId();
    const reason = this.requireText(dto.reason, 'Correction reason');
    const existing = await this.repository.findExistingMark({
      tenant_id: tenantId,
      mark_id: dto.mark_id,
    });

    if (!existing) {
      throw new NotFoundException(`Exam mark "${dto.mark_id}" was not found`);
    }

    const score = this.requireNonNegativeNumber(dto.score, 'Score');
    const publishedReportCards = await this.findPublishedReportCardsForMark(tenantId, dto.mark_id);
    const correctionApprovals = dto as CorrectLockedExamMarkDto & {
      first_approver_user_id?: string;
      second_approver_user_id?: string;
    };

    if (publishedReportCards.length > 0) {
      const firstApprover = correctionApprovals.first_approver_user_id?.trim() || '';
      const secondApprover = correctionApprovals.second_approver_user_id?.trim() || '';

      if (!firstApprover || !secondApprover || firstApprover === secondApprover) {
        throw new ForbiddenException(
          'Published report-card corrections require dual approval before regeneration',
        );
      }
    }

    const corrected = await this.repository.correctLockedMark({
      tenant_id: tenantId,
      mark_id: dto.mark_id,
      score,
      actor_user_id: actorUserId,
    });

    await this.createMarkVersionIfSupported({
      tenant_id: tenantId,
      mark_id: dto.mark_id,
      original_score: existing.score,
      correction_score: score,
      corrected_by_user_id: actorUserId,
      reason,
      approval_state: publishedReportCards.length > 0 ? 'dual_approved' : 'approved',
      first_approver_user_id: correctionApprovals.first_approver_user_id ?? null,
      second_approver_user_id: correctionApprovals.second_approver_user_id ?? null,
    });

    if (publishedReportCards.length > 0) {
      await this.markReportCardsRegenerationRequiredIfSupported({
        tenant_id: tenantId,
        report_card_ids: publishedReportCards.map((card) => card.id),
        status: 'regeneration_required',
        reason,
        corrected_mark_id: dto.mark_id,
        actor_user_id: actorUserId,
      });
    }

    await this.repository.appendMarkAuditLog({
      tenant_id: tenantId,
      mark_id: dto.mark_id,
      exam_series_id: existing.exam_series_id,
      assessment_id: existing.assessment_id,
      student_id: existing.student_id,
      action: 'grade.updated',
      actor_user_id: actorUserId,
      previous_score: existing.score,
      new_score: score,
      reason,
      metadata: {
        correction: true,
        published_report_card_ids: publishedReportCards.map((card) => card.id),
      },
    });

    return corrected;
  }

  async publishReportCard(dto: PublishReportCardDto) {
    if (!this.isExamsOfficer()) {
      throw new ForbiddenException('Exam approval permission is required to publish report cards');
    }

    const tenantId = this.requireTenantId();
    const actorUserId = this.requireUserId();
    const reportCard = await this.repository.createReportCardSnapshot({
      tenant_id: tenantId,
      actor_user_id: actorUserId,
      exam_series_id: this.requireText(dto.exam_series_id, 'Exam series'),
      student_id: this.requireText(dto.student_id, 'Student'),
      report_snapshot_id: this.requireText(dto.report_snapshot_id, 'Report snapshot'),
      metadata: {
        published_by: actorUserId,
      },
    });

    await this.repository.appendReportCardAuditLog({
      tenant_id: tenantId,
      report_card_id: reportCard.id,
      exam_series_id: dto.exam_series_id,
      student_id: dto.student_id,
      action: 'grade.published',
      actor_user_id: actorUserId,
      metadata: {
        report_snapshot_id: dto.report_snapshot_id,
      },
    });

    try {
      await this.eventPublisher?.publishReportCardPublished({
        tenant_id: tenantId,
        report_id: reportCard.id,
        student_id: dto.student_id,
        exam_id: dto.exam_series_id,
        published_by_user_id: actorUserId,
      });
    } catch (e) {
      console.error('Failed to publish report card published event:', e);
    }

    return reportCard;
  }

  async generateReportCard(dto: GenerateReportCardDto) {
    if (!this.isExamsOfficer()) {
      throw new ForbiddenException('Exam approval permission is required to generate report cards');
    }

    const tenantId = this.requireTenantId();
    const actorUserId = this.requireUserId();
    const examSeriesId = this.requireText(dto.exam_series_id, 'Exam series');
    const studentId = this.requireText(dto.student_id, 'Student');

    if (this.reportCardGenerationService) {
      return this.reportCardGenerationService.generateStudentReportCard({
        tenant_id: tenantId,
        actor_user_id: actorUserId,
        exam_series_id: examSeriesId,
        student_id: studentId,
      });
    }

    const data = await this.repository.loadReportCardData({
      tenant_id: tenantId,
      exam_series_id: examSeriesId,
      student_id: studentId,
    });
    const reportCardPayload = this.buildReportCardPayload(data);
    const reportSnapshotId = this.buildReportSnapshotId(tenantId, examSeriesId, studentId);
    const reportCard = await this.repository.createGeneratedReportCardSnapshot({
      tenant_id: tenantId,
      actor_user_id: actorUserId,
      exam_series_id: examSeriesId,
      student_id: studentId,
      report_snapshot_id: reportSnapshotId,
      metadata: {
        generated_by: actorUserId,
        report_card: reportCardPayload,
      },
    });

    await this.repository.appendReportCardAuditLog({
      tenant_id: tenantId,
      report_card_id: reportCard.id,
      exam_series_id: examSeriesId,
      student_id: studentId,
      action: 'report_card.generated',
      actor_user_id: actorUserId,
      metadata: {
        report_snapshot_id: reportSnapshotId,
        subject_count: Array.isArray(reportCardPayload.subjects)
          ? reportCardPayload.subjects.length
          : 0,
      },
    });

    return reportCard;
  }

  async regenerateReportCard(dto: GenerateReportCardDto & { reason?: string }) {
    if (!this.isExamsOfficer()) {
      throw new ForbiddenException('Exam approval permission is required to regenerate report cards');
    }

    const generationService = this.requireReportCardGenerationService();

    return generationService.generateStudentReportCard({
      tenant_id: this.requireTenantId(),
      actor_user_id: this.requireUserId(),
      exam_series_id: this.requireText(dto.exam_series_id, 'Exam series'),
      student_id: this.requireText(dto.student_id, 'Student'),
      regeneration_reason: dto.reason?.trim() || 'Manual regeneration',
    });
  }

  async generateReportCardBatch(dto: GenerateReportCardBatchDto) {
    if (!this.isExamsOfficer()) {
      throw new ForbiddenException('Exam approval permission is required to generate report cards');
    }

    const generationService = this.requireReportCardGenerationService();

    return generationService.generateReportCardBatch({
      tenant_id: this.requireTenantId(),
      actor_user_id: this.requireUserId(),
      exam_series_id: this.requireText(dto.exam_series_id, 'Exam series'),
      class_section_id: this.optionalText(dto.class_section_id),
      stream_name: this.optionalText(dto.stream_name),
      batch_size: this.parsePageLimit(dto.batch_size, 200, 200),
      offset: this.parsePageOffset(dto.offset),
    });
  }

  async getReportCardBatchStatus(batchId: string) {
    return this.requireReportCardGenerationService().getReportCardBatchStatus({
      tenant_id: this.requireTenantId(),
      batch_id: this.requireText(batchId, 'Report-card batch'),
    });
  }

  async verifyReportCard(verificationCode: string) {
    return this.requireReportCardGenerationService().verifyPrintedReportCard({
      tenant_id: this.requireTenantId(),
      verification_code: this.requireText(verificationCode, 'Verification code'),
    });
  }

  listReportCards(queryOrStudentId?: string | Record<string, string | undefined>) {
    const query = typeof queryOrStudentId === 'string'
      ? { student_id: queryOrStudentId }
      : queryOrStudentId ?? {};

    return this.repository.listReportCards({
      tenant_id: this.requireTenantId(),
      student_id: this.optionalText(query.student_id),
      limit: this.parsePageLimit(query.limit, 25, 50),
      offset: this.parsePageOffset(query.offset),
    });
  }

  async lockMarkSheet(markSheetId: string) {
    const tenantId = this.requireTenantId();
    const actorUserId = this.requireUserId();
    const normalizedMarkSheetId = this.requireText(markSheetId, 'Mark sheet');

    if (!this.isExamsOfficer()) {
      const assignedSheets = await this.repository.listMarkSheets({
        tenant_id: tenantId,
        teacher_user_id: actorUserId,
      });
      const canLockAssignedSheet = assignedSheets.some((sheet: Record<string, unknown>) =>
        String(sheet.id) === normalizedMarkSheetId,
      );

      if (!canLockAssignedSheet) {
        throw new ForbiddenException('Only assigned teachers or exam officers can lock this mark sheet');
      }
    }

    const locked = await this.repository.lockMarkSheet({
      tenant_id: tenantId,
      mark_sheet_id: normalizedMarkSheetId,
      actor_user_id: actorUserId,
    });

    if (!locked) {
      throw new NotFoundException(`Exam mark sheet "${normalizedMarkSheetId}" was not found`);
    }

    return locked;
  }

  getDepartmentMarks(query: Record<string, string | undefined>) {
    return this.repository.listMarks({
      tenant_id: this.requireTenantId(),
      department_id: this.optionalText(query.department_id),
      status_in: ['submitted', 'reviewed'],
      limit: this.parsePageLimit(query.limit, 25, 50),
      offset: this.parsePageOffset(query.offset),
    });
  }

  async moderateMarks(dto: ModerateExamMarksDto) {
    const tenantId = this.requireTenantId();
    const actorUserId = this.requireUserId();
    
    const updatedMarks = await this.repository.moderateMarks({
      tenant_id: tenantId,
      mark_ids: dto.mark_ids,
      action: dto.action,
      actor_user_id: actorUserId,
    });
    
    if (dto.action === 'return_for_correction') {
      const reason = this.requireText(dto.reason, 'Reason');
      for (const mark of updatedMarks) {
        await this.createMarkVersionIfSupported({
          tenant_id: tenantId,
          mark_id: mark.id,
          original_score: mark.score,
          correction_score: mark.score,
          corrected_by_user_id: actorUserId,
          reason,
          approval_state: 'rejected',
        });
      }
    }
    
    return { success: true, updated_count: updatedMarks.length };
  }

  getSchoolMarks(query: Record<string, string | undefined>) {
    return this.repository.listMarks({
      tenant_id: this.requireTenantId(),
      status_in: ['reviewed'],
      limit: this.parsePageLimit(query.limit, 25, 50),
      offset: this.parsePageOffset(query.offset),
    });
  }

  async lockMarks(dto: LockExamMarksDto) {
    const tenantId = this.requireTenantId();
    const actorUserId = this.requireUserId();
    const updatedMarks = await this.repository.lockMarks({
      tenant_id: tenantId,
      mark_ids: dto.mark_ids,
      actor_user_id: actorUserId,
    });
    return { success: true, locked_count: updatedMarks.length };
  }

  async getExamReadiness(examSeriesId: string) {
    const tenantId = this.requireTenantId();
    const unapprovedMarks = await this.repository.executeSql(
      `SELECT count(*) FROM exam_marks WHERE tenant_id = $1 AND exam_series_id = $2::uuid AND status NOT IN ('reviewed', 'locked')`,
      [tenantId, examSeriesId]
    );
    const unapprovedCount = parseInt(unapprovedMarks.rows[0].count, 10);

    // Simplistic missing check for readiness
    const issues = [];
    if (unapprovedCount > 0) issues.push(`${unapprovedCount} marks are unapproved or draft`);

    return {
      ready: issues.length === 0,
      issues,
      unapprovedCount,
      missingCount: 0 // Mocked for now to avoid complex queries across dynamic schemas
    };
  }

  async publishExamSeries(examSeriesId: string) {
    const tenantId = this.requireTenantId();
    const actorUserId = this.requireUserId();

    const readiness = await this.getExamReadiness(examSeriesId);
    if (!readiness.ready) {
      throw new BadRequestException(`Cannot publish exam series. Issues: ${readiness.issues.join(', ')}`);
    }

    const updatedMarks = await this.repository.publishExamSeries({
      tenant_id: tenantId,
      exam_series_id: this.requireText(examSeriesId, 'Exam series'),
      actor_user_id: actorUserId,
    });

    await this.schoolEvents?.recordSchoolOperation({
      event: {
        id: examSeriesId,
        type: 'exam.series_published',
        module: 'exams',
        actorRole: this.requestContext.getStore()?.role || 'exam_officer',
        title: 'Exam Results Released',
        body: `Results for exam series ${examSeriesId} have been published.`,
        entityId: examSeriesId,
        severity: 'success',
        payload: { exam_series_id: examSeriesId, published_marks_count: updatedMarks.length },
      },
      notifications: [
        {
          id: `exam-publish-${examSeriesId}`,
          schoolId: tenantId,
          audienceRoles: ['principal', 'deputy-principal'],
          title: 'Exam Results Released',
          body: `Exam results for series ${examSeriesId} have been successfully published.`,
          sourceModule: 'exams',
          relatedModule: 'academics',
          relatedRecordId: examSeriesId,
          priority: 'high',
          read: false,
          createdAt: new Date().toISOString(),
        }
      ]
    });

    return { success: true, published_marks_count: updatedMarks.length };
  }

  async createParentReportCardDownload(reportCardId: string) {
    const tenantId = this.requireTenantId();
    const actorUserId = this.requireUserId();
    const normalizedReportCardId = this.requireText(reportCardId, 'Report card');
    const reportCard = await this.repository.findReportCardForGuardian({
      tenant_id: tenantId,
      report_card_id: normalizedReportCardId,
      guardian_user_id: actorUserId,
    });

    if (!reportCard) {
      throw new NotFoundException('Report card was not found for this parent account');
    }

    this.assertParentReportCardDownloadable(reportCard);

    const secret = this.requireReportCardDownloadSigningSecret();
    const expiresAt = new Date(Date.now() + this.reportCardDownloadTtlSeconds() * 1000).toISOString();
    const token = signParentReportCardDownloadToken(
      {
        purpose: PARENT_REPORT_CARD_DOWNLOAD_PURPOSE,
        tenant_id: tenantId,
        actor_user_id: actorUserId,
        report_card_id: String(reportCard.id),
        student_id: String(reportCard.student_id),
        report_snapshot_id: String(reportCard.report_snapshot_id),
        expires_at: expiresAt,
      },
      secret,
    );

    return {
      report_card_id: String(reportCard.id),
      student_id: String(reportCard.student_id),
      report_snapshot_id: String(reportCard.report_snapshot_id),
      expires_at: expiresAt,
      token,
      download_url: `/exams/report-cards/download/${token}`,
      verification_code: this.buildReportCardVerificationCode(reportCard, secret),
    };
  }

  async readParentReportCardDownloadToken(token: string) {
    const tenantId = this.requireTenantId();
    const actorUserId = this.requireUserId();
    const payload = verifyParentReportCardDownloadToken(
      this.requireText(token, 'Download token'),
      this.requireReportCardDownloadSigningSecret(),
    );

    if (payload.tenant_id !== tenantId || payload.actor_user_id !== actorUserId) {
      throw new ForbiddenException('Report-card download token does not belong to this parent account');
    }

    const reportCard = await this.repository.findReportCardForGuardian({
      tenant_id: tenantId,
      report_card_id: payload.report_card_id,
      guardian_user_id: actorUserId,
    });

    if (!reportCard) {
      throw new NotFoundException('Report card was not found for this parent account');
    }

    this.assertParentReportCardDownloadable(reportCard);

    if (
      String(reportCard.student_id) !== payload.student_id
      || String(reportCard.report_snapshot_id) !== payload.report_snapshot_id
    ) {
      throw new ForbiddenException('Report-card download token no longer matches the published snapshot');
    }

    return {
      report_card_id: String(reportCard.id),
      student_id: String(reportCard.student_id),
      report_snapshot_id: String(reportCard.report_snapshot_id),
      metadata: reportCard.metadata ?? {},
      expires_at: payload.expires_at,
    };
  }

  listMarkSheets(query: Record<string, string | undefined> = {}) {
    const input: {
      tenant_id: string;
      teacher_user_id?: string;
      exam_series_id?: string;
      class_section_id?: string;
      subject_id?: string;
      limit?: number;
      offset?: number;
    } = {
      tenant_id: this.requireTenantId(),
    };
    const teacherUserId = this.optionalText(query.teacher_user_id);
    const examSeriesId = this.optionalText(query.exam_series_id);
    const classSectionId = this.optionalText(query.class_section_id);
    const subjectId = this.optionalText(query.subject_id);

    if (teacherUserId) input.teacher_user_id = teacherUserId;
    if (examSeriesId) input.exam_series_id = examSeriesId;
    if (classSectionId) input.class_section_id = classSectionId;
    if (subjectId) input.subject_id = subjectId;
    input.limit = this.parsePageLimit(query.limit, 25, 50);
    input.offset = this.parsePageOffset(query.offset);

    return this.repository.listMarkSheets(input);
  }

  private async validateMarkEntry(
    dto: EnterExamMarkDto,
    tenantId: string,
    actorUserId: string,
  ): Promise<ValidatedMarkEntry> {
    if (!this.isExamsOfficer()) {
      const assignment = await this.repository.findTeacherAssignment({
        tenant_id: tenantId,
        teacher_user_id: actorUserId,
        academic_term_id: dto.academic_term_id,
        class_section_id: dto.class_section_id,
        subject_id: dto.subject_id,
      });

      if (!assignment) {
        throw new ForbiddenException('Teacher is not assigned to this subject and class section');
      }
    }

    const series = await this.repository.findSeriesState({
      tenant_id: tenantId,
      exam_series_id: dto.exam_series_id,
    });

    if (series && (series.locked_at || series.published_at || ['locked', 'published'].includes(series.status))) {
      throw new ForbiddenException('Exam series is locked; use an audited correction workflow');
    }

    const score = this.requireNonNegativeNumber(dto.score, 'Score');
    const assessmentScope = await this.findAssessmentScopeForMark(dto);

    if (assessmentScope) {
      this.assertAssessmentScopeMatchesMark(assessmentScope, dto);
      const maxScore = Number(assessmentScope.max_score ?? Number.POSITIVE_INFINITY);

      if (Number.isFinite(maxScore) && score > maxScore) {
        throw new BadRequestException(`Score exceeds assessment maximum score of ${maxScore}`);
      }
    }

    const gradeBoundary = await this.assertGradeBoundaryForMark(tenantId, dto, score);

    return {
      dto,
      score,
      grade_boundary: gradeBoundary,
    };
  }

  private async persistValidatedMark(
    validated: ValidatedMarkEntry,
    tenantId: string,
    actorUserId: string,
    action: 'grade.updated' | 'bulk_grade.updated',
    extraMetadata: Record<string, unknown> = {},
  ) {
    const mark = await this.repository.upsertMark({
      tenant_id: tenantId,
      actor_user_id: actorUserId,
      exam_series_id: validated.dto.exam_series_id,
      assessment_id: validated.dto.assessment_id,
      academic_term_id: validated.dto.academic_term_id,
      class_section_id: validated.dto.class_section_id,
      subject_id: validated.dto.subject_id,
      student_id: validated.dto.student_id,
      score: validated.score,
      remarks: validated.dto.remarks?.trim() || null,
    });

    await this.repository.appendMarkAuditLog({
      tenant_id: tenantId,
      mark_id: mark.id,
      exam_series_id: validated.dto.exam_series_id,
      assessment_id: validated.dto.assessment_id,
      student_id: validated.dto.student_id,
      action,
      actor_user_id: actorUserId,
      new_score: validated.score,
      metadata: {
        class_section_id: validated.dto.class_section_id,
        subject_id: validated.dto.subject_id,
        grade_boundary_label: textValue(validated.grade_boundary?.label),
        ...extraMetadata,
      },
    });

    try {
      const examSeriesRes = await this.repository.executeSql(
        `SELECT name FROM exam_series WHERE tenant_id = $1 AND id = $2::uuid LIMIT 1`,
        [tenantId, validated.dto.exam_series_id]
      );
      const examName = examSeriesRes.rows[0]?.name || ('Exam Series ' + validated.dto.exam_series_id);

      const classRes = await this.repository.executeSql(
        `SELECT name FROM class_sections WHERE school_id = $1 AND id = $2::uuid LIMIT 1`,
        [tenantId, validated.dto.class_section_id]
      ).catch(() => ({ rows: [] }));
      const className = classRes.rows[0]?.name || ('Class ' + validated.dto.class_section_id);

      await this.eventPublisher?.publishExamSubmitted({
        tenant_id: tenantId,
        exam_id: validated.dto.exam_series_id,
        exam_name: examName,
        class_name: className,
        stream_name: className,
        submitted_by_user_id: actorUserId,
        submitted_at: new Date().toISOString(),
        completion_status: 'SUBMITTED',
        missing_marks_count: 0,
      });
    } catch (e) {
      console.error('Failed to publish exam submission event:', e);
    }

    return mark;
  }

  private requireBulkRows(rows: BulkExamMarkUploadRowDto[]): BulkExamMarkUploadRowDto[] {
    if (!Array.isArray(rows) || rows.length === 0) {
      throw new BadRequestException('Bulk mark upload rows are required');
    }

    if (rows.length > BULK_MARK_UPLOAD_MAX_ROWS) {
      throw new BadRequestException(`Bulk mark uploads are limited to ${BULK_MARK_UPLOAD_MAX_ROWS} rows`);
    }

    return rows;
  }

  private normalizeBulkMarkRow(row: BulkExamMarkUploadRowDto): EnterExamMarkDto {
    return {
      exam_series_id: this.requireText(row.exam_series_id, 'Exam series'),
      assessment_id: this.requireText(row.assessment_id, 'Assessment'),
      academic_term_id: this.requireText(row.academic_term_id, 'Academic term'),
      class_section_id: this.requireText(row.class_section_id, 'Class section'),
      subject_id: this.requireText(row.subject_id, 'Subject'),
      student_id: this.requireText(row.student_id, 'Student'),
      score: this.requireNonNegativeNumber(row.score, 'Score'),
      remarks: row.remarks?.trim() || undefined,
    };
  }

  private bulkMarkDuplicateKey(dto: EnterExamMarkDto): string {
    return [
      dto.exam_series_id,
      dto.assessment_id,
      dto.academic_term_id,
      dto.class_section_id,
      dto.subject_id,
      dto.student_id,
    ].join(':');
  }

  private buildBulkMarkUploadPreviewToken(
    tenantId: string,
    actorUserId: string,
    entries: Array<{ row_number: number; entry: ValidatedMarkEntry }>,
  ): string {
    return createHash('sha256')
      .update(JSON.stringify({
        tenant_id: tenantId,
        actor_user_id: actorUserId,
        rows: entries.map(({ row_number, entry }) => ({
          row_number,
          exam_series_id: entry.dto.exam_series_id,
          assessment_id: entry.dto.assessment_id,
          academic_term_id: entry.dto.academic_term_id,
          class_section_id: entry.dto.class_section_id,
          subject_id: entry.dto.subject_id,
          student_id: entry.dto.student_id,
          score: entry.score,
          remarks: entry.dto.remarks?.trim() || null,
        })),
      }))
      .digest('hex');
  }

  private isExamsOfficer(): boolean {
    const context = this.requestContext.getStore();

    if (!context) {
      return false;
    }

    return (
      (context.role ? OFFICER_ROLES.has(context.role) : false)
      || context.permissions.some((permission) => OFFICER_PERMISSIONS.has(permission))
    );
  }

  private requireTenantId(): string {
    const tenantId = this.requestContext.getStore()?.tenant_id;

    if (!tenantId) {
      throw new UnauthorizedException('Tenant context is required for exams operations');
    }

    return tenantId;
  }

  private currentUserId(): string | null {
    return this.requestContext.getStore()?.user_id ?? null;
  }

  private requireUserId(): string {
    const userId = this.currentUserId();

    if (!userId) {
      throw new UnauthorizedException('Authenticated user context is required for exams operations');
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

  private optionalText(value: string | undefined): string | undefined {
    const normalized = value?.trim() ?? '';
    return normalized || undefined;
  }

  private parsePageLimit(
    value: string | number | undefined,
    defaultLimit: number,
    maxLimit: number,
  ): number {
    const numeric = Number(value);

    if (!Number.isFinite(numeric) || numeric <= 0) {
      return defaultLimit;
    }

    return Math.min(Math.floor(numeric), maxLimit);
  }

  private parsePageOffset(value: string | number | undefined): number {
    const numeric = Number(value);

    if (!Number.isFinite(numeric) || numeric < 0) {
      return 0;
    }

    return Math.floor(numeric);
  }

  private requirePositiveNumber(value: number, fieldName: string): number {
    if (!Number.isFinite(value) || value <= 0) {
      throw new BadRequestException(`${fieldName} must be positive`);
    }

    return value;
  }

  private requireNonNegativeNumber(value: number, fieldName: string): number {
    if (!Number.isFinite(value) || value < 0) {
      throw new BadRequestException(`${fieldName} must be non-negative`);
    }

    return value;
  }

  private async findAssessmentScopeForMark(
    dto: EnterExamMarkDto,
  ): Promise<Record<string, unknown> | null> {
    const repository = this.repository as ExamsRepository & {
      findAssessmentScope?: (input: {
        tenant_id: string;
        assessment_id: string;
      }) => Promise<Record<string, unknown> | null>;
    };

    if (typeof repository.findAssessmentScope !== 'function') {
      return null;
    }

    return repository.findAssessmentScope({
      tenant_id: this.requireTenantId(),
      assessment_id: dto.assessment_id,
    });
  }

  private async assertGradeBoundaryForMark(
    tenantId: string,
    dto: EnterExamMarkDto,
    score: number,
  ): Promise<Record<string, unknown> | null> {
    const repository = this.repository as ExamsRepository & {
      findGradeBoundaryForScore?: (input: {
        tenant_id: string;
        exam_series_id: string;
        score: number;
      }) => Promise<{
        configured_count?: number | string;
        match_count?: number | string;
        boundary?: Record<string, unknown> | null;
      } | null>;
    };

    if (typeof repository.findGradeBoundaryForScore !== 'function') {
      return null;
    }

    const result = await repository.findGradeBoundaryForScore({
      tenant_id: tenantId,
      exam_series_id: dto.exam_series_id,
      score,
    });
    const configuredCount = Number(result?.configured_count ?? 0);
    const matchCount = Number(result?.match_count ?? 0);

    if (!Number.isFinite(configuredCount) || configuredCount <= 0) {
      return null;
    }

    if (!Number.isFinite(matchCount) || matchCount <= 0) {
      throw new BadRequestException('Score is outside configured grade boundaries for this exam series');
    }

    if (matchCount > 1) {
      throw new BadRequestException('Score matches multiple grade boundaries for this exam series');
    }

    return result?.boundary ?? null;
  }

  private assertAssessmentScopeMatchesMark(
    assessmentScope: Record<string, unknown>,
    dto: EnterExamMarkDto,
  ): void {
    const expectedFields: Array<[string, string]> = [
      ['exam_series_id', dto.exam_series_id],
      ['academic_term_id', dto.academic_term_id],
      ['class_section_id', dto.class_section_id],
      ['subject_id', dto.subject_id],
    ];

    for (const [field, expected] of expectedFields) {
      const actual = assessmentScope[field];

      if (typeof actual === 'string' && actual.trim() && actual !== expected) {
        throw new BadRequestException(`Assessment ${field} does not match the mark scope`);
      }
    }
  }

  private async findPublishedReportCardsForMark(
    tenantId: string,
    markId: string,
  ): Promise<Array<{ id: string; status?: string }>> {
    const repository = this.repository as ExamsRepository & {
      findPublishedReportCardsForMark?: (input: {
        tenant_id: string;
        mark_id: string;
      }) => Promise<Array<{ id: string; status?: string }>>;
    };

    if (typeof repository.findPublishedReportCardsForMark !== 'function') {
      return [];
    }

    return repository.findPublishedReportCardsForMark({
      tenant_id: tenantId,
      mark_id: markId,
    });
  }

  private async createMarkVersionIfSupported(input: Record<string, unknown>): Promise<void> {
    const repository = this.repository as ExamsRepository & {
      createMarkVersion?: (input: Record<string, unknown>) => Promise<unknown>;
    };

    if (typeof repository.createMarkVersion === 'function') {
      await repository.createMarkVersion(input);
    }
  }

  private async markReportCardsRegenerationRequiredIfSupported(
    input: Record<string, unknown>,
  ): Promise<void> {
    const repository = this.repository as ExamsRepository & {
      markReportCardsRegenerationRequired?: (input: Record<string, unknown>) => Promise<unknown>;
    };

    if (typeof repository.markReportCardsRegenerationRequired === 'function') {
      await repository.markReportCardsRegenerationRequired(input);
    }
  }

  private buildReportCardPayload(data: Record<string, unknown>): Record<string, unknown> {
    const subjects = this.normalizeReportCardSubjects(data.subjects);
    const totalScore = subjects.reduce((sum, subject) => sum + subject.score, 0);
    const totalMaxScore = subjects.reduce((sum, subject) => sum + subject.max_score, 0);
    const meanScore = subjects.length > 0 ? Number((totalScore / subjects.length).toFixed(2)) : 0;
    const percentage = totalMaxScore > 0
      ? Number(((totalScore / totalMaxScore) * 100).toFixed(2))
      : 0;

    return {
      exam_series: data.exam_series ?? {},
      student: data.student ?? {},
      attendance: data.attendance ?? null,
      subjects,
      totals: {
        total_score: totalScore,
        total_max_score: totalMaxScore,
        mean_score: meanScore,
        percentage,
      },
      generated_at: new Date().toISOString(),
    };
  }

  private normalizeReportCardSubjects(value: unknown): Array<{
    subject_id: string;
    subject_name: string;
    score: number;
    max_score: number;
    grade_label: string | null;
    remarks: string | null;
  }> {
    if (!Array.isArray(value)) {
      return [];
    }

    return value.map((subject) => {
      const row = subject as Record<string, unknown>;
      const score = Number(row.score ?? 0);
      const maxScore = Number(row.max_score ?? 100);

      return {
        subject_id: String(row.subject_id ?? ''),
        subject_name: String(row.subject_name ?? 'Subject'),
        score: Number.isFinite(score) ? score : 0,
        max_score: Number.isFinite(maxScore) && maxScore > 0 ? maxScore : 100,
        grade_label:
          typeof row.grade_label === 'string' && row.grade_label.trim()
            ? row.grade_label.trim()
            : null,
        remarks:
          typeof row.remarks === 'string' && row.remarks.trim()
            ? row.remarks.trim()
            : null,
      };
    });
  }

  private buildReportSnapshotId(tenantId: string, examSeriesId: string, studentId: string): string {
    return `report-card:${tenantId}:${examSeriesId}:${studentId}:v1`;
  }

  private assertParentReportCardDownloadable(reportCard: Record<string, unknown>): void {
    if (reportCard.status !== 'published') {
      throw new ForbiddenException('Report card is not available for parent download');
    }

    const metadata = isRecord(reportCard.metadata) ? reportCard.metadata : {};

    if (metadata.withdrawn_at || metadata.withdrawn_by || metadata.withdrawal_reason) {
      throw new ForbiddenException('Report card is not available for parent download');
    }

    if (!String(reportCard.report_snapshot_id ?? '').trim()) {
      throw new BadRequestException('Published report card is missing its immutable snapshot reference');
    }
  }

  private requireReportCardDownloadSigningSecret(): string {
    const secret = this.configService?.get<string>('reportCards.downloadSigningSecret')?.trim() ?? '';

    if (!secret) {
      throw new BadRequestException('Report-card download signing secret is required');
    }

    return secret;
  }

  private reportCardDownloadTtlSeconds(): number {
    const configuredTtl = Number(this.configService?.get<number>('reportCards.downloadTtlSeconds') ?? 900);

    if (!Number.isFinite(configuredTtl) || configuredTtl <= 0 || configuredTtl > 3600) {
      return 900;
    }

    return Math.floor(configuredTtl);
  }

  private buildReportCardVerificationCode(reportCard: Record<string, unknown>, secret: string): string {
    return createHmac('sha256', secret)
      .update([
        reportCard.id,
        reportCard.student_id,
        reportCard.report_snapshot_id,
      ].map((value) => String(value ?? '')).join(':'))
      .digest('hex')
      .slice(0, 12)
      .toUpperCase();
  }

  private requireReportCardGenerationService(): ReportCardGenerationService {
    if (!this.reportCardGenerationService) {
      throw new BadRequestException('Report-card generation service is not configured');
    }

    return this.reportCardGenerationService;
  }

  async createTimetableSlot(dto: CreateTimetableSlotDto) {
    const tenantId = this.requireTenantId();
    const result = await this.repository.createTimetableSlot({
      tenant_id: tenantId,
      exam_series_id: this.requireText(dto.exam_series_id, 'Exam series'),
      assessment_id: dto.assessment_id,
      date: this.requireText(dto.date, 'Date'),
      start_time: this.requireText(dto.start_time, 'Start time'),
      end_time: this.requireText(dto.end_time, 'End time'),
      room_name: dto.room_name,
    });
    return { success: true, message: 'Timetable slot created', data: result };
  }

  async assignInvigilator(dto: AssignInvigilatorDto) {
    const tenantId = this.requireTenantId();
    const result = await this.repository.assignInvigilator({
      tenant_id: tenantId,
      timetable_slot_id: this.requireText(dto.timetable_slot_id, 'Timetable slot'),
      staff_user_id: this.requireText(dto.staff_user_id, 'Staff user'),
      role: dto.role,
    });
    return { success: true, message: 'Invigilator assigned', data: result };
  }

  async markAttendance(dto: MarkExamAttendanceDto) {
    const tenantId = this.requireTenantId();
    const actorUserId = this.requireUserId();
    const result = await this.repository.markAttendance({
      tenant_id: tenantId,
      timetable_slot_id: this.requireText(dto.timetable_slot_id, 'Timetable slot'),
      student_id: this.requireText(dto.student_id, 'Student'),
      status: this.requireText(dto.status, 'Status'),
      remarks: dto.remarks,
      actor_user_id: actorUserId,
    });
    return { success: true, message: 'Attendance marked', data: result };
  }

  async reportStudentCase(dto: ReportStudentExamCaseDto) {
    const tenantId = this.requireTenantId();
    const actorUserId = this.requireUserId();
    const result = await this.repository.reportStudentCase({
      tenant_id: tenantId,
      exam_series_id: this.requireText(dto.exam_series_id, 'Exam series'),
      student_id: this.requireText(dto.student_id, 'Student'),
      case_type: this.requireText(dto.case_type, 'Case type'),
      description: this.requireText(dto.description, 'Description'),
      actor_user_id: actorUserId,
    });
    return { success: true, message: 'Student case reported', data: result };
  }
  async getTimetableSlots(filters: Record<string, string | undefined>) {
    const tenantId = this.requireTenantId();
    const data = await this.repository.getTimetableSlots(tenantId, filters);
    return { success: true, data };
  }

  async getInvigilators(filters: Record<string, string | undefined>) {
    const tenantId = this.requireTenantId();
    const data = await this.repository.getInvigilators(tenantId, filters);
    return { success: true, data };
  }

  async getAttendance(filters: Record<string, string | undefined>) {
    const tenantId = this.requireTenantId();
    const data = await this.repository.getAttendance(tenantId, filters);
    return { success: true, data };
  }

  async getStudentCases(filters: Record<string, string | undefined>) {
    const tenantId = this.requireTenantId();
    const data = await this.repository.getStudentCases(tenantId, filters);
    return { success: true, data };
  }

  async getExamSeries(filters: Record<string, string | undefined>) {
    const tenantId = this.requireTenantId();
    const data = await this.repository.getExamSeries(tenantId, filters);
    return { success: true, data };
  }

  async getExamAssessments(filters: Record<string, string | undefined>) {
    const tenantId = this.requireTenantId();
    const data = await this.repository.getExamAssessments(tenantId, filters);
    return { success: true, data };
  }

  async getGradingPolicies(filters: Record<string, string | undefined>) {
    const tenantId = this.requireTenantId();
    const data = await this.repository.getGradingPolicies(tenantId, filters);
    return { success: true, data };
  }

  async getAuditLogs(filters: Record<string, string | undefined>) {
    const tenantId = this.requireTenantId();
    const data = await this.repository.getAuditLogs(tenantId, filters);
    return { success: true, data };
  }

  async getSubjectWeightings(filters: Record<string, string | undefined>) {
    const tenantId = this.requireTenantId();
    const data = await this.repository.getSubjectWeightings(tenantId, filters);
    return { success: true, data };
  }

  async getAssessmentComponents(filters: Record<string, string | undefined>) {
    const tenantId = this.requireTenantId();
    const data = await this.repository.getAssessmentComponents(tenantId, filters);
    return { success: true, data };
  }

  async getMarkEntryWindows(filters: Record<string, string | undefined>) {
    const tenantId = this.requireTenantId();
    const data = await this.repository.getMarkEntryWindows(tenantId, filters);
    return { success: true, data };
  }

  async getMarks(filters: Record<string, string | undefined>) {
    const tenantId = this.requireTenantId();
    const data = await this.repository.getMarks(tenantId, filters);
    return { success: true, data };
  }

  async getMarkVersions(filters: Record<string, string | undefined>) {
    const tenantId = this.requireTenantId();
    const data = await this.repository.getMarkVersions(tenantId, filters);
    return { success: true, data };
  }

  async getReportCardBatches(filters: Record<string, string | undefined>) {
    const tenantId = this.requireTenantId();
    const data = await this.repository.getReportCardBatches(tenantId, filters);
    return { success: true, data };
  }

  async getReportCards(filters: Record<string, string | undefined>) {
    const tenantId = this.requireTenantId();
    const data = await this.repository.getReportCards(tenantId, filters);
    return { success: true, data };
  }

  async getExamDashboardStats() {
    const tenantId = this.requireTenantId();
    const data = await this.repository.getExamDashboardStats(tenantId);
    return { success: true, data };
  }

  async getConfiguration() {
    const tenantId = this.requireTenantId();
    const res = await this.repository.executeSql(
      `SELECT * FROM exam_series WHERE tenant_id = $1 ORDER BY created_at DESC`,
      [tenantId]
    );
    return { items: res.rows };
  }

  async getDrafts() {
    const tenantId = this.requireTenantId();
    const res = await this.repository.executeSql(
      `SELECT * FROM exam_series WHERE tenant_id = $1 AND status = 'draft' ORDER BY created_at DESC`,
      [tenantId]
    );
    return { items: res.rows };
  }

  async getAlignment() {
    const tenantId = this.requireTenantId();
    const res = await this.repository.executeSql(
      `SELECT * FROM exam_series WHERE tenant_id = $1 ORDER BY created_at DESC`,
      [tenantId]
    );
    return { items: res.rows };
  }

  async getReview() {
    const tenantId = this.requireTenantId();
    const res = await this.repository.executeSql(
      `SELECT * FROM exam_series WHERE tenant_id = $1 ORDER BY created_at DESC`,
      [tenantId]
    );
    return { items: res.rows };
  }

  async getLifecycle() {
    const tenantId = this.requireTenantId();
    const res = await this.repository.executeSql(
      `SELECT * FROM exam_series WHERE tenant_id = $1 ORDER BY created_at DESC`,
      [tenantId]
    );
    return { items: res.rows };
  }

  async saveDraft(dto: any) {
    const tenantId = this.requireTenantId();
    const userId = this.requireUserId();
    const name = dto.name || dto.examName || 'Draft Exam';
    const termId = dto.termId || dto.academic_term_id || '00000000-0000-0000-0000-000000000000';
    let res;
    if (dto.id) {
      res = await this.repository.executeSql(
        `UPDATE exam_series SET name = $2, academic_term_id = $3::uuid, status = 'draft', updated_at = NOW() WHERE tenant_id = $1 AND id = $4::uuid RETURNING *`,
        [tenantId, name, termId, dto.id]
      );
    } else {
      res = await this.repository.executeSql(
        `INSERT INTO exam_series (tenant_id, academic_term_id, name, status, starts_on, ends_on, created_by_user_id)
         VALUES ($1, $2::uuid, $3, 'draft', NOW(), NOW(), $4::uuid) RETURNING *`,
        [tenantId, termId, name, userId]
      );
    }
    return { success: true, message: 'Draft saved', data: res.rows[0] };
  }

  async alignExam(dto: any) {
    const tenantId = this.requireTenantId();
    const id = dto.id || dto.exam_series_id;
    if (!id) {
      throw new BadRequestException('Exam series ID is required');
    }
    const res = await this.repository.executeSql(
      `UPDATE exam_series SET status = 'aligned', name = COALESCE($3, name), updated_at = NOW() WHERE tenant_id = $1 AND id = $2::uuid RETURNING *`,
      [tenantId, id, dto.name || null]
    );
    return { success: true, message: 'Alignment updated', data: res.rows[0] };
  }

  async reviewExam(dto: any) {
    const tenantId = this.requireTenantId();
    const id = dto.id || dto.exam_series_id;
    if (!id) {
      throw new BadRequestException('Exam series ID is required');
    }
    const res = await this.repository.executeSql(
      `UPDATE exam_series SET status = 'reviewed', updated_at = NOW() WHERE tenant_id = $1 AND id = $2::uuid RETURNING *`,
      [tenantId, id]
    );
    return { success: true, message: 'Review completed', data: res.rows[0] };
  }

  async updateLifecycle(dto: any) {
    const tenantId = this.requireTenantId();
    const id = dto.id || dto.exam_series_id;
    if (!id) {
      throw new BadRequestException('Exam series ID is required');
    }
    const status = dto.status || 'active';
    const res = await this.repository.executeSql(
      `UPDATE exam_series SET status = $3, updated_at = NOW() WHERE tenant_id = $1 AND id = $2::uuid RETURNING *`,
      [tenantId, id, status]
    );
    return { success: true, message: 'Lifecycle updated', data: res.rows[0] };
  }

}

function signParentReportCardDownloadToken(
  payload: ParentReportCardDownloadTokenPayload,
  secret: string,
): string {
  const encodedPayload = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const signature = createHmac('sha256', secret).update(encodedPayload).digest('base64url');
  return `${encodedPayload}.${signature}`;
}

function verifyParentReportCardDownloadToken(
  token: string,
  secret: string,
): ParentReportCardDownloadTokenPayload {
  const [encodedPayload, signature, extra] = token.split('.');

  if (!encodedPayload || !signature || extra !== undefined) {
    throw new BadRequestException('Invalid report-card download token');
  }

  const expectedSignature = createHmac('sha256', secret).update(encodedPayload).digest('base64url');

  if (!safeEqual(signature, expectedSignature)) {
    throw new BadRequestException('Invalid report-card download token');
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8'));
  } catch {
    throw new BadRequestException('Invalid report-card download token');
  }

  if (!isParentReportCardDownloadTokenPayload(parsed)) {
    throw new BadRequestException('Invalid report-card download token');
  }

  if (Date.parse(parsed.expires_at) <= Date.now()) {
    throw new BadRequestException('Report-card download token has expired');
  }

  return parsed;
}

function isParentReportCardDownloadTokenPayload(
  value: unknown,
): value is ParentReportCardDownloadTokenPayload {
  if (!isRecord(value) || value.purpose !== PARENT_REPORT_CARD_DOWNLOAD_PURPOSE) {
    return false;
  }

  const fields = [
    value.tenant_id,
    value.actor_user_id,
    value.report_card_id,
    value.student_id,
    value.report_snapshot_id,
    value.expires_at,
  ];

  return fields.every((entry) => typeof entry === 'string' && entry.trim().length > 0)
    && typeof value.expires_at === 'string'
    && !Number.isNaN(Date.parse(value.expires_at));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function textValue(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'Invalid mark upload row';
}

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}
