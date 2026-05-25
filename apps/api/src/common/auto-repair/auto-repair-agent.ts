export type RepairWidgetState = 'ACTIVE' | 'EMPTY' | 'LOCKED' | 'DEGRADED' | 'FAILED' | 'LOADING';
export type ModuleAssignmentState = 'ENABLED' | 'DISABLED' | 'LIMITED';
export type RepairIssueType = 'UI' | 'CAPABILITY' | 'MODULE' | 'EVENT' | 'REGISTRY' | 'BUTTON';
export type RepairType =
  | 'Capability Repair'
  | 'Widget Repair'
  | 'Event Repair'
  | 'Button Repair'
  | 'Dashboard Repair';
export type ActionFailurePolicy = 'RETRY' | 'DEGRADE' | 'ESCALATE';
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

export const requiredRepairWidgetStates = ['ACTIVE', 'EMPTY', 'LOCKED', 'DEGRADED', 'FAILED', 'LOADING'] as const;

export interface AutoRepairTenantSnapshot {
  tenantId: string;
  lifecycleState: string;
}

export interface AutoRepairWidgetStateConfig {
  label: string;
  visibility: 'VISIBLE' | 'DISABLED' | 'READONLY';
  retryable?: boolean;
  message?: string;
}

export interface AutoRepairWidgetAction {
  actionId: string;
  label?: string;
  capabilityRequired?: string;
  failurePolicy: ActionFailurePolicy;
}

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

export interface AutoRepairWidgetDefinition {
  widgetId: string;
  name: string;
  moduleSource: string;
  capabilitiesRequired: string[];
  eventSubscriptions: string[];
  states: Partial<Record<RepairWidgetState, AutoRepairWidgetStateConfig>>;
  actions: AutoRepairWidgetAction[];
}

export interface AutoRepairDashboardWidget {
  widgetId: string;
  state: RepairWidgetState;
  visible: boolean;
  moduleSource: string;
  capabilitiesRequired: string[];
  eventSubscriptions: string[];
  intents?: DashboardWidgetIntent[];
  relocationTarget?: DashboardRelocationTarget;
  primarySurface?: boolean;
}

export interface AutoRepairDashboardState {
  dashboardId: string;
  role: string;
  staticLayout: boolean;
  widgets: AutoRepairDashboardWidget[];
  dynamicLayoutMutations?: string[];
  directModuleCouplings?: string[];
  operationalIntent?: string;
  ux?: AutoRepairDashboardUxState;
}

export interface AutoRepairEventLog {
  eventName: string;
  tenantId: string;
  emittedAt: string;
}

export interface AutoRepairFailedActionLog {
  widgetId: string;
  actionId: string;
  failurePolicy: ActionFailurePolicy;
}

export interface AutoRepairSystemSnapshot {
  tenant: AutoRepairTenantSnapshot;
  moduleAssignments: Record<string, ModuleAssignmentState>;
  capabilityMap: Record<string, boolean>;
  widgetRegistry: {
    version: string;
    widgets: AutoRepairWidgetDefinition[];
  };
  uiDashboardState: AutoRepairDashboardState;
  eventBindings: Record<string, string[]>;
  eventLogs: AutoRepairEventLog[];
  failedActionsLog: AutoRepairFailedActionLog[];
  actionHandlers?: Record<string, AutoRepairActionHandler>;
}

export interface AutoRepairActionHandler {
  type: 'RETRY' | 'DEGRADE' | 'ESCALATE';
  target: string;
  attempts?: number;
}

export interface AutoRepairDiagnosis {
  issueType: RepairIssueType;
  affectedComponents: string[];
  message: string;
}

export interface AutoRepairFix {
  repairType: RepairType;
  affectedComponents: string[];
  message: string;
}

export interface AutoRepairDriftPreventionNote {
  ruleViolated: string;
  enforcementApplied: string;
}

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

export interface AutoRepairReport {
  diagnosis: AutoRepairDiagnosis[];
  fixesApplied: AutoRepairFix[];
  systemStateAfterFix: AutoRepairSystemSnapshot & {
    actionHandlers: Record<string, AutoRepairActionHandler>;
  };
  dashboardHealth: AutoRepairDashboardHealth;
  driftPreventionNotes: AutoRepairDriftPreventionNote[];
}

