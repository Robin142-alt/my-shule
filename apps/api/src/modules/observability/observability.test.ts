import assert from 'node:assert/strict';
import test from 'node:test';

import { RequestContextService } from '../../common/request-context/request-context.service';
import { AuditLogService } from './audit-log.service';
import { GradesAuditService } from './grades-audit.service';
import { SloMetricsService } from './slo-metrics.service';
import { SloMonitoringService } from './slo-monitoring.service';
import {
  PRODUCTION_ALERT_POLICIES,
  PRODUCTION_OBSERVABILITY_DASHBOARDS,
  PRODUCTION_SYNTHETIC_CHECKS,
  validateProductionObservabilityCatalog,
} from './production-observability.catalog';

test('AuditLogService records contextual request fields', async () => {
  const requestContext = new RequestContextService();
  let capturedAuditLog: Record<string, unknown> | null = null;
  const service = new AuditLogService(requestContext, {
    createAuditLog: async (input: Record<string, unknown>) => {
      capturedAuditLog = input;
    },
  } as never);

  await requestContext.run(
    {
      request_id: 'req-audit-1',
      tenant_id: 'tenant-a',
      user_id: '00000000-0000-0000-0000-000000000001',
      role: 'owner',
      session_id: 'session-1',
      permissions: ['*:*'],
      is_authenticated: true,
      client_ip: '127.0.0.1',
      user_agent: 'test-suite',
      method: 'POST',
      path: '/finance/transactions',
      started_at: '2026-04-26T00:00:00.000Z',
    },
    () =>
      service.recordSecurityEvent({
        action: 'security.rate_limit.exceeded',
        resource_type: 'security_event',
        resource_id: 'resource-1',
        metadata: { limit: 120 },
      }),
  );

  assert.deepEqual(capturedAuditLog, {
    tenant_id: 'tenant-a',
    actor_user_id: '00000000-0000-0000-0000-000000000001',
    request_id: 'req-audit-1',
    action: 'security.rate_limit.exceeded',
    resource_type: 'security_event',
    resource_id: 'resource-1',
    ip_address: '127.0.0.1',
    user_agent: 'test-suite',
    metadata: { limit: 120 },
  });
});

test('GradesAuditService maps grade audit events onto the audit log service', async () => {
  let capturedInput: Record<string, unknown> | null = null;
  const service = new GradesAuditService({
    record: async (input: Record<string, unknown>) => {
      capturedInput = input;
    },
  } as never);

  await service.recordGradeAction({
    action: 'grade.updated',
    grade_id: 'grade-1',
    student_id: 'student-1',
    assessment_id: 'assessment-1',
    metadata: { score: 84 },
  });

  assert.deepEqual(capturedInput, {
    action: 'grade.updated',
    resource_type: 'grade',
    resource_id: 'grade-1',
    metadata: {
      student_id: 'student-1',
      assessment_id: 'assessment-1',
      score: 84,
    },
  });
});

test('SloMonitoringService raises and clears alerts when objectives are violated and restored', async () => {
  const capturedAlerts: Array<{
    event: 'observability.slo.alert_raised' | 'observability.slo.alert_cleared';
    fields: Record<string, unknown>;
    level?: 'warn' | 'error';
  }> = [];
  const configService = {
    get(key: string) {
      if (key === 'observability.sloWindowSeconds') {
        return 900;
      }

      if (key === 'observability.sloEvaluationIntervalSeconds') {
        return 30;
      }

      if (key === 'mpesa.queueName') {
        return 'mpesa-payments';
      }

      if (key === 'events.queueName') {
        return 'domain-events';
      }

      return undefined;
    },
  };
  const metricsService = new SloMetricsService(configService as never);
  const service = new SloMonitoringService(
    configService as never,
    {
      async ping() {
        return 'up';
      },
      async query() {
        return {
          rows: [
            {
              overdue_intents_count: '0',
              oldest_overdue_age_ms: null,
            },
          ],
        };
      },
    } as never,
    {
      async ping() {
        return 'up';
      },
    } as never,
    {
      async getJobCounts() {
        return {
          waiting: 0,
          active: 0,
          delayed: 0,
          failed: 0,
          completed: 0,
        };
      },
      async getQueueLagSnapshot() {
        return {
          oldest_waiting_age_ms: null,
          oldest_delayed_age_ms: null,
        };
      },
    } as never,
    metricsService,
    {
      logAlert(
        event: 'observability.slo.alert_raised' | 'observability.slo.alert_cleared',
        fields: Record<string, unknown>,
        level?: 'warn' | 'error',
      ) {
        capturedAlerts.push({ event, fields, level });
      },
    } as never,
  );

  metricsService.recordMpesaStkPush({
    outcome: 'failure',
    duration_ms: 810,
    tenant_id: 'tenant-a',
    payment_intent_id: 'intent-1',
  });

  const degradedSnapshot = await service.refreshSnapshot();

  assert.equal(degradedSnapshot.overall_status, 'critical');
  assert.ok(
    degradedSnapshot.active_alerts.some(
      (alert) => alert.objective_id === 'mpesa.stk_success_rate',
    ),
  );
  assert.ok(
    capturedAlerts.some(
      (alert) =>
        alert.event === 'observability.slo.alert_raised'
        && alert.fields.alert_id === 'mpesa.stk_success_rate',
    ),
  );

  metricsService.reset();
  capturedAlerts.length = 0;

  const recoveredSnapshot = await service.refreshSnapshot();

  assert.equal(recoveredSnapshot.active_alerts.length, 0);
  assert.ok(
    capturedAlerts.some(
      (alert) =>
        alert.event === 'observability.slo.alert_cleared'
        && alert.fields.alert_id === 'mpesa.stk_success_rate',
    ),
  );
});

