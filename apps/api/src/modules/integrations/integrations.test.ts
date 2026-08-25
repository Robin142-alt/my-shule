import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';

import {
  BadRequestException,
  HttpException,
  UnauthorizedException,
} from '@nestjs/common';
import { PATH_METADATA } from '@nestjs/common/constants';
import 'reflect-metadata';

import { PERMISSIONS_KEY } from '../../auth/auth.constants';
import { RequestContextService } from '../../common/request-context/request-context.service';
import { PrismaService } from '../../database/prisma.service';
import { PiiEncryptionService } from '../security/pii-encryption.service';
import { PlatformSmsRepository } from './platform-sms.repository';
import { IntegrationsSchemaService } from './integrations-schema.service';
import { PlatformSmsController } from './platform-sms.controller';
import { PlatformSmsService } from './platform-sms.service';
import { SchoolSmsWalletService } from './school-sms-wallet.service';
import { SchoolSmsWalletRepository } from './school-sms-wallet.repository';
import { SmsDispatchService, SmsProviderDispatchError } from './sms-dispatch.service';
import { DarajaIntegrationService } from './daraja-integration.service';
import { ParentPortalAuthRepository } from './parent-portal-auth.repository';
import { ParentPortalAuthService } from './parent-portal-auth.service';

test('IntegrationsSchemaService creates tenant-scoped SMS, Daraja, parent OTP, and onboarding tables', async () => {
  let schemaSql = '';
  const service = new IntegrationsSchemaService({
    runSchemaBootstrap: async (sql: string) => {
      schemaSql += sql;
    },
  } as never);

  await service.onModuleInit();

  assert.match(schemaSql, /CREATE TABLE IF NOT EXISTS platform_sms_providers/);
  assert.match(schemaSql, /CREATE TABLE IF NOT EXISTS school_sms_wallets/);
  assert.match(schemaSql, /CREATE TABLE IF NOT EXISTS school_integrations/);
  assert.match(schemaSql, /CREATE TABLE IF NOT EXISTS parent_otp_challenges/);
  assert.match(
    schemaSql,
    /ALTER COLUMN updated_at SET DEFAULT NOW\(\),\s*ALTER COLUMN updated_at SET NOT NULL/,
  );
  assert.match(schemaSql, /request_path NOT IN \('\/auth\/parent\/otp\/request', '\/auth\/parent\/otp\/verify'\)/);
  const dropOtpVerifyFunction = schemaSql.indexOf(
    'DROP FUNCTION IF EXISTS app.find_parent_otp_challenge_for_verify(uuid)',
  );
  const createOtpVerifyFunction = schemaSql.indexOf(
    'CREATE FUNCTION app.find_parent_otp_challenge_for_verify(input_challenge_id uuid)',
  );
  assert.ok(dropOtpVerifyFunction >= 0);
  assert.ok(createOtpVerifyFunction > dropOtpVerifyFunction);
  assert.match(schemaSql, /ALTER TABLE school_sms_wallets FORCE ROW LEVEL SECURITY/);
});

test('ParentPortalAuthRepository writes complete challenge timestamps required by production', async () => {
  let capturedSql = '';
  let capturedParams: unknown[] = [];
  const repository = new ParentPortalAuthRepository({
    query: async (sql: string, params: unknown[]) => {
      capturedSql = sql;
      capturedParams = params;
      return {
        rows: [{
          id: 'challenge-1',
          tenant_id: 'tenant-a',
          user_id: '00000000-0000-4000-8000-000000000001',
          email: 'ADM-00001',
          phone_hash: 'phone-hash',
          phone_last4: '2589',
          otp_hash: 'otp-hash',
          purpose: 'parent_login',
          expires_at: '2026-08-09T02:15:00.000Z',
          consumed_at: null,
          attempts: 0,
          created_at: '2026-08-09T02:05:00.000Z',
          updated_at: '2026-08-09T02:05:00.000Z',
        }],
        rowCount: 1,
      };
    },
  } as never);

  await repository.createOtpChallenge({
    tenant_id: 'tenant-a',
    user_id: '00000000-0000-4000-8000-000000000001',
    email: 'ADM-00001',
    phone_hash: 'phone-hash',
    phone_last4: '2589',
    otp_hash: 'otp-hash',
    expires_at: '2026-08-09T02:15:00.000Z',
  });

  assert.match(capturedSql, /SET consumed_at = NOW\(\),\s*updated_at = NOW\(\)/);
  assert.match(capturedSql, /expires_at,\s*created_at,\s*updated_at/);
  assert.match(capturedSql, /\$8::timestamptz, NOW\(\), NOW\(\)/);
  assert.deepEqual(capturedParams, [
    'tenant-a',
    '00000000-0000-4000-8000-000000000001',
    'ADM-00001',
    'phone-hash',
    '2589',
    'otp-hash',
    'parent_login',
    '2026-08-09T02:15:00.000Z',
  ]);
});

test('PlatformSmsService stores encrypted credentials and returns only masked provider metadata', async () => {
  const written: Record<string, unknown>[] = [];
  const service = new PlatformSmsService(
    {
      createProvider: async (input: Record<string, unknown>) => {
        written.push(input);
        return {
          id: 'provider-1',
          provider_name: 'Africa\'s Talking',
          provider_code: 'africas_talking',
          api_key_ciphertext: String(input.api_key_ciphertext),
          username_ciphertext: String(input.username_ciphertext),
          sender_id: 'MYSHULE',
          is_active: true,
          is_default: true,
          last_test_status: null,
          last_tested_at: null,
          created_at: '2026-05-16T00:00:00.000Z',
          updated_at: '2026-05-16T00:00:00.000Z',
        };
      },
    } as never,
    {
      encrypt: (value: string) => `enc:${value}`,
      decrypt: (value: string) => value.replace(/^enc:/, ''),
    } as never,
    { getStore: () => ({ user_id: 'platform-owner' }) } as never,
  );

  const provider = await service.createProvider({
    provider_name: 'Africa\'s Talking',
    provider_code: 'africas_talking',
    api_key: 'live-api-key-secret',
    username: 'MYSHULE',
    sender_id: 'MYSHULE',
    is_active: true,
    is_default: true,
  });

  assert.equal(written[0]?.api_key_ciphertext, 'enc:live-api-key-secret');
  assert.equal(provider.api_key_masked.endsWith('cret'), true);
  assert.equal(JSON.stringify(provider).includes('live-api-key-secret'), false);
});

