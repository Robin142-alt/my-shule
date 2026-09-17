import { CreateEnquiryDto } from './dto/create-enquiry.dto';
import { CreateInterviewDto } from './dto/create-interview.dto';
import { CreateOfferDto } from './dto/create-offer.dto';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { CreateTaskDto } from './dto/create-task.dto';
import { CreateTemplateDto } from './dto/create-template.dto';

import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  Optional,
  UnauthorizedException,
} from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';
import * as bcrypt from 'bcrypt';

import { TenantInvitationsService } from '../../auth/tenant-invitations.service';
import { AuthorizationRepository } from '../../auth/repositories/authorization.repository';
import { StudentsService } from '../students/students.service';
import { CohortPromotionService } from './cohort-promotion.service';
import {
  createCsvReportArtifact,
  type ReportCsvValue,
} from '../../common/reports/report-csv-artifact';
import { RequestContextService } from '../../common/request-context/request-context.service';
import { UploadMalwareScanService } from '../../common/uploads/upload-malware-scan.service';
import { validateUploadedFile } from '../../common/uploads/upload-policy';
import { PrismaService } from '../../database/prisma.service';
import { EventPublisherService } from '../events/event-publisher.service';
import { AgpExecutionService } from '../../common/platform-governance/agp-execution.service';
import { SchoolOperationalEventsService } from '../events/school-operational-events.service';
import { SchoolOperationNotificationsRepository } from '../events/repositories/school-operation-notifications.repository';
import { CommunicationSmsService } from '../communication/communication-sms.service';
import { CreateApplicationDto, UpdateApplicationDto } from './dto/create-application.dto';
import { ListAdmissionsQueryDto } from './dto/list-admissions-query.dto';
import {
  AdvanceAcademicLifecycleDto,
  CohortPromotionCommandDto,
  CreateAllocationDto,
  CreateTransferRecordDto,
  RegisterApplicationDto,
  UpdateDocumentVerificationDto,
  UploadApplicationDocumentDto,
} from './dto/register-application.dto';
import { CreateManualAdmissionDto } from './dto/create-manual-admission.dto';
import {
  BulkAdmissionCommitDto,
  BulkAdmissionRowDto,
} from './dto/bulk-admission.dto';
import {
  ChangeGuardianPhoneDto,
  ChangeStudentAdmissionNumberDto,
  SaveAdmissionDraftDto,
  UpdateAdmissionSettingsDto,
} from './dto/admission-workflow.dto';
import {
  normalizeAdmissionNumber,
  normalizeKenyanPhone,
  normalizePersonName,
  parseAdmissionDate,
  parseOptionalAdmissionDate,
} from './admission-input';
import { AdmissionsRepository } from './repositories/admissions.repository';
import {
  AdmissionDocumentStorageService,
  UploadedBinaryFile,
} from './storage/local-document-storage.service';

type AcademicLifecycleAction = 'promotion' | 'graduation' | 'archive';

interface AcademicEnrollmentRecord {
  id: string;
  student_id?: string;
  application_id: string;
  class_section_id?: string | null;
  class_name: string;
  stream_name: string;
  academic_year: string;
  status: string;
}

interface AcademicClassSectionRecord {
  id?: string | null;
  stream_id?: string | null;
  class_name: string;
  stream_name: string;
  academic_year: string;
  capacity?: number | string | null;
  current_enrollments?: number | string | null;
}

interface AdmissionGuardianSmsDelivery {
  status: 'queued' | 'degraded' | 'not_requeued';
  queue_id: string | null;
  recipient_phone_last4: string;
  reason: string | null;
  provider_status?: string | null;
}

interface AdmissionOperationEventDelivery {
  status: 'recorded' | 'degraded' | 'not_replayed';
  event_key: string | null;
  reason: string | null;
}

type AdmissionsReportExportDefinition = {
  id: string;
  title: string;
  filename: string;
  headers: string[];
  rows: (repository: AdmissionsRepository, tenantId: string) => Promise<ReportCsvValue[][]>;
};

const ADMISSIONS_REPORT_EXPORT_LIMIT = 500;
const ADMISSIONS_IMPORT_LIMIT = 500;
const ADMISSIONS_IMPORT_HEADERS = [
  'admission_number',
  'first_name',
  'middle_name',
  'last_name',
  'gender',
  'date_of_birth',
  'admission_date',
  'academic_year',
  'curriculum',
  'class',
  'stream',
  'guardian_name',
  'guardian_relationship',
  'guardian_phone',
] as const;

const ADMISSIONS_IMPORT_REQUIRED_HEADERS = ADMISSIONS_IMPORT_HEADERS.filter(
  (header) => header !== 'middle_name' && header !== 'stream' && header !== 'date_of_birth',
);

const ADMISSIONS_IMPORT_HEADER_ALIASES: Record<string, string> = {
  dob: 'date_of_birth',
  date_of_birth: 'date_of_birth',
  academic_year_name: 'academic_year',
  year: 'academic_year',
  grade: 'grade_or_form',
  form: 'grade_or_form',
  grade_form: 'grade_or_form',
  grade_level: 'grade_or_form',
  class_name: 'class',
  class_section: 'class',
  stream_name: 'stream',
  parent_name: 'guardian_name',
  relationship: 'guardian_relationship',
  parent_relationship: 'guardian_relationship',
  parent_phone: 'guardian_phone',
};

type AdmissionFoundationYear = {
  id: string;
  name: string;
  starts_on?: string;
  ends_on?: string;
};

type AdmissionFoundationClass = {
  id: string;
  academic_year_id: string;
  name: string;
  grade_level: string;
  curriculum: string;
  capacity?: number | null;
  enrolment_open?: boolean;
  student_count?: number;
};

type AdmissionFoundationStream = {
  id: string;
  class_section_id: string;
  name: string;
  capacity?: number | null;
  student_count?: number;
};

type AdmissionFoundationSubjectAssignment = {
  academic_year_id: string;
  class_section_id: string;
  subject_id: string;
};

type AdmissionFoundation = {
  academic_years: AdmissionFoundationYear[];
  classes: AdmissionFoundationClass[];
  streams: AdmissionFoundationStream[];
  class_subject_assignments: AdmissionFoundationSubjectAssignment[];
};

