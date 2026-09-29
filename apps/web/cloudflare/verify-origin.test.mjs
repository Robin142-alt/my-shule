import assert from 'node:assert/strict';
import test from 'node:test';
import { verifyOriginIdentity } from './verify-origin.mjs';

const secret = 'test-only-gateway-key-with-at-least-32-bytes';
const ok = () => Response.json({ status: 'ok' });
const denied = () => Response.json({ message: 'Invalid gateway identity' }, { status: 401 });

test('deployment accepts only a compatible origin with matching key', async () => {
  const calls = [];
  await verifyOriginIdentity('https://api.example.test', secret, async (url, init) => {
    calls.push({ url: String(url), ...init });
    return calls.length === 1 ? ok() : denied();
  });
  assert.equal(calls.length, 2);
  assert.equal(calls[0].url, 'https://api.example.test/health');
  assert.equal(calls[0].redirect, 'error');
  assert.match(calls[0].headers['x-myshule-client-signature'], /^[a-f0-9]{64}$/);
  assert.equal(calls[1].headers['x-myshule-client-signature'], 'invalid');
});

test('deployment blocks older origins that silently ignore signatures', async () => {
  await assert.rejects(verifyOriginIdentity('https://api.example.test', secret, async () => ok()),
    /must reject forged identity/);
});

test('deployment blocks mismatched or missing keys', async () => {
  await assert.rejects(verifyOriginIdentity('https://api.example.test', secret, async () => denied()),
    /must accept correctly signed identity/);
  await assert.rejects(verifyOriginIdentity('https://api.example.test', '', async () => ok()),
    /Missing gateway identity/);
});
