import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';

import { Permissions } from '../../auth/decorators/permissions.decorator';
import { RequiresModule } from '../module-access/module-access.decorator';
import {
  AssignReliefDto,
  AutoFixTimetableDto,
  BulkSetTeacherAvailabilityDto,
  BulkUpsertRequirementsDto,
  CancelTimetableSlotDto,
  CancelReliefDto,
  ConfigureTimetableDto,
  CopyTimetableDto,
  CreateTimetableResourceDto,
  CreateTimetableSlotDto,
  FindValidSlotsDto,
  GenerateTimetableDto,
  LockTimetableSlotDto,
  MoveTimetableSlotDto,
  PlaceUnscheduledLessonDto,
  PortalTimetableQueryDto,
  PublishTimetableVersionDto,
  RegenerateTimetableDto,
  ReliefAffectedQueryDto,
  ReliefCandidatesQueryDto,
  ReviseTimetableVersionDto,
  TimetableExportQueryDto,
  TimetableHistoryQueryDto,
  TimetableViewQueryDto,
  UpdateTimetableResourceDto,
  UpdateTimetableSlotDto,
  ValidateTimetableDto,
} from './dto/timetable.dto';
import { TimetableService } from './timetable.service';

@Controller('timetable')
@RequiresModule('timetable')
export class TimetableController {
  constructor(private readonly timetableService: TimetableService) {}

  @Get('readiness')
  @Permissions('timetable:write')
  getReadiness(@Query() query: Record<string, string | undefined>) {
    return this.timetableService.getReadiness(query);
  }

  @Get('configuration')
  @Permissions('timetable:write')
  getConfiguration(@Query() query: Record<string, string | undefined>) {
    return this.timetableService.getConfiguration(query);
  }

  @Put('configuration')
  @Permissions('timetable:write')
  configure(@Body() dto: ConfigureTimetableDto) {
    return this.timetableService.configure(dto);
  }

  @Get('requirements')
  @Permissions('timetable:write')
  getRequirements(@Query() query: Record<string, string | undefined>) {
    return this.timetableService.getRequirements(query);
  }

  @Put('requirements')
  @Permissions('timetable:write')
  saveRequirements(@Body() dto: BulkUpsertRequirementsDto) {
    return this.timetableService.saveRequirements(dto);
  }

  @Get('availability')
  @Permissions('timetable:write')
  getAvailability(@Query() query: Record<string, string | undefined>) {
    return this.timetableService.getAvailability(query);
  }

  @Put('availability')
  @Permissions('timetable:write')
  saveAvailability(@Body() dto: BulkSetTeacherAvailabilityDto) {
    return this.timetableService.saveAvailability(dto);
  }

  @Get('resources')
  @Permissions('timetable:write')
  listResources(@Query() query: Record<string, string | undefined>) {
    return this.timetableService.listResources(query);
  }

  @Post('resources')
  @Permissions('timetable:write')
  createResource(@Body() dto: CreateTimetableResourceDto) {
    return this.timetableService.createResource(dto);
  }

  @Patch('resources/:resourceId')
  @Permissions('timetable:write')
  updateResource(
    @Param('resourceId') resourceId: string,
    @Body() dto: UpdateTimetableResourceDto,
  ) {
    return this.timetableService.updateResource(resourceId, dto);
  }

  @Post('generate')
  @Permissions('timetable:write')
  generate(@Body() dto: GenerateTimetableDto) {
    return this.timetableService.generate(dto);
  }

  @Post('regenerate')
  @Permissions('timetable:write')
  regenerate(@Body() dto: RegenerateTimetableDto) {
    return this.timetableService.regenerate(dto);
  }

  @Post('validate')
  @Permissions('timetable:write')
  validate(@Body() dto: ValidateTimetableDto) {
    return this.timetableService.validate(dto);
  }

  @Get('views')
  @Permissions('timetable:read')
  getView(@Query() query: TimetableViewQueryDto) {
    return this.timetableService.getView(query);
  }

  @Post('valid-slots')
  @Permissions('timetable:write')
  findValidSlots(@Body() dto: FindValidSlotsDto) {
    return this.timetableService.findValidSlots(dto, false);
  }

