import { Body, Controller, Get, Post, Sse, StreamableFile, UploadedFile, UseInterceptors, Param, Patch, Delete, Query } from '@nestjs/common';
import { SkipResponseEnvelope } from '../../common/decorators/skip-response-envelope.decorator';
import { StreamingUploadInterceptor } from '../../common/uploads/streaming-upload.interceptor';
import { UploadFileMetadata } from '../../common/uploads/upload-policy';

import { Permissions } from '../../auth/decorators/permissions.decorator';
import { RequiresModule } from '../module-access/module-access.decorator';
import {
  CreateAdminIncidentDto,
  CreateAnnouncementDto,
  CreateMeetingMinutesDto,
} from './dto/admin-command.dto';
import { UpdatePrincipalSchoolProfileDto } from './dto/update-principal-school-profile.dto';
import { AdminCommandService } from './admin-command.service';

@Controller('admin-command')
@RequiresModule('admin_command_centers')
export class AdminCommandController {
  constructor(private readonly adminCommandService: AdminCommandService) {}

  @Get('principal/dashboard')
  @RequiresModule('admin_command_centers', 'principal_dashboard')
  @Permissions('principal:read')
  getPrincipalDashboard() {
    return this.adminCommandService.getPrincipalDashboard();
  }

  @Sse('principal/dashboard/stream')
  @RequiresModule('admin_command_centers', 'principal_dashboard')
  @Permissions('principal:read')
  streamPrincipalDashboard() {
    return this.adminCommandService.streamPrincipalDashboard();
  }

  @Get('principal/finance-overview')
  @RequiresModule('admin_command_centers', 'principal_dashboard')
  @Permissions('principal:read', 'finance:read')
  getPrincipalFinanceOverview() {
    return this.adminCommandService.getPrincipalFinanceOverview();
  }

  @Get('principal/students')
  @RequiresModule('admin_command_centers', 'principal_dashboard')
  @Permissions('principal:read', 'students:read')
  getPrincipalStudents() {
    return this.adminCommandService.getPrincipalStudentsOverview();
  }

  @Get('principal/discipline')
  @RequiresModule('admin_command_centers', 'principal_dashboard')
  @Permissions('principal:read', 'discipline:read')
  getPrincipalDiscipline() {
    return this.adminCommandService.getPrincipalDisciplineOverview();
  }

  @Get('principal/attendance')
  @RequiresModule('admin_command_centers', 'principal_dashboard')
  @Permissions('principal:read')
  getPrincipalAttendance() {
    return this.adminCommandService.getPrincipalAttendanceOverview();
  }

  @Get('principal/attendance-monitoring')
  @RequiresModule('admin_command_centers', 'principal_dashboard')
  @Permissions('principal:read')
  getPrincipalAttendanceMonitoring() {
    return this.adminCommandService.getPrincipalAttendanceOverview();
  }

  @Get('principal/academics')
  @RequiresModule('admin_command_centers', 'principal_dashboard')
  @Permissions('principal:read', 'academics:read')
  getPrincipalAcademics() {
    return this.adminCommandService.getPrincipalAcademicsOverview();
  }

  @Get('principal/exams')
  @RequiresModule('admin_command_centers', 'principal_dashboard')
  @Permissions('principal:read', 'exams:read')
  getPrincipalExams() {
    return this.adminCommandService.getPrincipalExamsOverview();
  }

  @Get('principal/exams-report-cards')
  @RequiresModule('admin_command_centers', 'principal_dashboard')
  @Permissions('principal:read', 'exams:read')
  getPrincipalExamsReportCards() {
    return this.adminCommandService.getPrincipalExamsOverview();
  }

  @Get('principal/communication')
  @RequiresModule('admin_command_centers', 'principal_dashboard')
  @Permissions('principal:read', 'school_sms:read')
  getPrincipalCommunication() {
    return this.adminCommandService.getPrincipalCommunicationOverview();
  }

