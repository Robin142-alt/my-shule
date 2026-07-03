import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  loadLocalProviderSmokeEnv,
  runProviderCredentialSmoke,
  validateProviderCredentialEnvironment,
} from './provider-credential-smoke';

const configuredEnvironment = {
  EMAIL_PROVIDER: 'resend',
  RESEND_API_KEY: 're_test_123456789',
  EMAIL_PROVIDER_SMOKE_URL: 'https://email.example.test/health',
  EMAIL_FROM: 'My Shule <support@myshule.test>',
  PUBLIC_APP_URL: 'https://my-shule-erp.example.test',
  SUPPORT_NOTIFICATION_EMAILS: 'support@myshule.test,ops@myshule.test',
  SUPPORT_NOTIFICATION_SMS_WEBHOOK_URL: 'https://sms.example.test/hooks/my-shule',
  SUPPORT_NOTIFICATION_SMS_WEBHOOK_HEALTH_URL: 'https://sms.example.test/health',
  SUPPORT_NOTIFICATION_SMS_WEBHOOK_TOKEN: 'sms-secret-token',
  SUPPORT_NOTIFICATION_SMS_RECIPIENTS: '+254700000001,+254700000002',
  SUPPORT_PROVIDER_SMOKE_REQUIRE_SMS: 'true',
  SUPPORT_NOTIFICATION_RETRY_WORKER_ENABLED: 'true',
  SUPPORT_NOTIFICATION_MAX_ATTEMPTS: '3',
  SUPPORT_NOTIFICATION_RETRY_INTERVAL_MS: '60000',
  SUPPORT_NOTIFICATION_RETRY_BATCH_SIZE: '50',
  SUPPORT_NOTIFICATION_RETRY_LEASE_MS: '300000',
  REDIS_URL: 'rediss://default:redis-secret-token@redis.example.test:6379',
  REDIS_TLS_ENABLED: 'true',
  REDIS_CONNECT_TIMEOUT_MS: '10000',
  UPLOAD_MALWARE_SCAN_PROVIDER: 'clamav',
  UPLOAD_MALWARE_SCAN_API_URL: 'https://scan.example.test/v1/files',
  UPLOAD_MALWARE_SCAN_HEALTH_URL: 'https://scan.example.test/health',
  UPLOAD_MALWARE_SCAN_API_TOKEN: 'scan-secret-token',
  UPLOAD_MALWARE_SCAN_REQUIRED: 'true',
  UPLOAD_OBJECT_STORAGE_ENABLED: 'true',
  UPLOAD_OBJECT_STORAGE_PROVIDER: 'r2',
  UPLOAD_OBJECT_STORAGE_ENDPOINT: 'https://objects.example.test',
  UPLOAD_OBJECT_STORAGE_BUCKET: 'my-shule-files',
  UPLOAD_OBJECT_STORAGE_REGION: 'auto',
  UPLOAD_OBJECT_STORAGE_ACCESS_KEY_ID: 'object-access-key',
  UPLOAD_OBJECT_STORAGE_SECRET_ACCESS_KEY: 'object-secret-key',
};

test('provider credential smoke check passes configured channels without exposing secrets', async () => {
  const result = await runProviderCredentialSmoke({
    env: configuredEnvironment,
    requireSms: true,
  });

  assert.equal(result.ok, true);
  assert.equal(result.summary.failed, 0);
  assert.equal(result.checks.some((check) => check.id === 'transactional-email'), true);
  assert.equal(result.checks.some((check) => check.id === 'support-sms'), true);
  assert.equal(result.checks.some((check) => check.id === 'redis-queue-cache'), true);
  assert.equal(result.checks.some((check) => check.id === 'upload-malware-scan'), true);
  assert.equal(result.checks.some((check) => check.id === 'upload-object-storage'), true);

  const serialized = JSON.stringify(result);
  assert.equal(serialized.includes(configuredEnvironment.RESEND_API_KEY), false);
  assert.equal(serialized.includes(configuredEnvironment.SUPPORT_NOTIFICATION_SMS_WEBHOOK_TOKEN), false);
  assert.equal(serialized.includes(configuredEnvironment.SUPPORT_NOTIFICATION_SMS_WEBHOOK_URL), false);
  assert.equal(serialized.includes(configuredEnvironment.REDIS_URL), false);
  assert.equal(serialized.includes(configuredEnvironment.UPLOAD_MALWARE_SCAN_API_TOKEN), false);
  assert.equal(serialized.includes(configuredEnvironment.UPLOAD_MALWARE_SCAN_API_URL), false);
  assert.equal(serialized.includes(configuredEnvironment.UPLOAD_OBJECT_STORAGE_ENDPOINT), false);
  assert.equal(serialized.includes(configuredEnvironment.UPLOAD_OBJECT_STORAGE_ACCESS_KEY_ID), false);
  assert.equal(serialized.includes(configuredEnvironment.UPLOAD_OBJECT_STORAGE_SECRET_ACCESS_KEY), false);
});

