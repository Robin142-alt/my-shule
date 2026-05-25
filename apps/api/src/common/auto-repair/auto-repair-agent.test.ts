import assert from 'node:assert/strict';
import test from 'node:test';

import {
  repairMyShuleSnapshot,
  requiredRepairWidgetStates,
  type AutoRepairSystemSnapshot,
} from './auto-repair-agent';

function snapshot(overrides: Partial<AutoRepairSystemSnapshot> = {}): AutoRepairSystemSnapshot {
  return {
    tenant: {
      tenantId: 'tenant-a',
      lifecycleState: 'ACTIVE',
    },
    moduleAssignments: {
      exams: 'DISABLED',
      finance: 'ENABLED',
    },
    capabilityMap: {
      'exams:review': true,
      'finance:read': true,
    },
    widgetRegistry: {
      version: '2026.05',
      widgets: [
        {
          widgetId: 'dean.pendingReviews',
          name: 'Pending Reviews',
          moduleSource: 'exams',
          capabilitiesRequired: ['exams:review'],
          eventSubscriptions: ['exam.submitted'],
          states: {
            ACTIVE: { label: 'Active', visibility: 'VISIBLE' },
            EMPTY: { label: 'Empty', visibility: 'VISIBLE' },
            LOCKED: { label: 'Locked', visibility: 'DISABLED' },
            DEGRADED: { label: 'Degraded', visibility: 'READONLY', retryable: true },
            FAILED: { label: 'Failed', visibility: 'VISIBLE', retryable: true },
          },
          actions: [
            {
              actionId: 'approve-batch',
              label: 'Approve Batch',
              capabilityRequired: 'exams:approve',
              failurePolicy: 'RETRY',
            },
          ],
        },
      ],
    },
    uiDashboardState: {
      dashboardId: 'dean-academics',
      role: 'dean-academics',
      staticLayout: false,
      dynamicLayoutMutations: ['removed-locked-exams-widget'],
      directModuleCouplings: ['exams'],
      widgets: [
        {
          widgetId: 'dean.pendingReviews',
          state: 'ACTIVE',
          visible: false,
          moduleSource: 'exams',
          capabilitiesRequired: ['exams:review'],
          eventSubscriptions: ['exam.submitted'],
        },
        {
          widgetId: 'ghost.widget',
          state: 'ACTIVE',
          visible: false,
          moduleSource: 'finance',
          capabilitiesRequired: ['finance:read'],
          eventSubscriptions: ['fee.paid'],
        },
      ],
    },
    eventBindings: {},
    eventLogs: [
      {
        eventName: 'exam.submitted',
        tenantId: 'tenant-a',
        emittedAt: '2026-05-25T10:00:00.000Z',
      },
    ],
    failedActionsLog: [
      {
        widgetId: 'dean.pendingReviews',
        actionId: 'approve-batch',
        failurePolicy: 'RETRY',
      },
    ],
    ...overrides,
  };
}

function kpiOnlyDashboardSnapshot(): AutoRepairSystemSnapshot {
  return snapshot({
    moduleAssignments: {
      finance: 'ENABLED',
    },
    capabilityMap: {
      'finance:read': true,
      'finance:recover': true,
    },
    widgetRegistry: {
      version: '2026.05',
      widgets: [
        {
          widgetId: 'finance.unpaidFees',
          name: 'Unpaid Fees',
          moduleSource: 'finance',
          capabilitiesRequired: ['finance:read'],
          eventSubscriptions: ['invoice.overdue'],
          states: {
            ACTIVE: { label: 'Active', visibility: 'VISIBLE' },
            EMPTY: { label: 'Empty', visibility: 'VISIBLE' },
            LOCKED: { label: 'Locked', visibility: 'DISABLED' },
            DEGRADED: { label: 'Degraded', visibility: 'READONLY', retryable: true },
            FAILED: { label: 'Failed', visibility: 'VISIBLE', retryable: true },
            LOADING: { label: 'Loading', visibility: 'VISIBLE' },
          },
          actions: [],
        },
      ],
    },
    uiDashboardState: {
      dashboardId: 'bursar-dashboard',
      role: 'bursar',
      staticLayout: true,
      widgets: [
        {
          widgetId: 'finance.unpaidFees',
          state: 'ACTIVE',
          visible: true,
          moduleSource: 'finance',
          capabilitiesRequired: ['finance:read'],
          eventSubscriptions: ['invoice.overdue'],
          intents: ['METRIC'],
        },
      ],
      operationalIntent: 'Bursar can recover unpaid fees in the next 30 seconds',
    },
    eventBindings: {},
    eventLogs: [],
    failedActionsLog: [],
  });
}

