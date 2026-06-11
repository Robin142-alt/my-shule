import { Controller, Get, Post, Patch, Param, Body, UseGuards, Request } from '@nestjs/common';
import { GradeMasterService } from './grade-master.service';
import { Permissions } from '../../auth/decorators/permissions.decorator';

@Controller('api/grade-master')
export class GradeMasterController {
  constructor(private readonly gradeMasterService: GradeMasterService) {}

  @Get('overview')
  @Permissions('grade_master:read')
  getOverview() {
    return this.gradeMasterService.getOverview('tenant-1', 'school-1', 'grade-1');
  }

  @Get('learners')
  @Permissions('grade_master:read')
  getLearners() {
    return this.gradeMasterService.getLearners('tenant-1', 'school-1', 'grade-1');
  }

  @Get('streams')
  @Permissions('grade_master:read')
  getStreams() {
    return this.gradeMasterService.getStreams('tenant-1', 'school-1', 'grade-1');
  }

  @Get('attendance')
  @Permissions('grade_master:read')
  getAttendance() {
    return this.gradeMasterService.getAttendance('tenant-1', 'school-1', 'grade-1');
  }

  @Get('academics')
  @Permissions('grade_master:read')
  getAcademics() {
    return this.gradeMasterService.getAcademics('tenant-1', 'school-1', 'grade-1');
  }

  @Get('report-readiness')
  @Permissions('grade_master:read')
  getReportReadiness() {
    return this.gradeMasterService.getReportReadiness('tenant-1', 'school-1', 'grade-1');
  }

  @Get('discipline')
  @Permissions('grade_master:read')
  getDiscipline() {
    return this.gradeMasterService.getDiscipline('tenant-1', 'school-1', 'grade-1');
  }

  @Get('welfare')
  @Permissions('grade_master:read')
  getWelfare() {
    return this.gradeMasterService.getWelfare('tenant-1', 'school-1', 'grade-1');
  }

  @Get('fees-watchlist')
  @Permissions('grade_master:read')
  getFeesWatchlist() {
    return this.gradeMasterService.getFeesWatchlist('tenant-1', 'school-1', 'grade-1');
  }

  @Get('communications')
  @Permissions('grade_master:read')
  getCommunications() {
    return this.gradeMasterService.getCommunications('tenant-1', 'school-1', 'grade-1');
  }

  @Get('meetings')
  @Permissions('grade_master:read')
  getMeetings() {
    return this.gradeMasterService.getMeetings('tenant-1', 'school-1', 'grade-1');
  }

  @Get('requests')
  @Permissions('grade_master:read')
  getRequests() {
    return this.gradeMasterService.getRequests('tenant-1', 'school-1', 'grade-1');
  }

  @Get('reports')
  @Permissions('grade_master:read')
  getReports() {
    return this.gradeMasterService.getReports('tenant-1', 'school-1', 'grade-1');
  }

  @Get('notifications')
  @Permissions('grade_master:read')
  getNotifications() {
    return this.gradeMasterService.getNotifications('tenant-1', 'school-1', 'grade-1');
  }

  @Post('notes')
  @Permissions('grade_master:write')
  createNote() {
    return { success: true };
  }

  @Post('academic-interventions')
  @Permissions('grade_master:write')
  createIntervention() {
    return { success: true };
  }
}
