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
import ExcelJS from 'exceljs';

import { RequestContextService } from '../../common/request-context/request-context.service';
import { validateUploadedFile, type UploadFileMetadata } from '../../common/uploads/upload-policy';
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
  UpdateExamSettingsDto,
} from './dto/exams.dto';
import { ExamsRepository } from './repositories/exams.repository';
import { ReportCardGenerationService } from './services/report-card-generation.service';
import { SchoolOperationalEventsService } from '../events/school-operational-events.service';
import { EventPublisherService } from '../events/event-publisher.service';
import { WorkflowRepository } from '../events/repositories/workflow.repository';

const OFFICER_PERMISSIONS = new Set(['exams:review', 'exams:approve', '*:*']);
const OFFICER_ROLES = new Set(['owner', 'admin', 'platform_owner', 'superadmin', 'exams_officer']);
const PARENT_REPORT_CARD_DOWNLOAD_PURPOSE = 'exams.report_card.parent_download';
const BULK_MARK_UPLOAD_MAX_ROWS = 500;
const BULK_ATTENDANCE_IMPORT_MAX_ROWS = 500;
const EXAM_STUDENT_CASE_TYPES = new Set([
  'exemption',
  'irregularity',
  'disciplinary',
  'special_support',
  'medical',
]);
const EXAM_INVIGILATOR_ROLES = new Set(['invigilator', 'assistant', 'relief']);
const EXAM_INVIGILATOR_STATUSES = new Set(['assigned', 'present', 'absent']);
const EXAM_ATTENDANCE_STATUSES = new Set(['present', 'absent', 'late', 'excused']);
const EXAM_TIMETABLE_SLOT_STATUSES = new Set(['scheduled', 'moved', 'conflict', 'room_assigned', 'cancelled']);
const EXAM_GRADING_REPORTING_MODES = new Set(['traditional', 'cbc_competency', 'hybrid']);
const EXAM_GRADING_POLICY_STATUSES = new Set(['draft', 'active', 'retired']);
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
const DEFAULT_EXAM_SETTINGS = {
  lock_after_deadline: true,
  grace_period_hours: 24,
  include_school_logo: true,
  include_principal_signature: true,
  include_official_stamp: true,
  block_results_for_fee_balances: true,
  fee_balance_block_threshold: 1000,
  show_student_rank_to_parents: true,
};

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
    @Optional() private readonly workflowRepository?: WorkflowRepository,
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

  async updateAssessment(assessmentIdValue: string, dto: { name?: string; max_score?: number; weight?: number }) {
    if (!this.isExamsOfficer()) throw new ForbiddenException('Exam write permission is required to update assessments');
    const tenantId = this.requireTenantId();
    const actorUserId = this.requireUserId();
    const assessmentId = this.requireText(assessmentIdValue, 'Assessment');
    const result = await this.repository.updateAssessment({
      tenant_id: tenantId,
      actor_user_id: actorUserId,
      assessment_id: assessmentId,
      name: dto.name === undefined ? undefined : this.requireText(dto.name, 'Assessment name'),
      max_score: dto.max_score === undefined ? undefined : this.requirePositiveNumber(Number(dto.max_score), 'Maximum score'),
      weight: dto.weight === undefined ? undefined : this.requirePositiveNumber(Number(dto.weight), 'Assessment weight'),
    });
    if (!result) throw new NotFoundException('Assessment was not found for this school');
    await this.schoolEvents?.recordSchoolOperation({ event: {
      id: `assessment-updated-${result.id}-${Date.now()}`,
      type: 'exam.assessment_updated', module: 'exams',
      actorRole: this.requestContext.getStore()?.role || 'exams_officer',
      title: 'Exam Assessment Updated', body: `${result.name} assessment configuration was updated.`,
      entityId: result.id, severity: 'info',
      payload: { assessment_id: result.id, exam_series_id: result.exam_series_id, actor_user_id: actorUserId },
    }});
    return { success: true, message: 'Assessment updated', data: result };
  }

  async deleteAssessment(assessmentIdValue: string) {
    if (!this.isExamsOfficer()) throw new ForbiddenException('Exam write permission is required to delete assessments');
    const tenantId = this.requireTenantId();
    const actorUserId = this.requireUserId();
    const assessmentId = this.requireText(assessmentIdValue, 'Assessment');
    const result = await this.repository.deleteAssessment({ tenant_id: tenantId, actor_user_id: actorUserId, assessment_id: assessmentId });
    if (!result) throw new NotFoundException('Assessment was not found for this school');
    if (!result.deleted_id) {
      throw new ConflictException(`Assessment cannot be deleted because it has ${result.mark_count} mark row(s) and ${result.component_count} component(s)`);
    }
    await this.schoolEvents?.recordSchoolOperation({ event: {
      id: `assessment-deleted-${result.id}`,
      type: 'exam.assessment_deleted', module: 'exams',
      actorRole: this.requestContext.getStore()?.role || 'exams_officer',
      title: 'Exam Assessment Deleted', body: `${result.name} draft assessment was deleted.`,
      entityId: result.id, severity: 'warning',
      payload: { assessment_id: result.id, actor_user_id: actorUserId },
    }});
    return { success: true, message: 'Assessment deleted', data: result };
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

    let importBatch: Record<string, any> | null = null;
    if (mode === 'commit') {
      if (!dto.preview_token || dto.preview_token !== previewToken) {
        throw new BadRequestException('Bulk mark upload must be previewed before commit');
      }

      if (invalidRows > 0) {
        throw new BadRequestException('Bulk mark upload contains invalid rows; preview and fix them before commit');
      }

      const requestedFileName = dto.file_name?.split(/[\\/]/).pop()?.trim();
      const fileName = (requestedFileName || `marks-import-${new Date().toISOString().slice(0, 10)}.csv`).slice(0, 255);
      importBatch = await this.repository.commitBulkMarkImport({
        tenant_id: tenantId,
        actor_user_id: actorUserId,
        file_name: fileName,
        preview_token: previewToken,
        rows: validEntries.map(({ row_number, entry }) => ({
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
      });

      if (!importBatch) {
        throw new ConflictException('The mark import could not be committed atomically');
      }

      for (const row of rowResults) {
        row.status = 'committed';
      }

      await this.schoolEvents?.recordSchoolOperation({ event: {
        id: `mark-import-committed-${importBatch.batch_id}`,
        type: 'exam.mark_import_committed',
        module: 'exams',
        actorRole: this.requestContext.getStore()?.role || 'teacher',
        title: 'Exam Mark Import Committed',
        body: `${importBatch.committed_rows} mark row${importBatch.committed_rows === 1 ? '' : 's'} imported from ${fileName}.`,
        entityId: importBatch.batch_id,
        severity: 'info',
        payload: { batch_id: importBatch.batch_id, file_name: fileName, committed_rows: importBatch.committed_rows },
      }});
    }

    return {
      mode,
      batch_id: importBatch?.batch_id ?? null,
      total_rows: rows.length,
      valid_rows: validEntries.length,
      invalid_rows: invalidRows,
      duplicate_rows: duplicateRows,
      committed_rows: mode === 'commit' ? validEntries.length : 0,
      preview_token: previewToken,
      row_results: rowResults,
    };
  }

  async getMarkImportBatches(query: Record<string, string | undefined>) {
    const tenantId = this.requireTenantId();
    const data = await this.repository.listMarkImportBatches({
      tenant_id: tenantId,
      limit: this.parsePageLimit(query.limit, 25, 100),
      offset: this.parsePageOffset(query.offset),
    });
    return { success: true, data };
  }

  async getMarkImportBatch(batchIdValue: string) {
    const tenantId = this.requireTenantId();
    const batchId = this.requireText(batchIdValue, 'Mark import batch');
    const data = await this.repository.getMarkImportBatch({ tenant_id: tenantId, batch_id: batchId });
    if (!data) {
      throw new NotFoundException('Mark import batch was not found for this school');
    }
    return { success: true, data };
  }

  async rollbackMarkImportBatch(batchIdValue: string, reasonValue?: string) {
    if (!this.isExamsOfficer()) {
      throw new ForbiddenException('Exam approval permission is required to roll back mark imports');
    }

    const tenantId = this.requireTenantId();
    const actorUserId = this.requireUserId();
    const batchId = this.requireText(batchIdValue, 'Mark import batch');
    const reason = this.requireText(reasonValue, 'Rollback reason');
    if (reason.length < 10) {
      throw new BadRequestException('Rollback reason must be at least 10 characters');
    }

    const result = await this.repository.rollbackMarkImportBatch({
      tenant_id: tenantId,
      actor_user_id: actorUserId,
      batch_id: batchId,
      reason,
    });
    if (!result) {
      throw new NotFoundException('Imported mark batch was not found for this school or was already rolled back');
    }
    if (Number(result.conflict_count) > 0) {
      throw new ConflictException(`${result.conflict_count} imported mark row(s) changed after import; review them before rollback`);
    }

    await this.schoolEvents?.recordSchoolOperation({ event: {
      id: `mark-import-rolled-back-${batchId}`,
      type: 'exam.mark_import_rolled_back',
      module: 'exams',
      actorRole: this.requestContext.getStore()?.role || 'exams_officer',
      title: 'Exam Mark Import Rolled Back',
      body: `${Number(result.restored_rows) + Number(result.deleted_rows)} mark row(s) were rolled back.`,
      entityId: batchId,
      severity: 'warning',
      payload: {
        batch_id: batchId,
        restored_rows: result.restored_rows,
        deleted_rows: result.deleted_rows,
        reason,
      },
    }});

    return { success: true, message: 'Mark import rolled back', data: result };
  }

  async submitMarks(markIdsValue?: string[]) {
    const tenantId = this.requireTenantId();
    const actorUserId = this.requireUserId();
    const markIds = [...new Set((markIdsValue ?? []).filter((id) => typeof id === 'string' && id.trim()).map((id) => id.trim()))];

    if (markIds.length === 0 || markIds.length > 500) {
      throw new BadRequestException('Provide between 1 and 500 mark IDs');
    }

    const result = await this.repository.submitMarks({
      tenant_id: tenantId,
      actor_user_id: actorUserId,
      mark_ids: markIds,
    });

    await this.schoolEvents?.recordSchoolOperation({ event: {
      id: `marks-submitted-${createHash('sha256').update(`${tenantId}:${actorUserId}:${markIds.join(',')}`).digest('hex').slice(0, 24)}`,
      type: 'exam.marks_submitted',
      module: 'exams',
      actorRole: this.requestContext.getStore()?.role || 'teacher',
      title: 'Marks Submitted',
      body: `${result.submitted_count} mark row${result.submitted_count === 1 ? '' : 's'} submitted for review.`,
      severity: result.submitted_count === markIds.length ? 'info' : 'warning',
      payload: { requested_count: markIds.length, submitted_count: result.submitted_count, mark_ids: result.mark_ids },
    }});

    return { success: true, message: 'Marks submitted for review', data: result };
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

    const statuses = query.status?.split(',').map((status) => status.trim()).filter(Boolean);
    return this.repository.listReportCards({
      tenant_id: this.requireTenantId(),
      student_id: this.optionalText(query.student_id),
      limit: this.parsePageLimit(query.limit, 25, 50),
      offset: this.parsePageOffset(query.offset),
      ...(statuses?.length ? { status_in: statuses } : {}),
    });
  }

  async transitionReportCard(reportCardIdValue: string, actionValue?: string) {
    if (!this.isExamsOfficer()) {
      throw new ForbiddenException('Exam approval permission is required to change report-card state');
    }
    const tenantId = this.requireTenantId();
    const actorUserId = this.requireUserId();
    const reportCardId = this.requireText(reportCardIdValue, 'Report card');
    const action = this.requireText(actionValue, 'Report-card action').toLowerCase();
    if (!new Set(['submit', 'approve', 'recall', 'publish', 'unpublish']).has(action)) {
      throw new BadRequestException('Unsupported report-card transition');
    }
    const result = await this.repository.transitionReportCard({ tenant_id: tenantId, actor_user_id: actorUserId, report_card_id: reportCardId, action });
    if (!result) {
      throw new ConflictException(`Report card was not found for this school or is not ready to ${action}`);
    }
    const auditAction = action === 'unpublish' ? 'withdrawn' : action === 'submit' ? 'submitted' : `${action}ed`;
    await this.repository.appendReportCardAuditLog({
      tenant_id: tenantId,
      report_card_id: result.id,
      exam_series_id: result.exam_series_id,
      student_id: result.student_id,
      action: `report_card.${auditAction}`,
      actor_user_id: actorUserId,
      metadata: { resulting_status: result.status },
    });
    if (action === 'publish') {
      await this.eventPublisher?.publishReportCardPublished({
        tenant_id: tenantId,
        report_id: result.id,
        student_id: result.student_id,
        exam_id: result.exam_series_id,
        published_by_user_id: actorUserId,
      });
    }
    await this.schoolEvents?.recordSchoolOperation({ event: {
      id: `report-card-transition-${result.id}-${String(result.updated_at)}`,
      type: `report_card.${action === 'unpublish' ? 'withdrawn' : action}`,
      module: 'exams',
      actorRole: this.requestContext.getStore()?.role || 'exams_officer',
      title: `Report Card ${action.charAt(0).toUpperCase()}${action.slice(1)}`,
      body: `Report card ${result.id} moved to ${result.status}.`,
      entityId: result.id,
      severity: action === 'unpublish' || action === 'recall' ? 'warning' : 'info',
      payload: { report_card_id: result.id, student_id: result.student_id, exam_series_id: result.exam_series_id, status: result.status },
    }});
    return { success: true, message: `Report card ${action} completed`, data: result };
  }

  async updateReportCardComments(reportCardIdValue: string, classTeacherCommentValue?: string, principalCommentValue?: string) {
    if (!this.isExamsOfficer()) {
      throw new ForbiddenException('Exam write permission is required to edit report-card comments');
    }
    const tenantId = this.requireTenantId();
    const actorUserId = this.requireUserId();
    const reportCardId = this.requireText(reportCardIdValue, 'Report card');
    const classTeacherComment = classTeacherCommentValue?.trim() ?? '';
    const principalComment = principalCommentValue?.trim() ?? '';
    if (!classTeacherComment && !principalComment) {
      throw new BadRequestException('Enter a class teacher or principal comment');
    }
    if (classTeacherComment.length > 2000 || principalComment.length > 2000) {
      throw new BadRequestException('Report-card comments must not exceed 2000 characters each');
    }
    const result = await this.repository.updateReportCardComments({
      tenant_id: tenantId,
      actor_user_id: actorUserId,
      report_card_id: reportCardId,
      class_teacher_comment: classTeacherComment,
      principal_comment: principalComment,
    });
    if (!result) {
      throw new ConflictException('Report card was not found for this school or its published snapshot is immutable');
    }
    await this.repository.appendReportCardAuditLog({
      tenant_id: tenantId,
      report_card_id: result.id,
      exam_series_id: result.exam_series_id,
      student_id: result.student_id,
      action: 'report_card.comments_updated',
      actor_user_id: actorUserId,
      metadata: { class_teacher_comment_updated: Boolean(classTeacherComment), principal_comment_updated: Boolean(principalComment) },
    });
    return { success: true, message: 'Report-card comments updated', data: result };
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
    const normalizedExamSeriesId = this.requireText(examSeriesId, 'Exam series');
    const stats = await this.repository.getExamReadinessStats({
      tenant_id: tenantId,
      exam_series_id: normalizedExamSeriesId,
    });
    const unapprovedCount = Number(stats.unapproved_count ?? 0);
    const missingCount = Number(stats.missing_count ?? 0);
    const issues: string[] = [];
    if (unapprovedCount > 0) issues.push(`${unapprovedCount} marks are unapproved or draft`);
    if (missingCount > 0) issues.push(`${missingCount} marks are missing`);

    return {
      ready: issues.length === 0,
      issues,
      unapprovedCount,
      missingCount,
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
      if (!this.eventPublisher || typeof this.repository.executeSql !== 'function') {
        return mark;
      }
      const examSeriesRes = await this.repository.executeSql(
        `SELECT name FROM exam_series WHERE tenant_id = $1 AND id = $2::uuid LIMIT 1`,
        [tenantId, validated.dto.exam_series_id]
      );
      const examName = examSeriesRes.rows[0]?.name || ('Exam Series ' + validated.dto.exam_series_id);

      const classRes = await this.repository.executeSql(
        `SELECT name FROM class_sections WHERE tenant_id = $1 AND id = $2::uuid LIMIT 1`,
        [tenantId, validated.dto.class_section_id]
      ).catch(() => ({ rows: [] }));
      const className = classRes.rows[0]?.name || ('Class ' + validated.dto.class_section_id);

      await this.eventPublisher.publishExamSubmitted({
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

  async processResultBatch(batchIdValue: string, modeValue?: string) {
    const tenantId = this.requireTenantId();
    const actorUserId = this.requireUserId();
    const batchId = this.requireText(batchIdValue, 'Result processing batch');
    const mode = this.requireText(modeValue ?? 'rankings', 'Processing mode').toLowerCase();
    if (mode !== 'aggregates' && mode !== 'rankings') {
      throw new BadRequestException('Processing mode must be aggregates or rankings');
    }
    const result = await this.repository.processResultBatch({ tenant_id: tenantId, actor_user_id: actorUserId, batch_id: batchId, mode });
    if (!result) throw new NotFoundException('Result processing batch was not found for this school');
    await this.schoolEvents?.recordSchoolOperation({ event: {
      id: `exam-results-${batchId}-${String(result.processed_at)}`,
      type: mode === 'rankings' ? 'exam.results_ranked' : 'exam.results_aggregated',
      module: 'exams',
      actorRole: this.requestContext.getStore()?.role || 'exams_officer',
      title: mode === 'rankings' ? 'Exam Rankings Computed' : 'Exam Aggregates Computed',
      body: `${result.aggregate_count} student result snapshot${result.aggregate_count === 1 ? '' : 's'} computed.`,
      entityId: batchId,
      severity: result.aggregate_count ? 'info' : 'warning',
      payload: { batch_id: batchId, mode, aggregate_count: result.aggregate_count, ranked_count: result.ranked_count },
    }});
    return { success: true, message: 'Result processing completed', data: result };
  }

  async clearResultProcessing(batchIdValue: string) {
    const tenantId = this.requireTenantId();
    const actorUserId = this.requireUserId();
    const batchId = this.requireText(batchIdValue, 'Result processing batch');
    const result = await this.repository.clearResultProcessing({ tenant_id: tenantId, actor_user_id: actorUserId, batch_id: batchId });
    if (!result) throw new NotFoundException('Result processing batch was not found for this school');
    await this.schoolEvents?.recordSchoolOperation({ event: {
      id: `exam-results-cleared-${batchId}-${Date.now()}`,
      type: 'exam.result_snapshots_cleared',
      module: 'exams',
      actorRole: this.requestContext.getStore()?.role || 'exams_officer',
      title: 'Exam Result Snapshots Cleared',
      body: `${result.removed_count} persisted result snapshot${result.removed_count === 1 ? '' : 's'} cleared for recomputation.`,
      entityId: batchId,
      severity: 'warning',
      payload: { batch_id: batchId, removed_count: result.removed_count },
    }});
    return { success: true, message: 'Result snapshots cleared', data: result };
  }

  async getResultBroadsheet(batchIdValue: string) {
    const tenantId = this.requireTenantId();
    const batchId = this.requireText(batchIdValue, 'Result processing batch');
    const result = await this.repository.getResultBroadsheet({ tenant_id: tenantId, batch_id: batchId });
    if (!result) throw new NotFoundException('Result processing batch was not found for this school');
    return { success: true, data: result };
  }

  private normalizeSettingsPatch(dto: UpdateExamSettingsDto) {
    const normalized: Partial<typeof DEFAULT_EXAM_SETTINGS> = {};
    const booleanKeys = [
      'lock_after_deadline',
      'include_school_logo',
      'include_principal_signature',
      'include_official_stamp',
      'block_results_for_fee_balances',
      'show_student_rank_to_parents',
    ] as const;

    for (const key of booleanKeys) {
      if (dto[key] !== undefined) {
        if (typeof dto[key] !== 'boolean') {
          throw new BadRequestException(`${key} must be a boolean`);
        }
        normalized[key] = dto[key];
      }
    }

    if (dto.grace_period_hours !== undefined) {
      const gracePeriod = Number(dto.grace_period_hours);
      if (!Number.isInteger(gracePeriod) || gracePeriod < 0 || gracePeriod > 168) {
        throw new BadRequestException('grace_period_hours must be an integer between 0 and 168');
      }
      normalized.grace_period_hours = gracePeriod;
    }

    if (dto.fee_balance_block_threshold !== undefined) {
      const threshold = Number(dto.fee_balance_block_threshold);
      if (!Number.isFinite(threshold) || threshold < 0) {
        throw new BadRequestException('fee_balance_block_threshold must be a non-negative number');
      }
      normalized.fee_balance_block_threshold = threshold;
    }

    if (Object.keys(normalized).length === 0) {
      throw new BadRequestException('At least one exam setting is required');
    }

    return normalized;
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

  async updateTimetableSlot(slotIdValue: string, dto: Partial<CreateTimetableSlotDto> & { status?: string }) {
    if (!this.isExamsOfficer()) {
      throw new ForbiddenException('Exam write permission is required to update timetable slots');
    }

    const tenantId = this.requireTenantId();
    const actorUserId = this.requireUserId();
    const slotId = this.requireText(slotIdValue, 'Timetable slot');
    const status = dto.status ? this.requireText(dto.status, 'Timetable slot status').toLowerCase() : undefined;

    if (status && !EXAM_TIMETABLE_SLOT_STATUSES.has(status)) {
      throw new BadRequestException('Unsupported timetable slot status');
    }

    const result = await this.repository.updateTimetableSlot({
      tenant_id: tenantId,
      actor_user_id: actorUserId,
      timetable_slot_id: slotId,
      date: this.optionalText(dto.date),
      start_time: this.optionalText(dto.start_time),
      end_time: this.optionalText(dto.end_time),
      room_name: this.optionalText(dto.room_name),
      status,
    });

    if (!result) {
      throw new NotFoundException('Timetable slot was not found for this school');
    }

    await this.schoolEvents?.recordSchoolOperation({ event: {
      id: `timetable-slot-updated-${result.id}-${String(result.updated_at ?? Date.now())}`,
      type: 'exam.timetable_slot_updated',
      module: 'exams',
      actorRole: this.requestContext.getStore()?.role || 'exams_officer',
      title: 'Exam Timetable Slot Updated',
      body: `Timetable slot ${result.id} was updated.`,
      entityId: result.id,
      severity: result.status === 'conflict' ? 'warning' : 'info',
      payload: {
        timetable_slot_id: result.id,
        actor_user_id: actorUserId,
        status: result.status,
        room_name: result.room_name,
        date: result.date,
        start_time: result.start_time,
        end_time: result.end_time,
      },
    }});

    return { success: true, message: 'Timetable slot updated', data: result };
  }

  async assignInvigilator(dto: AssignInvigilatorDto) {
    const tenantId = this.requireTenantId();
    const timetableSlotId = this.requireText(dto.timetable_slot_id, 'Timetable slot');
    const staffUserId = this.requireText(dto.staff_user_id, 'Staff user');
    const role = this.requireText(dto.role ?? 'invigilator', 'Invigilator role').toLowerCase();

    if (!EXAM_INVIGILATOR_ROLES.has(role)) {
      throw new BadRequestException('Unsupported invigilator role');
    }

    const scope = await this.repository.findInvigilatorAssignmentScope({
      tenant_id: tenantId,
      timetable_slot_id: timetableSlotId,
      staff_user_id: staffUserId,
    });

    if (!scope) {
      throw new NotFoundException('Timetable slot or active staff account was not found for this school');
    }

    if (scope.existing_assignment_id) {
      throw new ConflictException('Staff member is already assigned to this timetable slot');
    }

    const result = await this.repository.assignInvigilator({
      tenant_id: tenantId,
      timetable_slot_id: timetableSlotId,
      staff_user_id: staffUserId,
      role,
    });

    await this.schoolEvents?.recordSchoolOperation({
      event: {
        id: result.id,
        type: 'exam.invigilator_assigned',
        module: 'exams',
        actorRole: this.requestContext.getStore()?.role || 'exams_officer',
        title: 'Exam Invigilator Assigned',
        body: `${scope.staff_name} was assigned as ${role.replace(/_/g, ' ')} for ${scope.slot_label}.`,
        entityId: result.id,
        severity: 'success',
        payload: {
          assignment_id: result.id,
          timetable_slot_id: timetableSlotId,
          staff_user_id: staffUserId,
          role,
        },
      },
    });

    return { success: true, message: 'Invigilator assigned', data: result };
  }

  async autoAssignInvigilators() {
    const tenantId = this.requireTenantId();
    const assignments = await this.repository.autoAssignInvigilators(tenantId);
    await this.schoolEvents?.recordSchoolOperation({ event: {
      id: `invigilator-auto-assign-${Date.now()}`,
      type: 'exam.invigilators_auto_assigned',
      module: 'exams',
      actorRole: this.requestContext.getStore()?.role || 'exams_officer',
      title: 'Exam Invigilators Auto-Assigned',
      body: `${assignments.length} conflict-free invigilation assignment${assignments.length === 1 ? '' : 's'} created.`,
      severity: assignments.length ? 'success' : 'info',
      payload: { assigned: assignments.length, assignment_ids: assignments.map((assignment: any) => assignment.id) },
    }});
    return { success: true, message: 'Invigilator auto-assignment completed', data: { assigned: assignments.length, assignments } };
  }

  async updateInvigilatorStatus(assignmentIdValue: string, statusValue?: string) {
    const tenantId = this.requireTenantId();
    const assignmentId = this.requireText(assignmentIdValue, 'Invigilator assignment');
    const status = this.requireText(statusValue, 'Invigilator status').toLowerCase();
    if (!EXAM_INVIGILATOR_STATUSES.has(status)) {
      throw new BadRequestException('Unsupported invigilator status');
    }
    const result = await this.repository.updateInvigilatorStatus({
      tenant_id: tenantId,
      assignment_id: assignmentId,
      status,
    });
    if (!result) {
      throw new NotFoundException('Invigilator assignment was not found for this school');
    }
    await this.schoolEvents?.recordSchoolOperation({ event: {
      id: `invigilator-status-${result.id}-${String(result.updated_at ?? status)}`,
      type: 'exam.invigilator_status_updated',
      module: 'exams',
      actorRole: this.requestContext.getStore()?.role || 'exams_officer',
      title: 'Invigilator Attendance Updated',
      body: `Invigilator assignment ${result.id} was marked ${status}.`,
      entityId: result.id,
      severity: status === 'absent' ? 'warning' : 'info',
      payload: { assignment_id: result.id, staff_user_id: result.staff_user_id, timetable_slot_id: result.timetable_slot_id, status },
    }});
    return { success: true, message: 'Invigilator status updated', data: result };
  }

  async remindInvigilator(assignmentIdValue: string) {
    const tenantId = this.requireTenantId();
    const assignmentId = this.requireText(assignmentIdValue, 'Invigilator assignment');
    const assignment = await this.repository.findInvigilatorAssignmentById({
      tenant_id: tenantId,
      assignment_id: assignmentId,
    });
    if (!assignment) {
      throw new NotFoundException('Invigilator assignment was not found for this school');
    }
    if (!this.workflowRepository) {
      throw new BadRequestException('Notification workflow is not configured');
    }
    const reminderDate = new Date().toISOString().slice(0, 10);
    await this.workflowRepository.createNotification({
      tenant_id: tenantId,
      notification_key: `exam-invigilation-reminder:${assignment.id}:${reminderDate}`,
      recipient_user_id: assignment.staff_user_id,
      type: 'exam.invigilation_reminder',
      title: 'Exam Invigilation Reminder',
      body: `You are assigned to invigilate ${assignment.slot_label}.`,
      priority: 'high',
      source_module: 'exams',
      source_record_id: assignment.id,
      metadata: { assignment_id: assignment.id, slot_label: assignment.slot_label },
    });
    await this.schoolEvents?.recordSchoolOperation({ event: {
      id: `invigilator-reminder-${assignment.id}-${reminderDate}`,
      type: 'exam.invigilator_reminder_sent',
      module: 'exams',
      actorRole: this.requestContext.getStore()?.role || 'exams_officer',
      title: 'Invigilator Reminder Sent',
      body: `${assignment.staff_name} was reminded about ${assignment.slot_label}.`,
      entityId: assignment.id,
      severity: 'info',
      payload: { assignment_id: assignment.id, recipient_user_id: assignment.staff_user_id },
    }});
    return { success: true, message: 'Invigilator reminder sent', data: { assignment_id: assignment.id, recipient_user_id: assignment.staff_user_id } };
  }

  async replaceInvigilator(assignmentIdValue: string, replacementStaffUserIdValue?: string, roleValue?: string) {
    const tenantId = this.requireTenantId();
    const assignmentId = this.requireText(assignmentIdValue, 'Invigilator assignment');
    const replacementStaffUserId = this.requireText(replacementStaffUserIdValue, 'Replacement staff user');
    const role = this.requireText(roleValue ?? 'relief', 'Invigilator role').toLowerCase();
    if (!EXAM_INVIGILATOR_ROLES.has(role)) {
      throw new BadRequestException('Unsupported invigilator role');
    }
    const result = await this.repository.replaceInvigilator({
      tenant_id: tenantId,
      assignment_id: assignmentId,
      replacement_staff_user_id: replacementStaffUserId,
      role,
    });
    if (!result) {
      throw new NotFoundException('Invigilator assignment or replacement staff account was not found for this school');
    }
    await this.schoolEvents?.recordSchoolOperation({ event: {
      id: `invigilator-replacement-${result.id}-${String(result.updated_at ?? '')}`,
      type: 'exam.invigilator_replaced',
      module: 'exams',
      actorRole: this.requestContext.getStore()?.role || 'exams_officer',
      title: 'Exam Invigilator Replaced',
      body: `A replacement invigilator was assigned to timetable slot ${result.timetable_slot_id}.`,
      entityId: result.id,
      severity: 'warning',
      payload: { replacement_assignment_id: result.id, replaced_assignment_id: result.replaced_assignment_id, replacement_staff_user_id: replacementStaffUserId },
    }});
    return { success: true, message: 'Replacement invigilator assigned', data: result };
  }

  async markAttendance(dto: MarkExamAttendanceDto) {
    const tenantId = this.requireTenantId();
    const actorUserId = this.requireUserId();
    const timetableSlotId = this.requireText(dto.timetable_slot_id, 'Timetable slot');
    const studentId = this.requireText(dto.student_id, 'Student');
    const status = this.requireText(dto.status, 'Status').toLowerCase();
    const remarks = typeof dto.remarks === 'string' ? dto.remarks.trim() : undefined;

    if (!EXAM_ATTENDANCE_STATUSES.has(status)) {
      throw new BadRequestException('Unsupported exam attendance status');
    }

    if (remarks && remarks.length > 2000) {
      throw new BadRequestException('Attendance remarks must not exceed 2000 characters');
    }

    const scope = await this.repository.findExamAttendanceScope({
      tenant_id: tenantId,
      timetable_slot_id: timetableSlotId,
      student_id: studentId,
    });

    if (!scope) {
      throw new NotFoundException('Student or timetable slot was not found for this school');
    }

    const result = await this.repository.markAttendance({
      tenant_id: tenantId,
      timetable_slot_id: timetableSlotId,
      student_id: studentId,
      status,
      remarks,
      actor_user_id: actorUserId,
    });
    if (!result) {
      throw new ConflictException('Exam attendance record is locked and cannot be changed');
    }

    await this.schoolEvents?.recordSchoolOperation({
      event: {
        id: result.id,
        type: 'exam.attendance_marked',
        module: 'exams',
        actorRole: this.requestContext.getStore()?.role || 'exams_officer',
        title: 'Exam Attendance Marked',
        body: `${scope.student_name} was marked ${status} for ${scope.slot_label}.`,
        entityId: result.id,
        severity: status === 'absent' ? 'warning' : 'info',
        payload: {
          attendance_id: result.id,
          timetable_slot_id: timetableSlotId,
          student_id: studentId,
          status,
        },
      },
    });

    return { success: true, message: 'Attendance marked', data: result };
  }

  async importAttendance(file?: UploadFileMetadata) {
    const tenantId = this.requireTenantId();
    const actorUserId = this.requireUserId();
    if (!file?.buffer) {
      throw new BadRequestException('Select a CSV or XLSX attendance file to import');
    }
    validateUploadedFile(file);
    const extension = file.originalname.slice(file.originalname.lastIndexOf('.')).toLowerCase();
    if (extension !== '.csv' && extension !== '.xlsx') {
      throw new BadRequestException('Exam attendance imports support CSV and XLSX files');
    }

    const table = await parseAttendanceImportTable(file, extension);
    if (table.length < 2) {
      throw new BadRequestException('Attendance import must include a header and at least one data row');
    }
    const headers = table[0].map(normalizeImportHeader);
    const headerIndex = new Map(headers.map((header, index) => [header, index]));
    for (const required of ['timetable_slot_id', 'status']) {
      if (!headerIndex.has(required)) {
        throw new BadRequestException(`Attendance import is missing the ${required} column`);
      }
    }
    if (!headerIndex.has('admission_number') && !headerIndex.has('student_id')) {
      throw new BadRequestException('Attendance import requires admission_number or student_id');
    }

    const sourceRows = table.slice(1)
      .map((values, index) => ({ values, row_number: index + 2 }))
      .filter(({ values }) => values.some((value) => value.trim().length > 0));
    if (sourceRows.length === 0) {
      throw new BadRequestException('Attendance import has no data rows');
    }
    if (sourceRows.length > BULK_ATTENDANCE_IMPORT_MAX_ROWS) {
      throw new BadRequestException(`Attendance import cannot exceed ${BULK_ATTENDANCE_IMPORT_MAX_ROWS} rows`);
    }

    const invalidRows: Array<Record<string, unknown>> = [];
    const validRows: Array<Record<string, unknown>> = [];
    const seen = new Set<string>();
    for (const source of sourceRows) {
      const value = (name: string) => {
        const index = headerIndex.get(name);
        return index === undefined ? '' : (source.values[index] ?? '').trim();
      };
      const timetableSlotId = value('timetable_slot_id');
      const admissionNumber = value('admission_number');
      const studentId = value('student_id');
      const status = value('status').toLowerCase();
      const remarks = value('remarks');
      const errors: string[] = [];
      if (!isUuid(timetableSlotId)) errors.push('timetable_slot_id must be a valid UUID');
      if (!admissionNumber && !studentId) errors.push('admission_number or student_id is required');
      if (studentId && !isUuid(studentId)) errors.push('student_id must be a valid UUID');
      if (!EXAM_ATTENDANCE_STATUSES.has(status)) errors.push('status must be present, absent, late, or excused');
      if (remarks.length > 2000) errors.push('remarks must not exceed 2000 characters');
      const identity = studentId || admissionNumber.toLowerCase();
      const duplicateKey = `${timetableSlotId}:${identity}`;
      if (seen.has(duplicateKey)) errors.push('Duplicate student and timetable slot in import file');
      seen.add(duplicateKey);
      const row = {
        row_number: source.row_number,
        timetable_slot_id: timetableSlotId,
        admission_number: admissionNumber || null,
        student_id: studentId || null,
        status,
        remarks: remarks || null,
      };
      if (errors.length) {
        invalidRows.push({ ...row, status: 'invalid', attendance_status: status, attendance_id: null, errors });
      } else {
        validRows.push(row);
      }
    }

    const persistedRows = validRows.length
      ? await this.repository.bulkImportExamAttendance({ tenant_id: tenantId, actor_user_id: actorUserId, rows: validRows })
      : [];
    const rows = [...invalidRows, ...persistedRows].sort((left: any, right: any) => left.row_number - right.row_number);
    const committed = rows.filter((row: any) => row.status === 'committed').length;
    const failed = sourceRows.length - committed;
    await this.schoolEvents?.recordSchoolOperation({ event: {
      id: `exam-attendance-import-${createHash('sha256').update(`${tenantId}:${actorUserId}:${file.originalname}:${file.size}`).digest('hex').slice(0, 24)}`,
      type: 'exam.attendance_imported',
      module: 'exams',
      actorRole: this.requestContext.getStore()?.role || 'exams_officer',
      title: 'Exam Attendance Imported',
      body: `${committed} of ${sourceRows.length} attendance rows were committed from ${file.originalname}.`,
      severity: failed ? 'warning' : 'info',
      payload: { filename: file.originalname, found: sourceRows.length, committed, failed },
    }});
    return {
      success: failed === 0,
      message: failed ? 'Attendance import completed with row errors' : 'Attendance import completed',
      data: { filename: file.originalname, found: sourceRows.length, committed, failed, rows },
    };
  }

  async sendExamAbsenceAlerts(attendanceIdsValue?: string[]) {
    const tenantId = this.requireTenantId();
    const attendanceIds = [...new Set((attendanceIdsValue ?? []).filter((id) => typeof id === 'string' && id.trim()).map((id) => id.trim()))];
    if (attendanceIds.length === 0 || attendanceIds.length > 200) {
      throw new BadRequestException('Provide between 1 and 200 attendance record IDs');
    }
    if (!this.workflowRepository) {
      throw new BadRequestException('Notification workflow is not configured');
    }
    const recipients = await this.repository.listExamAbsenceGuardianRecipients({ tenant_id: tenantId, attendance_ids: attendanceIds });
    await Promise.all(recipients.map((recipient: any) => this.workflowRepository!.createNotification({
      tenant_id: tenantId,
      notification_key: `exam-absence:${recipient.attendance_id}:${recipient.guardian_user_id}`,
      recipient_user_id: recipient.guardian_user_id,
      type: 'exam.student_absent',
      title: 'Student Absent From Exam',
      body: `${recipient.student_name} was marked absent for ${recipient.slot_label}. Contact the school if this needs correction.`,
      priority: 'high',
      source_module: 'exams',
      source_record_id: recipient.attendance_id,
      metadata: { attendance_id: recipient.attendance_id, student_name: recipient.student_name, slot_label: recipient.slot_label },
    })));
    const notifiedAttendanceIds = new Set(recipients.map((recipient: any) => recipient.attendance_id));
    const skipped = attendanceIds.length - notifiedAttendanceIds.size;
    await this.schoolEvents?.recordSchoolOperation({ event: {
      id: `exam-absence-alerts-${Date.now()}`,
      type: 'exam.absence_alerts_sent',
      module: 'exams',
      actorRole: this.requestContext.getStore()?.role || 'exams_officer',
      title: 'Exam Absence Alerts Sent',
      body: `${recipients.length} guardian notification${recipients.length === 1 ? '' : 's'} created; ${skipped} attendance record${skipped === 1 ? '' : 's'} had no active linked guardian account.`,
      severity: skipped ? 'warning' : 'info',
      payload: { attendance_ids: attendanceIds, sent: recipients.length, skipped },
    }});
    return { success: true, message: 'Exam absence alerts processed', data: { sent: recipients.length, skipped } };
  }

  async lockExamAttendance(attendanceIdValue: string) {
    const tenantId = this.requireTenantId();
    const actorUserId = this.requireUserId();
    const attendanceId = this.requireText(attendanceIdValue, 'Exam attendance record');
    const result = await this.repository.lockExamAttendance({ tenant_id: tenantId, attendance_id: attendanceId, actor_user_id: actorUserId });
    if (!result) {
      throw new NotFoundException('Exam attendance record was not found for this school');
    }
    await this.schoolEvents?.recordSchoolOperation({ event: {
      id: `exam-attendance-lock-${result.id}-${String(result.locked_at)}`,
      type: 'exam.attendance_locked',
      module: 'exams',
      actorRole: this.requestContext.getStore()?.role || 'exams_officer',
      title: 'Exam Attendance Locked',
      body: `Attendance record ${result.id} was locked against normal changes.`,
      entityId: result.id,
      severity: 'info',
      payload: { attendance_id: result.id, student_id: result.student_id, timetable_slot_id: result.timetable_slot_id, locked_by_user_id: actorUserId },
    }});
    return { success: true, message: 'Exam attendance locked', data: result };
  }

  async createAttendanceSpecialCase(attendanceIdValue: string, caseTypeValue?: string, descriptionValue?: string) {
    const tenantId = this.requireTenantId();
    const actorUserId = this.requireUserId();
    const attendanceId = this.requireText(attendanceIdValue, 'Exam attendance record');
    const caseType = this.requireText(caseTypeValue, 'Case type').toLowerCase();
    const description = this.requireText(descriptionValue, 'Description');
    if (!EXAM_STUDENT_CASE_TYPES.has(caseType)) {
      throw new BadRequestException('Unsupported student exam case type');
    }
    if (description.length < 10 || description.length > 5000) {
      throw new BadRequestException('Description must be between 10 and 5000 characters');
    }
    const result = await this.repository.createAttendanceSpecialCase({ tenant_id: tenantId, attendance_id: attendanceId, case_type: caseType, description, actor_user_id: actorUserId });
    if (!result) {
      throw new NotFoundException('Exam attendance record was not found for this school');
    }
    await this.schoolEvents?.recordSchoolOperation({ event: {
      id: result.id,
      type: 'exam.attendance_special_case_reported',
      module: 'exams',
      actorRole: this.requestContext.getStore()?.role || 'exams_officer',
      title: 'Exam Attendance Special Case Reported',
      body: description,
      entityId: result.id,
      severity: caseType === 'disciplinary' || caseType === 'irregularity' ? 'warning' : 'info',
      payload: { case_id: result.id, attendance_id: attendanceId, student_id: result.student_id, exam_series_id: result.exam_series_id, case_type: caseType },
    }});
    return { success: true, message: 'Exam attendance special case reported', data: result };
  }

  async reportStudentCase(dto: ReportStudentExamCaseDto) {
    const tenantId = this.requireTenantId();
    const actorUserId = this.requireUserId();
    const examSeriesId = this.requireText(dto.exam_series_id, 'Exam series');
    const studentId = this.requireText(dto.student_id, 'Student');
    const caseType = this.requireText(dto.case_type, 'Case type').toLowerCase();
    const description = this.requireText(dto.description, 'Description');

    if (!EXAM_STUDENT_CASE_TYPES.has(caseType)) {
      throw new BadRequestException('Unsupported student exam case type');
    }

    if (description.length < 10 || description.length > 5000) {
      throw new BadRequestException('Description must be between 10 and 5000 characters');
    }

    const scope = await this.repository.findStudentCaseScope({
      tenant_id: tenantId,
      exam_series_id: examSeriesId,
      student_id: studentId,
    });

    if (!scope) {
      throw new NotFoundException('Student or exam series was not found for this school');
    }

    const result = await this.repository.reportStudentCase({
      tenant_id: tenantId,
      exam_series_id: examSeriesId,
      student_id: studentId,
      case_type: caseType,
      description,
      actor_user_id: actorUserId,
    });

    await this.schoolEvents?.recordSchoolOperation({
      event: {
        id: result.id,
        type: 'exam.student_case_reported',
        module: 'exams',
        actorRole: this.requestContext.getStore()?.role || 'exams_officer',
        title: 'Student Exam Case Reported',
        body: `${scope.student_name} has a ${caseType.replace(/_/g, ' ')} case for ${scope.exam_series_name}.`,
        entityId: result.id,
        severity: caseType === 'irregularity' || caseType === 'disciplinary' ? 'warning' : 'info',
        payload: {
          case_id: result.id,
          exam_series_id: examSeriesId,
          student_id: studentId,
          case_type: caseType,
        },
      },
      notifications: [
        {
          id: `exam-student-case-${result.id}`,
          schoolId: tenantId,
          audienceRoles: ['principal', 'deputy-principal'],
          title: 'Student Exam Case Reported',
          body: `${scope.student_name} has a ${caseType.replace(/_/g, ' ')} case for ${scope.exam_series_name}.`,
          sourceModule: 'exams',
          relatedModule: 'students',
          relatedRecordId: result.id,
          priority: caseType === 'irregularity' || caseType === 'disciplinary' ? 'high' : 'normal',
          read: false,
          createdAt: new Date().toISOString(),
        },
      ],
    });

    return { success: true, message: 'Student case reported', data: result };
  }

  async resolveStudentCase(caseIdValue: string, resolutionValue?: string) {
    const tenantId = this.requireTenantId();
    const caseId = this.requireText(caseIdValue, 'Student exam case');
    const resolution = this.requireText(resolutionValue, 'Resolution');
    if (resolution.length < 10 || resolution.length > 5000) {
      throw new BadRequestException('Resolution must be between 10 and 5000 characters');
    }
    const result = await this.repository.resolveStudentCase({ tenant_id: tenantId, case_id: caseId, resolution });
    if (!result) {
      throw new NotFoundException('Open student exam case was not found for this school');
    }
    await this.schoolEvents?.recordSchoolOperation({ event: {
      id: `resolve-${result.id}`,
      type: 'exam.student_case_resolved',
      module: 'exams',
      actorRole: this.requestContext.getStore()?.role || 'exams_officer',
      title: 'Student Exam Case Resolved',
      body: resolution,
      entityId: result.id,
      severity: 'success',
      payload: { case_id: result.id, student_id: result.student_id, exam_series_id: result.exam_series_id },
    }});
    return { success: true, message: 'Student case resolved', data: result };
  }

  async requestStudentCaseGuidance(caseIdValue: string, noteValue?: string) {
    const tenantId = this.requireTenantId();
    const actorUserId = this.requireUserId();
    const caseId = this.requireText(caseIdValue, 'Student exam case');
    const note = this.requireText(noteValue, 'Guidance note');
    if (note.length < 10 || note.length > 5000) {
      throw new BadRequestException('Guidance note must be between 10 and 5000 characters');
    }
    if (!this.workflowRepository) {
      throw new BadRequestException('Workflow routing is not configured');
    }
    const studentCase = await this.repository.findStudentCaseById({ tenant_id: tenantId, case_id: caseId });
    if (!studentCase) {
      throw new NotFoundException('Open student exam case was not found for this school');
    }
    await Promise.all([
      this.workflowRepository.createTask({
        tenant_id: tenantId,
        task_key: `exam-case-principal-guidance:${caseId}`,
        assigned_to_role: 'principal',
        created_by_user_id: actorUserId,
        title: `Principal guidance: ${studentCase.student_name}`,
        description: note,
        module: 'exams',
        record_id: caseId,
        priority: studentCase.case_type === 'disciplinary' || studentCase.case_type === 'irregularity' ? 'high' : 'normal',
        metadata: { case_id: caseId, student_id: studentCase.student_id, case_type: studentCase.case_type },
      }),
      this.workflowRepository.createNotification({
        tenant_id: tenantId,
        notification_key: `exam-case-principal-guidance:${caseId}`,
        recipient_role: 'principal',
        type: 'exam.case_guidance_requested',
        title: 'Student Exam Case Needs Guidance',
        body: `${studentCase.student_name}: ${note}`,
        priority: 'high',
        source_module: 'exams',
        source_record_id: caseId,
        metadata: { case_id: caseId, student_id: studentCase.student_id },
      }),
    ]);
    await this.schoolEvents?.recordSchoolOperation({ event: {
      id: `exam-case-guidance-${caseId}`,
      type: 'exam.student_case_guidance_requested',
      module: 'exams',
      actorRole: this.requestContext.getStore()?.role || 'exams_officer',
      title: 'Principal Guidance Requested',
      body: note,
      entityId: caseId,
      severity: 'warning',
      payload: { case_id: caseId, student_id: studentCase.student_id },
    }});
    return { success: true, message: 'Principal guidance requested', data: { case_id: caseId, assigned_to_role: 'principal' } };
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

  async getSettings() {
    const tenantId = this.requireTenantId();
    const existing = await this.repository.getExamSettings(tenantId);
    return {
      success: true,
      data: {
        ...DEFAULT_EXAM_SETTINGS,
        ...(existing ?? {}),
      },
    };
  }

  async updateSettings(dto: UpdateExamSettingsDto) {
    const tenantId = this.requireTenantId();
    const actorUserId = this.requireUserId();
    const previous = await this.repository.getExamSettings(tenantId);
    const merged = {
      ...DEFAULT_EXAM_SETTINGS,
      ...(previous ?? {}),
      ...this.normalizeSettingsPatch(dto),
    };

    const updated = await this.repository.upsertExamSettings({
      tenant_id: tenantId,
      updated_by_user_id: actorUserId,
      ...merged,
    });

    await this.repository.appendExamSettingsAuditLog({
      tenant_id: tenantId,
      action: 'exam_settings.updated',
      actor_user_id: actorUserId,
      previous_settings: previous ?? DEFAULT_EXAM_SETTINGS,
      new_settings: updated,
      metadata: {
        source: 'exams.settings',
      },
    });

    return {
      success: true,
      data: updated,
    };
  }

  async getGradingPolicies(filters: Record<string, string | undefined>) {
    const tenantId = this.requireTenantId();
    const data = await this.repository.getGradingPolicies(tenantId, filters);
    return { success: true, data };
  }

  async createGradingPolicy(dto: { name?: string; reporting_mode?: string; exam_series_id?: string }) {
    if (!this.isExamsOfficer()) {
      throw new ForbiddenException('Exam write permission is required to create grading policies');
    }

    const tenantId = this.requireTenantId();
    const actorUserId = this.requireUserId();
    const reportingMode = this.requireText(dto.reporting_mode ?? 'traditional', 'Reporting mode').toLowerCase();

    if (!EXAM_GRADING_REPORTING_MODES.has(reportingMode)) {
      throw new BadRequestException('Unsupported grading policy reporting mode');
    }

    const result = await this.repository.createGradingPolicy({
      tenant_id: tenantId,
      actor_user_id: actorUserId,
      name: this.requireText(dto.name, 'Grading policy name'),
      reporting_mode: reportingMode,
      exam_series_id: this.optionalText(dto.exam_series_id),
    });

    await this.schoolEvents?.recordSchoolOperation({ event: {
      id: `grading-policy-created-${result.id}`,
      type: 'exam.grading_policy_created',
      module: 'exams',
      actorRole: this.requestContext.getStore()?.role || 'exams_officer',
      title: 'Grading Policy Created',
      body: `Grading policy ${result.name} was created.`,
      entityId: result.id,
      severity: 'info',
      payload: { grading_policy_id: result.id, reporting_mode: result.reporting_mode, actor_user_id: actorUserId },
    }});

    return { success: true, message: 'Grading policy created', data: result };
  }

  async transitionGradingPolicy(policyIdValue: string, statusValue?: string) {
    if (!this.isExamsOfficer()) {
      throw new ForbiddenException('Exam write permission is required to update grading policies');
    }

    const tenantId = this.requireTenantId();
    const actorUserId = this.requireUserId();
    const policyId = this.requireText(policyIdValue, 'Grading policy');
    const status = this.requireText(statusValue, 'Grading policy status').toLowerCase();

    if (!EXAM_GRADING_POLICY_STATUSES.has(status)) {
      throw new BadRequestException('Unsupported grading policy status');
    }

    const result = await this.repository.transitionGradingPolicy({
      tenant_id: tenantId,
      actor_user_id: actorUserId,
      policy_id: policyId,
      status,
    });

    if (!result) {
      throw new NotFoundException('Grading policy was not found for this school');
    }

    await this.schoolEvents?.recordSchoolOperation({ event: {
      id: `grading-policy-${status}-${result.id}`,
      type: `exam.grading_policy_${status}`,
      module: 'exams',
      actorRole: this.requestContext.getStore()?.role || 'exams_officer',
      title: 'Grading Policy Updated',
      body: `Grading policy ${result.name} is now ${result.status}.`,
      entityId: result.id,
      severity: status === 'active' ? 'info' : 'warning',
      payload: { grading_policy_id: result.id, status: result.status, actor_user_id: actorUserId },
    }});

    return { success: true, message: 'Grading policy updated', data: result };
  }

  async updateGradingPolicy(policyIdValue: string, dto: { name?: string; reporting_mode?: string }) {
    if (!this.isExamsOfficer()) {
      throw new ForbiddenException('Exam write permission is required to edit grading policies');
    }

    const tenantId = this.requireTenantId();
    const actorUserId = this.requireUserId();
    const policyId = this.requireText(policyIdValue, 'Grading policy');
    const reportingMode = dto.reporting_mode ? this.requireText(dto.reporting_mode, 'Reporting mode').toLowerCase() : undefined;

    if (reportingMode && !EXAM_GRADING_REPORTING_MODES.has(reportingMode)) {
      throw new BadRequestException('Unsupported grading policy reporting mode');
    }

    const result = await this.repository.updateGradingPolicy({
      tenant_id: tenantId,
      actor_user_id: actorUserId,
      policy_id: policyId,
      name: this.optionalText(dto.name),
      reporting_mode: reportingMode,
    });

    if (!result) {
      throw new NotFoundException('Grading policy was not found for this school');
    }

    await this.schoolEvents?.recordSchoolOperation({ event: {
      id: `grading-policy-edited-${result.id}-${String(result.updated_at ?? Date.now())}`,
      type: 'exam.grading_policy_edited',
      module: 'exams',
      actorRole: this.requestContext.getStore()?.role || 'exams_officer',
      title: 'Grading Policy Edited',
      body: `Grading policy ${result.name} was edited.`,
      entityId: result.id,
      severity: 'info',
      payload: { grading_policy_id: result.id, reporting_mode: result.reporting_mode, actor_user_id: actorUserId },
    }});

    return { success: true, message: 'Grading policy updated', data: result };
  }

  async deleteDraftGradingPolicy(policyIdValue: string) {
    if (!this.isExamsOfficer()) {
      throw new ForbiddenException('Exam write permission is required to delete draft grading policies');
    }

    const tenantId = this.requireTenantId();
    const actorUserId = this.requireUserId();
    const policyId = this.requireText(policyIdValue, 'Grading policy');
    const result = await this.repository.deleteDraftGradingPolicy({
      tenant_id: tenantId,
      actor_user_id: actorUserId,
      policy_id: policyId,
    });

    if (!result) {
      throw new NotFoundException('Draft grading policy was not found for this school');
    }

    await this.schoolEvents?.recordSchoolOperation({ event: {
      id: `grading-policy-deleted-${result.id}`,
      type: 'exam.grading_policy_deleted',
      module: 'exams',
      actorRole: this.requestContext.getStore()?.role || 'exams_officer',
      title: 'Draft Grading Policy Deleted',
      body: `Draft grading policy ${result.name} was deleted.`,
      entityId: result.id,
      severity: 'warning',
      payload: { grading_policy_id: result.id, actor_user_id: actorUserId },
    }});

    return { success: true, message: 'Draft grading policy deleted', data: result };
  }

  async getGradingPolicyBoundaries(policyIdValue: string) {
    const data = await this.repository.getGradingPolicyBoundaries({
      tenant_id: this.requireTenantId(),
      policy_id: this.requireText(policyIdValue, 'Grading policy'),
    });
    return { success: true, data };
  }

  private normalizeBoundaryNumbers(dto: { min_score?: number; max_score?: number; points?: number }) {
    const minScore = dto.min_score === undefined ? undefined : this.requireNonNegativeNumber(Number(dto.min_score), 'Minimum score');
    const maxScore = dto.max_score === undefined ? undefined : this.requireNonNegativeNumber(Number(dto.max_score), 'Maximum score');
    if (minScore !== undefined && maxScore !== undefined && maxScore < minScore) {
      throw new BadRequestException('Maximum score must be greater than or equal to minimum score');
    }
    const points = dto.points === undefined ? undefined : this.requireNonNegativeNumber(Number(dto.points), 'Grade points');
    return { minScore, maxScore, points };
  }

  async createGradingPolicyBoundary(policyIdValue: string, dto: { label?: string; min_score?: number; max_score?: number; points?: number; descriptor?: string }) {
    if (!this.isExamsOfficer()) throw new ForbiddenException('Exam write permission is required to create grading boundaries');
    const tenantId = this.requireTenantId();
    const actorUserId = this.requireUserId();
    const { minScore, maxScore, points } = this.normalizeBoundaryNumbers(dto);
    if (minScore === undefined || maxScore === undefined) throw new BadRequestException('Minimum and maximum scores are required');
    const result = await this.repository.createGradingPolicyBoundary({
      tenant_id: tenantId,
      actor_user_id: actorUserId,
      policy_id: this.requireText(policyIdValue, 'Grading policy'),
      label: this.requireText(dto.label, 'Boundary label'),
      min_score: minScore,
      max_score: maxScore,
      points,
      descriptor: this.optionalText(dto.descriptor),
    });
    if (!result) throw new NotFoundException('Grading policy was not found for this school');
    await this.recordGradingBoundaryEvent('created', result, actorUserId);
    return { success: true, message: 'Grading boundary created', data: result };
  }

  async updateGradingPolicyBoundary(boundaryIdValue: string, dto: { label?: string; min_score?: number; max_score?: number; points?: number; descriptor?: string }) {
    if (!this.isExamsOfficer()) throw new ForbiddenException('Exam write permission is required to update grading boundaries');
    const tenantId = this.requireTenantId();
    const actorUserId = this.requireUserId();
    const { minScore, maxScore, points } = this.normalizeBoundaryNumbers(dto);
    const result = await this.repository.updateGradingPolicyBoundary({
      tenant_id: tenantId,
      actor_user_id: actorUserId,
      boundary_id: this.requireText(boundaryIdValue, 'Grading boundary'),
      label: dto.label === undefined ? undefined : this.requireText(dto.label, 'Boundary label'),
      min_score: minScore,
      max_score: maxScore,
      points,
      descriptor: dto.descriptor === undefined ? undefined : this.optionalText(dto.descriptor),
    });
    if (!result) throw new NotFoundException('Grading boundary was not found for this school');
    await this.recordGradingBoundaryEvent('updated', result, actorUserId);
    return { success: true, message: 'Grading boundary updated', data: result };
  }

  async deleteGradingPolicyBoundary(boundaryIdValue: string) {
    if (!this.isExamsOfficer()) throw new ForbiddenException('Exam write permission is required to delete grading boundaries');
    const tenantId = this.requireTenantId();
    const actorUserId = this.requireUserId();
    const result = await this.repository.deleteGradingPolicyBoundary({
      tenant_id: tenantId,
      actor_user_id: actorUserId,
      boundary_id: this.requireText(boundaryIdValue, 'Grading boundary'),
    });
    if (!result) throw new NotFoundException('Grading boundary was not found for this school');
    await this.recordGradingBoundaryEvent('deleted', result, actorUserId);
    return { success: true, message: 'Grading boundary deleted', data: result };
  }

  private async recordGradingBoundaryEvent(action: 'created' | 'updated' | 'deleted', boundary: Record<string, any>, actorUserId: string) {
    await this.schoolEvents?.recordSchoolOperation({ event: {
      id: `grading-boundary-${action}-${boundary.id}-${action === 'updated' ? Date.now() : ''}`,
      type: `exam.grading_boundary_${action}`,
      module: 'exams',
      actorRole: this.requestContext.getStore()?.role || 'exams_officer',
      title: `Grading Boundary ${action}`,
      body: `${boundary.label} grading boundary was ${action}.`,
      entityId: boundary.id,
      severity: action === 'deleted' ? 'warning' : 'info',
      payload: { boundary_id: boundary.id, grading_policy_id: boundary.grading_policy_id, actor_user_id: actorUserId },
    }});
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

  async deleteSubjectWeighting(weightingIdValue: string) {
    if (!this.isExamsOfficer()) {
      throw new ForbiddenException('Exam write permission is required to remove subject weightings');
    }

    const tenantId = this.requireTenantId();
    const actorUserId = this.requireUserId();
    const weightingId = this.requireText(weightingIdValue, 'Subject weighting');
    const result = await this.repository.deleteSubjectWeighting({
      tenant_id: tenantId,
      actor_user_id: actorUserId,
      weighting_id: weightingId,
    });

    if (!result) {
      throw new NotFoundException('Subject weighting was not found for this school');
    }

    await this.schoolEvents?.recordSchoolOperation({ event: {
      id: `subject-weighting-removed-${result.id}`,
      type: 'exam.subject_weighting_removed',
      module: 'exams',
      actorRole: this.requestContext.getStore()?.role || 'exams_officer',
      title: 'Exam Subject Weighting Removed',
      body: `Subject ${result.subject_id} was removed from the exam grading scope.`,
      entityId: result.id,
      severity: 'warning',
      payload: {
        subject_weighting_id: result.id,
        subject_id: result.subject_id,
        actor_user_id: actorUserId,
      },
    }});

    return { success: true, message: 'Subject weighting removed', data: result };
  }

  async getAssessmentComponents(filters: Record<string, string | undefined>) {
    const tenantId = this.requireTenantId();
    const data = await this.repository.getAssessmentComponents(tenantId, filters);
    return { success: true, data };
  }

  async createAssessmentComponent(dto: { assessment_id?: string; component_code?: string; component_name?: string; max_score?: number; weight?: number }) {
    if (!this.isExamsOfficer()) {
      throw new ForbiddenException('Exam write permission is required to create assessment components');
    }

    const tenantId = this.requireTenantId();
    const actorUserId = this.requireUserId();
    const weight = this.requirePositiveNumber(Number(dto.weight), 'Component weight');
    if (weight > 100) {
      throw new BadRequestException('Component weight cannot exceed 100');
    }

    const result = await this.repository.createAssessmentComponent({
      tenant_id: tenantId,
      actor_user_id: actorUserId,
      assessment_id: this.requireText(dto.assessment_id, 'Assessment'),
      component_code: this.requireText(dto.component_code, 'Component code').toUpperCase(),
      component_name: this.requireText(dto.component_name, 'Component name'),
      max_score: this.requirePositiveNumber(Number(dto.max_score), 'Maximum score'),
      weight,
    });

    if (!result) {
      throw new NotFoundException('Assessment was not found for this school');
    }

    await this.schoolEvents?.recordSchoolOperation({ event: {
      id: `assessment-component-created-${result.id}`,
      type: 'exam.assessment_component_created',
      module: 'exams',
      actorRole: this.requestContext.getStore()?.role || 'exams_officer',
      title: 'Exam Assessment Component Created',
      body: `${result.component_name} was added to an exam assessment.`,
      entityId: result.id,
      severity: 'info',
      payload: { assessment_component_id: result.id, assessment_id: result.assessment_id, actor_user_id: actorUserId },
    }});

    return { success: true, message: 'Assessment component created', data: result };
  }

  async updateAssessmentComponent(
    componentIdValue: string,
    dto: { component_code?: string; component_name?: string; max_score?: number; weight?: number },
  ) {
    if (!this.isExamsOfficer()) {
      throw new ForbiddenException('Exam write permission is required to update assessment components');
    }

    const tenantId = this.requireTenantId();
    const actorUserId = this.requireUserId();
    const componentId = this.requireText(componentIdValue, 'Assessment component');
    const weight = dto.weight === undefined ? undefined : this.requirePositiveNumber(Number(dto.weight), 'Component weight');
    if (weight !== undefined && weight > 100) {
      throw new BadRequestException('Component weight cannot exceed 100');
    }

    const result = await this.repository.updateAssessmentComponent({
      tenant_id: tenantId,
      actor_user_id: actorUserId,
      component_id: componentId,
      component_code: dto.component_code === undefined ? undefined : this.requireText(dto.component_code, 'Component code').toUpperCase(),
      component_name: dto.component_name === undefined ? undefined : this.requireText(dto.component_name, 'Component name'),
      max_score: dto.max_score === undefined ? undefined : this.requirePositiveNumber(Number(dto.max_score), 'Maximum score'),
      weight,
    });

    if (!result) {
      throw new NotFoundException('Assessment component was not found for this school');
    }

    await this.schoolEvents?.recordSchoolOperation({ event: {
      id: `assessment-component-updated-${result.id}-${Date.now()}`,
      type: 'exam.assessment_component_updated',
      module: 'exams',
      actorRole: this.requestContext.getStore()?.role || 'exams_officer',
      title: 'Exam Assessment Component Updated',
      body: `${result.component_name} was updated.`,
      entityId: result.id,
      severity: 'info',
      payload: { assessment_component_id: result.id, assessment_id: result.assessment_id, actor_user_id: actorUserId },
    }});

    return { success: true, message: 'Assessment component updated', data: result };
  }

  async deleteAssessmentComponent(componentIdValue: string) {
    if (!this.isExamsOfficer()) {
      throw new ForbiddenException('Exam write permission is required to delete assessment components');
    }

    const tenantId = this.requireTenantId();
    const actorUserId = this.requireUserId();
    const componentId = this.requireText(componentIdValue, 'Assessment component');
    const result = await this.repository.deleteAssessmentComponent({
      tenant_id: tenantId,
      actor_user_id: actorUserId,
      component_id: componentId,
    });

    if (!result) {
      throw new NotFoundException('Assessment component was not found for this school');
    }

    await this.schoolEvents?.recordSchoolOperation({ event: {
      id: `assessment-component-deleted-${result.id}`,
      type: 'exam.assessment_component_deleted',
      module: 'exams',
      actorRole: this.requestContext.getStore()?.role || 'exams_officer',
      title: 'Exam Assessment Component Deleted',
      body: `${result.component_name} was removed from an exam assessment.`,
      entityId: result.id,
      severity: 'warning',
      payload: { assessment_component_id: result.id, assessment_id: result.assessment_id, actor_user_id: actorUserId },
    }});

    return { success: true, message: 'Assessment component deleted', data: result };
  }

  async getMarkEntryWindows(filters: Record<string, string | undefined>) {
    const tenantId = this.requireTenantId();
    const data = await this.repository.getMarkEntryWindows(tenantId, filters);
    return { success: true, data };
  }

  async transitionMarkWindow(markWindowIdValue: string, actionValue?: string, reasonValue?: string) {
    if (!this.isExamsOfficer()) {
      throw new ForbiddenException('Exam write permission is required to manage mark-entry windows');
    }

    const tenantId = this.requireTenantId();
    const actorUserId = this.requireUserId();
    const markWindowId = this.requireText(markWindowIdValue, 'Mark-entry window');
    const action = this.requireText(actionValue, 'Mark-window action').toLowerCase();

    if (!new Set(['open', 'lock', 'return']).has(action)) {
      throw new BadRequestException('Unsupported mark-window transition');
    }

    const reason = typeof reasonValue === 'string' ? reasonValue.trim() : '';
    if (action === 'return' && (reason.length < 10 || reason.length > 2000)) {
      throw new BadRequestException('Correction reason must be between 10 and 2000 characters');
    }

    const result = await this.repository.transitionMarkWindow({
      tenant_id: tenantId,
      actor_user_id: actorUserId,
      mark_window_id: markWindowId,
      action,
      ...(reason ? { reason } : {}),
    });

    if (!result) {
      throw new ConflictException(`Mark window was not found for this school or is not ready to ${action}`);
    }

    await this.schoolEvents?.recordSchoolOperation({ event: {
      id: `mark-window-${action}-${result.id}-${String(result.last_action_at ?? result.updated_at ?? Date.now())}`,
      type: `exam.mark_window_${action === 'return' ? 'returned' : action === 'lock' ? 'locked' : 'opened'}`,
      module: 'exams',
      actorRole: this.requestContext.getStore()?.role || 'exams_officer',
      title: action === 'return' ? 'Mark Window Returned' : action === 'lock' ? 'Mark Window Locked' : 'Mark Window Opened',
      body: action === 'return'
        ? `Mark window ${result.id} was returned for correction.`
        : `Mark window ${result.id} was ${action === 'lock' ? 'locked' : 'opened'}.`,
      entityId: result.id,
      severity: action === 'return' ? 'warning' : 'info',
      payload: {
        mark_window_id: result.id,
        action,
        workflow_status: result.workflow_status,
        affected_marks: result.affected_marks,
        ...(reason ? { reason } : {}),
      },
    }});

    return { success: true, message: 'Mark window updated', data: result };
  }

  async remindMarkWindow(markWindowIdValue: string) {
    if (!this.isExamsOfficer()) {
      throw new ForbiddenException('Exam write permission is required to send mark-entry reminders');
    }

    const tenantId = this.requireTenantId();
    const markWindowId = this.requireText(markWindowIdValue, 'Mark-entry window');

    if (!this.workflowRepository) {
      throw new BadRequestException('Notification workflow is not configured');
    }

    const window = await this.repository.findMarkWindowRecipients({
      tenant_id: tenantId,
      mark_window_id: markWindowId,
    });

    if (!window) {
      throw new NotFoundException('Mark-entry window was not found for this school');
    }

    const recipientSource: unknown[] = Array.isArray(window.recipient_user_ids) ? window.recipient_user_ids : [];
    const recipientUserIds: string[] = Array.from(new Set<string>(
      recipientSource.filter((recipient): recipient is string => typeof recipient === 'string' && recipient.trim().length > 0),
    ));
    const reminderDate = new Date().toISOString().slice(0, 10);

    await Promise.all(recipientUserIds.map((recipientUserId) => this.workflowRepository!.createNotification({
      tenant_id: tenantId,
      notification_key: `exam-mark-window:${window.id}:${recipientUserId}:${reminderDate}`,
      recipient_user_id: recipientUserId,
      type: 'exam.marks_window_reminder',
      title: 'Marks Entry Reminder',
      body: `Submit marks for ${window.subject_name ?? 'the assigned subject'} in ${window.class_name ?? 'the assigned class'}${window.closes_at ? ` before ${new Date(window.closes_at).toLocaleDateString('en-KE')}` : ''}.`,
      priority: 'high',
      source_module: 'exams',
      source_record_id: window.id,
      metadata: {
        mark_window_id: window.id,
        class_name: window.class_name,
        subject_name: window.subject_name,
        closes_at: window.closes_at,
      },
    })));

    await this.schoolEvents?.recordSchoolOperation({ event: {
      id: `mark-window-reminders-${window.id}-${reminderDate}`,
      type: 'exam.mark_window_reminders_sent',
      module: 'exams',
      actorRole: this.requestContext.getStore()?.role || 'exams_officer',
      title: 'Marks Entry Reminders Sent',
      body: `${recipientUserIds.length} teacher reminder${recipientUserIds.length === 1 ? '' : 's'} created for ${window.subject_name ?? 'mark entry'}.`,
      entityId: window.id,
      severity: recipientUserIds.length ? 'info' : 'warning',
      payload: { mark_window_id: window.id, sent: recipientUserIds.length, skipped: recipientUserIds.length ? 0 : 1 },
    }});

    return { success: true, message: 'Mark-window reminders processed', data: { mark_window_id: window.id, sent: recipientUserIds.length, skipped: recipientUserIds.length ? 0 : 1 } };
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
      `UPDATE exam_series SET status = 'reviewed', name = COALESCE($3, name), updated_at = NOW() WHERE tenant_id = $1 AND id = $2::uuid RETURNING *`,
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
    const status = String(dto.status || '').trim().toLowerCase();
    if (!new Set(['draft', 'submitted', 'reviewed', 'locked', 'published', 'archived']).has(status)) {
      throw new BadRequestException('Unsupported exam lifecycle status');
    }
    const res = await this.repository.executeSql(
      `UPDATE exam_series SET status = $3, updated_at = NOW() WHERE tenant_id = $1 AND id = $2::uuid RETURNING *`,
      [tenantId, id, status]
    );
    if (!res.rows[0]) {
      throw new NotFoundException('Exam series was not found for this school');
    }
    await this.schoolEvents?.recordSchoolOperation({ event: {
      id: `exam-series-lifecycle-${res.rows[0].id}-${String(res.rows[0].updated_at ?? Date.now())}`,
      type: `exam.series_${status}`,
      module: 'exams',
      actorRole: this.requestContext.getStore()?.role || 'exams_officer',
      title: 'Exam Lifecycle Updated',
      body: `Exam series ${res.rows[0].name ?? res.rows[0].id} moved to ${status}.`,
      entityId: res.rows[0].id,
      severity: status === 'archived' ? 'warning' : 'info',
      payload: { exam_series_id: res.rows[0].id, status },
    }});
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

async function parseAttendanceImportTable(file: UploadFileMetadata, extension: string): Promise<string[][]> {
  if (extension === '.csv') {
    return parseCsv(file.buffer!.toString('utf8'));
  }
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(file.buffer! as never);
  const worksheet = workbook.worksheets[0];
  if (!worksheet) return [];
  const rows: string[][] = [];
  worksheet.eachRow({ includeEmpty: false }, (row) => {
    const values: string[] = [];
    for (let column = 1; column <= row.cellCount; column += 1) {
      values.push(row.getCell(column).text.trim());
    }
    rows.push(values);
  });
  return rows;
}

function parseCsv(content: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  for (let index = 0; index < content.length; index += 1) {
    const character = content[index];
    if (character === '"') {
      if (quoted && content[index + 1] === '"') {
        field += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === ',' && !quoted) {
      row.push(field);
      field = '';
    } else if ((character === '\n' || character === '\r') && !quoted) {
      if (character === '\r' && content[index + 1] === '\n') index += 1;
      row.push(field);
      if (row.some((value) => value.length > 0)) rows.push(row);
      row = [];
      field = '';
    } else {
      field += character;
    }
  }
  if (quoted) throw new BadRequestException('Attendance CSV contains an unterminated quoted field');
  row.push(field);
  if (row.some((value) => value.length > 0)) rows.push(row);
  return rows;
}

function normalizeImportHeader(value: string): string {
  return value.replace(/^\uFEFF/, '').trim().toLowerCase().replace(/[\s-]+/g, '_');
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(value);
}
