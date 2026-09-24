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
import { ReportWorkService } from './services/report-work.service';
import { ReportCardArtifactsService } from './services/report-card-artifacts.service';
import { ReportRetentionService } from './services/report-retention.service';

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
    ReportWorkService,
    ReportCardArtifactsService,
    ReportRetentionService,
  ],
  exports: [ExamsService, ExamsRepository, ReportCardGenerationService],
})
export class ExamsModule {}
