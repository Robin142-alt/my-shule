import assert from 'node:assert/strict';
import { test } from 'node:test';
import { normalizeIngress, protectResponse } from './ingress.mjs';

test('routing uses the requested hostname and discards forged tenant/proxy context', () => {
  const request = normalizeIngress(new Request('https://www.myshule.online/api/auth/refresh', {
    headers: { 'x-forwarded-host': 'other.myshule.online', 'x-forwarded-proto': 'http',
      'x-forwarded-for': '198.51.100.99', 'x-tenant-slug': 'other',
      'x-platform-experience': 'superadmin', 'cf-connecting-ip': '203.0.113.12',
      cookie: 'myshule_refresh=opaque', 'user-agent': 'School browser' },
  }));
  assert.equal(request.headers.get('x-forwarded-host'), 'www.myshule.online');
  assert.equal(request.headers.get('x-forwarded-proto'), 'https');
  assert.equal(request.headers.get('x-forwarded-for'), null);
  assert.equal(request.headers.get('x-tenant-slug'), null);
  assert.equal(request.headers.get('x-platform-experience'), null);
  assert.equal(request.headers.get('cf-connecting-ip'), '203.0.113.12');
  assert.equal(request.headers.get('cookie'), 'myshule_refresh=opaque');
});

test('API, authenticated, RSC and Set-Cookie responses never enter shared caches', () => {
  for (const [path, requestHeaders, responseHeaders] of [
    ['/api/auth/csrf', {}, {}], ['/school/teacher', {cookie:'myshule_access=opaque'}, {}],
    ['/', {rsc:'1'}, {}], ['/', {}, {'set-cookie':'myshule.csrf=random; Secure'}],
  ]) {
    const request = new Request(`https://www.myshule.online${path}`, {headers:requestHeaders});
    const response = protectResponse(request, new Response('private', {headers:{'cache-control':'public, s-maxage=3600', ...responseHeaders}}));
    assert.equal(response.headers.get('cache-control'), 'private, no-store, no-transform');
    assert.equal(response.headers.get('cdn-cache-control'), 'no-store');
    assert.equal(response.headers.get('cloudflare-cdn-cache-control'), 'no-store');
  }
});

test('streams remain unbuffered and retain cookies, disposition and status', async () => {
  const upstream = new Response(new ReadableStream({start(c){c.enqueue(new TextEncoder().encode('data: event\n\n'));c.close();}}), {
    status:206, headers:{'content-type':'text/event-stream','set-cookie':'session=opaque; HttpOnly', 'content-disposition':'attachment; filename=report.pdf'},
  });
  const result = protectResponse(new Request('https://www.myshule.online/api/reports/download'), upstream);
  assert.equal(result.body, upstream.body);
  assert.equal(result.status,206);
  assert.equal(result.headers.get('set-cookie'),'session=opaque; HttpOnly');
  assert.equal(result.headers.get('content-disposition'),'attachment; filename=report.pdf');
  assert.equal(await result.text(),'data: event\n\n');
});
