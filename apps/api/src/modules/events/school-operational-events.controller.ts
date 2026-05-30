import { Body, Controller, HttpCode, Post } from '@nestjs/common';

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
}
