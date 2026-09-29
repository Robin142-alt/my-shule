import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import test from 'node:test';
import { resolveGatewayClientIp, resolveRequestClientIp } from './gateway-identity';
import { getClientIdentityHeaders } from '../../../web/src/lib/auth/client-identity';
import { RequestContextMiddleware } from '../middleware/request-context.middleware';
import { RequestContextService } from './request-context/request-context.service';
import type { Request as ExpressRequest, Response as ExpressResponse } from 'express';

const secret = 'test-only-gateway-key-with-at-least-32-bytes';
const now = 1_800_000_000_000;
function signed(ip = '203.0.113.7', timestamp = String(now)) {
  const agent = 'MyShule school browser';
  return {
    'user-agent': agent,
    'x-myshule-client-ip': ip,
    'x-myshule-client-time': timestamp,
    'x-myshule-client-signature': createHmac('sha256', secret)
      .update(JSON.stringify(['v1', ip, agent, timestamp])).digest('hex'),
    'x-forwarded-for': '198.51.100.20',
  };
}

test('verified gateway identity survives origin proxy header rewriting', () => {
  assert.equal(resolveGatewayClientIp({ headers: signed() }, secret, now), '203.0.113.7');
  assert.equal(resolveGatewayClientIp({ headers: signed('2001:db8::1') }, secret, now), '2001:db8::1');
});

test('unsigned requests retain the existing origin ingress path', () => {
  assert.equal(resolveGatewayClientIp({ headers: {} }, secret, now), null);
});

test('gateway identity rejects tampering, stale, duplicate and malformed metadata', () => {
  for (const headers of [
    { ...signed(), 'x-myshule-client-ip': '203.0.113.8' },
    { ...signed(), 'user-agent': 'Different browser' },
    { ...signed(), 'x-myshule-client-signature': 'a'.repeat(64) },
    { ...signed(), 'x-myshule-client-signature': 'not-hex' },
    { ...signed(), 'x-myshule-client-ip': ['203.0.113.7', '203.0.113.8'] },
    signed('not-an-ip'), signed('203.0.113.7', String(now - 60_001)),
    signed('203.0.113.7', String(now + 60_001)),
    { 'x-myshule-client-ip': '203.0.113.7' },
  ]) {
    assert.throws(() => resolveGatewayClientIp({ headers }, secret, now), /Invalid gateway identity/);
  }
  assert.throws(() => resolveGatewayClientIp({ headers: signed() }, '', now), /Invalid gateway identity/);
});

test('direct API clients use origin ingress identity, never unsigned Cloudflare metadata', () => {
  assert.equal(resolveRequestClientIp({ headers: {
    'x-forwarded-for': '198.51.100.20, 192.0.2.10', 'cf-connecting-ip': '203.0.113.99',
  }, ip: '192.0.2.10' }), '198.51.100.20');
  assert.equal(resolveRequestClientIp({ headers: { 'x-forwarded-for': 'invalid' }, ip: '192.0.2.10' }), '192.0.2.10');
  assert.equal(resolveRequestClientIp({ headers: { 'cf-connecting-ip': '203.0.113.99' } }), null);
});

test('web-signed identity reaches API request context without granting authentication or tenant access', (t) => {
  t.mock.method(Date, 'now', () => now);
  const originalRuntime = process.env.MYSHULE_RUNTIME;
  const originalSecret = process.env.GATEWAY_IDENTITY_SECRET;
  process.env.MYSHULE_RUNTIME = 'cloudflare';
  process.env.GATEWAY_IDENTITY_SECRET = secret;
  try {
    const headers = getClientIdentityHeaders(new Request('https://www.myshule.online/api/events/dashboard/stream', {
      headers: { 'cf-connecting-ip': '203.0.113.7', 'user-agent': 'School browser' },
    }));
    headers['x-forwarded-for'] = '198.51.100.20';
    const context = new RequestContextService();
    const middleware = new RequestContextMiddleware(context);
    let called = false;
    middleware.use({ headers, method: 'GET', url: '/events/dashboard/stream' } as ExpressRequest,
      { setHeader() {} } as unknown as ExpressResponse, () => {
        called = true;
        const state = context.requireStore();
        assert.equal(state.client_ip, '203.0.113.7');
        assert.equal(state.user_agent, 'School browser');
        assert.equal(state.is_authenticated, false);
        assert.equal(state.tenant_id, null);
        assert.deepEqual(state.permissions, []);
      });
    assert.equal(called, true);
    assert.equal(context.getStore(), undefined);
  } finally {
    if (originalRuntime === undefined) delete process.env.MYSHULE_RUNTIME;
    else process.env.MYSHULE_RUNTIME = originalRuntime;
    if (originalSecret === undefined) delete process.env.GATEWAY_IDENTITY_SECRET;
    else process.env.GATEWAY_IDENTITY_SECRET = originalSecret;
  }
});
