import type { PlatformWidgetState } from './platform-governance';

export type ArchitectureButtonState = 'ACTIVE' | 'DEGRADED' | 'FAILED' | 'LOCKED';
export type ArchitectureRuntimeStatus = 'pass' | 'fail' | 'degraded';
export type ArchitectureRuntimeCheckStatus = 'pass' | 'fail' | 'degraded';
export type ArchitectureRepairAction =
  | 'ATTACH_FALLBACK_HANDLER'
  | 'QUARANTINE_CROSS_TENANT_STATE'
  | 'REPLAY_TENANT_EVENT_STREAM'
  | 'REBUILD_EVENT_BINDING'
  | 'LOCK_UNAUTHORIZED_WIDGET'
  | 'RESTORE_VISIBLE_FAILURE_STATE'
  | 'WRITE_AUDIT_RECORD';

export interface ArchitectureRuntimeContext {
  tenantId: string;
  userId: string | null;
  role: string | null;
  lifecycleState: string;
  billingState: string;
  enabledModules: string[];
  capabilities: string[];
  requestId: string;
  traceId: string;
}

export interface ArchitectureRuntimeCommand {
  commandId: string;
  tenantId: string;
  action: string;
  capabilityRequired: string;
}

export interface ArchitectureRuntimeEvent {
  eventId: string;
  tenantId: string;
  name: string;
  aggregateType: string;
  aggregateId: string;
  payloadTenantId: string;
  emittedAt: string;
}

export interface ArchitectureRuntimeProjection {
  name: string;
  tenantId: string;
  sourceEventId: string;
  updatedAt: string;
}

export interface ArchitectureRuntimeWidget {
  widgetId: string;
  dashboardId: string;
  moduleSource: string;
  state: PlatformWidgetState;
  visible: boolean;
  capabilitiesRequired: string[];
  eventSubscriptions: string[];
}

export interface ArchitectureRuntimeButton {
  actionId: string;
  state: ArchitectureButtonState;
  visible: boolean;
  capabilityRequired: string;
  handler: string | null;
  failurePolicy: 'RETRY' | 'DEGRADE' | 'ESCALATE';
}

export interface ArchitectureRuntimeAuditRecord {
  tenantId: string;
  actorUserId: string | null;
  action: string;
  eventId: string;
  recordedAt: string;
}

export interface ArchitectureRuntimeContractInput {
  runtime: ArchitectureRuntimeContext;
  command: ArchitectureRuntimeCommand;
  event: ArchitectureRuntimeEvent | null;
  projection: ArchitectureRuntimeProjection | null;
  widget: ArchitectureRuntimeWidget;
  button: ArchitectureRuntimeButton;
  audit: ArchitectureRuntimeAuditRecord | null;
}

export interface ArchitectureRuntimeCheck {
  name: string;
  status: ArchitectureRuntimeCheckStatus;
  evidence: string;
  enforcement: string;
}

export interface ArchitectureRuntimeViolation {
  rule: string;
  affectedComponents: string[];
  enforcement: string;
}

export interface ArchitectureRepairStep {
  action: ArchitectureRepairAction;
  target: string;
  reason: string;
  attempts?: number;
}

export interface ArchitectureRuntimeEdges {
  commandToEvent: string;
  eventToProjection: string;
  eventToWidget: string;
  widgetToAudit: string;
}

export interface ArchitectureRuntimeReport {
  status: ArchitectureRuntimeStatus;
  score: number;
  checks: ArchitectureRuntimeCheck[];
  violations: ArchitectureRuntimeViolation[];
  repairPlan: ArchitectureRepairStep[];
  runtimeEdges: ArchitectureRuntimeEdges;
}

const suspendedLifecycleStates = new Set(['SUSPENDED', 'ARCHIVED']);
const validWidgetStates = new Set<PlatformWidgetState>([
  'ACTIVE',
  'EMPTY',
  'LOCKED',
  'DEGRADED',
  'FAILED',
  'LOADING',
]);

