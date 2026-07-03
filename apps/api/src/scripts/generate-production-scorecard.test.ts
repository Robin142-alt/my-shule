import assert from 'node:assert/strict';
import test from 'node:test';

import {
  generateProductionScorecard,
  renderProductionScorecardMarkdown,
} from './generate-production-scorecard';

const passingModuleReadinessSource = `
  const productionReadyModules = new Set([
    "dashboard",
    "students",
    "admissions",
    "inventory",
    "exams",
    "settings",
  ]);
  const inactiveModules = new Set([
    "attendance",
    "academics",
    "communication",
    "reports",
    "staff",
    "timetable",
  ]);
`;

const passingPackageJsonSource = JSON.stringify({
  scripts: {
    test: 'node --test dist/apps/api/src/scripts/generate-production-scorecard.test.js dist/apps/api/src/scripts/release-readiness-gate.test.js',
    'web:lint': 'npm --prefix apps/web run lint',
    'web:build': 'npm --prefix apps/web run build',
    'web:test:design': 'npm --prefix apps/web run test:design',
    'auth:production-verify': 'node apps/api/src/scripts/verify-production-auth-cleanup.ts',
    'auth:rotate-owner-password': 'node apps/api/src/scripts/rotate-platform-owner-password.ts',
    'test:auth-security': 'jest apps/api/test/auth-security.integration-spec.ts',
    'certify:pilot': 'node apps/api/src/scripts/run-pilot-certification.ts',
    'test:tenant-isolation': 'jest apps/api/test/tenant-isolation.integration-spec.ts',
    'tenant:isolation:audit': 'node apps/api/src/scripts/tenant-isolation-audit.ts',
    'security:scan': 'node apps/api/src/scripts/security-scan.ts',
    'security:deps': 'npm audit --omit=dev --audit-level=high',
    'finance:certify': 'node apps/api/src/scripts/certify-finance.ts',
    'library:certify': 'node apps/api/src/scripts/certify-library.ts',
    'discipline:certify': 'node apps/api/src/scripts/certify-discipline.ts',
    'test:api-consistency': 'jest apps/api/test/api-consistency.integration-spec.ts',
    'test:finance-integrity': 'jest apps/api/test/finance-integrity.integration-spec.ts',
    'test:financial-reconciliation': 'jest apps/api/test/financial-reconciliation.integration-spec.ts',
    'test:mpesa-adversarial': 'jest apps/api/test/mpesa-adversarial.integration-spec.ts',
    'load:financial-truth': 'node apps/api/test/financial-truth-load.ts',
    'smoke:providers': 'node apps/api/src/scripts/provider-credential-smoke.ts',
    'env:production:audit': 'node apps/api/src/scripts/production-env-audit.ts',
    'load:tenant-scale': 'node apps/api/test/tenant-scale.load.ts',
    'load:kenyan-school': 'node apps/api/test/kenyan-school-load.ts',
    'perf:query-plan-review': 'node apps/api/src/scripts/query-plan-review.ts',
    'load:core-api': 'node apps/api/src/scripts/core-api-load.ts',
    'implementation90:load-profile': 'node apps/api/src/scripts/implementation90-load-profile.ts',
    'monitor:synthetic': 'node apps/api/src/scripts/synthetic-journey-monitor.ts',
    'dr:backup-restore': 'npm run test:backup-integrity && npm run test:disaster-recovery',
    'ops:incident-drill': 'node apps/api/src/scripts/incident-drill.ts',
    'scorecard:production': 'node apps/api/src/scripts/generate-production-scorecard.ts',
    'audit:coverage-review': 'node apps/api/src/scripts/audit-coverage-review.ts',
    'fixture:pilot-school': 'node apps/api/src/scripts/generate-pilot-school-fixture.ts',
    'load:high-volume-workflows': 'node apps/api/src/scripts/high-volume-workflow-load.ts',
    'release:readiness': 'node dist/apps/api/src/scripts/release-readiness-gate.js',
    'monitor:create-service-account': 'node apps/api/src/scripts/create-monitoring-service-account.ts',
    'build:sms-relay': 'npm --prefix apps/sms-relay run build',
    'test:sms-relay': 'npm --prefix apps/sms-relay run test',
    'build:malware-scanner': 'npm --prefix apps/malware-scanner run build',
    'test:malware-scanner': 'npm --prefix apps/malware-scanner run test',
    'test:backup-integrity': 'jest apps/api/test/backup-integrity.integration-spec.ts',
    'test:disaster-recovery': 'jest apps/api/test/disaster-recovery.integration-spec.ts',
  },
});

