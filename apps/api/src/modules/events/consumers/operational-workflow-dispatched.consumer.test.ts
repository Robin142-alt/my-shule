import assert from 'node:assert/strict';
import test from 'node:test';

import { OperationalWorkflowDispatchedConsumer } from './operational-workflow-dispatched.consumer';
import { EventConsumerRegistryService } from '../event-consumer-registry.service';
import type { DomainEvent, WorkflowActionDispatchedPayload } from '../events.types';

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
  );

  const consumers = registry.getConsumersForEvent('workflow.action.dispatched');
  const completedConsumers = registry.getConsumersForEvent('workflow.action.completed');

  assert.equal(consumers.length, 2);
  assert.equal(consumers[0].name, 'workflow-action-dispatched.audit');
  assert.equal(consumers[1].name, 'workflow-action-dispatched.execution');
  assert.equal(completedConsumers.length, 1);
  assert.equal(completedConsumers[0].name, 'workflow-action-completed.audit');
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
