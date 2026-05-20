import assert from 'node:assert/strict';
import test from 'node:test';

import {
  renderPiiLeakCiScanMarkdown,
  runPiiLeakCiScan,
} from './pii-leak-ci-scan';

test('runPiiLeakCiScan fails raw PII in generated logs, API responses, and frontend fixtures', () => {
  const result = runPiiLeakCiScan({
    generatedAt: '2026-05-20T00:00:00.000Z',
    sourceOverrides: {
      'production-mpesa.log': 'callback matched payer Jane Parent phone 254712345678',
      'apps/api/test/fixtures/mpesa-response.json': '{"student":"ADM-001"}',
      'apps/web/tests/design/__snapshots__/layout.test.tsx.snap': 'parent name Mary Wanjiku',
      'docs/validation/implementation30-certification.md': 'masked phone 2547******78 and ADM-***',
    },
  });

  assert.equal(result.ok, false);
  assert.deepEqual(
    result.findings.map((finding) => finding.path).sort(),
    [
      'apps/api/test/fixtures/mpesa-response.json',
      'apps/web/tests/design/__snapshots__/layout.test.tsx.snap',
      'production-mpesa.log',
      'production-mpesa.log',
    ],
  );
  assert.deepEqual(result.coverage.map((item) => item.category).sort(), [
    'api_responses',
    'frontend_fixtures',
    'logs',
    'snapshots_exports',
  ]);
});

test('runPiiLeakCiScan passes when artifact evidence is masked', () => {
  const result = runPiiLeakCiScan({
    generatedAt: '2026-05-20T00:00:00.000Z',
    sourceOverrides: {
      'production-mpesa.log': 'callback matched payer J*** P*** phone 2547******78',
      'apps/api/test/fixtures/mpesa-response.json': '{"student":"ADM-***"}',
      'apps/web/tests/design/__snapshots__/layout.test.tsx.snap': 'parent name P***',
      'docs/validation/implementation30-certification.md': 'masked phone 2547******78 and ADM-***',
    },
  });

  assert.equal(result.ok, true);
  assert.equal(result.findings.length, 0);
  assert.match(renderPiiLeakCiScanMarkdown(result), /PII Leak CI Scan/);
});
