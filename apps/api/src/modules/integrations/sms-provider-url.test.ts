import assert from 'node:assert/strict';
import test from 'node:test';

import { SmsDispatchService } from './sms-dispatch.service';
import {
  assertSafeSmsProviderUrl,
  UnsafeSmsProviderUrlError,
} from './sms-provider-url';

for (const url of [
  'http://api.africastalking.com/send',
  'https://user:secret@api.africastalking.com/send',
  'https://localhost/send',
  'https://127.0.0.1/send',
  'https://10.0.0.2/send',
  'https://[::1]/send',
  'https://[fd00::1]/send',
  'https://[fe80::1]/send',
  'https://[::ffff:127.0.0.1]/send',
]) {
  test(`SMS provider URL policy blocks ${url}`, () => {
    assert.throws(
      () => assertSafeSmsProviderUrl(url, 'africas_talking'),
      UnsafeSmsProviderUrlError,
    );
  });
}

test('SMS provider URL policy accepts official and explicitly configured hosts only', () => {
  assert.equal(
    assertSafeSmsProviderUrl('https://api.africastalking.com/version1/messaging', 'africas_talking').hostname,
    'api.africastalking.com',
  );
  assert.equal(
    assertSafeSmsProviderUrl('https://sms.vendor.example/send', 'textsms_kenya', ['sms.vendor.example']).hostname,
    'sms.vendor.example',
  );
  assert.throws(
    () => assertSafeSmsProviderUrl('https://unapproved.example/send', 'textsms_kenya'),
    /allowlist/,
  );
});

test('provider fetch rejects redirects and carries a stable idempotency key', async () => {
  const originalFetch = globalThis.fetch;
  let capturedRequest: RequestInit | undefined;
  globalThis.fetch = (async (_url: string | URL | Request, init?: RequestInit) => {
    capturedRequest = init;
    return new Response('{"message_id":"provider-1"}', {
      status: 202,
      headers: { 'content-type': 'application/json' },
    });
  }) as typeof fetch;

  try {
    const service = new SmsDispatchService({
      getDefaultProviderForDispatch: async () => ({
        provider: {
          id: '00000000-0000-4000-8000-000000000040',
          provider_name: 'Africa Talking',
          provider_code: 'africas_talking',
          api_key_ciphertext: 'encrypted',
          username_ciphertext: 'encrypted',
          sender_id: 'MYSHULE',
          base_url: 'https://api.africastalking.com/version1/messaging',
          is_active: true,
          is_default: true,
          last_test_status: 'configuration_valid',
          last_tested_at: null,
          created_at: new Date(),
          updated_at: new Date(),
        },
        api_key: 'secret',
        username: 'school',
      }),
    } as never);

    const result = await service.send({
      to: '+254700000001',
      message: 'Notice',
      metadata: { dispatch_key: 'stable-sms-key' },
    });

    assert.equal(result.status, 'provider_accepted');
    assert.equal(capturedRequest?.redirect, 'error');
    assert.equal(
      (capturedRequest?.headers as Record<string, string>)['Idempotency-Key'],
      'stable-sms-key',
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('2xx provider payload with explicit rejection is not recorded as accepted', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () => new Response(
    '{"success":false,"message":"invalid recipient"}',
    { status: 200, headers: { 'content-type': 'application/json' } },
  )) as typeof fetch;

  try {
    const service = new SmsDispatchService({
      getDefaultProviderForDispatch: async () => ({
        provider: {
          id: '00000000-0000-4000-8000-000000000040',
          provider_name: 'Africa Talking',
          provider_code: 'africas_talking',
          api_key_ciphertext: 'encrypted',
          username_ciphertext: 'encrypted',
          sender_id: 'MYSHULE',
          base_url: 'https://api.africastalking.com/version1/messaging',
          is_active: true,
          is_default: true,
          last_test_status: 'configuration_valid',
          last_tested_at: null,
          created_at: new Date(),
          updated_at: new Date(),
        },
        api_key: 'secret',
        username: 'school',
      }),
    } as never);

    await assert.rejects(
      () => service.send({ to: '+254700000001', message: 'Notice' }),
      /rejected/,
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});