test('provider credential smoke env loader reads production env files without overriding process env', () => {
  const workspace = mkdtempSync(join(tmpdir(), 'myshule-provider-smoke-'));
  const trackedKeys = [
    'RESEND_API_KEY',
    'EMAIL_FROM',
    'PUBLIC_APP_URL',
    'SUPPORT_NOTIFICATION_EMAILS',
  ];
  const previousValues = Object.fromEntries(
    trackedKeys.map((key) => [key, process.env[key]]),
  );

  try {
    for (const key of trackedKeys) {
      delete process.env[key];
    }

    writeFileSync(
      join(workspace, '.env'),
      [
        'RESEND_API_KEY=base-key',
        'EMAIL_FROM=Base <base@myshule.test>',
        'PUBLIC_APP_URL=https://base.myshule.test',
        'SUPPORT_NOTIFICATION_EMAILS=base-support@myshule.test',
      ].join('\n'),
    );
    writeFileSync(
      join(workspace, '.env.local'),
      [
        'RESEND_API_KEY=local-key',
        'EMAIL_FROM=Local <local@myshule.test>',
        'PUBLIC_APP_URL=https://local.myshule.test',
        'SUPPORT_NOTIFICATION_EMAILS=local-support@myshule.test',
      ].join('\n'),
    );
    writeFileSync(
      join(workspace, '.env.production'),
      [
        'RESEND_API_KEY=production-key',
        'EMAIL_FROM=Production <support@myshule.test>',
        'PUBLIC_APP_URL=https://app.myshule.test',
        'SUPPORT_NOTIFICATION_EMAILS=support@myshule.test,ops@myshule.test',
      ].join('\n'),
    );
    writeFileSync(
      join(workspace, '.env.production.local'),
      [
        'RESEND_API_KEY=production-local-key',
        'EMAIL_FROM=Production Local <support-local@myshule.test>',
        'PUBLIC_APP_URL=https://local-production.myshule.test',
        'SUPPORT_NOTIFICATION_EMAILS=local-production-support@myshule.test',
      ].join('\n'),
    );
    mkdirSync(join(workspace, '.vercel'), { recursive: true });
    writeFileSync(
      join(workspace, '.vercel', '.env.production.local'),
      [
        'RESEND_API_KEY=',
        'EMAIL_FROM=',
        'PUBLIC_APP_URL=',
        'SUPPORT_NOTIFICATION_EMAILS=',
      ].join('\n'),
    );

    loadLocalProviderSmokeEnv(workspace);

    assert.equal(process.env.RESEND_API_KEY, 'production-local-key');
    assert.equal(process.env.EMAIL_FROM, 'Production Local <support-local@myshule.test>');
    assert.equal(process.env.PUBLIC_APP_URL, 'https://local-production.myshule.test');
    assert.equal(process.env.SUPPORT_NOTIFICATION_EMAILS, 'local-production-support@myshule.test');

    process.env.RESEND_API_KEY = 'process-env-key';
    loadLocalProviderSmokeEnv(workspace);

    assert.equal(process.env.RESEND_API_KEY, 'process-env-key');
  } finally {
    for (const key of trackedKeys) {
      const previousValue = previousValues[key];

      if (previousValue === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = previousValue;
      }
    }

    rmSync(workspace, { recursive: true, force: true });
  }
});