  @Get('principal/classes')
  @RequiresModule('admin_command_centers', 'principal_dashboard')
  @Permissions('principal:read', 'academics:read')
  getPrincipalClasses() {
    return this.adminCommandService.getPrincipalClassesOverview();
  }

  @Get('principal/classes-streams')
  @RequiresModule('admin_command_centers', 'principal_dashboard')
  @Permissions('principal:read', 'academics:read')
  getPrincipalClassesStreams() {
    return this.adminCommandService.getPrincipalClassesOverview();
  }

  @Get('principal/subjects')
  @RequiresModule('admin_command_centers', 'principal_dashboard')
  @Permissions('principal:read', 'academics:read')
  getPrincipalSubjects() {
    return this.adminCommandService.getPrincipalSubjectsOverview();
  }

  @Get('principal/subjects-departments')
  @RequiresModule('admin_command_centers', 'principal_dashboard')
  @Permissions('principal:read', 'academics:read')
  getPrincipalSubjectsDepartments() {
    return this.adminCommandService.getPrincipalSubjectsOverview();
  }

  @Get('principal/staff')
  @RequiresModule('admin_command_centers', 'principal_dashboard')
  @Permissions('principal:read', 'hr:read')
  getPrincipalStaff() {
    return this.adminCommandService.getPrincipalStaffOverview();
  }

  @Get('principal/staff-roles')
  @RequiresModule('admin_command_centers', 'principal_dashboard')
  @Permissions('principal:read', 'hr:read')
  getPrincipalStaffRoles() {
    return this.adminCommandService.getPrincipalStaffOverview();
  }

  @Get('principal/overview')
  @RequiresModule('admin_command_centers', 'principal_dashboard')
  @Permissions('principal:read')
  getPrincipalOverview() {
    return this.adminCommandService.getPrincipalOverview();
  }

  @Get('principal/visitors')
  @RequiresModule('admin_command_centers', 'principal_dashboard')
  @Permissions('principal:read')
  getPrincipalVisitorsOverview() {
    return this.adminCommandService.getPrincipalVisitorsOverview();
  }

  @Get('principal/health')
  @RequiresModule('admin_command_centers', 'principal_dashboard')
  @Permissions('principal:read', 'clinic:reports')
  getPrincipalHealthOverview() {
    return this.adminCommandService.getPrincipalHealthOverview();
  }

  @Get('principal/audit-logs')
  @RequiresModule('admin_command_centers', 'principal_dashboard')
  @Permissions('principal:read')
  getPrincipalAuditOverview() {
    return this.adminCommandService.getPrincipalAuditOverview();
  }

  @Get('principal/school-profile')
  @RequiresModule('admin_command_centers', 'principal_dashboard')
  @Permissions('principal:read')
  getSchoolProfile() {
    return this.adminCommandService.getSchoolProfile();
  }

  @Get('principal/approvals')
  @RequiresModule('admin_command_centers', 'principal_dashboard')
  @Permissions('principal:read')
  getApprovalsOverview() {
    return this.adminCommandService.getApprovalsOverview();
  }

  @Get('principal/reports')
  @RequiresModule('admin_command_centers', 'principal_dashboard')
  @Permissions('principal:read', 'reports:read')
  getPrincipalReportsOverview() {
    return this.adminCommandService.getPrincipalReportsOverview();
  }

  @Post('global-search')
  @Permissions('principal:read')
  async globalSearch(@Query('q') query: string) {
    return this.adminCommandService.globalSearch(query);
  }

  @Post('bulk-import-:type')
  @Permissions('principal:write')
  @UseInterceptors(StreamingUploadInterceptor('file'))
  async bulkImport(
    @Param('type') type: string,
    @UploadedFile() file: any,
  ) {
    return this.adminCommandService.bulkImport(type, file);
  }

  @Get('principal/setup-checklist')
  @RequiresModule('admin_command_centers', 'principal_dashboard')
  @Permissions('principal:read')
  getSetupChecklist() {
    return this.adminCommandService.getSetupChecklist();
  }

