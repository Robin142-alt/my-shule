# API Auto-Repair Dashboard Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the existing API auto-repair agent so every dashboard snapshot is diagnosed, scored, repaired, and reported as an operational control system instead of a data dump.

**Architecture:** Keep the engine centralized in `apps/api/src/common/auto-repair/auto-repair-agent.ts` as a pure deterministic evaluator. Add dashboard UX metadata types, calculate health scores, classify widgets, then repair missing action, decision, exception, workflow, locked, empty, and relocation structures after the existing capability/widget/event/button/layout repair stages.

**Tech Stack:** TypeScript, Node test runner, existing root `tsc` build, existing API auto-repair test file.

---

## File Structure

- Modify `apps/api/src/common/auto-repair/auto-repair-agent.test.ts`
  - Add failing contract tests for dashboard health scoring and repair.
  - Keep the existing auto-repair tests intact.
- Modify `apps/api/src/common/auto-repair/auto-repair-agent.ts`
  - Extend snapshot/report types with dashboard UX metadata.
  - Add deterministic widget classification, scoring, repair helpers, and clone support.
  - Call the new UX repair stage after `repairDashboard`.

No new runtime service, Nest provider, database repository, or frontend file is needed for this first implementation.

## Task 1: Dashboard Health Contract For KPI-Only Dashboards

**Files:**
- Modify: `apps/api/src/common/auto-repair/auto-repair-agent.test.ts`
- Modify: `apps/api/src/common/auto-repair/auto-repair-agent.ts`

- [ ] **Step 1: Write the failing test**

Append this test to `apps/api/src/common/auto-repair/auto-repair-agent.test.ts`:

```ts
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
```

- [ ] **Step 2: Run the focused source test to verify red**

Run:

```powershell
node -r ts-node/register/transpile-only --test apps/api/src/common/auto-repair/auto-repair-agent.test.ts
```

Expected: FAIL because `dashboardHealth`, `intents`, `operationalIntent`, and `ux` are not defined on the current types/report.

- [ ] **Step 3: Add dashboard UX types and default report shape**

In `apps/api/src/common/auto-repair/auto-repair-agent.ts`, add these type exports after `ActionFailurePolicy`:

```ts
export type DashboardWidgetIntent =
  | 'METRIC'
  | 'CHART'
  | 'TABLE'
  | 'WORKFLOW'
  | 'ALERT'
  | 'TASK'
  | 'DECISION'
  | 'ACTION';
export type DashboardWorkflowKind = 'CREATE' | 'CONTINUE' | 'RESOLVE';
export type DashboardRelocationTarget = 'REPORTS' | 'ANALYTICS' | 'DRILL_DOWN';
export type DashboardWidgetClassification = 'ACTIONABLE' | 'SUPPORTIVE' | 'PASSIVE' | 'DEAD_WEIGHT';
export type DashboardRepairActionKind =
  | 'TRIGGER_ACTION'
  | 'TRIGGER_WORKFLOW'
  | 'TRIGGER_DECISION'
  | 'TRIGGER_ALERT'
  | 'REQUEST_ACTIVATION'
  | 'START_HERE';
```

Add these interfaces after `AutoRepairWidgetAction`:

```ts
export interface AutoRepairDashboardAction {
  actionId: string;
  label: string;
  kind: DashboardRepairActionKind;
  sourceWidgetId?: string;
  target: string;
}

export interface AutoRepairDashboardWorkflowEntry {
  workflowId: string;
  label: string;
  kind: DashboardWorkflowKind;
  sourceWidgetId?: string;
}

export interface AutoRepairDashboardRelocation {
  widgetId: string;
  target: DashboardRelocationTarget;
  reason: string;
}

export interface AutoRepairDashboardUxState {
  actionLayer: string[];
  decisionLayer: string[];
  exceptionLayer: string[];
  dataLayer: string[];
  actions: AutoRepairDashboardAction[];
  workflowEntries: AutoRepairDashboardWorkflowEntry[];
  relocations: AutoRepairDashboardRelocation[];
}
```

Extend `AutoRepairDashboardWidget` with these optional fields:

