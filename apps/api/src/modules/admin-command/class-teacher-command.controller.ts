import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import { RequiresModule } from '../module-access/module-access.decorator';
import { ClassTeacherCommandService } from './class-teacher-command.service';

@Controller('admin-command/class-teacher')
@RequiresModule('academics')
@Permissions('teacher:read')
export class ClassTeacherCommandController {
  constructor(private readonly service: ClassTeacherCommandService) {}

  @Get('overview')
  getOverview() {
    return this.service.getOverview();
  }

  @Get('my-class')
  getMyClass() {
    return this.service.getMyClass();
  }

  @Get('learner-profiles')
  getLearnerProfiles() {
    return this.service.getLearnerProfiles();
  }

  @Get('class-academics')
  getClassAcademics() {
    return this.service.getClassAcademics();
  }

  @Get('attendance-follow-up')
  getAttendanceFollowUp() {
    return this.service.getAttendanceFollowUp();
  }

  @Get('discipline-follow-up')
  getDisciplineFollowUp() {
    return this.service.getDisciplineFollowUp();
  }

  @Get('welfare-notes')
  getWelfareNotes() {
    return this.service.getWelfareNotes();
  }

  @Get('parent-contacts')
  getParentContacts() {
    return this.service.getParentContacts();
  }

  @Get('report-comments')
  getReportComments() {
    return this.service.getReportComments();
  }

  @Post('report-comments/submit-all')
  @Permissions('teacher:write')
  submitAllComments(@Body() dto: any) {
    return this.service.submitAllComments(dto);
  }

  @Post('report-comments/:studentId')
  @Permissions('teacher:write')
  saveReportComment(@Param('studentId') studentId: string, @Body() dto: any) {
    return this.service.saveReportComment(studentId, dto);
  }

  @Post('attendance-follow-up/:studentId/notify')
  @Permissions('teacher:write')
  notifyAttendanceParent(@Param('studentId') studentId: string, @Body() dto: any) {
    return this.service.notifyAttendanceParent(studentId, dto);
  }

  @Post('attendance-follow-up/:studentId/resolve')
  @Permissions('teacher:write')
  resolveAttendanceFollowUp(@Param('studentId') studentId: string) {
    return this.service.resolveAttendanceFollowUp(studentId);
  }

  @Post('discipline-follow-up/:incidentId/follow-up')
  @Permissions('teacher:write')
  addDisciplineFollowUp(@Param('incidentId') incidentId: string, @Body() dto: any) {
    return this.service.addDisciplineFollowUp(incidentId, dto);
  }

  @Post('discipline-follow-up/:incidentId/escalate')
  @Permissions('teacher:write')
  escalateDisciplineFollowUp(@Param('incidentId') incidentId: string) {
    return this.service.escalateDisciplineFollowUp(incidentId);
  }

  @Post('welfare-notes')
  @Permissions('teacher:write')
  createWelfareNote(@Body() dto: any) {
    return this.service.createWelfareNote(dto);
  }

  @Post('welfare-notes/:noteId/escalate')
  @Permissions('teacher:write')
  escalateWelfareNote(@Param('noteId') noteId: string) {
    return this.service.escalateWelfareNote(noteId);
  }

  @Post('parent-contacts/:parentId/message')
  @Permissions('teacher:write')
  messageParent(@Param('parentId') parentId: string, @Body() dto: any) {
    return this.service.messageParent(parentId, dto);
  }

  @Post('communications')
  @Permissions('teacher:write')
  sendClassCommunication(@Body() dto: any) {
    return this.service.sendClassCommunication(dto);
  }

  @Post('learner-profiles/:studentId/note')
  @Permissions('teacher:write')
  createLearnerNote(@Param('studentId') studentId: string, @Body() dto: any) {
    return this.service.createLearnerNote(studentId, dto);
  }

  @Post('meetings')
  @Permissions('teacher:write')
  scheduleMeeting(@Body() dto: any) {
    return this.service.scheduleMeeting(dto);
  }

  @Post('tasks')
  @Permissions('teacher:write')
  createTask(@Body() dto: any) {
    return this.service.createTask(dto);
  }

  @Post('tasks/:taskId/complete')
  @Permissions('teacher:write')
  completeTask(@Param('taskId') taskId: string) {
    return this.service.completeTask(taskId);
  }

  @Get('reports')
  getReports() {
    return this.service.getReports();
  }

  @Post('reports/generate')
  @Permissions('teacher:write')
  generateReport(@Body() dto: any) {
    return this.service.generateReport(dto);
  }

  @Get('reports/:snapshotId/download')
  @Permissions('teacher:read')
  downloadReport(@Param('snapshotId') snapshotId: string) {
    return this.service.downloadReport(snapshotId);
  }

  @Post('actions')
  @Permissions('teacher:write')
  recordAction(@Body() dto: any) {
    return this.service.recordAction(dto);
  }
}
