import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';

import { Permissions } from '../../auth/decorators/permissions.decorator';
import { RequiresModule } from '../module-access/module-access.decorator';
import {
  CreateIotDeviceDto,
  DispatchIotCommandDto,
  IssueIotDeviceCredentialDto,
  RecordIotTelemetryDto,
} from './dto/iot.dto';
import { IotService } from './iot.service';

@Controller('iot')
@RequiresModule('iot')
export class IotController {
  constructor(private readonly iotService: IotService) {}

  @Get('dashboard')
  @Permissions('iot:read')
  getDashboard() {
    return this.iotService.getDashboard();
  }

  @Post('devices')
  @Permissions('iot:write')
  registerDevice(@Body() dto: CreateIotDeviceDto) {
    return this.iotService.registerDevice(dto);
  }

  @Post('telemetry')
  @Permissions('iot:write')
  recordTelemetry(@Body() dto: RecordIotTelemetryDto) {
    return this.iotService.recordTelemetry(dto);
  }

  @Post('commands')
  @Permissions('iot:write')
  dispatchCommand(@Body() dto: DispatchIotCommandDto) {
    return this.iotService.dispatchCommand(dto);
  }

  @Post('devices/:deviceId/credentials')
  @Permissions('iot:write')
  issueDeviceCredential(
    @Param('deviceId') deviceId: string,
    @Body() dto: IssueIotDeviceCredentialDto,
  ) {
    return this.iotService.issueDeviceCredential(deviceId, dto);
  }

  @Patch('alerts/:alertId/resolve')
  @Permissions('iot:write')
  resolveAlert(@Param('alertId') alertId: string) {
    return this.iotService.resolveAlert(alertId);
  }
}
