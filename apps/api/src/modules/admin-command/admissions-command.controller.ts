import { Body, Controller, Get, Post, Param } from '@nestjs/common';
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

  @Post('class-placement')
  @Permissions('admissions:write')
  assignClassPlacement(@Body() body: any) { return this.admissionsService.assignClassPlacement(body); }

  @Get('parents')
  @Permissions('admissions:read')
  getParents() { return this.admissionsService.getParents(); }

  @Get('parent-linking')
  @Permissions('admissions:read')
  getParentLinking() { return this.admissionsService.getParents(); }

  @Post('parent-linking')
  @Permissions('admissions:write')
  linkParent(@Body() body: any) { return this.admissionsService.linkParent(body); }

  @Post('parent-linking/:id/invite')
  @Permissions('admissions:write')
  sendParentInvitation(@Param('id') id: string) { return this.admissionsService.sendParentInvitation(id); }

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

  @Post('reports/generate')
  @Permissions('admissions:read')
  generateReport(@Body() body: any) { return this.admissionsService.generateReport(body); }

  @Get('tasks')
  @Permissions('admissions:read')
  getTasks() { return this.admissionsService.getTasks(); }

  @Get('templates')
  @Permissions('admissions:read')
  getTemplates() { return this.admissionsService.getTemplates(); }
  @Get('dashboard')
  @Permissions('admissions:read')
  async getDashboard() {
    const [
      overview,
      enquiries,
      applications,
      applicantProfiles,
      documents,
      interviews,
      selection,
      feeClearance,
      enrolment,
      classPlacement,
      parents,
      transfers,
      communication,
      appointments,
      imports,
      reports,
      tasks,
      templates
    ] = await Promise.all([
      this.admissionsService.getOverview(),
      this.admissionsService.getEnquiries(),
      this.admissionsService.getApplications(),
      this.admissionsService.getApplicantProfiles(),
      this.admissionsService.getDocuments(),
      this.admissionsService.getInterviews(),
      this.admissionsService.getSelection(),
      this.admissionsService.getFeeClearance(),
      this.admissionsService.getEnrolment(),
      this.admissionsService.getClassPlacement(),
      this.admissionsService.getParents(),
      this.admissionsService.getTransfers(),
      this.admissionsService.getCommunication(),
      this.admissionsService.getAppointments(),
      this.admissionsService.getImports(),
      this.admissionsService.getReports(),
      this.admissionsService.getTasks(),
      this.admissionsService.getTemplates(),
    ]);

    return {
      overview,
      enquiries,
      applications,
      applicantProfiles,
      documents,
      interviews,
      selection,
      feeClearance,
      enrolment,
      classPlacement,
      parents,
      transfers,
      communication,
      appointments,
      imports,
      reports,
      tasks,
      templates,
    };
  }

  @Post('applications/:id/approve')
  @Permissions('admissions:write')
  approveApplication(@Param('id') id: string) {
    return this.admissionsService.approveApplication(id);
  }

  @Post('applications')
  @Permissions('admissions:write')
  createApplication(@Body() body: any) {
    return this.admissionsService.createApplication(body);
  }

  @Post('applications/:id/status')
  @Permissions('admissions:write')
  updateApplicationStatus(@Param('id') id: string, @Body() body: any) {
    return this.admissionsService.updateApplicationStatus(id, body);
  }

  @Post('interviews')
  @Permissions('admissions:write')
  scheduleInterview(@Body() body: any) {
    return this.admissionsService.scheduleInterview(body);
  }

  @Post('interviews/:id/outcome')
  @Permissions('admissions:write')
  recordInterviewOutcome(@Param('id') id: string, @Body() body: any) {
    return this.admissionsService.recordInterviewOutcome(id, body);
  }

  @Post('documents/:id/verify')
  @Permissions('documents:write')
  verifyDocument(@Param('id') id: string) {
    return this.admissionsService.verifyDocument(id);
  }

  @Post('documents/request')
  @Permissions('documents:write')
  requestDocument(@Body() body: any) {
    return this.admissionsService.requestDocument(body);
  }

  @Get('admissions')
  @Permissions('admissions:read')
  getAdmissionsList() { return this.admissionsService.getAdmissionsList(); }

  @Post('admissions/:id/admit')
  @Permissions('admissions:write')
  admitStudent(@Param('id') id: string) {
    return this.admissionsService.admitStudent(id);
  }

  @Post('admissions/:id/letter')
  @Permissions('admissions:read')
  generateAdmissionLetter(@Param('id') id: string) {
    return this.admissionsService.generateReport({
      reportId: `admission-letter-${id}`,
      title: 'Admission letter',
      format: 'pdf',
      filters: { application_id: id },
    });
  }

  @Post('actions')
  @Permissions('admissions:write')
  recordAction(@Body() body: any) {
    return this.admissionsService.recordAction(body);
  }

}
