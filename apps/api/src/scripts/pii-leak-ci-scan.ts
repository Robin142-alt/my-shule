import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';

import { DataClassificationRegistryService } from '../modules/security/data-classification-registry.service';
import {
  PiiLeakFinding,
  PiiLeakScannerService,
} from '../modules/security/pii-leak-scanner.service';

export type PiiLeakCiCategory =
  | 'logs'
  | 'snapshots_exports'
  | 'api_responses'
  | 'frontend_fixtures';

export interface PiiLeakCiScanOptions {
  workspaceRoot?: string;
  generatedAt?: string;
  sourceOverrides?: Record<string, string>;
}

export interface PiiLeakCiScanResult {
  generated_at: string;
  ok: boolean;
  coverage: Array<{
    category: PiiLeakCiCategory;
    files_scanned: number;
  }>;
  findings: PiiLeakFinding[];
}

interface CategorizedArtifact {
  category: PiiLeakCiCategory;
  path: string;
  content: string;
}

const CATEGORY_ORDER: PiiLeakCiCategory[] = [
  'logs',
  'snapshots_exports',
  'api_responses',
  'frontend_fixtures',
];

export function runPiiLeakCiScan(options: PiiLeakCiScanOptions = {}): PiiLeakCiScanResult {
  const workspaceRoot = options.workspaceRoot ?? process.cwd();
  const artifacts = loadArtifacts(workspaceRoot, options.sourceOverrides);
  const scanner = new PiiLeakScannerService(new DataClassificationRegistryService());
  const scanResult = scanner.scanArtifacts(
    artifacts.map((artifact) => ({
      path: artifact.path,
      content: artifact.content,
    })),
  );

  return {
    generated_at: options.generatedAt ?? new Date().toISOString(),
    ok: scanResult.ok,
    coverage: CATEGORY_ORDER.map((category) => ({
      category,
      files_scanned: artifacts.filter((artifact) => artifact.category === category).length,
    })),
    findings: scanResult.findings,
  };
}

export function renderPiiLeakCiScanMarkdown(result: PiiLeakCiScanResult): string {
  const lines = [
    '# PII Leak CI Scan',
    '',
    `Generated at: ${result.generated_at}`,
    '',
    `Status: ${result.ok ? 'pass' : 'fail'}`,
    '',
    '## Coverage',
    '',
    '| Category | Files Scanned |',
    '| --- | ---: |',
  ];

  for (const item of result.coverage) {
    lines.push(`| ${item.category} | ${item.files_scanned} |`);
  }

  lines.push('', '## Findings', '', '| Path | Detector | Classification | Excerpt |', '| --- | --- | --- | --- |');

  if (result.findings.length === 0) {
    lines.push('| none | none | none | none |');
  } else {
    for (const finding of result.findings) {
      lines.push(
        `| ${escapeTable(finding.path)} | ${escapeTable(finding.detector)} | ${escapeTable(finding.classification)} | ${escapeTable(finding.excerpt)} |`,
      );
    }
  }

  return `${lines.join('\n')}\n`;
}

export function writePiiLeakCiScanArtifact(result: PiiLeakCiScanResult, outputPath: string): void {
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, renderPiiLeakCiScanMarkdown(result), 'utf8');
}

function loadArtifacts(
  workspaceRoot: string,
  sourceOverrides?: Record<string, string>,
): CategorizedArtifact[] {
  const overrideEntries = Object.entries(sourceOverrides ?? {});

  if (overrideEntries.length > 0) {
    return overrideEntries.flatMap(([path, content]) => {
      const category = categorizePath(path);
      return category ? [{ category, path: normalizePath(path), content }] : [];
    });
  }

  return listCandidateFiles(workspaceRoot)
    .map((filePath) => {
      const relativePath = normalizePath(relative(workspaceRoot, filePath));
      const category = categorizePath(relativePath);

      if (!category) {
        return null;
      }

      return {
        category,
        path: relativePath,
        content: readFileSync(filePath, 'utf8'),
      };
    })
    .filter((artifact): artifact is CategorizedArtifact => artifact !== null);
}

function listCandidateFiles(workspaceRoot: string): string[] {
  const candidates = [
    ...listRootProductionArtifacts(workspaceRoot),
    ...listFilesIfExists(join(workspaceRoot, 'logs')),
    ...listFilesIfExists(join(workspaceRoot, 'docs', 'validation')),
    ...listFilesIfExists(join(workspaceRoot, 'docs', 'scorecards')),
    ...listFilesIfExists(join(workspaceRoot, 'docs', 'security')),
    ...listFilesIfExists(join(workspaceRoot, 'exports')),
    ...listFilesIfExists(join(workspaceRoot, 'apps', 'api', 'test', 'fixtures')),
    ...listFilesIfExists(join(workspaceRoot, 'apps', 'web', 'tests')),
  ];

  return candidates.filter((filePath) => /\.(?:json|md|txt|log|snap|html|csv)$/i.test(filePath));
}

function listRootProductionArtifacts(workspaceRoot: string): string[] {
  return readdirSync(workspaceRoot, { withFileTypes: true })
    .filter((entry) => entry.isFile() && /^production-.*\.(?:json|txt|log)$/i.test(entry.name))
    .map((entry) => join(workspaceRoot, entry.name));
}

function listFilesIfExists(directory: string): string[] {
  if (!existsSync(directory)) {
    return [];
  }

  const files: string[] = [];

  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const entryPath = join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...listFilesIfExists(entryPath));
      continue;
    }

    if (entry.isFile()) {
      files.push(entryPath);
    }
  }

  return files;
}

function categorizePath(path: string): PiiLeakCiCategory | null {
  const normalized = normalizePath(path);

  if (/^production-.*\.(?:json|txt|log)$/i.test(normalized) || /^logs\/.*\.(?:json|txt|log)$/i.test(normalized)) {
    return 'logs';
  }

  if (/^docs\/(?:validation|scorecards|security)\//.test(normalized) || /^exports\//.test(normalized)) {
    return 'snapshots_exports';
  }

  if (/^apps\/api\/test\/fixtures\//.test(normalized) || /api[-_]?response/i.test(normalized)) {
    return 'api_responses';
  }

  if (/^apps\/web\/tests\/.*(?:__snapshots__|fixtures?|test-results)/.test(normalized)) {
    return 'frontend_fixtures';
  }

  return null;
}

function normalizePath(path: string): string {
  return path.replaceAll(sep, '/').replace(/\\/g, '/');
}

function escapeTable(value: string): string {
  return value.replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
}

if (require.main === module) {
  const workspaceRoot = process.cwd();
  const result = runPiiLeakCiScan({ workspaceRoot });
  const outputPath = join(workspaceRoot, 'docs', 'security', 'pii-leak-ci-scan.md');
  writePiiLeakCiScanArtifact(result, outputPath);

  console.log(`PII leak CI scan artifact written to ${outputPath}`);
  console.log(`PII leak CI scan status: ${result.ok ? 'pass' : 'fail'}`);

  if (!result.ok) {
    process.exitCode = 1;
  }
}
