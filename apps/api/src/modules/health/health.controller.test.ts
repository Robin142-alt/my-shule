import assert from 'node:assert/strict';
import test from 'node:test';

import { HealthController } from './health.controller';

const productionEnvKeys = [
  'NODE_ENV',
  'DATABASE_URL',
  'REDIS_URL',
  'SECURITY_PII_ENCRYPTION_KEY',
  'MPESA_CONSUMER_KEY',
  'MPESA_CONSUMER_SECRET',
  'MPESA_SHORT_CODE',
  'MPESA_PASSKEY',
  'MPESA_TRANSACTION_STATUS_SECURITY_CREDENTIAL',
  'MPESA_CALLBACK_URL',
  'MPESA_CALLBACK_SECRET',
  'MPESA_LEDGER_DEBIT_ACCOUNT_CODE',
  'MPESA_LEDGER_CREDIT_ACCOUNT_CODE',
  'APP_TRUSTED_TENANT_HEADER_SECRET',
  'REPORT_CARD_DOWNLOAD_SIGNING_SECRET',
  'RESEND_API_KEY',
  'EMAIL_FROM',
  'PUBLIC_APP_URL',
  'SUPPORT_NOTIFICATION_EMAILS',
  'JWT_SECRET',
  'APP_CORS_ORIGINS',
  'APP_TRUSTED_PROXY_CIDRS',
  'DATABASE_PGBOUNCER_MODE',
  'DATABASE_RLS_AUDIT_ENABLED',
  'MPESA_PAYLOAD_VAULT_ENABLED',
  'UPLOAD_OBJECT_STORAGE_ENABLED',
  'UPLOAD_OBJECT_STORAGE_PROVIDER',
  'UPLOAD_OBJECT_STORAGE_ENDPOINT',
  'UPLOAD_OBJECT_STORAGE_BUCKET',
  'UPLOAD_OBJECT_STORAGE_REGION',
  'UPLOAD_OBJECT_STORAGE_ACCESS_KEY_ID',
  'UPLOAD_OBJECT_STORAGE_SECRET_ACCESS_KEY',
  'AUTH_COOKIE_SECURE',
  'AUTH_COOKIE_SAME_SITE',
  'DATABASE_API_MAX_CONNECTIONS',
  'DATABASE_WORKER_MAX_CONNECTIONS',
];

function withTemporaryProductionEnv(values: Record<string, string>, run: () => Promise<void>): Promise<void> {
  const previous = new Map<string, string | undefined>();

  for (const key of productionEnvKeys) {
    previous.set(key, process.env[key]);
    delete process.env[key];
  }

  Object.assign(process.env, values);

  return run().finally(() => {
    for (const key of productionEnvKeys) {
      const previousValue = previous.get(key);

      if (previousValue === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = previousValue;
      }
    }
  });
}

test('HealthController readiness surfaces transactional email configuration without secrets', async () => {
  const controller = new HealthController(
    {
      requireStore: () => ({
        request_id: 'req-health',
        tenant_id: 'green-valley',
        user_id: 'system',
        role: 'system',
        session_id: null,
        is_authenticated: false,
      }),
    } as never,
    {
      ping: async () => 'up',
      getPoolMetrics: () => ({ totalCount: 1, idleCount: 1, waitingCount: 0 }),
    } as never,
    { ping: async () => 'up' } as never,
    undefined,
    undefined,
    {
      getTransactionalEmailStatus: () => ({
        provider: 'resend',
        status: 'configured',
        api_key_configured: true,
        sender_configured: true,
        public_app_url_configured: true,
      }),
    } as never,
  );

  const readiness = await controller.getReadiness();

  assert.equal(readiness.services.transactional_email, 'configured');
  assert.deepEqual(readiness.email, {
    provider: 'resend',
    status: 'configured',
    api_key_configured: true,
    sender_configured: true,
    public_app_url_configured: true,
  });
  assert.equal(JSON.stringify(readiness).includes('re_secret'), false);
});

