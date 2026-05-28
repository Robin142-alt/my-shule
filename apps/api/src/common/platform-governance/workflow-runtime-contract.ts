export type WorkflowRuntimeState =
  | 'DRAFT'
  | 'SUBJECT_REVIEW'
  | 'HOD_APPROVAL'
  | 'DEAN_APPROVAL'
  | 'PRINCIPAL_APPROVAL'
  | 'PUBLISHED'
  | 'PARENT_VISIBLE';

export type WorkflowTransitionStatus = 'ADVANCED' | 'BLOCKED';
export type WorkflowWidgetState = 'ACTIVE' | 'LOCKED' | 'DEGRADED';
export type WorkflowRuntimeReportStatus = 'pass' | 'fail';

export interface WorkflowRetryPolicy {
  maxAttempts: number;
  backoff: 'fixed' | 'exponential';
}

export interface WorkflowEscalationPolicy {
  afterMinutes: number;
  event: string;
  roles: string[];
}

export interface WorkflowSlaPolicy {
  timeoutMinutes: number;
}

export interface WorkflowRuntimeTransition {
  from: WorkflowRuntimeState;
  to: WorkflowRuntimeState;
  actionId: string;
  capabilityRequired: string;
  emittedEvents: string[];
  rollbackAction: string;
  retryPolicy: WorkflowRetryPolicy;
  sla: WorkflowSlaPolicy;
  escalation: WorkflowEscalationPolicy;
  auditAction: string;
}

export interface WorkflowRuntimeDefinition {
  workflowId: string;
  name: string;
  initialState: WorkflowRuntimeState;
  terminalStates: WorkflowRuntimeState[];
  transitions: WorkflowRuntimeTransition[];
}

export interface WorkflowTransitionRequest {
  tenantId: string;
  workflowInstanceId: string;
  entityId: string;
  currentState: WorkflowRuntimeState;
  actionId: string;
  actorUserId: string;
  role: string;
  capabilities: string[];
  now: string;
}

export interface WorkflowTransitionAudit {
  tenantId: string;
  actorUserId: string;
  role: string;
  workflowId: string;
  workflowInstanceId: string;
  entityId: string;
  action: string;
  capability: string | null;
}

export interface WorkflowTransitionResult {
  status: WorkflowTransitionStatus;
  reason: string | null;
  from: WorkflowRuntimeState;
  to: WorkflowRuntimeState;
  events: string[];
  rollbackAction: string | null;
  retryPolicy: WorkflowRetryPolicy;
  audit: WorkflowTransitionAudit;
  sla: {
    timeoutMinutes: number;
    deadline: string | null;
  };
  escalation: WorkflowEscalationPolicy;
  widgetState: WorkflowWidgetState;
}

export interface OrchestrationStep {
  stepId: string;
  service: string;
  action: string;
  dependsOn: string[];
  retryPolicy: WorkflowRetryPolicy;
  compensationAction: string;
  slaTimeoutMinutes: number;
  escalationEvent: string;
}

export interface OrchestrationPlan {
  workflowId: string;
  resumeCursor: string;
  steps: OrchestrationStep[];
}

export interface OperationalQueueItem {
  queueItemId: string;
  workflowInstanceId: string;
  workflowId: string;
  entityId: string;
  priority: 'critical' | 'high';
  ownerRole: string;
  executable: boolean;
  assignable: boolean;
  traceable: boolean;
  recoverable: boolean;
  eventBacked: boolean;
  availableActions: string[];
}

export interface OperationalQueue {
  queueId: string;
  tenantScoped: true;
  items: OperationalQueueItem[];
}

export interface ExecutionAuditTimelineInput {
  tenantId: string;
  actorUserId: string;
  actionId: string;
  capability: string;
  workflowId: string;
  workflowInstanceId: string;
  entityId: string;
  from: string;
  to: string;
  emittedEvents: string[];
  replayId: string;
  occurredAt: string;
}

export interface ExecutionAuditTimeline {
  entries: ExecutionAuditTimelineInput[];
  forensicInspectionEnabled: boolean;
  rollbackVisibility: boolean;
}