```ts
  intents?: DashboardWidgetIntent[];
  relocationTarget?: DashboardRelocationTarget;
  primarySurface?: boolean;
```

Extend `AutoRepairDashboardState` with these optional fields:

```ts
  operationalIntent?: string;
  ux?: AutoRepairDashboardUxState;
```

Add these interfaces before `AutoRepairReport`:

```ts
export interface AutoRepairDashboardWidgetHealth {
  widgetId: string;
  classification: DashboardWidgetClassification;
  reason: string;
}

export interface AutoRepairDashboardRepairsApplied {
  convertedKpisToActions: string[];
  addedWorkflows: string[];
  relocatedWidgets: string[];
  fixedLockedStates: string[];
  fixedEmptyStates: string[];
}

export interface AutoRepairDashboardStructure {
  actionLayer: string[];
  decisionLayer: string[];
  exceptionLayer: string[];
  dataLayer: string[];
}

export interface AutoRepairDashboardHealth {
  healthScore: number;
  actionabilityScore: number;
  dataDumpRiskScore: number;
  widgetClassifications: AutoRepairDashboardWidgetHealth[];
  repairsApplied: AutoRepairDashboardRepairsApplied;
  dashboardStructure: AutoRepairDashboardStructure;
  finalStateDescription: string;
}
```

Extend `AutoRepairReport` with:

```ts
  dashboardHealth: AutoRepairDashboardHealth;
```

Add these constants after `defaultStateConfigs`:

```ts
const requiredWorkflowKinds: DashboardWorkflowKind[] = ['CREATE', 'CONTINUE', 'RESOLVE'];

const emptyDashboardRepairsApplied = (): AutoRepairDashboardRepairsApplied => ({
  convertedKpisToActions: [],
  addedWorkflows: [],
  relocatedWidgets: [],
  fixedLockedStates: [],
  fixedEmptyStates: [],
});

const emptyDashboardUxState = (): AutoRepairDashboardUxState => ({
  actionLayer: [],
  decisionLayer: [],
  exceptionLayer: [],
  dataLayer: [],
  actions: [],
  workflowEntries: [],
  relocations: [],
});
```

In `repairMyShuleSnapshot`, after `repairDashboard(...)`, add:

```ts
  const dashboardHealth = repairDashboardUxHealth(state, diagnosis, fixesApplied, driftPreventionNotes);
```

Then include it in the returned object:

```ts
    dashboardHealth,
```

Add this minimal helper below `repairDashboard`:

