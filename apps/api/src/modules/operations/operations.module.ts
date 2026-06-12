import * as moduleConsumers from './consumers';
import { Module } from '@nestjs/common';
import { OperationsController } from './operations.controller';
import { OperationsService } from './operations.service';

@Module({
  controllers: [OperationsController],
  providers: [
    ...Object.values(moduleConsumers),OperationsService],
  exports: [OperationsService],
})
export class OperationsModule {}
