import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import configuration from '../../config/configuration';
import { validateEnv } from '../../config/env.validation';
import { RequestContextService } from '../../common/request-context/request-context.service';
import { DatabaseFileStorageService } from '../../common/uploads/database-file-storage.service';
import { S3CompatibleObjectStorageService } from '../../common/uploads/s3-object-storage.service';
import { DatabaseModule } from '../../database/database.module';
import { RedisModule } from '../../infrastructure/redis/redis.module';
import { ModuleAccessService } from '../module-access/module-access.service';
import { ModuleAccessRepository } from '../module-access/module-access.repository';
import { SchoolOperationalEventsService } from '../events/school-operational-events.service';
import { EventPublisherService } from '../events/event-publisher.service';
import { OutboxEventsRepository } from '../events/repositories/outbox-events.repository';
import { SchoolOperationNotificationsRepository } from '../events/repositories/school-operation-notifications.repository';
import { ExamsService } from './exams.service';
import { ExamsRepository } from './repositories/exams.repository';
import { ReportCardTemplateService } from './services/report-card-template.service';
import { ReportCardGenerationService } from './services/report-card-generation.service';
import { ReportCardArtifactsService } from './services/report-card-artifacts.service';
import { ReportCardExportService } from './services/report-card-export.service';
import { ReportWorkService } from './services/report-work.service';
import { ReportRetentionService } from './services/report-retention.service';

// Reuses domain services and event writers without instantiating every ERP module,
// HTTP middleware, or unrelated event consumer in each rendering replica.
@Global()
@Module({
  providers: [
    RequestContextService,
    DatabaseFileStorageService,
    S3CompatibleObjectStorageService,
  ],
  exports: [
    RequestContextService,
    DatabaseFileStorageService,
    S3CompatibleObjectStorageService,
  ],
})
class ReportWorkerSharedModule {}

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      expandVariables: true,
      envFilePath: [
        `.env.${process.env.NODE_ENV ?? 'development'}.local`,
        '.env.local',
        `.env.${process.env.NODE_ENV ?? 'development'}`,
        '.env',
      ],
      load: [configuration],
      validate: validateEnv,
    }),
    ReportWorkerSharedModule,
    DatabaseModule,
    RedisModule,
  ],
  providers: [
    ExamsService,
    ExamsRepository,
    ReportCardTemplateService,
    ReportCardGenerationService,
    ReportCardArtifactsService,
    ReportCardExportService,
    ReportWorkService,
    ReportRetentionService,
    SchoolOperationalEventsService,
    EventPublisherService,
    OutboxEventsRepository,
    SchoolOperationNotificationsRepository,
    ModuleAccessService,
    ModuleAccessRepository,
  ],
})
export class ReportsWorkerModule {}