test('HealthController readiness surfaces production CORS allowlist status without origin values', async () => {
  const controller = new HealthController(
    {
      requireStore: () => ({
        request_id: 'req-cors',
        tenant_id: null,
        user_id: 'system',
        role: 'system',
        session_id: null,
        is_authenticated: false,
      }),
    } as never,
    {
      ping: async () => 'up',
      getPoolMetrics: () => ({ totalCount: 1, idleCount: 1, waitingCount: 0 }),
    } as never,
    { ping: async () => 'up' } as never,
    undefined,
    undefined,
    undefined,
    {
      get: <T>(key: string) =>
        ({
          'app.corsEnabled': true,
          'app.nodeEnv': 'production',
          'app.corsOrigins': ['https://my-shule-erp.vercel.app'],
          'app.corsCredentials': true,
        })[key] as T | undefined,
    } as never,
  );

  const readiness = await controller.getReadiness();

  assert.deepEqual(readiness.cors, {
    status: 'configured',
    credentials: true,
    allow_all_origins: false,
    origin_count: 1,
    production_locked: true,
  });
  assert.equal(JSON.stringify(readiness).includes('my-shule-erp.vercel.app'), false);
});

test('HealthController readiness rejects placeholder production provider environment', async () => {
  await withTemporaryProductionEnv(
    {
      NODE_ENV: 'production',
      DATABASE_URL: 'postgres://user:pass@db.example.test:5432/myshule?sslmode=require',
      REDIS_URL: 'rediss://default:redis-secret@cache.example.test:6379',
      SECURITY_PII_ENCRYPTION_KEY: 'MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY=',
      MPESA_CONSUMER_KEY: 'mpesa-consumer-key',
      MPESA_CONSUMER_SECRET: 'mpesa-consumer-secret',
      MPESA_SHORT_CODE: '123456',
      MPESA_PASSKEY: 'mpesa-passkey',
      MPESA_TRANSACTION_STATUS_SECURITY_CREDENTIAL: 'mpesa-security-credential',
      MPESA_CALLBACK_URL: 'https://api.myshule.test/payments/mpesa/callback',
      MPESA_CALLBACK_SECRET: 'long-random-mpesa-callback-secret',
      MPESA_LEDGER_DEBIT_ACCOUNT_CODE: 'BANK',
      MPESA_LEDGER_CREDIT_ACCOUNT_CODE: 'FEES',
      APP_TRUSTED_TENANT_HEADER_SECRET: 'long-random-tenant-header-secret',
      REPORT_CARD_DOWNLOAD_SIGNING_SECRET: 'long-random-report-card-secret',
      RESEND_API_KEY: 'replace-with-resend-api-key',
      EMAIL_FROM: 'MyShule <no-reply@example.com>',
      PUBLIC_APP_URL: 'https://www.myshule.test',
      SUPPORT_NOTIFICATION_EMAILS: 'support@example.com',
      JWT_SECRET: 'long-random-jwt-secret-for-production',
      APP_CORS_ORIGINS: 'https://www.myshule.test',
      APP_TRUSTED_PROXY_CIDRS: '10.0.0.0/8',
      DATABASE_PGBOUNCER_MODE: 'transaction',
      DATABASE_RLS_AUDIT_ENABLED: 'true',
      MPESA_PAYLOAD_VAULT_ENABLED: 'true',
      UPLOAD_OBJECT_STORAGE_ENABLED: 'true',
      UPLOAD_OBJECT_STORAGE_PROVIDER: 'r2',
      UPLOAD_OBJECT_STORAGE_ENDPOINT: 'https://objects.example.com',
      UPLOAD_OBJECT_STORAGE_BUCKET: 'myshule-files',
      UPLOAD_OBJECT_STORAGE_REGION: 'auto',
      UPLOAD_OBJECT_STORAGE_ACCESS_KEY_ID: 'replace-with-object-storage-access-key',
      UPLOAD_OBJECT_STORAGE_SECRET_ACCESS_KEY: 'replace-with-object-storage-secret-key',
      AUTH_COOKIE_SECURE: 'true',
      AUTH_COOKIE_SAME_SITE: 'lax',
      DATABASE_API_MAX_CONNECTIONS: '3',
      DATABASE_WORKER_MAX_CONNECTIONS: '2',
    },
    async () => {
      const controller = new HealthController(
        {
          requireStore: () => ({
            request_id: 'req-prod-env',
            tenant_id: null,
            user_id: 'system',
            role: 'system',
            session_id: null,
            is_authenticated: false,
          }),
        } as never,
        {
          ping: async () => 'up',
          getPoolMetrics: () => ({ totalCount: 1, idleCount: 1, waitingCount: 0 }),
        } as never,
        { ping: async () => 'up' } as never,
        undefined,
        undefined,
        undefined,
        {
          get: <T>(key: string) =>
            ({
              'app.corsEnabled': true,
              'app.nodeEnv': 'production',
              'app.corsOrigins': ['https://www.myshule.test'],
              'app.corsCredentials': true,
              UPLOAD_OBJECT_STORAGE_ENABLED: 'true',
              UPLOAD_OBJECT_STORAGE_PROVIDER: 'r2',
              UPLOAD_OBJECT_STORAGE_ENDPOINT: 'https://objects.example.com',
              UPLOAD_OBJECT_STORAGE_BUCKET: 'myshule-files',
              UPLOAD_OBJECT_STORAGE_REGION: 'auto',
              UPLOAD_OBJECT_STORAGE_ACCESS_KEY_ID: 'replace-with-object-storage-access-key',
              UPLOAD_OBJECT_STORAGE_SECRET_ACCESS_KEY: 'replace-with-object-storage-secret-key',
            })[key] as T | undefined,
        } as never,
      );

      const readiness = await controller.getReadiness();

      assert.equal(readiness.status, 'degraded');
      assert.equal(readiness.services.production_env, 'invalid');
      assert.match(readiness.production_env.issues.join('\n'), /RESEND_API_KEY must be a real Resend key/);
      assert.match(readiness.production_env.issues.join('\n'), /UPLOAD_OBJECT_STORAGE_ACCESS_KEY_ID/);
      assert.equal(JSON.stringify(readiness).includes('replace-with-object-storage-secret-key'), false);
    },
  );
});

