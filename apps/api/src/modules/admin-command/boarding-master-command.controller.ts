import { Body, Controller, Get, Param, Post, Put } from '@nestjs/common';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import { RequiresModule } from '../module-access/module-access.decorator';
import { BoardingMasterCommandService } from './boarding-master-command.service';

@Controller('admin-command/boarding-master')
@RequiresModule('boarding')
@Permissions('boarding:read')
export class BoardingMasterCommandController {
  constructor(private readonly service: BoardingMasterCommandService) {}

  @Get('overview')
  getOverview() {
    return this.service.getOverview();
  }

  @Get('hostels')
  getHostels() {
    return this.service.getHostels();
  }

  @Post('hostels')
  @Permissions('boarding:write')
  createHostel(@Body() dto: any) {
    return this.service.createHostel(dto);
  }

  @Put('hostels/:id')
  @Permissions('boarding:write')
  updateHostel(@Param('id') id: string, @Body() dto: any) {
    return this.service.updateHostel(id, dto);
  }

  @Get('rooms-beds')
  getRoomsBeds() {
    return this.service.getRoomsBeds();
  }

  @Post('rooms-beds')
  @Permissions('boarding:write')
  createRoom(@Body() dto: any) {
    return this.service.createRoom(dto);
  }

  @Post('rooms-beds/:id/status')
  @Permissions('boarding:write')
  updateBedStatus(@Param('id') id: string, @Body() dto: any) {
    return this.service.updateBedStatus(id, dto);
  }

  @Get('allocation')
  getAllocation() {
    return this.service.getAllocation();
  }

  @Post('allocation')
  @Permissions('boarding:write')
  createAllocation(@Body() dto: any) {
    return this.service.createAllocation(dto);
  }

  @Post('allocation/:id/deallocate')
  @Permissions('boarding:write')
  deallocateStudent(@Param('id') id: string) {
    return this.service.deallocateStudent(id);
  }

  @Get('boarding-attendance')
  getBoardingAttendance() {
    return this.service.getBoardingAttendance();
  }

  @Post('boarding-attendance')
  @Permissions('boarding:write')
  submitRollCall(@Body() dto: any) {
    return this.service.submitRollCall(dto);
  }

  @Get('leave-exit')
  getLeaveExit() {
    return this.service.getLeaveExit();
  }

  @Post('leave-exit')
  @Permissions('boarding:write')
  createLeaveRequest(@Body() dto: any) {
    return this.service.createLeaveRequest(dto);
  }

  @Post('leave-exit/:id/approve')
  @Permissions('boarding:write')
  approveLeaveRequest(@Param('id') id: string) {
    return this.service.actionLeaveRequest(id, 'approved');
  }

  @Post('leave-exit/:id/reject')
  @Permissions('boarding:write')
  rejectLeaveRequest(@Param('id') id: string, @Body() dto: any) {
    return this.service.actionLeaveRequest(id, 'rejected', dto);
  }

  @Post('leave-exit/:id/check-out')
  @Permissions('boarding:write')
  checkoutLeaveRequest(@Param('id') id: string, @Body() dto: any) {
    return this.service.actionLeaveRequest(id, 'checked_out', dto);
  }

  @Get('incidents')
  getIncidents() {
    return this.service.getIncidents();
  }

  @Post('incidents')
  @Permissions('boarding:write')
  reportIncident(@Body() dto: any) {
    return this.service.reportIncident(dto);
  }

  @Post('incidents/:id/escalate')
  @Permissions('boarding:write')
  escalateIncident(@Param('id') id: string) {
    return this.service.updateIncidentStatus(id, 'escalated');
  }

  @Post('incidents/:id/resolve')
  @Permissions('boarding:write')
  resolveIncident(@Param('id') id: string, @Body() dto: any) {
    return this.service.updateIncidentStatus(id, 'resolved', dto);
  }

  @Get('reports')
  getReports() {
    return this.service.getReports();
  }

  @Post('reports/generate')
  @Permissions('boarding:write')
  generateReport(@Body() dto: any) {
    return this.service.generateReport(dto);
  }

  @Post('actions')
  @Permissions('boarding:write')
  recordAction(@Body() dto: any) {
    return this.service.recordAction(dto);
  }
}