test('SchoolSmsWalletService rejects SMS sends when balance is exhausted', async () => {
  const service = new SchoolSmsWalletService(
    { getStore: () => ({ tenant_id: 'tenant-a', user_id: 'teacher-1' }) } as never,
    {
      reserveSmsCredits: async () => ({
        accepted: false,
        reason: 'SMS balance exhausted',
        log_id: 'sms-log-1',
        balance_after: 0,
      }),
    } as never,
    undefined,
    undefined,
    { getReadiness: async () => ({ status: 'configured' }) } as never,
  );

  await assert.rejects(
    () =>
      service.sendSms({
        recipient: '+254700000001',
        message: 'Fee reminder',
        message_type: 'fee_reminder',
      }),
    (error: unknown) =>
      error instanceof BadRequestException
      && error.message === 'SMS balance exhausted',
  );
});

test('SchoolSmsWalletService bulk send returns provider-accepted, failed, and skipped evidence', async () => {
  const reservations: Record<string, unknown>[] = [];
  const markedAccepted: Record<string, unknown>[] = [];
  let reserveCount = 0;
  const service = new SchoolSmsWalletService(
    { getStore: () => ({ tenant_id: 'tenant-a', user_id: 'principal-1' }) } as never,
    {
      reserveSmsCredits: async (input: Record<string, unknown>) => {
        reservations.push(input);
        reserveCount += 1;

        if (reserveCount === 2) {
          return {
            accepted: false,
            reason: 'SMS balance exhausted',
            log_id: 'sms-log-failed',
            balance_after: 0,
          };
        }

        return {
          accepted: true,
          log_id: `sms-log-${reserveCount}`,
          balance_after: 120 - reserveCount,
          credit_cost: 1,
        };
      },
      markSmsLogProviderAccepted: async (input: Record<string, unknown>) => {
        markedAccepted.push(input);
      },
    } as never,
    undefined,
    undefined,
    {
      getReadiness: async () => ({ status: 'configured' }),
      send: async () => ({
        status: 'provider_accepted',
        provider_id: '00000000-0000-4000-8000-000000000040',
        provider_code: 'africas_talking',
        provider_message_id: 'provider-message-1',
      }),
    } as never,
  );

  const result = await service.sendBulkSms({
    message: 'Your child was absent today. Please contact the school office.',
    message_type: 'absence_notice',
    recipients: [
      { recipient_id: 'student-1', name: 'Amina', recipient: '+254700000001' },
      { recipient_id: 'student-2', name: 'Brian', recipient: '' },
      { recipient_id: 'student-3', name: 'Chris', recipient: '+254700000003' },
    ],
  });

  assert.equal(result.status, 'partial');
  assert.equal(result.provider_accepted_count, 1);
  assert.equal(result.failed_count, 1);
  assert.equal(result.skipped_count, 1);
  assert.equal(reservations.length, 2);
  assert.equal(markedAccepted.length, 1);
  assert.equal(reservations[0]?.tenant_id, 'tenant-a');
  assert.equal(reservations[0]?.message_type, 'absence_notice');
  const skipped = result.skipped as Record<string, unknown>[];
  const failed = result.failed as Record<string, unknown>[];
  assert.equal(skipped[0]?.reason, 'missing_phone_number');
  assert.equal(failed[0]?.reason, 'SMS balance exhausted');
});

test('SchoolSmsWalletService exposes SMS readiness without provider secrets', async () => {
  const service = new SchoolSmsWalletService(
    { getStore: () => ({ tenant_id: 'tenant-a', user_id: 'principal-1' }) } as never,
    {} as never,
    undefined,
    undefined,
    {
      getReadiness: async () => ({
        status: 'missing_credentials',
        provider: {
          id: 'provider-1',
          provider_name: 'Africa\'s Talking',
          provider_code: 'africas_talking',
          is_active: true,
          is_default: true,
          sender_id_configured: true,
          base_url_configured: false,
          username_configured: true,
          last_test_status: null,
        },
        missing: ['base_url'],
      }),
    } as never,
  );

  const readiness = await service.getReadiness();

  assert.equal(readiness.status, 'missing_credentials');
  assert.equal(readiness.can_send, false);
  assert.equal(readiness.disabled_reason, 'SMS provider credentials are incomplete');
  assert.deepEqual(readiness.missing, ['base_url']);
  assert.equal(JSON.stringify(readiness).includes('live-api-key-secret'), false);
});

test('SmsDispatchService reports missing credential fields without exposing secrets', async () => {
  const service = new SmsDispatchService({
    getDefaultProviderForDispatch: async () => ({
      provider: {
        id: 'provider-1',
        provider_name: 'Africa\'s Talking',
        provider_code: 'africas_talking',
        api_key_ciphertext: 'encrypted',
        username_ciphertext: 'encrypted',
        sender_id: 'MYSHULE',
        base_url: null,
        is_active: true,
        is_default: true,
        last_test_status: null,
        last_tested_at: null,
        created_at: '2026-05-16T00:00:00.000Z',
        updated_at: '2026-05-16T00:00:00.000Z',
      },
      api_key: 'live-api-key-secret',
      username: 'MYSHULE',
    }),
  } as never);

  const readiness = await service.getReadiness();

  assert.equal(readiness.status, 'missing_credentials');
  assert.deepEqual(readiness.missing, ['base_url']);
  assert.equal(JSON.stringify(readiness).includes('live-api-key-secret'), false);
});

