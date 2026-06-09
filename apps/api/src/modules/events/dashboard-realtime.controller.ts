import { Controller, Get, Query, Sse } from '@nestjs/common';

import { Permissions } from '../../auth/decorators/permissions.decorator';
import { DashboardRealtimeService } from './dashboard-realtime.service';

@Controller('events/dashboard')
export class DashboardRealtimeController {
  constructor(private readonly dashboardRealtimeService: DashboardRealtimeService) {}

  @Get('snapshot')
  @Permissions('auth:read')
  getDashboardSnapshot(
    @Query('since') since?: string,
    @Query('limit') limit?: string,
  ) {
    return this.dashboardRealtimeService.getCurrentTenantSnapshot({
      since: since?.trim() || null,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Sse('stream')
  @Permissions('auth:read')
  streamDashboardEvents() {
    return this.dashboardRealtimeService.streamCurrentTenantEvents();
  }
}
