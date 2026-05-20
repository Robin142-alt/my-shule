import assert from 'node:assert/strict';
import test from 'node:test';

import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { PATH_METADATA } from '@nestjs/common/constants';

import { PERMISSIONS_KEY } from '../../auth/auth.constants';
import { RequestContextService } from '../../common/request-context/request-context.service';
import { AccountEntity } from '../finance/entities/account.entity';
import { CallbackLogEntity } from './entities/callback-log.entity';
import { PaymentIntentEntity } from './entities/payment-intent.entity';
import { MpesaCallbackController } from './controllers/mpesa-callback.controller';
import { MpesaC2bController } from './controllers/mpesa-c2b.controller';
import { PaymentsController } from './controllers/payments.controller';
import { MpesaC2bService } from './services/mpesa-c2b.service';
import { MpesaCallbackChannelService } from './services/mpesa-callback-channel.service';
import { MpesaCallbackProcessorService } from './services/mpesa-callback-processor.service';
import { MpesaReconciliationService } from './services/mpesa-reconciliation.service';
import { MpesaTransactionStatusService } from './services/mpesa-transaction-status.service';
import { MpesaVerificationProcessorService } from './services/mpesa-verification-processor.service';
import { MpesaPayloadVaultService } from './services/mpesa-payload-vault.service';
import { MpesaService } from './services/mpesa.service';
import { MpesaSignatureService } from './services/mpesa-signature.service';
import { ParsedMpesaCallback } from './payments.types';
import { TenantFinanceConfigService } from '../tenant-finance/tenant-finance-config.service';
import { TenantFinanceConfigRepository } from '../tenant-finance/tenant-finance-config.repository';
import { TenantFinanceSchemaService } from '../tenant-finance/tenant-finance-schema.service';
import { TenantFinanceController } from '../tenant-finance/tenant-finance.controller';
import { MpesaC2bPaymentEntity } from './entities/mpesa-c2b-payment.entity';
import { CallbackLogsRepository } from './repositories/callback-logs.repository';
import { PaymentsSchemaService } from './payments-schema.service';

const makeAccount = (overrides: Partial<AccountEntity> = {}): AccountEntity =>
  Object.assign(new AccountEntity(), {
    id: overrides.id ?? '00000000-0000-0000-0000-000000000101',
    tenant_id: overrides.tenant_id ?? 'tenant-a',
    code: overrides.code ?? '1100-MPESA-CLEARING',
    name: overrides.name ?? 'M-PESA Clearing',
    category: overrides.category ?? 'asset',
    normal_balance: overrides.normal_balance ?? 'debit',
    currency_code: overrides.currency_code ?? 'KES',
    allow_manual_entries: overrides.allow_manual_entries ?? true,
    is_active: overrides.is_active ?? true,
    metadata: overrides.metadata ?? {},
    created_at: overrides.created_at ?? new Date(),
    updated_at: overrides.updated_at ?? new Date(),
  });

const makePaymentIntent = (
  overrides: Partial<PaymentIntentEntity> = {},
): PaymentIntentEntity =>
  Object.assign(new PaymentIntentEntity(), {
    id: overrides.id ?? '00000000-0000-0000-0000-000000000201',
    tenant_id: overrides.tenant_id ?? 'tenant-a',
    idempotency_key_id: overrides.idempotency_key_id ?? '00000000-0000-0000-0000-000000000301',
    user_id: overrides.user_id ?? '00000000-0000-0000-0000-000000000401',
    student_id: overrides.student_id ?? '00000000-0000-0000-0000-000000000402',
    request_id: overrides.request_id ?? 'req-1',
    external_reference: overrides.external_reference ?? 'ORDER-123',
    account_reference: overrides.account_reference ?? 'ORDER-123',
    transaction_desc: overrides.transaction_desc ?? 'School fees payment',
    phone_number: overrides.phone_number ?? '254700000001',
    amount_minor: overrides.amount_minor ?? '10000',
    currency_code: overrides.currency_code ?? 'KES',
    payment_owner: overrides.payment_owner ?? 'tenant',
    mpesa_config_id: overrides.mpesa_config_id ?? '00000000-0000-0000-0000-000000000901',
    payment_channel_id: overrides.payment_channel_id ?? '00000000-0000-0000-0000-000000000902',
    mpesa_short_code: overrides.mpesa_short_code ?? '247247',
    payment_channel_type: overrides.payment_channel_type ?? 'mpesa_paybill',
    ledger_debit_account_code: overrides.ledger_debit_account_code ?? '1110-MPESA-CLEARING',
    ledger_credit_account_code: overrides.ledger_credit_account_code ?? '1100-AR-FEES',
    status: overrides.status ?? 'stk_requested',
    merchant_request_id: overrides.merchant_request_id ?? 'merchant-1',
    checkout_request_id: overrides.checkout_request_id ?? 'checkout-1',
    response_code: overrides.response_code ?? '0',
    response_description: overrides.response_description ?? 'Accepted',
    customer_message: overrides.customer_message ?? 'Success',
    ledger_transaction_id: overrides.ledger_transaction_id ?? null,
    failure_reason: overrides.failure_reason ?? null,
    stk_requested_at: overrides.stk_requested_at ?? new Date(),
    callback_received_at: overrides.callback_received_at ?? null,
    completed_at: overrides.completed_at ?? null,
    expires_at: overrides.expires_at ?? null,
    metadata: overrides.metadata ?? {},
    created_at: overrides.created_at ?? new Date(),
    updated_at: overrides.updated_at ?? new Date(),
  });

const makeCallbackLog = (callback: ParsedMpesaCallback): CallbackLogEntity =>
  Object.assign(new CallbackLogEntity(), {
    id: '00000000-0000-0000-0000-000000000501',
    tenant_id: 'tenant-a',
    merchant_request_id: callback.merchant_request_id,
    checkout_request_id: callback.checkout_request_id,
    delivery_id: 'delivery-1',
    request_fingerprint: 'fingerprint-1',
    event_timestamp: new Date(),
    signature: 'signature',
    signature_verified: true,
    headers: {},
    raw_body: JSON.stringify({
      Body: {
        stkCallback: {
          MerchantRequestID: callback.merchant_request_id,
          CheckoutRequestID: callback.checkout_request_id,
          ResultCode: callback.result_code,
          ResultDesc: callback.result_desc,
          CallbackMetadata: {
            Item: [
              { Name: 'Amount', Value: 100 },
              { Name: 'MpesaReceiptNumber', Value: callback.mpesa_receipt_number },
              { Name: 'TransactionDate', Value: 20260426103045 },
              { Name: 'PhoneNumber', Value: callback.phone_number },
            ],
          },
        },
      },
    }),
    raw_payload: {
      Body: {
        stkCallback: {
          MerchantRequestID: callback.merchant_request_id,
          CheckoutRequestID: callback.checkout_request_id,
          ResultCode: callback.result_code,
          ResultDesc: callback.result_desc,
          CallbackMetadata: {
            Item: [
              { Name: 'Amount', Value: 100 },
              { Name: 'MpesaReceiptNumber', Value: callback.mpesa_receipt_number },
              { Name: 'TransactionDate', Value: 20260426103045 },
              { Name: 'PhoneNumber', Value: callback.phone_number },
            ],
          },
        },
      },
    },
    source_ip: '127.0.0.1',
    processing_status: 'received',
    queue_job_id: null,
    failure_reason: null,
    queued_at: null,
    processed_at: null,
    created_at: new Date(),
    updated_at: new Date(),
  });

const makeC2bPayment = (
  overrides: Partial<MpesaC2bPaymentEntity> = {},
): MpesaC2bPaymentEntity =>
  Object.assign(new MpesaC2bPaymentEntity(), {
    id: overrides.id ?? '00000000-0000-0000-0000-000000000701',
    tenant_id: overrides.tenant_id ?? 'tenant-a',
    mpesa_config_id: overrides.mpesa_config_id ?? '00000000-0000-0000-0000-000000000901',
    payment_channel_id: overrides.payment_channel_id ?? '00000000-0000-0000-0000-000000000902',
    trans_id: overrides.trans_id ?? 'QF12345678',
    transaction_type: overrides.transaction_type ?? 'Pay Bill',
    business_short_code: overrides.business_short_code ?? '247247',
    bill_ref_number: overrides.bill_ref_number ?? 'INV-2026-001',
    invoice_number: overrides.invoice_number ?? null,
    amount_minor: overrides.amount_minor ?? '125000',
    currency_code: overrides.currency_code ?? 'KES',
    phone_number: overrides.phone_number ?? '254700000001',
    payer_name: overrides.payer_name ?? 'Jane Parent',
    org_account_balance: overrides.org_account_balance ?? null,
    third_party_trans_id: overrides.third_party_trans_id ?? null,
    status: overrides.status ?? 'pending_review',
    matched_invoice_id: overrides.matched_invoice_id ?? null,
    matched_student_id: overrides.matched_student_id ?? null,
    manual_fee_payment_id: overrides.manual_fee_payment_id ?? null,
    ledger_transaction_id: overrides.ledger_transaction_id ?? null,
    received_at: overrides.received_at ?? new Date('2026-05-15T09:30:45.000Z'),
    matched_at: overrides.matched_at ?? null,
    raw_payload: overrides.raw_payload ?? {},
    metadata: overrides.metadata ?? {},
    created_at: overrides.created_at ?? new Date(),
    updated_at: overrides.updated_at ?? new Date(),
  });

test('MpesaSignatureService validates the configured HMAC callback signature', () => {
  const service = new MpesaSignatureService({
    get: (key: string): string | number | undefined => {
      if (key === 'mpesa.callbackSecret') {
        return 'top-secret';
      }

      if (key === 'mpesa.callbackTimestampToleranceSeconds') {
        return 300;
      }

      return undefined;
    },
  } as never);
  const rawBody = JSON.stringify({ ok: true });
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signature = service.computeSignature(rawBody, timestamp);

  const verification = service.verifyCallback(rawBody, {
    'x-mpesa-signature': signature,
    'x-mpesa-timestamp': timestamp,
  });

  assert.equal(verification.signature, signature);
});

test('MpesaPayloadVaultService stores encrypted raw payloads with redacted operational payloads', async () => {
  const queries: Array<{ sql: string; params: unknown[] }> = [];
  const service = new MpesaPayloadVaultService(
    {
      query: async (sql: string, params: unknown[]) => {
        queries.push({ sql, params });
        return { rows: [] };
      },
    } as never,
    {
      encrypt: (value: string, aad?: string) =>
        `enc:${aad}:${Buffer.from(value, 'utf8').toString('base64')}`,
      decrypt: (value: string) =>
        Buffer.from(value.split(':').at(-1) ?? '', 'base64').toString('utf8'),
    } as never,
  );

  const stored = await service.storePayload({
    tenant_id: 'tenant-a',
    source: 'callback_logs',
    source_id: 'delivery-1',
    purpose: 'stk_callback',
    payload: {
      Body: {
        stkCallback: {
          CallbackMetadata: {
            Item: [
              { Name: 'PhoneNumber', Value: '254700000001' },
              { Name: 'FirstName', Value: 'Jane' },
            ],
          },
        },
      },
    },
  });

  assert.match(stored.raw_payload_encrypted_ref, /^mpesa-payload:tenant-a:callback_logs:/);
  assert.match(stored.payload_sha256, /^[a-f0-9]{64}$/);
  assert.equal(JSON.stringify(stored.redacted_payload).includes('254700000001'), false);
  assert.equal(JSON.stringify(stored.redacted_payload).includes('Jane'), false);
  assert.equal(queries.some((query) => /INSERT INTO mpesa_payload_vault/.test(query.sql)), true);
  assert.equal(String(queries[0]?.params[5]).includes('254700000001'), false);
});

test('MpesaPayloadVaultService requires support permission, ticket, reason, and unexpired access window before raw retrieval', async () => {
  const audits: unknown[][] = [];
  const encryptedPayload = `enc:${Buffer.from(
    JSON.stringify({ MSISDN: '254700000001', FirstName: 'Jane' }),
    'utf8',
  ).toString('base64')}`;
  const service = new MpesaPayloadVaultService(
    {
      query: async (sql: string, params: unknown[]) => {
        if (/FROM mpesa_payload_vault/.test(sql)) {
          return {
            rows: [
              {
                raw_payload_encrypted_ref: 'mpesa-payload:tenant-a:callback_logs:abc',
                encrypted_payload: encryptedPayload,
                payload_sha256: 'a'.repeat(64),
              },
            ],
          };
        }

        if (/INSERT INTO mpesa_payload_support_access_logs/.test(sql)) {
          audits.push(params);
        }

        return { rows: [] };
      },
    } as never,
    {
      encrypt: (value: string) => value,
      decrypt: (value: string) =>
        Buffer.from(value.replace(/^enc:/, ''), 'base64').toString('utf8'),
    } as never,
  );

  await assert.rejects(
    () =>
      service.retrieveForSupport({
        tenant_id: 'tenant-a',
        raw_payload_encrypted_ref: 'mpesa-payload:tenant-a:callback_logs:abc',
        actor_user_id: 'support-1',
        permissions: ['payments:read'],
        ticket_id: 'SUP-123',
        reason: 'Reconcile parent payment',
        access_expires_at: '2026-05-19T12:15:00.000Z',
        now: '2026-05-19T12:00:00.000Z',
      }),
    UnauthorizedException,
  );

  await assert.rejects(
    () =>
      service.retrieveForSupport({
        tenant_id: 'tenant-a',
        raw_payload_encrypted_ref: 'mpesa-payload:tenant-a:callback_logs:abc',
        actor_user_id: 'support-1',
        permissions: ['payments:mpesa_payload:read'],
        ticket_id: '',
        reason: 'Reconcile parent payment',
        access_expires_at: '2026-05-19T12:15:00.000Z',
        now: '2026-05-19T12:00:00.000Z',
      }),
    BadRequestException,
  );

  await assert.rejects(
    () =>
      service.retrieveForSupport({
        tenant_id: 'tenant-a',
        raw_payload_encrypted_ref: 'mpesa-payload:tenant-a:callback_logs:abc',
        actor_user_id: 'support-1',
        permissions: ['payments:mpesa_payload:read'],
        ticket_id: 'SUP-123',
        reason: 'Reconcile parent payment',
        access_expires_at: '2026-05-19T11:59:00.000Z',
        now: '2026-05-19T12:00:00.000Z',
      }),
    BadRequestException,
  );

  const payload = await service.retrieveForSupport({
    tenant_id: 'tenant-a',
    raw_payload_encrypted_ref: 'mpesa-payload:tenant-a:callback_logs:abc',
    actor_user_id: 'support-1',
    permissions: ['payments:mpesa_payload:read'],
    ticket_id: 'SUP-123',
    reason: 'Reconcile parent payment',
    access_expires_at: '2026-05-19T12:15:00.000Z',
    now: '2026-05-19T12:00:00.000Z',
  });

  assert.deepEqual(payload, { MSISDN: '254700000001', FirstName: 'Jane' });
  assert.equal(audits.length, 1);
  assert.equal(audits[0]?.[6], '2026-05-19T12:15:00.000Z');
});

test('MpesaPayloadVaultService exports only redacted payloads for support downloads', async () => {
  const audits: unknown[][] = [];
  const service = new MpesaPayloadVaultService(
    {
      query: async (sql: string, params: unknown[]) => {
        if (/FROM mpesa_payload_vault/.test(sql)) {
          return {
            rows: [
              {
                raw_payload_encrypted_ref: 'mpesa-payload:tenant-a:mpesa_c2b_payments:abc',
                payload_sha256: 'b'.repeat(64),
                redacted_payload: {
                  MSISDN: '2547*****01',
                  FirstName: 'J***',
                  LastName: 'P*****',
                },
              },
            ],
          };
        }

        if (/INSERT INTO mpesa_payload_support_access_logs/.test(sql)) {
          audits.push(params);
        }

        return { rows: [] };
      },
    } as never,
    {
      encrypt: (value: string) => value,
      decrypt: (value: string) => value,
    } as never,
  );

  const exported = await service.retrieveForSupportExport({
    tenant_id: 'tenant-a',
    raw_payload_encrypted_ref: 'mpesa-payload:tenant-a:mpesa_c2b_payments:abc',
    actor_user_id: '00000000-0000-0000-0000-000000000499',
    permissions: ['payments:mpesa_payload:read'],
    ticket_id: 'SUP-124',
    reason: 'Export redacted support evidence',
    access_expires_at: '2026-05-19T12:15:00.000Z',
    now: '2026-05-19T12:00:00.000Z',
  });

  const exportedJson = JSON.stringify(exported);

  assert.equal(exportedJson.includes('254700000001'), false);
  assert.equal(exportedJson.includes('Jane'), false);
  assert.match(exportedJson, /2547\*+01/);
  assert.equal(audits.length, 1);
  assert.equal(audits[0]?.[4], 'Export redacted support evidence');
});

