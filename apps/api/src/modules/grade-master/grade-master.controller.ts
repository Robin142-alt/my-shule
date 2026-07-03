import { Body, Controller, Get, Param, Post, Query, UnauthorizedException, UseGuards } from '@nestjs/common';

import { Permissions } from '../../auth/decorators/permissions.decorator';
import { RequestContextService } from '../../common/request-context/request-context.service';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { RbacGuard } from '../../guards/rbac.guard';
import { RequiresModule } from '../module-access/module-access.decorator';
import { GradeMasterService } from './grade-master.service';

@Controller('grade-master')
@UseGuards(JwtAuthGuard, RbacGuard)
@RequiresModule('academics')
export class GradeMasterController {
  constructor(
    private readonly gradeMasterService: GradeMasterService,
    private readonly requestContext: RequestContextService,
  ) {}

  private context() {
    const store = this.requestContext.requireStore();
    if (!store.tenant_id) {
      throw new UnauthorizedException('Tenant context is required');
    }
    if (!store.user_id) {
      throw new UnauthorizedException('User context is required');
    }
    return { tenantId: store.tenant_id, userId: store.user_id };
  }

  @Get('overview')
  @Permissions('academics:read')
  getOverview(@Query('gradeLevelId') gradeLevelId?: string) {
    const { tenantId, userId } = this.context();
    return this.gradeMasterService.getOverview(tenantId, userId, gradeLevelId);
  }

  @Get('learners')
  @Permissions('students:read')
  getLearners(@Query('gradeLevelId') gradeLevelId?: string) {
    const { tenantId, userId } = this.context();
    return this.gradeMasterService.getLearners(tenantId, userId, gradeLevelId);
  }

  @Get('streams')
  @Permissions('academics:read')
  getStreams(@Query('gradeLevelId') gradeLevelId?: string) {
    const { tenantId, userId } = this.context();
    return this.gradeMasterService.getStreams(tenantId, userId, gradeLevelId);
  }

  @Get('attendance')
  @Permissions('academics:read')
  getAttendance(@Query('gradeLevelId') gradeLevelId?: string) {
    const { tenantId, userId } = this.context();
    return this.gradeMasterService.getAttendance(tenantId, userId, gradeLevelId);
  }

  @Get('academics')
  @Permissions('academics:read')
  getAcademics(@Query('gradeLevelId') gradeLevelId?: string) {
    const { tenantId, userId } = this.context();
    return this.gradeMasterService.getAcademics(tenantId, userId, gradeLevelId);
  }

  @Get('report-readiness')
  @Permissions('reports:read')
  getReportReadiness(@Query('gradeLevelId') gradeLevelId?: string) {
    const { tenantId, userId } = this.context();
    return this.gradeMasterService.getReportReadiness(tenantId, userId, gradeLevelId);
  }

  @Get('discipline')
  @Permissions('discipline:read')
  getDiscipline(@Query('gradeLevelId') gradeLevelId?: string) {
    const { tenantId, userId } = this.context();
    return this.gradeMasterService.getDiscipline(tenantId, userId, gradeLevelId);
  }

  @Get('welfare')
  @Permissions('students:read')
  getWelfare(@Query('gradeLevelId') gradeLevelId?: string) {
    const { tenantId, userId } = this.context();
    return this.gradeMasterService.getWelfare(tenantId, userId, gradeLevelId);
  }

  @Get('fees-watchlist')
  @Permissions('students:read')
  getFeesWatchlist(@Query('gradeLevelId') gradeLevelId?: string) {
    const { tenantId, userId } = this.context();
    return this.gradeMasterService.getFeesWatchlist(tenantId, userId, gradeLevelId);
  }

  @Get('communications')
  @Permissions('academics:read')
  getCommunications(@Query('gradeLevelId') gradeLevelId?: string) {
    const { tenantId, userId } = this.context();
    return this.gradeMasterService.getCommunications(tenantId, userId, gradeLevelId);
  }

  @Get('meetings')
  @Permissions('academics:read')
  getMeetings(@Query('gradeLevelId') gradeLevelId?: string) {
    const { tenantId, userId } = this.context();
    return this.gradeMasterService.getMeetings(tenantId, userId, gradeLevelId);
  }

  @Get('timetable')
  @Permissions('academics:read')
  getTimetable(@Query('gradeLevelId') gradeLevelId?: string) {
    const { tenantId, userId } = this.context();
    return this.gradeMasterService.getTimetable(tenantId, userId, gradeLevelId);
  }

  @Get('assignments')
  @Permissions('academics:read')
  getAssignments(@Query('gradeLevelId') gradeLevelId?: string) {
    const { tenantId, userId } = this.context();
    return this.gradeMasterService.getAssignments(tenantId, userId, gradeLevelId);
  }

  @Get('requests')
  @Permissions('academics:read')
  getRequests(@Query('gradeLevelId') gradeLevelId?: string) {
    const { tenantId, userId } = this.context();
    return this.gradeMasterService.getRequests(tenantId, userId, gradeLevelId);
  }

  @Get('reports')
  @Permissions('reports:read')
  getReports(@Query('gradeLevelId') gradeLevelId?: string) {
    const { tenantId, userId } = this.context();
    return this.gradeMasterService.getReports(tenantId, userId, gradeLevelId);
  }

  @Get('reports/:snapshotId/download')
  @Permissions('reports:read')
  downloadReport(@Param('snapshotId') snapshotId: string) {
    const { tenantId } = this.context();
    return this.gradeMasterService.downloadReport(tenantId, snapshotId);
  }

  @Get('notifications')
  @Permissions('academics:read')
  getNotifications(@Query('gradeLevelId') gradeLevelId?: string) {
    const { tenantId, userId } = this.context();
    return this.gradeMasterService.getNotifications(tenantId, userId, gradeLevelId);
  }

  @Post('actions')
  @Permissions('academics:write')
  recordAction(@Body() body: any) {
    const { tenantId, userId } = this.context();
    return this.gradeMasterService.recordAction(tenantId, userId, body);
  }
}
