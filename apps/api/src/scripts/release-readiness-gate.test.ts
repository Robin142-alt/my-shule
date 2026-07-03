import test from 'node:test';
import assert from 'node:assert/strict';

import {
  runReleaseReadinessGate,
  type ReleaseReadinessGateOptions,
} from './release-readiness-gate';

const passingModuleReadinessSource = `
  const productionReadyModules = new Set([
    "dashboard",
    "students",
    "admissions",
    "academics",
    "finance",
    "inventory",
    "exams",
    "discipline",
    "communication",
    "reports",
    "staff",
    "timetable",
    "labs",
    "clinic",
    "leadership",
    "teacher-attendance",
    "settings",
  ]);
  const inactiveModules = new Set([
    "attendance",
  ]);
`;

const passingPackageJsonSource = JSON.stringify({
  scripts: {
    test: [
      'node --test',
      'dist/apps/api/src/app-route-permissions.test.js',
      'dist/apps/api/src/infrastructure/deployment-topology-policy.test.js',
      'dist/apps/api/src/database/tenant-database-policy.test.js',
      'dist/apps/api/src/auth/identity-blueprint.test.js',
      'dist/apps/api/src/auth/role-governance-policy.test.js',
      'dist/apps/api/src/auth/mfa.service.test.js',
      'dist/apps/api/src/auth/trusted-device.service.test.js',
      'dist/apps/api/src/auth/magic-link.service.test.js',
      'dist/apps/api/src/auth/monitoring-service-account.service.test.js',
      'dist/apps/api/src/scripts/audit-coverage-review.test.js',
      'dist/apps/api/src/common/dashboard/dashboard-summary.repository.test.js',
      'dist/apps/api/src/common/reports/report-excel-artifact.test.js',
      'dist/apps/api/src/common/reports/report-pdf-artifact.test.js',
      'dist/apps/api/src/common/reports/report-artifact-storage.service.test.js',
      'dist/apps/api/src/common/reports/report-export.worker.test.js',
      'dist/apps/api/src/common/reports/report-export-queue.test.js',
      'dist/apps/api/src/common/reports/report-snapshot-manifest.test.js',
      'dist/apps/api/src/common/reports/report-snapshot.repository.test.js',
      'dist/apps/api/src/scripts/core-api-load.test.js',
      'dist/apps/api/src/scripts/generate-pilot-school-fixture.test.js',
      'dist/apps/api/src/scripts/high-volume-workflow-load.test.js',
      'dist/apps/api/src/scripts/maintainability-scan.test.js',
      'dist/apps/api/src/scripts/query-plan-review.test.js',
      'dist/apps/api/src/scripts/release-readiness-gate.test.js',
      'dist/apps/api/src/scripts/provider-credential-smoke.test.js',
      'dist/apps/api/src/scripts/production-env-audit.test.js',
      'dist/apps/api/src/scripts/incident-drill.test.js',
      'dist/apps/api/src/scripts/implementation20-certification.test.js',
      'dist/apps/api/src/scripts/implementation21-certification.test.js',
      'dist/apps/api/src/scripts/implementation30-certification.test.js',
      'dist/apps/api/src/scripts/implementation90-load-profile.test.js',
      'dist/apps/api/src/modules/implementation300/blueprint-registry.test.js',
      'dist/apps/api/src/modules/implementation300/api-category-policy.test.js',
      'dist/apps/api/src/modules/implementation300/development-phase-policy.test.js',
      'dist/apps/api/src/scripts/implementation300-certification.test.js',
      'dist/apps/api/src/scripts/synthetic-journey-monitor.test.js',
      'dist/apps/api/src/common/uploads/streaming-upload.service.test.js',
      'dist/apps/api/src/modules/module-access/module-access.test.js',
      'dist/apps/api/src/modules/analytics/kpi-policy.test.js',
      'dist/apps/api/src/modules/academics/academics.test.js',
      'dist/apps/api/src/modules/academics/curriculum-policy.test.js',
      'dist/apps/api/src/modules/labs/labs.test.js',
      'dist/apps/api/src/modules/admin-command/admin-command.test.js',
      'dist/apps/api/src/modules/biometric-attendance/biometric-attendance.test.js',
      'dist/apps/api/src/modules/clinic/clinic.test.js',
      'dist/apps/api/src/modules/integrations/integration-policy.test.js',
      'dist/apps/api/src/modules/exams/exams.test.js',
      'dist/apps/api/src/modules/billing/student-fee-payment-allocation.service.test.js',
      'dist/apps/api/src/modules/billing/billing-contract.test.js',
      'dist/apps/api/src/modules/hr/hr.test.js',
      'dist/apps/api/src/modules/library/library.test.js',
      'dist/apps/api/src/modules/timetable/timetable.test.js',
      'dist/apps/api/src/modules/ai-insights/ai-governance-policy.test.js',
      'dist/apps/api/src/modules/compliance/data-protection-policy.test.js',
      'dist/apps/api/src/modules/automation/automation-policy.test.js',
      'dist/apps/api/src/modules/observability/audit-monitoring-policy.test.js',
      'dist/apps/api/src/modules/mobile/mobile-app-policy.test.js',
      'dist/apps/api/src/modules/sync/offline-workflow-policy.test.js',
      'dist/apps/api/src/modules/support/support-status-subscription.service.test.js',
    ].join(' '),
    'web:test:design': 'npm --prefix apps/web run test:design',
    'audit:coverage-review': 'node apps/api/src/scripts/audit-coverage-review.ts',
    'fixture:pilot-school': 'node apps/api/src/scripts/generate-pilot-school-fixture.ts',
    'load:core-api': 'node apps/api/src/scripts/core-api-load.ts',
    'load:high-volume-workflows': 'node apps/api/src/scripts/high-volume-workflow-load.ts',
    'perf:query-plan-review': 'node apps/api/src/scripts/query-plan-review.ts',
    'monitor:synthetic': 'node apps/api/src/scripts/synthetic-journey-monitor.ts',
    'maintainability:scan': 'node apps/api/src/scripts/maintainability-scan.ts',
    'smoke:providers': 'node apps/api/src/scripts/provider-credential-smoke.ts',
    'smoke:production-auth': 'node scripts/production-auth-smoke.mjs',
    'test:production-auth-smoke': 'node --test scripts/production-auth-smoke.test.mjs',
    'env:production:audit': 'node apps/api/src/scripts/production-env-audit.ts',
    'release:readiness': 'node dist/apps/api/src/scripts/release-readiness-gate.js',
    'scorecard:production': 'node apps/api/src/scripts/generate-production-scorecard.ts',
    'certify:pilot': 'node apps/api/src/scripts/run-pilot-certification.ts',
    'tenant:isolation:audit': 'node apps/api/src/scripts/tenant-isolation-audit.ts',
    'security:scan': 'node apps/api/src/scripts/security-scan.ts',
    'security:deps': 'npm audit --omit=dev --audit-level=high',
    'finance:certify': 'node apps/api/src/scripts/certify-finance.ts',
    'library:certify': 'node apps/api/src/scripts/certify-library.ts',
    'discipline:certify': 'node apps/api/src/scripts/certify-discipline.ts',
    'implementation20:certify': 'node apps/api/src/scripts/implementation20-certification.ts',
    'implementation21:certify': 'node apps/api/src/scripts/implementation21-certification.ts',
    'implementation30:certify': 'node apps/api/src/scripts/implementation30-certification.ts',
    'implementation90:load-profile': 'node apps/api/src/scripts/implementation90-load-profile.ts',
    'implementation300:certify': 'node apps/api/src/scripts/implementation300-certification.ts',
    'test:implementation300': 'npm run build && node --test dist/apps/api/src/modules/implementation300/blueprint-registry.test.js dist/apps/api/src/modules/implementation300/api-category-policy.test.js dist/apps/api/src/modules/implementation300/development-phase-policy.test.js dist/apps/api/src/scripts/implementation300-certification.test.js dist/apps/api/src/modules/ai-insights/ai-governance-policy.test.js dist/apps/api/src/modules/compliance/data-protection-policy.test.js dist/apps/api/src/modules/automation/automation-policy.test.js dist/apps/api/src/modules/integrations/integration-policy.test.js dist/apps/api/src/modules/mobile/mobile-app-policy.test.js dist/apps/api/src/modules/academics/curriculum-policy.test.js dist/apps/api/src/infrastructure/deployment-topology-policy.test.js dist/apps/api/src/modules/analytics/kpi-policy.test.js dist/apps/api/src/database/tenant-database-policy.test.js dist/apps/api/src/modules/observability/audit-monitoring-policy.test.js dist/apps/api/src/auth/role-governance-policy.test.js',
    'implementation90:full-release-gate': [
      'npm run build',
      'npm run web:lint',
      'npm run web:build',
      'npm run test',
      'npm run test:tenant-isolation',
      'npm run test:auth-security',
      'npm run test:api-consistency',
      'npm run test:observability',
      'npm run test:chaos',
      'npm run test:gameday',
      'npm run test:disaster-recovery',
      'npm run security:scan',
      'npm run security:pii-scan',
      'npm run security:deps',
      'npm run tenant:isolation:audit',
      'npm run perf:query-plan-review',
      'npm run implementation30:load-profile',
      'npm run implementation90:load-profile',
      'npm run scorecard:production',
      'npm run release:readiness',
    ].join(' && '),
    'ci:full': 'npm run build && npm run implementation90:load-profile && npm run implementation300:certify && npm run security:deps',
    'monitor:create-service-account': 'node apps/api/src/scripts/create-monitoring-service-account.ts',
    'build:sms-relay': 'npm --prefix apps/sms-relay run build',
    'test:sms-relay': 'npm --prefix apps/sms-relay run test',
    'build:malware-scanner': 'npm --prefix apps/malware-scanner run build',
    'test:malware-scanner': 'npm --prefix apps/malware-scanner run test',
    'test:backup-integrity': 'jest apps/api/test/backup-integrity.integration-spec.ts',
    'test:disaster-recovery': 'jest apps/api/test/disaster-recovery.integration-spec.ts',
    'dr:backup-restore': 'npm run test:backup-integrity && npm run test:disaster-recovery',
    'ops:incident-drill': 'node apps/api/src/scripts/incident-drill.ts',
  },
});

