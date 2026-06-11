import { Body, Controller, Get, Post, Sse } from '@nestjs/common';

import { Permissions } from '../../auth/decorators/permissions.decorator';
import { RequiresModule } from '../module-access/module-access.decorator';
import {
  CreateAdminIncidentDto,
  CreateAnnouncementDto,
  CreateMeetingMinutesDto,
} from './dto/admin-command.dto';
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
  @Permissions('principal:read', 'attendance:read')
  getPrincipalAttendance() {
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

  @Get('principal/communication')
  @RequiresModule('admin_command_centers', 'principal_dashboard')
  @Permissions('principal:read', 'communication:read')
  getPrincipalCommunication() {
    return this.adminCommandService.getPrincipalCommunicationOverview();
  }

  @Get('principal/classes')
  @RequiresModule('admin_command_centers', 'principal_dashboard')
  @Permissions('principal:read', 'classes:read')
  getPrincipalClasses() {
    return this.adminCommandService.getPrincipalClassesOverview();
  }

  @Get('principal/subjects')
  @RequiresModule('admin_command_centers', 'principal_dashboard')
  @Permissions('principal:read', 'subjects:read')
  getPrincipalSubjects() {
    return this.adminCommandService.getPrincipalSubjectsOverview();
  }

  @Get('principal/staff')
  @RequiresModule('admin_command_centers', 'principal_dashboard')
  @Permissions('principal:read', 'staff:read')
  getPrincipalStaff() {
    return this.adminCommandService.getPrincipalStaffOverview();
  }

  @Get('principal/overview')
  @RequiresModule('admin_command_centers', 'principal_dashboard')
  @Permissions('principal:read')
  getPrincipalOverview() {
    return this.adminCommandService.getPrincipalOverview();
  }

  @Get('principal/school-profile')
  @RequiresModule('admin_command_centers', 'principal_dashboard')
  @Permissions('principal:read', 'school_profile:read')
  getSchoolProfile() {
    return this.adminCommandService.getSchoolProfile();
  }

  @Get('principal/approvals')
  @RequiresModule('admin_command_centers', 'principal_dashboard')
  @Permissions('principal:read', 'approvals:read')
  getApprovalsOverview() {
    return this.adminCommandService.getApprovalsOverview();
  }

  @Get('principal/reports')
  @RequiresModule('admin_command_centers', 'principal_dashboard')
  @Permissions('principal:read', 'reports:read')
  getPrincipalReportsOverview() {
    return this.adminCommandService.getPrincipalReportsOverview();
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

  @Get('principal/teaching')
  @RequiresModule('admin_command_centers', 'principal_dashboard')
  @Permissions('principal:read')
  getPrincipalTeachingSchedule() {
    return this.adminCommandService.getPrincipalTeachingSchedule();
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

  @Post('incidents')
  @Permissions('deputy:write')
  createIncident(@Body() dto: CreateAdminIncidentDto) {
    return this.adminCommandService.createIncident(dto);
  }

  @Post('announcements')
  @Permissions('secretary:write')
  createAnnouncement(@Body() dto: CreateAnnouncementDto) {
    return this.adminCommandService.createAnnouncement(dto);
  }

  @Post('meeting-minutes')
  @Permissions('secretary:write')
  createMeetingMinutes(@Body() dto: CreateMeetingMinutesDto) {
    return this.adminCommandService.createMeetingMinutes(dto);
  }
}
