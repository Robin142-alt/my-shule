import assert from 'node:assert/strict';
import test from 'node:test';

import {
  renderImplementation102CertificationMarkdown,
  runImplementation102Certification,
} from './implementation102-certification';

test('Implementation 102 certification passes when IoT gateway has operational evidence', () => {
  const result = runImplementation102Certification({
    workspaceRoot: process.cwd(),
    generatedAt: '2026-05-21T00:00:00.000Z',
  });

  assert.equal(
    result.ok,
    true,
    result.modules
      .flatMap((moduleResult: { code: string; checks: Array<{ id: string; file: string; status: string }> }) =>
        moduleResult.checks
          .filter((check: { status: string }) => check.status === 'fail')
          .map((check: { id: string; file: string }) => `${moduleResult.code}:${check.id}:${check.file}`),
      )
      .join(', '),
  );
  assert.equal(result.module_count, 1);
  assert.equal(result.modules[0]?.code, 'iot_gateway');
});

test('Implementation 102 certification fails without gateway credential schema evidence', () => {
  const result = runImplementation102Certification({
    workspaceRoot: '/',
    generatedAt: '2026-05-21T00:00:00.000Z',
    sourceOverrides: {
      'apps/api/src/modules/iot/iot-schema.service.ts': 'CREATE TABLE IF NOT EXISTS iot_devices',
    },
  });

  assert.equal(result.ok, false);
  assert.equal(
    result.modules[0]?.checks.some((check: { id: string; status: string }) =>
      check.id === 'iot_gateway-schema-persistence' && check.status === 'fail',
    ),
    true,
  );
});

test('Implementation 102 certification markdown names the IoT gateway gate', () => {
  const markdown = renderImplementation102CertificationMarkdown({
    generated_at: '2026-05-21T00:00:00.000Z',
    ok: true,
    module_count: 1,
    modules: [
      {
        code: 'iot_gateway',
        name: 'IoT Device Gateway',
        evidence_id: 'IMPLEMENTATION102-001-iot-gateway',
        status: 'pass',
        checks: [
          {
            id: 'iot_gateway-backend-controller',
            label: 'IoT gateway has a public authenticated device endpoint',
            file: 'apps/api/src/modules/iot/iot-gateway.controller.ts',
            status: 'pass',
          },
        ],
      },
    ],
  });

  assert.match(markdown, /Implementation 102 IoT gateway no-half-working certification/);
  assert.match(markdown, /IoT Device Gateway/);
  assert.doesNotMatch(markdown, /SECRET|TOKEN|PASSWORD/i);
});