test('HealthController readiness surfaces support notification provider status without secrets', async () => {
  const controller = new HealthController(
    {
      requireStore: () => ({
        request_id: 'req-support-notifications',
        tenant_id: null,
        user_id: 'system',
        role: 'system',
        session_id: null,
        is_authenticated: false,
      }),
    } as never,
    {
      ping: async () => 'up',
      getPoolMetrics: () => ({ totalCount: 1, idleCount: 1, waitingCount: 0 }),
    } as never,
    { ping: async () => 'up' } as never,
    undefined,
    undefined,
    undefined,
    undefined,
    {
      getProviderStatus: () => ({
        status: 'configured',
        email: {
          status: 'configured',
          provider: 'resend',
          transactional_email: 'configured',
          recipients_configured: true,
          recipient_count: 2,
        },
        sms: {
          status: 'configured',
          dispatch_provider_configured: true,
          dispatch_provider_status: 'configured',
          webhook_url_configured: true,
          webhook_token_configured: true,
          recipients_configured: true,
          recipient_count: 1,
          missing: [],
        },
        retry: {
          worker_enabled: true,
          interval_ms: 60000,
          batch_size: 25,
          lease_ms: 120000,
          max_attempts: 4,
        },
      }),
    } as never,
  );

  const readiness = await controller.getReadiness();

  assert.equal(readiness.services.support_notifications, 'configured');
  assert.equal(readiness.support_notifications?.email.recipient_count, 2);
  assert.equal(readiness.support_notifications?.sms.dispatch_provider_configured, true);
  assert.equal(JSON.stringify(readiness).includes('sms-secret-token'), false);
  assert.equal(JSON.stringify(readiness).includes('support@myshule.test'), false);
});