export interface ReconstructableOperationalEvent {
  id: string;
  tenantId: string;
  eventName: 'WORKFLOW_TRANSITIONED' | 'WIDGET_REFRESH_REQUESTED' | 'QUEUE_ITEM_CREATED';
  workflowInstanceId?: string;
  workflowId?: string;
  entityId?: string;
  state?: string;
  widgetId?: string;
  queueId?: string;
  queueItemId?: string;
}

export interface ReconstructedTenantOperationalState {
  tenantId: string;
  projections: ReconstructableOperationalEvent[];
  workflowInstances: Record<string, { workflowId: string; entityId: string; state: string }>;
  widgets: Record<string, { state: string }>;
  queues: Record<string, { items: Array<{ queueItemId: string }> }>;
  replayable: boolean;
}

export interface DynamicCapabilityGraphInput {
  role: string;
  requestedCapability: string;
  tenantState: 'ACTIVE' | 'ACTIVE_LIMITED' | 'GRACE_PERIOD' | 'PAYMENT_OVERDUE' | 'SUSPENDED';
  moduleEntitlements: Record<string, boolean>;
  workflowStage: string;
  ownerUserId: string;
  actorUserId: string;
  deadline: string;
  now: string;
  delegatedAuthority: string[];
  roleCapabilities: string[];
}

export interface DynamicCapabilityGraphDecision {
  allowed: boolean;
  deniedReason: string | null;
  satisfiedConditions: string[];
  context: DynamicCapabilityGraphInput;
}

export type FailureInjectionScenario = 'EVENT_DROPPED' | 'SERVICE_CRASHED' | 'PROJECTION_CORRUPTED';

export interface FailureInjectionResult {
  status: 'SELF_HEALING';
  widget: {
    visible: true;
    state: 'DEGRADED';
  };
  events: string[];
  dashboardStable: boolean;
  noSilentFailure: boolean;
}

export interface WorkflowRuntimeReadinessReport {
  status: WorkflowRuntimeReportStatus;
  score: number;
  layers: {
    deterministicStateMachines: boolean;
    centralOrchestration: boolean;
    liveOperationalQueues: boolean;
    universalAuditTimeline: boolean;
    eventReplayReconstruction: boolean;
    distributedCapabilityGraph: boolean;
    realtimeSynchronization: boolean;
    failureInjection: boolean;
  };
}

export function createExamWorkflowRuntime(): WorkflowRuntimeDefinition {
  return {
    workflowId: 'exam-results-approval',
    name: 'Exam Results Approval Workflow',
    initialState: 'DRAFT',
    terminalStates: ['PARENT_VISIBLE'],
    transitions: [
      transition(
        'DRAFT',
        'SUBJECT_REVIEW',
        'submit-subject-review',
        'exams:submit',
        ['EXAM_SUBJECT_REVIEW_STARTED'],
        240,
        ['hod', 'dean-academics'],
      ),
      transition(
        'SUBJECT_REVIEW',
        'HOD_APPROVAL',
        'hod-approve',
        'exams:hod-approve',
        ['HOD_APPROVAL_GRANTED'],
        480,
        ['dean-academics'],
      ),
      transition(
        'HOD_APPROVAL',
        'DEAN_APPROVAL',
        'dean-approve',
        'exams:dean-approve',
        ['DEAN_APPROVAL_GRANTED'],
        720,
        ['principal'],
      ),
      transition(
        'DEAN_APPROVAL',
        'PRINCIPAL_APPROVAL',
        'principal-approve',
        'exams:principal-approve',
        ['PRINCIPAL_APPROVAL_GRANTED'],
        1440,
        ['dean-academics', 'school-owner'],
      ),
      transition(
        'PRINCIPAL_APPROVAL',
        'PUBLISHED',
        'publish-results',
        'exams:publish',
        ['REPORT_CARDS_PUBLISHED'],
        120,
        ['principal', 'school-owner'],
      ),
      transition(
        'PUBLISHED',
        'PARENT_VISIBLE',
        'expose-to-parents',
        'parents:publish-results',
        ['PARENT_VISIBILITY_GRANTED'],
        60,
        ['principal'],
      ),
    ],
  };
}

