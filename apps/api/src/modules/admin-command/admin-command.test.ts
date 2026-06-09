import assert from 'node:assert/strict';
import test from 'node:test';
import 'reflect-metadata';
import { firstValueFrom, of } from 'rxjs';

import { PERMISSIONS_KEY } from '../../auth/auth.constants';
import { MODULE_ACCESS_KEY } from '../module-access/module-access.decorator';
import { AdminCommandController } from './admin-command.controller';
import { AdminCommandSchemaService } from './admin-command-schema.service';
import { AdminCommandService } from './admin-command.service';
import { PrincipalInsightsCacheService } from './principal-insights-cache.service';
import { PRINCIPAL_INSIGHT_PROVIDERS } from './principal-insights.providers';
import { PrincipalInsightsService } from './principal-insights.service';
import { AdminCommandRepository } from './repositories/admin-command.repository';

test('AdminCommandSchemaService creates leadership workflow tables with tenant RLS', async () => {
  let schemaSql = '';
  const service = new AdminCommandSchemaService({
    runSchemaBootstrap: async (sql: string) => {
      schemaSql += sql;
    },
  } as never);

  await service.onModuleInit();

  for (const table of [
    'admin_incidents',
    'announcements',
    'meeting_minutes',
    'duty_rosters',
    'principal_dashboard_snapshots',
    'principal_alerts',
  ]) {
    assert.match(schemaSql, new RegExp(`CREATE TABLE IF NOT EXISTS ${table}`));
    assert.match(schemaSql, new RegExp(`ALTER TABLE ${table} FORCE ROW LEVEL SECURITY`));
  }
});

test('PrincipalInsightsService audits dashboard views and stores persistent snapshots', async () => {
  const calls: string[] = [];
  const service = new PrincipalInsightsService(
    {
      getStore: () => ({
        tenant_id: 'tenant-a',
        user_id: 'principal-1',
        permissions: ['principal:read'],
      }),
    } as never,
    {
      listCurrentTenantModules: async () => ['principal_dashboard'],
    } as never,
    {
      findPrincipalDashboardSnapshot: async () => null,
      getPrincipalOverviewSnapshot: async () => ({
        total_students: 0,
        total_teachers: 0,
        total_support_staff: 0,
        student_gender_distribution: {},
        active_classes_streams: 0,
        student_attendance_today: 0,
        teacher_attendance_today: 0,
        parent_engagement_rate: 0,
        school_population_trends: [],
        active_users_online: 0,
      }),
      getPrincipalModuleMetrics: async () => ({}),
      upsertPrincipalDashboardSnapshot: async (input: Record<string, unknown>) => {
        calls.push(`snapshot:${input.tenant_id}`);
      },
      appendAuditLog: async (input: Record<string, unknown>) => {
        calls.push(`audit:${input.action}`);
      },
    } as never,
    new PrincipalInsightsCacheService(),
  );

  const dashboard = await service.buildDashboard('tenant-a');
  await service.buildDashboard('tenant-a');

  assert.equal(dashboard.tenant_id, 'tenant-a');
  assert.deepEqual(calls, [
    'audit:principal_dashboard.viewed',
    'snapshot:tenant-a',
  ]);
});

test('AI smart alerts provider exposes deterministic operational risk widgets', () => {
  const provider = PRINCIPAL_INSIGHT_PROVIDERS.find((item) => item.module_code === 'ai_insights');
  const metricKeys = new Set(provider?.widgets.map((widget) => widget.metric_key) ?? []);

  for (const key of [
    'fee_default_risk_alerts',
    'medicine_shortage_predictions',
    'attendance_irregularities',
    'budget_overrun_alerts',
    'performance_decline_warnings',
  ]) {
    assert.equal(metricKeys.has(key), true, `${key} missing from AI smart alerts widgets`);
  }
});

test('AdminCommandRepository calculates deterministic AI smart alert metrics from module signals', async () => {
  let observedSql = '';
  const repository = new AdminCommandRepository({
    query: async (sql: string) => {
      observedSql = sql;

      return {
        rows: [{
          smart_risk_alerts: '11',
          operational_anomalies: '2',
          predictions_generated: '6',
          fee_default_risk_alerts: '3',
          medicine_shortage_predictions: '4',
          attendance_irregularities: '2',
          budget_overrun_alerts: '1',
          performance_decline_warnings: '1',
        }],
      };
    },
  } as never);

  const metrics = await repository.getPrincipalModuleMetrics('tenant-a', 'ai_insights');

  assert.equal(metrics.smart_risk_alerts, 11);
  assert.equal(metrics.medicine_shortage_predictions, 4);
  assert.match(observedSql, /fee_default_risk_alerts/);
  assert.match(observedSql, /medicine_shortage_predictions/);
  assert.match(observedSql, /attendance_irregularities/);
  assert.match(observedSql, /budget_overrun_alerts/);
  assert.match(observedSql, /performance_decline_warnings/);
});

test('clinic principal insight provider exposes finance-safe medicine analytics widgets', () => {
  const provider = PRINCIPAL_INSIGHT_PROVIDERS.find((item) => item.module_code === 'clinic_health');
  const metricKeys = new Set(provider?.widgets.map((widget) => widget.metric_key) ?? []);

  for (const key of [
    'out_of_stock_medicines',
    'medicine_consumption_cost_minor',
    'wastage_due_to_expiry_minor',
    'emergency_supply_ready_rate',
    'most_used_medicine',
  ]) {
    assert.equal(metricKeys.has(key), true, `${key} missing from clinic widgets`);
  }
});

