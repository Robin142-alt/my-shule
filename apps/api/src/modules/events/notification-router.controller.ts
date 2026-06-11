import { Controller, Get, Param, Post, Req } from '@nestjs/common';
import { RequestContextService } from '../../common/request-context/request-context.service';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import { NotificationRouterService } from './notification-router.service';

@Controller('workflow/inbox')
export class NotificationRouterController {
  constructor(
    private readonly notificationRouterService: NotificationRouterService,
    private readonly requestContext: RequestContextService,
  ) {}

  @Get('notifications')
  @Permissions('events:read')
  async getNotifications() {
    const store = this.requestContext.requireStore();
    return this.notificationRouterService.getUserNotifications(
      store.tenant_id!,
      store.user_id,
      store.role || 'UNKNOWN'
    );
  }

  @Get('tasks')
  @Permissions('events:read')
  async getTasks() {
    const store = this.requestContext.requireStore();
    return this.notificationRouterService.getUserTasks(
      store.tenant_id!,
      store.user_id,
      store.role || 'UNKNOWN'
    );
  }

  @Get('approvals')
  @Permissions('events:read')
  async getApprovals() {
    const store = this.requestContext.requireStore();
    return this.notificationRouterService.getPendingApprovals(
      store.tenant_id!,
      store.user_id,
      store.role || 'UNKNOWN'
    );
  }

  @Post('notifications/:id/read')
  @Permissions('events:write')
  async markNotificationRead(@Param('id') id: string) {
    const store = this.requestContext.requireStore();
    await this.notificationRouterService.markNotificationRead(store.tenant_id!, id);
    return { success: true };
  }

  @Post('tasks/:id/complete')
  @Permissions('events:write')
  async markTaskCompleted(@Param('id') id: string) {
    const store = this.requestContext.requireStore();
    await this.notificationRouterService.markTaskCompleted(store.tenant_id!, id);
    return { success: true };
  }
}
