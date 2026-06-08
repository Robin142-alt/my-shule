import { EventsModule } from '../events/events.module';
import { Module } from '@nestjs/common';

import { BoardingController } from './boarding.controller';
import { BoardingSchemaService } from './boarding-schema.service';
import { BoardingService } from './boarding.service';
import { BoardingRepository } from './repositories/boarding.repository';

@Module({
  imports: [EventsModule],
  controllers: [BoardingController],
  providers: [BoardingSchemaService, BoardingService, BoardingRepository],
  exports: [BoardingService, BoardingRepository],
})
export class BoardingModule {}