  @Get('principal/academic-setup')
  @RequiresModule('admin_command_centers', 'principal_dashboard')
  @Permissions('principal:read')
  getAcademicSetupOverview() {
    return this.adminCommandService.getAcademicSetupOverview();
  }

  @Get('principal/settings')
  @RequiresModule('admin_command_centers', 'principal_dashboard')
  @Permissions('principal:read')
  getPrincipalSettings() {
    return this.adminCommandService.getPrincipalSettings();
  }

  @Patch('principal/settings/preferences')
  @RequiresModule('admin_command_centers', 'principal_dashboard')
  @Permissions('principal:write')
  updatePrincipalSettings(@Body() dto: {
    notifications: { emailAlerts: boolean; smsAlerts: boolean; dailyDigest: boolean };
    dashboard: { theme: string; defaultView: string };
  }) {
    return this.adminCommandService.updatePrincipalSettings(dto);
  }

  @Post('principal/settings/action')
  @RequiresModule('admin_command_centers', 'principal_dashboard')
  @Permissions('principal:write')
  recordPrincipalSettingsAction(@Body() dto: any) {
    const action = String(dto?.action || 'settings_action');
    return this.adminCommandService.recordPrincipalWorkflowAction({
      action: `principal.settings_${action}`,
      entityType: 'principal_settings',
      title: String(dto?.title || 'Principal settings action'),
      message: String(dto?.message || 'Principal requested a settings change.'),
      payload: dto,
      targetRoles: ['principal', 'system_monitor'],
      status: 'submitted',
    });
  }

  @Get('principal/teaching')
  @RequiresModule('admin_command_centers', 'principal_dashboard')
  @Permissions('principal:read')
  getPrincipalTeachingSchedule() {
    return this.adminCommandService.getPrincipalTeachingSchedule();
  }

  @Post('principal/school-profile')
  @RequiresModule('admin_command_centers', 'principal_dashboard')
  @Permissions('principal:write')
  updatePrincipalSchoolProfile(@Body() dto: UpdatePrincipalSchoolProfileDto) {
    return this.adminCommandService.updatePrincipalSchoolProfile(dto);
  }

  @Post('principal/academic-setup/year')
  @RequiresModule('admin_command_centers', 'principal_dashboard')
  @Permissions('principal:write', 'academics:write')
  createPrincipalAcademicYear(@Body() dto: any) {
    return this.adminCommandService.recordPrincipalWorkflowAction({
      action: 'principal.academic_year_create_requested',
      entityType: 'academic_year',
      title: 'Academic year create requested',
      message: String(dto?.name || 'Principal requested a new academic year.'),
      payload: dto,
      status: 'submitted',
    });
  }

  @Post('principal/academic-setup/term')
  @RequiresModule('admin_command_centers', 'principal_dashboard')
  @Permissions('principal:write', 'academics:write')
  createPrincipalTerm(@Body() dto: any) {
    return this.adminCommandService.recordPrincipalWorkflowAction({
      action: 'principal.academic_term_create_requested',
      entityType: 'academic_term',
      title: 'Academic term create requested',
      message: String(dto?.name || 'Principal requested a new academic term.'),
      payload: dto,
      status: 'submitted',
    });
  }

  @Post('principal/classes-streams')
  @RequiresModule('admin_command_centers', 'principal_dashboard')
  @Permissions('principal:write', 'academics:write')
  createPrincipalClass(@Body() dto: any) {
    return this.adminCommandService.recordPrincipalWorkflowAction({
      action: 'principal.class_create_requested',
      entityType: 'class',
      title: 'Class create requested',
      message: String(dto?.name || dto?.class_name || 'Principal requested a new class.'),
      payload: dto,
      status: 'submitted',
    });
  }

