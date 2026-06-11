import { Controller, Get, Query, Req } from '@nestjs/common';
import { DashboardFeedService } from '../services/dashboard-feed.service';

import { Permissions } from '../../../auth/decorators/permissions.decorator';
import { UnauthorizedException } from '@nestjs/common';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardFeedService: DashboardFeedService) {}

  @Permissions('auth:read')
  @Get('feed')
  async getFeed(@Query('role') role: string, @Query('limit') limit: number, @Query('offset') offset: number, @Req() req: any) {
    let tenantId = req.user?.tenantId || req.user?.tenant_id;
    const requestedTenantId = req.headers['x-tenant-id'];
    if (requestedTenantId && requestedTenantId !== tenantId) {
      if (req.user?.role !== 'platform_owner') {
        throw new UnauthorizedException('Cannot access another tenant data');
      }
      tenantId = requestedTenantId;
    }
    const userId = req.user?.id;
    return this.dashboardFeedService.getDashboardFeed({
      schoolId: tenantId,
      userId,
      role,
      limit,
      offset
    });
  }

  @Permissions('auth:read')
  @Get('summary')
  async getSummary(@Query('role') role: string, @Req() req: any) {
    let tenantId = req.user?.tenantId || req.user?.tenant_id;
    const requestedTenantId = req.headers['x-tenant-id'];
    if (requestedTenantId && requestedTenantId !== tenantId) {
      if (req.user?.role !== 'platform_owner') {
        throw new UnauthorizedException('Cannot access another tenant data');
      }
      tenantId = requestedTenantId;
    }
    const userId = req.user?.id;
    return this.dashboardFeedService.getDashboardSummary({
      schoolId: tenantId,
      userId,
      role
    });
  }
}

