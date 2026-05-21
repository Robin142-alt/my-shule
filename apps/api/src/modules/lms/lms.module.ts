import { Module } from '@nestjs/common';

import { LmsController } from './lms.controller';
import { LmsSchemaService } from './lms-schema.service';
import { LmsService } from './lms.service';
import { LmsRepository } from './repositories/lms.repository';

@Module({
  controllers: [LmsController],
  providers: [LmsSchemaService, LmsService, LmsRepository],
  exports: [LmsService, LmsRepository],
})
export class LmsModule {}
