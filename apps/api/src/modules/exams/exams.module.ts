import * as moduleConsumers from './consumers';
import { Module } from '@nestjs/common';

import { ExamsController } from './exams.controller';
import { ReportCardDownloadController } from './report-card-download.controller';
import { ExamsSchemaService } from './exams-schema.service';
import { ExamsService } from './exams.service';
import { ExamsRepository } from './repositories/exams.repository';
import { ReportCardGenerationService } from './services/report-card-generation.service';
import { ReportCardTemplateService } from './services/report-card-template.service';
import { EventsModule } from '../events/events.module';

@Module({
  imports: [EventsModule],
  controllers: [ExamsController, ReportCardDownloadController],
  providers: [
    ...Object.values(moduleConsumers),
    ExamsSchemaService,
    ExamsService,
    ExamsRepository,
    ReportCardGenerationService,
    ReportCardTemplateService,
  ],
  exports: [ExamsService, ExamsRepository, ReportCardGenerationService],
})
export class ExamsModule {}
