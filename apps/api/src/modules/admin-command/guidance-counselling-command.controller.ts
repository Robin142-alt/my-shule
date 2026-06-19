import { Controller, Get, Post, Body } from '@nestjs/common';
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

  @Get('referrals')
  getReferrals() {
    return this.service.getReferrals();
  }

  @Get('welfare-notes')
  getWelfareNotes() {
    return this.service.getWelfareNotes();
  }

  @Get('follow-ups')
  getFollowUps() {
    return this.service.getFollowUps();
  }

  @Get('parent-engagement')
  getParentEngagement() {
    return this.service.getParentEngagement();
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
}
