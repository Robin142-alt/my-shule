import { Controller, Get, Patch, Param, Query, UnauthorizedException, UseGuards } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { RequestContextService } from '../../common/request-context/request-context.service';

import { Permissions } from '../../auth/decorators/permissions.decorator';

@Controller('v1/notifications')
@UseGuards(JwtAuthGuard)
@Permissions('events:read')
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly requestContext: RequestContextService,
  ) {}

  @Get()
  async getUserNotifications(
    @Query('status') status?: string,
    @Query('module') module?: string,
    @Query('limit') limit?: string,
    @Query('skip') skip?: string,
  ) {
    const principal = this.requirePrincipal();

    return this.notificationsService.getUserNotifications(principal.tenantId, principal.userId, principal.role, {
      status,
      module,
      limit,
      skip,
    });
  }

  @Get('badges')
  async getBadges() {
    const principal = this.requirePrincipal();

    return this.notificationsService.getBadges(principal.tenantId, principal.userId, principal.role);
  }

  @Patch('read-all')
  @Permissions('events:write')
  async markAllAsRead() {
    const principal = this.requirePrincipal();

    return this.notificationsService.markAllAsRead(principal.tenantId, principal.userId, principal.role);
  }

  @Patch(':id/read')
  @Permissions('events:write')
  async markAsRead(@Param('id') id: string) {
    const principal = this.requirePrincipal();

    return this.notificationsService.safeMarkAsRead(
      id,
      principal.tenantId,
      principal.userId,
      principal.role,
    );
  }

  @Patch(':id/dismiss')
  @Permissions('events:write')
  async dismiss(@Param('id') id: string) {
    const principal = this.requirePrincipal();

    return this.notificationsService.dismiss(id, principal.tenantId, principal.userId, principal.role);
  }

  @Patch(':id/action-taken')
  @Permissions('events:write')
  async markActionTaken(@Param('id') id: string) {
    const principal = this.requirePrincipal();

    return this.notificationsService.markActionTaken(
      id,
      principal.tenantId,
      principal.userId,
      principal.role,
    );
  }

  private requirePrincipal(): { tenantId: string; userId: string; role: string } {
    const store = this.requestContext.requireStore();
    if (!store.is_authenticated || !store.tenant_id || !store.user_id || !store.role) {
      throw new UnauthorizedException('An authenticated school role is required');
    }

    return {
      tenantId: store.tenant_id,
      userId: store.user_id,
      role: store.role,
    };
  }
}
