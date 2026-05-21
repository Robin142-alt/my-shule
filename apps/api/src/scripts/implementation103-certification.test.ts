import assert from 'node:assert/strict';
import test from 'node:test';

import {
  renderImplementation103CertificationMarkdown,
  runImplementation103Certification,
} from './implementation103-certification';

test('Implementation 103 certification passes when IoT command delivery has operational evidence', () => {
  const result = runImplementation103Certification({
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
  assert.equal(result.modules[0]?.code, 'iot_command_delivery');
});

test('Implementation 103 certification fails without command polling evidence', () => {
  const result = runImplementation103Certification({
    workspaceRoot: '/',
    generatedAt: '2026-05-21T00:00:00.000Z',
    sourceOverrides: {
      'apps/api/src/modules/iot/iot-gateway.service.ts': 'ingestTelemetry',
    },
  });

  assert.equal(result.ok, false);
  assert.equal(
    result.modules[0]?.checks.some((check: { id: string; status: string }) =>
      check.id === 'iot_command_delivery-backend-service' && check.status === 'fail',
    ),
    true,
  );
});

test('Implementation 103 certification markdown names the command delivery gate', () => {
  const markdown = renderImplementation103CertificationMarkdown({
    generated_at: '2026-05-21T00:00:00.000Z',
    ok: true,
    module_count: 1,
    modules: [
      {
        code: 'iot_command_delivery',
        name: 'IoT Command Delivery',
        evidence_id: 'IMPLEMENTATION103-001-iot-command-delivery',
        status: 'pass',
        checks: [
          {
            id: 'iot_command_delivery-backend-service',
            label: 'IoT gateway delivers and acknowledges device commands',
            file: 'apps/api/src/modules/iot/iot-gateway.service.ts',
            status: 'pass',
          },
        ],
      },
    ],
  });

  assert.match(markdown, /Implementation 103 IoT command delivery no-half-working certification/);
  assert.match(markdown, /IoT Command Delivery/);
  assert.doesNotMatch(markdown, /SECRET|TOKEN|PASSWORD/i);
});
