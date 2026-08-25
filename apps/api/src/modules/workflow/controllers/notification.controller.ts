import {
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UnauthorizedException,
} from '@nestjs/common';

import { Permissions } from '../../../auth/decorators/permissions.decorator';
import { RequestContextService } from '../../../common/request-context/request-context.service';
import { NotificationsService } from '../../notifications/notifications.service';

@Controller('notifications')
export class NotificationController {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly requestContext: RequestContextService,
  ) {}

  @Permissions('events:read')
  @Get()
  async getNotifications(
    @Query('status') status?: string,
    @Query('module') module?: string,
    @Query('limit') limit?: string,
    @Query('skip') skip?: string,
  ) {
    const principal = this.requirePrincipal();
    return this.notificationsService.getUserNotifications(
      principal.tenantId,
      principal.userId,
      principal.role,
      { status, module, limit, skip },
    );
  }

  @Permissions('events:write')
  @Patch(':id/read')
  async markAsRead(@Param('id') id: string) {
    const principal = this.requirePrincipal();
    return this.notificationsService.safeMarkAsRead(
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
