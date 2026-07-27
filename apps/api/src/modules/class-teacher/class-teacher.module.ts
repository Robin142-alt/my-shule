import * as moduleConsumers from './consumers';
import { Module } from '@nestjs/common';
import { ClassTeacherController } from './class-teacher.controller';
import { ClassTeacherService } from './class-teacher.service';
import { DatabaseModule } from '../../database/database.module';
import { EventsModule } from '../events/events.module';
import { ExamsModule } from '../exams/exams.module';

@Module({
  imports: [DatabaseModule, EventsModule, ExamsModule],
  controllers: [ClassTeacherController],
  providers: [
    ...Object.values(moduleConsumers),ClassTeacherService],
  exports: [ClassTeacherService]
})
export class ClassTeacherModule {}