test('CallbackLogsRepository does not decrypt raw callback bodies during normal reads', async () => {
  let decryptCalled = false;
  const repository = new CallbackLogsRepository(
    {
      query: async () => ({
        rows: [
          {
            id: '00000000-0000-0000-0000-000000000501',
            tenant_id: 'tenant-a',
            merchant_request_id: 'merchant-1',
            checkout_request_id: 'checkout-1',
            mpesa_short_code: '247247',
            delivery_id: 'delivery-1',
            request_fingerprint: 'fingerprint-1',
            event_timestamp: new Date('2026-05-19T00:00:00.000Z'),
            signature: 'signature-1',
            signature_verified: true,
            headers: {},
            raw_body: 'enc:v1:encrypted-callback-body',
            raw_payload: { Body: { stkCallback: { PhoneNumber: '2547*****01' } } },
            raw_payload_encrypted_ref: 'mpesa-payload:tenant-a:callback_logs:abc',
            payload_sha256: 'a'.repeat(64),
            source_ip: '127.0.0.1',
            processing_status: 'received',
            queue_job_id: null,
            failure_reason: null,
            queued_at: null,
            processed_at: null,
            created_at: new Date('2026-05-19T00:00:00.000Z'),
            updated_at: new Date('2026-05-19T00:00:00.000Z'),
          },
        ],
      }),
    } as never,
    {
      encrypt: (value: string) => value,
      decrypt: () => {
        decryptCalled = true;
        return '{"Body":{"stkCallback":{"PhoneNumber":"254700000001"}}}';
      },
    } as never,
  );

  const log = await repository.findById('tenant-a', '00000000-0000-0000-0000-000000000501');

  assert.equal(log?.raw_body, '[encrypted]');
  assert.equal(decryptCalled, false);
});

test('MpesaC2bController rejects unsigned callbacks when callback secret is missing', async () => {
  let validationCalled = false;
  const controller = new MpesaC2bController(
    {
      validatePayment: async () => {
        validationCalled = true;
        return { ResultCode: 0, ResultDesc: 'Accepted' };
      },
    } as never,
    undefined,
    {
      get: (): string => '',
    } as never,
  );

  await assert.rejects(
    () =>
      controller.validate(
        {
          headers: {},
          body: {},
          rawBody: Buffer.from('{}', 'utf8'),
        } as never,
        {} as never,
      ),
    (error: unknown) =>
      error instanceof UnauthorizedException
      && error.message === 'MPESA callback secret is not configured',
  );
  assert.equal(validationCalled, false);
});

test('MpesaC2bController verifies callback signatures before validation', async () => {
  const config = {
    get: (key: string): string | number | undefined => {
      if (key === 'mpesa.callbackSecret') {
        return 'top-secret';
      }

      if (key === 'mpesa.callbackTimestampToleranceSeconds') {
        return 300;
      }

      return undefined;
    },
  };
  const signatureService = new MpesaSignatureService(config as never);
  const rawBody = JSON.stringify({
    TransactionType: 'Pay Bill',
    TransID: 'QF12345678',
  });
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signature = signatureService.computeSignature(rawBody, timestamp);
  let validationCalled = false;
  const controller = new MpesaC2bController(
    {
      validatePayment: async () => {
        validationCalled = true;
        return { ResultCode: 0, ResultDesc: 'Accepted' };
      },
    } as never,
    signatureService,
    config as never,
  );

  const response = await controller.validate(
    {
      headers: {
        'x-mpesa-signature': signature,
        'x-mpesa-timestamp': timestamp,
      },
      body: JSON.parse(rawBody),
      rawBody: Buffer.from(rawBody, 'utf8'),
    } as never,
    JSON.parse(rawBody),
  );

  assert.equal(validationCalled, true);
  assert.deepEqual(response, { ResultCode: 0, ResultDesc: 'Accepted' });
});

test('MpesaCallbackChannelService builds high-entropy STK and C2B callback URLs', () => {
  const service = new MpesaCallbackChannelService(
    { query: async () => ({ rows: [] }) } as never,
    {
      get: (key: string): string | undefined =>
        key === 'mpesa.callbackUrl'
          ? 'https://api.example.com/payments/mpesa/callback'
          : undefined,
    } as never,
  );

  const urls = service.buildCallbackUrls({
    channel_id: '00000000-0000-0000-0000-000000000901',
    secret_ref: 'secret-ref-with-at-least-128-bits',
  });

  assert.equal(
    urls.stk_callback_url,
    'https://api.example.com/payments/mpesa/callback/00000000-0000-0000-0000-000000000901/secret-ref-with-at-least-128-bits',
  );
  assert.equal(
    urls.c2b_validation_url,
    'https://api.example.com/payments/mpesa/c2b/validation/00000000-0000-0000-0000-000000000901/secret-ref-with-at-least-128-bits',
  );
  assert.equal(
    urls.c2b_confirmation_url,
    'https://api.example.com/payments/mpesa/c2b/confirmation/00000000-0000-0000-0000-000000000901/secret-ref-with-at-least-128-bits',
  );
  assert.match(service.hashSecretRef('secret-ref-with-at-least-128-bits'), /^[a-f0-9]{64}$/);
});

test('MpesaCallbackChannelService rotates callback secrets with overlap and hashes only refs', async () => {
  const queries: Array<{ sql: string; values: unknown[] }> = [];
  const service = new MpesaCallbackChannelService(
    {
      query: async (sql: string, values: unknown[] = []) => {
        queries.push({ sql, values });

        if (/SELECT[\s\S]+FROM mpesa_callback_channels/i.test(sql)) {
          return {
            rows: [
              {
                tenant_id: 'tenant-a',
                channel_id: '00000000-0000-4000-8000-000000000902',
                shortcode: '247247',
                environment: 'production',
                requires_edge_signature: false,
                requires_transaction_status: true,
                secret_version: 3,
              },
            ],
          };
        }

        if (/INSERT INTO mpesa_callback_channels/i.test(sql)) {
          return {
            rows: [
              {
                tenant_id: 'tenant-a',
                channel_id: '00000000-0000-4000-8000-000000000902',
                shortcode: '247247',
                environment: 'production',
                requires_edge_signature: false,
                requires_transaction_status: true,
                secret_version: 4,
              },
            ],
          };
        }

        return { rows: [] };
      },
    } as never,
  );
  const newSecretRef = 'new-callback-secret-ref-with-256-bits';

  const rotated = await service.rotateChannelSecret({
    tenant_id: 'tenant-a',
    channel_id: '00000000-0000-4000-8000-000000000902',
    environment: 'production',
    new_secret_ref: newSecretRef,
    overlap_seconds: 86400,
  });

  const allSql = queries.map((query) => query.sql).join('\n');
  const allValues = queries.flatMap((query) => query.values);

  assert.equal(rotated.secret_version, 4);
  assert.equal(allValues.includes(newSecretRef), false);
  assert.ok(allValues.includes(service.hashSecretRef(newSecretRef)));
  assert.match(allSql, /accepts_until/);
  assert.match(allSql, /is_current\s*=\s*FALSE/i);
});

test('M-PESA callback controllers expose high-entropy channel-secret routes', () => {
  const stkHandler = MpesaCallbackController.prototype.handleChannelCallback;
  const c2bValidationHandler = MpesaC2bController.prototype.validateChannel;
  const c2bConfirmationHandler = MpesaC2bController.prototype.confirmChannel;

  assert.equal(Reflect.getMetadata(PATH_METADATA, stkHandler), 'callback/:channelId/:secretRef');
  assert.equal(Reflect.getMetadata(PATH_METADATA, c2bValidationHandler), 'validation/:channelId/:secretRef');
  assert.equal(Reflect.getMetadata(PATH_METADATA, c2bConfirmationHandler), 'confirmation/:channelId/:secretRef');
});

test('MpesaService parses a successful STK callback payload', () => {
  const service = new MpesaService(
    {
      get: (): undefined => undefined,
    } as never,
    new RequestContextService(),
    {
      resolveMpesaConfigByShortcode: async () => ({
        owner: 'tenant',
        tenant_id: 'tenant-a',
        mpesa_config_id: '00000000-0000-0000-0000-000000000901',
        payment_channel_id: '00000000-0000-0000-0000-000000000902',
        shortcode: '247247',
        paybill_number: '247247',
        till_number: null,
        consumer_key: 'school-consumer-key',
        consumer_secret: 'school-consumer-secret',
        passkey: 'school-passkey',
        initiator_name: 'school-api',
        environment: 'sandbox',
        base_url: 'https://sandbox.safaricom.co.ke',
        callback_url: 'https://green-valley.example.com/payments/mpesa/c2b/confirmation',
        transaction_type: 'CustomerPayBillOnline',
        ledger_debit_account_code: '1110-MPESA-CLEARING',
        ledger_credit_account_code: '1100-AR-FEES',
      }),
    } as never,
    {
      resolveMpesaConfigByShortcode: async () => ({
        owner: 'tenant',
        tenant_id: 'tenant-a',
        mpesa_config_id: '00000000-0000-0000-0000-000000000901',
        payment_channel_id: '00000000-0000-0000-0000-000000000902',
        shortcode: '247247',
        paybill_number: '247247',
        till_number: null,
        consumer_key: 'school-consumer-key',
        consumer_secret: 'school-consumer-secret',
        passkey: 'school-passkey',
        initiator_name: 'school-api',
        environment: 'sandbox',
        base_url: 'https://sandbox.safaricom.co.ke',
        callback_url: 'https://green-valley.example.com/payments/mpesa/c2b/confirmation',
        transaction_type: 'CustomerPayBillOnline',
        ledger_debit_account_code: '1110-MPESA-CLEARING',
        ledger_credit_account_code: '1100-AR-FEES',
      }),
    } as never,
    {
      inspectPaymentIntentCreation: async (): Promise<void> => undefined,
    } as never,
    {} as never,
    {} as never,
  );

  const parsed = service.parseCallbackPayload({
    Body: {
      stkCallback: {
        MerchantRequestID: 'merchant-1',
        CheckoutRequestID: 'checkout-1',
        ResultCode: 0,
        ResultDesc: 'The service request is processed successfully.',
        CallbackMetadata: {
          Item: [
            { Name: 'Amount', Value: 100 },
            { Name: 'MpesaReceiptNumber', Value: 'NLJ7RT61SV' },
            { Name: 'TransactionDate', Value: 20260426103045 },
            { Name: 'PhoneNumber', Value: 254700000001 },
          ],
        },
      },
    },
  });

  assert.deepEqual(parsed, {
    merchant_request_id: 'merchant-1',
    checkout_request_id: 'checkout-1',
    result_code: 0,
    result_desc: 'The service request is processed successfully.',
    status: 'succeeded',
    amount_minor: '10000',
    mpesa_receipt_number: 'NLJ7RT61SV',
    transaction_occurred_at: parsed.transaction_occurred_at,
    phone_number: '254700000001',
    metadata: {
      Amount: 100,
      MpesaReceiptNumber: 'NLJ7RT61SV',
      TransactionDate: 20260426103045,
      PhoneNumber: 254700000001,
    },
  });
});

test('MpesaC2bService parses a direct Paybill confirmation into tenant-safe money fields', () => {
  const service = new MpesaC2bService(
    new RequestContextService(),
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
  );

  const parsed = service.parseC2bPayload({
    TransactionType: 'Pay Bill',
    TransID: 'QF12345678',
    TransTime: '20260515123045',
    TransAmount: '1250',
    BusinessShortCode: '247247',
    BillRefNumber: 'INV-2026-001',
    OrgAccountBalance: '30000',
    MSISDN: '254700000001',
    FirstName: 'Jane',
    MiddleName: '',
    LastName: 'Parent',
  });

  assert.deepEqual(parsed, {
    transaction_type: 'Pay Bill',
    trans_id: 'QF12345678',
    transaction_occurred_at: '2026-05-15T09:30:45.000Z',
    amount_minor: '125000',
    business_short_code: '247247',
    bill_ref_number: 'INV-2026-001',
    invoice_number: null,
    org_account_balance: '30000',
    third_party_trans_id: null,
    phone_number: '254700000001',
    payer_name: 'Jane Parent',
    metadata: {},
  });
});

test('MpesaC2bService records matched direct Paybill callbacks for verification before allocation', async () => {
  const requestContext = new RequestContextService();
  const c2bPayment = makeC2bPayment();
  const verificationRequestedPayment = makeC2bPayment({
    status: 'verification_requested',
    metadata: {
      verification_status: 'provider_verification_required',
    },
  });
  let createReceivedInput: Record<string, unknown> | null = null;
  let manualPaymentInput: Record<string, unknown> | null = null;
  let markedMatchedInput: Record<string, unknown> | null = null;
  let verificationRequestedInput: Record<string, unknown> | null = null;
  let verificationJobInput: Record<string, unknown> | null = null;
  const vaultInputs: Record<string, unknown>[] = [];

  const service = new MpesaC2bService(
    requestContext,
    {
      withRequestTransaction: async <T>(callbackFn: () => Promise<T>): Promise<T> => callbackFn(),
      query: async (): Promise<{ rows: unknown[] }> => ({ rows: [] }),
    } as never,
    {
      resolveMpesaConfigByShortcode: async () => ({
        owner: 'tenant',
        tenant_id: 'tenant-a',
        mpesa_config_id: '00000000-0000-0000-0000-000000000901',
        payment_channel_id: '00000000-0000-0000-0000-000000000902',
        shortcode: '247247',
        paybill_number: '247247',
        till_number: null,
        consumer_key: 'school-consumer-key',
        consumer_secret: 'school-consumer-secret',
        passkey: 'school-passkey',
        initiator_name: 'school-api',
        environment: 'sandbox',
        base_url: 'https://sandbox.safaricom.co.ke',
        callback_url: 'https://green-valley.example.com/payments/mpesa/c2b/confirmation',
        transaction_type: 'CustomerPayBillOnline',
        ledger_debit_account_code: '1110-MPESA-CLEARING',
        ledger_credit_account_code: '1100-AR-FEES',
      }),
    } as never,
    {
      findByTenantAndTransId: async (): Promise<MpesaC2bPaymentEntity | null> => null,
      createReceived: async (input: Record<string, unknown>) => {
        createReceivedInput = input;
        return { payment: c2bPayment, inserted: true };
      },
      markMatched: async (input: Record<string, unknown>) => {
        markedMatchedInput = input;
        return makeC2bPayment({ status: 'matched' });
      },
      markPendingReview: async (): Promise<never> => {
        throw new Error('Direct C2B confirmation should not move to accountant review before provider verification');
      },
      markVerificationRequested: async (input: Record<string, unknown>): Promise<MpesaC2bPaymentEntity> => {
        verificationRequestedInput = input;
        return verificationRequestedPayment;
      },
    } as never,
    {
      findManualFeeInvoiceTargetByReference: async () => ({
        id: '00000000-0000-0000-0000-000000000801',
        tenant_id: 'tenant-a',
        status: 'open',
        total_amount_minor: '125000',
        amount_paid_minor: '0',
        metadata: {
          student_id: '00000000-0000-0000-0000-000000000802',
        },
      }),
    } as never,
    {
      createManualFeePayment: async (input: Record<string, unknown>) => {
        manualPaymentInput = input;
        return {
          id: '00000000-0000-0000-0000-000000000803',
          ledger_transaction_id: '00000000-0000-0000-0000-000000000804',
          status: 'cleared',
        };
      },
    } as never,
    {
      storePayload: async (input: Record<string, unknown>) => {
        vaultInputs.push(input);
        return {
          raw_payload_encrypted_ref: 'mpesa-payload:tenant-a:mpesa_c2b_payments:QF12345678',
          payload_sha256: 'b'.repeat(64),
          redacted_payload: {
            MSISDN: '2547*****01',
            FirstName: 'J***',
            LastName: 'P*****',
          },
        };
      },
    } as never,
    {
      createForC2bConfirmation: async (input: Record<string, unknown>) => {
        verificationJobInput = input;
        return {
          id: 'verification-job-c2b-1',
          tenant_id: 'tenant-a',
          transaction_status: 'pending',
        };
      },
    } as never,
  );

  const result = await service.processConfirmation({
    TransactionType: 'Pay Bill',
    TransID: 'QF12345678',
    TransTime: '20260515123045',
    TransAmount: '1250',
    BusinessShortCode: '247247',
    BillRefNumber: 'INV-2026-001',
    MSISDN: '254700000001',
    FirstName: 'Jane',
    LastName: 'Parent',
  });

  assert.equal(result.accepted, true);
  assert.equal(result.duplicate, false);
  assert.equal(result.status, 'verification_requested');
  assert.equal(manualPaymentInput, null);
  assert.equal(markedMatchedInput, null);
  assert.equal(vaultInputs[0]?.source, 'mpesa_c2b_payments');
  assert.equal(
    (createReceivedInput as { raw_payload_encrypted_ref?: string } | null)?.raw_payload_encrypted_ref,
    'mpesa-payload:tenant-a:mpesa_c2b_payments:QF12345678',
  );
  assert.equal(
    (createReceivedInput as { payload_sha256?: string } | null)?.payload_sha256,
    'b'.repeat(64),
  );
  assert.equal(
    (verificationRequestedInput as { reason?: string } | null)?.reason,
    'provider_verification_required',
  );
  assert.equal(
    (verificationJobInput as { c2b_payment_id?: string } | null)?.c2b_payment_id,
    verificationRequestedPayment.id,
  );
  assert.equal(
    (verificationJobInput as { mpesa_receipt_number?: string } | null)?.mpesa_receipt_number,
    'QF12345678',
  );
  assert.equal(
    (
      verificationRequestedInput as {
        metadata?: { matching_strategy?: string; matched_invoice_id?: string; matched_student_id?: string };
      } | null
    )?.metadata?.matching_strategy,
    'invoice_reference',
  );
  assert.equal(
    (
      verificationRequestedInput as {
        metadata?: { matching_strategy?: string; matched_invoice_id?: string; matched_student_id?: string };
      } | null
    )?.metadata?.matched_invoice_id,
    '00000000-0000-0000-0000-000000000801',
  );
  assert.notEqual(
    (createReceivedInput as { raw_payload?: { MSISDN?: string } } | null)?.raw_payload?.MSISDN,
    '254700000001',
  );
  assert.notEqual(
    (createReceivedInput as { raw_payload?: { FirstName?: string } } | null)?.raw_payload?.FirstName,
    'Jane',
  );
  assert.notEqual(
    (createReceivedInput as { phone_number?: string } | null)?.phone_number,
    '254700000001',
  );
  assert.notEqual(
    (createReceivedInput as { payer_name?: string } | null)?.payer_name,
    'Jane Parent',
  );
});

