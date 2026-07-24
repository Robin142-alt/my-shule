import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

import { writeArtifactFileSync } from './artifact-writer';
import {
  runReleaseReadinessGate,
  type ReleaseReadinessGateOptions,
} from './release-readiness-gate';

export type ProductionScoreStatus = 'pass' | 'watch' | 'fail';

export interface ProductionScoreCategory {
  id: string;
  label: string;
  score: number;
  target: number;
  status: ProductionScoreStatus;
  evidence: string[];
  remediation: string;
}

export interface ProductionScorecard {
  generated_at: string;
  overall_score: number;
  target_score: number;
  status: ProductionScoreStatus;
  categories: ProductionScoreCategory[];
}

export interface ProductionScorecardOptions extends ReleaseReadinessGateOptions {
  generatedAt?: string;
  outputPath?: string;
  minimumScore?: number;
  providerCredentialSmokeResultSource?: string;
  productionEnvAuditSource?: string;
  productionAuthSmokeSource?: string;
  apiReadinessLiveSource?: string;
}

type PackageJsonLike = {
  scripts?: Record<string, string>;
};

const DEFAULT_TARGET_SCORE = 95;

export function generateProductionScorecard(
  options: ProductionScorecardOptions = {},
): ProductionScorecard {
  const workspaceRoot = options.workspaceRoot ?? process.cwd();
  const packageJson = readPackageJson(workspaceRoot, options.packageJsonSource);
  const scripts = packageJson.scripts ?? {};
  const gate = runReleaseReadinessGate({ ...options, workspaceRoot });
  const implementation10 = readOptionalFile(
    workspaceRoot,
    'implementation10.md',
    options.moduleReadinessSource,
  );
  const productionWorkflow = readOptionalFile(
    workspaceRoot,
    '.github/workflows/production-operability.yml',
    options.productionOperabilityWorkflowSource,
  );
  const providerSmokeSource = readOptionalFile(
    workspaceRoot,
    'apps/api/src/scripts/provider-credential-smoke.ts',
    options.providerCredentialSmokeTestSource,
  );
  const providerSmokeResultSource = readOptionalFile(
    workspaceRoot,
    'docs/validation/provider-credential-smoke-live.json',
    options.providerCredentialSmokeResultSource,
  );
  const providerSmokeResult = parseProviderSmokeResult(providerSmokeResultSource);
  const productionEnvAuditSource = readOptionalFile(
    workspaceRoot,
    'docs/validation/production-env-audit.json',
    options.productionEnvAuditSource,
  );
  const productionEnvAudit = parseProductionEnvAudit(productionEnvAuditSource);
  const productionAuthSmokeSource = readOptionalFile(
    workspaceRoot,
    'docs/validation/production-auth-smoke.json',
    options.productionAuthSmokeSource,
  );
  const productionAuthSmoke = parseProductionAuthSmoke(productionAuthSmokeSource);
  const apiReadinessLiveSource = readOptionalFile(
    workspaceRoot,
    'docs/validation/api-readiness-live-output.txt',
    options.apiReadinessLiveSource,
  );
  const apiReadinessLive = parseApiReadinessLive(apiReadinessLiveSource);
  const moduleReadiness = readOptionalFile(
    workspaceRoot,
    'apps/web/src/lib/features/module-readiness.ts',
    options.moduleReadinessSource,
  );
  const smsDispatchSource = readOptionalFile(
    workspaceRoot,
    'apps/api/src/modules/integrations/sms-dispatch.service.ts',
  );
  const supportNotificationSource = readOptionalFile(
    workspaceRoot,
    'apps/api/src/modules/support/support-notification-delivery.service.ts',
  );
  const implementation90LoadProfileSource = readOptionalFile(
    workspaceRoot,
    'apps/api/src/scripts/implementation90-load-profile.ts',
  );
  const implementation90ArchitectureSource = readOptionalFile(
    workspaceRoot,
    'docs/architecture/implementation90-scale-security-reliability.md',
  );
  const implementation90ScaleRunbookSource = readOptionalFile(
    workspaceRoot,
    'docs/runbooks/extreme-scale-incident.md',
  );
  const implementation90LockdownRunbookSource = readOptionalFile(
    workspaceRoot,
    'docs/runbooks/security-lockdown-mode.md',
  );
  const implementation90ObservabilitySource = readOptionalFile(
    workspaceRoot,
    'apps/api/src/modules/observability/production-observability.catalog.ts',
  );

  const categories: ProductionScoreCategory[] = [
    createCategory({
      id: 'release-readiness',
      label: 'Release readiness gate',
      score: gate.ok ? 96 : 70,
      target: 96,
      evidence: [
        gate.ok ? 'release readiness gate passes' : 'release readiness gate has failing checks',
        `${gate.checks.filter((check) => check.status === 'pass').length}/${gate.checks.length} checks passing`,
      ],
      remediation: 'Run npm run release:readiness and resolve every failing check before deployment.',
    }),
    createCategory({
      id: 'auth-session-ux',
      label: 'Authentication and session UX',
      score: scoreByEvidence([
        hasScript(scripts, 'auth:production-verify'),
        hasScript(scripts, 'auth:rotate-owner-password'),
        hasScript(scripts, 'test:auth-security'),
        hasScript(scripts, 'certify:pilot'),
        !/enter workspace code|workspace code required|tenant code required/i.test(implementation10),
      ], 84, 3),
      target: 95,
      evidence: [
        evidenceLine(hasScript(scripts, 'auth:production-verify'), 'production auth verification script exists'),
        evidenceLine(hasScript(scripts, 'auth:rotate-owner-password'), 'owner password rotation script exists'),
        evidenceLine(hasScript(scripts, 'test:auth-security'), 'auth security integration test script exists'),
        evidenceLine(hasScript(scripts, 'certify:pilot'), 'pilot certification script exists'),
        'login plan preserves email/password workspace auto-resolution',
      ],
      remediation: 'Complete authenticated pilot login, recovery, invite, and session-expiry certification.',
    }),
    createCategory({
      id: 'tenant-isolation',
      label: 'Tenant isolation',
      score: scoreByEvidence([
        hasScript(scripts, 'test:tenant-isolation'),
        hasScript(scripts, 'tenant:isolation:audit'),
        hasScript(scripts, 'security:scan'),
        hasScript(scripts, 'security:deps'),
        hasScript(scripts, 'test:api-consistency'),
        /tenant:isolation:audit/i.test(implementation10),
        /FORCE ROW LEVEL SECURITY/i.test(readOptionalFile(workspaceRoot, 'apps/api/src/modules/integrations/integrations-schema.service.ts')),
      ], 84, 2),
      target: 96,
      evidence: [
        evidenceLine(hasScript(scripts, 'test:tenant-isolation'), 'tenant isolation test script exists'),
        evidenceLine(hasScript(scripts, 'tenant:isolation:audit'), 'tenant isolation audit script exists'),
        evidenceLine(hasScript(scripts, 'security:scan'), 'security scan script exists'),
        evidenceLine(hasScript(scripts, 'security:deps'), 'dependency vulnerability scan script exists'),
        evidenceLine(hasScript(scripts, 'test:api-consistency'), 'API consistency test script exists'),
        evidenceLine(/tenant:isolation:audit/i.test(implementation10), 'implementation10 requires tenant isolation audit'),
      ],
      remediation: 'Add the tenant isolation audit runner and require it in CI for finance, support, library, discipline, reports, and files.',
    }),
    createCategory({
      id: 'finance-payments',
      label: 'Finance and payments',
      score: scoreByEvidence([
        hasScript(scripts, 'test:finance-integrity'),
        hasScript(scripts, 'test:financial-reconciliation'),
        hasScript(scripts, 'test:mpesa-adversarial'),
        hasScript(scripts, 'load:financial-truth'),
        hasScript(scripts, 'finance:certify'),
      ], 86, 2),
      target: 95,
      evidence: [
        evidenceLine(hasScript(scripts, 'test:finance-integrity'), 'finance integrity test script exists'),
        evidenceLine(hasScript(scripts, 'test:financial-reconciliation'), 'financial reconciliation test script exists'),
        evidenceLine(hasScript(scripts, 'test:mpesa-adversarial'), 'MPESA adversarial test script exists'),
        evidenceLine(hasScript(scripts, 'finance:certify'), 'finance certification script exists'),
      ],
      remediation: 'Run finance certification against real tenant workflows: cheque, MPESA callback, reversal, receipts, balances, and exports.',
    }),
    createCategory({
      id: 'support-operations',
      label: 'Support and operations',
      score: scoreByEvidence([
        /missing_provider/.test(supportNotificationSource),
        /missing_credentials/.test(supportNotificationSource),
        /SmsDispatchService/.test(supportNotificationSource),
        /support-notification-delivery.service.test/.test(JSON.stringify(scripts)),
      ], 88, 2),
      target: 95,
      evidence: [
        evidenceLine(/SmsDispatchService/.test(supportNotificationSource), 'support SMS uses dashboard-managed dispatch service'),
        evidenceLine(/missing_provider/.test(supportNotificationSource), 'support notification health reports precise missing provider state'),
        evidenceLine(/missing_credentials/.test(supportNotificationSource), 'support notification health reports precise missing credential state'),
      ],
      remediation: 'Wire support analytics and system status dashboards to live operational endpoints.',
    }),
    createCategory({
      id: 'provider-integrations',
      label: 'Provider integrations',
      score: scoreByEvidence([
        /class SmsDispatchService/.test(smsDispatchSource),
        hasScript(scripts, 'smoke:providers'),
        /live-email-provider/.test(providerSmokeSource),
        /api\.resend\.com\/domains|Resend.*sender domain/i.test(providerSmokeSource),
        /live-support-sms-provider/.test(providerSmokeSource),
        /live-upload-malware-scan-provider/.test(providerSmokeSource),
        /live-upload-object-storage/.test(providerSmokeSource),
        /live-redis-queue-cache/.test(providerSmokeSource),
      ], 82, 2),
      target: 94,
      evidence: [
        evidenceLine(/class SmsDispatchService/.test(smsDispatchSource), 'shared SMS dispatch service exists'),
        evidenceLine(hasScript(scripts, 'smoke:providers'), 'provider smoke script exists'),
        evidenceLine(/live-email-provider/.test(providerSmokeSource), 'transactional email live smoke coverage exists'),
        evidenceLine(/api\.resend\.com\/domains|Resend.*sender domain/i.test(providerSmokeSource), 'Resend sender-domain verification coverage exists'),
        evidenceLine(/live-upload-malware-scan-provider/.test(providerSmokeSource), 'malware scanner smoke coverage exists'),
        evidenceLine(/live-upload-object-storage/.test(providerSmokeSource), 'object storage smoke coverage exists'),
        evidenceLine(/live-redis-queue-cache/.test(providerSmokeSource), 'Redis queue/cache smoke coverage exists'),
      ],
      remediation: 'Configure live production secrets and require provider smoke evidence in the production operability workflow.',
    }),
    createCategory({
      id: 'live-provider-smoke',
      label: 'Live provider smoke',
      score: apiReadinessLive.providerOk
        ? 100
        : providerSmokeResult.exists
          ? providerSmokeResult.ok ? 100 : 68
        : 72,
      target: 100,
      evidence: [
        apiReadinessLive.providerOk
          ? 'live API readiness reports Redis, email, support notifications, object storage, and malware scanning configured'
          : providerSmokeResult.exists
          ? `live smoke artifact recorded ${providerSmokeResult.passed}/${providerSmokeResult.total} passing checks`
          : 'missing: live provider smoke artifact',
        apiReadinessLive.providerOk
          ? 'no live provider readiness failures recorded'
          : providerSmokeResult.failed > 0
          ? `failed live checks: ${providerSmokeResult.failedCheckIds.join(', ')}`
          : 'no failed live checks recorded',
      ],
      remediation: 'Run SUPPORT_PROVIDER_SMOKE_LIVE=true npm run smoke:providers and fix every failing live provider before go-live.',
    }),
    createCategory({
      id: 'production-env-audit',
      label: 'Production environment audit',
      score: apiReadinessLive.productionEnvOk
        ? 100
        : productionEnvAudit.exists
          ? productionEnvAudit.ok ? 100 : 68
        : 72,
      target: 100,
      evidence: [
        apiReadinessLive.productionEnvOk
          ? 'live API readiness reports production_env configured with 0 issues'
          : productionEnvAudit.exists
          ? `production env audit recorded ${productionEnvAudit.total} issue(s): ${productionEnvAudit.missing} missing, ${productionEnvAudit.invalid} invalid`
          : 'missing: production env audit artifact',
        apiReadinessLive.productionEnvOk
          ? 'no production env issues recorded in hosted runtime'
          : productionEnvAudit.issueMessages.length > 0
          ? `blocking env issues: ${productionEnvAudit.issueMessages.join(', ')}`
          : 'no production env issues recorded',
      ],
      remediation: 'Run npm run env:production:audit and fix every missing or invalid production runtime setting before deployment.',
    }),
    createCategory({
      id: 'hosted-production-auth-smoke',
      label: 'Hosted production auth smoke',
      score: productionAuthSmoke.exists
        ? productionAuthSmoke.ok ? 100 : 68
        : 72,
      target: 100,
      evidence: [
        productionAuthSmoke.exists
          ? `production auth smoke recorded ${productionAuthSmoke.passed}/${productionAuthSmoke.total} passing checks`
          : 'missing: production auth smoke artifact',
        productionAuthSmoke.errorMessage
          ? `blocking hosted auth issue: ${productionAuthSmoke.errorMessage}`
          : 'no hosted auth smoke failure recorded',
      ],
      remediation: 'Run npm run smoke:production-auth against the deployed web/API URLs and fix readiness, login, CSRF, proxy, and public status failures before go-live.',
    }),
    createCategory({
      id: 'frontend-ux',
      label: 'Frontend UX completeness',
      score: scoreByEvidence([
        hasScript(scripts, 'web:lint'),
        hasScript(scripts, 'web:build'),
        hasScript(scripts, 'web:test:design'),
        /attendance/.test(moduleReadiness) && /inactiveModules/.test(moduleReadiness),
      ], 82, 3),
      target: 93,
      evidence: [
        evidenceLine(hasScript(scripts, 'web:lint'), 'web lint script exists'),
        evidenceLine(hasScript(scripts, 'web:build'), 'web build script exists'),
        evidenceLine(hasScript(scripts, 'web:test:design'), 'design test script exists'),
        'attendance remains inactive in module readiness',
      ],
      remediation: 'Replace fallback telemetry with live states and run mobile journeys for login, parent, finance, library, support, and discipline.',
    }),
    createCategory({
      id: 'performance-scale',
      label: 'Performance and scale proof',
      score: scoreByEvidence([
        hasScript(scripts, 'load:tenant-scale'),
        hasScript(scripts, 'load:kenyan-school'),
        hasScript(scripts, 'perf:query-plan-review'),
        hasScript(scripts, 'load:core-api'),
      ], 82, 3),
      target: 94,
      evidence: [
        evidenceLine(hasScript(scripts, 'load:tenant-scale'), 'tenant-scale load script exists'),
        evidenceLine(hasScript(scripts, 'load:kenyan-school'), 'Kenyan school load script exists'),
        evidenceLine(hasScript(scripts, 'perf:query-plan-review'), 'query-plan review script exists'),
      ],
      remediation: 'Publish tenant-scale load artifacts and enforce query budgets in CI.',
    }),
    createCategory({
      id: 'implementation90-extreme-scale',
      label: 'Implementation 90 extreme scale and security',
      score: scoreByEvidence([
        hasScript(scripts, 'implementation90:load-profile'),
        /IMPLEMENTATION90_TRAFFIC_PROFILE/.test(implementation90LoadProfileSource),
        /validateImplementation90Budgets/.test(implementation90LoadProfileSource),
        /5000\+ users per second/i.test(implementation90ArchitectureSource),
        /breach-resistant/i.test(implementation90ArchitectureSource),
        /database saturation/i.test(implementation90ScaleRunbookSource),
        /Redis degradation/i.test(implementation90ScaleRunbookSource),
        /queue backlog/i.test(implementation90ScaleRunbookSource),
        /Rotate suspected secrets/i.test(implementation90LockdownRunbookSource),
        /Disable provider callbacks/i.test(implementation90LockdownRunbookSource),
        /implementation90-extreme-scale/.test(implementation90ObservabilitySource),
      ], 84, 1),
      target: 95,
      evidence: [
        evidenceLine(hasScript(scripts, 'implementation90:load-profile'), 'Implementation 90 load-profile script exists'),
        evidenceLine(/IMPLEMENTATION90_TRAFFIC_PROFILE/.test(implementation90LoadProfileSource), '5,000+ users/sec traffic profile exists'),
        evidenceLine(/validateImplementation90Budgets/.test(implementation90LoadProfileSource), 'release budget validator exists'),
        evidenceLine(/5000\+ users per second/i.test(implementation90ArchitectureSource), 'scale architecture is documented'),
        evidenceLine(/breach-resistant/i.test(implementation90ArchitectureSource), 'breach-resistant security model is documented'),
        evidenceLine(/database saturation/i.test(implementation90ScaleRunbookSource), 'extreme-scale runbook covers database saturation'),
        evidenceLine(/Redis degradation/i.test(implementation90ScaleRunbookSource), 'extreme-scale runbook covers Redis degradation'),
        evidenceLine(/queue backlog/i.test(implementation90ScaleRunbookSource), 'extreme-scale runbook covers queue backlog'),
        evidenceLine(/Rotate suspected secrets/i.test(implementation90LockdownRunbookSource), 'security lockdown runbook covers secret rotation'),
        evidenceLine(/Disable provider callbacks/i.test(implementation90LockdownRunbookSource), 'security lockdown runbook covers provider callback shutdown'),
        evidenceLine(/implementation90-extreme-scale/.test(implementation90ObservabilitySource), 'Implementation 90 observability dashboard exists'),
      ],
      remediation: 'Run the mixed 5,000+ users/sec profile against production-like infrastructure before raising public launch traffic.',
    }),
    createCategory({
      id: 'observability-recovery',
      label: 'Observability and recovery',
      score: scoreByEvidence([
        hasScript(scripts, 'monitor:synthetic'),
        hasScript(scripts, 'dr:backup-restore'),
        /production-operability/.test(productionWorkflow),
        /PROD_MONITOR_ACCESS_TOKEN/.test(productionWorkflow),
      ], 84, 3),
      target: 95,
      evidence: [
        evidenceLine(hasScript(scripts, 'monitor:synthetic'), 'synthetic monitor script exists'),
        evidenceLine(hasScript(scripts, 'dr:backup-restore'), 'backup restore script exists'),
        evidenceLine(/PROD_MONITOR_ACCESS_TOKEN/.test(productionWorkflow), 'production monitor token is referenced by workflow'),
      ],
      remediation: 'Store production monitoring, backup restore, provider smoke, and scorecard artifacts on every scheduled run.',
    }),
    createCategory({
      id: 'visual-brand-trust',
      label: 'Visual design and brand trust',
      score: scoreByEvidence([
        /Visual Identity Requirements/.test(implementation10),
        /emerald primary/.test(implementation10),
        /Login Page Meaning/.test(implementation10),
        /no demo credentials/i.test(implementation10),
      ], 78, 4),
      target: 94,
      evidence: [
        evidenceLine(/Visual Identity Requirements/.test(implementation10), 'visual identity requirements are documented'),
        evidenceLine(/Login Page Meaning/.test(implementation10), 'login purpose messaging is documented'),
        evidenceLine(/no demo credentials/i.test(implementation10), 'auth pages must remain credential-free'),
      ],
      remediation: 'Implement the visual identity pass and verify login pages at mobile and desktop widths.',
    }),
  ];

  const overallScore = Math.round(
    categories.reduce((total, category) => total + category.score, 0) / categories.length,
  );

  return {
    generated_at: options.generatedAt ?? new Date().toISOString(),
    overall_score: overallScore,
    target_score: DEFAULT_TARGET_SCORE,
    status: resolveStatus(overallScore, DEFAULT_TARGET_SCORE),
    categories,
  };
}

