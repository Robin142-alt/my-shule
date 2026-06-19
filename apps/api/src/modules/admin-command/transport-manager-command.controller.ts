import { Controller, Get, Post, Body } from '@nestjs/common';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import { RequiresModule } from '../module-access/module-access.decorator';
import { TransportManagerCommandService } from './transport-manager-command.service';

@Controller('admin-command/transport-manager')
@RequiresModule('transport')
@Permissions('transport:read')
export class TransportManagerCommandController {
  constructor(private readonly service: TransportManagerCommandService) {}

  @Get('overview')
  getOverview() {
    return this.service.getOverview();
  }

  @Get('vehicles')
  getVehicles() {
    return this.service.getVehicles();
  }

  @Get('drivers')
  getDrivers() {
    return this.service.getDrivers();
  }

  @Get('routes')
  getRoutes() {
    return this.service.getRoutes();
  }

  @Get('trips')
  getTrips() {
    return this.service.getTrips();
  }

  @Get('fuel-maintenance')
  getFuelMaintenance() {
    return this.service.getFuelMaintenance();
  }

  @Post('fuel-maintenance/fuel')
  @Permissions('transport:write')
  logFuel(@Body() dto: any) {
    return this.service.logFuel(dto);
  }

  @Post('fuel-maintenance/maintenance')
  @Permissions('transport:write')
  logMaintenance(@Body() dto: any) {
    return this.service.logMaintenance(dto);
  }

  @Get('student-transport-list')
  getStudentTransportList() {
    return this.service.getStudentTransportList();
  }

  @Get('reports')
  getReports() {
    return this.service.getReports();
  }

  @Post('reports/generate')
  @Permissions('transport:write')
  generateReport(@Body() dto: any) {
    return this.service.generateReport(dto);
  }
}
