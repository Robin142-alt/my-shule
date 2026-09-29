/** @jest-environment node */
import { createHmac } from 'node:crypto';
import { getClientIdentityHeaders } from '../../src/lib/auth/client-identity';

const original = process.env;
afterEach(() => { process.env = original; jest.restoreAllMocks(); });

test('Cloudflare signs platform-supplied browser identity for the origin', () => {
  process.env = { ...original, MYSHULE_RUNTIME: 'cloudflare', GATEWAY_IDENTITY_SECRET: 'test-only-gateway-key-with-at-least-32-bytes' };
  jest.spyOn(Date, 'now').mockReturnValue(1_800_000_000_000);
  const headers = getClientIdentityHeaders(new Request('https://app.example/school/login', { headers: {
    'cf-connecting-ip': '203.0.113.7', 'user-agent': 'School browser',
    'x-forwarded-for': '198.51.100.99', 'x-myshule-client-ip': '198.51.100.99',
    'x-myshule-client-signature': 'forged',
  } }));
  expect(headers['x-myshule-client-ip']).toBe('203.0.113.7');
  expect(headers['x-myshule-client-time']).toBe('1800000000000');
  expect(headers['x-myshule-client-signature']).toBe(createHmac('sha256', process.env.GATEWAY_IDENTITY_SECRET!)
    .update(JSON.stringify(['v1', '203.0.113.7', 'School browser', '1800000000000'])).digest('hex'));
});

test('other runtimes never sign caller-supplied Cloudflare metadata', () => {
  process.env = { ...original, MYSHULE_RUNTIME: 'local', GATEWAY_IDENTITY_SECRET: 'test-only-gateway-key-with-at-least-32-bytes' };
  expect(getClientIdentityHeaders(new Request('https://app.example', { headers: {
    'cf-connecting-ip': '203.0.113.7', 'user-agent': 'School browser',
  } }))).toEqual({ 'user-agent': 'School browser' });
});

test.each(['bad-ip', '203.0.113.7, 198.51.100.2', ''])('does not sign malformed platform address %s', (ip) => {
  process.env = { ...original, MYSHULE_RUNTIME: 'cloudflare', GATEWAY_IDENTITY_SECRET: 'test-only-gateway-key-with-at-least-32-bytes' };
  expect(getClientIdentityHeaders(new Request('https://app.example', { headers: {
    'cf-connecting-ip': ip, 'user-agent': 'School browser',
  } }))).toEqual({ 'user-agent': 'School browser' });
});

test.each(['', 'short'])('rejects a missing or short signing key (%s)', (secret) => {
  process.env = { ...original, MYSHULE_RUNTIME: 'cloudflare', GATEWAY_IDENTITY_SECRET: secret };
  expect(() => getClientIdentityHeaders(new Request('https://app.example', {
    headers: { 'cf-connecting-ip': '203.0.113.7' },
  }))).toThrow('Gateway identity secret must have at least 32 characters');
});
