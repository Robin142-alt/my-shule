import { DatabaseFileStorageService } from '../../common/uploads/database-file-storage.service';
import { UploadFileMetadata } from '../../common/uploads/upload-policy';
import {
  BadRequestException,
  Injectable,
  MessageEvent,
  NotFoundException,
  Optional,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Observable } from 'rxjs';

import { S3CompatibleObjectStorageService } from '../../common/uploads/s3-object-storage.service';

import { RequestContextService } from '../../common/request-context/request-context.service';
import {
  CreateAdminIncidentDto,
  CreateAnnouncementDto,
  CreateMeetingMinutesDto,
} from './dto/admin-command.dto';
import { UpdatePrincipalSchoolProfileDto } from './dto/update-principal-school-profile.dto';
import { PrincipalInsightsService } from './principal-insights.service';
import { AdminCommandRepository } from './repositories/admin-command.repository';
import { PrismaService } from '../../database/prisma.service';
import {
  ImportType,
  TicketIssueType,
  TaskPriority,
  TicketStatus,
  AppointmentStatus,
  InventoryUnit,
  InventoryState,
  StockMovementType,
  SessionType,
  AttendanceStatus,
  CurriculumType,
  AssessmentResponsibility,
  MaintenanceTicketPriority,
  PaymentMethod,
  PaymentStatus,
  InvoiceStatus,
  MarksEntryStatus,
  BedStatus,
  BoardingAllocationStatus,
  RouteStatus,
  VehicleStatus,
  Prisma,
} from '@prisma/client';
import * as crypto from 'crypto';
import type { AccountCategory, EntryDirection } from '../finance/finance.types';

@Injectable()
export class AdminCommandService {
  constructor(
    private readonly requestContext: RequestContextService,
    private readonly repository: AdminCommandRepository,
    private readonly fileStorage: DatabaseFileStorageService,
    @Optional() private readonly _objectStorage?: S3CompatibleObjectStorageService,
    private readonly _configService?: ConfigService,
    @Optional()
    private readonly principalInsights?: PrincipalInsightsService,
    @Optional()
    private readonly prisma?: PrismaService,
  ) {}

  getPrincipalDashboard() {
    if (this.principalInsights) {
      return this.principalInsights.buildDashboard(this.requireTenantId());
    }

    return this.repository.getPrincipalDashboard(this.requireTenantId());
  }

  streamPrincipalDashboard(): Observable<MessageEvent> {
    if (!this.principalInsights) {
      throw new ServiceUnavailableException('Principal insight streaming is not available');
    }

    return this.principalInsights.streamDashboard(this.requireTenantId());
  }

  getPrincipalFinanceOverview() {
    if (this.principalInsights) {
      return this.principalInsights.getFinanceOverview(this.requireTenantId());
    }
    return this.repository.getFinanceOverview(this.requireTenantId());
  }

  getPrincipalStudentsOverview() {
    if (this.principalInsights) {
      return this.principalInsights.getStudentsOverview(this.requireTenantId());
    }
    return this.repository.getStudentsOverview(this.requireTenantId());
  }

  getPrincipalDisciplineOverview() {
    if (this.principalInsights) {
      return this.principalInsights.getDisciplineOverview(this.requireTenantId());
    }
    return this.repository.getDisciplineOverview(this.requireTenantId());
  }

  getPrincipalAttendanceOverview() {
    if (this.principalInsights) {
      return this.principalInsights.getAttendanceOverview(this.requireTenantId());
    }
    return this.repository.getAttendanceOverview(this.requireTenantId());
  }

  getPrincipalAcademicsOverview() {
    if (this.principalInsights) {
      return this.principalInsights.getAcademicsOverview(this.requireTenantId());
    }
    return this.repository.getAcademicsOverview(this.requireTenantId());
  }

  getPrincipalExamsOverview() {
    if (this.principalInsights) {
      return this.principalInsights.getExamsOverview(this.requireTenantId());
    }
    return this.repository.getExamsOverview(this.requireTenantId());
  }

  getPrincipalCommunicationOverview() {
    if (this.principalInsights) {
      return this.principalInsights.getCommunicationOverview(this.requireTenantId());
    }
    return this.repository.getCommunicationOverview(this.requireTenantId());
  }

  getCommunicationTemplates() {
    return this.repository.getCommunicationTemplates(this.requireTenantId());
  }

  createCommunicationTemplate(dto: any) {
    return this.repository.createCommunicationTemplate(this.requireTenantId(), dto);
  }

  updateCommunicationTemplate(id: string, dto: any) {
    return this.repository.updateCommunicationTemplate(this.requireTenantId(), id, dto);
  }

  deleteCommunicationTemplate(id: string) {
    return this.repository.deleteCommunicationTemplate(this.requireTenantId(), id);
  }

  getPrincipalClassesOverview() {
    if (this.principalInsights) {
      return this.principalInsights.getClassesOverview(this.requireTenantId());
    }
    return this.repository.getClassesOverview(this.requireTenantId());
  }

  getPrincipalSubjectsOverview() {
    if (this.principalInsights) {
      return this.principalInsights.getSubjectsOverview(this.requireTenantId());
    }
    return this.repository.getSubjectsOverview(this.requireTenantId());
  }

  getPrincipalStaffOverview() {
    if (this.principalInsights) {
      return this.principalInsights.getStaffOverview(this.requireTenantId());
    }
    return this.repository.getStaffOverview(this.requireTenantId());
  }

  getPrincipalOverview() {
    if (this.principalInsights) {
      return this.principalInsights.getPrincipalOverview(this.requireTenantId());
    }
    return this.repository.getPrincipalOverview(this.requireTenantId());
  }

  getSchoolProfile() {
    if (this.principalInsights) {
      return this.principalInsights.getSchoolProfile(this.requireTenantId());
    }
    return this.repository.getSchoolProfile(this.requireTenantId());
  }

  getApprovalsOverview() {
    if (this.principalInsights) {
      return this.principalInsights.getApprovalsOverview(this.requireTenantId());
    }
    return this.repository.getApprovalsOverview(this.requireTenantId());
  }

  getPrincipalReportsOverview() {
    if (this.principalInsights) {
      return this.principalInsights.getPrincipalReportsOverview(this.requireTenantId());
    }
    return this.repository.getPrincipalReportsOverview(this.requireTenantId());
  }

  getSetupChecklist() {
    if (this.principalInsights) {
      return this.principalInsights.getSetupChecklist(this.requireTenantId());
    }
    return this.repository.getSetupChecklist(this.requireTenantId());
  }

  getAcademicSetupOverview() {
    if (this.principalInsights) {
      return this.principalInsights.getAcademicSetupOverview(this.requireTenantId());
    }
    return this.repository.getAcademicSetupOverview(this.requireTenantId());
  }

  getPrincipalSettings() {
    if (this.principalInsights) {
      return this.principalInsights.getPrincipalSettings(this.requireTenantId());
    }
    return this.repository.getPrincipalSettings(this.requireTenantId());
  }

