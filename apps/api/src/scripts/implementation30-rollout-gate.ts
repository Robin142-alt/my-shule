import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

import { writeArtifactFileSync } from './artifact-writer';

export type Implementation30RolloutGateStatus = 'pass' | 'fail' | 'blocked';
export type Implementation30MpesaMode = 'none' | 'sandbox' | 'production';

export interface Implementation30RolloutExitMetrics {
  crossTenantAccessIncidents: number;
  unverifiedMpesaLedgerPostings: number;
  rawPiiLeaks: number;
  callbackAcknowledgementRate: number;
  reconciliationBacklogResolvedDaily: boolean;
  reportCardSloMet: boolean;
  parentPortalIsolationVerified: boolean;
  supportPiiAccessAudited: boolean;
}

export interface Implementation30RolloutPhaseEvidence {
  phase: number;
  schoolCount: number;
  studentsPerSchool?: number;
  anonymizedData?: boolean;
  mpesaMode?: Implementation30MpesaMode;
  manualFinanceVerification?: boolean;
  lowRiskFeeCategoriesOnly?: boolean;
  reportCardsEnabled?: boolean;
  parentPortalEnabled?: boolean;
  supportRunbooksRehearsed?: boolean;
  loadAndIncidentDrillsPassed?: boolean;
  backupRestorePassed?: boolean;
  reconciliationSloPassed?: boolean;
  sloEvidenceDays?: number;
  metrics?: Implementation30RolloutExitMetrics;
  evidenceRefs?: string[];
}

export interface Implementation30RolloutGateOptions {
  workspaceRoot?: string;
  generatedAt?: string;
  sourceOverrides?: Record<string, string>;
  phaseEvidence?: Implementation30RolloutPhaseEvidence[];
  outputPath?: string;
}

export interface Implementation30RolloutCheckResult {
  id: string;
  label: string;
  status: 'pass' | 'fail';
  details?: string;
}

export interface Implementation30RolloutPhaseResult {
  phase: number;
  evidence_id: string;
  title: string;
  status: 'pass' | 'blocked';
  checks: Implementation30RolloutCheckResult[];
  evidence_refs: string[];
}

export interface Implementation30RolloutGateResult {
  generated_at: string;
  technical_ready: boolean;
  rollout_complete: boolean;
  ok: boolean;
  technical_checks: Implementation30RolloutCheckResult[];
  phases: Implementation30RolloutPhaseResult[];
  notes: string[];
}

interface TechnicalGate {
  id: string;
  label: string;
  file: string;
  pattern: RegExp;
}

interface PhaseGate {
  phase: number;
  title: string;
  minSchools: number;
  requiredMpesaMode?: Implementation30MpesaMode;
  checks: Array<{
    id: string;
    label: string;
    validate: (evidence: Implementation30RolloutPhaseEvidence) => boolean;
    details: (evidence: Implementation30RolloutPhaseEvidence) => string;
  }>;
}

const TECHNICAL_GATES: TechnicalGate[] = [
  {
    id: 'implementation30-certification',
    label: 'Implementation 30 certification has passed',
    file: 'docs/validation/implementation30-certification.md',
    pattern: /Status:\s*pass/i,
  },
  {
    id: 'implementation30-load-profile',
    label: 'Load profile covers 1000 schools and 500 students per school',
    file: 'docs/validation/implementation30-load-profile.md',
    pattern: /Status:\s*pass[\s\S]+Schools:\s*1000[\s\S]+Students per school:\s*500/i,
  },
  {
    id: 'tenant-isolation-audit',
    label: 'Tenant isolation audit has passed with forced RLS evidence',
    file: 'docs/security/implementation10-security-audit.md',
    pattern: /Status:\s*pass[\s\S]+(?:all-tenant-tables-forced-rls|All statically declared tenant tables enforce forced row level security)/i,
  },
  {
    id: 'backup-restore-evidence',
    label: 'Backup restore evidence covers encrypted database and object storage recovery',
    file: 'docs/validation/backup-restore-evidence.md',
    pattern: /encrypted database[\s\S]+object-storage[\s\S]+RTO\/RPO/i,
  },
];

