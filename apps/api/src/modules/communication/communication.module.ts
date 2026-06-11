import { Module } from '@nestjs/common';
import { CommunicationController } from './communication.controller';
import { CommunicationSmsService } from './communication-sms.service';
import { CommunicationSchemaService } from './communication-schema.service';
import { DatabaseModule } from '../../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [CommunicationController],
  providers: [CommunicationSmsService, CommunicationSchemaService],
  exports: [CommunicationSmsService],
})
export class CommunicationModule {}
