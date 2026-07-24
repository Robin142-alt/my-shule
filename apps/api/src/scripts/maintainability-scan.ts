import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

import { writeArtifactFileSync } from './artifact-writer';

export type MaintainabilityCheckStatus = 'pass' | 'fail';

export interface MaintainabilityCheck {
  id: string;
  label: string;
  status: MaintainabilityCheckStatus;
  details: string[];
}

export interface MaintainabilityScanResult {
  generated_at: string;
  ok: boolean;
  checks: MaintainabilityCheck[];
}

export interface MaintainabilityScanOptions {
  workspaceRoot?: string;
  generatedAt?: string;
  sourceOverrides?: Record<string, string>;
}

const HUMAN_IDENTIFIER_WORKFLOW_FILES = [
  'apps/web/src/components/school/school-pages.tsx',
  'apps/web/src/components/discipline/discipline-workspace.tsx',
  'apps/web/src/components/library/library-workspace.tsx',
] as const;

const INTERNAL_ID_COPY =
  /Student UUID|Invoice UUID|Student record ID|Class record ID|Academic term ID|Academic year ID|Scan student ID|Student ID or admission barcode/i;

export function runMaintainabilityScan(
  options: MaintainabilityScanOptions = {},
): MaintainabilityScanResult {
  const workspaceRoot = options.workspaceRoot ?? process.cwd();
  const checks = [
    checkNoInternalIdCopy(workspaceRoot, options.sourceOverrides),
    checkPublicStatusTruth(workspaceRoot, options.sourceOverrides),
    checkGeneratedArtifactHygiene(workspaceRoot, options.sourceOverrides),
    checkImplementation90ArchitectureRunbooks(workspaceRoot, options.sourceOverrides),
    checkImplementation90ReleaseGates(workspaceRoot, options.sourceOverrides),
  ];

  return {
    generated_at: options.generatedAt ?? new Date().toISOString(),
    ok: checks.every((check) => check.status === 'pass'),
    checks,
  };
}

export function renderMaintainabilityScanMarkdown(result: MaintainabilityScanResult): string {
  const lines = [
    '# Implementation 11 Maintainability Scan',
    '',
    `Generated at: ${result.generated_at}`,
    '',
    `Status: ${result.ok ? 'pass' : 'fail'}`,
    '',
    '| Check | Status | Details |',
    '| --- | --- | --- |',
  ];

  for (const check of result.checks) {
    lines.push(`| ${check.label} | ${check.status} | ${check.details.join('; ') || 'clear'} |`);
  }

  return `${lines.join('\n')}\n`;
}

export function writeMaintainabilityScanArtifact(
  result: MaintainabilityScanResult,
  outputPath: string,
): void {
  mkdirSync(dirname(outputPath), { recursive: true });
  writeArtifactFileSync(outputPath, renderMaintainabilityScanMarkdown(result));
}

function checkNoInternalIdCopy(
  workspaceRoot: string,
  sourceOverrides?: Record<string, string>,
): MaintainabilityCheck {
  const details = HUMAN_IDENTIFIER_WORKFLOW_FILES.flatMap((relativePath) => {
    const source = readSource(workspaceRoot, relativePath, sourceOverrides);
    return INTERNAL_ID_COPY.test(source)
      ? [`${relativePath} exposes internal record IDs instead of name/admission-number lookup.`]
      : [];
  });

  return buildCheck('no-internal-id-copy', 'Production forms avoid internal UUID copy.', details);
}