const PHASE_GATES: PhaseGate[] = [
  phaseGate(1, 'Sandbox with 3 internal demo schools and anonymized data', 3, 'sandbox', [
    booleanCheck('anonymized-data', 'Pilot data is anonymized', (evidence) => evidence.anonymizedData === true),
  ]),
  phaseGate(2, '5 real pilot schools with M-Pesa sandbox and manual finance verification', 5, 'sandbox', [
    booleanCheck('manual-finance-verification', 'Manual finance verification is active', (evidence) => evidence.manualFinanceVerification === true),
  ]),
  phaseGate(3, '10 real pilot schools with production M-Pesa for low-risk fee categories', 10, 'production', [
    booleanCheck('low-risk-fee-categories', 'Production M-Pesa is limited to low-risk fee categories', (evidence) => evidence.lowRiskFeeCategoriesOnly === true),
  ]),
  phaseGate(4, '50 schools with production M-Pesa, report cards, parent portal, and runbooks', 50, 'production', [
    booleanCheck('report-cards-enabled', 'Report cards are enabled', (evidence) => evidence.reportCardsEnabled === true),
    booleanCheck('parent-portal-enabled', 'Parent portal is enabled', (evidence) => evidence.parentPortalEnabled === true),
    booleanCheck('support-runbooks-rehearsed', 'Support runbooks are rehearsed', (evidence) => evidence.supportRunbooksRehearsed === true),
  ]),
  phaseGate(5, '250 schools after load and incident drills pass', 250, 'production', [
    booleanCheck('load-and-incident-drills', 'Load and incident drills have passed', (evidence) => evidence.loadAndIncidentDrillsPassed === true),
  ]),
  phaseGate(6, '1000+ schools after backup, reconciliation, and 30-day SLO evidence', 1000, 'production', [
    booleanCheck('backup-restore-passed', 'Backup restore has passed for rollout scope', (evidence) => evidence.backupRestorePassed === true),
    booleanCheck('reconciliation-slo-passed', 'Reconciliation SLO has passed', (evidence) => evidence.reconciliationSloPassed === true),
    {
      id: 'thirty-day-slo-evidence',
      label: 'SLO evidence covers at least 30 days',
      validate: (evidence) => Number(evidence.sloEvidenceDays ?? 0) >= 30,
      details: (evidence) => `${evidence.sloEvidenceDays ?? 0} days recorded`,
    },
  ]),
];

export function runImplementation30RolloutGate(
  options: Implementation30RolloutGateOptions = {},
): Implementation30RolloutGateResult {
  const workspaceRoot = options.workspaceRoot ?? process.cwd();
  const technicalChecks = TECHNICAL_GATES.map((gate) => {
    const source = readSource(workspaceRoot, gate.file, options.sourceOverrides);
    const passed = gate.pattern.test(source);

    return {
      id: gate.id,
      label: gate.label,
      status: passed ? 'pass' as const : 'fail' as const,
      details: passed ? gate.file : `${gate.file} is missing required passing evidence`,
    };
  });

  const evidenceByPhase = new Map(
    (options.phaseEvidence ?? []).map((evidence) => [evidence.phase, evidence]),
  );

  const phases = PHASE_GATES.map((gate) => evaluatePhase(gate, evidenceByPhase.get(gate.phase)));
  const technicalReady = technicalChecks.every((check) => check.status === 'pass');
  const rolloutComplete = technicalReady && phases.every((phase) => phase.status === 'pass');

  return {
    generated_at: options.generatedAt ?? new Date().toISOString(),
    technical_ready: technicalReady,
    rollout_complete: rolloutComplete,
    ok: rolloutComplete,
    technical_checks: technicalChecks,
    phases,
    notes: buildNotes(technicalReady, phases),
  };
}

