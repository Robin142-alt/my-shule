import { Module } from '@nestjs/common';
import { EventsModule } from '../events/events.module';

import { HrController } from './hr.controller';
import { StaffController } from './staff-dashboard.controller';
import { HrSchemaService } from './hr-schema.service';
import { HrService } from './hr.service';
import { StaffDashboardService } from './staff-dashboard.service';
import { HrRepository } from './repositories/hr.repository';
import { DatabaseModule } from '../../database/database.module';
import { AgpModule } from '../../common/platform-governance/agp.module';

@Module({
  imports: [DatabaseModule, EventsModule, AgpModule],
  controllers: [HrController, StaffController],
  providers: [
    HrSchemaService,
    HrService,
    StaffDashboardService,
    HrRepository,
  ],
  exports: [HrService, HrRepository, StaffDashboardService],
})
export class HrModule {}
