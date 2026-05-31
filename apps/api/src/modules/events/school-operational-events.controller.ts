import { Body, Controller, Get, HttpCode, Param, Post, Query } from '@nestjs/common';

import { Permissions } from '../../auth/decorators/permissions.decorator';
import {
  SchoolOperationalEventSyncDto,
  SchoolOperationalEventsService,
} from './school-operational-events.service';

@Controller('events')
export class SchoolOperationalEventsController {
  constructor(private readonly schoolOperationalEventsService: SchoolOperationalEventsService) {}

  @Post('school-operations')
  @HttpCode(202)
  @Permissions('auth:read')
  recordSchoolOperation(@Body() dto: SchoolOperationalEventSyncDto) {
    return this.schoolOperationalEventsService.recordSchoolOperation(dto);
  }

  @Get('notifications')
  @Permissions('auth:read')
  listNotifications(@Query('limit') limit?: string) {
    return this.schoolOperationalEventsService.listCurrentTenantNotifications({ limit });
  }

  @Post('notifications/:notificationId/read')
  @HttpCode(200)
  @Permissions('auth:read')
  markNotificationRead(@Param('notificationId') notificationId: string) {
    return this.schoolOperationalEventsService.markCurrentTenantNotificationRead(notificationId);
  }
}
