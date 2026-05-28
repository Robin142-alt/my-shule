export type OperationalSectionPriority =
  | 'CRITICAL_ACTIONS'
  | 'WORKFLOW_EXECUTION'
  | 'SUPPORTING_ANALYTICS';
export type OperationalNodeType = 'WIDGET' | 'CARD' | 'QUEUE' | 'FORM' | 'ALERT' | 'ANALYTIC';
export type OperationalReportStatus = 'pass' | 'fail';
export type OperationalExecutionAnswer = 'ACTIONABLE' | 'PASSIVE';
export type OperationalRepairAction =
  | 'BIND_EXECUTION_HANDLER'
  | 'ATTACH_FALLBACK_HANDLER'
  | 'ATTACH_RETRY_POLICY'
  | 'DECLARE_EMITTED_EVENTS'
  | 'DECLARE_AUDIT_ACTION'
  | 'BIND_WORKFLOW'
  | 'BIND_GOVERNED_FORM'
  | 'REPAIR_WORKFLOW_TRANSITION'
  | 'MOVE_NODE_TO_ACTION_SECTION';

export interface OperationalRetryPolicy {
  maxAttempts: number;
  backoff: 'fixed' | 'exponential';
}

export interface OperationalActionDefinition {
  actionId: string;
  label: string;
  workflowBinding: string | null;
  executionHandler: string | null;
  capabilityRequirements: string[];
  fallbackHandler: string | null;
  retryPolicy: OperationalRetryPolicy | null;
  emittedEvents: string[];
  auditAction: string | null;
}

export interface OperationalFormDefinition {
  formId: string;
  schemaContract: string | null;
  validationRules: string[];
  capabilityRequirements: string[];
  backendExecutionMapping: string | null;
  emittedEvents: string[];
  retryPolicy: OperationalRetryPolicy | null;
  failureRecoveryBehavior: string | null;
}

export interface OperationalQueueDefinition {
  queueId: string;
  itemWorkflowBinding: string | null;
  supportedActions: string[];
  bulkActions: string[];
  assignmentRouting: string | null;
  rollbackAction: string | null;
  auditInspectionAction: string | null;
}

export interface OperationalNodeDefinition {
  nodeId: string;
  nodeType: OperationalNodeType;
  title: string;
  visible: boolean;
  primaryQuestion: string;
  actions: OperationalActionDefinition[];
  forms: OperationalFormDefinition[];
  queues: OperationalQueueDefinition[];
  workflowBindings: string[];
  supportingAnalytics?: boolean;
}

export interface OperationalSectionDefinition {
  sectionId: string;
  priority: OperationalSectionPriority;
  nodes: OperationalNodeDefinition[];
}

export interface OperationalWorkflowTransition {
  from: string;
  to: string;
  actionId: string | null;
  capabilityRequired: string | null;
  emittedEvent: string | null;
  rollbackAction: string | null;
  retryPolicy: OperationalRetryPolicy | null;
  auditAction: string | null;
}

export interface OperationalWorkflowDefinition {
  workflowId: string;
  name: string;
  states: string[];
  initialState: string;
  terminalStates: string[];
  transitions: OperationalWorkflowTransition[];
}

export interface OperationalDashboardContract {
  dashboardId: string;
  role: string;
  staticLayout: boolean;
  sections: OperationalSectionDefinition[];
  workflows: OperationalWorkflowDefinition[];
}

export interface OperationalViolation {
  rule: string;
  affectedComponents: string[];
  enforcement: string;
}

export interface OperationalRepairStep {
  action: OperationalRepairAction;
  target: string;
  reason: string;
}

export interface OperationalExecutionSummary {
  criticalActionNodes: number;
  workflowExecutionNodes: number;
  supportingAnalyticsNodes: number;
  executableActions: number;
  governedForms: number;
  workflowStateMachines: number;
}

export interface OperationalExecutionReport {
  status: OperationalReportStatus;
  score: number;
  executionAnswer: OperationalExecutionAnswer;
  summary: OperationalExecutionSummary;
  violations: OperationalViolation[];
  repairPlan: OperationalRepairStep[];
}

