import assert from 'node:assert/strict';
import test from 'node:test';

import { AttendanceSyncConflictResolverService } from './conflict-resolvers/attendance-sync-conflict-resolver.service';
import { FinanceSyncConflictResolverService } from './conflict-resolvers/finance-sync-conflict-resolver.service';
import { SYNC_SUPPORTED_ENTITIES } from './sync.constants';
import { SyncService } from './sync.service';
import { RequestContextService } from '../../common/request-context/request-context.service';
import { AttendanceRecordsRepository } from './repositories/attendance-records.repository';
import { SyncOperationLogsRepository } from './repositories/sync-operation-logs.repository';

test('attendance and finance are active offline sync entities', () => {
  assert.deepEqual([...SYNC_SUPPORTED_ENTITIES], ['attendance', 'finance']);
});

test('FinanceSyncConflictResolverService rejects client finance mutations', async () => {
  const resolver = new FinanceSyncConflictResolverService();
  const result = await resolver.applyOperation({
    op_id: '00000000-0000-0000-0000-000000000401',
    entity: 'finance',
    version: 1,
    payload: {
      action: 'posted',
      transaction_id: '00000000-0000-0000-0000-000000000501',
      reference: 'TX-1',
      description: 'Ledger tx',
      total_amount_minor: '10000',
      currency_code: 'KES',
      entry_count: 2,
      posted_at: '2026-04-26T08:00:00.000Z',
    },
  });

  assert.equal(result.status, 'rejected');
  assert.equal(result.conflict_policy, 'server-authoritative');
});

test('SyncService pull returns ordered finance operations', async () => {
  const requestContext = new RequestContextService();
  const service = new SyncService(
    requestContext,
    {
      withRequestTransaction: async <T>(callback: () => Promise<T>): Promise<T> => callback(),
    } as never,
    {
      upsertDevice: async () => ({
        id: 'device-row',
        tenant_id: 'tenant-a',
        device_id: 'device-1',
        platform: 'android',
        app_version: '1.0.0',
        metadata: {},
        last_seen_at: new Date(),
        last_push_at: null,
        last_pull_at: null,
        created_at: new Date(),
        updated_at: new Date(),
      }),
      markPush: async (): Promise<void> => undefined,
      markPull: async (): Promise<void> => undefined,
    } as never,
    {
      upsertCursor: async (): Promise<void> => undefined,
      getCursorMap: async () => new Map([['finance', '2']]),
    } as never,
    {
      findByOpId: async (): Promise<null> => null,
      fetchByEntitiesAfterCursors: async (
        tenantId: string,
        entities: string[],
        cursorMap: Map<string, string>,
      ) => {
        assert.equal(tenantId, 'tenant-a');
        assert.deepEqual(entities, ['finance']);
        assert.equal(cursorMap.get('finance'), '2');

        return [
        {
          op_id: '00000000-0000-0000-0000-000000000602',
          tenant_id: 'tenant-a',
          device_id: 'server',
          entity: 'finance',
          payload: { action: 'posted' },
          version: '5',
          created_at: new Date('2026-04-26T09:00:00.000Z').toISOString(),
          updated_at: new Date('2026-04-26T09:00:00.000Z').toISOString(),
        },
        ];
      },
      getLatestVersionByEntities: async () => new Map(),
    } as never,
    {
      getLatestCursors: async () => [],
      ensureSupportedEntity: (): void => undefined,
    } as never,
    {} as AttendanceSyncConflictResolverService,
    {} as never,
    {} as never,
  );

  const response = await requestContext.run(
    {
      request_id: 'req-1',
      tenant_id: 'tenant-a',
      user_id: '00000000-0000-0000-0000-000000000001',
      role: 'owner',
      session_id: 'session-1',
      permissions: ['*:*'],
      is_authenticated: true,
      client_ip: '127.0.0.1',
      user_agent: 'test-suite',
      method: 'POST',
      path: '/sync/pull',
      started_at: '2026-04-26T00:00:00.000Z',
    },
    () =>
      service.pull({
        device_id: 'device-1',
        platform: 'android',
        app_version: '1.0.0',
        metadata: {},
        entities: ['finance'],
        limit: 10,
      }),
  );

  assert.equal(response.operations.length, 1);
  assert.deepEqual(
    response.operations.map((operation) => operation.version),
    ['5'],
  );
});

