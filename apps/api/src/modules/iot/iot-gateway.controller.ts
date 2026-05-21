import { Body, Controller, Headers, Param, Post } from '@nestjs/common';

import { Public } from '../../auth/decorators/public.decorator';
import {
  IotGatewayCommandAckDto,
  IotGatewayCommandPollDto,
  IotGatewayTelemetryDto,
} from './dto/iot.dto';
import { IotGatewayService } from './iot-gateway.service';

@Controller('iot/gateway')
export class IotGatewayController {
  constructor(private readonly iotGatewayService: IotGatewayService) {}

  @Post('telemetry')
  @Public()
  ingestTelemetry(
    @Body() dto: IotGatewayTelemetryDto,
    @Headers('x-iot-tenant-id') tenantId?: string,
    @Headers('x-iot-key-id') keyId?: string,
    @Headers('x-iot-device-token') deviceToken?: string,
    @Headers('x-iot-idempotency-key') idempotencyKey?: string,
    @Headers('x-iot-timestamp') timestamp?: string,
  ) {
    return this.iotGatewayService.ingestTelemetry(dto, {
      tenantId,
      keyId,
      deviceToken,
      idempotencyKey,
      timestamp,
    });
  }

  @Post('commands/poll')
  @Public()
  pollCommands(
    @Body() dto: IotGatewayCommandPollDto,
    @Headers('x-iot-tenant-id') tenantId?: string,
    @Headers('x-iot-key-id') keyId?: string,
    @Headers('x-iot-device-token') deviceToken?: string,
    @Headers('x-iot-timestamp') timestamp?: string,
  ) {
    return this.iotGatewayService.pollCommands(dto, {
      tenantId,
      keyId,
      deviceToken,
      timestamp,
    });
  }

  @Post('commands/:commandId/ack')
  @Public()
  acknowledgeCommand(
    @Param('commandId') commandId: string,
    @Body() dto: IotGatewayCommandAckDto,
    @Headers('x-iot-tenant-id') tenantId?: string,
    @Headers('x-iot-key-id') keyId?: string,
    @Headers('x-iot-device-token') deviceToken?: string,
    @Headers('x-iot-timestamp') timestamp?: string,
  ) {
    return this.iotGatewayService.acknowledgeCommand(commandId, dto, {
      tenantId,
      keyId,
      deviceToken,
      timestamp,
    });
  }
}
