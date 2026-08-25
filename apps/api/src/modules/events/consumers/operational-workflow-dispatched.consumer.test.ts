import assert from 'node:assert/strict';
import test from 'node:test';

import { OperationalWorkflowDispatchedConsumer } from './operational-workflow-dispatched.consumer';
import { ProcurementEventConsumer } from './procurement-event.consumer';
import { EventConsumerRegistryService } from '../event-consumer-registry.service';
import type {
  DomainEvent,
  ProcurementRequestSubmittedPayload,
  WorkflowActionDispatchedPayload,
} from '../events.types';

test('OperationalWorkflowDispatchedConsumer writes immutable audit evidence for dispatched workflow actions', async () => {
  const auditRows: Record<string, unknown>[] = [];
  const consumer = new OperationalWorkflowDispatchedConsumer({
    createAuditLog: async (row: Record<string, unknown>) => {
      auditRows.push(row);
    },
  } as never);

  await consumer.handle(buildWorkflowActionEvent());

  assert.equal(auditRows.length, 1);
  assert.equal(auditRows[0].tenant_id, 'tenant-1');
  assert.equal(auditRows[0].actor_user_id, 'principal-1');
  assert.equal(auditRows[0].action, 'workflow.action.dispatched');
  assert.equal(auditRows[0].resource_type, 'operational_workflow');
  assert.equal(auditRows[0].resource_id, '00000000-0000-4000-8000-000000000777');
  const metadata = auditRows[0].metadata as Record<string, unknown>;
  assert.equal(metadata.consumer, 'workflow-action-dispatched.audit');
  assert.equal(metadata.logical_aggregate_id, 'exam-batch-1');
  assert.equal(metadata.workflow_id, 'exam-release');
  assert.equal(metadata.execution_handler, 'workflows.examRelease.approve');
  assert.deepEqual(metadata.emitted_events, ['RESULTS_APPROVED', 'PRINCIPAL_APPROVAL_GRANTED']);
});

test('EventConsumerRegistryService subscribes workflow.action.dispatched to the operational consumer', () => {
  const workflowConsumer = new OperationalWorkflowDispatchedConsumer({
    createAuditLog: async () => undefined,
  } as never);
  const registry = new EventConsumerRegistryService(
    { event_name: 'student.created', name: 'student-created.audit' } as never,
    { event_name: 'payment.completed', name: 'payment-completed.audit' } as never,
    workflowConsumer,
    { event_name: 'workflow.action.dispatched', name: 'workflow-action-dispatched.execution' } as never,
    { event_name: 'workflow.action.completed', name: 'workflow-action-completed.audit' } as never,
    { event_name: 'attendance.register.marked', name: 'attendance-marked.audit' } as never,
    { event_name: 'discipline.incident.reported', name: 'discipline-incident.audit' } as never,
    { event_name: 'welfare.case.referred', name: 'welfare-case.audit' } as never,
    { event_name: 'boarding.request.submitted', name: 'boarding-event.workflow' } as never,
    { event_name: 'transport.request.submitted', name: 'transport-event.workflow' } as never,
    { event_name: 'counselling.referral.submitted', name: 'counselling-event.workflow' } as never,
    { event_name: 'procurement.request.submitted', name: 'procurement-event.workflow' } as never,
    { event_name: 'lab.request.submitted', name: 'lab-event.workflow' } as never,
    { event_name: 'asset.request.submitted', name: 'asset-event.workflow' } as never,
  );

  const consumers = registry.getConsumersForEvent('workflow.action.dispatched');
  const completedConsumers = registry.getConsumersForEvent('workflow.action.completed');

  assert.equal(consumers.length, 2);
  assert.equal(consumers[0].name, 'workflow-action-dispatched.audit');
  assert.equal(consumers[1].name, 'workflow-action-dispatched.execution');
  assert.equal(completedConsumers.length, 1);
  assert.equal(completedConsumers[0].name, 'workflow-action-completed.audit');
  for (const [eventName, consumerName] of [
    ['boarding.request.submitted', 'boarding-event.workflow'],
    ['transport.request.submitted', 'transport-event.workflow'],
    ['counselling.referral.submitted', 'counselling-event.workflow'],
    ['procurement.request.submitted', 'procurement-event.workflow'],
    ['lab.request.submitted', 'lab-event.workflow'],
    ['asset.request.submitted', 'asset-event.workflow'],
  ] as const) {
    assert.equal(registry.getConsumersForEvent(eventName)[0]?.name, consumerName);
  }
});