const passingIncidentRunbookSource = `
  # Incident Response Runbook

  ## Detection
  - Check GET /health/ready.
  - Check GET /support/public/system-status.
  - Confirm public status subscriptions and status notification attempts are healthy.
  - Run npm run smoke:providers for provider readiness.
  - Run npm run load:high-volume-workflows for read-safe release scale checks.
  - Review support notification dead-letter deliveries.
  - Review SLA breach alerts.

  ## Triage
  Confirm tenant scope and whether Exams workflows are affected.

  ## Communications
  Publish public status updates for schools.

  ## Mitigation
  Use rollback when the latest release is unsafe.

  ## Retired Modules
  Attendance is retired and must not be restored during incidents.
`;

const passingProviderCredentialSmokeTestSource = `
  test('live provider smoke covers required providers', () => {
    process.env.SUPPORT_PROVIDER_SMOKE_REQUIRE_SMS = 'true';
    assert.equal(result.checks.some((check) => check.id === 'live-email-provider'), true);
    assert.equal('https://api.resend.com/domains'.includes('api.resend.com/domains'), true);
    assert.equal(result.checks.some((check) => check.id === 'live-support-sms-provider'), true);
    assert.equal(result.checks.some((check) => check.id === 'live-upload-malware-scan-provider'), true);
    assert.equal(process.env.UPLOAD_MALWARE_SCAN_HEALTH_URL, 'https://scanner.example.test/health');
    assert.equal(result.checks.some((check) => check.id === 'live-upload-object-storage'), true);
    assert.equal(result.checks.some((check) => check.metadata.delete_checked), true);
    assert.equal(result.checks.some((check) => check.id === 'live-redis-queue-cache'), true);
    assert.equal('rediss://redis.example.test'.startsWith('rediss://'), true);
  });
`;

