import { Module } from '@nestjs/common';
import { CommunicationController } from './communication.controller';
import { CommunicationSmsService } from './communication-sms.service';

@Module({
  controllers: [CommunicationController],
  providers: [CommunicationSmsService],
  exports: [CommunicationSmsService],
})
export class CommunicationModule {}
