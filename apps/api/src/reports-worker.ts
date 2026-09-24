import 'reflect-metadata';

// Dedicated Railway process: no HTTP listener and no unrelated queue consumers.
process.env.APP_RUNTIME = 'reports-worker';
if (process.env.REPORT_REDIS_URL)
  process.env.REDIS_URL = process.env.REPORT_REDIS_URL;
process.env.EVENTS_DISPATCHER_ENABLED = 'false';
process.env.EVENTS_WORKER_ENABLED = 'false';
process.env.COMMUNICATION_SMS_OUTBOX_WORKER_ENABLED = 'false';
process.env.SUPPORT_NOTIFICATION_RETRY_WORKER_ENABLED = 'false';
process.env.OBSERVABILITY_SLO_BACKGROUND_ENABLED = 'false';

import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ReportsWorkerModule } from './modules/exams/reports-worker.module';

async function bootstrap() {
  const logger = new Logger('ReportsWorker');
  try {
    const app = await NestFactory.createApplicationContext(
      ReportsWorkerModule,
      // This standalone context never installs the HTTP application's logger.
      // Buffering here would retain every background log in memory indefinitely.
      { bufferLogs: false },
    );
    app.enableShutdownHooks();
    logger.log(
      'Durable report dispatcher, renderer and retention worker started',
    );
  } catch (error) {
    logger.error(
      'Report worker startup failed',
      error instanceof Error ? error.stack : undefined,
    );
    process.exitCode = 1;
  }
}
void bootstrap();
