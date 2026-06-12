import { StudentsWidgetProvider } from './widgets/students-widget.provider';
import { Module } from '@nestjs/common';

import { BillingModule } from '../billing/billing.module';
import { EventsModule } from '../events/events.module';
import { SyncModule } from '../sync/sync.module';
import { AttendanceService } from './attendance.service';
import { StudentsController } from './students.controller';
import { StudentsSchemaService } from './students-schema.service';
import { StudentsService } from './students.service';
import { StudentsRepository } from './repositories/students.repository';

@Module({
  imports: [EventsModule, BillingModule, SyncModule],
  controllers: [StudentsController],
  providers: [
    StudentsWidgetProvider,
    StudentsSchemaService,
    StudentsService,
    AttendanceService,
    StudentsRepository,
  ],
  exports: [StudentsSchemaService, StudentsService, AttendanceService, StudentsRepository],
})
export class StudentsModule {}