test('HealthController readiness surfaces object storage and malware scanning without secrets', async () => {
  const controller = new HealthController(
    {
      requireStore: () => ({
        request_id: 'req-upload-readiness',
        tenant_id: null,
        user_id: 'system',
        role: 'system',
        session_id: null,
        is_authenticated: false,
      }),
    } as never,
    {
      ping: async () => 'up',
      getPoolMetrics: () => ({ totalCount: 1, idleCount: 1, waitingCount: 0 }),
    } as never,
    { ping: async () => 'up' } as never,
    undefined,
    undefined,
    undefined,
    {
      get: <T>(key: string) =>
        ({
          UPLOAD_OBJECT_STORAGE_ENABLED: 'true',
          UPLOAD_OBJECT_STORAGE_PROVIDER: 'r2',
          UPLOAD_OBJECT_STORAGE_ENDPOINT: 'https://objects.example.test',
          UPLOAD_OBJECT_STORAGE_BUCKET: 'myshule-files',
          UPLOAD_OBJECT_STORAGE_REGION: 'auto',
          UPLOAD_OBJECT_STORAGE_ACCESS_KEY_ID: 'access-key-id',
          UPLOAD_OBJECT_STORAGE_SECRET_ACCESS_KEY: 'secret-access-key',
          UPLOAD_MALWARE_SCAN_REQUIRED: 'true',
          UPLOAD_MALWARE_SCAN_PROVIDER: 'clamav',
          UPLOAD_MALWARE_SCAN_API_URL: 'https://scanner.example.test/scan',
          UPLOAD_MALWARE_SCAN_API_TOKEN: 'scanner-token',
          UPLOAD_MALWARE_SCAN_HEALTH_URL: 'https://scanner.example.test/health',
        })[key] as T | undefined,
    } as never,
  );

  const readiness = await controller.getReadiness();

  assert.equal(readiness.status, 'ok');
  assert.equal(readiness.services.object_storage, 'configured');
  assert.equal(readiness.services.malware_scanning, 'configured');
  assert.deepEqual(readiness.object_storage, {
    status: 'configured',
    enabled: true,
    provider: 'r2',
    endpoint_configured: true,
    bucket_configured: true,
    region_configured: true,
    access_key_configured: true,
    secret_key_configured: true,
    missing: [],
  });
  assert.deepEqual(readiness.malware_scanning, {
    status: 'configured',
    required: true,
    provider_configured: true,
    api_url_configured: true,
    api_token_configured: true,
    health_url_configured: true,
    missing: [],
  });
  assert.equal(JSON.stringify(readiness).includes('secret-access-key'), false);
  assert.equal(JSON.stringify(readiness).includes('scanner-token'), false);
});

test('HealthController readiness is degraded when required upload security providers are incomplete', async () => {
  const controller = new HealthController(
    {
      requireStore: () => ({
        request_id: 'req-upload-readiness-missing',
        tenant_id: null,
        user_id: 'system',
        role: 'system',
        session_id: null,
        is_authenticated: false,
      }),
    } as never,
    {
      ping: async () => 'up',
      getPoolMetrics: () => ({ totalCount: 1, idleCount: 1, waitingCount: 0 }),
    } as never,
    { ping: async () => 'up' } as never,
    undefined,
    undefined,
    undefined,
    {
      get: <T>(key: string) =>
        ({
          UPLOAD_OBJECT_STORAGE_ENABLED: 'true',
          UPLOAD_OBJECT_STORAGE_ENDPOINT: 'https://objects.example.test',
          UPLOAD_MALWARE_SCAN_REQUIRED: 'true',
          UPLOAD_MALWARE_SCAN_PROVIDER: 'clamav',
        })[key] as T | undefined,
    } as never,
  );

  const readiness = await controller.getReadiness();

  assert.equal(readiness.status, 'degraded');
  assert.equal(readiness.services.object_storage, 'missing_credentials');
  assert.equal(readiness.services.malware_scanning, 'missing_credentials');
  assert.deepEqual(readiness.object_storage.missing, ['bucket', 'access_key', 'secret_key']);
  assert.deepEqual(readiness.malware_scanning.missing, ['api_url', 'api_token']);
});

test('HealthController readiness keeps warning SLO telemetry visible without failing readiness', async () => {
  const controller = new HealthController(
    {
      requireStore: () => ({
        request_id: 'req-slo-warning',
        tenant_id: 'green-valley',
        user_id: 'system',
        role: 'system',
        session_id: null,
        is_authenticated: false,
      }),
    } as never,
    {
      ping: async () => 'up',
      getPoolMetrics: () => ({ totalCount: 1, idleCount: 1, waitingCount: 0 }),
    } as never,
    { ping: async () => 'up' } as never,
    undefined,
    {
      getRealtimeHealth: async () => ({
        generated_at: '2026-05-26T20:35:00.000Z',
        overall_status: 'degraded',
        active_alert_count: 1,
        critical_alert_count: 0,
        subsystem_statuses: [{ subsystem: 'api', status: 'degraded' }],
      }),
    } as never,
  );

  const readiness = await controller.getReadiness();

  assert.equal(readiness.status, 'ok');
  assert.equal(readiness.slo?.overall_status, 'degraded');
  assert.equal(readiness.slo?.active_alert_count, 1);
});