  @Post('principal/classes-streams/:classId/streams')
  @RequiresModule('admin_command_centers', 'principal_dashboard')
  @Permissions('principal:write', 'academics:write')
  createPrincipalStream(@Param('classId') classId: string, @Body() dto: any) {
    return this.adminCommandService.recordPrincipalWorkflowAction({
      action: 'principal.stream_create_requested',
      entityType: 'class_stream',
      entityId: classId,
      title: 'Stream create requested',
      message: String(dto?.name || dto?.stream_name || `Principal requested a stream for class ${classId}.`),
      payload: { ...dto, classId },
      status: 'submitted',
    });
  }

  @Post('principal/subjects-departments/subject')
  @RequiresModule('admin_command_centers', 'principal_dashboard')
  @Permissions('principal:write', 'academics:write')
  createPrincipalSubject(@Body() dto: any) {
    return this.adminCommandService.recordPrincipalWorkflowAction({
      action: 'principal.subject_create_requested',
      entityType: 'subject',
      title: 'Subject create requested',
      message: String(dto?.name || dto?.subject_name || 'Principal requested a new subject.'),
      payload: dto,
      status: 'submitted',
    });
  }

  @Post('principal/subjects-departments/department')
  @RequiresModule('admin_command_centers', 'principal_dashboard')
  @Permissions('principal:write', 'academics:write')
  createPrincipalDepartment(@Body() dto: any) {
    return this.adminCommandService.recordPrincipalWorkflowAction({
      action: 'principal.department_create_requested',
      entityType: 'department',
      title: 'Department create requested',
      message: String(dto?.name || dto?.department_name || 'Principal requested a new department.'),
      payload: dto,
      status: 'submitted',
    });
  }

  @Post('principal/staff-roles/invite')
  @RequiresModule('admin_command_centers', 'principal_dashboard')
  @Permissions('principal:write', 'hr:write')
  invitePrincipalStaff(@Body() dto: any) {
    return this.adminCommandService.recordPrincipalWorkflowAction({
      action: 'principal.staff_invite_requested',
      entityType: 'staff_invite',
      title: 'Staff invite requested',
      message: String(dto?.email || 'Principal requested a staff invite.'),
      payload: dto,
      targetRoles: ['principal', 'secretary'],
      status: 'submitted',
    });
  }

  @Post('principal/staff-roles/:staffId/role')
  @RequiresModule('admin_command_centers', 'principal_dashboard')
  @Permissions('principal:write', 'hr:write')
  updatePrincipalStaffRole(@Param('staffId') staffId: string, @Body() dto: any) {
    return this.adminCommandService.recordPrincipalWorkflowAction({
      action: 'principal.staff_role_update_requested',
      entityType: 'staff_role',
      entityId: staffId,
      title: 'Staff role update requested',
      message: `Principal requested role update for staff ${staffId}.`,
      payload: { ...dto, staffId },
      targetRoles: ['principal'],
      status: 'submitted',
    });
  }

  @Post('principal/students/admit')
  @RequiresModule('admin_command_centers', 'principal_dashboard')
  @Permissions('principal:write', 'students:write')
  admitPrincipalStudent(@Body() dto: any) {
    return this.adminCommandService.recordPrincipalWorkflowAction({
      action: 'principal.student_admission_requested',
      entityType: 'student_admission',
      title: 'Student admission requested',
      message: String(dto?.name || dto?.student_name || 'Principal requested student admission.'),
      payload: dto,
      status: 'submitted',
    });
  }

  @Post('principal/students/:studentId/transfer')
  @RequiresModule('admin_command_centers', 'principal_dashboard')
  @Permissions('principal:write', 'students:write')
  transferPrincipalStudent(@Param('studentId') studentId: string, @Body() dto: any) {
    return this.adminCommandService.recordPrincipalWorkflowAction({
      action: 'principal.student_transfer_requested',
      entityType: 'student',
      entityId: studentId,
      title: 'Student transfer requested',
      message: `Principal requested transfer for student ${studentId}.`,
      payload: { ...dto, studentId },
      status: 'submitted',
    });
  }

