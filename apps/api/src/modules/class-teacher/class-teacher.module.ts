import { Module } from '@nestjs/common';
import { ClassTeacherController } from './class-teacher.controller';
import { ClassTeacherService } from './class-teacher.service';
import { DatabaseModule } from '../../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [ClassTeacherController],
  providers: [ClassTeacherService],
  exports: [ClassTeacherService]
})
export class ClassTeacherModule {}
