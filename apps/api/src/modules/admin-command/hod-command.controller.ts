import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import { RequiresModule } from '../module-access/module-access.decorator';
import { HodCommandService } from './hod-command.service';

@Controller('admin-command/hod')
@RequiresModule('academics')
@Permissions('academics:read')
export class HODCommandController {
  constructor(private readonly service: HodCommandService) {}

  @Get('overview')
  getOverview() {
    return this.service.getOverview();
  }

  @Get('department-overview')
  getDepartmentOverview() {
    return this.service.getDepartmentOverview();
  }

  @Get('review-queue')
  getReviewQueue() {
    return this.service.getReviewQueue();
  }

  @Get('subject-allocation')
  getSubjectAllocation() {
    return this.service.getSubjectAllocation();
  }

  @Get('department-teachers')
  getDepartmentTeachers() {
    return this.service.getDepartmentTeachers();
  }

  @Get('lesson-plans')
  getLessonPlans() {
    return this.service.getLessonPlans();
  }

  @Get('coverage-review')
  getCoverageReview() {
    return this.service.getCoverageReview();
  }

  @Get('marks-moderation')
  getMarksModeration() {
    return this.service.getMarksModeration();
  }

  @Get('resource-requests')
  getResourceRequests() {
    return this.service.getResourceRequests();
  }

  @Get('reports')
  getReports() {
    return this.service.getReports();
  }

  @Post('requests')
  @Permissions('academics:write')
  createDepartmentRequest(@Body() dto: any) {
    return this.service.recordHodAction('request', dto);
  }

  @Post('actions')
  @Permissions('academics:write')
  recordAction(@Body() dto: any) {
    return this.service.recordHodAction(dto?.action ?? 'action_recorded', dto);
  }

  @Post('subject-allocation')
  @Permissions('academics:write')
  createSubjectAllocation(@Body() dto: any) {
    return this.service.createSubjectAllocation(dto);
  }

  @Post('subject-allocation/revoke')
  @Permissions('academics:write')
  requestSubjectAllocationRevocation(@Body() dto: any) {
    return this.service.requestSubjectAllocationRevocation(dto);
  }

  @Post('roster-review')
  @Permissions('academics:write')
  recordRosterReview(@Body() dto: any) {
    return this.service.recordRosterReview(dto);
  }

  @Post('department-meetings')
  @Permissions('academics:write')
  logDepartmentMeeting(@Body() dto: any) {
    return this.service.logDepartmentMeeting(dto);
  }

  @Post('review-queue/:id/approve')
  @Permissions('academics:write')
  approveReviewItem(@Param('id') id: string, @Body() dto: any) {
    return this.service.recordHodAction('review_approved', { ...dto, id }, id);
  }

  @Post('review-queue/:id/reject')
  @Permissions('academics:write')
  rejectReviewItem(@Param('id') id: string, @Body() dto: any) {
    return this.service.recordHodAction('review_rejected', { ...dto, id }, id);
  }

  @Post('reports/generate')
  @Permissions('academics:write')
  generateReport(@Body() dto: any) {
    return this.service.generateReport(dto);
  }
}
