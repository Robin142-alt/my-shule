import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Optional,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { RequestContextService } from '../../common/request-context/request-context.service';
import { SCHOOL_STAFF_ROLE_CODES } from '../../auth/auth.constants';
import { TENANT_INVITABLE_ROLE_CODES } from '../../auth/dto/tenant-invitation.dto';
import { ExamsService } from '../exams/exams.service';
import { ApprovalService } from '../workflow/services/approval.service';
import { AssignDeputyStaffRoleDto } from './dto/deputy-staff-role.dto';
import { DeputyCommandRepository } from './repositories/deputy-command.repository';

const DEPUTY_FORBIDDEN_DELEGATION_ROLES = new Set(['principal', 'deputy_principal']);
const DEPUTY_DELEGATABLE_ROLE_CODES = new Set<string>(
  TENANT_INVITABLE_ROLE_CODES.filter((roleCode) =>
    (SCHOOL_STAFF_ROLE_CODES as readonly string[]).includes(roleCode)
    && !DEPUTY_FORBIDDEN_DELEGATION_ROLES.has(roleCode),
  ),
);
const DEPUTY_ROLE_ALIASES: Readonly<Record<string, string>> = {
  head_of_department: 'hod',
  dean_of_academics: 'dean_academics',
  form_master: 'grade_master',
  grade_form_master: 'grade_master',
  school_counselor: 'school_counsellor',
  laboratory_technician: 'lab_technician',
};

@Injectable()
export class DeputyCommandService {
  constructor(
    private readonly requestContext: RequestContextService,
    private readonly repository: DeputyCommandRepository,
    private readonly examsService: ExamsService,
    @Optional() private readonly approvalService?: ApprovalService,
  ) {}

  private requireTenantId(): string {
    const tenantId = this.requestContext.getStore()?.tenant_id;
    if (!tenantId) {
      throw new UnauthorizedException('Tenant context is required');
    }
    return tenantId;
  }

  getOverview() { return this.repository.getOverview(this.requireTenantId()); }
  getDailyOperations() { return this.repository.getDailyOperations(this.requireTenantId()); }
  createDailyOperationNote(dto: any) {
    return this.repository.createDailyOperationNote(this.requireTenantId(), this.requestContext.getStore()?.user_id || 'system', dto);
  }
  startMorningReview(dto: any) {
    return this.repository.createDailyOperationNote(this.requireTenantId(), this.requestContext.getStore()?.user_id || 'system', {
      ...dto,
      area: 'Morning Review',
      issue: 'Daily morning review started',
      severity: 'low',
      notes: `Present: ${dto?.present_today ?? 0}; Absent: ${dto?.absent_today ?? 0}; Incidents: ${dto?.reported_incidents ?? 0}; Escalations: ${dto?.escalated_incidents ?? 0}`,
      action: 'morning_review_started',
    });
  }
  getAttendance() { return this.repository.getAttendance(this.requireTenantId()); }
  notifyParent(attendanceId: string) { return this.repository.notifyParent(this.requireTenantId(), this.requestContext.getStore()?.user_id || null, attendanceId); }
  remindUnmarkedAttendance(dto: any) { return this.repository.remindUnmarkedAttendance(this.requireTenantId(), this.requestContext.getStore()?.user_id || null, dto); }
  createFollowUpList(dto: any) { return this.repository.createFollowUpList(this.requireTenantId(), this.requestContext.getStore()?.user_id || 'system', dto); }
  getDiscipline() { return this.repository.getDiscipline(this.requireTenantId()); }
  createDisciplineIncident(dto: any) { return this.repository.createDisciplineIncident(this.requireTenantId(), this.requestContext.getStore()?.user_id || 'system', dto); }
  escalateDisciplineIncident(id: string) { return this.repository.escalateDisciplineIncident(this.requireTenantId(), id); }
  getWelfare() { return this.repository.getWelfare(this.requireTenantId()); }
  createWelfareCase(dto: any) { return this.repository.createWelfareCase(this.requireTenantId(), this.requestContext.getStore()?.user_id || 'system', dto); }
  openWelfareCase(id: string) { return this.repository.openWelfareCase(this.requireTenantId(), id); }
  getStaffDuty() { return this.repository.getStaffDuty(this.requireTenantId()); }
  requestDutyReport(id: string) { return this.repository.requestDutyReport(this.requireTenantId(), this.requestContext.getStore()?.user_id || null, id); }
  manageDutyRoster(dto: any) { return this.repository.manageDutyRoster(this.requireTenantId(), this.requestContext.getStore()?.user_id || 'system', dto); }
  
