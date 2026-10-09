import assert from 'node:assert/strict';

const base = process.env.CLOUDFLARE_SMOKE_URL ?? 'http://127.0.0.1:8787';
const origin = new URL(base).origin;
async function read(path, init = {}) {
  const response = await fetch(new URL(path, origin), {
    ...init, redirect: 'manual', signal: AbortSignal.timeout(30_000),
  });
  return response;
}

// Test the actual compiled Worker and its asset bindings, never `next start`.
const homepage = await read('/');
assert.equal(homepage.status, 200, 'homepage');
const html = await homepage.text();
assert.match(html, /MyShule/);
const asset = html.match(/(?:src|href)="([^" ]*\/_next\/static\/[^" ]+\.js)"/)?.[1];
assert.ok(asset, 'homepage references a built JavaScript asset');
const bundle = await read(asset);
assert.equal(bundle.status, 200, 'immutable bundle');
assert.match(bundle.headers.get('cache-control') ?? '', /immutable/);
await bundle.body?.cancel();

for (const path of ['/school/login', '/portal/login', '/superadmin/login', '/offline']) {
  const response = await read(path);
  assert.equal(response.status, 200, path);
  assert.match(response.headers.get('content-type') ?? '', /text\/html/);
  await response.body?.cancel();
}

for (const path of ['/legal/accept', '/legal/documents/privacy-1.0', '/legal/documents/terms-1.0']) {
  const response = await read(path);
  assert.equal(response.status, 200, path);
  assert.match(response.headers.get('content-type') ?? '', /text\/html/);
  await response.body?.cancel();
}
for (const [path, target] of [['/privacy', 'privacy-1.0'], ['/terms', 'terms-1.0']]) {
  const response = await read(path);
  assert.ok([307, 308].includes(response.status), `public legal alias ${path}`);
  assert.ok(response.headers.get('location')?.endsWith(`/legal/documents/${target}`));
  await response.body?.cancel();
}
const legalPdf = await read('/legal-assets/MyShule_School_DPA_Contract_v2.0.pdf');
assert.equal(legalPdf.status, 200, 'original legal PDF');
assert.match(legalPdf.headers.get('content-type') ?? '', /application\/pdf/);
await legalPdf.body?.cancel();

const manifest = await read('/manifest.webmanifest');
assert.equal(manifest.status, 200);
const pwa = await manifest.json();
assert.match(pwa.name, /MyShule/);
assert.ok(pwa.start_url);
const serviceWorker = await read('/service-worker.js');
assert.equal(serviceWorker.status, 200);
assert.match(serviceWorker.headers.get('content-type') ?? '', /javascript/);
assert.match(serviceWorker.headers.get('cache-control') ?? '', /no-store/);
assert.equal(serviceWorker.headers.get('service-worker-allowed'), '/');
await serviceWorker.body?.cancel();

for (const path of ['/opengraph-image', '/_next/image?url=%2Fbrand%2Fmyshule-mark-512.png&w=128&q=75']) {
  const response = await read(path);
  assert.equal(response.status, 200, path);
  assert.match(response.headers.get('content-type') ?? '', /^image\//);
  assert.ok((await response.arrayBuffer()).byteLength > 100, 'image bytes');
}

const csrf = await read('/api/auth/csrf');
assert.equal(csrf.status, 200);
assert.match(csrf.headers.get('cache-control') ?? '', /private.*no-store/);
assert.match(csrf.headers.get('set-cookie') ?? '', /HttpOnly/i);
await csrf.body?.cancel();

for (const path of ['/api/permissions/me', '/api/reports/files', '/api/events/dashboard/stream', '/api/legal/status']) {
  const response = await read(path, { headers: {
    'x-forwarded-host': 'forged-school.myshule.online',
    'x-tenant-id': 'forged-school',
    'x-tenant-slug': 'forged-school',
  } });
  assert.equal(response.status, 401, `unsigned tenant cannot access ${path}`);
  assert.match(response.headers.get('cache-control') ?? '', /private.*no-store/);
  assert.equal(response.headers.get('cloudflare-cdn-cache-control'), 'no-store');
  await response.body?.cancel();
}
const rejectedMutation = await read('/api/auth/login', {
  method: 'POST', headers: { 'content-type': 'application/json', origin: 'https://attacker.invalid' }, body: '{}',
});
assert.equal(rejectedMutation.status, 403, 'cross-origin mutation blocked before authentication');
await rejectedMutation.body?.cancel();

console.log(`Cloudflare runtime smoke passed: pages, assets, images, PWA, CSRF, unsigned tenant/API protection (${origin}).`);
