import assert from 'node:assert/strict';
import test from 'node:test';
import 'reflect-metadata';

import { PERMISSIONS_KEY } from '../../auth/auth.constants';
import { MODULE_ACCESS_KEY } from '../module-access/module-access.decorator';
import { BoardingController } from './boarding.controller';
import { BoardingSchemaService } from './boarding-schema.service';
import { BoardingService } from './boarding.service';

test('BoardingSchemaService creates tenant-safe boarding tables', async () => {
  let schemaSql = '';
  const service = new BoardingSchemaService({ runSchemaBootstrap: async (sql: string) => { schemaSql += sql; } } as never);

  await service.onModuleInit();

  for (const table of ['boarding_houses', 'boarding_students', 'boarding_meals', 'boarding_dormitory_checks', 'boarding_incidents']) {
    assert.match(schemaSql, new RegExp(`CREATE TABLE IF NOT EXISTS "?${table}"?`));
    assert.match(schemaSql, new RegExp(`ALTER TABLE "?${table}"? FORCE ROW LEVEL SECURITY`));
  }
});

test('BoardingController is gated by boarding module and permissions', () => {
  assert.deepEqual(Reflect.getMetadata(MODULE_ACCESS_KEY, BoardingController), ['boarding']);
  const dashboardHandler = Object.getOwnPropertyDescriptor(BoardingController.prototype, 'getDashboard')?.value;
  const createHandler = Object.getOwnPropertyDescriptor(BoardingController.prototype, 'createRecord')?.value;

  assert.deepEqual(Reflect.getMetadata(PERMISSIONS_KEY, dashboardHandler), ['boarding:read']);
  assert.deepEqual(Reflect.getMetadata(PERMISSIONS_KEY, createHandler), ['boarding:write']);
});

test('BoardingService creates auditable boarding records', async () => {
  const calls: Array<Record<string, unknown>> = [];
  const service = new BoardingService(
    { getStore: () => ({ tenant_id: 'tenant-a', user_id: 'user-1', permissions: ['boarding:*'] }) } as never,
    {
      createRecord: async (input: Record<string, unknown>) => { calls.push({ method: 'createRecord', ...input }); return { id: 'boarding-1', title: input.title }; },
      updateStatus: async (input: Record<string, unknown>) => { calls.push({ method: 'updateStatus', ...input }); return { id: input.record_id, status: input.status }; },
      appendAuditLog: async (input: Record<string, unknown>) => { calls.push({ method: 'appendAuditLog', ...input }); },
      getDashboard: async (tenantId: string) => { calls.push({ method: 'getDashboard', tenant_id: tenantId }); return { total_records: 1, open_records: 1, action_due: 0, critical_records: 0, records: [], activity: [] }; },
    } as never,
  );

  await service.createRecord({ title: 'Dormitory roll call', category: 'roll_call', owner_name: 'House parent' });
  await service.updateStatus('boarding-1', { status: 'completed' });
  const dashboard = await service.getDashboard();

  assert.equal(dashboard.total_records, 1);
  assert.deepEqual(calls.map((call) => call.method), ['createRecord', 'appendAuditLog', 'updateStatus', 'appendAuditLog', 'getDashboard']);
});