const passingIncidentRunbookSource = `
  Check GET /health/ready.
  Check GET /support/public/system-status.
  Review public status subscriptions and status notification attempts.
  Run npm run smoke:providers.
  Run npm run load:high-volume-workflows.
  Review support notification dead-letter.
  Review SLA breach alerts.
  Communicate impact and rollback when unsafe.
  Confirm Exams scope.
  Attendance is retired.
`;

const passingDisasterRecoveryRunbookSource = `
  Run test:backup-integrity, test:disaster-recovery, dr:backup-restore, fixture:pilot-school, and load:high-volume-workflows.
  Verify full schema restore, tenant-scoped restore, point-in-time restore, RTO, RPO, sandbox schemas, tenant digests, and checksum_sha256.
  Never restore over production.
  Exams is included. Attendance is retired.
`;

const passingProviderSmokeSource = `
  SUPPORT_PROVIDER_SMOKE_REQUIRE_SMS
  live-email-provider
  api.resend.com/domains
  live-support-sms-provider
  live-upload-malware-scan-provider
  UPLOAD_MALWARE_SCAN_HEALTH_URL
  live-upload-object-storage
  delete_checked
  live-redis-queue-cache
`;

const passingProductionWorkflowSource = `
  name: production-operability
  steps:
    - run: npm run monitor:synthetic
    - run: npm run load:core-api
    - run: npm run smoke:providers
    - run: npm run env:production:audit
    - run: npm run smoke:production-auth
    - run: npm run perf:query-plan-review
    - run: npm run release:readiness
    - run: npm run scorecard:production
    - run: npm run certify:pilot
    - run: npm run finance:certify
    - run: npm run library:certify
    - run: npm run discipline:certify
    - run: npm run tenant:isolation:audit
    - run: npm run security:scan
    - run: npm run security:deps
    - run: npm run dr:backup-restore > production-backup-restore.txt
    - run: npm run ops:incident-drill -- --dry-run > production-incident-drill.json
  env:
    PROD_MONITOR_ACCESS_TOKEN: secret
`;

const passingMonitoringRunbookSource = 'Rotate monitor token with monitor:create-service-account.';
const passingPilotChecklistSource = 'Platform owner creates school.';
const passingImplementation7Source = 'Live SMS provider smoke. Live object storage smoke. Real pilot school workflow checklist.';
const passingProviderSmokeResultSource = JSON.stringify({
  ok: true,
  summary: {
    total: 11,
    passed: 11,
    failed: 0,
    skipped: 0,
  },
  checks: [],
});
const passingProductionEnvAuditSource = JSON.stringify({
  ok: true,
  summary: {
    missing: 0,
    invalid: 0,
    total: 0,
  },
  issues: [],
});
const passingProductionAuthSmokeSource = JSON.stringify({
  ok: true,
  summary: {
    total: 6,
    passed: 6,
    failed: 0,
  },
  checks: [
    'API readiness',
    'school accepted-invite login page',
    'parent accepted-invite login page',
    'web CSRF endpoint',
    'web auth proxy',
    'public system status',
  ],
});
const passingApiReadinessLiveSource = JSON.stringify({
  status: 200,
  body: {
    status: 'ok',
    services: {
      postgres: 'up',
      redis: 'up',
      bullmq: 'configured',
      transactional_email: 'configured',
      cors: 'configured',
      production_env: 'configured',
      support_notifications: 'configured',
      object_storage: 'configured',
      malware_scanning: 'configured',
    },
    production_env: {
      status: 'configured',
      issue_count: 0,
    },
  },
});

