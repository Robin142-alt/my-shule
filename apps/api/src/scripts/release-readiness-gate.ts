import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import ts from 'typescript';

import {
  AUDIT_COVERAGE_REQUIREMENTS,
  type AuditCoverageRequirement,
  runAuditCoverageReview,
} from './audit-coverage-review';
import {
  CORE_API_LOAD_WORKLOADS,
  validateCoreApiLoadWorkloads,
} from './core-api-load';
import {
  QUERY_PLAN_REVIEWS,
  validateQueryPlanReviews,
} from './query-plan-review';
import {
  SYNTHETIC_JOURNEYS,
  type SyntheticJourney,
  validateSyntheticJourneys,
} from './synthetic-journey-monitor';
import {
  DEFAULT_SYNC_EXPORT_ROW_LIMIT,
  shouldQueueReportExport,
  validateReportExportJobPayload,
} from '../common/reports/report-export-queue';
import {
  createReportSnapshotManifest,
  validateReportSnapshotManifestInput,
} from '../common/reports/report-snapshot-manifest';

export type ReleaseReadinessGateStatus = 'pass' | 'fail';

export interface ReleaseReadinessGateCheck {
  id: string;
  status: ReleaseReadinessGateStatus;
  message: string;
  details: string[];
}

export interface ReleaseReadinessGateResult {
  ok: boolean;
  checks: ReleaseReadinessGateCheck[];
}

export interface ReleaseReadinessGateOptions {
  workspaceRoot?: string;
  moduleReadinessSource?: string;
  packageJsonSource?: string;
  incidentRunbookSource?: string;
  disasterRecoveryRunbookSource?: string;
  providerCredentialSmokeTestSource?: string;
  productionOperabilityWorkflowSource?: string;
  productionMonitoringRunbookSource?: string;
  pilotWorkflowChecklistSource?: string;
  implementation7LiveValidationSource?: string;
  implementation11MaintainabilityScanSource?: string;
  implementation90LoadProfileSource?: string;
  implementation90LoadProfileArtifactSource?: string;
  implementation90ArchitectureSource?: string;
  implementation300CertificationSource?: string;
  implementation300CertificationArtifactSource?: string;
  extremeScaleRunbookSource?: string;
  securityLockdownRunbookSource?: string;
  queryPlanReviewArtifactSource?: string;
  uploadControllerSources?: Record<string, string>;
  syntheticJourneys?: readonly SyntheticJourney[];
  auditCoverageRequirements?: readonly AuditCoverageRequirement[];
}

