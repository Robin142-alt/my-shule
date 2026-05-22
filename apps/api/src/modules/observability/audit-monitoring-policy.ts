export type DeploymentMode = 'cloud' | 'hybrid' | 'dedicated';

export type AuditStreamId =
  | 'user_activity'
  | 'login_history'
  | 'record_modifications'
  | 'approval_logs'
  | 'financial_audit_trails'
  | 'device_logs'
  | 'clinic_access_logs'
  | 'ai_decision_audit_logs'
  | 'telemetry_command_logs'
  | 'communication_delivery_logs';

export type MonitoringSignalId =
  | 'system_uptime'
  | 'error_tracking'
  | 'resource_monitoring'
  | 'tenant_monitoring'
  | 'usage_analytics'
  | 'offline_sync_lag';

export type AuditStreamRequirement = {
  id: AuditStreamId;
  retentionDays: number;
  immutable: boolean;
  tenantScoped: boolean;
  moduleCode?: string;
};

export type MonitoringSignalRequirement = {
  id: MonitoringSignalId;
  alertRequired: boolean;
  tenantTagged: boolean;
};

export type AuditMonitoringPolicy = {
  requiredAuditStreams: AuditStreamRequirement[];
  requiredMonitoringSignals: MonitoringSignalRequirement[];
  alerting: {
    escalationRules: true;
    tenantScopedChannels: true;
    incidentRunbookLinked: true;
  };
};

export type AuditMonitoringPolicyInput = {
  activeModules: readonly string[];
  deploymentMode: DeploymentMode;
};

export type AuditMonitoringSnapshot = {
  auditStreams: readonly {
    id: string;
    retentionDays: number;
    immutable: boolean;
    tenantScoped: boolean;
  }[];
  monitoringSignals: readonly {
    id: string;
    alertConfigured: boolean;
    tenantTagged: boolean;
  }[];
  alerting: {
    escalationRules: boolean;
    tenantScopedChannels: boolean;
    incidentRunbookLinked: boolean;
  };
};

export type AuditMonitoringIssue = {
  id: string;
  severity: 'critical' | 'high';
  message: string;
};

export type AuditMonitoringEvaluation = {
  ok: boolean;
  issues: AuditMonitoringIssue[];
};

const REQUIRED_AUDIT_RETENTION_DAYS = 365 * 7;

const BASE_AUDIT_STREAMS: readonly AuditStreamId[] = [
  'user_activity',
  'login_history',
  'record_modifications',
  'approval_logs',
  'financial_audit_trails',
  'device_logs',
];

const BASE_MONITORING_SIGNALS: readonly MonitoringSignalId[] = [
  'system_uptime',
  'error_tracking',
  'resource_monitoring',
  'tenant_monitoring',
  'usage_analytics',
];

const MODULE_AUDIT_STREAMS: Record<string, readonly AuditStreamId[]> = {
  finance: ['financial_audit_trails'],
  teacher_biometric_attendance: ['device_logs'],
  clinic_health: ['clinic_access_logs'],
  ai_insights: ['ai_decision_audit_logs'],
  iot: ['telemetry_command_logs', 'device_logs'],
  communication_sms: ['communication_delivery_logs'],
};

export const AUDIT_MONITORING_BLUEPRINT = {
  auditStreams: BASE_AUDIT_STREAMS,
  monitoringSignals: BASE_MONITORING_SIGNALS,
  minimumRetentionDays: {
    auditLogs: REQUIRED_AUDIT_RETENTION_DAYS,
  },
  alerting: {
    escalationRules: true,
    tenantScopedChannels: true,
    incidentRunbookLinked: true,
  },
} as const;