test('generateProductionScorecard produces an audit-safe scorecard with implementation10 categories', () => {
  const scorecard = generateProductionScorecard({
    generatedAt: '2026-05-16T00:00:00.000Z',
    moduleReadinessSource: passingModuleReadinessSource,
    packageJsonSource: passingPackageJsonSource,
    incidentRunbookSource: passingIncidentRunbookSource,
    disasterRecoveryRunbookSource: passingDisasterRecoveryRunbookSource,
    providerCredentialSmokeTestSource: passingProviderSmokeSource,
    providerCredentialSmokeResultSource: passingProviderSmokeResultSource,
    productionEnvAuditSource: passingProductionEnvAuditSource,
    productionAuthSmokeSource: passingProductionAuthSmokeSource,
    apiReadinessLiveSource: passingApiReadinessLiveSource,
    productionOperabilityWorkflowSource: passingProductionWorkflowSource,
    productionMonitoringRunbookSource: passingMonitoringRunbookSource,
    pilotWorkflowChecklistSource: passingPilotChecklistSource,
    implementation7LiveValidationSource: passingImplementation7Source,
  });

  assert.equal(scorecard.generated_at, '2026-05-16T00:00:00.000Z');
  assert.equal(scorecard.categories.some((category) => category.id === 'provider-integrations'), true);
  assert.equal(scorecard.categories.some((category) => category.id === 'production-env-audit'), true);
  assert.equal(scorecard.categories.some((category) => category.id === 'hosted-production-auth-smoke'), true);
  assert.equal(scorecard.categories.some((category) => category.id === 'implementation90-extreme-scale'), true);
  assert.equal(scorecard.categories.some((category) => category.id === 'visual-brand-trust'), true);
  assert.equal(scorecard.overall_score >= 90, true);
  assert.equal(JSON.stringify(scorecard).includes('live-api-key-secret'), false);
  assert.equal(JSON.stringify(scorecard).includes('re_secret'), false);
});

test('renderProductionScorecardMarkdown renders category evidence for CI artifacts', () => {
  const scorecard = generateProductionScorecard({
    generatedAt: '2026-05-16T00:00:00.000Z',
    moduleReadinessSource: passingModuleReadinessSource,
    packageJsonSource: passingPackageJsonSource,
    incidentRunbookSource: passingIncidentRunbookSource,
    disasterRecoveryRunbookSource: passingDisasterRecoveryRunbookSource,
    providerCredentialSmokeTestSource: passingProviderSmokeSource,
    providerCredentialSmokeResultSource: passingProviderSmokeResultSource,
    productionEnvAuditSource: passingProductionEnvAuditSource,
    productionAuthSmokeSource: passingProductionAuthSmokeSource,
    apiReadinessLiveSource: passingApiReadinessLiveSource,
    productionOperabilityWorkflowSource: passingProductionWorkflowSource,
    productionMonitoringRunbookSource: passingMonitoringRunbookSource,
    pilotWorkflowChecklistSource: passingPilotChecklistSource,
    implementation7LiveValidationSource: passingImplementation7Source,
  });

  const markdown = renderProductionScorecardMarkdown(scorecard);

  assert.match(markdown, /Production Readiness Scorecard/);
  assert.match(markdown, /Support and operations/);
  assert.match(markdown, /Implementation 90 extreme scale and security/);
  assert.match(markdown, /Visual design and brand trust/);
  assert.equal(markdown.includes('| Area | Score | Target | Status | Evidence | Remediation |'), true);
});

