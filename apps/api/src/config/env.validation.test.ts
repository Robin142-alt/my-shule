import assert from 'node:assert/strict';
import test from 'node:test';

import configuration from './configuration';
import { validateEnv } from './env.validation';

const requiredEnvironment = {
  DATABASE_URL: 'postgres://myshule:secret@localhost:5432/myshule',
  REDIS_URL: 'redis://localhost:6379',
  SECURITY_PII_ENCRYPTION_KEY: 'pii-encryption-key',
  MPESA_CONSUMER_KEY: 'consumer-key',
  MPESA_CONSUMER_SECRET: 'consumer-secret',
  MPESA_SHORT_CODE: '123456',
  MPESA_PASSKEY: 'mpesa-passkey',
  MPESA_TRANSACTION_STATUS_SECURITY_CREDENTIAL: 'transaction-status-security-credential',
  MPESA_CALLBACK_URL: 'https://api.example.test/mpesa/callback',
  MPESA_CALLBACK_SECRET: 'callback-secret',
  MPESA_LEDGER_DEBIT_ACCOUNT_CODE: '1100-MPESA-CLEARING',
  MPESA_LEDGER_CREDIT_ACCOUNT_CODE: '2100-CUSTOMER-DEPOSITS',
  APP_TRUSTED_TENANT_HEADER_SECRET: 'trusted-tenant-header-secret',
  REPORT_CARD_DOWNLOAD_SIGNING_SECRET: 'report-card-download-secret',
  JWT_SECRET: 'jwt-secret',
};

const productionEnvironment = {
  ...requiredEnvironment,
  NODE_ENV: 'production',
  APP_CORS_ORIGINS: 'https://app.example.test',
  APP_TRUSTED_PROXY_CIDRS: '10.0.0.0/8,172.16.0.0/12',
  AUTH_COOKIE_SECURE: 'true',
  AUTH_COOKIE_SAME_SITE: 'lax',
  DATABASE_API_MAX_CONNECTIONS: '15',
  DATABASE_WORKER_MAX_CONNECTIONS: '5',
  DATABASE_PGBOUNCER_MODE: 'transaction',
  DATABASE_RLS_AUDIT_ENABLED: 'true',
  APP_TRUSTED_TENANT_HEADER_SECRET: 'trusted-tenant-header-secret-with-32-characters',
  REPORT_CARD_DOWNLOAD_SIGNING_SECRET: 'report-card-download-secret-with-32-characters',
  JWT_SECRET: 'jwt-secret-with-at-least-32-characters',
  SECURITY_PII_ENCRYPTION_KEY: 'MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY=',
  MPESA_CALLBACK_SECRET: 'mpesa-callback-secret-with-at-least-32-characters',
  MPESA_PAYLOAD_VAULT_ENABLED: 'true',
  MPESA_TRANSACTION_STATUS_SECURITY_CREDENTIAL:
    'mpesa-transaction-status-security-credential-32',
  UPLOAD_OBJECT_STORAGE_ENABLED: 'true',
  UPLOAD_OBJECT_STORAGE_PROVIDER: 'r2',
  UPLOAD_OBJECT_STORAGE_ENDPOINT: 'https://objects.example.test',
  UPLOAD_OBJECT_STORAGE_BUCKET: 'my-shule-files',
  UPLOAD_OBJECT_STORAGE_ACCESS_KEY_ID: 'object-access-key',
  UPLOAD_OBJECT_STORAGE_SECRET_ACCESS_KEY: 'object-secret-key-with-32-characters',
};

test('validateEnv allows startup when upload object storage is disabled', () => {
  assert.equal(validateEnv(requiredEnvironment), requiredEnvironment);
});

test('validateEnv requires a trusted tenant header signing secret', () => {
  const { APP_TRUSTED_TENANT_HEADER_SECRET, ...envWithoutTrustedTenantSecret } = requiredEnvironment;

  assert.throws(
    () => validateEnv(envWithoutTrustedTenantSecret),
    /APP_TRUSTED_TENANT_HEADER_SECRET/,
  );
});

test('validateEnv requires a report-card download signing secret', () => {
  const { REPORT_CARD_DOWNLOAD_SIGNING_SECRET, ...envWithoutReportCardSecret } = requiredEnvironment;

  assert.throws(
    () => validateEnv(envWithoutReportCardSecret),
    /REPORT_CARD_DOWNLOAD_SIGNING_SECRET/,
  );
});