```ts
function repairDashboardUxHealth(
  state: AutoRepairSystemSnapshot,
  diagnosis: AutoRepairDiagnosis[],
  fixesApplied: AutoRepairFix[],
  driftPreventionNotes: AutoRepairDriftPreventionNote[],
): AutoRepairDashboardHealth {
  const repairsApplied = emptyDashboardRepairsApplied();
  const ux = ensureDashboardUx(state.uiDashboardState);
  const registryById = new Map(state.widgetRegistry.widgets.map((widget) => [widget.widgetId, widget]));
  const widgetClassifications = state.uiDashboardState.widgets.map((widget) =>
    classifyDashboardWidget(widget, registryById.get(widget.widgetId)),
  );

  for (const entry of widgetClassifications) {
    const widget = state.uiDashboardState.widgets.find((candidate) => candidate.widgetId === entry.widgetId);
    if (!widget) {
      continue;
    }

    if (entry.classification === 'PASSIVE' && (widget.intents ?? []).includes('METRIC')) {
      repairsApplied.convertedKpisToActions.push(widget.widgetId);
      ux.actionLayer.push(`${widget.widgetId}: Trigger recovery action`);
      ux.decisionLayer.push(`${widget.widgetId}: Recommended next step`);
      ux.exceptionLayer.push(`${widget.widgetId}: Review overdue or risky item`);
      ux.actions.push({
        actionId: `${widget.widgetId}.trigger-action`,
        label: 'Trigger recovery action',
        kind: 'TRIGGER_ACTION',
        sourceWidgetId: widget.widgetId,
        target: `${widget.moduleSource}.workflow.create`,
      });
    }
  }

  for (const kind of requiredWorkflowKinds) {
    if (!ux.workflowEntries.some((entry) => entry.kind === kind)) {
      const workflowId = `${state.uiDashboardState.dashboardId}.${kind.toLowerCase()}-workflow`;
      ux.workflowEntries.push({
        workflowId,
        label: `${kind[0]}${kind.slice(1).toLowerCase()} workflow`,
        kind,
      });
      repairsApplied.addedWorkflows.push(workflowId);
    }
  }

  const scores = scoreDashboardHealth(state.uiDashboardState, widgetClassifications);
  if (scores.actionabilityScore < 70 || scores.dataDumpRiskScore > 30) {
    diagnosis.push({
      issueType: 'UI',
      affectedComponents: [state.uiDashboardState.dashboardId],
      message: 'Dashboard was data-heavy without enough operational execution paths',
    });
    fixesApplied.push({
      repairType: 'Dashboard Repair',
      affectedComponents: [state.uiDashboardState.dashboardId],
      message: 'Dashboard UX health repaired with action, decision, exception, and workflow layers',
    });
    driftPreventionNotes.push({
      ruleViolated: 'Dashboards must be operational control systems, not data dumps',
      enforcementApplied: 'Dashboard health scoring and deterministic UX repair applied',
    });
  }

  return {
    healthScore: Math.max(0, 100 - scores.dataDumpRiskScore),
    actionabilityScore: scores.actionabilityScore,
    dataDumpRiskScore: scores.dataDumpRiskScore,
    widgetClassifications,
    repairsApplied,
    dashboardStructure: {
      actionLayer: [...ux.actionLayer],
      decisionLayer: [...ux.decisionLayer],
      exceptionLayer: [...ux.exceptionLayer],
      dataLayer: [...ux.dataLayer],
    },
    finalStateDescription: `The ${state.uiDashboardState.role} dashboard now enables immediate recovery action, decision review, and exception resolution.`,
  };
}
```

Add these helpers below `repairDashboardUxHealth`:

```ts
function ensureDashboardUx(dashboard: AutoRepairDashboardState): AutoRepairDashboardUxState {
  if (!dashboard.ux) {
    dashboard.ux = emptyDashboardUxState();
  }

  dashboard.ux.actionLayer = unique([...dashboard.ux.actionLayer]);
  dashboard.ux.decisionLayer = unique([...dashboard.ux.decisionLayer]);
  dashboard.ux.exceptionLayer = unique([...dashboard.ux.exceptionLayer]);
  dashboard.ux.dataLayer = unique([...dashboard.ux.dataLayer]);
  return dashboard.ux;
}

function classifyDashboardWidget(
  widget: AutoRepairDashboardWidget,
  registryWidget?: AutoRepairWidgetDefinition,
): AutoRepairDashboardWidgetHealth {
  const intents = widget.intents ?? [];
  const actionCount = registryWidget?.actions.length ?? 0;

  if (actionCount > 0 || intents.includes('ACTION') || intents.includes('WORKFLOW') || intents.includes('TASK')) {
    return {
      widgetId: widget.widgetId,
      classification: 'ACTIONABLE',
      reason: 'Widget has executable actions or workflow intent',
    };
  }

  if (intents.includes('DECISION') || intents.includes('ALERT')) {
    return {
      widgetId: widget.widgetId,
      classification: 'SUPPORTIVE',
      reason: 'Widget supports a decision or exception layer',
    };
  }

  if (intents.includes('METRIC') || intents.includes('CHART') || intents.includes('TABLE')) {
    return {
      widgetId: widget.widgetId,
      classification: 'PASSIVE',
      reason: 'Widget presents data without an operational trigger',
    };
  }

  return {
    widgetId: widget.widgetId,
    classification: 'DEAD_WEIGHT',
    reason: 'Widget has no action, decision, exception, or workflow contribution',
  };
}

function scoreDashboardHealth(
  dashboard: AutoRepairDashboardState,
  classifications: AutoRepairDashboardWidgetHealth[],
) {
  const totalWidgets = Math.max(classifications.length, 1);
  const actionableCount = classifications.filter((entry) => entry.classification === 'ACTIONABLE').length;
  const passiveCount = classifications.filter((entry) => entry.classification === 'PASSIVE').length;
  const deadWeightCount = classifications.filter((entry) => entry.classification === 'DEAD_WEIGHT').length;
  const workflowCoverage = requiredWorkflowKinds.filter((kind) =>
    dashboard.ux?.workflowEntries.some((entry) => entry.kind === kind),
  ).length / requiredWorkflowKinds.length;
  const hasDecisionLayer = (dashboard.ux?.decisionLayer.length ?? 0) > 0;
  const hasExceptionLayer = (dashboard.ux?.exceptionLayer.length ?? 0) > 0;
  const hasRoleIntent = Boolean(dashboard.operationalIntent?.trim());

  const actionabilityScore = Math.round(
    (actionableCount / totalWidgets) * 40
    + workflowCoverage * 25
    + (hasDecisionLayer ? 15 : 0)
    + (hasExceptionLayer ? 10 : 0)
    + (hasRoleIntent ? 10 : 0),
  );

  const dataDumpRiskScore = Math.min(100, Math.round(
    (passiveCount / totalWidgets) * 40
    + (deadWeightCount / totalWidgets) * 25
    + (workflowCoverage < 1 ? 20 : 0)
    + (!hasDecisionLayer ? 10 : 0)
    + (classifications.length > 4 && passiveCount >= 3 ? 5 : 0),
  ));

  return {
    actionabilityScore,
    dataDumpRiskScore,
  };
}
```

