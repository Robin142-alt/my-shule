import { Controller, Get, Post, Body, Query, Headers } from '@nestjs/common';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import { RequiresModule } from '../module-access/module-access.decorator';
import { ClassTeacherService } from './class-teacher.service';

@Controller('class-teacher')
@RequiresModule('academics')
export class ClassTeacherController {
  constructor(private readonly classTeacherService: ClassTeacherService) {}

  @Get('my-classes')
  @Permissions('academics:read')
  getMyClasses(
    @Headers('x-tenant-id') tenantId: string,
    @Headers('x-user-id') userId: string,
  ) {
    return this.classTeacherService.getMyClasses(tenantId, userId);
  }

  @Get('overview')
  @Permissions('academics:read')
  getOverview(
    @Headers('x-tenant-id') tenantId: string,
    @Headers('x-user-id') userId: string,
    @Query('streamId') streamId: string
  ) {
    return this.classTeacherService.getOverview(tenantId, userId, streamId);
  }

  @Get('register')
  @Permissions('academics:read')
  getRegister(
    @Headers('x-tenant-id') tenantId: string,
    @Headers('x-user-id') userId: string,
    @Query('streamId') streamId: string
  ) {
    return this.classTeacherService.getRegister(tenantId, userId, streamId);
  }

  @Get('pending-attendance')
  @Permissions('academics:read')
  getPendingAttendance(
    @Headers('x-tenant-id') tenantId: string,
    @Headers('x-user-id') userId: string,
  ) {
    return this.classTeacherService.getPendingAttendance(tenantId, userId);
  }

  @Get('pending-marks')
  @Permissions('exams:read')
  getPendingMarks(
    @Headers('x-tenant-id') tenantId: string,
    @Headers('x-user-id') userId: string,
  ) {
    return this.classTeacherService.getPendingMarks(tenantId, userId);
  }

  @Get('timetable')
  @Permissions('academics:read')
  getTimetable(
    @Headers('x-tenant-id') tenantId: string,
    @Headers('x-user-id') userId: string,
  ) {
    return this.classTeacherService.getTimetable(tenantId, userId);
  }

  @Get('sent-messages')
  @Permissions('academics:read')
  getSentMessages(
    @Headers('x-tenant-id') tenantId: string,
    @Headers('x-user-id') userId: string,
  ) {
    return this.classTeacherService.getSentMessages(tenantId, userId);
  }

  @Get('register-overview')
  @Permissions('academics:read')
  getClassRegisterOverview(
    @Headers('x-tenant-id') tenantId: string,
    @Headers('x-user-id') userId: string,
  ) {
    return this.classTeacherService.getClassRegisterOverview(tenantId, userId);
  }

  @Get('discipline-concerns')
  @Permissions('academics:read')
  getDisciplineConcerns(
    @Headers('x-tenant-id') tenantId: string,
    @Headers('x-user-id') userId: string,
  ) {
    return this.classTeacherService.getDisciplineConcerns(tenantId, userId);
  }

  @Get('report-comments')
  @Permissions('academics:read')
  getReportComments(
    @Headers('x-tenant-id') tenantId: string,
    @Headers('x-user-id') userId: string,
  ) {
    return this.classTeacherService.getReportComments(tenantId, userId);
  }

  @Post('report-comments')
  @Permissions('academics:write')
  saveReportComment(
    @Headers('x-tenant-id') tenantId: string,
    @Headers('x-user-id') userId: string,
    @Body() body: any,
  ) {
    return this.classTeacherService.saveReportComment(tenantId, userId, body);
  }

  @Get('attendance')
  @Permissions('academics:read')
  getAttendance(
    @Headers('x-tenant-id') tenantId: string,
    @Headers('x-user-id') userId: string,
    @Query('streamId') streamId: string
  ) {
    return this.classTeacherService.getAttendance(tenantId, userId, streamId);
  }

  @Post('attendance')
  @Permissions('academics:write')
  saveAttendance(
    @Headers('x-tenant-id') tenantId: string,
    @Headers('x-user-id') userId: string,
    @Body() body: { streamId: string; records: any[] }
  ) {
    return this.classTeacherService.saveAttendance(tenantId, userId, body.streamId, body.records);
  }

  @Get('progress')
  @Permissions('academics:read')
  getProgress(
    @Headers('x-tenant-id') tenantId: string,
    @Headers('x-user-id') userId: string,
    @Query('streamId') streamId: string
  ) {
    return this.classTeacherService.getProgress(tenantId, userId, streamId);
  }

  @Get('comments')
  @Permissions('academics:read')
  getComments(
    @Headers('x-tenant-id') tenantId: string,
    @Headers('x-user-id') userId: string,
    @Query('streamId') streamId: string
  ) {
    return this.classTeacherService.getComments(tenantId, userId, streamId);
  }

  @Get('discipline')
  @Permissions('academics:read')
  getDiscipline(
    @Headers('x-tenant-id') tenantId: string,
    @Headers('x-user-id') userId: string,
    @Query('streamId') streamId: string
  ) {
    return this.classTeacherService.getDiscipline(tenantId, userId, streamId);
  }

