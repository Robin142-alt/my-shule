import assert from 'node:assert/strict';
import test from 'node:test';

import {
  renderImplementation101CertificationMarkdown,
  runImplementation101Certification,
} from './implementation101-certification';

test('Implementation 101 certification passes when IoT has operational evidence', () => {
  const result = runImplementation101Certification({
    workspaceRoot: process.cwd(),
    generatedAt: '2026-05-21T00:00:00.000Z',
  });

  assert.equal(result.ok, true);
  assert.equal(result.module_count, 1);
  assert.equal(result.modules[0]?.code, 'iot');
  assert.equal(result.modules[0]?.status, 'pass');
});

test('Implementation 101 certification fails when the IoT frontend proxy is missing', () => {
  const result = runImplementation101Certification({
    workspaceRoot: process.cwd(),
    sourceOverrides: {
      'apps/web/src/app/api/iot/[...path]/route.ts': '',
    },
  });

  assert.equal(result.ok, false);
  assert.equal(
    result.modules[0]?.checks.find((check: { id: string }) => check.id === 'iot-frontend-api-proxy')?.status,
    'fail',
  );
});

test('Implementation 101 certification markdown names the IoT no-half-working gate', () => {
  const markdown = renderImplementation101CertificationMarkdown({
    generated_at: '2026-05-21T00:00:00.000Z',
    ok: true,
    module_count: 1,
    modules: [
      {
        code: 'iot',
        name: 'IoT and Smart Campus',
        evidence_id: 'IMPLEMENTATION101-001-iot',
        status: 'pass',
        checks: [
          {
            id: 'iot-frontend-workspace',
            label: 'IoT has a live workspace',
            file: 'apps/web/src/components/modules/iot/iot-module-screen.tsx',
            status: 'pass',
          },
        ],
      },
    ],
  });

  assert.match(markdown, /Implementation 101 IoT no-half-working certification/);
  assert.doesNotMatch(markdown, /SECRET|TOKEN|PASSWORD/i);
});