const defaultStateConfigs: Record<RepairWidgetState, AutoRepairWidgetStateConfig> = {
  ACTIVE: { label: 'Active', visibility: 'VISIBLE' },
  EMPTY: { label: 'Empty', visibility: 'VISIBLE', message: 'No data yet' },
  LOCKED: { label: 'Locked', visibility: 'DISABLED', message: 'Capability required' },
  DEGRADED: { label: 'Degraded', visibility: 'READONLY', message: 'Fallback mode active', retryable: true },
  FAILED: { label: 'Failed', visibility: 'VISIBLE', message: 'Retry available', retryable: true },
  LOADING: { label: 'Loading', visibility: 'VISIBLE', message: 'Loading latest data', retryable: false },
};

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

export function repairMyShuleSnapshot(snapshot: AutoRepairSystemSnapshot): AutoRepairReport {
  const diagnosis: AutoRepairDiagnosis[] = [];
  const fixesApplied: AutoRepairFix[] = [];
  const driftPreventionNotes: AutoRepairDriftPreventionNote[] = [];
  const state = cloneSnapshot(snapshot);

  state.actionHandlers = { ...(snapshot.actionHandlers ?? {}) };

  repairCapabilities(state, diagnosis, fixesApplied, driftPreventionNotes);
  repairWidgets(state, diagnosis, fixesApplied, driftPreventionNotes);
  repairEvents(state, diagnosis, fixesApplied, driftPreventionNotes);
  repairButtons(state, diagnosis, fixesApplied, driftPreventionNotes);
  repairDashboard(state, diagnosis, fixesApplied, driftPreventionNotes);
  const dashboardHealth = repairDashboardUxHealth(state, diagnosis, fixesApplied, driftPreventionNotes);

  return {
    diagnosis,
    fixesApplied,
    systemStateAfterFix: state as AutoRepairReport['systemStateAfterFix'],
    dashboardHealth,
    driftPreventionNotes,
  };
}

function repairCapabilities(
  state: AutoRepairSystemSnapshot,
  diagnosis: AutoRepairDiagnosis[],
  fixesApplied: AutoRepairFix[],
  driftPreventionNotes: AutoRepairDriftPreventionNote[],
) {
  for (const [capability, allowed] of Object.entries(state.capabilityMap)) {
    const moduleCode = capability.split(':')[0] ?? capability;
    const moduleState = state.moduleAssignments[moduleCode];

    if (allowed && moduleState === 'DISABLED') {
      state.capabilityMap[capability] = false;
      diagnosis.push({
        issueType: 'CAPABILITY',
        affectedComponents: [capability, moduleCode],
        message: 'Capability allowed while module is disabled',
      });
      fixesApplied.push({
        repairType: 'Capability Repair',
        affectedComponents: [capability],
        message: 'Capability regenerated from module assignment and set to false',
      });
      driftPreventionNotes.push({
        ruleViolated: 'Capability mismatch with module assignment',
        enforcementApplied: 'Capability map aligned with tenant module state',
      });
    }
  }
}

function repairWidgets(
  state: AutoRepairSystemSnapshot,
  diagnosis: AutoRepairDiagnosis[],
  fixesApplied: AutoRepairFix[],
  driftPreventionNotes: AutoRepairDriftPreventionNote[],
) {
  const registryById = new Map(state.widgetRegistry.widgets.map((widget) => [widget.widgetId, widget]));

  for (const dashboardWidget of state.uiDashboardState.widgets) {
    if (!registryById.has(dashboardWidget.widgetId)) {
      const restoredWidget = restoreWidgetDefinition(dashboardWidget);
      state.widgetRegistry.widgets.push(restoredWidget);
      registryById.set(restoredWidget.widgetId, restoredWidget);
      diagnosis.push({
        issueType: 'REGISTRY',
        affectedComponents: [dashboardWidget.widgetId],
        message: 'Dashboard referenced a widget missing from registry',
      });
      fixesApplied.push({
        repairType: 'Widget Repair',
        affectedComponents: [dashboardWidget.widgetId],
        message: 'Restored missing widget definition from dashboard snapshot metadata',
      });
    }
  }

  for (const widget of state.widgetRegistry.widgets) {
    const missingStates = requiredRepairWidgetStates.filter((widgetState) => !widget.states[widgetState]);
    if (missingStates.length > 0) {
      for (const missingState of missingStates) {
        widget.states[missingState] = defaultStateConfigs[missingState];
      }
      diagnosis.push({
        issueType: 'REGISTRY',
        affectedComponents: [widget.widgetId],
        message: `Widget missing state mappings: ${missingStates.join(', ')}`,
      });
      fixesApplied.push({
        repairType: 'Widget Repair',
        affectedComponents: [widget.widgetId],
        message: 'Completed six-state widget mapping',
      });
    }
  }

  for (const dashboardWidget of state.uiDashboardState.widgets) {
    const lockedReason = shouldLockWidget(dashboardWidget, state);

    if (!dashboardWidget.visible) {
      dashboardWidget.visible = true;
      diagnosis.push({
        issueType: 'UI',
        affectedComponents: [dashboardWidget.widgetId],
        message: 'Widget was hidden instead of exposed safely',
      });
      fixesApplied.push({
        repairType: 'Widget Repair',
        affectedComponents: [dashboardWidget.widgetId],
        message: 'Widget visibility restored',
      });
      driftPreventionNotes.push({
        ruleViolated: 'Widgets must never be hidden or deleted silently',
        enforcementApplied: 'Widget made visible and safe state applied',
      });
    }

    if (lockedReason && dashboardWidget.state !== 'LOCKED') {
      dashboardWidget.state = 'LOCKED';
      diagnosis.push({
        issueType: 'CAPABILITY',
        affectedComponents: [dashboardWidget.widgetId],
        message: lockedReason,
      });
      fixesApplied.push({
        repairType: 'Widget Repair',
        affectedComponents: [dashboardWidget.widgetId],
        message: 'Widget state repaired to LOCKED',
      });
    }
  }
}

