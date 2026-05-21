import assert from 'node:assert/strict';
import test from 'node:test';
import 'reflect-metadata';

import { PERMISSIONS_KEY } from '../../auth/auth.constants';
import { MODULE_ACCESS_KEY } from '../module-access/module-access.decorator';
import { VisitorsController } from './visitors.controller';
import { VisitorsSchemaService } from './visitors-schema.service';
import { VisitorsService } from './visitors.service';

test('VisitorsSchemaService creates tenant-safe visitor tables', async () => {
  let schemaSql = '';
  const service = new VisitorsSchemaService({ runSchemaBootstrap: async (sql: string) => { schemaSql += sql; } } as never);

  await service.onModuleInit();

  for (const table of ['visitor_checkins', 'visitor_appointments', 'visitor_badges', 'visitor_emergency_logs']) {
    assert.match(schemaSql, new RegExp(`CREATE TABLE IF NOT EXISTS "?${table}"?`));
    assert.match(schemaSql, new RegExp(`ALTER TABLE "?${table}"? FORCE ROW LEVEL SECURITY`));
  }
});

test('VisitorsController is gated by visitor management module and permissions', () => {
  assert.deepEqual(Reflect.getMetadata(MODULE_ACCESS_KEY, VisitorsController), ['visitor_management']);
  const dashboardHandler = Object.getOwnPropertyDescriptor(VisitorsController.prototype, 'getDashboard')?.value;
  const createHandler = Object.getOwnPropertyDescriptor(VisitorsController.prototype, 'createRecord')?.value;

  assert.deepEqual(Reflect.getMetadata(PERMISSIONS_KEY, dashboardHandler), ['visitors:read']);
  assert.deepEqual(Reflect.getMetadata(PERMISSIONS_KEY, createHandler), ['visitors:write']);
});

test('VisitorsService creates auditable visitors records', async () => {
  const calls: Array<Record<string, unknown>> = [];
  const service = new VisitorsService(
    { getStore: () => ({ tenant_id: 'tenant-a', user_id: 'user-1', permissions: ['visitors:*'] }) } as never,
    {
      createRecord: async (input: Record<string, unknown>) => { calls.push({ method: 'createRecord', ...input }); return { id: 'visitor-1', title: input.title }; },
      updateStatus: async (input: Record<string, unknown>) => { calls.push({ method: 'updateStatus', ...input }); return { id: input.record_id, status: input.status }; },
      appendAuditLog: async (input: Record<string, unknown>) => { calls.push({ method: 'appendAuditLog', ...input }); },
      getDashboard: async (tenantId: string) => { calls.push({ method: 'getDashboard', tenant_id: tenantId }); return { total_records: 1, open_records: 1, action_due: 0, critical_records: 0, records: [], activity: [] }; },
    } as never,
  );

  await service.createRecord({ title: 'Parent appointment', category: 'appointment', owner_name: 'Security desk' });
  await service.updateStatus('visitor-1', { status: 'completed' });
  const dashboard = await service.getDashboard();

  assert.equal(dashboard.total_records, 1);
  assert.deepEqual(calls.map((call) => call.method), ['createRecord', 'appendAuditLog', 'updateStatus', 'appendAuditLog', 'getDashboard']);
});