  @Post('principal/attendance-monitoring/:classId/alert')
  @RequiresModule('admin_command_centers', 'principal_dashboard')
  @Permissions('principal:write')
  sendPrincipalAttendanceAlert(@Param('classId') classId: string) {
    return this.adminCommandService.recordPrincipalWorkflowAction({
      action: 'principal.attendance_alert_sent',
      entityType: 'class_attendance',
      entityId: classId,
      title: 'Attendance alert sent',
      message: `Principal sent an attendance alert for class ${classId}.`,
      payload: { classId },
      targetRoles: ['class_teacher', 'deputy_principal', 'principal'],
      status: 'sent',
    });
  }

  @Post('principal/discipline/:caseId/escalate')
  @RequiresModule('admin_command_centers', 'principal_dashboard')
  @Permissions('principal:write', 'discipline:write')
  escalatePrincipalDiscipline(@Param('caseId') caseId: string) {
    return this.adminCommandService.recordPrincipalWorkflowAction({
      action: 'principal.discipline_case_escalated',
      entityType: 'discipline_case',
      entityId: caseId,
      title: 'Discipline case escalated',
      message: `Principal escalated discipline case ${caseId}.`,
      payload: { caseId },
      targetRoles: ['discipline_master', 'deputy_principal', 'principal'],
      status: 'escalated',
    });
  }

  @Post('principal/discipline/:caseId/resolve')
  @RequiresModule('admin_command_centers', 'principal_dashboard')
  @Permissions('principal:write', 'discipline:write')
  resolvePrincipalDiscipline(@Param('caseId') caseId: string, @Body() dto: any) {
    return this.adminCommandService.recordPrincipalWorkflowAction({
      action: 'principal.discipline_case_resolved',
      entityType: 'discipline_case',
      entityId: caseId,
      title: 'Discipline case resolved',
      message: `Principal resolved discipline case ${caseId}.`,
      payload: { ...dto, caseId },
      targetRoles: ['discipline_master', 'deputy_principal', 'principal'],
      status: 'resolved',
    });
  }

  @Post('principal/exams-report-cards/:examId/publish')
  @RequiresModule('admin_command_centers', 'principal_dashboard')
  @Permissions('principal:write', 'exams:write')
  publishPrincipalReportCards(@Param('examId') examId: string) {
    return this.adminCommandService.publishPrincipalExamSeries(examId);
  }

  @Post('principal/finance-overview/:expenseId/approve')
  @RequiresModule('admin_command_centers', 'principal_dashboard')
  @Permissions('principal:write', 'finance:write')
  approvePrincipalExpense(@Param('expenseId') expenseId: string) {
    return this.adminCommandService.recordPrincipalWorkflowAction({
      action: 'principal.expense_approved',
      entityType: 'expense',
      entityId: expenseId,
      title: 'Expense approved',
      message: `Principal approved expense ${expenseId}.`,
      payload: { expenseId },
      targetRoles: ['accountant', 'principal'],
      status: 'approved',
    });
  }

  @Post('principal/approvals/:approvalId/action')
  @RequiresModule('admin_command_centers', 'principal_dashboard')
  @Permissions('principal:write')
  actionPrincipalApproval(@Param('approvalId') approvalId: string, @Body() dto: any) {
    return this.adminCommandService.actionPrincipalApproval(approvalId, dto ?? {});
  }

  @Post('principal/communication/announcement')
  @RequiresModule('admin_command_centers', 'principal_dashboard')
  @Permissions('principal:write', 'school_sms:send')
  sendPrincipalAnnouncement(@Body() dto: any) {
    return this.adminCommandService.recordPrincipalWorkflowAction({
      action: 'principal.announcement_sent',
      entityType: 'announcement',
      title: String(dto?.title || 'Principal announcement'),
      message: String(dto?.body || dto?.message || 'Principal announcement sent.'),
      payload: dto,
      targetRoles: ['staff', 'parent', 'student', 'principal'],
      status: 'sent',
    });
  }