const passingProductionOperabilityWorkflowSource = `
  name: Production Operability
  jobs:
    production-operability:
      steps:
        - run: npm run monitor:synthetic
          env:
            SYNTHETIC_MONITOR_TOKEN: \${{ secrets.PROD_MONITOR_ACCESS_TOKEN }}
        - run: npm run maintainability:scan
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
        - run: npm run implementation20:certify
        - run: npm run implementation21:certify
        - run: npm run implementation30:certify
        - run: npm run implementation90:load-profile
        - run: npm run tenant:isolation:audit
        - run: npm run security:scan
        - run: npm run security:deps
        - run: npm run dr:backup-restore > production-backup-restore.txt
        - run: npm run ops:incident-drill -- --dry-run > production-incident-drill.json
`;

const passingProductionMonitoringRunbookSource = `
  # Production Monitoring Runbook
  ## Rotation
  Rotate monitor token every 90 days with monitor:create-service-account.

  ## Maintainability Gate
  Run npm run maintainability:scan before production deployments.

  ## Implementation 90 Gate
  Run npm run implementation90:load-profile before production deployments and attach the generated artifact.
`;

const passingPilotWorkflowChecklistSource = `
  # Pilot Real Workflow Checklist
  Platform owner creates school.
`;

const passingImplementation7LiveValidationSource = `
  # Implementation 7 Live Validation
  Live SMS provider smoke: Pending.
  Live object storage smoke: Pending.
  Real pilot school workflow checklist: Pending.
`;

