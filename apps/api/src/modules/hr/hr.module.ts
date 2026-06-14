import { Module } from '@nestjs/common';

import { HrController } from './hr.controller';
import { HrSchemaService } from './hr-schema.service';
import { HrService } from './hr.service';
import { HrRepository } from './repositories/hr.repository';
import { DatabaseModule } from '../../database/database.module';
import { AgpModule } from '../../common/platform-governance/agp.module';

@Module({
  imports: [DatabaseModule, EventsModule, AgpModule],
  controllers: [HrController],
  providers: [
    HrSchemaService,
    HrService,
    HrRepository,
  ],
  exports: [HrService, HrRepository],
})
export class HrModule {}
