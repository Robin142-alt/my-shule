import { Injectable, UnauthorizedException } from '@nestjs/common';
import { RequestContextService } from '../../common/request-context/request-context.service';
import { DeputyCommandRepository } from './repositories/deputy-command.repository';

@Injectable()
export class DeputyCommandService {
  constructor(
    private readonly requestContext: RequestContextService,
    private readonly repository: DeputyCommandRepository,
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
  getAttendance() { return this.repository.getAttendance(this.requireTenantId()); }
  notifyParent(attendanceId: string) { return this.repository.notifyParent(this.requireTenantId(), attendanceId); }
  createFollowUpList(dto: any) { return this.repository.createFollowUpList(this.requireTenantId(), this.requestContext.getStore()?.user_id || 'system', dto); }
  getDiscipline() { return this.repository.getDiscipline(this.requireTenantId()); }
  createDisciplineIncident(dto: any) { return this.repository.createDisciplineIncident(this.requireTenantId(), this.requestContext.getStore()?.user_id || 'system', dto); }
  escalateDisciplineIncident(id: string) { return this.repository.escalateDisciplineIncident(this.requireTenantId(), id); }
  getWelfare() { return this.repository.getWelfare(this.requireTenantId()); }
  createWelfareCase(dto: any) { return this.repository.createWelfareCase(this.requireTenantId(), this.requestContext.getStore()?.user_id || 'system', dto); }
  openWelfareCase(id: string) { return this.repository.openWelfareCase(this.requireTenantId(), id); }
  getStaffDuty() { return this.repository.getStaffDuty(this.requireTenantId()); }
  requestDutyReport(id: string) { return this.repository.requestDutyReport(this.requireTenantId(), id); }
  manageDutyRoster(dto: any) { return this.repository.manageDutyRoster(this.requireTenantId(), this.requestContext.getStore()?.user_id || 'system', dto); }
  
  getTeaching() { return this.repository.getTeaching(this.requireTenantId()); }
  markTeachingAttendance(id: string) { return this.repository.markTeachingAttendance(this.requireTenantId(), id); }
  logTeachingLesson(id: string) { return this.repository.logTeachingLesson(this.requireTenantId(), id); }
  
  getTimetable() { return this.repository.getTimetable(this.requireTenantId()); }
  assignReliefTeacher(id: string, teacherName: string) { return this.repository.assignReliefTeacher(this.requireTenantId(), id, teacherName); }
  autoAssignRelief() { return this.repository.autoAssignRelief(this.requireTenantId()); }
  
  getAcademics() { return this.repository.getAcademics(this.requireTenantId()); }
  messageHOD(id: string) { return this.repository.messageHOD(this.requireTenantId(), id); }
  createIntervention(dto: any) { return this.repository.createIntervention(this.requireTenantId(), this.requestContext.getStore()?.user_id || 'system', dto); }
  
  getExams() { return this.repository.getExams(this.requireTenantId()); }
  flagExamDelay(id: string) { return this.repository.flagExamDelay(this.requireTenantId(), id); }
  
  getClasses() { return this.repository.getClasses(this.requireTenantId()); }
  manageStreams(dto: any) { return this.repository.manageStreams(this.requireTenantId(), this.requestContext.getStore()?.user_id || 'system', dto); }
  
  getApprovals() { return this.repository.getApprovals(this.requireTenantId()); }
  actionApproval(id: string, action: string) { return this.repository.actionApproval(this.requireTenantId(), id, action); }
  
  getCommunication() { return this.repository.getCommunication(this.requireTenantId()); }
  getReports() { return this.repository.getReports(this.requireTenantId()); }
  generateReport(dto: any) { return this.repository.generateReport(this.requireTenantId(), dto.name, dto.format); }
  
  getStaff() { return this.repository.getStaff(this.requireTenantId()); }
  assignRole(dto: any) { return this.repository.assignRole(this.requireTenantId(), dto); }
}
