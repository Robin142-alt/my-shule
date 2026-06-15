import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { RequestContextService } from '../../common/request-context/request-context.service';
import { AdmissionsCommandRepository } from './repositories/admissions-command.repository';

@Injectable()
export class AdmissionsCommandService {
  private readonly logger = new Logger(AdmissionsCommandService.name);

  constructor(
    private readonly requestContext: RequestContextService,
    private readonly admissionsRepository: AdmissionsCommandRepository
  ) {}

  private requireTenantId(): string {
    const tenantId = this.requestContext.getStore()?.tenant_id;
    if (!tenantId) {
      throw new UnauthorizedException('Tenant context is required');
    }
    return tenantId;
  }

  async getOverview() { return this.admissionsRepository.getOverview(this.requireTenantId()); }
  async getEnquiries() { return this.admissionsRepository.getEnquiries(this.requireTenantId()); }
  async getApplications() { return this.admissionsRepository.getApplications(this.requireTenantId()); }
  async getApplicantProfiles() { return this.admissionsRepository.getApplicantProfiles(this.requireTenantId()); }
  async getDocuments() { return this.admissionsRepository.getDocuments(this.requireTenantId()); }
  async getInterviews() { return this.admissionsRepository.getInterviews(this.requireTenantId()); }
  async getSelection() { return this.admissionsRepository.getSelection(this.requireTenantId()); }
  async getFeeClearance() { return this.admissionsRepository.getFeeClearance(this.requireTenantId()); }
  async getEnrolment() { return this.admissionsRepository.getEnrolment(this.requireTenantId()); }
  async getClassPlacement() { return this.admissionsRepository.getClassPlacement(this.requireTenantId()); }
  async getParents() { return this.admissionsRepository.getParents(this.requireTenantId()); }
  async getTransfers() { return this.admissionsRepository.getTransfers(this.requireTenantId()); }
  async getCommunication() { return this.admissionsRepository.getCommunication(this.requireTenantId()); }
  async getAppointments() { return this.admissionsRepository.getAppointments(this.requireTenantId()); }
  async getImports() { return this.admissionsRepository.getImports(this.requireTenantId()); }
  async getReports() { return this.admissionsRepository.getReports(this.requireTenantId()); }
  async getTasks() { return this.admissionsRepository.getTasks(this.requireTenantId()); }
  async getTemplates() { return this.admissionsRepository.getTemplates(this.requireTenantId()); }

  async approveApplication(id: string) {
    const tenantId = this.requireTenantId();
    const userId = this.requestContext.getStore()?.user_id;
    if (!userId) {
      throw new UnauthorizedException('User context is required');
    }
    this.logger.log(`Approving admission application ${id} for tenant ${tenantId}`);
    return this.admissionsRepository.approveApplication(tenantId, id, userId);
  }

}
