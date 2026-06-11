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
  getAttendance() { return this.repository.getAttendance(this.requireTenantId()); }
  getDiscipline() { return this.repository.getDiscipline(this.requireTenantId()); }
  getWelfare() { return this.repository.getWelfare(this.requireTenantId()); }
  getStaffDuty() { return this.repository.getStaffDuty(this.requireTenantId()); }
  getTimetable() { return this.repository.getTimetable(this.requireTenantId()); }
  getAcademics() { return this.repository.getAcademics(this.requireTenantId()); }
  getExams() { return this.repository.getExams(this.requireTenantId()); }
  getClasses() { return this.repository.getClasses(this.requireTenantId()); }
  getApprovals() { return this.repository.getApprovals(this.requireTenantId()); }
  getCommunication() { return this.repository.getCommunication(this.requireTenantId()); }
  getReports() { return this.repository.getReports(this.requireTenantId()); }
  getStaff() { return this.repository.getStaff(this.requireTenantId()); }
}