test('MpesaC2bService keeps unmatched direct Paybill payments for accountant review', async () => {
  const requestContext = new RequestContextService();
  const c2bPayment = makeC2bPayment({
    bill_ref_number: 'UNKNOWN-ADM',
    status: 'verification_requested',
  });
  let manualPaymentCreated = false;
  let verificationRequestedInput: Record<string, unknown> | null = null;
  let verificationJobInput: Record<string, unknown> | null = null;

  const service = new MpesaC2bService(
    requestContext,
    {
      withRequestTransaction: async <T>(callbackFn: () => Promise<T>): Promise<T> => callbackFn(),
      query: async (): Promise<{ rows: unknown[] }> => ({ rows: [] }),
    } as never,
    {
      resolveMpesaConfigByShortcode: async () => ({
        owner: 'tenant',
        tenant_id: 'tenant-a',
        mpesa_config_id: '00000000-0000-0000-0000-000000000901',
        payment_channel_id: '00000000-0000-0000-0000-000000000902',
        shortcode: '247247',
        paybill_number: '247247',
        till_number: null,
        consumer_key: 'school-consumer-key',
        consumer_secret: 'school-consumer-secret',
        passkey: 'school-passkey',
        initiator_name: 'school-api',
        environment: 'sandbox',
        base_url: 'https://sandbox.safaricom.co.ke',
        callback_url: 'https://green-valley.example.com/payments/mpesa/c2b/confirmation',
        transaction_type: 'CustomerPayBillOnline',
        ledger_debit_account_code: '1110-MPESA-CLEARING',
        ledger_credit_account_code: '1100-AR-FEES',
      }),
    } as never,
    {
      findByTenantAndTransId: async (): Promise<MpesaC2bPaymentEntity | null> => null,
      createReceived: async () => ({ payment: c2bPayment, inserted: true }),
      markMatched: async (): Promise<never> => {
        throw new Error('Unmatched C2B payment must not be marked matched');
      },
      markPendingReview: async (): Promise<never> => {
        throw new Error('Unmatched C2B payment must not move to review before provider verification');
      },
      markVerificationRequested: async (input: Record<string, unknown>) => {
        verificationRequestedInput = input;
        return c2bPayment;
      },
    } as never,
    {
      findManualFeeInvoiceTargetByReference: async () => null,
    } as never,
    {
      createManualFeePayment: async (): Promise<never> => {
        manualPaymentCreated = true;
        throw new Error('Unmatched C2B payment must not post a fee receipt');
      },
    } as never,
    undefined,
    {
      createForC2bConfirmation: async (input: Record<string, unknown>) => {
        verificationJobInput = input;
        return {
          id: 'verification-job-c2b-unmatched-1',
          tenant_id: 'tenant-a',
          transaction_status: 'pending',
        };
      },
    } as never,
  );

  const result = await service.processConfirmation({
    TransactionType: 'Pay Bill',
    TransID: 'QF12345678',
    TransTime: '20260515123045',
    TransAmount: '1250',
    BusinessShortCode: '247247',
    BillRefNumber: 'UNKNOWN-ADM',
    MSISDN: '254700000001',
    FirstName: 'Jane',
    LastName: 'Parent',
  });

  assert.equal(result.accepted, true);
  assert.equal(result.status, 'verification_requested');
  assert.equal(manualPaymentCreated, false);
  assert.equal((verificationRequestedInput as { reason?: string } | null)?.reason, 'no_invoice_or_student_match');
  assert.equal(
    (verificationJobInput as { c2b_payment_id?: string } | null)?.c2b_payment_id,
    c2bPayment.id,
  );
});

test('MpesaC2bService treats duplicate direct Paybill confirmations as idempotent', async () => {
  const requestContext = new RequestContextService();
  let createReceivedCalled = false;
  let manualPaymentCreated = false;

  const service = new MpesaC2bService(
    requestContext,
    {
      withRequestTransaction: async <T>(callbackFn: () => Promise<T>): Promise<T> => callbackFn(),
      query: async (): Promise<{ rows: unknown[] }> => ({ rows: [] }),
    } as never,
    {
      resolveMpesaConfigByShortcode: async () => ({
        owner: 'tenant',
        tenant_id: 'tenant-a',
        mpesa_config_id: '00000000-0000-0000-0000-000000000901',
        payment_channel_id: '00000000-0000-0000-0000-000000000902',
        shortcode: '247247',
        paybill_number: '247247',
        till_number: null,
        consumer_key: 'school-consumer-key',
        consumer_secret: 'school-consumer-secret',
        passkey: 'school-passkey',
        initiator_name: 'school-api',
        environment: 'sandbox',
        base_url: 'https://sandbox.safaricom.co.ke',
        callback_url: 'https://green-valley.example.com/payments/mpesa/c2b/confirmation',
        transaction_type: 'CustomerPayBillOnline',
        ledger_debit_account_code: '1110-MPESA-CLEARING',
        ledger_credit_account_code: '1100-AR-FEES',
      }),
    } as never,
    {
      findByTenantAndTransId: async (): Promise<MpesaC2bPaymentEntity | null> =>
        makeC2bPayment({
          status: 'matched',
          manual_fee_payment_id: '00000000-0000-0000-0000-000000000803',
          ledger_transaction_id: '00000000-0000-0000-0000-000000000804',
        }),
      createReceived: async (): Promise<never> => {
        createReceivedCalled = true;
        throw new Error('Duplicate C2B payment must not be inserted again');
      },
      markMatched: async (): Promise<never> => {
        throw new Error('Duplicate C2B payment must not be matched again');
      },
      markPendingReview: async (): Promise<never> => {
        throw new Error('Duplicate C2B payment must not be changed');
      },
    } as never,
    {
      findManualFeeInvoiceTargetByReference: async (): Promise<never> => {
        throw new Error('Duplicate C2B payment must not resolve allocation targets again');
      },
    } as never,
    {
      createManualFeePayment: async (): Promise<never> => {
        manualPaymentCreated = true;
        throw new Error('Duplicate C2B payment must not post a fee receipt');
      },
    } as never,
  );

  const result = await service.processConfirmation({
    TransactionType: 'Pay Bill',
    TransID: 'QF12345678',
    TransTime: '20260515123045',
    TransAmount: '1250',
    BusinessShortCode: '247247',
    BillRefNumber: 'INV-2026-001',
    MSISDN: '254700000001',
    FirstName: 'Jane',
    LastName: 'Parent',
  });

  assert.equal(result.accepted, true);
  assert.equal(result.duplicate, true);
  assert.equal(result.status, 'matched');
  assert.equal(createReceivedCalled, false);
  assert.equal(manualPaymentCreated, false);
});

test('MpesaC2bService redacts C2B API payment responses for legacy raw rows', async () => {
  const requestContext = new RequestContextService();
  let listInput: Record<string, unknown> | null = null;
  const service = new MpesaC2bService(
    requestContext,
    {} as never,
    {} as never,
    {
      list: async (input: Record<string, unknown>) => {
        listInput = input;
        return [
          makeC2bPayment({
            phone_number: '254700000001',
            payer_name: 'Jane Parent',
            raw_payload: {
              MSISDN: '254700000001',
              FirstName: 'Jane',
              LastName: 'Parent',
            },
          }),
        ];
      },
    } as never,
    {} as never,
    {} as never,
  );

  const result = await requestContext.run(
    {
      request_id: 'request-tenant-a',
      tenant_id: 'tenant-a',
      user_id: '00000000-0000-0000-0000-000000000499',
      role: 'accountant',
      session_id: 'session-tenant-a',
      permissions: ['billing:read'],
      is_authenticated: true,
      client_ip: '127.0.0.1',
      user_agent: 'payments-test',
      method: 'GET',
      path: '/payments/mpesa/c2b/payments',
      started_at: new Date().toISOString(),
    },
    () => service.listC2bPayments(),
  );

  const responseJson = JSON.stringify(result);

  assert.equal((listInput as { tenant_id?: string } | null)?.tenant_id, 'tenant-a');
  assert.equal(responseJson.includes('254700000001'), false);
  assert.equal(responseJson.includes('Jane Parent'), false);
  assert.match(responseJson, /2547\*+01/);
  assert.match(responseJson, /J\*+/);
});

test('MpesaC2bService reconciles only provider-verified direct Paybill payments from accountant review', async () => {
  const requestContext = new RequestContextService();
  const verifiedUnmatchedPayment = makeC2bPayment({
    id: '00000000-0000-0000-0000-000000000711',
    status: 'verified_unmatched',
    bill_ref_number: 'UNKNOWN-ADM',
    manual_fee_payment_id: null,
    ledger_transaction_id: null,
  });
  const verifiedMatchedPayment = makeC2bPayment({
    ...verifiedUnmatchedPayment,
    status: 'verified_matched',
    matched_invoice_id: '00000000-0000-0000-0000-000000000801',
    matched_student_id: '00000000-0000-0000-0000-000000000802',
  });
  const matchedPayment = makeC2bPayment({
    ...verifiedMatchedPayment,
    status: 'matched',
    manual_fee_payment_id: '00000000-0000-0000-0000-000000000803',
    ledger_transaction_id: '00000000-0000-0000-0000-000000000804',
  });
  let manualPaymentInput: Record<string, unknown> | null = null;
  let verifiedMatchedInput: Record<string, unknown> | null = null;

  const service = new MpesaC2bService(
    requestContext,
    {
      withRequestTransaction: async <T>(callbackFn: () => Promise<T>): Promise<T> => callbackFn(),
      query: async (): Promise<{ rows: unknown[] }> => ({ rows: [] }),
    } as never,
    {
      resolveMpesaConfigByShortcode: async () => ({
        owner: 'tenant',
        tenant_id: 'tenant-a',
        mpesa_config_id: '00000000-0000-0000-0000-000000000901',
        payment_channel_id: '00000000-0000-0000-0000-000000000902',
        shortcode: '247247',
        paybill_number: '247247',
        till_number: null,
        consumer_key: 'school-consumer-key',
        consumer_secret: 'school-consumer-secret',
        passkey: 'school-passkey',
        initiator_name: 'school-api',
        environment: 'sandbox',
        base_url: 'https://sandbox.safaricom.co.ke',
        callback_url: 'https://green-valley.example.com/payments/mpesa/c2b/confirmation',
        transaction_type: 'CustomerPayBillOnline',
        ledger_debit_account_code: '1110-MPESA-CLEARING',
        ledger_credit_account_code: '1100-AR-FEES',
      }),
    } as never,
    {
      lockById: async (): Promise<MpesaC2bPaymentEntity | null> => verifiedUnmatchedPayment,
      markProviderVerified: async (input: Record<string, unknown>) => {
        verifiedMatchedInput = input;
        return verifiedMatchedPayment;
      },
      markMatched: async () => matchedPayment,
    } as never,
    {
      lockManualFeeInvoiceForAllocation: async () => ({
        id: '00000000-0000-0000-0000-000000000801',
        tenant_id: 'tenant-a',
        status: 'open',
        total_amount_minor: '125000',
        amount_paid_minor: '0',
        metadata: {
          student_id: '00000000-0000-0000-0000-000000000802',
        },
      }),
    } as never,
    {
      createManualFeePayment: async (input: Record<string, unknown>) => {
        manualPaymentInput = input;
        return {
          id: '00000000-0000-0000-0000-000000000803',
          ledger_transaction_id: '00000000-0000-0000-0000-000000000804',
          status: 'cleared',
        };
      },
    } as never,
  );

  const result = await requestContext.run(
    {
      request_id: 'request-tenant-a',
      tenant_id: 'tenant-a',
      user_id: '00000000-0000-0000-0000-000000000499',
      role: 'accountant',
      session_id: 'session-tenant-a',
      permissions: ['billing:update'],
      is_authenticated: true,
      client_ip: '127.0.0.1',
      user_agent: 'payments-test',
      method: 'POST',
      path: '/payments/mpesa/c2b/payments/00000000-0000-0000-0000-000000000711/reconcile',
      started_at: new Date().toISOString(),
    },
    () =>
      service.reconcilePendingPayment('00000000-0000-0000-0000-000000000711', {
        invoice_id: '00000000-0000-0000-0000-000000000801',
        notes: 'Matched after accountant checked bank slip reference.',
      }),
  );

  assert.equal(result.status, 'matched');
  assert.equal(
    (verifiedMatchedInput as { payment_id?: string } | null)?.payment_id,
    '00000000-0000-0000-0000-000000000711',
  );
  assert.equal((manualPaymentInput as { payment_method?: string } | null)?.payment_method, 'mpesa_c2b');
  assert.equal((manualPaymentInput as { invoice_id?: string } | null)?.invoice_id, '00000000-0000-0000-0000-000000000801');
  assert.equal((manualPaymentInput as { student_id?: string } | null)?.student_id, '00000000-0000-0000-0000-000000000802');
  assert.equal((manualPaymentInput as { external_reference?: string } | null)?.external_reference, 'QF12345678');
  assert.equal(JSON.stringify(manualPaymentInput).includes('254700000001'), false);
  assert.equal(JSON.stringify(manualPaymentInput).includes('Jane Parent'), false);
  assert.match(JSON.stringify(manualPaymentInput), /J\*+/);
});

test('TenantFinanceConfigService resolves only the active tenant-owned MPESA config', async () => {
  const service = new TenantFinanceConfigService(
    {
      findActiveMpesaConfigForTenant: async (tenantId: string) => ({
        id: '00000000-0000-0000-0000-000000000901',
        tenant_id: tenantId,
        shortcode: '247247',
        paybill_number: '247247',
        till_number: null,
        consumer_key: 'school-consumer-key',
        consumer_secret: 'school-consumer-secret',
        passkey: 'school-passkey',
        initiator_name: 'school-api',
        environment: 'sandbox',
        callback_url: 'https://green-valley.example.com/payments/mpesa/callback',
        status: 'active',
        created_at: new Date(),
        updated_at: new Date(),
      }),
      findFinancialAccountsForTenant: async (tenantId: string) => ({
        tenant_id: tenantId,
        mpesa_clearing_account_code: '1110-MPESA-CLEARING',
        fee_control_account_code: '1100-AR-FEES',
        currency_code: 'KES',
      }),
      findActivePaymentChannelForMpesaConfig: async () => ({
        id: '00000000-0000-0000-0000-000000000902',
        channel_type: 'mpesa_paybill',
        status: 'active',
      }),
    } as never,
    {
      get: (key: string): string | undefined => {
        if (key === 'mpesa.baseUrl') {
          return 'https://sandbox.safaricom.co.ke';
        }

        return undefined;
      },
    } as never,
  );

  const config = await service.resolveMpesaConfigForTenant('tenant-a');

  assert.equal(config.tenant_id, 'tenant-a');
  assert.equal(config.shortcode, '247247');
  assert.equal(config.consumer_key, 'school-consumer-key');
  assert.equal(config.consumer_secret, 'school-consumer-secret');
  assert.equal(config.passkey, 'school-passkey');
  assert.equal(config.transaction_type, 'CustomerPayBillOnline');
  assert.equal(config.ledger_debit_account_code, '1110-MPESA-CLEARING');
  assert.equal(config.ledger_credit_account_code, '1100-AR-FEES');
});

test('TenantFinanceSchemaService prevents duplicate active M-PESA configs per tenant environment and channel', async () => {
  let schemaSql = '';
  const schemaService = new TenantFinanceSchemaService(
    {
      runSchemaBootstrap: async (sql: string) => {
        schemaSql = sql;
      },
    } as never,
    {
      onModuleInit: async () => undefined,
    } as never,
  );

  await schemaService.onModuleInit();

  assert.match(schemaSql, /ux_tenant_mpesa_configs_active_tenant_environment_channel/);
  assert.match(schemaSql, /COALESCE\(paybill_number, ''\)/);
  assert.match(schemaSql, /COALESCE\(till_number, ''\)/);
  assert.match(schemaSql, /WHERE status = 'active'/);
});

