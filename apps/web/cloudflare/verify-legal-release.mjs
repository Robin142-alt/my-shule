import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';

export async function verifyLegalRelease(baseUrl, expected, dpaActive, fetcher = fetch) {
  const response = await fetcher(new URL('/legal/release', baseUrl), {
    cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(15_000),
  });
  assert.equal(response.status, 200, 'Legal API must be available before the website release');
  const body = await response.json();
  const release = body.data ?? body;
  assert.equal(release.dpa_active, dpaActive, 'DPA activation must match the approved release');
  assert.deepEqual(release.documents, expected, 'API and website must use the same exact legal versions');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { LEGAL_DOCUMENTS } = await import('../../../shared/legal/documents.ts');
  const { isDpaActive } = await import('../../../shared/legal/release.ts');
  const base = process.env.SERVER_API_BASE_URL;
  assert.ok(base && new URL(base).protocol === 'https:', 'Set an HTTPS API origin');
  const expected = LEGAL_DOCUMENTS.map(({ id, sha256, generation }) => ({ id, sha256, generation }));
  let verified = false;
  for (let attempt = 1; attempt <= 30; attempt++) {
    try {
      await verifyLegalRelease(base, expected, isDpaActive());
      verified = true;
      console.log('API legal versions and DPA activation match this website release.');
      break;
    } catch {
      console.log(`Waiting for compatible legal API (${attempt}/30).`);
      if (attempt < 30) await new Promise(resolve => setTimeout(resolve, 10_000));
    }
  }
  assert.ok(verified, 'Legal API compatibility failed; Worker deployment blocked');
}