test('HealthController readiness reports optional Redis degradation without throwing', async () => {
  const controller = new HealthController(
    {
      requireStore: () => ({
        request_id: 'req-redis-degraded',
        tenant_id: 'green-valley',
        user_id: 'system',
        role: 'system',
        session_id: null,
        is_authenticated: false,
      }),
    } as never,
    {
      ping: async () => 'up',
      getPoolMetrics: () => ({ totalCount: 1, idleCount: 1, waitingCount: 0 }),
    } as never,
    { ping: async () => 'degraded' } as never,
  );

  const readiness = await controller.getReadiness();

  assert.equal(readiness.status, 'degraded');
  assert.equal(readiness.services.redis, 'degraded');
  assert.equal(readiness.services.bullmq, 'degraded');
});

test('HealthController readiness converts dependency failures into degraded status', async () => {
  const controller = new HealthController(
    {
      requireStore: () => ({
        request_id: 'req-dependency-failure',
        tenant_id: 'green-valley',
        user_id: 'system',
        role: 'system',
        session_id: null,
        is_authenticated: false,
      }),
    } as never,
    {
      ping: async () => {
        throw new Error('database unavailable');
      },
      getPoolMetrics: () => ({ totalCount: 0, idleCount: 0, waitingCount: 0 }),
    } as never,
    { ping: async () => 'degraded' } as never,
    undefined,
    {
      getRealtimeHealth: async () => {
        throw new Error('slo unavailable');
      },
    } as never,
    undefined,
    undefined,
    {
      getProviderStatus: async () => {
        throw new Error('support provider unavailable');
      },
    } as never,
  );

  const readiness = await controller.getReadiness();

  assert.equal(readiness.status, 'degraded');
  assert.equal(readiness.services.postgres, 'down');
  assert.equal(readiness.services.redis, 'degraded');
  assert.equal(readiness.services.support_notifications, 'degraded');
  assert.equal(readiness.slo?.overall_status, 'degraded');
});

test('HealthController readiness falls back instead of throwing when context is unavailable', async () => {
  const controller = new HealthController(
    {
      requireStore: () => {
        throw new Error('request context unavailable');
      },
    } as never,
    {
      ping: async () => 'up',
      getPoolMetrics: () => ({ totalCount: 0, idleCount: 0, waitingCount: 0 }),
    } as never,
    { ping: async () => 'degraded' } as never,
  );

  const readiness = await controller.getReadiness();

  assert.equal(readiness.status, 'degraded');
  assert.equal(readiness.services.redis, 'degraded');
  assert.equal(readiness.request_context.is_authenticated, false);
});

test('HealthController readiness is degraded by critical SLO telemetry', async () => {
  const controller = new HealthController(
    {
      requireStore: () => ({
        request_id: 'req-slo-critical',
        tenant_id: 'green-valley',
        user_id: 'system',
        role: 'system',
        session_id: null,
        is_authenticated: false,
      }),
    } as never,
    {
      ping: async () => 'up',
      getPoolMetrics: () => ({ totalCount: 1, idleCount: 1, waitingCount: 0 }),
    } as never,
    { ping: async () => 'up' } as never,
    undefined,
    {
      getRealtimeHealth: async () => ({
        generated_at: '2026-05-26T20:35:00.000Z',
        overall_status: 'critical',
        active_alert_count: 1,
        critical_alert_count: 1,
        subsystem_statuses: [{ subsystem: 'api', status: 'critical' }],
      }),
    } as never,
  );

  const readiness = await controller.getReadiness();

  assert.equal(readiness.status, 'degraded');
  assert.equal(readiness.slo?.overall_status, 'critical');
});
