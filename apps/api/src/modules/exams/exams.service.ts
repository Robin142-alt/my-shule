import { requiresPublishedExamAnalytics } from './analytics/analytics-scope';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
  ServiceUnavailableException,
  UnauthorizedException,
  forwardRef,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, createHmac, timingSafeEqual, randomUUID } from 'node:crypto';
import ExcelJS from 'exceljs';

import { RequestContextService } from '../../common/request-context/request-context.service';
import { DatabaseFileStorageService } from '../../common/uploads/database-file-storage.service';
import { validateUploadedFile, type UploadFileMetadata } from '../../common/uploads/upload-policy';
import {
  BulkExamMarkUploadDto,
  BulkExamMarkUploadRowDto,
  AddAcademicInterventionUpdateDto,
  ACADEMIC_INTERVENTION_STATUSES,
  CorrectLockedExamMarkDto,
  CreateAcademicInterventionDto,
  CreateExamAssessmentDto,
  CreateExamSeriesDto,
  EnterExamMarkDto,
  GenerateReportCardBatchDto,
  GenerateReportCardDto,
  RegenerateReportCardDto,
  LockExamMarksDto,
  ModerateExamMarksDto,
  PublishReportCardDto,
  CreateTimetableSlotDto,
  AssignInvigilatorDto,
  MarkExamAttendanceDto,
  ReportStudentExamCaseDto,
  UpdateExamSettingsDto,
  EXAM_SCORE_STATUSES,
  type ExamScoreStatus,
} from './dto/exams.dto';
import { ExamsRepository } from './repositories/exams.repository';
import { parseAnalyticsFilters, type ExamAnalyticsScopeLevel } from './analytics/analytics-scope';
import { ReportCardGenerationService } from './services/report-card-generation.service';
import {
  extractPersistedReportCardPayload,
  ReportCardTemplateService,
} from './services/report-card-template.service';
import { createReportCardPdfArtifact } from './services/report-card-pdf-artifact';
import { hydrateReportCardLogoForRendering } from './services/report-card-logo-hydration';
import { assertDecodableReportCardSignatureImage } from './services/report-card-signature-image';
import type { ReportArtifact } from '../../common/reports/report-artifact';
import { SchoolOperationalEventsService } from '../events/school-operational-events.service';
import { EventPublisherService } from '../events/event-publisher.service';
import { WorkflowRepository } from '../events/repositories/workflow.repository';