Update `cloneSnapshot` so each cloned dashboard widget preserves the new optional fields:

```ts
        intents: [...(widget.intents ?? [])],
        relocationTarget: widget.relocationTarget,
        primarySurface: widget.primarySurface,
```

Also clone `uiDashboardState.ux` inside the returned `uiDashboardState` object:

```ts
      operationalIntent: snapshot.uiDashboardState.operationalIntent,
      ux: snapshot.uiDashboardState.ux ? {
        actionLayer: [...snapshot.uiDashboardState.ux.actionLayer],
        decisionLayer: [...snapshot.uiDashboardState.ux.decisionLayer],
        exceptionLayer: [...snapshot.uiDashboardState.ux.exceptionLayer],
        dataLayer: [...snapshot.uiDashboardState.ux.dataLayer],
        actions: snapshot.uiDashboardState.ux.actions.map((action) => ({ ...action })),
        workflowEntries: snapshot.uiDashboardState.ux.workflowEntries.map((entry) => ({ ...entry })),
        relocations: snapshot.uiDashboardState.ux.relocations.map((relocation) => ({ ...relocation })),
      } : undefined,
```

- [ ] **Step 4: Run the focused source test to verify green**

Run:

```powershell
node -r ts-node/register/transpile-only --test apps/api/src/common/auto-repair/auto-repair-agent.test.ts
```

Expected: PASS for the existing tests and the new KPI-only dashboard test.

- [ ] **Step 5: Commit Task 1**

Run:

```powershell
git add -- apps/api/src/common/auto-repair/auto-repair-agent.ts apps/api/src/common/auto-repair/auto-repair-agent.test.ts
git commit -m "Extend auto repair with dashboard health scoring"
```

Expected: a commit containing only the auto-repair source and test files.

## Task 2: Locked And Empty Widget Self-Repair

**Files:**
- Modify: `apps/api/src/common/auto-repair/auto-repair-agent.test.ts`
- Modify: `apps/api/src/common/auto-repair/auto-repair-agent.ts`

- [ ] **Step 1: Write the failing test**

Append this test to `apps/api/src/common/auto-repair/auto-repair-agent.test.ts`:

