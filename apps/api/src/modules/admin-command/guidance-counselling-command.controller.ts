import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import { RequiresModule } from '../module-access/module-access.decorator';
import { GuidanceCounsellingCommandService } from './guidance-counselling-command.service';

@Controller('admin-command/guidance-counselling')
@RequiresModule('discipline')
@Permissions('counselling:read')
export class GuidanceCounsellingCommandController {
  constructor(private readonly service: GuidanceCounsellingCommandService) {}

  @Get('overview')
  getOverview() {
    return this.service.getOverview();
  }

  @Get('sessions')
  getSessions() {
    return this.service.getSessions();
  }

  @Get('options')
  getWorkspaceOptions() {
    return this.service.getWorkspaceOptions();
  }

  @Post('sessions')
  @Permissions('counselling:write')
  createSession(@Body() dto: any) {
    return this.service.createSession(dto);
  }

  @Post('sessions/:id/complete')
  @Permissions('counselling:write')
  completeSession(@Param('id') id: string, @Body() dto: any) {
    return this.service.completeSession(id, dto);
  }

  @Get('referrals')
  getReferrals() {
    return this.service.getReferrals();
  }

  @Get('referral-options')
  getReferralOptions() {
    return this.service.getReferralOptions();
  }

  @Post('referrals')
  @Permissions('counselling:write')
  createReferral(@Body() dto: any) {
    return this.service.createReferral(dto);
  }

  @Post('referrals/:id/status')
  @Permissions('counselling:write')
  updateReferralStatus(@Param('id') id: string, @Body() dto: any) {
    return this.service.updateReferralStatus(id, dto);
  }

  @Get('welfare-notes')
  getWelfareNotes() {
    return this.service.getWelfareNotes();
  }

  @Post('welfare-notes')
  @Permissions('counselling:write')
  createWelfareNote(@Body() dto: any) {
    return this.service.createWelfareNote(dto);
  }

  @Post('welfare-notes/:id/flag')
  @Permissions('counselling:write')
  flagWelfareNote(@Param('id') id: string, @Body() dto: any) {
    return this.service.flagWelfareNote(id, dto);
  }

  @Get('follow-ups')
  getFollowUps() {
    return this.service.getFollowUps();
  }

  @Post('follow-ups')
  @Permissions('counselling:write')
  createFollowUp(@Body() dto: any) {
    return this.service.createFollowUp(dto);
  }

  @Post('follow-ups/:id/done')
  @Permissions('counselling:write')
  completeFollowUp(@Param('id') id: string, @Body() dto: any) {
    return this.service.completeFollowUp(id, dto);
  }

  @Get('parent-engagement')
  getParentEngagement() {
    return this.service.getParentEngagement();
  }

  @Post('parent-engagement')
  @Permissions('counselling:write')
  createParentEngagement(@Body() dto: any) {
    return this.service.createParentEngagement(dto);
  }

  @Post('parent-engagement/:id/notify')
  @Permissions('counselling:write')
  notifyParentEngagement(@Param('id') id: string, @Body() dto: any) {
    return this.service.notifyParentEngagement(id, dto);
  }

  @Get('reports')
  getReports() {
    return this.service.getReports();
  }

  @Get('reports/:snapshotId/download')
  getReportDownload(@Param('snapshotId') snapshotId: string) {
    return this.service.getReportDownload(snapshotId);
  }

  @Post('reports/generate')
  @Permissions('counselling:write')
  generateReport(@Body() dto: any) {
    return this.service.generateReport(dto);
  }

  @Post('settings')
  @Permissions('counselling:write')
  saveSettings(@Body() dto: any) {
    return this.service.saveSettings(dto);
  }

  @Get('settings')
  getSettings() {
    return this.service.getSettings();
  }

  @Post('actions')
  @Permissions('counselling:write')
  recordAction(@Body() dto: any) {
    return this.service.recordCounsellingAction(
      String(dto?.action || 'workflow.action'),
      dto,
      dto?.entityId ?? dto?.id ?? null,
    );
  }
}
