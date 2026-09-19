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
import { AnalyticsReportController } from './analytics/analytics-report.controller';
import { AnalyticsReportService } from './analytics/analytics-report.service';
import { ReportCardExportService } from './services/report-card-export.service';

@Module({
  imports: [EventsModule],
  controllers: [ExamsController, ReportCardDownloadController, AnalyticsReportController],
  providers: [
    ...Object.values(moduleConsumers),
    ExamsSchemaService,
    ExamsService,
    AnalyticsReportService,
    ExamsRepository,
    ReportCardGenerationService,
    ReportCardTemplateService,
    ReportCardExportService,
  ],
  exports: [ExamsService, ExamsRepository, ReportCardGenerationService],
})
export class ExamsModule {}