export function evaluateArchitectureRuntimeContract(
  input: ArchitectureRuntimeContractInput,
): ArchitectureRuntimeReport {
  const checks: ArchitectureRuntimeCheck[] = [];
  const violations: ArchitectureRuntimeViolation[] = [];
  const repairPlan: ArchitectureRepairStep[] = [];

  addAgpCapabilityCheck(input, checks, violations);
  addTenantIsolationCheck(input, checks, violations, repairPlan);
  addEventBusCheck(input, checks, violations, repairPlan);
  addProjectionCheck(input, checks, violations, repairPlan);
  addWidgetSynchronizationCheck(input, checks, violations, repairPlan);
  addButtonExecutionCheck(input, checks, violations, repairPlan);
  addAuditBindingCheck(input, checks, violations, repairPlan);
  addSelfHealingVisibilityCheck(input, checks, violations, repairPlan);

  const failedChecks = checks.filter((check) => check.status === 'fail').length;
  const degradedChecks = checks.filter((check) => check.status === 'degraded').length;

  return {
    status: failedChecks > 0 ? 'fail' : degradedChecks > 0 ? 'degraded' : 'pass',
    score: Math.max(0, 100 - failedChecks * 25 - degradedChecks * 8),
    checks,
    violations,
    repairPlan: dedupeRepairPlan(repairPlan),
    runtimeEdges: {
      commandToEvent: `${input.command.commandId} -> ${input.event?.name ?? 'NO_EVENT'}`,
      eventToProjection: `${input.event?.eventId ?? 'NO_EVENT'} -> ${input.projection?.name ?? 'NO_PROJECTION'}`,
      eventToWidget: `${input.event?.name ?? 'NO_EVENT'} -> ${input.widget.widgetId}`,
      widgetToAudit: `${input.widget.widgetId} -> ${input.audit?.eventId ?? 'NO_AUDIT'}`,
    },
  };
}

function addAgpCapabilityCheck(
  input: ArchitectureRuntimeContractInput,
  checks: ArchitectureRuntimeCheck[],
  violations: ArchitectureRuntimeViolation[],
) {
  const hasIdentity = Boolean(input.runtime.tenantId && input.runtime.userId && input.runtime.requestId);
  const capabilityAllowed = hasCapability(input.runtime.capabilities, input.command.capabilityRequired);
  const lifecycleAllowsAccess = !suspendedLifecycleStates.has(input.runtime.lifecycleState);
  const tenantMatchesCommand = input.runtime.tenantId === input.command.tenantId;
  const passed = hasIdentity && capabilityAllowed && lifecycleAllowsAccess && tenantMatchesCommand;

  checks.push({
    name: 'AGP capability validation',
    status: passed ? 'pass' : 'fail',
    evidence: passed
      ? `${input.command.capabilityRequired} authorized for ${input.runtime.role ?? 'unknown-role'}`
      : 'Identity, tenant, lifecycle, or command capability validation failed',
    enforcement: 'Every command must pass tenant, identity, lifecycle, and capability validation before execution',
  });

  if (!passed) {
    violations.push({
      rule: 'Capability engine controls execution',
      affectedComponents: [input.command.action, input.command.capabilityRequired],
      enforcement: 'Reject command before mutation and force capability recalculation',
    });
  }
}