  @Post('valid-slots/find-best')
  @Permissions('timetable:write')
  findBestSlot(@Body() dto: FindValidSlotsDto) {
    return this.timetableService.findValidSlots(dto, true);
  }

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

  @Post('slots/:slotId/move')
  @Permissions('timetable:write')
  moveSlot(@Param('slotId') slotId: string, @Body() dto: MoveTimetableSlotDto) {
    return this.timetableService.moveSlot(slotId, dto);
  }

  @Post('slots/:slotId/lock')
  @Permissions('timetable:write')
  setSlotLock(@Param('slotId') slotId: string, @Body() dto: LockTimetableSlotDto) {
    return this.timetableService.setSlotLock(slotId, dto);
  }

  @Delete('slots/:slotId')
  @Permissions('timetable:write')
  cancelSlot(@Param('slotId') slotId: string, @Body() dto: CancelTimetableSlotDto) {
    return this.timetableService.cancelSlot(slotId, dto);
  }

  @Get('unscheduled')
  @Permissions('timetable:write')
  listUnscheduled(@Query() query: Record<string, string | undefined>) {
    return this.timetableService.listUnscheduled(query);
  }

  @Post('unscheduled/:unscheduledId/place')
  @Permissions('timetable:write')
  placeUnscheduled(
    @Param('unscheduledId') unscheduledId: string,
    @Body() dto: PlaceUnscheduledLessonDto,
  ) {
    return this.timetableService.placeUnscheduled(unscheduledId, dto);
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

  @Post('versions/copy')
  @Permissions('timetable:write')
  copyVersion(@Body() dto: CopyTimetableDto) {
    return this.timetableService.copyVersion(dto);
  }

  @Post('versions/auto-fix')
  @Permissions('timetable:write')
  autoFix(@Body() dto: AutoFixTimetableDto) {
    return this.timetableService.autoFix(dto);
  }

  @Get('versions/history')
  @Permissions('timetable:write')
  getHistory(@Query() query: TimetableHistoryQueryDto) {
    return this.timetableService.getHistory(query);
  }

  @Get('relief/affected')
  @Permissions('timetable:write')
  getReliefAffected(@Query() query: ReliefAffectedQueryDto) {
    return this.timetableService.getReliefAffected(query);
  }

  @Get('relief/candidates')
  @Permissions('timetable:write')
  getReliefCandidates(@Query() query: ReliefCandidatesQueryDto) {
    return this.timetableService.getReliefCandidates(query);
  }

  @Post('relief/assign')
  @Permissions('timetable:write')
  assignRelief(@Body() dto: AssignReliefDto) {
    return this.timetableService.assignRelief(dto);
  }

  @Post('relief/:reliefId/cancel')
  @Permissions('timetable:write')
  cancelRelief(@Param('reliefId') reliefId: string, @Body() dto: CancelReliefDto) {
    return this.timetableService.cancelRelief(reliefId, dto);
  }

  @Get(['export/csv', 'exports/csv'])
  @Permissions('timetable:read')
  async exportCsv(
    @Query() query: TimetableExportQueryDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const artifact = await this.timetableService.exportCsv({ ...query, format: 'csv' });
    response.setHeader('Content-Type', artifact.content_type);
    response.setHeader('Content-Disposition', `attachment; filename="${artifact.filename}"`);
    return artifact.content;
  }

  @Get('portal')
  @Permissions('auth:read')
  getPortal(@Query() query: PortalTimetableQueryDto) {
    return this.timetableService.getPortal(query);
  }

  @Get('planner')
  @Permissions('timetable:write')
  getPlanner(@Query() query: Record<string, string | undefined>) {
    return this.timetableService.getPlanner(query);
  }

  @Get('published')
  @Permissions('timetable:write')
  listPublishedSchedules(@Query() query: Record<string, string | undefined>) {
    return this.timetableService.listPublishedSchedules(query);
  }

  @Get('my-schedule')
  @Permissions('timetable:read')
  getMySchedule(@Query() query: Record<string, string | undefined>) {
    return this.timetableService.getMySchedule(query);
  }

  @Get('dashboard')
  @Permissions('timetable:write')
  getTimetableDashboard(@Query() query: Record<string, string | undefined>) {
    return this.timetableService.getTimetableDashboard(query);
  }
}
