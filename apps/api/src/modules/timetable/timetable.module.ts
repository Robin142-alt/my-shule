import { Module } from '@nestjs/common';

import { NotificationsModule } from '../notifications/notifications.module';
import { TimetableRepository } from './repositories/timetable.repository';
import { TimetableWorkflowRepository } from './repositories/timetable-workflow.repository';
import { TimetableController } from './timetable.controller';
import { TimetableConstraintService } from './timetable-constraint.service';
import { TimetableSchemaService } from './timetable-schema.service';
import { TimetableService } from './timetable.service';

@Module({
  imports: [NotificationsModule],
  controllers: [TimetableController],
  providers: [
    TimetableSchemaService,
    TimetableService,
    TimetableRepository,
    TimetableWorkflowRepository,
    TimetableConstraintService,
  ],
  exports: [
    TimetableService,
    TimetableRepository,
    TimetableWorkflowRepository,
    TimetableConstraintService,
  ],
})
export class TimetableModule {}