const passingImplementation11MaintainabilityScanSource = `
  # Implementation 11 Maintainability Scan
  Status: pass
`;

const passingImplementation90LoadProfileSource = `
  export const IMPLEMENTATION90_TRAFFIC_PROFILE = {
    target_users_per_second: 5000,
    duration_minutes: 30,
  };
  export function validateImplementation90Budgets() {}
  export function runImplementation90LoadProfile() {}
`;

const passingImplementation90LoadProfileArtifactSource = `
  # Implementation 90 Load Profile
  Status: pass
  Target users per second: 5000
`;

const passingQueryPlanReviewArtifactSource = `
  # Query Plan Review
  Status: pass
  | students-directory-search | Student directory search should use the student full-text index. | Limit, Index Scan | clear |
  | library-catalog-search | Hidden library catalog lookup remains tenant scoped. | Bitmap Heap Scan, Bitmap Index Scan | clear |
  | support-ticket-search | Support ticket search should use the support ticket full-text index. | Limit, Index Scan | clear |
`;

const passingImplementation90ArchitectureSource = `
  # Implementation 90 Scale, Security, And Reliability Architecture
  Handle 5000+ users per second with a breach-resistant security model, reliability controls, and maintainability gates.
`;

const passingImplementation300CertificationSource = `
  export function runImplementation300Certification() {}
  export function renderImplementation300CertificationMarkdown() {}
  const title = 'Implementation 300 Blueprint Compliance Certification';
`;

const passingImplementation300CertificationArtifactSource = `
  # Implementation 300 Blueprint Compliance Certification
  Status: pass
  Scale target: 1000+ schools; tens_of_thousands_of_concurrent_features
  ## Blueprint Sections
  | School onboarding workflow | pass |
  | Authentication and identity | pass | pass: Role governance policy enforces global roles, school roles, tenant boundaries, MFA, module-bound roles, and permission inheritance |
  | AI and analytics layer | pass | pass: AI governance policy enforces tenant-scoped auditable recommendations |
  | Security and compliance | pass | pass: Data protection policy covers Kenyan consent, retention, encryption, and DPIA controls |
  | Notifications and automation | pass | pass: Automation policy covers fee reminders, low stock, attendance, discipline, timetable, exams, and clinic triggers |
  | Integration layer | pass | pass: Integration policy covers Kenyan and external tenant provider activation |
  | Recommended API categories | pass | pass: API category policy covers public, internal, and third-party APIs |
  | Mobile strategy | pass | pass: Mobile app policy covers parent, teacher, student, and admin app access |
  | Technical architecture | pass | pass: Deployment topology policy covers cloud, hybrid, and dedicated enterprise modes |
  | Multi-tenant database strategy | pass | pass: Tenant database policy validates tenant identifiers, forced RLS, module activation tables, and tenant-level encryption |
  | Audit and monitoring | pass | pass: Audit monitoring policy covers user activity, login history, record changes, approvals, financial trails, device logs, uptime, errors, resources, tenant monitoring, and usage analytics |
  | Recommended development phases | pass | pass: Development phase policy enforces Phase 1 core ERP, Phase 2 operations, Phase 3 advanced, and Phase 4 enterprise intelligence rollout order |
  | Recommended user roles | pass | pass: Role governance policy covers global and school ERP role assignment rules |
  | Recommended KPIs | pass | pass: KPI policy covers financial, academic, operational, and executive metrics |
  ## Modules
  | Academic Structure | pass | pass: Academic curriculum policy covers CBC, CBE, 8-4-4, Cambridge, IGCSE, and international structures |
  | AI Insights | pass |
  | IoT and Smart Campus | pass |
`;

const passingExtremeScaleRunbookSource = `
  # Extreme Scale Incident Runbook
  Triage database saturation, Redis degradation, and queue backlog before enabling lockdown mode.
`;

const passingSecurityLockdownRunbookSource = `
  # Security Lockdown Mode
  Rotate suspected secrets, Disable provider callbacks that fail verification, Preserve audit logs, and keep safe read-only status online.
`;

const passingDisasterRecoveryRunbookSource = `
  # Backup and Restore Drill Runbook

  ## Scope
  Verify full schema restore, tenant-scoped restore, point-in-time restore, RTO, and RPO.

  ## Commands
  - npm run test:backup-integrity
  - npm run test:disaster-recovery
  - npm run dr:backup-restore
  - npm run fixture:pilot-school
  - npm run load:high-volume-workflows

  ## Safety
  Run only against sandbox schemas. Never restore over production.

  ## Tenant Isolation
  Confirm tenant digests before and after restore.

  ## Artifacts
  Verify checksum_sha256 before restore.

  ## Modules
  Exams data belongs to active academic recovery scope.
  Attendance is retired and must not be restored as a production module.
`;