test('provider credential smoke live checks probe SMS and malware health without exposing secrets', async () => {
  const probedUrls: string[] = [];
  const result = await runProviderCredentialSmoke({
    env: configuredEnvironment,
    requireSms: true,
    live: true,
    fetchImpl: async (url, init) => {
      probedUrls.push(url);
      assert.equal(init.method, url === configuredEnvironment.EMAIL_PROVIDER_SMOKE_URL ? 'POST' : 'GET');
      assert.equal(init.headers.Authorization.startsWith('Bearer '), true);
      assert.equal(init.headers['User-Agent'], 'my-shule-provider-smoke');

      if (url === configuredEnvironment.EMAIL_PROVIDER_SMOKE_URL) {
        assert.equal(init.headers['Content-Type'], 'application/json');
        assert.equal(init.body, '{}');
        return {
          ok: false,
          status: 422,
          text: async () => 'missing email payload',
        };
      }

      return {
        ok: true,
        status: 200,
        text: async () => (
          url === configuredEnvironment.SUPPORT_NOTIFICATION_SMS_WEBHOOK_HEALTH_URL
            ? JSON.stringify({
              status: 'ok',
              dry_run: false,
              provider_configured: true,
              provider_ready: true,
            })
            : 'ok'
        ),
      };
    },
    objectStorageFetchImpl: async (_url, init) => {
      if (init.method === 'GET') {
        return {
          ok: true,
          status: 200,
          arrayBuffer: async () => Uint8Array.from(Buffer.from('my-shule-provider-smoke')).buffer,
        };
      }

      return {
        ok: true,
        status: init.method === 'DELETE' ? 204 : 200,
        headers: {
          get: (name: string) => (name.toLowerCase() === 'etag' ? '"provider-smoke-etag"' : null),
        },
      };
    },
    redisPingImpl: async () => undefined,
  });

  assert.equal(
    result.checks.find((check) => check.id === 'live-support-sms-provider')?.status,
    'pass',
  );
  assert.equal(
    result.checks.find((check) => check.id === 'live-upload-malware-scan-provider')?.status,
    'pass',
  );
  assert.deepEqual(probedUrls, [
    configuredEnvironment.EMAIL_PROVIDER_SMOKE_URL ?? '',
    configuredEnvironment.SUPPORT_NOTIFICATION_SMS_WEBHOOK_HEALTH_URL,
    configuredEnvironment.UPLOAD_MALWARE_SCAN_HEALTH_URL,
  ].filter(Boolean));

  const serialized = JSON.stringify(result);
  assert.equal(serialized.includes(configuredEnvironment.SUPPORT_NOTIFICATION_SMS_WEBHOOK_HEALTH_URL), false);
  assert.equal(serialized.includes(configuredEnvironment.SUPPORT_NOTIFICATION_SMS_WEBHOOK_TOKEN), false);
  assert.equal(serialized.includes(configuredEnvironment.UPLOAD_MALWARE_SCAN_HEALTH_URL), false);
  assert.equal(serialized.includes(configuredEnvironment.UPLOAD_MALWARE_SCAN_API_TOKEN), false);
});

test('provider credential smoke live email check fails on unauthenticated Resend responses', async () => {
  const result = await runProviderCredentialSmoke({
    env: configuredEnvironment,
    live: true,
    fetchImpl: async () => ({
      ok: false,
      status: 401,
      text: async () => 'unauthorized',
    }),
    redisPingImpl: async () => undefined,
  });

  const emailCheck = result.checks.find((check) => check.id === 'live-email-provider');

  assert.equal(result.ok, false);
  assert.equal(emailCheck?.status, 'fail');
  assert.match(emailCheck?.message ?? '', /Transactional email provider rejected live smoke authentication with HTTP 401/);

  const serialized = JSON.stringify(result);
  assert.equal(serialized.includes(configuredEnvironment.RESEND_API_KEY), false);
  assert.equal(serialized.includes(configuredEnvironment.EMAIL_PROVIDER_SMOKE_URL), false);
});

