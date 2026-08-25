import assert from 'node:assert/strict';
import test from 'node:test';
import 'reflect-metadata';

import { PERMISSIONS_KEY } from '../../auth/auth.constants';
import { MODULE_ACCESS_KEY } from '../module-access/module-access.decorator';
import { AssetsController } from './assets.controller';
import { AssetsSchemaService } from './assets-schema.service';
import { AssetsService } from './assets.service';

test('AssetsSchemaService creates tenant-safe assets tables', async () => {
  let schemaSql = '';
  const service = new AssetsSchemaService({ runSchemaBootstrap: async (sql: string) => { schemaSql += sql; } } as never);

  await service.onModuleInit();

  for (const table of ['assets', 'asset_assignments', 'asset_repairs', 'asset_depreciation_entries', 'facility_issues']) {
    assert.match(schemaSql, new RegExp(`CREATE TABLE IF NOT EXISTS "?${table}"?`));
    assert.match(schemaSql, new RegExp(`ALTER TABLE "?${table}"? FORCE ROW LEVEL SECURITY`));
  }
  assert.match(schemaSql, /ALTER TABLE asset_assignments ADD COLUMN IF NOT EXISTS due_at timestamptz/);
  assert.match(schemaSql, /ALTER TABLE asset_repairs ADD COLUMN IF NOT EXISTS completed_at timestamptz/);
  assert.match(schemaSql, /CREATE INDEX IF NOT EXISTS ix_facility_issues_status/);
});

test('AssetsController is gated by asset tracking module and permissions', () => {
  assert.deepEqual(Reflect.getMetadata(MODULE_ACCESS_KEY, AssetsController), ['asset_tracking']);
  const dashboardHandler = Object.getOwnPropertyDescriptor(AssetsController.prototype, 'getDashboard')?.value;
  const createHandler = Object.getOwnPropertyDescriptor(AssetsController.prototype, 'createRecord')?.value;

  assert.deepEqual(Reflect.getMetadata(PERMISSIONS_KEY, dashboardHandler), ['assets:read']);
  assert.deepEqual(Reflect.getMetadata(PERMISSIONS_KEY, createHandler), ['assets:write']);
});

test('AssetsService creates auditable assets records', async () => {
  const calls: Array<Record<string, unknown>> = [];
  const service = new AssetsService(
    { getStore: () => ({ tenant_id: 'tenant-a', user_id: 'user-1', permissions: ['assets:*'] }) } as never,
    {
      createRecord: async (input: Record<string, unknown>) => { calls.push({ method: 'createRecord', ...input }); return { id: 'asset-1', title: input.title }; },
      updateStatus: async (input: Record<string, unknown>) => { calls.push({ method: 'updateStatus', ...input }); return { id: input.record_id, status: input.status }; },
      appendAuditLog: async (input: Record<string, unknown>) => { calls.push({ method: 'appendAuditLog', ...input }); },
      getDashboard: async (tenantId: string) => { calls.push({ method: 'getDashboard', tenant_id: tenantId }); return { total_records: 1, open_records: 1, action_due: 0, critical_records: 0, records: [], activity: [] }; },
    } as never,
  );

  await service.createRecord({ title: 'Science projector', category: 'equipment', owner_name: 'ICT office' });
  await service.updateStatus('asset-1', { status: 'completed' });
  const dashboard = await service.getDashboard();

  assert.equal(dashboard.total_records, 1);
  assert.deepEqual(calls.map((call) => call.method), ['createRecord', 'appendAuditLog', 'updateStatus', 'appendAuditLog', 'getDashboard']);
});

test('AssetsService routes fault alerts to school roles and reports degraded delivery after persistence', async () => {
  let operationalEvent: Record<string, unknown> | null = null;
  const service = new AssetsService(
    {
      getStore: () => ({
        tenant_id: 'tenant-a',
        user_id: 'user-1',
        role: 'staff',
        permissions: ['assets:*'],
      }),
    } as never,
    {
      createRecord: async (input: Record<string, unknown>) => ({ id: 'asset-fault-1', title: input.title }),
      appendAuditLog: async () => undefined,
    } as never,
    {
      recordSchoolOperation: async (input: Record<string, unknown>) => {
        operationalEvent = input;
        throw new Error('outbox unavailable');
      },
    } as never,
  );

  const result = await service.createRecord({ title: 'Faulty projector', category: 'fault' });
  assert.ok(operationalEvent);
  const notification = (operationalEvent as { notifications: Array<Record<string, unknown>> }).notifications[0];
  assert.deepEqual(notification.audienceRoles, ['ict_manager', 'admin']);
  assert.equal(result.communication.status, 'degraded');
  assert.match(result.communication.message ?? '', /saved.*alert/i);
});
