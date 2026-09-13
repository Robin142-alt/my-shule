import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createExamWorkflowRuntime,
  createExecutionAuditTimeline,
  createLiveOperationalQueue,
  createOperationalOrchestrationPlan,
  evaluateWorkflowRuntimeReadiness,
  executeWorkflowTransition,
  reconstructTenantOperationalState,
  resolveDynamicCapabilityGraph,
  runFailureInjectionScenario,
} from './workflow-runtime-contract';

test('WorkflowRuntime executes deterministic transitions only from the current state with required capability', () => {
  const workflow = createExamWorkflowRuntime();
  const result = executeWorkflowTransition(workflow, {
    tenantId: 'tenant-1',
    workflowInstanceId: 'exam-workflow-1',
    entityId: 'exam-batch-1',
    currentState: 'DEAN_APPROVAL',
    actionId: 'principal-approve',
    actorUserId: 'principal-1',
    role: 'principal',
    capabilities: ['exams:principal-approve'],
    now: '2026-05-26T15:00:00.000Z',
  });

  assert.equal(result.status, 'ADVANCED');
  assert.equal(result.from, 'DEAN_APPROVAL');
  assert.equal(result.to, 'PRINCIPAL_APPROVAL');
  assert.deepEqual(result.events, ['PRINCIPAL_APPROVAL_GRANTED']);
  assert.equal(result.rollbackAction, 'rollback.exams.principal-approve');
  assert.equal(result.retryPolicy.maxAttempts, 3);
  assert.equal(result.audit.action, 'audit.exams.principal-approve');
  assert.equal(result.audit.capability, 'exams:principal-approve');
  assert.equal(result.sla.deadline, '2026-05-27T15:00:00.000Z');
  assert.deepEqual(result.escalation.roles, ['dean-academics', 'school-owner']);
});

test('the exam runtime goes from teacher submission directly to the Dean without HOD approval', () => {
  const workflow = createExamWorkflowRuntime();
  assert.ok(!JSON.stringify(workflow).toLowerCase().includes('hod'));
  const reviewed = executeWorkflowTransition(workflow, {
    tenantId: 'tenant-1', workflowInstanceId: 'exam-workflow-1', entityId: 'exam-batch-1',
    currentState: 'SUBJECT_REVIEW', actionId: 'dean-approve', actorUserId: 'dean-1', role: 'dean-academics',
    capabilities: ['exams:dean-approve'], now: '2026-09-13T10:00:00.000Z',
  });
  assert.equal(reviewed.status, 'ADVANCED');
  assert.equal(reviewed.to, 'DEAN_APPROVAL');
});

test('WorkflowRuntime blocks invalid transitions without emitting business events', () => {
  const workflow = createExamWorkflowRuntime();
  const result = executeWorkflowTransition(workflow, {
    tenantId: 'tenant-1',
    workflowInstanceId: 'exam-workflow-1',
    entityId: 'exam-batch-1',
    currentState: 'SUBJECT_REVIEW',
    actionId: 'principal-approve',
    actorUserId: 'principal-1',
    role: 'principal',
    capabilities: ['exams:principal-approve'],
    now: '2026-05-26T15:00:00.000Z',
  });

  assert.equal(result.status, 'BLOCKED');
  assert.equal(result.reason, 'INVALID_CURRENT_STATE');
  assert.deepEqual(result.events, []);
  assert.equal(result.widgetState, 'LOCKED');
  assert.equal(result.audit.action, 'audit.workflow.transition.blocked');
});

test('WorkflowRuntime orchestration plan is resumable, retryable, compensating, and escalation-aware', () => {
  const plan = createOperationalOrchestrationPlan('publish-report-cards');

  assert.equal(plan.workflowId, 'exam-report-card-publication');
  assert.equal(plan.resumeCursor, 'step:exams.generate-drafts');
  assert.equal(plan.steps.length, 6);
  assert.deepEqual(plan.steps.map((step) => step.service), [
    'exams-service',
    'moderation-service',
    'dean-workflow',
    'principal-workflow',
    'communication-service',
    'audit-service',
  ]);
  assert.equal(plan.steps.every((step) => step.retryPolicy.maxAttempts >= 3), true);
  assert.equal(plan.steps.every((step) => step.compensationAction), true);
  assert.equal(plan.steps.every((step) => step.slaTimeoutMinutes > 0), true);
  assert.equal(plan.steps.every((step) => step.escalationEvent.endsWith('_ESCALATED')), true);
});

test('WorkflowRuntime live queues expose executable assignable traceable recoverable event-backed items', () => {
  const queue = createLiveOperationalQueue('principal-urgent-actions');

  assert.equal(queue.queueId, 'principal-urgent-actions');
  assert.equal(queue.items.length, 4);
  assert.equal(queue.items.every((item) => item.executable), true);
  assert.equal(queue.items.every((item) => item.assignable), true);
  assert.equal(queue.items.every((item) => item.traceable), true);
  assert.equal(queue.items.every((item) => item.recoverable), true);
  assert.equal(queue.items.every((item) => item.eventBacked), true);
  assert.equal(queue.items.every((item) => item.workflowInstanceId), true);
  assert.equal(queue.items.every((item) => item.availableActions.length > 0), true);
});