test('provider credential smoke live object storage check fails clearly when storage is disabled', async () => {
  const result = await runProviderCredentialSmoke({
    env: {
      ...configuredEnvironment,
      EMAIL_PROVIDER_SMOKE_URL: '',
      UPLOAD_OBJECT_STORAGE_ENABLED: 'false',
    },
    live: true,
    fetchImpl: async () => ({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({
        object: 'list',
        has_more: false,
        data: [
          {
            name: 'myshule.test',
            status: 'verified',
            capabilities: {
              sending: 'enabled',
            },
          },
        ],
      }),
    }),
    redisPingImpl: async () => undefined,
  });

  const storageCheck = result.checks.find((check) => check.id === 'live-upload-object-storage');

  assert.equal(result.ok, false);
  assert.equal(storageCheck?.status, 'fail');
  assert.match(storageCheck?.message ?? '', /UPLOAD_OBJECT_STORAGE_ENABLED must be true/);
  assert.deepEqual(storageCheck?.metadata, {
    live: true,
    provider: 'r2',
    enabled: false,
    write_checked: false,
    read_checked: false,
    delete_checked: false,
  });
});

test('provider credential smoke live email check probes Resend sender domain by default', async () => {
  const probedUrls: string[] = [];
  let uploadedContent: Buffer<ArrayBufferLike> = Buffer.from('placeholder');
  const result = await runProviderCredentialSmoke({
    env: {
      ...configuredEnvironment,
      EMAIL_PROVIDER_SMOKE_URL: '',
      EMAIL_FROM: 'My Shule <support@myshule.test>',
    },
    live: true,
    fetchImpl: async (url, init) => {
      probedUrls.push(url);

      if (url === 'https://api.resend.com/domains') {
        assert.equal(init.method, 'GET');
        assert.equal(init.headers.Authorization.startsWith('Bearer '), true);

        return {
          ok: true,
          status: 200,
          text: async () => JSON.stringify({
            object: 'list',
            has_more: false,
            data: [
              {
                name: 'myshule.test',
                status: 'verified',
                capabilities: {
                  sending: 'enabled',
                },
              },
            ],
          }),
        };
      }

      return {
        ok: true,
        status: 200,
        text: async () => (
          url === configuredEnvironment.SUPPORT_NOTIFICATION_SMS_WEBHOOK_HEALTH_URL
            ? JSON.stringify({
              status: 'ok',
              dry_run: false,
              provider_configured: true,
              provider_ready: true,
            })
            : 'ok'
        ),
      };
    },
    objectStorageFetchImpl: async (_url, init) => {
      if (init.method === 'PUT') {
        uploadedContent = init.body;

        return {
          ok: true,
          status: 200,
          headers: {
            get: (name: string) => (name.toLowerCase() === 'etag' ? '"provider-smoke-etag"' : null),
          },
        };
      }

      if (init.method === 'GET') {
        return {
          ok: true,
          status: 200,
          arrayBuffer: async () => Uint8Array.from(uploadedContent).buffer,
        };
      }

      return {
        ok: true,
        status: init.method === 'DELETE' ? 204 : 200,
        headers: {
          get: (name: string) => (name.toLowerCase() === 'etag' ? '"provider-smoke-etag"' : null),
        },
      };
    },
    redisPingImpl: async () => undefined,
  });

  assert.equal(result.ok, true);
  assert.deepEqual(probedUrls, [
    'https://api.resend.com/domains',
    configuredEnvironment.SUPPORT_NOTIFICATION_SMS_WEBHOOK_HEALTH_URL,
    configuredEnvironment.UPLOAD_MALWARE_SCAN_HEALTH_URL,
  ]);
});

