import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

import * as dotenv from 'dotenv';

import {
  collectEnvValidationIssues,
  type EnvironmentValidationIssue,
} from '../config/env.validation';

export interface ProductionEnvAuditOptions {
  workspaceRoot?: string;
  env?: NodeJS.ProcessEnv;
  artifactPath?: string | false;
}

export interface ProductionEnvAuditResult {
  ok: boolean;
  generated_at: string;
  env_file_order: string[];
  loaded_files: string[];
  summary: {
    missing: number;
    invalid: number;
    total: number;
  };
  issues: EnvironmentValidationIssue[];
}

export const PRODUCTION_ENV_FILE_ORDER = [
  '.env.production.local',
  '.env.local',
  '.env.production',
  '.env',
];

const DEFAULT_ARTIFACT_PATH = 'docs/validation/production-env-audit.json';

export function runProductionEnvAudit(options: ProductionEnvAuditOptions = {}): ProductionEnvAuditResult {
  const workspaceRoot = options.workspaceRoot ?? process.cwd();
  const { env, loadedFiles } = loadProductionEnvForAudit(workspaceRoot, options.env ?? process.env);
  const report = collectEnvValidationIssues(env);
  const result: ProductionEnvAuditResult = {
    ok: report.ok,
    generated_at: new Date().toISOString(),
    env_file_order: [...PRODUCTION_ENV_FILE_ORDER],
    loaded_files: loadedFiles,
    summary: {
      missing: report.missing.length,
      invalid: report.invalid.length,
      total: report.issues.length,
    },
    issues: report.issues,
  };

  const artifactPath = options.artifactPath === undefined ? DEFAULT_ARTIFACT_PATH : options.artifactPath;

  if (artifactPath) {
    writeProductionEnvAuditArtifact(workspaceRoot, artifactPath, result);
  }

  return result;
}

export function loadProductionEnvForAudit(
  workspaceRoot: string,
  baseEnv: NodeJS.ProcessEnv,
): { env: Record<string, string>; loadedFiles: string[] } {
  const env: Record<string, string> = {};

  for (const [key, value] of Object.entries(baseEnv)) {
    if (typeof value === 'string') {
      env[key] = value;
    }
  }

  env.NODE_ENV = env.NODE_ENV || 'production';
  const originalKeys = new Set(Object.keys(env));
  const loadedFiles: string[] = [];

  for (const fileName of PRODUCTION_ENV_FILE_ORDER) {
    const filePath = resolve(workspaceRoot, fileName);

    if (!existsSync(filePath)) {
      continue;
    }

    loadedFiles.push(fileName);
    const parsed = dotenv.parse(readFileSync(filePath));

    for (const [key, value] of Object.entries(parsed)) {
      if (originalKeys.has(key) || Object.prototype.hasOwnProperty.call(env, key)) {
        continue;
      }

      env[key] = value;
    }
  }

  return { env, loadedFiles };
}

export function writeProductionEnvAuditArtifact(
  workspaceRoot: string,
  artifactPath: string,
  result: ProductionEnvAuditResult,
): void {
  const destination = resolve(workspaceRoot, artifactPath);
  mkdirSync(dirname(destination), { recursive: true });
  writeFileSync(destination, `${JSON.stringify(result, null, 2)}\n`);
}

async function main(): Promise<void> {
  const result = runProductionEnvAudit();

  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);

  if (!result.ok) {
    process.exitCode = 1;
  }
}

if (require.main === module) {
  void main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
