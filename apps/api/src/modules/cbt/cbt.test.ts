import assert from 'node:assert/strict';
import test from 'node:test';
import 'reflect-metadata';

import { PERMISSIONS_KEY } from '../../auth/auth.constants';
import { MODULE_ACCESS_KEY } from '../module-access/module-access.decorator';
import { CbtController } from './cbt.controller';
import { CbtSchemaService } from './cbt-schema.service';
import { CbtService } from './cbt.service';

test('CbtSchemaService creates tenant-safe cbt exam tables', async () => {
  let schemaSql = '';
  const service = new CbtSchemaService({ runSchemaBootstrap: async (sql: string) => { schemaSql += sql; } } as never);

  await service.onModuleInit();

  for (const table of ['cbt_exam_sessions', 'cbt_questions', 'cbt_attempts', 'cbt_responses', 'cbt_invigilation_events']) {
    assert.match(schemaSql, new RegExp(`CREATE TABLE IF NOT EXISTS "?${table}"?`));
    assert.match(schemaSql, new RegExp(`ALTER TABLE "?${table}"? FORCE ROW LEVEL SECURITY`));
  }
});

test('CbtController is gated by cbt exams module and permissions', () => {
  assert.deepEqual(Reflect.getMetadata(MODULE_ACCESS_KEY, CbtController), ['cbt_exams']);
  const dashboardHandler = Object.getOwnPropertyDescriptor(CbtController.prototype, 'getDashboard')?.value;
  const createHandler = Object.getOwnPropertyDescriptor(CbtController.prototype, 'createRecord')?.value;

  assert.deepEqual(Reflect.getMetadata(PERMISSIONS_KEY, dashboardHandler), ['cbt:read']);
  assert.deepEqual(Reflect.getMetadata(PERMISSIONS_KEY, createHandler), ['cbt:write']);
});

test('CbtService creates auditable cbt records', async () => {
  const calls: Array<Record<string, unknown>> = [];
  const service = new CbtService(
    { getStore: () => ({ tenant_id: 'tenant-a', user_id: 'user-1', permissions: ['cbt:*'] }) } as never,
    {
      createRecord: async (input: Record<string, unknown>) => { calls.push({ method: 'createRecord', ...input }); return { id: 'cbt-1', title: input.title }; },
      updateStatus: async (input: Record<string, unknown>) => { calls.push({ method: 'updateStatus', ...input }); return { id: input.record_id, status: input.status }; },
      appendAuditLog: async (input: Record<string, unknown>) => { calls.push({ method: 'appendAuditLog', ...input }); },
      getDashboard: async (tenantId: string) => { calls.push({ method: 'getDashboard', tenant_id: tenantId }); return { total_records: 1, open_records: 1, action_due: 0, critical_records: 0, records: [], activity: [] }; },
    } as never,
  );

  await service.createRecord({ title: 'Grade 8 CBT Mathematics', category: 'mathematics', owner_name: 'Exam office' });
  await service.updateStatus('cbt-1', { status: 'completed' });
  const dashboard = await service.getDashboard();

  assert.equal(dashboard.total_records, 1);
  assert.deepEqual(calls.map((call) => call.method), ['createRecord', 'appendAuditLog', 'updateStatus', 'appendAuditLog', 'getDashboard']);
});
