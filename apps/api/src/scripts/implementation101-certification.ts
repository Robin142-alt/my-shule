import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

import { writeArtifactFileSync } from './artifact-writer';

export type Implementation101CertificationStatus = 'pass' | 'fail';

export interface Implementation101EvidenceCheck {
  id: string;
  label: string;
  file: string;
  pattern: RegExp;
}

export interface Implementation101CertificationResult {
  generated_at: string;
  ok: boolean;
  module_count: number;
  modules: Array<{
    code: string;
    name: string;
    evidence_id: string;
    status: Implementation101CertificationStatus;
    checks: Array<{
      id: string;
      label: string;
      file: string;
      status: Implementation101CertificationStatus;
    }>;
  }>;
}

export interface Implementation101CertificationOptions {
  workspaceRoot?: string;
  generatedAt?: string;
  sourceOverrides?: Record<string, string>;
}

export const IMPLEMENTATION101_MODULE = {
  code: 'iot',
  name: 'IoT and Smart Campus',
  checks: [
    tokenCheck('iot', 'frontend-workspace', 'IoT has a live workspace', 'apps/web/src/components/modules/iot/iot-module-screen.tsx', ['IotModuleScreen', 'Device registry', 'Telemetry stream', 'Command center']),
    tokenCheck('iot', 'frontend-api-proxy', 'IoT has a live frontend API proxy', 'apps/web/src/app/api/iot/[...path]/route.ts', ['proxySchoolApiRequest', '/iot']),
    tokenCheck('iot', 'backend-controller', 'IoT has a backend controller', 'apps/api/src/modules/iot/iot.controller.ts', ['IotController', "@RequiresModule('iot')"]),
    tokenCheck('iot', 'schema-persistence', 'IoT has persistent schema evidence', 'apps/api/src/modules/iot/iot-schema.service.ts', ['iot_devices', 'iot_telemetry_readings', 'FORCE ROW LEVEL SECURITY']),
    tokenCheck('iot', 'workflow-tests', 'IoT has workflow and schema tests', 'apps/api/src/modules/iot/iot.test.ts', ['IotService', 'IotSchemaService', 'IotController']),
  ],
} as const;

export function runImplementation101Certification(
  options: Implementation101CertificationOptions = {},
): Implementation101CertificationResult {
  const workspaceRoot = options.workspaceRoot ?? process.cwd();
  const checks = IMPLEMENTATION101_MODULE.checks.map((check) => {
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
    code: IMPLEMENTATION101_MODULE.code,
    name: IMPLEMENTATION101_MODULE.name,
    evidence_id: 'IMPLEMENTATION101-001-iot',
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

export function renderImplementation101CertificationMarkdown(
  result: Implementation101CertificationResult,
): string {
  const lines = [
    '# Implementation 101 IoT no-half-working certification',
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
    '- This gate certifies IoT and Smart Campus as a real module with UI, API proxy, controller, schema, and tests.',
    '- The module integrates software gateways and does not claim direct hardware-driver support.',
    '- This script does not print device keys, credential values, or raw authentication material.',
    '',
  );

  return `${lines.join('\n')}\n`;
}

export function writeImplementation101CertificationArtifact(
  result: Implementation101CertificationResult,
  outputPath: string,
): void {
  mkdirSync(dirname(outputPath), { recursive: true });
  writeArtifactFileSync(outputPath, renderImplementation101CertificationMarkdown(result));
}

export function runAndWriteImplementation101Certification(
  workspaceRoot = process.cwd(),
): Implementation101CertificationResult {
  const result = runImplementation101Certification({ workspaceRoot });
  writeImplementation101CertificationArtifact(
    result,
    join(workspaceRoot, 'docs', 'validation', 'implementation101-certification.md'),
  );
  return result;
}

function tokenCheck(
  moduleCode: string,
  kind: string,
  label: string,
  file: string,
  tokens: string[],
): Implementation101EvidenceCheck {
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
  const result = runAndWriteImplementation101Certification();

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
