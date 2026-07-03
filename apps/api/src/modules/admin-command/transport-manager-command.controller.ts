import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
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

  @Post('vehicles')
  @Permissions('transport:write')
  createVehicle(@Body() dto: any) {
    return this.service.createVehicle(dto);
  }

  @Patch('vehicles/:id')
  @Permissions('transport:write')
  updateVehicle(@Param('id') id: string, @Body() dto: any) {
    return this.service.updateVehicle(id, dto);
  }

  @Post('vehicles/:id/decommission')
  @Permissions('transport:write')
  decommissionVehicle(@Param('id') id: string) {
    return this.service.updateVehicleStatus(id, 'retired');
  }

  @Get('drivers')
  getDrivers() {
    return this.service.getDrivers();
  }

  @Post('drivers')
  @Permissions('transport:write')
  createDriver(@Body() dto: any) {
    return this.service.createDriver(dto);
  }

  @Patch('drivers/:id')
  @Permissions('transport:write')
  updateDriver(@Param('id') id: string, @Body() dto: any) {
    return this.service.updateDriver(id, dto);
  }

  @Post('drivers/:id/suspend')
  @Permissions('transport:write')
  suspendDriver(@Param('id') id: string, @Body() dto: any) {
    return this.service.updateDriverStatus(id, 'suspended', dto);
  }

  @Get('routes')
  getRoutes() {
    return this.service.getRoutes();
  }

  @Post('routes')
  @Permissions('transport:write')
  createRoute(@Body() dto: any) {
    return this.service.createRoute(dto);
  }

  @Patch('routes/:id')
  @Permissions('transport:write')
  updateRoute(@Param('id') id: string, @Body() dto: any) {
    return this.service.updateRoute(id, dto);
  }

  @Post('routes/:id/assign-vehicle')
  @Permissions('transport:write')
  assignVehicleToRoute(@Param('id') id: string, @Body() dto: any) {
    return this.service.assignVehicleToRoute(id, dto);
  }

  @Get('trips')
  getTrips() {
    return this.service.getTrips();
  }

  @Post('trips')
  @Permissions('transport:write')
  logTrip(@Body() dto: any) {
    return this.service.logTrip(dto);
  }

  @Post('trips/:id/complete')
  @Permissions('transport:write')
  completeTrip(@Param('id') id: string, @Body() dto: any) {
    return this.service.completeTrip(id, dto);
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

  @Post('student-transport-list')
  @Permissions('transport:write')
  assignStudentTransport(@Body() dto: any) {
    return this.service.assignStudentTransport(dto);
  }

  @Delete('student-transport-list/:id')
  @Permissions('transport:write')
  removeStudentTransport(@Param('id') id: string) {
    return this.service.removeStudentTransport(id);
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

  @Post('notices')
  @Permissions('transport:write')
  sendNotice(@Body() dto: any) {
    return this.service.sendNotice(dto);
  }

  @Post('actions')
  @Permissions('transport:write')
  recordAction(@Body() dto: any) {
    return this.service.recordAction(dto);
  }
}