  @Post('principal/communication/message')
  @RequiresModule('admin_command_centers')
  @Permissions('principal:write', 'school_sms:send')
  sendPrincipalMessage(@Body() dto: any) {
    return this.adminCommandService.recordPrincipalWorkflowAction({
      action: 'principal.message_sent',
      entityType: 'message',
      title: String(dto?.subject || 'Principal message'),
      message: String(dto?.message || dto?.body || 'Principal message sent.'),
      payload: dto,
      targetRoles: ['principal'],
      status: 'sent',
    });
  }

  @Post('principal/reports/generate')
  @RequiresModule('admin_command_centers')
  @Permissions('principal:write', 'reports:write')
  generatePrincipalReport(@Body() dto: any) {
    return this.adminCommandService.recordPrincipalWorkflowAction({
      action: 'principal.report_generation_requested',
      entityType: 'report',
      title: String(dto?.title || dto?.name || 'Principal report'),
      message: 'Principal requested a report generation.',
      payload: dto,
      targetRoles: ['principal'],
      status: 'submitted',
    });
  }

  @Post('principal/setup-checklist/:itemId/complete')
  @RequiresModule('admin_command_centers')
  @Permissions('principal:write')
  markPrincipalChecklistItem(@Param('itemId') itemId: string) {
    return this.adminCommandService.recordPrincipalWorkflowAction({
      action: 'principal.setup_checklist_completed',
      entityType: 'setup_checklist_item',
      entityId: itemId,
      title: 'Setup checklist item completed',
      message: `Principal marked setup checklist item ${itemId} complete.`,
      payload: { itemId },
      status: 'completed',
    });
  }

  @Get('deputy/dashboard')
  @Permissions('deputy:read')
  getDeputyDashboard() {
    return this.adminCommandService.getDeputyDashboard();
  }

  @Get('secretary/dashboard')
  @Permissions('secretary:read')
  getSecretaryDashboard() {
    return this.adminCommandService.getSecretaryDashboard();
  }

  @Post('finance/fee-categories')
  @Permissions('finance:write')
  async createFeeCategory(@Body() dto: any) {
    return this.adminCommandService.createFeeCategory(dto);
  }

  @Post('reports/categories')
  @Permissions('reports:write')
  async createReportCategory(@Body() dto: any) {
    return this.adminCommandService.createReportCategory(dto);
  }

  @Post('reports/schedule')
  @Permissions('reports:write')
  async scheduleReport(@Body() dto: any) {
    return this.adminCommandService.scheduleReport(dto);
  }

  @Post('incidents')
  @Permissions('deputy:write')
  createIncident(@Body() dto: CreateAdminIncidentDto) {
    return this.adminCommandService.createIncident(dto);
  }


  @Get('communication-templates')
  @Permissions('school_sms:read')
  async listCommunicationTemplates() {
    return this.adminCommandService.getCommunicationTemplates();
  }

  @Post('communication-broadcasts')
  @Permissions('school_sms:send')
  async createCommunicationBroadcast(@Body() dto: { audience: string; message: string; channels: string[] }) {
    return this.adminCommandService.createCommunicationBroadcast(dto);
  }

  @Post('attendance/absences')
  @Permissions('students:write')
  async logAbsence(@Body() dto: { studentId: string; date: string; reason: string; isExcused: boolean }) {
    return this.adminCommandService.logAbsence(dto);
  }

  @Post('exams/cycles')
  @Permissions('exams:write')
  async createExamCycle(@Body() dto: {
    name: string;
    academic_term_id: string;
    starts_on: string;
    ends_on: string;
  }) {
    return this.adminCommandService.createExamCycle(dto);
  }

  @Post('discipline/incidents')
  @Permissions('discipline:write')
  async reportIncident(@Body() dto: { studentId: string; category: string; severity: any; description: string }) {
    return this.adminCommandService.reportIncident(dto);
  }