function checkPublicStatusTruth(
  workspaceRoot: string,
  sourceOverrides?: Record<string, string>,
): MaintainabilityCheck {
  const relativePath = 'apps/web/src/app/support/status/page.tsx';
  const source = readSource(workspaceRoot, relativePath, sourceOverrides);
  const details = /uptime:\s*["']N\/A["']|latency:\s*["']N\/A["']/.test(source)
    ? [`${relativePath} uses N/A telemetry in the public status fallback.`]
    : [];

  return buildCheck('public-status-truth', 'Public status fallback is explicit and diagnostic.', details);
}

function checkGeneratedArtifactHygiene(
  workspaceRoot: string,
  sourceOverrides?: Record<string, string>,
): MaintainabilityCheck {
  const source = readSource(workspaceRoot, '.gitignore', sourceOverrides);
  const details = source.includes('apps/web/test-results/')
    ? []
    : ['.gitignore must ignore apps/web/test-results/ generated browser artifacts.'];

  return buildCheck('generated-artifact-hygiene', 'Generated browser artifacts are ignored.', details);
}

function checkImplementation90ArchitectureRunbooks(
  workspaceRoot: string,
  sourceOverrides?: Record<string, string>,
): MaintainabilityCheck {
  const architecture = readSource(
    workspaceRoot,
    'docs/architecture/implementation90-scale-security-reliability.md',
    sourceOverrides,
  );
  const scaleRunbook = readSource(
    workspaceRoot,
    'docs/runbooks/extreme-scale-incident.md',
    sourceOverrides,
  );
  const lockdownRunbook = readSource(
    workspaceRoot,
    'docs/runbooks/security-lockdown-mode.md',
    sourceOverrides,
  );
  const details: string[] = [];

  if (!/5000\+ users per second/i.test(architecture) || !/breach-resistant/i.test(architecture)) {
    details.push('docs/architecture/implementation90-scale-security-reliability.md must document 5000+ users per second and breach-resistant architecture.');
  }

  if (!/database saturation/i.test(scaleRunbook) || !/Redis degradation/i.test(scaleRunbook) || !/queue backlog/i.test(scaleRunbook)) {
    details.push('docs/runbooks/extreme-scale-incident.md must cover database saturation, Redis degradation, and queue backlog.');
  }

  if (!/Rotate suspected secrets/i.test(lockdownRunbook) || !/Disable provider callbacks/i.test(lockdownRunbook) || !/Preserve audit logs/i.test(lockdownRunbook)) {
    details.push('docs/runbooks/security-lockdown-mode.md must cover secret rotation, provider callback shutdown, and audit preservation.');
  }

  return buildCheck(
    'implementation90-architecture-runbooks',
    'Implementation 90 architecture and runbooks are maintained.',
    details,
  );
}

function checkImplementation90ReleaseGates(
  workspaceRoot: string,
  sourceOverrides?: Record<string, string>,
): MaintainabilityCheck {
  const loadProfile = readSource(
    workspaceRoot,
    'apps/api/src/scripts/implementation90-load-profile.ts',
    sourceOverrides,
  );
  const packageJson = readSource(workspaceRoot, 'package.json', sourceOverrides);
  const productionEnv = readSource(workspaceRoot, '.env.production.example', sourceOverrides);
  const details: string[] = [];

  if (!/IMPLEMENTATION90_TRAFFIC_PROFILE/.test(loadProfile) || !/validateImplementation90Budgets/.test(loadProfile)) {
    details.push('apps/api/src/scripts/implementation90-load-profile.ts must define the load profile and release budget validator.');
  }

  if (!/implementation90:load-profile/.test(packageJson) || !/npm run implementation90:load-profile/.test(packageJson)) {
    details.push('package.json must expose the implementation90:load-profile package-script and include it in CI.');
  }

  if (
    !/implementation90:full-release-gate/.test(packageJson)
    || !/npm run perf:query-plan-review/.test(packageJson)
    || !/npm run test:chaos/.test(packageJson)
    || !/npm run test:gameday/.test(packageJson)
    || !/npm run release:readiness/.test(packageJson)
  ) {
    details.push('package.json must expose the implementation90:full-release-gate package-script with query-plan, chaos, gameday, and readiness checks.');
  }

  if (!/IMPLEMENTATION90_TARGET_USERS_PER_SECOND=5000/.test(productionEnv) || !/SECURITY_LOCKDOWN_BYPASS_SECRET/.test(productionEnv)) {
    details.push('.env.production.example must document every production env variable required for Implementation 90.');
  }

  return buildCheck(
    'implementation90-release-gates',
    'Implementation 90 load profile, package-script, and production env variable gates exist.',
    details,
  );
}

function buildCheck(id: string, label: string, details: string[]): MaintainabilityCheck {
  return {
    id,
    label,
    status: details.length === 0 ? 'pass' : 'fail',
    details,
  };
}

function readSource(
  workspaceRoot: string,
  relativePath: string,
  sourceOverrides?: Record<string, string>,
): string {
  if (sourceOverrides?.[relativePath] !== undefined) {
    return sourceOverrides[relativePath];
  }

  const absolutePath = join(workspaceRoot, relativePath);
  return existsSync(absolutePath) ? readFileSync(absolutePath, 'utf8') : '';
}

function main(): void {
  const result = runMaintainabilityScan();
  const outputPath = join(process.cwd(), 'docs', 'validation', 'implementation11-maintainability-scan.md');

  writeMaintainabilityScanArtifact(result, outputPath);
  process.stdout.write(`Maintainability scan artifact written to ${outputPath}\n`);
  process.stdout.write(`Maintainability scan status: ${result.ok ? 'pass' : 'fail'}\n`);

  if (!result.ok) {
    process.exitCode = 1;
  }
}

if (require.main === module) {
  main();
}
