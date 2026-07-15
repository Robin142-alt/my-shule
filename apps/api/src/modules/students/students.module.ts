import { StudentsWidgetProvider } from './widgets/students-widget.provider';
import { Module } from '@nestjs/common';

import { BillingModule } from '../billing/billing.module';
import { EventsModule } from '../events/events.module';
import { ExamsModule } from '../exams/exams.module';
import { LmsModule } from '../lms/lms.module';
import { SyncModule } from '../sync/sync.module';
import { AttendanceService } from './attendance.service';
import { StudentsController } from './students.controller';
import { StudentController } from './student-portal.controller';
import { StudentPortalActionsController } from './student-portal-actions.controller';
import { StudentsSchemaService } from './students-schema.service';
import { StudentsService } from './students.service';
import { StudentPortalService } from './student-portal.service';
import { StudentsRepository } from './repositories/students.repository';

@Module({
  imports: [EventsModule, BillingModule, SyncModule, LmsModule, ExamsModule],
  controllers: [StudentsController, StudentController, StudentPortalActionsController],
  providers: [
    StudentsWidgetProvider,
    StudentsSchemaService,
    StudentsService,
    StudentPortalService,
    AttendanceService,
    StudentsRepository,
  ],
  exports: [StudentsSchemaService, StudentsService, StudentPortalService, AttendanceService, StudentsRepository],
})
export class StudentsModule {}
