import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';

import { MfaService } from './mfa.service';

test('MfaService requires a challenge for high-privilege roles without a trusted device', async () => {
  const queries: Array<{ text: string; values: unknown[] }> = [];
  const sentEmails: Array<{ code: string; to: string }> = [];
  const service = new MfaService(
    {
      query: async (text: string, values: unknown[]) => {
        queries.push({ text, values });
        return { rows: [] };
      },
    } as never,
    {
      assertMfaConfigured: () => undefined,
      sendMfaLoginCodeEmail: async (input: { code: string; to: string }) => {
        sentEmails.push(input);
      },
    } as never,
    { get: () => 10 } as never,
  );

  await assert.rejects(
    () =>
      service.enforceLoginChallenge({
        userId: 'user-1',
        email: 'owner@example.test',
        displayName: 'System Owner',
        role: 'admin',
        permissions: ['users:write'],
        mfaEnabled: true,
        mfaCode: undefined,
        trustedDevice: false,
      }),
    /MFA challenge required/,
  );
  assert.equal(sentEmails.length, 1);
  assert.equal(sentEmails[0]?.to, 'owner@example.test');
  assert.match(sentEmails[0]?.code ?? '', /^\d{6}$/);
  assert.match(queries[0]?.text ?? '', /INSERT INTO auth_mfa_challenges/);
  assert.doesNotMatch(queries[0]?.text ?? '', /UPDATE auth_mfa_challenges/);
  assert.doesNotMatch(queries[0]?.text ?? '', /;\s*\S/);
  assert.notEqual(queries[0]?.values[1], sentEmails[0]?.code);
});

test('MfaService consumes a verified challenge before allowing high-privilege login', async () => {
  const queries: Array<{ text: string; values: unknown[] }> = [];
  const service = new MfaService(
    {
      query: async (text: string, values: unknown[]) => {
        queries.push({ text, values });
        return { rows: [{ verified: true }] };
      },
    } as never,
    {
      assertMfaConfigured: () => undefined,
      sendMfaLoginCodeEmail: async () => undefined,
    } as never,
    { get: () => 10 } as never,
  );

  const result = await service.enforceLoginChallenge({
    userId: 'user-1',
    email: 'owner@example.test',
    displayName: 'System Owner',
    role: 'platform_owner',
    permissions: ['*:*'],
    mfaEnabled: true,
    mfaCode: '123456',
    trustedDevice: false,
  });

  assert.equal(result.status, 'verified');
  assert.match(queries[0]?.text ?? '', /auth_mfa_challenges/);
  assert.equal(queries[0]?.values[0], 'user-1');
});

test('MfaService verifies MFA codes pasted with spaces or separators', async () => {
  const queries: Array<{ text: string; values: unknown[] }> = [];
  const service = new MfaService(
    {
      query: async (text: string, values: unknown[]) => {
        queries.push({ text, values });
        return { rows: [{ verified: true }] };
      },
    } as never,
    {
      assertMfaConfigured: () => undefined,
      sendMfaLoginCodeEmail: async () => undefined,
    } as never,
    { get: () => 10 } as never,
  );

  const result = await service.enforceLoginChallenge({
    userId: 'user-1',
    email: 'owner@example.test',
    displayName: 'System Owner',
    role: 'platform_owner',
    permissions: ['*:*'],
    mfaEnabled: true,
    mfaCode: '123 456',
    trustedDevice: false,
  });

  assert.equal(result.status, 'verified');
  assert.equal(
    queries[0]?.values[1],
    createHash('sha256').update('123456').digest('hex'),
  );
});
