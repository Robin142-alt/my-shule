import 'reflect-metadata';
import assert from 'node:assert/strict';
import test from 'node:test';
import { BadRequestException } from '@nestjs/common';
import { RequestContextService } from '../../common/request-context/request-context.service';
import { PiiEncryptionService } from '../security/pii-encryption.service';
import { MpesaService } from '../payments/services/mpesa.service';
import { MpesaTransactionStatusService } from '../payments/services/mpesa-transaction-status.service';
import { PaymentChannelWorkflowService } from './payment-channel-workflow.service';
import { TenantFinanceConfigRepository } from './tenant-finance-config.repository';
import { TenantFinanceConfigService } from './tenant-finance-config.service';
import { collectionProvider } from './payment-provider.catalog';

const encryption = new PiiEncryptionService({ get: () => 'a'.repeat(32) } as never);
const credentials = {
  consumer_key: 'school-key', consumer_secret: 'school-secret',
  initiator_name: 'school-initiator', security_credential: 'school-security-credential',
};
const school = 'school-a';
const revisionId = '00000000-0000-4000-8000-000000000001';

function connectionFixture() {
  const context = new RequestContextService();
  const effects: unknown[] = [];
  let row: Record<string, any> = { id: revisionId, tenant_id: school, provider_code: 'safaricom',
    account_number: '247247', display_name: 'Fees Paybill', status: 'approved', credential_version: 0 };
  const workflow = new PaymentChannelWorkflowService(context, {
    withRequestTransaction: (work: () => Promise<unknown>) => work(),
    query: async (sql: string, params: unknown[]) => {
      assert.equal(params[0], school);
      assert.equal(params[1], revisionId);
      if (sql.startsWith('UPDATE')) row = { ...row, connection_mode: params[2], environment: params[3],
        credentials_ciphertext: params[4], credential_version: row.credential_version + 1, status: 'connecting' };
      return { rows: [row] };
    },
  } as never, encryption, {} as never, {} as never, {} as never,
  { record: async (input: unknown) => effects.push(input) } as never,
  { publish: async (input: unknown) => effects.push(input) } as never,
  { upsertFromSchoolOperation: async (input: unknown) => effects.push(input) } as never);
  return { effects, row: () => row, connect: (environment: 'sandbox' | 'production', values: Record<string, string>) =>
    context.run({ tenant_id: null, role: 'platform_owner', audience: 'superadmin', is_authenticated: true } as never,
      () => workflow.connect(school, revisionId, { connection_mode: 'daraja', environment, credentials: values })) };
}

test('Safaricom catalog requires C2B verification credentials but makes the STK passkey optional', () => {
  const fields = collectionProvider('safaricom').credential_fields;
  assert.equal(fields.find(field => field.key === 'passkey')?.required, false);
  for (const key of Object.keys(credentials)) assert.equal(fields.find(field => field.key === key)?.required, true);
});

for (const environment of ['sandbox', 'production'] as const) {
  for (const passkey of [undefined, '', '   ', 'school-stk-passkey']) {
    test(`${environment} automatic collection saves with ${passkey?.trim() ? 'an STK passkey' : `optional passkey ${JSON.stringify(passkey)}`}`, async () => {
      const fixture = connectionFixture();
      const result = await fixture.connect(environment, { ...credentials, ...(passkey === undefined ? {} : { passkey }) });
      assert.equal(result.status, 'connecting');
      assert.equal(result.credentials_configured, true);
      const stored = JSON.parse(encryption.decrypt(fixture.row().credentials_ciphertext, `collection-channel:${school}:${revisionId}:credentials`));
      assert.equal(stored.passkey, passkey?.trim() || undefined);
      assert.equal(stored.consumer_secret, credentials.consumer_secret);
      assert.match(stored._callback_token, /^[a-f0-9]{64}$/);
      assert.equal(fixture.effects.length, 3, 'Audit, event and notification must still be emitted');
      assert.equal(JSON.stringify([result, fixture.effects]).includes(credentials.consumer_secret), false);
      assert.equal('credentials_ciphertext' in result, false);
    });
  }
}

