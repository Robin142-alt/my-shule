import assert from 'node:assert/strict';
import test from 'node:test';

import { OperationalWorkflowExecutionConsumer } from './operational-workflow-execution.consumer';
import type { DomainEvent, WorkflowActionDispatchedPayload } from '../events.types';

test('OperationalWorkflowExecutionConsumer publishes a governed execution completion event', async () => {
  const publishedEvents: Record<string, unknown>[] = [];
  const consumer = new OperationalWorkflowExecutionConsumer({
    publish: async (input: Record<string, unknown>) => {
      publishedEvents.push(input);
      return { id: 'completed-event-1' };
    },
  } as never);

  await consumer.handle(buildWorkflowActionEvent());

  assert.equal(publishedEvents.length, 1);
  const completedEvent = publishedEvents[0];

  assert.equal(
    completedEvent.event_key,
    'workflow.action.completed:tenant-1:request-1:approve-results',
  );
  assert.equal(completedEvent.event_name, 'workflow.action.completed');
  assert.equal(completedEvent.aggregate_type, 'operational_workflow');
  assert.equal(completedEvent.aggregate_id, '00000000-0000-4000-8000-000000000777');

  const payload = completedEvent.payload as Record<string, unknown>;
  assert.equal(payload.tenant_id, 'tenant-1');
  assert.equal(payload.command_id, 'request-1');
  assert.equal(payload.action_id, 'approve-results');
  assert.equal(payload.workflow_id, 'exam-release');
  assert.equal(payload.execution_handler, 'workflows.examRelease.approve');
  assert.equal(payload.aggregate_id, 'exam-batch-1');
  assert.equal(payload.status, 'COMPLETED');
  assert.deepEqual(payload.emitted_events, ['RESULTS_APPROVED', 'PRINCIPAL_APPROVAL_GRANTED']);
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
