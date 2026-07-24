import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

import { writeArtifactFileSync } from './artifact-writer';
import {
  BLUEPRINT_SECTIONS,
  IMPLEMENTATION300_MODULES,
  IMPLEMENTATION300_ROLES,
  INSTITUTION_CATEGORIES,
  KENYAN_INTEGRATIONS,
  SCALE_TARGETS,
  type BlueprintEvidence,
} from '../modules/implementation300/blueprint-registry';

export type Implementation300CertificationStatus = 'pass' | 'fail';

export type Implementation300CertificationOptions = {
  workspaceRoot?: string;
  generatedAt?: string;
  sourceOverrides?: Record<string, string>;
};

export type Implementation300EvidenceResult = {
  id: string;
  label: string;
  file: string;
  status: Implementation300CertificationStatus;
};

export type Implementation300CertificationResult = {
  generated_at: string;
  ok: boolean;
  section_count: number;
  module_count: number;
  institution_categories: readonly string[];
  roles: readonly string[];
  integrations: readonly string[];
  scale_targets: typeof SCALE_TARGETS;
  sections: Array<{
    id: string;
    title: string;
    status: Implementation300CertificationStatus;
    checks: Implementation300EvidenceResult[];
  }>;
  modules: Array<{
    code: string;
    name: string;
    status: Implementation300CertificationStatus;
    checks: Implementation300EvidenceResult[];
  }>;
};

export function runImplementation300Certification(
  options: Implementation300CertificationOptions = {},
): Implementation300CertificationResult {
  const workspaceRoot = options.workspaceRoot ?? process.cwd();
  const sections = BLUEPRINT_SECTIONS.map((definition) => {
    const checks = definition.evidence.map((item) =>
      evaluateEvidence(workspaceRoot, item, options.sourceOverrides),
    );

    return {
      id: definition.id,
      title: definition.title,
      status: checks.every((check) => check.status === 'pass') ? 'pass' as const : 'fail' as const,
      checks,
    };
  });
  const modules = IMPLEMENTATION300_MODULES.map((definition) => {
    const checks = definition.evidence.map((item) =>
      evaluateEvidence(workspaceRoot, item, options.sourceOverrides),
    );

    return {
      code: definition.code,
      name: definition.name,
      status: checks.every((check) => check.status === 'pass') ? 'pass' as const : 'fail' as const,
      checks,
    };
  });

  return {
    generated_at: options.generatedAt ?? new Date().toISOString(),
    ok: sections.every((section) => section.status === 'pass') &&
      modules.every((moduleResult) => moduleResult.status === 'pass'),
    section_count: BLUEPRINT_SECTIONS.length,
    module_count: IMPLEMENTATION300_MODULES.length,
    institution_categories: INSTITUTION_CATEGORIES,
    roles: IMPLEMENTATION300_ROLES,
    integrations: KENYAN_INTEGRATIONS,
    scale_targets: SCALE_TARGETS,
    sections,
    modules,
  };
}

export function renderImplementation300CertificationMarkdown(
  result: Implementation300CertificationResult,
): string {
  const lines = [
    '# Implementation 300 Blueprint Compliance Certification',
    '',
    `Generated at: ${result.generated_at}`,
    '',
    `Status: ${result.ok ? 'pass' : 'fail'}`,
    '',
    `Institution categories: ${result.institution_categories.join(', ')}`,
    `Roles covered: ${result.roles.length}`,
    `Kenyan integrations: ${result.integrations.join(', ')}`,
    `Scale target: ${result.scale_targets.minimumSchools}+ schools; ${result.scale_targets.concurrencyProfile}`,
    '',
    '## Blueprint Sections',
    '',
    '| Section | Status | Checks |',
    '| --- | --- | --- |',
    ...result.sections.map((section) =>
      `| ${escapeTable(section.title)} | ${section.status} | ${escapeTable(section.checks.map((check) => `${check.status}: ${check.label}`).join('; '))} |`,
    ),
    '',
    '## Modules',
    '',
    '| Module | Status | Checks |',
    '| --- | --- | --- |',
    ...result.modules.map((moduleResult) =>
      `| ${escapeTable(moduleResult.name)} | ${moduleResult.status} | ${escapeTable(moduleResult.checks.map((check) => `${check.status}: ${check.label}`).join('; '))} |`,
    ),
    '',
    '## Gate Rule',
    '',
    'Implementation 300 passes only when every blueprint section and every canonical school module has source evidence.',
    '',
  ];

  return `${lines.join('\n')}\n`;
}

export function writeImplementation300CertificationArtifact(
  result: Implementation300CertificationResult,
  outputPath: string,
): void {
  mkdirSync(dirname(outputPath), { recursive: true });
  writeArtifactFileSync(outputPath, renderImplementation300CertificationMarkdown(result));
}

export function runAndWriteImplementation300Certification(
  workspaceRoot = process.cwd(),
): Implementation300CertificationResult {
  const result = runImplementation300Certification({ workspaceRoot });
  writeImplementation300CertificationArtifact(
    result,
    join(workspaceRoot, 'docs', 'validation', 'implementation300-certification.md'),
  );
  return result;
}

function evaluateEvidence(
  workspaceRoot: string,
  evidence: BlueprintEvidence,
  sourceOverrides: Record<string, string> = {},
): Implementation300EvidenceResult {
  const source = readSource(workspaceRoot, evidence.file, sourceOverrides);
  const status = evidence.tokens.every((token) => source.includes(token)) ? 'pass' : 'fail';

  return {
    id: evidence.id,
    label: evidence.label,
    file: evidence.file,
    status,
  };
}

function readSource(
  workspaceRoot: string,
  file: string,
  sourceOverrides: Record<string, string>,
): string {
  if (Object.prototype.hasOwnProperty.call(sourceOverrides, file)) {
    return sourceOverrides[file];
  }

  const sourcePath = join(workspaceRoot, file);
  return existsSync(sourcePath) ? readFileSync(sourcePath, 'utf8') : '';
}

function escapeTable(value: string): string {
  return value.replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
}

if (require.main === module) {
  const result = runAndWriteImplementation300Certification();
  if (!result.ok) {
    process.exitCode = 1;
  }
}