```ts
test('AutoRepairAgent gives LOCKED and EMPTY widgets visible operational recovery actions', () => {
  const report = repairMyShuleSnapshot(snapshot({
    moduleAssignments: {
      exams: 'DISABLED',
      library: 'ENABLED',
    },
    capabilityMap: {
      'exams:review': true,
      'library:returns': true,
    },
    widgetRegistry: {
      version: '2026.05',
      widgets: [
        {
          widgetId: 'exams.pendingReviews',
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
            LOADING: { label: 'Loading', visibility: 'VISIBLE' },
          },
          actions: [],
        },
        {
          widgetId: 'library.returns',
          name: 'Returns Desk',
          moduleSource: 'library',
          capabilitiesRequired: ['library:returns'],
          eventSubscriptions: ['library.return.created'],
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
      dashboardId: 'operations-dashboard',
      role: 'principal',
      staticLayout: true,
      widgets: [
        {
          widgetId: 'exams.pendingReviews',
          state: 'ACTIVE',
          visible: true,
          moduleSource: 'exams',
          capabilitiesRequired: ['exams:review'],
          eventSubscriptions: ['exam.submitted'],
          intents: ['WORKFLOW'],
        },
        {
          widgetId: 'library.returns',
          state: 'EMPTY',
          visible: true,
          moduleSource: 'library',
          capabilitiesRequired: ['library:returns'],
          eventSubscriptions: ['library.return.created'],
          intents: ['TABLE'],
        },
      ],
      operationalIntent: 'Principal can unblock locked modules and start empty workflows',
    },
    eventBindings: {},
    eventLogs: [],
    failedActionsLog: [],
  }));

  assert.equal(report.systemStateAfterFix.uiDashboardState.widgets[0].state, 'LOCKED');
  assert.deepEqual(report.dashboardHealth.repairsApplied.fixedLockedStates, ['exams.pendingReviews']);
  assert.deepEqual(report.dashboardHealth.repairsApplied.fixedEmptyStates, ['library.returns']);
  assert.deepEqual(
    report.systemStateAfterFix.uiDashboardState.ux?.actions.map((action) => ({
      actionId: action.actionId,
      kind: action.kind,
      sourceWidgetId: action.sourceWidgetId,
    })),
    [
      {
        actionId: 'exams.pendingReviews.request-activation',
        kind: 'REQUEST_ACTIVATION',
        sourceWidgetId: 'exams.pendingReviews',
      },
      {
        actionId: 'library.returns.start-here',
        kind: 'START_HERE',
        sourceWidgetId: 'library.returns',
      },
    ],
  );
});
```

- [ ] **Step 2: Run the focused source test to verify red**

Run:

```powershell
node -r ts-node/register/transpile-only --test apps/api/src/common/auto-repair/auto-repair-agent.test.ts
```

Expected: FAIL because locked and empty widget UX actions are not added yet.

- [ ] **Step 3: Implement locked and empty repair actions**

Inside `repairDashboardUxHealth`, after the passive widget conversion block and before workflow coverage repair, add:

```ts
    if (widget.state === 'LOCKED') {
      repairsApplied.fixedLockedStates.push(widget.widgetId);
      ux.actions.push({
        actionId: `${widget.widgetId}.request-activation`,
        label: 'Request activation',
        kind: 'REQUEST_ACTIVATION',
        sourceWidgetId: widget.widgetId,
        target: `${widget.moduleSource}.activation.request`,
      });
      ux.exceptionLayer.push(`${widget.widgetId}: Activation or permission required`);
    }

    if (widget.state === 'EMPTY') {
      repairsApplied.fixedEmptyStates.push(widget.widgetId);
      ux.actions.push({
        actionId: `${widget.widgetId}.start-here`,
        label: 'Start here',
        kind: 'START_HERE',
        sourceWidgetId: widget.widgetId,
        target: `${widget.moduleSource}.workflow.create`,
      });
      ux.actionLayer.push(`${widget.widgetId}: Start guided workflow`);
    }
```

Before the return statement in `repairDashboardUxHealth`, deduplicate the repair arrays and dashboard layer arrays:

```ts
  repairsApplied.convertedKpisToActions = unique(repairsApplied.convertedKpisToActions);
  repairsApplied.addedWorkflows = unique(repairsApplied.addedWorkflows);
  repairsApplied.relocatedWidgets = unique(repairsApplied.relocatedWidgets);
  repairsApplied.fixedLockedStates = unique(repairsApplied.fixedLockedStates);
  repairsApplied.fixedEmptyStates = unique(repairsApplied.fixedEmptyStates);
  ux.actionLayer = unique(ux.actionLayer);
  ux.decisionLayer = unique(ux.decisionLayer);
  ux.exceptionLayer = unique(ux.exceptionLayer);
  ux.dataLayer = unique(ux.dataLayer);
```