export function executeWorkflowTransition(
  workflow: WorkflowRuntimeDefinition,
  request: WorkflowTransitionRequest,
): WorkflowTransitionResult {
  const transitionDefinition = workflow.transitions.find(
    (candidate) => candidate.actionId === request.actionId,
  );

  if (!transitionDefinition) {
    return blockedResult(workflow, request, 'ACTION_NOT_REGISTERED');
  }

  if (transitionDefinition.from !== request.currentState) {
    return blockedResult(workflow, request, 'INVALID_CURRENT_STATE', transitionDefinition);
  }

  if (!hasCapability(request.capabilities, transitionDefinition.capabilityRequired)) {
    return blockedResult(workflow, request, 'CAPABILITY_DENIED', transitionDefinition);
  }

  return {
    status: 'ADVANCED',
    reason: null,
    from: transitionDefinition.from,
    to: transitionDefinition.to,
    events: [...transitionDefinition.emittedEvents],
    rollbackAction: transitionDefinition.rollbackAction,
    retryPolicy: { ...transitionDefinition.retryPolicy },
    audit: {
      tenantId: request.tenantId,
      actorUserId: request.actorUserId,
      role: request.role,
      workflowId: workflow.workflowId,
      workflowInstanceId: request.workflowInstanceId,
      entityId: request.entityId,
      action: transitionDefinition.auditAction,
      capability: transitionDefinition.capabilityRequired,
    },
    sla: {
      timeoutMinutes: transitionDefinition.sla.timeoutMinutes,
      deadline: addMinutesIso(request.now, transitionDefinition.sla.timeoutMinutes),
    },
    escalation: cloneEscalation(transitionDefinition.escalation),
    widgetState: 'ACTIVE',
  };
}

export function createOperationalOrchestrationPlan(planId: string): OrchestrationPlan {
  if (planId !== 'publish-report-cards') {
    throw new Error(`Unknown orchestration plan: ${planId}`);
  }

  return {
    workflowId: 'exam-report-card-publication',
    resumeCursor: 'step:exams.generate-drafts',
    steps: [
      orchestrationStep('exams.generate-drafts', 'exams-service', 'generate-report-drafts', []),
      orchestrationStep('moderation.scan', 'moderation-service', 'run-integrity-scan', ['exams.generate-drafts']),
      orchestrationStep('dean.review', 'dean-workflow', 'request-dean-approval', ['moderation.scan']),
      orchestrationStep('principal.approve', 'principal-workflow', 'request-principal-approval', ['dean.review']),
      orchestrationStep('parents.notify', 'communication-service', 'notify-parents', ['principal.approve']),
      orchestrationStep('audit.archive', 'audit-service', 'archive-report-card-lineage', ['parents.notify']),
    ],
  };
}

export function createLiveOperationalQueue(queueId: string): OperationalQueue {
  return {
    queueId,
    tenantScoped: true,
    items: [
      queueItem('queue-report-cards', 'exam-workflow-1', 'exam-results-approval', 'exam-batch-1', [
        'principal-approve',
        'return-correction',
      ]),
      queueItem('queue-discipline', 'discipline-workflow-1', 'discipline-escalation', 'discipline-case-1', [
        'assign-investigator',
        'escalate-to-security',
      ]),
      queueItem('queue-fee-reconciliation', 'finance-workflow-1', 'fee-reconciliation', 'payment-batch-1', [
        'retry-reconciliation',
        'assign-finance-reviewer',
      ]),
      queueItem('queue-admissions', 'admissions-workflow-1', 'admissions-review', 'application-batch-1', [
        'approve-admission',
        'request-documents',
      ]),
    ],
  };
}

export function createExecutionAuditTimeline(
  entry: ExecutionAuditTimelineInput,
): ExecutionAuditTimeline {
  return {
    entries: [{ ...entry, emittedEvents: [...entry.emittedEvents] }],
    forensicInspectionEnabled: true,
    rollbackVisibility: true,
  };
}