export function evaluateOperationalExecutionContract(
  dashboard: OperationalDashboardContract,
): OperationalExecutionReport {
  const violations: OperationalViolation[] = [];
  const repairPlan: OperationalRepairStep[] = [];
  const workflowsById = new Map(dashboard.workflows.map((workflow) => [workflow.workflowId, workflow]));

  validateDashboardStructure(dashboard, violations, repairPlan);

  for (const section of dashboard.sections) {
    for (const node of section.nodes) {
      validateOperationalNode(node, section, workflowsById, violations, repairPlan);
    }
  }

  for (const workflow of dashboard.workflows) {
    validateWorkflow(workflow, violations, repairPlan);
  }

  const summary = summarizeOperationalDashboard(dashboard);
  const status = violations.length === 0 ? 'pass' : 'fail';

  return {
    status,
    score: Math.max(0, 100 - violations.length * 15),
    executionAnswer: status === 'pass' ? 'ACTIONABLE' : 'PASSIVE',
    summary,
    violations,
    repairPlan: dedupeRepairPlan(repairPlan),
  };
}

export function createPrincipalOperationalCommandCenter(): OperationalDashboardContract {
  return {
    dashboardId: 'principal-dashboard',
    role: 'principal',
    staticLayout: true,
    sections: [
      {
        sectionId: 'critical-actions',
        priority: 'CRITICAL_ACTIONS',
        nodes: [
          {
            nodeId: 'results.awaiting-approval',
            nodeType: 'QUEUE',
            title: 'Results Awaiting Approval',
            visible: true,
            primaryQuestion: 'What requires action right now?',
            workflowBindings: ['exam-release'],
            queues: [
              queue('results.approval-queue', 'exam-release', [
                'approve-results',
                'return-correction',
                'escalate-moderation',
              ]),
            ],
            forms: [
              form('results.approval-decision', 'schemas/exams/report-card-approval.json', 'workflows.examRelease.decide', [
                'RESULTS_APPROVED',
                'RESULTS_RETURNED_FOR_CORRECTION',
              ]),
            ],
            actions: [
              action('approve-results', 'Approve Results', 'exam-release', 'workflows.examRelease.approve', [
                'RESULTS_APPROVED',
                'PRINCIPAL_APPROVAL_GRANTED',
              ]),
              action('return-correction', 'Return for Correction', 'exam-release', 'workflows.examRelease.return', [
                'RESULTS_RETURNED_FOR_CORRECTION',
              ]),
              action('escalate-moderation', 'Escalate Moderation', 'exam-release', 'workflows.examRelease.escalate', [
                'EXAM_MODERATION_ESCALATED',
              ]),
            ],
          },
          {
            nodeId: 'procurement.pending-requests',
            nodeType: 'CARD',
            title: 'Pending Procurement Requests',
            visible: true,
            primaryQuestion: 'What requires action right now?',
            workflowBindings: ['procurement-approval'],
            queues: [
              queue('procurement.approval-queue', 'procurement-approval', [
                'approve-procurement',
                'reject-procurement',
                'assign-reviewer',
                'generate-po',
              ]),
            ],
            forms: [
              form('procurement.decision-form', 'schemas/procurement/approval-decision.json', 'workflows.procurement.decide', [
                'PROCUREMENT_APPROVED',
                'PROCUREMENT_REJECTED',
              ]),
            ],
            actions: [
              action('approve-procurement', 'Approve', 'procurement-approval', 'workflows.procurement.approve', [
                'PROCUREMENT_APPROVED',
              ]),
              action('reject-procurement', 'Reject', 'procurement-approval', 'workflows.procurement.reject', [
                'PROCUREMENT_REJECTED',
              ]),
              action('assign-reviewer', 'Assign Reviewer', 'procurement-approval', 'workflows.procurement.assignReviewer', [
                'PROCUREMENT_REVIEWER_ASSIGNED',
              ]),
              action('generate-po', 'Generate PO', 'procurement-approval', 'workflows.procurement.generatePurchaseOrder', [
                'PURCHASE_ORDER_GENERATED',
              ]),
            ],
          },
          {
            nodeId: 'incident.critical-center',
            nodeType: 'ALERT',
            title: 'Critical Incident Center',
            visible: true,
            primaryQuestion: 'What requires action right now?',
            workflowBindings: ['incident-escalation'],
            queues: [],
            forms: [
              form('incident.escalation-form', 'schemas/incidents/escalation.json', 'workflows.incident.escalate', [
                'INCIDENT_ESCALATED',
              ]),
            ],
            actions: [
              action('open-incident-center', 'Open Incident Center', 'incident-escalation', 'workflows.incident.open', [
                'INCIDENT_CENTER_OPENED',
              ]),
              action('notify-security', 'Notify Security', 'incident-escalation', 'workflows.incident.notifySecurity', [
                'SECURITY_NOTIFIED',
              ]),
            ],
          },
        ],
      },
      {
        sectionId: 'workflow-execution',
        priority: 'WORKFLOW_EXECUTION',
        nodes: [
          {
            nodeId: 'fees.exception-resolution',
            nodeType: 'WIDGET',
            title: 'Fee Exception Resolution',
            visible: true,
            primaryQuestion: 'Which workflow is blocked and who owns it?',
            workflowBindings: ['fee-exception-resolution'],
            queues: [],
            forms: [],
            actions: [
              action('assign-fee-followup', 'Assign Follow-up', 'fee-exception-resolution', 'workflows.fees.assignFollowup', [
                'FEE_EXCEPTION_ASSIGNED',
              ]),
              action('send-parent-notice', 'Send Parent Notice', 'fee-exception-resolution', 'workflows.fees.notifyParent', [
                'PARENT_FEE_NOTICE_SENT',
              ]),
            ],
          },
          {
            nodeId: 'staff.accountability',
            nodeType: 'WIDGET',
            title: 'Staff Accountability',
            visible: true,
            primaryQuestion: 'Which workflow is blocked and who owns it?',
            workflowBindings: ['incident-escalation'],
            queues: [],
            forms: [],
            actions: [
              action('assign-appraisal', 'Assign Appraisal', 'incident-escalation', 'workflows.staff.assignAppraisal', [
                'STAFF_APPRAISAL_ASSIGNED',
              ]),
            ],
          },
          {
            nodeId: 'communications.broadcast',
            nodeType: 'FORM',
            title: 'Communication Broadcast',
            visible: true,
            primaryQuestion: 'Which workflow is blocked and who owns it?',
            workflowBindings: ['incident-escalation'],
            queues: [],
            forms: [],
            actions: [
              action('send-announcement', 'Send Announcement', 'incident-escalation', 'workflows.communication.broadcast', [
                'ANNOUNCEMENT_SENT',
              ]),
            ],
          },
        ],
      },
      {
        sectionId: 'supporting-analytics',
        priority: 'SUPPORTING_ANALYTICS',
        nodes: [
          {
            nodeId: 'analytics.risk-forecast',
            nodeType: 'ANALYTIC',
            title: 'Risk Forecast',
            visible: true,
            primaryQuestion: 'Which trend should become an action?',
            workflowBindings: ['fee-exception-resolution'],
            supportingAnalytics: true,
            queues: [],
            forms: [],
            actions: [
              action('open-risk-workflow', 'Open Risk Workflow', 'fee-exception-resolution', 'workflows.risk.open', [
                'RISK_WORKFLOW_OPENED',
              ]),
            ],
          },
        ],
      },
    ],
    workflows: [
      workflow('exam-release', 'Exam Release Workflow', [
        ['DRAFT', 'REVIEW_PENDING', 'submit-results', 'RESULTS_SUBMITTED_FOR_REVIEW'],
        ['REVIEW_PENDING', 'MODERATED', 'moderate-results', 'RESULTS_MODERATED'],
        ['MODERATED', 'DEAN_APPROVED', 'dean-approve-results', 'DEAN_APPROVAL_GRANTED'],
        ['DEAN_APPROVED', 'PRINCIPAL_APPROVED', 'approve-results', 'PRINCIPAL_APPROVAL_GRANTED'],
        ['PRINCIPAL_APPROVED', 'RELEASED', 'release-results', 'RESULTS_RELEASED'],
        ['RELEASED', 'PUBLISHED_TO_PARENTS', 'publish-to-parents', 'RESULTS_PUBLISHED_TO_PARENTS'],
      ], 'DRAFT', ['PUBLISHED_TO_PARENTS']),
      workflow('procurement-approval', 'Procurement Approval Workflow', [
        ['REQUESTED', 'REVIEW_ASSIGNED', 'assign-reviewer', 'PROCUREMENT_REVIEWER_ASSIGNED'],
        ['REVIEW_ASSIGNED', 'APPROVED', 'approve-procurement', 'PROCUREMENT_APPROVED'],
        ['REVIEW_ASSIGNED', 'REJECTED', 'reject-procurement', 'PROCUREMENT_REJECTED'],
        ['APPROVED', 'PO_GENERATED', 'generate-po', 'PURCHASE_ORDER_GENERATED'],
        ['PO_GENERATED', 'COMPLETED', 'complete-procurement', 'PROCUREMENT_COMPLETED'],
      ], 'REQUESTED', ['COMPLETED', 'REJECTED']),
      workflow('incident-escalation', 'Incident Escalation Workflow', [
        ['OPEN', 'TRIAGED', 'open-incident-center', 'INCIDENT_TRIAGED'],
        ['TRIAGED', 'ESCALATED', 'notify-security', 'INCIDENT_ESCALATED'],
        ['ESCALATED', 'RESOLVED', 'resolve-incident', 'INCIDENT_RESOLVED'],
      ], 'OPEN', ['RESOLVED']),
      workflow('fee-exception-resolution', 'Fee Exception Resolution Workflow', [
        ['DETECTED', 'ASSIGNED', 'assign-fee-followup', 'FEE_EXCEPTION_ASSIGNED'],
        ['ASSIGNED', 'PARENT_NOTIFIED', 'send-parent-notice', 'PARENT_FEE_NOTICE_SENT'],
        ['PARENT_NOTIFIED', 'RESOLVED', 'resolve-fee-exception', 'FEE_EXCEPTION_RESOLVED'],
      ], 'DETECTED', ['RESOLVED']),
    ],
  };
}

