import assert from 'node:assert/strict';
import test from 'node:test';

import { OperationalWorkflowCompletedConsumer } from './operational-workflow-completed.consumer';
import type { DomainEvent } from '../events.types';

test('OperationalWorkflowCompletedConsumer writes immutable audit evidence for completed workflow actions', async () => {
  const auditRows: Record<string, unknown>[] = [];
  const consumer = new OperationalWorkflowCompletedConsumer({
    createAuditLog: async (row: Record<string, unknown>) => {
      auditRows.push(row);
    },
  } as never);

  await consumer.handle(buildWorkflowCompletedEvent());

  assert.equal(auditRows.length, 1);
  assert.equal(auditRows[0].tenant_id, 'tenant-1');
  assert.equal(auditRows[0].actor_user_id, '00000000-0000-4000-8000-000000000111');
  assert.equal(auditRows[0].action, 'workflow.action.completed');
  assert.equal(auditRows[0].resource_type, 'operational_workflow');
  assert.equal(auditRows[0].resource_id, '00000000-0000-4000-8000-000000000777');
  const metadata = auditRows[0].metadata as Record<string, unknown>;
  assert.equal(metadata.consumer, 'workflow-action-completed.audit');
  assert.equal(metadata.logical_aggregate_id, 'exam-batch-1');
  assert.equal(metadata.workflow_id, 'exam-release');
  assert.equal(metadata.execution_handler, 'workflows.examRelease.approve');
  assert.equal(metadata.status, 'COMPLETED');
  assert.deepEqual(metadata.emitted_events, ['RESULTS_APPROVED', 'PRINCIPAL_APPROVAL_GRANTED']);
});

function buildWorkflowCompletedEvent(): DomainEvent<'workflow.action.completed'> {
  return {
    id: 'event-completed-1',
    tenant_id: 'tenant-1',
    event_key: 'workflow.action.completed:tenant-1:request-1:approve-results',
    event_name: 'workflow.action.completed',
    aggregate_type: 'operational_workflow',
    aggregate_id: '00000000-0000-4000-8000-000000000777',
    payload: {
      tenant_id: 'tenant-1',
      command_id: 'request-1',
      dashboard_id: 'principal-dashboard',
      role: 'principal',
      node_id: 'results.awaiting-approval',
      action_id: 'approve-results',
      workflow_id: 'exam-release',
      execution_handler: 'workflows.examRelease.approve',
      aggregate_id: 'exam-batch-1',
      completed_at: '2026-05-26T00:00:02.000Z',
      emitted_events: ['RESULTS_APPROVED', 'PRINCIPAL_APPROVAL_GRANTED'],
      audit_action: 'audit.approve-results',
      status: 'COMPLETED',
      payload: {
        comment: 'Approved after Dean review',
      },
    },
    headers: {
      request_id: 'request-1',
      user_id: '00000000-0000-4000-8000-000000000111',
    },
    status: 'processing',
    attempt_count: 1,
    available_at: '2026-05-26T00:00:02.000Z',
    published_at: null,
    last_error: null,
    created_at: '2026-05-26T00:00:02.000Z',
    updated_at: '2026-05-26T00:00:02.000Z',
  };
}