export function renderImplementation30RolloutGateMarkdown(
  result: Implementation30RolloutGateResult,
): string {
  const lines = [
    '# Implementation 30 Pilot Rollout Gate',
    '',
    `Generated at: ${result.generated_at}`,
    '',
    `Technical readiness: ${result.technical_ready ? 'pass' : 'fail'}`,
    '',
    `Rollout complete: ${result.rollout_complete ? 'pass' : 'blocked'}`,
    '',
    '| Gate | Status | Details |',
    '| --- | --- | --- |',
  ];

  for (const check of result.technical_checks) {
    lines.push(`| ${escapeTable(check.label)} | ${check.status} | ${escapeTable(check.details ?? '')} |`);
  }

  lines.push('', '| Evidence ID | Phase | Status | Checks | Evidence refs |');
  lines.push('| --- | --- | --- | --- | --- |');

  for (const phase of result.phases) {
    const checks = phase.checks
      .map((check) => `${check.status}: ${check.label}`)
      .join('; ');
    const refs = phase.evidence_refs.length > 0 ? phase.evidence_refs.join(', ') : 'none';
    lines.push(
      `| ${phase.evidence_id} | Phase ${phase.phase}: ${escapeTable(phase.title)} | ${phase.status} | ${escapeTable(checks)} | ${escapeTable(refs)} |`,
    );
  }

  lines.push('', '## Notes', '');
  for (const note of result.notes) {
    lines.push(`- ${note}`);
  }

  lines.push('');
  return `${lines.join('\n')}\n`;
}

export function writeImplementation30RolloutGateArtifact(
  result: Implementation30RolloutGateResult,
  outputPath: string,
): void {
  mkdirSync(dirname(outputPath), { recursive: true });
  writeArtifactFileSync(outputPath, renderImplementation30RolloutGateMarkdown(result));
}

export function loadImplementation30RolloutEvidenceFromFile(
  filePath: string,
): Implementation30RolloutPhaseEvidence[] {
  const parsed = JSON.parse(readFileSync(filePath, 'utf8')) as
    | Implementation30RolloutPhaseEvidence[]
    | { phases?: Implementation30RolloutPhaseEvidence[] };

  if (Array.isArray(parsed)) {
    return parsed;
  }

  return Array.isArray(parsed.phases) ? parsed.phases : [];
}

function evaluatePhase(
  gate: PhaseGate,
  evidence: Implementation30RolloutPhaseEvidence | undefined,
): Implementation30RolloutPhaseResult {
  const checks: Implementation30RolloutCheckResult[] = [
    {
      id: 'live-evidence-present',
      label: 'Live phase evidence is attached',
      status: evidence ? 'pass' : 'fail',
      details: evidence ? 'phase evidence loaded' : 'no phase evidence loaded',
    },
  ];

  if (evidence) {
    checks.push(
      {
        id: 'minimum-school-count',
        label: `At least ${gate.minSchools} schools are included`,
        status: evidence.schoolCount >= gate.minSchools ? 'pass' : 'fail',
        details: `${evidence.schoolCount} schools recorded`,
      },
      {
        id: 'student-scale',
        label: 'Schools are validated at 500+ students per school',
        status: Number(evidence.studentsPerSchool ?? 0) >= 500 ? 'pass' : 'fail',
        details: `${evidence.studentsPerSchool ?? 0} students per school recorded`,
      },
    );

    if (gate.requiredMpesaMode) {
      checks.push({
        id: 'mpesa-mode',
        label: `M-Pesa mode is ${gate.requiredMpesaMode}`,
        status: evidence.mpesaMode === gate.requiredMpesaMode ? 'pass' : 'fail',
        details: `${evidence.mpesaMode ?? 'none'} recorded`,
      });
    }

    checks.push(...gate.checks.map((check) => ({
      id: check.id,
      label: check.label,
      status: check.validate(evidence) ? 'pass' as const : 'fail' as const,
      details: check.details(evidence),
    })));

    checks.push(...evaluateExitMetrics(evidence.metrics));
  }

  return {
    phase: gate.phase,
    evidence_id: `IMPLEMENTATION30-ROLLOUT-PHASE-${gate.phase}`,
    title: gate.title,
    status: checks.every((check) => check.status === 'pass') ? 'pass' : 'blocked',
    checks,
    evidence_refs: sanitizeEvidenceRefs(evidence?.evidenceRefs ?? []),
  };
}

