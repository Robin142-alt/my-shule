const REQUIRED_ENV_VARS = [
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
  'SUPPORT_NOTIFICATION_EMAILS',
];
const EMAIL_PATTERN = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;

export interface EnvironmentValidationIssue {
  type: 'missing' | 'invalid';
  message: string;
}

export interface EnvironmentValidationReport {
  ok: boolean;
  missing: string[];
  invalid: string[];
  issues: EnvironmentValidationIssue[];
}

export function validateEnv(env: Record<string, unknown>): Record<string, unknown> {
  const report = collectEnvValidationIssues(env);

  if (report.missing.length > 0) {
    throw new Error(`Missing required environment variables: ${report.missing.join(', ')}`);
  }

  if (report.invalid.length > 0) {
    throw new Error(`Invalid environment variables: ${report.invalid.join(', ')}`);
  }

  return env;
}

export function collectEnvValidationIssues(env: Record<string, unknown>): EnvironmentValidationReport {
  const missingEnvVars = REQUIRED_ENV_VARS.filter((key) => {
    const value = env[key];
    return typeof value !== 'string' || value.trim().length === 0;
  });
  const invalidEnvVars = [
    ...validateMpesaEnv(env),
    ...validateTransactionalEmailEnv(env),
    ...validateSupportEmailEnv(env),
    ...validateProductionEnv(env),
    ...validateSupportSmsEnv(env),
    ...validateUploadMalwareScanEnv(env),
    ...validateUploadObjectStorageEnv(env),
  ];

  const hasJwtSecret =
    typeof env.JWT_SECRET === 'string' && env.JWT_SECRET.trim().length > 0;
  const hasAccessTokenSecret =
    typeof env.JWT_ACCESS_TOKEN_SECRET === 'string'
    && env.JWT_ACCESS_TOKEN_SECRET.trim().length > 0;
  const hasRefreshTokenSecret =
    typeof env.JWT_REFRESH_TOKEN_SECRET === 'string'
    && env.JWT_REFRESH_TOKEN_SECRET.trim().length > 0;

  if (!hasJwtSecret && (!hasAccessTokenSecret || !hasRefreshTokenSecret)) {
    missingEnvVars.push('JWT_SECRET or both JWT_ACCESS_TOKEN_SECRET and JWT_REFRESH_TOKEN_SECRET');
  }

  return {
    ok: missingEnvVars.length === 0 && invalidEnvVars.length === 0,
    missing: missingEnvVars,
    invalid: invalidEnvVars,
    issues: [
      ...missingEnvVars.map((message) => ({ type: 'missing' as const, message })),
      ...invalidEnvVars.map((message) => ({ type: 'invalid' as const, message })),
    ],
  };
}

function validateTransactionalEmailEnv(env: Record<string, unknown>): string[] {
  const errors: string[] = [];
  const provider = getString(env, 'EMAIL_PROVIDER') || 'resend';
  const apiKey = getString(env, 'RESEND_API_KEY');
  const sender = getString(env, 'EMAIL_FROM');
  const publicAppUrl = getString(env, 'PUBLIC_APP_URL') || getString(env, 'WEB_APP_URL');

  if (provider !== 'resend') {
    errors.push('EMAIL_PROVIDER must be resend');
  }

  if (apiKey && isPlaceholderValue(apiKey)) {
    errors.push('RESEND_API_KEY must be a real Resend key, not a placeholder');
  } else if (/\s/.test(apiKey)) {
    errors.push('RESEND_API_KEY must not contain whitespace');
  }

  if (sender && isPlaceholderValue(sender)) {
    errors.push('EMAIL_FROM must be a real verified sender, not a placeholder');
  } else if (sender && !isValidEmailAddress(extractSenderEmail(sender))) {
    errors.push('EMAIL_FROM must contain a valid sender email address');
  }

  if (!publicAppUrl) {
    errors.push('PUBLIC_APP_URL or WEB_APP_URL is required for email links');
  } else if (!isHttpsUrl(publicAppUrl)) {
    errors.push('PUBLIC_APP_URL or WEB_APP_URL must be an HTTPS URL');
  }

  return errors;
}