test('runReleaseReadinessGate passes the current release safety contract', () => {
  const result = runGate();

  assert.equal(result.ok, true);
  assert.deepEqual(
    result.checks.filter((check) => check.status === 'fail'),
    [],
  );
});

test('runReleaseReadinessGate fails if attendance is exposed as production-ready', () => {
  const result = runGate({
    moduleReadinessSource: `
      const productionReadyModules = new Set(["dashboard", "exams", "attendance"]);
      const inactiveModules = new Set(["academics"]);
    `,
  });

  assert.equal(result.ok, false);
  assert.match(
    result.checks.find((check) => check.id === 'frontend-module-readiness')?.message ?? '',
    /attendance/i,
  );
});

test('runReleaseReadinessGate fails when required release scripts are missing', () => {
  const result = runGate({
    packageJsonSource: JSON.stringify({
      scripts: {
        test: 'node --test dist/apps/api/src/app-route-permissions.test.js',
      },
    }),
  });

  assert.equal(result.ok, false);
  assert.match(
    result.checks.find((check) => check.id === 'release-scripts')?.details.join('\n') ?? '',
    /perf:query-plan-review/,
  );
});

test('runReleaseReadinessGate fails when provider smoke coverage is missing', () => {
  const result = runGate({
    packageJsonSource: JSON.stringify({
      scripts: {
        ...JSON.parse(passingPackageJsonSource).scripts,
        test: [
          'node --test',
          'dist/apps/api/src/app-route-permissions.test.js',
          'dist/apps/api/src/scripts/audit-coverage-review.test.js',
          'dist/apps/api/src/common/dashboard/dashboard-summary.repository.test.js',
          'dist/apps/api/src/common/reports/report-export-queue.test.js',
          'dist/apps/api/src/common/reports/report-snapshot-manifest.test.js',
          'dist/apps/api/src/common/reports/report-snapshot.repository.test.js',
          'dist/apps/api/src/scripts/core-api-load.test.js',
          'dist/apps/api/src/scripts/query-plan-review.test.js',
          'dist/apps/api/src/scripts/release-readiness-gate.test.js',
          'dist/apps/api/src/scripts/synthetic-journey-monitor.test.js',
        ].join(' '),
        'smoke:providers': undefined,
      },
    }),
  });

  assert.equal(result.ok, false);
  assert.match(
    result.checks.find((check) => check.id === 'release-scripts')?.details.join('\n') ?? '',
    /smoke:providers/,
  );
});

test('runReleaseReadinessGate fails when Implementation 7 operability artifacts are missing', () => {
  const result = runGate({
    providerCredentialSmokeTestSource: 'test("missing live checks", () => {})',
    productionOperabilityWorkflowSource: 'name: Production Operability',
    productionMonitoringRunbookSource: '# Monitoring',
    pilotWorkflowChecklistSource: '# Checklist',
    implementation7LiveValidationSource: '# Live validation',
  });

  assert.equal(result.ok, false);
  assert.match(
    result.checks.find((check) => check.id === 'implementation7-operability-artifacts')?.details.join('\n') ?? '',
    /live SMS provider check|monitor token secret|monitor token rotation|platform-owner school creation/i,
  );
});

test('runReleaseReadinessGate fails when Implementation 11 maintainability artifacts are missing', () => {
  const result = runGate({
    packageJsonSource: JSON.stringify({
      scripts: {
        ...JSON.parse(passingPackageJsonSource).scripts,
        'maintainability:scan': undefined,
        test: 'node --test dist/apps/api/src/scripts/release-readiness-gate.test.js',
      },
    }),
    productionOperabilityWorkflowSource: 'name: Production Operability',
    productionMonitoringRunbookSource: '# Monitoring',
    implementation11MaintainabilityScanSource: '# Implementation 11 Maintainability Scan\nStatus: fail',
  });

  assert.equal(result.ok, false);
  assert.match(
    result.checks.find((check) => check.id === 'implementation11-maintainability-artifacts')?.details.join('\n') ?? '',
    /maintainability scan|maintainability gate|implementation11-maintainability-scan/i,
  );
});