function addTenantIsolationCheck(
  input: ArchitectureRuntimeContractInput,
  checks: ArchitectureRuntimeCheck[],
  violations: ArchitectureRuntimeViolation[],
  repairPlan: ArchitectureRepairStep[],
) {
  const tenantIds = [
    input.runtime.tenantId,
    input.command.tenantId,
    input.event?.tenantId,
    input.event?.payloadTenantId,
    input.projection?.tenantId,
    input.audit?.tenantId,
  ].filter((tenantId): tenantId is string => Boolean(tenantId));
  const uniqueTenantIds = [...new Set(tenantIds)];
  const passed = uniqueTenantIds.length === 1;

  checks.push({
    name: 'Tenant isolation',
    status: passed ? 'pass' : 'fail',
    evidence: passed
      ? `All runtime artifacts are scoped to ${input.runtime.tenantId}`
      : `Tenant drift detected: ${uniqueTenantIds.join(', ')}`,
    enforcement: 'Commands, events, projections, widgets, and audits must stay tenant-scoped',
  });

  if (!passed) {
    violations.push({
      rule: 'Strict tenant isolation',
      affectedComponents: ['runtime', 'command', 'event', 'projection', 'audit'],
      enforcement: 'Quarantine cross-tenant state and replay the affected tenant event stream',
    });
    repairPlan.push({
      action: 'QUARANTINE_CROSS_TENANT_STATE',
      target: input.projection?.name ?? input.event?.eventId ?? input.command.commandId,
      reason: 'Runtime artifact belongs to a different tenant',
    });
    repairPlan.push({
      action: 'REPLAY_TENANT_EVENT_STREAM',
      target: input.runtime.tenantId,
      reason: 'Rebuild tenant projections from canonical events',
    });
  }
}

function addEventBusCheck(
  input: ArchitectureRuntimeContractInput,
  checks: ArchitectureRuntimeCheck[],
  violations: ArchitectureRuntimeViolation[],
  repairPlan: ArchitectureRepairStep[],
) {
  const event = input.event;
  const passed = Boolean(
    event?.eventId
    && event.name
    && event.tenantId === input.runtime.tenantId
    && event.payloadTenantId === input.runtime.tenantId
    && event.emittedAt,
  );

  checks.push({
    name: 'Event bus mutation record',
    status: passed ? 'pass' : 'fail',
    evidence: passed
      ? `${event?.name} emitted for ${event?.aggregateType}:${event?.aggregateId}`
      : 'Mutation is missing a tenant-scoped event bus record',
    enforcement: 'If it did not pass through the event bus, it did not happen',
  });

  if (!passed) {
    violations.push({
      rule: 'Event-driven communication only',
      affectedComponents: [input.command.action],
      enforcement: 'Reject direct mutation and rebuild through command-to-event flow',
    });
    repairPlan.push({
      action: 'REPLAY_TENANT_EVENT_STREAM',
      target: input.runtime.tenantId,
      reason: 'Recover missing or invalid event stream entry',
    });
  }
}

function addProjectionCheck(
  input: ArchitectureRuntimeContractInput,
  checks: ArchitectureRuntimeCheck[],
  violations: ArchitectureRuntimeViolation[],
  repairPlan: ArchitectureRepairStep[],
) {
  const projection = input.projection;
  const event = input.event;
  const passed = Boolean(
    projection
    && event
    && projection.tenantId === event.tenantId
    && projection.sourceEventId === event.eventId
    && projection.updatedAt,
  );

  checks.push({
    name: 'Projection contract',
    status: passed ? 'pass' : 'fail',
    evidence: passed
      ? `${projection?.name} rebuilt from ${event?.eventId}`
      : 'Projection is not bound to the source event and tenant',
    enforcement: 'Databases are projections and must be rebuildable from tenant event streams',
  });

  if (!passed) {
    violations.push({
      rule: 'Database contract layer',
      affectedComponents: [projection?.name ?? 'missing-projection'],
      enforcement: 'Invalidate stale projection and replay canonical tenant events',
    });
    repairPlan.push({
      action: 'REPLAY_TENANT_EVENT_STREAM',
      target: input.runtime.tenantId,
      reason: 'Rebuild projection from event source',
    });
  }
}