  getPrincipalTeachingSchedule() {
    if (this.principalInsights) {
      return this.principalInsights.getPrincipalTeachingSchedule(this.requireTenantId());
    }
    return this.repository.getPrincipalTeachingSchedule(this.requireTenantId());
  }

  getDeputyDashboard() {
    return this.repository.getDeputyDashboard(this.requireTenantId());
  }

  getSecretaryDashboard() {
    return this.repository.getSecretaryDashboard(this.requireTenantId());
  }

  async createIncident(dto: CreateAdminIncidentDto) {
    const incident = await this.repository.createIncident({
      tenant_id: this.requireTenantId(),
      title: this.requireText(dto.title, 'Incident title'),
      description: this.requireText(dto.description, 'Incident description'),
      severity: this.requireSeverity(dto.severity),
      involved_parties: dto.involved_parties ?? [],
      created_by: this.requireUserId(),
    });
    await this.audit('admin_command.incident_created', 'admin_incident', incident?.id, dto);

    return incident;
  }

  async scheduleReport(dto: any) {
    const title = this.requireText(dto.title, 'Report title');
    const schedule = this.requireText(dto.schedule, 'Report schedule');
    const reportSchedule = await this.repository.scheduleReport({
      tenant_id: this.requireTenantId(),
      user_id: this.requireUserId(),
      title,
      schedule,
    });
    if (!reportSchedule) {
      throw new ServiceUnavailableException('Report schedule could not be created');
    }
    await this.audit('admin_command.report_scheduled', 'report_schedule_request', reportSchedule.id, { title, schedule });
    return { success: true, message: 'Report schedule created', reportSchedule };
  }

  async createCommunicationBroadcast(dto: any) {
    const audience = this.requireText(dto.audience, 'Broadcast audience');
    const message = this.requireText(dto.message, 'Broadcast message');
    const broadcast = await this.repository.createCommunicationBroadcast({
      tenant_id: this.requireTenantId(),
      user_id: this.requireUserId(),
      audience,
      message,
      channels: Array.isArray(dto.channels) && dto.channels.length > 0 ? dto.channels : ['in_app'],
    });
    if (!broadcast?.event) {
      throw new ServiceUnavailableException('Communication broadcast could not be created');
    }
    await this.audit('admin_command.communication_broadcast_created', 'communication_broadcast', broadcast.event.id, {
      audience,
      channels: dto.channels,
      smsRecipientCount: broadcast.smsRecipientCount,
    });
    return { success: true, message: 'Broadcast created and routed', broadcast };
  }

  async logAbsence(dto: any) {
    const attendance = await this.repository.logAbsence({
      tenant_id: this.requireTenantId(),
      user_id: this.requireUserId(),
      student_id: this.requireText(dto.studentId, 'Student ID'),
      date: this.requireText(dto.date, 'Absence date'),
      is_excused: dto.isExcused,
    });
    if (!attendance) {
      throw new BadRequestException('Student was not found in this school; absence was not logged');
    }
    await this.audit('admin_command.absence_logged', 'attendance_record', attendance.id, dto);
    return { success: true, message: 'Absence logged', attendance };
  }

  async recordPrincipalWorkflowAction(input: {
    action: string;
    entityType: string;
    entityId?: string | null;
    title: string;
    message: string;
    payload?: Record<string, unknown>;
    targetRoles?: string[];
    status?: string;
  }) {
    const tenantId = this.requireTenantId();
    const userId = this.requireUserId();
    const event = await this.repository.createPrincipalWorkflowAction({
      tenant_id: tenantId,
      user_id: userId,
      event_type: input.action,
      entity_type: input.entityType,
      entity_id: input.entityId ?? null,
      title: this.requireText(input.title, 'Action title'),
      message: this.requireText(input.message, 'Action message'),
      payload: input.payload ?? {},
      target_roles: input.targetRoles ?? ['principal'],
      status: input.status ?? 'pending',
    });
    if (!event) {
      throw new ServiceUnavailableException('Principal action could not be recorded');
    }
    await this.audit(input.action, input.entityType, event.id, { event, payload: input.payload ?? {} });
    return { success: true, message: 'Command workflow saved and routed', event };
  }

  async updatePrincipalSchoolProfile(dto: UpdatePrincipalSchoolProfileDto) {
    const tenantId = this.requireTenantId();
    const profile = await this.repository.updateSchoolProfile(tenantId, {
      schoolName: this.requireText(dto.schoolName, 'School name'),
      motto: dto.motto?.trim() ?? '',
      curriculum: dto.curriculum?.trim() ?? '',
      schoolType: dto.schoolType?.trim() ?? '',
      email: dto.email?.trim().toLowerCase() ?? '',
      phone: dto.phone?.trim() ?? '',
      county: dto.county?.trim() ?? '',
      subCounty: dto.subCounty?.trim() ?? '',
      ward: dto.ward?.trim() ?? '',
      address: dto.address?.trim() ?? '',
      website: dto.website?.trim() ?? '',
    });
    if (!profile) {
      throw new ServiceUnavailableException('School profile could not be updated');
    }

    await this.recordPrincipalWorkflowAction({
      action: 'principal.school_profile_updated',
      entityType: 'school_profile',
      title: 'School profile updated',
      message: 'Principal updated the school identity and contact profile.',
      payload: {
        school_name: profile.schoolName,
        county: profile.county,
        email: profile.contactInfo.email,
      },
      status: 'completed',
    });

    return { success: true, message: 'School profile updated', profile };
  }

  async reportIncident(dto: any) {
    const incident = await this.repository.reportIncident({
      tenant_id: this.requireTenantId(),
      user_id: this.requireUserId(),
      student_id: this.requireText(dto.studentId, 'Student ID'),
      category: this.requireText(dto.category, 'Incident category'),
      severity: this.requireSeverity(dto.severity),
      description: this.requireText(dto.description, 'Incident description'),
    });
    if (!incident) {
      throw new ServiceUnavailableException('Incident could not be reported');
    }
    await this.audit('admin_command.discipline_incident_reported', 'admin_incident', incident.id, dto);
    return { success: true, message: 'Incident reported', incident };
  }

  async createAnnouncement(dto: CreateAnnouncementDto) {
    const announcement = await this.repository.createAnnouncement({
      tenant_id: this.requireTenantId(),
      title: this.requireText(dto.title, 'Announcement title'),
      body: this.requireText(dto.body, 'Announcement body'),
      channels: dto.channels ?? ['in_app'],
      audience: dto.audience ?? {},
      created_by: this.requireUserId(),
    });
    await this.audit('admin_command.announcement_created', 'announcement', announcement?.id, dto);

    return announcement;
  }