test('TenantFinanceSchemaService creates callback channels with hashed secrets and tenant RLS', async () => {
  let schemaSql = '';
  const schemaService = new TenantFinanceSchemaService(
    {
      runSchemaBootstrap: async (sql: string) => {
        schemaSql = sql;
      },
    } as never,
    {
      onModuleInit: async () => undefined,
    } as never,
  );

  await schemaService.onModuleInit();

  assert.match(schemaSql, /CREATE TABLE IF NOT EXISTS mpesa_callback_channels/);
  assert.match(schemaSql, /channel_id uuid NOT NULL/);
  assert.match(schemaSql, /callback_secret_hash text NOT NULL/);
  assert.match(schemaSql, /allowed_source_cidrs cidr\[\] NOT NULL DEFAULT ARRAY\[\]::cidr\[\]/);
  assert.match(schemaSql, /requires_edge_signature boolean NOT NULL DEFAULT TRUE/);
  assert.match(schemaSql, /requires_transaction_status boolean NOT NULL DEFAULT TRUE/);
  assert.match(schemaSql, /ALTER TABLE mpesa_callback_channels FORCE ROW LEVEL SECURITY/);
  assert.match(schemaSql, /CREATE POLICY mpesa_callback_channels_rls_policy/);
  assert.match(schemaSql, /ux_mpesa_callback_channels_active_channel_environment/);
});

test('PaymentsSchemaService creates M-PESA verification jobs for provider status checks', async () => {
  let schemaSql = '';
  const schemaService = new PaymentsSchemaService(
    {
      runSchemaBootstrap: async (sql: string) => {
        schemaSql = sql;
      },
    } as never,
    {
      onModuleInit: async () => undefined,
    } as never,
    {
      onModuleInit: async () => undefined,
    } as never,
    {
      onModuleInit: async () => undefined,
    } as never,
  );

  await schemaService.onModuleInit();

  assert.match(schemaSql, /CREATE TABLE IF NOT EXISTS mpesa_verification_jobs/);
  assert.match(schemaSql, /payment_intent_id uuid/);
  assert.match(schemaSql, /checkout_request_id text/);
  assert.match(schemaSql, /mpesa_receipt_number text/);
  assert.match(schemaSql, /transaction_status text NOT NULL DEFAULT 'pending'/);
  assert.match(schemaSql, /verification_attempts integer NOT NULL DEFAULT 0/);
  assert.match(schemaSql, /last_provider_response_encrypted text/);
  assert.match(schemaSql, /next_retry_at timestamptz/);
  assert.match(schemaSql, /ALTER TABLE mpesa_verification_jobs FORCE ROW LEVEL SECURITY/);
});

test('PaymentsSchemaService enforces duplicate M-PESA identifiers per tenant', async () => {
  let schemaSql = '';
  const schemaService = new PaymentsSchemaService(
    {
      runSchemaBootstrap: async (sql: string) => {
        schemaSql = sql;
      },
    } as never,
    {
      onModuleInit: async () => undefined,
    } as never,
    {
      onModuleInit: async () => undefined,
    } as never,
    {
      onModuleInit: async () => undefined,
    } as never,
  );

  await schemaService.onModuleInit();

  assert.match(schemaSql, /uq_payment_intents_tenant_checkout_request_id/);
  assert.match(schemaSql, /uq_mpesa_transactions_tenant_checkout_request_id/);
  assert.match(schemaSql, /ux_mpesa_transactions_tenant_receipt_number/);
  assert.match(schemaSql, /uq_mpesa_c2b_payments_tenant_trans_id/);
});

test('PaymentsSchemaService creates reconciliation batches, finance close periods, and dual approval controls', async () => {
  let schemaSql = '';
  const schemaService = new PaymentsSchemaService(
    {
      runSchemaBootstrap: async (sql: string) => {
        schemaSql = sql;
      },
    } as never,
    {
      onModuleInit: async () => undefined,
    } as never,
    {
      onModuleInit: async () => undefined,
    } as never,
    {
      onModuleInit: async () => undefined,
    } as never,
  );

  await schemaService.onModuleInit();

  assert.match(schemaSql, /CREATE TABLE IF NOT EXISTS mpesa_reconciliation_batches/);
  assert.match(schemaSql, /payment_channel_id uuid/);
  assert.match(schemaSql, /reconciliation_state text NOT NULL/);
  assert.match(schemaSql, /provider_received/);
  assert.match(schemaSql, /verified_unmatched/);
  assert.match(schemaSql, /manual_review_required/);
  assert.match(schemaSql, /CREATE TABLE IF NOT EXISTS mpesa_reconciliation_discrepancies/);
  assert.match(schemaSql, /provider_transaction_id text/);
  assert.match(schemaSql, /payment_intent_id uuid/);
  assert.match(schemaSql, /fee_invoice_id uuid/);
  assert.match(schemaSql, /ledger_transaction_id uuid/);
  assert.match(schemaSql, /approving_user_id uuid/);
  assert.match(schemaSql, /CREATE TABLE IF NOT EXISTS finance_close_periods/);
  assert.match(schemaSql, /status IN \('open', 'closed', 'reopened'\)/);
  assert.match(schemaSql, /CREATE TABLE IF NOT EXISTS finance_approval_requests/);
  assert.match(schemaSql, /reversal/);
  assert.match(schemaSql, /write_off/);
  assert.match(schemaSql, /move_payment/);
  assert.match(schemaSql, /post_after_mismatch/);
  assert.match(schemaSql, /second_approver_user_id uuid/);
  assert.match(schemaSql, /ALTER TABLE mpesa_reconciliation_batches FORCE ROW LEVEL SECURITY/);
  assert.match(schemaSql, /ALTER TABLE finance_close_periods FORCE ROW LEVEL SECURITY/);
  assert.match(schemaSql, /ALTER TABLE finance_approval_requests FORCE ROW LEVEL SECURITY/);
});

test('TenantFinanceConfigService returns masked summary after saving MPESA config', async () => {
  const captured: Record<string, unknown> = {};
  const now = new Date('2026-05-16T10:00:00.000Z');
  const summary = {
    tenant_id: 'tenant-a',
    mpesa_configs: [
      {
        id: '00000000-0000-0000-0000-000000000901',
        tenant_id: 'tenant-a',
        shortcode: '247247',
        paybill_number: '247247',
        till_number: null,
        initiator_name: 'school-api',
        environment: 'sandbox',
        callback_url: 'https://green-valley.example.com/payments/mpesa/callback',
        status: 'active',
        created_at: now,
        updated_at: now,
        consumer_key_masked: '****-key',
        consumer_secret_masked: '****-secret',
        passkey_masked: '****-passkey',
      },
    ],
    bank_accounts: [],
    payment_channels: [],
    financial_accounts: null,
    dashboard: {
      todays_collections_minor: '0',
      pending_reconciliations: 0,
      failed_callbacks: 0,
      unmatched_payments: 0,
      mpesa_status: 'active',
      mpesa_setup_state: 'sandbox_ready',
      reconciliation_status: 'balanced',
    },
  };
  const service = new TenantFinanceConfigService(
    {
      findMpesaConfigForTenantByShortcode: async () => null,
      upsertMpesaConfig: async (input: Record<string, unknown>) => {
        captured.upsert = input;
        return {
          id: '00000000-0000-0000-0000-000000000901',
          tenant_id: input.tenant_id,
          shortcode: input.shortcode,
          paybill_number: input.paybill_number,
          till_number: input.till_number,
          consumer_key: input.consumer_key,
          consumer_secret: input.consumer_secret,
          passkey: input.passkey,
          initiator_name: input.initiator_name,
          environment: input.environment,
          callback_url: input.callback_url,
          status: input.status,
          created_at: now,
          updated_at: now,
        };
      },
      ensureMpesaPaymentChannel: async (input: Record<string, unknown>) => {
        captured.channel = input;
        return { id: '00000000-0000-0000-0000-000000000902' };
      },
      insertMpesaConfigAuditLog: async () => undefined,
      getSummary: async (tenantId: string) => {
        assert.equal(tenantId, 'tenant-a');
        return summary;
      },
    } as never,
    { get: () => undefined } as never,
  );

  const result = await service.upsertMpesaConfig('tenant-a', {
    shortcode: '247247',
    paybill_number: '247247',
    consumer_key: 'school-consumer-key',
    consumer_secret: 'school-consumer-secret',
    passkey: 'school-passkey',
    initiator_name: 'school-api',
    environment: 'sandbox',
    callback_url: 'https://green-valley.example.com/payments/mpesa/callback',
  });

  assert.equal((captured.upsert as Record<string, unknown>).consumer_secret, 'school-consumer-secret');
  assert.equal(JSON.stringify(result).includes('school-consumer-secret'), false);
  assert.equal(JSON.stringify(result).includes('school-passkey'), false);
  assert.equal(result.mpesa_configs[0]?.consumer_secret_masked, '****-secret');
});

test('TenantFinanceConfigService writes masked MPESA config audit logs on credential changes', async () => {
  const auditRows: Array<Record<string, unknown>> = [];
  const now = new Date('2026-05-19T12:00:00.000Z');
  const summary = {
    tenant_id: 'tenant-a',
    mpesa_configs: [],
    bank_accounts: [],
    payment_channels: [],
    financial_accounts: null,
    dashboard: {
      todays_collections_minor: '0',
      pending_reconciliations: 0,
      failed_callbacks: 0,
      unmatched_payments: 0,
      mpesa_status: 'active',
      mpesa_setup_state: 'production_ready',
      reconciliation_status: 'balanced',
    },
  };
  const service = new TenantFinanceConfigService(
    {
      findMpesaConfigForTenantByShortcode: async () => ({
        id: '00000000-0000-0000-0000-000000000901',
        tenant_id: 'tenant-a',
        shortcode: '247247',
        paybill_number: '247247',
        till_number: null,
        consumer_key: 'old-consumer-key',
        consumer_secret: 'old-consumer-secret',
        passkey: 'old-passkey',
        initiator_name: 'school-api',
        environment: 'sandbox',
        callback_url: 'https://old.example.com/payments/mpesa/callback',
        status: 'active',
        created_at: now,
        updated_at: now,
      }),
      upsertMpesaConfig: async (input: Record<string, unknown>) => ({
        id: '00000000-0000-0000-0000-000000000901',
        tenant_id: input.tenant_id,
        shortcode: input.shortcode,
        paybill_number: input.paybill_number,
        till_number: input.till_number,
        consumer_key: input.consumer_key,
        consumer_secret: input.consumer_secret,
        passkey: input.passkey,
        initiator_name: input.initiator_name,
        environment: input.environment,
        callback_url: input.callback_url,
        status: input.status,
        created_at: now,
        updated_at: now,
      }),
      insertMpesaConfigAuditLog: async (input: Record<string, unknown>) => {
        auditRows.push(input);
      },
      ensureMpesaPaymentChannel: async () => ({ id: '00000000-0000-0000-0000-000000000902' }),
      getSummary: async () => summary,
    } as never,
    { get: () => undefined } as never,
  );

  await service.upsertMpesaConfig('tenant-a', {
    shortcode: '247247',
    paybill_number: '247247',
    consumer_key: 'new-consumer-key',
    consumer_secret: 'new-consumer-secret',
    passkey: 'new-passkey',
    initiator_name: 'school-api-v2',
    environment: 'production',
    callback_url: 'https://green-valley.example.com/payments/mpesa/callback',
  });

  assert.equal(auditRows.length, 1);
  assert.deepEqual(auditRows[0]?.changed_fields, [
    'consumer_key',
    'consumer_secret',
    'passkey',
    'initiator_name',
    'environment',
    'callback_url',
  ]);
  assert.equal(JSON.stringify(auditRows[0]).includes('old-consumer-secret'), false);
  assert.equal(JSON.stringify(auditRows[0]).includes('new-consumer-secret'), false);
  assert.match(JSON.stringify(auditRows[0]), /consumer_secret_masked/);
});

test('TenantFinanceConfigService rotates MPESA credentials and callback secret without leaking raw secrets', async () => {
  const auditRows: Array<Record<string, unknown>> = [];
  const rotateInputs: Array<Record<string, unknown>> = [];
  const now = new Date('2026-05-19T12:30:00.000Z');
  const configId = '00000000-0000-0000-0000-000000000901';
  const rawCallbackSecret = 'new-callback-secret-with-strong-random-material';
  const summary = {
    tenant_id: 'tenant-a',
    mpesa_configs: [],
    bank_accounts: [],
    payment_channels: [],
    financial_accounts: null,
    dashboard: {
      todays_collections_minor: '0',
      pending_reconciliations: 0,
      failed_callbacks: 0,
      unmatched_payments: 0,
      mpesa_status: 'active',
      mpesa_setup_state: 'production_ready',
      reconciliation_status: 'balanced',
    },
  };
  const service = new TenantFinanceConfigService(
    {
      findMpesaConfigForTenantById: async () => ({
        id: configId,
        tenant_id: 'tenant-a',
        shortcode: '247247',
        paybill_number: '247247',
        till_number: null,
        consumer_key: 'old-consumer-key',
        consumer_secret: 'old-consumer-secret',
        passkey: 'old-passkey',
        callback_secret_hash: 'old-callback-secret-hash',
        callback_secret_rotated_at: now,
        initiator_name: 'school-api',
        environment: 'production',
        callback_url: 'https://green-valley.example.com/payments/mpesa/callback',
        status: 'active',
        credential_version: 2,
        rotated_at: now,
        created_at: now,
        updated_at: now,
      }),
      rotateMpesaCredentials: async (input: Record<string, unknown>) => {
        rotateInputs.push(input);
        return {
          id: configId,
          tenant_id: 'tenant-a',
          shortcode: '247247',
          paybill_number: '247247',
          till_number: null,
          consumer_key: 'old-consumer-key',
          consumer_secret: input.consumer_secret,
          passkey: input.passkey,
          callback_secret_hash: input.callback_secret_hash,
          callback_secret_rotated_at: now,
          initiator_name: input.initiator_name,
          environment: 'production',
          callback_url: 'https://green-valley.example.com/payments/mpesa/callback',
          status: 'active',
          credential_version: 3,
          rotated_at: now,
          created_at: now,
          updated_at: now,
        };
      },
      insertMpesaConfigAuditLog: async (input: Record<string, unknown>) => {
        auditRows.push(input);
      },
      getSummary: async () => summary,
    } as never,
    { get: () => undefined } as never,
  );

  await service.rotateMpesaCredentials('tenant-a', configId, {
    consumer_secret: 'new-consumer-secret',
    passkey: 'new-passkey',
    callback_secret: rawCallbackSecret,
    initiator_name: 'school-api-v2',
  });

  assert.equal(rotateInputs.length, 1);
  assert.equal(JSON.stringify(rotateInputs[0]).includes(rawCallbackSecret), false);
  assert.match(String(rotateInputs[0]?.callback_secret_hash), /^[a-f0-9]{64}$/);
  assert.equal(auditRows.length, 1);
  assert.deepEqual(auditRows[0]?.changed_fields, [
    'consumer_secret',
    'passkey',
    'callback_secret',
    'initiator_name',
  ]);
  assert.equal(JSON.stringify(auditRows[0]).includes(rawCallbackSecret), false);
  assert.match(JSON.stringify(auditRows[0]), /callback_secret_masked/);
});

test('TenantFinanceConfigService validates MPESA go-live readiness without exposing secrets', async () => {
  const service = new TenantFinanceConfigService(
    {
      findActiveMpesaConfigForTenant: async () => ({
        id: '00000000-0000-0000-0000-000000000901',
        tenant_id: 'tenant-a',
        shortcode: '247247',
        paybill_number: '247247',
        till_number: null,
        consumer_key: 'school-consumer-key',
        consumer_secret: 'school-consumer-secret',
        passkey: 'school-passkey',
        initiator_name: 'school-api',
        environment: 'production',
        callback_url: 'https://green-valley.example.com/payments/mpesa/callback',
        status: 'active',
        created_at: new Date(),
        updated_at: new Date(),
      }),
      findFinancialAccountsForTenant: async () => ({
        tenant_id: 'tenant-a',
        mpesa_clearing_account_code: '1110-MPESA-CLEARING',
        fee_control_account_code: '1100-AR-FEES',
        currency_code: 'KES',
      }),
      findActivePaymentChannelForMpesaConfig: async () => ({
        id: '00000000-0000-0000-0000-000000000902',
        tenant_id: 'tenant-a',
        channel_type: 'mpesa_paybill',
        name: 'M-PESA Paybill 247247',
        mpesa_config_id: '00000000-0000-0000-0000-000000000901',
        bank_account_id: null,
        status: 'active',
        metadata: {
          c2b_confirmation_url_registered: true,
          c2b_validation_url_registered: true,
          stk_enabled: true,
          sandbox_smoke_test_passed: true,
          reconciliation_api_permissions_configured: true,
          shortcode_approved: true,
        },
        created_at: new Date(),
        updated_at: new Date(),
      }),
    } as never,
    { get: () => undefined } as never,
  );

  const result = await service.validateMpesaGoLive('tenant-a');

  assert.equal(result.state, 'production_ready');
  assert.equal(result.eligible_for_production, true);
  assert.equal(result.checks.every((check) => check.status === 'pass'), true);
  assert.equal(JSON.stringify(result).includes('school-consumer-secret'), false);
  assert.equal(JSON.stringify(result).includes('school-passkey'), false);
});

