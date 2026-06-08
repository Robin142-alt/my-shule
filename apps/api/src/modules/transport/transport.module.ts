import { EventsModule } from '../events/events.module';
import { Module } from '@nestjs/common';

import { TransportRepository } from './repositories/transport.repository';
import { TransportController } from './transport.controller';
import { TransportSchemaService } from './transport-schema.service';
import { TransportService } from './transport.service';

@Module({
  imports: [EventsModule],
  controllers: [TransportController],
  providers: [
    TransportSchemaService,
    TransportService,
    TransportRepository,
  ],
  exports: [TransportService, TransportRepository],
})
export class TransportModule {}