test('SyncService retains the school admin conflict audience and reports degraded alert delivery', async () => {
  const requestContext = new RequestContextService();
  let operationalEvent: Record<string, unknown> | null = null;
  const service = new SyncService(
    requestContext,
    { withRequestTransaction: async <T>(callback: () => Promise<T>): Promise<T> => callback() } as never,
    {
      upsertDevice: async () => ({
        id: 'device-row',
        tenant_id: 'tenant-a',
        device_id: 'device-conflict',
        platform: 'android',
        app_version: '1.0.0',
        metadata: {},
        last_seen_at: new Date(),
        last_push_at: null,
        last_pull_at: null,
        created_at: new Date(),
        updated_at: new Date(),
      }),
      markPush: async () => undefined,
    } as never,
    { upsertCursor: async () => undefined } as never,
    { findByOpId: async () => null } as never,
    {
      ensureSupportedEntity: () => undefined,
      getLatestCursors: async () => [],
    } as never,
    {} as AttendanceSyncConflictResolverService,
    new FinanceSyncConflictResolverService(),
    {} as never,
    undefined,
    {
      recordSchoolOperation: async (input: Record<string, unknown>) => {
        operationalEvent = input;
        throw new Error('sync alert outbox unavailable');
      },
    } as never,
  );

  const response = await requestContext.run(
      {
        request_id: 'req-sync-conflict',
        tenant_id: 'tenant-a',
        user_id: '00000000-0000-4000-8000-000000000001',
        role: 'admin',
        session_id: 'session-sync-conflict',
        permissions: ['events:write'],
        is_authenticated: true,
        client_ip: '127.0.0.1',
        user_agent: 'test-suite',
        method: 'POST',
        path: '/sync/push',
        started_at: '2026-08-15T08:00:00.000Z',
      },
      () => service.push({
        device_id: 'device-conflict',
        platform: 'android',
        app_version: '1.0.0',
        operations: [{
          op_id: '00000000-0000-4000-8000-000000000401',
          entity: 'finance',
          action: 'posted',
          createdAtLocal: '2026-08-15T08:00:00.000Z',
          version: 1,
          payload: {
            action: 'posted',
            transaction_id: '00000000-0000-4000-8000-000000000501',
            reference: 'TX-1',
            description: 'Ledger tx',
            total_amount_minor: '10000',
            currency_code: 'KES',
            entry_count: 2,
            posted_at: '2026-08-15T08:00:00.000Z',
          },
        }],
      }),
  );

  assert.ok(operationalEvent);
  const notification = (operationalEvent as { notifications: Array<Record<string, unknown>> }).notifications[0];
  assert.deepEqual(notification.audienceRoles, ['admin']);
  assert.equal(response.communication?.status, 'degraded');
  assert.match(response.communication?.message ?? '', /recorded.*alert/i);
});

test('SyncOperationLogsRepository caps offline pull scans per tenant', async () => {
  const calls: Array<{ sql: string; params: unknown[] }> = [];
  const repository = new SyncOperationLogsRepository({
        executeWithTenant: async function(tenantId: string, ctx: any, cb: any) {
      return cb({
        $queryRawUnsafe: async (sql: string, ...params: any[]) => {
          const res = await (this as any).query(sql, params);
          return res.rows || res;
        }
      });
    },
query: async (sql: string, params: unknown[]) => {
      calls.push({ sql, params });
      return { rows: [] };
    },
  } as never);

  await repository.fetchByEntitySinceVersion('tenant-a', 'attendance', '0', 5000);
  await repository.fetchByEntitiesAfterCursors(
    'tenant-a',
    ['attendance', 'finance'],
    new Map([
      ['attendance', '0'],
      ['finance', '0'],
    ]),
    5000,
  );

  assert.match(calls[0]!.sql, /LIMIT \$4::integer/);
  assert.equal(calls[0]!.params[3], 100);
  assert.match(calls[1]!.sql, /LIMIT \$4::integer/);
  assert.equal(calls[1]!.params[3], 800);
});

test('AttendanceRecordsRepository bounds student attendance history reads', async () => {
  const calls: Array<{ sql: string; params: unknown[] }> = [];
  const repository = new AttendanceRecordsRepository({
        executeWithTenant: async function(tenantId: string, ctx: any, cb: any) {
      return cb({
        $queryRawUnsafe: async (sql: string, ...params: any[]) => {
          const res = await (this as any).query(sql, params);
          return res.rows || res;
        }
      });
    },
query: async (sql: string, params: unknown[]) => {
      calls.push({ sql, params });
      return { rows: [] };
    },
  } as never);

  await repository.listByStudent('tenant-a', '00000000-0000-0000-0000-000000000301', {
    limit: 5000,
    offset: -10,
  });

  assert.match(calls[0]!.sql, /LIMIT \$5::integer\s+OFFSET \$6::integer/);
  assert.equal(calls[0]!.params[4], 50);
  assert.equal(calls[0]!.params[5], 0);
});
