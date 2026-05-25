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
  const report = repairMyShuleSnapshot(snapshot({
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
  }));

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