function evaluateExitMetrics(
  metrics: Implementation30RolloutExitMetrics | undefined,
): Implementation30RolloutCheckResult[] {
  if (!metrics) {
    return [
      {
        id: 'exit-metrics-present',
        label: 'Exit metrics are attached',
        status: 'fail',
        details: 'no exit metrics recorded',
      },
    ];
  }

  return [
    numericZeroCheck('zero-cross-tenant-incidents', '0 cross-tenant access incidents', metrics.crossTenantAccessIncidents),
    numericZeroCheck('zero-unverified-mpesa-postings', '0 unverified M-Pesa ledger postings', metrics.unverifiedMpesaLedgerPostings),
    numericZeroCheck('zero-raw-pii-leaks', '0 raw PII leaks in logs or exports', metrics.rawPiiLeaks),
    {
      id: 'callback-ack-rate',
      label: 'Callback acknowledgement rate is at least 99.9%',
      status: metrics.callbackAcknowledgementRate >= 99.9 ? 'pass' : 'fail',
      details: `${metrics.callbackAcknowledgementRate}% recorded`,
    },
    booleanMetricCheck('reconciliation-backlog', 'Reconciliation mismatch backlog resolves daily', metrics.reconciliationBacklogResolvedDaily),
    booleanMetricCheck('report-card-slo', 'Report-card generation SLO is met', metrics.reportCardSloMet),
    booleanMetricCheck('parent-portal-isolation', 'Parent portal access isolation is verified', metrics.parentPortalIsolationVerified),
    booleanMetricCheck('support-pii-access-audited', 'Support/admin PII access is audited', metrics.supportPiiAccessAudited),
  ];
}

function numericZeroCheck(
  id: string,
  label: string,
  value: number,
): Implementation30RolloutCheckResult {
  return {
    id,
    label,
    status: value === 0 ? 'pass' : 'fail',
    details: `${value} recorded`,
  };
}

function booleanMetricCheck(
  id: string,
  label: string,
  value: boolean,
): Implementation30RolloutCheckResult {
  return {
    id,
    label,
    status: value === true ? 'pass' : 'fail',
    details: value ? 'true' : 'false',
  };
}

function phaseGate(
  phase: number,
  title: string,
  minSchools: number,
  requiredMpesaMode: Implementation30MpesaMode | undefined,
  checks: PhaseGate['checks'],
): PhaseGate {
  return { phase, title, minSchools, requiredMpesaMode, checks };
}

function booleanCheck(
  id: string,
  label: string,
  validate: (evidence: Implementation30RolloutPhaseEvidence) => boolean,
): PhaseGate['checks'][number] {
  return {
    id,
    label,
    validate,
    details: (evidence) => String(validate(evidence)),
  };
}

function buildNotes(
  technicalReady: boolean,
  phases: Implementation30RolloutPhaseResult[],
): string[] {
  const notes = [
    'This gate never marks pilot rollout phases complete from source code alone.',
    'Live phase evidence must be provided as sanitized rollout evidence before each phase can pass.',
  ];

  if (!technicalReady) {
    notes.push('Technical readiness evidence is missing or stale; do not start a live pilot phase.');
  }

  if (phases.some((phase) => phase.status === 'blocked')) {
    notes.push('One or more live phases are blocked until school-count, payment, report-card, SLO, and zero-incident evidence is attached.');
  }

  return notes;
}

function sanitizeEvidenceRefs(refs: string[]): string[] {
  return refs
    .map((ref) => ref.trim())
    .filter((ref) => ref.length > 0)
    .filter((ref) => !/(secret|token|password|passkey|consumer[_-]?key|api[_-]?key|otp)/i.test(ref))
    .filter((ref) => /^(https?:\/\/|docs\/|artifact:|run:)/i.test(ref));
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

function escapeTable(value: string): string {
  return value.replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
}

if (require.main === module) {
  const workspaceRoot = process.cwd();
  const evidencePath = process.env.IMPLEMENTATION30_ROLLOUT_EVIDENCE_PATH;
  const phaseEvidence = evidencePath?.trim()
    ? loadImplementation30RolloutEvidenceFromFile(evidencePath)
    : [];
  const result = runImplementation30RolloutGate({ workspaceRoot, phaseEvidence });
  const outputPath = join(workspaceRoot, 'docs', 'validation', 'implementation30-rollout-gate.md');

  writeImplementation30RolloutGateArtifact(result, outputPath);

  console.log(`Implementation 30 rollout gate artifact written to ${outputPath}`);
  console.log(`Implementation 30 rollout gate technical readiness: ${result.technical_ready ? 'pass' : 'fail'}`);
  console.log(`Implementation 30 rollout complete: ${result.rollout_complete ? 'pass' : 'blocked'}`);

  if (!result.technical_ready || (process.env.IMPLEMENTATION30_ROLLOUT_REQUIRE_COMPLETE === 'true' && !result.ok)) {
    process.exitCode = 1;
  }
}
