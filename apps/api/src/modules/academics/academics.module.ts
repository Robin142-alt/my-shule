import { AcademicsWidgetProvider } from './widgets/academics-widget.provider';
import { Module, forwardRef } from '@nestjs/common';

import { AcademicsController } from './academics.controller';
import { AcademicsSchemaService } from './academics-schema.service';
import { AcademicsService } from './academics.service';
import { AcademicsRepository } from './repositories/academics.repository';
import { ExamsModule } from '../exams/exams.module';
import { SyllabusController } from './syllabus.controller';
import { SyllabusService } from './syllabus.service';

@Module({
  imports: [forwardRef(() => ExamsModule)],
  controllers: [AcademicsController, SyllabusController],
  providers: [
    AcademicsWidgetProvider,AcademicsSchemaService, AcademicsService, AcademicsRepository, SyllabusService],
  exports: [AcademicsService, AcademicsRepository, SyllabusService],
})
export class AcademicsModule {}