  @Post('communication-templates')
  @Permissions('school_sms:send')
  async createCommunicationTemplate(@Body() dto: { name: string; type: string; subject?: string; body: string; variables?: string[] }) {
    return this.adminCommandService.createCommunicationTemplate(dto);
  }

  @Patch('communication-templates/:id')
  @Permissions('school_sms:send')
  async updateCommunicationTemplate(@Body() dto: { name?: string; type?: string; subject?: string; body?: string; variables?: string[] }, @Param('id') id: string) {
    return this.adminCommandService.updateCommunicationTemplate(id, dto);
  }

  @Delete('communication-templates/:id')
  @Permissions('school_sms:send')
  async deleteCommunicationTemplate(@Param('id') id: string) {
    return this.adminCommandService.deleteCommunicationTemplate(id);
  }

  @Post('announcements')
  @Permissions('secretary:write')
  createAnnouncement(@Body() dto: CreateAnnouncementDto) {
    return this.adminCommandService.createAnnouncement(dto);
  }

  @Post('academics/department-meetings')
  @Permissions('academics:write')
  async logDepartmentMeeting(@Body() dto: any) {
    return this.adminCommandService.logDepartmentMeeting(dto);
  }

  @Post('communication/announcement')
  @RequiresModule('admin_command_centers')
  @Permissions('school_sms:send')
  createSchoolAnnouncement(@Body() body: any) {
    return this.adminCommandService.createSchoolAnnouncement(body);
  }

  // --- Finance & Admin Endpoints (Phase 4) ---

  @Post('finance/invoice')
  @RequiresModule('admin_command_centers')
  @Permissions('finance:write')
  generateInvoice(@Body() body: any) {
    return this.adminCommandService.generateInvoice(body);
  }

  @Post('finance/payment')
  @RequiresModule('admin_command_centers')
  @Permissions('finance:write')
  recordPayment(@Body() body: any) {
    return this.adminCommandService.recordPayment(body);
  }

  @Post('finance/expense')
  @RequiresModule('admin_command_centers')
  @Permissions('finance:write')
  addExpense(@Body() body: any) {
    return this.adminCommandService.addExpense(body);
  }

  @Post('frontoffice/visitor')
  @RequiresModule('admin_command_centers')
  @Permissions('frontoffice:write')
  logVisitor(@Body() body: any) {
    return this.adminCommandService.logVisitor(body);
  }

  @Post('frontoffice/appointment')
  @RequiresModule('admin_command_centers')
  @Permissions('frontoffice:write')
  scheduleAppointment(@Body() body: any) {
    return this.adminCommandService.scheduleAppointment(body);
  }

  @Post('frontoffice/dispatch')
  @RequiresModule('admin_command_centers')
  @Permissions('frontoffice:write')
  recordDispatch(@Body() body: any) {
    return this.adminCommandService.recordDispatch(body);
  }

  @Post('inventory/receive')
  @RequiresModule('admin_command_centers')
  @Permissions('inventory:write')
  receiveStock(@Body() body: any) {
    return this.adminCommandService.receiveStock(body);
  }

  @Post('inventory/issue')
  @RequiresModule('admin_command_centers')
  @Permissions('inventory:write')
  issueItem(@Body() body: any) {
    return this.adminCommandService.issueItem(body);
  }

  @Post('transport/route')
  @RequiresModule('admin_command_centers')
  @Permissions('transport:write')
  assignRoute(@Body() body: any) {
    return this.adminCommandService.assignRoute(body);
  }

  @Post('transport/maintenance')
  @RequiresModule('admin_command_centers')
  @Permissions('transport:write')
  logMaintenance(@Body() body: any) {
    return this.adminCommandService.logMaintenance(body);
  }

  // --- Auxiliary Endpoints (Phase 5) ---