function addWidgetSynchronizationCheck(
  input: ArchitectureRuntimeContractInput,
  checks: ArchitectureRuntimeCheck[],
  violations: ArchitectureRuntimeViolation[],
  repairPlan: ArchitectureRepairStep[],
) {
  const widget = input.widget;
  const eventName = input.event?.name;
  const moduleEnabled = input.runtime.enabledModules.includes(widget.moduleSource);
  const capabilitiesAllowed = widget.capabilitiesRequired.every((capability) =>
    hasCapability(input.runtime.capabilities, capability),
  );
  const subscribed = Boolean(eventName && widget.eventSubscriptions.includes(eventName));
  const validState = validWidgetStates.has(widget.state);
  const authorizedActiveWidget = moduleEnabled && capabilitiesAllowed && subscribed && widget.state === 'ACTIVE';
  const authorizedNonterminalWidget =
    moduleEnabled
    && capabilitiesAllowed
    && subscribed
    && ['EMPTY', 'LOADING'].includes(widget.state);
  const safeFailureWidget =
    moduleEnabled
    && capabilitiesAllowed
    && subscribed
    && ['DEGRADED', 'FAILED'].includes(widget.state)
    && widget.visible;
  const safeLockedWidget = (!moduleEnabled || !capabilitiesAllowed) && widget.state === 'LOCKED' && widget.visible;
  const passed = widget.visible && validState && (authorizedActiveWidget || authorizedNonterminalWidget || safeLockedWidget);
  const degraded = widget.visible && validState && safeFailureWidget;

  checks.push({
    name: 'Widget synchronization',
    status: passed ? 'pass' : degraded ? 'degraded' : 'fail',
    evidence: passed || degraded
      ? `${widget.widgetId} renders ${widget.state} from ${eventName ?? 'no-event'}`
      : `${widget.widgetId} is not synchronized through capability and event binding`,
    enforcement: 'Widgets render state from registry, capabilities, and event subscriptions only',
  });

  if (degraded) {
    repairPlan.push({
      action: 'REBUILD_EVENT_BINDING',
      target: widget.widgetId,
      reason: 'Widget is visible but degraded; refresh registry subscription and fallback data',
    });
  }

  if (!passed && !degraded) {
    violations.push({
      rule: 'Widget-based UI only',
      affectedComponents: [widget.widgetId],
      enforcement: 'Restore visible widget state and route rendering through capability-aware registry binding',
    });
    repairPlan.push({
      action: widget.visible ? 'LOCK_UNAUTHORIZED_WIDGET' : 'RESTORE_VISIBLE_FAILURE_STATE',
      target: widget.widgetId,
      reason: 'Widget must remain visible and capability-safe',
    });
  }
}

function addButtonExecutionCheck(
  input: ArchitectureRuntimeContractInput,
  checks: ArchitectureRuntimeCheck[],
  violations: ArchitectureRuntimeViolation[],
  repairPlan: ArchitectureRepairStep[],
) {
  const button = input.button;
  const capabilityAllowed = hasCapability(input.runtime.capabilities, button.capabilityRequired);
  const passed = button.visible && capabilityAllowed && button.state === 'ACTIVE' && Boolean(button.handler);
  const lockedSafely = button.visible && !capabilityAllowed && button.state === 'LOCKED';
  const degraded = button.visible && capabilityAllowed && (button.state === 'DEGRADED' || button.state === 'FAILED' || !button.handler);

  checks.push({
    name: 'Button execution mapping',
    status: passed || lockedSafely ? 'pass' : degraded ? 'degraded' : 'fail',
    evidence: passed
      ? `${button.actionId} mapped to ${button.handler}`
      : lockedSafely
        ? `${button.actionId} is visible and locked by capability`
        : degraded
          ? `${button.actionId} needs fallback execution repair`
          : `${button.actionId} is not capability-safe`,
    enforcement: 'Buttons stay visible and execute only through capability-checked handlers',
  });

  if (degraded) {
    repairPlan.push({
      action: 'ATTACH_FALLBACK_HANDLER',
      target: button.actionId,
      reason: `${button.failurePolicy} fallback required for failed action mapping`,
      attempts: button.failurePolicy === 'RETRY' ? 3 : undefined,
    });
  }

  if (!passed && !lockedSafely && !degraded) {
    violations.push({
      rule: 'Button execution engine',
      affectedComponents: [button.actionId],
      enforcement: 'Restore visible locked, active, or degraded action mapping',
    });
    repairPlan.push({
      action: 'ATTACH_FALLBACK_HANDLER',
      target: button.actionId,
      reason: 'Action needs a safe execution handler',
      attempts: 3,
    });
  }
}