const EXAM_ADMIN_ROLES = new Set([
  'owner',
  'admin',
  'school_admin',
  'school_owner',
  'platform_owner',
  'superadmin',
  'super_admin',
]);
const EXAMS_MANAGER_ROLES = new Set([
  'exam_manager',
  'exams_manager',
  'exams_officer',
  'exam_officer',
  'examination_officer',
]);
const EXAM_REVIEW_ROLES = new Set([
  'dean_academics',
  'dean_of_academics',
  'academic_dean',
]);
const DEAN_APPROVAL_ROLES = new Set([
  'dean_academics',
  'dean_of_academics',
  'academic_dean',
]);
const PRINCIPAL_RELEASE_ROLES = new Set([
  'principal',
  'school_principal',
]);
const REPORT_CARD_TRANSITION_ACTIONS = new Set([
  'submit',
  'approve',
  'recall',
  'publish',
  'unpublish',
]);
const PARENT_REPORT_CARD_DOWNLOAD_PURPOSE = 'exams.report_card.parent_download';
const BULK_MARK_UPLOAD_MAX_ROWS = 500;
const BULK_ATTENDANCE_IMPORT_MAX_ROWS = 500;
const REPORT_CARD_SIGNATURE_MAX_BYTES = 2 * 1024 * 1024;
type ReportCardSignerRole = 'class_teacher' | 'principal';
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
const ACADEMIC_INTERVENTION_STATUS_SET = new Set<string>(ACADEMIC_INTERVENTION_STATUSES);
const ACADEMIC_INTERVENTION_LEADERSHIP_ROLES = new Set([
  'principal',
  'school_principal',
  'deputy_principal',
  'deputy',
  'dean_academics',
  'dean_of_academics',
  'academic_dean',
  'exams_manager',
  'exams_officer',
  'exam_officer',
  'examination_officer',
]);
const ACADEMIC_INTERVENTION_HOD_ROLES = new Set(['hod', 'head_of_department']);
const ACADEMIC_INTERVENTION_OWNER_ROLES = new Set([
  'hos',
  'head_of_subject',
  'subject_coordinator',
  'teacher',
  'class_teacher',
  'grade_master',
  'form_master',
  'grade_form_master',
]);
const SCHOOL_WIDE_ACADEMIC_ANALYTICS_ROLES = new Set([
  'principal',
  'school_principal',
  'deputy_principal',
  'deputy',
  'dean_academics',
  'dean_of_academics',
  'academic_dean',
  'exams_manager',
  'exams_officer',
  'exam_officer',
  'examination_officer',
]);
const DEPARTMENT_ACADEMIC_ANALYTICS_ROLES = new Set([
  'hod',
  'head_of_department',
]);
const ACADEMIC_INTERVENTION_TRANSITIONS: Record<string, Set<string>> = {
  planned: new Set(['planned', 'active', 'cancelled']),
  active: new Set(['active', 'monitoring', 'completed', 'cancelled']),
  monitoring: new Set(['monitoring', 'active', 'completed', 'cancelled']),
  completed: new Set(['completed']),
  cancelled: new Set(['cancelled']),
};
const EXAM_GRADING_POLICY_STATUSES = new Set([
  'draft',
  'validated',
  'scheduled',
  'active',
  'replaced',
  'archived',
]);
const EXAM_SCORE_STATUS_SET = new Set<string>(EXAM_SCORE_STATUSES);
const BULK_MARK_UPLOAD_HEADERS = [
  'exam_series_id',
  'assessment_id',
  'academic_term_id',
  'class_section_id',
  'subject_id',
  'student_id',
  'score',
  'score_status',
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
  score: number | null;
  score_status: ExamScoreStatus;
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
  private readonly logger = new Logger(ExamsService.name);

  constructor(
    @Inject(forwardRef(() => RequestContextService))
    private readonly requestContext: RequestContextService,
    private readonly repository: ExamsRepository,
    @Optional() private readonly configService?: ConfigService,
    @Optional() private readonly reportCardGenerationService?: ReportCardGenerationService,
    @Optional() private readonly schoolEvents?: SchoolOperationalEventsService,
    @Optional() private readonly eventPublisher?: EventPublisherService,
    @Optional() private readonly workflowRepository?: WorkflowRepository,
    @Optional() private readonly reportCardTemplateService?: ReportCardTemplateService,
    @Optional() private readonly fileStorage?: DatabaseFileStorageService,
  ) {}

  async uploadOwnedReportCardSignature(input: {
    tenant_id: string;
    signer_user_id: string;
    signer_role: ReportCardSignerRole;
  }, file: UploadFileMetadata) {
    this.assertOwnedReportCardSignatureScope(input);
    if (!file?.buffer?.length) {
      throw new BadRequestException('A signature image is required for upload');
    }

    const mimeType = file.mimetype.trim().toLowerCase();
    if (mimeType !== 'image/png' && mimeType !== 'image/jpeg') {
      throw new BadRequestException('Report-card signatures must be PNG or JPEG images');
    }
    validateUploadedFile({ ...file, size: file.buffer.length });
    if (file.buffer.length > REPORT_CARD_SIGNATURE_MAX_BYTES) {
      throw new BadRequestException('Report-card signature images must not exceed 2 MB');
    }
    await assertDecodableReportCardSignatureImage(file.buffer);
    if (!this.fileStorage) {
      throw new ServiceUnavailableException('Signature file storage is not available');
    }

    const checksum = createHash('sha256').update(file.buffer).digest('hex');
    const extension = mimeType === 'image/png' ? 'png' : 'jpg';
    const storagePath = [
      'tenant',
      input.tenant_id,
      'exams',
      'report-card-signatures',
      input.signer_role,
      input.signer_user_id,
      `${Date.now()}-${checksum.slice(0, 16)}.${extension}`,
    ].join('/');
    const stored = await this.fileStorage.save({
      tenantId: input.tenant_id,
      storagePath,
      originalFileName: file.originalname,
      mimeType,
      sizeBytes: file.buffer.length,
      buffer: file.buffer,
      metadata: {
        owner_type: 'report_card_signature',
        owner_user_id: input.signer_user_id,
        signer_role: input.signer_role,
      },
      retentionPolicy: 'school-record',
    });
    const signature = await this.repository.upsertReportCardSignature({
      tenant_id: input.tenant_id,
      signer_user_id: input.signer_user_id,
      signer_role: input.signer_role,
      storage_path: stored.stored_path,
      original_file_name: stored.original_file_name,
      mime_type: mimeType,
      size_bytes: stored.size_bytes,
      checksum_sha256: stored.sha256,
      uploaded_by_user_id: input.signer_user_id,
    });

    await this.repository.appendReportCardAuditLog({
      tenant_id: input.tenant_id,
      action: 'report_card.signature_uploaded',
      actor_user_id: input.signer_user_id,
      metadata: {
        signer_role: input.signer_role,
        signature_id: signature?.id ?? null,
        checksum_sha256: stored.sha256,
        mime_type: stored.mime_type,
        size_bytes: stored.size_bytes,
      },
    });

    return this.reportCardSignatureStatus(signature, input.signer_role);
  }

  async getOwnedReportCardSignature(input: {
    tenant_id: string;
    signer_user_id: string;
    signer_role: ReportCardSignerRole;
  }) {
    this.assertOwnedReportCardSignatureScope(input);
    const signature = await this.repository.getReportCardSignature(input);
    return this.reportCardSignatureStatus(signature, input.signer_role);
  }

  async readOwnedReportCardSignature(input: {
    tenant_id: string;
    signer_user_id: string;
    signer_role: ReportCardSignerRole;
  }) {
    this.assertOwnedReportCardSignatureScope(input);
    if (!this.fileStorage) {
      throw new ServiceUnavailableException('Signature file storage is not available');
    }
    const signature = await this.repository.getReportCardSignature(input);
    const storagePath = typeof signature?.storage_path === 'string'
      ? signature.storage_path.trim()
      : '';
    if (!storagePath) {
      throw new NotFoundException('A report-card signature has not been uploaded');
    }

    try {
      return await this.fileStorage.readForTenant({
        tenantId: input.tenant_id,
        storagePath,
      });
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw new NotFoundException('The uploaded report-card signature could not be found');
      }
      throw error;
    }
  }

  private reportCardSignatureStatus(
    signature: Record<string, unknown> | null | undefined,
    signerRole: ReportCardSignerRole,
  ) {
    const available = Boolean(signature?.storage_path);
    const contentUrl = signerRole === 'principal'
      ? '/api/admin-command/principal/report-card-signature/content'
      : '/api/class-teacher/report-card-signature/content';

    return {
      available,
      signer_role: signerRole,
      content_url: available ? contentUrl : null,
      mime_type: available ? signature?.mime_type ?? null : null,
      size_bytes: available ? Number(signature?.size_bytes ?? 0) : 0,
      checksum_sha256: available ? signature?.checksum_sha256 ?? null : null,
      updated_at: available ? signature?.updated_at ?? null : null,
    };
  }

  private assertOwnedReportCardSignatureScope(input: {
    tenant_id: string;
    signer_user_id: string;
    signer_role: ReportCardSignerRole;
  }): void {
    const tenantId = this.requireTenantId();
    const userId = this.requireUserId();
    if (input.tenant_id !== tenantId || input.signer_user_id !== userId) {
      throw new ForbiddenException(
        'Report-card signatures can only be managed by their authenticated owner in the current school',
      );
    }

    const role = this.currentRole();
    const roleAllowed = input.signer_role === 'principal'
      ? PRINCIPAL_RELEASE_ROLES.has(role)
      : role === 'class_teacher' || role === 'teacher';
    if (!roleAllowed) {
      throw new ForbiddenException(
        `An active ${input.signer_role === 'principal' ? 'Principal' : 'class-teacher'} role is required to manage this signature`,
      );
    }
  }

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

  async getWorkflowOverview(query: Record<string, string | undefined> = {}) {
    this.assertExamWorkflowParticipant();
    const tenantId = this.requireTenantId();
    const requestedDepartmentId = this.optionalText(query.department_id);
    const departmentIds = await this.resolveDepartmentModerationScope(
      tenantId,
      requestedDepartmentId,
    );
    const data = await this.repository.getWorkflowOverview({
      tenant_id: tenantId,
      ...(departmentIds ? { department_ids: departmentIds } : {}),
      limit: this.parsePageLimit(query.limit, 25, 50),
    });
    const numberValue = (value: unknown): number => {
      const parsed = Number(value ?? 0);
      return Number.isFinite(parsed) ? parsed : 0;
    };

    const series = data.series.map((row: any) => {
      const counts = {
        assessments: numberValue(row.assessment_count),
        subjects: numberValue(row.subject_count),
        entry_windows: numberValue(row.entry_window_count),
        open_windows: numberValue(row.open_window_count),
        classes: numberValue(row.class_count),
        learners: numberValue(row.learner_count),
        marks: numberValue(row.total_marks),
        draft_marks: numberValue(row.draft_marks),
        submitted_marks: numberValue(row.submitted_marks),
        reviewed_marks: numberValue(row.reviewed_marks),
        locked_marks: numberValue(row.locked_marks),
        published_marks: numberValue(row.published_marks),
        report_cards: numberValue(row.total_report_cards),
        draft_report_cards: numberValue(row.draft_report_cards),
        review_report_cards: numberValue(row.review_report_cards),
        approved_report_cards: numberValue(row.approved_report_cards),
        published_report_cards: numberValue(row.published_report_cards),
        failed_generation_batches: numberValue(row.failed_generation_batches),
      };
      const finalizedMarks = counts.locked_marks + counts.published_marks;
      const unresolvedMarks = counts.draft_marks + counts.submitted_marks + counts.reviewed_marks;
      const finalizedCards = counts.approved_report_cards + counts.published_report_cards;
      let stage = 'setup';
      let nextOwner = 'Exams Manager';

      if (counts.draft_marks > 0) {
        stage = 'mark_entry';
        nextOwner = 'Teachers';
      } else if (counts.submitted_marks > 0) {
        stage = 'dean_review';
        nextOwner = 'Dean of Academics';
      } else if (counts.reviewed_marks > 0) {
        stage = 'dean_lock';
        nextOwner = 'Dean of Academics';
      } else if (counts.published_report_cards > 0 && counts.published_report_cards === counts.report_cards) {
        stage = 'released';
        nextOwner = 'Released';
      } else if (counts.approved_report_cards > 0 && finalizedCards === counts.report_cards) {
        stage = 'principal_release';
        nextOwner = 'Principal';
      } else if (counts.review_report_cards > 0) {
        stage = 'dean_approval';
        nextOwner = 'Dean of Academics';
      } else if (counts.draft_report_cards > 0) {
        stage = 'report_card_handoff';
        nextOwner = 'Exams Manager';
      } else if (finalizedMarks > 0 && unresolvedMarks === 0) {
        stage = 'report_card_generation';
        nextOwner = 'Exams Manager';
      } else if (counts.entry_windows > 0 || counts.marks > 0) {
        stage = 'mark_entry';
        nextOwner = 'Teachers';
      }

      const blockers: string[] = [];
      if (counts.assessments === 0) blockers.push('No assessments configured');
      if (counts.entry_windows === 0) blockers.push('No mark-entry windows opened');
      if (counts.draft_marks > 0) blockers.push(`${counts.draft_marks} draft marks need teacher submission`);
      if (counts.submitted_marks > 0) blockers.push(`${counts.submitted_marks} marks await Dean review`);
      if (counts.reviewed_marks > 0) blockers.push(`${counts.reviewed_marks} reviewed marks await Dean lock`);
      if (counts.failed_generation_batches > 0) blockers.push('A report-card generation batch needs retry');
      if (counts.draft_report_cards > 0) blockers.push(`${counts.draft_report_cards} report cards await Exams Manager handoff`);
      if (counts.review_report_cards > 0) blockers.push(`${counts.review_report_cards} report cards await Dean approval`);
      if (counts.approved_report_cards > 0) blockers.push(`${counts.approved_report_cards} report cards await Principal release`);

      return {
        id: row.id,
        name: row.name,
        status: row.status,
        academic_term_id: row.academic_term_id,
        term_name: row.term_name ?? 'Term not set',
        academic_year_name: row.academic_year_name ?? null,
        starts_on: row.starts_on,
        ends_on: row.ends_on,
        updated_at: row.report_cards_updated_at ?? row.marks_updated_at ?? row.updated_at,
        stage,
        next_owner: nextOwner,
        blockers,
        counts,
        can_generate_report_cards: counts.marks > 0 && finalizedMarks === counts.marks,
        can_submit_report_cards: counts.draft_report_cards > 0,
        can_approve_report_cards: counts.review_report_cards > 0,
        can_publish_report_cards: counts.report_cards > 0
          && counts.approved_report_cards > 0
          && finalizedCards === counts.report_cards,
      };
    });

    const moderationBatches = data.moderation_batches.map((row: any) => ({
      ...row,
      mark_ids: Array.isArray(row.mark_ids) ? row.mark_ids : [],
      mark_count: numberValue(row.mark_count),
      submitted_count: numberValue(row.submitted_count),
      reviewed_count: numberValue(row.reviewed_count),
      mean_score: row.mean_score == null ? null : numberValue(row.mean_score),
      highest_score: row.highest_score == null ? null : numberValue(row.highest_score),
      lowest_score: row.lowest_score == null ? null : numberValue(row.lowest_score),
    }));

    return {
      scope: {
        level: departmentIds ? 'department' : 'school',
        role: this.currentRole(),
        department_ids: departmentIds ?? [],
      },
      metrics: {
        exam_series: series.length,
        active_series: series.filter((item) => item.stage !== 'released').length,
        marks_awaiting_moderation: series.reduce((sum, item) => sum + item.counts.submitted_marks, 0),
        marks_awaiting_lock: series.reduce((sum, item) => sum + item.counts.reviewed_marks, 0),
        report_cards_to_generate: series.filter((item) => item.stage === 'report_card_generation').length,
        report_cards_awaiting_dean: series.reduce((sum, item) => sum + item.counts.review_report_cards, 0),
        report_cards_awaiting_principal: series.reduce((sum, item) => sum + item.counts.approved_report_cards, 0),
        report_cards_released: series.reduce((sum, item) => sum + item.counts.published_report_cards, 0),
      },
      series,
      moderation_batches: moderationBatches,
    };
  }

  async getAnalytics(query: Record<string, string | undefined> = {}) {
    const tenantId = this.requireTenantId();
    const role = this.currentRole();
    const hasSchoolWideScope = this.isExamWorkflowAdmin()
      || SCHOOL_WIDE_ACADEMIC_ANALYTICS_ROLES.has(role);
    const filters = parseAnalyticsFilters(query);
    const defaultLevel: ExamAnalyticsScopeLevel = hasSchoolWideScope
      ? 'school'
      : DEPARTMENT_ACADEMIC_ANALYTICS_ROLES.has(role)
        ? 'department'
        : ['hos', 'head_of_subject', 'subject_coordinator'].includes(role) ? 'subject'
          : ['grade_master', 'form_master', 'grade_form_master'].includes(role) ? 'grade'
            : role === 'class_teacher' ? 'class' : 'assignment';
    const level = filters.scope ?? defaultLevel;
    if (level === 'school' && !hasSchoolWideScope) {
      throw new ForbiddenException('Whole-school analytics requires a school leadership role.');
    }

    const result = await this.repository.getAnalytics(tenantId, {
      level,
      actor_user_id: this.requireUserId(),
      role,
    }, filters, hasSchoolWideScope);
    let canStartIntervention = false;
    try { this.assertAcademicInterventionCreateAllowed(true); canStartIntervention = true; } catch { /* Read-only academic experience. */ }
    return { ...result, capabilities: { can_start_intervention: canStartIntervention } };
  }

  async listAcademicInterventions(query: Record<string, string | undefined> = {}) {
    this.assertAcademicInterventionReadAllowed();
    const tenantId = this.requireTenantId();
    const role = this.currentRole();
    const statuses = this.parseAcademicInterventionStatuses(query.status);
    const ownerUserId = ACADEMIC_INTERVENTION_OWNER_ROLES.has(role)
      ? this.requireUserId()
      : this.optionalText(query.owner_user_id);
    const hodUserId = ACADEMIC_INTERVENTION_HOD_ROLES.has(role)
      ? this.requireUserId()
      : this.optionalText(query.hod_user_id);

    return this.repository.listAcademicInterventions({
      tenant_id: tenantId,
      statuses,
      student_id: this.optionalText(query.student_id),
      owner_user_id: ownerUserId,
      hod_user_id: hodUserId,
      limit: this.parsePageLimit(query.limit, 100, 250),
    });
  }

  async createAcademicIntervention(dto: CreateAcademicInterventionDto) {
    this.assertAcademicInterventionCreateAllowed(Boolean(dto.analytics_scope));
    if (this.currentRole() === 'head_of_subject' && dto.analytics_scope !== 'subject') {
      throw new ForbiddenException('Head of Subject interventions require an active subject appointment.');
    }
    const tenantId = this.requireTenantId();
    const actorUserId = this.requireUserId();
    const triggerReason = this.requireText(dto.trigger_reason, 'Intervention reason');
    const plan = this.requireText(dto.plan, 'Intervention plan');
    const startsOn = this.optionalDate(dto.starts_on, 'Intervention start date');
    const dueOn = this.optionalDate(dto.due_on, 'Intervention review date');
    if (startsOn && dueOn && dueOn < startsOn) {
      throw new BadRequestException('Intervention review date cannot be before its start date');
    }

    const scope = await this.repository.resolveAcademicInterventionScope({
      tenant_id: tenantId,
      student_id: this.optionalText(dto.student_id),
      exam_series_id: this.optionalText(dto.exam_series_id),
      subject_id: this.optionalText(dto.subject_id),
      subject_name: this.optionalText(dto.subject_name),
      class_section_id: this.optionalText(dto.class_section_id),
      class_name: this.optionalText(dto.class_name),
      owner_user_id: this.optionalText(dto.owner_user_id),
      owner_name: this.optionalText(dto.owner_name),
      hod_user_id: this.optionalText(dto.hod_user_id),
    });
    this.assertResolvedAcademicInterventionScope(dto, scope);

    const studentId = textValue(scope?.student_id);
    const classSectionId = textValue(scope?.class_section_id);
    const subjectId = textValue(scope?.subject_id);
    let analyticsAuthorized = false;
    let analyticsBaseline: Record<string, unknown> | undefined;
    if (dto.analytics_scope) {
      if (!studentId || !classSectionId || !subjectId || !dto.exam_series_id) {
        throw new BadRequestException('Select an exam, learner, class and subject from academic intelligence.');
      }
      const analytics = await this.getAnalytics({scope: dto.analytics_scope, exam_series_id: dto.exam_series_id,
        student_id: studentId, class_section_id: classSectionId, subject_id: subjectId});
      analyticsAuthorized = analytics.learners.items.some(learner => learner.student_id === studentId
        && learner.class_section_id === classSectionId && learner.subjects.some(subject => subject.subject_id === subjectId));
      if (!analyticsAuthorized) throw new ForbiddenException('The selected learner and subject are outside your academic appointment.');
      const learner = analytics.learners.items.find(item => item.student_id === studentId)!;
      analyticsBaseline = { average: learner.subjects.find(item => item.subject_id === subjectId)!.average,
        exam_series_id: analytics.filters.exam_series_id, risk: learner.risk.level };
    }
    if (!studentId && !classSectionId && !subjectId) {
      throw new BadRequestException(
        'Select a learner, class, or subject from this school before creating an intervention',
      );
    }
    if (ACADEMIC_INTERVENTION_OWNER_ROLES.has(this.currentRole()) && !analyticsAuthorized) {
      if (!classSectionId && !subjectId) {
        throw new BadRequestException(
          'Teachers must select an assigned class or subject before creating an intervention',
        );
      }
      const assigned = await this.repository.canStaffManageAcademicInterventionScope({
        tenant_id: tenantId,
        user_id: actorUserId,
        class_section_id: classSectionId,
        subject_id: subjectId,
      });
      if (!assigned) {
        throw new ForbiddenException(
          'This class or subject is not assigned to the current teacher in this school',
        );
      }
    }

    const intervention = await this.repository.createAcademicIntervention({
      tenant_id: tenantId,
      student_id: studentId,
      exam_series_id: textValue(scope?.exam_series_id),
      subject_id: subjectId,
      class_section_id: classSectionId,
      scope_type: studentId
        ? 'student'
        : classSectionId && subjectId
          ? 'class_subject'
          : classSectionId
            ? 'class'
            : 'subject',
      source: dto.source ?? 'manual',
      trigger_reason: triggerReason,
      baseline: analyticsBaseline ?? this.recordValue(dto.baseline),
      plan,
      target: this.recordValue(dto.target),
      owner_user_id: textValue(scope?.owner_user_id),
      hod_user_id: textValue(scope?.hod_user_id),
      priority: dto.priority ?? 'normal',
      starts_on: startsOn,
      due_on: dueOn,
      actor_user_id: actorUserId,
    });
    if (!intervention) {
      throw new ConflictException('Academic intervention could not be created');
    }

    await this.recordAcademicInterventionOperation({
      tenantId,
      actorUserId,
      intervention,
      eventType: 'academic_intervention.created',
      title: 'Academic intervention created',
      body: `${scope?.student_name ?? scope?.class_name ?? scope?.subject_name ?? 'Academic scope'} now has a governed follow-up plan.`,
      priority: dto.priority ?? 'normal',
      createOwnerTask: true,
    });

    return {
      success: true,
      message: 'Academic intervention created and assigned',
      data: {
        ...intervention,
        student_name: scope?.student_name ?? null,
        class_name: scope?.class_name ?? null,
        subject_name: scope?.subject_name ?? null,
        owner_name: scope?.owner_name ?? null,
        hod_name: scope?.hod_name ?? null,
      },
    };
  }

  async addAcademicInterventionUpdate(
    interventionIdValue: string,
    dto: AddAcademicInterventionUpdateDto,
  ) {
    this.assertAcademicInterventionReadAllowed();
    const tenantId = this.requireTenantId();
    const actorUserId = this.requireUserId();
    const interventionId = this.requireText(interventionIdValue, 'Academic intervention');
    const existing = await this.repository.findAcademicIntervention({
      tenant_id: tenantId,
      intervention_id: interventionId,
    });
    if (!existing) {
      throw new NotFoundException('Academic intervention was not found for this school');
    }
    this.assertAcademicInterventionUpdateAllowed(existing, actorUserId);

    const nextStatus = this.optionalText(dto.status);
    if (nextStatus && !ACADEMIC_INTERVENTION_STATUS_SET.has(nextStatus)) {
      throw new BadRequestException('Unsupported academic intervention status');
    }
    if (
      nextStatus
      && !ACADEMIC_INTERVENTION_TRANSITIONS[String(existing.status)]?.has(nextStatus)
    ) {
      throw new ConflictException(
        `Academic intervention cannot move from ${existing.status} to ${nextStatus}`,
      );
    }
    const outcome = this.recordValue(dto.outcome);
    if (nextStatus === 'completed' && Object.keys(outcome).length === 0) {
      throw new BadRequestException(
        'A measured outcome is required before completing an academic intervention',
      );
    }
    const evidence = this.normalizeAcademicInterventionEvidence(dto.score, dto.score_status);
    const notes = this.requireText(dto.notes, 'Progress notes');

    const updated = await this.repository.addAcademicInterventionUpdate({
      tenant_id: tenantId,
      intervention_id: interventionId,
      actor_user_id: actorUserId,
      update_type: dto.update_type ?? (nextStatus ? 'status_change' : 'progress'),
      notes,
      score: evidence.score,
      score_status: evidence.score_status,
      metadata: this.recordValue(dto.metadata),
      status: nextStatus,
      outcome: Object.keys(outcome).length > 0 ? outcome : null,
    });
    if (!updated) {
      throw new NotFoundException('Academic intervention was not found for this school');
    }

    const eventType = nextStatus === 'completed'
      ? 'academic_intervention.completed'
      : nextStatus === 'monitoring'
        ? 'academic_intervention.reviewed'
        : 'academic_intervention.updated';
    await this.recordAcademicInterventionOperation({
      tenantId,
      actorUserId,
      intervention: updated,
      eventType,
      title: nextStatus === 'completed'
        ? 'Academic intervention completed'
        : 'Academic intervention updated',
      body: notes,
      priority: updated.priority ?? 'normal',
    });

    return {
      success: true,
      message: nextStatus === 'completed'
        ? 'Intervention completed with measured outcome'
        : 'Intervention progress saved',
      data: updated,
    };
  }

  async notifyAcademicInterventionHod(interventionIdValue: string, messageValue?: string) {
    this.assertAcademicInterventionCreateAllowed();
    const tenantId = this.requireTenantId();
    const actorUserId = this.requireUserId();
    const interventionId = this.requireText(interventionIdValue, 'Academic intervention');
    const intervention = await this.repository.findAcademicIntervention({
      tenant_id: tenantId,
      intervention_id: interventionId,
    });
    if (!intervention) {
      throw new NotFoundException('Academic intervention was not found for this school');
    }
    if (!intervention.hod_user_id) {
      throw new ConflictException(
        'No active HOD is assigned to this intervention subject. Assign the department HOD first.',
      );
    }
    const recipients = await this.repository.listAcademicInterventionRecipients({
      tenant_id: tenantId,
      intervention_id: interventionId,
    });
    const hod = recipients.find(
      (recipient: any) => String(recipient.user_id) === String(intervention.hod_user_id),
    );
    if (!hod) {
      throw new ConflictException('The assigned HOD is not an active staff member in this school');
    }
    const message = this.optionalText(messageValue)
      ?? `Review the academic intervention: ${intervention.trigger_reason}`;

    await this.repository.addAcademicInterventionUpdate({
      tenant_id: tenantId,
      intervention_id: interventionId,
      actor_user_id: actorUserId,
      update_type: 'note',
      notes: `HOD notified: ${message}`,
      metadata: { notification_type: 'hod_follow_up', recipient_user_id: hod.user_id },
    });
    await this.workflowRepository?.createNotification({
      tenant_id: tenantId,
      notification_key: `academic-intervention-hod:${interventionId}:${intervention.updated_at}`,
      recipient_user_id: String(hod.user_id),
      type: 'academic_intervention.review_due',
      title: 'Academic intervention needs HOD follow-up',
      body: message,
      priority: intervention.priority ?? 'high',
      source_module: 'exams',
      source_record_id: interventionId,
      metadata: { academic_intervention_id: interventionId },
    });
    await this.recordAcademicInterventionOperation({
      tenantId,
      actorUserId,
      intervention,
      eventType: 'academic_intervention.review_due',
      title: 'HOD follow-up requested',
      body: message,
      priority: intervention.priority ?? 'high',
    });

    return {
      success: true,
      message: `Follow-up sent to ${hod.display_name ?? 'the assigned HOD'}`,
      data: { intervention_id: interventionId, recipient_user_id: hod.user_id },
    };
  }

  async createSeries(dto: CreateExamSeriesDto) {
    const startsOn = this.optionalDate(this.requireText(dto.starts_on, 'Exam start date'), 'Exam start date');
    const endsOn = this.optionalDate(this.requireText(dto.ends_on, 'Exam end date'), 'Exam end date');
    if (!startsOn || !endsOn || startsOn > endsOn) {
      throw new BadRequestException('Exam end date must be on or after the start date');
    }
    const series = await this.repository.createSeries({
      tenant_id: this.requireTenantId(),
      created_by_user_id: this.requireUserId(),
      academic_term_id: this.requireText(dto.academic_term_id, 'Academic term'),
      name: this.requireText(dto.name, 'Exam series name'),
      starts_on: startsOn,
      ends_on: endsOn,
    });
    if (!series) {
      throw new NotFoundException('Active academic term was not found in this school or the exam dates fall outside it');
    }
    await this.schoolEvents?.recordSchoolOperation({
      event: {
        id: String(series.id),
        type: 'exam.series_created',
        module: 'exams',
        actorRole: this.currentRole(),
        title: 'Exam series created',
        body: `${series.name} was scheduled for ${startsOn} to ${endsOn}.`,
        entityId: String(series.id),
        severity: 'info',
        payload: {
          exam_series_id: String(series.id),
          academic_term_id: String(series.academic_term_id),
          starts_on: startsOn,
          ends_on: endsOn,
        },
      },
      notifications: [],
    });
    return series;
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

  async saveTeacherMarkEntries(
    rowsValue: BulkExamMarkUploadRowDto[],
    sourceWindowIdValue: string,
    submit = false,
  ) {
    const tenantId = this.requireTenantId();
    const actorUserId = this.requireUserId();
    const sourceWindowId = this.requireText(sourceWindowIdValue, 'Mark-entry window');
    const rows = this.requireBulkRows(rowsValue);
    const seenKeys = new Set<string>();
    const validationErrors: Array<{
      row_number: number;
      student_id: string | null;
      message: string;
    }> = [];
    const validEntries: Array<{ row_number: number; entry: ValidatedMarkEntry }> = [];
    let expectedScope: string | null = null;

    for (const [index, row] of rows.entries()) {
      const rowNumber = Number.isInteger(row.row_number) && Number(row.row_number) > 0
        ? Number(row.row_number)
        : index + 1;

      try {
        const normalized = this.normalizeBulkMarkRow(row);
        const duplicateKey = this.bulkMarkDuplicateKey(normalized);
        if (seenKeys.has(duplicateKey)) {
          throw new BadRequestException('Duplicate learner entry in this mark sheet');
        }
        seenKeys.add(duplicateKey);

        const scope = [
          normalized.exam_series_id,
          normalized.assessment_id,
          normalized.academic_term_id,
          normalized.class_section_id,
          normalized.subject_id,
        ].join(':');
        expectedScope ??= scope;
        if (scope !== expectedScope) {
          throw new BadRequestException(
            'All rows in an interactive mark sheet must use the same exam, assessment, term, class, and subject',
          );
        }

        const entry = await this.validateMarkEntry(normalized, tenantId, actorUserId);
        validEntries.push({ row_number: rowNumber, entry });
      } catch (error) {
        validationErrors.push({
          row_number: rowNumber,
          student_id: typeof row.student_id === 'string' ? row.student_id : null,
          message: errorMessage(error),
        });
      }
    }

    if (validationErrors.length > 0) {
      throw new BadRequestException({
        message: 'Mark sheet contains invalid learner entries',
        errors: validationErrors,
      });
    }

    const result = await this.repository.saveTeacherMarkSheet({
      tenant_id: tenantId,
      actor_user_id: actorUserId,
      source_window_id: sourceWindowId,
      submit,
      rows: validEntries.map(({ row_number, entry }) => ({
        row_number,
        exam_series_id: entry.dto.exam_series_id,
        assessment_id: entry.dto.assessment_id,
        academic_term_id: entry.dto.academic_term_id,
        class_section_id: entry.dto.class_section_id,
        subject_id: entry.dto.subject_id,
        student_id: entry.dto.student_id,
        score: entry.score,
        score_status: entry.score_status,
        remarks: entry.dto.remarks?.trim() || null,
      })),
    });

    await this.schoolEvents?.recordSchoolOperation({ event: {
      id: `teacher-mark-sheet-${submit ? 'submitted' : 'saved'}-${sourceWindowId}-${Date.now()}`,
      type: submit ? 'exam.marks_submitted' : 'exam.mark_sheet_saved',
      module: 'exams',
      actorRole: this.requestContext.getStore()?.role || 'teacher',
      title: submit ? 'Marks Submitted' : 'Mark Sheet Draft Saved',
      body: submit
        ? `${result.submitted_count} learner mark entr${result.submitted_count === 1 ? 'y' : 'ies'} submitted for review.`
        : `${result.saved_count} learner mark entr${result.saved_count === 1 ? 'y' : 'ies'} saved as a draft.`,
      entityId: sourceWindowId,
      severity: 'info',
      payload: {
        source_window_id: sourceWindowId,
        saved_count: result.saved_count,
        submitted_count: result.submitted_count,
        mark_ids: result.mark_ids,
      },
    }, notifications: submit && Number(result.submitted_count) > 0 ? this.deanMarkSubmissionNotification(tenantId) : [] });

    return {
      success: true,
      message: submit ? 'Marks submitted for review' : 'Mark sheet draft saved',
      data: result,
    };
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
        score_status: 'entered',
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
          score_status: entry.score_status,
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
    if (!this.canApproveExamCorrections()) {
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
      restrict_to_actor: !this.isExamsOfficer(),
    });

    if (Number(result.submitted_count) === 0) {
      throw new ForbiddenException('No selected marks were available for this user to submit in this school');
    }

    await this.schoolEvents?.recordSchoolOperation({ event: {
      id: `marks-submitted-${createHash('sha256').update(`${tenantId}:${actorUserId}:${markIds.join(',')}`).digest('hex').slice(0, 24)}`,
      type: 'exam.marks_submitted',
      module: 'exams',
      actorRole: this.requestContext.getStore()?.role || 'teacher',
      title: 'Marks Submitted',
      body: `${result.submitted_count} mark row${result.submitted_count === 1 ? '' : 's'} submitted for review.`,
      severity: result.submitted_count === markIds.length ? 'info' : 'warning',
      payload: { requested_count: markIds.length, submitted_count: result.submitted_count, mark_ids: result.mark_ids },
    }, notifications: this.deanMarkSubmissionNotification(tenantId) });

    return { success: true, message: 'Marks submitted for review', data: result };
  }

  async correctLockedMark(dto: CorrectLockedExamMarkDto) {
    if (!this.canApproveExamCorrections()) {
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

    const scoreEvidence = this.normalizeScoreEvidence(dto.score, dto.score_status);
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
      score: scoreEvidence.score,
      score_status: scoreEvidence.score_status,
      actor_user_id: actorUserId,
    });

    await this.createMarkVersionIfSupported({
      tenant_id: tenantId,
      mark_id: dto.mark_id,
      original_score: existing.score,
      original_score_status: existing.score_status ?? 'entered',
      correction_score: scoreEvidence.score,
      correction_score_status: scoreEvidence.score_status,
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
      new_score: scoreEvidence.score,
      reason,
      metadata: {
        correction: true,
        previous_score_status: existing.score_status ?? 'entered',
        new_score_status: scoreEvidence.score_status,
        published_report_card_ids: publishedReportCards.map((card) => card.id),
      },
    });

    return corrected;
  }

  async publishReportCard(dto: PublishReportCardDto) {
    this.assertReportCardTransitionAllowed('publish');

    const tenantId = this.requireTenantId();
    const actorUserId = this.requireUserId();
    const actorRole = this.currentRole();
    const examSeriesId = this.requireText(dto.exam_series_id, 'Exam series');
    const studentId = this.requireText(dto.student_id, 'Student');
    const reportSnapshotId = this.requireText(dto.report_snapshot_id, 'Report snapshot');
    const approvedReportCard = await this.repository.findGeneratedReportCardForPublication({
      tenant_id: tenantId,
      exam_series_id: examSeriesId,
      student_id: studentId,
      report_snapshot_id: reportSnapshotId,
    });

    if (!approvedReportCard) {
      throw new ConflictException('An approved generated report card is required before publication');
    }

    const reportCard = await this.repository.transitionReportCard({
      tenant_id: tenantId,
      actor_user_id: actorUserId,
      actor_role: actorRole,
      report_card_id: String(approvedReportCard.id),
      action: 'publish',
    });

    if (!reportCard) {
      throw new ConflictException('Report card was not found for this school or is not ready to publish');
    }

    try {
      await this.eventPublisher?.publishReportCardPublished({
        tenant_id: tenantId,
        report_id: reportCard.id,
        student_id: studentId,
        exam_id: examSeriesId,
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

  async regenerateReportCard(dto: RegenerateReportCardDto) {
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

  listReportCardGenerationScopes() {
    if (!this.isExamsOfficer()) {
      throw new ForbiddenException('Exam approval permission is required to generate report cards');
    }
    return this.repository.listReportCardGenerationScopes({ tenant_id: this.requireTenantId() });
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
    this.assertExamWorkflowParticipant();
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

  listScopedReportCards(query: Record<string, string | undefined> = {}) {
    this.assertExamWorkflowParticipant();
    const tenantId = this.requireTenantId();
    const statuses = query.status?.split(',').map((s) => s.trim()).filter(Boolean);
    const studentIds = query.student_ids?.split(',').map((s) => s.trim()).filter(Boolean);
    return this.repository.listScopedReportCards({
      tenant_id: tenantId,
      exam_series_id: this.optionalText(query.exam_series_id),
      class_section_id: this.optionalText(query.class_section_id),
      stream_id: this.optionalText(query.stream_id),
      student_ids: studentIds?.length ? studentIds : undefined,
      status_in: statuses?.length ? statuses : undefined,
      limit: this.parsePageLimit(query.limit, 50, 200),
      offset: this.parsePageOffset(query.offset),
    });
  }

  async getReportCardScopeSummary(query: Record<string, string | undefined> = {}) {
    this.assertExamWorkflowParticipant();
    const tenantId = this.requireTenantId();
    const studentIds = query.student_ids?.split(',').map((s) => s.trim()).filter(Boolean);
    return this.repository.getReportCardScopeSummary({
      tenant_id: tenantId,
      exam_series_id: this.optionalText(query.exam_series_id),
      class_section_id: this.optionalText(query.class_section_id),
      stream_id: this.optionalText(query.stream_id),
      student_ids: studentIds?.length ? studentIds : undefined,
      target_action: this.optionalText(query.target_action),
    });
  }

  async getReportCardScopeHierarchy(query: Record<string, string | undefined> = {}) {
    this.assertExamWorkflowParticipant();
    return this.repository.getReportCardScopeHierarchy({
      tenant_id: this.requireTenantId(),
      exam_series_id: this.optionalText(query.exam_series_id),
    });
  }

  async bulkTransitionReportCards(dto: {
    action: string;
    reason?: string;
    exam_series_id?: string;
    class_section_id?: string;
    stream_id?: string;
    student_ids?: string[];
    report_card_ids?: string[];
  }) {
    const action = dto.action;
    this.assertReportCardTransitionAllowed(action);
    const tenantId = this.requireTenantId();
    const actorUserId = this.requireUserId();
    const actorRole = this.currentRole();

    if ((action === 'recall' || action === 'unpublish') && !dto.reason?.trim()) {
      throw new BadRequestException(
        `A ${action === 'recall' ? 'correction' : 'withdrawal'} reason is required for bulk ${action}`,
      );
    }

    const result = await this.repository.bulkTransitionReportCards({
      tenant_id: tenantId,
      actor_user_id: actorUserId,
      actor_role: actorRole,
      action,
      reason: dto.reason?.trim() || undefined,
      exam_series_id: dto.exam_series_id?.trim() || undefined,
      class_section_id: dto.class_section_id?.trim() || undefined,
      stream_id: dto.stream_id?.trim() || undefined,
      student_ids: dto.student_ids?.filter(Boolean),
      report_card_ids: dto.report_card_ids?.filter(Boolean),
    });

    if (result.updated_count === 0 && result.eligible_count === 0) {
      throw new ConflictException(
        `No report cards in the selected scope are eligible for ${action}`,
      );
    }

    if (this.schoolEvents && result.updated_count > 0) {
      try {
        await this.schoolEvents.recordSchoolOperation({
          event: {
            id: `bulk-report-card-${action}-${Date.now()}`,
            type: `report_card.bulk_${action}`,
            module: 'exams',
            actorRole,
            title: `Bulk report card ${action}`,
            body: `${result.updated_count} report card(s) ${action === 'submit' ? 'submitted' : action === 'approve' ? 'approved' : action === 'recall' ? 'recalled' : action === 'publish' ? 'published' : 'withdrawn'}.`,
            severity: action === 'unpublish' || action === 'recall' ? 'warning' : 'info',
            payload: {
              action,
              updated_count: result.updated_count,
              total_in_scope: result.total_in_scope,
              reason: dto.reason ?? null,
            },
          },
          notifications: [],
        });
      } catch (error) {
        this.logger.error(
          `Bulk report card ${action} notification failed`,
          error instanceof Error ? error.stack : String(error),
        );
      }
    }

    if (action === 'publish' && this.eventPublisher && result.updated.length > 0) {
      for (const card of result.updated) {
        try {
          await this.eventPublisher.publishReportCardPublished({
            tenant_id: tenantId,
            report_id: card.id,
            student_id: card.student_id,
            exam_id: card.exam_series_id,
            published_by_user_id: actorUserId,
          });
        } catch (error) {
          this.logger.error(
            `Report card ${card.id} publication event failed during bulk publish`,
            error instanceof Error ? error.stack : String(error),
          );
        }
      }
    }

    return {
      success: true,
      action,
      message: `${result.updated_count} report card(s) ${action === 'submit' ? 'submitted' : action === 'approve' ? 'approved' : action === 'recall' ? 'recalled' : action === 'publish' ? 'published' : 'withdrawn'}`,
      updated_count: result.updated_count,
      eligible_count: result.eligible_count,
      total_in_scope: result.total_in_scope,
      skipped_count: result.skipped_count,
      updated: result.updated,
    };
  }

  async bulkDownloadReportCards(query: Record<string, string | undefined> = {}) {
    this.assertExamWorkflowParticipant();
    const tenantId = this.requireTenantId();
    const studentIds = query.student_ids?.split(',').map((s) => s.trim()).filter(Boolean);
    const reportCardIds = query.report_card_ids?.split(',').map((s) => s.trim()).filter(Boolean);

    const cards = await this.repository.listReportCardIdsForBulkDownload({
      tenant_id: tenantId,
      exam_series_id: this.optionalText(query.exam_series_id),
      class_section_id: this.optionalText(query.class_section_id),
      stream_id: this.optionalText(query.stream_id),
      student_ids: studentIds?.length ? studentIds : undefined,
      report_card_ids: reportCardIds?.length ? reportCardIds : undefined,
      limit: this.parsePageLimit(query.limit, 500, 500),
    });

    if (!cards.length) {
      throw new NotFoundException('No report cards found in the selected scope for download');
    }

    return cards;
  }

  listGuardianReportCards(query: Record<string, string | undefined> = {}) {
    return this.repository.listGuardianReportCards({
      tenant_id: this.requireTenantId(),
      guardian_user_id: this.requireUserId(),
      student_id: this.optionalText(query.student_id ?? query.studentId),
      limit: this.parsePageLimit(query.limit, 25, 50),
      offset: this.parsePageOffset(query.offset),
    });
  }

  listStudentPortalReportCards(query: Record<string, string | undefined> = {}) {
    return this.repository.listStudentReportCards({
      tenant_id: this.requireTenantId(),
      student_id: this.requireUserId(),
      limit: this.parsePageLimit(query.limit, 25, 50),
      offset: this.parsePageOffset(query.offset),
    });
  }

  async transitionReportCard(reportCardIdValue: string, actionValue?: string, reasonValue?: string) {
    const tenantId = this.requireTenantId();
    const actorUserId = this.requireUserId();
    const actorRole = this.currentRole();
    const reportCardId = this.requireText(reportCardIdValue, 'Report card');
    const action = this.requireText(actionValue, 'Report-card action').toLowerCase();
    if (!REPORT_CARD_TRANSITION_ACTIONS.has(action)) {
      throw new BadRequestException('Unsupported report-card transition');
    }
    this.assertReportCardTransitionAllowed(action);
    const reason = action === 'recall' || action === 'unpublish'
      ? this.requireText(reasonValue, `${action === 'recall' ? 'Recall' : 'Withdrawal'} reason`)
      : this.optionalText(reasonValue);
    const result = await this.repository.transitionReportCard({
      tenant_id: tenantId,
      actor_user_id: actorUserId,
      actor_role: actorRole,
      report_card_id: reportCardId,
      action,
      ...(reason ? { reason } : {}),
    });
    if (!result) {
      throw new ConflictException(`Report card was not found for this school or is not ready to ${action}`);
    }
    const deliveryWarnings: string[] = [];
    if (action === 'publish' && this.eventPublisher) {
      try {
        await this.eventPublisher.publishReportCardPublished({
          tenant_id: tenantId,
          report_id: result.id,
          student_id: result.student_id,
          exam_id: result.exam_series_id,
          published_by_user_id: actorUserId,
        });
      } catch (error) {
        deliveryWarnings.push('grade publication event');
        this.logger.error(
          `Report card ${result.id} was published, but its grade publication event could not be delivered`,
          error instanceof Error ? error.stack : String(error),
        );
      }
    }
    if (this.schoolEvents) {
      try {
        await this.schoolEvents.recordSchoolOperation({ event: {
          id: `report-card-transition-${result.id}-${String(result.updated_at)}`,
          type: `report_card.${action === 'unpublish' ? 'withdrawn' : action}`,
          module: 'exams',
          actorRole,
          title: `Report Card ${action.charAt(0).toUpperCase()}${action.slice(1)}`,
          body: `Report card ${result.id} moved to ${result.status}.`,
          entityId: result.id,
          severity: action === 'unpublish' || action === 'recall' ? 'warning' : 'info',
          payload: {
            report_card_id: result.id,
            student_id: result.student_id,
            exam_series_id: result.exam_series_id,
            status: result.status,
            workflow_version: result.workflow_version,
            reason: reason ?? null,
          },
        }, notifications: this.reportCardTransitionNotifications({
          action,
          tenant_id: tenantId,
          report_card_id: result.id,
          exam_series_id: result.exam_series_id,
          student_id: result.student_id,
        })});
      } catch (error) {
        deliveryWarnings.push('school workflow notification');
        this.logger.error(
          `Report card ${result.id} moved to ${result.status}, but its school workflow notification could not be delivered`,
          error instanceof Error ? error.stack : String(error),
        );
      }
    }
    if (deliveryWarnings.length) {
      try {
        await this.repository.appendReportCardAuditLog({
          tenant_id: tenantId,
          report_card_id: result.id,
          exam_series_id: result.exam_series_id,
          student_id: result.student_id,
          action: 'report_card.delivery_failed',
          actor_user_id: actorUserId,
          metadata: {
            transition_action: action,
            resulting_status: result.status,
            failed_deliveries: deliveryWarnings,
          },
        });
      } catch (error) {
        this.logger.error(
          `Report card ${result.id} delivery failure could not be added to the audit log`,
          error instanceof Error ? error.stack : String(error),
        );
      }
    }
    return {
      success: true,
      message: deliveryWarnings.length
        ? `Report card ${action} completed, but ${deliveryWarnings.join(' and ')} delivery failed and was recorded for operations review`
        : `Report card ${action} completed`,
      data: result,
      ...(deliveryWarnings.length ? { delivery_warnings: deliveryWarnings } : {}),
    };
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
      throw new ConflictException(
        'Report card was not found for this school or its submitted snapshot is immutable',
      );
    }
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

  async getDepartmentMarks(query: Record<string, string | undefined>) {
    this.assertExamWorkflowParticipant();
    const tenantId = this.requireTenantId();
    const departmentId = this.optionalText(query.department_id);
    const departmentIds = await this.resolveDepartmentModerationScope(tenantId, departmentId);

    return this.repository.listMarks({
      tenant_id: tenantId,
      ...(departmentIds ? { department_ids: departmentIds } : {}),
      ...(!departmentIds && departmentId ? { department_id: departmentId } : {}),
      status_in: ['submitted', 'reviewed'],
      limit: this.parsePageLimit(query.limit, 25, 50),
      offset: this.parsePageOffset(query.offset),
    });
  }

  async moderateMarks(dto: ModerateExamMarksDto) {
    if (!this.canReviewExamMarks()) {
      throw new ForbiddenException('Exam review permission is required to moderate marks');
    }

    const tenantId = this.requireTenantId();
    const actorUserId = this.requireUserId();
    const action = dto.action;
    if (action !== 'approve' && action !== 'return_for_correction') {
      throw new BadRequestException('Moderation action must be approve or return_for_correction');
    }

    const markIds = [...new Set((dto.mark_ids ?? []).filter((id) => typeof id === 'string' && id.trim()).map((id) => id.trim()))];
    if (markIds.length === 0 || markIds.length > 500) {
      throw new BadRequestException('Provide between 1 and 500 mark IDs');
    }

    const reason = action === 'return_for_correction'
      ? this.requireText(dto.reason, 'Reason')
      : undefined;
    const departmentIds = await this.resolveDepartmentModerationScope(tenantId);
    
    const updatedMarks = await this.repository.moderateMarks({
      tenant_id: tenantId,
      mark_ids: markIds,
      action,
      actor_user_id: actorUserId,
      department_ids: departmentIds,
      ...(reason ? { reason } : {}),
    });

    if (updatedMarks.length === 0) {
      throw new ConflictException('No selected marks were available for moderation in this school');
    }
    
    if (action === 'return_for_correction') {
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
    
    await this.schoolEvents?.recordSchoolOperation({
      event: {
        id: `marks-${action}-${randomUUID()}`, type: action === 'approve' ? 'exam.marks_reviewed' : 'exam.marks_returned',
        module: 'exams', title: action === 'approve' ? 'Marks reviewed by Dean' : 'Marks returned for correction',
        body: `${updatedMarks.length} marks ${action === 'approve' ? 'reviewed and ready for locking' : 'returned for teacher correction'}.`,
        payload: { mark_ids: updatedMarks.map(mark => mark.id), action, reason: reason ?? null, actor_user_id: actorUserId },
      },
      notifications: action === 'approve' ? [] : [...new Set(updatedMarks.map(mark => mark.entered_by_user_id).filter(Boolean))].map(userId => ({
        id: `marks-returned-${randomUUID()}`, schoolId: tenantId, audienceRoles: ['teacher'], recipientUserId: String(userId),
        title: 'Marks need correction', body: reason, sourceModule: 'exams', actionUrl: '/school/teacher/exams-marks', priority: 'high',
      })),
    });
    return { success: true, updated_count: updatedMarks.length };
  }

  getSchoolMarks(query: Record<string, string | undefined>) {
    this.assertExamWorkflowParticipant();
    return this.repository.listMarks({
      tenant_id: this.requireTenantId(),
      status_in: ['reviewed'],
      limit: this.parsePageLimit(query.limit, 25, 50),
      offset: this.parsePageOffset(query.offset),
    });
  }

  async lockMarks(dto: LockExamMarksDto) {
    this.assertExamWorkflowParticipant();
    if (!this.canApproveExamCorrections()) throw new ForbiddenException('Dean authorization is required to lock reviewed marks');
    const tenantId = this.requireTenantId();
    const actorUserId = this.requireUserId();
    const updatedMarks = await this.repository.lockMarks({
      tenant_id: tenantId,
      mark_ids: dto.mark_ids,
      actor_user_id: actorUserId,
    });
    if (!updatedMarks.length) throw new ConflictException('No selected reviewed marks were available to lock in this school');
    await this.schoolEvents?.recordSchoolOperation({ event: {
      id: `marks-locked-${randomUUID()}`, type: 'exam.marks_locked', module: 'exams',
      title: 'Reviewed marks locked', body: `${updatedMarks.length} reviewed marks are ready for report-card generation.`,
      payload: { mark_ids: updatedMarks.map(mark => mark.id), actor_user_id: actorUserId },
    }, notifications: [{ id: `marks-ready-${randomUUID()}`, schoolId: tenantId, audienceRoles: ['exams-manager'],
      title: 'Marks ready for report cards', body: 'The Dean locked reviewed marks. Open report cards to generate the completed mark sheets.',
      sourceModule: 'exams', actionUrl: '/school/exams-manager/report-cards', priority: 'normal' }] });
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
    this.assertReportCardTransitionAllowed('publish');
    const tenantId = this.requireTenantId();
    const actorUserId = this.requireUserId();
    const actorRole = this.currentRole();
    const normalizedExamSeriesId = this.requireText(examSeriesId, 'Exam series');

    const readiness = await this.getExamReadiness(normalizedExamSeriesId);
    if (!readiness.ready) {
      throw new BadRequestException(`Cannot publish exam series. Issues: ${readiness.issues.join(', ')}`);
    }

    const release = await this.repository.publishExamSeries({
      tenant_id: tenantId,
      exam_series_id: normalizedExamSeriesId,
      actor_user_id: actorUserId,
      actor_role: actorRole,
    });
    const totalReportCards = Number(release?.total_count ?? 0);
    const blockedReportCards = Number(release?.blocked_count ?? 0);
    if (totalReportCards === 0) {
      throw new ConflictException('Generate, submit, and approve report cards before publishing this exam series');
    }
    if (blockedReportCards > 0 || !release?.series_published) {
      throw new ConflictException(
        `${blockedReportCards || totalReportCards} report card(s) have not completed Dean approval`,
      );
    }
    const publishedCards = Array.isArray(release.published_cards) ? release.published_cards : [];
    const publishedMarksCount = Number(release.published_marks_count ?? 0);
    const deliveryWarnings = new Set<string>();
    const failedDeliveriesByReportCard = new Map<string, Set<string>>();

    const recordDeliveryFailure = (reportCardId: string, delivery: string) => {
      const failures = failedDeliveriesByReportCard.get(reportCardId) ?? new Set<string>();
      failures.add(delivery);
      failedDeliveriesByReportCard.set(reportCardId, failures);
    };

    if (this.schoolEvents) {
      try {
        await this.schoolEvents.recordSchoolOperation({
          event: {
            id: normalizedExamSeriesId,
            type: 'exam.series_published',
            module: 'exams',
            actorRole,
            title: 'Exam Results Released',
            body: `${publishedCards.length} approved report card(s) for exam series ${normalizedExamSeriesId} were released.`,
            entityId: normalizedExamSeriesId,
            severity: 'success',
            payload: {
              exam_series_id: normalizedExamSeriesId,
              published_report_cards_count: publishedCards.length,
              published_marks_count: publishedMarksCount,
            },
          },
          notifications: [
            {
              id: `exam-publish-${normalizedExamSeriesId}`,
              schoolId: tenantId,
              audienceRoles: ['exams-manager', 'dean-academics', 'deputy-principal'],
              title: 'Exam Results Released',
              body: `${publishedCards.length} approved report card(s) were published by the Principal.`,
              sourceModule: 'exams',
              relatedModule: 'academics',
              relatedRecordId: normalizedExamSeriesId,
              priority: 'high',
              read: false,
              createdAt: new Date().toISOString(),
            },
            ...['hod', 'hos'].map(role => ({
              id: `exam-analytics-${normalizedExamSeriesId}-${role}`, schoolId: tenantId, audienceRoles: [role === 'hos' ? 'head_of_subject' : role],
              title: 'Published exam analytics available', body: 'Exam results have been published. Open your analytics to review results within your academic responsibility.',
              sourceModule: 'exams', relatedRecordId: normalizedExamSeriesId,
              actionUrl: `/school/${role}/academic-intelligence`, priority: 'normal',
            })),
          ],
        });
      } catch (error) {
        const delivery = 'school workflow notification';
        deliveryWarnings.add(delivery);
        for (const reportCard of publishedCards) {
          recordDeliveryFailure(String(reportCard.id), delivery);
        }
        this.logger.error(
          `Exam series ${normalizedExamSeriesId} was published, but its school workflow notification could not be delivered`,
          error instanceof Error ? error.stack : String(error),
        );
      }
    }

    if (this.eventPublisher) {
      for (const reportCard of publishedCards) {
        try {
          await this.eventPublisher.publishReportCardPublished({
            tenant_id: tenantId,
            report_id: String(reportCard.id),
            student_id: String(reportCard.student_id),
            exam_id: normalizedExamSeriesId,
            published_by_user_id: actorUserId,
          });
        } catch (error) {
          const delivery = 'grade publication event';
          deliveryWarnings.add(delivery);
          recordDeliveryFailure(String(reportCard.id), delivery);
          this.logger.error(
            `Report card ${String(reportCard.id)} was published with exam series ${normalizedExamSeriesId}, but its grade publication event could not be delivered`,
            error instanceof Error ? error.stack : String(error),
          );
        }
      }
    }

    for (const reportCard of publishedCards) {
      const failedDeliveries = failedDeliveriesByReportCard.get(String(reportCard.id));
      if (!failedDeliveries?.size) continue;
      try {
        await this.repository.appendReportCardAuditLog({
          tenant_id: tenantId,
          report_card_id: String(reportCard.id),
          exam_series_id: normalizedExamSeriesId,
          student_id: String(reportCard.student_id),
          action: 'report_card.delivery_failed',
          actor_user_id: actorUserId,
          metadata: {
            transition_action: 'publish',
            resulting_status: 'published',
            release_mode: 'exam_series',
            failed_deliveries: Array.from(failedDeliveries),
          },
        });
      } catch (error) {
        this.logger.error(
          `Report card ${String(reportCard.id)} series-publication delivery failure could not be added to the audit log`,
          error instanceof Error ? error.stack : String(error),
        );
      }
    }

    const deliveryWarningList = Array.from(deliveryWarnings);

    return {
      success: true,
      published_report_cards_count: publishedCards.length,
      published_marks_count: publishedMarksCount,
      already_published_count: Number(release.already_published_count ?? 0),
      ...(deliveryWarningList.length ? { delivery_warnings: deliveryWarningList } : {}),
    };
  }

  async unpublishExamSeries(examSeriesId: string, reasonValue: string) {
    this.assertReportCardTransitionAllowed('unpublish');
    const tenantId = this.requireTenantId();
    const actorUserId = this.requireUserId();
    const actorRole = this.currentRole();
    const normalizedExamSeriesId = this.requireText(examSeriesId, 'Exam series');
    const reason = this.requireText(reasonValue, 'Withdrawal reason');

    const withdrawal = await this.repository.unpublishExamSeries({
      tenant_id: tenantId,
      exam_series_id: normalizedExamSeriesId,
      actor_user_id: actorUserId,
      actor_role: actorRole,
      reason,
    });
    const withdrawnCards = Array.isArray(withdrawal?.withdrawn_cards)
      ? withdrawal.withdrawn_cards
      : [];
    if (!withdrawal) {
      throw new ConflictException('Only a currently published exam series can be withdrawn');
    }
    if (withdrawnCards.length === 0 || !withdrawal.series_withdrawn) {
      throw new ConflictException('No current published report cards were available to withdraw');
    }
    const relockedMarksCount = Number(withdrawal.relocked_marks_count ?? 0);

    await this.schoolEvents?.recordSchoolOperation({
      event: {
        id: normalizedExamSeriesId,
        type: 'exam.series_withdrawn',
        module: 'exams',
        actorRole,
        title: 'Exam Results Withdrawn',
        body: `${withdrawnCards.length} published report card(s) for exam series ${normalizedExamSeriesId} were withdrawn.`,
        entityId: normalizedExamSeriesId,
        severity: 'warning',
        payload: {
          exam_series_id: normalizedExamSeriesId,
          withdrawn_report_cards_count: withdrawnCards.length,
          relocked_marks_count: relockedMarksCount,
          reason,
        },
      },
      notifications: [
        {
          id: `exam-withdraw-${normalizedExamSeriesId}-${Date.now()}`,
          schoolId: tenantId,
          audienceRoles: ['exams-manager', 'dean-academics', 'deputy-principal', 'hod', 'head_of_subject'],
          title: 'Published exam results withdrawn',
          body: `The Principal withdrew ${withdrawnCards.length} report card(s). Reason: ${reason}`,
          sourceModule: 'exams',
          relatedModule: 'academics',
          relatedRecordId: normalizedExamSeriesId,
          priority: 'urgent',
          read: false,
          createdAt: new Date().toISOString(),
        },
      ],
    });

    return {
      success: true,
      withdrawn_report_cards_count: withdrawnCards.length,
      relocked_marks_count: relockedMarksCount,
    };
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

    const markEntryWindow = await this.repository.findOpenMarkEntryWindow({
      tenant_id: tenantId,
      exam_series_id: dto.exam_series_id,
      academic_term_id: dto.academic_term_id,
      class_section_id: dto.class_section_id,
      subject_id: dto.subject_id,
    });

    if (!markEntryWindow) {
      throw new ForbiddenException('Mark-entry window is not open for this exam, class section, and subject');
    }

    const repository = this.repository as ExamsRepository & {
      findStudentMarkEligibility?: (input: {
        tenant_id: string;
        student_id: string;
        class_section_id: string;
        subject_id: string;
      }) => Promise<Record<string, unknown> | null>;
    };
    if (
      typeof repository.findStudentMarkEligibility === 'function'
      && !await repository.findStudentMarkEligibility({
        tenant_id: tenantId,
        student_id: dto.student_id,
        class_section_id: dto.class_section_id,
        subject_id: dto.subject_id,
      })
    ) {
      throw new ForbiddenException(
        'Learner is not actively enrolled in this class section and subject',
      );
    }

    const scoreEvidence = this.normalizeScoreEvidence(dto.score, dto.score_status);
    const normalizedDto: EnterExamMarkDto = {
      ...dto,
      score: scoreEvidence.score,
      score_status: scoreEvidence.score_status,
    };
    const assessmentScope = await this.findAssessmentScopeForMark(dto);

    if (assessmentScope && scoreEvidence.score !== null) {
      this.assertAssessmentScopeMatchesMark(assessmentScope, dto);
      const maxScore = Number(assessmentScope.max_score ?? Number.POSITIVE_INFINITY);

      if (Number.isFinite(maxScore) && scoreEvidence.score > maxScore) {
        throw new BadRequestException(`Score exceeds assessment maximum score of ${maxScore}`);
      }
    }

    const gradeBoundary = scoreEvidence.score === null
      ? null
      : await this.assertGradeBoundaryForMark(tenantId, normalizedDto, scoreEvidence.score);

    return {
      dto: normalizedDto,
      score: scoreEvidence.score,
      score_status: scoreEvidence.score_status,
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
      score_status: validated.score_status,
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
        score_status: validated.score_status,
        grade_boundary_label: textValue(validated.grade_boundary?.label),
        ...extraMetadata,
      },
    });

    await this.schoolEvents?.recordSchoolOperation({ event: {
      id: `mark-saved-${mark.id}-${String(mark.updated_at ?? mark.created_at ?? Date.now())}`,
      type: 'exam.mark_saved',
      module: 'exams',
      actorRole: this.requestContext.getStore()?.role || 'teacher',
      title: 'Exam Mark Saved',
      body: validated.score_status === 'entered'
        ? 'A numeric exam mark was saved.'
        : `Exam evidence was recorded as ${validated.score_status.replace(/_/g, ' ')}.`,
      entityId: mark.id,
      severity: 'info',
      payload: {
        mark_id: mark.id,
        exam_series_id: validated.dto.exam_series_id,
        assessment_id: validated.dto.assessment_id,
        student_id: validated.dto.student_id,
        score_status: validated.score_status,
      },
    }});

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

  async createGuardianReportCardPdfArtifact(reportCardId: string): Promise<ReportArtifact> {
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
    return this.createReportCardPdfArtifact(reportCard, tenantId);
  }

  async createStudentReportCardPdfArtifact(reportCardId: string): Promise<ReportArtifact> {
    const tenantId = this.requireTenantId();
    const actorUserId = this.requireUserId();
    const normalizedReportCardId = this.requireText(reportCardId, 'Report card');
    const reportCard = await this.repository.findReportCardForStudent({
      tenant_id: tenantId,
      report_card_id: normalizedReportCardId,
      student_id: actorUserId,
    });

    if (!reportCard) {
      throw new NotFoundException('Report card was not found for this student account');
    }

    this.assertParentReportCardDownloadable(reportCard);
    return this.createReportCardPdfArtifact(reportCard, tenantId);
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
    const scoreEvidence = this.normalizeScoreEvidence(row.score, row.score_status);
    return {
      exam_series_id: this.requireText(row.exam_series_id, 'Exam series'),
      assessment_id: this.requireText(row.assessment_id, 'Assessment'),
      academic_term_id: this.requireText(row.academic_term_id, 'Academic term'),
      class_section_id: this.requireText(row.class_section_id, 'Class section'),
      subject_id: this.requireText(row.subject_id, 'Subject'),
      student_id: this.requireText(row.student_id, 'Student'),
      score: scoreEvidence.score,
      score_status: scoreEvidence.score_status,
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
          score_status: entry.score_status,
          remarks: entry.dto.remarks?.trim() || null,
        })),
      }))
      .digest('hex');
  }

  private isExamsOfficer(): boolean {
    if (this.isExamWorkflowAdmin()) return true;
    return EXAMS_MANAGER_ROLES.has(this.currentRole()) && this.hasPermission('exams:write');
  }

  private canReviewExamMarks(): boolean {
    if (requiresPublishedExamAnalytics(this.currentRole())) return false;
    if (this.isExamWorkflowAdmin()) return true;
    const role = this.currentRole();
    return (EXAMS_MANAGER_ROLES.has(role) || EXAM_REVIEW_ROLES.has(role))
      && (this.hasPermission('exams:review') || this.hasPermission('exams:approve'));
  }

  private canApproveExamCorrections(): boolean {
    if (this.isExamWorkflowAdmin()) return true;
    return DEAN_APPROVAL_ROLES.has(this.currentRole()) && this.hasPermission('exams:approve');
  }

  private canPublishExamResults(): boolean {
    if (this.isExamWorkflowAdmin()) return true;
    if (!PRINCIPAL_RELEASE_ROLES.has(this.currentRole())) return false;
    return this.hasPermission('exams:publish')
      || (this.hasPermission('principal:write') && this.hasPermission('exams:read'));
  }

  private assertReportCardTransitionAllowed(action: string): void {
    const allowed = action === 'submit'
      ? this.isExamsOfficer()
      : action === 'approve'
        ? this.canApproveExamCorrections()
        : action === 'recall'
          ? this.isExamsOfficer() || this.canApproveExamCorrections()
          : action === 'publish' || action === 'unpublish'
            ? this.canPublishExamResults()
            : false;

    if (allowed) return;

    const requiredRole = action === 'submit'
      ? 'Exams Manager'
      : action === 'approve'
        ? 'Dean of Academics'
        : action === 'recall'
          ? 'Exams Manager or Dean of Academics'
          : 'Principal';
    throw new ForbiddenException(`${requiredRole} authorization is required to ${action} report cards`);
  }

  private isExamWorkflowAdmin(): boolean {
    return EXAM_ADMIN_ROLES.has(this.currentRole()) || this.hasPermission('*:*');
  }

  private hasPermission(permission: string): boolean {
    const permissions = this.requestContext.getStore()?.permissions ?? [];
    return permissions.includes(permission) || permissions.includes('*:*');
  }

  private currentRole(): string {
    return String(this.requestContext.getStore()?.role ?? '')
      .trim()
      .toLowerCase()
      .replace(/[\s-]+/g, '_');
  }

  private assertAcademicInterventionReadAllowed(): void {
    const role = this.currentRole();
    const roleAllowed = this.isExamWorkflowAdmin()
      || ACADEMIC_INTERVENTION_LEADERSHIP_ROLES.has(role)
      || ACADEMIC_INTERVENTION_HOD_ROLES.has(role)
      || ACADEMIC_INTERVENTION_OWNER_ROLES.has(role);
    if (!roleAllowed || !this.hasPermission('academics:read')) {
      throw new ForbiddenException(
        'Academic intervention access requires an authorized academic role in this school',
      );
    }
  }

  private assertAcademicInterventionCreateAllowed(analyticsScoped = false): void {
    const role = this.currentRole();
    if (this.isExamWorkflowAdmin()) return;

    const leadershipAllowed = ACADEMIC_INTERVENTION_LEADERSHIP_ROLES.has(role)
      && [
        'academics:write',
        'deputy:write',
        'exams:write',
        'exams:review',
        'exams:approve',
        'principal:write',
      ].some((permission) => this.hasPermission(permission));
    const hodAllowed = ACADEMIC_INTERVENTION_HOD_ROLES.has(role)
      && (
        this.hasPermission('academics:assign-teachers')
        || this.hasPermission('exams:review')
        || this.hasPermission('academics:write')
      );
    const teacherAllowed = ACADEMIC_INTERVENTION_OWNER_ROLES.has(role)
      && (
        this.hasPermission('academics:write')
        || this.hasPermission('academics:assign-teachers')
        || this.hasPermission('exams:review')
        || (analyticsScoped && this.hasPermission('teacher:write') && this.hasPermission('exams:read'))
      );

    const subjectHeadAllowed = analyticsScoped && role === 'head_of_subject'
      && this.hasPermission('exams:subject-analytics');
    if (!leadershipAllowed && !hodAllowed && !teacherAllowed && !subjectHeadAllowed) {
      throw new ForbiddenException(
        'Academic intervention creation requires academic write or review authority',
      );
    }
  }

  private assertAcademicInterventionUpdateAllowed(
    intervention: Record<string, any>,
    actorUserId: string,
  ): void {
    const role = this.currentRole();
    const leadershipAllowed = this.isExamWorkflowAdmin()
      || (
        ACADEMIC_INTERVENTION_LEADERSHIP_ROLES.has(role)
        && [
          'academics:write',
          'deputy:write',
          'exams:write',
          'exams:review',
          'exams:approve',
          'principal:write',
        ].some((permission) => this.hasPermission(permission))
      );
    const assignedOwner = String(intervention.owner_user_id ?? '') === actorUserId;
    const assignedHod = String(intervention.hod_user_id ?? '') === actorUserId;
    const assignedRoleAllowed = (
      assignedOwner
      && ACADEMIC_INTERVENTION_OWNER_ROLES.has(role)
      && this.hasPermission('academics:read')
    ) || (
      assignedHod
      && ACADEMIC_INTERVENTION_HOD_ROLES.has(role)
      && (
        this.hasPermission('academics:assign-teachers')
        || this.hasPermission('exams:review')
        || this.hasPermission('academics:write')
      )
    );

    if (!leadershipAllowed && !assignedRoleAllowed) {
      throw new ForbiddenException(
        'Only assigned academic staff or authorized school leaders may update this intervention',
      );
    }
  }

  private parseAcademicInterventionStatuses(value?: string): string[] | undefined {
    const statuses = [
      ...new Set(
        String(value ?? '')
          .split(',')
          .map((status) => status.trim().toLowerCase())
          .filter(Boolean),
      ),
    ];
    const unsupported = statuses.find(
      (status) => !ACADEMIC_INTERVENTION_STATUS_SET.has(status),
    );
    if (unsupported) {
      throw new BadRequestException(`Unsupported academic intervention status: ${unsupported}`);
    }
    return statuses.length > 0 ? statuses : undefined;
  }

  private optionalDate(value: string | undefined, fieldName: string): string | null {
    const normalized = this.optionalText(value);
    if (!normalized) return null;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
      throw new BadRequestException(`${fieldName} must use YYYY-MM-DD`);
    }
    const parsed = new Date(`${normalized}T00:00:00.000Z`);
    if (
      Number.isNaN(parsed.getTime())
      || parsed.toISOString().slice(0, 10) !== normalized
    ) {
      throw new BadRequestException(`${fieldName} is not a valid calendar date`);
    }
    return normalized;
  }

  private recordValue(value: unknown): Record<string, unknown> {
    return value !== null && typeof value === 'object' && !Array.isArray(value)
      ? value as Record<string, unknown>
      : {};
  }

  private assertResolvedAcademicInterventionScope(
    dto: CreateAcademicInterventionDto,
    scope: Record<string, any> | null,
  ): void {
    if (!scope) {
      throw new NotFoundException('Academic intervention scope was not found for this school');
    }

    const requiredMatches: Array<[unknown, unknown, string]> = [
      [dto.student_id, scope.student_id, 'Learner'],
      [dto.exam_series_id, scope.exam_series_id, 'Exam series'],
      [dto.subject_id ?? dto.subject_name, scope.subject_id, 'Subject or learning area'],
      [dto.class_section_id ?? dto.class_name, scope.class_section_id, 'Class or stream'],
      [dto.owner_user_id ?? dto.owner_name, scope.owner_user_id, 'Intervention owner'],
      [dto.hod_user_id, scope.hod_user_id, 'Head of Department'],
    ];
    const unresolved = requiredMatches.find(
      ([requested, resolved]) => this.optionalText(
        typeof requested === 'string' ? requested : undefined,
      ) && !textValue(resolved),
    );
    if (unresolved) {
      throw new NotFoundException(
        `${unresolved[2]} was not found as an active record in this school`,
      );
    }
  }

  private normalizeAcademicInterventionEvidence(
    scoreValue: unknown,
    scoreStatusValue: unknown,
  ): { score: number | null; score_status: ExamScoreStatus | null } {
    const normalizedStatus = typeof scoreStatusValue === 'string'
      ? scoreStatusValue.trim().toLowerCase()
      : '';
    const hasScore = scoreValue !== undefined && scoreValue !== null && scoreValue !== '';
    if (!hasScore && !normalizedStatus) {
      return { score: null, score_status: null };
    }
    if (normalizedStatus && !EXAM_SCORE_STATUS_SET.has(normalizedStatus)) {
      throw new BadRequestException('Unsupported intervention score status');
    }

    const score = hasScore ? Number(scoreValue) : null;
    const status = (normalizedStatus || 'entered') as ExamScoreStatus;
    if (status === 'entered') {
      if (score === null || !Number.isFinite(score) || score < 0) {
        throw new BadRequestException(
          'Entered intervention evidence requires a valid non-negative score',
        );
      }
      return { score, score_status: status };
    }
    if (score !== null) {
      throw new BadRequestException(
        `${status.replace(/_/g, ' ')} intervention evidence cannot include a numeric score`,
      );
    }
    return { score: null, score_status: status };
  }

  private async recordAcademicInterventionOperation(input: {
    tenantId: string;
    actorUserId: string;
    intervention: Record<string, any>;
    eventType: string;
    title: string;
    body: string;
    priority: string;
    createOwnerTask?: boolean;
  }): Promise<void> {
    const interventionId = this.requireText(
      textValue(input.intervention.id) ?? undefined,
      'Academic intervention',
    );
    const eventId = [
      input.eventType,
      interventionId,
      textValue(input.intervention.update_id)
        ?? textValue(input.intervention.updated_at)
        ?? Date.now().toString(),
    ].join(':');
    const metadata = {
      academic_intervention_id: interventionId,
      student_id: textValue(input.intervention.student_id),
      exam_series_id: textValue(input.intervention.exam_series_id),
      class_section_id: textValue(input.intervention.class_section_id),
      subject_id: textValue(input.intervention.subject_id),
      owner_user_id: textValue(input.intervention.owner_user_id),
      hod_user_id: textValue(input.intervention.hod_user_id),
      status: textValue(input.intervention.status),
      actor_user_id: input.actorUserId,
    };

    await this.schoolEvents?.recordSchoolOperation({
      schoolId: input.tenantId,
      event: {
        id: eventId,
        type: input.eventType,
        module: 'exams',
        actorRole: this.requestContext.getStore()?.role ?? 'academic_staff',
        title: input.title,
        body: input.body,
        entityId: interventionId,
        severity: input.priority === 'urgent' ? 'critical' : input.priority === 'high' ? 'warning' : 'info',
        payload: metadata,
      },
      notifications: [
        {
          id: `${eventId}:dean`,
          schoolId: input.tenantId,
          audienceRoles: ['dean-academics', 'principal'],
          title: input.title,
          body: input.body,
          sourceModule: 'exams',
          relatedModule: 'academics',
          relatedRecordId: interventionId,
          priority: input.priority,
          read: false,
          createdAt: new Date().toISOString(),
          metadata,
        },
      ],
    });

    if (!this.workflowRepository) return;
    const recipients = await this.repository.listAcademicInterventionRecipients({
      tenant_id: input.tenantId,
      intervention_id: interventionId,
    });
    await Promise.all(
      recipients.map((recipient: any) => this.workflowRepository!.createNotification({
        tenant_id: input.tenantId,
        notification_key: `${eventId}:recipient:${recipient.user_id}`,
        recipient_user_id: String(recipient.user_id),
        type: input.eventType,
        title: input.title,
        body: input.body,
        priority: input.priority,
        source_module: 'exams',
        source_record_id: interventionId,
        metadata,
      })),
    );

    const ownerUserId = textValue(input.intervention.owner_user_id);
    if (input.createOwnerTask && ownerUserId) {
      await this.workflowRepository.createTask({
        tenant_id: input.tenantId,
        task_key: `academic-intervention:${interventionId}:owner`,
        assigned_to_user_id: ownerUserId,
        created_by_user_id: input.actorUserId,
        title: input.title,
        description: input.body,
        module: 'exams',
        record_id: interventionId,
        priority: input.priority,
        metadata,
      });
    }
  }

  private reportCardTransitionNotifications(input: {
    action: string;
    tenant_id: string;
    report_card_id: string;
    exam_series_id: string;
    student_id: string;
  }): Record<string, unknown>[] {
    const definitions: Record<string, { audienceRoles: string[]; title: string; body: string; priority: string }> = {
      submit: {
        audienceRoles: ['dean-academics'],
        title: 'Report card awaiting academic approval',
        body: 'The Exams Manager submitted a report card for Dean review.',
        priority: 'high',
      },
      approve: {
        audienceRoles: ['principal'],
        title: 'Report card ready for publication',
        body: 'The Dean of Academics approved a report card for Principal release.',
        priority: 'high',
      },
      recall: {
        audienceRoles: ['exams-manager'],
        title: 'Report card returned for correction',
        body: 'A submitted report card was returned to the Exams Manager with a required correction reason.',
        priority: 'high',
      },
      unpublish: {
        audienceRoles: ['exams-manager', 'dean-academics'],
        title: 'Published report card withdrawn',
        body: 'The Principal withdrew a published report card. Review the audit reason before any republication.',
        priority: 'urgent',
      },
    };
    const definition = definitions[input.action];
    if (!definition) return [];
    return [{
      id: `report-card-${input.action}-${input.report_card_id}`,
      schoolId: input.tenant_id,
      audienceRoles: definition.audienceRoles,
      title: definition.title,
      body: definition.body,
      sourceModule: 'exams',
      relatedModule: 'academics',
      relatedRecordId: input.report_card_id,
      priority: definition.priority,
      read: false,
      createdAt: new Date().toISOString(),
      metadata: {
        report_card_id: input.report_card_id,
        exam_series_id: input.exam_series_id,
        student_id: input.student_id,
      },
    }];
  }

  private deanMarkSubmissionNotification(tenantId: string) {
    return [{ id: `marks-submitted-dean-${randomUUID()}`, schoolId: tenantId, audienceRoles: ['dean-academics'],
      title: 'Marks ready for Dean review', body: 'Teachers submitted marks. Review or return them for correction before locking.',
      sourceModule: 'exams', actionUrl: '/school/dean-academics/assessments', priority: 'normal' }];
  }

  private assertExamWorkflowParticipant(): void {
    if (requiresPublishedExamAnalytics(this.currentRole())) {
      throw new ForbiddenException('HOD and HOS receive scoped exam analytics after publication. Use the academic analytics workspace.');
    }
  }

  private isHeadOfDepartmentReviewer(): boolean {
    const role = this.currentRole();
    return role === 'hod' || role === 'head_of_department';
  }

  private async resolveDepartmentModerationScope(
    tenantId: string,
    requestedDepartmentId?: string,
  ): Promise<string[] | undefined> {
    if (!this.isHeadOfDepartmentReviewer()) {
      return undefined;
    }

    const repository = this.repository as ExamsRepository & {
      listDepartmentsLedByUser?: (input: {
        tenant_id: string;
        user_id: string;
      }) => Promise<string[]>;
    };

    if (typeof repository.listDepartmentsLedByUser !== 'function') {
      throw new ForbiddenException('HOD department assignment is required before moderating marks');
    }

    const actorUserId = this.requireUserId();
    const assignedDepartments = [
      ...new Set(
        (await repository.listDepartmentsLedByUser({ tenant_id: tenantId, user_id: actorUserId }))
          .map((departmentId) => String(departmentId).trim())
          .filter(Boolean),
      ),
    ];

    if (assignedDepartments.length === 0) {
      throw new ForbiddenException('HOD is not assigned to an active department');
    }

    if (!requestedDepartmentId) {
      return assignedDepartments;
    }

    const matchedDepartment = assignedDepartments.find(
      (departmentId) => departmentId.toLowerCase() === requestedDepartmentId.toLowerCase(),
    );

    if (!matchedDepartment) {
      throw new ForbiddenException('HOD is not assigned to this department');
    }

    return [matchedDepartment];
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

  private normalizeScoreEvidence(
    scoreValue: unknown,
    scoreStatusValue: unknown,
  ): { score: number | null; score_status: ExamScoreStatus } {
    const normalizedStatus = typeof scoreStatusValue === 'string'
      ? scoreStatusValue.trim().toLowerCase()
      : '';
    const scoreStatus = (normalizedStatus || 'entered') as ExamScoreStatus;

    if (!EXAM_SCORE_STATUS_SET.has(scoreStatus)) {
      throw new BadRequestException('Unsupported score status');
    }

    const hasScore = scoreValue !== undefined && scoreValue !== null && scoreValue !== '';
    if (scoreStatus !== 'entered') {
      if (hasScore) {
        throw new BadRequestException(
          `Score must be blank when score status is ${scoreStatus.replace(/_/g, ' ')}`,
        );
      }

      return { score: null, score_status: scoreStatus };
    }

    if (!hasScore) {
      throw new BadRequestException('Score is required when score status is entered');
    }

    return {
      score: this.requireNonNegativeNumber(Number(scoreValue), 'Score'),
      score_status: scoreStatus,
    };
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

  private normalizeOptionalTimestamp(
    value: string | undefined,
    fieldName: string,
  ): string | undefined {
    if (value === undefined) {
      return undefined;
    }

    const normalized = value.trim();
    if (!normalized) {
      return undefined;
    }

    const timestamp = new Date(normalized);
    if (Number.isNaN(timestamp.getTime())) {
      throw new BadRequestException(`${fieldName} must be a valid date and time`);
    }

    return timestamp.toISOString();
  }

  private async findAssessmentScopeForMark(
    dto: EnterExamMarkDto,
  ): Promise<Record<string, unknown> | null> {
    const repository = this.repository as ExamsRepository & {
      findAssessmentScope?: (input: {
        tenant_id: string;
        assessment_id: string;
        class_section_id?: string;
      }) => Promise<Record<string, unknown> | null>;
    };

    if (typeof repository.findAssessmentScope !== 'function') {
      return null;
    }

    return repository.findAssessmentScope({
      tenant_id: this.requireTenantId(),
      assessment_id: dto.assessment_id,
      class_section_id: dto.class_section_id,
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

  private async createReportCardPdfArtifact(
    reportCard: Record<string, unknown>,
    tenantId: string,
  ): Promise<ReportArtifact> {
    const payload = extractPersistedReportCardPayload(reportCard.metadata);
    if (!payload) {
      throw new ConflictException(
        'This report card has no valid generated snapshot. Regenerate it before downloading.',
      );
    }
    const verificationCode = String(reportCard.verification_code ?? '').trim()
      || createHash('sha256').update(String(reportCard.id ?? '')).digest('hex').slice(0, 12).toUpperCase();
    const renderPayload = await hydrateReportCardLogoForRendering(
      payload,
      tenantId,
      this.fileStorage,
      { includePrincipalSignature: reportCard.status === 'published' },
    );

    return createReportCardPdfArtifact(renderPayload, verificationCode);
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

  async getGradingPolicyImpact(policyIdValue: string) {
    const impact = await this.repository.getGradingPolicyImpact({
      tenant_id: this.requireTenantId(),
      policy_id: this.requireText(policyIdValue, 'Grading policy'),
    });

    if (!impact) {
      throw new NotFoundException('Grading policy was not found for this school');
    }

    return { success: true, data: impact };
  }

  async createGradingPolicy(dto: {
    name?: string;
    reporting_mode?: string;
    exam_series_id?: string;
    effective_from?: string;
    effective_to?: string;
    supersedes_policy_id?: string;
    scope?: Record<string, unknown>;
  }) {
    if (!this.isExamsOfficer()) {
      throw new ForbiddenException('Exam write permission is required to create grading policies');
    }

    const tenantId = this.requireTenantId();
    const actorUserId = this.requireUserId();
    const supersedesPolicyId = this.optionalText(dto.supersedes_policy_id);
    const sourcePolicy = supersedesPolicyId
      ? await this.repository.getGradingPolicy({
        tenant_id: tenantId,
        policy_id: supersedesPolicyId,
      })
      : null;

    if (supersedesPolicyId && !sourcePolicy) {
      throw new NotFoundException('The grading policy to version was not found for this school');
    }

    const reportingMode = this.requireText(
      dto.reporting_mode ?? sourcePolicy?.reporting_mode ?? 'traditional',
      'Reporting mode',
    ).toLowerCase();

    if (!EXAM_GRADING_REPORTING_MODES.has(reportingMode)) {
      throw new BadRequestException('Unsupported grading policy reporting mode');
    }

    const effectiveFrom = this.normalizeOptionalTimestamp(dto.effective_from, 'Effective-from date');
    const effectiveTo = this.normalizeOptionalTimestamp(dto.effective_to, 'Effective-to date');
    if (effectiveFrom && effectiveTo && new Date(effectiveTo) <= new Date(effectiveFrom)) {
      throw new BadRequestException('Effective-to date must be after the effective-from date');
    }

    const result = await this.repository.createGradingPolicy({
      tenant_id: tenantId,
      actor_user_id: actorUserId,
      name: this.requireText(dto.name ?? sourcePolicy?.name, 'Grading policy name'),
      reporting_mode: reportingMode,
      exam_series_id: this.optionalText(dto.exam_series_id) ?? sourcePolicy?.exam_series_id ?? null,
      effective_from: effectiveFrom,
      effective_to: effectiveTo,
      supersedes_policy_id: supersedesPolicyId,
      scope: isRecord(dto.scope) ? dto.scope : sourcePolicy?.scope ?? {},
    });

    if (!result) {
      throw new NotFoundException('The grading policy to version was not found for this school');
    }

    await this.schoolEvents?.recordSchoolOperation({ event: {
      id: `grading-policy-created-${result.id}`,
      type: 'exam.grading_policy_created',
      module: 'exams',
      actorRole: this.requestContext.getStore()?.role || 'exams_officer',
      title: 'Grading Policy Created',
      body: `Grading policy ${result.name} was created.`,
      entityId: result.id,
      severity: 'info',
      payload: {
        grading_policy_id: result.id,
        grading_policy_version: result.version,
        supersedes_policy_id: result.supersedes_policy_id,
        reporting_mode: result.reporting_mode,
        actor_user_id: actorUserId,
      },
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

    const current = await this.repository.getGradingPolicy({
      tenant_id: tenantId,
      policy_id: policyId,
    });

    if (!current) {
      throw new NotFoundException('Grading policy was not found for this school');
    }

    if (status === 'validated' || status === 'scheduled' || status === 'active') {
      await this.validateGradingPolicyBoundaries(tenantId, policyId);
    }

    const effectiveFrom = current.effective_from ? new Date(current.effective_from) : null;
    if (status === 'scheduled' && (!effectiveFrom || effectiveFrom <= new Date())) {
      throw new BadRequestException('A scheduled grading policy requires a future effective-from date');
    }
    if (status === 'active' && effectiveFrom && effectiveFrom > new Date()) {
      throw new BadRequestException('Use scheduled status for a grading policy that starts in the future');
    }

    const result = await this.repository.transitionGradingPolicy({
      tenant_id: tenantId,
      actor_user_id: actorUserId,
      policy_id: policyId,
      status,
    });

    if (!result) {
      throw new ConflictException(
        `Grading policy cannot move from ${current.status} to ${status}`,
      );
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

  async updateGradingPolicy(policyIdValue: string, dto: {
    name?: string;
    reporting_mode?: string;
    exam_series_id?: string;
    effective_from?: string;
    effective_to?: string;
    scope?: Record<string, unknown>;
  }) {
    if (!this.isExamsOfficer()) {
      throw new ForbiddenException('Exam write permission is required to edit grading policies');
    }

    const tenantId = this.requireTenantId();
    const actorUserId = this.requireUserId();
    const policyId = this.requireText(policyIdValue, 'Grading policy');
    const existing = await this.repository.getGradingPolicy({
      tenant_id: tenantId,
      policy_id: policyId,
    });

    if (!existing) {
      throw new NotFoundException('Grading policy was not found for this school');
    }
    if (existing.status !== 'draft') {
      throw new ConflictException(
        'This grading policy is already in use. Create a new version instead of editing it.',
      );
    }

    const reportingMode = dto.reporting_mode ? this.requireText(dto.reporting_mode, 'Reporting mode').toLowerCase() : undefined;

    if (reportingMode && !EXAM_GRADING_REPORTING_MODES.has(reportingMode)) {
      throw new BadRequestException('Unsupported grading policy reporting mode');
    }

    const effectiveFrom = this.normalizeOptionalTimestamp(dto.effective_from, 'Effective-from date');
    const effectiveTo = this.normalizeOptionalTimestamp(dto.effective_to, 'Effective-to date');
    const nextEffectiveFrom = effectiveFrom ?? existing.effective_from;
    const nextEffectiveTo = effectiveTo ?? existing.effective_to;
    if (
      nextEffectiveFrom
      && nextEffectiveTo
      && new Date(nextEffectiveTo) <= new Date(nextEffectiveFrom)
    ) {
      throw new BadRequestException('Effective-to date must be after the effective-from date');
    }

    const result = await this.repository.updateGradingPolicy({
      tenant_id: tenantId,
      actor_user_id: actorUserId,
      policy_id: policyId,
      name: this.optionalText(dto.name),
      reporting_mode: reportingMode,
      exam_series_id: this.optionalText(dto.exam_series_id),
      effective_from: effectiveFrom,
      effective_to: effectiveTo,
      scope: dto.scope,
    });

    if (!result) {
      throw new ConflictException('Only a draft grading policy can be edited');
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
    if (minScore !== undefined && minScore > 100) {
      throw new BadRequestException('Minimum score cannot exceed 100');
    }
    if (maxScore !== undefined && maxScore > 100) {
      throw new BadRequestException('Maximum score cannot exceed 100');
    }
    if (minScore !== undefined && maxScore !== undefined && maxScore < minScore) {
      throw new BadRequestException('Maximum score must be greater than or equal to minimum score');
    }
    const points = dto.points === undefined ? undefined : this.requireNonNegativeNumber(Number(dto.points), 'Grade points');
    return { minScore, maxScore, points };
  }

  private async validateGradingPolicyBoundaries(tenantId: string, policyId: string) {
    const boundaries = await this.repository.getGradingPolicyBoundaries({
      tenant_id: tenantId,
      policy_id: policyId,
    });

    if (boundaries.length === 0) {
      throw new BadRequestException(
        'Add grading boundaries covering 0 to 100 before validating this policy',
      );
    }

    const normalized = boundaries
      .map((boundary: Record<string, unknown>) => ({
        label: this.requireText(
          typeof boundary.label === 'string' ? boundary.label : undefined,
          'Boundary label',
        ),
        minScore: Number(boundary.min_score),
        maxScore: Number(boundary.max_score),
      }))
      .sort((left, right) => left.minScore - right.minScore);

    const labels = new Set<string>();
    for (const boundary of normalized) {
      if (
        !Number.isFinite(boundary.minScore)
        || !Number.isFinite(boundary.maxScore)
        || boundary.minScore < 0
        || boundary.maxScore > 100
        || boundary.maxScore < boundary.minScore
      ) {
        throw new BadRequestException(
          `${boundary.label} must use a valid score range between 0 and 100`,
        );
      }

      const normalizedLabel = boundary.label.toLowerCase();
      if (labels.has(normalizedLabel)) {
        throw new BadRequestException(`Boundary label ${boundary.label} is duplicated`);
      }
      labels.add(normalizedLabel);
    }

    if (normalized[0].minScore !== 0) {
      throw new BadRequestException('The lowest grading boundary must start at 0');
    }
    if (normalized[normalized.length - 1].maxScore !== 100) {
      throw new BadRequestException('The highest grading boundary must end at 100');
    }

    for (let index = 1; index < normalized.length; index += 1) {
      const previous = normalized[index - 1];
      const current = normalized[index];
      if (current.minScore <= previous.maxScore) {
        throw new BadRequestException(
          `${previous.label} and ${current.label} have overlapping score ranges`,
        );
      }
      if (current.minScore - previous.maxScore > 1) {
        throw new BadRequestException(
          `There is an uncovered score range between ${previous.label} and ${current.label}`,
        );
      }
    }
  }

  async createGradingPolicyBoundary(policyIdValue: string, dto: {
    label?: string;
    min_score?: number;
    max_score?: number;
    points?: number;
    descriptor?: string;
    remark?: string;
    is_pass?: boolean;
  }) {
    if (!this.isExamsOfficer()) throw new ForbiddenException('Exam write permission is required to create grading boundaries');
    const tenantId = this.requireTenantId();
    const actorUserId = this.requireUserId();
    const policyId = this.requireText(policyIdValue, 'Grading policy');
    const policy = await this.repository.getGradingPolicy({
      tenant_id: tenantId,
      policy_id: policyId,
    });
    if (!policy) throw new NotFoundException('Grading policy was not found for this school');
    if (policy.status !== 'draft') {
      throw new ConflictException(
        'This grading policy is already in use. Create a new version to change its boundaries.',
      );
    }

    const { minScore, maxScore, points } = this.normalizeBoundaryNumbers(dto);
    if (minScore === undefined || maxScore === undefined) throw new BadRequestException('Minimum and maximum scores are required');
    const result = await this.repository.createGradingPolicyBoundary({
      tenant_id: tenantId,
      actor_user_id: actorUserId,
      policy_id: policyId,
      label: this.requireText(dto.label, 'Boundary label'),
      min_score: minScore,
      max_score: maxScore,
      points,
      descriptor: this.optionalText(dto.descriptor),
      remark: this.optionalText(dto.remark),
      is_pass: dto.is_pass,
    });
    if (!result) throw new ConflictException('Only a draft grading policy can be edited');
    await this.recordGradingBoundaryEvent('created', result, actorUserId);
    return { success: true, message: 'Grading boundary created', data: result };
  }

  async updateGradingPolicyBoundary(boundaryIdValue: string, dto: {
    label?: string;
    min_score?: number;
    max_score?: number;
    points?: number;
    descriptor?: string;
    remark?: string;
    is_pass?: boolean;
  }) {
    if (!this.isExamsOfficer()) throw new ForbiddenException('Exam write permission is required to update grading boundaries');
    const tenantId = this.requireTenantId();
    const actorUserId = this.requireUserId();
    const boundaryId = this.requireText(boundaryIdValue, 'Grading boundary');
    const existing = await this.repository.getGradingPolicyBoundary({
      tenant_id: tenantId,
      boundary_id: boundaryId,
    });
    if (!existing) throw new NotFoundException('Grading boundary was not found for this school');
    if (existing.policy_status !== 'draft') {
      throw new ConflictException(
        'This grading policy is already in use. Create a new version to change its boundaries.',
      );
    }

    const { minScore, maxScore, points } = this.normalizeBoundaryNumbers(dto);
    const nextMinScore = minScore ?? Number(existing.min_score);
    const nextMaxScore = maxScore ?? Number(existing.max_score);
    if (nextMaxScore < nextMinScore) {
      throw new BadRequestException('Maximum score must be greater than or equal to minimum score');
    }
    const result = await this.repository.updateGradingPolicyBoundary({
      tenant_id: tenantId,
      actor_user_id: actorUserId,
      boundary_id: boundaryId,
      label: dto.label === undefined ? undefined : this.requireText(dto.label, 'Boundary label'),
      min_score: minScore,
      max_score: maxScore,
      points,
      descriptor: dto.descriptor === undefined ? undefined : this.optionalText(dto.descriptor),
      remark: dto.remark === undefined ? undefined : this.optionalText(dto.remark),
      is_pass: dto.is_pass,
    });
    if (!result) throw new ConflictException('Only a draft grading policy can be edited');
    await this.recordGradingBoundaryEvent('updated', result, actorUserId);
    return { success: true, message: 'Grading boundary updated', data: result };
  }

  async deleteGradingPolicyBoundary(boundaryIdValue: string) {
    if (!this.isExamsOfficer()) throw new ForbiddenException('Exam write permission is required to delete grading boundaries');
    const tenantId = this.requireTenantId();
    const actorUserId = this.requireUserId();
    const boundaryId = this.requireText(boundaryIdValue, 'Grading boundary');
    const existing = await this.repository.getGradingPolicyBoundary({
      tenant_id: tenantId,
      boundary_id: boundaryId,
    });
    if (!existing) throw new NotFoundException('Grading boundary was not found for this school');
    if (existing.policy_status !== 'draft') {
      throw new ConflictException(
        'This grading policy is already in use. Create a new version to change its boundaries.',
      );
    }
    const result = await this.repository.deleteGradingPolicyBoundary({
      tenant_id: tenantId,
      actor_user_id: actorUserId,
      boundary_id: boundaryId,
    });
    if (!result) throw new ConflictException('Only a draft grading policy can be edited');
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
    this.assertExamWorkflowParticipant();
    const tenantId = this.requireTenantId();
    const normalizedFilters: Record<string, string | number> = {};
    const examSeriesId = this.optionalText(filters.exam_series_id);
    const assessmentId = this.optionalText(filters.assessment_id);
    const studentId = this.optionalText(filters.student_id);
    const classSectionId = this.optionalText(filters.class_section_id);
    const subjectId = this.optionalText(filters.subject_id);
    const teacherUserId = this.optionalText(filters.teacher_user_id);

    if (filters.view !== undefined && !['active', 'submitted'].includes(filters.view)) {
      throw new BadRequestException('Mark sheet view must be active or submitted');
    }
    if (filters.view === 'submitted') normalizedFilters.view = 'submitted';

    if (examSeriesId) normalizedFilters.exam_series_id = examSeriesId;
    if (assessmentId) normalizedFilters.assessment_id = assessmentId;
    if (studentId) normalizedFilters.student_id = studentId;
    if (classSectionId) normalizedFilters.class_section_id = classSectionId;
    if (subjectId) normalizedFilters.subject_id = subjectId;

    if (this.isExamsOfficer()) {
      if (teacherUserId) normalizedFilters.teacher_user_id = teacherUserId;
    } else {
      normalizedFilters.teacher_user_id = this.requireUserId();
    }

    normalizedFilters.limit = this.parsePageLimit(filters.limit, 100, 100);
    normalizedFilters.offset = this.parsePageOffset(filters.offset);

    const data = await this.repository.getMarks(tenantId, normalizedFilters);
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
