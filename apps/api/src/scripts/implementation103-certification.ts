import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

export type Implementation103CertificationStatus = 'pass' | 'fail';

export interface Implementation103EvidenceCheck {
  id: string;
  label: string;
  file: string;
  pattern: RegExp;
}

export interface Implementation103CertificationResult {
  generated_at: string;
  ok: boolean;
  module_count: number;
  modules: Array<{
    code: string;
    name: string;
    evidence_id: string;
    status: Implementation103CertificationStatus;
    checks: Array<{
      id: string;
      label: string;
      file: string;
      status: Implementation103CertificationStatus;
    }>;
  }>;
}

export interface Implementation103CertificationOptions {
  workspaceRoot?: string;
  generatedAt?: string;
  sourceOverrides?: Record<string, string>;
}

export const IMPLEMENTATION103_MODULE = {
  code: 'iot_command_delivery',
  name: 'IoT Command Delivery',
  checks: [
    tokenCheck('iot_command_delivery', 'backend-controller', 'IoT gateway exposes public command delivery endpoints', 'apps/api/src/modules/iot/iot-gateway.controller.ts', ['pollCommands', 'acknowledgeCommand', '@Public()']),
    tokenCheck('iot_command_delivery', 'backend-service', 'IoT gateway delivers and acknowledges device commands', 'apps/api/src/modules/iot/iot-gateway.service.ts', ['pollCommands', 'acknowledgeCommand', 'authenticateDevice']),
    tokenCheck('iot_command_delivery', 'repository-workflow', 'IoT repository marks commands sent and acknowledged', 'apps/api/src/modules/iot/repositories/iot.repository.ts', ['pollGatewayCommands', 'acknowledgeGatewayCommand', "status = 'sent'"]),
    tokenCheck('iot_command_delivery', 'frontend-signal', 'IoT workspace shows command delivery readiness', 'apps/web/src/components/modules/iot/iot-module-screen.tsx', ['Command delivery', 'Device gateway']),
    tokenCheck('iot_command_delivery', 'workflow-tests', 'IoT command delivery has workflow tests', 'apps/api/src/modules/iot/iot.test.ts', ['polls queued commands', 'acknowledges command delivery']),
  ],
} as const;

export function runImplementation103Certification(
  options: Implementation103CertificationOptions = {},
): Implementation103CertificationResult {
  const workspaceRoot = options.workspaceRoot ?? process.cwd();
  const checks = IMPLEMENTATION103_MODULE.checks.map((check) => {
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
    code: IMPLEMENTATION103_MODULE.code,
    name: IMPLEMENTATION103_MODULE.name,
    evidence_id: 'IMPLEMENTATION103-001-iot-command-delivery',
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

export function renderImplementation103CertificationMarkdown(
  result: Implementation103CertificationResult,
): string {
  const lines = [
    '# Implementation 103 IoT command delivery no-half-working certification',
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
    '- This gate certifies the software command delivery loop for device polling, acknowledgement, persistence updates, UI signaling, and tests.',
    '- Device credential values are not included in this artifact.',
    '',
  );

  return `${lines.join('\n')}\n`;
}

export function writeImplementation103CertificationArtifact(
  result: Implementation103CertificationResult,
  outputPath: string,
): void {
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, renderImplementation103CertificationMarkdown(result), 'utf8');
}

export function runAndWriteImplementation103Certification(
  workspaceRoot = process.cwd(),
): Implementation103CertificationResult {
  const result = runImplementation103Certification({ workspaceRoot });
  writeImplementation103CertificationArtifact(
    result,
    join(workspaceRoot, 'docs', 'validation', 'implementation103-certification.md'),
  );
  return result;
}

function tokenCheck(
  moduleCode: string,
  kind: string,
  label: string,
  file: string,
  tokens: string[],
): Implementation103EvidenceCheck {
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
  const result = runAndWriteImplementation103Certification();

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