- [ ] **Step 4: Run the focused source test to verify green**

Run:

```powershell
node -r ts-node/register/transpile-only --test apps/api/src/common/auto-repair/auto-repair-agent.test.ts
```

Expected: PASS for all auto-repair source tests.

- [ ] **Step 5: Commit Task 2**

Run:

```powershell
git add -- apps/api/src/common/auto-repair/auto-repair-agent.ts apps/api/src/common/auto-repair/auto-repair-agent.test.ts
git commit -m "Repair locked and empty dashboard widgets"
```

Expected: a commit containing only the auto-repair source and test files.

## Task 3: Relocate Dead-Weight Widgets Without Deleting Them

**Files:**
- Modify: `apps/api/src/common/auto-repair/auto-repair-agent.test.ts`
- Modify: `apps/api/src/common/auto-repair/auto-repair-agent.ts`

- [ ] **Step 1: Write the failing test**

Append this test to `apps/api/src/common/auto-repair/auto-repair-agent.test.ts`:

```ts
test('AutoRepairAgent relocates dead-weight widgets with an audit trail instead of deleting them', () => {
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
          widgetId: 'finance.monthlyTrend',
          name: 'Monthly Trend',
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
      dashboardId: 'finance-analytics-dashboard',
      role: 'bursar',
      staticLayout: true,
      widgets: [
        {
          widgetId: 'finance.monthlyTrend',
          state: 'ACTIVE',
          visible: true,
          moduleSource: 'finance',
          capabilitiesRequired: ['finance:read'],
          eventSubscriptions: [],
          relocationTarget: 'REPORTS',
        },
      ],
      operationalIntent: 'Bursar can act on finance exceptions, not browse static trend reports',
    },
    eventBindings: {},
    eventLogs: [],
    failedActionsLog: [],
  }));

  assert.deepEqual(report.dashboardHealth.widgetClassifications, [
    {
      widgetId: 'finance.monthlyTrend',
      classification: 'DEAD_WEIGHT',
      reason: 'Widget has no action, decision, exception, or workflow contribution',
    },
  ]);
  assert.deepEqual(report.dashboardHealth.repairsApplied.relocatedWidgets, ['finance.monthlyTrend']);
  assert.deepEqual(report.systemStateAfterFix.uiDashboardState.ux?.relocations, [
    {
      widgetId: 'finance.monthlyTrend',
      target: 'REPORTS',
      reason: 'Widget has no action, decision, exception, or workflow contribution',
    },
  ]);
  assert.equal(report.systemStateAfterFix.uiDashboardState.widgets[0].visible, true);
  assert.equal(report.systemStateAfterFix.uiDashboardState.widgets[0].primarySurface, false);
});
```

- [ ] **Step 2: Run the focused source test to verify red**

Run:

```powershell
node -r ts-node/register/transpile-only --test apps/api/src/common/auto-repair/auto-repair-agent.test.ts
```

Expected: FAIL because dead-weight relocation is not applied yet.

- [ ] **Step 3: Implement relocation repair**

Inside `repairDashboardUxHealth`, after the locked/empty widget block, add:

```ts
    if (entry.classification === 'DEAD_WEIGHT' && widget.relocationTarget) {
      widget.primarySurface = false;
      widget.visible = true;
      repairsApplied.relocatedWidgets.push(widget.widgetId);
      ux.relocations.push({
        widgetId: widget.widgetId,
        target: widget.relocationTarget,
        reason: entry.reason,
      });
      ux.dataLayer.push(`${widget.widgetId}: Relocated to ${widget.relocationTarget}`);
    }
```

Add a drift note when relocations exist. Place this after the unhealthy-dashboard `if` block:

```ts
  if (repairsApplied.relocatedWidgets.length > 0) {
    driftPreventionNotes.push({
      ruleViolated: 'Passive analytics must leave the primary dashboard only with relocation',
      enforcementApplied: 'Dead-weight widgets kept visible with a relocation target and audit trail',
    });
  }
```

- [ ] **Step 4: Run the focused source test to verify green**

Run:

```powershell
node -r ts-node/register/transpile-only --test apps/api/src/common/auto-repair/auto-repair-agent.test.ts
```

Expected: PASS for all auto-repair source tests.

- [ ] **Step 5: Commit Task 3**

Run:

```powershell
git add -- apps/api/src/common/auto-repair/auto-repair-agent.ts apps/api/src/common/auto-repair/auto-repair-agent.test.ts
git commit -m "Relocate dead weight dashboard widgets"
```

Expected: a commit containing only the auto-repair source and test files.

## Task 4: Healthy Operational Dashboard No-Repair Guard

**Files:**
- Modify: `apps/api/src/common/auto-repair/auto-repair-agent.test.ts`
- Modify: `apps/api/src/common/auto-repair/auto-repair-agent.ts`

- [ ] **Step 1: Write the failing test**

Append this test to `apps/api/src/common/auto-repair/auto-repair-agent.test.ts`:

```ts
test('AutoRepairAgent preserves healthy operational dashboards without unnecessary UX repairs', () => {
  const report = repairMyShuleSnapshot(snapshot({
    moduleAssignments: {
      discipline: 'ENABLED',
    },
    capabilityMap: {
      'discipline:read': true,
      'discipline:resolve': true,
    },
    widgetRegistry: {
      version: '2026.05',
      widgets: [
        {
          widgetId: 'discipline.escalations',
          name: 'Discipline Escalations',
          moduleSource: 'discipline',
          capabilitiesRequired: ['discipline:read'],
          eventSubscriptions: ['discipline.case.escalated'],
          states: {
            ACTIVE: { label: 'Active', visibility: 'VISIBLE' },
            EMPTY: { label: 'Empty', visibility: 'VISIBLE' },
            LOCKED: { label: 'Locked', visibility: 'DISABLED' },
            DEGRADED: { label: 'Degraded', visibility: 'READONLY', retryable: true },
            FAILED: { label: 'Failed', visibility: 'VISIBLE', retryable: true },
            LOADING: { label: 'Loading', visibility: 'VISIBLE' },
          },
          actions: [
            {
              actionId: 'resolve-case',
              label: 'Resolve Case',
              capabilityRequired: 'discipline:resolve',
              failurePolicy: 'RETRY',
            },
          ],
        },
      ],
    },
    uiDashboardState: {
      dashboardId: 'discipline-dashboard',
      role: 'discipline-master',
      staticLayout: true,
      widgets: [
        {
          widgetId: 'discipline.escalations',
          state: 'ACTIVE',
          visible: true,
          moduleSource: 'discipline',
          capabilitiesRequired: ['discipline:read'],
          eventSubscriptions: ['discipline.case.escalated'],
          intents: ['ACTION', 'WORKFLOW', 'ALERT'],
        },
      ],
      operationalIntent: 'Discipline master can resolve escalated cases immediately',
      ux: {
        actionLayer: ['discipline.escalations: Resolve case'],
        decisionLayer: ['discipline.escalations: Review severity and next step'],
        exceptionLayer: ['discipline.escalations: Escalated case requires action'],
        dataLayer: ['discipline.escalations: Case context'],
        actions: [
          {
            actionId: 'discipline.escalations.resolve',
            label: 'Resolve case',
            kind: 'TRIGGER_ACTION',
            sourceWidgetId: 'discipline.escalations',
            target: 'discipline.case.resolve',
          },
        ],
        workflowEntries: [
          {
            workflowId: 'discipline.create-workflow',
            label: 'Create case workflow',
            kind: 'CREATE',
          },
          {
            workflowId: 'discipline.continue-workflow',
            label: 'Continue case workflow',
            kind: 'CONTINUE',
          },
          {
            workflowId: 'discipline.resolve-workflow',
            label: 'Resolve case workflow',
            kind: 'RESOLVE',
          },
        ],
        relocations: [],
      },
    },
    eventBindings: {},
    eventLogs: [],
    failedActionsLog: [],
  }));

  assert.equal(report.dashboardHealth.actionabilityScore, 100);
  assert.equal(report.dashboardHealth.dataDumpRiskScore, 0);
  assert.deepEqual(report.dashboardHealth.repairsApplied, {
    convertedKpisToActions: [],
    addedWorkflows: [],
    relocatedWidgets: [],
    fixedLockedStates: [],
    fixedEmptyStates: [],
  });
  assert.ok(!report.diagnosis.some((entry) => entry.message.includes('data-heavy')));
});
```

