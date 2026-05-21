export interface ProductionObservabilityDashboard {
  id: string;
  title: string;
  metrics: string[];
  owner: string;
}

export interface ProductionAlertPolicy {
  id: string;
  signal: string;
  threshold: string;
  severity: 'warning' | 'critical';
  runbook: string;
}

export interface ProductionSyntheticCheck {
  id: string;
  journey: string;
  target: 'api' | 'web';
  p95_ms: number;
}

export const PRODUCTION_OBSERVABILITY_DASHBOARDS: readonly ProductionObservabilityDashboard[] = [
  {
    id: 'api-latency-by-module',
    title: 'API p95/p99 latency by module',
    metrics: ['api.request.p95_by_module', 'api.request.p99_by_module', 'api.error_rate_by_module'],
    owner: 'platform-on-call',
  },
  {
    id: 'mpesa-callbacks',
    title: 'Payment callback volume and failure rate',
    metrics: ['mpesa.callback.volume', 'mpesa.callback.failure_rate', 'mpesa.verification.queue_lag'],
    owner: 'payments-on-call',
  },
  {
    id: 'mpesa-reconciliation-mismatches',
    title: 'M-Pesa reconciliation mismatches',
    metrics: ['mpesa.reconciliation.mismatch_count', 'mpesa.reconciliation.unmatched_amount_minor'],
    owner: 'finance-on-call',
  },
  {
    id: 'report-card-generation-queue-lag',
    title: 'Report-card generation queue lag',
    metrics: ['report_card.queue.lag_ms', 'report_card.queue.failed_jobs', 'report_card.batch.duration_ms'],
    owner: 'exams-on-call',
  },
  {
    id: 'school-communications',
    title: 'SMS provider delivery failures',
    metrics: ['sms.delivery.failure_rate', 'sms.provider.latency_p95_ms'],
    owner: 'support-on-call',
  },
  {
    id: 'security-and-tenant-isolation',
    title: 'Tenant isolation anomalies and PII access',
    metrics: ['security.cross_tenant_attempts', 'security.rls_setting_failures', 'security.raw_pii_access_events'],
    owner: 'security-on-call',
  },
  {
    id: 'identity-and-database',
    title: 'Login/MFA failures and database saturation',
    metrics: ['auth.login.failure_rate', 'auth.mfa.failure_rate', 'database.pool.saturation'],
    owner: 'platform-on-call',
  },
  {
    id: 'implementation90-extreme-scale',
    title: 'Implementation 90 extreme-scale traffic and latency',
    metrics: [
      'api.request.users_per_second',
      'api.request.p95_by_rate_limit_class',
      'api.request.p99_by_rate_limit_class',
      'queue.oldest_waiting_age_ms',
    ],
    owner: 'platform-on-call',
  },
  {
    id: 'implementation90-security-lockdown',
    title: 'Implementation 90 security lockdown and abuse controls',
    metrics: [
      'security.lockdown.enabled',
      'security.rate_limit.abuse_events',
      'security.payment_callback.verification_failures',
      'security.admin.action_spike',
    ],
    owner: 'security-on-call',
  },
];

export const PRODUCTION_ALERT_POLICIES: readonly ProductionAlertPolicy[] = [
  {
    id: 'callback-failures-above-threshold',
    signal: 'mpesa.callback.failure_rate',
    threshold: '> 1% over 5 minutes',
    severity: 'critical',
    runbook: 'docs/runbooks/mpesa-callbacks-failing.md',
  },
  {
    id: 'provider-verification-backlog',
    signal: 'mpesa.verification.queue_lag',
    threshold: '> 250 waiting jobs or oldest job > 10 minutes',
    severity: 'critical',
    runbook: 'docs/runbooks/mpesa-callbacks-failing.md',
  },
  {
    id: 'report-card-generation-backlog',
    signal: 'report_card.queue.lag_ms',
    threshold: '> 15 minutes',
    severity: 'warning',
    runbook: 'docs/runbooks/report-cards-stuck.md',
  },
  {
    id: 'cross-tenant-access-attempt',
    signal: 'security.cross_tenant_attempts',
    threshold: '>= 1 confirmed attempt',
    severity: 'critical',
    runbook: 'docs/runbooks/tenant-isolation-incident.md',
  },
  {
    id: 'failed-rls-setting',
    signal: 'security.rls_setting_failures',
    threshold: '>= 1 failure',
    severity: 'critical',
    runbook: 'docs/runbooks/tenant-isolation-incident.md',
  },
  {
    id: 'raw-pii-support-access-spike',
    signal: 'security.raw_pii_access_events',
    threshold: '> 3 support payload retrievals per tenant per hour',
    severity: 'critical',
    runbook: 'docs/runbooks/data-breach-response.md',
  },
  {
    id: 'queue-dead-letter-growth',
    signal: 'queue.failed_jobs',
    threshold: '> 50 failed jobs in 15 minutes',
    severity: 'warning',
    runbook: 'docs/runbooks/production-monitoring.md',
  },
  {
    id: 'implementation90-database-saturation',
    signal: 'database.pool.waiting_clients',
    threshold: '> 0 steady-state or any spike longer than 5 seconds',
    severity: 'critical',
    runbook: 'docs/runbooks/extreme-scale-incident.md',
  },
  {
    id: 'implementation90-redis-degradation',
    signal: 'redis.error_rate',
    threshold: '> 0.1% over 5 minutes',
    severity: 'warning',
    runbook: 'docs/runbooks/extreme-scale-incident.md',
  },
  {
    id: 'implementation90-security-lockdown-triggered',
    signal: 'security.lockdown.enabled',
    threshold: 'enabled for any production tenant',
    severity: 'critical',
    runbook: 'docs/runbooks/security-lockdown-mode.md',
  },
];

