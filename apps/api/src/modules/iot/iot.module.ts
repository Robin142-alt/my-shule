import { Module } from '@nestjs/common';

import { IotController } from './iot.controller';
import { IotGatewayController } from './iot-gateway.controller';
import { IotGatewayService } from './iot-gateway.service';
import { IotSchemaService } from './iot-schema.service';
import { IotService } from './iot.service';
import { IotRepository } from './repositories/iot.repository';

@Module({
  controllers: [IotController, IotGatewayController],
  providers: [
    IotSchemaService,
    IotService,
    IotGatewayService,
    IotRepository,
  ],
  exports: [IotService, IotGatewayService, IotRepository],
})
export class IotModule {}
