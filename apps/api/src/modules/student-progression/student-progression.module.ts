import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { AuthModule } from '../../auth/auth.module';
import { AgpModule } from '../../common/platform-governance/agp.module';
import { EventsModule } from '../events/events.module';
import { AcademicsModule } from '../academics/academics.module';
import { AdmissionsModule } from '../admissions/admissions.module';
import { ModuleAccessModule } from '../module-access/module-access.module';
import { ProgressionEngine } from './student-progression.service';
import { StudentProgressionController } from './student-progression.controller';
import { StudentProgressionRuntime } from './student-progression.runtime';
@Module({imports:[DatabaseModule,AuthModule,AgpModule,EventsModule,AcademicsModule,AdmissionsModule,ModuleAccessModule],
  controllers:[StudentProgressionController],providers:[ProgressionEngine,StudentProgressionRuntime],exports:[ProgressionEngine]})
export class StudentProgressionModule {}