test('runReleaseReadinessGate fails when Implementation 90 extreme-scale artifacts are missing', () => {
  const result = runGate({
    packageJsonSource: JSON.stringify({
      scripts: {
        ...JSON.parse(passingPackageJsonSource).scripts,
        'implementation90:load-profile': undefined,
        test: 'node --test dist/apps/api/src/scripts/release-readiness-gate.test.js',
      },
    }),
    productionOperabilityWorkflowSource: 'name: Production Operability',
    productionMonitoringRunbookSource: '# Monitoring',
    implementation90LoadProfileSource: '',
    implementation90LoadProfileArtifactSource: '# Implementation 90 Load Profile\nStatus: fail',
    implementation90ArchitectureSource: '',
    extremeScaleRunbookSource: '',
    securityLockdownRunbookSource: '',
  });

  assert.equal(result.ok, false);
  assert.match(
    result.checks.find((check) => check.id === 'implementation90-extreme-scale-artifacts')?.details.join('\n') ?? '',
    /implementation90:load-profile|5000\+ users|Status: pass|security lockdown/i,
  );
});

test('runReleaseReadinessGate fails when the Implementation 90 full release gate is incomplete', () => {
  const scripts = {
    ...JSON.parse(passingPackageJsonSource).scripts,
    'implementation90:full-release-gate': 'npm run build && npm run release:readiness',
  };
  const result = runGate({
    packageJsonSource: JSON.stringify({ scripts }),
  });

  assert.equal(result.ok, false);
  assert.match(
    result.checks.find((check) => check.id === 'implementation90-extreme-scale-artifacts')?.details.join('\n') ?? '',
    /perf:query-plan-review|test:chaos|test:gameday/i,
  );
});

test('runReleaseReadinessGate fails when Implementation 300 certification is not release-gated', () => {
  const scripts = {
    ...JSON.parse(passingPackageJsonSource).scripts,
    'implementation300:certify': undefined,
    'test:implementation300': undefined,
    'ci:full': 'npm run build && npm run implementation90:load-profile && npm run security:deps',
  };
  const result = runGate({
    packageJsonSource: JSON.stringify({ scripts }),
  });

  assert.equal(result.ok, false);
  assert.match(
    [
      result.checks.find((check) => check.id === 'release-scripts')?.details.join('\n') ?? '',
      result.checks.find((check) => check.id === 'implementation90-extreme-scale-artifacts')?.details.join('\n') ?? '',
    ].join('\n'),
    /implementation300:certify|test:implementation300|ci:full/i,
  );
});

test('runReleaseReadinessGate fails when Implementation 300 certification artifact is missing or failing', () => {
  const result = runGate({
    implementation300CertificationSource: '',
    implementation300CertificationArtifactSource: '# Implementation 300\nStatus: fail',
  });

  assert.equal(result.ok, false);
  assert.match(
    result.checks.find((check) => check.id === 'implementation300-blueprint-compliance')?.details.join('\n') ?? '',
    /implementation300-certification|Status: pass|1000\+ schools|AI Insights|AI governance policy|Data protection policy|Automation policy|Integration policy|API category policy|Mobile app policy|Deployment topology policy|Tenant database policy|Academic curriculum policy|KPI policy|IoT and Smart Campus/i,
  );
});

test('runReleaseReadinessGate fails when Implementation 300 omits the tenant database policy', () => {
  const result = runGate({
    implementation300CertificationArtifactSource: passingImplementation300CertificationArtifactSource
      .replace(/\n  \| Multi-tenant database strategy \| pass \|[^\n]+/, ''),
  });

  assert.equal(result.ok, false);
  assert.match(
    result.checks.find((check) => check.id === 'implementation300-blueprint-compliance')?.details.join('\n') ?? '',
    /tenant database policy/i,
  );
});

test('runReleaseReadinessGate fails when Implementation 300 omits the audit monitoring policy', () => {
  const result = runGate({
    implementation300CertificationArtifactSource: passingImplementation300CertificationArtifactSource
      .replace(/\n  \| Audit and monitoring \| pass \|[^\n]+/, ''),
  });

  assert.equal(result.ok, false);
  assert.match(
    result.checks.find((check) => check.id === 'implementation300-blueprint-compliance')?.details.join('\n') ?? '',
    /audit monitoring policy/i,
  );
});

test('runReleaseReadinessGate fails when Implementation 300 omits the role governance policy', () => {
  const result = runGate({
    implementation300CertificationArtifactSource: passingImplementation300CertificationArtifactSource
      .replace(/Role governance policy/g, 'Role catalog'),
  });

  assert.equal(result.ok, false);
  assert.match(
    result.checks.find((check) => check.id === 'implementation300-blueprint-compliance')?.details.join('\n') ?? '',
    /role governance policy/i,
  );
});

