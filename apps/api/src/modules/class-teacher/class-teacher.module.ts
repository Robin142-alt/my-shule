import * as moduleConsumers from './consumers';
import { Module } from '@nestjs/common';
import { ClassTeacherController } from './class-teacher.controller';
import { ClassTeacherService } from './class-teacher.service';
import { ExamsManagerMarksController } from './exams-manager-marks.controller';
import { DatabaseModule } from '../../database/database.module';
import { EventsModule } from '../events/events.module';
import { ExamsModule } from '../exams/exams.module';
import { DisciplineModule } from '../discipline/discipline.module';
import { TeacherWorkflowService } from './teacher-workflow.service';

@Module({
  imports: [DatabaseModule, EventsModule, ExamsModule, DisciplineModule],
  controllers: [ClassTeacherController, ExamsManagerMarksController],
  providers: [
    ...Object.values(moduleConsumers),ClassTeacherService, TeacherWorkflowService],
  exports: [ClassTeacherService]
})
export class ClassTeacherModule {}