test('provider credential smoke live email check fails when Resend sender domain is not verified', async () => {
  const result = await runProviderCredentialSmoke({
    env: {
      ...configuredEnvironment,
      EMAIL_PROVIDER_SMOKE_URL: '',
      EMAIL_FROM: 'My Shule <support@myshule.test>',
    },
    live: true,
    fetchImpl: async (url) => ({
      ok: true,
      status: 200,
      text: async () => (
        url === 'https://api.resend.com/domains'
          ? JSON.stringify({
            object: 'list',
            has_more: false,
            data: [
              {
                name: 'myshule.test',
                status: 'not_started',
                capabilities: {
                  sending: 'disabled',
                },
              },
            ],
          })
          : JSON.stringify({
            status: 'ok',
            dry_run: false,
            provider_configured: true,
            provider_ready: true,
          })
      ),
    }),
    objectStorageFetchImpl: async (_url, init) => {
      if (init.method === 'GET') {
        return {
          ok: true,
          status: 200,
          arrayBuffer: async () => Uint8Array.from(Buffer.from('my-shule-provider-smoke')).buffer,
        };
      }

      return {
        ok: true,
        status: init.method === 'DELETE' ? 204 : 200,
        headers: {
          get: (name: string) => (name.toLowerCase() === 'etag' ? '"provider-smoke-etag"' : null),
        },
      };
    },
    redisPingImpl: async () => undefined,
  });

  const emailCheck = result.checks.find((check) => check.id === 'live-email-provider');
  const serialized = JSON.stringify(result);

  assert.equal(result.ok, false);
  assert.equal(emailCheck?.status, 'fail');
  assert.match(emailCheck?.message ?? '', /sender domain is not verified/);
  assert.equal(serialized.includes(configuredEnvironment.RESEND_API_KEY), false);
});

test('provider credential smoke live SMS check fails when relay is still in dry-run mode', async () => {
  const result = await runProviderCredentialSmoke({
    env: configuredEnvironment,
    requireSms: true,
    live: true,
    fetchImpl: async (url) => ({
      ok: true,
      status: 200,
      text: async () => (
        url === configuredEnvironment.SUPPORT_NOTIFICATION_SMS_WEBHOOK_HEALTH_URL
          ? JSON.stringify({
            status: 'ok',
            dry_run: true,
            provider_configured: false,
            provider_ready: false,
          })
          : 'ok'
      ),
    }),
    objectStorageFetchImpl: async (_url, init) => {
      if (init.method === 'GET') {
        return {
          ok: true,
          status: 200,
          arrayBuffer: async () => Uint8Array.from(Buffer.from('my-shule-provider-smoke')).buffer,
        };
      }

      return {
        ok: true,
        status: init.method === 'DELETE' ? 204 : 200,
        headers: {
          get: (name: string) => (name.toLowerCase() === 'etag' ? '"provider-smoke-etag"' : null),
        },
      };
    },
    redisPingImpl: async () => undefined,
  });

  const smsCheck = result.checks.find((check) => check.id === 'live-support-sms-provider');

  assert.equal(result.ok, false);
  assert.equal(smsCheck?.status, 'fail');
  assert.match(smsCheck?.message ?? '', /dry-run mode/);

  const serialized = JSON.stringify(result);
  assert.equal(serialized.includes(configuredEnvironment.SUPPORT_NOTIFICATION_SMS_WEBHOOK_HEALTH_URL), false);
  assert.equal(serialized.includes(configuredEnvironment.SUPPORT_NOTIFICATION_SMS_WEBHOOK_TOKEN), false);
});

test('provider credential smoke live checks fail when required malware health URL is missing', async () => {
  const result = await runProviderCredentialSmoke({
    env: {
      ...configuredEnvironment,
      UPLOAD_MALWARE_SCAN_HEALTH_URL: '',
    },
    requireSms: true,
    live: true,
    fetchImpl: async (url) => ({
      ok: true,
      status: 200,
      text: async () => (
        url === configuredEnvironment.SUPPORT_NOTIFICATION_SMS_WEBHOOK_HEALTH_URL
          ? JSON.stringify({
            status: 'ok',
            dry_run: false,
            provider_configured: true,
            provider_ready: true,
          })
          : 'ok'
      ),
    }),
    redisPingImpl: async () => undefined,
  });

  assert.equal(result.ok, false);
  assert.equal(
    result.checks.find((check) => check.id === 'live-upload-malware-scan-provider')?.message,
    'UPLOAD_MALWARE_SCAN_HEALTH_URL is required when live upload malware scan smoke checks are enabled.',
  );
});

