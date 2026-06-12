import * as moduleConsumers from './consumers';
import { Module } from '@nestjs/common';

import { HostelController } from './hostel.controller';
import { HostelSchemaService } from './hostel-schema.service';
import { HostelService } from './hostel.service';
import { HostelRepository } from './repositories/hostel.repository';

@Module({
  controllers: [HostelController],
  providers: [
    ...Object.values(moduleConsumers),HostelSchemaService, HostelService, HostelRepository],
  exports: [HostelService, HostelRepository],
})
export class HostelModule {}
