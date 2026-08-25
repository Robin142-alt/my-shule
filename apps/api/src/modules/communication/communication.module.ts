import { Module } from '@nestjs/common';
import { CommunicationController } from './communication.controller';
import { CommunicationSmsService } from './communication-sms.service';
import { CommunicationSmsOutboxDispatcherService } from './communication-sms-outbox-dispatcher.service';
import { CommunicationSmsOutboxRepository } from './communication-sms-outbox.repository';
import { CommunicationSchemaService } from './communication-schema.service';
import { DatabaseModule } from '../../database/database.module';
import { EventsModule } from '../events/events.module';
import { AgpModule } from '../../common/platform-governance/agp.module';
import { IntegrationsModule } from '../integrations/integrations.module';

@Module({
  imports: [DatabaseModule, EventsModule, AgpModule, IntegrationsModule],
  controllers: [CommunicationController],
  providers: [
    CommunicationSmsService,
    CommunicationSchemaService,
    CommunicationSmsOutboxRepository,
    CommunicationSmsOutboxDispatcherService,
  ],
  exports: [CommunicationSmsService],
})
export class CommunicationModule {}
