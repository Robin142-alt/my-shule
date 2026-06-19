import * as moduleConsumers from './consumers';
import { Module } from '@nestjs/common';
import { EventsModule } from '../events/events.module';
import { DatabaseModule } from '../../database/database.module';

import { OperationsController } from './operations.controller';
import { SchoolController } from './school-settings.controller';
import { OperationsService } from './operations.service';
import { SchoolSettingsService } from './school-settings.service';

@Module({
  imports: [DatabaseModule, EventsModule],
  controllers: [OperationsController, SchoolController],
  providers: [
    ...Object.values(moduleConsumers),
    OperationsService,
    SchoolSettingsService
  ],
  exports: [OperationsService, SchoolSettingsService],
})
export class OperationsModule {}