function repairEvents(
  state: AutoRepairSystemSnapshot,
  diagnosis: AutoRepairDiagnosis[],
  fixesApplied: AutoRepairFix[],
  driftPreventionNotes: AutoRepairDriftPreventionNote[],
) {
  for (const widget of state.widgetRegistry.widgets) {
    for (const eventName of widget.eventSubscriptions) {
      const existing = state.eventBindings[eventName] ?? [];
      if (!existing.includes(widget.widgetId)) {
        state.eventBindings[eventName] = unique([...existing, widget.widgetId]);
        diagnosis.push({
          issueType: 'EVENT',
          affectedComponents: [eventName, widget.widgetId],
          message: 'Registry event subscription was not bound',
        });
        fixesApplied.push({
          repairType: 'Event Repair',
          affectedComponents: [eventName],
          message: 'Event-to-widget subscription mapping rebuilt',
        });
      }
    }
  }

  for (const event of state.eventLogs) {
    const subscribers = state.widgetRegistry.widgets
      .filter((widget) => widget.eventSubscriptions.includes(event.eventName))
      .map((widget) => widget.widgetId);
    const existing = state.eventBindings[event.eventName] ?? [];
    const missingSubscribers = subscribers.filter((widgetId) => !existing.includes(widgetId));

    if (missingSubscribers.length > 0) {
      state.eventBindings[event.eventName] = unique([...existing, ...missingSubscribers]);
      diagnosis.push({
        issueType: 'EVENT',
        affectedComponents: [event.eventName, ...missingSubscribers],
        message: 'Event emitted without all registry subscribers bound',
      });
      fixesApplied.push({
        repairType: 'Event Repair',
        affectedComponents: [event.eventName],
        message: 'Event-to-widget subscription mapping rebuilt',
      });
      driftPreventionNotes.push({
        ruleViolated: 'Events must refresh subscribed widgets through registry bindings',
        enforcementApplied: 'Missing event listeners restored from widget registry',
      });
    }
  }
}

function repairButtons(
  state: AutoRepairSystemSnapshot,
  diagnosis: AutoRepairDiagnosis[],
  fixesApplied: AutoRepairFix[],
  driftPreventionNotes: AutoRepairDriftPreventionNote[],
) {
  const actionHandlers = state.actionHandlers ?? {};
  state.actionHandlers = actionHandlers;

  for (const failedAction of state.failedActionsLog) {
    const handlerKey = `${failedAction.widgetId}:${failedAction.actionId}`;
    if (actionHandlers[handlerKey]) {
      continue;
    }

    actionHandlers[handlerKey] = fallbackHandlerFor(failedAction);
    diagnosis.push({
      issueType: 'BUTTON',
      affectedComponents: [handlerKey],
      message: 'Button action failed without an execution handler',
    });
    fixesApplied.push({
      repairType: 'Button Repair',
      affectedComponents: [handlerKey],
      message: 'Fallback execution handler attached',
    });
    driftPreventionNotes.push({
      ruleViolated: 'Broken buttons are repaired, not hidden',
      enforcementApplied: `${failedAction.failurePolicy} fallback attached`,
    });
  }
}

