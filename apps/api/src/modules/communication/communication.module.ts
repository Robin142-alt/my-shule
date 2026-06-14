import { Module } from '@nestjs/common';
import { CommunicationController } from './communication.controller';
import { CommunicationSmsService } from './communication-sms.service';
import { CommunicationSchemaService } from './communication-schema.service';
import { DatabaseModule } from '../../database/database.module';
import { EventsModule } from '../events/events.module';
import { AgpModule } from '../../common/platform-governance/agp.module';

@Module({
  imports: [DatabaseModule, EventsModule, AgpModule],
  controllers: [CommunicationController],
  providers: [CommunicationSmsService, CommunicationSchemaService],
  exports: [CommunicationSmsService],
})
export class CommunicationModule {}