export function renderProductionScorecardMarkdown(scorecard: ProductionScorecard): string {
  const lines = [
    '# Production Readiness Scorecard',
    '',
    `Generated at: ${scorecard.generated_at}`,
    '',
    `Overall score: ${scorecard.overall_score}/${scorecard.target_score}`,
    '',
    `Status: ${scorecard.status}`,
    '',
    '| Area | Score | Target | Status | Evidence | Remediation |',
    '| --- | ---: | ---: | --- | --- | --- |',
  ];

  for (const category of scorecard.categories) {
    lines.push(
      `| ${escapeMarkdownTable(category.label)} | ${category.score} | ${category.target} | ${category.status} | ${escapeMarkdownTable(category.evidence.join('; '))} | ${escapeMarkdownTable(category.remediation)} |`,
    );
  }

  lines.push(
    '',
    '## Next Score-Lifting Actions',
    '',
    '1. Keep support SMS health tied to dashboard-managed platform SMS providers.',
    '2. Replace fallback operational telemetry with live API-backed dashboard states.',
    '3. Run authenticated pilot certification for school, finance, parent, library, support, discipline, and reporting workflows.',
    '4. Publish tenant-scale, provider-smoke, security, and backup-restore artifacts in CI.',
    '5. Complete the visual identity pass so login pages feel calm, trustworthy, and meaningful.',
    '6. Keep Implementation 90 load-profile evidence attached to every release readiness review.',
    '',
  );

  return `${lines.join('\n')}\n`;
}

