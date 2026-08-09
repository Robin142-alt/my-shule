import { Body, Controller, Get, Post, Query, UnauthorizedException } from '@nestjs/common';

import { Permissions } from '../../auth/decorators/permissions.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { RequestContextService } from '../../common/request-context/request-context.service';
import { RequiresModule } from '../module-access/module-access.decorator';
import { ClassTeacherService } from './class-teacher.service';
import { SaveTeacherMarksDto } from './dto/class-teacher.dto';

@Controller('class-teacher')
@RequiresModule('academics')
@Roles('teacher', 'class_teacher')
@Permissions('teacher:read')
export class ClassTeacherController {
  constructor(
    private readonly classTeacherService: ClassTeacherService,
    private readonly requestContext: RequestContextService,
  ) {}

  private currentScope(): { tenantId: string; userId: string } {
    const context = this.requestContext.requireStore();
    if (!context.is_authenticated || !context.tenant_id || !context.user_id) {
      throw new UnauthorizedException('Authenticated teacher context is required');
    }

    return { tenantId: context.tenant_id, userId: context.user_id };
  }

  @Get('my-classes')
  getMyClasses() {
    const { tenantId, userId } = this.currentScope();
    return this.classTeacherService.getMyClasses(tenantId, userId);
  }

  @Get('overview')
  getOverview(@Query('streamId') streamId: string) {
    const { tenantId, userId } = this.currentScope();
    return this.classTeacherService.getOverview(tenantId, userId, streamId);
  }

  @Get('dashboard-overview')
  getDashboardOverview() {
    const { tenantId, userId } = this.currentScope();
    return this.classTeacherService.getDashboardOverview(tenantId, userId);
  }

  @Get('register')
  getRegister(@Query('streamId') streamId: string) {
    const { tenantId, userId } = this.currentScope();
    return this.classTeacherService.getRegister(tenantId, userId, streamId);
  }

  @Get('pending-attendance')
  getPendingAttendance() {
    const { tenantId, userId } = this.currentScope();
    return this.classTeacherService.getPendingAttendance(tenantId, userId);
  }

  @Get('pending-marks')
  getPendingMarks() {
    const { tenantId, userId } = this.currentScope();
    return this.classTeacherService.getPendingMarks(tenantId, userId);
  }

  @Get('timetable')
  getTimetable(@Query('streamId') streamId?: string) {
    const { tenantId, userId } = this.currentScope();
    return streamId
      ? this.classTeacherService.getStreamTimetable(tenantId, userId, streamId)
      : this.classTeacherService.getTimetable(tenantId, userId);
  }

  @Get('sent-messages')
  getSentMessages() {
    const { tenantId, userId } = this.currentScope();
    return this.classTeacherService.getSentMessages(tenantId, userId);
  }

  @Get('register-overview')
  getClassRegisterOverview() {
    const { tenantId, userId } = this.currentScope();
    return this.classTeacherService.getClassRegisterOverview(tenantId, userId);
  }

  @Get('discipline-concerns')
  getDisciplineConcerns() {
    const { tenantId, userId } = this.currentScope();
    return this.classTeacherService.getDisciplineConcerns(tenantId, userId);
  }

  @Post('discipline-concerns')
  @Permissions('teacher:write')
  saveDisciplineConcern(@Body() body: any) {
    const { tenantId, userId } = this.currentScope();
    return this.classTeacherService.saveDisciplineConcern(tenantId, userId, body);
  }

  @Get('report-comments')
  getReportComments() {
    const { tenantId, userId } = this.currentScope();
    return this.classTeacherService.getReportComments(tenantId, userId);
  }

  @Post('report-comments')
  @Permissions('teacher:write')
  saveReportComment(@Body() body: any) {
    const { tenantId, userId } = this.currentScope();
    return this.classTeacherService.saveReportComment(tenantId, userId, body);
  }

  @Get('attendance')
  getAttendance(@Query('streamId') streamId: string) {
    const { tenantId, userId } = this.currentScope();
    return this.classTeacherService.getAttendance(tenantId, userId, streamId);
  }

  @Post('attendance')
  @Permissions('teacher:write')
  saveAttendance(@Body() body: { streamId: string; records: any[] }) {
    const { tenantId, userId } = this.currentScope();
    return this.classTeacherService.saveAttendance(tenantId, userId, body.streamId, body.records);
  }

  @Post('marks')
  @Permissions('teacher:write', 'exams:enter-marks')
  saveMarks(@Body() body: SaveTeacherMarksDto) {
    const { tenantId, userId } = this.currentScope();
    return this.classTeacherService.saveMarks(tenantId, userId, body);
  }

