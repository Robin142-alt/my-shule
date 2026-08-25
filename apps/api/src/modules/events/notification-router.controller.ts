import { Controller, Get, Param, Post, UnauthorizedException } from '@nestjs/common';

import { Permissions } from '../../auth/decorators/permissions.decorator';
import { RequestContextService } from '../../common/request-context/request-context.service';
import { NotificationRouterService } from './notification-router.service';

type InboxPrincipal = {
  tenantId: string;
  userId: string;
  role: string;
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

@Controller('workflow/inbox')
export class NotificationRouterController {
  constructor(
    private readonly notificationRouterService: NotificationRouterService,
    private readonly requestContext: RequestContextService,
  ) {}

  @Get('notifications')
  @Permissions('events:read')
  async getNotifications() {
    const principal = this.requirePrincipal();
    return this.notificationRouterService.getUserNotifications(
      principal.tenantId,
      principal.userId,
      principal.role,
    );
  }

  @Get('tasks')
  @Permissions('events:read')
  async getTasks() {
    const principal = this.requirePrincipal();
    return this.notificationRouterService.getUserTasks(
      principal.tenantId,
      principal.userId,
      principal.role,
    );
  }

  @Get('approvals')
  @Permissions('events:read')
  async getApprovals() {
    const principal = this.requirePrincipal();
    return this.notificationRouterService.getPendingApprovals(
      principal.tenantId,
      principal.userId,
      principal.role,
    );
  }

  @Post('notifications/:id/read')
  @Permissions('events:write')
  async markNotificationRead(@Param('id') id: string) {
    const principal = this.requirePrincipal();
    await this.notificationRouterService.markNotificationRead(
      principal.tenantId,
      principal.userId,
      principal.role,
      id,
    );
    return { success: true };
  }

  @Post('tasks/:id/complete')
  @Permissions('events:write')
  async markTaskCompleted(@Param('id') id: string) {
    const principal = this.requirePrincipal();
    await this.notificationRouterService.markTaskCompleted(
      principal.tenantId,
      principal.userId,
      principal.role,
      id,
    );
    return { success: true };
  }

  private requirePrincipal(): InboxPrincipal {
    const store = this.requestContext.requireStore();
    if (!store.is_authenticated || !store.tenant_id || !store.user_id || !store.role) {
      throw new UnauthorizedException('An authenticated school role is required');
    }
    if (!UUID_PATTERN.test(store.user_id)) {
      throw new UnauthorizedException('The authenticated school user is invalid');
    }

    return {
      tenantId: store.tenant_id,
      userId: store.user_id,
      role: store.role,
    };
  }
}