export function writeProductionScorecard(
  scorecard: ProductionScorecard,
  outputPath: string,
): void {
  mkdirSync(dirname(outputPath), { recursive: true });
  writeArtifactFileSync(outputPath, renderProductionScorecardMarkdown(scorecard));
}

function createCategory(input: Omit<ProductionScoreCategory, 'status'>): ProductionScoreCategory {
  return {
    ...input,
    status: resolveStatus(input.score, input.target),
  };
}

function resolveStatus(score: number, target: number): ProductionScoreStatus {
  if (score >= target) {
    return 'pass';
  }

  if (score >= Math.max(target - 10, 80)) {
    return 'watch';
  }

  return 'fail';
}

function scoreByEvidence(
  checks: boolean[],
  baseScore: number,
  pointsPerCheck: number,
): number {
  return Math.min(99, baseScore + checks.filter(Boolean).length * pointsPerCheck);
}

function evidenceLine(passed: boolean, label: string): string {
  return `${passed ? 'present' : 'missing'}: ${label}`;
}

function parseProviderSmokeResult(source: string): {
  exists: boolean;
  ok: boolean;
  total: number;
  passed: number;
  failed: number;
  failedCheckIds: string[];
} {
  const normalizedSource = source.replace(/^\uFEFF/, '').trim();

  if (!normalizedSource) {
    return {
      exists: false,
      ok: false,
      total: 0,
      passed: 0,
      failed: 0,
      failedCheckIds: [],
    };
  }

  try {
    const payload = JSON.parse(normalizedSource) as {
      ok?: unknown;
      summary?: {
        total?: unknown;
        passed?: unknown;
        failed?: unknown;
      };
      checks?: Array<{
        id?: unknown;
        status?: unknown;
      }>;
    };
    const failedCheckIds = Array.isArray(payload.checks)
      ? payload.checks
        .filter((check) => check.status === 'fail')
        .map((check) => String(check.id ?? 'unknown-check'))
      : [];

    return {
      exists: true,
      ok: payload.ok === true,
      total: toSafeNumber(payload.summary?.total, Array.isArray(payload.checks) ? payload.checks.length : 0),
      passed: toSafeNumber(payload.summary?.passed, Array.isArray(payload.checks) ? payload.checks.filter((check) => check.status === 'pass').length : 0),
      failed: toSafeNumber(payload.summary?.failed, failedCheckIds.length),
      failedCheckIds,
    };
  } catch {
    return {
      exists: true,
      ok: false,
      total: 0,
      passed: 0,
      failed: 1,
      failedCheckIds: ['invalid-provider-smoke-artifact'],
    };
  }
}