test('AdminCommandRepository calculates finance-safe clinic principal metrics without invoice exposure', async () => {
  let observedSql = '';
  const repository = new AdminCommandRepository({
    query: async (sql: string) => {
      observedSql = sql;

      return {
        rows: [{
          clinic_visits_today: '12',
          medicine_low_stock: '3',
          medicine_expiring_soon: '4',
          critical_medicine_shortages: '1',
          out_of_stock_medicines: '2',
          medicine_consumption_cost_minor: '250000',
          wastage_due_to_expiry_minor: '45000',
          emergency_supply_ready_rate: '80.5',
          most_used_medicine: 'Paracetamol',
        }],
      };
    },
  } as never);

  const metrics = await repository.getPrincipalModuleMetrics('tenant-a', 'clinic_health');

  assert.equal(metrics.medicine_consumption_cost_minor, 250000);
  assert.equal(metrics.wastage_due_to_expiry_minor, 45000);
  assert.equal(metrics.most_used_medicine, 'Paracetamol');
  assert.match(observedSql, /medicine_consumption_cost_minor/);
  assert.match(observedSql, /wastage_due_to_expiry_minor/);
  assert.match(observedSql, /emergency_supply_ready_rate/);
  assert.doesNotMatch(observedSql, /supplier_invoice_reference/);
  assert.doesNotMatch(observedSql, /confidential_notes/);
});

test('AdminCommandController is module-gated with role-specific permissions', () => {
  assert.deepEqual(Reflect.getMetadata(MODULE_ACCESS_KEY, AdminCommandController), ['admin_command_centers']);

  const principalHandler = Object.getOwnPropertyDescriptor(
    AdminCommandController.prototype,
    'getPrincipalDashboard',
  )?.value;
  const principalStreamHandler = Object.getOwnPropertyDescriptor(
    AdminCommandController.prototype,
    'streamPrincipalDashboard',
  )?.value;
  const deputyHandler = Object.getOwnPropertyDescriptor(
    AdminCommandController.prototype,
    'getDeputyDashboard',
  )?.value;
  const secretaryHandler = Object.getOwnPropertyDescriptor(
    AdminCommandController.prototype,
    'getSecretaryDashboard',
  )?.value;

  assert.deepEqual(Reflect.getMetadata(PERMISSIONS_KEY, principalHandler), ['principal:read']);
  assert.deepEqual(Reflect.getMetadata(PERMISSIONS_KEY, principalStreamHandler), ['principal:read']);
  assert.deepEqual(Reflect.getMetadata(PERMISSIONS_KEY, deputyHandler), ['deputy:read']);
  assert.deepEqual(Reflect.getMetadata(PERMISSIONS_KEY, secretaryHandler), ['secretary:read']);
});

test('AdminCommandService returns module-aware principal executive dashboard when insight service is available', async () => {
  const service = new AdminCommandService(
    { getStore: () => ({ tenant_id: 'tenant-a', user_id: 'principal-1' }) } as never,
    { getPrincipalDashboard: async () => ({ legacy: true }) } as never,
    {
      buildDashboard: async (tenantId: string) => ({
        tenant_id: tenantId,
        enabled_modules: ['finance', 'clinic_health'],
        sections: [
          { id: 'finance', module_code: 'finance', title: 'Finance Insights', widgets: [] },
          { id: 'clinic', module_code: 'clinic_health', title: 'Clinic Insights', widgets: [] },
        ],
        alerts: [],
      }),
    } as never,
  );

  const dashboard = await service.getPrincipalDashboard() as {
    tenant_id: string;
    enabled_modules: string[];
    sections: unknown[];
  };

  assert.equal(dashboard.tenant_id, 'tenant-a');
  assert.deepEqual(dashboard.enabled_modules, ['finance', 'clinic_health']);
  assert.equal(dashboard.sections.length, 2);
});

test('AdminCommandService exposes a tenant-scoped principal dashboard event stream', async () => {
  const service = new AdminCommandService(
    { getStore: () => ({ tenant_id: 'tenant-a', user_id: 'principal-1' }) } as never,
    { getPrincipalDashboard: async () => ({ legacy: true }) } as never,
    {
      streamDashboard: (tenantId: string) => of({
        type: 'principal.dashboard',
        data: {
          tenant_id: tenantId,
          generated_at: '2026-05-19T00:00:00.000Z',
        },
      }),
    } as never,
  );

  const firstEvent = await firstValueFrom(service.streamPrincipalDashboard());

  assert.equal(firstEvent.type, 'principal.dashboard');
  assert.deepEqual(firstEvent.data, {
    tenant_id: 'tenant-a',
    generated_at: '2026-05-19T00:00:00.000Z',
  });
});

test('AdminCommandService creates incidents with audit trail', async () => {
  const calls: string[] = [];
  const service = new AdminCommandService(
    { getStore: () => ({ tenant_id: 'tenant-a', user_id: 'user-1' }) } as never,
    {
      createIncident: async (input: Record<string, unknown>) => {
        calls.push('incident');
        return { id: 'incident-1', ...input };
      },
      appendAuditLog: async (input: Record<string, unknown>) => {
        calls.push(`audit:${input.action}`);
      },
    } as never,
  );

  const result = await service.createIncident({
    title: 'Gate duty incident',
    description: 'Teacher did not report for morning duty',
    severity: 'medium',
    involved_parties: [{ type: 'teacher', id: 'teacher-1' }],
  });

  assert.equal(result.id, 'incident-1');
  assert.deepEqual(calls, ['incident', 'audit:admin_command.incident_created']);
});