function validateDashboardStructure(
  dashboard: OperationalDashboardContract,
  violations: OperationalViolation[],
  repairPlan: OperationalRepairStep[],
) {
  const criticalSection = dashboard.sections.find((section) => section.priority === 'CRITICAL_ACTIONS');

  if (!dashboard.staticLayout) {
    violations.push({
      rule: 'Dashboards must remain stable while becoming operational',
      affectedComponents: [dashboard.dashboardId],
      enforcement: 'Restore static layout and attach execution nodes inside fixed sections',
    });
  }

  if (!criticalSection || criticalSection.nodes.length === 0) {
    violations.push({
      rule: 'Dashboard must prioritize action requirements',
      affectedComponents: [dashboard.dashboardId],
      enforcement: 'Create a critical action section before analytics',
    });
    repairPlan.push({
      action: 'MOVE_NODE_TO_ACTION_SECTION',
      target: dashboard.dashboardId,
      reason: 'Operational dashboards must answer what requires action right now',
    });
  }
}

function validateOperationalNode(
  node: OperationalNodeDefinition,
  section: OperationalSectionDefinition,
  workflowsById: Map<string, OperationalWorkflowDefinition>,
  violations: OperationalViolation[],
  repairPlan: OperationalRepairStep[],
) {
  const hasExecutionSurface =
    node.actions.length > 0 || node.forms.length > 0 || node.queues.length > 0 || node.workflowBindings.length > 0;

  if (!node.visible || !hasExecutionSurface) {
    violations.push({
      rule: 'Every operational node must execute workflow logic',
      affectedComponents: [node.nodeId],
      enforcement: 'Attach actions, governed forms, queues, and workflow bindings; never ship dead-end widgets',
    });
    repairPlan.push({
      action: 'BIND_WORKFLOW',
      target: node.nodeId,
      reason: 'Node has no executable workflow surface',
    });
  }

  if (section.priority === 'CRITICAL_ACTIONS' && !node.primaryQuestion.toLowerCase().includes('action')) {
    violations.push({
      rule: 'Dashboard must prioritize action requirements',
      affectedComponents: [node.nodeId],
      enforcement: 'Critical sections must ask what requires action right now',
    });
    repairPlan.push({
      action: 'MOVE_NODE_TO_ACTION_SECTION',
      target: node.nodeId,
      reason: 'Critical node is framed as passive information',
    });
  }

  for (const workflowBinding of node.workflowBindings) {
    if (!workflowsById.has(workflowBinding)) {
      violations.push({
        rule: 'Every operational node must bind to a workflow state machine',
        affectedComponents: [node.nodeId, workflowBinding],
        enforcement: 'Register workflow state machine before rendering node as operational',
      });
      repairPlan.push({
        action: 'BIND_WORKFLOW',
        target: node.nodeId,
        reason: `Missing workflow binding: ${workflowBinding}`,
      });
    }
  }

  for (const actionDefinition of node.actions) {
    validateAction(actionDefinition, violations, repairPlan);
  }

  for (const formDefinition of node.forms) {
    validateForm(formDefinition, violations, repairPlan);
  }

  for (const queueDefinition of node.queues) {
    validateQueue(queueDefinition, violations, repairPlan);
  }
}

