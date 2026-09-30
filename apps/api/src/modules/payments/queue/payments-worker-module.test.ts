import 'reflect-metadata';
import assert from 'node:assert/strict';
import test from 'node:test';
import { Test } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { DATABASE_POOL } from '../../../database/database.constants';
import { DatabaseService } from '../../../database/database.service';
import { DatabaseSecurityService } from '../../../database/database-security.service';
import { PrismaService } from '../../../database/prisma.service';
import { REDIS_CLIENT } from '../../../infrastructure/redis/redis.constants';
import { PaymentIngressService } from '../ingress/payment-ingress.service';
import { PaymentInboxRecoveryService } from '../services/payment-inbox-recovery.service';
import { PAYMENTS_QUEUE_NAME } from '../payments.constants';

test('standalone payments worker resolves the real ingress and accounting dependency graph', async () => {
  const env: Record<string, string> = {
    NODE_ENV: 'test', DATABASE_URL: 'postgresql://test:test@127.0.0.1:1/disposable',
    REDIS_URL: 'redis://127.0.0.1:1', SECURITY_PII_ENCRYPTION_KEY: 'a'.repeat(64),
    MPESA_CONSUMER_KEY: 'test', MPESA_CONSUMER_SECRET: 'test', MPESA_SHORT_CODE: '123456',
    MPESA_PASSKEY: 'test', MPESA_TRANSACTION_STATUS_SECURITY_CREDENTIAL: 'test',
    MPESA_CALLBACK_URL: 'https://test.invalid/callback', MPESA_CALLBACK_SECRET: 'test',
    MPESA_LEDGER_DEBIT_ACCOUNT_CODE: '1100', MPESA_LEDGER_CREDIT_ACCOUNT_CODE: '2100',
    APP_TRUSTED_TENANT_HEADER_SECRET: 'test', JWT_SECRET: 'test',
    RESEND_API_KEY: 're_test_123456789', EMAIL_FROM: 'MyShule <support@myshule.test>',
    SUPPORT_NOTIFICATION_EMAILS: 'support@myshule.test', PUBLIC_APP_URL: 'https://app.myshule.test',
    UPLOAD_OBJECT_STORAGE_ENABLED: 'false',
  };
  const original = Object.fromEntries(Object.keys(env).map(key => [key, process.env[key]]));
  Object.assign(process.env, env);
  try {
    const { PaymentsWorkerModule } = await import('./payments-worker.module');
    const module = await Test.createTestingModule({ imports: [PaymentsWorkerModule] })
      .overrideProvider(DATABASE_POOL).useValue({})
      .overrideProvider(DatabaseService).useValue({})
      .overrideProvider(DatabaseSecurityService).useValue({})
      .overrideProvider(PrismaService).useValue({})
      .overrideProvider(REDIS_CLIENT).useValue({ status: 'end' })
      .overrideProvider(getQueueToken(PAYMENTS_QUEUE_NAME)).useValue({ close: async () => {} })
      .compile();
    assert.ok(module.get(PaymentIngressService));
    assert.ok(module.get(PaymentInboxRecoveryService));
    await module.close();
  } finally {
    for (const [key, value] of Object.entries(original)) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  }
});