export function buildAuditMonitoringPolicy(
  input: AuditMonitoringPolicyInput,
): AuditMonitoringPolicy {
  const auditStreams = new Map<AuditStreamId, AuditStreamRequirement>();
  const monitoringSignals = new Map<MonitoringSignalId, MonitoringSignalRequirement>();

  for (const stream of BASE_AUDIT_STREAMS) {
    auditStreams.set(stream, auditRequirement(stream));
  }

  for (const moduleCode of input.activeModules) {
    for (const stream of MODULE_AUDIT_STREAMS[moduleCode] ?? []) {
      auditStreams.set(stream, auditRequirement(stream, moduleCode));
    }
  }

  for (const signal of BASE_MONITORING_SIGNALS) {
    monitoringSignals.set(signal, monitoringRequirement(signal));
  }

  if (input.deploymentMode === 'hybrid') {
    monitoringSignals.set('offline_sync_lag', monitoringRequirement('offline_sync_lag'));
  }

  return {
    requiredAuditStreams: [...auditStreams.values()],
    requiredMonitoringSignals: [...monitoringSignals.values()],
    alerting: AUDIT_MONITORING_BLUEPRINT.alerting,
  };
}

export function evaluateAuditMonitoringSnapshot(
  snapshot: AuditMonitoringSnapshot,
  policy: AuditMonitoringPolicy,
): AuditMonitoringEvaluation {
  const auditStreams = new Map(snapshot.auditStreams.map((stream) => [stream.id, stream]));
  const monitoringSignals = new Map(snapshot.monitoringSignals.map((signal) => [signal.id, signal]));
  const issues: AuditMonitoringIssue[] = [];

  for (const required of policy.requiredAuditStreams) {
    const actual = auditStreams.get(required.id);

    if (!actual) {
      issues.push(issue(`missing-audit-stream:${required.id}`, 'critical', `${required.id} audit stream is required.`));
      continue;
    }

    if (actual.retentionDays < required.retentionDays) {
      issues.push(issue(
        `audit-retention:${required.id}`,
        'critical',
        `${required.id} must retain audit evidence for at least ${required.retentionDays} days.`,
      ));
    }

    if (required.immutable && !actual.immutable) {
      issues.push(issue(`audit-immutable:${required.id}`, 'critical', `${required.id} must be immutable.`));
    }

    if (required.tenantScoped && !actual.tenantScoped) {
      issues.push(issue(`audit-tenant-scope:${required.id}`, 'critical', `${required.id} must be tenant scoped.`));
    }
  }

  for (const required of policy.requiredMonitoringSignals) {
    const actual = monitoringSignals.get(required.id);

    if (!actual) {
      issues.push(issue(
        `missing-monitoring-signal:${required.id}`,
        'high',
        `${required.id} monitoring signal is required.`,
      ));
      continue;
    }

    if (required.alertRequired && !actual.alertConfigured) {
      issues.push(issue(`monitoring-alert:${required.id}`, 'high', `${required.id} must have an alert.`));
    }

    if (required.tenantTagged && !actual.tenantTagged) {
      issues.push(issue(
        `monitoring-tenant-scope:${required.id}`,
        'high',
        `${required.id} must be tagged by tenant.`,
      ));
    }
  }

  if (!snapshot.alerting.escalationRules) {
    issues.push(issue('escalation-rules-required', 'critical', 'Escalation rules are required.'));
  }

  if (!snapshot.alerting.tenantScopedChannels) {
    issues.push(issue('tenant-alert-channel-required', 'critical', 'Alert channels must be tenant scoped.'));
  }

  if (!snapshot.alerting.incidentRunbookLinked) {
    issues.push(issue('incident-runbook-required', 'high', 'Incident runbook link is required.'));
  }

  return {
    ok: issues.length === 0,
    issues,
  };
}

function auditRequirement(
  id: AuditStreamId,
  moduleCode?: string,
): AuditStreamRequirement {
  return {
    id,
    moduleCode,
    retentionDays: REQUIRED_AUDIT_RETENTION_DAYS,
    immutable: true,
    tenantScoped: true,
  };
}

function monitoringRequirement(id: MonitoringSignalId): MonitoringSignalRequirement {
  return {
    id,
    alertRequired: true,
    tenantTagged: true,
  };
}

function issue(
  id: string,
  severity: AuditMonitoringIssue['severity'],
  message: string,
): AuditMonitoringIssue {
  return { id, severity, message };
}