test('TenantFinanceConfigService blocks MPESA go-live with sandbox credentials or incomplete callbacks', async () => {
  const service = new TenantFinanceConfigService(
    {
      findActiveMpesaConfigForTenant: async () => ({
        id: '00000000-0000-0000-0000-000000000901',
        tenant_id: 'tenant-a',
        shortcode: '174379',
        paybill_number: '174379',
        till_number: null,
        consumer_key: 'sandbox-consumer-key',
        consumer_secret: 'sandbox-consumer-secret',
        passkey: 'sandbox-passkey',
        initiator_name: 'school-api',
        environment: 'production',
        callback_url: 'http://localhost/payments/mpesa/callback',
        status: 'active',
        created_at: new Date(),
        updated_at: new Date(),
      }),
      findFinancialAccountsForTenant: async () => null,
      findActivePaymentChannelForMpesaConfig: async () => ({
        id: '00000000-0000-0000-0000-000000000902',
        tenant_id: 'tenant-a',
        channel_type: 'mpesa_paybill',
        name: 'M-PESA Paybill 174379',
        mpesa_config_id: '00000000-0000-0000-0000-000000000901',
        bank_account_id: null,
        status: 'active',
        metadata: {},
        created_at: new Date(),
        updated_at: new Date(),
      }),
    } as never,
    { get: () => undefined } as never,
  );

  const result = await service.validateMpesaGoLive('tenant-a');

  assert.equal(result.state, 'awaiting_safaricom_registration');
  assert.equal(result.eligible_for_production, false);
  assert.deepEqual(
    result.checks.filter((check) => check.status === 'fail').map((check) => check.id),
    [
      'callback_https',
      'callback_registered',
      'sandbox_smoke_test',
      'production_credentials',
      'reconciliation_permissions',
      'ledger_accounts',
    ],
  );
});

test('TenantFinanceConfigRepository exposes MPESA setup state for principal dashboards', async () => {
  const repository = new TenantFinanceConfigRepository(
    {
      query: async (sql: string) => {
        if (/FROM tenant_mpesa_configs/.test(sql)) {
          return {
            rows: [
              {
                id: '00000000-0000-0000-0000-000000000901',
                tenant_id: 'tenant-a',
                shortcode: '247247',
                paybill_number: '247247',
                till_number: null,
                consumer_key: 'enc-consumer-key',
                consumer_secret: 'enc-consumer-secret',
                passkey: 'enc-passkey',
                initiator_name: 'school-api',
                environment: 'production',
                callback_url: 'https://green-valley.example.com/payments/mpesa/callback',
                status: 'active',
                created_at: new Date(),
                updated_at: new Date(),
              },
            ],
          };
        }

        if (/FROM tenant_bank_accounts/.test(sql) || /FROM tenant_payment_channels/.test(sql)) {
          return { rows: [] };
        }

        if (/FROM tenant_financial_accounts/.test(sql)) {
          return {
            rows: [
              {
                tenant_id: 'tenant-a',
                mpesa_clearing_account_code: '1110-MPESA-CLEARING',
                fee_control_account_code: '1100-AR-FEES',
                currency_code: 'KES',
              },
            ],
          };
        }

        return {
          rows: [
            {
              todays_collections_minor: '0',
              pending_reconciliations: '0',
              failed_callbacks: '0',
              unmatched_payments: '0',
            },
          ],
        };
      },
    } as never,
    {
      encrypt: (value: string) => value,
      decrypt: (value: string) => value.replace(/^enc-/, ''),
    } as never,
  );

  const summary = await repository.getSummary('tenant-a');

  assert.equal(summary.dashboard.mpesa_setup_state, 'production_ready');
});

test('TenantFinanceController exposes MPESA go-live validation to finance readers', () => {
  const handler = TenantFinanceController.prototype.validateMpesaGoLive as unknown as Function;

  assert.equal(Reflect.getMetadata(PATH_METADATA, handler), 'mpesa-config/go-live');
  assert.deepEqual(Reflect.getMetadata(PERMISSIONS_KEY, handler), ['billing:read']);
});

test('TenantFinanceController exposes MPESA credential rotation to billing updaters', () => {
  const handler = TenantFinanceController.prototype.rotateMpesaCredentials as unknown as Function;

  assert.equal(Reflect.getMetadata(PATH_METADATA, handler), 'mpesa-config/:configId/rotate-credentials');
  assert.deepEqual(Reflect.getMetadata(PERMISSIONS_KEY, handler), ['billing:update']);
});

test('MpesaService sends STK push with the resolved school shortcode and credentials', async () => {
  const requestContext = new RequestContextService();
  const paymentIntent = makePaymentIntent({
    status: 'pending',
    merchant_request_id: null,
    checkout_request_id: null,
  });
  const fetchCalls: Array<{ url: string; authorization: string | null; body: Record<string, unknown> | null }> = [];
  const previousFetch = global.fetch;

  global.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
    fetchCalls.push({
      url: String(url),
      authorization:
        init?.headers && typeof init.headers === 'object'
          ? String((init.headers as Record<string, unknown>).Authorization ?? '')
          : null,
      body: init?.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : null,
    });

    if (String(url).includes('/oauth/v1/generate')) {
      return new Response(JSON.stringify({ access_token: 'tenant-token', expires_in: 3599 }), {
        status: 200,
      });
    }

    return new Response(
      JSON.stringify({
        MerchantRequestID: 'school-merchant-1',
        CheckoutRequestID: 'school-checkout-1',
        ResponseCode: '0',
        ResponseDescription: 'Accepted',
        CustomerMessage: 'STK pushed',
      }),
      { status: 200 },
    );
  }) as typeof fetch;

  try {
    const service = new MpesaService(
      {
        get: (key: string): string | number | undefined => {
          if (key === 'finance.idempotencyTtlSeconds') {
            return 86400;
          }

          if (key === 'mpesa.paymentIntentExpirySeconds') {
            return 1800;
          }

          if (key === 'mpesa.requestTimeoutMs') {
            return 15000;
          }

          return undefined;
        },
      } as never,
      requestContext,
      {
        withRequestTransaction: async <T>(callbackFn: () => Promise<T>): Promise<T> => callbackFn(),
      } as never,
      {
        getClient: () => ({
          get: async (): Promise<string | null> => null,
          set: async (): Promise<void> => undefined,
        }),
      } as never,
      {
        inspectPaymentIntentCreation: async (): Promise<void> => undefined,
      } as never,
      {
        createPending: async (): Promise<PaymentIntentEntity> => paymentIntent,
        markStkRequested: async (
          _tenantId: string,
          _paymentIntentId: string,
          response: {
            merchant_request_id: string;
            checkout_request_id: string;
            response_code: string;
            response_description: string;
            customer_message: string;
          },
        ): Promise<PaymentIntentEntity> =>
          makePaymentIntent({
            ...paymentIntent,
            status: 'stk_requested',
            merchant_request_id: response.merchant_request_id,
            checkout_request_id: response.checkout_request_id,
            response_code: response.response_code,
            response_description: response.response_description,
            customer_message: response.customer_message,
          }),
      } as never,
      {
        lockRequest: async () => ({
          id: '00000000-0000-0000-0000-000000000301',
          tenant_id: 'tenant-a',
          user_id: null,
          scope: 'mpesa.payment_intent',
          idempotency_key: 'idem-tenant-a',
          request_method: 'POST',
          request_path: '/payments/mpesa/payment-intents',
          request_hash: 'hash',
          status: 'in_progress',
          response_status_code: null,
          response_body: null,
          locked_at: null,
          completed_at: null,
          expires_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }),
        markCompleted: async (): Promise<void> => undefined,
      } as never,
      undefined,
      {
        resolveMpesaConfigForTenant: async () => ({
          owner: 'tenant',
          tenant_id: 'tenant-a',
          mpesa_config_id: '00000000-0000-0000-0000-000000000901',
          payment_channel_id: '00000000-0000-0000-0000-000000000902',
          shortcode: '247247',
          paybill_number: '247247',
          till_number: null,
          consumer_key: 'school-consumer-key',
          consumer_secret: 'school-consumer-secret',
          passkey: 'school-passkey',
          initiator_name: 'school-api',
          environment: 'sandbox',
          base_url: 'https://sandbox.safaricom.co.ke',
          callback_url: 'https://green-valley.example.com/payments/mpesa/callback',
          transaction_type: 'CustomerPayBillOnline',
          ledger_debit_account_code: '1110-MPESA-CLEARING',
          ledger_credit_account_code: '1100-AR-FEES',
        }),
      } as never,
    );

    const response = await requestContext.run(
      {
        request_id: 'request-tenant-a',
        tenant_id: 'tenant-a',
        user_id: '00000000-0000-0000-0000-000000000499',
        role: 'admin',
        session_id: 'session-tenant-a',
        permissions: ['*:*'],
        is_authenticated: true,
        client_ip: '127.0.0.1',
        user_agent: 'payments-test',
        method: 'POST',
        path: '/payments/mpesa/payment-intents',
        started_at: new Date().toISOString(),
      },
      () =>
        service.createPaymentIntent({
          idempotency_key: 'idem-tenant-a',
          amount_minor: '10000',
          phone_number: '0712345678',
          account_reference: 'ADM-2025-001',
          transaction_desc: 'School fees',
        }),
    );

    const oauthCall = fetchCalls.find((call) => call.url.includes('/oauth/v1/generate'));
    const stkCall = fetchCalls.find((call) => call.url.includes('/mpesa/stkpush/v1/processrequest'));

    assert.equal(response.checkout_request_id, 'school-checkout-1');
    assert.equal(
      oauthCall?.authorization,
      `Basic ${Buffer.from('school-consumer-key:school-consumer-secret').toString('base64')}`,
    );
    assert.equal(stkCall?.body?.BusinessShortCode, '247247');
    assert.equal(stkCall?.body?.PartyB, '247247');
    assert.equal(stkCall?.body?.CallBackURL, 'https://green-valley.example.com/payments/mpesa/callback');
    assert.equal(stkCall?.body?.TransactionType, 'CustomerPayBillOnline');
  } finally {
    global.fetch = previousFetch;
  }
});

test('MpesaTransactionStatusService verifies STK callback status through Daraja query', async () => {
  const fetchCalls: Array<{ url: string; authorization: string | null; body: Record<string, unknown> | null }> = [];
  const previousFetch = global.fetch;

  global.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
    fetchCalls.push({
      url: String(url),
      authorization:
        init?.headers && typeof init.headers === 'object'
          ? String((init.headers as Record<string, unknown>).Authorization ?? '')
          : null,
      body: init?.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : null,
    });

    if (String(url).includes('/oauth/v1/generate')) {
      return new Response(JSON.stringify({ access_token: 'tenant-token', expires_in: 3599 }), {
        status: 200,
      });
    }

    return new Response(
      JSON.stringify({
        ResponseCode: '0',
        ResultCode: '0',
        ResultDesc: 'The service request is processed successfully.',
        MerchantRequestID: 'merchant-1',
        CheckoutRequestID: 'checkout-1',
      }),
      { status: 200 },
    );
  }) as typeof fetch;

  try {
    const service = new MpesaTransactionStatusService(
      {
        get: (key: string): string | number | undefined => {
          if (key === 'mpesa.requestTimeoutMs') {
            return 15000;
          }

          return undefined;
        },
      } as never,
      {
        getClient: () => ({
          get: async (): Promise<string | null> => null,
          set: async (): Promise<void> => undefined,
        }),
      } as never,
      {
        resolveMpesaConfigForTenant: async () => ({
          owner: 'tenant',
          tenant_id: 'tenant-a',
          mpesa_config_id: '00000000-0000-0000-0000-000000000901',
          payment_channel_id: '00000000-0000-0000-0000-000000000902',
          shortcode: '247247',
          paybill_number: '247247',
          till_number: null,
          consumer_key: 'school-consumer-key',
          consumer_secret: 'school-consumer-secret',
          passkey: 'school-passkey',
          initiator_name: 'school-api',
          environment: 'sandbox',
          base_url: 'https://sandbox.safaricom.co.ke',
          callback_url: 'https://green-valley.example.com/payments/mpesa/callback',
          transaction_type: 'CustomerPayBillOnline',
          ledger_debit_account_code: '1110-MPESA-CLEARING',
          ledger_credit_account_code: '1100-AR-FEES',
        }),
      } as never,
    );

    const result = await service.verifyStkPushStatus({
      tenant_id: 'tenant-a',
      checkout_request_id: 'checkout-1',
    });
    const queryCall = fetchCalls.find((call) => call.url.includes('/mpesa/stkpushquery/v1/query'));

    assert.equal(result.provider_status, 'provider_verified');
    assert.equal(result.checkout_request_id, 'checkout-1');
    assert.equal(queryCall?.authorization, 'Bearer tenant-token');
    assert.equal(queryCall?.body?.BusinessShortCode, '247247');
    assert.equal(queryCall?.body?.CheckoutRequestID, 'checkout-1');
    assert.match(String(queryCall?.body?.Password), /^[A-Za-z0-9+/]+=*$/);
  } finally {
    global.fetch = previousFetch;
  }
});

test('MpesaVerificationProcessorService verifies provider status before releasing ledger processing', async () => {
  const requestContext = new RequestContextService();
  let providerResponseStatus: string | null = null;
  let providerVerifiedInput: Record<string, unknown> | null = null;
  let enqueuedPaymentInput: Record<string, unknown> | null = null;

  const processor = new MpesaVerificationProcessorService(
    requestContext,
    {
      markProviderResponse: async (input: Record<string, unknown>): Promise<void> => {
        providerResponseStatus = String(input.transaction_status);
      },
    } as never,
    {
      verifyStkPushStatus: async () => ({
        provider_status: 'provider_verified',
        checkout_request_id: 'checkout-direct-1',
        merchant_request_id: 'merchant-direct-1',
        result_code: '0',
        result_desc: 'The service request is processed successfully.',
        raw_provider_response: {
          ResponseCode: '0',
          ResultCode: '0',
          CheckoutRequestID: 'checkout-direct-1',
        },
      }),
    } as never,
    {
      markProviderVerified: async (
        _tenantId: string,
        _callbackLogId: string,
        input: Record<string, unknown>,
      ): Promise<void> => {
        providerVerifiedInput = input;
      },
    } as never,
    {
      enqueuePayment: async (input: Record<string, unknown>) => {
        enqueuedPaymentInput = input;
        return {
          job_id: 'payments:tenant-a:checkout-direct-1',
          queue_name: 'payments',
          tenant_id: 'tenant-a',
          checkout_request_id: 'checkout-direct-1',
          deduplicated: false,
          state: 'waiting',
        };
      },
    } as never,
  );

  const result = await processor.processVerificationJob(
    {
      tenant_id: 'tenant-a',
      verification_job_id: 'verification-job-1',
      callback_log_id: '00000000-0000-4000-8000-000000000701',
      checkout_request_id: 'checkout-direct-1',
      request_id: 'request-verification-1',
      enqueued_at: new Date().toISOString(),
    },
    'payments:verify:tenant-a:verification-job-1',
  );

  assert.equal(result.provider_status, 'provider_verified');
  assert.equal(providerResponseStatus, 'provider_verified');
  assert.equal((providerVerifiedInput as { result_code?: string } | null)?.result_code, '0');
  assert.equal(
    (enqueuedPaymentInput as { checkout_request_id?: string } | null)?.checkout_request_id,
    'checkout-direct-1',
  );
  assert.equal(
    (enqueuedPaymentInput as { callback_log_id?: string } | null)?.callback_log_id,
    '00000000-0000-4000-8000-000000000701',
  );
});

test('MpesaVerificationProcessorService classifies verified C2B payments without ledger enqueue', async () => {
  const requestContext = new RequestContextService();
  let providerResponseStatus: string | null = null;
  let c2bVerifiedInput: Record<string, unknown> | null = null;
  let ledgerQueueAttempted = false;

  const processor = new MpesaVerificationProcessorService(
    requestContext,
    {
      markProviderResponse: async (input: Record<string, unknown>): Promise<void> => {
        providerResponseStatus = String(input.transaction_status);
      },
    } as never,
    {
      verifyC2bTransactionStatus: async () => ({
        provider_status: 'provider_verified',
        trans_id: 'QF12345678',
        result_code: '0',
        result_desc: 'Receipt exists in Daraja transaction status',
        amount_minor: '125000',
        raw_provider_response: {
          ResultCode: '0',
          TransID: 'QF12345678',
          TransAmount: '1250',
        },
      }),
    } as never,
    {
      markProviderVerified: async (): Promise<void> => undefined,
      markProviderFailed: async (): Promise<void> => undefined,
    } as never,
    {
      enqueuePayment: async (): Promise<never> => {
        ledgerQueueAttempted = true;
        throw new Error('C2B verification must not enqueue STK ledger processing');
      },
    } as never,
    undefined,
    {
      markProviderVerified: async (input: Record<string, unknown>) => {
        c2bVerifiedInput = input;
        return makeC2bPayment({
          status: 'verified_matched',
          matched_invoice_id: '00000000-0000-0000-0000-000000000801',
          matched_student_id: '00000000-0000-0000-0000-000000000802',
        });
      },
      markProviderFailed: async (): Promise<never> => {
        throw new Error('Verified provider C2B payment must not be marked failed');
      },
    } as never,
  );

  const result = await processor.processVerificationJob(
    {
      tenant_id: 'tenant-a',
      verification_job_id: 'verification-job-c2b-1',
      c2b_payment_id: '00000000-0000-0000-0000-000000000701',
      mpesa_receipt_number: 'QF12345678',
      request_id: 'request-c2b-verification-1',
      enqueued_at: new Date().toISOString(),
    },
    'payments:verify:tenant-a:verification-job-c2b-1',
  );

  assert.equal(result.provider_status, 'provider_verified');
  assert.equal(result.c2b_payment_id, '00000000-0000-0000-0000-000000000701');
  assert.equal(result.c2b_payment_status, 'verified_matched');
  assert.equal(result.payment_queue_job_id, null);
  assert.equal(providerResponseStatus, 'provider_verified');
  assert.equal(
    (c2bVerifiedInput as { payment_id?: string } | null)?.payment_id,
    '00000000-0000-0000-0000-000000000701',
  );
  assert.equal(
    (c2bVerifiedInput as { provider_amount_minor?: string } | null)?.provider_amount_minor,
    '125000',
  );
  assert.equal(ledgerQueueAttempted, false);
});

