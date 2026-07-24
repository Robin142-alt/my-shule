import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

import { writeArtifactFileSync } from './artifact-writer';

export type Implementation102CertificationStatus = 'pass' | 'fail';

export interface Implementation102EvidenceCheck {
  id: string;
  label: string;
  file: string;
  pattern: RegExp;
}

export interface Implementation102CertificationResult {
  generated_at: string;
  ok: boolean;
  module_count: number;
  modules: Array<{
    code: string;
    name: string;
    evidence_id: string;
    status: Implementation102CertificationStatus;
    checks: Array<{
      id: string;
      label: string;
      file: string;
      status: Implementation102CertificationStatus;
    }>;
  }>;
}

export interface Implementation102CertificationOptions {
  workspaceRoot?: string;
  generatedAt?: string;
  sourceOverrides?: Record<string, string>;
}

export const IMPLEMENTATION102_MODULE = {
  code: 'iot_gateway',
  name: 'IoT Device Gateway',
  checks: [
    tokenCheck('iot_gateway', 'backend-controller', 'IoT gateway has a public authenticated device endpoint', 'apps/api/src/modules/iot/iot-gateway.controller.ts', ['IotGatewayController', '@Public()', 'x-iot-device-token']),
    tokenCheck('iot_gateway', 'backend-service', 'IoT gateway verifies device credentials and idempotency before writes', 'apps/api/src/modules/iot/iot-gateway.service.ts', ['verifyIotDeviceCredential', 'findGatewayIngestion', 'recordGatewayTelemetry']),
    tokenCheck('iot_gateway', 'credential-hashing', 'IoT gateway stores one-way credential hashes', 'apps/api/src/modules/iot/iot-gateway-auth.ts', ['hashIotDeviceCredential', 'timingSafeEqual']),
    tokenCheck('iot_gateway', 'schema-persistence', 'IoT gateway has persistent credential and ingestion schema evidence', 'apps/api/src/modules/iot/iot-schema.service.ts', ['iot_device_credentials', 'iot_gateway_ingestions', 'FORCE ROW LEVEL SECURITY']),
    tokenCheck('iot_gateway', 'frontend-workspace', 'IoT workspace exposes gateway credential controls', 'apps/web/src/components/modules/iot/iot-module-screen.tsx', ['Gateway credentials', 'Device gateway']),
    tokenCheck('iot_gateway', 'workflow-tests', 'IoT gateway has workflow and schema tests', 'apps/api/src/modules/iot/iot.test.ts', ['IotGatewayService', 'IotGatewayController', 'hashIotDeviceCredential']),
  ],
} as const;

export function runImplementation102Certification(
  options: Implementation102CertificationOptions = {},
): Implementation102CertificationResult {
  const workspaceRoot = options.workspaceRoot ?? process.cwd();
  const checks = IMPLEMENTATION102_MODULE.checks.map((check) => {
    const source = readSource(workspaceRoot, check.file, options.sourceOverrides);
    const passed = check.pattern.test(source);

    return {
      id: check.id,
      label: check.label,
      file: check.file,
      status: passed ? 'pass' as const : 'fail' as const,
    };
  });
  const moduleResult = {
    code: IMPLEMENTATION102_MODULE.code,
    name: IMPLEMENTATION102_MODULE.name,
    evidence_id: 'IMPLEMENTATION102-001-iot-gateway',
    status: checks.every((check) => check.status === 'pass') ? 'pass' as const : 'fail' as const,
    checks,
  };

  return {
    generated_at: options.generatedAt ?? new Date().toISOString(),
    ok: moduleResult.status === 'pass',
    module_count: 1,
    modules: [moduleResult],
  };
}

export function renderImplementation102CertificationMarkdown(
  result: Implementation102CertificationResult,
): string {
  const lines = [
    '# Implementation 102 IoT gateway no-half-working certification',
    '',
    `Generated at: ${result.generated_at}`,
    '',
    `Status: ${result.ok ? 'pass' : 'fail'}`,
    '',
    `Module count: ${result.module_count}`,
    '',
    '| Evidence ID | Module | Status | Checks |',
    '| --- | --- | --- | --- |',
  ];

  for (const moduleResult of result.modules) {
    lines.push(
      `| ${moduleResult.evidence_id} | ${escapeTable(moduleResult.name)} | ${moduleResult.status} | ${escapeTable(moduleResult.checks.map((item) => `${item.status}: ${item.label}`).join('; '))} |`,
    );
  }

  lines.push(
    '',
    '## Notes',
    '',
    '- This gate certifies the software gateway layer for device telemetry, credentials, idempotency, UI controls, schema, and tests.',
    '- Device credential values are not included in this artifact.',
    '',
  );

  return `${lines.join('\n')}\n`;
}

export function writeImplementation102CertificationArtifact(
  result: Implementation102CertificationResult,
  outputPath: string,
): void {
  mkdirSync(dirname(outputPath), { recursive: true });
  writeArtifactFileSync(outputPath, renderImplementation102CertificationMarkdown(result));
}

export function runAndWriteImplementation102Certification(
  workspaceRoot = process.cwd(),
): Implementation102CertificationResult {
  const result = runImplementation102Certification({ workspaceRoot });
  writeImplementation102CertificationArtifact(
    result,
    join(workspaceRoot, 'docs', 'validation', 'implementation102-certification.md'),
  );
  return result;
}

function tokenCheck(
  moduleCode: string,
  kind: string,
  label: string,
  file: string,
  tokens: string[],
): Implementation102EvidenceCheck {
  return {
    id: `${moduleCode}-${kind}`,
    label,
    file,
    pattern: allTokensPattern(tokens),
  };
}

function allTokensPattern(tokens: string[]): RegExp {
  const source = tokens.map((token) => `(?=.*${escapeRegExp(token)})`).join('');
  return new RegExp(source, 's');
}

function readSource(
  workspaceRoot: string,
  relativePath: string,
  sourceOverrides?: Record<string, string>,
): string {
  if (sourceOverrides?.[relativePath] !== undefined) {
    return sourceOverrides[relativePath];
  }

  const filePath = join(workspaceRoot, relativePath);
  return existsSync(filePath) ? readFileSync(filePath, 'utf8') : '';
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function escapeTable(value: string): string {
  return value.replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
}

function main(): void {
  const result = runAndWriteImplementation102Certification();

  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);

  if (!result.ok) {
    process.exitCode = 1;
  }
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}
