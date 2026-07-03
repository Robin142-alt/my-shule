import { Injectable, Logger, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { RequestContextService } from '../../common/request-context/request-context.service';
import { AdminCommandOperationsService } from './admin-command-operations.service';
import { AdmissionsCommandRepository } from './repositories/admissions-command.repository';

@Injectable()
export class AdmissionsCommandService {
  private readonly logger = new Logger(AdmissionsCommandService.name);

  constructor(
    private readonly requestContext: RequestContextService,
    private readonly operations: AdminCommandOperationsService,
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
  async getAdmissionsList() { return this.admissionsRepository.getAdmissionsList(this.requireTenantId()); }

  async createApplication(body: any) {
    const tenantId = this.requireTenantId();
    const application = await this.admissionsRepository.createApplication(tenantId, body);
    await this.operations.recordAudit(tenantId, 'admissions.application.created', 'admission_application', application?.id ?? null, {
      application_number: application?.application_number,
      class_applying: application?.class_applying,
    }, this.getUserIdOrNull());
    await this.operations.notifyRoles(tenantId, {
      key: `admission-application-${application?.id}`,
      type: 'admissions.application.created',
      title: 'New admission application',
      body: `${application?.full_name} applied for ${application?.class_applying}.`,
      targetRoles: ['admissions_officer', 'principal', 'secretary'],
      metadata: { application_id: application?.id },
    });
    return application;
  }

  async updateApplicationStatus(id: string, body: any) {
    const tenantId = this.requireTenantId();
    const status = typeof body === 'string' ? body : body?.status;
    const application = await this.admissionsRepository.updateApplicationStatus(tenantId, id, status, body?.notes ?? body?.review_notes);
    if (!application) {
      throw new NotFoundException('Admission application was not found for this school');
    }
    await this.operations.recordAudit(tenantId, 'admissions.application.status_updated', 'admission_application', id, {
      status: application.status,
    }, this.getUserIdOrNull());
    return application;
  }

  async scheduleInterview(body: any) {
    const tenantId = this.requireTenantId();
    const interview = await this.admissionsRepository.scheduleInterview(tenantId, body);
    await this.operations.recordAudit(tenantId, 'admissions.interview.scheduled', 'admission_interview', interview?.id ?? null, {
      application_id: interview?.application_id,
      interview_date: interview?.interview_date,
    }, this.getUserIdOrNull());
    await this.operations.notifyRoles(tenantId, {
      key: `admission-interview-${interview?.id}`,
      type: 'admissions.interview.scheduled',
      title: 'Admission interview scheduled',
      body: `An admission interview has been scheduled for ${interview?.interview_date}.`,
      targetRoles: ['admissions_officer', 'principal'],
      metadata: { interview_id: interview?.id, application_id: interview?.application_id },
    });
    return interview;
  }

  async recordInterviewOutcome(id: string, body: any) {
    const tenantId = this.requireTenantId();
    const interview = await this.admissionsRepository.recordInterviewOutcome(tenantId, id, body);
    if (!interview) {
      throw new NotFoundException('Admission interview was not found for this school');
    }
    await this.operations.recordAudit(tenantId, 'admissions.interview.outcome_recorded', 'admission_interview', id, {
      recommendation: interview.recommendation,
    }, this.getUserIdOrNull());
    return interview;
  }

  async verifyDocument(id: string) {
    const tenantId = this.requireTenantId();
    const document = await this.admissionsRepository.verifyDocument(tenantId, id, this.getUserIdOrNull());
    if (!document) {
      throw new NotFoundException('Admission document was not found for this school');
    }
    await this.operations.recordAudit(tenantId, 'admissions.document.verified', 'admission_document', id, {
      document_type: document.document_type,
    }, this.getUserIdOrNull());
    return document;
  }

  async requestDocument(body: any) {
    const tenantId = this.requireTenantId();
    const task = await this.admissionsRepository.requestDocument(tenantId, body);
    await this.operations.recordAudit(tenantId, 'admissions.document.requested', 'admission_task', task?.id ?? null, {
      application_id: task?.application_id,
      task_title: task?.task_title,
    }, this.getUserIdOrNull());
    await this.operations.notifyRoles(tenantId, {
      key: `admission-document-request-${task?.id}`,
      type: 'admissions.document.requested',
      title: 'Admission document requested',
      body: task?.task_description ?? 'Admissions requested a missing applicant document.',
      targetRoles: ['admissions_officer', 'secretary'],
      metadata: { task_id: task?.id, application_id: task?.application_id },
    });
    return task;
  }

  async assignClassPlacement(body: any) {
    const tenantId = this.requireTenantId();
    const placement = await this.admissionsRepository.assignClassPlacement(tenantId, body);
    if (!placement) {
      throw new NotFoundException('Student was not found for this school');
    }
    await this.operations.recordAudit(tenantId, 'admissions.class_placement.assigned', 'student_allocation', placement.id, {
      student_id: placement.student_id,
      class_name: placement.class_name,
      stream_name: placement.stream_name,
    }, this.getUserIdOrNull());
    return placement;
  }

  async linkParent(body: any) {
    const tenantId = this.requireTenantId();
    const link = await this.admissionsRepository.linkParent(tenantId, body);
    if (!link) {
      throw new NotFoundException('Student was not found for this school');
    }
    await this.operations.recordAudit(tenantId, 'admissions.parent.linked', 'student_guardian', link.id, {
      student_id: link.student_id,
      email: link.email,
      status: link.status,
    }, this.getUserIdOrNull());
    return link;
  }

  async sendParentInvitation(id: string) {
    const tenantId = this.requireTenantId();
    const link = await this.admissionsRepository.sendParentInvitation(tenantId, id);
    if (!link) {
      throw new NotFoundException('Parent link was not found for this school');
    }
    await this.operations.recordAudit(tenantId, 'admissions.parent.invited', 'student_guardian', id, {
      student_id: link.student_id,
      email: link.email,
    }, this.getUserIdOrNull());
    return link;
  }

  async generateReport(body: any) {
    const tenantId = this.requireTenantId();
    const [applications, documents, interviews, placements, parentLinks] = await Promise.all([
      this.admissionsRepository.getApplications(tenantId),
      this.admissionsRepository.getDocuments(tenantId),
      this.admissionsRepository.getInterviews(tenantId),
      this.admissionsRepository.getClassPlacement(tenantId),
      this.admissionsRepository.getParents(tenantId),
    ]);
    return this.operations.generateReportSnapshot({
      tenantId,
      module: 'admissions',
      reportId: body?.reportId ?? body?.type ?? 'admissions-readiness',
      title: body?.title ?? 'Admissions readiness report',
      format: body?.format ?? 'pdf',
      generatedByUserId: this.getUserIdOrNull(),
      filters: body?.filters ?? {},
      targetRoles: ['admissions_officer', 'principal'],
      sections: {
        applications,
        documents,
        interviews,
        placements,
        parentLinks,
      },
    });
  }

  async approveApplication(id: string) {
    const tenantId = this.requireTenantId();
    const userId = this.requestContext.getStore()?.user_id;
    if (!userId) {
      throw new UnauthorizedException('User context is required');
    }
    this.logger.log(`Approving admission application ${id} for tenant ${tenantId}`);
    return this.admissionsRepository.approveApplication(tenantId, id, userId);
  }

  async recordAction(body: any) {
    const tenantId = this.requireTenantId();
    const action = String(body?.action || 'workflow_action')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '') || 'workflow_action';
    const title = String(body?.title || `Admissions ${action.replace(/_/g, ' ')}`).trim();
    const message = String(body?.description || body?.message || title).trim();
    return this.operations.recordWorkflowAction({
      tenantId,
      actorUserId: this.getUserIdOrNull(),
      sourceRole: 'admissions_officer',
      targetRoles: ['admissions_officer', 'secretary', 'principal', 'accountant', 'class_teacher'],
      eventType: `admissions.${action}`,
      entityType: String(body?.entityType || 'admissions_workflow'),
      entityId: body?.entityId ?? body?.entity_id ?? null,
      title,
      message,
      priority: body?.priority === 'high' || body?.priority === 'urgent' ? 'high' : 'normal',
      payload: {
        ...body,
        action,
        source_dashboard: 'registrar-command-center',
      },
    });
  }

  private getUserIdOrNull(): string | null {
    return this.requestContext.getStore()?.user_id ?? null;
  }

}
