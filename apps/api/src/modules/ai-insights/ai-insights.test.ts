import assert from 'node:assert/strict';
import test from 'node:test';
import 'reflect-metadata';

import { PERMISSIONS_KEY } from '../../auth/auth.constants';
import { MODULE_ACCESS_KEY } from '../module-access/module-access.decorator';
import { AiInsightsController } from './ai-insights.controller';
import { AiInsightsSchemaService } from './ai-insights-schema.service';
import { AiInsightsService } from './ai-insights.service';

test('AiInsightsSchemaService creates tenant-safe ai insights tables', async () => {
  let schemaSql = '';
  const service = new AiInsightsSchemaService({ runSchemaBootstrap: async (sql: string) => { schemaSql += sql; } } as never);

  await service.onModuleInit();

  for (const table of ['ai_insight_runs', 'ai_insight_alerts', 'ai_forecasts', 'ai_anomalies', 'ai_recommendations']) {
    assert.match(schemaSql, new RegExp(`CREATE TABLE IF NOT EXISTS "?${table}"?`));
    assert.match(schemaSql, new RegExp(`ALTER TABLE "?${table}"? FORCE ROW LEVEL SECURITY`));
  }
});

test('AiInsightsController is gated by ai insights module and permissions', () => {
  assert.deepEqual(Reflect.getMetadata(MODULE_ACCESS_KEY, AiInsightsController), ['ai_insights']);
  const dashboardHandler = Object.getOwnPropertyDescriptor(AiInsightsController.prototype, 'getDashboard')?.value;
  const createHandler = Object.getOwnPropertyDescriptor(AiInsightsController.prototype, 'createRecord')?.value;

  assert.deepEqual(Reflect.getMetadata(PERMISSIONS_KEY, dashboardHandler), ['ai-insights:read']);
  assert.deepEqual(Reflect.getMetadata(PERMISSIONS_KEY, createHandler), ['ai-insights:write']);
});

test('AiInsightsService creates auditable ai_insights records', async () => {
  const calls: Array<Record<string, unknown>> = [];
  const service = new AiInsightsService(
    { getStore: () => ({ tenant_id: 'tenant-a', user_id: 'user-1', permissions: ['ai-insights:*'] }) } as never,
    {
      createRecord: async (input: Record<string, unknown>) => { calls.push({ method: 'createRecord', ...input }); return { id: 'ai-1', title: input.title }; },
      updateStatus: async (input: Record<string, unknown>) => { calls.push({ method: 'updateStatus', ...input }); return { id: input.record_id, status: input.status }; },
      appendAuditLog: async (input: Record<string, unknown>) => { calls.push({ method: 'appendAuditLog', ...input }); },
      getDashboard: async (tenantId: string) => { calls.push({ method: 'getDashboard', tenant_id: tenantId }); return { total_records: 1, open_records: 1, action_due: 0, critical_records: 0, records: [], activity: [] }; },
    } as never,
  );

  await service.createRecord({ title: 'Fee anomaly scan', category: 'anomaly', owner_name: 'Principal' });
  await service.updateStatus('ai-1', { status: 'completed' });
  const dashboard = await service.getDashboard();

  assert.equal(dashboard.total_records, 1);
  assert.deepEqual(calls.map((call) => call.method), ['createRecord', 'appendAuditLog', 'updateStatus', 'appendAuditLog', 'getDashboard']);
});
