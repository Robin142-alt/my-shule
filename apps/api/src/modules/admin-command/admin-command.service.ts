import { DatabaseFileStorageService } from '../../common/uploads/database-file-storage.service';
import { UploadFileMetadata } from '../../common/uploads/upload-policy';
import {
  BadRequestException,
  Injectable,
  MessageEvent,
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
import { PrincipalInsightsService } from './principal-insights.service';
import { AdminCommandRepository } from './repositories/admin-command.repository';

@Injectable()
export class AdminCommandService {
  constructor(
    private readonly requestContext: RequestContextService,
    private readonly repository: AdminCommandRepository,
    private readonly fileStorage: DatabaseFileStorageService,
    @Optional() private readonly objectStorage?: S3CompatibleObjectStorageService,
    private readonly configService?: ConfigService,
    @Optional()
    private readonly principalInsights?: PrincipalInsightsService,
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

  async globalSearch(query: string) {
    return { results: [] };
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
    await this.repository.scheduleReport({
      tenant_id: this.requireTenantId(),
      user_id: this.currentUserId() || 'system',
      title: dto.title,
      schedule: dto.schedule,
    });
    return { success: true, message: 'Report scheduled' };
  }

  async createCommunicationBroadcast(dto: any) {
    await this.repository.createCommunicationBroadcast({
      tenant_id: this.requireTenantId(),
      user_id: this.currentUserId() || 'system',
      audience: dto.audience,
      message: dto.message,
    });
    return { success: true, message: 'Broadcast created' };
  }

  async logAbsence(dto: any) {
    await this.repository.logAbsence({
      tenant_id: this.requireTenantId(),
      user_id: this.currentUserId() || 'system',
      student_id: dto.studentId,
      date: dto.date,
      is_excused: dto.isExcused,
    });
    return { success: true, message: 'Absence logged' };
  }

  async reportIncidentMock(dto: any) {
    await this.repository.reportIncidentMock({
      tenant_id: this.requireTenantId(),
      user_id: this.currentUserId() || 'system',
      student_id: dto.studentId,
      category: dto.category,
      severity: dto.severity,
      description: dto.description,
    });
    return { success: true, message: 'Incident reported' };
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
    let publicUrl: string;

    const useObjectStorage = this.configService?.get<string>('UPLOAD_OBJECT_STORAGE_ENABLED') === 'true';

    if (useObjectStorage && this.objectStorage) {
      const storagePath = `tenant/${tenantId}/school_logo/${Date.now()}-${file.originalname}`;
      const result = await this.objectStorage.putObject({
        tenantId,
        storagePath,
        mimeType: file.mimetype,
        buffer: file.buffer,
      });

      const endpoint = this.configService?.get<string>('UPLOAD_OBJECT_STORAGE_ENDPOINT')?.replace(/\/$/, '') ?? '';
      const bucket = this.configService?.get<string>('UPLOAD_OBJECT_STORAGE_BUCKET') ?? '';
      publicUrl = `${endpoint}/${bucket}/${result.key}`;
    } else {
      // Fallback to database file storage if S3 is not enabled
      const persistedFile = await this.fileStorage.save({
        tenantId,
        storagePath: `tenant/${tenantId}/school_logo/${Date.now()}-${file.originalname}`,
        originalFileName: file.originalname,
        mimeType: file.mimetype,
        sizeBytes: file.size,
        buffer: file.buffer,
        metadata: { owner_type: 'school_logo' },
      });
      publicUrl = `/api/v1/files/${encodeURIComponent(persistedFile.stored_path)}/download`;
    }

    await this.repository.updateSchoolLogoUrl(tenantId, publicUrl);

    return { url: publicUrl };
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

  private requireSeverity(value: string): 'low' | 'medium' | 'high' | 'critical' {
    if (value === 'low' || value === 'medium' || value === 'high' || value === 'critical') {
      return value;
    }

    throw new BadRequestException('Incident severity is invalid');
  }
}