test('SloMetricsService exposes recent API failure paths for production triage', () => {
  const metricsService = new SloMetricsService({
    get(key: string) {
      return key === 'observability.sloWindowSeconds' ? 60 * 60 * 24 * 30 : undefined;
    },
  } as never);

  metricsService.recordApiRequest({
    outcome: 'success',
    duration_ms: 40,
    status_code: 200,
    method: 'GET',
    path: '/health',
    event: 'request.completed',
    timestamp_ms: Date.parse('2026-07-03T18:00:00.000Z'),
  });
  metricsService.recordApiRequest({
    outcome: 'failure',
    duration_ms: 123.45,
    status_code: 500,
    method: 'POST',
    path: '/platform/schools?token=%5Bredacted%5D',
    event: 'request.completed',
    timestamp_ms: Date.parse('2026-07-03T18:01:00.000Z'),
  });

  assert.deepEqual(metricsService.getRecentApiFailures(), [
    {
      timestamp: '2026-07-03T18:01:00.000Z',
      method: 'POST',
      path: '/platform/schools?token=%5Bredacted%5D',
      status_code: 500,
      event: 'request.completed',
      duration_ms: 123.45,
    },
  ]);
});

test('production observability catalog covers Kenyan school operating dashboards, alerts, runbooks, and synthetics', () => {
  assert.deepEqual(validateProductionObservabilityCatalog(), []);
  assert.equal(PRODUCTION_OBSERVABILITY_DASHBOARDS.some((dashboard) => dashboard.id === 'api-latency-by-module'), true);
  assert.equal(PRODUCTION_OBSERVABILITY_DASHBOARDS.some((dashboard) => dashboard.id === 'mpesa-reconciliation-mismatches'), true);
  assert.equal(PRODUCTION_OBSERVABILITY_DASHBOARDS.some((dashboard) => dashboard.id === 'report-card-generation-queue-lag'), true);
  assert.equal(PRODUCTION_ALERT_POLICIES.some((alert) => alert.id === 'cross-tenant-access-attempt'), true);
  assert.equal(PRODUCTION_ALERT_POLICIES.some((alert) => alert.id === 'raw-pii-support-access-spike'), true);
  assert.equal(PRODUCTION_SYNTHETIC_CHECKS.some((check) => check.id === 'parent-report-card-download'), true);
  assert.equal(PRODUCTION_SYNTHETIC_CHECKS.some((check) => check.id === 'principal-dashboard-load'), true);
});

test('production observability catalog covers Implementation 90 extreme-scale and lockdown signals', () => {
  assert.deepEqual(validateProductionObservabilityCatalog(), []);
  assert.equal(PRODUCTION_OBSERVABILITY_DASHBOARDS.some((dashboard) => dashboard.id === 'implementation90-extreme-scale'), true);
  assert.equal(PRODUCTION_OBSERVABILITY_DASHBOARDS.some((dashboard) => dashboard.id === 'implementation90-security-lockdown'), true);
  assert.equal(PRODUCTION_ALERT_POLICIES.some((alert) => alert.id === 'implementation90-database-saturation'), true);
  assert.equal(PRODUCTION_ALERT_POLICIES.some((alert) => alert.id === 'implementation90-redis-degradation'), true);
  assert.equal(PRODUCTION_ALERT_POLICIES.some((alert) => alert.runbook === 'docs/runbooks/extreme-scale-incident.md'), true);
  assert.equal(PRODUCTION_ALERT_POLICIES.some((alert) => alert.runbook === 'docs/runbooks/security-lockdown-mode.md'), true);
  assert.equal(PRODUCTION_SYNTHETIC_CHECKS.some((check) => check.id === 'implementation90-parent-mobile-speed'), true);
});
