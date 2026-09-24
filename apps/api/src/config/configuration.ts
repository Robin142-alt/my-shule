const parseNumber = (value: string | undefined, fallback: number): number => {
  if (!value) {
    return fallback;
  }

  const parsedValue = Number(value);
  return Number.isNaN(parsedValue) ? fallback : parsedValue;
};

const parseCsv = (value: string | undefined): string[] => {
  if (!value) {
    return [];
  }

  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
};

const parseBoolean = (value: string | undefined, fallback: boolean): boolean => {
  if (!value) {
    return fallback;
  }

  const normalizedValue = value.trim().toLowerCase();

  if (['1', 'true', 'yes', 'on'].includes(normalizedValue)) {
    return true;
  }

  if (['0', 'false', 'no', 'off'].includes(normalizedValue)) {
    return false;
  }

  return fallback;
};

const appRuntime = process.env.APP_RUNTIME ?? 'server';
const isRailwayRuntime = Boolean(
  process.env.RAILWAY_ENVIRONMENT_ID
  || process.env.RAILWAY_PROJECT_ID
  || process.env.RAILWAY_SERVICE_ID
  || process.env.RAILWAY_DEPLOYMENT_ID,
);
const isServerlessRuntime =
  !isRailwayRuntime && (appRuntime === 'serverless' || process.env.VERCEL === '1');