  @Get('progress')
  getProgress(@Query('streamId') streamId: string) {
    const { tenantId, userId } = this.currentScope();
    return this.classTeacherService.getProgress(tenantId, userId, streamId);
  }

  @Get('comments')
  getComments(@Query('streamId') streamId: string) {
    const { tenantId, userId } = this.currentScope();
    return this.classTeacherService.getComments(tenantId, userId, streamId);
  }

  @Get('discipline')
  getDiscipline(@Query('streamId') streamId: string) {
    const { tenantId, userId } = this.currentScope();
    return this.classTeacherService.getDiscipline(tenantId, userId, streamId);
  }

  @Post('discipline')
  @Permissions('teacher:write')
  reportDiscipline(@Body() body: { streamId: string; payload: any }) {
    const { tenantId, userId } = this.currentScope();
    return this.classTeacherService.reportDisciplineIncident(tenantId, userId, body.streamId, body.payload);
  }

  @Get('welfare')
  getWelfare(@Query('streamId') streamId: string) {
    const { tenantId, userId } = this.currentScope();
    return this.classTeacherService.getWelfare(tenantId, userId, streamId);
  }

  @Post('welfare')
  @Permissions('teacher:write')
  referWelfare(@Body() body: { streamId: string; payload: any }) {
    const { tenantId, userId } = this.currentScope();
    return this.classTeacherService.referWelfareCase(tenantId, userId, body.streamId, body.payload);
  }

  @Get('subjects')
  getSubjects(@Query('streamId') streamId: string) {
    const { tenantId, userId } = this.currentScope();
    return this.classTeacherService.getSubjects(tenantId, userId, streamId);
  }

  @Get('communication')
  getCommunication(@Query('streamId') streamId: string) {
    const { tenantId, userId } = this.currentScope();
    return this.classTeacherService.getCommunication(tenantId, userId, streamId);
  }

  @Get('tasks')
  getTasks(@Query('streamId') streamId: string) {
    const { tenantId, userId } = this.currentScope();
    return this.classTeacherService.getTasks(tenantId, userId, streamId);
  }

  @Get('health')
  getHealth(@Query('streamId') streamId: string) {
    const { tenantId, userId } = this.currentScope();
    return this.classTeacherService.getHealth(tenantId, userId, streamId);
  }

  @Get('homework')
  getHomework(@Query('streamId') streamId: string) {
    const { tenantId, userId } = this.currentScope();
    return this.classTeacherService.getHomework(tenantId, userId, streamId);
  }

  @Post('homework')
  @Permissions('teacher:write')
  saveHomework(@Body() body: any) {
    const { tenantId, userId } = this.currentScope();
    return this.classTeacherService.saveHomework(tenantId, userId, body);
  }

  @Get('lesson-logs')
  getLessonLogs(@Query('streamId') streamId?: string) {
    const { tenantId, userId } = this.currentScope();
    return this.classTeacherService.getLessonLogs(tenantId, userId, streamId);
  }

  @Post('lesson-logs')
  @Permissions('teacher:write')
  saveLessonLog(@Body() body: any) {
    const { tenantId, userId } = this.currentScope();
    return this.classTeacherService.saveLessonLog(tenantId, userId, body);
  }

  @Get('meetings')
  getMeetings(@Query('streamId') streamId: string) {
    const { tenantId, userId } = this.currentScope();
    return this.classTeacherService.getMeetings(tenantId, userId, streamId);
  }

  @Get('requests')
  getRequests(@Query('streamId') streamId: string) {
    const { tenantId, userId } = this.currentScope();
    return this.classTeacherService.getRequests(tenantId, userId, streamId);
  }

  @Get('documents')
  getDocuments(@Query('streamId') streamId: string) {
    const { tenantId, userId } = this.currentScope();
    return this.classTeacherService.getDocuments(tenantId, userId, streamId);
  }

  @Get('notifications')
  getNotifications(@Query('streamId') streamId: string) {
    const { tenantId, userId } = this.currentScope();
    return this.classTeacherService.getNotifications(tenantId, userId, streamId);
  }

  @Get('reports')
  getReports(@Query('streamId') streamId: string) {
    const { tenantId, userId } = this.currentScope();
    return this.classTeacherService.getReports(tenantId, userId, streamId);
  }

  @Get('settings')
  getSettings(@Query('streamId') streamId: string) {
    const { tenantId, userId } = this.currentScope();
    return this.classTeacherService.getSettings(tenantId, userId, streamId);
  }

  @Post('settings')
  @Permissions('teacher:write')
  saveSettings(@Query('streamId') streamId: string, @Body() body: any) {
    const { tenantId, userId } = this.currentScope();
    return this.classTeacherService.saveSettings(tenantId, userId, streamId, body);
  }
}