  getTeaching() { return this.repository.getTeaching(this.requireTenantId()); }
  markTeachingAttendance(id: string) { return this.repository.markTeachingAttendance(this.requireTenantId(), this.requestContext.getStore()?.user_id || null, id); }
  logTeachingLesson(id: string) { return this.repository.logTeachingLesson(this.requireTenantId(), this.requestContext.getStore()?.user_id || null, id); }
  
  getTimetable() { return this.repository.getTimetable(this.requireTenantId()); }
  assignReliefTeacher(id: string, teacherName: string) { return this.repository.assignReliefTeacher(this.requireTenantId(), this.requestContext.getStore()?.user_id || null, id, teacherName); }
  autoAssignRelief() { return this.repository.autoAssignRelief(this.requireTenantId(), this.requestContext.getStore()?.user_id || null); }
  
  async getAcademics() {
    const [academicSummary, interventions] = await Promise.all([
      this.repository.getAcademics(this.requireTenantId()),
      this.examsService.listAcademicInterventions(),
    ]);
    return {
      ...academicSummary,
      metrics: {
        ...(academicSummary.metrics ?? {}),
        ...(interventions.metrics ?? {}),
      },
      interventions: interventions.items ?? [],
      academicinterventionsList: interventions.items ?? [],
    };
  }

  messageHOD(id: string) {
    return this.examsService.notifyAcademicInterventionHod(id);
  }

  createIntervention(dto: any) {
    const className = String(dto?.class_name ?? dto?.className ?? '').trim() || undefined;
    const subjectName = String(dto?.subject_name ?? dto?.subject ?? '').trim() || undefined;
    const ownerName = String(dto?.owner_name ?? dto?.teacher ?? '').trim() || undefined;
    const concern = String(
      dto?.trigger_reason ?? dto?.concern ?? dto?.title ?? '',
    ).trim();
    const plan = String(
      dto?.plan ?? dto?.description ?? dto?.notes ?? '',
    ).trim();

    return this.examsService.createAcademicIntervention({
      student_id: stringOrUndefined(dto?.student_id),
      exam_series_id: stringOrUndefined(dto?.exam_series_id),
      class_section_id: stringOrUndefined(dto?.class_section_id),
      class_name: className,
      subject_id: stringOrUndefined(dto?.subject_id),
      subject_name: subjectName,
      owner_user_id: stringOrUndefined(dto?.owner_user_id),
      owner_name: ownerName,
      hod_user_id: stringOrUndefined(dto?.hod_user_id),
      source: dto?.source ?? 'manual',
      trigger_reason: concern,
      baseline: objectOrUndefined(dto?.baseline)
        ?? (dto?.coverage ? { coverage: String(dto.coverage) } : undefined),
      plan,
      target: objectOrUndefined(dto?.target),
      priority: dto?.priority ?? 'normal',
      starts_on: stringOrUndefined(dto?.starts_on),
      due_on: stringOrUndefined(dto?.due_on),
    });
  }
  
  getExams() { return this.examsService.getWorkflowOverview(); }
  flagExamDelay(id: string) { return this.repository.flagExamDelay(this.requireTenantId(), id); }
  
  getClasses() { return this.repository.getClasses(this.requireTenantId()); }
  manageStreams(dto: any) { return this.repository.manageStreams(this.requireTenantId(), this.requestContext.getStore()?.user_id || 'system', dto); }
  
  async getApprovals() {
    if (!this.approvalService) {
      throw new ServiceUnavailableException('The governed approval workflow is not available');
    }
    const tenantId = this.requireTenantId();
    const store = this.requestContext.requireStore();
    const actorUserId = stringOrUndefined(store?.user_id);
    const actorRole = stringOrUndefined(store?.role);
    if (!actorUserId || !actorRole) {
      throw new UnauthorizedException('An authenticated Deputy Principal role is required to review approvals');
    }

    const [approvalsList, recentApprovals] = await Promise.all([
      this.approvalService.listPendingForApprover({ tenantId, actorUserId, actorRole }),
      this.repository.getDeputyApprovalHistory(tenantId, actorUserId, actorRole),
    ]);
    const urgentApprovals = approvalsList.filter((approval) =>
      ['urgent', 'critical', 'high'].includes(String(approval.priority ?? '').toLowerCase()),
    ).length;

    return {
      metrics: {
        pending_approvals: approvalsList.length,
        urgent_approvals: urgentApprovals,
      },
      approvalsList,
      recentApprovals,
    };
  }