function formatReportValue(value: ReportCsvValue) {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  if (typeof value !== 'string') {
    return value;
  }

  return value
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

const ADMISSIONS_REPORT_EXPORTS = new Map<string, AdmissionsReportExportDefinition>([
  [
    'applications',
    {
      id: 'applications',
      title: 'Applications register',
      filename: 'admissions-applications.csv',
      headers: ['Applicant', 'Application No', 'Class', 'Parent Phone', 'Status'],
      rows: async (repository, tenantId) =>
        (await repository.listApplications(tenantId, {
          limit: ADMISSIONS_REPORT_EXPORT_LIMIT,
          offset: 0,
        })).map((application) => [
          application.full_name,
          application.application_number,
          application.class_applying,
          application.parent_phone,
          formatReportValue(application.status),
        ]),
    },
  ],
  [
    'documents',
    {
      id: 'documents',
      title: 'Document compliance',
      filename: 'admissions-documents.csv',
      headers: ['Learner', 'Document', 'File', 'Uploaded On', 'Verification'],
      rows: async (repository, tenantId) =>
        (await repository.listDocuments(tenantId, {
          limit: ADMISSIONS_REPORT_EXPORT_LIMIT,
          offset: 0,
        })).map((document) => [
          document.student_name ?? document.applicant_name ?? 'Unassigned learner',
          document.document_type,
          document.original_file_name,
          formatReportValue(document.created_at),
          formatReportValue(document.verification_status),
        ]),
    },
  ],
  [
    'allocations',
    {
      id: 'allocations',
      title: 'Allocation report',
      filename: 'admissions-allocations.csv',
      headers: ['Student', 'Class', 'Stream', 'Dormitory', 'Route', 'Status'],
      rows: async (repository, tenantId) =>
        (await repository.listAllocations(tenantId, {
          limit: ADMISSIONS_REPORT_EXPORT_LIMIT,
          offset: 0,
        })).map((allocation) => [
          [allocation.first_name, allocation.last_name].filter(Boolean).join(' '),
          allocation.class_name,
          allocation.stream_name,
          allocation.dormitory_name ?? 'Day school',
          allocation.transport_route ?? 'Not assigned',
          'Assigned',
        ]),
    },
  ],
  [
    'transfers',
    {
      id: 'transfers',
      title: 'Transfer history',
      filename: 'admissions-transfers.csv',
      headers: ['Learner Ref', 'Application Ref', 'Direction', 'School', 'Date', 'Status'],
      rows: async (repository, tenantId) =>
        (await repository.listTransfers(tenantId, {
          limit: ADMISSIONS_REPORT_EXPORT_LIMIT,
          offset: 0,
        })).map((transfer) => [
          transfer.student_id ?? 'No student linked',
          transfer.application_id ?? 'No application linked',
          formatReportValue(transfer.transfer_type),
          transfer.school_name,
          formatReportValue(transfer.requested_on),
          formatReportValue(transfer.status),
        ]),
    },
  ],
]);

@Injectable()
export class AdmissionsService {

  private async executeSql<T = any>(query: string, params: any[] = []): Promise<{ rows: T[], rowCount: number }> {
    const firstParam = params[0];
    const isUuid = typeof firstParam === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(firstParam);

    if ((this.prisma as any).query) {
      return (this.prisma as any).query(query, params);
    }

    
    if (isUuid) {
      return this.prisma.executeWithTenant(firstParam, null, async (tx: any) => {
        const result = await tx.$queryRawUnsafe(query, ...params);
        const arr = Array.isArray(result) ? result : [result];
        return { rows: arr, rowCount: arr.length };
      });
    } else {
      const result = await this.prisma.$queryRawUnsafe(query, ...params);
      const arr = Array.isArray(result) ? result : [result];
        return { rows: arr, rowCount: arr.length };
    }
  }

  constructor(
    private readonly requestContext: RequestContextService,
    private readonly prisma: PrismaService,
    private readonly admissionsRepository: AdmissionsRepository,
    private readonly documentStorage: AdmissionDocumentStorageService,
    private readonly studentsService: StudentsService,
    @Optional() private readonly tenantInvitationsService?: TenantInvitationsService,
    @Optional() private readonly eventPublisher?: EventPublisherService,
    @Optional() private readonly agp?: AgpExecutionService,
    @Optional() private readonly schoolOperationalEventsService?: SchoolOperationalEventsService,
    @Optional() private readonly uploadMalwareScan?: UploadMalwareScanService,
    @Optional() private readonly authorizationRepository?: AuthorizationRepository,
    @Optional() private readonly communicationSmsService?: CommunicationSmsService,
    @Optional() private readonly schoolOperationNotificationsRepository?: SchoolOperationNotificationsRepository,
    @Optional() private readonly cohortPromotion?: CohortPromotionService,
  ) {}

  async getSummary() {
    return this.admissionsRepository.buildSummary(this.requireTenantId());
  }

  private promotionService() {
    if (!this.cohortPromotion) throw new ConflictException('Cohort promotion service is unavailable.');
    return this.cohortPromotion;
  }

  private promotionActor() {
    return { tenantId: this.requireTenantId(), userId: this.requestContext.getStore()?.user_id ?? null,
      role: this.requestContext.getStore()?.role ?? null };
  }

  getPromotionOptions() { return this.promotionService().options(this.promotionActor()); }
  previewCohortPromotion(dto: CohortPromotionCommandDto) { return this.promotionService().preview(this.promotionActor(), dto); }
  commitCohortPromotion(dto: CohortPromotionCommandDto) { return this.promotionService().commit(this.promotionActor(), dto); }

  async listClassOptions() {
    return this.admissionsRepository.listClassOptions(this.requireTenantId());
  }

  async getAdmissionFoundation() {
    return this.admissionsRepository.getAdmissionFoundation(this.requireTenantId());
  }

  async updateAdmissionSettings(dto: UpdateAdmissionSettingsDto) {
    if (
      dto.minimum_age != null &&
      dto.maximum_age != null &&
      dto.minimum_age > dto.maximum_age
    ) {
      throw new BadRequestException('Minimum age cannot exceed maximum age');
    }
    if (
      dto.minimum_subjects != null &&
      dto.maximum_subjects != null &&
      dto.minimum_subjects > dto.maximum_subjects
    ) {
      throw new BadRequestException('Minimum subjects cannot exceed maximum subjects');
    }

    const context = this.requestContext.requireStore();
    return this.admissionsRepository.updateAdmissionSettings(
      this.requireTenantId(),
      context.user_id || null,
      {
        admission_number_mode: dto.admission_number_mode,
        admission_number_prefix: dto.admission_number_prefix.toUpperCase(),
        admission_number_separator: dto.admission_number_separator,
        admission_number_padding: dto.admission_number_padding,
        include_academic_year: dto.include_academic_year,
        strict_capacity: dto.strict_capacity,
        strict_age_rules: dto.strict_age_rules,
        minimum_age: dto.minimum_age ?? null,
        maximum_age: dto.maximum_age ?? null,
        minimum_subjects: dto.minimum_subjects ?? null,
        maximum_subjects: dto.maximum_subjects ?? null,
      },
    );
  }

  async getAdmissionDraft() {
    const context = this.requestContext.requireStore();
    if (!context.user_id) throw new UnauthorizedException('Signed-in user is required');
    return this.admissionsRepository.getAdmissionDraft(this.requireTenantId(), context.user_id);
  }

  async saveAdmissionDraft(dto: SaveAdmissionDraftDto) {
    const context = this.requestContext.requireStore();
    if (!context.user_id) throw new UnauthorizedException('Signed-in user is required');
    const allowed = new Set([
      'admission_number', 'first_name', 'middle_name', 'last_name', 'gender',
      'date_of_birth', 'admission_date', 'academic_year_id', 'curriculum',
      'grade_level', 'class_section_id', 'stream_id', 'subject_ids',
      'guardian_name', 'guardian_relationship', 'guardian_phone', 'step',
    ]);
    const payload = Object.fromEntries(
      Object.entries(dto.payload)
        .filter(([key]) => allowed.has(key))
        .map(([key, value]) => [key, Array.isArray(value) ? value.slice(0, 40) : value]),
    );
    return this.admissionsRepository.saveAdmissionDraft(
      this.requireTenantId(),
      context.user_id,
      payload,
    );
  }

  async discardAdmissionDraft() {
    const context = this.requestContext.requireStore();
    if (!context.user_id) throw new UnauthorizedException('Signed-in user is required');
    return this.admissionsRepository.discardAdmissionDraft(this.requireTenantId(), context.user_id);
  }

  async preflightManualAdmission(dto: CreateManualAdmissionDto) {
    const tenantId = this.requireTenantId();
    const admissionNumber = normalizeAdmissionNumber(dto.admission_number);
    const dateOfBirth = parseOptionalAdmissionDate(dto.date_of_birth, 'Date of birth');
    const admissionDate = parseAdmissionDate(dto.admission_date, 'Admission date');
    if (dateOfBirth && dateOfBirth > new Date().toISOString().slice(0, 10)) {
      throw new BadRequestException('Date of birth cannot be in the future');
    }
    const guardianPhone = normalizeKenyanPhone(dto.guardian_phone);
    const fullName = [dto.first_name, dto.middle_name, dto.last_name]
      .filter(Boolean)
      .map((value) => normalizePersonName(String(value), 'Student name'))
      .join(' ');
    const [preflight, settings] = await Promise.all([
      this.admissionsRepository.findAdmissionPreflight(tenantId, {
        admission_number: admissionNumber,
        full_name: fullName,
        date_of_birth: dateOfBirth,
        guardian_phone: guardianPhone,
        class_section_id: dto.class_section_id.trim(),
        stream_id: dto.stream_id?.trim() || null,
      }),
      this.admissionsRepository.getAdmissionSettings(tenantId),
    ]);
    const warnings: Array<{ code: string; message: string; blocking: boolean }> = [];
    for (const duplicate of preflight.possible_duplicates) {
      const exact = duplicate.match_reason === 'admission_number';
      warnings.push({
        code: exact ? 'ADMISSION_NUMBER_EXISTS' : 'POSSIBLE_DUPLICATE_STUDENT',
        message: exact
          ? `Admission number ${duplicate.admission_number} already belongs to ${duplicate.full_name}.`
          : `${duplicate.full_name} has the same date of birth. Review the existing student before creating another record.`,
        blocking: exact,
      });
    }

    const placement = preflight.placement;
    const classFormGradeName = String(
      placement?.name ?? dto.grade_level?.trim() ?? 'the selected class/form/grade',
    );
    const classAtCapacity = placement?.capacity != null
      && Number(placement.class_student_count ?? 0) >= Number(placement.capacity);
    const streamAtCapacity = placement?.stream_capacity != null
      && Number(placement.stream_student_count ?? 0) >= Number(placement.stream_capacity);
    if (classAtCapacity || streamAtCapacity) {
      warnings.push({
        code: 'PLACEMENT_CAPACITY_REACHED',
        message: streamAtCapacity
          ? 'The selected stream has reached its configured capacity.'
          : 'The selected class has reached its configured capacity.',
        blocking: settings.strict_capacity,
      });
    }

    let age: number | null = null;
    if (dateOfBirth) {
      const birth = new Date(`${dateOfBirth}T00:00:00.000Z`);
      const admitted = new Date(`${admissionDate}T00:00:00.000Z`);
      age = admitted.getUTCFullYear() - birth.getUTCFullYear();
      if (
        admitted.getUTCMonth() < birth.getUTCMonth() ||
        (admitted.getUTCMonth() === birth.getUTCMonth() && admitted.getUTCDate() < birth.getUTCDate())
      ) age -= 1;
      const gradeNumber = Number(classFormGradeName.match(/\d+/)?.[0] ?? NaN);
      const inferredAge = /form/i.test(classFormGradeName)
        ? (Number.isFinite(gradeNumber) ? 13 + gradeNumber : null)
        : (Number.isFinite(gradeNumber) ? 5 + gradeNumber : null);
      const ageOutsideConfigured =
        (settings.minimum_age != null && age < settings.minimum_age) ||
        (settings.maximum_age != null && age > settings.maximum_age);
      const ageOutsideExpected = inferredAge != null && Math.abs(age - inferredAge) > 3;
      if (ageOutsideConfigured || ageOutsideExpected) {
        warnings.push({
          code: 'UNUSUAL_GRADE_AGE',
          message: `The learner will be ${age} on admission, which is unusual for ${classFormGradeName}. Confirm the date and placement.`,
          blocking: settings.strict_age_rules && ageOutsideConfigured,
        });
      }
    }

    if (
      preflight.guardian &&
      String(preflight.guardian.display_name).toLowerCase() !== dto.guardian_name.trim().toLowerCase()
    ) {
      warnings.push({
        code: 'GUARDIAN_NAME_MISMATCH',
        message: `This phone is already linked to ${preflight.guardian.display_name}. Confirm that this is the same guardian.`,
        blocking: false,
      });
    }

    return {
      valid: !warnings.some((warning) => warning.blocking),
      warnings,
      possible_duplicates: preflight.possible_duplicates,
      guardian: preflight.guardian
        ? {
            guardian_profile_id: preflight.guardian.guardian_profile_id,
            display_name: preflight.guardian.display_name,
            masked_phone: `+254******${guardianPhone.slice(-3)}`,
            children: preflight.guardian.children,
          }
        : null,
      placement: preflight.placement,
      age_at_admission: age,
    };
  }

  async listApplications(query: ListAdmissionsQueryDto) {
    const normalized = this.normalizeListQuery(query, 25);

    return this.admissionsRepository.listApplications(this.requireTenantId(), {
      search: this.normalizeSearch(query.search),
      status: query.status?.trim() || undefined,
      limit: normalized.limit,
      offset: normalized.offset,
    });
  }

  async createApplication(dto: CreateApplicationDto) {
    if (!this.agp) throw new Error('AGP Execution Service is required for this operation');
    const dateOfBirth = parseOptionalAdmissionDate(dto.date_of_birth, 'Date of birth');
    if (dateOfBirth && dateOfBirth > new Date().toISOString().slice(0, 10)) {
      throw new BadRequestException('Date of birth cannot be in the future');
    }

    return this.agp.execute({
      actionName: 'APPLICATION_CREATED',
      requiredCapability: 'admissions:write',
      aggregateType: 'ADMISSION',
      aggregateId: dto.parent_email || dto.full_name,
      handler: async () => {
        return this.admissionsRepository.createApplication({
          ...dto,
          date_of_birth: dateOfBirth,
          school_id: this.requireTenantId(),
          application_number: `APP-${Date.now()}`,
          allergies: dto.allergies?.trim() || null,
          conditions: dto.conditions?.trim() || null,
          emergency_contact: dto.emergency_contact?.trim() || null,
          status: 'pending',
          interview_date: null,
          review_notes: null,
          previous_school: dto.previous_school || null,
          kcpe_results: dto.kcpe_results || null,
          cbc_level: dto.cbc_level || null,
          parent_email: dto.parent_email || null,
          parent_occupation: dto.parent_occupation || null,
          nemis_upi: dto.nemis_upi || null,
        });
      },
    });
  }

  async updateApplication(applicationId: string, dto: UpdateApplicationDto) {
    if (!this.agp) throw new Error('AGP Execution Service is required for this operation');

    const eventName = (dto.status === 'approved' || dto.status === 'cleared') ? 'admissions.cleared' : undefined;
    const eventPayload = eventName ? {
      tenant_id: this.requireTenantId(),
      applicant_id: applicationId,
      cleared_by: this.requestContext.requireStore().user_id || 'system',
    } : undefined;

    return this.agp.execute({
      actionName: 'APPLICATION_UPDATED',
      requiredCapability: 'admissions:write',
      aggregateType: 'ADMISSION',
      aggregateId: applicationId,
      eventName,
      eventPayload,
      handler: async () => {
        const application = await this.admissionsRepository.updateApplication(
          this.requireTenantId(),
          applicationId,
          {
            status: dto.status?.trim(),
            nemis_upi: dto.nemis_upi?.trim(),
            review_notes: dto.review_notes?.trim(),
            interview_date: dto.interview_date,
          },
        );

        if (!application) {
          throw new NotFoundException(`Admission application "${applicationId}" was not found`);
        }

        return application;
      },
    });
  }

  async storeApplicationDocument(
    applicationId: string,
    dto: UploadApplicationDocumentDto,
    file: UploadedBinaryFile,
  ) {
    if (!file?.buffer?.length) {
      throw new BadRequestException('A document file is required for upload');
    }

    const scannedFile = await this.scanUploadedDocument(file);

    return this.prisma.withRequestTransaction(async () => {
      const tenantId = this.requireTenantId();
      const application = await this.admissionsRepository.findApplicationById(tenantId, applicationId);

      if (!application) {
        throw new NotFoundException(`Admission application "${applicationId}" was not found`);
      }

      const persistedFile = await this.documentStorage.save({
        tenantId,
        scope: 'admissions',
        file: scannedFile,
      });

      return this.admissionsRepository.saveDocumentRecord({
        school_id: tenantId,
        application_id: applicationId,
        student_id: null,
        document_type: dto.document_type.trim(),
        original_file_name: persistedFile.original_file_name,
        stored_path: persistedFile.stored_path,
        mime_type: persistedFile.mime_type,
        size_bytes: persistedFile.size_bytes,
        verification_status: 'pending',
        uploaded_by_user_id:
          dto.uploaded_by_user_id?.trim() || this.requestContext.getStore()?.user_id || null,
      });
    });
  }

  private async scanUploadedDocument(file: UploadedBinaryFile): Promise<UploadedBinaryFile> {
    validateUploadedFile(file);

    const providerMalwareScan = await this.uploadMalwareScan?.scanIfConfigured(file);

    if (!providerMalwareScan) {
      return file;
    }

    const scannedFile = { ...file, providerMalwareScan };
    validateUploadedFile(scannedFile);
    return scannedFile;
  }

  async registerApprovedApplication(applicationId: string, dto: RegisterApplicationDto) {
    const command = async () => this.prisma.withRequestTransaction(async () => {
      const context = this.requestContext.requireStore();
      const tenantId = this.requireTenantId();
      const application = await this.admissionsRepository.findApplicationByIdForUpdate(
        tenantId,
        applicationId,
      );

      if (!application) {
        throw new NotFoundException(`Admission application "${applicationId}" was not found`);
      }

      if (application.status === 'registered' && application.admitted_student_id) {
        const student = await this.studentsService.getStudent(application.admitted_student_id);
        const allocation = await this.admissionsRepository.findCurrentAllocationByStudentId(
          tenantId,
          application.admitted_student_id,
        );

        return {
          student,
          allocation,
          academic_enrollment: null,
          subject_enrollments: [],
          timetable_enrollments: [],
          parent_invitation: null,
          guardian_link: null,
          fee_assignment: null,
          fee_invoice: null,
          application_status: 'registered',
          notification_delivery: {
            guardian_sms: {
              status: 'not_requeued',
              queue_id: null,
              recipient_phone_last4: application.parent_phone.trim().slice(-4),
              reason: 'application_already_registered',
            } satisfies AdmissionGuardianSmsDelivery,
          },
          operation_event: {
            status: 'not_replayed',
            event_key: null,
            reason: 'application_already_registered',
          } satisfies AdmissionOperationEventDelivery,
          idempotent_replay: true,
        };
      }

      if (application.status !== 'approved') {
        throw new BadRequestException('Only approved applications can be registered');
      }

      // This tenant-scoped application is the only authority for the guardian
      // recipient. Normalize before any write so student, guardian, and SMS
      // records cannot diverge on legacy Kenyan phone formats.
      const guardianPhone = normalizeKenyanPhone(application.parent_phone);

      const className = dto.class_name.trim();
      const streamName = dto.stream_name.trim();
      const academicClassSection = await this.admissionsRepository.findAcademicClassSectionForUpdate(
        tenantId,
        className,
        streamName,
      );
      this.assertAcademicCapacityAvailable(className, streamName, academicClassSection);
      const canonicalClassName = String(academicClassSection!.class_name ?? className).trim();
      const canonicalStreamName = streamName
        ? String(academicClassSection!.stream_name ?? streamName).trim()
        : '';

      const nameParts = this.splitName(application.full_name);
      const student = await this.studentsService.createStudent({
        admission_number: dto.admission_number.trim(),
        first_name: nameParts.first_name,
        last_name: nameParts.last_name,
        middle_name: nameParts.middle_name ?? undefined,
        status: 'active',
        date_of_birth: application.date_of_birth ?? undefined,
        gender: this.mapApplicationGender(application.gender),
        primary_guardian_name: application.parent_name,
        primary_guardian_phone: guardianPhone,
        metadata: {
          admissions: {
            application_id: application.id,
            class_applying: application.class_applying,
            previous_school: application.previous_school,
            kcpe_results: application.kcpe_results,
            cbc_level: application.cbc_level,
            nemis_upi: application.nemis_upi,
            nationality: application.nationality,
            medical: {
              allergies: application.allergies,
              conditions: application.conditions,
              emergency_contact: application.emergency_contact,
            },
            guardian: {
              parent_name: application.parent_name,
              parent_email: application.parent_email,
              parent_occupation: application.parent_occupation,
              relationship: application.relationship,
            },
          },
        },
      });

      await this.admissionsRepository.markApplicationRegistered(tenantId, applicationId, student.id);
      await this.admissionsRepository.attachApplicationDocumentsToStudent(
        tenantId,
        applicationId,
        student.id,
      );
      const allocation = await this.admissionsRepository.createAllocation({
        school_id: tenantId,
        student_id: student.id,
        class_name: canonicalClassName,
        stream_name: canonicalStreamName,
        dormitory_name: dto.dormitory_name?.trim() || null,
        transport_route: dto.transport_route?.trim() || null,
        effective_from: new Date().toISOString().slice(0, 10),
      });
      const academicEnrollment = await this.createAcademicEnrollment(
        tenantId,
        application.id,
        student.id,
        canonicalClassName,
        canonicalStreamName,
        academicClassSection,
      );
      await this.publishAcademicEnrollmentCreated(tenantId, student.id, academicEnrollment);
      const subjectTimetableEnrollment = await this.enrollSubjectsAndTimetable(
        tenantId,
        student.id,
        academicEnrollment,
        academicClassSection,
      );
      const parentInvitation = await this.inviteParentPortalUser(application);
      const guardianLink = await this.linkParentGuardian(
        tenantId,
        student.id,
        { ...application, parent_phone: guardianPhone },
        parentInvitation,
      );
      const feeRegistration = await this.assignRegistrationFees(
        tenantId,
        application,
        student.id,
        dto.class_name.trim(),
      );

      // A Pending outbox row is only a truthful queued state. It is not proof
      // of provider dispatch or delivery.
      const guardianSmsDelivery = await this.queueAdmissionGuardianSms({
        tenantId,
        actorUserId: context.user_id,
        idempotencyKey: `admission-guardian:${application.id}:${student.id}`,
        recipientPhone: guardianPhone,
        message: `Dear parent, ${application.full_name} has been admitted to ${canonicalClassName}. Admission Number: ${student.admission_number}.`,
      });

      let operationEvent: AdmissionOperationEventDelivery;

      if (this.schoolOperationalEventsService) {
        try {
          const recordedOperation = await this.schoolOperationalEventsService.recordSchoolOperation({
            schoolId: tenantId,
            event: {
              id: `admission-registration-${application.id}`,
              type: 'admission.application.registered',
              module: 'admissions',
              actorRole: context.role ?? 'admissions_officer',
              title: 'Application Registered',
              body: `Admission application for ${application.full_name} has been completed.`,
              entityId: application.id,
              severity: 'success',
              payload: {
                application_id: application.id,
                student_id: student.id,
                admission_number: student.admission_number,
                class_name: canonicalClassName,
                guardian_sms_status: guardianSmsDelivery.status,
                guardian_sms_queue_id: guardianSmsDelivery.queue_id,
                guardian_sms_recipient_last4: guardianSmsDelivery.recipient_phone_last4,
              },
            },
            notifications: [
              {
                id: `admission-finance-${student.id}`,
                school_id: tenantId,
                audienceRoles: ['accountant', 'finance', 'principal'],
                title: 'Fee Collection Required',
                body: `Registration fees for newly admitted student ${application.full_name} (${student.admission_number}) require collection.`,
                sourceModule: 'admissions',
                relatedModule: 'finance',
                relatedRecordId: student.id,
                priority: 'high',
                read: false,
                created_at: new Date().toISOString(),
              },
              {
                id: `admission-teacher-${student.id}`,
                school_id: tenantId,
                audienceRoles: ['class-teacher', 'teacher'],
                title: 'New Student Admitted',
                body: `${application.full_name} has been admitted to your class ${canonicalClassName}.`,
                sourceModule: 'admissions',
                relatedModule: 'academics',
                relatedRecordId: student.id,
                priority: 'normal',
                read: false,
                created_at: new Date().toISOString(),
              },
            ],
          });
          operationEvent = {
            status: 'recorded',
            event_key: typeof recordedOperation?.event_key === 'string'
              ? recordedOperation.event_key
              : null,
            reason: null,
          };
        } catch {
          operationEvent = {
            status: 'degraded',
            event_key: null,
            reason: 'operation_event_recording_failed',
          };
        }
      } else {
        operationEvent = {
          status: 'degraded',
          event_key: null,
          reason: 'operation_event_service_unavailable',
        };
      }

      return {
        student,
        allocation,
        academic_enrollment: academicEnrollment,
        subject_enrollments: subjectTimetableEnrollment.subject_enrollments,
        timetable_enrollments: subjectTimetableEnrollment.timetable_enrollments,
        parent_invitation: parentInvitation,
        guardian_link: guardianLink,
        fee_assignment: feeRegistration?.assignment ?? null,
        fee_invoice: feeRegistration?.invoice ?? null,
        application_status: 'registered',
        notification_delivery: { guardian_sms: guardianSmsDelivery },
        operation_event: operationEvent,
        idempotent_replay: false,
      };
    });

    if (!this.agp) return command();
    return this.agp.execute({
      actionName: 'APPROVED_APPLICATION_REGISTERED',
      requiredCapability: 'admissions:write',
      aggregateType: 'ADMISSION',
      aggregateId: applicationId,
      handler: command,
    });
  }

  async createManualAdmission(dto: CreateManualAdmissionDto) {
    const context = this.requestContext.requireStore();
    const tenantId = this.requireTenantId();
    const dateOfBirth = parseOptionalAdmissionDate(dto.date_of_birth, 'Date of birth');
    const admissionDate = parseAdmissionDate(dto.admission_date, 'Admission date');
    const admissionNumber = normalizeAdmissionNumber(dto.admission_number);
    if (dateOfBirth && dateOfBirth > new Date().toISOString().slice(0, 10)) {
      throw new BadRequestException('Date of birth cannot be in the future');
    }

    const guardianPhone = normalizeKenyanPhone(dto.guardian_phone);
    const securityPepper = process.env.SECURITY_PII_ENCRYPTION_KEY ?? '';
    if (!securityPepper && process.env.NODE_ENV === 'production') {
      throw new BadRequestException('Parent portal security key is not configured');
    }
    const effectivePepper = securityPepper || 'myshule-test-parent-portal-pepper';
    const phoneHash = createHash('sha256')
      .update(`${guardianPhone.replace(/\D/g, '')}:${effectivePepper}`)
      .digest('hex');
    const internalIdentityHash = createHash('sha256')
      .update(`${tenantId}:${guardianPhone}`)
      .digest('hex')
      .slice(0, 32);
    const configuredSaltRounds = Number(process.env.BCRYPT_SALT_ROUNDS ?? 12);
    const saltRounds = Number.isInteger(configuredSaltRounds) && configuredSaltRounds >= 10
      ? configuredSaltRounds
      : 12;
    const initialPortalPasswordHash = await bcrypt.hash(admissionNumber, saltRounds);

    const command = async () => {
      let result: any;
      try {
        await this.authorizationRepository?.ensureTenantAuthorizationBaseline(tenantId);
        result = await this.admissionsRepository.admitCanonicalStudent({
          tenant_id: tenantId,
          actor_user_id: context.user_id || null,
          admission_number: admissionNumber,
          first_name: normalizePersonName(dto.first_name, 'First name'),
          middle_name: dto.middle_name
            ? normalizePersonName(dto.middle_name, 'Middle name')
            : null,
          last_name: normalizePersonName(dto.last_name, 'Last name'),
          gender: dto.gender,
          date_of_birth: dateOfBirth,
          admission_date: admissionDate,
          academic_year_id: dto.academic_year_id.trim(),
          curriculum: dto.curriculum.trim(),
          class_section_id: dto.class_section_id.trim(),
          stream_id: dto.stream_id?.trim() || null,
          subject_ids: dto.subject_ids.map((subjectId) => subjectId.trim()).filter(Boolean),
          guardian_name: normalizePersonName(dto.guardian_name, 'Guardian name'),
          guardian_relationship: normalizePersonName(
            dto.guardian_relationship,
            'Guardian relationship',
          ),
          guardian_phone: guardianPhone,
          guardian_phone_hash: phoneHash,
          guardian_phone_last4: guardianPhone.slice(-4),
          guardian_internal_email: `guardian-${internalIdentityHash}@access.myshule.internal`,
          guardian_password_hash: initialPortalPasswordHash,
          student_password_hash: initialPortalPasswordHash,
          dormitory_name: dto.dormitory_name?.trim() || null,
          transport_route: dto.transport_route?.trim() || null,
        }, this.eventPublisher
          ? ({ tx, result: admitted }) => this.publishManualAdmissionEvents({
              tenantId,
              actorUserId: context.user_id || null,
              actorRole: context.role ?? 'admissions',
              guardianPhone,
              admitted,
              tx,
            })
          : undefined);
      } catch (error) {
        this.rethrowCanonicalAdmissionError(error);
      }

      return result;
    };

    if (!this.agp) return command();
    return this.agp.execute({
      actionName: 'STUDENT_ADMITTED',
      requiredCapability: 'admissions:write',
      aggregateType: 'student',
      aggregateId: normalizeAdmissionNumber(dto.admission_number),
      governanceRecordedInHandler: true,
      retrySafe: false,
      handler: command,
    });
  }

  private async publishManualAdmissionEvents(input: {
    tenantId: string;
    actorUserId: string | null;
    actorRole: string;
    guardianPhone: string;
    admitted: any;
    tx: any;
  }) {
    if (!this.eventPublisher) {
      throw new Error('Admission event publisher is unavailable');
    }

    const { admitted, tenantId, actorUserId, actorRole, guardianPhone, tx } = input;
    const student = admitted.student;
    const createdAt = new Date().toISOString();

    await this.eventPublisher.publish({
      tenant_id: tenantId,
      event_key: `student.created:${student.id}`,
      event_name: 'student.created',
      aggregate_type: 'student',
      aggregate_id: student.id,
      payload: {
        tenant_id: tenantId,
        student_id: student.id,
        created_at: createdAt,
        created_by_user_id: actorUserId,
        admission_number: student.admission_number,
        first_name: student.first_name,
        last_name: student.last_name,
        metadata: {
          source: 'ordinary_admission',
          class_section_id: admitted.placement.class_section_id,
          stream_id: admitted.placement.stream_id,
        },
      },
    }, tx);
    await this.eventPublisher.publish({
      tenant_id: tenantId,
      event_key: `student.lifecycle.enrolled:${student.id}:${admitted.placement.academic_year_id}`,
      event_name: 'student.lifecycle.enrolled',
      aggregate_type: 'student',
      aggregate_id: student.id,
      payload: { tenant_id: tenantId, student_id: student.id, status: 'active' },
    }, tx);
    await this.eventPublisher.publish({
      tenant_id: tenantId,
      event_key: `student.lifecycle.class_assigned:${student.id}:${admitted.placement.academic_year_id}`,
      event_name: 'student.lifecycle.class_assigned',
      aggregate_type: 'student',
      aggregate_id: student.id,
      payload: {
        tenant_id: tenantId,
        student_id: student.id,
        class_id: admitted.placement.class_section_id,
      },
    }, tx);
    await this.eventPublisher.publish({
      tenant_id: tenantId,
      event_key: `student.academic_enrollment.created:${admitted.placement.academic_enrollment_id}`,
      event_name: 'student.academic_enrollment.created',
      aggregate_type: 'student_academic_enrollment',
      aggregate_id: admitted.placement.academic_enrollment_id,
      payload: {
        tenant_id: tenantId,
        student_id: student.id,
        academic_enrollment_id: admitted.placement.academic_enrollment_id,
        application_id: admitted.application_id,
        class_section_id: admitted.placement.class_section_id,
        class_name: admitted.placement.class_name,
        stream_name: admitted.placement.stream_name ?? 'Unstreamed',
        academic_year: admitted.placement.academic_year_name,
        status: 'active',
        occurred_at: createdAt,
      },
    }, tx);
    await this.eventPublisher.publish({
      tenant_id: tenantId,
      event_key: `student.admission_number.assigned:${student.id}:${student.admission_number}`,
      event_name: 'student.admission_number.assigned',
      aggregate_type: 'student',
      aggregate_id: student.id,
      payload: {
        tenant_id: tenantId,
        student_id: student.id,
        admission_number: student.admission_number,
        assigned_by_user_id: actorUserId,
      },
    }, tx);
    await this.eventPublisher.publish({
      tenant_id: tenantId,
      event_key: `student.subjects.assigned:${student.id}:${admitted.placement.academic_year_id}`,
      event_name: 'student.subjects.assigned',
      aggregate_type: 'student',
      aggregate_id: student.id,
      payload: {
        tenant_id: tenantId,
        student_id: student.id,
        academic_year_id: admitted.placement.academic_year_id,
        class_section_id: admitted.placement.class_section_id,
        stream_id: admitted.placement.stream_id,
        subject_ids: admitted.subjects.map((subject: any) => subject.id),
      },
    }, tx);
    await this.eventPublisher.publish({
      tenant_id: tenantId,
      event_key: `student.guardian.linked:${student.id}:${admitted.guardian.profile_id}`,
      event_name: 'student.guardian.linked',
      aggregate_type: 'student_guardian',
      aggregate_id: admitted.guardian.profile_id,
      payload: {
        tenant_id: tenantId,
        student_id: student.id,
        guardian_profile_id: admitted.guardian.profile_id,
        is_primary: true,
      },
    }, tx);
    await this.eventPublisher.publish({
      tenant_id: tenantId,
      event_key: `student.credentials.created:${student.id}`,
      event_name: 'student.credentials.created',
      aggregate_type: 'student_portal_access',
      aggregate_id: student.id,
      payload: {
        tenant_id: tenantId,
        student_id: student.id,
        username: admitted.student_portal.username,
        force_password_change: true,
        recovery_phone_last4: guardianPhone.slice(-4),
      },
    }, tx);

    const fullName = [student.first_name, student.middle_name, student.last_name]
      .filter(Boolean)
      .join(' ');
    const operationId = `student-admitted-${student.id}`;
    const notifications = [
      {
        id: `student-admitted-finance-${student.id}`,
        school_id: tenantId,
        audienceRoles: ['accountant', 'bursar', 'principal'],
        title: 'New student admitted',
        body: `${fullName} is ready for fee processing.`,
        sourceModule: 'admissions',
        relatedModule: 'finance',
        relatedRecordId: student.id,
        priority: 'normal',
        read: false,
        created_at: createdAt,
      },
      {
        id: `student-admitted-class-${student.id}`,
        school_id: tenantId,
        audienceRoles: ['teacher', 'class_teacher', 'deputy_principal'],
        title: 'Learner added to class',
        body: `${fullName} was placed in ${admitted.placement.class_name}.`,
        sourceModule: 'admissions',
        relatedModule: 'academics',
        relatedRecordId: student.id,
        priority: 'normal',
        read: false,
        created_at: createdAt,
      },
    ];
    await this.eventPublisher.publish({
      tenant_id: tenantId,
      event_key: `school.operation.recorded:${tenantId}:${operationId}`,
      event_name: 'school.operation.recorded',
      aggregate_type: 'school_operation',
      aggregate_id: student.id,
      payload: {
        tenant_id: tenantId,
        school_id: tenantId,
        operation_id: operationId,
        operation_type: 'student.admitted',
        module: 'admissions',
        actor_role: actorRole.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_'),
        title: 'Student admitted',
        body: `${fullName} was admitted to ${admitted.placement.class_name}.`,
        entity_id: student.id,
        severity: 'success',
        target_roles: ['accountant', 'bursar', 'principal', 'teacher', 'class_teacher', 'deputy_principal'],
        target_user_ids: [],
        notifications,
        sms: [],
        payload: {
          application_id: admitted.application_id,
          student_id: student.id,
          admission_number: student.admission_number,
          class_section_id: admitted.placement.class_section_id,
          stream_id: admitted.placement.stream_id,
        },
        occurred_at: createdAt,
      },
    }, tx);

    if (this.schoolOperationNotificationsRepository) {
      for (const notification of notifications) {
        await this.schoolOperationNotificationsRepository.upsertFromSchoolOperation({
          tenantId,
          operationId,
          notification,
        }, tx);
      }
    }
  }

  async changeStudentAdmissionNumber(
    studentId: string,
    dto: ChangeStudentAdmissionNumberDto,
  ) {
    const context = this.requestContext.requireStore();
    if (!context.user_id) throw new UnauthorizedException('Signed-in user is required');
    const tenantId = this.requireTenantId();
    const admissionNumber = normalizeAdmissionNumber(dto.admission_number);
    const configuredSaltRounds = Number(process.env.BCRYPT_SALT_ROUNDS ?? 12);
    const saltRounds = Number.isInteger(configuredSaltRounds) && configuredSaltRounds >= 10
      ? configuredSaltRounds
      : 12;
    const temporaryPasswordHash = await bcrypt.hash(admissionNumber, saltRounds);
    const command = async () => {
      let result: any;
      try {
        result = await this.admissionsRepository.changeStudentAdmissionNumber({
          tenant_id: tenantId,
          actor_user_id: context.user_id!,
          student_id: studentId,
          admission_number: admissionNumber,
          temporary_password_hash: temporaryPasswordHash,
          reason: dto.reason.trim(),
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (message.includes('ADMISSION_STUDENT_NOT_FOUND')) {
          throw new NotFoundException('Student was not found in this school');
        }
        this.rethrowCanonicalAdmissionError(error);
      }
      if (result.changed && this.eventPublisher) {
        await this.eventPublisher.publish({
          event_key: `student.admission_number.changed:${studentId}:${admissionNumber}`,
          event_name: 'student.admission_number.changed',
          aggregate_type: 'student',
          aggregate_id: studentId,
          payload: {
            tenant_id: tenantId,
            student_id: studentId,
            previous_admission_number: result.previous_admission_number,
            admission_number: admissionNumber,
            changed_by_user_id: context.user_id,
            reason: dto.reason.trim(),
            pending_otps_invalidated: result.pending_otps_invalidated,
          },
        });
      }
      if (result.changed && this.schoolOperationalEventsService) {
        await this.schoolOperationalEventsService.recordSchoolOperation({
          schoolId: tenantId,
          event: {
            id: randomUUID(),
            type: 'student.admission_number.changed',
            module: 'admissions',
            actorRole: context.role ?? 'admissions',
            title: 'Admission number changed',
            body: `A student admission number changed from ${result.previous_admission_number} to ${admissionNumber}.`,
            entityId: studentId,
            severity: 'warning',
            payload: {
              student_id: studentId,
              previous_admission_number: result.previous_admission_number,
              admission_number: admissionNumber,
            },
          },
          notifications: [{
            id: `student-admission-number-changed-${studentId}-${Date.now()}`,
            school_id: tenantId,
            audienceRoles: ['principal', 'deputy-principal', 'admissions'],
            title: 'Student admission number changed',
            body: `${result.previous_admission_number} is now ${admissionNumber}. Pending portal codes were invalidated.`,
            sourceModule: 'admissions',
            relatedModule: 'students',
            relatedRecordId: studentId,
            priority: 'high',
            read: false,
            created_at: new Date().toISOString(),
          }],
        });
      }
      return result;
    };
    if (!this.agp) return command();
    return this.agp.execute({
      actionName: 'STUDENT_ADMISSION_NUMBER_CHANGED',
      requiredCapability: 'admissions:write',
      aggregateType: 'student',
      aggregateId: studentId,
      handler: command,
    });
  }

  async changePrimaryGuardianPhone(studentId: string, dto: ChangeGuardianPhoneDto) {
    const context = this.requestContext.requireStore();
    if (!context.user_id) throw new UnauthorizedException('Signed-in user is required');
    const tenantId = this.requireTenantId();
    const guardianPhone = normalizeKenyanPhone(dto.guardian_phone);
    const securityPepper = process.env.SECURITY_PII_ENCRYPTION_KEY ?? '';
    if (!securityPepper && process.env.NODE_ENV === 'production') {
      throw new BadRequestException('Parent portal security key is not configured');
    }
    const phoneHash = createHash('sha256')
      .update(`${guardianPhone.replace(/\D/g, '')}:${securityPepper || 'myshule-test-parent-portal-pepper'}`)
      .digest('hex');
    const command = async () => {
      let result: any;
      try {
        result = await this.admissionsRepository.changePrimaryGuardianPhone({
          tenant_id: tenantId,
          actor_user_id: context.user_id!,
          student_id: studentId,
          guardian_phone: guardianPhone,
          guardian_phone_hash: phoneHash,
          guardian_phone_last4: guardianPhone.slice(-4),
          reason: dto.reason.trim(),
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (message.includes('ADMISSION_STUDENT_NOT_FOUND')) {
          throw new NotFoundException('Student was not found in this school');
        }
        if (message.includes('PRIMARY_GUARDIAN_NOT_FOUND')) {
          throw new BadRequestException('The student does not have an active primary guardian');
        }
        if (message.includes('GUARDIAN_PHONE_BELONGS_TO_ANOTHER_PROFILE')) {
          throw new ConflictException(
            'That phone belongs to another guardian in this school. Use the guardian-link workflow instead.',
          );
        }
        throw error;
      }
      if (result.changed && this.eventPublisher) {
        await this.eventPublisher.publish({
          event_key: `student.guardian_phone.changed:${result.guardian_profile_id}:${Date.now()}`,
          event_name: 'student.guardian_phone.changed',
          aggregate_type: 'guardian_profile',
          aggregate_id: result.guardian_profile_id,
          payload: {
            tenant_id: tenantId,
            student_id: studentId,
            guardian_profile_id: result.guardian_profile_id,
            affected_student_ids: result.affected_student_ids,
            previous_phone_last4: result.previous_phone_last4,
            phone_last4: result.phone_last4,
            changed_by_user_id: context.user_id,
            reason: dto.reason.trim(),
            pending_otps_invalidated: result.pending_otps_invalidated,
          },
        });
      }
      if (result.changed && this.schoolOperationalEventsService) {
        const sms = [
          this.isNormalizedKenyanPhone(result.previous_phone)
            ? {
                phone: result.previous_phone,
                message: 'Your MyShule recovery phone was changed by authorized school staff. Contact the school immediately if this was unexpected.',
              }
            : null,
          {
            phone: guardianPhone,
            message: 'This number is now the verified MyShule recovery contact. Existing verification codes were invalidated.',
          },
        ].filter((item): item is { phone: string; message: string } => Boolean(item));
        await this.schoolOperationalEventsService.recordSchoolOperation({
          schoolId: tenantId,
          event: {
            id: randomUUID(),
            type: 'student.guardian_phone.changed',
            module: 'admissions',
            actorRole: context.role ?? 'admissions',
            title: 'Guardian recovery phone changed',
            body: `Recovery contact updated for ${result.affected_student_ids.length} linked student account(s).`,
            entityId: result.guardian_profile_id,
            severity: 'warning',
            payload: {
              guardian_profile_id: result.guardian_profile_id,
              affected_student_ids: result.affected_student_ids,
              previous_phone_last4: result.previous_phone_last4,
              phone_last4: result.phone_last4,
            },
          },
          notifications: [{
            id: `guardian-phone-changed-${result.guardian_profile_id}-${Date.now()}`,
            school_id: tenantId,
            audienceRoles: ['principal', 'deputy-principal', 'admissions'],
            title: 'Guardian recovery phone changed',
            body: `Recovery contact ending ${result.previous_phone_last4 || 'unknown'} changed to ending ${result.phone_last4}.`,
            sourceModule: 'admissions',
            relatedModule: 'students',
            relatedRecordId: studentId,
            priority: 'high',
            read: false,
            created_at: new Date().toISOString(),
          }],
          sms,
        });
      }
      const { previous_phone: _privatePreviousPhone, ...safeResult } = result;
      return safeResult;
    };
    if (!this.agp) return command();
    return this.agp.execute({
      actionName: 'STUDENT_GUARDIAN_PHONE_CHANGED',
      requiredCapability: 'admissions:write',
      aggregateType: 'guardian_profile',
      aggregateId: studentId,
      handler: command,
    });
  }

  async listStudents(query: ListAdmissionsQueryDto) {
    const normalized = this.normalizeListQuery(query, 25);

    return this.admissionsRepository.listStudentDirectory(this.requireTenantId(), {
      search: this.normalizeSearch(query.search),
      limit: normalized.limit,
      offset: normalized.offset,
    });
  }

  async getStudentProfile(studentId: string) {
    const profile = await this.admissionsRepository.getStudentProfile(this.requireTenantId(), studentId);

    if (!profile) {
      throw new NotFoundException(`Student "${studentId}" was not found`);
    }

    return profile;
  }

  async advanceStudentAcademicLifecycle(
    studentId: string,
    dto: AdvanceAcademicLifecycleDto,
  ) {
    if (dto.action === 'promotion') return this.promotionService().promoteSingle(this.promotionActor(), studentId, dto);
    return this.prisma.withRequestTransaction(async (tx: any) => {
      const tenantId = this.requireTenantId();
      const action = this.parseAcademicLifecycleAction(dto.action);
      const activeEnrollment = await this.requireActiveAcademicEnrollment(
        tenantId, studentId, action === 'promotion' ? tx : undefined,
      );


      const nextStudentStatus = action === 'graduation' ? 'graduated' : 'inactive';
      const completedEnrollment = await this.admissionsRepository.completeStudentAcademicEnrollment(
        tenantId,
        activeEnrollment.id,
        action === 'graduation' ? 'completed' : 'withdrawn',
      );
      const student = await this.studentsService.updateStudent(studentId, {
        status: nextStudentStatus,
      });
      const lifecycleEvent = await this.recordAcademicLifecycleEvent({
        tenantId,
        studentId,
        sourceEnrollment: activeEnrollment,
        eventType: action,
        reason: dto.reason,
        notes: dto.notes,
      });
      await this.publishAcademicLifecycleChanged(
        tenantId,
        studentId,
        activeEnrollment,
        lifecycleEvent,
      );

      return {
        lifecycle_event: lifecycleEvent,
        previous_academic_enrollment: completedEnrollment ?? activeEnrollment,
        academic_enrollment: null,
        allocation: null,
        subject_enrollments: [],
        timetable_enrollments: [],
        student_status: student.status ?? nextStudentStatus,
      };
    });
  }

  async listParents(query: ListAdmissionsQueryDto = {}) {
    const normalized = this.normalizeListQuery(query, 25);

    return this.admissionsRepository.listParents(this.requireTenantId(), {
      search: this.normalizeSearch(query.search),
      limit: normalized.limit,
      offset: normalized.offset,
    });
  }

  async listDocuments(query: ListAdmissionsQueryDto = {}) {
    const normalized = this.normalizeListQuery(query, 25);

    return this.admissionsRepository.listDocuments(this.requireTenantId(), {
      search: this.normalizeSearch(query.search),
      status: query.status?.trim() || undefined,
      limit: normalized.limit,
      offset: normalized.offset,
    });
  }

  async updateDocumentVerificationStatus(
    documentId: string,
    dto: UpdateDocumentVerificationDto,
  ) {
    const document = await this.admissionsRepository.updateDocumentVerificationStatus(
      this.requireTenantId(),
      documentId,
      dto.verification_status.trim(),
    );

    if (!document) {
      throw new NotFoundException(`Admissions document "${documentId}" was not found`);
    }

    return document;
  }

  async listAllocations(query: ListAdmissionsQueryDto = {}) {
    const normalized = this.normalizeListQuery(query, 25);

    return this.admissionsRepository.listAllocations(this.requireTenantId(), {
      search: this.normalizeSearch(query.search),
      limit: normalized.limit,
      offset: normalized.offset,
    });
  }

  async assignAllocation(studentId: string, dto: CreateAllocationDto) {
    return this.admissionsRepository.createAllocation({
      school_id: this.requireTenantId(),
      student_id: studentId,
      class_name: dto.class_name.trim(),
      stream_name: dto.stream_name.trim(),
      dormitory_name: dto.dormitory_name?.trim() || null,
      transport_route: dto.transport_route?.trim() || null,
      effective_from: dto.effective_from ?? new Date().toISOString().slice(0, 10),
      notes: null,
    });
  }

  async listTransfers(query: ListAdmissionsQueryDto = {}) {
    const normalized = this.normalizeListQuery(query, 25);

    return this.admissionsRepository.listTransfers(this.requireTenantId(), {
      search: this.normalizeSearch(query.search),
      status: query.status?.trim() || undefined,
      limit: normalized.limit,
      offset: normalized.offset,
    });
  }

  async createTransfer(dto: CreateTransferRecordDto) {
    return this.admissionsRepository.createTransferRecord({
      school_id: this.requireTenantId(),
      student_id: dto.student_id?.trim() || null,
      application_id: dto.application_id?.trim() || null,
      transfer_type: dto.transfer_type.trim(),
      school_name: dto.school_name.trim(),
      reason: dto.reason.trim(),
      requested_on: dto.requested_on ?? new Date().toISOString().slice(0, 10),
      status: 'pending',
      notes: dto.notes?.trim() || null,
    });
  }

  async getReports() {
    return this.admissionsRepository.buildReports(this.requireTenantId());
  }

  async generateReport(tenantId: string, type: string) {
    return { success: true, message: `Report ${type} generated successfully` };
  }

  getImportTemplate() {
    return createCsvReportArtifact({
      reportId: 'admissions-import-template',
      title: 'Student admission import template',
      filename: 'myshule-student-admission-template.csv',
      headers: [...ADMISSIONS_IMPORT_HEADERS],
      rows: [],
    });
  }

  async commitImports(dto: BulkAdmissionCommitDto) {
    const tenantId = this.requireTenantId();
    const results: Array<Record<string, unknown>> = [];

    for (const row of dto.rows) {
      try {
        const admitted = await this.createManualAdmission(row);
        results.push({
          row_number: row.row_number,
          admission_number: row.admission_number,
          status: 'admitted',
          student_id: admitted.student.id,
          class_name: admitted.placement.class_name,
        });
      } catch (error) {
        results.push({
          row_number: row.row_number,
          admission_number: row.admission_number,
          status: 'failed',
          error: this.importErrorMessage(error),
        });
      }
    }

    const admittedRows = results.filter((row) => row.status === 'admitted').length;
    const failedRows = results.length - admittedRows;
    const importId = randomUUID();
    await this.publishAdmissionEvent('admissions.bulk_import.completed', tenantId, importId, {
      total_rows: results.length,
      admitted_rows: admittedRows,
      failed_rows: failedRows,
    });

    return {
      success: failedRows === 0,
      import_id: importId,
      total_rows: results.length,
      admitted_rows: admittedRows,
      failed_rows: failedRows,
      results,
    };
  }

  async exportReportCsv(reportId: string) {
    const normalizedReportId = reportId.trim().toLowerCase();
    const definition = ADMISSIONS_REPORT_EXPORTS.get(normalizedReportId);

    if (!definition) {
      throw new BadRequestException(`Unknown admissions report export "${reportId}"`);
    }

    const rows = await definition.rows(this.admissionsRepository, this.requireTenantId());

    return createCsvReportArtifact({
      reportId: definition.id,
      title: definition.title,
      filename: definition.filename,
      headers: definition.headers,
      rows,
    });
  }

  private requireTenantId() {
    const tenantId = this.requestContext.getStore()?.tenant_id;

    if (!tenantId) {
      throw new UnauthorizedException('Tenant context is required for admissions operations');
    }

    return tenantId;
  }

  private buildNumber(prefix: string) {
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const suffix = Date.now().toString().slice(-5);
    return `${prefix}-${date}-${suffix}`;
  }

  private mapApplicationGender(
    gender?: string | null,
  ): 'male' | 'female' | 'other' | 'undisclosed' | undefined {
    const normalized = gender?.trim().toLowerCase();

    if (
      normalized === 'male'
      || normalized === 'female'
      || normalized === 'other'
      || normalized === 'undisclosed'
    ) {
      return normalized;
    }

    return undefined;
  }

  private splitName(fullName: string) {
    const parts = fullName.trim().split(/\s+/);

    if (parts.length === 1) {
      return {
        first_name: parts[0],
        middle_name: null,
        last_name: parts[0],
      };
    }

    if (parts.length === 2) {
      return {
        first_name: parts[0]!,
        middle_name: null,
        last_name: parts[1]!,
      };
    }

    return {
      first_name: parts[0]!,
      middle_name: parts.slice(1, -1).join(' '),
      last_name: parts.at(-1)!,
    };
  }

  private async inviteParentPortalUser(application: {
    parent_email?: string | null;
    parent_name: string;
  }) {
    const parentEmail = application.parent_email?.trim().toLowerCase();

    if (!parentEmail || !this.tenantInvitationsService) {
      return null;
    }

    return this.tenantInvitationsService.inviteTenantUser({
      email: parentEmail,
      display_name: application.parent_name.trim(),
      role_code: 'parent',
    });
  }

  private async queueAdmissionGuardianSms(input: {
    tenantId: string;
    actorUserId: string;
    idempotencyKey: string;
    recipientPhone: string;
    message: string;
  }): Promise<AdmissionGuardianSmsDelivery> {
    const recipientPhoneLast4 = input.recipientPhone.slice(-4);

    if (!this.communicationSmsService) {
      return {
        status: 'degraded',
        queue_id: null,
        recipient_phone_last4: recipientPhoneLast4,
        reason: 'sms_queue_service_unavailable',
      };
    }

    if (!input.actorUserId?.trim()) {
      return {
        status: 'degraded',
        queue_id: null,
        recipient_phone_last4: recipientPhoneLast4,
        reason: 'sms_queue_actor_unavailable',
      };
    }

    try {
      const result = await this.communicationSmsService.sendSms({
        tenantId: input.tenantId,
        userId: input.actorUserId,
        idempotencyKey: input.idempotencyKey,
        recipientPhone: input.recipientPhone,
        message: input.message,
      });
      const providerStatus = typeof result?.status === 'string' ? result.status : null;
      const queueId = typeof result?.messageId === 'string' && result.messageId !== 'FALLBACK'
        ? result.messageId
        : null;

      if (result?.success === true && queueId && /^(pending|queued)$/i.test(providerStatus ?? '')) {
        return {
          status: 'queued',
          queue_id: queueId,
          recipient_phone_last4: recipientPhoneLast4,
          reason: null,
          provider_status: providerStatus,
        };
      }

      return {
        status: 'degraded',
        queue_id: queueId,
        recipient_phone_last4: recipientPhoneLast4,
        reason: 'sms_queue_rejected',
        provider_status: providerStatus,
      };
    } catch {
      return {
        status: 'degraded',
        queue_id: null,
        recipient_phone_last4: recipientPhoneLast4,
        reason: 'sms_queue_failed',
      };
    }
  }

  private async linkParentGuardian(
    tenantId: string,
    studentId: string,
    application: {
      parent_email?: string | null;
      parent_name: string;
      parent_phone: string;
      relationship: string;
    },
    parentInvitation: { id?: string } | null,
  ) {
    const parentEmail = application.parent_email?.trim().toLowerCase();

    if (!parentEmail || !parentInvitation?.id) {
      return null;
    }

    return this.admissionsRepository.upsertStudentGuardianLink({
      school_id: tenantId,
      student_id: studentId,
      invitation_id: parentInvitation.id,
      display_name: application.parent_name.trim(),
      email: parentEmail,
      phone: application.parent_phone.trim(),
      relationship: application.relationship.trim(),
    });
  }

  private async assignRegistrationFees(
    tenantId: string,
    application: { id: string },
    studentId: string,
    className: string,
  ) {
    const feeStructure = await this.admissionsRepository.findActiveFeeStructureForClass(
      tenantId,
      className,
    );

    if (!feeStructure) {
      return null;
    }

    const dueDays = Number(feeStructure.due_days_after_registration ?? 14);
    const dueDate = this.addDays(new Date(), Number.isFinite(dueDays) ? dueDays : 14)
      .toISOString()
      .slice(0, 10);

    return this.admissionsRepository.createStudentFeeAssignmentInvoice({
      school_id: tenantId,
      student_id: studentId,
      application_id: application.id,
      fee_structure_id: feeStructure.id,
      invoice_number: this.buildStudentFeeInvoiceNumber(),
      description: feeStructure.description,
      currency_code: feeStructure.currency_code,
      amount_minor: feeStructure.amount_minor,
      due_date: dueDate,
    });
  }

  private buildStudentFeeInvoiceNumber() {
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    return `SF-${date}-${randomUUID().slice(0, 8).toUpperCase()}`;
  }

  private addDays(value: Date, days: number) {
    return new Date(value.getTime() + days * 24 * 60 * 60 * 1000);
  }

  private assertAcademicCapacityAvailable(
    className: string,
    streamName: string,
    classSection: {
      stream_id?: string | null;
      capacity?: number | string | null;
      current_enrollments?: number | string | null;
    } | null,
  ) {
    if (!classSection) {
      throw new BadRequestException(
        `Active class section "${className} ${streamName}" was not found in this school`,
      );
    }

    if (streamName && !classSection.stream_id) {
      throw new BadRequestException(
        `Active stream "${streamName}" was not found for class section "${className}" in this school`,
      );
    }

    if (classSection.capacity == null) {
      return;
    }

    const capacity = Number(classSection.capacity);
    const currentEnrollments = Number(classSection.current_enrollments ?? 0);

    if (Number.isFinite(capacity) && Number.isFinite(currentEnrollments) && currentEnrollments >= capacity) {
      throw new BadRequestException(`Class section "${className} ${streamName}" is at capacity`);
    }
  }

  private parseAcademicLifecycleAction(action: string): AcademicLifecycleAction {
    const normalized = action?.trim() as AcademicLifecycleAction;

    if (!['promotion', 'graduation', 'archive'].includes(normalized)) {
      throw new BadRequestException('Academic lifecycle action must be promotion, graduation, or archive');
    }

    return normalized;
  }

  private async requireActiveAcademicEnrollment(
    tenantId: string,
    studentId: string,
    tx?: any,
  ): Promise<AcademicEnrollmentRecord> {
    const activeEnrollment = await this.admissionsRepository.findActiveAcademicEnrollmentForUpdate(
      tenantId,
      studentId,
      tx,
    );

    if (!activeEnrollment?.id) {
      throw new BadRequestException(`No active academic enrollment found for student "${studentId}"`);
    }

    return activeEnrollment as AcademicEnrollmentRecord;
  }

  private async publishAcademicEnrollmentCreated(
    tenantId: string,
    studentId: string,
    academicEnrollment: {
      id?: string | null;
      application_id?: string | null;
      class_section_id?: string | null;
      class_name?: string | null;
      stream_name?: string | null;
      academic_year?: string | null;
      status?: string | null;
    } | null,
    tx?: any,
  ) {
    if (!this.eventPublisher || !academicEnrollment?.id) {
      return null;
    }

    return this.eventPublisher.publish({
      event_key: `student.academic_enrollment.created:${academicEnrollment.id}`,
      event_name: 'student.academic_enrollment.created',
      aggregate_type: 'student_academic_enrollment',
      aggregate_id: academicEnrollment.id,
      payload: {
        tenant_id: tenantId,
        student_id: studentId,
        academic_enrollment_id: academicEnrollment.id,
        application_id: academicEnrollment.application_id ?? null,
        class_section_id: academicEnrollment.class_section_id ?? null,
        class_name: academicEnrollment.class_name ?? 'Unassigned',
        stream_name: academicEnrollment.stream_name ?? 'Unassigned',
        academic_year: academicEnrollment.academic_year ?? new Date().getUTCFullYear().toString(),
        status: academicEnrollment.status ?? 'active',
        occurred_at: new Date().toISOString(),
      },
    }, tx);
  }

  private async publishAcademicLifecycleChanged(
    tenantId: string,
    studentId: string,
    sourceEnrollment: AcademicEnrollmentRecord,
    lifecycleEvent: {
      id?: string | null;
      event_type?: AcademicLifecycleAction | string | null;
      target_enrollment_id?: string | null;
      to_class_name?: string | null;
      to_stream_name?: string | null;
      to_academic_year?: string | null;
      reason?: string | null;
    } | null,
    targetEnrollment?: {
      id?: string | null;
      class_name?: string | null;
      stream_name?: string | null;
      academic_year?: string | null;
    } | null,
    tx?: any,
  ) {
    if (!this.eventPublisher || !lifecycleEvent?.id) {
      return null;
    }

    const eventType = this.parseAcademicLifecycleAction(lifecycleEvent.event_type ?? '');

    return this.eventPublisher.publish({
      event_key: `student.academic_lifecycle.changed:${lifecycleEvent.id}`,
      event_name: 'student.academic_lifecycle.changed',
      aggregate_type: 'student_academic_lifecycle_event',
      aggregate_id: lifecycleEvent.id,
      payload: {
        tenant_id: tenantId,
        student_id: studentId,
        lifecycle_event_id: lifecycleEvent.id,
        event_type: eventType,
        source_enrollment_id: sourceEnrollment.id,
        target_enrollment_id: targetEnrollment?.id ?? lifecycleEvent.target_enrollment_id ?? null,
        from_class_name: sourceEnrollment.class_name,
        from_stream_name: sourceEnrollment.stream_name,
        from_academic_year: sourceEnrollment.academic_year,
        to_class_name: targetEnrollment?.class_name ?? lifecycleEvent.to_class_name ?? null,
        to_stream_name: targetEnrollment?.stream_name ?? lifecycleEvent.to_stream_name ?? null,
        to_academic_year: targetEnrollment?.academic_year ?? lifecycleEvent.to_academic_year ?? null,
        reason: this.normalizeLifecycleReason(lifecycleEvent.reason),
        occurred_at: new Date().toISOString(),
      },
    }, tx);
  }

  private async recordAcademicLifecycleEvent(input: {
    tenantId: string;
    studentId: string;
    sourceEnrollment: AcademicEnrollmentRecord;
    targetEnrollment?: { id?: string | null; class_name?: string | null; stream_name?: string | null; academic_year?: string | null } | null;
    targetClassSection?: AcademicClassSectionRecord | null;
    eventType: AcademicLifecycleAction;
    reason?: string | null;
    notes?: string | null;
  }, tx?: any) {
    return this.admissionsRepository.createStudentAcademicLifecycleEvent({
      school_id: input.tenantId,
      student_id: input.studentId,
      source_enrollment_id: input.sourceEnrollment.id,
      target_enrollment_id: input.targetEnrollment?.id ?? null,
      event_type: input.eventType,
      from_class_name: input.sourceEnrollment.class_name,
      from_stream_name: input.sourceEnrollment.stream_name,
      from_academic_year: input.sourceEnrollment.academic_year,
      to_class_section_id: input.targetClassSection?.id ?? null,
      to_class_name: input.targetEnrollment?.class_name ?? input.targetClassSection?.class_name ?? null,
      to_stream_name: input.targetEnrollment?.stream_name ?? input.targetClassSection?.stream_name ?? null,
      to_academic_year: input.targetEnrollment?.academic_year ?? input.targetClassSection?.academic_year ?? null,
      reason: this.normalizeLifecycleReason(input.reason),
      notes: input.notes?.trim() || null,
      created_by_user_id: this.requestContext.getStore()?.user_id ?? null,
    }, tx);
  }

  private normalizeLifecycleReason(reason?: string | null) {
    return reason?.trim() || 'Academic lifecycle change';
  }

  private async createAcademicEnrollment(
    tenantId: string,
    applicationId: string,
    studentId: string,
    className: string,
    streamName: string,
    classSection: {
      id?: string | null;
      stream_id?: string | null;
      academic_year?: string | null;
    } | null,
    tx?: any,
  ) {
    const enrollment = await this.admissionsRepository.createStudentAcademicEnrollment({
      school_id: tenantId,
      student_id: studentId,
      application_id: applicationId,
      class_section_id: classSection?.id ?? null,
      stream_id: classSection?.stream_id ?? null,
      class_name: className,
      stream_name: streamName,
      academic_year: classSection?.academic_year ?? new Date().getUTCFullYear().toString(),
    }, tx);

    if (!enrollment) {
      throw new BadRequestException(
        `The selected class section or stream is no longer active in this school`,
      );
    }

    return enrollment;
  }

  private async enrollSubjectsAndTimetable(
    tenantId: string,
    studentId: string,
    academicEnrollment: { id?: string | null } | null,
    classSection: { id?: string | null } | null,
    tx?: any,
  ) {
    if (!academicEnrollment?.id || !classSection?.id) {
      return {
        subject_enrollments: [],
        timetable_enrollments: [],
      };
    }

    return this.admissionsRepository.enrollStudentSubjectsAndTimetable({
      school_id: tenantId,
      student_id: studentId,
      academic_enrollment_id: academicEnrollment.id,
      class_section_id: classSection.id,
    }, tx);
  }

  private normalizeListQuery(
    query: ListAdmissionsQueryDto = {},
    fallbackLimit: number,
  ): { limit: number; offset: number } {
    return {
      limit: this.parseBoundedInteger(query.limit, fallbackLimit, 50),
      offset: this.parseOffset(query.offset),
    };
  }

  private normalizeSearch(value: string | undefined): string | undefined {
    const search = value?.trim();

    return search && search.length >= 2 ? search : undefined;
  }

  private parseBoundedInteger(
    value: number | undefined,
    fallback: number,
    max: number,
  ): number {
    const candidate = Number(value);

    if (!Number.isInteger(candidate) || candidate < 1) {
      return fallback;
    }

    return Math.min(candidate, max);
  }

  private parseOffset(value: number | undefined): number {
    const candidate = Number(value);

    if (!Number.isInteger(candidate) || candidate < 0) {
      return 0;
    }

    return candidate;
  }

  private isNormalizedKenyanPhone(value: unknown): value is string {
    return typeof value === 'string' && /^\+254\d{9}$/.test(value);
  }

  async createEnquiry(tenantId: string, dto: CreateEnquiryDto, userId: string) {
    const enquiry = await this.admissionsRepository.createEnquiry({
      tenant_id: tenantId,
      enquiry_code: dto.enquiry_code.trim(),
      student_first_name: dto.student_first_name.trim(),
      student_last_name: dto.student_last_name.trim(),
      parent_name: dto.parent_name.trim(),
      parent_phone: dto.parent_phone.trim(),
      parent_email: this.optionalTrim(dto.parent_email),
      class_applying: this.optionalTrim(dto.class_applying),
      enquiry_source: this.optionalTrim(dto.enquiry_source),
      boarding_day_preference: this.optionalTrim(dto.boarding_day_preference),
      current_school: this.optionalTrim(dto.current_school),
      location: this.optionalTrim(dto.location),
      notes: this.optionalTrim(dto.notes),
      follow_up_date: this.optionalTrim(dto.follow_up_date),
      created_by_user_id: this.asUuidOrNull(userId),
    });

    await this.publishAdmissionEvent('admissions.enquiry.created', tenantId, enquiry.id, {
      enquiry_code: enquiry.enquiry_code,
      applicant_name: `${enquiry.student_first_name} ${enquiry.student_last_name}`,
      parent_phone: enquiry.parent_phone,
    });

    return enquiry;
  }

  async createInterview(tenantId: string, dto: CreateInterviewDto) {
    await this.requireApplicationInTenant(tenantId, dto.application_id);

    const interview = await this.admissionsRepository.createInterview({
      tenant_id: tenantId,
      application_id: dto.application_id,
      interview_date: dto.interview_date,
      start_time: dto.start_time.trim(),
      end_time: dto.end_time.trim(),
      location: this.optionalTrim(dto.location),
      interviewer_user_id: this.asUuidOrNull(dto.interviewer_user_id),
      assessment_type: this.optionalTrim(dto.assessment_type),
      reading_score: this.optionalScore(dto.reading_score, 'reading_score'),
      writing_score: this.optionalScore(dto.writing_score, 'writing_score'),
      mathematics_score: this.optionalScore(dto.mathematics_score, 'mathematics_score'),
      general_conduct: this.optionalTrim(dto.general_conduct),
      recommendation: this.optionalTrim(dto.recommendation),
      interviewer_comment: this.optionalTrim(dto.interviewer_comment),
    });

    await this.publishAdmissionEvent('admissions.interview.scheduled', tenantId, interview.id, {
      application_id: interview.application_id,
      interview_date: interview.interview_date,
      start_time: interview.start_time,
    });

    return interview;
  }

  async createOffer(tenantId: string, dto: CreateOfferDto) {
    await this.requireApplicationInTenant(tenantId, dto.application_id);

    const offer = await this.admissionsRepository.createOffer({
      tenant_id: tenantId,
      application_id: dto.application_id,
      required_deposit: this.optionalNonNegativeAmount(dto.required_deposit, 'required_deposit'),
      offer_date: this.optionalTrim(dto.offer_date),
      deadline_date: this.optionalTrim(dto.deadline_date),
    });

    await this.publishAdmissionEvent('admissions.offer.created', tenantId, offer.id, {
      application_id: offer.application_id,
      required_deposit: offer.required_deposit,
      deadline_date: offer.deadline_date,
    });

    return offer;
  }

  async createAppointment(tenantId: string, dto: CreateAppointmentDto) {
    if (dto.application_id) {
      await this.requireApplicationInTenant(tenantId, dto.application_id);
    }

    const appointment = await this.admissionsRepository.createAppointment({
      tenant_id: tenantId,
      application_id: dto.application_id ?? null,
      visitor_name: dto.visitor_name.trim(),
      purpose: dto.purpose.trim(),
      appointment_date: dto.appointment_date,
      start_time: dto.start_time.trim(),
      assigned_user_id: this.asUuidOrNull(dto.assigned_user_id),
    });

    await this.publishAdmissionEvent('admissions.appointment.scheduled', tenantId, appointment.id, {
      application_id: appointment.application_id,
      visitor_name: appointment.visitor_name,
      appointment_date: appointment.appointment_date,
    });

    return appointment;
  }

  async createTask(tenantId: string, dto: CreateTaskDto) {
    if (dto.application_id) {
      await this.requireApplicationInTenant(tenantId, dto.application_id);
    }

    const task = await this.admissionsRepository.createTask({
      tenant_id: tenantId,
      application_id: dto.application_id ?? null,
      task_title: dto.task_title.trim(),
      task_description: this.optionalTrim(dto.task_description),
      due_date: this.optionalTrim(dto.due_date),
      priority: this.normalizeTaskPriority(dto.priority),
      assigned_user_id: this.asUuidOrNull(dto.assigned_user_id),
    });

    await this.publishAdmissionEvent('admissions.task.created', tenantId, task.id, {
      application_id: task.application_id,
      task_title: task.task_title,
      priority: task.priority,
      due_date: task.due_date,
    });

    return task;
  }

  async createTemplate(tenantId: string, dto: CreateTemplateDto, userId: string) {
    const template = await this.admissionsRepository.createTemplate({
      tenant_id: tenantId,
      template_name: dto.template_name.trim(),
      template_type: dto.template_type.trim(),
      content: dto.content,
      is_active: dto.is_active,
      created_by_user_id: this.asUuidOrNull(userId),
    });

    await this.publishAdmissionEvent('admissions.template.created', tenantId, template.id, {
      template_name: template.template_name,
      template_type: template.template_type,
      is_active: template.is_active,
    });

    return template;
  }

  async enrolApplicationWithGeneratedNumber(applicationId: string) {
    const tenantId = this.requireTenantId();
    const application = await this.admissionsRepository.findApplicationById(tenantId, applicationId);

    if (!application) {
      throw new NotFoundException(`Admission application "${applicationId}" was not found`);
    }

    const admissionNumber = await this.generateAdmissionNumber(tenantId);
    return this.registerApprovedApplication(applicationId, {
      admission_number: admissionNumber,
      class_name: application.class_applying,
      stream_name: 'Default',
    });
  }

  async previewApplicationImport(file: UploadedBinaryFile) {
    if (!file?.buffer?.length) {
      throw new BadRequestException('An admissions import file is required');
    }

    const text = file.buffer.toString('utf8').replace(/^\uFEFF/, '');
    const rows = this.parseDelimitedRows(text);

    if (rows.length < 2) {
      throw new BadRequestException('Admissions import must include a header row and at least one applicant row');
    }

    if (rows.length - 1 > ADMISSIONS_IMPORT_LIMIT) {
      throw new BadRequestException(
        `Admissions import cannot contain more than ${ADMISSIONS_IMPORT_LIMIT} student rows`,
      );
    }

    const headers = rows[0].map((header) => {
      const normalized = header.trim().toLowerCase().replace(/[\s-]+/g, '_');
      return ADMISSIONS_IMPORT_HEADER_ALIASES[normalized] ?? normalized;
    });
    const duplicateHeaders = headers.filter((header, index) => headers.indexOf(header) !== index);
    if (duplicateHeaders.length > 0) {
      throw new BadRequestException(
        `Admissions import contains duplicate columns: ${[...new Set(duplicateHeaders)].join(', ')}`,
      );
    }

    const missingHeaders = ADMISSIONS_IMPORT_REQUIRED_HEADERS.filter(
      (header) => !headers.includes(header),
    );

    if (missingHeaders.length > 0) {
      throw new BadRequestException(`Admissions import is missing required columns: ${missingHeaders.join(', ')}`);
    }

    const foundation = await this.admissionsRepository.getAdmissionFoundation(
      this.requireTenantId(),
    ) as unknown as AdmissionFoundation;
    const rawRows = rows.slice(1).map((row, index) => ({
      row_number: index + 2,
      values: Object.fromEntries(
        headers.map((header, headerIndex) => [header, row[headerIndex]?.trim() ?? '']),
      ),
    }));
    const normalizedAdmissionNumbers = rawRows.map((row) => {
      try {
        return normalizeAdmissionNumber(row.values.admission_number ?? '');
      } catch {
        return '';
      }
    });
    const duplicateNumbers = new Set(
      normalizedAdmissionNumbers.filter(
        (value, index) => value && normalizedAdmissionNumbers.indexOf(value) !== index,
      ),
    );
    const existingNumbers = new Set(
      await this.admissionsRepository.findExistingAdmissionNumbers(
        this.requireTenantId(),
        normalizedAdmissionNumbers.filter(Boolean),
      ),
    );

    const previewRows = rawRows.map(({ row_number, values }, index) =>
      this.previewCanonicalImportRow({
        rowNumber: row_number,
        values,
        admissionNumber: normalizedAdmissionNumbers[index],
        duplicateNumbers,
        existingNumbers,
        foundation,
      }),
    );

    return {
      success: previewRows.every((row) => row.status === 'valid'),
      total_rows: rows.length - 1,
      previewed_rows: previewRows.length,
      valid_rows: previewRows.filter((row) => row.status === 'valid').length,
      invalid_rows: previewRows.filter((row) => row.status === 'invalid').length,
      rows: previewRows,
    };
  }

  private previewCanonicalImportRow(input: {
    rowNumber: number;
    values: Record<string, string>;
    admissionNumber: string;
    duplicateNumbers: Set<string>;
    existingNumbers: Set<string>;
    foundation: AdmissionFoundation;
  }) {
    const { values, foundation } = input;
    const errors: string[] = [];
    const classFormGradeName = values.class?.trim() || values.grade_or_form?.trim() || '';
    const requiredMissing = ADMISSIONS_IMPORT_REQUIRED_HEADERS.filter(
      (header) => header === 'class' ? !classFormGradeName : !values[header]?.trim(),
    );
    errors.push(...requiredMissing.map((header) => `${header} is required`));

    let admissionNumber = input.admissionNumber;
    let firstName = values.first_name ?? '';
    let middleName = values.middle_name ?? '';
    let lastName = values.last_name ?? '';
    let guardianName = values.guardian_name ?? '';
    let guardianRelationship = values.guardian_relationship ?? '';
    let guardianPhone = values.guardian_phone ?? '';
    let dateOfBirth = values.date_of_birth ?? '';
    let admissionDate = values.admission_date ?? '';

    const capture = (field: string, action: () => string, fallback: string) => {
      try {
        return action();
      } catch (error) {
        errors.push(this.importErrorMessage(error, field));
        return fallback;
      }
    };

    if (values.admission_number) {
      admissionNumber = capture(
        'admission_number',
        () => normalizeAdmissionNumber(values.admission_number),
        admissionNumber,
      );
    }
    if (values.first_name) {
      firstName = capture('first_name', () => normalizePersonName(values.first_name, 'First name'), firstName);
    }
    if (values.middle_name) {
      middleName = capture('middle_name', () => normalizePersonName(values.middle_name, 'Middle name'), middleName);
    }
    if (values.last_name) {
      lastName = capture('last_name', () => normalizePersonName(values.last_name, 'Last name'), lastName);
    }
    if (values.guardian_name) {
      guardianName = capture(
        'guardian_name',
        () => normalizePersonName(values.guardian_name, 'Guardian name'),
        guardianName,
      );
    }
    if (values.guardian_relationship) {
      guardianRelationship = capture(
        'guardian_relationship',
        () => normalizePersonName(values.guardian_relationship, 'Guardian relationship'),
        guardianRelationship,
      );
    }
    if (values.guardian_phone) {
      guardianPhone = capture(
        'guardian_phone',
        () => normalizeKenyanPhone(values.guardian_phone),
        guardianPhone,
      );
    }
    if (values.date_of_birth) {
      dateOfBirth = capture(
        'date_of_birth',
        () => parseAdmissionDate(values.date_of_birth, 'Date of birth'),
        dateOfBirth,
      );
    }
    if (values.admission_date) {
      admissionDate = capture(
        'admission_date',
        () => parseAdmissionDate(values.admission_date, 'Admission date'),
        admissionDate,
      );
    }

    if (dateOfBirth && dateOfBirth > new Date().toISOString().slice(0, 10)) {
      errors.push('Date of birth cannot be in the future');
    }
    if (admissionNumber && input.duplicateNumbers.has(admissionNumber)) {
      errors.push('Admission number is duplicated in this file');
    }
    if (admissionNumber && input.existingNumbers.has(admissionNumber)) {
      errors.push('Admission number already exists in this school');
    }

    const academicYear = foundation.academic_years.find(
      (year) => this.sameImportValue(year.name, values.academic_year),
    );
    if (values.academic_year && !academicYear) {
      errors.push(`Academic year "${values.academic_year}" is not configured in this school`);
    }

    const classSection = foundation.classes.find(
      (item) =>
        (!academicYear || String(item.academic_year_id) === String(academicYear.id))
        && this.sameImportValue(item.name, classFormGradeName)
        && this.sameImportValue(item.curriculum, values.curriculum),
    );
    if (classFormGradeName && values.curriculum && !classSection) {
      errors.push(
        `Class/form/grade "${classFormGradeName}" does not match the selected academic year and curriculum`,
      );
    }
    if (classSection?.enrolment_open === false) {
      errors.push(`Class "${classSection.name}" is closed for enrolment`);
    }
    if (
      classSection?.capacity != null
      && Number(classSection.student_count ?? 0) >= Number(classSection.capacity)
    ) {
      errors.push(`Class "${classSection.name}" has reached its configured capacity`);
    }

    const stream = values.stream
      ? foundation.streams.find(
          (item) =>
            String(item.class_section_id) === String(classSection?.id)
            && this.sameImportValue(item.name, values.stream),
        )
      : undefined;
    if (values.stream && !stream) {
      errors.push(`Stream "${values.stream}" does not belong to class/form/grade "${classFormGradeName}"`);
    }
    if (stream?.capacity != null && Number(stream.student_count ?? 0) >= Number(stream.capacity)) {
      errors.push(`Stream "${stream.name}" has reached its configured capacity`);
    }

    const subjectIds = classSection && academicYear
      ? [...new Set(
          foundation.class_subject_assignments
            .filter(
              (assignment) =>
                String(assignment.class_section_id) === String(classSection.id)
                && String(assignment.academic_year_id) === String(academicYear.id),
            )
            .map((assignment) => String(assignment.subject_id)),
        )]
      : [];
    if (classSection && subjectIds.length === 0) {
      errors.push(`No subjects are assigned to class "${classSection.name}" for this academic year`);
    }

    if (
      academicYear?.starts_on
      && academicYear?.ends_on
      && admissionDate
      && (admissionDate < String(academicYear.starts_on).slice(0, 10)
        || admissionDate > String(academicYear.ends_on).slice(0, 10))
    ) {
      errors.push(`Admission date must fall within academic year "${academicYear.name}"`);
    }

    const record: BulkAdmissionRowDto | null = errors.length === 0 && academicYear && classSection
      ? {
          row_number: input.rowNumber,
          admission_number: admissionNumber,
          first_name: firstName,
          ...(middleName ? { middle_name: middleName } : {}),
          last_name: lastName,
          gender: values.gender.trim().toLowerCase() as BulkAdmissionRowDto['gender'],
          ...(dateOfBirth ? { date_of_birth: dateOfBirth } : {}),
          admission_date: admissionDate,
          academic_year_id: String(academicYear.id),
          curriculum: classSection.curriculum,
          grade_level: classSection.name,
          class_section_id: String(classSection.id),
          ...(stream ? { stream_id: String(stream.id) } : {}),
          subject_ids: subjectIds,
          guardian_name: guardianName,
          guardian_relationship: guardianRelationship,
          guardian_phone: guardianPhone,
        }
      : null;

    const normalizedGender = values.gender.trim().toLowerCase();
    if (values.gender && !['male', 'female', 'other', 'undisclosed'].includes(normalizedGender)) {
      errors.push('Gender must be male, female, other, or undisclosed');
    }

    return {
      row_number: input.rowNumber,
      admission_number: admissionNumber || values.admission_number,
      learner_name: [firstName, middleName, lastName].filter(Boolean).join(' '),
      academic_year: values.academic_year,
      class_name: classFormGradeName,
      stream_name: values.stream || null,
      guardian_phone: guardianPhone || values.guardian_phone,
      status: errors.length === 0 ? 'valid' : 'invalid',
      errors,
      record: errors.length === 0 ? record : null,
    };
  }

  private sameImportValue(left: unknown, right: unknown) {
    return String(left ?? '').trim().toLowerCase() === String(right ?? '').trim().toLowerCase();
  }

  private importErrorMessage(error: unknown, field?: string) {
    const message = error instanceof Error ? error.message : String(error);
    return field && !message.toLowerCase().includes(field.replace(/_/g, ' '))
      ? `${field}: ${message}`
      : message;
  }

  private async requireApplicationInTenant(tenantId: string, applicationId: string) {
    const application = await this.admissionsRepository.findApplicationById(tenantId, applicationId);

    if (!application) {
      throw new NotFoundException(`Admission application "${applicationId}" was not found`);
    }

    return application;
  }

  private async generateAdmissionNumber(tenantId: string) {
    const year = new Date().getUTCFullYear();
    const nextSequence = (await this.admissionsRepository.countStudents(tenantId)) + 1;
    return `ADM-${year}-${String(nextSequence).padStart(4, '0')}`;
  }

  private optionalTrim(value?: string | null) {
    const trimmed = value?.trim();
    return trimmed ? trimmed : null;
  }

  private asUuidOrNull(value?: string | null) {
    const trimmed = value?.trim();
    return trimmed && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(trimmed)
      ? trimmed
      : null;
  }

  private optionalScore(value: number | undefined, fieldName: string) {
    if (value === undefined || value === null) {
      return null;
    }

    if (!Number.isFinite(value) || value < 0 || value > 100) {
      throw new BadRequestException(`${fieldName} must be between 0 and 100`);
    }

    return Math.round(value);
  }

  private optionalNonNegativeAmount(value: number | undefined, fieldName: string) {
    if (value === undefined || value === null) {
      return null;
    }

    if (!Number.isFinite(value) || value < 0) {
      throw new BadRequestException(`${fieldName} must be zero or greater`);
    }

    return Math.round(value);
  }

  private normalizeTaskPriority(priority?: string) {
    const normalized = priority?.trim().toLowerCase() || 'medium';
    const allowed = new Set(['low', 'medium', 'high', 'urgent']);

    if (!allowed.has(normalized)) {
      throw new BadRequestException('Task priority must be low, medium, high, or urgent');
    }

    return normalized;
  }

  private rethrowCanonicalAdmissionError(error: unknown): never {
    const message = error instanceof Error ? error.message : String(error);
    const errors: Record<string, string> = {
      ADMISSION_PLACEMENT_NOT_FOUND:
        'The selected academic year and class are not available in this school',
      ADMISSION_CLASS_CLOSED: 'The selected class is closed for enrolment',
      ADMISSION_STREAM_NOT_FOUND: 'The selected stream does not belong to the selected class',
      ADMISSION_CURRICULUM_MISMATCH:
        'The selected curriculum does not match the selected class',
      ADMISSION_ACADEMIC_LEVEL_NOT_CONFIGURED:
        'The selected class is missing its academic level. Reopen Classes & Streams and save the class before admitting learners',
      ADMISSION_DATE_OUTSIDE_YEAR:
        'Admission date must fall within the selected academic year',
      ADMISSION_SUBJECTS_NOT_CONFIGURED:
        'No subjects are assigned to this class for the selected academic year',
      ADMISSION_SUBJECT_INVALID: 'One or more selected subjects are not assigned to this class',
      ADMISSION_COMPULSORY_SUBJECT_MISSING:
        'All compulsory class subjects must be included',
      ADMISSION_SUBJECT_REQUIRED: 'Select at least one subject for the learner',
      ADMISSION_CLASS_CAPACITY_REACHED: 'The selected class has reached its configured capacity',
      ADMISSION_STREAM_CAPACITY_REACHED: 'The selected stream has reached its configured capacity',
      ADMISSION_AGE_RULE_FAILED: 'The learner does not meet this school\'s configured admission age rules',
      PARENT_ROLE_NOT_CONFIGURED: 'Parent portal access is not configured for this school',
      STUDENT_ROLE_NOT_CONFIGURED: 'Student portal access is not configured for this school',
    };

    const staleNumber = message.match(/ADMISSION_NUMBER_STALE:([^\s]+)/)?.[1];
    if (staleNumber) {
      throw new ConflictException(
        `The automatic admission number was just used. Refresh and use ${staleNumber}.`,
      );
    }

    const minimumSubjects = message.match(/ADMISSION_MINIMUM_SUBJECTS:(\d+)/)?.[1];
    if (minimumSubjects) {
      throw new BadRequestException(`Select at least ${minimumSubjects} subjects for this learner`);
    }
    const maximumSubjects = message.match(/ADMISSION_MAXIMUM_SUBJECTS:(\d+)/)?.[1];
    if (maximumSubjects) {
      throw new BadRequestException(`Select no more than ${maximumSubjects} subjects for this learner`);
    }

    if (
      message.includes('ADMISSION_NUMBER_EXISTS') ||
      message.includes('uq_students_tenant_admission_number') ||
      message.includes('uq_admission_applications_number')
    ) {
      throw new ConflictException('Admission number already exists in this school');
    }

    const knownError = Object.entries(errors).find(([code]) => message.includes(code));
    if (knownError) throw new BadRequestException(knownError[1]);
    throw error;
  }

  private parseDelimitedRows(text: string) {
    const rows: string[][] = [];
    let current = '';
    let row: string[] = [];
    let inQuotes = false;

    for (let index = 0; index < text.length; index += 1) {
      const char = text[index];
      const next = text[index + 1];

      if (char === '"' && inQuotes && next === '"') {
        current += '"';
        index += 1;
        continue;
      }

      if (char === '"') {
        inQuotes = !inQuotes;
        continue;
      }

      if (char === ',' && !inQuotes) {
        row.push(current);
        current = '';
        continue;
      }

      if ((char === '\n' || char === '\r') && !inQuotes) {
        if (char === '\r' && next === '\n') {
          index += 1;
        }
        row.push(current);
        if (row.some((cell) => cell.trim() !== '')) {
          rows.push(row);
        }
        row = [];
        current = '';
        continue;
      }

      current += char;
    }

    row.push(current);
    if (row.some((cell) => cell.trim() !== '')) {
      rows.push(row);
    }

    return rows;
  }

  private async publishAdmissionEvent(
    eventName: string,
    tenantId: string,
    aggregateId: string,
    payload: Record<string, unknown>,
  ) {
    const store = this.requestContext.getStore();

    return this.schoolOperationalEventsService?.recordSchoolOperation({
      schoolId: tenantId,
      event: {
        id: aggregateId,
        type: eventName,
        module: 'admissions',
        actorRole: store?.role ?? 'system',
        title: this.eventTitle(eventName),
        body: this.eventTitle(eventName),
        entityId: aggregateId,
        payload,
        createdAt: new Date().toISOString(),
      },
    });
  }

  private eventTitle(eventName: string) {
    return eventName
      .replace(/^admissions\./, '')
      .replace(/[._-]+/g, ' ')
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  }
}