test('MpesaCallbackController stores raw payload and enqueues a payments job by checkout request id', async () => {
  const requestContext = new RequestContextService();
  const callback: ParsedMpesaCallback = {
    merchant_request_id: 'merchant-1',
    checkout_request_id: 'checkout-1',
    result_code: 0,
    result_desc: 'Completed',
    status: 'succeeded',
    amount_minor: '10000',
    mpesa_receipt_number: 'NLJ7RT61SV',
    transaction_occurred_at: new Date('2026-04-26T07:30:45.000Z').toISOString(),
    phone_number: '254700000001',
    metadata: {},
  };
  const callbackLog = makeCallbackLog(callback);
  let createdLogInput: Record<string, unknown> | null = null;
  let enqueuedPayload: Record<string, unknown> | null = null;
  let queuedJobId: string | null = null;

  const controller = new MpesaCallbackController(
    requestContext,
    {
      createLog: async (input: Record<string, unknown>) => {
        createdLogInput = input;
        return callbackLog;
      },
      markRejected: async (): Promise<void> => undefined,
      markFailed: async (): Promise<void> => undefined,
      markQueued: async (_tenantId: string, _callbackLogId: string, queueJobId: string) => {
        queuedJobId = queueJobId;
      },
      markProcessed: async (): Promise<void> => undefined,
      markReplayed: async (): Promise<void> => undefined,
    } as never,
    {
      parseCallbackPayload: (): ParsedMpesaCallback => callback,
    } as never,
    {
      inspectCallback: () => ({
        delivery_id: 'delivery-1',
        request_fingerprint: 'fingerprint-1',
        signature: 'signature-1',
        event_timestamp: new Date().toISOString(),
      }),
      verifyCallback: (): void => undefined,
    } as never,
    {
      registerDelivery: async (): Promise<boolean> => true,
    } as never,
    {
      enqueuePayment: async (payload: Record<string, unknown>) => {
        enqueuedPayload = payload;
        return {
          job_id: 'payments:tenant-a:checkout-1',
          queue_name: 'payments',
          tenant_id: 'tenant-a',
          checkout_request_id: 'checkout-1',
          deduplicated: false,
          state: 'waiting',
        };
      },
    } as never,
  );

  const response = await requestContext.run(
    {
      request_id: 'request-1',
      tenant_id: 'tenant-a',
      user_id: '00000000-0000-0000-0000-000000000499',
      role: 'admin',
      session_id: 'session-1',
      permissions: ['*:*'],
      is_authenticated: true,
      client_ip: '127.0.0.1',
      user_agent: 'payments-test',
      method: 'POST',
      path: '/mpesa/callback',
      started_at: new Date().toISOString(),
    },
    () =>
      controller.handleCallback({
        headers: {},
        body: {
          Body: {
            stkCallback: {
              MerchantRequestID: callback.merchant_request_id,
              CheckoutRequestID: callback.checkout_request_id,
              ResultCode: callback.result_code,
              ResultDesc: callback.result_desc,
              CallbackMetadata: {
                Item: [
                  { Name: 'PhoneNumber', Value: 254700000001 },
                  { Name: 'MpesaReceiptNumber', Value: 'NLJ7RT61SV' },
                ],
              },
            },
          },
        },
        rawBody: Buffer.from('{"Body":{"stkCallback":{"CheckoutRequestID":"checkout-1"}}}', 'utf8'),
        ip: '127.0.0.1',
      } as never),
  );

  assert.equal((createdLogInput as { checkout_request_id?: string } | null)?.checkout_request_id, 'checkout-1');
  assert.equal(
    (
      (createdLogInput as { raw_payload?: { Body?: { stkCallback?: { CheckoutRequestID?: string } } } } | null)
        ?.raw_payload?.Body?.stkCallback?.CheckoutRequestID
    ),
    'checkout-1',
  );
  assert.notEqual(
    (
      createdLogInput as {
        raw_payload?: {
          Body?: { stkCallback?: { CallbackMetadata?: { Item?: Array<{ Name?: string; Value?: unknown }> } } };
        };
      } | null
    )?.raw_payload?.Body?.stkCallback?.CallbackMetadata?.Item?.find((item) => item.Name === 'PhoneNumber')?.Value,
    254700000001,
  );
  assert.equal(
    (enqueuedPayload as { checkout_request_id?: string } | null)?.checkout_request_id,
    'checkout-1',
  );
  assert.equal(
    (enqueuedPayload as { callback_log_id?: string } | null)?.callback_log_id,
    callbackLog.id,
  );
  assert.equal(queuedJobId, 'payments:tenant-a:checkout-1');
  assert.equal(response.accepted, true);
  assert.equal(response.duplicate, false);
});

test('MpesaCallbackController accepts unsigned direct Daraja callbacks as unverified work', async () => {
  const requestContext = new RequestContextService();
  const callback: ParsedMpesaCallback = {
    merchant_request_id: 'merchant-direct-1',
    checkout_request_id: 'checkout-direct-1',
    result_code: 0,
    result_desc: 'Completed',
    status: 'succeeded',
    amount_minor: '10000',
    mpesa_receipt_number: 'NLJ7RT61SV',
    transaction_occurred_at: new Date('2026-04-26T07:30:45.000Z').toISOString(),
    phone_number: '254700000001',
    metadata: {},
  };
  const callbackLog = makeCallbackLog(callback);
  callbackLog.signature_verified = false;
  let createdLogInput: Record<string, unknown> | null = null;
  let verificationJobInput: Record<string, unknown> | null = null;
  let verificationQueueInput: Record<string, unknown> | null = null;
  let enqueued = false;

  const controller = new MpesaCallbackController(
    requestContext,
    {
      createLog: async (input: Record<string, unknown>) => {
        createdLogInput = input;
        return callbackLog;
      },
      markRejected: async (): Promise<void> => {
        throw new Error('direct Daraja callback should not be rejected at ingress');
      },
      markFailed: async (): Promise<void> => undefined,
      markQueued: async (): Promise<void> => undefined,
      markProcessed: async (): Promise<void> => undefined,
      markReplayed: async (): Promise<void> => undefined,
    } as never,
    {
      parseCallbackPayload: (): ParsedMpesaCallback => callback,
    } as never,
    {
      inspectCallback: () => ({
        delivery_id: 'delivery-direct-1',
        request_fingerprint: 'fingerprint-direct-1',
        signature: null,
        event_timestamp: new Date().toISOString(),
      }),
      verifyCallback: (): void => {
        throw new UnauthorizedException('MPESA callback signature header is required');
      },
    } as never,
    {
      registerDelivery: async (): Promise<boolean> => true,
    } as never,
    {
      enqueuePayment: async () => {
        enqueued = true;
        return {
          job_id: 'payments:tenant-a:checkout-direct-1',
          queue_name: 'payments',
          tenant_id: 'tenant-a',
          checkout_request_id: 'checkout-direct-1',
          deduplicated: false,
          state: 'waiting',
        };
      },
      enqueueMpesaVerification: async (input: Record<string, unknown>) => {
        verificationQueueInput = input;
        return {
          job_id: 'payments:verify:tenant-a:verification-job-1',
          queue_name: 'payments',
          tenant_id: 'tenant-a',
          verification_job_id: 'verification-job-1',
          deduplicated: false,
          state: 'waiting',
        };
      },
    } as never,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    {
      requiresEdgeSignature: () => false,
    } as never,
    undefined,
    {
      createForStkCallback: async (input: Record<string, unknown>) => {
        verificationJobInput = input;
        return {
          id: 'verification-job-1',
          tenant_id: 'tenant-a',
          transaction_status: 'pending',
        };
      },
    } as never,
  );

  const response = await requestContext.run(
    {
      request_id: 'request-direct-1',
      tenant_id: 'tenant-a',
      user_id: '00000000-0000-0000-0000-000000000499',
      role: 'admin',
      session_id: 'session-direct-1',
      permissions: ['*:*'],
      is_authenticated: true,
      client_ip: '127.0.0.1',
      user_agent: 'payments-test',
      method: 'POST',
      path: '/mpesa/callback',
      started_at: new Date().toISOString(),
    },
    () =>
      controller.handleCallback({
        headers: {},
        body: {
          Body: {
            stkCallback: {
              MerchantRequestID: callback.merchant_request_id,
              CheckoutRequestID: callback.checkout_request_id,
              ResultCode: callback.result_code,
              ResultDesc: callback.result_desc,
            },
          },
        },
        rawBody: Buffer.from('{"Body":{"stkCallback":{"CheckoutRequestID":"checkout-direct-1"}}}', 'utf8'),
        ip: '127.0.0.1',
      } as never),
  );

  assert.equal(response.accepted, true);
  assert.equal(enqueued, false);
  assert.equal((createdLogInput as { signature_verified?: boolean } | null)?.signature_verified, false);
  assert.equal((verificationJobInput as { callback_log_id?: string } | null)?.callback_log_id, callbackLog.id);
  assert.equal(
    (verificationJobInput as { checkout_request_id?: string } | null)?.checkout_request_id,
    'checkout-direct-1',
  );
  assert.equal(
    (verificationQueueInput as { verification_job_id?: string } | null)?.verification_job_id,
    'verification-job-1',
  );
  assert.equal(
    (verificationQueueInput as { callback_log_id?: string } | null)?.callback_log_id,
    callbackLog.id,
  );
});

test('MpesaCallbackController rejects unsigned callbacks in edge-signed mode before enqueue', async () => {
  const requestContext = new RequestContextService();
  const callback: ParsedMpesaCallback = {
    merchant_request_id: 'merchant-edge-1',
    checkout_request_id: 'checkout-edge-1',
    result_code: 0,
    result_desc: 'Completed',
    status: 'succeeded',
    amount_minor: '10000',
    mpesa_receipt_number: 'NLJ7RT61SV',
    transaction_occurred_at: new Date('2026-04-26T07:30:45.000Z').toISOString(),
    phone_number: '254700000001',
    metadata: {},
  };
  const callbackLog = makeCallbackLog(callback);
  callbackLog.signature_verified = false;
  let rejectedReason: string | null = null;
  let enqueued = false;

  const controller = new MpesaCallbackController(
    requestContext,
    {
      createLog: async (): Promise<CallbackLogEntity> => callbackLog,
      markRejected: async (_tenantId: string, _callbackLogId: string, reason: string): Promise<void> => {
        rejectedReason = reason;
      },
      markFailed: async (): Promise<void> => undefined,
      markQueued: async (): Promise<void> => undefined,
      markProcessed: async (): Promise<void> => undefined,
      markReplayed: async (): Promise<void> => undefined,
    } as never,
    {
      parseCallbackPayload: (): ParsedMpesaCallback => callback,
    } as never,
    {
      inspectCallback: () => ({
        delivery_id: 'delivery-edge-1',
        request_fingerprint: 'fingerprint-edge-1',
        signature: null,
        event_timestamp: new Date().toISOString(),
      }),
      verifyCallback: (): void => {
        throw new UnauthorizedException('MPESA callback signature header is required');
      },
    } as never,
    {
      registerDelivery: async (): Promise<boolean> => true,
    } as never,
    {
      enqueuePayment: async () => {
        enqueued = true;
        return {
          job_id: 'payments:tenant-a:checkout-edge-1',
          queue_name: 'payments',
          tenant_id: 'tenant-a',
          checkout_request_id: 'checkout-edge-1',
          deduplicated: false,
          state: 'waiting',
        };
      },
    } as never,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    {
      requiresEdgeSignature: () => true,
    } as never,
  );

  await assert.rejects(
    () =>
      requestContext.run(
        {
          request_id: 'request-edge-1',
          tenant_id: 'tenant-a',
          user_id: '00000000-0000-0000-0000-000000000499',
          role: 'admin',
          session_id: 'session-edge-1',
          permissions: ['*:*'],
          is_authenticated: true,
          client_ip: '127.0.0.1',
          user_agent: 'payments-test',
          method: 'POST',
          path: '/mpesa/callback',
          started_at: new Date().toISOString(),
        },
        () =>
          controller.handleCallback({
            headers: {},
            body: {
              Body: {
                stkCallback: {
                  MerchantRequestID: callback.merchant_request_id,
                  CheckoutRequestID: callback.checkout_request_id,
                  ResultCode: callback.result_code,
                  ResultDesc: callback.result_desc,
                },
              },
            },
            rawBody: Buffer.from('{"Body":{"stkCallback":{"CheckoutRequestID":"checkout-edge-1"}}}', 'utf8'),
            ip: '127.0.0.1',
          } as never),
      ),
    UnauthorizedException,
  );
  assert.equal(rejectedReason, 'MPESA callback signature header is required');
  assert.equal(enqueued, false);
});

test('MpesaC2bController accepts unsigned validation callbacks in direct Daraja mode', async () => {
  let verified = false;
  const controller = new MpesaC2bController(
    {
      validatePayment: async () => ({ ResultCode: 0, ResultDesc: 'Accepted' }),
    } as never,
    {
      verifyCallback: (): void => {
        verified = true;
        throw new UnauthorizedException('MPESA callback signature header is required');
      },
    } as never,
    { get: () => '' } as never,
    {
      requiresEdgeSignature: () => false,
    } as never,
  );

  const response = await controller.validate({ headers: {}, body: {} } as never, {
    TransactionType: 'Pay Bill',
    TransID: 'QF12345678',
    TransTime: '20260515123045',
    TransAmount: '1250',
    BusinessShortCode: '247247',
  });

  assert.deepEqual(response, { ResultCode: 0, ResultDesc: 'Accepted' });
  assert.equal(verified, false);
});

test('MpesaCallbackProcessorService writes successful callbacks to the ledger once', async () => {
  const requestContext = new RequestContextService();
  const paymentIntent = makePaymentIntent();
  const callback: ParsedMpesaCallback = {
    merchant_request_id: 'merchant-1',
    checkout_request_id: 'checkout-1',
    result_code: 0,
    result_desc: 'Completed',
    status: 'succeeded',
    amount_minor: '10000',
    mpesa_receipt_number: 'NLJ7RT61SV',
    transaction_occurred_at: new Date('2026-04-26T07:30:45.000Z').toISOString(),
    phone_number: '254700000001',
    metadata: {
      Amount: 100,
      MpesaReceiptNumber: 'NLJ7RT61SV',
    },
  };
  const callbackLog = makeCallbackLog(callback);
  let postedInput: Record<string, unknown> | null = null;
  let completedLedgerTransactionId: string | null = null;
  let publishedPaymentCompletedPayload: Record<string, unknown> | null = null;

  const processor = new MpesaCallbackProcessorService(
    {
      get: (key: string): string | undefined => {
        if (key === 'mpesa.ledgerDebitAccountCode') {
          return '1100-MPESA-CLEARING';
        }

        if (key === 'mpesa.ledgerCreditAccountCode') {
          return '2100-CUSTOMER-DEPOSITS';
        }

        return undefined;
      },
    } as never,
    requestContext,
    {
      withRequestTransaction: async <T>(callbackFn: () => Promise<T>): Promise<T> => callbackFn(),
    } as never,
    {
      parseCallbackPayload: (): ParsedMpesaCallback => callback,
    } as never,
    {
      findById: async (): Promise<CallbackLogEntity> => callbackLog,
      findLatestByCheckoutRequestId: async (): Promise<CallbackLogEntity> => callbackLog,
      markProcessing: async (): Promise<void> => undefined,
      markProcessed: async (): Promise<void> => undefined,
      markProcessedByCheckoutRequestId: async (): Promise<void> => undefined,
      markFailed: async (): Promise<void> => undefined,
      markFailedByCheckoutRequestId: async (): Promise<void> => undefined,
    } as never,
    {
      lockByCheckoutOrMerchantRequestId: async (): Promise<PaymentIntentEntity> => paymentIntent,
      markCallbackReceived: async (): Promise<void> => undefined,
      markProcessing: async (): Promise<void> => undefined,
      markCompleted: async (_tenantId: string, _paymentIntentId: string, ledgerTransactionId: string): Promise<void> => {
        completedLedgerTransactionId = ledgerTransactionId;
      },
      markFailed: async (): Promise<void> => undefined,
    } as never,
    {
      upsertFromCallback: async () => ({
        id: 'mpesa-tx-1',
        tenant_id: 'tenant-a',
        payment_intent_id: paymentIntent.id,
        callback_log_id: callbackLog.id,
        checkout_request_id: callback.checkout_request_id,
        merchant_request_id: callback.merchant_request_id,
        result_code: 0,
        result_desc: callback.result_desc,
        status: 'succeeded',
        mpesa_receipt_number: callback.mpesa_receipt_number,
        amount_minor: callback.amount_minor,
        phone_number: callback.phone_number,
        raw_payload: callbackLog.raw_payload,
        transaction_occurred_at: new Date(callback.transaction_occurred_at ?? Date.now()),
        ledger_transaction_id: null,
        processed_at: null,
        metadata: callback.metadata,
        created_at: new Date(),
        updated_at: new Date(),
      }),
      attachLedgerTransaction: async (): Promise<void> => undefined,
    } as never,
    {
      publishPaymentCompleted: async (payload: Record<string, unknown>) => {
        publishedPaymentCompletedPayload = payload;
        return undefined;
      },
    } as never,
    {
      findByCode: async (_tenantId: string, accountCode: string): Promise<AccountEntity> =>
        makeAccount({
          code: accountCode,
          normal_balance:
            accountCode === '1100-MPESA-CLEARING' ? 'debit' : 'credit',
          category:
            accountCode === '1100-MPESA-CLEARING' ? 'asset' : 'liability',
        }),
    } as never,
    {
      postTransaction: async (input: Record<string, unknown>) => {
        postedInput = input;
        return {
          transaction_id: 'ledger-tx-1',
        };
      },
    } as never,
    {
      handlePaymentIntentCompleted: async (): Promise<void> => undefined,
    } as never,
    {
      recordCallbackFailure: async (): Promise<void> => undefined,
      recordCallbackMismatch: async (): Promise<void> => undefined,
    } as never,
  );

  const result = await processor.processPaymentJob(
    {
      callback_log_id: callbackLog.id,
      tenant_id: 'tenant-a',
      checkout_request_id: callback.checkout_request_id,
      request_id: 'job-req-1',
      enqueued_at: new Date().toISOString(),
    },
    'payments:tenant-a:checkout-1',
  );

  assert.equal(completedLedgerTransactionId, 'ledger-tx-1');
  assert.equal(result.status, 'completed');
  assert.equal(result.ledger_transaction_id, 'ledger-tx-1');
  assert.equal(result.checkout_request_id, 'checkout-1');
  assert.equal(
    (postedInput as { idempotency_key?: string } | null)?.idempotency_key,
    'mpesa:checkout:checkout-1',
  );
  assert.equal(
    (publishedPaymentCompletedPayload as { payment_intent_id?: string } | null)?.payment_intent_id,
    paymentIntent.id,
  );
});

