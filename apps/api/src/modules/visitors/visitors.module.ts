import { Module } from '@nestjs/common';

import { VisitorsController } from './visitors.controller';
import { VisitorsSchemaService } from './visitors-schema.service';
import { VisitorsService } from './visitors.service';
import { VisitorsRepository } from './repositories/visitors.repository';

@Module({
  controllers: [VisitorsController],
  providers: [VisitorsSchemaService, VisitorsService, VisitorsRepository],
  exports: [VisitorsService, VisitorsRepository],
})
export class VisitorsModule {}