test('generateProductionScorecard marks failed live provider smoke artifact as launch risk', () => {
  const scorecard = generateProductionScorecard({
    generatedAt: '2026-05-16T00:00:00.000Z',
    moduleReadinessSource: passingModuleReadinessSource,
    packageJsonSource: passingPackageJsonSource,
    incidentRunbookSource: passingIncidentRunbookSource,
    disasterRecoveryRunbookSource: passingDisasterRecoveryRunbookSource,
    providerCredentialSmokeTestSource: passingProviderSmokeSource,
    productionAuthSmokeSource: passingProductionAuthSmokeSource,
    providerCredentialSmokeResultSource: `\uFEFF${JSON.stringify({
      ok: false,
      summary: {
        total: 11,
        passed: 6,
        failed: 3,
        skipped: 2,
      },
      checks: [
        { id: 'live-email-provider', status: 'fail' },
        { id: 'live-upload-object-storage', status: 'fail' },
        { id: 'live-redis-queue-cache', status: 'fail' },
      ],
    })}`,
    apiReadinessLiveSource: '',
    productionOperabilityWorkflowSource: passingProductionWorkflowSource,
    productionMonitoringRunbookSource: passingMonitoringRunbookSource,
    pilotWorkflowChecklistSource: passingPilotChecklistSource,
    implementation7LiveValidationSource: passingImplementation7Source,
  });

  const liveProviderCategory = scorecard.categories.find((category) => category.id === 'live-provider-smoke');

  assert.equal(liveProviderCategory?.status, 'fail');
  assert.match(liveProviderCategory?.evidence.join(' ') ?? '', /6\/11 passing checks/);
  assert.match(liveProviderCategory?.evidence.join(' ') ?? '', /live-email-provider/);
  assert.match(liveProviderCategory?.evidence.join(' ') ?? '', /live-redis-queue-cache/);
});

test('generateProductionScorecard marks failed production env audit artifact as launch risk', () => {
  const scorecard = generateProductionScorecard({
    generatedAt: '2026-05-16T00:00:00.000Z',
    moduleReadinessSource: passingModuleReadinessSource,
    packageJsonSource: passingPackageJsonSource,
    incidentRunbookSource: passingIncidentRunbookSource,
    disasterRecoveryRunbookSource: passingDisasterRecoveryRunbookSource,
    providerCredentialSmokeTestSource: passingProviderSmokeSource,
    productionAuthSmokeSource: passingProductionAuthSmokeSource,
    productionEnvAuditSource: `\uFEFF${JSON.stringify({
      ok: false,
      summary: {
        missing: 0,
        invalid: 2,
        total: 2,
      },
      issues: [
        { type: 'invalid', message: 'APP_CORS_ORIGINS must not include wildcard origins in production' },
        { type: 'invalid', message: 'JWT_SECRET must be a strong production secret' },
      ],
    })}`,
    apiReadinessLiveSource: '',
    productionOperabilityWorkflowSource: passingProductionWorkflowSource,
    productionMonitoringRunbookSource: passingMonitoringRunbookSource,
    pilotWorkflowChecklistSource: passingPilotChecklistSource,
    implementation7LiveValidationSource: passingImplementation7Source,
  });

  const envAuditCategory = scorecard.categories.find((category) => category.id === 'production-env-audit');
  const serialized = JSON.stringify(scorecard);

  assert.equal(envAuditCategory?.status, 'fail');
  assert.match(envAuditCategory?.evidence.join(' ') ?? '', /0 missing, 2 invalid/);
  assert.match(envAuditCategory?.evidence.join(' ') ?? '', /APP_CORS_ORIGINS/);
  assert.match(envAuditCategory?.evidence.join(' ') ?? '', /JWT_SECRET/);
  assert.equal(serialized.includes('real-secret-value'), false);
});

