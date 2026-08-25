import { Body, Controller, Get, Post } from '@nestjs/common';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { RequiresModule } from '../module-access/module-access.decorator';
import { TeacherCommandService } from './teacher-command.service';

@Controller('admin-command/teacher')
@RequiresModule('academics')
@Roles('teacher')
@Permissions('teacher:read')
export class TeacherCommandController {
  constructor(private readonly service: TeacherCommandService) {}

  @Get('profile')
  getProfile() {
    return this.service.getProfile();
  }

  @Get('academic-setup')
  getAcademicSetup() {
    return this.service.getAcademicSetup();
  }

  @Get('subject-allocations')
  getSubjectAllocations() {
    return this.service.getSubjectAllocations();
  }

  @Get('syllabus-coverage')
  getSyllabusCoverage() {
    return this.service.getSyllabusCoverage();
  }

  @Get('lesson-plans')
  getLessonPlans() {
    return this.service.getLessonPlans();
  }

  @Get('resources')
  getResources() {
    return this.service.getResources();
  }

  @Get('mark-entry')
  getMarkEntry() {
    return this.service.getMarkEntry();
  }

  @Get('cbc-assessments')
  getCBCAssessments() {
    return this.service.getCBCAssessments();
  }

  @Get('learner-progress')
  getLearnerProgress() {
    return this.service.getLearnerProgress();
  }

  @Get('attendance')
  getAttendance() {
    return this.service.getAttendance();
  }

  @Get('student-notes')
  getStudentNotes() {
    return this.service.getStudentNotes();
  }

  @Get('clubs')
  getClubs() {
    return this.service.getClubs();
  }

  @Get('invigilation')
  getInvigilation() {
    return this.service.getInvigilation();
  }

  @Get('store-requests')
  getStoreRequests() {
    return this.service.getStoreRequests();
  }

  @Post('store-requests')
  @Permissions('teacher:write')
  createStoreRequest(@Body() dto: any) {
    return this.service.createStoreRequest(dto);
  }

  @Get('resource-requests')
  getResourceRequests() {
    return this.service.getResourceRequests();
  }

  @Get('messages')
  getMessages() {
    return this.service.getMessages();
  }

  @Get('message-recipients')
  getMessageRecipients() {
    return this.service.getParentMessageRecipients();
  }

  @Post('messages')
  @Permissions('teacher:write')
  sendMessage(@Body() dto: any) {
    return this.service.sendParentMessage(dto);
  }

  @Get('notifications')
  getNotifications() {
    return this.service.getNotifications();
  }

  @Get('reports')
  getReports() {
    return this.service.getReports();
  }

  @Get('utilities')
  getUtilities() {
    return this.service.getUtilities();
  }
}