test('SmsDispatchService maps Africa Talking provider dispatch without logging secrets', async () => {
  const originalFetch = globalThis.fetch;
  const requests: Array<{ url: string; init?: RequestInit }> = [];

  globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
    requests.push({ url: String(url), init });
    return new Response(
      JSON.stringify({
        SMSMessageData: {
          Recipients: [{ messageId: 'ATX-123' }],
        },
      }),
      {
        status: 201,
        headers: { 'content-type': 'application/json' },
      },
    );
  }) as typeof fetch;

  try {
    const service = new SmsDispatchService({
      getDefaultProviderForDispatch: async () => ({
        provider: {
          id: 'provider-1',
          provider_name: 'Africa\'s Talking',
          provider_code: 'africas_talking',
          api_key_ciphertext: 'encrypted',
          username_ciphertext: 'encrypted',
          sender_id: 'MYSHULE',
          base_url: 'https://sms.example.test/send',
          is_active: true,
          is_default: true,
          last_test_status: 'ok',
          last_tested_at: '2026-05-16T00:00:00.000Z',
          created_at: '2026-05-16T00:00:00.000Z',
          updated_at: '2026-05-16T00:00:00.000Z',
        },
        api_key: 'live-api-key-secret',
        username: 'MYSHULE',
      }),
    } as never, {
      get: (key: string) => key === 'communication.smsProviderAllowedHosts'
        ? 'sms.example.test'
        : undefined,
    } as never);

    const result = await service.send({
      tenant_id: 'tenant-a',
      to: '+254700000001',
      message: 'Fee balance reminder',
      source: 'school_sms',
    });

    assert.equal(result.provider_id, 'provider-1');
    assert.equal(result.provider_message_id, 'ATX-123');
    assert.equal(requests[0]?.url, 'https://sms.example.test/send');
    assert.equal(requests[0]?.init?.redirect, 'error');
    assert.equal((requests[0]?.init?.headers as Record<string, string>)?.apiKey, 'live-api-key-secret');
    assert.equal(String(requests[0]?.init?.body).includes('Fee+balance+reminder'), true);
    assert.equal(JSON.stringify(result).includes('live-api-key-secret'), false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('DarajaIntegrationService masks credentials after save and never returns raw secrets', async () => {
  const saved: Record<string, unknown>[] = [];
  const service = new DarajaIntegrationService(
    { getStore: () => ({ tenant_id: 'tenant-a', user_id: 'finance-1' }) } as never,
    {
      upsertDarajaIntegration: async (input: Record<string, unknown>) => {
        saved.push(input);
        return {
          id: 'integration-1',
          tenant_id: 'tenant-a',
          integration_type: 'mpesa_daraja',
          paybill_number: '123456',
          till_number: null,
          shortcode: '123456',
          consumer_key_ciphertext: String(input.consumer_key_ciphertext),
          consumer_secret_ciphertext: String(input.consumer_secret_ciphertext),
          passkey_ciphertext: String(input.passkey_ciphertext),
          environment: 'sandbox',
          callback_url: 'https://api.example.test/payments/mpesa/callback/integration-1',
          is_active: false,
          last_test_status: null,
          last_tested_at: null,
          created_at: '2026-05-16T00:00:00.000Z',
          updated_at: '2026-05-16T00:00:00.000Z',
        };
      },
      appendIntegrationLog: async () => undefined,
    } as never,
    {
      encrypt: (value: string) => `enc:${value}`,
    } as never,
    {
      get: (key: string) => {
        if (key === 'mpesa.callbackUrl') {
          return 'https://api.example.test/payments/mpesa/callback';
        }

        return undefined;
      },
    } as never,
  );

  const response = await service.saveDarajaSettings({
    paybill_number: '123456',
    shortcode: '123456',
    consumer_key: 'consumer-key-live',
    consumer_secret: 'consumer-secret-live',
    passkey: 'passkey-live',
    environment: 'sandbox',
  });

  assert.equal(saved[0]?.consumer_secret_ciphertext, 'enc:consumer-secret-live');
  assert.equal(response.consumer_secret_masked?.endsWith('live'), true);
  assert.equal(JSON.stringify(response).includes('consumer-secret-live'), false);
});

test('DarajaIntegrationService mirrors saved Daraja settings into canonical tenant finance config', async () => {
  const savedIntegrations: Record<string, unknown>[] = [];
  const canonicalConfigs: Record<string, unknown>[] = [];
  const service = new DarajaIntegrationService(
    { getStore: () => ({ tenant_id: 'tenant-a', user_id: 'finance-1' }) } as never,
    {
      upsertDarajaIntegration: async (input: Record<string, unknown>) => {
        savedIntegrations.push(input);
        return {
          id: 'integration-1',
          tenant_id: 'tenant-a',
          integration_type: 'mpesa_daraja',
          paybill_number: input.paybill_number,
          till_number: input.till_number,
          shortcode: input.shortcode,
          consumer_key_ciphertext: String(input.consumer_key_ciphertext),
          consumer_secret_ciphertext: String(input.consumer_secret_ciphertext),
          passkey_ciphertext: String(input.passkey_ciphertext),
          environment: 'production',
          callback_url: input.callback_url,
          is_active: true,
          last_test_status: null,
          last_tested_at: null,
          created_at: '2026-05-16T00:00:00.000Z',
          updated_at: '2026-05-16T00:00:00.000Z',
        };
      },
      appendIntegrationLog: async () => undefined,
    } as never,
    {
      encrypt: (value: string) => `enc:${value}`,
      decrypt: (value: string) => value.replace(/^enc:/, ''),
    } as never,
    {
      get: (key: string) => {
        if (key === 'mpesa.callbackUrl') {
          return 'https://api.shulehub.co.ke/payments/mpesa/callback';
        }

        return undefined;
      },
    } as never,
    {
      upsertMpesaConfig: async (tenantId: string, input: Record<string, unknown>) => {
        canonicalConfigs.push({ tenantId, ...input });
        return {};
      },
    } as never,
  );

  const response = await service.saveDarajaSettings({
    paybill_number: '123456',
    shortcode: '123456',
    consumer_key: 'consumer-key-live',
    consumer_secret: 'consumer-secret-live',
    passkey: 'passkey-live',
    environment: 'production',
    is_active: true,
  });

  assert.equal(savedIntegrations[0]?.callback_url, 'https://api.shulehub.co.ke/payments/mpesa/callback');
  assert.equal(response.callback_url, 'https://api.shulehub.co.ke/payments/mpesa/callback');
  assert.equal(canonicalConfigs[0]?.tenantId, 'tenant-a');
  assert.equal(canonicalConfigs[0]?.shortcode, '123456');
  assert.equal(canonicalConfigs[0]?.callback_url, 'https://api.shulehub.co.ke/payments/mpesa/callback');
  assert.equal(canonicalConfigs[0]?.status, 'active');
});

test('DarajaIntegrationService rejects non-HTTPS callback URLs before saving credentials', async () => {
  let wroteCredentials = false;
  const service = new DarajaIntegrationService(
    { getStore: () => ({ tenant_id: 'tenant-a', user_id: 'finance-1' }) } as never,
    {
      upsertDarajaIntegration: async () => {
        wroteCredentials = true;
        return {};
      },
      appendIntegrationLog: async () => undefined,
    } as never,
    {
      encrypt: (value: string) => `enc:${value}`,
    } as never,
    {
      get: (key: string) => {
        if (key === 'mpesa.callbackUrl') {
          return 'http://api.shulehub.co.ke/payments/mpesa/callback';
        }

        return undefined;
      },
    } as never,
  );

  await assert.rejects(
    () =>
      service.saveDarajaSettings({
        paybill_number: '123456',
        shortcode: '123456',
        consumer_key: 'consumer-key-live',
        consumer_secret: 'consumer-secret-live',
        passkey: 'passkey-live',
        environment: 'production',
      }),
    BadRequestException,
  );
  assert.equal(wroteCredentials, false);
});

test('PlatformSmsController protects provider management with platform permissions', () => {
  const handler = PlatformSmsController.prototype.listProviders as unknown as Function;

  assert.equal(typeof handler, 'function');
  assert.equal(Reflect.getMetadata(PATH_METADATA, handler), 'sms/providers');
  assert.deepEqual(Reflect.getMetadata(PERMISSIONS_KEY, handler), ['*:*']);
});

test('ParentPortalAuthService creates a generic OTP challenge without exposing the OTP code', async () => {
  const service = new ParentPortalAuthService(
    {
      getStore: () => ({
        request_id: 'req-parent-otp',
        tenant_id: null,
        client_ip: '127.0.0.1',
        user_agent: 'test-suite',
      }),
      setTenantId: () => undefined,
      requireStore: () => ({ tenant_id: 'tenant-a' }),
    } as never,
    {
      findParentAuthSubject: async () => ({
        user_id: 'parent-1',
        tenant_id: 'tenant-a',
        role_id: 'role-parent',
        role_code: 'parent',
        email: 'parent@example.test',
        display_name: 'Parent User',
        phone_number_hash: 'hash-phone',
        phone_number_last4: '0001',
      }),
      getOtpIssuanceState: async () => ({ recent_count: 0, latest_created_at: null }),
      createOtpChallenge: async () => ({
        id: 'challenge-1',
        tenant_id: 'tenant-a',
        user_id: 'parent-1',
        email: 'parent@example.test',
        phone_hash: 'hash-phone',
        phone_last4: '0001',
        otp_hash: 'hashed-otp',
        expires_at: '2026-05-16T00:10:00.000Z',
        consumed_at: null,
        attempts: 0,
      }),
    } as never,
    {} as never,
    {} as never,
    {} as never,
    { get: () => '0123456789abcdef0123456789abcdef' } as never,
    { synchronizeRequestSession: async () => undefined } as never,
    { sendSms: async () => ({ status: 'sent' }) } as never,
  );

  const response = await service.requestOtp({ identifier: '+254700000001' });

  assert.equal(response.sent, true);
  assert.equal(response.challenge_id, 'challenge-1');
  assert.equal(JSON.stringify(response).includes('000000'), false);
  assert.equal(JSON.stringify(response).includes('123456'), false);
});

test('SchoolSmsWalletService keeps credits reserved when provider acceptance is unknown', async () => {
  const unknown: Record<string, unknown>[] = [];
  let refunded = false;
  const service = new SchoolSmsWalletService(
    { getStore: () => ({ tenant_id: 'tenant-a', user_id: 'principal-1' }) } as never,
    {
      reserveSmsCredits: async () => ({
        accepted: true,
        log_id: 'sms-log-unknown',
        balance_after: 9,
        credit_cost: 1,
      }),
      markSmsLogDeliveryUnknown: async (input: Record<string, unknown>) => unknown.push(input),
      markSmsLogFailedAndRefund: async () => { refunded = true; },
    } as never,
    undefined,
    undefined,
    {
      getReadiness: async () => ({ status: 'configured' }),
      send: async () => {
        throw new SmsProviderDispatchError('provider timeout', false, null, true);
      },
    } as never,
  );

  await assert.rejects(
    () => service.sendSms({ recipient: '+254700000001', message: 'Notice' }),
    /requires delivery review/,
  );
  assert.equal(unknown.length, 1);
  assert.equal(refunded, false);
});

test('SchoolSmsWalletService retains provider evidence and does not refund after accepted receipt persistence fails', async () => {
  const unknown: Record<string, unknown>[] = [];
  let failedAndRefunded = false;
  const service = new SchoolSmsWalletService(
    { getStore: () => ({ tenant_id: 'tenant-a', user_id: 'principal-1' }) } as never,
    {
      reserveSmsCredits: async () => ({
        accepted: true,
        log_id: 'sms-log-persistence-unknown',
        balance_after: 9,
        credit_cost: 1,
      }),
      markSmsLogProviderAccepted: async () => {
        throw new Error('database receipt write failed');
      },
      markSmsLogDeliveryUnknown: async (input: Record<string, unknown>) => unknown.push(input),
      markSmsLogFailedAndRefund: async () => { failedAndRefunded = true; },
    } as never,
    undefined,
    undefined,
    {
      getReadiness: async () => ({ status: 'configured' }),
      send: async () => ({
        status: 'provider_accepted',
        provider_id: '00000000-0000-4000-8000-000000000040',
        provider_code: 'africas_talking',
        provider_message_id: 'provider-message-persisted-remotely',
      }),
    } as never,
  );

  await assert.rejects(
    () => service.sendSms({ recipient: '+254700000001', message: 'Notice' }),
    /receipt persistence failed.*delivery requires review/i,
  );
  assert.equal(failedAndRefunded, false);
  assert.deepEqual(unknown, [{
    tenant_id: 'tenant-a',
    log_id: 'sms-log-persistence-unknown',
    provider_id: '00000000-0000-4000-8000-000000000040',
    provider_message_id: 'provider-message-persisted-remotely',
    failure_reason: 'Provider accepted SMS but receipt persistence failed: database receipt write failed',
  }]);
});

test('SchoolSmsWalletService bulk send reports ambiguous provider outcomes for review, not as failures', async () => {
  const service = new SchoolSmsWalletService(
    { getStore: () => ({ tenant_id: 'tenant-a', user_id: 'principal-1' }) } as never,
    {
      reserveSmsCredits: async () => ({
        accepted: true,
        log_id: 'sms-log-bulk-unknown',
        balance_after: 9,
        credit_cost: 1,
      }),
      markSmsLogDeliveryUnknown: async () => undefined,
    } as never,
    undefined,
    undefined,
    {
      getReadiness: async () => ({ status: 'configured' }),
      send: async () => {
        throw new SmsProviderDispatchError('provider timeout', false, null, true);
      },
    } as never,
  );

  const result = await service.sendBulkSms({
    message: 'Notice',
    recipients: [{ recipient_id: 'guardian-1', recipient: '+254700000001' }],
  });

  assert.equal(result.status, 'review_required');
  assert.equal(result.delivery_unknown_count, 1);
  assert.equal(result.failed_count, 0);
  assert.equal((result.delivery_unknown as Array<Record<string, unknown>>)[0]?.status, 'delivery_unknown');
});

test('SchoolSmsWalletService fails before reserving credits when dispatch service is absent', async () => {
  let reserved = false;
  const service = new SchoolSmsWalletService(
    { getStore: () => ({ tenant_id: 'tenant-a', user_id: 'principal-1' }) } as never,
    { reserveSmsCredits: async () => { reserved = true; return {}; } } as never,
  );

  await assert.rejects(
    () => service.sendSms({ recipient: '+254700000001', message: 'Notice' }),
    /no credits were reserved/,
  );
  assert.equal(reserved, false);
});

test('ParentPortalAuthService enforces tenant-bound OTP resend cooldown before creating a challenge', async () => {
  let challengeCreated = false;
  const service = new ParentPortalAuthService(
    {
      getStore: () => ({ request_id: 'req-parent-rate', tenant_id: null }),
      setTenantId: () => undefined,
      requireStore: () => ({ tenant_id: 'tenant-a' }),
    } as never,
    {
      findParentAuthSubject: async () => ({
        user_id: 'parent-1', tenant_id: 'tenant-a', role_id: 'role-parent', role_code: 'parent',
        email: 'parent@example.test', display_name: 'Parent User',
        phone_number_hash: 'phone-hash', phone_number_last4: '0001',
      }),
      getOtpIssuanceState: async () => ({
        recent_count: 1,
        latest_created_at: new Date().toISOString(),
      }),
      createOtpChallenge: async () => {
        challengeCreated = true;
        return {};
      },
    } as never,
    {} as never,
    {} as never,
    {} as never,
    { get: (key: string) => key === 'security.piiEncryptionKey'
      ? '0123456789abcdef0123456789abcdef'
      : undefined } as never,
    { synchronizeRequestSession: async () => undefined } as never,
  );

  await assert.rejects(
    () => service.requestOtp({ identifier: '+254700000001' }),
    (error: unknown) => error instanceof HttpException && error.getStatus() === 429,
  );
  assert.equal(challengeCreated, false);
});

test('ParentPortalAuthService creates a tenant-bound student OTP challenge from admission number and guardian phone', async () => {
  let challengeInput: Record<string, unknown> | null = null;
  let smsInput: Record<string, unknown> | null = null;
  let synchronizedTenant: string | null = null;
  const service = new ParentPortalAuthService(
    {
      getStore: () => ({
        request_id: 'req-student-otp',
        tenant_id: 'tenant-a',
        client_ip: '127.0.0.1',
        user_agent: 'test-suite',
      }),
      setTenantId: (tenantId: string) => {
        synchronizedTenant = tenantId;
      },
      requireStore: () => ({ tenant_id: synchronizedTenant ?? 'tenant-a' }),
    } as never,
    {
      findStudentAuthSubject: async (input: any) => {
        assert.equal(input.tenant_id, 'tenant-a');
        assert.equal(input.username, 'ADM-001');
        assert.match(input.phone_hash, /^[a-f0-9]{64}$/);
        return {
          user_id: 'student-user-1',
          tenant_id: 'tenant-a',
          role_id: 'role-student',
          role_code: 'student',
          email: 'ADM-001',
          display_name: 'Amina Student',
          phone_number_hash: input.phone_hash,
          phone_number_last4: '0001',
        };
      },
      getOtpIssuanceState: async () => ({ recent_count: 0, latest_created_at: null }),
      createOtpChallenge: async (input: any) => {
        challengeInput = input;
        return { id: 'student-challenge-1', ...input, consumed_at: null, attempts: 0 };
      },
    } as never,
    {} as never,
    {} as never,
    {} as never,
    { get: () => '0123456789abcdef0123456789abcdef' } as never,
    {
      synchronizeRequestSession: async (store: any) => {
        assert.equal(store.tenant_id, 'tenant-a');
      },
    } as never,
    {
      sendSms: async (input: any) => {
        smsInput = input;
        return { status: 'sent' };
      },
    } as never,
  );

  const response = await service.requestStudentOtp({
    tenant_id: 'tenant-a',
    username: ' adm-001 ',
    guardian_phone: '0700000001',
  });

  assert.equal(response.sent, true);
  assert.equal(response.challenge_id, 'student-challenge-1');
  assert.equal((challengeInput as any).purpose, 'student_login');
  assert.equal((challengeInput as any).email, 'ADM-001');
  assert.equal((smsInput as any).recipient, '0700000001');
  assert.equal(JSON.stringify(response).includes('000000'), false);
  assert.equal(response.password_setup_required, true);
});

test('ParentPortalAuthService resolves parent recovery through a linked child and guardian phone', async () => {
  let linkedLookup: Record<string, unknown> | null = null;
  let challengeInput: Record<string, unknown> | null = null;
  const service = new ParentPortalAuthService(
    {
      getStore: () => ({ request_id: 'req-parent-linked', tenant_id: null }),
      setTenantId: () => undefined,
      requireStore: () => ({ tenant_id: 'tenant-a' }),
    } as never,
    {
      findLinkedParentAuthSubject: async (input: any) => {
        linkedLookup = input;
        return {
          user_id: 'parent-1',
          tenant_id: 'tenant-a',
          role_id: 'role-parent',
          role_code: 'parent',
          email: 'guardian-internal@example.test',
          display_name: 'Guardian User',
          phone_number_hash: input.phone_hash,
          phone_number_last4: '0001',
          force_password_change: true,
        };
      },
      getOtpIssuanceState: async () => ({ recent_count: 0, latest_created_at: null }),
      createOtpChallenge: async (input: any) => {
        challengeInput = input;
        return { id: 'parent-linked-challenge', ...input };
      },
    } as never,
    {} as never,
    {} as never,
    {} as never,
    { get: () => '0123456789abcdef0123456789abcdef' } as never,
    { synchronizeRequestSession: async () => undefined } as never,
    { sendSms: async () => ({ status: 'sent' }) } as never,
  );

  const response = await service.requestOtp({
    identifier: ' adm-001 ',
    guardian_phone: '0700000001',
    tenant_id: 'tenant-a',
  });

  assert.equal((linkedLookup as any).tenant_id, 'tenant-a');
  assert.equal((linkedLookup as any).admission_number, 'ADM-001');
  assert.match((linkedLookup as any).phone_hash, /^[a-f0-9]{64}$/);
  assert.equal((challengeInput as any).email, 'ADM-001');
  assert.equal((challengeInput as any).purpose, 'parent_login');
  assert.equal(response.password_setup_required, true);
});

test('ParentPortalAuthService requires a new password for guardian-verified student recovery', async () => {
  const pepper = '0123456789abcdef0123456789abcdef';
  const otpHash = createHash('sha256').update(`123456:${pepper}`).digest('hex');
  let completed = false;
  const service = new ParentPortalAuthService(
    {
      getStore: () => ({ request_id: 'req-student-reset', tenant_id: null }),
      setTenantId: () => undefined,
      requireStore: () => ({ tenant_id: 'tenant-a' }),
    } as never,
    {
      findChallengeForVerify: async () => ({
        id: 'student-challenge',
        tenant_id: 'tenant-a',
        user_id: 'student-1',
        email: 'ADM-001',
        phone_hash: 'phone-hash',
        phone_last4: '0001',
        otp_hash: otpHash,
        purpose: 'student_login',
        expires_at: '2999-05-16T00:10:00.000Z',
        consumed_at: null,
        attempts: 0,
      }),
      findStudentAuthSubject: async () => ({
        user_id: 'student-1',
        tenant_id: 'tenant-a',
        role_id: 'role-student',
        role_code: 'student',
        email: 'student@example.test',
        display_name: 'Student User',
        phone_number_hash: 'phone-hash',
        phone_number_last4: '0001',
        force_password_change: false,
      }),
      completeStudentPasswordSetup: async () => {
        completed = true;
        return true;
      },
      incrementAttempts: async () => undefined,
    } as never,
    {} as never,
    {} as never,
    {} as never,
    { get: () => pepper } as never,
    { synchronizeRequestSession: async () => undefined } as never,
    undefined,
    { hash: async () => 'hashed-password' } as never,
  );

  await assert.rejects(
    () => service.verifyStudentOtp({ challenge_id: 'student-challenge', otp_code: '123456' }),
    (error: unknown) => error instanceof BadRequestException
      && error.message === 'Create a new password to complete guardian-verified access',
  );
  assert.equal(completed, false);
});

test('ParentPortalAuthService atomically resets student password before issuing a session', async () => {
  const pepper = '0123456789abcdef0123456789abcdef';
  const otpHash = createHash('sha256').update(`123456:${pepper}`).digest('hex');
  let completedInput: Record<string, unknown> | null = null;
  let invalidatedUser: string | null = null;
  let createdSession = false;
  const service = new ParentPortalAuthService(
    {
      getStore: () => ({ request_id: 'req-student-reset', tenant_id: null }),
      setTenantId: () => undefined,
      requireStore: () => ({ tenant_id: 'tenant-a' }),
    } as never,
    {
      findChallengeForVerify: async () => ({
        id: 'student-challenge', tenant_id: 'tenant-a', user_id: 'student-1',
        email: 'ADM-001', phone_hash: 'phone-hash', phone_last4: '0001', otp_hash: otpHash,
        purpose: 'student_login', expires_at: '2999-05-16T00:10:00.000Z', consumed_at: null, attempts: 0,
      }),
      findStudentAuthSubject: async () => ({
        user_id: 'student-1', tenant_id: 'tenant-a', role_id: 'role-student', role_code: 'student',
        email: 'student@example.test', display_name: 'Student User',
        phone_number_hash: 'phone-hash', phone_number_last4: '0001', force_password_change: false,
      }),
      completeStudentPasswordSetup: async (input: any) => {
        completedInput = input;
        return true;
      },
      incrementAttempts: async () => undefined,
    } as never,
    { ensureTenantAuthorizationBaseline: async () => undefined, getPermissionsByRoleId: async () => ['portal:read'] } as never,
    {
      issueTokenPair: async () => ({
        access_token: 'access', refresh_token: 'refresh', token_type: 'Bearer',
        access_expires_in: 900, refresh_expires_in: 2592000,
        access_expires_at: '2999-01-01T00:00:00.000Z', refresh_expires_at: '2999-02-01T00:00:00.000Z',
        refresh_token_id: 'refresh-id', session_id: 'session-id',
      }),
    } as never,
    {
      invalidateUserSessions: async (userId: string) => { invalidatedUser = userId; },
      createSession: async () => { createdSession = true; },
    } as never,
    { get: () => pepper } as never,
    { synchronizeRequestSession: async () => undefined } as never,
    undefined,
    { hash: async (value: string) => `hashed:${value}` } as never,
  );

  const response = await service.verifyStudentOtp({
    challenge_id: 'student-challenge',
    otp_code: '123456',
    new_password: 'SecurePass1',
  });

  assert.equal((completedInput as any).password_hash, 'hashed:SecurePass1');
  assert.equal(invalidatedUser, 'student-1');
  assert.equal(createdSession, true);
  assert.equal(response.user.role, 'student');
});

test('ParentPortalAuthService blocks initial parent password until guardian verification', async () => {
  let tokenIssued = false;
  const service = new ParentPortalAuthService(
    { getStore: () => null } as never,
    {
      findLinkedParentPasswordAuthSubject: async () => ({
        user_id: 'parent-1', tenant_id: 'tenant-a', role_id: 'role-parent', role_code: 'parent',
        email: 'parent@example.test', display_name: 'Parent User',
        phone_number_hash: 'phone-hash', phone_number_last4: '0001',
        password_hash: 'stored-hash', force_password_change: true,
      }),
    } as never,
    {} as never,
    { issueTokenPair: async () => { tokenIssued = true; return {}; } } as never,
    {} as never,
    {} as never,
    {} as never,
    undefined,
    { compare: async () => true } as never,
  );

  await assert.rejects(
    () => service.loginParentWithPassword({ admission_number: 'ADM-001', password: 'ADM-001' }),
    (error: unknown) => error instanceof UnauthorizedException
      && error.message === 'Guardian verification and password setup are required before first login',
  );
  assert.equal(tokenIssued, false);
});

test('ParentPortalAuthService rejects OTP verification if the challenge subject changes', async () => {
  const pepper = '0123456789abcdef0123456789abcdef';
  const otpHash = createHash('sha256').update(`123456:${pepper}`).digest('hex');
  let consumed = false;
  let tokenIssued = false;
  const service = new ParentPortalAuthService(
    {
      getStore: () => ({
        request_id: 'req-parent-otp',
        tenant_id: null,
        client_ip: '127.0.0.1',
        user_agent: 'test-suite',
      }),
      setTenantId: () => undefined,
      requireStore: () => ({ tenant_id: 'tenant-a' }),
    } as never,
    {
      findChallengeForVerify: async () => ({
        id: 'challenge-1',
        tenant_id: 'tenant-a',
        user_id: 'parent-1',
        email: 'parent@example.test',
        phone_hash: 'hash-phone',
        phone_last4: '0001',
        otp_hash: otpHash,
        expires_at: '2999-05-16T00:10:00.000Z',
        consumed_at: null,
        attempts: 0,
      }),
      findParentAuthSubject: async () => ({
        user_id: 'parent-2',
        tenant_id: 'tenant-a',
        role_id: 'role-parent',
        role_code: 'parent',
        email: 'parent@example.test',
        display_name: 'Parent User',
        phone_number_hash: 'hash-phone',
        phone_number_last4: '0001',
      }),
      consumeChallenge: async () => {
        consumed = true;
        return true;
      },
      incrementAttempts: async () => undefined,
    } as never,
    { ensureTenantAuthorizationBaseline: async () => undefined, getPermissionsByRoleId: async () => [] } as never,
    {
      issueTokenPair: async () => {
        tokenIssued = true;
        return {};
      },
    } as never,
    { createSession: async () => undefined } as never,
    { get: () => pepper } as never,
    { synchronizeRequestSession: async () => undefined } as never,
  );

  await assert.rejects(
    () => service.verifyOtp({ challenge_id: 'challenge-1', otp_code: '123456' }),
    (error: unknown) =>
      error instanceof UnauthorizedException
      && error.message === 'Parent account is no longer active',
  );
  assert.equal(consumed, false);
  assert.equal(tokenIssued, false);
});

test('ParentPortalAuthService consumes OTP challenges before issuing tokens', async () => {
  const pepper = '0123456789abcdef0123456789abcdef';
  const otpHash = createHash('sha256').update(`123456:${pepper}`).digest('hex');
  let tokenIssued = false;
  const service = new ParentPortalAuthService(
    {
      getStore: () => ({
        request_id: 'req-parent-otp',
        tenant_id: null,
        client_ip: '127.0.0.1',
        user_agent: 'test-suite',
      }),
      setTenantId: () => undefined,
      requireStore: () => ({ tenant_id: 'tenant-a' }),
    } as never,
    {
      findChallengeForVerify: async () => ({
        id: 'challenge-1',
        tenant_id: 'tenant-a',
        user_id: 'parent-1',
        email: 'parent@example.test',
        phone_hash: 'hash-phone',
        phone_last4: '0001',
        otp_hash: otpHash,
        expires_at: '2999-05-16T00:10:00.000Z',
        consumed_at: null,
        attempts: 0,
      }),
      findParentAuthSubject: async () => ({
        user_id: 'parent-1',
        tenant_id: 'tenant-a',
        role_id: 'role-parent',
        role_code: 'parent',
        email: 'parent@example.test',
        display_name: 'Parent User',
        phone_number_hash: 'hash-phone',
        phone_number_last4: '0001',
      }),
      consumeChallenge: async () => false,
      incrementAttempts: async () => undefined,
    } as never,
    { ensureTenantAuthorizationBaseline: async () => undefined, getPermissionsByRoleId: async () => [] } as never,
    {
      issueTokenPair: async () => {
        tokenIssued = true;
        return {};
      },
    } as never,
    { createSession: async () => undefined } as never,
    { get: () => pepper } as never,
    { synchronizeRequestSession: async () => undefined } as never,
  );

  await assert.rejects(
    () => service.verifyOtp({ challenge_id: 'challenge-1', otp_code: '123456' }),
    (error: unknown) =>
      error instanceof UnauthorizedException
      && error.message === 'Verification code has expired',
  );
  assert.equal(tokenIssued, false);
});

test('SchoolSmsWalletRepository reserves SMS credits transactionally with conditional balance guards', async () => {
  const queries: string[] = [];
  let usedTransaction = false;
  const wallet = {
    id: 'wallet-1',
    tenant_id: 'tenant-a',
    sms_balance: 10,
    monthly_used: 0,
    monthly_limit: 100,
    sms_plan: 'starter',
    low_balance_threshold: 5,
    allow_negative_balance: false,
    billing_status: 'active',
    last_reset_at: null,
    created_at: '2026-05-16T00:00:00.000Z',
    updated_at: '2026-05-16T00:00:00.000Z',
  };
  const repository = new SchoolSmsWalletRepository({
    withRequestTransaction: async (callback: () => Promise<unknown>) => {
      usedTransaction = true;
      return callback();
    },
        executeWithTenant: async function(tenantId: string, ctx: any, cb: any) {
      usedTransaction = true;
      return cb({
        $queryRawUnsafe: async (sql: string, ...params: any[]) => {
          const res = await (this as any).query(sql, params);
          return res.rows || res;
        }
      });
    },
query: async (sql: string) => {
      queries.push(sql);

      if (sql.includes('INSERT INTO school_sms_wallets') || sql.includes('FOR UPDATE')) {
        return { rows: [wallet] };
      }

      if (sql.includes('UPDATE school_sms_wallets') && sql.includes('sms_balance = sms_balance - $2')) {
        return { rows: [{ sms_balance: 9, monthly_used: 1 }] };
      }

      if (sql.includes('INSERT INTO sms_logs')) {
        return { rows: [{ id: 'sms-log-1' }] };
      }

      return { rows: [] };
    },
  } as never);

  const reserved = await repository.reserveSmsCredits({
    tenant_id: 'tenant-a',
    recipient_ciphertext: 'enc-recipient',
    recipient_last4: '0001',
    recipient_hash: 'hash-recipient',
    message_ciphertext: 'enc-message',
    message_preview: 'Fee reminder',
    message_type: 'fee_reminder',
    credit_cost: 1,
    sent_by_user_id: 'teacher-1',
  });

  const updateSql = queries.find((sql) => sql.includes('sms_balance = sms_balance - $2')) ?? '';

  assert.equal(usedTransaction, true);
  assert.equal(reserved.accepted, true);
  assert.match(updateSql, /allow_negative_balance\s+OR sms_balance >= \$2/);
  assert.match(updateSql, /monthly_used \+ \$2 <= monthly_limit/);
});

test('SchoolSmsWalletRepository makes SMS credit refunds idempotent', async () => {
  const queries: string[] = [];
  let usedTransaction = false;
  const repository = new SchoolSmsWalletRepository({
    withRequestTransaction: async (callback: () => Promise<unknown>) => {
      usedTransaction = true;
      return callback();
    },
        executeWithTenant: async function(tenantId: string, ctx: any, cb: any) {
      usedTransaction = true;
      return cb({
        $queryRawUnsafe: async (sql: string, ...params: any[]) => {
          const res = await (this as any).query(sql, params);
          return res.rows || res;
        }
      });
    },
query: async (sql: string) => {
      queries.push(sql);

      if (sql.includes('FROM sms_wallet_transactions')) {
        return { rows: [{ id: 'existing-refund' }] };
      }

      return { rows: [] };
    },
  } as never);

  await repository.refundSmsCredits({
    tenant_id: 'tenant-a',
    log_id: 'sms-log-1',
    credit_cost: 1,
    reason: 'sms_dispatch_failed',
    actor_user_id: 'teacher-1',
  });

  assert.equal(usedTransaction, true);
  assert.equal(
    queries.some((sql) => sql.includes('pg_advisory_xact_lock')),
    true,
  );
  assert.equal(
    queries.some((sql) => sql.includes('SET sms_balance = sms_balance + $2')),
    false,
  );
});

test('SchoolSmsWalletRepository executes slug-tenant wallet SQL inside tenant context', async () => {
  const tenantContexts: string[] = [];
  let globalRawUsed = false;
  const repository = new SchoolSmsWalletRepository({
    executeWithTenant: async (
      tenantId: string,
      _userId: unknown,
      callback: (tx: unknown) => Promise<unknown>,
    ) => {
      tenantContexts.push(tenantId);
      return callback({
        $queryRawUnsafe: async () => [{
          id: 'wallet-tenant-a',
          tenant_id: tenantId,
          sms_balance: 10,
          monthly_used: 0,
          monthly_limit: null,
          sms_plan: 'starter',
          low_balance_threshold: 5,
          allow_negative_balance: false,
          billing_status: 'active',
          last_reset_at: null,
          created_at: '2026-05-16T00:00:00.000Z',
          updated_at: '2026-05-16T00:00:00.000Z',
        }],
      });
    },
    $queryRawUnsafe: async () => {
      globalRawUsed = true;
      return [];
    },
  } as never);

  const wallet = await repository.getOrCreateWallet('tenant-a');

  assert.equal(wallet.tenant_id, 'tenant-a');
  assert.deepEqual(tenantContexts, ['tenant-a']);
  assert.equal(globalRawUsed, false);
});

test('SchoolSmsWalletRepository marks explicit rejection and refunds credits atomically', async () => {
  const queries: string[] = [];
  let tenantTransactions = 0;
  const repository = new SchoolSmsWalletRepository({
    executeWithTenant: async (
      tenantId: string,
      _userId: unknown,
      callback: (tx: unknown) => Promise<unknown>,
    ) => {
      assert.equal(tenantId, 'tenant-a');
      tenantTransactions += 1;
      return callback({
        $queryRawUnsafe: async (sql: string) => {
          queries.push(sql);

          if (sql.includes("SET status = 'failed'")) {
            return [{ id: 'sms-log-rejected' }];
          }

          if (sql.includes('FROM sms_wallet_transactions')) {
            return [];
          }

          if (sql.includes('SET sms_balance = sms_balance + $2')) {
            return [{ sms_balance: 10, monthly_used: 0 }];
          }

          return [];
        },
      });
    },
  } as never);

  await repository.markSmsLogFailedAndRefund({
    tenant_id: 'tenant-a',
    log_id: '00000000-0000-4000-8000-000000000041',
    credit_cost: 1,
    failure_reason: 'provider rejected recipient',
    reason: 'sms_dispatch_failed',
    actor_user_id: 'principal-1',
  });

  assert.equal(tenantTransactions, 1);
  assert.equal(queries.some((sql) => sql.includes("SET status = 'failed'")), true);
  assert.equal(queries.some((sql) => sql.includes('SET sms_balance = sms_balance + $2')), true);
  assert.equal(queries.some((sql) => sql.includes("VALUES ($1, 'refund'")), true);
});

test('Integrations providers expose concrete Nest dependency metadata', () => {
  assert.deepEqual(Reflect.getMetadata('design:paramtypes', IntegrationsSchemaService), [PrismaService]);
  assert.deepEqual(
    Reflect.getMetadata('design:paramtypes', PlatformSmsService).slice(0, 2),
    [PlatformSmsRepository, PiiEncryptionService],
  );
  assert.deepEqual(
    Reflect.getMetadata('design:paramtypes', SchoolSmsWalletService).slice(0, 1),
    [RequestContextService],
  );
});