test('validateEnv requires an M-Pesa transaction-status security credential', () => {
  const {
    MPESA_TRANSACTION_STATUS_SECURITY_CREDENTIAL,
    ...envWithoutTransactionStatusCredential
  } = requiredEnvironment;

  assert.throws(
    () => validateEnv(envWithoutTransactionStatusCredential),
    /MPESA_TRANSACTION_STATUS_SECURITY_CREDENTIAL/,
  );
});

test('validateEnv rejects non-HTTPS MPESA callback URLs', () => {
  assert.throws(
    () =>
      validateEnv({
        ...requiredEnvironment,
        MPESA_CALLBACK_URL: 'http://api.example.test/mpesa/callback',
      }),
    /MPESA_CALLBACK_URL must be an HTTPS URL/,
  );
});

test('validateEnv rejects production wildcard CORS and localhost MPESA callbacks', () => {
  assert.throws(
    () =>
      validateEnv({
        ...productionEnvironment,
        APP_CORS_ORIGINS: '*',
        MPESA_CALLBACK_URL: 'https://localhost/payments/mpesa/callback',
      }),
    /APP_CORS_ORIGINS must not include wildcard origins in production.*MPESA_CALLBACK_URL must not use localhost in production/s,
  );
});

test('validateEnv rejects production placeholder or weak platform secrets', () => {
  assert.throws(
    () =>
      validateEnv({
        ...productionEnvironment,
        JWT_SECRET: 'replace-with-a-long-random-secret',
        APP_TRUSTED_TENANT_HEADER_SECRET: 'short-secret',
        REPORT_CARD_DOWNLOAD_SIGNING_SECRET: 'short-report-card-secret',
      }),
    /JWT_SECRET must be a strong production secret.*APP_TRUSTED_TENANT_HEADER_SECRET must be at least 32 characters in production.*REPORT_CARD_DOWNLOAD_SIGNING_SECRET must be at least 32 characters in production/s,
  );
});

test('validateEnv rejects weak production M-Pesa transaction-status credentials', () => {
  assert.throws(
    () =>
      validateEnv({
        ...productionEnvironment,
        MPESA_TRANSACTION_STATUS_SECURITY_CREDENTIAL:
          'change-me-transaction-status-security-credential',
      }),
    /MPESA_TRANSACTION_STATUS_SECURITY_CREDENTIAL must be a strong production secret/,
  );
});

test('validateEnv rejects production database settings without PgBouncer transaction pooling budgets', () => {
  assert.throws(
    () =>
      validateEnv({
        ...productionEnvironment,
        DATABASE_PGBOUNCER_MODE: 'session',
        DATABASE_API_MAX_CONNECTIONS: '80',
        DATABASE_WORKER_MAX_CONNECTIONS: '40',
      }),
    /DATABASE_PGBOUNCER_MODE must be transaction in production.*DATABASE_API_MAX_CONNECTIONS must be between 1 and 30.*DATABASE_WORKER_MAX_CONNECTIONS must be between 1 and 10/s,
  );
});

test('validateEnv requires production object storage, proxy, secure-cookie, RLS audit, and M-Pesa vault controls', () => {
  assert.throws(
    () =>
      validateEnv({
        ...productionEnvironment,
        APP_TRUSTED_PROXY_CIDRS: '',
        AUTH_COOKIE_SECURE: 'false',
        AUTH_COOKIE_SAME_SITE: 'none',
        DATABASE_RLS_AUDIT_ENABLED: 'false',
        MPESA_PAYLOAD_VAULT_ENABLED: 'false',
        UPLOAD_OBJECT_STORAGE_ENABLED: 'false',
      }),
    /(?=.*APP_TRUSTED_PROXY_CIDRS must be configured in production)(?=.*AUTH_COOKIE_SECURE must be true in production)(?=.*AUTH_COOKIE_SAME_SITE must be lax or strict in production)(?=.*DATABASE_RLS_AUDIT_ENABLED must be true in production)(?=.*MPESA_PAYLOAD_VAULT_ENABLED must be true in production)(?=.*UPLOAD_OBJECT_STORAGE_ENABLED must be true in production)/s,
  );
});