function parseProductionEnvAudit(source: string): {
  exists: boolean;
  ok: boolean;
  total: number;
  missing: number;
  invalid: number;
  issueMessages: string[];
} {
  const normalizedSource = source.replace(/^\uFEFF/, '').trim();

  if (!normalizedSource) {
    return {
      exists: false,
      ok: false,
      total: 0,
      missing: 0,
      invalid: 0,
      issueMessages: [],
    };
  }

  try {
    const payload = JSON.parse(normalizedSource) as {
      ok?: unknown;
      summary?: {
        missing?: unknown;
        invalid?: unknown;
        total?: unknown;
      };
      issues?: Array<{
        message?: unknown;
      }>;
    };
    const issueMessages = Array.isArray(payload.issues)
      ? payload.issues.map((issue) => String(issue.message ?? 'unknown-env-issue'))
      : [];

    return {
      exists: true,
      ok: payload.ok === true,
      total: toSafeNumber(payload.summary?.total, issueMessages.length),
      missing: toSafeNumber(payload.summary?.missing, 0),
      invalid: toSafeNumber(payload.summary?.invalid, issueMessages.length),
      issueMessages,
    };
  } catch {
    return {
      exists: true,
      ok: false,
      total: 1,
      missing: 0,
      invalid: 1,
      issueMessages: ['invalid-production-env-audit-artifact'],
    };
  }
}