- [ ] **Step 2: Run the focused source test to verify red**

Run:

```powershell
node -r ts-node/register/transpile-only --test apps/api/src/common/auto-repair/auto-repair-agent.test.ts
```

Expected: FAIL if the scoring formula or repair ordering over-repairs a healthy dashboard.

- [ ] **Step 3: Adjust scoring and repair ordering to preserve healthy dashboards**

In `repairDashboardUxHealth`, ensure scoring is calculated after any necessary repair, and ensure diagnosis/fixes for data-heavy dashboards are only added when these conditions are true:

```ts
  const dashboardIsUnhealthy = scores.actionabilityScore < 70 || scores.dataDumpRiskScore > 30;
```

Then update the existing unhealthy block to use:

```ts
  if (dashboardIsUnhealthy) {
```

In `scoreDashboardHealth`, keep this exact workflow coverage calculation:

```ts
  const workflowCoverage = requiredWorkflowKinds.filter((kind) =>
    dashboard.ux?.workflowEntries.some((entry) => entry.kind === kind),
  ).length / requiredWorkflowKinds.length;
```

Keep `ACTIONABLE` widgets worth 40 points and existing decision, exception, and operational-intent scoring so one fully operational widget can reach 100.

- [ ] **Step 4: Run the focused source test to verify green**

Run:

```powershell
node -r ts-node/register/transpile-only --test apps/api/src/common/auto-repair/auto-repair-agent.test.ts
```

Expected: PASS for all auto-repair source tests.

- [ ] **Step 5: Commit Task 4**

Run:

```powershell
git add -- apps/api/src/common/auto-repair/auto-repair-agent.ts apps/api/src/common/auto-repair/auto-repair-agent.test.ts
git commit -m "Preserve healthy operational dashboards"
```

Expected: a commit containing only the auto-repair source and test files.

## Task 5: Compiled Test And Build Verification

**Files:**
- Verify: `apps/api/src/common/auto-repair/auto-repair-agent.ts`
- Verify: `apps/api/src/common/auto-repair/auto-repair-agent.test.ts`

- [ ] **Step 1: Run the TypeScript build**

Run:

```powershell
npm run build
```

Expected: exit code 0.

- [ ] **Step 2: Run the compiled auto-repair test**

Run:

```powershell
node --test dist/apps/api/src/common/auto-repair/auto-repair-agent.test.js
```

Expected: PASS for all auto-repair tests.

- [ ] **Step 3: Run adjacent compiled governance tests**

Run:

```powershell
node --test dist/apps/api/src/common/platform-governance/platform-governance.test.js
```

Expected: PASS. This protects the neighboring governance contract that shares dashboard/widget terminology.

- [ ] **Step 4: Inspect the final diff**

Run:

```powershell
git diff -- apps/api/src/common/auto-repair/auto-repair-agent.ts apps/api/src/common/auto-repair/auto-repair-agent.test.ts
```

Expected: the diff only extends the auto-repair contract, tests, dashboard health scoring, dashboard UX repair, and clone support.

- [ ] **Step 5: Commit verification cleanup if needed**

If Step 4 shows small compile or formatting fixes made during verification, run:

```powershell
git add -- apps/api/src/common/auto-repair/auto-repair-agent.ts apps/api/src/common/auto-repair/auto-repair-agent.test.ts
git commit -m "Verify dashboard auto repair engine"
```

Expected: either no commit because there are no changes, or a narrow verification commit containing only the two auto-repair files.