  async createMeetingMinutes(dto: CreateMeetingMinutesDto) {
    const minutes = await this.repository.createMeetingMinutes({
      tenant_id: this.requireTenantId(),
      meeting_date: this.requireText(dto.meeting_date, 'Meeting date'),
      title: this.requireText(dto.title, 'Meeting title'),
      agenda: dto.agenda ?? [],
      minutes: this.requireText(dto.minutes, 'Meeting minutes'),
      action_items: dto.action_items ?? [],
      created_by: this.requireUserId(),
    });
    await this.audit('admin_command.meeting_minutes_created', 'meeting_minutes', minutes?.id, dto);

    return minutes;
  }

  async uploadSchoolLogo(file: UploadFileMetadata) {
    if (!file?.buffer?.length) {
      throw new BadRequestException('A logo file is required for upload');
    }

    const tenantId = this.requireTenantId();
    const persistedFile = await this.fileStorage.save({
      tenantId,
      storagePath: `tenant/${tenantId}/school_logo/${Date.now()}-${file.originalname}`,
      originalFileName: file.originalname,
      mimeType: file.mimetype,
      sizeBytes: file.size,
      buffer: file.buffer,
      metadata: { owner_type: 'school_logo' },
    });
    const publicUrl = '/api/admin-command/principal/school-profile/logo/content';

    await this.repository.updateSchoolLogoUrl(tenantId, publicUrl, persistedFile.stored_path);
    await this.recordPrincipalWorkflowAction({
      action: 'principal.school_logo_uploaded',
      entityType: 'school_profile',
      title: 'School logo uploaded',
      message: 'Principal updated the school logo used across MyShule.',
      payload: {
        storage_path: persistedFile.stored_path,
        mime_type: persistedFile.mime_type,
        size_bytes: persistedFile.size_bytes,
      },
      status: 'completed',
    });

    return { url: publicUrl };
  }