function validateSupportEmailEnv(env: Record<string, unknown>): string[] {
  const recipients = parseCsv(getString(env, 'SUPPORT_NOTIFICATION_EMAILS'));

  if (recipients.length === 0) {
    return [];
  }

  if (recipients.some(isPlaceholderValue)) {
    return ['SUPPORT_NOTIFICATION_EMAILS must contain real support recipients, not placeholders'];
  }

  if (recipients.some((recipient) => !isValidEmailAddress(recipient))) {
    return ['SUPPORT_NOTIFICATION_EMAILS contains an invalid email address'];
  }

  return [];
}

function validateMpesaEnv(env: Record<string, unknown>): string[] {
  const errors: string[] = [];
  const callbackUrl = getString(env, 'MPESA_CALLBACK_URL');
  const callbackTrustMode = getString(env, 'MPESA_CALLBACK_TRUST_MODE') || 'edge_signed';

  if (callbackUrl && !isHttpsUrl(callbackUrl)) {
    errors.push('MPESA_CALLBACK_URL must be an HTTPS URL');
  }

  if (!['edge_signed', 'daraja_direct', 'manual_review_only'].includes(callbackTrustMode)) {
    errors.push('MPESA_CALLBACK_TRUST_MODE must be edge_signed, daraja_direct, or manual_review_only');
  }

  return errors;
}

function validateProductionEnv(env: Record<string, unknown>): string[] {
  if (getString(env, 'NODE_ENV').toLowerCase() !== 'production') {
    return [];
  }

  const errors: string[] = [];
  const corsEnabled = parseBoolean(getString(env, 'APP_CORS_ENABLED'), true);
  const corsOrigins = parseCsv(getString(env, 'APP_CORS_ORIGINS'));
  const callbackUrl = getString(env, 'MPESA_CALLBACK_URL');
  const databaseUrl = getString(env, 'DATABASE_URL');
  const redisUrl = getString(env, 'REDIS_URL');
  const trustedProxyCidrs = parseCsv(getString(env, 'APP_TRUSTED_PROXY_CIDRS'));

  if (corsEnabled && corsOrigins.length === 0) {
    errors.push('APP_CORS_ORIGINS must be configured in production');
  }

  if (corsEnabled && corsOrigins.includes('*')) {
    errors.push('APP_CORS_ORIGINS must not include wildcard origins in production');
  }

  if (callbackUrl && isLocalhostUrl(callbackUrl)) {
    errors.push('MPESA_CALLBACK_URL must not use localhost in production');
  }

  if (databaseUrl && isExternalUrl(databaseUrl) && !usesDatabaseSsl(databaseUrl, env)) {
    errors.push('DATABASE_SSL must be true or DATABASE_URL must include sslmode=require for external production databases');
  }

  if (redisUrl && isExternalUrl(redisUrl) && !usesRedisTls(redisUrl, env)) {
    errors.push('REDIS_URL must use rediss:// or REDIS_TLS_ENABLED=true for external production Redis');
  }

  if (trustedProxyCidrs.length === 0) {
    errors.push('APP_TRUSTED_PROXY_CIDRS must be configured in production');
  } else if (!trustedProxyCidrs.every(isValidCidr)) {
    errors.push('APP_TRUSTED_PROXY_CIDRS must contain valid CIDR ranges');
  }

  const pgBouncerMode = getString(env, 'DATABASE_PGBOUNCER_MODE');
  if (pgBouncerMode !== 'transaction') {
    errors.push('DATABASE_PGBOUNCER_MODE must be transaction in production');
  }

  if (!parseBoolean(getString(env, 'DATABASE_RLS_AUDIT_ENABLED'), false)) {
    errors.push('DATABASE_RLS_AUDIT_ENABLED must be true in production');
  }

  if (!parseBoolean(getString(env, 'MPESA_PAYLOAD_VAULT_ENABLED'), false)) {
    errors.push('MPESA_PAYLOAD_VAULT_ENABLED must be true in production');
  }

  if (!parseBoolean(getString(env, 'UPLOAD_OBJECT_STORAGE_ENABLED'), false)) {
    errors.push('UPLOAD_OBJECT_STORAGE_ENABLED must be true in production');
  }

  if (!parseBoolean(getString(env, 'AUTH_COOKIE_SECURE'), false)) {
    errors.push('AUTH_COOKIE_SECURE must be true in production');
  }

  if (!['lax', 'strict'].includes(getString(env, 'AUTH_COOKIE_SAME_SITE').toLowerCase())) {
    errors.push('AUTH_COOKIE_SAME_SITE must be lax or strict in production');
  }

  validateProductionIntegerRange(
    'DATABASE_API_MAX_CONNECTIONS',
    getString(env, 'DATABASE_API_MAX_CONNECTIONS') || getString(env, 'DATABASE_MAX_CONNECTIONS'),
    1,
    30,
    errors,
  );
  validateProductionIntegerRange(
    'DATABASE_WORKER_MAX_CONNECTIONS',
    getString(env, 'DATABASE_WORKER_MAX_CONNECTIONS'),
    1,
    10,
    errors,
  );

  const jwtSecret = getString(env, 'JWT_SECRET');

  if (jwtSecret) {
    validateProductionSecret('JWT_SECRET', jwtSecret, errors);
  } else {
    validateProductionSecret(
      'JWT_ACCESS_TOKEN_SECRET',
      getString(env, 'JWT_ACCESS_TOKEN_SECRET'),
      errors,
    );
    validateProductionSecret(
      'JWT_REFRESH_TOKEN_SECRET',
      getString(env, 'JWT_REFRESH_TOKEN_SECRET'),
      errors,
    );
  }

  validateProductionSecret(
    'APP_TRUSTED_TENANT_HEADER_SECRET',
    getString(env, 'APP_TRUSTED_TENANT_HEADER_SECRET'),
    errors,
  );
  validateProductionSecret(
    'REPORT_CARD_DOWNLOAD_SIGNING_SECRET',
    getString(env, 'REPORT_CARD_DOWNLOAD_SIGNING_SECRET'),
    errors,
  );
  validateProductionSecret(
    'MPESA_CALLBACK_SECRET',
    getString(env, 'MPESA_CALLBACK_SECRET'),
    errors,
  );
  validateProductionSecret(
    'MPESA_TRANSACTION_STATUS_SECURITY_CREDENTIAL',
    getString(env, 'MPESA_TRANSACTION_STATUS_SECURITY_CREDENTIAL'),
    errors,
  );
  validateImplementation90ProductionEnv(env, errors);
  validateProductionPiiEncryption(env, errors);
  validateProductionKmsConfig(env, errors);

  return errors;
}