  @Post('library/issue')
  @RequiresModule('admin_command_centers')
  @Permissions('library:write')
  issueBook(@Body() body: any) {
    return this.adminCommandService.issueBook(body);
  }

  @Post('library/add')
  @RequiresModule('admin_command_centers')
  @Permissions('library:write')
  addBook(@Body() body: any) {
    return this.adminCommandService.addBook(body);
  }

  @Post('clinic/visit')
  @RequiresModule('admin_command_centers')
  @Permissions('clinic:write')
  logClinicVisit(@Body() body: any) {
    return this.adminCommandService.logClinicVisit(body);
  }

  @Post('academics/teacher-assignments')
  @Permissions('academics:write')
  async assignTeacherDuties(@Body() dto: any) {
    return this.adminCommandService.assignTeacherDuties(dto);
  }

  @Post('exams/marks/lock')
  @Permissions('exams:write')
  async lockMarksBatch(@Body() dto: any) {
    return this.adminCommandService.lockMarksBatch(dto);
  }

  @Post('exams/marks/return')
  @Permissions('exams:write')
  async returnMarksBatch(@Body() dto: any) {
    return this.adminCommandService.returnMarksBatch(dto);
  }

  @Post('academics/interventions')
  @Permissions('academics:write')
  async assignIntervention(@Body() dto: any) {
    return this.adminCommandService.assignIntervention(dto);
  }

  @Post('meeting-minutes')
  @Permissions('secretary:write')
  createMeetingMinutes(@Body() dto: CreateMeetingMinutesDto) {
    return this.adminCommandService.createMeetingMinutes(dto);
  }

  @Post('principal/school-profile/logo')
  @RequiresModule('admin_command_centers', 'principal_dashboard')
  @Permissions('principal:write')
  @UseInterceptors(StreamingUploadInterceptor('logo'))
  async uploadSchoolLogo(
    @UploadedFile() file: UploadFileMetadata,
  ) {
    return this.adminCommandService.uploadSchoolLogo(file);
  }

  @Get('principal/school-profile/logo/content')
  @RequiresModule('admin_command_centers', 'principal_dashboard')
  @Permissions('principal:read')
  @SkipResponseEnvelope()
  async getSchoolLogoContent() {
    const logo = await this.adminCommandService.getSchoolLogoContent();

    return new StreamableFile(logo.content, {
      type: logo.mime_type,
      disposition: `inline; filename="${logo.original_file_name}"`,
      length: logo.size_bytes,
    });
  }

  @Post('boarding/assign-bed')
  @Permissions('boarding:manage')
  assignBed(@Body() body: any) {
    return this.adminCommandService.assignBed(body);
  }

  @Post('boarding/roll-call')
  @Permissions('boarding:write')
  submitRollCall(@Body() body: any) {
    return this.adminCommandService.submitRollCall(body);
  }

  @Get('boarding/incidents')
  @Permissions('boarding:read')
  getBoardingIncidents() {
    return this.adminCommandService.getBoardingIncidents();
  }

  @Post('library/return')
  @Permissions('library:write')
  libraryReturn(@Body() body: any) {
    return this.adminCommandService.libraryReturn(body);
  }

  @Get('frontoffice/visitors')
  @Permissions('frontoffice:read')
  getFrontofficeVisitors() {
    return this.adminCommandService.getFrontofficeVisitors();
  }

  @Get('frontoffice/appointments')
  @Permissions('frontoffice:read')
  getFrontofficeAppointments() {
    return this.adminCommandService.getFrontofficeAppointments();
  }

  @Get('frontoffice/mail')
  @Permissions('frontoffice:read')
  getFrontofficeMail() {
    return this.adminCommandService.getFrontofficeMail();
  }

  @Get('transport/route')
  @Permissions('transport:read')
  getTransportRoute() {
    return this.adminCommandService.getTransportRoute();
  }

  @Get('transport/maintenance')
  @Permissions('transport:read')
  getTransportMaintenance() {
    return this.adminCommandService.getTransportMaintenance();
  }
}