function repairDashboard(
  state: AutoRepairSystemSnapshot,
  diagnosis: AutoRepairDiagnosis[],
  fixesApplied: AutoRepairFix[],
  driftPreventionNotes: AutoRepairDriftPreventionNote[],
) {
  const hadDynamicMutation = (state.uiDashboardState.dynamicLayoutMutations?.length ?? 0) > 0;
  const hadDirectCoupling = (state.uiDashboardState.directModuleCouplings?.length ?? 0) > 0;

  if (!state.uiDashboardState.staticLayout || hadDynamicMutation || hadDirectCoupling) {
    diagnosis.push({
      issueType: 'UI',
      affectedComponents: [state.uiDashboardState.dashboardId],
      message: 'Dashboard layout drift or direct module coupling detected',
    });

    state.uiDashboardState.staticLayout = true;
    state.uiDashboardState.dynamicLayoutMutations = [];
    state.uiDashboardState.directModuleCouplings = [];

    fixesApplied.push({
      repairType: 'Dashboard Repair',
      affectedComponents: [state.uiDashboardState.dashboardId],
      message: 'Static dashboard layout rehydrated and illegal module coupling removed',
    });
    driftPreventionNotes.push({
      ruleViolated: 'Dashboards must not mutate layout dynamically or couple directly to modules',
      enforcementApplied: 'Static role layout restored; module coupling cleared',
    });
  }
}

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

function restoreWidgetDefinition(widget: AutoRepairDashboardWidget): AutoRepairWidgetDefinition {
  return {
    widgetId: widget.widgetId,
    name: widget.widgetId,
    moduleSource: widget.moduleSource,
    capabilitiesRequired: [...widget.capabilitiesRequired],
    eventSubscriptions: [...widget.eventSubscriptions],
    states: { ...defaultStateConfigs },
    actions: [],
  };
}

function shouldLockWidget(widget: AutoRepairDashboardWidget, state: AutoRepairSystemSnapshot): string | null {
  const moduleState = state.moduleAssignments[widget.moduleSource];
  if (moduleState === 'DISABLED') {
    return 'Module disabled; widget must render as LOCKED';
  }

  const missingCapability = widget.capabilitiesRequired.find((capability) => state.capabilityMap[capability] !== true);
  if (missingCapability) {
    return `Capability denied: ${missingCapability}`;
  }

  return null;
}

function fallbackHandlerFor(action: AutoRepairFailedActionLog): AutoRepairActionHandler {
  if (action.failurePolicy === 'ESCALATE') {
    return {
      type: 'ESCALATE',
      target: `system.log.escalate.${action.widgetId}.${action.actionId}`,
    };
  }

  if (action.failurePolicy === 'DEGRADE') {
    return {
      type: 'DEGRADE',
      target: `auto-repair.degrade.${action.widgetId}.${action.actionId}`,
    };
  }

  return {
    type: 'RETRY',
    target: `auto-repair.retry.${action.widgetId}.${action.actionId}`,
    attempts: 3,
  };
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

function cloneSnapshot(snapshot: AutoRepairSystemSnapshot): AutoRepairSystemSnapshot {
  return {
    tenant: { ...snapshot.tenant },
    moduleAssignments: { ...snapshot.moduleAssignments },
    capabilityMap: { ...snapshot.capabilityMap },
    widgetRegistry: {
      version: snapshot.widgetRegistry.version,
      widgets: snapshot.widgetRegistry.widgets.map((widget) => ({
        ...widget,
        capabilitiesRequired: [...widget.capabilitiesRequired],
        eventSubscriptions: [...widget.eventSubscriptions],
        states: { ...widget.states },
        actions: widget.actions.map((action) => ({ ...action })),
      })),
    },
    uiDashboardState: {
      ...snapshot.uiDashboardState,
      dynamicLayoutMutations: [...(snapshot.uiDashboardState.dynamicLayoutMutations ?? [])],
      directModuleCouplings: [...(snapshot.uiDashboardState.directModuleCouplings ?? [])],
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
      widgets: snapshot.uiDashboardState.widgets.map((widget) => ({
        ...widget,
        capabilitiesRequired: [...widget.capabilitiesRequired],
        eventSubscriptions: [...widget.eventSubscriptions],
        intents: [...(widget.intents ?? [])],
        relocationTarget: widget.relocationTarget,
        primarySurface: widget.primarySurface,
      })),
    },
    eventBindings: Object.fromEntries(
      Object.entries(snapshot.eventBindings).map(([eventName, widgetIds]) => [eventName, [...widgetIds]]),
    ),
    eventLogs: snapshot.eventLogs.map((event) => ({ ...event })),
    failedActionsLog: snapshot.failedActionsLog.map((action) => ({ ...action })),
    actionHandlers: Object.fromEntries(
      Object.entries(snapshot.actionHandlers ?? {}).map(([handlerKey, handler]) => [handlerKey, { ...handler }]),
    ),
  };
}