test('generateProductionScorecard marks failed hosted production auth smoke artifact as launch risk', () => {
  const scorecard = generateProductionScorecard({
    generatedAt: '2026-05-16T00:00:00.000Z',
    moduleReadinessSource: passingModuleReadinessSource,
    packageJsonSource: passingPackageJsonSource,
    incidentRunbookSource: passingIncidentRunbookSource,
    disasterRecoveryRunbookSource: passingDisasterRecoveryRunbookSource,
    providerCredentialSmokeTestSource: passingProviderSmokeSource,
    providerCredentialSmokeResultSource: passingProviderSmokeResultSource,
    productionEnvAuditSource: passingProductionEnvAuditSource,
    productionAuthSmokeSource: `\uFEFF${JSON.stringify({
      ok: false,
      summary: {
        total: 6,
        passed: 0,
        failed: 1,
      },
      checks: [],
      error: {
        message: 'API readiness returned HTTP 503 (api_bootstrap_failed): API runtime is not ready.',
      },
    })}`,
    apiReadinessLiveSource: passingApiReadinessLiveSource,
    productionOperabilityWorkflowSource: passingProductionWorkflowSource,
    productionMonitoringRunbookSource: passingMonitoringRunbookSource,
    pilotWorkflowChecklistSource: passingPilotChecklistSource,
    implementation7LiveValidationSource: passingImplementation7Source,
  });

  const authSmokeCategory = scorecard.categories.find((category) => category.id === 'hosted-production-auth-smoke');
  const serialized = JSON.stringify(scorecard);

  assert.equal(authSmokeCategory?.status, 'fail');
  assert.match(authSmokeCategory?.evidence.join(' ') ?? '', /0\/6 passing checks/);
  assert.match(authSmokeCategory?.evidence.join(' ') ?? '', /api_bootstrap_failed/);
  assert.equal(serialized.includes('principal.real@example.com'), false);
});

test('generateProductionScorecard accepts live API readiness as hosted provider and env evidence', () => {
  const scorecard = generateProductionScorecard({
    generatedAt: '2026-05-16T00:00:00.000Z',
    moduleReadinessSource: passingModuleReadinessSource,
    packageJsonSource: passingPackageJsonSource,
    incidentRunbookSource: passingIncidentRunbookSource,
    disasterRecoveryRunbookSource: passingDisasterRecoveryRunbookSource,
    providerCredentialSmokeTestSource: passingProviderSmokeSource,
    providerCredentialSmokeResultSource: JSON.stringify({
      ok: false,
      summary: { total: 11, passed: 6, failed: 3, skipped: 2 },
      checks: [
        { id: 'live-email-provider', status: 'fail' },
        { id: 'live-upload-object-storage', status: 'fail' },
        { id: 'live-redis-queue-cache', status: 'fail' },
      ],
    }),
    productionEnvAuditSource: JSON.stringify({
      ok: false,
      summary: { missing: 0, invalid: 2, total: 2 },
      issues: [
        { type: 'invalid', message: 'stale local env issue' },
      ],
    }),
    productionAuthSmokeSource: passingProductionAuthSmokeSource,
    apiReadinessLiveSource: passingApiReadinessLiveSource,
    productionOperabilityWorkflowSource: passingProductionWorkflowSource,
    productionMonitoringRunbookSource: passingMonitoringRunbookSource,
    pilotWorkflowChecklistSource: passingPilotChecklistSource,
    implementation7LiveValidationSource: passingImplementation7Source,
  });

  const liveProviderCategory = scorecard.categories.find((category) => category.id === 'live-provider-smoke');
  const envAuditCategory = scorecard.categories.find((category) => category.id === 'production-env-audit');

  assert.equal(liveProviderCategory?.status, 'pass');
  assert.match(liveProviderCategory?.evidence.join(' '), /live API readiness reports Redis/);
  assert.equal(envAuditCategory?.status, 'pass');
  assert.match(envAuditCategory?.evidence.join(' '), /production_env configured/);
});
