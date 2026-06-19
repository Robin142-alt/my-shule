import { Controller, Get, Post, Body } from '@nestjs/common';
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

  @Get('rooms-beds')
  getRoomsBeds() {
    return this.service.getRoomsBeds();
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

  @Get('boarding-attendance')
  getBoardingAttendance() {
    return this.service.getBoardingAttendance();
  }

  @Get('leave-exit')
  getLeaveExit() {
    return this.service.getLeaveExit();
  }

  @Get('incidents')
  getIncidents() {
    return this.service.getIncidents();
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
}