  @Post('discipline')
  @Permissions('academics:write')
  reportDiscipline(
    @Headers('x-tenant-id') tenantId: string,
    @Headers('x-user-id') userId: string,
    @Body() body: { streamId: string; payload: any }
  ) {
    return this.classTeacherService.reportDisciplineIncident(tenantId, userId, body.streamId, body.payload);
  }

  @Get('welfare')
  @Permissions('academics:read')
  getWelfare(
    @Headers('x-tenant-id') tenantId: string,
    @Headers('x-user-id') userId: string,
    @Query('streamId') streamId: string
  ) {
    return this.classTeacherService.getWelfare(tenantId, userId, streamId);
  }

  @Post('welfare')
  @Permissions('academics:write')
  referWelfare(
    @Headers('x-tenant-id') tenantId: string,
    @Headers('x-user-id') userId: string,
    @Body() body: { streamId: string; payload: any }
  ) {
    return this.classTeacherService.referWelfareCase(tenantId, userId, body.streamId, body.payload);
  }

  @Get('timetable')
  @Permissions('academics:read')
  getTimetable(
    @Headers('x-tenant-id') tenantId: string,
    @Headers('x-user-id') userId: string,
    @Query('streamId') streamId: string
  ) {
    return this.classTeacherService.getTimetable(tenantId, userId, streamId);
  }

  @Get('subjects')
  @Permissions('academics:read')
  getSubjects(
    @Headers('x-tenant-id') tenantId: string,
    @Headers('x-user-id') userId: string,
    @Query('streamId') streamId: string
  ) {
    return this.classTeacherService.getSubjects(tenantId, userId, streamId);
  }

  @Get('communication')
  @Permissions('academics:read')
  getCommunication(
    @Headers('x-tenant-id') tenantId: string,
    @Headers('x-user-id') userId: string,
    @Query('streamId') streamId: string
  ) {
    return this.classTeacherService.getCommunication(tenantId, userId, streamId);
  }

  @Get('tasks')
  @Permissions('academics:read')
  getTasks(
    @Headers('x-tenant-id') tenantId: string,
    @Headers('x-user-id') userId: string,
    @Query('streamId') streamId: string
  ) {
    return this.classTeacherService.getTasks(tenantId, userId, streamId);
  }

  @Get('fees')
  @Permissions('academics:read')
  getFees(
    @Headers('x-tenant-id') tenantId: string,
    @Headers('x-user-id') userId: string,
    @Query('streamId') streamId: string
  ) {
    return this.classTeacherService.getFees(tenantId, userId, streamId);
  }

  @Get('health')
  @Permissions('academics:read')
  getHealth(
    @Headers('x-tenant-id') tenantId: string,
    @Headers('x-user-id') userId: string,
    @Query('streamId') streamId: string
  ) {
    return this.classTeacherService.getHealth(tenantId, userId, streamId);
  }

  @Get('homework')
  @Permissions('academics:read')
  getHomework(
    @Headers('x-tenant-id') tenantId: string,
    @Headers('x-user-id') userId: string,
    @Query('streamId') streamId: string
  ) {
    return this.classTeacherService.getHomework(tenantId, userId, streamId);
  }

  @Get('meetings')
  @Permissions('academics:read')
  getMeetings(
    @Headers('x-tenant-id') tenantId: string,
    @Headers('x-user-id') userId: string,
    @Query('streamId') streamId: string
  ) {
    return this.classTeacherService.getMeetings(tenantId, userId, streamId);
  }

  @Get('requests')
  @Permissions('academics:read')
  getRequests(
    @Headers('x-tenant-id') tenantId: string,
    @Headers('x-user-id') userId: string,
    @Query('streamId') streamId: string
  ) {
    return this.classTeacherService.getRequests(tenantId, userId, streamId);
  }

  @Get('documents')
  @Permissions('academics:read')
  getDocuments(
    @Headers('x-tenant-id') tenantId: string,
    @Headers('x-user-id') userId: string,
    @Query('streamId') streamId: string
  ) {
    return this.classTeacherService.getDocuments(tenantId, userId, streamId);
  }

  @Get('notifications')
  @Permissions('academics:read')
  getNotifications(
    @Headers('x-tenant-id') tenantId: string,
    @Headers('x-user-id') userId: string,
    @Query('streamId') streamId: string
  ) {
    return this.classTeacherService.getNotifications(tenantId, userId, streamId);
  }

  @Get('reports')
  @Permissions('academics:read')
  getReports(
    @Headers('x-tenant-id') tenantId: string,
    @Headers('x-user-id') userId: string,
    @Query('streamId') streamId: string
  ) {
    return this.classTeacherService.getReports(tenantId, userId, streamId);
  }

  @Get('settings')
  @Permissions('academics:read')
  getSettings(
    @Headers('x-tenant-id') tenantId: string,
    @Headers('x-user-id') userId: string,
    @Query('streamId') streamId: string
  ) {
    return this.classTeacherService.getSettings(tenantId, userId, streamId);
  }
}
