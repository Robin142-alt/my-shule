import { Body, Controller, Get, HttpCode, Param, Post, Query } from '@nestjs/common';

import { Permissions } from '../../auth/decorators/permissions.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { SCHOOL_EVENT_PUBLISHER_ROLE_CODES } from '../../auth/auth.constants';
import {
  SchoolOperationalEventSyncDto,
  SchoolOperationalEventsService,
} from './school-operational-events.service';

@Controller('events')
export class SchoolOperationalEventsController {
  constructor(private readonly schoolOperationalEventsService: SchoolOperationalEventsService) {}

  @Post('school-operations')
  @HttpCode(202)
  @Permissions('events:publish')
  @Roles(...SCHOOL_EVENT_PUBLISHER_ROLE_CODES)
  recordSchoolOperation(@Body() dto: SchoolOperationalEventSyncDto) {
    return this.schoolOperationalEventsService.recordSchoolOperation(dto);
  }

  @Get('notifications')
  @Permissions('events:read')
  listNotifications(@Query('limit') limit?: string) {
    return this.schoolOperationalEventsService.listCurrentTenantNotifications({ limit });
  }

  @Post('notifications/:notificationId/read')
  @HttpCode(200)
  @Permissions('events:write')
  markNotificationRead(@Param('notificationId') notificationId: string) {
    return this.schoolOperationalEventsService.markCurrentTenantNotificationRead(notificationId);
  }
}