test('MpesaCallbackProcessorService reads full callback payload from vault while preserving redacted operational storage', async () => {
  const requestContext = new RequestContextService();
  const paymentIntent = makePaymentIntent();
  const callback: ParsedMpesaCallback = {
    merchant_request_id: 'merchant-1',
    checkout_request_id: 'checkout-1',
    result_code: 1,
    result_desc: 'Insufficient funds',
    status: 'failed',
    amount_minor: null,
    mpesa_receipt_number: null,
    transaction_occurred_at: null,
    phone_number: '254700000001',
    metadata: {},
  };
  const rawPayload = makeCallbackLog(callback).raw_payload as Record<string, unknown>;
  const callbackLog = makeCallbackLog(callback);
  callbackLog.raw_payload = {
    Body: {
      stkCallback: {
        MerchantRequestID: callback.merchant_request_id,
        CheckoutRequestID: callback.checkout_request_id,
        ResultCode: callback.result_code,
        ResultDesc: callback.result_desc,
        CallbackMetadata: {
          Item: [{ Name: 'PhoneNumber', Value: '2547*****01' }],
        },
      },
    },
  };
  callbackLog.raw_payload_encrypted_ref = 'mpesa-payload:tenant-a:callback_logs:abc';
  callbackLog.payload_sha256 = 'a'.repeat(64);
  let parsedPayload: Record<string, unknown> | null = null;
  let transactionInput: Record<string, unknown> | null = null;
  let vaultRef: string | null = null;

  const processor = new MpesaCallbackProcessorService(
    { get: () => undefined } as never,
    requestContext,
    {
      withRequestTransaction: async <T>(callbackFn: () => Promise<T>): Promise<T> => callbackFn(),
    } as never,
    {
      parseCallbackPayload: (payload: Record<string, unknown>): ParsedMpesaCallback => {
        parsedPayload = payload;
        return callback;
      },
    } as never,
    {
      findById: async (): Promise<CallbackLogEntity> => callbackLog,
      findLatestByCheckoutRequestId: async (): Promise<CallbackLogEntity> => callbackLog,
      markProcessing: async (): Promise<void> => undefined,
      markProcessed: async (): Promise<void> => undefined,
      markProcessedByCheckoutRequestId: async (): Promise<void> => undefined,
      markFailed: async (): Promise<void> => undefined,
      markFailedByCheckoutRequestId: async (): Promise<void> => undefined,
    } as never,
    {
      lockByCheckoutOrMerchantRequestId: async (): Promise<PaymentIntentEntity> => paymentIntent,
      markCallbackReceived: async (): Promise<void> => undefined,
      markProcessing: async (): Promise<void> => undefined,
      markCompleted: async (): Promise<void> => undefined,
      markFailed: async (): Promise<void> => undefined,
    } as never,
    {
      upsertFromCallback: async (input: Record<string, unknown>) => {
        transactionInput = input;
        return {
          id: 'mpesa-tx-1',
          tenant_id: 'tenant-a',
          payment_intent_id: paymentIntent.id,
          callback_log_id: callbackLog.id,
          checkout_request_id: callback.checkout_request_id,
          merchant_request_id: callback.merchant_request_id,
          result_code: callback.result_code,
          result_desc: callback.result_desc,
          status: 'failed',
          mpesa_receipt_number: null,
          amount_minor: null,
          phone_number: callback.phone_number,
          raw_payload: input.raw_payload,
          raw_payload_encrypted_ref: input.raw_payload_encrypted_ref,
          transaction_occurred_at: null,
          ledger_transaction_id: null,
          processed_at: null,
          metadata: {},
          created_at: new Date(),
          updated_at: new Date(),
        };
      },
      attachLedgerTransaction: async (): Promise<void> => undefined,
    } as never,
    {
      publishPaymentCompleted: async (): Promise<void> => undefined,
    } as never,
    {
      findByCode: async (): Promise<AccountEntity> => makeAccount(),
    } as never,
    {
      postTransaction: async () => ({ transaction_id: 'ledger-tx-1' }),
    } as never,
    {
      handlePaymentIntentCompleted: async (): Promise<void> => undefined,
    } as never,
    {
      recordCallbackFailure: async (): Promise<void> => undefined,
      recordCallbackMismatch: async (): Promise<void> => undefined,
    } as never,
    undefined,
    {
      retrieveForProcessing: async (input: { raw_payload_encrypted_ref: string }) => {
        vaultRef = input.raw_payload_encrypted_ref;
        return rawPayload;
      },
    } as never,
  );

  const result = await processor.processPaymentJob(
    {
      callback_log_id: callbackLog.id,
      tenant_id: 'tenant-a',
      checkout_request_id: callback.checkout_request_id,
      request_id: 'job-req-1',
      enqueued_at: new Date().toISOString(),
    },
    'payments:tenant-a:checkout-1',
  );

  assert.equal(result.status, 'failed');
  assert.equal(vaultRef, callbackLog.raw_payload_encrypted_ref);
  assert.match(JSON.stringify(parsedPayload), /254700000001/);
  assert.equal(
    JSON.stringify((transactionInput as { raw_payload?: unknown } | null)?.raw_payload).includes('254700000001'),
    false,
  );
  assert.equal(
    (transactionInput as { raw_payload_encrypted_ref?: string } | null)?.raw_payload_encrypted_ref,
    callbackLog.raw_payload_encrypted_ref,
  );
});

test('MpesaCallbackProcessorService rejects unverified successful callbacks before ledger posting', async () => {
  const requestContext = new RequestContextService();
  const paymentIntent = makePaymentIntent();
  const callback: ParsedMpesaCallback = {
    merchant_request_id: 'merchant-1',
    checkout_request_id: 'checkout-1',
    result_code: 0,
    result_desc: 'Completed',
    status: 'succeeded',
    amount_minor: '10000',
    mpesa_receipt_number: 'NLJ7RT61SV',
    transaction_occurred_at: new Date('2026-04-26T07:30:45.000Z').toISOString(),
    phone_number: '254700000001',
    metadata: {},
  };
  const callbackLog = makeCallbackLog(callback);
  callbackLog.signature_verified = false;
  let ledgerPostAttempted = false;

  const processor = new MpesaCallbackProcessorService(
    {
      get: (key: string): string | undefined => {
        if (key === 'mpesa.ledgerDebitAccountCode') {
          return '1100-MPESA-CLEARING';
        }

        if (key === 'mpesa.ledgerCreditAccountCode') {
          return '2100-CUSTOMER-DEPOSITS';
        }

        return undefined;
      },
    } as never,
    requestContext,
    {
      withRequestTransaction: async <T>(callbackFn: () => Promise<T>): Promise<T> => callbackFn(),
    } as never,
    {
      parseCallbackPayload: (): ParsedMpesaCallback => callback,
    } as never,
    {
      findById: async (): Promise<CallbackLogEntity> => callbackLog,
      findLatestByCheckoutRequestId: async (): Promise<CallbackLogEntity> => callbackLog,
      markProcessing: async (): Promise<void> => undefined,
      markProcessed: async (): Promise<void> => undefined,
      markProcessedByCheckoutRequestId: async (): Promise<void> => undefined,
      markFailed: async (): Promise<void> => undefined,
      markFailedByCheckoutRequestId: async (): Promise<void> => undefined,
    } as never,
    {
      lockByCheckoutOrMerchantRequestId: async (): Promise<PaymentIntentEntity> => paymentIntent,
      markCallbackReceived: async (): Promise<void> => undefined,
      markProcessing: async (): Promise<void> => undefined,
      markCompleted: async (): Promise<void> => undefined,
      markFailed: async (): Promise<void> => undefined,
    } as never,
    {
      upsertFromCallback: async () => ({
        id: 'mpesa-tx-1',
        tenant_id: 'tenant-a',
        payment_intent_id: paymentIntent.id,
        callback_log_id: callbackLog.id,
        checkout_request_id: callback.checkout_request_id,
        merchant_request_id: callback.merchant_request_id,
        result_code: 0,
        result_desc: callback.result_desc,
        status: 'succeeded',
        mpesa_receipt_number: callback.mpesa_receipt_number,
        amount_minor: callback.amount_minor,
        phone_number: callback.phone_number,
        raw_payload: callbackLog.raw_payload,
        transaction_occurred_at: new Date(callback.transaction_occurred_at ?? Date.now()),
        ledger_transaction_id: null,
        processed_at: null,
        metadata: callback.metadata,
        created_at: new Date(),
        updated_at: new Date(),
      }),
      attachLedgerTransaction: async (): Promise<void> => undefined,
    } as never,
    {
      publishPaymentCompleted: async (): Promise<void> => undefined,
    } as never,
    {
      findByCode: async (): Promise<AccountEntity> => makeAccount(),
    } as never,
    {
      postTransaction: async (): Promise<never> => {
        ledgerPostAttempted = true;
        throw new Error('Unverified callback must not post ledger entries');
      },
    } as never,
    {
      handlePaymentIntentCompleted: async (): Promise<void> => undefined,
    } as never,
    {
      recordCallbackFailure: async (): Promise<void> => undefined,
      recordCallbackMismatch: async (): Promise<void> => undefined,
    } as never,
  );

  await assert.rejects(
    () =>
      processor.processPaymentJob({
        callback_log_id: callbackLog.id,
        tenant_id: 'tenant-a',
        checkout_request_id: callback.checkout_request_id,
        request_id: 'job-req-1',
        enqueued_at: new Date().toISOString(),
      }, 'payments:tenant-a:checkout-1'),
    /verified M-PESA callback/,
  );
  assert.equal(ledgerPostAttempted, false);
});

test('MpesaCallbackProcessorService rejects amount mismatches before ledger posting', async () => {
  const requestContext = new RequestContextService();
  const paymentIntent = makePaymentIntent({ amount_minor: '10000' });
  const callback: ParsedMpesaCallback = {
    merchant_request_id: 'merchant-1',
    checkout_request_id: 'checkout-1',
    result_code: 0,
    result_desc: 'Completed',
    status: 'succeeded',
    amount_minor: '9000',
    mpesa_receipt_number: 'NLJ7RT61SV',
    transaction_occurred_at: new Date('2026-04-26T07:30:45.000Z').toISOString(),
    phone_number: '254700000001',
    metadata: {},
  };
  const callbackLog = makeCallbackLog(callback);

  const processor = new MpesaCallbackProcessorService(
    {
      get: (): undefined => undefined,
    } as never,
    requestContext,
    {
      withRequestTransaction: async <T>(callbackFn: () => Promise<T>): Promise<T> => callbackFn(),
    } as never,
    {
      parseCallbackPayload: (): ParsedMpesaCallback => callback,
    } as never,
    {
      findById: async (): Promise<CallbackLogEntity> => callbackLog,
      findLatestByCheckoutRequestId: async (): Promise<CallbackLogEntity> => callbackLog,
      markProcessing: async (): Promise<void> => undefined,
      markProcessed: async (): Promise<void> => undefined,
      markProcessedByCheckoutRequestId: async (): Promise<void> => undefined,
      markFailed: async (): Promise<void> => undefined,
      markFailedByCheckoutRequestId: async (): Promise<void> => undefined,
    } as never,
    {
      lockByCheckoutOrMerchantRequestId: async (): Promise<PaymentIntentEntity> => paymentIntent,
      markCallbackReceived: async (): Promise<void> => undefined,
      markProcessing: async (): Promise<void> => undefined,
      markCompleted: async (): Promise<void> => undefined,
      markFailed: async (): Promise<void> => undefined,
    } as never,
    {
      upsertFromCallback: async () => ({
        id: 'mpesa-tx-1',
        tenant_id: 'tenant-a',
        payment_intent_id: paymentIntent.id,
        callback_log_id: callbackLog.id,
        checkout_request_id: callback.checkout_request_id,
        merchant_request_id: callback.merchant_request_id,
        result_code: 0,
        result_desc: callback.result_desc,
        status: 'succeeded',
        mpesa_receipt_number: callback.mpesa_receipt_number,
        amount_minor: callback.amount_minor,
        phone_number: callback.phone_number,
        raw_payload: callbackLog.raw_payload,
        transaction_occurred_at: new Date(callback.transaction_occurred_at ?? Date.now()),
        ledger_transaction_id: null,
        processed_at: null,
        metadata: callback.metadata,
        created_at: new Date(),
        updated_at: new Date(),
      }),
      attachLedgerTransaction: async (): Promise<void> => undefined,
    } as never,
    {
      publishPaymentCompleted: async (): Promise<void> => undefined,
    } as never,
    {
      findByCode: async (): Promise<AccountEntity> => makeAccount(),
    } as never,
    {
      postTransaction: async (): Promise<never> => {
        throw new Error('Ledger posting should not run for invalid callback amounts');
      },
    } as never,
    {
      handlePaymentIntentCompleted: async (): Promise<void> => undefined,
    } as never,
    {
      recordCallbackFailure: async (): Promise<void> => undefined,
      recordCallbackMismatch: async (): Promise<void> => undefined,
    } as never,
  );

  await assert.rejects(
    () =>
      processor.processPaymentJob({
        callback_log_id: callbackLog.id,
        tenant_id: 'tenant-a',
        checkout_request_id: callback.checkout_request_id,
        request_id: 'job-req-1',
        enqueued_at: new Date().toISOString(),
      }, 'payments:tenant-a:checkout-1'),
    (error: unknown) =>
      error instanceof BadRequestException &&
      error.message.includes('amount mismatch'),
  );
});