test('runReleaseReadinessGate fails when Implementation 300 omits the development phase policy', () => {
  const result = runGate({
    implementation300CertificationArtifactSource: passingImplementation300CertificationArtifactSource
      .replace(/\n  \| Recommended development phases \| pass \|[^\n]+/, ''),
  });

  assert.equal(result.ok, false);
  assert.match(
    result.checks.find((check) => check.id === 'implementation300-blueprint-compliance')?.details.join('\n') ?? '',
    /development phase policy/i,
  );
});

test('runReleaseReadinessGate fails when query-plan review evidence is missing or failing', () => {
  const result = runGate({
    queryPlanReviewArtifactSource: '# Query Plan Review\nStatus: fail\nSequential scan on protected table library_catalog_items.',
  });

  assert.equal(result.ok, false);
  assert.match(
    result.checks.find((check) => check.id === 'query-plan-review-artifact')?.details.join('\n') ?? '',
    /Status: pass|library-catalog-search|protected table/i,
  );
});


test('runReleaseReadinessGate fails when report snapshot coverage is missing', () => {
  const result = runGate({
    packageJsonSource: JSON.stringify({
      scripts: {
        ...JSON.parse(passingPackageJsonSource).scripts,
        test: [
          'node --test',
          'dist/apps/api/src/app-route-permissions.test.js',
          'dist/apps/api/src/scripts/audit-coverage-review.test.js',
          'dist/apps/api/src/common/dashboard/dashboard-summary.repository.test.js',
          'dist/apps/api/src/common/reports/report-export-queue.test.js',
          'dist/apps/api/src/scripts/core-api-load.test.js',
          'dist/apps/api/src/scripts/query-plan-review.test.js',
          'dist/apps/api/src/scripts/release-readiness-gate.test.js',
          'dist/apps/api/src/scripts/provider-credential-smoke.test.js',
          'dist/apps/api/src/scripts/synthetic-journey-monitor.test.js',
        ].join(' '),
      },
    }),
  });

  assert.equal(result.ok, false);
  assert.match(
    result.checks.find((check) => check.id === 'release-scripts')?.details.join('\n') ?? '',
    /report-snapshot-manifest/,
  );
});

test('runReleaseReadinessGate fails when report snapshot persistence coverage is missing', () => {
  const result = runGate({
    packageJsonSource: JSON.stringify({
      scripts: {
        ...JSON.parse(passingPackageJsonSource).scripts,
        test: [
          'node --test',
          'dist/apps/api/src/app-route-permissions.test.js',
          'dist/apps/api/src/scripts/audit-coverage-review.test.js',
          'dist/apps/api/src/common/dashboard/dashboard-summary.repository.test.js',
          'dist/apps/api/src/common/reports/report-export-queue.test.js',
          'dist/apps/api/src/common/reports/report-snapshot-manifest.test.js',
          'dist/apps/api/src/scripts/core-api-load.test.js',
          'dist/apps/api/src/scripts/query-plan-review.test.js',
          'dist/apps/api/src/scripts/release-readiness-gate.test.js',
          'dist/apps/api/src/scripts/provider-credential-smoke.test.js',
          'dist/apps/api/src/scripts/synthetic-journey-monitor.test.js',
        ].join(' '),
      },
    }),
  });

  assert.equal(result.ok, false);
  assert.match(
    result.checks.find((check) => check.id === 'release-scripts')?.details.join('\n') ?? '',
    /report-snapshot\.repository/,
  );
});

test('runReleaseReadinessGate fails when dashboard summary coverage is missing', () => {
  const result = runGate({
    packageJsonSource: JSON.stringify({
      scripts: {
        ...JSON.parse(passingPackageJsonSource).scripts,
        test: [
          'node --test',
          'dist/apps/api/src/app-route-permissions.test.js',
          'dist/apps/api/src/scripts/audit-coverage-review.test.js',
          'dist/apps/api/src/common/reports/report-export-queue.test.js',
          'dist/apps/api/src/common/reports/report-snapshot-manifest.test.js',
          'dist/apps/api/src/common/reports/report-snapshot.repository.test.js',
          'dist/apps/api/src/scripts/core-api-load.test.js',
          'dist/apps/api/src/scripts/query-plan-review.test.js',
          'dist/apps/api/src/scripts/release-readiness-gate.test.js',
          'dist/apps/api/src/scripts/provider-credential-smoke.test.js',
          'dist/apps/api/src/scripts/synthetic-journey-monitor.test.js',
        ].join(' '),
      },
    }),
  });

  assert.equal(result.ok, false);
  assert.match(
    result.checks.find((check) => check.id === 'release-scripts')?.details.join('\n') ?? '',
    /dashboard-summary\.repository/,
  );
});