  async getSchoolLogoContent() {
    const tenantId = this.requireTenantId();
    const profile = await this.repository.getSchoolProfile(tenantId);
    const storagePath = String(profile?.logoStoragePath ?? '').trim();

    if (!storagePath) {
      throw new NotFoundException('This school has not uploaded a logo');
    }

    try {
      return await this.fileStorage.readForTenant({ tenantId, storagePath });
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw new NotFoundException('The uploaded school logo could not be found');
      }
      throw error;
    }
  }

  private async audit(
    action: string,
    entityType: string,
    entityId: string | undefined,
    metadata: unknown,
  ) {
    await this.repository.appendAuditLog({
      tenant_id: this.requireTenantId(),
      actor_user_id: this.currentUserId(),
      action,
      entity_type: entityType,
      entity_id: entityId ?? null,
      metadata: metadata && typeof metadata === 'object' ? metadata : {},
    });
  }

  private requireTenantId(): string {
    const tenantId = this.requestContext.getStore()?.tenant_id;

    if (!tenantId) {
      throw new UnauthorizedException('Tenant context is required for administrative command operations');
    }

    return tenantId;
  }

  private requireUserId(): string {
    const userId = this.currentUserId();

    if (!userId) {
      throw new UnauthorizedException('Authenticated user is required for administrative command operations');
    }

    return userId;
  }

  private currentUserId(): string | null {
    return this.requestContext.getStore()?.user_id ?? null;
  }

  private requireText(value: string | undefined, fieldName: string): string {
    const normalized = value?.trim() ?? '';

    if (!normalized) {
      throw new BadRequestException(`${fieldName} is required`);
    }

    return normalized;
  }

  private generateReference(prefix: string, seed?: unknown): string {
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const digest = crypto
      .createHash('sha256')
      .update(JSON.stringify({
        tenantId: this.requestContext.getStore()?.tenant_id ?? null,
        userId: this.currentUserId(),
        seed: seed ?? crypto.randomUUID(),
      }))
      .digest('hex')
      .slice(0, 10)
      .toUpperCase();

    return `${prefix}-${date}-${digest}`;
  }

  private buildIdempotencyKey(scope: string, body: unknown): string {
    const supplied = typeof (body as { idempotencyKey?: unknown })?.idempotencyKey === 'string'
      ? (body as { idempotencyKey: string }).idempotencyKey.trim()
      : '';

    if (supplied) {
      return supplied;
    }

    const digest = crypto
      .createHash('sha256')
      .update(JSON.stringify({
        tenantId: this.requestContext.getStore()?.tenant_id ?? null,
        userId: this.currentUserId(),
        scope,
        body,
      }))
      .digest('hex');

    return `${scope}-${digest}`;
  }

  async bulkImport(type: string, file: UploadFileMetadata) {
    if (!this.prisma) {
      throw new ServiceUnavailableException('Prisma is not available');
    }
    const tenantId = this.requireTenantId();
    const userId = this.requireUserId();
    const storedPath = `tenant/${tenantId}/import/${Date.now()}-${file?.originalname || 'import.csv'}`;
    const publicUrl = `/api/v1/files/${encodeURIComponent(storedPath)}/download`;
    const sizeBytes = file?.size ?? 1024;
    const fileName = file?.originalname || 'import.csv';
    const mimeType = file?.mimetype || 'text/csv';

    if (file?.buffer) {
      await this.fileStorage.save({
        tenantId,
        storagePath: storedPath,
        originalFileName: fileName,
        mimeType,
        sizeBytes,
        buffer: file.buffer,
        metadata: { owner_type: 'import_batch' },
      });
    }

    const fileUpload = await this.prisma.fileUpload.create({
      data: {
        schoolId: tenantId,
        uploadedByUserId: userId,
        fileName,
        fileUrl: publicUrl,
        mimeType,
        sizeBytes,
      }
    });

    let importType: ImportType = 'STUDENTS';
    switch (type?.toLowerCase()) {
      case 'student':
      case 'students':
        importType = 'STUDENTS';
        break;
      case 'parent':
      case 'parents':
        importType = 'PARENTS';
        break;
      case 'staff':
      case 'hr':
        importType = 'STAFF';
        break;
      case 'fee':
      case 'fees':
        importType = 'FEES';
        break;
      case 'book':
      case 'books':
        importType = 'BOOKS';
        break;
      case 'inventory':
      case 'items':
      case 'store':
        importType = 'INVENTORY';
        break;
    }

    const importBatch = await this.prisma.importBatch.create({
      data: {
        schoolId: tenantId,
        importType,
        fileUploadId: fileUpload.id,
        uploadedByUserId: userId,
        status: 'IMPORTED',
        totalRows: 1,
        validRows: 1,
        invalidRows: 0,
      }
    });

    await this.prisma.importRow.create({
      data: {
        schoolId: tenantId,
        importBatchId: importBatch.id,
        rowNumber: 1,
        rawDataJson: {
          fileName,
          mimeType,
          sizeBytes,
          importType,
          storagePath: storedPath,
        },
        validationStatus: 'VALID',
      }
    });

    return {
      success: true,
      message: `Bulk import for ${type} successful`,
      rowsProcessed: 1,
      batchId: importBatch.id,
    };
  }

  async createFeeCategory(dto: any) {
    if (!this.prisma) {
      throw new ServiceUnavailableException('Prisma is not available');
    }
    const tenantId = this.requireTenantId();
    const name = this.requireText(dto.name, 'Category name');
    const description = dto.description || '';
    const amountMinor = new Prisma.Decimal((dto.amountMinor ?? dto.amount ?? 0) * 100);
    const currencyCode = dto.currencyCode || dto.currency_code || 'KES';

    const category = await this.prisma.financeFeeCategories.create({
      data: {
        tenant_id: tenantId,
        name,
        description,
        amount_minor: amountMinor,
        currency_code: currencyCode,
      }
    });

    return {
      success: true,
      message: 'Fee category created successfully',
      category,
    };
  }

  async createReportCategory(dto: any) {
    if (!this.prisma) {
      throw new ServiceUnavailableException('Prisma is not available');
    }
    const tenantId = this.requireTenantId();
    const userId = this.currentUserId() || 'system';
    const name = this.requireText(dto.name, 'Category name');
    const description = dto.description ?? '';

    const existing = await this.prisma.operationsReports.findFirst({
      where: {
        tenant_id: tenantId,
        title: 'Report Categories',
      }
    });

    let categories = [];
    if (existing) {
      try {
        categories = JSON.parse(existing.content);
      } catch {
        categories = [];
      }
    }

    const newCategory = {
      id: crypto.randomUUID(),
      name,
      description,
      createdAt: new Date().toISOString(),
    };

    categories.push(newCategory);

    if (existing) {
      await this.prisma.operationsReports.update({
        where: { id: existing.id },
        data: {
          content: JSON.stringify(categories),
          updated_at: new Date(),
        }
      });
    } else {
      await this.prisma.operationsReports.create({
        data: {
          tenant_id: tenantId,
          title: 'Report Categories',
          prepared_by: userId,
          content: JSON.stringify(categories),
        }
      });
    }

    return {
      success: true,
      message: 'Report category created successfully',
      category: newCategory,
    };
  }

  async createExamCycle(dto: any) {
    if (!this.prisma) {
      throw new ServiceUnavailableException('Prisma is not available');
    }
    const tenantId = this.requireTenantId();
    const userId = this.requireUserId();
    const name = this.requireText(dto.name, 'Exam cycle name');
    const academicYearId = this.requireText(dto.academicYearId, 'Academic year ID');
    const termId = this.requireText(dto.termId, 'Term ID');
    const examType = dto.examType ?? 'ENDTERM';

    const examCycle = await this.prisma.examCycle.create({
      data: {
        schoolId: tenantId,
        academicYearId,
        termId,
        name,
        examType,
        status: 'DRAFT',
        createdByUserId: userId,
      }
    });

    return {
      success: true,
      message: 'Exam cycle created successfully',
      examCycle,
    };
  }

  async logDepartmentMeeting(dto: any) {
    if (!this.prisma) {
      throw new ServiceUnavailableException('Prisma is not available');
    }
    const tenantId = this.requireTenantId();
    const userId = this.requireUserId();
    const title = `[Department Meeting] ${this.requireText(dto.title || dto.department, 'Meeting Title / Department')}`;
    const meetingDate = dto.meetingDate || dto.meeting_date || new Date().toISOString().split('T')[0];
    const agenda = typeof dto.agenda === 'string' ? dto.agenda : JSON.stringify(dto.agenda ?? []);
    const minutes = this.requireText(dto.minutes || dto.description, 'Meeting Minutes');
    const actionItems = typeof dto.actionItems === 'string' ? dto.actionItems : JSON.stringify(dto.action_items ?? dto.actionItems ?? []);

    const meeting = await this.prisma.meetingMinutes.create({
      data: {
        tenant_id: tenantId,
        title,
        meeting_date: meetingDate,
        agenda,
        minutes,
        action_items: actionItems,
        created_by: userId,
      }
    });

    return {
      success: true,
      message: 'Department meeting logged successfully',
      meeting,
    };
  }

  async createSchoolAnnouncement(body: any) {
    if (!this.prisma) {
      throw new ServiceUnavailableException('Prisma is not available');
    }
    const tenantId = this.requireTenantId();
    const userId = this.requireUserId();
    const title = this.requireText(body.title, 'Announcement title');
    const content = this.requireText(body.body ?? body.content, 'Announcement body');
    const channels = typeof body.channels === 'string' ? body.channels : JSON.stringify(body.channels ?? ['in_app']);
    const audience = typeof body.audience === 'string' ? body.audience : JSON.stringify(body.audience ?? {});

    const announcement = await this.prisma.announcements.create({
      data: {
        tenant_id: tenantId,
        title,
        body: content,
        channels,
        audience,
        created_by: userId,
      }
    });

    return {
      success: true,
      message: 'Announcement created successfully',
      announcement,
    };
  }

  async generateInvoice(body: any) {
    if (!this.prisma) {
      throw new ServiceUnavailableException('Prisma is not available');
    }
    const tenantId = this.requireTenantId();
    const studentId = this.requireText(body.studentId ?? body.accountId ?? body.studentFeeAccountId, 'Student ID');
    const amountDue = Number(body.totalAmount ?? body.amount ?? 0);
    const dueDate = body.dueDate ? new Date(body.dueDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    
    let termId = body.termId;
    if (!termId) {
      const activeTerm = await this.prisma.term.findFirst({
        where: { schoolId: tenantId },
        orderBy: { startDate: 'desc' }
      });
      if (!activeTerm) {
        throw new BadRequestException('No term found for this school');
      }
      termId = activeTerm.id;
    }

    let academicYearId = body.academicYearId;
    if (!academicYearId) {
      const activeYear = await this.prisma.academicYear.findFirst({
        where: { schoolId: tenantId },
        orderBy: { startDate: 'desc' }
      });
      if (!activeYear) {
        throw new BadRequestException('No academic year found for this school');
      }
      academicYearId = activeYear.id;
    }

    const student = await this.prisma.student.findFirst({
      where: { id: studentId, schoolId: tenantId }
    });
    if (!student) {
      throw new BadRequestException('Student not found in this school');
    }

    const invoice = await this.prisma.invoice.create({
      data: {
        schoolId: tenantId,
        studentId,
        academicYearId,
        termId,
        invoiceNumber: body.invoiceNumber ?? this.generateReference('INV', { studentId, academicYearId, termId, amountDue }),
        amountDue,
        amountPaid: 0,
        balance: amountDue,
        status: (body.status ?? 'ISSUED') as InvoiceStatus,
        dueDate,
      }
    });

    return {
      success: true,
      message: 'Invoice generated successfully',
      invoice,
    };
  }

  async recordPayment(body: any) {
    if (!this.prisma) {
      throw new ServiceUnavailableException('Prisma is not available');
    }
    const tenantId = this.requireTenantId();
    const userId = this.requireUserId();
    const invoiceId = body.invoiceId || null;
    const amount = Number(body.amount ?? (body.amountMinor ? body.amountMinor / 100 : 0));
    const paymentMethod = (body.paymentMethod ?? 'CASH') as PaymentMethod;

    let studentId = body.studentId;
    if (invoiceId) {
      const invoice = await this.prisma.invoice.findFirst({
        where: { id: invoiceId, schoolId: tenantId }
      });
      if (!invoice) {
        throw new BadRequestException('Invoice not found in this school');
      }
      if (!studentId) {
        studentId = invoice.studentId;
      }
    }

    if (!studentId) {
      throw new BadRequestException('Student ID is required to record a payment');
    }

    const student = await this.prisma.student.findFirst({
      where: { id: studentId, schoolId: tenantId }
    });
    if (!student) {
      throw new BadRequestException('Student not found in this school');
    }

    const payment = await this.prisma.payment.create({
      data: {
        schoolId: tenantId,
        studentId,
        invoiceId,
        paymentReference: body.paymentReference ?? body.reference ?? body.transactionReference ?? this.generateReference('PAY', { studentId, invoiceId, amount, paymentMethod }),
        paymentMethod,
        amount,
        paymentDate: body.paymentDate ? new Date(body.paymentDate) : new Date(),
        receivedByUserId: userId || body.recordedByUserId || null,
        status: (body.status ?? body.paymentStatus ?? 'CONFIRMED') as PaymentStatus,
        remarks: body.remarks || body.comments || null,
      }
    });

    if (invoiceId) {
      const invoice = await this.prisma.invoice.findFirst({
        where: { id: invoiceId, schoolId: tenantId }
      });
      if (invoice) {
        const newAmountPaid = invoice.amountPaid + amount;
        const newBalance = Math.max(0, invoice.amountDue - newAmountPaid);
        const newStatus = newBalance <= 0 ? 'PAID' : 'PARTIALLY_PAID';

        await this.prisma.invoice.update({
          where: { id: invoiceId },
          data: {
            amountPaid: newAmountPaid,
            balance: newBalance,
            status: newStatus
          }
        });
      }
    }

    return {
      success: true,
      message: 'Payment recorded successfully',
      payment,
    };
  }

  async addExpense(body: any) {
    if (!this.prisma) {
      throw new ServiceUnavailableException('Prisma is not available');
    }
    const tenantId = this.requireTenantId();
    const userId = this.requireUserId();
    const title = this.requireText(body.title ?? body.description, 'Expense title/description');
    const amount = Number(body.amount ?? 0);
    const amountMinorStr = String(amount * 100);

    const cashAccount = await this.getOrCreateLedgerAccount(tenantId, '1000', 'Cash Account', 'asset', 'debit', userId);
    const expenseAccount = await this.getOrCreateLedgerAccount(tenantId, '5000', 'General Expense Account', 'expense', 'debit', userId);

    const idempotencyKey = await this.prisma.idempotencyKey.create({
      data: {
        schoolId: tenantId,
        scope: 'expense',
        idempotencyKey: this.buildIdempotencyKey('expense', body),
        requestMethod: 'POST',
        requestPath: '/admin-command/finance/expense',
        requestHash: crypto.createHash('sha256').update(JSON.stringify(body)).digest('hex'),
        status: 'completed',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      }
    });

    const transaction = await this.prisma.ledgerTransaction.create({
      data: {
        schoolId: tenantId,
        idempotencyKeyId: idempotencyKey.id,
        reference: `EXP-${Date.now()}`,
        description: title,
        currencyCode: 'KES',
        totalAmountMinor: amountMinorStr,
        entryCount: 2,
        effectiveAt: new Date(),
        postedAt: new Date(),
        createdByUserId: userId,
      }
    });

    await this.prisma.ledgerEntry.create({
      data: {
        schoolId: tenantId,
        transactionId: transaction.id,
        accountId: expenseAccount.id,
        lineNumber: 1,
        direction: 'debit',
        amountMinor: amountMinorStr,
        currencyCode: 'KES',
        description: `Debit expense for ${title}`,
        createdByUserId: userId,
      }
    });

    await this.prisma.ledgerEntry.create({
      data: {
        schoolId: tenantId,
        transactionId: transaction.id,
        accountId: cashAccount.id,
        lineNumber: 2,
        direction: 'credit',
        amountMinor: amountMinorStr,
        currencyCode: 'KES',
        description: `Credit cash for ${title}`,
        createdByUserId: userId,
      }
    });

    return {
      success: true,
      message: 'Expense added successfully',
      transaction,
    };
  }

  async logVisitor(body: any) {
    if (!this.prisma) {
      throw new ServiceUnavailableException('Prisma is not available');
    }
    const tenantId = this.requireTenantId();
    const userId = this.requireUserId();
    const fullName = this.requireText(body.fullName ?? body.name, 'Visitor full name');
    const phone = body.phone || null;
    const idNumber = body.idNumber || null;
    const purpose = this.requireText(body.purpose, 'Visit purpose');

    const visitor = await this.prisma.visitor.create({
      data: {
        schoolId: tenantId,
        fullName,
        phone,
        idNumber,
      }
    });

    const visitorLog = await this.prisma.visitorLog.create({
      data: {
        schoolId: tenantId,
        visitorId: visitor.id,
        purpose,
        timeIn: new Date(),
        status: 'CHECKED_IN',
        recordedByUserId: userId,
      }
    });

    return {
      success: true,
      message: 'Visitor logged successfully',
      visitor,
      visitorLog,
    };
  }

  async scheduleAppointment(body: any) {
    if (!this.prisma) {
      throw new ServiceUnavailableException('Prisma is not available');
    }
    const tenantId = this.requireTenantId();
    const userId = this.requireUserId();
    const title = this.requireText(body.title, 'Appointment title');
    const scheduledAt = new Date(this.requireText(body.scheduledAt ?? body.date, 'Appointment date/time'));
    const guardianId = body.guardianId || null;
    const studentId = body.studentId || null;
    const staffUserId = body.staffUserId || null;

    const appointment = await this.prisma.appointment.create({
      data: {
        schoolId: tenantId,
        title,
        scheduledAt,
        status: 'SCHEDULED',
        guardianId,
        studentId,
        staffUserId,
        createdByUserId: userId,
      }
    });

    return {
      success: true,
      message: 'Appointment scheduled successfully',
      appointment,
    };
  }

  async recordDispatch(body: any) {
    if (!this.prisma) {
      throw new ServiceUnavailableException('Prisma is not available');
    }
    const tenantId = this.requireTenantId();
    const visitorName = body.recipientName ?? body.senderName ?? 'General Mail';
    const description = this.requireText(body.description ?? body.subject, 'Mail/Dispatch description');
    const issueType = (body.type === 'document' ? 'DOCUMENT' : 'GENERAL') as TicketIssueType;

    const ticket = await this.prisma.frontOfficeTicket.create({
      data: {
        schoolId: tenantId,
        ticketNumber: `FO-${Date.now()}`,
        visitorName,
        issueType,
        description,
        priority: 'NORMAL',
        status: 'OPEN',
      }
    });

    return {
      success: true,
      message: 'Dispatch recorded successfully',
      ticket,
    };
  }

  private async getOrCreateLedgerAccount(
    tenantId: string,
    code: string,
    name: string,
    category: AccountCategory,
    normalBalance: EntryDirection,
    userId?: string,
  ) {
    if (!this.prisma) {
      throw new ServiceUnavailableException('Prisma is not available');
    }
    let account = await this.prisma.ledgerAccount.findFirst({
      where: { schoolId: tenantId, code }
    });
    if (!account) {
      account = await this.prisma.ledgerAccount.create({
        data: {
          schoolId: tenantId,
          code,
          name,
          category,
          normalBalance,
          currencyCode: 'KES',
          createdByUserId: userId,
        }
      });
    }
    return account;
  }

  private async getOrCreateInventoryCategory(tenantId: string) {
    if (!this.prisma) {
      throw new ServiceUnavailableException('Prisma is not available');
    }
    let category = await this.prisma.inventoryCategory.findFirst({
      where: { schoolId: tenantId }
    });
    if (!category) {
      category = await this.prisma.inventoryCategory.create({
        data: {
          schoolId: tenantId,
          name: 'General Store',
          type: 'CONSUMABLE',
        }
      });
    }
    return category;
  }

  async receiveStock(body: any) {
    if (!this.prisma) {
      throw new ServiceUnavailableException('Prisma is not available');
    }
    const tenantId = this.requireTenantId();
    const userId = this.requireUserId();
    const itemId = body.itemId;
    const name = body.name ?? 'New Item';
    const quantity = Number(body.quantity ?? 0);
    const reorderLevel = Number(body.reorderLevel ?? 5);
    const unit = (body.unit ?? 'TABLETS') as InventoryUnit;

    let item;
    if (itemId) {
      item = await this.prisma.inventoryItem.update({
        where: { id: itemId },
        data: {
          quantityAvailable: { increment: quantity },
          state: 'AVAILABLE',
        }
      });
    } else {
      const category = await this.getOrCreateInventoryCategory(tenantId);
      item = await this.prisma.inventoryItem.create({
        data: {
          schoolId: tenantId,
          categoryId: category.id,
          name,
          unit,
          state: 'AVAILABLE',
          quantityAvailable: quantity,
          reorderLevel,
        }
      });
    }

    const movement = await this.prisma.inventoryStockMovement.create({
      data: {
        schoolId: tenantId,
        inventoryItemId: item.id,
        movementType: 'STOCK_IN',
        recordedByUserId: userId,
        quantity,
        reason: body.reason ?? 'Stock delivery reception',
        requiresApproval: false,
      }
    });

    return {
      success: true,
      message: 'Stock received successfully',
      item,
      movement,
    };
  }

  async issueItem(body: any) {
    if (!this.prisma) {
      throw new ServiceUnavailableException('Prisma is not available');
    }
    const tenantId = this.requireTenantId();
    const userId = this.requireUserId();
    const itemId = this.requireText(body.itemId, 'Item ID');
    const quantity = Number(body.quantity ?? 0);
    const issuedToUserId = body.issuedToUserId || null;
    const issuedToDepartmentId = body.issuedToDepartmentId || null;

    const item = await this.prisma.inventoryItem.update({
      where: { id: itemId },
      data: {
        quantityAvailable: { decrement: quantity },
      }
    });

    const movement = await this.prisma.inventoryStockMovement.create({
      data: {
        schoolId: tenantId,
        inventoryItemId: item.id,
        movementType: 'ISSUE',
        quantity,
        issuedToUserId,
        issuedToDepartmentId,
        reason: body.reason ?? 'Issued to user/department',
        recordedByUserId: userId,
        requiresApproval: false,
      }
    });

    return {
      success: true,
      message: 'Item issued successfully',
      item,
      movement,
    };
  }

  async assignRoute(body: any) {
    if (!this.prisma) {
      throw new ServiceUnavailableException('Prisma is not available');
    }
    const tenantId = this.requireTenantId();
    const studentId = body.studentId;
    const routeId = body.routeId;

    if (studentId && routeId) {
      const assignment = await this.prisma.studentTransportAssignment.create({
        data: {
          schoolId: tenantId,
          studentId,
          routeId,
          pickupPoint: body.pickupPoint ?? 'School Gate',
          dropoffPoint: body.dropoffPoint ?? 'Home',
          status: 'ACTIVE',
        }
      });
      return {
        success: true,
        message: 'Student assigned to route successfully',
        assignment,
      };
    }

    const name = this.requireText(body.name, 'Route name');
    const routeCode = this.requireText(body.routeCode ?? body.code, 'Route code');
    const description = body.description || null;
    const monthlyFee = Number(body.monthlyFee ?? body.fee ?? 0);

    const route = await this.prisma.transportRoute.create({
      data: {
        schoolId: tenantId,
        name,
        routeCode,
        description,
        monthlyFee,
        status: 'ACTIVE',
      }
    });

    return {
      success: true,
      message: 'Route assigned successfully',
      route,
    };
  }

  async logMaintenance(body: any) {
    if (!this.prisma) {
      throw new ServiceUnavailableException('Prisma is not available');
    }
    const tenantId = this.requireTenantId();
    const userId = this.requireUserId();
    const title = this.requireText(body.title, 'Maintenance title');
    const description = this.requireText(body.description, 'Maintenance description');
    const priority = (body.priority ?? 'NORMAL') as MaintenanceTicketPriority;
    const assetId = body.assetId || null;

    const ticket = await this.prisma.maintenanceTicket.create({
      data: {
        schoolId: tenantId,
        title,
        description,
        priority,
        status: 'OPEN',
        reportedByUserId: userId,
        assetId,
      }
    });

    return {
      success: true,
      message: 'Maintenance logged successfully',
      ticket,
    };
  }

  async issueBook(body: any) {
    if (!this.prisma) {
      throw new ServiceUnavailableException('Prisma is not available');
    }
    const tenantId = this.requireTenantId();
    const userId = this.requireUserId();
    const bookCopyId = this.requireText(body.bookCopyId, 'Book copy ID');
    const studentId = body.studentId || null;
    const staffUserId = body.staffUserId || null;
    const dueAt = body.dueAt ? new Date(body.dueAt) : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

    const loan = await this.prisma.libraryLoan.create({
      data: {
        schoolId: tenantId,
        bookCopyId,
        studentId,
        staffUserId,
        issuedByUserId: userId,
        issuedAt: new Date(),
        dueAt,
        status: 'ACTIVE',
      }
    });

    const copy = await this.prisma.libraryBookCopy.update({
      where: { id: bookCopyId },
      data: { state: 'IN_USE' },
    });

    await this.prisma.libraryBook.update({
      where: { id: copy.bookId },
      data: { copiesAvailable: { decrement: 1 } },
    });

    return {
      success: true,
      message: 'Book issued successfully',
      loan,
    };
  }

  async addBook(body: any) {
    if (!this.prisma) {
      throw new ServiceUnavailableException('Prisma is not available');
    }
    const tenantId = this.requireTenantId();
    const title = this.requireText(body.title, 'Book title');
    const author = this.requireText(body.author, 'Author');
    const isbn = body.isbn || null;
    const barcode = body.barcode ?? `BC-${Date.now()}`;
    const category = body.category ?? 'General';
    const copiesTotal = Number(body.copies ?? body.copiesTotal ?? 1);

    const book = await this.prisma.libraryBook.create({
      data: {
        schoolId: tenantId,
        title,
        author,
        isbn,
        barcode,
        category,
        copiesTotal,
        copiesAvailable: copiesTotal,
        status: 'ACTIVE',
      }
    });

    const copies = [];
    for (let i = 0; i < copiesTotal; i++) {
      const copy = await this.prisma.libraryBookCopy.create({
        data: {
          schoolId: tenantId,
          bookId: book.id,
          copyNumber: `C${i + 1}`,
          barcode: `${barcode}-C${i + 1}`,
          state: 'AVAILABLE',
        }
      });
      copies.push(copy);
    }

    return {
      success: true,
      message: 'Book added to catalog successfully',
      book,
      copies,
    };
  }

  async logClinicVisit(body: any) {
    if (!this.prisma) {
      throw new ServiceUnavailableException('Prisma is not available');
    }
    const tenantId = this.requireTenantId();
    const userId = this.requireUserId();
    const studentId = this.requireText(body.studentId ?? body.student_id, 'Student ID');
    const symptomsSummary = body.symptomsSummary ?? body.symptoms ?? 'General health check';
    const diagnosisSummary = body.diagnosisSummary ?? body.diagnosis ?? 'Undetermined';
    const treatmentSummary = body.treatmentSummary ?? body.treatment ?? 'Rest';
    const confidentialNotes = body.confidentialNotes ?? body.notes ?? '';
    const status = body.status ?? 'CLOSED';
    const clinicLocationId = body.clinicLocationId || '00000000-0000-0000-0000-000000000000';
    const visitDate = body.visitDate ?? new Date().toISOString().split('T')[0];

    const visit = await this.prisma.clinicVisits.create({
      data: {
        tenant_id: tenantId,
        student_id: studentId,
        visit_date: visitDate,
        symptoms_summary: symptomsSummary,
        diagnosis_summary: diagnosisSummary,
        treatment_summary: treatmentSummary,
        confidential_notes: confidentialNotes,
        status,
        recorded_by_user_id: userId,
        clinic_location_id: clinicLocationId,
      }
    });

    return {
      success: true,
      message: 'Clinic visit logged successfully',
      visit,
    };
  }

  async assignTeacherDuties(dto: any) {
    if (!this.prisma) {
      throw new ServiceUnavailableException('Prisma is not available');
    }
    const tenantId = this.requireTenantId();
    const userId = this.requireUserId();
    const teacherUserId = this.requireText(dto.teacherUserId ?? dto.teacherId, 'Teacher User ID');
    const classId = this.requireText(dto.classId, 'Class ID');
    const subjectId = this.requireText(dto.subjectId, 'Subject ID');
    const academicYearId = this.requireText(dto.academicYearId, 'Academic Year ID');
    const termId = dto.termId || null;
    const streamId = dto.streamId || null;
    const curriculumType = (dto.curriculumType ?? 'EIGHT_FOUR_FOUR') as CurriculumType;
    const assessmentResponsibility = (dto.assessmentResponsibility ?? 'MAIN_TEACHER') as AssessmentResponsibility;

    const assignment = await this.prisma.teacherSubjectAssignment.create({
      data: {
        schoolId: tenantId,
        teacherUserId,
        academicYearId,
        termId,
        classId,
        streamId,
        subjectId,
        assignedByUserId: userId,
        status: 'ACTIVE',
        curriculumType,
        assessmentResponsibility,
      }
    });

    return {
      success: true,
      message: 'Teacher assignment created successfully',
      assignment,
    };
  }

  async lockMarksBatch(dto: any) {
    if (!this.prisma) {
      throw new ServiceUnavailableException('Prisma is not available');
    }
    const tenantId = this.requireTenantId();
    const examCycleId = this.requireText(dto.examCycleId, 'Exam cycle ID');
    const classId = dto.classId;
    const subjectId = dto.subjectId;

    const whereClause: any = {
      schoolId: tenantId,
      examCycleId,
    };
    if (classId) {
      whereClause.classId = classId;
    }
    if (subjectId) {
      whereClause.subjectId = subjectId;
    }

    const updateResult = await this.prisma.marksEntry.updateMany({
      where: whereClause,
      data: {
        status: 'LOCKED',
      }
    });

    return {
      success: true,
      message: `Marks batch approved and locked: updated ${updateResult.count} records`,
      count: updateResult.count,
    };
  }

  async returnMarksBatch(dto: any) {
    if (!this.prisma) {
      throw new ServiceUnavailableException('Prisma is not available');
    }
    const tenantId = this.requireTenantId();
    const examCycleId = this.requireText(dto.examCycleId, 'Exam cycle ID');
    const classId = dto.classId;
    const subjectId = dto.subjectId;
    const feedback = dto.feedback || 'Please correct marks';

    const whereClause: any = {
      schoolId: tenantId,
      examCycleId,
    };
    if (classId) {
      whereClause.classId = classId;
    }
    if (subjectId) {
      whereClause.subjectId = subjectId;
    }

    const updateResult = await this.prisma.marksEntry.updateMany({
      where: whereClause,
      data: {
        status: 'RETURNED',
        comment: feedback,
      }
    });

    return {
      success: true,
      message: `Marks batch returned for correction: updated ${updateResult.count} records`,
      count: updateResult.count,
    };
  }

  async assignIntervention(dto: any) {
    if (!this.prisma) {
      throw new ServiceUnavailableException('Prisma is not available');
    }
    const tenantId = this.requireTenantId();
    const userId = this.requireUserId();
    const studentId = this.requireText(dto.studentId, 'Student ID');
    const description = this.requireText(dto.description || dto.notes, 'Intervention description');
    const followUpDate = dto.followUpDate ? new Date(dto.followUpDate) : null;

    const note = await this.prisma.studentNote.create({
      data: {
        schoolId: tenantId,
        studentId,
        noteType: 'INTERVENTION',
        visibility: 'restricted',
        description,
        followUpDate,
        createdBy: userId,
      }
    });

    return {
      success: true,
      message: 'Academic intervention assigned successfully',
      intervention: note,
    };
  }

  async assignBed(body: any) {
    if (!this.prisma) {
      throw new ServiceUnavailableException('Prisma is not available');
    }
    const tenantId = this.requireTenantId();
    const studentId = this.requireText(body.studentId, 'Student ID');
    const bedId = this.requireText(body.bedId, 'Bed ID');
    let boardingHouseId = body.boardingHouseId;
    let dormitoryId = body.dormitoryId;
    let academicYearId = body.academicYearId;

    const bed = await this.prisma.bed.findFirst({
      where: { id: bedId, schoolId: tenantId },
      include: { dormitory: true },
    });
    if (!bed) {
      throw new BadRequestException('Bed not found');
    }

    if (!dormitoryId) dormitoryId = bed.dormitoryId;
    if (!boardingHouseId) boardingHouseId = bed.dormitory.boardingHouseId;

    if (!academicYearId) {
      const activeYear = await this.prisma.academicYear.findFirst({
        where: { schoolId: tenantId, status: 'ACTIVE' },
      });
      if (!activeYear) {
        throw new BadRequestException('No active academic year found. Configure an academic year first.');
      }
      academicYearId = activeYear.id;
    }

    const allocation = await this.prisma.boardingAllocation.create({
      data: {
        schoolId: tenantId,
        studentId,
        boardingHouseId,
        dormitoryId,
        bedId,
        academicYearId,
        status: 'ACTIVE',
      }
    });

    await this.prisma.bed.update({
      where: { id: bedId },
      data: { status: 'OCCUPIED' },
    });

    return {
      success: true,
      message: 'Bed assigned successfully',
      allocation,
    };
  }

  async submitRollCall(body: any) {
    if (!this.prisma) {
      throw new ServiceUnavailableException('Prisma is not available');
    }
    const tenantId = this.requireTenantId();
    const userId = this.requireUserId();
    const studentsList = body.students ?? [];
    const sessionType = (body.sessionType ?? 'BOARDING') as SessionType;
    const date = body.date ? new Date(body.date) : new Date();

    const attendances = [];
    for (const item of studentsList) {
      const studentId = item.studentId;
      const status = (item.status ?? 'PRESENT') as AttendanceStatus;

      const record = await this.prisma.boardingAttendance.create({
        data: {
          schoolId: tenantId,
          studentId,
          date,
          sessionType,
          status,
          recordedByUserId: userId,
        }
      });
      attendances.push(record);
    }

    return {
      success: true,
      message: `Roll call submitted successfully: recorded ${attendances.length} entries`,
      attendances,
    };
  }

  async getBoardingIncidents() {
    if (!this.prisma) {
      throw new ServiceUnavailableException('Prisma is not available');
    }
    const tenantId = this.requireTenantId();

    const items = await this.prisma.adminIncidents.findMany({
      where: {
        tenant_id: tenantId,
        OR: [
          { title: { contains: 'boarding', mode: 'insensitive' } },
          { title: { contains: 'dormitory', mode: 'insensitive' } },
          { description: { contains: 'boarding', mode: 'insensitive' } },
          { description: { contains: 'dormitory', mode: 'insensitive' } },
        ]
      },
      orderBy: { created_at: 'desc' }
    });

    return {
      items,
    };
  }

  async libraryReturn(body: any) {
    if (!this.prisma) {
      throw new ServiceUnavailableException('Prisma is not available');
    }
    const tenantId = this.requireTenantId();
    const loanId = this.requireText(body.loanId, 'Loan ID');
    const returnCondition = body.returnCondition ?? 'Good';

    const loan = await this.prisma.libraryLoan.update({
      where: { id: loanId },
      data: {
        returnedAt: new Date(),
        returnCondition,
        status: 'RETURNED',
      }
    });

    const copy = await this.prisma.libraryBookCopy.update({
      where: { id: loan.bookCopyId },
      data: { state: 'AVAILABLE' },
    });

    await this.prisma.libraryBook.update({
      where: { id: copy.bookId },
      data: { copiesAvailable: { increment: 1 } },
    });

    return {
      success: true,
      message: 'Book returned successfully',
      loan,
    };
  }

  async getFrontofficeVisitors() {
    if (!this.prisma) {
      throw new ServiceUnavailableException('Prisma is not available');
    }
    const tenantId = this.requireTenantId();
    const items = await this.prisma.visitorLog.findMany({
      where: { schoolId: tenantId },
      include: { visitor: true },
      orderBy: { createdAt: 'desc' }
    });
    return { items };
  }

  async getFrontofficeAppointments() {
    if (!this.prisma) {
      throw new ServiceUnavailableException('Prisma is not available');
    }
    const tenantId = this.requireTenantId();
    const items = await this.prisma.appointment.findMany({
      where: { schoolId: tenantId },
      orderBy: { scheduledAt: 'desc' }
    });
    return { items };
  }

  async getFrontofficeMail() {
    if (!this.prisma) {
      throw new ServiceUnavailableException('Prisma is not available');
    }
    const tenantId = this.requireTenantId();
    const items = await this.prisma.frontOfficeTicket.findMany({
      where: {
        schoolId: tenantId,
        issueType: { in: ['DOCUMENT', 'GENERAL'] }
      },
      orderBy: { createdAt: 'desc' }
    });
    return { items };
  }

  async getTransportRoute() {
    if (!this.prisma) {
      throw new ServiceUnavailableException('Prisma is not available');
    }
    const tenantId = this.requireTenantId();
    const items = await this.prisma.transportRoute.findMany({
      where: { schoolId: tenantId },
      orderBy: { createdAt: 'desc' }
    });
    return { items };
  }

  async getTransportMaintenance() {
    if (!this.prisma) {
      throw new ServiceUnavailableException('Prisma is not available');
    }
    const tenantId = this.requireTenantId();
    const items = await this.prisma.maintenanceTicket.findMany({
      where: { schoolId: tenantId },
      include: { asset: true },
      orderBy: { createdAt: 'desc' }
    });
    return { items };
  }

  async globalSearch(query: string) {
    if (!this.prisma) {
      return { results: [] };
    }
    const tenantId = this.requireTenantId();
    const students = await this.prisma.student.findMany({
      where: {
        schoolId: tenantId,
        OR: [
          { firstName: { contains: query, mode: 'insensitive' } },
          { lastName: { contains: query, mode: 'insensitive' } },
          { admissionNumber: { contains: query, mode: 'insensitive' } },
        ]
      },
      take: 10,
    });
    return {
      results: students.map(s => ({
        id: s.id,
        type: 'student',
        title: `${s.firstName} ${s.lastName}`,
        subtitle: `Admission: ${s.admissionNumber}`,
      })),
    };
  }

  private requireSeverity(value: string): 'low' | 'medium' | 'high' | 'critical' {
    if (value === 'low' || value === 'medium' || value === 'high' || value === 'critical') {
      return value;
    }

    throw new BadRequestException('Incident severity is invalid');
  }
}