function validateImplementation90ProductionEnv(
  env: Record<string, unknown>,
  errors: string[],
): void {
  const lockdownBypassSecret = getString(env, 'SECURITY_LOCKDOWN_BYPASS_SECRET');

  if (lockdownBypassSecret) {
    validateProductionSecretWithMessages(
      lockdownBypassSecret,
      'Implementation 90 lockdown bypass secret must be at least 32 characters in production',
      'Implementation 90 lockdown bypass secret must be a strong production secret',
      errors,
    );
  }

  validateProductionIntegerRange(
    'SECURITY_PUBLIC_READ_RATE_LIMIT_MAX_REQUESTS',
    getString(env, 'SECURITY_PUBLIC_READ_RATE_LIMIT_MAX_REQUESTS') || '500',
    1,
    5000,
    errors,
  );
  validateProductionIntegerRange(
    'SECURITY_AUTHENTICATED_READ_RATE_LIMIT_MAX_REQUESTS',
    getString(env, 'SECURITY_AUTHENTICATED_READ_RATE_LIMIT_MAX_REQUESTS') || '300',
    1,
    3000,
    errors,
  );
  validateProductionIntegerRange(
    'SECURITY_WRITE_RATE_LIMIT_MAX_REQUESTS',
    getString(env, 'SECURITY_WRITE_RATE_LIMIT_MAX_REQUESTS') || '60',
    1,
    1000,
    errors,
  );
  validateProductionIntegerRange(
    'SECURITY_ADMIN_RATE_LIMIT_MAX_REQUESTS',
    getString(env, 'SECURITY_ADMIN_RATE_LIMIT_MAX_REQUESTS') || '20',
    1,
    200,
    errors,
  );

  const targetUsersPerSecond = Number(
    getString(env, 'IMPLEMENTATION90_TARGET_USERS_PER_SECOND') || '5000',
  );
  if (!Number.isInteger(targetUsersPerSecond) || targetUsersPerSecond < 5000) {
    errors.push('IMPLEMENTATION90_TARGET_USERS_PER_SECOND must be at least 5000 in production');
  }
}

