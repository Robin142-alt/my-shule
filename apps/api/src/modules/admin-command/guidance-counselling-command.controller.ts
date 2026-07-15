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

  @Post('sessions')
  @Permissions('counselling:write')
  createSession(@Body() dto: any) {
    return this.service.recordCounsellingAction('session.created', dto);
  }

  @Post('sessions/:id/complete')
  @Permissions('counselling:write')
  completeSession(@Param('id') id: string, @Body() dto: any) {
    return this.service.recordCounsellingAction('session.completed', dto, id);
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
    return this.service.recordCounsellingAction('welfare-note.created', dto);
  }

  @Post('welfare-notes/:id/flag')
  @Permissions('counselling:write')
  flagWelfareNote(@Param('id') id: string, @Body() dto: any) {
    return this.service.recordCounsellingAction('welfare-note.flagged', dto, id);
  }

  @Get('follow-ups')
  getFollowUps() {
    return this.service.getFollowUps();
  }

  @Post('follow-ups')
  @Permissions('counselling:write')
  createFollowUp(@Body() dto: any) {
    return this.service.recordCounsellingAction('follow-up.created', dto);
  }

  @Post('follow-ups/:id/done')
  @Permissions('counselling:write')
  completeFollowUp(@Param('id') id: string, @Body() dto: any) {
    return this.service.recordCounsellingAction('follow-up.completed', dto, id);
  }

  @Get('parent-engagement')
  getParentEngagement() {
    return this.service.getParentEngagement();
  }

  @Post('parent-engagement')
  @Permissions('counselling:write')
  createParentEngagement(@Body() dto: any) {
    return this.service.recordCounsellingAction('parent-engagement.created', dto);
  }

  @Post('parent-engagement/:id/notify')
  @Permissions('counselling:write')
  notifyParentEngagement(@Param('id') id: string, @Body() dto: any) {
    return this.service.recordCounsellingAction('parent-engagement.notified', dto, id);
  }

  @Get('reports')
  getReports() {
    return this.service.getReports();
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
