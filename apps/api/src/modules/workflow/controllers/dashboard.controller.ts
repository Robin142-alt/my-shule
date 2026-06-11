import { Controller, Get, Query, Req } from '@nestjs/common';
import { DashboardFeedService } from '../services/dashboard-feed.service';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardFeedService: DashboardFeedService) {}

  @Get('feed')
  async getFeed(@Query('role') role: string, @Query('limit') limit: number, @Query('offset') offset: number, @Req() req: any) {
    const tenantId = req.headers['x-tenant-id'] || req.user?.tenantId;
    const userId = req.user?.id;
    return this.dashboardFeedService.getDashboardFeed({
      schoolId: tenantId,
      userId,
      role,
      limit,
      offset
    });
  }

  @Get('summary')
  async getSummary(@Query('role') role: string, @Req() req: any) {
    const tenantId = req.headers['x-tenant-id'] || req.user?.tenantId;
    const userId = req.user?.id;
    return this.dashboardFeedService.getDashboardSummary({
      schoolId: tenantId,
      userId,
      role
    });
  }
}