test('WorkflowRuntime audit timeline records capability-scoped workflow lineage', () => {
  const timeline = createExecutionAuditTimeline({
    tenantId: 'tenant-1',
    actorUserId: 'principal-1',
    actionId: 'principal-approve',
    capability: 'exams:principal-approve',
    workflowId: 'exam-results-approval',
    workflowInstanceId: 'exam-workflow-1',
    entityId: 'exam-batch-1',
    from: 'DEAN_APPROVAL',
    to: 'PRINCIPAL_APPROVAL',
    emittedEvents: ['PRINCIPAL_APPROVAL_GRANTED'],
    replayId: 'replay-1',
    occurredAt: '2026-05-26T15:00:00.000Z',
  });

  assert.deepEqual(timeline.entries[0], {
    tenantId: 'tenant-1',
    actorUserId: 'principal-1',
    actionId: 'principal-approve',
    capability: 'exams:principal-approve',
    workflowId: 'exam-results-approval',
    workflowInstanceId: 'exam-workflow-1',
    entityId: 'exam-batch-1',
    from: 'DEAN_APPROVAL',
    to: 'PRINCIPAL_APPROVAL',
    emittedEvents: ['PRINCIPAL_APPROVAL_GRANTED'],
    replayId: 'replay-1',
    occurredAt: '2026-05-26T15:00:00.000Z',
  });
  assert.equal(timeline.forensicInspectionEnabled, true);
  assert.equal(timeline.rollbackVisibility, true);
});

test('WorkflowRuntime replay reconstructs tenant projections workflows widgets and queues', () => {
  const reconstructed = reconstructTenantOperationalState([
    {
      id: 'event-1',
      tenantId: 'tenant-1',
      eventName: 'WORKFLOW_TRANSITIONED',
      workflowInstanceId: 'exam-workflow-1',
      workflowId: 'exam-results-approval',
      entityId: 'exam-batch-1',
      state: 'PRINCIPAL_APPROVAL',
    },
    {
      id: 'event-2',
      tenantId: 'tenant-1',
      eventName: 'WIDGET_REFRESH_REQUESTED',
      widgetId: 'principal.results-approval',
      state: 'ACTIVE',
    },
    {
      id: 'event-3',
      tenantId: 'tenant-1',
      eventName: 'QUEUE_ITEM_CREATED',
      queueId: 'principal-urgent-actions',
      queueItemId: 'queue-item-1',
    },
  ]);

  assert.equal(reconstructed.tenantId, 'tenant-1');
  assert.equal(reconstructed.projections.length, 3);
  assert.equal(reconstructed.workflowInstances['exam-workflow-1'].state, 'PRINCIPAL_APPROVAL');
  assert.equal(reconstructed.widgets['principal.results-approval'].state, 'ACTIVE');
  assert.equal(reconstructed.queues['principal-urgent-actions'].items[0].queueItemId, 'queue-item-1');
  assert.equal(reconstructed.replayable, true);
});

test('WorkflowRuntime dynamic capability graph evaluates role module tenant workflow ownership deadline and delegation', () => {
  const decision = resolveDynamicCapabilityGraph({
    role: 'teacher',
    requestedCapability: 'marks:approve',
    tenantState: 'ACTIVE',
    moduleEntitlements: { exams: true },
    workflowStage: 'SUBJECT_REVIEW',
    ownerUserId: 'teacher-1',
    actorUserId: 'teacher-1',
    deadline: '2026-05-26T17:00:00.000Z',
    now: '2026-05-26T15:00:00.000Z',
    delegatedAuthority: ['marks:approve'],
    roleCapabilities: ['marks:approve'],
  });

  assert.equal(decision.allowed, true);
  assert.deepEqual(decision.satisfiedConditions, [
    'ROLE_CAPABILITY',
    'TENANT_ACTIVE',
    'MODULE_ENABLED',
    'WORKFLOW_STAGE_ALLOWED',
    'OWNER_MATCH',
    'WITHIN_DEADLINE',
    'DELEGATED_AUTHORITY',
  ]);

  const expired = resolveDynamicCapabilityGraph({
    ...decision.context,
    now: '2026-05-26T18:00:00.000Z',
  });

  assert.equal(expired.allowed, false);
  assert.equal(expired.deniedReason, 'DEADLINE_EXPIRED');
});

test('WorkflowRuntime failure injection degrades visibly and emits repair events', () => {
  const result = runFailureInjectionScenario('EVENT_DROPPED');

  assert.equal(result.status, 'SELF_HEALING');
  assert.equal(result.widget.visible, true);
  assert.equal(result.widget.state, 'DEGRADED');
  assert.deepEqual(result.events, [
    'FAILURE_INJECTED',
    'EVENT_DROP_DETECTED',
    'REPAIR_TRIGGERED',
    'EVENT_REPLAY_REQUESTED',
    'FALLBACK_ACTIVATED',
  ]);
  assert.equal(result.dashboardStable, true);
  assert.equal(result.noSilentFailure, true);
});

test('WorkflowRuntime readiness score is 100 only when all operational layers are enforced', () => {
  const report = evaluateWorkflowRuntimeReadiness();

  assert.equal(report.status, 'pass');
  assert.equal(report.score, 100);
  assert.deepEqual(report.layers, {
    deterministicStateMachines: true,
    centralOrchestration: true,
    liveOperationalQueues: true,
    universalAuditTimeline: true,
    eventReplayReconstruction: true,
    distributedCapabilityGraph: true,
    realtimeSynchronization: true,
    failureInjection: true,
  });
});