test('validateEnv rejects external production Postgres and Redis without encrypted transport', () => {
  assert.throws(
    () =>
      validateEnv({
        ...productionEnvironment,
        DATABASE_URL: 'postgres://myshule:secret@db.example.test:5432/myshule',
        REDIS_URL: 'redis://cache.example.test:6379',
      }),
    /DATABASE_SSL must be true or DATABASE_URL must include sslmode=require for external production databases.*REDIS_URL must use rediss:\/\/ or REDIS_TLS_ENABLED=true for external production Redis/s,
  );
});

test('validateEnv allows external production Postgres and Redis with encrypted transport', () => {
  const env = {
    ...productionEnvironment,
    DATABASE_URL: 'postgres://myshule:secret@db.example.test:5432/myshule?sslmode=require',
    REDIS_URL: 'rediss://cache.example.test:6379',
  };

  assert.equal(validateEnv(env), env);
});

test('validateEnv rejects weak production PII keys and partial KMS configuration', () => {
  assert.throws(
    () =>
      validateEnv({
        ...productionEnvironment,
        SECURITY_PII_ENCRYPTION_KEY: 'short-key',
        SECURITY_KMS_PROVIDER: 'unsupported-kms',
        SECURITY_KMS_KEY_ID: '',
      }),
    /SECURITY_PII_ENCRYPTION_KEY must be a base64-encoded 32-byte key in production.*SECURITY_KMS_PROVIDER must be aws_kms, gcp_kms, azure_key_vault, or hashicorp_vault.*SECURITY_KMS_KEY_ID is required when SECURITY_KMS_PROVIDER is set/s,
  );
});

test('validateEnv rejects incomplete enabled upload object storage config', () => {
  assert.throws(
    () =>
      validateEnv({
        ...requiredEnvironment,
        UPLOAD_OBJECT_STORAGE_ENABLED: 'true',
        UPLOAD_OBJECT_STORAGE_ENDPOINT: 'http://objects.example.test',
        UPLOAD_OBJECT_STORAGE_PROVIDER: 'gcs',
      }),
    /UPLOAD_OBJECT_STORAGE_PROVIDER must be s3 or r2.*UPLOAD_OBJECT_STORAGE_ENDPOINT must be an HTTPS URL.*UPLOAD_OBJECT_STORAGE_BUCKET is required.*UPLOAD_OBJECT_STORAGE_ACCESS_KEY_ID is required.*UPLOAD_OBJECT_STORAGE_SECRET_ACCESS_KEY is required/s,
  );
});

test('validateEnv allows complete S3-compatible upload object storage config', () => {
  const env = {
    ...requiredEnvironment,
    UPLOAD_OBJECT_STORAGE_ENABLED: 'true',
    UPLOAD_OBJECT_STORAGE_PROVIDER: 'r2',
    UPLOAD_OBJECT_STORAGE_ENDPOINT: 'https://objects.example.test',
    UPLOAD_OBJECT_STORAGE_BUCKET: 'my-shule-files',
    UPLOAD_OBJECT_STORAGE_ACCESS_KEY_ID: 'object-access-key',
    UPLOAD_OBJECT_STORAGE_SECRET_ACCESS_KEY: 'object-secret-key',
  };

  assert.equal(validateEnv(env), env);
});

test('validateEnv rejects incomplete required support SMS configuration', () => {
  assert.throws(
    () =>
      validateEnv({
        ...requiredEnvironment,
        SUPPORT_PROVIDER_SMOKE_REQUIRE_SMS: 'true',
        SUPPORT_PROVIDER_SMOKE_LIVE: 'true',
        SUPPORT_NOTIFICATION_SMS_WEBHOOK_URL: 'http://sms.example.test/send',
      }),
    /SUPPORT_NOTIFICATION_SMS_WEBHOOK_URL must be an HTTPS URL.*SUPPORT_NOTIFICATION_SMS_WEBHOOK_TOKEN is required.*SUPPORT_NOTIFICATION_SMS_RECIPIENTS is required.*SUPPORT_NOTIFICATION_SMS_WEBHOOK_HEALTH_URL is required/s,
  );
});

test('validateEnv allows complete support SMS configuration', () => {
  const env = {
    ...requiredEnvironment,
    SUPPORT_PROVIDER_SMOKE_REQUIRE_SMS: 'true',
    SUPPORT_PROVIDER_SMOKE_LIVE: 'true',
    SUPPORT_NOTIFICATION_SMS_WEBHOOK_URL: 'https://sms.example.test/send',
    SUPPORT_NOTIFICATION_SMS_WEBHOOK_HEALTH_URL: 'https://sms.example.test/health',
    SUPPORT_NOTIFICATION_SMS_WEBHOOK_TOKEN: 'sms-token',
    SUPPORT_NOTIFICATION_SMS_RECIPIENTS: '+254700000000',
  };

  assert.equal(validateEnv(env), env);
});

