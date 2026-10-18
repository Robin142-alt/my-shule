import { Body, Controller, Get, Post, Param, ParseUUIDPipe, Query, StreamableFile, UnauthorizedException, UploadedFile, UseInterceptors } from '@nestjs/common';

import { Permissions } from '../../auth/decorators/permissions.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { RequestContextService } from '../../common/request-context/request-context.service';
import { SkipResponseEnvelope } from '../../common/decorators/skip-response-envelope.decorator';
import { StreamingUploadInterceptor } from '../../common/uploads/streaming-upload.interceptor';
import type { UploadFileMetadata } from '../../common/uploads/upload-policy';
import { RequiresModule } from '../module-access/module-access.decorator';
import { ClassTeacherService } from './class-teacher.service';
import { SaveTeacherMarksDto } from './dto/class-teacher.dto';
import { CreateTeacherHomeworkDto, RaiseTeacherConcernDto, ReviewTeacherSubmissionDto, RecordTeacherLessonDto } from './dto/teacher-workflow.dto';
import { TeacherWorkflowService } from './teacher-workflow.service';

@Controller('class-teacher')
@RequiresModule('academics')
@Roles('teacher', 'class_teacher')
@Permissions('teacher:read')
export class ClassTeacherController {
  constructor(
    private readonly classTeacherService: ClassTeacherService,
    private readonly requestContext: RequestContextService,
    private readonly teacherWorkflows: TeacherWorkflowService,
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
  @Roles('class_teacher')
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
  @Roles('class_teacher')
  getRegister(@Query('streamId') streamId: string) {
    const { tenantId, userId } = this.currentScope();
    return this.classTeacherService.getRegister(tenantId, userId, streamId);
  }

  @Get('pending-attendance')
  @Roles('class_teacher')
  getPendingAttendance() {
    const { tenantId, userId } = this.currentScope();
    return this.classTeacherService.getPendingAttendance(tenantId, userId);
  }

  @Get('pending-marks')
  @RequiresModule('exams')
  getPendingMarks(
    @Query('includeUnavailable') includeUnavailable?: string,
    @Query('includeSubmitted') includeSubmitted = 'false',
  ) {
    const { tenantId, userId } = this.currentScope();
    return this.classTeacherService.getPendingMarks(tenantId, userId, includeUnavailable === 'true', includeSubmitted === 'true');
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
  @Roles('class_teacher')
  getClassRegisterOverview() {
    const { tenantId, userId } = this.currentScope();
    return this.classTeacherService.getClassRegisterOverview(tenantId, userId);
  }

  @Get('discipline-concerns')
  @RequiresModule('discipline')
  getDisciplineConcerns() {
    return this.teacherWorkflows.concerns();
  }

  @Get('discipline-concerns/options')
  @RequiresModule('discipline')
  getConcernOptions() { return this.teacherWorkflows.concernOptions(); }

  @Get('discipline-concerns/:id')
  @RequiresModule('discipline')
  getConcernDetail(@Param('id', ParseUUIDPipe) id: string) { return this.teacherWorkflows.concernDetail(id); }

  @Post('discipline-concerns')
  @RequiresModule('discipline')
  @Permissions('teacher:write')
  saveDisciplineConcern(@Body() body: RaiseTeacherConcernDto) {
    return this.teacherWorkflows.raiseConcern(body);
  }

  @Get('homework/:id/submissions')
  getHomeworkSubmissions(@Param('id', ParseUUIDPipe) id: string) { return this.teacherWorkflows.submissions(id); }

  @Post('homework/:id/submissions')
  @Permissions('teacher:write')
  reviewHomeworkSubmission(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ReviewTeacherSubmissionDto) {
    return this.teacherWorkflows.reviewSubmission(id, dto);
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
  @Roles('class_teacher')
  getAttendance(@Query('streamId') streamId: string) {
    const { tenantId, userId } = this.currentScope();
    return this.classTeacherService.getAttendance(tenantId, userId, streamId);
  }

  @Post('attendance')
  @Roles('class_teacher')
  @Permissions('teacher:write')
  saveAttendance(@Body() body: { streamId: string; records: any[] }) {
    const { tenantId, userId } = this.currentScope();
    return this.classTeacherService.saveAttendance(tenantId, userId, body.streamId, body.records);
  }

  @Post('marks')
  @RequiresModule('exams')
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
  saveHomework(@Body() body: CreateTeacherHomeworkDto) {
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
  saveLessonLog(@Body() body: RecordTeacherLessonDto) {
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

  @Get('report-card-signature')
  @RequiresModule('exams')
  getReportCardSignature(@Query('streamId') streamId: string) {
    const { tenantId, userId } = this.currentScope();
    return this.classTeacherService.getReportCardSignature(tenantId, userId, streamId);
  }

  @Post('report-card-signature')
  @RequiresModule('exams')
  @Permissions('teacher:write')
  @UseInterceptors(StreamingUploadInterceptor('signature', 2 * 1024 * 1024))
  uploadReportCardSignature(
    @Query('streamId') streamId: string,
    @UploadedFile() file: UploadFileMetadata,
  ) {
    const { tenantId, userId } = this.currentScope();
    return this.classTeacherService.uploadReportCardSignature(tenantId, userId, streamId, file);
  }

  @Get('report-card-signature/content')
  @RequiresModule('exams')
  @SkipResponseEnvelope()
  async getReportCardSignatureContent(@Query('streamId') streamId: string) {
    const { tenantId, userId } = this.currentScope();
    const signature = await this.classTeacherService.getReportCardSignatureContent(tenantId, userId, streamId);

    return new StreamableFile(signature.content, {
      type: signature.mime_type,
      disposition: `inline; filename="${signature.original_file_name}"`,
      length: signature.size_bytes,
    });
  }

  @Post('settings')
  @Permissions('teacher:write')
  saveSettings(@Query('streamId') streamId: string, @Body() body: any) {
    const { tenantId, userId } = this.currentScope();
    return this.classTeacherService.saveSettings(tenantId, userId, streamId, body);
  }
}