export default () => ({
  app: {
    nodeEnv: process.env.NODE_ENV ?? 'development',
    port: parseNumber(process.env.PORT, 3000),
    runtime: appRuntime,
    isServerlessRuntime,
    corsEnabled: parseBoolean(process.env.APP_CORS_ENABLED, true),
    corsOrigins: parseCsv(process.env.APP_CORS_ORIGINS),
    corsMethods: parseCsv(process.env.APP_CORS_METHODS),
    corsCredentials: parseBoolean(process.env.APP_CORS_CREDENTIALS, true),
    baseDomain: process.env.APP_BASE_DOMAIN ?? 'localhost',
    defaultTenantId: process.env.DEFAULT_TENANT_ID ?? null,
    trustedTenantHeaderSecret: process.env.APP_TRUSTED_TENANT_HEADER_SECRET ?? '',
    trustedProxyCidrs: parseCsv(process.env.APP_TRUSTED_PROXY_CIDRS),
    globalPrefix: process.env.APP_GLOBAL_PREFIX ?? '',
    shutdownTimeoutMs: parseNumber(process.env.APP_SHUTDOWN_TIMEOUT_MS, 15000),
  },
  reportCards: {
    workerConcurrency: parseNumber(process.env.REPORT_WORKER_CONCURRENCY, 1),
    workerLane: process.env.REPORT_WORKER_LANE ?? 'all',
    downloadSigningSecret: process.env.REPORT_CARD_DOWNLOAD_SIGNING_SECRET ?? '',
    downloadTtlSeconds: parseNumber(process.env.REPORT_CARD_DOWNLOAD_TTL_SECONDS, 900),
  },
  database: {
    url: process.env.DATABASE_URL ?? '',
    runtimeRole: process.env.DATABASE_RUNTIME_ROLE ?? 'my_shule_runtime',
    maxConnections: parseNumber(process.env.DATABASE_MAX_CONNECTIONS, isServerlessRuntime ? 3 : 20),
    apiMaxConnections: parseNumber(
      process.env.DATABASE_API_MAX_CONNECTIONS,
      parseNumber(process.env.DATABASE_MAX_CONNECTIONS, isServerlessRuntime ? 3 : 20),
    ),
    workerMaxConnections: parseNumber(process.env.DATABASE_WORKER_MAX_CONNECTIONS, isServerlessRuntime ? 2 : 5),
    pgBouncerMode: process.env.DATABASE_PGBOUNCER_MODE ?? 'transaction',
    ssl: parseBoolean(process.env.DATABASE_SSL, false),
    rlsAuditEnabled: parseBoolean(process.env.DATABASE_RLS_AUDIT_ENABLED, false),
    idleTimeoutMs: parseNumber(process.env.DATABASE_IDLE_TIMEOUT_MS, 10000),
    statementTimeoutMs: parseNumber(process.env.DATABASE_STATEMENT_TIMEOUT_MS, 5000),
    connectionTimeoutMs: parseNumber(process.env.DATABASE_CONNECT_TIMEOUT_MS, isServerlessRuntime ? 1500 : 10000),
    connectMaxRetries: parseNumber(process.env.DATABASE_CONNECT_MAX_RETRIES, 10),
    connectRetryDelayMs: parseNumber(process.env.DATABASE_CONNECT_RETRY_DELAY_MS, 2000),
  },
  redis: {
    url: (appRuntime==='reports-worker' ? process.env.REPORT_REDIS_URL : undefined) ?? process.env.REDIS_URL ?? 'redis://127.0.0.1:6379',
    required: parseBoolean(process.env.REDIS_REQUIRED, !isServerlessRuntime),
    tlsEnabled: parseBoolean(process.env.REDIS_TLS_ENABLED, false),
    connectTimeoutMs: parseNumber(process.env.REDIS_CONNECT_TIMEOUT_MS, isServerlessRuntime ? 1500 : 10000),
  },
  queue: {
    prefix: process.env.QUEUE_PREFIX ?? 'my-shule',
    defaultJobAttempts: parseNumber(process.env.QUEUE_DEFAULT_JOB_ATTEMPTS, 3),
    removeOnComplete: parseNumber(process.env.QUEUE_REMOVE_ON_COMPLETE, 1000),
    removeOnFail: parseNumber(process.env.QUEUE_REMOVE_ON_FAIL, 5000),
  },
  cache: {
    staleWhileRevalidateTtlSeconds: parseNumber(
      process.env.CACHE_STALE_WHILE_REVALIDATE_TTL_SECONDS,
      60,
    ),
    stampedeLockTtlSeconds: parseNumber(
      process.env.CACHE_STAMPEDE_LOCK_TTL_SECONDS,
      5,
    ),
  },
  implementation90: {
    targetUsersPerSecond: parseNumber(
      process.env.IMPLEMENTATION90_TARGET_USERS_PER_SECOND,
      5000,
    ),
    durationMinutes: parseNumber(process.env.IMPLEMENTATION90_DURATION_MINUTES, 30),
    maxApiErrorRate: parseNumber(process.env.IMPLEMENTATION90_MAX_API_ERROR_RATE, 0.001),
    maxMoneyFlowErrorRate: parseNumber(
      process.env.IMPLEMENTATION90_MAX_MONEY_FLOW_ERROR_RATE,
      0.0001,
    ),
  },
  auth: {
    issuer: process.env.JWT_ISSUER ?? 'my-shule-api',
    audience: process.env.JWT_AUDIENCE ?? 'my-shule-web',
    accessTokenSecret:
      process.env.JWT_ACCESS_TOKEN_SECRET ?? process.env.JWT_SECRET ?? '',
    refreshTokenSecret:
      process.env.JWT_REFRESH_TOKEN_SECRET ?? process.env.JWT_SECRET ?? '',
    cookieSecure: parseBoolean(process.env.AUTH_COOKIE_SECURE, process.env.NODE_ENV === 'production'),
    cookieSameSite: process.env.AUTH_COOKIE_SAME_SITE ?? 'lax',
    systemOwnerEmail: process.env.SYSTEM_OWNER_EMAIL ?? '',
    accessTokenTtlSeconds: parseNumber(process.env.JWT_ACCESS_TOKEN_TTL_SECONDS, 900),
    refreshTokenTtlSeconds: parseNumber(process.env.JWT_REFRESH_TOKEN_TTL_SECONDS, 2592000),
    refreshTokenRotationGraceSeconds: parseNumber(
      process.env.JWT_REFRESH_TOKEN_ROTATION_GRACE_SECONDS,
      30,
    ),
    bcryptSaltRounds: parseNumber(process.env.BCRYPT_SALT_ROUNDS, 12),
  },
  email: {
    provider: process.env.EMAIL_PROVIDER ?? 'resend',
    resendApiKey: process.env.RESEND_API_KEY ?? '',
    from: process.env.EMAIL_FROM ?? '',
    publicAppUrl:
      process.env.PUBLIC_APP_URL ??
      process.env.WEB_APP_URL ??
      'https://my-shule-erp.vercel.app',
    passwordRecoveryTtlMinutes: parseNumber(
      process.env.PASSWORD_RECOVERY_TTL_MINUTES,
      30,
    ),
    mfaCodeTtlMinutes: parseNumber(
      process.env.MFA_CODE_TTL_MINUTES,
      10,
    ),
    invitationTtlMinutes: parseNumber(
      process.env.INVITATION_TTL_MINUTES,
      10080,
    ),
    requestTimeoutMs: parseNumber(
      process.env.EMAIL_REQUEST_TIMEOUT_MS,
      22000,
    ),
    invitationDeliveryTimeoutMs: parseNumber(
      process.env.EMAIL_INVITATION_DELIVERY_TIMEOUT_MS,
      26000,
    ),
  },
  support: {
    notificationEmails: parseCsv(process.env.SUPPORT_NOTIFICATION_EMAILS),
    notificationSmsWebhookUrl: process.env.SUPPORT_NOTIFICATION_SMS_WEBHOOK_URL ?? '',
    notificationSmsWebhookToken: process.env.SUPPORT_NOTIFICATION_SMS_WEBHOOK_TOKEN ?? '',
    notificationSmsRecipients: parseCsv(process.env.SUPPORT_NOTIFICATION_SMS_RECIPIENTS),
    notificationMaxAttempts: parseNumber(process.env.SUPPORT_NOTIFICATION_MAX_ATTEMPTS, 3),
    notificationRetryWorkerEnabled: parseBoolean(
      process.env.SUPPORT_NOTIFICATION_RETRY_WORKER_ENABLED,
      !isServerlessRuntime,
    ),
    notificationRetryIntervalMs: parseNumber(
      process.env.SUPPORT_NOTIFICATION_RETRY_INTERVAL_MS,
      60000,
    ),
    notificationRetryBatchSize: parseNumber(
      process.env.SUPPORT_NOTIFICATION_RETRY_BATCH_SIZE,
      50,
    ),
    notificationRetryLeaseMs: parseNumber(
      process.env.SUPPORT_NOTIFICATION_RETRY_LEASE_MS,
      300000,
    ),
    slaBreachMonitorEnabled: parseBoolean(
      process.env.SUPPORT_SLA_BREACH_MONITOR_ENABLED,
      !isServerlessRuntime,
    ),
    slaBreachMonitorIntervalMs: parseNumber(
      process.env.SUPPORT_SLA_BREACH_MONITOR_INTERVAL_MS,
      60000,
    ),
    slaBreachBatchSize: parseNumber(
      process.env.SUPPORT_SLA_BREACH_BATCH_SIZE,
      50,
    ),
  },
  finance: {
    idempotencyTtlSeconds: parseNumber(process.env.FINANCE_IDEMPOTENCY_TTL_SECONDS, 86400),
  },
  billing: {
    accessCacheTtlSeconds: parseNumber(process.env.BILLING_ACCESS_CACHE_TTL_SECONDS, 60),
  },
  security: {
    piiEncryptionKey: process.env.SECURITY_PII_ENCRYPTION_KEY ?? '',
    kmsProvider: process.env.SECURITY_KMS_PROVIDER ?? '',
    kmsKeyId: process.env.SECURITY_KMS_KEY_ID ?? '',
    lockdownBypassSecret: process.env.SECURITY_LOCKDOWN_BYPASS_SECRET ?? '',
    rateLimitWindowSeconds: parseNumber(process.env.SECURITY_RATE_LIMIT_WINDOW_SECONDS, 60),
    rateLimitMaxRequests: parseNumber(process.env.SECURITY_RATE_LIMIT_MAX_REQUESTS, 120),
    publicReadRateLimitMaxRequests: parseNumber(
      process.env.SECURITY_PUBLIC_READ_RATE_LIMIT_MAX_REQUESTS,
      500,
    ),
    authenticatedReadRateLimitMaxRequests: parseNumber(
      process.env.SECURITY_AUTHENTICATED_READ_RATE_LIMIT_MAX_REQUESTS,
      300,
    ),
    writeRateLimitMaxRequests: parseNumber(
      process.env.SECURITY_WRITE_RATE_LIMIT_MAX_REQUESTS,
      60,
    ),
    adminRateLimitMaxRequests: parseNumber(
      process.env.SECURITY_ADMIN_RATE_LIMIT_MAX_REQUESTS,
      20,
    ),
    authRateLimitMaxRequests: parseNumber(
      process.env.SECURITY_AUTH_RATE_LIMIT_MAX_REQUESTS,
      20,
    ),
    authSessionRateLimitMaxRequests: parseNumber(
      process.env.SECURITY_AUTH_SESSION_RATE_LIMIT_MAX_REQUESTS,
      10,
    ),
    authRecoveryRateLimitMaxRequests: parseNumber(
      process.env.SECURITY_AUTH_RECOVERY_RATE_LIMIT_MAX_REQUESTS,
      5,
    ),
    portalOtpTtlSeconds: parseNumber(process.env.SECURITY_PORTAL_OTP_TTL_SECONDS, 600),
    portalOtpResendCooldownSeconds: parseNumber(
      process.env.SECURITY_PORTAL_OTP_RESEND_COOLDOWN_SECONDS,
      60,
    ),
    portalOtpRateWindowSeconds: parseNumber(
      process.env.SECURITY_PORTAL_OTP_RATE_WINDOW_SECONDS,
      3600,
    ),
    portalOtpRateMaxRequests: parseNumber(
      process.env.SECURITY_PORTAL_OTP_RATE_MAX_REQUESTS,
      5,
    ),
    parentOtpRateLimitMaxRequests: parseNumber(
      process.env.SECURITY_PARENT_OTP_RATE_LIMIT_MAX_REQUESTS,
      5,
    ),
    mpesaCallbackRateLimitMaxRequests: parseNumber(
      process.env.SECURITY_MPESA_CALLBACK_RATE_LIMIT_MAX_REQUESTS,
      60,
    ),
    fraudHighValueAmountMinor:
      process.env.SECURITY_FRAUD_HIGH_VALUE_AMOUNT_MINOR ?? '5000000',
    fraudVelocityWindowSeconds: parseNumber(
      process.env.SECURITY_FRAUD_VELOCITY_WINDOW_SECONDS,
      900,
    ),
    fraudVelocityThreshold: parseNumber(process.env.SECURITY_FRAUD_VELOCITY_THRESHOLD, 5),
    fraudCrossAccountThreshold: parseNumber(
      process.env.SECURITY_FRAUD_CROSS_ACCOUNT_THRESHOLD,
      3,
    ),
    fraudRepeatedAmountThreshold: parseNumber(
      process.env.SECURITY_FRAUD_REPEATED_AMOUNT_THRESHOLD,
      3,
    ),
    fraudCallbackFailureThreshold: parseNumber(
      process.env.SECURITY_FRAUD_CALLBACK_FAILURE_THRESHOLD,
      3,
    ),
  },
  mpesa: {
    baseUrl: process.env.MPESA_BASE_URL ?? 'https://sandbox.safaricom.co.ke',
    consumerKey: process.env.MPESA_CONSUMER_KEY ?? '',
    consumerSecret: process.env.MPESA_CONSUMER_SECRET ?? '',
    shortCode: process.env.MPESA_SHORT_CODE ?? '',
    passkey: process.env.MPESA_PASSKEY ?? '',
    transactionStatusSecurityCredential:
      process.env.MPESA_TRANSACTION_STATUS_SECURITY_CREDENTIAL ?? '',
    transactionType: process.env.MPESA_TRANSACTION_TYPE ?? 'CustomerPayBillOnline',
    callbackUrl: process.env.MPESA_CALLBACK_URL ?? '',
    callbackSecret: process.env.MPESA_CALLBACK_SECRET ?? '',
    callbackTrustMode: process.env.MPESA_CALLBACK_TRUST_MODE ?? 'edge_signed',
    payloadVaultEnabled: parseBoolean(process.env.MPESA_PAYLOAD_VAULT_ENABLED, true),
    callbackTimestampToleranceSeconds: parseNumber(
      process.env.MPESA_CALLBACK_TIMESTAMP_TOLERANCE_SECONDS,
      300,
    ),
    replayWindowSeconds: parseNumber(process.env.MPESA_REPLAY_WINDOW_SECONDS, 86400),
    queueName: process.env.MPESA_QUEUE_NAME ?? 'payments-mpesa',
    requestTimeoutMs: parseNumber(process.env.MPESA_REQUEST_TIMEOUT_MS, 15000),
    queueConcurrency: parseNumber(process.env.MPESA_QUEUE_CONCURRENCY, 5),
    paymentIntentExpirySeconds: parseNumber(
      process.env.MPESA_PAYMENT_INTENT_EXPIRY_SECONDS,
      1800,
    ),
    staleIntentSweepBatchSize: parseNumber(
      process.env.MPESA_STALE_INTENT_SWEEP_BATCH_SIZE,
      100,
    ),
    ledgerDebitAccountCode: process.env.MPESA_LEDGER_DEBIT_ACCOUNT_CODE ?? '1110-MPESA-CLEARING',
    ledgerCreditAccountCode:
      process.env.MPESA_LEDGER_CREDIT_ACCOUNT_CODE ?? '2100-CUSTOMER-DEPOSITS',
  },
  events: {
    queueName: process.env.EVENTS_QUEUE_NAME ?? 'erp-events',
    dispatcherEnabled: parseBoolean(
      process.env.EVENTS_DISPATCHER_ENABLED,
      !isServerlessRuntime,
    ),
    workerEnabled: parseBoolean(
      process.env.EVENTS_WORKER_ENABLED,
      !isServerlessRuntime,
    ),
    workerConcurrency: parseNumber(process.env.EVENTS_WORKER_CONCURRENCY, 2),
    dispatcherIntervalMs: parseNumber(process.env.EVENTS_DISPATCHER_INTERVAL_MS, 1000),
    dispatcherBatchSize: parseNumber(process.env.EVENTS_DISPATCHER_BATCH_SIZE, 100),
    dashboardRealtimePollMs: parseNumber(process.env.EVENTS_DASHBOARD_REALTIME_POLL_MS, 15000),
    staleProcessingAfterMs: parseNumber(process.env.EVENTS_STALE_PROCESSING_AFTER_MS, 30000),
    retryDelayMs: parseNumber(process.env.EVENTS_RETRY_DELAY_MS, 5000),
    maxAttempts: parseNumber(process.env.EVENTS_MAX_ATTEMPTS, 25),
  },
  communication: {
    smsOutboxWorkerEnabled: parseBoolean(
      process.env.COMMUNICATION_SMS_OUTBOX_WORKER_ENABLED,
      false,
    ),
    smsOutboxWorkerIntervalMs: parseNumber(
      process.env.COMMUNICATION_SMS_OUTBOX_WORKER_INTERVAL_MS,
      5000,
    ),
    smsOutboxBatchSize: parseNumber(process.env.COMMUNICATION_SMS_OUTBOX_BATCH_SIZE, 25),
    smsOutboxConcurrency: parseNumber(process.env.COMMUNICATION_SMS_OUTBOX_CONCURRENCY, 5),
    smsOutboxLeaseMs: parseNumber(process.env.COMMUNICATION_SMS_OUTBOX_LEASE_MS, 120000),
    smsOutboxMaxAttempts: parseNumber(process.env.COMMUNICATION_SMS_OUTBOX_MAX_ATTEMPTS, 8),
    smsOutboxRetryBaseMs: parseNumber(process.env.COMMUNICATION_SMS_OUTBOX_RETRY_BASE_MS, 60000),
    smsOutboxRetryMaxMs: parseNumber(process.env.COMMUNICATION_SMS_OUTBOX_RETRY_MAX_MS, 3600000),
    smsProviderRequestTimeoutMs: parseNumber(process.env.SMS_PROVIDER_REQUEST_TIMEOUT_MS, 10000),
    smsProviderAllowedHosts: process.env.SMS_PROVIDER_ALLOWED_HOSTS ?? '',
  },
  observability: {
    sloWindowSeconds: parseNumber(process.env.OBSERVABILITY_SLO_WINDOW_SECONDS, 900),
    sloBackgroundEnabled: parseBoolean(
      process.env.OBSERVABILITY_SLO_BACKGROUND_ENABLED,
      !isServerlessRuntime,
    ),
    sloEvaluationIntervalSeconds: parseNumber(
      process.env.OBSERVABILITY_SLO_EVALUATION_INTERVAL_SECONDS,
      30,
    ),
  },
});
