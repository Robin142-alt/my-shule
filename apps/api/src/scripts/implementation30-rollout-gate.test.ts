import assert from 'node:assert/strict';
import test from 'node:test';

import {
  renderImplementation30RolloutGateMarkdown,
  runImplementation30RolloutGate,
  type Implementation30RolloutPhaseEvidence,
} from './implementation30-rollout-gate';

test('Implementation 30 rollout gate blocks live phases without pilot evidence while technical gates are ready', () => {
  const result = runImplementation30RolloutGate({
    generatedAt: '2026-05-20T00:00:00.000Z',
    sourceOverrides: buildTechnicalGateSources(),
    phaseEvidence: [],
  });

  assert.equal(result.technical_ready, true);
  assert.equal(result.rollout_complete, false);
  assert.equal(result.ok, false);
  assert.equal(result.phases.length, 6);
  assert.equal(result.phases.every((phase) => phase.status === 'blocked'), true);
  assert.match(result.notes.join('\n'), /live phase evidence/i);
});

test('Implementation 30 rollout gate passes all phases only with zero critical incidents and required 30-day evidence', () => {
  const result = runImplementation30RolloutGate({
    generatedAt: '2026-05-20T00:00:00.000Z',
    sourceOverrides: buildTechnicalGateSources(),
    phaseEvidence: buildCompletePhaseEvidence(),
  });

  assert.equal(result.technical_ready, true);
  assert.equal(result.rollout_complete, true);
  assert.equal(result.ok, true);
  assert.equal(result.phases.every((phase) => phase.status === 'pass'), true);
});

test('Implementation 30 rollout gate blocks a phase with payment or callback safety regressions', () => {
  const evidence = buildCompletePhaseEvidence();
  const phaseTwoMetrics = evidence[1].metrics;

  assert.ok(phaseTwoMetrics);
  evidence[1] = {
    ...evidence[1],
    metrics: {
      ...phaseTwoMetrics,
      unverifiedMpesaLedgerPostings: 1,
      callbackAcknowledgementRate: 99.4,
    },
  };

  const result = runImplementation30RolloutGate({
    generatedAt: '2026-05-20T00:00:00.000Z',
    sourceOverrides: buildTechnicalGateSources(),
    phaseEvidence: evidence,
  });

  const phaseTwo = result.phases.find((phase) => phase.phase === 2);
  assert.equal(result.ok, false);
  assert.equal(phaseTwo?.status, 'blocked');
  assert.match(phaseTwo?.checks.map((check) => `${check.id}:${check.status}`).join('\n') ?? '', /zero-unverified-mpesa-postings:fail/);
  assert.match(phaseTwo?.checks.map((check) => `${check.id}:${check.status}`).join('\n') ?? '', /callback-ack-rate:fail/);
});

test('Implementation 30 rollout gate markdown records blocked live phases without leaking secrets', () => {
  const result = runImplementation30RolloutGate({
    generatedAt: '2026-05-20T00:00:00.000Z',
    sourceOverrides: buildTechnicalGateSources(),
    phaseEvidence: [
      {
        ...buildCompletePhaseEvidence()[0],
        evidenceRefs: ['pilot-token-secret-123', 'https://safe.example/evidence/phase-1'],
      },
    ],
  });

  const markdown = renderImplementation30RolloutGateMarkdown(result);

  assert.match(markdown, /Implementation 30 Pilot Rollout Gate/);
  assert.match(markdown, /Phase 1/);
  assert.match(markdown, /Phase 6/);
  assert.equal(markdown.includes('pilot-token-secret-123'), false);
  assert.match(markdown, /safe.example\/evidence\/phase-1/);
});

function buildTechnicalGateSources(): Record<string, string> {
  return {
    'docs/validation/implementation30-certification.md': '# Implementation 30 Certification\n\nStatus: pass',
    'docs/validation/implementation30-load-profile.md': '# Implementation 30 Load Profile\n\nStatus: pass\n\nSchools: 1000\nStudents per school: 500',
    'docs/security/implementation10-security-audit.md': '# Tenant Isolation Audit\n\nStatus: pass\n\nAll statically declared tenant tables enforce forced row level security',
    'docs/validation/backup-restore-evidence.md': '# Backup Restore Evidence\n\nStatus: pass\nEncrypted database restore proof\nObject-storage metadata restore proof\nRTO/RPO',
  };
}

function buildCompletePhaseEvidence(): Implementation30RolloutPhaseEvidence[] {
  const commonMetrics = {
    crossTenantAccessIncidents: 0,
    unverifiedMpesaLedgerPostings: 0,
    rawPiiLeaks: 0,
    callbackAcknowledgementRate: 99.95,
    reconciliationBacklogResolvedDaily: true,
    reportCardSloMet: true,
    parentPortalIsolationVerified: true,
    supportPiiAccessAudited: true,
  };

  return [
    {
      phase: 1,
      schoolCount: 3,
      studentsPerSchool: 500,
      anonymizedData: true,
      mpesaMode: 'sandbox',
      metrics: commonMetrics,
      evidenceRefs: ['https://safe.example/evidence/phase-1'],
    },
    {
      phase: 2,
      schoolCount: 5,
      studentsPerSchool: 500,
      mpesaMode: 'sandbox',
      manualFinanceVerification: true,
      metrics: commonMetrics,
      evidenceRefs: ['https://safe.example/evidence/phase-2'],
    },
    {
      phase: 3,
      schoolCount: 10,
      studentsPerSchool: 500,
      mpesaMode: 'production',
      lowRiskFeeCategoriesOnly: true,
      metrics: commonMetrics,
      evidenceRefs: ['https://safe.example/evidence/phase-3'],
    },
    {
      phase: 4,
      schoolCount: 50,
      studentsPerSchool: 500,
      mpesaMode: 'production',
      reportCardsEnabled: true,
      parentPortalEnabled: true,
      supportRunbooksRehearsed: true,
      metrics: commonMetrics,
      evidenceRefs: ['https://safe.example/evidence/phase-4'],
    },
    {
      phase: 5,
      schoolCount: 250,
      studentsPerSchool: 500,
      mpesaMode: 'production',
      loadAndIncidentDrillsPassed: true,
      metrics: commonMetrics,
      evidenceRefs: ['https://safe.example/evidence/phase-5'],
    },
    {
      phase: 6,
      schoolCount: 1000,
      studentsPerSchool: 500,
      mpesaMode: 'production',
      backupRestorePassed: true,
      reconciliationSloPassed: true,
      sloEvidenceDays: 30,
      metrics: commonMetrics,
      evidenceRefs: ['https://safe.example/evidence/phase-6'],
    },
  ];
}