test('runReleaseReadinessGate fails when upload controllers use memoryStorage', () => {
  const result = runGate({
    uploadControllerSources: {
      'apps/api/src/modules/support/support.controller.ts': `
        import { FileInterceptor } from '@nestjs/platform-express';
        const { memoryStorage } = require('multer');
        @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
        export class SupportController {}
      `,
      'apps/api/src/modules/admissions/admissions.controller.ts': `
        import { StreamingUploadInterceptor } from '../../common/uploads/streaming-upload.interceptor';
        @UseInterceptors(StreamingUploadInterceptor('file'))
        export class AdmissionsController {}
      `,
    },
  });

  assert.equal(result.ok, false);
  assert.match(
    result.checks.find((check) => check.id === 'streaming-upload-ingestion')?.details.join('\n') ?? '',
    /memoryStorage/,
  );
});

test('runReleaseReadinessGate fails when the incident runbook loses required response steps', () => {
  const result = runGate({
    incidentRunbookSource: '# Incident Response Runbook\n\nNo operational steps yet.',
  });

  assert.equal(result.ok, false);
  assert.match(
    result.checks.find((check) => check.id === 'incident-response-runbook')?.details.join('\n') ?? '',
    /GET \/health\/ready/,
  );
});

test('runReleaseReadinessGate fails when the backup restore drill runbook loses required safeguards', () => {
  const result = runGate({
    disasterRecoveryRunbookSource: '# Backup and Restore\n\nNo safeguards yet.',
  });

  assert.equal(result.ok, false);
  assert.match(
    result.checks.find((check) => check.id === 'backup-restore-runbook')?.details.join('\n') ?? '',
    /test:backup-integrity/,
  );
});

test('runReleaseReadinessGate fails when synthetic journeys reference retired attendance', () => {
  const result = runGate({
    syntheticJourneys: [
      {
        id: 'attendance-monitor',
        description: 'Bad retired monitor',
        steps: [
          {
            id: 'attendance',
            target: 'api',
            method: 'GET',
            path: '/attendance',
            auth: 'tenant',
            targetP95Ms: 500,
            description: 'Retired attendance path',
          },
        ],
      },
    ],
  });

  assert.equal(result.ok, false);
  assert.match(
    result.checks.find((check) => check.id === 'synthetic-journey-coverage')?.details.join('\n') ?? '',
    /attendance/i,
  );
});

test('runReleaseReadinessGate fails when audit coverage requirements reference retired attendance', () => {
  const result = runGate({
    auditCoverageRequirements: [
      {
        id: 'attendance-audit',
        module: 'attendance',
        description: 'Bad retired audit requirement',
        evidence: [
          {
            file: 'apps/api/src/modules/students/attendance.service.ts',
            patterns: ['attendance.recorded'],
          },
        ],
      },
    ],
  });

  assert.equal(result.ok, false);
  assert.match(
    result.checks.find((check) => check.id === 'audit-coverage-review')?.details.join('\n') ?? '',
    /attendance/i,
  );
});

function runGate(overrides: ReleaseReadinessGateOptions = {}) {
  return runReleaseReadinessGate({
    moduleReadinessSource: passingModuleReadinessSource,
    packageJsonSource: passingPackageJsonSource,
    incidentRunbookSource: passingIncidentRunbookSource,
    disasterRecoveryRunbookSource: passingDisasterRecoveryRunbookSource,
    providerCredentialSmokeTestSource: passingProviderCredentialSmokeTestSource,
    productionOperabilityWorkflowSource: passingProductionOperabilityWorkflowSource,
    productionMonitoringRunbookSource: passingProductionMonitoringRunbookSource,
    pilotWorkflowChecklistSource: passingPilotWorkflowChecklistSource,
    implementation7LiveValidationSource: passingImplementation7LiveValidationSource,
    implementation11MaintainabilityScanSource: passingImplementation11MaintainabilityScanSource,
    implementation90LoadProfileSource: passingImplementation90LoadProfileSource,
    implementation90LoadProfileArtifactSource: passingImplementation90LoadProfileArtifactSource,
    implementation90ArchitectureSource: passingImplementation90ArchitectureSource,
    implementation300CertificationSource: passingImplementation300CertificationSource,
    implementation300CertificationArtifactSource: passingImplementation300CertificationArtifactSource,
    extremeScaleRunbookSource: passingExtremeScaleRunbookSource,
    securityLockdownRunbookSource: passingSecurityLockdownRunbookSource,
    queryPlanReviewArtifactSource: passingQueryPlanReviewArtifactSource,
    ...overrides,
  });
}