test('MpesaReconciliationService reports missing callbacks, duplicates, amount mismatches, wrong references, and late provider status', async () => {
  const requestContext = new RequestContextService();
  const queryLog: Array<{ sql: string; params: unknown[] }> = [];
  let discrepancyInsertCount = 0;
  const service = new MpesaReconciliationService(
    {
      get: (key: string): string | undefined => {
        if (key === 'mpesa.ledgerDebitAccountCode') {
          return '1110-MPESA-CLEARING';
        }

        if (key === 'mpesa.ledgerCreditAccountCode') {
          return '1100-AR-FEES';
        }

        return undefined;
      },
    } as never,
    requestContext,
    {
      query: async (sql: string, params: unknown[]) => {
        queryLog.push({ sql, params });

        if (/INSERT INTO mpesa_reconciliation_batches/.test(sql)) {
          return { rows: [{ id: '00000000-0000-0000-0000-000000009001' }] };
        }

        if (/INSERT INTO mpesa_reconciliation_discrepancies/.test(sql)) {
          discrepancyInsertCount += 1;
          return { rows: [] };
        }

        if (/FROM mpesa_transactions mt[\s\S]+LEFT JOIN transactions/.test(sql)) {
          return {
            rows: [
              {
                mpesa_transaction_id: '00000000-0000-0000-0000-000000008001',
                payment_intent_id: '00000000-0000-0000-0000-000000008101',
                checkout_request_id: 'checkout-mismatch',
                merchant_request_id: 'merchant-mismatch',
                mpesa_receipt_number: 'RCP1234A',
                mpesa_amount_minor: '10000',
                ledger_transaction_id: '00000000-0000-0000-0000-000000008201',
                transaction_occurred_at: new Date('2026-05-18T08:00:00.000Z'),
                processed_at: new Date('2026-05-18T08:01:00.000Z'),
                created_at: new Date('2026-05-18T08:02:00.000Z'),
                linked_transaction_id: '00000000-0000-0000-0000-000000008201',
                linked_transaction_reference: 'INV-WRONG-REF',
                linked_transaction_amount_minor: '9000',
                linked_transaction_posted_at: new Date('2026-05-18T08:03:00.000Z'),
              },
            ],
          };
        }

        if (/FROM payment_intents pi[\s\S]+LEFT JOIN mpesa_transactions/.test(sql)) {
          return {
            rows: [
              {
                payment_intent_id: '00000000-0000-0000-0000-000000008102',
                checkout_request_id: 'checkout-missing',
                merchant_request_id: 'merchant-missing',
                amount_minor: '5000',
                status: 'stk_requested',
                observed_at: new Date('2026-05-18T07:00:00.000Z'),
              },
            ],
          };
        }

        if (/GROUP BY mt\.mpesa_receipt_number/.test(sql)) {
          return {
            rows: [
              {
                mpesa_receipt_number: 'RCP-DUP',
                duplicate_count: 2,
                total_amount_minor: '20000',
                first_seen_at: new Date('2026-05-18T09:00:00.000Z'),
                mpesa_transaction_ids: [
                  '00000000-0000-0000-0000-000000008301',
                  '00000000-0000-0000-0000-000000008302',
                ],
                checkout_request_ids: ['checkout-dup-1', 'checkout-dup-2'],
              },
            ],
          };
        }

        if (/candidate_transactions/.test(sql)) {
          return {
            rows: [
              {
                transaction_id: '00000000-0000-0000-0000-000000008401',
                reference: 'MPESA-WRONG-STUDENT',
                description: 'Manual receipt posted to wrong learner',
                total_amount_minor: '7500',
                posted_at: new Date('2026-05-18T10:00:00.000Z'),
                account_codes: ['1110-MPESA-CLEARING'],
              },
            ],
          };
        }

        if (/FROM mpesa_c2b_payments c2b/.test(sql)) {
          return {
            rows: [
              {
                c2b_payment_id: '00000000-0000-0000-0000-000000008501',
                trans_id: 'QF-LATE-1',
                bill_ref_number: 'ADM-404',
                amount_minor: '12500',
                status: 'verification_requested',
                received_at: new Date('2026-05-18T11:00:00.000Z'),
                matched_invoice_id: null,
                matched_student_id: null,
                manual_fee_payment_id: null,
                ledger_transaction_id: null,
                metadata: { provider_status: 'late_provider_status_update' },
              },
            ],
          };
        }

        return { rows: [] };
      },
    } as never,
  );

  const report = await requestContext.run(
    {
      request_id: 'req-reconciliation-1',
      tenant_id: 'tenant-a',
      user_id: '00000000-0000-0000-0000-000000000401',
      role: 'accountant',
      session_id: 'session-reconciliation-1',
      permissions: ['billing:read'],
      is_authenticated: true,
      client_ip: '127.0.0.1',
      user_agent: 'payments-test',
      method: 'GET',
      path: '/payments/mpesa/reconciliation/daily',
      started_at: '2026-05-19T06:00:00.000Z',
    },
    () =>
      service.generateDailyReport({
        report_date: '2026-05-18',
        payment_channel_id: '00000000-0000-0000-0000-000000000902',
        missing_callback_grace_minutes: 0,
      }),
  );

  assert.equal(report.reconciliation_batch_id, '00000000-0000-0000-0000-000000009001');
  assert.equal(report.payment_channel_id, '00000000-0000-0000-0000-000000000902');
  assert.equal(report.is_balanced, false);
  assert.equal(report.summary.amount_mismatch_count, 1);
  assert.equal(report.summary.missing_callback_count, 1);
  assert.equal(report.summary.duplicate_receipt_group_count, 1);
  assert.equal(report.summary.unmatched_ledger_transaction_count, 1);
  assert.equal(report.summary.manual_review_required_count, 1);
  assert.deepEqual(
    report.discrepancies.map((item) => item.reconciliation_state).sort(),
    [
      'amount_mismatch',
      'duplicate_provider_receipt',
      'manual_review_required',
      'missing_provider_record',
      'verified_unmatched',
    ],
  );
  assert.equal(discrepancyInsertCount, report.discrepancies.length);
  assert.equal(queryLog.some((query) => query.params.includes('00000000-0000-0000-0000-000000000902')), true);
});

test('MpesaReconciliationService lists accountant review items without raw M-PESA payload leakage', async () => {
  const requestContext = new RequestContextService();
  const service = new MpesaReconciliationService(
    { get: (): string | undefined => undefined } as never,
    requestContext,
    {
      query: async (sql: string) => {
        if (/FROM mpesa_reconciliation_discrepancies/.test(sql)) {
          return {
            rows: [
              {
                id: '00000000-0000-0000-0000-000000009101',
                reconciliation_batch_id: '00000000-0000-0000-0000-000000009001',
                discrepancy_type: 'manual_review_required',
                reconciliation_state: 'verified_unmatched',
                severity: 'warning',
                detail: 'Unmatched C2B payment needs accountant review',
                occurred_at: new Date('2026-05-18T11:00:00.000Z'),
                provider_transaction_id: 'QF-LATE-1',
                payment_intent_id: null,
                mpesa_transaction_id: null,
                fee_invoice_id: null,
                ledger_transaction_id: null,
                approving_user_id: null,
                resolution_status: 'open',
                evidence: {
                  raw_payload: { TransID: 'QF-LATE-1', MSISDN: '254712345678' },
                  redacted_payload: { TransID: 'QF-LATE-1', MSISDN: '+2547*****78' },
                },
                created_at: new Date('2026-05-18T11:01:00.000Z'),
              },
            ],
          };
        }

        return { rows: [] };
      },
    } as never,
  );

  const review = await requestContext.run(
    {
      request_id: 'req-review-1',
      tenant_id: 'tenant-a',
      user_id: '00000000-0000-0000-0000-000000000401',
      role: 'accountant',
      session_id: 'session-review-1',
      permissions: ['billing:read'],
      is_authenticated: true,
      client_ip: '127.0.0.1',
      user_agent: 'payments-test',
      method: 'GET',
      path: '/payments/mpesa/reconciliation/review',
      started_at: '2026-05-19T06:00:00.000Z',
    },
    () =>
      (service as unknown as {
        listAccountantReviewItems: (query?: Record<string, unknown>) => Promise<{
          items: Array<{ evidence: Record<string, unknown> }>;
          summary: { open_count: number };
        }>;
      }).listAccountantReviewItems({ reconciliation_state: 'verified_unmatched' }),
  );

  assert.equal(review.summary.open_count, 1);
  assert.equal(JSON.stringify(review.items[0]?.evidence).includes('254712345678'), false);
  assert.match(JSON.stringify(review.items[0]?.evidence), /\+2547\*\*\*\*\*78/);
});

test('MpesaReconciliationService requires two distinct approvers before resolving reversal requests', async () => {
  const requestContext = new RequestContextService();
  const requestId = '00000000-0000-0000-0000-000000009201';
  const approvalRows: Record<string, Record<string, unknown>> = {
    [requestId]: {
      id: requestId,
      tenant_id: 'tenant-a',
      action: 'reversal',
      status: 'pending_first_approval',
      subject_type: 'mpesa_reconciliation_discrepancy',
      subject_id: '00000000-0000-0000-0000-000000009101',
      amount_minor: '12500',
      currency_code: 'KES',
      reason: 'Provider reversal confirmed by statement',
      reconciliation_batch_id: '00000000-0000-0000-0000-000000009001',
      reconciliation_discrepancy_id: '00000000-0000-0000-0000-000000009101',
      requested_by_user_id: '00000000-0000-0000-0000-000000000401',
      first_approver_user_id: null,
      second_approver_user_id: null,
      evidence: {},
    },
  };
  const queryLog: string[] = [];
  let discrepancyResolved = false;
  const service = new MpesaReconciliationService(
    { get: (): string | undefined => undefined } as never,
    requestContext,
    {
      query: async (sql: string, params: unknown[]) => {
        queryLog.push(sql);

        if (/INSERT INTO finance_approval_requests/.test(sql)) {
          return { rows: [approvalRows[requestId]] };
        }

        if (/SELECT \*[\s\S]+FROM finance_approval_requests/.test(sql)) {
          return { rows: [approvalRows[String(params[1])]] };
        }

        if (/status = 'approved'/.test(sql)) {
          approvalRows[requestId] = {
            ...approvalRows[requestId],
            status: 'approved',
            second_approver_user_id: params[2],
          };
          return { rows: [approvalRows[requestId]] };
        }

        if (/pending_second_approval/.test(sql)) {
          approvalRows[requestId] = {
            ...approvalRows[requestId],
            status: 'pending_second_approval',
            first_approver_user_id: params[2],
          };
          return { rows: [approvalRows[requestId]] };
        }

        if (/UPDATE mpesa_reconciliation_discrepancies/.test(sql)) {
          discrepancyResolved = true;
          return { rows: [] };
        }

        return { rows: [] };
      },
    } as never,
  );

  const requested = await requestContext.run(
    {
      request_id: 'req-approval-1',
      tenant_id: 'tenant-a',
      user_id: '00000000-0000-0000-0000-000000000401',
      role: 'accountant',
      session_id: 'session-approval-1',
      permissions: ['billing:update'],
      is_authenticated: true,
      client_ip: '127.0.0.1',
      user_agent: 'payments-test',
      method: 'POST',
      path: '/payments/mpesa/reconciliation/approval-requests',
      started_at: '2026-05-19T06:00:00.000Z',
    },
    () =>
      (service as unknown as {
        requestFinanceApproval: (dto: Record<string, unknown>) => Promise<Record<string, unknown>>;
      }).requestFinanceApproval({
        action: 'reversal',
        subject_type: 'mpesa_reconciliation_discrepancy',
        subject_id: '00000000-0000-0000-0000-000000009101',
        amount_minor: 12500,
        reason: 'Provider reversal confirmed by statement',
        reconciliation_batch_id: '00000000-0000-0000-0000-000000009001',
        reconciliation_discrepancy_id: '00000000-0000-0000-0000-000000009101',
      }),
  );

  assert.equal(requested.status, 'pending_first_approval');

  const firstApproval = await requestContext.run(
    {
      request_id: 'req-approval-2',
      tenant_id: 'tenant-a',
      user_id: '00000000-0000-0000-0000-000000000402',
      role: 'principal',
      session_id: 'session-approval-2',
      permissions: ['billing:update'],
      is_authenticated: true,
      client_ip: '127.0.0.1',
      user_agent: 'payments-test',
      method: 'POST',
      path: `/payments/mpesa/reconciliation/approval-requests/${requestId}/approve`,
      started_at: '2026-05-19T06:05:00.000Z',
    },
    () =>
      (service as unknown as {
        approveFinanceApproval: (id: string) => Promise<Record<string, unknown>>;
      }).approveFinanceApproval(requestId),
  );

  assert.equal(firstApproval.status, 'pending_second_approval');

  await assert.rejects(
    () =>
      requestContext.run(
        {
          request_id: 'req-approval-3',
          tenant_id: 'tenant-a',
          user_id: '00000000-0000-0000-0000-000000000402',
          role: 'principal',
          session_id: 'session-approval-3',
          permissions: ['billing:update'],
          is_authenticated: true,
          client_ip: '127.0.0.1',
          user_agent: 'payments-test',
          method: 'POST',
          path: `/payments/mpesa/reconciliation/approval-requests/${requestId}/approve`,
          started_at: '2026-05-19T06:06:00.000Z',
        },
        () =>
          (service as unknown as {
            approveFinanceApproval: (id: string) => Promise<Record<string, unknown>>;
          }).approveFinanceApproval(requestId),
      ),
    /distinct approver/,
  );

  const secondApproval = await requestContext.run(
    {
      request_id: 'req-approval-4',
      tenant_id: 'tenant-a',
      user_id: '00000000-0000-0000-0000-000000000403',
      role: 'director',
      session_id: 'session-approval-4',
      permissions: ['billing:update'],
      is_authenticated: true,
      client_ip: '127.0.0.1',
      user_agent: 'payments-test',
      method: 'POST',
      path: `/payments/mpesa/reconciliation/approval-requests/${requestId}/approve`,
      started_at: '2026-05-19T06:10:00.000Z',
    },
    () =>
      (service as unknown as {
        approveFinanceApproval: (id: string) => Promise<Record<string, unknown>>;
      }).approveFinanceApproval(requestId),
  );

  assert.equal(secondApproval.status, 'approved');
  assert.equal(discrepancyResolved, true);
  assert.equal(queryLog.some((sql) => /UPDATE mpesa_reconciliation_discrepancies/.test(sql)), true);
});

test('PaymentsController exposes accountant review and finance approval endpoints', () => {
  const reviewHandler = PaymentsController.prototype.listReconciliationReviewItems;
  const requestHandler = PaymentsController.prototype.requestFinanceApproval;
  const approveHandler = PaymentsController.prototype.approveFinanceApproval;

  assert.equal(Reflect.getMetadata(PATH_METADATA, reviewHandler), 'reconciliation/review');
  assert.equal(Reflect.getMetadata(PATH_METADATA, requestHandler), 'reconciliation/approval-requests');
  assert.equal(
    Reflect.getMetadata(PATH_METADATA, approveHandler),
    'reconciliation/approval-requests/:requestId/approve',
  );
  assert.deepEqual(Reflect.getMetadata(PERMISSIONS_KEY, reviewHandler), ['billing:read']);
  assert.deepEqual(Reflect.getMetadata(PERMISSIONS_KEY, requestHandler), ['billing:update']);
  assert.deepEqual(Reflect.getMetadata(PERMISSIONS_KEY, approveHandler), ['billing:update']);
});

test('MpesaReconciliationService runs daily reconciliation for every active tenant payment channel', async () => {
  const requestContext = new RequestContextService();
  const reportContexts: string[] = [];
  const service = new MpesaReconciliationService(
    {
      get: (): string | undefined => undefined,
    } as never,
    requestContext,
    {
      query: async (sql: string) => {
        if (/FROM tenant_payment_channels tpc/.test(sql)) {
          return {
            rows: [
              {
                tenant_id: 'tenant-a',
                payment_channel_id: '00000000-0000-0000-0000-000000000902',
              },
              {
                tenant_id: 'tenant-b',
                payment_channel_id: '00000000-0000-0000-0000-000000000903',
              },
            ],
          };
        }

        if (/INSERT INTO mpesa_reconciliation_batches/.test(sql)) {
          return { rows: [{ id: '00000000-0000-0000-0000-000000009001' }] };
        }

        if (/INSERT INTO mpesa_reconciliation_discrepancies/.test(sql)) {
          return { rows: [] };
        }

        if (/FROM mpesa_transactions mt[\s\S]+LEFT JOIN transactions/.test(sql)) {
          reportContexts.push(requestContext.requireStore().tenant_id ?? 'missing');
        }

        return { rows: [] };
      },
    } as never,
  );

  const result = await service.runDailyProcessor({
    report_date: '2026-05-18',
    missing_callback_grace_minutes: 0,
  });

  assert.equal(result.report_date, '2026-05-18');
  assert.equal(result.processed_channel_count, 2);
  assert.deepEqual(reportContexts, ['tenant-a', 'tenant-b']);
  assert.deepEqual(
    result.reports.map((report) => report.payment_channel_id),
    [
      '00000000-0000-0000-0000-000000000902',
      '00000000-0000-0000-0000-000000000903',
    ],
  );
});

test('MpesaReconciliationService generates on-demand date-range reports for accountant review', async () => {
  const requestContext = new RequestContextService();
  const service = new MpesaReconciliationService(
    {
      get: (): string | undefined => undefined,
    } as never,
    requestContext,
    {
      query: async (sql: string) => {
        if (/INSERT INTO mpesa_reconciliation_batches/.test(sql)) {
          return { rows: [{ id: '00000000-0000-0000-0000-000000009001' }] };
        }

        if (/INSERT INTO mpesa_reconciliation_discrepancies/.test(sql)) {
          return { rows: [] };
        }

        return { rows: [] };
      },
    } as never,
  );

  const range = await requestContext.run(
    {
      request_id: 'req-reconciliation-range-1',
      tenant_id: 'tenant-a',
      user_id: '00000000-0000-0000-0000-000000000401',
      role: 'accountant',
      session_id: 'session-reconciliation-range-1',
      permissions: ['billing:read'],
      is_authenticated: true,
      client_ip: '127.0.0.1',
      user_agent: 'payments-test',
      method: 'GET',
      path: '/payments/mpesa/reconciliation/range',
      started_at: '2026-05-19T06:00:00.000Z',
    },
    () =>
      service.generateDateRangeReport({
        start_date: '2026-05-17',
        end_date: '2026-05-18',
        payment_channel_id: '00000000-0000-0000-0000-000000000902',
      }),
  );

  assert.equal(range.tenant_id, 'tenant-a');
  assert.equal(range.start_date, '2026-05-17');
  assert.equal(range.end_date, '2026-05-18');
  assert.equal(range.report_count, 2);
  assert.deepEqual(
    range.reports.map((report) => report.report_date),
    ['2026-05-17', '2026-05-18'],
  );
  assert.equal(range.summary.discrepancy_count, 0);
});
