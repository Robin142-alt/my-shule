import 'reflect-metadata';
import assert from 'node:assert/strict';
import test from 'node:test';
import { Test } from '@nestjs/testing';
import { DATABASE_POOL } from '../../../database/database.constants';
import { DatabaseService } from '../../../database/database.service';
import { DatabaseSecurityService } from '../../../database/database-security.service';
import { PrismaService } from '../../../database/prisma.service';
import { REDIS_CLIENT } from '../../../infrastructure/redis/redis.constants';
import { ReportWorkService } from './report-work.service';
import { ReportCardGenerationService } from './report-card-generation.service';
import { ReportCardArtifactsService } from './report-card-artifacts.service';
import { ReportCardExportService } from './report-card-export.service';

test('standalone Railway report module resolves its actual dependency graph without the HTTP application', async () => {
  const env: Record<string, string> = {
    NODE_ENV: 'test',
    APP_RUNTIME: 'reports-worker',
    REPORT_WORKER_LANE: 'interactive',
    DATABASE_URL: 'postgresql://test:test@127.0.0.1:1/disposable',
    REDIS_URL: 'redis://127.0.0.1:1',
    SECURITY_PII_ENCRYPTION_KEY: 'test',
    MPESA_CONSUMER_KEY: 'test',
    MPESA_CONSUMER_SECRET: 'test',
    MPESA_SHORT_CODE: '123456',
    MPESA_PASSKEY: 'test',
    MPESA_TRANSACTION_STATUS_SECURITY_CREDENTIAL: 'test',
    MPESA_CALLBACK_URL: 'https://test.invalid/callback',
    MPESA_CALLBACK_SECRET: 'test',
    MPESA_LEDGER_DEBIT_ACCOUNT_CODE: '1100',
    MPESA_LEDGER_CREDIT_ACCOUNT_CODE: '2100',
    APP_TRUSTED_TENANT_HEADER_SECRET: 'test',
    REPORT_CARD_DOWNLOAD_SIGNING_SECRET: 'test',
    JWT_SECRET: 'test',
    RESEND_API_KEY: 're_test_123456789',
    EMAIL_FROM: 'MyShule <support@myshule.test>',
    SUPPORT_NOTIFICATION_EMAILS: 'support@myshule.test',
    PUBLIC_APP_URL: 'https://app.myshule.test',
    UPLOAD_OBJECT_STORAGE_ENABLED: 'false',
    UPLOAD_OBJECT_STORAGE_PROVIDER: 'r2',
    UPLOAD_OBJECT_STORAGE_ENDPOINT:
      'https://0123456789abcdef0123456789abcdef.r2.cloudflarestorage.com',
    UPLOAD_OBJECT_STORAGE_BUCKET: 'my-shule-files',
    UPLOAD_OBJECT_STORAGE_ACCESS_KEY_ID: 'object-access-key',
    UPLOAD_OBJECT_STORAGE_SECRET_ACCESS_KEY:
      'object-secret-key-with-32-characters',
  };
  const original = Object.fromEntries(
    Object.keys(env).map((key) => [key, process.env[key]]),
  );
  Object.assign(process.env, env);
  try {
    const { ReportsWorkerModule } = await import('../reports-worker.module');
    const module = await Test.createTestingModule({
      imports: [ReportsWorkerModule],
    })
      .overrideProvider(DATABASE_POOL)
      .useValue({})
      .overrideProvider(DatabaseService)
      .useValue({})
      .overrideProvider(DatabaseSecurityService)
      .useValue({})
      .overrideProvider(PrismaService)
      .useValue({})
      .overrideProvider(REDIS_CLIENT)
      .useValue({ status: 'end' })
      .compile();
    assert.ok(module.get(ReportWorkService));
    assert.ok(module.get(ReportCardGenerationService));
    assert.ok(module.get(ReportCardArtifactsService));
    assert.ok(module.get(ReportCardExportService));
    await module.close();
  } finally {
    for (const [key, value] of Object.entries(original)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});