test('validateEnv rejects incomplete required malware scan configuration', () => {
  assert.throws(
    () =>
      validateEnv({
        ...requiredEnvironment,
        SUPPORT_PROVIDER_SMOKE_LIVE: 'true',
        UPLOAD_MALWARE_SCAN_REQUIRED: 'true',
        UPLOAD_MALWARE_SCAN_PROVIDER: 'clamav',
        UPLOAD_MALWARE_SCAN_API_URL: 'http://scanner.example.test/scan',
      }),
    /UPLOAD_MALWARE_SCAN_API_URL must be an HTTPS URL.*UPLOAD_MALWARE_SCAN_API_TOKEN is required.*UPLOAD_MALWARE_SCAN_HEALTH_URL is required/s,
  );
});

test('validateEnv allows complete malware scan configuration', () => {
  const env = {
    ...requiredEnvironment,
    SUPPORT_PROVIDER_SMOKE_LIVE: 'true',
    UPLOAD_MALWARE_SCAN_REQUIRED: 'true',
    UPLOAD_MALWARE_SCAN_PROVIDER: 'clamav',
    UPLOAD_MALWARE_SCAN_API_URL: 'https://scanner.example.test/scan',
    UPLOAD_MALWARE_SCAN_HEALTH_URL: 'https://scanner.example.test/health',
    UPLOAD_MALWARE_SCAN_API_TOKEN: 'scanner-token',
  };

  assert.equal(validateEnv(env), env);
});

test('configuration maps transactional email delivery timeouts for platform invites', () => {
  const originalInvitationTimeout = process.env.EMAIL_INVITATION_DELIVERY_TIMEOUT_MS;
  const originalRequestTimeout = process.env.EMAIL_REQUEST_TIMEOUT_MS;
  const originalReportCardSigningSecret = process.env.REPORT_CARD_DOWNLOAD_SIGNING_SECRET;
  const originalReportCardTtl = process.env.REPORT_CARD_DOWNLOAD_TTL_SECONDS;
  const originalTransactionStatusCredential =
    process.env.MPESA_TRANSACTION_STATUS_SECURITY_CREDENTIAL;
  const originalApiMaxConnections = process.env.DATABASE_API_MAX_CONNECTIONS;
  const originalWorkerMaxConnections = process.env.DATABASE_WORKER_MAX_CONNECTIONS;
  const originalPgBouncerMode = process.env.DATABASE_PGBOUNCER_MODE;

  try {
    process.env.EMAIL_INVITATION_DELIVERY_TIMEOUT_MS = '26000';
    process.env.EMAIL_REQUEST_TIMEOUT_MS = '22000';
    process.env.APP_TRUSTED_TENANT_HEADER_SECRET = 'tenant-header-secret';
    process.env.REPORT_CARD_DOWNLOAD_SIGNING_SECRET = 'report-card-secret';
    process.env.REPORT_CARD_DOWNLOAD_TTL_SECONDS = '1200';
    process.env.MPESA_TRANSACTION_STATUS_SECURITY_CREDENTIAL =
      'transaction-status-security-credential';
    process.env.DATABASE_API_MAX_CONNECTIONS = '15';
    process.env.DATABASE_WORKER_MAX_CONNECTIONS = '5';
    process.env.DATABASE_PGBOUNCER_MODE = 'transaction';

    const config = configuration();

    assert.equal(config.email.invitationDeliveryTimeoutMs, 26000);
    assert.equal(config.email.requestTimeoutMs, 22000);
    assert.equal(config.app.trustedTenantHeaderSecret, 'tenant-header-secret');
    assert.equal(config.reportCards.downloadSigningSecret, 'report-card-secret');
    assert.equal(config.reportCards.downloadTtlSeconds, 1200);
    assert.equal(
      config.mpesa.transactionStatusSecurityCredential,
      'transaction-status-security-credential',
    );
    assert.equal(config.database.apiMaxConnections, 15);
    assert.equal(config.database.workerMaxConnections, 5);
    assert.equal(config.database.pgBouncerMode, 'transaction');
  } finally {
    if (originalInvitationTimeout === undefined) {
      delete process.env.EMAIL_INVITATION_DELIVERY_TIMEOUT_MS;
    } else {
      process.env.EMAIL_INVITATION_DELIVERY_TIMEOUT_MS = originalInvitationTimeout;
    }

    if (originalRequestTimeout === undefined) {
      delete process.env.EMAIL_REQUEST_TIMEOUT_MS;
    } else {
      process.env.EMAIL_REQUEST_TIMEOUT_MS = originalRequestTimeout;
    }

    if (originalReportCardSigningSecret === undefined) {
      delete process.env.REPORT_CARD_DOWNLOAD_SIGNING_SECRET;
    } else {
      process.env.REPORT_CARD_DOWNLOAD_SIGNING_SECRET = originalReportCardSigningSecret;
    }

    if (originalReportCardTtl === undefined) {
      delete process.env.REPORT_CARD_DOWNLOAD_TTL_SECONDS;
    } else {
      process.env.REPORT_CARD_DOWNLOAD_TTL_SECONDS = originalReportCardTtl;
    }

    if (originalTransactionStatusCredential === undefined) {
      delete process.env.MPESA_TRANSACTION_STATUS_SECURITY_CREDENTIAL;
    } else {
      process.env.MPESA_TRANSACTION_STATUS_SECURITY_CREDENTIAL =
        originalTransactionStatusCredential;
    }

    if (originalApiMaxConnections === undefined) {
      delete process.env.DATABASE_API_MAX_CONNECTIONS;
    } else {
      process.env.DATABASE_API_MAX_CONNECTIONS = originalApiMaxConnections;
    }

    if (originalWorkerMaxConnections === undefined) {
      delete process.env.DATABASE_WORKER_MAX_CONNECTIONS;
    } else {
      process.env.DATABASE_WORKER_MAX_CONNECTIONS = originalWorkerMaxConnections;
    }

    if (originalPgBouncerMode === undefined) {
      delete process.env.DATABASE_PGBOUNCER_MODE;
    } else {
      process.env.DATABASE_PGBOUNCER_MODE = originalPgBouncerMode;
    }
  }
});