function parseApiReadinessLive(source: string): {
  exists: boolean;
  providerOk: boolean;
  productionEnvOk: boolean;
} {
  const normalizedSource = source.replace(/^\uFEFF/, '').trim();

  if (!normalizedSource) {
    return {
      exists: false,
      providerOk: false,
      productionEnvOk: false,
    };
  }

  try {
    const payload = JSON.parse(normalizedSource) as any;
    const body = payload.body ?? payload;
    const services = body?.services ?? {};
    const providerOk = body?.status === 'ok'
      && services.redis === 'up'
      && services.transactional_email === 'configured'
      && services.support_notifications === 'configured'
      && services.object_storage === 'configured'
      && services.malware_scanning === 'configured';
    const productionEnvOk = services.production_env === 'configured'
      && body?.production_env?.status === 'configured'
      && toSafeNumber(body.production_env.issue_count, 1) === 0;

    return {
      exists: true,
      providerOk,
      productionEnvOk,
    };
  } catch {
    return {
      exists: true,
      providerOk: false,
      productionEnvOk: false,
    };
  }
}

function parseProductionAuthSmoke(source: string): {
  exists: boolean;
  ok: boolean;
  total: number;
  passed: number;
  errorMessage: string;
} {
  const normalizedSource = source.replace(/^\uFEFF/, '').trim();

  if (!normalizedSource) {
    return {
      exists: false,
      ok: false,
      total: 0,
      passed: 0,
      errorMessage: '',
    };
  }

  try {
    const payload = JSON.parse(normalizedSource) as {
      ok?: unknown;
      summary?: {
        total?: unknown;
        passed?: unknown;
      };
      checks?: unknown[];
      error?: {
        message?: unknown;
      };
    };

    return {
      exists: true,
      ok: payload.ok === true,
      total: toSafeNumber(payload.summary?.total, Array.isArray(payload.checks) ? payload.checks.length : 0),
      passed: toSafeNumber(payload.summary?.passed, Array.isArray(payload.checks) ? payload.checks.length : 0),
      errorMessage: typeof payload.error?.message === 'string' ? payload.error.message : '',
    };
  } catch {
    return {
      exists: true,
      ok: false,
      total: 1,
      passed: 0,
      errorMessage: 'invalid-production-auth-smoke-artifact',
    };
  }
}

function toSafeNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function hasScript(scripts: Record<string, string>, name: string): boolean {
  return Boolean(scripts[name]);
}

function readPackageJson(workspaceRoot: string, packageJsonSource?: string): PackageJsonLike {
  const source = packageJsonSource ?? readFileSync(join(workspaceRoot, 'package.json'), 'utf8');
  return JSON.parse(source) as PackageJsonLike;
}

function readOptionalFile(
  workspaceRoot: string,
  relativePath: string,
  sourceOverride?: string,
): string {
  if (sourceOverride !== undefined) {
    return sourceOverride;
  }

  const path = join(workspaceRoot, relativePath);

  return existsSync(path) ? readFileSync(path, 'utf8') : '';
}

function escapeMarkdownTable(value: string): string {
  return value.replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
}

if (require.main === module) {
  const workspaceRoot = process.cwd();
  const outputPath = join(
    workspaceRoot,
    'docs',
    'scorecards',
    'production-readiness-scorecard.md',
  );
  const scorecard = generateProductionScorecard({ workspaceRoot });
  writeProductionScorecard(scorecard, outputPath);

  const minimumScore = Number(process.env.PRODUCTION_SCORECARD_MIN ?? DEFAULT_TARGET_SCORE);
  console.log(`Production scorecard written to ${outputPath}`);
  console.log(`Overall score: ${scorecard.overall_score}/${scorecard.target_score}`);

  if (Number.isFinite(minimumScore) && scorecard.overall_score < minimumScore) {
    process.exitCode = 1;
  }
}