test('AutoRepairAgent repairs widget registry, capability, and hidden widget drift without deleting widgets', () => {
  const report = repairMyShuleSnapshot(snapshot());

  assert.deepEqual(requiredRepairWidgetStates, ['ACTIVE', 'EMPTY', 'LOCKED', 'DEGRADED', 'FAILED', 'LOADING']);
  assert.equal(report.systemStateAfterFix.capabilityMap['exams:review'], false);
  assert.equal(report.systemStateAfterFix.widgetRegistry.widgets.length, 2);
  assert.ok(
    report.systemStateAfterFix.widgetRegistry.widgets.every((widget) =>
      requiredRepairWidgetStates.every((state) => Boolean(widget.states[state])),
    ),
  );
  assert.deepEqual(
    report.systemStateAfterFix.uiDashboardState.widgets.map((widget) => ({
      widgetId: widget.widgetId,
      state: widget.state,
      visible: widget.visible,
    })),
    [
      { widgetId: 'dean.pendingReviews', state: 'LOCKED', visible: true },
      { widgetId: 'ghost.widget', state: 'ACTIVE', visible: true },
    ],
  );
  assert.ok(report.diagnosis.some((entry) => entry.issueType === 'REGISTRY'));
  assert.ok(report.diagnosis.some((entry) => entry.issueType === 'CAPABILITY'));
  assert.ok(report.fixesApplied.some((entry) => entry.repairType === 'Widget Repair'));
});

test('AutoRepairAgent rebuilds event subscriptions and attaches retry or escalation fallbacks to failed actions', () => {
  const report = repairMyShuleSnapshot(snapshot({
    failedActionsLog: [
      {
        widgetId: 'dean.pendingReviews',
        actionId: 'approve-batch',
        failurePolicy: 'RETRY',
      },
      {
        widgetId: 'ghost.widget',
        actionId: 'open-ledger',
        failurePolicy: 'ESCALATE',
      },
    ],
  }));

  assert.deepEqual(report.systemStateAfterFix.eventBindings['exam.submitted'], ['dean.pendingReviews']);
  assert.deepEqual(report.systemStateAfterFix.eventBindings['fee.paid'], ['ghost.widget']);
  assert.deepEqual(report.systemStateAfterFix.actionHandlers['dean.pendingReviews:approve-batch'], {
    type: 'RETRY',
    target: 'auto-repair.retry.dean.pendingReviews.approve-batch',
    attempts: 3,
  });
  assert.deepEqual(report.systemStateAfterFix.actionHandlers['ghost.widget:open-ledger'], {
    type: 'ESCALATE',
    target: 'system.log.escalate.ghost.widget.open-ledger',
  });
  assert.ok(report.fixesApplied.some((entry) => entry.repairType === 'Event Repair'));
  assert.ok(report.fixesApplied.some((entry) => entry.repairType === 'Button Repair'));
});

test('AutoRepairAgent rehydrates static dashboard layout and removes illegal module coupling', () => {
  const report = repairMyShuleSnapshot(snapshot());

  assert.equal(report.systemStateAfterFix.uiDashboardState.staticLayout, true);
  assert.deepEqual(report.systemStateAfterFix.uiDashboardState.dynamicLayoutMutations, []);
  assert.deepEqual(report.systemStateAfterFix.uiDashboardState.directModuleCouplings, []);
  assert.ok(report.diagnosis.some((entry) => entry.issueType === 'UI'));
  assert.ok(report.fixesApplied.some((entry) => entry.repairType === 'Dashboard Repair'));
  assert.ok(
    report.driftPreventionNotes.some((note) =>
      note.ruleViolated === 'Dashboards must not mutate layout dynamically or couple directly to modules',
    ),
  );
});

test('AutoRepairAgent scores KPI-only dashboards as unhealthy and injects operational layers', () => {
  const report = repairMyShuleSnapshot(kpiOnlyDashboardSnapshot());

  assert.equal(report.dashboardHealth.widgetClassifications[0].classification, 'PASSIVE');
  assert.ok(report.dashboardHealth.actionabilityScore < 70);
  assert.ok(report.dashboardHealth.dataDumpRiskScore > 30);
  assert.deepEqual(report.dashboardHealth.repairsApplied.convertedKpisToActions, ['finance.unpaidFees']);
  assert.deepEqual(
    report.dashboardHealth.dashboardStructure.actionLayer,
    ['finance.unpaidFees: Trigger recovery action'],
  );
  assert.deepEqual(
    report.dashboardHealth.dashboardStructure.decisionLayer,
    ['finance.unpaidFees: Recommended next step'],
  );
  assert.deepEqual(
    report.dashboardHealth.dashboardStructure.exceptionLayer,
    ['finance.unpaidFees: Review overdue or risky item'],
  );
  assert.deepEqual(
    report.systemStateAfterFix.uiDashboardState.ux?.workflowEntries.map((entry) => entry.kind),
    ['CREATE', 'CONTINUE', 'RESOLVE'],
  );
  assert.equal(
    report.dashboardHealth.finalStateDescription,
    'The bursar dashboard now enables immediate recovery action, decision review, and exception resolution.',
  );
});