test('provider credential smoke live object storage writes reads and deletes tenant-scoped probe object', async () => {
  const objectRequests: Array<{ method: string; body?: Buffer }> = [];
  const expectedContent = Buffer.from('placeholder');
  let uploadedContent: Buffer = expectedContent;
  const result = await runProviderCredentialSmoke({
    env: configuredEnvironment,
    requireSms: true,
    live: true,
    fetchImpl: async (url) => ({
      ok: true,
      status: 200,
      text: async () => (
        url === configuredEnvironment.SUPPORT_NOTIFICATION_SMS_WEBHOOK_HEALTH_URL
          ? JSON.stringify({
            status: 'ok',
            dry_run: false,
            provider_configured: true,
            provider_ready: true,
          })
          : 'ok'
      ),
    }),
    objectStorageFetchImpl: async (_url, init) => {
      objectRequests.push({
        method: init.method,
        body: init.method === 'PUT' ? init.body : undefined,
      });

      if (init.method === 'PUT') {
        uploadedContent = init.body;
        return {
          ok: true,
          status: 200,
          headers: {
            get: (name: string) => (name.toLowerCase() === 'etag' ? '"provider-smoke-etag"' : null),
          },
        };
      }

      if (init.method === 'GET') {
        return {
          ok: true,
          status: 200,
          arrayBuffer: async () => Uint8Array.from(uploadedContent).buffer,
        };
      }

      return {
        ok: true,
        status: 204,
      };
    },
    redisPingImpl: async () => undefined,
  });

  assert.equal(result.ok, true);
  assert.equal(
    result.checks.find((check) => check.id === 'live-upload-object-storage')?.status,
    'pass',
  );
  assert.deepEqual(objectRequests.map((request) => request.method), ['PUT', 'GET', 'DELETE']);

  const serialized = JSON.stringify(result);
  assert.equal(serialized.includes(configuredEnvironment.UPLOAD_OBJECT_STORAGE_ENDPOINT), false);
  assert.equal(serialized.includes(configuredEnvironment.UPLOAD_OBJECT_STORAGE_ACCESS_KEY_ID), false);
  assert.equal(serialized.includes(configuredEnvironment.UPLOAD_OBJECT_STORAGE_SECRET_ACCESS_KEY), false);
});

test('provider credential smoke validates Redis queue/cache TLS configuration', async () => {
  const result = await runProviderCredentialSmoke({
    env: {
      ...configuredEnvironment,
      REDIS_URL: 'redis://default:redis-secret-token@localhost:6379',
      REDIS_TLS_ENABLED: 'false',
    },
    requireSms: true,
  });

  const redisCheck = result.checks.find((check) => check.id === 'redis-queue-cache');

  assert.equal(result.ok, true);
  assert.equal(redisCheck?.status, 'pass');
  assert.equal(JSON.stringify(result).includes('redis-secret-token'), false);
});

test('provider credential validation rejects non-TLS external Redis queue/cache URLs', () => {
  const errors = validateProviderCredentialEnvironment({
    ...configuredEnvironment,
    REDIS_URL: 'redis://default:redis-secret-token@redis.example.test:6379',
    REDIS_TLS_ENABLED: 'false',
  });

  assert.deepEqual(errors, [
    'Production Redis queue/cache must use TLS via rediss:// or REDIS_TLS_ENABLED=true.',
  ]);
});

test('provider credential smoke live Redis check fails without leaking Redis credentials', async () => {
  const result = await runProviderCredentialSmoke({
    env: configuredEnvironment,
    requireSms: true,
    live: true,
    fetchImpl: async (url) => ({
      ok: true,
      status: 200,
      text: async () => (
        url === configuredEnvironment.SUPPORT_NOTIFICATION_SMS_WEBHOOK_HEALTH_URL
          ? JSON.stringify({
            status: 'ok',
            dry_run: false,
            provider_configured: true,
            provider_ready: true,
          })
          : 'ok'
      ),
    }),
    objectStorageFetchImpl: async (_url, init) => {
      if (init.method === 'GET') {
        return {
          ok: true,
          status: 200,
          arrayBuffer: async () => Uint8Array.from(Buffer.from('my-shule-provider-smoke')).buffer,
        };
      }

      return {
        ok: true,
        status: init.method === 'DELETE' ? 204 : 200,
        headers: {
          get: (name: string) => (name.toLowerCase() === 'etag' ? '"provider-smoke-etag"' : null),
        },
      };
    },
    redisPingImpl: async () => {
      throw new Error(`Connection failed for ${configuredEnvironment.REDIS_URL}`);
    },
  });

  const redisCheck = result.checks.find((check) => check.id === 'live-redis-queue-cache');
  const serialized = JSON.stringify(result);

  assert.equal(result.ok, false);
  assert.equal(redisCheck?.status, 'fail');
  assert.match(redisCheck?.message ?? '', /Live Redis queue\/cache probe failed/);
  assert.equal(serialized.includes(configuredEnvironment.REDIS_URL), false);
  assert.equal(serialized.includes('redis-secret-token'), false);
});