function validateSupportSmsEnv(env: Record<string, unknown>): string[] {
  const errors: string[] = [];
  const webhookUrl = getString(env, 'SUPPORT_NOTIFICATION_SMS_WEBHOOK_URL');
  const healthUrl = getString(env, 'SUPPORT_NOTIFICATION_SMS_WEBHOOK_HEALTH_URL');
  const token = getString(env, 'SUPPORT_NOTIFICATION_SMS_WEBHOOK_TOKEN');
  const recipients = getString(env, 'SUPPORT_NOTIFICATION_SMS_RECIPIENTS');
  const required = parseBoolean(getString(env, 'SUPPORT_PROVIDER_SMOKE_REQUIRE_SMS'), false);
  const live = parseBoolean(getString(env, 'SUPPORT_PROVIDER_SMOKE_LIVE'), false);
  const shouldValidate = required || Boolean(webhookUrl || healthUrl || token || recipients);

  if (!shouldValidate) {
    return [];
  }

  if (!webhookUrl) {
    errors.push('SUPPORT_NOTIFICATION_SMS_WEBHOOK_URL is required');
  } else if (!isHttpsUrl(webhookUrl)) {
    errors.push('SUPPORT_NOTIFICATION_SMS_WEBHOOK_URL must be an HTTPS URL');
  }

  if (!token) {
    errors.push('SUPPORT_NOTIFICATION_SMS_WEBHOOK_TOKEN is required');
  }

  if (!recipients) {
    errors.push('SUPPORT_NOTIFICATION_SMS_RECIPIENTS is required');
  }

  if (live) {
    if (!healthUrl) {
      errors.push('SUPPORT_NOTIFICATION_SMS_WEBHOOK_HEALTH_URL is required for live provider smoke');
    } else if (!isHttpsUrl(healthUrl)) {
      errors.push('SUPPORT_NOTIFICATION_SMS_WEBHOOK_HEALTH_URL must be an HTTPS URL');
    }
  }

  return errors;
}

function validateUploadMalwareScanEnv(env: Record<string, unknown>): string[] {
  const errors: string[] = [];
  const provider = getString(env, 'UPLOAD_MALWARE_SCAN_PROVIDER');
  const apiUrl = getString(env, 'UPLOAD_MALWARE_SCAN_API_URL');
  const healthUrl = getString(env, 'UPLOAD_MALWARE_SCAN_HEALTH_URL');
  const apiToken = getString(env, 'UPLOAD_MALWARE_SCAN_API_TOKEN');
  const required = parseBoolean(getString(env, 'UPLOAD_MALWARE_SCAN_REQUIRED'), false);
  const live = parseBoolean(getString(env, 'SUPPORT_PROVIDER_SMOKE_LIVE'), false);
  const shouldValidate = required || Boolean(provider || apiUrl || healthUrl || apiToken);

  if (!shouldValidate) {
    return [];
  }

  if (!provider) {
    errors.push('UPLOAD_MALWARE_SCAN_PROVIDER is required');
  } else if (!['clamav', 'generic', 'provider'].includes(provider)) {
    errors.push('UPLOAD_MALWARE_SCAN_PROVIDER must be clamav, generic, or provider');
  }

  if (!apiUrl) {
    errors.push('UPLOAD_MALWARE_SCAN_API_URL is required');
  } else if (!isHttpsUrl(apiUrl)) {
    errors.push('UPLOAD_MALWARE_SCAN_API_URL must be an HTTPS URL');
  }

  if (!apiToken) {
    errors.push('UPLOAD_MALWARE_SCAN_API_TOKEN is required');
  }

  if (live) {
    if (!healthUrl) {
      errors.push('UPLOAD_MALWARE_SCAN_HEALTH_URL is required for live provider smoke');
    } else if (!isHttpsUrl(healthUrl)) {
      errors.push('UPLOAD_MALWARE_SCAN_HEALTH_URL must be an HTTPS URL');
    }
  }

  return errors;
}