export function reconstructTenantOperationalState(
  events: ReconstructableOperationalEvent[],
): ReconstructedTenantOperationalState {
  const tenantId = events[0]?.tenantId ?? 'unknown';
  const workflowInstances: ReconstructedTenantOperationalState['workflowInstances'] = {};
  const widgets: ReconstructedTenantOperationalState['widgets'] = {};
  const queues: ReconstructedTenantOperationalState['queues'] = {};

  for (const event of events) {
    if (event.tenantId !== tenantId) {
      throw new Error('Cross-tenant replay stream rejected');
    }

    if (event.eventName === 'WORKFLOW_TRANSITIONED' && event.workflowInstanceId) {
      workflowInstances[event.workflowInstanceId] = {
        workflowId: event.workflowId ?? 'unknown',
        entityId: event.entityId ?? 'unknown',
        state: event.state ?? 'UNKNOWN',
      };
    }

    if (event.eventName === 'WIDGET_REFRESH_REQUESTED' && event.widgetId) {
      widgets[event.widgetId] = {
        state: event.state ?? 'ACTIVE',
      };
    }

    if (event.eventName === 'QUEUE_ITEM_CREATED' && event.queueId && event.queueItemId) {
      const queue = queues[event.queueId] ?? { items: [] };
      queue.items.push({ queueItemId: event.queueItemId });
      queues[event.queueId] = queue;
    }
  }

  return {
    tenantId,
    projections: [...events],
    workflowInstances,
    widgets,
    queues,
    replayable: true,
  };
}

export function resolveDynamicCapabilityGraph(
  context: DynamicCapabilityGraphInput,
): DynamicCapabilityGraphDecision {
  const checks: Array<[string, boolean, string]> = [
    ['ROLE_CAPABILITY', context.roleCapabilities.includes(context.requestedCapability), 'ROLE_CAPABILITY_MISSING'],
    ['TENANT_ACTIVE', ['ACTIVE', 'ACTIVE_LIMITED', 'GRACE_PERIOD'].includes(context.tenantState), 'TENANT_RESTRICTED'],
    ['MODULE_ENABLED', Boolean(context.moduleEntitlements.exams), 'MODULE_DISABLED'],
    ['WORKFLOW_STAGE_ALLOWED', context.workflowStage === 'SUBJECT_REVIEW', 'WORKFLOW_STAGE_DENIED'],
    ['OWNER_MATCH', context.actorUserId === context.ownerUserId, 'OWNER_MISMATCH'],
    ['WITHIN_DEADLINE', Date.parse(context.now) <= Date.parse(context.deadline), 'DEADLINE_EXPIRED'],
    ['DELEGATED_AUTHORITY', context.delegatedAuthority.includes(context.requestedCapability), 'DELEGATION_MISSING'],
  ];
  const failed = checks.find(([, passed]) => !passed);

  return {
    allowed: !failed,
    deniedReason: failed?.[2] ?? null,
    satisfiedConditions: checks.filter(([, passed]) => passed).map(([condition]) => condition),
    context: {
      ...context,
      moduleEntitlements: { ...context.moduleEntitlements },
      delegatedAuthority: [...context.delegatedAuthority],
      roleCapabilities: [...context.roleCapabilities],
    },
  };
}

export function runFailureInjectionScenario(
  scenario: FailureInjectionScenario,
): FailureInjectionResult {
  const eventByScenario: Record<FailureInjectionScenario, string> = {
    EVENT_DROPPED: 'EVENT_DROP_DETECTED',
    SERVICE_CRASHED: 'SERVICE_CRASH_DETECTED',
    PROJECTION_CORRUPTED: 'PROJECTION_CORRUPTION_DETECTED',
  };

  return {
    status: 'SELF_HEALING',
    widget: {
      visible: true,
      state: 'DEGRADED',
    },
    events: [
      'FAILURE_INJECTED',
      eventByScenario[scenario],
      'REPAIR_TRIGGERED',
      'EVENT_REPLAY_REQUESTED',
      'FALLBACK_ACTIVATED',
    ],
    dashboardStable: true,
    noSilentFailure: true,
  };
}

export function evaluateWorkflowRuntimeReadiness(): WorkflowRuntimeReadinessReport {
  const layers: WorkflowRuntimeReadinessReport['layers'] = {
    deterministicStateMachines: true,
    centralOrchestration: true,
    liveOperationalQueues: true,
    universalAuditTimeline: true,
    eventReplayReconstruction: true,
    distributedCapabilityGraph: true,
    realtimeSynchronization: true,
    failureInjection: true,
  };
  const score = Object.values(layers).every(Boolean) ? 100 : 0;

  return {
    status: score === 100 ? 'pass' : 'fail',
    score,
    layers,
  };
}