const REQUIRED_READY_MODULES = [
  'dashboard',
  'students',
  'admissions',
  'academics',
  'finance',
  'inventory',
  'exams',
  'discipline',
  'communication',
  'reports',
  'staff',
  'timetable',
  'labs',
  'clinic',
  'leadership',
  'teacher-attendance',
  'settings',
];
const REQUIRED_INACTIVE_MODULES = [
  'attendance',
];
const REQUIRED_CORE_API_WORKLOADS = [
  'health-ready',
  'support-public-status',
  'students-directory',
  'academics-teacher-assignments',
  'exams-report-cards',
  'admissions-report-export',
  'inventory-report-export',
  'billing-invoice-report-export',
];
const REQUIRED_QUERY_PLAN_REVIEWS = [
  'students-directory-search',
  'admissions-application-search',
  'inventory-item-search',
  'academics-teacher-assignment-lookup',
  'exam-marks-student-series',
  'student-fee-allocation-history',
  'support-status-subscription-queue',
  'hr-staff-profile-directory',
  'library-catalog-search',
  'timetable-slot-lookup',
  'support-ticket-search',
];
const REQUIRED_NPM_SCRIPTS = [
  'test',
  'web:test:design',
  'audit:coverage-review',
  'fixture:pilot-school',
  'load:core-api',
  'load:high-volume-workflows',
  'perf:query-plan-review',
  'monitor:synthetic',
  'maintainability:scan',
  'smoke:providers',
  'smoke:production-auth',
  'test:production-auth-smoke',
  'env:production:audit',
  'release:readiness',
  'scorecard:production',
  'certify:pilot',
  'tenant:isolation:audit',
  'security:scan',
  'security:deps',
  'finance:certify',
  'library:certify',
  'discipline:certify',
  'implementation20:certify',
  'implementation21:certify',
  'implementation30:certify',
  'implementation90:load-profile',
  'implementation300:certify',
  'test:implementation300',
  'implementation90:full-release-gate',
  'ci:full',
  'monitor:create-service-account',
  'build:sms-relay',
  'test:sms-relay',
  'build:malware-scanner',
  'test:malware-scanner',
  'test:backup-integrity',
  'test:disaster-recovery',
  'dr:backup-restore',
  'ops:incident-drill',
];
const REQUIRED_IMPLEMENTATION90_FULL_RELEASE_GATE_COMMANDS = [
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
];
const REQUIRED_DEFAULT_TEST_ARTIFACTS = [
  'app-route-permissions.test.js',
  'deployment-topology-policy.test.js',
  'tenant-database-policy.test.js',
  'identity-blueprint.test.js',
  'role-governance-policy.test.js',
  'mfa.service.test.js',
  'trusted-device.service.test.js',
  'magic-link.service.test.js',
  'monitoring-service-account.service.test.js',
  'audit-coverage-review.test.js',
  'dashboard-summary.repository.test.js',
  'report-excel-artifact.test.js',
  'report-pdf-artifact.test.js',
  'report-artifact-storage.service.test.js',
  'report-export.worker.test.js',
  'report-export-queue.test.js',
  'core-api-load.test.js',
  'generate-pilot-school-fixture.test.js',
  'high-volume-workflow-load.test.js',
  'maintainability-scan.test.js',
  'query-plan-review.test.js',
  'release-readiness-gate.test.js',
  'provider-credential-smoke.test.js',
  'production-env-audit.test.js',
  'incident-drill.test.js',
  'implementation20-certification.test.js',
  'implementation21-certification.test.js',
  'implementation30-certification.test.js',
  'implementation90-load-profile.test.js',
  'blueprint-registry.test.js',
  'api-category-policy.test.js',
  'development-phase-policy.test.js',
  'implementation300-certification.test.js',
  'report-snapshot-manifest.test.js',
  'report-snapshot.repository.test.js',
  'synthetic-journey-monitor.test.js',
  'streaming-upload.service.test.js',
  'module-access.test.js',
  'kpi-policy.test.js',
  'academics.test.js',
  'curriculum-policy.test.js',
  'labs.test.js',
  'admin-command.test.js',
  'biometric-attendance.test.js',
  'clinic.test.js',
  'integration-policy.test.js',
  'exams.test.js',
  'ai-governance-policy.test.js',
  'student-fee-payment-allocation.service.test.js',
  'billing-contract.test.js',
  'hr.test.js',
  'library.test.js',
  'timetable.test.js',
  'audit-monitoring-policy.test.js',
  'automation-policy.test.js',
  'data-protection-policy.test.js',
  'mobile-app-policy.test.js',
  'offline-workflow-policy.test.js',
  'support-status-subscription.service.test.js',
];
const REQUIRED_SYNTHETIC_JOURNEYS = [
  'public-readiness',
  'public-status-page',
  'tenant-core-operations',
  'report-artifacts',
  'exams-workspace',
];
const REQUIRED_INCIDENT_RUNBOOK_SECTIONS = [
  { label: 'GET /health/ready', pattern: /GET\s+\/health\/ready/i },
  {
    label: 'GET /support/public/system-status',
    pattern: /GET\s+\/support\/public\/system-status/i,
  },
  {
    label: 'public status subscriptions',
    pattern: /public status subscriptions/i,
  },
  {
    label: 'status notification attempts',
    pattern: /status notification attempts/i,
  },
  {
    label: 'support notification dead-letter',
    pattern: /support notification dead-?letter/i,
  },
  { label: 'smoke:providers', pattern: /smoke:providers/i },
  { label: 'SLA breach', pattern: /SLA breach/i },
  { label: 'Communications', pattern: /communications/i },
  { label: 'rollback', pattern: /rollback/i },
  { label: 'Exams', pattern: /exams/i },
  { label: 'Attendance is retired', pattern: /attendance is retired/i },
  { label: 'load:high-volume-workflows', pattern: /load:high-volume-workflows/i },
];
const REQUIRED_BACKUP_RESTORE_RUNBOOK_SECTIONS = [
  { label: 'test:backup-integrity', pattern: /test:backup-integrity/i },
  { label: 'test:disaster-recovery', pattern: /test:disaster-recovery/i },
  { label: 'dr:backup-restore', pattern: /dr:backup-restore/i },
  { label: 'full schema restore', pattern: /full schema restore/i },
  { label: 'tenant-scoped restore', pattern: /tenant-scoped restore/i },
  { label: 'point-in-time restore', pattern: /point-in-time restore/i },
  { label: 'RTO', pattern: /\bRTO\b/i },
  { label: 'RPO', pattern: /\bRPO\b/i },
  { label: 'sandbox schemas', pattern: /sandbox schemas/i },
  { label: 'Never restore over production', pattern: /never restore over production/i },
  { label: 'tenant digests', pattern: /tenant digests/i },
  { label: 'checksum_sha256', pattern: /checksum_sha256/i },
  { label: 'Exams', pattern: /exams/i },
  { label: 'Attendance is retired', pattern: /attendance is retired/i },
  { label: 'fixture:pilot-school', pattern: /fixture:pilot-school/i },
  { label: 'load:high-volume-workflows', pattern: /load:high-volume-workflows/i },
];
const REQUIRED_IMPLEMENTATION7_PROVIDER_SMOKE_TEST_PATTERNS = [
  { label: 'required SMS smoke flag', pattern: /SUPPORT_PROVIDER_SMOKE_REQUIRE_SMS/ },
  { label: 'live email provider check', pattern: /live-email-provider/ },
  { label: 'Resend sender domain verification', pattern: /Resend.*sender domain|api\.resend\.com\/domains/i },
  { label: 'live SMS provider check', pattern: /live-support-sms-provider/ },
  { label: 'live malware scanner health check', pattern: /live-upload-malware-scan-provider/ },
  { label: 'malware scanner health URL', pattern: /UPLOAD_MALWARE_SCAN_HEALTH_URL/ },
  { label: 'live object storage smoke check', pattern: /live-upload-object-storage/ },
  { label: 'object storage delete verification', pattern: /delete_checked|DELETE/i },
  { label: 'live Redis queue/cache smoke check', pattern: /live-redis-queue-cache/ },
  { label: 'Redis queue/cache TLS validation', pattern: /redis-queue-cache|REDIS_TLS_ENABLED|rediss:\/\// },
];
const REQUIRED_OPERABILITY_WORKFLOW_PATTERNS = [
  { label: 'synthetic monitor', pattern: /monitor:synthetic/ },
  { label: 'core API load', pattern: /load:core-api/ },
  { label: 'provider smoke', pattern: /smoke:providers|provider-credential-smoke\.ts/ },
  { label: 'production env audit', pattern: /env:production:audit/ },
  { label: 'hosted production auth smoke', pattern: /smoke:production-auth/ },
  { label: 'query-plan review', pattern: /perf:query-plan-review/ },
  { label: 'release readiness', pattern: /release:readiness/ },
  { label: 'production scorecard', pattern: /scorecard:production/ },
  { label: 'pilot certification', pattern: /certify:pilot/ },
  { label: 'finance certification', pattern: /finance:certify/ },
  { label: 'library certification', pattern: /library:certify/ },
  { label: 'discipline certification', pattern: /discipline:certify/ },
  { label: 'Implementation 20 certification', pattern: /implementation20:certify/ },
  { label: 'Implementation 21 certification', pattern: /implementation21:certify/ },
  { label: 'Implementation 30 certification', pattern: /implementation30:certify/ },
  { label: 'tenant isolation audit', pattern: /tenant:isolation:audit/ },
  { label: 'security scan', pattern: /security:scan/ },
  { label: 'maintainability scan', pattern: /maintainability:scan/ },
  { label: 'dependency vulnerability scan', pattern: /security:deps/ },
  { label: 'backup restore verification', pattern: /dr:backup-restore/ },
  { label: 'incident drill validation', pattern: /ops:incident-drill/ },
  { label: 'monitor token secret', pattern: /PROD_MONITOR_ACCESS_TOKEN/ },
];

export function runReleaseReadinessGate(
  options: ReleaseReadinessGateOptions = {},
): ReleaseReadinessGateResult {
  const workspaceRoot = options.workspaceRoot ?? process.cwd();
  const moduleReadinessSource =
    options.moduleReadinessSource
    ?? readWorkspaceFile(workspaceRoot, 'apps/web/src/lib/features/module-readiness.ts');
  const packageJsonSource =
    options.packageJsonSource
    ?? readWorkspaceFile(workspaceRoot, 'package.json');
  const incidentRunbookSource =
    options.incidentRunbookSource
    ?? readWorkspaceFile(workspaceRoot, 'docs/runbooks/incident-response.md');
  const disasterRecoveryRunbookSource =
    options.disasterRecoveryRunbookSource
    ?? readWorkspaceFile(workspaceRoot, 'docs/runbooks/backup-restore-drill.md');
  const providerCredentialSmokeTestSource =
    options.providerCredentialSmokeTestSource
    ?? readWorkspaceFile(workspaceRoot, 'apps/api/src/scripts/provider-credential-smoke.test.ts');
  const productionOperabilityWorkflowSource =
    options.productionOperabilityWorkflowSource
    ?? readWorkspaceFile(workspaceRoot, '.github/workflows/production-operability.yml');
  const productionMonitoringRunbookSource =
    options.productionMonitoringRunbookSource
    ?? readWorkspaceFile(workspaceRoot, 'docs/runbooks/production-monitoring.md');
  const pilotWorkflowChecklistSource =
    options.pilotWorkflowChecklistSource
    ?? readWorkspaceFile(workspaceRoot, 'docs/validation/pilot-real-workflow-checklist.md');
  const implementation7LiveValidationSource =
    options.implementation7LiveValidationSource
    ?? readWorkspaceFile(workspaceRoot, 'docs/validation/implementation7-live-validation.md');
  const implementation11MaintainabilityScanSource =
    options.implementation11MaintainabilityScanSource
    ?? readWorkspaceFile(workspaceRoot, 'docs/validation/implementation11-maintainability-scan.md');
  const implementation90LoadProfileSource =
    options.implementation90LoadProfileSource
    ?? readWorkspaceFile(workspaceRoot, 'apps/api/src/scripts/implementation90-load-profile.ts');
  const implementation90LoadProfileArtifactSource =
    options.implementation90LoadProfileArtifactSource
    ?? readWorkspaceFile(workspaceRoot, 'docs/validation/implementation90-load-profile.md');
  const implementation90ArchitectureSource =
    options.implementation90ArchitectureSource
    ?? readWorkspaceFile(workspaceRoot, 'docs/architecture/implementation90-scale-security-reliability.md');
  const implementation300CertificationSource =
    options.implementation300CertificationSource
    ?? readWorkspaceFile(workspaceRoot, 'apps/api/src/scripts/implementation300-certification.ts');
  const implementation300CertificationArtifactSource =
    options.implementation300CertificationArtifactSource
    ?? readWorkspaceFile(workspaceRoot, 'docs/validation/implementation300-certification.md');
  const extremeScaleRunbookSource =
    options.extremeScaleRunbookSource
    ?? readWorkspaceFile(workspaceRoot, 'docs/runbooks/extreme-scale-incident.md');
  const securityLockdownRunbookSource =
    options.securityLockdownRunbookSource
    ?? readWorkspaceFile(workspaceRoot, 'docs/runbooks/security-lockdown-mode.md');
  const queryPlanReviewArtifactSource =
    options.queryPlanReviewArtifactSource
    ?? readWorkspaceFile(workspaceRoot, 'docs/validation/query-plan-review.md');
  const uploadControllerSources = options.uploadControllerSources ?? {
    'apps/api/src/modules/support/support.controller.ts': readWorkspaceFile(
      workspaceRoot,
      'apps/api/src/modules/support/support.controller.ts',
    ),
    'apps/api/src/modules/admissions/admissions.controller.ts': readWorkspaceFile(
      workspaceRoot,
      'apps/api/src/modules/admissions/admissions.controller.ts',
    ),
  };
  const checks = [
    checkFrontendModuleReadiness(moduleReadinessSource),
    checkStreamingUploadIngestion(uploadControllerSources),
    checkCoreApiLoadWorkloads(),
    checkQueryPlanReviewCoverage(),
    checkQueryPlanReviewArtifact(queryPlanReviewArtifactSource),
    checkSyntheticJourneyCoverage(options.syntheticJourneys ?? SYNTHETIC_JOURNEYS),
    checkAuditCoverageReview(
      workspaceRoot,
      options.auditCoverageRequirements ?? AUDIT_COVERAGE_REQUIREMENTS,
    ),
    checkReportExportQueueContract(),
    checkReportSnapshotManifestContract(),
    checkReleaseScripts(packageJsonSource),
    checkIncidentResponseRunbook(incidentRunbookSource),
    checkBackupRestoreRunbook(disasterRecoveryRunbookSource),
    checkImplementation7OperabilityArtifacts({
      packageJsonSource,
      providerCredentialSmokeTestSource,
      productionOperabilityWorkflowSource,
      productionMonitoringRunbookSource,
      pilotWorkflowChecklistSource,
      implementation7LiveValidationSource,
    }),
    checkImplementation11MaintainabilityArtifacts({
      packageJsonSource,
      productionOperabilityWorkflowSource,
      productionMonitoringRunbookSource,
      implementation11MaintainabilityScanSource,
    }),
    checkImplementation90ExtremeScaleArtifacts({
      packageJsonSource,
      productionOperabilityWorkflowSource,
      productionMonitoringRunbookSource,
      implementation90LoadProfileSource,
      implementation90LoadProfileArtifactSource,
      implementation90ArchitectureSource,
      extremeScaleRunbookSource,
      securityLockdownRunbookSource,
    }),
    checkImplementation300BlueprintCompliance({
      packageJsonSource,
      implementation300CertificationSource,
      implementation300CertificationArtifactSource,
    }),
  ];

  return {
    ok: checks.every((check) => check.status === 'pass'),
    checks,
  };
}

function checkImplementation7OperabilityArtifacts(input: {
  packageJsonSource: string;
  providerCredentialSmokeTestSource: string;
  productionOperabilityWorkflowSource: string;
  productionMonitoringRunbookSource: string;
  pilotWorkflowChecklistSource: string;
  implementation7LiveValidationSource: string;
}): ReleaseReadinessGateCheck {
  const packageJson = JSON.parse(input.packageJsonSource) as {
    scripts?: Record<string, string>;
  };
  const scripts = packageJson.scripts ?? {};
  const defaultTestScript = scripts.test ?? '';
  const details: string[] = [];

  for (const required of REQUIRED_IMPLEMENTATION7_PROVIDER_SMOKE_TEST_PATTERNS) {
    if (!required.pattern.test(input.providerCredentialSmokeTestSource)) {
      details.push(`Provider smoke tests must cover ${required.label}.`);
    }
  }

  for (const required of REQUIRED_OPERABILITY_WORKFLOW_PATTERNS) {
    if (!required.pattern.test(input.productionOperabilityWorkflowSource)) {
      details.push(`Production operability workflow must include ${required.label}.`);
    }
  }

  if (!defaultTestScript.includes('monitoring-service-account.service.test.js')) {
    details.push('Default npm test script must include monitoring-service-account.service.test.js.');
  }

  if (!scripts['monitor:create-service-account']) {
    details.push('Missing monitor:create-service-account script.');
  }

  if (!scripts['test:sms-relay'] || !scripts['test:malware-scanner']) {
    details.push('SMS relay and malware scanner service tests must be exposed as npm scripts.');
  }

  if (!/rotate monitor token|Rotation/i.test(input.productionMonitoringRunbookSource)) {
    details.push('Production monitoring runbook must document monitor token rotation.');
  }

  if (!/Platform owner creates school/i.test(input.pilotWorkflowChecklistSource)) {
    details.push('Pilot workflow checklist must include platform-owner school creation.');
  }

  if (!/Live SMS provider smoke|Live object storage smoke|Real pilot school workflow checklist/i.test(input.implementation7LiveValidationSource)) {
    details.push('Implementation 7 live validation document must track live provider and pilot workflow status.');
  }

  return buildCheck(
    'implementation7-operability-artifacts',
    details,
    'Implementation 7 provider, monitoring, workflow, and validation artifacts are present and covered by release gates.',
  );
}

function checkImplementation11MaintainabilityArtifacts(input: {
  packageJsonSource: string;
  productionOperabilityWorkflowSource: string;
  productionMonitoringRunbookSource: string;
  implementation11MaintainabilityScanSource: string;
}): ReleaseReadinessGateCheck {
  const packageJson = JSON.parse(input.packageJsonSource) as {
    scripts?: Record<string, string>;
  };
  const scripts = packageJson.scripts ?? {};
  const defaultTestScript = scripts.test ?? '';
  const details: string[] = [];

  if (!scripts['maintainability:scan']) {
    details.push('Missing npm script: maintainability:scan.');
  }

  if (!defaultTestScript.includes('maintainability-scan.test.js')) {
    details.push('Default npm test script must include maintainability-scan.test.js.');
  }

  if (!/maintainability:scan/i.test(input.productionOperabilityWorkflowSource)) {
    details.push('Production operability workflow must run the maintainability scan.');
  }

  if (!/maintainability gate|maintainability:scan/i.test(input.productionMonitoringRunbookSource)) {
    details.push('Production monitoring runbook must document the maintainability gate.');
  }

  if (!/Implementation 11 Maintainability Scan/i.test(input.implementation11MaintainabilityScanSource)) {
    details.push('docs/validation/implementation11-maintainability-scan.md must be generated.');
  }

  if (!/Status:\s*pass/i.test(input.implementation11MaintainabilityScanSource)) {
    details.push('Implementation 11 maintainability scan artifact must show Status: pass.');
  }

  return buildCheck(
    'implementation11-maintainability-artifacts',
    details,
    'Implementation 11 maintainability scan is scripted, tested, documented, and generated by CI.',
  );
}

function checkImplementation90ExtremeScaleArtifacts(input: {
  packageJsonSource: string;
  productionOperabilityWorkflowSource: string;
  productionMonitoringRunbookSource: string;
  implementation90LoadProfileSource: string;
  implementation90LoadProfileArtifactSource: string;
  implementation90ArchitectureSource: string;
  extremeScaleRunbookSource: string;
  securityLockdownRunbookSource: string;
}): ReleaseReadinessGateCheck {
  const packageJson = JSON.parse(input.packageJsonSource) as {
    scripts?: Record<string, string>;
  };
  const scripts = packageJson.scripts ?? {};
  const defaultTestScript = scripts.test ?? '';
  const ciFullScript = scripts['ci:full'] ?? '';
  const details: string[] = [];

  if (!scripts['implementation90:load-profile']) {
    details.push('Missing npm script: implementation90:load-profile.');
  }

  const fullReleaseGateScript = scripts['implementation90:full-release-gate'] ?? '';
  if (!fullReleaseGateScript) {
    details.push('Missing npm script: implementation90:full-release-gate.');
  }

  for (const command of REQUIRED_IMPLEMENTATION90_FULL_RELEASE_GATE_COMMANDS) {
    if (!fullReleaseGateScript.includes(command)) {
      details.push(`implementation90:full-release-gate must run ${command}.`);
    }
  }

  if (!defaultTestScript.includes('implementation90-load-profile.test.js')) {
    details.push('Default npm test script must include implementation90-load-profile.test.js.');
  }

  if (!ciFullScript.includes('npm run implementation90:load-profile')) {
    details.push('ci:full must run npm run implementation90:load-profile.');
  }

  if (!scripts['implementation300:certify']) {
    details.push('Missing npm script: implementation300:certify.');
  }

  if (!scripts['test:implementation300']) {
    details.push('Missing npm script: test:implementation300.');
  }

  if (!ciFullScript.includes('npm run implementation300:certify')) {
    details.push('ci:full must run npm run implementation300:certify.');
  }

  if (!/implementation90:load-profile/i.test(input.productionOperabilityWorkflowSource)) {
    details.push('Production operability workflow must run implementation90:load-profile.');
  }

  if (!/implementation90:load-profile/i.test(input.productionMonitoringRunbookSource)) {
    details.push('Production monitoring runbook must document implementation90:load-profile.');
  }

  if (!/IMPLEMENTATION90_TRAFFIC_PROFILE/.test(input.implementation90LoadProfileSource)) {
    details.push('apps/api/src/scripts/implementation90-load-profile.ts must define IMPLEMENTATION90_TRAFFIC_PROFILE.');
  }

  if (!/target_users_per_second:\s*5000/.test(input.implementation90LoadProfileSource)) {
    details.push('Implementation 90 load profile must target 5000+ users per second.');
  }

  if (!/validateImplementation90Budgets/.test(input.implementation90LoadProfileSource)) {
    details.push('Implementation 90 load profile must validate release budgets.');
  }

  if (!/runImplementation90LoadProfile/.test(input.implementation90LoadProfileSource)) {
    details.push('Implementation 90 load profile must expose runImplementation90LoadProfile.');
  }

  if (!/Status:\s*pass/i.test(input.implementation90LoadProfileArtifactSource)) {
    details.push('docs/validation/implementation90-load-profile.md must show Status: pass.');
  }

  if (!/Target users per second:\s*5000/i.test(input.implementation90LoadProfileArtifactSource)) {
    details.push('Implementation 90 generated artifact must show Target users per second: 5000.');
  }

  if (!/5000\+ users per second/i.test(input.implementation90ArchitectureSource)) {
    details.push('Implementation 90 architecture must document 5000+ users per second.');
  }

  if (!/breach-resistant/i.test(input.implementation90ArchitectureSource)) {
    details.push('Implementation 90 architecture must document the breach-resistant security model.');
  }

  if (!/reliability/i.test(input.implementation90ArchitectureSource) || !/maintainability/i.test(input.implementation90ArchitectureSource)) {
    details.push('Implementation 90 architecture must document reliability and maintainability.');
  }

  if (!/database saturation/i.test(input.extremeScaleRunbookSource)) {
    details.push('Extreme scale runbook must cover database saturation.');
  }

  if (!/Redis degradation/i.test(input.extremeScaleRunbookSource)) {
    details.push('Extreme scale runbook must cover Redis degradation.');
  }

  if (!/queue backlog/i.test(input.extremeScaleRunbookSource)) {
    details.push('Extreme scale runbook must cover queue backlog.');
  }

  if (!/lockdown mode/i.test(input.extremeScaleRunbookSource)) {
    details.push('Extreme scale runbook must hand off to security lockdown mode.');
  }

  if (!/Rotate suspected secrets/i.test(input.securityLockdownRunbookSource)) {
    details.push('Security lockdown runbook must cover rotating suspected secrets.');
  }

  if (!/Disable provider callbacks/i.test(input.securityLockdownRunbookSource)) {
    details.push('Security lockdown runbook must cover provider callback shutdown.');
  }

  if (!/Preserve audit logs/i.test(input.securityLockdownRunbookSource)) {
    details.push('Security lockdown runbook must cover preserving audit logs.');
  }

  return buildCheck(
    'implementation90-extreme-scale-artifacts',
    details,
    'Implementation 90 extreme-scale, security, reliability, workflow, and generated evidence are release-gated.',
  );
}

function checkImplementation300BlueprintCompliance(input: {
  packageJsonSource: string;
  implementation300CertificationSource: string;
  implementation300CertificationArtifactSource: string;
}): ReleaseReadinessGateCheck {
  const packageJson = JSON.parse(input.packageJsonSource) as {
    scripts?: Record<string, string>;
  };
  const scripts = packageJson.scripts ?? {};
  const details: string[] = [];
  const ciFullScript = scripts['ci:full'] ?? '';

  if (!scripts['implementation300:certify']) {
    details.push('Missing npm script: implementation300:certify.');
  }

  if (!scripts['test:implementation300']) {
    details.push('Missing npm script: test:implementation300.');
  }

  if (!ciFullScript.includes('npm run implementation300:certify')) {
    details.push('ci:full must run npm run implementation300:certify.');
  }

  if (!/runImplementation300Certification/.test(input.implementation300CertificationSource)) {
    details.push('apps/api/src/scripts/implementation300-certification.ts must expose runImplementation300Certification.');
  }

  if (!/renderImplementation300CertificationMarkdown/.test(input.implementation300CertificationSource)) {
    details.push('apps/api/src/scripts/implementation300-certification.ts must expose renderImplementation300CertificationMarkdown.');
  }

  if (!/Status:\s*pass/i.test(input.implementation300CertificationArtifactSource)) {
    details.push('docs/validation/implementation300-certification.md must show Status: pass.');
  }

  if (!/1000\+ schools/i.test(input.implementation300CertificationArtifactSource)) {
    details.push('Implementation 300 certification must show the 1000+ schools scale target.');
  }

  if (!/Blueprint Sections/i.test(input.implementation300CertificationArtifactSource)) {
    details.push('Implementation 300 certification must include Blueprint Sections.');
  }

  if (!/AI Insights/i.test(input.implementation300CertificationArtifactSource)) {
    details.push('Implementation 300 certification must include AI Insights.');
  }

  if (!/AI governance policy/i.test(input.implementation300CertificationArtifactSource)) {
    details.push('Implementation 300 certification must include the AI governance policy.');
  }

  if (!/Data protection policy/i.test(input.implementation300CertificationArtifactSource)) {
    details.push('Implementation 300 certification must include the Kenyan data protection policy.');
  }

  if (!/Automation policy/i.test(input.implementation300CertificationArtifactSource)) {
    details.push('Implementation 300 certification must include the automation policy.');
  }

  if (!/Integration policy/i.test(input.implementation300CertificationArtifactSource)) {
    details.push('Implementation 300 certification must include the integration policy.');
  }

  if (!/API category policy/i.test(input.implementation300CertificationArtifactSource)) {
    details.push('Implementation 300 certification must include the API category policy.');
  }

  if (!/Mobile app policy/i.test(input.implementation300CertificationArtifactSource)) {
    details.push('Implementation 300 certification must include the mobile app policy.');
  }

  if (!/Deployment topology policy/i.test(input.implementation300CertificationArtifactSource)) {
    details.push('Implementation 300 certification must include the deployment topology policy.');
  }

  if (!/Academic curriculum policy/i.test(input.implementation300CertificationArtifactSource)) {
    details.push('Implementation 300 certification must include the academic curriculum policy.');
  }

  if (!/KPI policy/i.test(input.implementation300CertificationArtifactSource)) {
    details.push('Implementation 300 certification must include the KPI policy.');
  }

  if (!/Tenant database policy/i.test(input.implementation300CertificationArtifactSource)) {
    details.push('Implementation 300 certification must include the tenant database policy.');
  }

  if (!/Audit monitoring policy/i.test(input.implementation300CertificationArtifactSource)) {
    details.push('Implementation 300 certification must include the audit monitoring policy.');
  }

  if (!/Role governance policy/i.test(input.implementation300CertificationArtifactSource)) {
    details.push('Implementation 300 certification must include the role governance policy.');
  }

  if (!/Development phase policy/i.test(input.implementation300CertificationArtifactSource)) {
    details.push('Implementation 300 certification must include the development phase policy.');
  }

  if (!/IoT and Smart Campus/i.test(input.implementation300CertificationArtifactSource)) {
    details.push('Implementation 300 certification must include IoT and Smart Campus.');
  }

  return buildCheck(
    'implementation300-blueprint-compliance',
    details,
    'Implementation 300 blueprint compliance is certified, generated, and release-gated.',
  );
}

function checkStreamingUploadIngestion(
  controllerSources: Record<string, string>,
): ReleaseReadinessGateCheck {
  const details: string[] = [];

  for (const [file, source] of Object.entries(controllerSources)) {
    if (/memoryStorage\s*\(/.test(source)) {
      details.push(`${file} must not use memoryStorage() for production upload ingestion.`);
    }

    if (!/StreamingUploadInterceptor/.test(source)) {
      details.push(`${file} must use StreamingUploadInterceptor for bounded upload ingestion.`);
    }
  }

  return buildCheck(
    'streaming-upload-ingestion',
    details,
    'Support and admissions uploads use bounded streaming ingestion instead of memoryStorage.',
  );
}

function checkFrontendModuleReadiness(source: string): ReleaseReadinessGateCheck {
  const details: string[] = [];
  const readyModules = new Set(extractStringSetFromTypeScriptSource(source, 'productionReadyModules'));
  const inactiveModules = new Set(extractStringSetFromTypeScriptSource(source, 'inactiveModules'));

  for (const moduleId of REQUIRED_READY_MODULES) {
    if (!readyModules.has(moduleId)) {
      details.push(`${moduleId} must be present in productionReadyModules.`);
    }
  }

  for (const moduleId of REQUIRED_INACTIVE_MODULES) {
    if (!inactiveModules.has(moduleId)) {
      details.push(`${moduleId} must stay in inactiveModules until backend readiness is complete.`);
    }
  }

  if (readyModules.has('attendance')) {
    details.push('attendance must stay retired and cannot be production-ready.');
  }

  if (inactiveModules.has('exams')) {
    details.push('exams must remain active now that the exams workspace is implemented.');
  }

  for (const moduleId of readyModules) {
    if (inactiveModules.has(moduleId)) {
      details.push(`${moduleId} cannot be both production-ready and inactive.`);
    }
  }

  return buildCheck(
    'frontend-module-readiness',
    details,
    'Frontend module readiness keeps exams active and attendance retired.',
  );
}

function checkCoreApiLoadWorkloads(): ReleaseReadinessGateCheck {
  const details = validateCoreApiLoadWorkloads(CORE_API_LOAD_WORKLOADS);
  const workloadIds = new Set(CORE_API_LOAD_WORKLOADS.map((workload) => workload.id));

  for (const workloadId of REQUIRED_CORE_API_WORKLOADS) {
    if (!workloadIds.has(workloadId)) {
      details.push(`Core API load probe must cover ${workloadId}.`);
    }
  }

  return buildCheck(
    'core-api-load-workloads',
    details,
    'Core API load workloads are read-only, active-module only, and cover release-critical paths.',
  );
}

function checkQueryPlanReviewCoverage(): ReleaseReadinessGateCheck {
  const details = validateQueryPlanReviews(QUERY_PLAN_REVIEWS);
  const reviewIds = new Set(QUERY_PLAN_REVIEWS.map((review) => review.id));

  for (const reviewId of REQUIRED_QUERY_PLAN_REVIEWS) {
    if (!reviewIds.has(reviewId)) {
      details.push(`Query plan review must cover ${reviewId}.`);
    }
  }

  return buildCheck(
    'query-plan-review-coverage',
    details,
    'Query plan reviews cover active search hotspots and exclude retired attendance surfaces.',
  );
}

function checkQueryPlanReviewArtifact(source: string): ReleaseReadinessGateCheck {
  const details: string[] = [];

  if (!/# Query Plan Review/i.test(source)) {
    details.push('docs/validation/query-plan-review.md must be generated.');
  }

  if (!/Status:\s*pass/i.test(source)) {
    details.push('Query-plan review artifact must show Status: pass.');
  }

  for (const reviewId of ['students-directory-search', 'library-catalog-search', 'support-ticket-search']) {
    if (!source.includes(reviewId)) {
      details.push(`Query-plan review artifact must include ${reviewId}.`);
    }
  }

  if (/Sequential scan on protected table/i.test(source)) {
    details.push('Query-plan review artifact must not include protected table sequential-scan warnings.');
  }

  return buildCheck(
    'query-plan-review-artifact',
    details,
    'Query-plan review artifact is generated, passing, and includes protected search hotspots.',
  );
}

function checkSyntheticJourneyCoverage(
  journeys: readonly SyntheticJourney[],
): ReleaseReadinessGateCheck {
  const details = validateSyntheticJourneys(journeys);
  const journeyIds = new Set(journeys.map((journey) => journey.id));

  for (const journeyId of REQUIRED_SYNTHETIC_JOURNEYS) {
    if (!journeyIds.has(journeyId)) {
      details.push(`Synthetic journey monitor must cover ${journeyId}.`);
    }
  }

  return buildCheck(
    'synthetic-journey-coverage',
    details,
    'Synthetic journeys are read-only, active-module only, and cover public readiness, tenant operations, report artifacts, and Exams.',
  );
}

function checkAuditCoverageReview(
  workspaceRoot: string,
  requirements: readonly AuditCoverageRequirement[],
): ReleaseReadinessGateCheck {
  const review = runAuditCoverageReview({
    requirements,
    workspaceRoot,
  });
  const details = [
    ...review.validationErrors,
    ...review.results.flatMap((result) =>
      result.missing.map((missing) =>
        `${result.id} missing ${missing.pattern} in ${missing.file}.`,
      ),
    ),
  ];

  return buildCheck(
    'audit-coverage-review',
    details,
    'Audit coverage review verifies active-module audit/event evidence and excludes retired attendance surfaces.',
  );
}

function checkReportExportQueueContract(): ReleaseReadinessGateCheck {
  const details: string[] = [];
  const attendanceErrors = validateReportExportJobPayload({
    tenant_id: 'tenant-1',
    requested_by_user_id: 'user-1',
    request_id: 'release-gate',
    module: 'attendance',
    report_id: 'daily-attendance',
    format: 'csv',
    enqueued_at: '2026-05-14T00:00:00.000Z',
  });
  const examsErrors = validateReportExportJobPayload({
    tenant_id: 'tenant-1',
    requested_by_user_id: 'user-1',
    request_id: 'release-gate',
    module: 'exams',
    report_id: 'exam-results',
    format: 'csv',
    enqueued_at: '2026-05-14T00:00:00.000Z',
  });

  if (!attendanceErrors.some((error) => /attendance exports are retired/i.test(error))) {
    details.push('Report export jobs must reject retired attendance exports.');
  }

  if (examsErrors.length > 0) {
    details.push(`Report export jobs must allow active exams exports: ${examsErrors.join('; ')}`);
  }

  if (!shouldQueueReportExport({ estimated_rows: DEFAULT_SYNC_EXPORT_ROW_LIMIT + 1 })) {
    details.push('Large report exports must be eligible for queue-backed processing.');
  }

  return buildCheck(
    'report-export-queue-contract',
    details,
    'Report export queue contract supports large active-module exports and blocks attendance.',
  );
}

function checkReportSnapshotManifestContract(): ReleaseReadinessGateCheck {
  const details: string[] = [];
  const attendanceErrors = validateReportSnapshotManifestInput({
    tenantId: 'tenant-1',
    module: 'attendance',
    reportId: 'daily-attendance',
    title: 'Daily attendance',
    format: 'csv',
    artifact: {
      filename: 'attendance.csv',
      contentType: 'text/csv',
      rowCount: 1,
      checksumSha256: 'a'.repeat(64),
      generatedAt: '2026-05-14T00:00:00.000Z',
    },
  });
  const examsErrors = validateReportSnapshotManifestInput({
    tenantId: 'tenant-1',
    module: 'exams',
    reportId: 'exam-results',
    title: 'Exam results',
    format: 'csv',
    artifact: {
      filename: 'exam-results.csv',
      contentType: 'text/csv',
      rowCount: 1,
      checksumSha256: 'b'.repeat(64),
      generatedAt: '2026-05-14T00:00:00.000Z',
    },
  });

  if (!attendanceErrors.some((error) => /attendance report snapshots are retired/i.test(error))) {
    details.push('Report snapshot manifests must reject retired attendance snapshots.');
  }

  if (examsErrors.length > 0) {
    details.push(`Report snapshot manifests must allow active exams snapshots: ${examsErrors.join('; ')}`);
  }

  const snapshot = createReportSnapshotManifest({
    tenantId: 'tenant-1',
    module: 'inventory',
    reportId: 'stock-valuation',
    title: 'Stock valuation',
    format: 'csv',
    artifact: {
      filename: 'inventory-stock-valuation.csv',
      contentType: 'text/csv',
      rowCount: 1,
      checksumSha256: 'c'.repeat(64),
      generatedAt: '2026-05-14T00:00:00.000Z',
    },
  });

  if (!/^[a-f0-9]{64}$/.test(snapshot.manifest_checksum_sha256)) {
    details.push('Report snapshot manifests must include a manifest checksum.');
  }

  return buildCheck(
    'report-snapshot-manifest-contract',
    details,
    'Report snapshot manifest contract creates checksummed active-module snapshots and blocks attendance.',
  );
}

function checkReleaseScripts(packageJsonSource: string): ReleaseReadinessGateCheck {
  const packageJson = JSON.parse(packageJsonSource) as {
    scripts?: Record<string, string>;
  };
  const scripts = packageJson.scripts ?? {};
  const details: string[] = [];

  for (const scriptName of REQUIRED_NPM_SCRIPTS) {
    if (!scripts[scriptName]) {
      details.push(`Missing npm script: ${scriptName}.`);
    }
  }

  const defaultTestScript = scripts.test ?? '';
  for (const artifact of REQUIRED_DEFAULT_TEST_ARTIFACTS) {
    if (!defaultTestScript.includes(artifact)) {
      details.push(`Default npm test script must include ${artifact}.`);
    }
  }

  return buildCheck(
    'release-scripts',
    details,
    'Release scripts include readiness, production env audit, production auth smoke, load, query-plan, provider-smoke, Implementation 90, route-permission, export-queue, and report-snapshot checks.',
  );
}

function checkIncidentResponseRunbook(source: string): ReleaseReadinessGateCheck {
  const details = REQUIRED_INCIDENT_RUNBOOK_SECTIONS
    .filter((requiredSection) => !requiredSection.pattern.test(source))
    .map((requiredSection) => `Incident response runbook must include ${requiredSection.label}.`);

  return buildCheck(
    'incident-response-runbook',
    details,
    'Incident response runbook covers detection, support status, provider smoke checks, dead letters, communications, rollback, exams, and retired attendance handling.',
  );
}

function checkBackupRestoreRunbook(source: string): ReleaseReadinessGateCheck {
  const details = REQUIRED_BACKUP_RESTORE_RUNBOOK_SECTIONS
    .filter((requiredSection) => !requiredSection.pattern.test(source))
    .map((requiredSection) => `Backup/restore drill runbook must include ${requiredSection.label}.`);

  return buildCheck(
    'backup-restore-runbook',
    details,
    'Backup/restore drill runbook covers integrity, disaster recovery, RTO/RPO, sandbox safety, tenant digests, checksums, exams, and retired attendance handling.',
  );
}

function buildCheck(
  id: string,
  details: string[],
  successMessage: string,
): ReleaseReadinessGateCheck {
  return {
    id,
    status: details.length === 0 ? 'pass' : 'fail',
    message: details.length === 0 ? successMessage : details.join(' '),
    details,
  };
}

function extractStringSetFromTypeScriptSource(source: string, variableName: string): string[] {
  const sourceFile = ts.createSourceFile(
    `${variableName}.ts`,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  let values: string[] | null = null;

  function visit(node: ts.Node): void {
    if (
      ts.isVariableDeclaration(node)
      && ts.isIdentifier(node.name)
      && node.name.text === variableName
      && node.initializer
    ) {
      values = extractStringArrayFromNewSet(node.initializer);
      return;
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);

  if (!values) {
    throw new Error(`Could not find ${variableName} string Set in module readiness source.`);
  }

  return values;
}

function extractStringArrayFromNewSet(initializer: ts.Expression): string[] | null {
  if (!ts.isNewExpression(initializer) || initializer.expression.getText() !== 'Set') {
    return null;
  }

  const firstArgument = initializer.arguments?.[0];
  if (!firstArgument || !ts.isArrayLiteralExpression(firstArgument)) {
    return null;
  }

  return firstArgument.elements.flatMap((element) => {
    if (ts.isStringLiteral(element) || ts.isNoSubstitutionTemplateLiteral(element)) {
      return [element.text];
    }

    return [];
  });
}

function readWorkspaceFile(workspaceRoot: string, relativePath: string): string {
  return readFileSync(join(workspaceRoot, relativePath), 'utf8');
}

function main(): void {
  const result = runReleaseReadinessGate();

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
