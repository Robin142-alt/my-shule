import { Module } from '@nestjs/common';
import { ClassTeacherController } from './class-teacher.controller';
import { ClassTeacherService } from './class-teacher.service';
import { DatabaseModule } from '../../database/database.module';
import { EventsModule } from '../events/events.module';

@Module({
  imports: [DatabaseModule, EventsModule],
  controllers: [ClassTeacherController],
  providers: [ClassTeacherService],
  exports: [ClassTeacherService]
})
export class ClassTeacherModule {}