  async actionApproval(idValue: string, dto: Record<string, unknown>) {
    if (!this.approvalService) {
      throw new ServiceUnavailableException('The governed approval workflow is not available');
    }
    const approvalId = stringOrUndefined(idValue);
    if (!approvalId) {
      throw new BadRequestException('Approval ID is required');
    }
    const action = String(dto.action ?? '').trim().toLowerCase();
    if (action !== 'approve' && action !== 'reject') {
      throw new BadRequestException('Approval action must be approve or reject');
    }
    const noteValue = dto.comment ?? dto.reason;
    const note = typeof noteValue === 'string' ? noteValue.trim() : '';
    if (action === 'reject' && !note) {
      throw new BadRequestException('A rejection reason is required');
    }

    const store = this.requestContext.requireStore();
    const actorUserId = stringOrUndefined(store?.user_id);
    const actorRole = stringOrUndefined(store?.role);
    if (!actorUserId || !actorRole) {
      throw new UnauthorizedException('An authenticated Deputy Principal role is required to decide approvals');
    }
    const approval = await this.approvalService.decideRequest({
      tenantId: this.requireTenantId(),
      approvalId,
      actorUserId,
      actorRole,
      requestId: store.request_id,
      decision: action === 'approve' ? 'APPROVED' : 'REJECTED',
      note: note || null,
    });

    return {
      success: true,
      message: `Approval ${action === 'approve' ? 'approved' : 'rejected'}`,
      approval,
    };
  }
  
  getCommunication() { return this.repository.getCommunication(this.requireTenantId()); }
  getReports() { return this.repository.getReports(this.requireTenantId()); }
  downloadReportArtifact(idValue: string) {
    const reportId = stringOrUndefined(idValue);
    if (!reportId) {
      throw new BadRequestException('Report ID is required');
    }
    const actorUserId = stringOrUndefined(this.requestContext.requireStore()?.user_id);
    if (!actorUserId) {
      throw new UnauthorizedException('An authenticated Deputy Principal is required to download reports');
    }
    return this.repository.downloadReportArtifact(this.requireTenantId(), reportId, actorUserId);
  }
  async generateReport(dto: any) {
    const approvals = await this.getApprovals();
    return this.repository.generateReport(
      this.requireTenantId(),
      dto.name,
      dto.format,
      this.requestContext.getStore()?.user_id || null,
      approvals,
    );
  }
  
  getStaff() { return this.repository.getStaff(this.requireTenantId()); }
  async assignRole(dto: AssignDeputyStaffRoleDto) {
    if (stringOrUndefined(dto.roleId) || stringOrUndefined(dto.role_id)) {
      throw new ForbiddenException(
        'Deputy role delegation requires a governed school role code; opaque role IDs are not accepted.',
      );
    }

    const staffLookup = stringOrUndefined(
      dto.staffId ?? dto.staff_id ?? dto.userId ?? dto.user_id ?? dto.name,
    );
    if (!staffLookup) {
      throw new BadRequestException('Staff is required before assigning a role.');
    }

    const actorUserId = stringOrUndefined(this.requestContext.getStore()?.user_id);
    if (!actorUserId) {
      throw new UnauthorizedException('Authenticated staff context is required');
    }
    if (staffLookup.toLowerCase() === actorUserId.toLowerCase()) {
      throw new ForbiddenException('Deputy Principals cannot assign additional roles to themselves.');
    }

    const roleLookup = stringOrUndefined(dto.roleCode ?? dto.role_code ?? dto.role);
    const roleCode = roleLookup ? normalizeDeputyDelegatedRole(roleLookup) : null;
    if (!roleCode || !DEPUTY_DELEGATABLE_ROLE_CODES.has(roleCode)) {
      throw new ForbiddenException(
        'Deputy Principals can only delegate approved lower-privilege school staff roles.',
      );
    }

    return this.repository.assignRole(this.requireTenantId(), {
      staffId: staffLookup,
      roleCode,
      department: dto.department,
      assignedByUserId: actorUserId,
    });
  }
}

function stringOrUndefined(value: unknown): string | undefined {
  const normalized = typeof value === 'string' ? value.trim() : '';
  return normalized || undefined;
}

function objectOrUndefined(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined;
}

function normalizeDeputyDelegatedRole(value: string): string {
  const normalized = value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  return DEPUTY_ROLE_ALIASES[normalized] ?? normalized;
}