function validateAction(
  actionDefinition: OperationalActionDefinition,
  violations: OperationalViolation[],
  repairPlan: OperationalRepairStep[],
) {
  const missing: OperationalRepairAction[] = [];

  if (!actionDefinition.workflowBinding || actionDefinition.capabilityRequirements.length === 0) {
    missing.push('BIND_WORKFLOW');
  }

  if (!actionDefinition.executionHandler) {
    missing.push('BIND_EXECUTION_HANDLER');
  }

  if (!actionDefinition.fallbackHandler) {
    missing.push('ATTACH_FALLBACK_HANDLER');
  }

  if (!actionDefinition.retryPolicy) {
    missing.push('ATTACH_RETRY_POLICY');
  }

  if (actionDefinition.emittedEvents.length === 0) {
    missing.push('DECLARE_EMITTED_EVENTS');
  }

  if (!actionDefinition.auditAction) {
    missing.push('DECLARE_AUDIT_ACTION');
  }

  if (missing.length === 0) {
    return;
  }

  violations.push({
    rule: 'Buttons must execute real governed logic',
    affectedComponents: [actionDefinition.actionId],
    enforcement: 'Bind every button to AGP, workflow engine, domain handler, events, retry, fallback, and audit',
  });

  for (const action of missing) {
    repairPlan.push({
      action,
      target: actionDefinition.actionId,
      reason: `${actionDefinition.actionId} is missing ${action.toLowerCase().replaceAll('_', ' ')}`,
    });
  }
}

