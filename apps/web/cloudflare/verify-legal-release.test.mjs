import assert from 'node:assert/strict';
import { test } from 'node:test';
import { verifyLegalRelease } from './verify-legal-release.mjs';

const expected = [{ id: 'terms-1.0', sha256: 'a'.repeat(64), generation: 1 }];
const response = (data, status = 200) => async () => Response.json({ data }, { status });
test('matching public legal metadata verifies without any user credentials', async () => {
  await verifyLegalRelease('https://api.example.test', expected, false, response({ documents: expected, dpa_active: false }));
});
test('old APIs, changed documents and unexpected DPA activation block deployment', async () => {
  for (const fetcher of [response({}, 404), response({ documents: [], dpa_active: false }), response({ documents: expected, dpa_active: true })]) {
    await assert.rejects(() => verifyLegalRelease('https://api.example.test', expected, false, fetcher));
  }
});