function validateUploadObjectStorageEnv(env: Record<string, unknown>): string[] {
  const errors: string[] = [];
  const provider = getString(env, 'UPLOAD_OBJECT_STORAGE_PROVIDER') || 's3';
  const endpoint = getString(env, 'UPLOAD_OBJECT_STORAGE_ENDPOINT');
  const bucket = getString(env, 'UPLOAD_OBJECT_STORAGE_BUCKET');
  const accessKeyId = getString(env, 'UPLOAD_OBJECT_STORAGE_ACCESS_KEY_ID');
  const secretAccessKey = getString(env, 'UPLOAD_OBJECT_STORAGE_SECRET_ACCESS_KEY');
  const shouldValidate = parseBoolean(getString(env, 'UPLOAD_OBJECT_STORAGE_ENABLED'), false)
    || isAnyUploadObjectStorageConfigPresent(env);

  if (!shouldValidate) {
    return [];
  }

  if (!['s3', 'r2'].includes(provider)) {
    errors.push('UPLOAD_OBJECT_STORAGE_PROVIDER must be s3 or r2');
  }

  if (!endpoint) {
    errors.push('UPLOAD_OBJECT_STORAGE_ENDPOINT is required');
  } else if (isPlaceholderValue(endpoint)) {
    errors.push('UPLOAD_OBJECT_STORAGE_ENDPOINT must be a real object storage endpoint, not a placeholder');
  } else if (!isHttpsUrl(endpoint)) {
    errors.push('UPLOAD_OBJECT_STORAGE_ENDPOINT must be an HTTPS URL');
  }

  if (!bucket) {
    errors.push('UPLOAD_OBJECT_STORAGE_BUCKET is required');
  } else if (isPlaceholderValue(bucket)) {
    errors.push('UPLOAD_OBJECT_STORAGE_BUCKET must be a real object storage bucket, not a placeholder');
  } else if (!isValidObjectStorageBucket(bucket)) {
    errors.push('UPLOAD_OBJECT_STORAGE_BUCKET must be a valid S3-compatible bucket name');
  }

  if (!accessKeyId) {
    errors.push('UPLOAD_OBJECT_STORAGE_ACCESS_KEY_ID is required');
  } else if (isPlaceholderValue(accessKeyId)) {
    errors.push('UPLOAD_OBJECT_STORAGE_ACCESS_KEY_ID must be a real object storage access key, not a placeholder');
  }

  if (!secretAccessKey) {
    errors.push('UPLOAD_OBJECT_STORAGE_SECRET_ACCESS_KEY is required');
  } else if (isPlaceholderValue(secretAccessKey)) {
    errors.push('UPLOAD_OBJECT_STORAGE_SECRET_ACCESS_KEY must be a real object storage secret key, not a placeholder');
  }

  return errors;
}

function isAnyUploadObjectStorageConfigPresent(env: Record<string, unknown>): boolean {
  return Boolean(
    getString(env, 'UPLOAD_OBJECT_STORAGE_PROVIDER')
      || getString(env, 'UPLOAD_OBJECT_STORAGE_ENDPOINT')
      || getString(env, 'UPLOAD_OBJECT_STORAGE_BUCKET')
      || getString(env, 'UPLOAD_OBJECT_STORAGE_REGION')
      || getString(env, 'UPLOAD_OBJECT_STORAGE_ACCESS_KEY_ID')
      || getString(env, 'UPLOAD_OBJECT_STORAGE_SECRET_ACCESS_KEY'),
  );
}

function getString(env: Record<string, unknown>, key: string): string {
  const value = env[key];

  return typeof value === 'string' ? value.trim() : '';
}

function parseBoolean(value: string, fallback: boolean): boolean {
  if (!value) {
    return fallback;
  }

  const normalized = value.trim().toLowerCase();

  if (['1', 'true', 'yes', 'on'].includes(normalized)) {
    return true;
  }

  if (['0', 'false', 'no', 'off'].includes(normalized)) {
    return false;
  }

  return fallback;
}