function validateForm(
  formDefinition: OperationalFormDefinition,
  violations: OperationalViolation[],
  repairPlan: OperationalRepairStep[],
) {
  const valid =
    Boolean(formDefinition.schemaContract)
    && formDefinition.validationRules.length > 0
    && formDefinition.capabilityRequirements.length > 0
    && Boolean(formDefinition.backendExecutionMapping)
    && formDefinition.emittedEvents.length > 0
    && Boolean(formDefinition.retryPolicy)
    && Boolean(formDefinition.failureRecoveryBehavior);

  if (!valid) {
    violations.push({
      rule: 'Forms must be governed workflow contracts',
      affectedComponents: [formDefinition.formId],
      enforcement: 'Bind form schema, validation, AGP capabilities, backend execution, events, retry, and failure recovery',
    });
    repairPlan.push({
      action: 'BIND_GOVERNED_FORM',
      target: formDefinition.formId,
      reason: 'Form lacks a complete execution contract',
    });
  }
}

function validateQueue(
  queueDefinition: OperationalQueueDefinition,
  violations: OperationalViolation[],
  repairPlan: OperationalRepairStep[],
) {
  const valid =
    Boolean(queueDefinition.itemWorkflowBinding)
    && queueDefinition.supportedActions.length > 0
    && queueDefinition.bulkActions.length > 0
    && Boolean(queueDefinition.assignmentRouting)
    && Boolean(queueDefinition.rollbackAction)
    && Boolean(queueDefinition.auditInspectionAction);

  if (!valid) {
    violations.push({
      rule: 'Queues must be workflow engines',
      affectedComponents: [queueDefinition.queueId],
      enforcement: 'Attach bulk actions, routing, rollback, audit inspection, and item-level transitions',
    });
    repairPlan.push({
      action: 'BIND_WORKFLOW',
      target: queueDefinition.queueId,
      reason: 'Queue is a read-only list instead of a workflow engine',
    });
  }
}

