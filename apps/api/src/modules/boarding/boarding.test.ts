import assert from 'node:assert/strict';
import test from 'node:test';
import 'reflect-metadata';

import { PERMISSIONS_KEY } from '../../auth/auth.constants';
import { MODULE_ACCESS_KEY } from '../module-access/module-access.decorator';
import { BoardingController } from './boarding.controller';
import { BoardingSchemaService } from './boarding-schema.service';
import { BoardingService } from './boarding.service';
import { BoardingRepository } from './repositories/boarding.repository';

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

test('BoardingController lists roll calls from tenant-scoped boarding attendance records', async () => {
  const calls: Array<Record<string, unknown>> = [];
  const controller = new BoardingController(
    {
      boardingAttendance: {
        findMany: async (query: any) => {
          calls.push({ method: 'rollCalls', query });
          return [{
            id: 'roll-1',
            status: 'present',
            className: 'Class A',
            dormName: 'Dorm A',
            bedLabel: 'Bed 1',
            parentSmsSent: true,
            createdAt: new Date('2026-05-21T18:30:00.000Z'),
            student: { firstName: 'Learner', lastName: 'One', className: 'Class A' },
          }];
        },
      },
    } as never,
    {} as never,
  );
  (controller as any).requestContext = { requireStore: () => ({ tenant_id: 'tenant-a' }) };

  const rollCalls = await controller.getRollCalls();

  assert.deepEqual(calls[0]?.query, { where: { schoolId: 'tenant-a' }, include: { student: true } });
  assert.deepEqual(rollCalls, [{
    id: 'roll-1',
    student: 'Learner One',
    className: 'Class A',
    dorm: 'Dorm A',
    bed: 'Bed 1',
    status: 'Present',
    parentSmsSent: true,
    lastMarked: '2026-05-21T18:30:00.000Z',
  }]);
});

test('BoardingController does not hide boarding database failures as empty lists', async () => {
  const controller = new BoardingController(
    {
      boardingAttendance: {
        findMany: async () => {
          throw new Error('boarding database unavailable');
        },
      },
    } as never,
    {} as never,
  );
  (controller as any).requestContext = { requireStore: () => ({ tenant_id: 'tenant-a' }) };

  await assert.rejects(() => controller.getRollCalls(), /boarding database unavailable/);
});

test('BoardingService creates auditable boarding records', async () => {
  const calls: Array<Record<string, unknown>> = [];
  const service = new BoardingService(
    {
      getStore: () => ({ tenant_id: 'tenant-a', user_id: 'user-1', permissions: ['boarding:*'] }),
      requireStore: () => ({ tenant_id: 'tenant-a', user_id: 'user-1', permissions: ['boarding:*'] }),
    } as never,
    {
      createRecord: async (input: Record<string, unknown>) => { calls.push({ method: 'createRecord', ...input }); return { id: 'boarding-1', title: input.title }; },
      updateStatus: async (input: Record<string, unknown>) => { calls.push({ method: 'updateStatus', ...input }); return { id: input.record_id, status: input.status }; },
      appendAuditLog: async (input: Record<string, unknown>) => { calls.push({ method: 'appendAuditLog', ...input }); },
      getDashboard: async (tenantId: string) => { calls.push({ method: 'getDashboard', tenant_id: tenantId }); return { total_records: 1, open_records: 1, action_due: 0, critical_records: 0, records: [], activity: [] }; },
      getOperationalMetrics: async (tenantId: string) => {
        calls.push({ method: 'getOperationalMetrics', tenant_id: tenantId });
        return { total_boarders: 40, open_incidents: 2, approved_leave: 3 };
      },
    } as never,
  );

  await service.createRecord({ title: 'Dormitory roll call', category: 'roll_call', owner_name: 'House parent' });
  await service.updateStatus('boarding-1', { status: 'completed' });
  const dashboard = await service.getDashboard();

  assert.equal(dashboard.total_records, 1);
  assert.equal(dashboard.total_boarders, 40);
  assert.equal(dashboard.open_incidents, 2);
  assert.equal(dashboard.approved_leave, 3);
  assert.deepEqual(calls.map((call) => call.method), [
    'createRecord',
    'appendAuditLog',
    'updateStatus',
    'appendAuditLog',
    'getDashboard',
    'getOperationalMetrics',
  ]);
});

test('BoardingRepository loads operational metrics inside the requested tenant transaction', async () => {
  const calls: Array<Record<string, unknown>> = [];
  const repository = new BoardingRepository({
    executeWithTenant: async (
      tenantId: string,
      userId: string | null,
      callback: (tx: { $queryRawUnsafe: (sql: string, ...params: unknown[]) => Promise<unknown[]> }) => Promise<unknown>,
    ) => {
      calls.push({ tenantId, userId });
      return callback({
        $queryRawUnsafe: async (sql: string, ...params: unknown[]) => {
          calls.push({ sql, params });
          return [{ total_boarders: 40, open_incidents: 2, approved_leave: 3 }];
        },
      });
    },
  } as never);

  const metrics = await repository.getOperationalMetrics('tenant-a');

  assert.deepEqual(calls[0], { tenantId: 'tenant-a', userId: null });
  assert.match(String(calls[1]?.sql), /FROM boarding_students/);
  assert.match(String(calls[1]?.sql), /FROM boarding_incidents/);
  assert.match(String(calls[1]?.sql), /category = 'leave' AND status = 'approved'/);
  assert.deepEqual(calls[1]?.params, ['tenant-a']);
  assert.deepEqual(metrics, { total_boarders: 40, open_incidents: 2, approved_leave: 3 });
});

test('BoardingService exposes metric query failures instead of silently dropping dashboard fields', async () => {
  const service = new BoardingService(
    {
      getStore: () => ({ tenant_id: 'tenant-a', user_id: 'user-1', permissions: ['boarding:read'] }),
      requireStore: () => ({ tenant_id: 'tenant-a', user_id: 'user-1', permissions: ['boarding:read'] }),
    } as never,
    {
      getDashboard: async () => ({ total_records: 1, records: [] }),
      getOperationalMetrics: async () => {
        throw new Error('boarding metrics unavailable');
      },
    } as never,
  );

  await assert.rejects(() => service.getDashboard(), /boarding metrics unavailable/);
});
