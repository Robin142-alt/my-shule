import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';

import { Permissions } from '../../auth/decorators/permissions.decorator';
import { RequiresModule } from '../module-access/module-access.decorator';
import {
  CreateTransportDriverDto,
  CreateTransportManifestDto,
  CreateTransportRouteDto,
  CreateTransportVehicleDto,
  RecordTransportTripEventDto,
  RecordVehicleServiceDto,
  StartTransportTripDto,
} from './dto/transport.dto';
import { TransportService } from './transport.service';

@Controller('transport')
@RequiresModule('transport')
export class TransportController {
  constructor(private readonly transportService: TransportService) {}

  @Get('dashboard')
  @Permissions('transport:read')
  getDashboard() {
    return this.transportService.getDashboard();
  }

  @Post('routes')
  @Permissions('transport:write')
  createRoute(@Body() dto: CreateTransportRouteDto) {
    return this.transportService.createRoute(dto);
  }

  @Post('vehicles')
  @Permissions('transport:write')
  createVehicle(@Body() dto: CreateTransportVehicleDto) {
    return this.transportService.createVehicle(dto);
  }

  @Post('drivers')
  @Permissions('transport:write')
  createDriver(@Body() dto: CreateTransportDriverDto) {
    return this.transportService.createDriver(dto);
  }

  @Post('manifests')
  @Permissions('transport:write')
  createManifest(@Body() dto: CreateTransportManifestDto) {
    return this.transportService.createManifest(dto);
  }

  @Post('trips')
  @Permissions('transport:write')
  startTrip(@Body() dto: StartTransportTripDto) {
    return this.transportService.startTrip(dto);
  }

  @Post('trips/:tripId/events')
  @Permissions('transport:write')
  recordTripEvent(
    @Param('tripId') tripId: string,
    @Body() dto: RecordTransportTripEventDto,
  ) {
    return this.transportService.recordTripEvent(tripId, dto);
  }

  @Post('vehicles/:vehicleId/service-logs')
  @Permissions('transport:write')
  recordVehicleService(
    @Param('vehicleId') vehicleId: string,
    @Body() dto: RecordVehicleServiceDto,
  ) {
    return this.transportService.recordVehicleService(vehicleId, dto);
  }

  @Patch('alerts/:alertId/resolve')
  @Permissions('transport:write')
  resolveAlert(@Param('alertId') alertId: string) {
    return this.transportService.resolveAlert(alertId);
  }
}