function validateWorkflow(
  workflowDefinition: OperationalWorkflowDefinition,
  violations: OperationalViolation[],
  repairPlan: OperationalRepairStep[],
) {
  const stateSet = new Set(workflowDefinition.states);
  const hasStateMachine =
    workflowDefinition.states.length >= 2
    && stateSet.has(workflowDefinition.initialState)
    && workflowDefinition.terminalStates.every((state) => stateSet.has(state))
    && workflowDefinition.transitions.length > 0;
  const invalidTransition = workflowDefinition.transitions.find((transition) =>
    !stateSet.has(transition.from)
    || !stateSet.has(transition.to)
    || !transition.actionId
    || !transition.capabilityRequired
    || !transition.emittedEvent
    || !transition.rollbackAction
    || !transition.retryPolicy
    || !transition.auditAction,
  );

  if (!hasStateMachine || invalidTransition) {
    violations.push({
      rule: 'Workflows must be executable state machines',
      affectedComponents: [workflowDefinition.workflowId],
      enforcement: 'Every transition needs state, action, capability, event, rollback, retry, and audit binding',
    });
    repairPlan.push({
      action: 'REPAIR_WORKFLOW_TRANSITION',
      target: workflowDefinition.workflowId,
      reason: 'Workflow transition contract is incomplete',
    });
  }
}

function summarizeOperationalDashboard(
  dashboard: OperationalDashboardContract,
): OperationalExecutionSummary {
  const nodes = dashboard.sections.flatMap((section) => section.nodes);

  return {
    criticalActionNodes: dashboard.sections
      .filter((section) => section.priority === 'CRITICAL_ACTIONS')
      .reduce((sum, section) => sum + section.nodes.length, 0),
    workflowExecutionNodes: dashboard.sections
      .filter((section) => section.priority === 'WORKFLOW_EXECUTION')
      .reduce((sum, section) => sum + section.nodes.length, 0),
    supportingAnalyticsNodes: dashboard.sections
      .filter((section) => section.priority === 'SUPPORTING_ANALYTICS')
      .reduce((sum, section) => sum + section.nodes.length, 0),
    executableActions: nodes.reduce((sum, node) => sum + node.actions.length, 0),
    governedForms: nodes.reduce((sum, node) => sum + node.forms.length, 0),
    workflowStateMachines: dashboard.workflows.length,
  };
}

function action(
  actionId: string,
  label: string,
  workflowBinding: string,
  executionHandler: string,
  emittedEvents: string[],
): OperationalActionDefinition {
  return {
    actionId,
    label,
    workflowBinding,
    executionHandler,
    capabilityRequirements: [`${workflowBinding.split('-')[0]}:execute`],
    fallbackHandler: `fallback.${executionHandler}`,
    retryPolicy: {
      maxAttempts: 3,
      backoff: 'exponential',
    },
    emittedEvents,
    auditAction: `audit.${actionId}`,
  };
}

function form(
  formId: string,
  schemaContract: string,
  backendExecutionMapping: string,
  emittedEvents: string[],
): OperationalFormDefinition {
  return {
    formId,
    schemaContract,
    validationRules: ['required-fields', 'tenant-scope', 'business-policy'],
    capabilityRequirements: [`${backendExecutionMapping.split('.')[1] ?? 'workflow'}:execute`],
    backendExecutionMapping,
    emittedEvents,
    retryPolicy: {
      maxAttempts: 3,
      backoff: 'exponential',
    },
    failureRecoveryBehavior: `recover.${formId}`,
  };
}

function queue(
  queueId: string,
  workflowBinding: string,
  supportedActions: string[],
): OperationalQueueDefinition {
  return {
    queueId,
    itemWorkflowBinding: workflowBinding,
    supportedActions,
    bulkActions: supportedActions,
    assignmentRouting: `routing.${queueId}`,
    rollbackAction: `rollback.${queueId}`,
    auditInspectionAction: `audit.${queueId}`,
  };
}

function workflow(
  workflowId: string,
  name: string,
  transitionInput: Array<[string, string, string, string]>,
  initialState: string,
  terminalStates: string[],
): OperationalWorkflowDefinition {
  const states = [...new Set(transitionInput.flatMap(([from, to]) => [from, to]))];

  return {
    workflowId,
    name,
    states,
    initialState,
    terminalStates,
    transitions: transitionInput.map(([from, to, actionId, emittedEvent]) => ({
      from,
      to,
      actionId,
      capabilityRequired: `${workflowId.split('-')[0]}:execute`,
      emittedEvent,
      rollbackAction: `rollback.${workflowId}.${actionId}`,
      retryPolicy: {
        maxAttempts: 3,
        backoff: 'exponential',
      },
      auditAction: `audit.${workflowId}.${actionId}`,
    })),
  };
}

function dedupeRepairPlan(repairPlan: OperationalRepairStep[]): OperationalRepairStep[] {
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