function parseCsv(value: string): string[] {
  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

function isHttpsUrl(value: string): boolean {
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
}

function extractSenderEmail(sender: string): string {
  const angleMatch = sender.match(/<([^<>]+)>/);

  return angleMatch?.[1]?.trim() ?? sender.trim();
}

function isValidEmailAddress(value: string): boolean {
  return EMAIL_PATTERN.test(value);
}

function isPlaceholderValue(value: string): boolean {
  return /\b(example|placeholder|replace-with|changeme|todo|your-|test_?key|dummy)\b/i.test(value);
}

function isLocalhostUrl(value: string): boolean {
  try {
    const host = new URL(value).hostname.toLowerCase();
    return host === 'localhost' || host === '127.0.0.1' || host.endsWith('.localhost');
  } catch {
    return false;
  }
}

function isExternalUrl(value: string): boolean {
  try {
    return isExternalHost(new URL(value).hostname);
  } catch {
    return false;
  }
}

function usesDatabaseSsl(databaseUrl: string, env: Record<string, unknown>): boolean {
  if (parseBoolean(getString(env, 'DATABASE_SSL'), false)) {
    return true;
  }

  try {
    return new URL(databaseUrl).searchParams.get('sslmode') === 'require';
  } catch {
    return false;
  }
}

function usesRedisTls(redisUrl: string, env: Record<string, unknown>): boolean {
  if (parseBoolean(getString(env, 'REDIS_TLS_ENABLED'), false)) {
    return true;
  }

  try {
    return new URL(redisUrl).protocol === 'rediss:';
  } catch {
    return false;
  }
}

function isExternalHost(host: string): boolean {
  const normalized = host.trim().toLowerCase().replace(/^\[|\]$/g, '');

  if (
    !normalized
    || normalized === 'localhost'
    || normalized.endsWith('.localhost')
    || normalized.endsWith('.local')
    || normalized.endsWith('.internal')
    || normalized.endsWith('.svc')
    || !normalized.includes('.')
  ) {
    return false;
  }

  if (isPrivateIpv4(normalized)) {
    return false;
  }

  return normalized !== '::1';
}

function isPrivateIpv4(host: string): boolean {
  const parts = host.split('.').map((part) => Number(part));

  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
    return false;
  }

  const [first, second] = parts;

  return first === 10
    || first === 127
    || (first === 172 && second >= 16 && second <= 31)
    || (first === 192 && second === 168);
}

function isValidCidr(value: string): boolean {
  const [address, prefix] = value.split('/');
  const prefixNumber = Number(prefix);

  if (!address || !Number.isInteger(prefixNumber) || prefixNumber < 0 || prefixNumber > 32) {
    return false;
  }

  if (value === '0.0.0.0/0') {
    return false;
  }

  return isIpv4Address(address);
}

function isIpv4Address(value: string): boolean {
  const parts = value.split('.').map((part) => Number(part));

  return parts.length === 4
    && parts.every((part) => Number.isInteger(part) && part >= 0 && part <= 255);
}

function validateProductionSecret(
  name: string,
  value: string,
  errors: string[],
): void {
  if (value.length < 32) {
    errors.push(`${name} must be at least 32 characters in production`);
    return;
  }

  if (/^(replace-with|change-me|changeme|example|default)/i.test(value)) {
    errors.push(`${name} must be a strong production secret`);
  }
}

function validateProductionSecretWithMessages(
  value: string,
  shortMessage: string,
  weakMessage: string,
  errors: string[],
): void {
  if (value.length < 32) {
    errors.push(shortMessage);
    return;
  }

  if (/^(replace-with|change-me|changeme|example|default)/i.test(value)) {
    errors.push(weakMessage);
  }
}

function validateProductionPiiEncryption(
  env: Record<string, unknown>,
  errors: string[],
): void {
  const piiEncryptionKey = getString(env, 'SECURITY_PII_ENCRYPTION_KEY');

  if (!isBase64Encoded32ByteKey(piiEncryptionKey)) {
    errors.push('SECURITY_PII_ENCRYPTION_KEY must be a base64-encoded 32-byte key in production');
  }
}

function validateProductionKmsConfig(
  env: Record<string, unknown>,
  errors: string[],
): void {
  const provider = getString(env, 'SECURITY_KMS_PROVIDER');
  const keyId = getString(env, 'SECURITY_KMS_KEY_ID');

  if (!provider && !keyId) {
    return;
  }

  if (!['aws_kms', 'gcp_kms', 'azure_key_vault', 'hashicorp_vault'].includes(provider)) {
    errors.push('SECURITY_KMS_PROVIDER must be aws_kms, gcp_kms, azure_key_vault, or hashicorp_vault');
  }

  if (!keyId) {
    errors.push('SECURITY_KMS_KEY_ID is required when SECURITY_KMS_PROVIDER is set');
  }
}

function isBase64Encoded32ByteKey(value: string): boolean {
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(value)) {
    return false;
  }

  const normalized = value.replace(/=+$/, '');
  const decoded = Buffer.from(value, 'base64');

  return decoded.length === 32 && decoded.toString('base64').replace(/=+$/, '') === normalized;
}

function validateProductionIntegerRange(
  name: string,
  value: string,
  min: number,
  max: number,
  errors: string[],
): void {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    errors.push(`${name} must be between ${min} and ${max}`);
  }
}

function isValidObjectStorageBucket(value: string): boolean {
  return /^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/.test(value);
}
