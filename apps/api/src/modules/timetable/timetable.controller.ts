import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';

import { Permissions } from '../../auth/decorators/permissions.decorator';
import { RequiresModule } from '../module-access/module-access.decorator';
import {
  CreateTimetableSlotDto,
  PublishTimetableVersionDto,
  ReviseTimetableVersionDto,
  UpdateTimetableSlotDto,
} from './dto/timetable.dto';
import { TimetableService } from './timetable.service';

@Controller('timetable')
@RequiresModule('timetable')
export class TimetableController {
  constructor(private readonly timetableService: TimetableService) {}

  @Post('slots')
  @Permissions('timetable:write')
  createSlot(@Body() dto: CreateTimetableSlotDto) {
    return this.timetableService.createSlot(dto);
  }

  @Patch('slots/:slotId')
  @Permissions('timetable:write')
  updateSlot(@Param('slotId') slotId: string, @Body() dto: UpdateTimetableSlotDto) {
    return this.timetableService.updateSlot(slotId, dto);
  }

  @Delete('slots/:slotId')
  @Permissions('timetable:write')
  cancelSlot(@Param('slotId') slotId: string) {
    return this.timetableService.cancelSlot(slotId);
  }

  @Post('versions/publish')
  @Permissions('timetable:write')
  publishVersion(@Body() dto: PublishTimetableVersionDto) {
    return this.timetableService.publishVersion(dto);
  }

  @Post('versions/revise')
  @Permissions('timetable:write')
  createRevision(@Body() dto: ReviseTimetableVersionDto) {
    return this.timetableService.createRevision(dto);
  }

  @Get('planner')
  @Permissions('timetable:read')
  getPlanner(@Query() query: Record<string, string | undefined>) {
    return this.timetableService.getPlanner(query);
  }

  @Get('published')
  @Permissions('timetable:read')
  listPublishedSchedules(@Query() query: Record<string, string | undefined>) {
    return this.timetableService.listPublishedSchedules(query);
  }

  @Get('my-schedule')
  @Permissions('timetable:read', 'academics:read')
  getMySchedule(@Query() query: Record<string, string | undefined>) {
    return this.timetableService.getMySchedule(query);
  }

  @Get('dashboard')
  @Permissions('timetable:read')
  getTimetableDashboard(@Query() query: Record<string, string | undefined>) {
    return this.timetableService.getTimetableDashboard(query);
  }
}