test('provider credential validation fails when transactional email is incomplete', () => {
  const errors = validateProviderCredentialEnvironment({
    ...configuredEnvironment,
    RESEND_API_KEY: '',
  });

  assert.deepEqual(errors, [
    'RESEND_API_KEY is required for transactional email.',
  ]);
});

test('provider credential validation rejects placeholder provider values', () => {
  const errors = validateProviderCredentialEnvironment({
    ...configuredEnvironment,
    RESEND_API_KEY: 'replace-with-resend-api-key',
    EMAIL_FROM: 'MyShule <no-reply@example.com>',
    SUPPORT_NOTIFICATION_EMAILS: 'support@example.com',
  });

  assert.deepEqual(errors, [
    'RESEND_API_KEY must be a real Resend key, not a placeholder.',
    'EMAIL_FROM must be a real verified sender, not a placeholder.',
    'SUPPORT_NOTIFICATION_EMAILS must contain real support recipients, not placeholders.',
  ]);
});

test('provider credential validation requires SMS settings to be complete when SMS is required', () => {
  const errors = validateProviderCredentialEnvironment(
    {
      ...configuredEnvironment,
      SUPPORT_NOTIFICATION_SMS_WEBHOOK_TOKEN: '',
      SUPPORT_NOTIFICATION_SMS_RECIPIENTS: '',
    },
    { requireSms: true },
  );

  assert.deepEqual(errors, [
    'SUPPORT_NOTIFICATION_SMS_WEBHOOK_TOKEN is required when support SMS smoke checks are enabled.',
    'SUPPORT_NOTIFICATION_SMS_RECIPIENTS must contain at least one recipient when support SMS smoke checks are enabled.',
  ]);
});

test('provider credential validation rejects retired attendance notification targets', () => {
  const errors = validateProviderCredentialEnvironment({
    ...configuredEnvironment,
    SUPPORT_NOTIFICATION_EMAILS: 'attendance@myshule.test',
  });

  assert.deepEqual(errors, [
    'Provider smoke configuration references retired attendance functionality.',
  ]);
});

test('provider credential validation requires complete upload malware scan provider settings', () => {
  const errors = validateProviderCredentialEnvironment({
    ...configuredEnvironment,
    UPLOAD_MALWARE_SCAN_API_TOKEN: '',
  });

  assert.deepEqual(errors, [
    'UPLOAD_MALWARE_SCAN_API_TOKEN is required when upload malware scan smoke checks are enabled.',
  ]);
});

test('provider credential validation requires complete object storage settings when enabled', () => {
  const errors = validateProviderCredentialEnvironment({
    ...configuredEnvironment,
    UPLOAD_OBJECT_STORAGE_ENDPOINT: 'http://objects.example.test',
    UPLOAD_OBJECT_STORAGE_BUCKET: '',
    UPLOAD_OBJECT_STORAGE_SECRET_ACCESS_KEY: '',
  });

  assert.deepEqual(errors, [
    'UPLOAD_OBJECT_STORAGE_ENDPOINT must be an HTTPS URL when upload object storage is enabled.',
    'UPLOAD_OBJECT_STORAGE_BUCKET is required when upload object storage is enabled.',
    'UPLOAD_OBJECT_STORAGE_SECRET_ACCESS_KEY is required when upload object storage is enabled.',
  ]);
});
