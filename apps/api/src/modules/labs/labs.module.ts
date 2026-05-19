import { Module } from '@nestjs/common';

import { LabsController } from './labs.controller';
import { LabsProcessor } from './labs.processor';
import { LabsSchemaService } from './labs-schema.service';
import { LabsService } from './labs.service';
import { LabsRepository } from './repositories/labs.repository';

@Module({
  controllers: [LabsController],
  providers: [LabsSchemaService, LabsService, LabsRepository, LabsProcessor],
  exports: [LabsService, LabsRepository, LabsProcessor],
})
export class LabsModule {}