test('AutoRepairAgent dashboard UX repair is idempotent across repeated repair passes', () => {
  const firstReport = repairMyShuleSnapshot(kpiOnlyDashboardSnapshot());
  const secondReport = repairMyShuleSnapshot(firstReport.systemStateAfterFix);
  const ux = secondReport.systemStateAfterFix.uiDashboardState.ux;

  assert.deepEqual(secondReport.dashboardHealth.dashboardStructure.actionLayer, [
    'finance.unpaidFees: Trigger recovery action',
  ]);
  assert.deepEqual(secondReport.dashboardHealth.dashboardStructure.decisionLayer, [
    'finance.unpaidFees: Recommended next step',
  ]);
  assert.deepEqual(secondReport.dashboardHealth.dashboardStructure.exceptionLayer, [
    'finance.unpaidFees: Review overdue or risky item',
  ]);
  assert.deepEqual(ux?.actions.map((action) => action.actionId), ['finance.unpaidFees.trigger-action']);
  assert.deepEqual(ux?.workflowEntries.map((entry) => entry.kind), ['CREATE', 'CONTINUE', 'RESOLVE']);
});

test('AutoRepairAgent does not alias cloned action handler objects back to the input snapshot', () => {
  const input = snapshot({
    actionHandlers: {
      'some:key': {
        type: 'RETRY',
        target: 'original.target',
        attempts: 2,
      },
    },
  });

  const report = repairMyShuleSnapshot(input);

  report.systemStateAfterFix.actionHandlers['some:key'].target = 'mutated.target';

  assert.equal(input.actionHandlers?.['some:key'].target, 'original.target');
});

test('AutoRepairAgent reports dashboard repair patch intelligence for KPI-only dashboards', () => {
  const report = repairMyShuleSnapshot(kpiOnlyDashboardSnapshot());

  assert.equal(report.dashboardHealth.workflowContinuityScore, 100);
  assert.deepEqual(report.dashboardHealth.issuesDetected, [
    'passive_finance.unpaidFees',
    'missing_workflow_create',
    'missing_workflow_continue',
    'missing_workflow_resolve',
  ]);
  assert.deepEqual(
    report.dashboardHealth.repairPatches.map((patch) => patch.patchType),
    [
      'transform_widget',
      'inject_action_layer',
      'inject_decision_layer',
      'inject_exception_layer',
      'inject_action_layer',
      'inject_action_layer',
      'inject_action_layer',
    ],
  );
  assert.ok(report.dashboardHealth.repairPatches.every((patch) => patch.reversible));
  assert.ok(report.dashboardHealth.repairPatches.every((patch) => patch.reason.length > 0));
  assert.ok(report.dashboardHealth.repairPatches.every((patch) => patch.trace.length > 0));
  assert.ok(report.dashboardHealth.repairPatches.every((patch) => patch.auditLog.length > 0));
});

test('AutoRepairAgent classifies decision widgets as decisional dashboard contributors', () => {
  const report = repairMyShuleSnapshot(snapshot({
    moduleAssignments: {
      finance: 'ENABLED',
    },
    capabilityMap: {
      'finance:read': true,
    },
    widgetRegistry: {
      version: '2026.05',
      widgets: [
        {
          widgetId: 'finance.approvalQueue',
          name: 'Approval Queue',
          moduleSource: 'finance',
          capabilitiesRequired: ['finance:read'],
          eventSubscriptions: [],
          states: {
            ACTIVE: { label: 'Active', visibility: 'VISIBLE' },
            EMPTY: { label: 'Empty', visibility: 'VISIBLE' },
            LOCKED: { label: 'Locked', visibility: 'DISABLED' },
            DEGRADED: { label: 'Degraded', visibility: 'READONLY', retryable: true },
            FAILED: { label: 'Failed', visibility: 'VISIBLE', retryable: true },
            LOADING: { label: 'Loading', visibility: 'VISIBLE' },
          },
          actions: [],
        },
      ],
    },
    uiDashboardState: {
      dashboardId: 'finance-dashboard',
      role: 'finance-admin',
      staticLayout: true,
      widgets: [
        {
          widgetId: 'finance.approvalQueue',
          state: 'ACTIVE',
          visible: true,
          moduleSource: 'finance',
          capabilitiesRequired: ['finance:read'],
          eventSubscriptions: [],
          intents: ['DECISION'],
        },
      ],
    },
    eventBindings: {},
    eventLogs: [],
    failedActionsLog: [],
  }));

  assert.equal(report.dashboardHealth.widgetClassifications[0].classification, 'DECISIONAL');
});
