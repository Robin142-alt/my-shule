import assert from 'node:assert/strict';
import test from 'node:test';

import {
  AUDIT_MONITORING_BLUEPRINT,
  buildAuditMonitoringPolicy,
  evaluateAuditMonitoringSnapshot,
} from './audit-monitoring-policy';

test('AUDIT_MONITORING_BLUEPRINT covers required audit and monitoring categories', () => {
  assert.deepEqual(AUDIT_MONITORING_BLUEPRINT.auditStreams, [
    'user_activity',
    'login_history',
    'record_modifications',
    'approval_logs',
    'financial_audit_trails',
    'device_logs',
  ]);
  assert.deepEqual(AUDIT_MONITORING_BLUEPRINT.monitoringSignals, [
    'system_uptime',
    'error_tracking',
    'resource_monitoring',
    'tenant_monitoring',
    'usage_analytics',
  ]);
  assert.equal(AUDIT_MONITORING_BLUEPRINT.minimumRetentionDays.auditLogs, 2555);
});

test('buildAuditMonitoringPolicy activates module-specific audit streams', () => {
  const policy = buildAuditMonitoringPolicy({
    activeModules: ['finance', 'teacher_biometric_attendance', 'iot'],
    deploymentMode: 'hybrid',
  });

  assert.equal(policy.requiredAuditStreams.some((stream) => stream.id === 'financial_audit_trails'), true);
  assert.equal(policy.requiredAuditStreams.some((stream) => stream.id === 'device_logs'), true);
  assert.equal(policy.requiredAuditStreams.some((stream) => stream.id === 'telemetry_command_logs'), true);
  assert.equal(policy.requiredMonitoringSignals.some((signal) => signal.id === 'offline_sync_lag'), true);
  assert.equal(policy.requiredAuditStreams.some((stream) => stream.id === 'clinic_access_logs'), false);
});

test('evaluateAuditMonitoringSnapshot flags missing streams, weak retention, and untagged monitoring', () => {
  const policy = buildAuditMonitoringPolicy({
    activeModules: ['finance', 'teacher_biometric_attendance'],
    deploymentMode: 'cloud',
  });
  const result = evaluateAuditMonitoringSnapshot(
    {
      auditStreams: [
        auditStream('user_activity', 90, true, true),
        auditStream('login_history', 2555, true, false),
        auditStream('record_modifications', 2555, false, true),
        auditStream('approval_logs', 2555, true, true),
      ],
      monitoringSignals: [
        monitoringSignal('system_uptime', true, true),
        monitoringSignal('error_tracking', false, true),
        monitoringSignal('resource_monitoring', true, false),
        monitoringSignal('usage_analytics', true, true),
      ],
      alerting: {
        escalationRules: true,
        tenantScopedChannels: false,
        incidentRunbookLinked: true,
      },
    },
    policy,
  );

  assert.equal(result.ok, false);
  assert.equal(result.issues.some((issue) => issue.id === 'audit-retention:user_activity'), true);
  assert.equal(result.issues.some((issue) => issue.id === 'audit-tenant-scope:login_history'), true);
  assert.equal(result.issues.some((issue) => issue.id === 'audit-immutable:record_modifications'), true);
  assert.equal(result.issues.some((issue) => issue.id === 'missing-audit-stream:financial_audit_trails'), true);
  assert.equal(result.issues.some((issue) => issue.id === 'missing-monitoring-signal:tenant_monitoring'), true);
  assert.equal(result.issues.some((issue) => issue.id === 'monitoring-alert:error_tracking'), true);
  assert.equal(result.issues.some((issue) => issue.id === 'monitoring-tenant-scope:resource_monitoring'), true);
  assert.equal(result.issues.some((issue) => issue.id === 'tenant-alert-channel-required'), true);
});

test('evaluateAuditMonitoringSnapshot passes a complete tenant-scoped audit and monitoring setup', () => {
  const policy = buildAuditMonitoringPolicy({
    activeModules: ['finance', 'clinic_health', 'iot'],
    deploymentMode: 'hybrid',
  });
  const result = evaluateAuditMonitoringSnapshot(
    {
      auditStreams: policy.requiredAuditStreams.map((stream) =>
        auditStream(stream.id, stream.retentionDays, true, true),
      ),
      monitoringSignals: policy.requiredMonitoringSignals.map((signal) =>
        monitoringSignal(signal.id, true, true),
      ),
      alerting: {
        escalationRules: true,
        tenantScopedChannels: true,
        incidentRunbookLinked: true,
      },
    },
    policy,
  );

  assert.equal(result.ok, true);
  assert.deepEqual(result.issues, []);
});

function auditStream(
  id: string,
  retentionDays: number,
  immutable: boolean,
  tenantScoped: boolean,
) {
  return { id, retentionDays, immutable, tenantScoped };
}

function monitoringSignal(
  id: string,
  alertConfigured: boolean,
  tenantTagged: boolean,
) {
  return { id, alertConfigured, tenantTagged };
}