test('optional passkeys still reject malformed, oversized and pre-encrypted values', async () => {
  for (const passkey of [123, null, {}, 'x'.repeat(8193), 'enc:v1:injected', ' enc:v1:injected ']) {
    const fixture = connectionFixture();
    await assert.rejects(fixture.connect('production', { ...credentials, passkey } as never), BadRequestException);
    assert.equal(fixture.effects.length, 0);
  }
});

test('C2B cannot omit its required provider verification credentials', async () => {
  for (const key of Object.keys(credentials)) {
    const values: Record<string, string> = { ...credentials };
    delete values[key];
    await assert.rejects(connectionFixture().connect('production', values), BadRequestException);
  }
});

test('C2B finance configuration persists and reads without an STK secret', async () => {
  let stored: Record<string, any> | undefined;
  const repository = new TenantFinanceConfigRepository({ query: async (_sql: string, params: unknown[]) => {
    stored = { id: revisionId, tenant_id: params[0], shortcode: params[1], paybill_number: params[2], till_number: params[3],
      consumer_key: params[4], consumer_secret: params[5], passkey: params[6], initiator_name: params[7],
      environment: params[8], callback_url: params[9], status: params[10] };
    return { rows: [stored] };
  } } as never, encryption);
  const result = await repository.upsertMpesaConfig({ tenant_id: school, shortcode: '247247', paybill_number: '247247',
    till_number: null, ...credentials, passkey: '', environment: 'production',
    callback_url: 'https://school.example/callback', status: 'active' });
  assert.equal(result.passkey, '');
  assert.equal(result.consumer_secret, credentials.consumer_secret);
  assert.notEqual(stored?.consumer_secret, credentials.consumer_secret);
});

test('C2B go-live does not require STK, but an explicitly enabled STK channel requires its passkey', async () => {
  let stkEnabled: boolean | undefined;
  const service = new TenantFinanceConfigService({
    findActiveMpesaConfigForTenant: async () => ({ id: revisionId, shortcode: '247247', paybill_number: '247247',
      ...credentials, passkey: '', environment: 'production', callback_url: 'https://school.example/callback' }),
    findFinancialAccountsForTenant: async () => ({ mpesa_clearing_account_code: '1110', fee_control_account_code: '1100' }),
    findActivePaymentChannelForMpesaConfig: async () => ({ metadata: { stk_enabled: stkEnabled,
      c2b_confirmation_url_registered: true, c2b_validation_url_registered: true,
      sandbox_smoke_test_passed: true, reconciliation_api_permissions_configured: true } }),
  } as never, {} as never);
  for (const enabled of [undefined, false, true]) {
    stkEnabled = enabled;
    const result = await service.validateMpesaGoLive(school);
    assert.equal(result.eligible_for_production, enabled !== true);
  }
});

for (const passkey of ['', '   ']) {
  test(`STK initiation refuses a missing passkey before creating a payment or calling Safaricom (${JSON.stringify(passkey)})`, async () => {
    const context = new RequestContextService();
    const service = new MpesaService({} as never, context, {
      withRequestTransaction: (work: () => Promise<unknown>) => work(),
      query: async () => ({ rows: [{ id: revisionId }] }),
    } as never, {} as never, {} as never, {} as never, {} as never, undefined,
    { resolveMpesaConfigForTenant: async () => ({ passkey }) } as never);
    await context.run({ tenant_id: school, role: 'accountant', user_id: revisionId } as never, () =>
      assert.rejects(service.createPaymentIntent({ idempotency_key: 'c2b-only', amount_minor: '10000', phone_number: '0712345678',
        account_reference: 'ADM-001', transaction_desc: 'School fees' }), /passkey.*M-PESA Express|M-PESA Express.*passkey/));
  });

  test(`STK status queries refuse a missing passkey before accessing tokens or Safaricom (${JSON.stringify(passkey)})`, async () => {
    const service = new MpesaTransactionStatusService({} as never, {} as never,
      { resolveMpesaConfigForTenant: async () => ({ passkey }) } as never);
    await assert.rejects(service.verifyStkPushStatus({ tenant_id: school, checkout_request_id: 'checkout' }),
      /passkey.*M-PESA Express|M-PESA Express.*passkey/);
  });
}