test('configuration maps production transport and security hardening flags', () => {
  const keys = [
    'APP_TRUSTED_PROXY_CIDRS',
    'AUTH_COOKIE_SECURE',
    'AUTH_COOKIE_SAME_SITE',
    'DATABASE_SSL',
    'DATABASE_RLS_AUDIT_ENABLED',
    'REDIS_TLS_ENABLED',
    'SECURITY_KMS_PROVIDER',
    'SECURITY_KMS_KEY_ID',
    'MPESA_PAYLOAD_VAULT_ENABLED',
  ];
  const originals = new Map(keys.map((key) => [key, process.env[key]]));

  try {
    process.env.APP_TRUSTED_PROXY_CIDRS = '10.0.0.0/8,172.16.0.0/12';
    process.env.AUTH_COOKIE_SECURE = 'true';
    process.env.AUTH_COOKIE_SAME_SITE = 'strict';
    process.env.DATABASE_SSL = 'true';
    process.env.DATABASE_RLS_AUDIT_ENABLED = 'true';
    process.env.REDIS_TLS_ENABLED = 'true';
    process.env.SECURITY_KMS_PROVIDER = 'aws_kms';
    process.env.SECURITY_KMS_KEY_ID = 'arn:aws:kms:eu-west-1:123456789012:key/example';
    process.env.MPESA_PAYLOAD_VAULT_ENABLED = 'true';

    const config = configuration();

    assert.deepEqual(config.app.trustedProxyCidrs, ['10.0.0.0/8', '172.16.0.0/12']);
    assert.equal(config.auth.cookieSecure, true);
    assert.equal(config.auth.cookieSameSite, 'strict');
    assert.equal(config.database.ssl, true);
    assert.equal(config.database.rlsAuditEnabled, true);
    assert.equal(config.redis.tlsEnabled, true);
    assert.equal(config.security.kmsProvider, 'aws_kms');
    assert.equal(config.security.kmsKeyId, 'arn:aws:kms:eu-west-1:123456789012:key/example');
    assert.equal(config.mpesa.payloadVaultEnabled, true);
  } finally {
    for (const [key, value] of originals) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
});
