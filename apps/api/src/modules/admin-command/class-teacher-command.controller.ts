import { Controller, Get, Post, Body } from '@nestjs/common';
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

  @Get('reports')
  getReports() {
    return this.service.getReports();
  }

  @Post('reports/generate')
  @Permissions('teacher:write')
  generateReport(@Body() dto: any) {
    return this.service.generateReport(dto);
  }
}
