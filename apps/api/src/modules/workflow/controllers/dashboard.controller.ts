import {
  BadRequestException,
  Controller,
  ForbiddenException,
  Get,
  Query,
  UnauthorizedException,
} from '@nestjs/common';

import { Permissions } from '../../../auth/decorators/permissions.decorator';
import { RequestContextService } from '../../../common/request-context/request-context.service';
import { DashboardFeedService } from '../services/dashboard-feed.service';

type DashboardPrincipal = {
  tenantId: string;
  userId: string;
  role: string;
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

@Controller('dashboard')
export class DashboardController {
  constructor(
    private readonly dashboardFeedService: DashboardFeedService,
    private readonly requestContext: RequestContextService,
  ) {}

  @Permissions('events:read')
  @Get('feed')
  async getFeed(
    @Query('role') requestedRole?: string,
    @Query('limit') rawLimit?: string,
    @Query('offset') rawOffset?: string,
  ) {
    const principal = this.requirePrincipal(requestedRole);
    return this.dashboardFeedService.getDashboardFeed({
      schoolId: principal.tenantId,
      userId: principal.userId,
      role: principal.role,
      limit: this.parseInteger(rawLimit, 20, 1, 100, 'limit'),
      offset: this.parseInteger(rawOffset, 0, 0, 10_000, 'offset'),
    });
  }

  @Permissions('events:read')
  @Get('communication-summary')
  async getSummary(@Query('role') requestedRole?: string) {
    const principal = this.requirePrincipal(requestedRole);
    return this.dashboardFeedService.getDashboardSummary({
      schoolId: principal.tenantId,
      userId: principal.userId,
      role: principal.role,
    });
  }

  private requirePrincipal(requestedRole?: string): DashboardPrincipal {
    const store = this.requestContext.requireStore();
    if (!store.is_authenticated || !store.tenant_id || !store.user_id || !store.role) {
      throw new UnauthorizedException('An authenticated school role is required');
    }
    if (!UUID_PATTERN.test(store.user_id)) {
      throw new UnauthorizedException('The authenticated school user is invalid');
    }

    if (requestedRole && this.normalizeRole(requestedRole) !== this.normalizeRole(store.role)) {
      throw new ForbiddenException('The requested dashboard role is not the active school role');
    }

    return {
      tenantId: store.tenant_id,
      userId: store.user_id,
      role: store.role,
    };
  }

  private parseInteger(
    value: string | undefined,
    fallback: number,
    minimum: number,
    maximum: number,
    label: string,
  ): number {
    if (value === undefined || value === '') {
      return fallback;
    }
    if (!/^\d+$/.test(value)) {
      throw new BadRequestException(`${label} must be a whole number`);
    }
    const parsed = Number.parseInt(value, 10);
    if (parsed < minimum || parsed > maximum) {
      throw new BadRequestException(`${label} must be between ${minimum} and ${maximum}`);
    }
    return parsed;
  }

  private normalizeRole(value: string): string {
    return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  }
}
