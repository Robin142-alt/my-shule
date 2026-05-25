# API Auto-Repair Dashboard Engine Design

## Context

MyShule dashboards are role-static, widget-driven, capability-controlled, tenant-specific, and event-driven. The existing API auto-repair agent already repairs capability drift, widget registry drift, event bindings, button fallback handlers, and static dashboard layout violations from deterministic snapshots.

The dashboard engine should extend that agent instead of becoming a separate renderer or frontend-only rule set. A dashboard is considered unhealthy when it presents correct data but does not enable immediate operational execution.

## Approved Approach

Extend `apps/api/src/common/auto-repair/auto-repair-agent.ts` with a centralized dashboard UX health and repair stage.

The existing repair order becomes:

1. Capability repair
2. Widget repair
3. Event repair
4. Button repair
5. Dashboard structure repair
6. Dashboard UX health repair

This keeps module entitlement and capability truth ahead of UX repair, so `LOCKED`, `EMPTY`, and failed action states are repaired with the right tenant and role constraints.

## Architecture

The engine remains a pure TypeScript evaluator. It receives an `AutoRepairSystemSnapshot`, returns an `AutoRepairReport`, and does not call databases, services, network APIs, or frontend code.

The snapshot model gains dashboard UX metadata:

- widget intent signals: metric, chart, table, workflow, alert, task, decision, action
- action metadata: create, continue, resolve, navigate, approve, notify, retry, escalate
- optional relocation target for passive widgets: reports, analytics, or drill-down
- role operational intent: the work the role must be able to do within 30 seconds

The report model gains `dashboardHealth`:

- `actionabilityScore`
- `dataDumpRiskScore`
- widget classifications
- repairs applied
- repaired dashboard structure
- final operational state sentence

## Widget Classification

Each dashboard widget is classified as:

- `ACTIONABLE`: has executable actions or workflow triggers.
- `SUPPORTIVE`: informs a nearby action, decision, alert, or workflow.
- `PASSIVE`: presents metrics, charts, or tables without a clear operational trigger.
- `DEAD_WEIGHT`: has no action, no decision support, no exception value, and no workflow contribution.

The classifier uses deterministic signals:

- action count and enabled action count
- workflow entry points
- exception or alert semantics
- decision recommendation semantics
- module entitlement and capability state
- empty or locked state handling
- whether data has a relocation path

## Health Scoring

`actionabilityScore` is 0 to 100 and rewards:

- widgets with actions
- dashboard-level workflow coverage
- decision layer presence
- exception layer presence
- create, continue, and resolve workflow entry points

`dataDumpRiskScore` is 0 to 100 and increases with:

- passive KPIs
- non-clickable charts or tables
- missing workflow triggers
- missing decision support
- overloaded KPI surfaces
- dead-weight widgets

A dashboard is unhealthy when:

- `actionabilityScore` is below 70
- `dataDumpRiskScore` is above 30
- any role has no clear 30-second action
- create, continue, or resolve workflow entry points are missing
- any `LOCKED`, `EMPTY`, or passive widget lacks the required fallback action

## Repair Behavior

The repair stage transforms dashboard state without deleting widgets silently.

For passive metrics, charts, and tables:

- attach an action overlay when a workflow or action can be inferred
- convert KPI cards into trigger, workflow, decision, or alert stubs
- move purely analytical widgets to reports, analytics, or drill-down relocation notes

For missing operational layers:

- add an action layer with top role actions and quick-action entries
- add an exception layer with overdue items, alerts, and risks
- add a decision layer with attention items, changes, and recommended next steps
- keep a data layer for supporting evidence after operational layers exist

For workflow coverage:

- add create workflow stubs
- add continue workflow stubs
- add resolve workflow stubs

For `LOCKED` widgets:

- keep the widget visible
- explain the locked module or capability
- expose enablement or permission path metadata
- add a request activation action

For `EMPTY` widgets:

- replace blank state with guided next action
- add a start-here workflow stub
- allow sample-driven onboarding metadata

For dead-weight widgets:

- remove from the primary dashboard surface only when a reporting, analytics, or drill-down relocation target is recorded
- record the relocation in repairs applied
- keep an audit trail in the report

## Output Contract

The final report should be able to render this shape:

```ts
dashboardHealth: {
  healthScore: number;
  actionabilityScore: number;
  dataDumpRiskScore: number;
  widgetClassifications: Array<{
    widgetId: string;
    classification: "ACTIONABLE" | "SUPPORTIVE" | "PASSIVE" | "DEAD_WEIGHT";
    reason: string;
  }>;
  repairsApplied: {
    convertedKpisToActions: string[];
    addedWorkflows: string[];
    relocatedWidgets: string[];
    fixedLockedStates: string[];
    fixedEmptyStates: string[];
  };
  dashboardStructure: {
    actionLayer: string[];
    decisionLayer: string[];
    exceptionLayer: string[];
    dataLayer: string[];
  };
  finalStateDescription: string;
}
```

## Integration Boundaries

The API auto-repair engine owns diagnosis, scoring, and repaired snapshot output.

The frontend may later consume `dashboardHealth`, but it should not reimplement the scoring rules. Frontend dashboards should render the repaired structure and use the existing capability engine states.

Modules remain data and workflow providers. They do not control dashboard layout, hide locked capabilities, or decide whether analytics belong on dashboards.

## Testing

Tests extend `apps/api/src/common/auto-repair/auto-repair-agent.test.ts`.

Required test coverage:

- KPI-only dashboards are scored unhealthy and repaired with action, decision, and exception layers.
- Passive widgets are converted to action overlays or relocated with audit notes.
- `LOCKED` widgets remain visible and receive activation or permission actions.
- `EMPTY` widgets receive guided start actions.
- Dashboards missing create, continue, or resolve workflow entry points receive workflow stubs.
- Healthy operational dashboards retain low data-dump risk and do not receive unnecessary repairs.
- Existing capability, widget, event, button, and static-layout repair tests remain green.

## Non-Goals

- No dashboard rendering.
- No database persistence in the pure repair function.
- No frontend-specific component contract changes in the first implementation.
- No automatic deletion of widgets.
- No removal from the primary dashboard surface without a relocation target.
- No bypass of module entitlements or role permissions.

## Success Criteria

The auto-repair report makes it impossible for a role dashboard snapshot to pass as healthy if the user cannot take an operational action immediately. The repaired final state describes what the dashboard now enables, not merely what it displays.