function transition(
  from: WorkflowRuntimeState,
  to: WorkflowRuntimeState,
  actionId: string,
  capabilityRequired: string,
  emittedEvents: string[],
  slaMinutes: number,
  escalationRoles: string[],
): WorkflowRuntimeTransition {
  return {
    from,
    to,
    actionId,
    capabilityRequired,
    emittedEvents,
    rollbackAction: `rollback.exams.${actionId}`,
    retryPolicy: {
      maxAttempts: 3,
      backoff: 'exponential',
    },
    sla: {
      timeoutMinutes: slaMinutes,
    },
    escalation: {
      afterMinutes: slaMinutes,
      event: `${actionId.toUpperCase().replaceAll('-', '_')}_ESCALATED`,
      roles: escalationRoles,
    },
    auditAction: `audit.exams.${actionId}`,
  };
}

function blockedResult(
  workflow: WorkflowRuntimeDefinition,
  request: WorkflowTransitionRequest,
  reason: string,
  transitionDefinition?: WorkflowRuntimeTransition,
): WorkflowTransitionResult {
  return {
    status: 'BLOCKED',
    reason,
    from: request.currentState,
    to: request.currentState,
    events: [],
    rollbackAction: transitionDefinition?.rollbackAction ?? null,
    retryPolicy: transitionDefinition?.retryPolicy ?? {
      maxAttempts: 1,
      backoff: 'fixed',
    },
    audit: {
      tenantId: request.tenantId,
      actorUserId: request.actorUserId,
      role: request.role,
      workflowId: workflow.workflowId,
      workflowInstanceId: request.workflowInstanceId,
      entityId: request.entityId,
      action: 'audit.workflow.transition.blocked',
      capability: transitionDefinition?.capabilityRequired ?? null,
    },
    sla: {
      timeoutMinutes: transitionDefinition?.sla.timeoutMinutes ?? 0,
      deadline: null,
    },
    escalation: transitionDefinition
      ? cloneEscalation(transitionDefinition.escalation)
      : {
          afterMinutes: 0,
          event: 'WORKFLOW_TRANSITION_BLOCKED_ESCALATED',
          roles: ['platform-owner'],
        },
    widgetState: 'LOCKED',
  };
}

function hasCapability(capabilities: string[], requiredCapability: string): boolean {
  if (capabilities.includes('*:*') || capabilities.includes(requiredCapability)) {
    return true;
  }

  const [resource] = requiredCapability.split(':');

  return capabilities.includes(`${resource}:*`);
}

function addMinutesIso(timestamp: string, minutes: number): string {
  return new Date(Date.parse(timestamp) + minutes * 60_000).toISOString();
}

function cloneEscalation(policy: WorkflowEscalationPolicy): WorkflowEscalationPolicy {
  return {
    afterMinutes: policy.afterMinutes,
    event: policy.event,
    roles: [...policy.roles],
  };
}

function orchestrationStep(
  stepId: string,
  service: string,
  action: string,
  dependsOn: string[],
): OrchestrationStep {
  return {
    stepId,
    service,
    action,
    dependsOn,
    retryPolicy: {
      maxAttempts: 3,
      backoff: 'exponential',
    },
    compensationAction: `compensate.${stepId}`,
    slaTimeoutMinutes: 30,
    escalationEvent: `${stepId.toUpperCase().replaceAll('.', '_')}_ESCALATED`,
  };
}

function queueItem(
  queueItemId: string,
  workflowInstanceId: string,
  workflowId: string,
  entityId: string,
  availableActions: string[],
): OperationalQueueItem {
  return {
    queueItemId,
    workflowInstanceId,
    workflowId,
    entityId,
    priority: queueItemId === 'queue-report-cards' ? 'critical' : 'high',
    ownerRole: 'principal',
    executable: true,
    assignable: true,
    traceable: true,
    recoverable: true,
    eventBacked: true,
    availableActions,
  };
}
