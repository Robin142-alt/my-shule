import assert from 'node:assert/strict';
import test from 'node:test';
import 'reflect-metadata';

import { PERMISSIONS_KEY } from '../../auth/auth.constants';
import { MODULE_ACCESS_KEY } from '../module-access/module-access.decorator';
import { HostelController } from './hostel.controller';
import { HostelSchemaService } from './hostel-schema.service';
import { HostelService } from './hostel.service';

test('HostelSchemaService creates tenant-safe hostel tables', async () => {
  let schemaSql = '';
  const service = new HostelSchemaService({ runSchemaBootstrap: async (sql: string) => { schemaSql += sql; } } as never);

  await service.onModuleInit();

  for (const table of ['hostels', 'hostel_rooms', 'hostel_allocations', 'hostel_issues', 'hostel_meal_consumption']) {
    assert.match(schemaSql, new RegExp(`CREATE TABLE IF NOT EXISTS "?${table}"?`));
    assert.match(schemaSql, new RegExp(`ALTER TABLE "?${table}"? FORCE ROW LEVEL SECURITY`));
  }
});

test('HostelController is gated by hostel module and permissions', () => {
  assert.deepEqual(Reflect.getMetadata(MODULE_ACCESS_KEY, HostelController), ['hostel']);
  const dashboardHandler = Object.getOwnPropertyDescriptor(HostelController.prototype, 'getDashboard')?.value;
  const createHandler = Object.getOwnPropertyDescriptor(HostelController.prototype, 'createRecord')?.value;

  assert.deepEqual(Reflect.getMetadata(PERMISSIONS_KEY, dashboardHandler), ['hostel:read']);
  assert.deepEqual(Reflect.getMetadata(PERMISSIONS_KEY, createHandler), ['hostel:write']);
});

test('HostelService creates and closes auditable hostel records', async () => {
  const calls: Array<Record<string, unknown>> = [];
  const service = new HostelService(
    { getStore: () => ({ tenant_id: 'tenant-a', user_id: 'user-1', permissions: ['hostel:*'] }) } as never,
    {
      createRecord: async (input: Record<string, unknown>) => { calls.push({ method: 'createRecord', ...input }); return { id: 'hostel-1', title: input.title }; },
      updateStatus: async (input: Record<string, unknown>) => { calls.push({ method: 'updateStatus', ...input }); return { id: input.record_id, status: input.status }; },
      appendAuditLog: async (input: Record<string, unknown>) => { calls.push({ method: 'appendAuditLog', ...input }); },
      getDashboard: async (tenantId: string) => { calls.push({ method: 'getDashboard', tenant_id: tenantId }); return { total_records: 1, open_records: 1, action_due: 0, critical_records: 0, records: [], activity: [] }; },
    } as never,
  );

  await service.createRecord({ title: 'Dormitory issue', category: 'maintenance', owner_name: 'Matron' });
  await service.updateStatus('hostel-1', { status: 'completed' });
  const dashboard = await service.getDashboard();

  assert.equal(dashboard.total_records, 1);
  assert.deepEqual(calls.map((call) => call.method), ['createRecord', 'appendAuditLog', 'updateStatus', 'appendAuditLog', 'getDashboard']);
  assert.equal(calls[0]?.tenant_id, 'tenant-a');
});