test('ProcurementEventConsumer applies the KES 50,000 approval threshold in minor units', async () => {
  const approvals: Record<string, unknown>[] = [];
  const notifications: Record<string, unknown>[] = [];
  const tasks: Record<string, unknown>[] = [];
  const consumer = new ProcurementEventConsumer({
    createApprovalRequest: async (row: Record<string, unknown>) => {
      approvals.push(row);
    },
    createNotification: async (row: Record<string, unknown>) => {
      notifications.push(row);
    },
    createTask: async (row: Record<string, unknown>) => {
      tasks.push(row);
    },
  } as never);

  await consumer.handle(buildProcurementRequestEvent(4_999_999, 'below-threshold'));

  assert.equal(approvals.length, 0);
  assert.equal(notifications.length, 0);
  assert.equal(tasks.length, 1);
  assert.equal(tasks[0].priority, 'normal');

  await consumer.handle(buildProcurementRequestEvent(5_000_000, 'at-threshold'));

  assert.equal(approvals.length, 1);
  assert.equal(approvals[0].approver_role, 'principal');
  assert.equal(notifications.length, 1);
  assert.equal(notifications[0].recipient_role, 'principal');
  assert.equal(tasks.length, 2);
  assert.equal(tasks[1].priority, 'high');
});

function buildWorkflowActionEvent(): DomainEvent<'workflow.action.dispatched'> {
  const payload: WorkflowActionDispatchedPayload = {
    tenant_id: 'tenant-1',
    command_id: 'request-1',
    dashboard_id: 'principal-dashboard',
    role: 'principal',
    node_id: 'results.awaiting-approval',
    action_id: 'approve-results',
    workflow_id: 'exam-release',
    execution_handler: 'workflows.examRelease.approve',
    fallback_handler: 'fallback.workflows.examRelease.approve',
    retry_policy: {
      maxAttempts: 3,
      backoff: 'exponential',
    },
    emitted_events: ['RESULTS_APPROVED', 'PRINCIPAL_APPROVAL_GRANTED'],
    audit_action: 'audit.approve-results',
    aggregate_id: 'exam-batch-1',
    requested_by_user_id: 'principal-1',
    requested_at: '2026-05-26T00:00:00.000Z',
    payload: {
      comment: 'Approved after Dean review',
    },
  };

  return {
    id: 'event-1',
    tenant_id: 'tenant-1',
    event_key: 'workflow.action.dispatched:tenant-1:request-1:approve-results',
    event_name: 'workflow.action.dispatched',
    aggregate_type: 'operational_workflow',
    aggregate_id: '00000000-0000-4000-8000-000000000777',
    payload,
    headers: {
      request_id: 'request-1',
      user_id: 'principal-1',
    },
    status: 'processing',
    attempt_count: 1,
    available_at: '2026-05-26T00:00:00.000Z',
    published_at: null,
    last_error: null,
    created_at: '2026-05-26T00:00:00.000Z',
    updated_at: '2026-05-26T00:00:00.000Z',
  };
}

function buildProcurementRequestEvent(
  estimatedCostMinor: number,
  requestSuffix: string,
): DomainEvent<'procurement.request.submitted'> {
  const requestId = requestSuffix === 'below-threshold'
    ? '00000000-0000-4000-8000-000000000778'
    : '00000000-0000-4000-8000-000000000779';
  const payload: ProcurementRequestSubmittedPayload = {
    tenant_id: 'tenant-1',
    request_id: requestId,
    requested_by_user_id: '00000000-0000-4000-8000-000000000111',
    requested_at: '2026-08-21T00:00:00.000Z',
    item_name: 'Science supplies',
    quantity: 1,
    estimated_cost: estimatedCostMinor,
    status: 'submitted',
  };

  return {
    id: `event-${requestSuffix}`,
    tenant_id: 'tenant-1',
    event_key: `procurement.request.submitted:${requestId}`,
    event_name: 'procurement.request.submitted',
    aggregate_type: 'procurement_request',
    aggregate_id: requestId,
    payload,
    headers: {},
    status: 'processing',
    attempt_count: 1,
    available_at: '2026-08-21T00:00:00.000Z',
    published_at: null,
    last_error: null,
    created_at: '2026-08-21T00:00:00.000Z',
    updated_at: '2026-08-21T00:00:00.000Z',
  };
}
