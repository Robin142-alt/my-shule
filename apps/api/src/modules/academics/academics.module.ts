import { AcademicsWidgetProvider } from './widgets/academics-widget.provider';
import { Module, forwardRef } from '@nestjs/common';

import { AcademicsController } from './academics.controller';
import { AcademicsSchemaService } from './academics-schema.service';
import { AcademicsService } from './academics.service';
import { AcademicsRepository } from './repositories/academics.repository';
import { ExamsModule } from '../exams/exams.module';

@Module({
  imports: [forwardRef(() => ExamsModule)],
  controllers: [AcademicsController],
  providers: [
    AcademicsWidgetProvider,AcademicsSchemaService, AcademicsService, AcademicsRepository],
  exports: [AcademicsService, AcademicsRepository],
})
export class AcademicsModule {}
