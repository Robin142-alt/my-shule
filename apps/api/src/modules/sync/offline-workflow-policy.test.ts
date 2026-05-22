import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildOfflineWorkflowPolicy,
  evaluateOfflineSyncBatch,
} from './offline-workflow-policy';

test('buildOfflineWorkflowPolicy enables the required low-connectivity workflows', () => {
  const policy = buildOfflineWorkflowPolicy('green-valley');

  assert.deepEqual(policy.enabled_workflows, [
    'student_attendance',
    'teacher_attendance',
    'mark_entry',
    'local_cache',
    'sms_fallback',
  ]);
  assert.equal(policy.tenant_cache_namespace, 'tenant:green-valley:offline');
  assert.equal(policy.conflict_resolution, 'server_review_required');
});

test('evaluateOfflineSyncBatch identifies conflicts and queues SMS fallback', () => {
  const result = evaluateOfflineSyncBatch({
    tenantId: 'green-valley',
    deviceId: 'teacher-tablet-1',
    operations: [
      { id: 'op-1', workflow: 'student_attendance', localVersion: 1, serverVersion: 1 },
      { id: 'op-2', workflow: 'mark_entry', localVersion: 3, serverVersion: 4 },
      { id: 'op-3', workflow: 'sms_fallback', localVersion: 1, serverVersion: 1 },
    ],
  });

  assert.deepEqual(result.accepted_operation_ids, ['op-1', 'op-3']);
  assert.deepEqual(result.conflict_operation_ids, ['op-2']);
  assert.deepEqual(result.sms_fallback_operation_ids, ['op-3']);
  assert.equal(result.cache_namespace, 'tenant:green-valley:offline:teacher-tablet-1');
});