function addAuditBindingCheck(
  input: ArchitectureRuntimeContractInput,
  checks: ArchitectureRuntimeCheck[],
  violations: ArchitectureRuntimeViolation[],
  repairPlan: ArchitectureRepairStep[],
) {
  const audit = input.audit;
  const event = input.event;
  const passed = Boolean(
    audit
    && event
    && audit.tenantId === input.runtime.tenantId
    && audit.actorUserId === input.runtime.userId
    && audit.action === input.command.action
    && audit.eventId === event.eventId
    && audit.recordedAt,
  );

  checks.push({
    name: 'Audit binding',
    status: passed ? 'pass' : 'fail',
    evidence: passed
      ? `${audit?.action} audit-bound to ${audit?.eventId}`
      : 'Execution is missing immutable tenant audit evidence',
    enforcement: 'Every mutation path must emit auditable identity, tenant, command, and event evidence',
  });

  if (!passed) {
    violations.push({
      rule: 'Audit and compliance layer',
      affectedComponents: [input.command.action],
      enforcement: 'Write immutable audit record before exposing workflow as complete',
    });
    repairPlan.push({
      action: 'WRITE_AUDIT_RECORD',
      target: input.command.action,
      reason: 'Audit evidence is missing or mismatched',
    });
  }
}

function addSelfHealingVisibilityCheck(
  input: ArchitectureRuntimeContractInput,
  checks: ArchitectureRuntimeCheck[],
  violations: ArchitectureRuntimeViolation[],
  repairPlan: ArchitectureRepairStep[],
) {
  const widgetVisible = input.widget.visible;
  const buttonVisible = input.button.visible;
  const failureIsExposed =
    !['FAILED', 'DEGRADED'].includes(input.widget.state)
    || repairPlan.some((step) => step.target === input.widget.widgetId || step.action === 'REBUILD_EVENT_BINDING');
  const buttonRepairable =
    input.button.state !== 'FAILED'
    || repairPlan.some((step) => step.action === 'ATTACH_FALLBACK_HANDLER' && step.target === input.button.actionId);
  const passed = widgetVisible && buttonVisible && failureIsExposed && buttonRepairable;

  checks.push({
    name: 'Self-healing visibility',
    status: passed ? 'pass' : 'fail',
    evidence: passed
      ? 'Failure surfaces remain visible with repair or fallback paths'
      : 'A failed widget or action was hidden or left without repair path',
    enforcement: 'Never hide failure. Repair, degrade, or expose it safely',
  });

  if (!passed) {
    violations.push({
      rule: 'Self-healing system design',
      affectedComponents: [input.widget.widgetId, input.button.actionId],
      enforcement: 'Restore visible failure state and attach deterministic repair workflow',
    });
    repairPlan.push({
      action: 'RESTORE_VISIBLE_FAILURE_STATE',
      target: input.widget.widgetId,
      reason: 'Failure must remain visible while repair runs',
    });
  }
}

function hasCapability(capabilities: string[], requiredCapability: string): boolean {
  if (capabilities.includes('*:*') || capabilities.includes(requiredCapability)) {
    return true;
  }

  const [resource] = requiredCapability.split(':');

  return capabilities.includes(`${resource}:*`);
}

function dedupeRepairPlan(repairPlan: ArchitectureRepairStep[]): ArchitectureRepairStep[] {
  const seen = new Set<string>();

  return repairPlan.filter((step) => {
    const key = `${step.action}:${step.target}`;

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}
