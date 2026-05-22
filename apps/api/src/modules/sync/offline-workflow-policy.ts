export type OfflineWorkflowCode =
  | 'student_attendance'
  | 'teacher_attendance'
  | 'mark_entry'
  | 'local_cache'
  | 'sms_fallback';

export type OfflineWorkflowPolicy = {
  tenant_id: string;
  enabled_workflows: OfflineWorkflowCode[];
  tenant_cache_namespace: string;
  conflict_resolution: 'server_review_required';
  max_batch_size: number;
};

export type OfflineSyncOperation = {
  id: string;
  workflow: OfflineWorkflowCode;
  localVersion: number;
  serverVersion: number;
};

export type OfflineSyncBatchInput = {
  tenantId: string;
  deviceId: string;
  operations: OfflineSyncOperation[];
};

export type OfflineSyncBatchEvaluation = {
  tenant_id: string;
  device_id: string;
  cache_namespace: string;
  accepted_operation_ids: string[];
  conflict_operation_ids: string[];
  sms_fallback_operation_ids: string[];
};

export function buildOfflineWorkflowPolicy(tenantId: string): OfflineWorkflowPolicy {
  return {
    tenant_id: tenantId,
    enabled_workflows: [
      'student_attendance',
      'teacher_attendance',
      'mark_entry',
      'local_cache',
      'sms_fallback',
    ],
    tenant_cache_namespace: tenantCacheNamespace(tenantId),
    conflict_resolution: 'server_review_required',
    max_batch_size: 250,
  };
}

export function evaluateOfflineSyncBatch(input: OfflineSyncBatchInput): OfflineSyncBatchEvaluation {
  const accepted: string[] = [];
  const conflicts: string[] = [];
  const smsFallback: string[] = [];

  for (const operation of input.operations) {
    if (operation.workflow === 'sms_fallback') {
      smsFallback.push(operation.id);
    }

    if (operation.localVersion !== operation.serverVersion) {
      conflicts.push(operation.id);
      continue;
    }

    accepted.push(operation.id);
  }

  return {
    tenant_id: input.tenantId,
    device_id: input.deviceId,
    cache_namespace: `${tenantCacheNamespace(input.tenantId)}:${input.deviceId}`,
    accepted_operation_ids: accepted,
    conflict_operation_ids: conflicts,
    sms_fallback_operation_ids: smsFallback,
  };
}

function tenantCacheNamespace(tenantId: string): string {
  return `tenant:${tenantId}:offline`;
}
