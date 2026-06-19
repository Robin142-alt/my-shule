import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import { DeputyCommandService } from './deputy-command.service';

@Controller('admin-command/deputy')
export class DeputyCommandController {
  constructor(private readonly deputyService: DeputyCommandService) {}

  @Get('overview')
  @Permissions('deputy:read')
  getOverview() { return this.deputyService.getOverview(); }

  @Get('daily-operations')
  @Permissions('deputy:read')
  getDailyOperations() { return this.deputyService.getDailyOperations(); }

  @Post('daily-operations')
  @Permissions('deputy:write')
  createDailyOperationNote(@Body() dto: any) { return this.deputyService.createDailyOperationNote(dto); }

  @Get('attendance')
  @Permissions('deputy:read')
  getAttendance() { return this.deputyService.getAttendance(); }

  @Post('attendance/:id/notify')
  @Permissions('deputy:write')
  notifyParent(@Param('id') id: string) { return this.deputyService.notifyParent(id); }

  @Post('attendance/follow-up')
  @Permissions('deputy:write')
  createFollowUpList(@Body() dto: any) { return this.deputyService.createFollowUpList(dto); }

  @Get('discipline')
  @Permissions('deputy:read')
  getDiscipline() { return this.deputyService.getDiscipline(); }

  @Post('discipline')
  @Permissions('deputy:write')
  createDisciplineIncident(@Body() dto: any) { return this.deputyService.createDisciplineIncident(dto); }

  @Post('discipline/:id/escalate')
  @Permissions('deputy:write')
  escalateDisciplineIncident(@Param('id') id: string) { return this.deputyService.escalateDisciplineIncident(id); }

  @Get('welfare')
  @Permissions('deputy:read')
  getWelfare() { return this.deputyService.getWelfare(); }

  @Post('welfare')
  @Permissions('deputy:write')
  createWelfareCase(@Body() dto: any) { return this.deputyService.createWelfareCase(dto); }

  @Post('welfare/:id/open')
  @Permissions('deputy:write')
  openWelfareCase(@Param('id') id: string) { return this.deputyService.openWelfareCase(id); }

  @Get('staff-duty')
  @Permissions('deputy:read')
  getStaffDuty() { return this.deputyService.getStaffDuty(); }

  @Post('staff-duty/:id/request-report')
  @Permissions('deputy:write')
  requestDutyReport(@Param('id') id: string) { return this.deputyService.requestDutyReport(id); }

  @Post('staff-duty/roster')
  @Permissions('deputy:write')
  manageDutyRoster(@Body() dto: any) { return this.deputyService.manageDutyRoster(dto); }

  @Get('teaching')
  @Permissions('deputy:read')
  getTeaching() { return this.deputyService.getTeaching(); }

  @Post('teaching/:id/mark-attendance')
  @Permissions('deputy:write')
  markTeachingAttendance(@Param('id') id: string) { return this.deputyService.markTeachingAttendance(id); }

  @Post('teaching/:id/log-lesson')
  @Permissions('deputy:write')
  logTeachingLesson(@Param('id') id: string) { return this.deputyService.logTeachingLesson(id); }

  @Get('timetable')
  @Permissions('deputy:read')
  getTimetable() { return this.deputyService.getTimetable(); }

  @Post('timetable/:id/assign')
  @Permissions('deputy:write')
  assignReliefTeacher(@Param('id') id: string, @Body('teacherName') teacherName: string) { return this.deputyService.assignReliefTeacher(id, teacherName); }

  @Post('timetable/auto-assign')
  @Permissions('deputy:write')
  autoAssignRelief() { return this.deputyService.autoAssignRelief(); }

  @Get('academics')
  @Permissions('deputy:read')
  getAcademics() { return this.deputyService.getAcademics(); }

  @Post('academics/:id/message-hod')
  @Permissions('deputy:write')
  messageHOD(@Param('id') id: string) { return this.deputyService.messageHOD(id); }

  @Post('academics/intervention')
  @Permissions('deputy:write')
  createIntervention(@Body() dto: any) { return this.deputyService.createIntervention(dto); }

  @Get('exams')
  @Permissions('deputy:read')
  getExams() { return this.deputyService.getExams(); }

  @Post('exams/:id/flag-delay')
  @Permissions('deputy:write')
  flagExamDelay(@Param('id') id: string) { return this.deputyService.flagExamDelay(id); }

  @Get('classes')
  @Permissions('deputy:read')
  getClasses() { return this.deputyService.getClasses(); }

  @Post('classes/streams')
  @Permissions('deputy:write')
  manageStreams(@Body() dto: any) { return this.deputyService.manageStreams(dto); }

  @Get('approvals')
  @Permissions('deputy:read')
  getApprovals() { return this.deputyService.getApprovals(); }

  @Post('approvals/:id/action')
  @Permissions('deputy:write')
  actionApproval(@Param('id') id: string, @Body('action') action: string) { return this.deputyService.actionApproval(id, action); }

  @Get('communication')
  @Permissions('deputy:read')
  getCommunication() { return this.deputyService.getCommunication(); }

  @Get('reports')
  @Permissions('deputy:read')
  getReports() { return this.deputyService.getReports(); }

  @Post('reports/generate')
  @Permissions('deputy:write')
  generateReport(@Body() body: any) { return this.deputyService.generateReport(body); }

  @Get('staff')
  @Permissions('deputy:read')
  getStaff() { return this.deputyService.getStaff(); }

  @Post('staff/assign-role')
  @Permissions('deputy:write')
  assignRole(@Body() body: any) { return this.deputyService.assignRole(body); }
}
