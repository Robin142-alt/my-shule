import { Controller, Get } from '@nestjs/common';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import { AdmissionsCommandService } from './admissions-command.service';

@Controller('admin-command/admissions')
export class AdmissionsCommandController {
  constructor(private readonly admissionsService: AdmissionsCommandService) {}

  @Get('overview')
  @Permissions('admissions:read')
  getOverview() { return this.admissionsService.getOverview(); }

  @Get('enquiries')
  @Permissions('admissions:read')
  getEnquiries() { return this.admissionsService.getEnquiries(); }

  @Get('applications')
  @Permissions('admissions:read')
  getApplications() { return this.admissionsService.getApplications(); }

  @Get('applicant-profiles')
  @Permissions('admissions:read')
  getApplicantProfiles() { return this.admissionsService.getApplicantProfiles(); }

  @Get('documents')
  @Permissions('admissions:read')
  getDocuments() { return this.admissionsService.getDocuments(); }

  @Get('interviews')
  @Permissions('admissions:read')
  getInterviews() { return this.admissionsService.getInterviews(); }

  @Get('selection')
  @Permissions('admissions:read')
  getSelection() { return this.admissionsService.getSelection(); }

  @Get('fee-clearance')
  @Permissions('admissions:read')
  getFeeClearance() { return this.admissionsService.getFeeClearance(); }

  @Get('enrolment')
  @Permissions('admissions:read')
  getEnrolment() { return this.admissionsService.getEnrolment(); }

  @Get('class-placement')
  @Permissions('admissions:read')
  getClassPlacement() { return this.admissionsService.getClassPlacement(); }

  @Get('parents')
  @Permissions('admissions:read')
  getParents() { return this.admissionsService.getParents(); }

  @Get('transfers')
  @Permissions('admissions:read')
  getTransfers() { return this.admissionsService.getTransfers(); }

  @Get('communication')
  @Permissions('admissions:read')
  getCommunication() { return this.admissionsService.getCommunication(); }

  @Get('appointments')
  @Permissions('admissions:read')
  getAppointments() { return this.admissionsService.getAppointments(); }

  @Get('imports')
  @Permissions('admissions:read')
  getImports() { return this.admissionsService.getImports(); }

  @Get('reports')
  @Permissions('admissions:read')
  getReports() { return this.admissionsService.getReports(); }

  @Get('tasks')
  @Permissions('admissions:read')
  getTasks() { return this.admissionsService.getTasks(); }

  @Get('templates')
  @Permissions('admissions:read')
  getTemplates() { return this.admissionsService.getTemplates(); }
}