export const PRODUCTION_INCIDENT_RUNBOOKS: readonly string[] = [
  'docs/runbooks/mpesa-callbacks-failing.md',
  'docs/runbooks/mpesa-reconciliation-mismatch.md',
  'docs/runbooks/report-cards-stuck.md',
  'docs/runbooks/data-breach-response.md',
  'docs/runbooks/tenant-isolation-incident.md',
  'docs/runbooks/database-saturation.md',
  'docs/runbooks/sms-campaign-failure.md',
  'docs/runbooks/extreme-scale-incident.md',
  'docs/runbooks/security-lockdown-mode.md',
];

export const PRODUCTION_SYNTHETIC_CHECKS: readonly ProductionSyntheticCheck[] = [
  { id: 'login-page', journey: 'login-smoke', target: 'web', p95_ms: 1200 },
  { id: 'tenant-switch-modules', journey: 'kenyan-school-critical-flows', target: 'api', p95_ms: 900 },
  { id: 'stk-sandbox-readiness', journey: 'kenyan-school-critical-flows', target: 'api', p95_ms: 1200 },
  { id: 'c2b-sandbox-registration', journey: 'kenyan-school-critical-flows', target: 'api', p95_ms: 1200 },
  { id: 'parent-report-card-download', journey: 'kenyan-school-critical-flows', target: 'api', p95_ms: 1500 },
  { id: 'principal-dashboard-load', journey: 'kenyan-school-critical-flows', target: 'api', p95_ms: 1200 },
  { id: 'implementation90-parent-mobile-speed', journey: 'implementation90-mobile-speed', target: 'web', p95_ms: 2500 },
  { id: 'implementation90-api-mixed-read', journey: 'implementation90-5000-users-per-second', target: 'api', p95_ms: 900 },
];

export function validateProductionObservabilityCatalog(): string[] {
  const errors: string[] = [];
  const dashboardIds = new Set(PRODUCTION_OBSERVABILITY_DASHBOARDS.map((dashboard) => dashboard.id));
  const alertIds = new Set(PRODUCTION_ALERT_POLICIES.map((alert) => alert.id));
  const syntheticIds = new Set(PRODUCTION_SYNTHETIC_CHECKS.map((check) => check.id));

  for (const requiredDashboard of [
    'api-latency-by-module',
    'mpesa-callbacks',
    'mpesa-reconciliation-mismatches',
    'report-card-generation-queue-lag',
    'school-communications',
    'security-and-tenant-isolation',
    'identity-and-database',
    'implementation90-extreme-scale',
    'implementation90-security-lockdown',
  ]) {
    if (!dashboardIds.has(requiredDashboard)) {
      errors.push(`Missing production dashboard ${requiredDashboard}.`);
    }
  }

  for (const requiredAlert of [
    'callback-failures-above-threshold',
    'provider-verification-backlog',
    'report-card-generation-backlog',
    'cross-tenant-access-attempt',
    'failed-rls-setting',
    'raw-pii-support-access-spike',
    'queue-dead-letter-growth',
    'implementation90-database-saturation',
    'implementation90-redis-degradation',
    'implementation90-security-lockdown-triggered',
  ]) {
    if (!alertIds.has(requiredAlert)) {
      errors.push(`Missing production alert ${requiredAlert}.`);
    }
  }

  for (const requiredCheck of [
    'login-page',
    'tenant-switch-modules',
    'stk-sandbox-readiness',
    'c2b-sandbox-registration',
    'parent-report-card-download',
    'principal-dashboard-load',
    'implementation90-parent-mobile-speed',
    'implementation90-api-mixed-read',
  ]) {
    if (!syntheticIds.has(requiredCheck)) {
      errors.push(`Missing synthetic check ${requiredCheck}.`);
    }
  }

  return errors;
}
