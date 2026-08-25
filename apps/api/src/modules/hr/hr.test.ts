import assert from 'node:assert/strict';
import test from 'node:test';

import { PATH_METADATA } from '@nestjs/common/constants';
import 'reflect-metadata';

import { PERMISSIONS_KEY } from '../../auth/auth.constants';
import { RequestContextService } from '../../common/request-context/request-context.service';
import { AgpExecutionService } from '../../common/platform-governance/agp-execution.service';
import { PrismaService } from '../../database/prisma.service';
import { EventPublisherService } from '../events/event-publisher.service';
import { HrController } from './hr.controller';
import { HrSchemaService } from './hr-schema.service';
import { HrService } from './hr.service';
import { HrRepository } from './repositories/hr.repository';
import { StaffDashboardService } from './staff-dashboard.service';

test('HR providers expose concrete Nest dependency metadata', () => {
  assert.deepEqual(Reflect.getMetadata('design:paramtypes', HrSchemaService), [PrismaService]);
  assert.deepEqual(Reflect.getMetadata('design:paramtypes', HrService), [
    RequestContextService,
    HrRepository,
    EventPublisherService,
    AgpExecutionService,
  ]);
  assert.deepEqual(Reflect.getMetadata('design:paramtypes', StaffDashboardService), [
    RequestContextService,
    HrRepository,
  ]);
});

test('StaffDashboardService resolves the dashboard for the exact request tenant and user', async () => {
  const calls: unknown[] = [];
  const service = new StaffDashboardService(
    {
      requireStore: () => ({ tenant_id: 'school-a', user_id: 'user-a', role: 'teacher' }),
      getStore: () => ({ tenant_id: 'school-a', user_id: 'user-a', role: 'teacher' }),
    } as never,
    {
      getStaffDashboard: async (...args: unknown[]) => {
        calls.push(args);
        return { available: true, profile: { id: 'staff-a' } };
      },
    } as never,
  );

  const result = await service.getStaffDashboard();

  assert.deepEqual(calls, [['school-a', 'user-a', 'teacher']]);
  assert.deepEqual(result, { available: true, profile: { id: 'staff-a' } });
});

test('HrRepository builds staff dashboard metrics from current-school canonical records', async () => {
  const transactionCalls: unknown[] = [];
  const queries: Array<{ sql: string; params: unknown[] }> = [];
  const repository = new HrRepository({
    executeWithTenant: async (
      tenantId: string,
      userId: string,
      callback: (tx: { $queryRawUnsafe: (sql: string, ...params: unknown[]) => Promise<unknown[]> }) => Promise<unknown>,
    ) => {
      transactionCalls.push([tenantId, userId]);
      return callback({
        $queryRawUnsafe: async (sql: string, ...params: unknown[]) => {
          queries.push({ sql, params });

          if (/FROM staff_profiles profile[\s\S]+profile\.user_id::text = \$2/.test(sql)) {
            return [{
              id: 'staff-a',
              user_id: 'user-a',
              display_name: 'Teacher A',
              department: 'Science',
              job_title: 'Teacher',
              status: 'active',
            }];
          }
          if (/to_regclass\('public\.timetable_slots'\)/.test(sql)) {
            return [{ timetable: true, notifications: true, announcements: true }];
          }
          if (/FROM timetable_slots slot/.test(sql)) {
            return [{
              id: 'slot-a',
              class_name: 'Grade 8 Blue',
              subject_name: 'Biology',
              day_of_week: 2,
              starts_at: '08:00:00',
              ends_at: '08:40:00',
              room: 'Lab 1',
              total_count: 4,
            }];
          }
          if (/FROM notifications notification/.test(sql)) {
            return [{ count: 7 }];
          }
          if (/FROM staff_leave_balances balance/.test(sql)) {
            return [{ balance: '11.5' }];
          }
          if (/FROM announcements announcement/.test(sql)) {
            return [{ id: 'announcement-a', title: 'Staff briefing' }];
          }
          if (/FROM staff_audit_logs audit/.test(sql)) {
            return [{ id: 'audit-a', action: 'staff.leave.requested' }];
          }
          if (/FROM staff_leave_requests request/.test(sql)) {
            return [{ id: 'leave-a', staff_name: 'Teacher A', days: 2 }];
          }
          throw new Error(`Unexpected staff dashboard query: ${sql}`);
        },
      });
    },
  } as never);

  const result = await repository.getStaffDashboard('school-a', 'user-a', 'teacher');

  assert.deepEqual(transactionCalls, [['school-a', 'user-a']]);
  assert.equal(result.available, true);
  assert.equal(result.profile?.display_name, 'Teacher A');
  assert.deepEqual(result.metrics, {
    upcomingClasses: 4,
    pendingTasks: 0,
    unreadMessages: 7,
    leaveBalance: 11.5,
  });
  assert.deepEqual(result.schedule, [{
    id: 'slot-a',
    class_name: 'Grade 8 Blue',
    subject_name: 'Biology',
    day_of_week: 2,
    starts_at: '08:00:00',
    ends_at: '08:40:00',
    room: 'Lab 1',
  }]);
  assert.deepEqual(result.announcements, [{ id: 'announcement-a', title: 'Staff briefing' }]);
  assert.deepEqual(result.leave_requests, [{ id: 'leave-a', staff_name: 'Teacher A', days: 2 }]);
  assert.equal(result.dataAvailability.pendingTasks, false);
  assert.equal(result.dataAvailability.payrollExceptions, false);

  for (const query of queries.filter(({ params }) => params.length > 0)) {
    assert.equal(query.params[0], 'school-a');
    assert.match(query.sql, /tenant_id = \$1/);
  }
  assert.ok(queries.some(({ sql, params }) =>
    /teacher_id::text = \$2/.test(sql) && params[1] === 'user-a'));
  const notificationQuery = queries.find(({ sql }) => /FROM notifications notification/.test(sql));
  assert.ok(notificationQuery);
  assert.deepEqual(notificationQuery.params, ['school-a', 'user-a', 'teacher']);
  assert.match(notificationQuery.sql, /recipient_user_id::text/);
  assert.match(notificationQuery.sql, /recipient_user_id IS NULL|\) IS NULL/);
  assert.match(notificationQuery.sql, /metadata->'target_roles'/);
  assert.match(notificationQuery.sql, /metadata->'audienceRoles'/);
});

test('HrRepository returns truthful zero availability without querying other staff when no profile is linked', async () => {
  const queries: string[] = [];
  const repository = new HrRepository({
    executeWithTenant: async (
      tenantId: string,
      userId: string,
      callback: (tx: { $queryRawUnsafe: (sql: string, ...params: unknown[]) => Promise<unknown[]> }) => Promise<unknown>,
    ) => {
      assert.equal(tenantId, 'school-a');
      assert.equal(userId, 'user-a');
      return callback({
        $queryRawUnsafe: async (sql: string, ...params: unknown[]) => {
          queries.push(sql);
          assert.deepEqual(params, ['school-a', 'user-a']);
          return [];
        },
      });
    },
  } as never);

  const result = await repository.getStaffDashboard('school-a', 'user-a', 'teacher');

  assert.equal(queries.length, 1);
  assert.equal(result.available, false);
  assert.equal(result.profile, null);
  assert.deepEqual(result.metrics, {
    upcomingClasses: 0,
    pendingTasks: 0,
    unreadMessages: 0,
    leaveBalance: 0,
  });
  assert.deepEqual(result.schedule, []);
  assert.deepEqual(result.announcements, []);
  assert.equal(result.dataAvailability.profile, false);
});

test('HrSchemaService creates staff management tables with forced RLS', async () => {
  let schemaSql = '';
  const service = new HrSchemaService({
    runSchemaBootstrap: async (sql: string) => {
      schemaSql += sql;
    },
  } as never);

  await service.onModuleInit();

  assert.match(schemaSql, /CREATE TABLE IF NOT EXISTS staff_profiles/);
  assert.match(schemaSql, /CREATE TABLE IF NOT EXISTS staff_contracts/);
  assert.match(schemaSql, /CREATE TABLE IF NOT EXISTS staff_leave_requests/);
  assert.match(schemaSql, /status text NOT NULL DEFAULT 'invited'/);
  assert.match(schemaSql, /CREATE UNIQUE INDEX IF NOT EXISTS ux_staff_departments_tenant_lower_name/);
  assert.match(schemaSql, /CREATE EXTENSION IF NOT EXISTS pg_trgm/);
  assert.match(schemaSql, /CREATE UNIQUE INDEX IF NOT EXISTS ux_staff_profiles_tenant_user/);
  assert.match(schemaSql, /CREATE INDEX IF NOT EXISTS ix_staff_profiles_tenant_status_display_name/);
  assert.match(schemaSql, /CREATE INDEX IF NOT EXISTS ix_staff_profiles_display_name_trgm/);
  assert.doesNotMatch(schemaSql, /UNIQUE \(tenant_id, lower\(name\)\)/);
  assert.doesNotMatch(schemaSql, /INSERT INTO staff_profiles[\s\S]+FROM tenant_memberships membership/);
  assert.match(schemaSql, /ALTER TABLE staff_profiles FORCE ROW LEVEL SECURITY/);
});

test('HrSchemaService reconciles staff memberships one tenant-scoped transaction at a time', async () => {
  const executeScopes: Array<{ tenantId: string; userId: string | null }> = [];
  const sessionStatements: Array<{ tenantId: string; sql: string }> = [];
  const reconciliationQueries: Array<{ tenantId: string; sql: string; params: unknown[] }> = [];
  const service = new HrSchemaService({
    executeWithTenant: async (
      tenantId: string,
      userId: string | null,
      callback: (tx: {
        $executeRawUnsafe: (sql: string) => Promise<number>;
        $queryRawUnsafe: (sql: string, ...params: unknown[]) => Promise<unknown[]>;
      }) => Promise<unknown>,
    ) => {
      executeScopes.push({ tenantId, userId });
      const tx = {
        $executeRawUnsafe: async (sql: string) => {
          sessionStatements.push({ tenantId, sql });
          return 0;
        },
        $queryRawUnsafe: async (sql: string, ...params: unknown[]) => {
          if (tenantId === 'global') {
            assert.match(sql, /FROM tenants tenant/);
            assert.match(sql, /lower\(btrim\(tenant\.tenant_id\)\) <> 'global'/);
            return [
              { tenant_id: 'school-a' },
              { tenant_id: 'school-a' },
              { tenant_id: 'global' },
              { tenant_id: ' ' },
              { tenant_id: 'school-b' },
            ];
          }

          reconciliationQueries.push({ tenantId, sql, params });
          return [{ tenant_id: tenantId, user_id: `user-${tenantId}` }];
        },
      };

      return callback(tx);
    },
  } as never);

  await service.onApplicationBootstrap();

  assert.deepEqual(executeScopes, [
    { tenantId: 'global', userId: null },
    { tenantId: 'school-a', userId: null },
    { tenantId: 'school-b', userId: null },
  ]);
  assert.ok(sessionStatements.some(({ tenantId, sql }) =>
    tenantId === 'global' && sql === 'SET LOCAL row_security = on'));
  assert.ok(sessionStatements.some(({ tenantId, sql }) =>
    tenantId === 'global' && sql === `SET LOCAL app.role = 'platform_owner'`));
  assert.equal(reconciliationQueries.length, 2);

  for (const { tenantId, sql, params } of reconciliationQueries) {
    assert.ok(sessionStatements.some((statement) =>
      statement.tenantId === tenantId && statement.sql === 'SET LOCAL row_security = on'));
    assert.ok(sessionStatements.some((statement) =>
      statement.tenantId === tenantId
      && statement.sql === `SET LOCAL app.role = 'platform_owner'`));
    assert.deepEqual(params, [tenantId]);
    assert.match(sql, /INSERT INTO staff_profiles/);
    assert.match(sql, /SELECT\s+\$1::text,/);
    assert.match(sql, /FROM tenant_memberships membership/);
    assert.match(sql, /membership\.tenant_id = \$1/);
    assert.match(sql, /membership\.status = 'active'/);
    assert.match(sql, /user_account\.status = 'active'/);
    assert.match(sql, /ON CONFLICT \(tenant_id, user_id\)/);
    assert.doesNotMatch(sql, /role\.code = ANY \(ARRAY\[[^\]]*'(?:parent|student)'/);
  }
});

test('HrService prevents overlapping active contracts for the same staff member', async () => {
  const service = new HrService(
    { getStore: () => ({ tenant_id: 'tenant-a', user_id: 'user-1' }) } as never,
    {
      findOverlappingActiveContract: async () => ({ id: 'contract-existing' }),
      approveContract: async () => {
        throw new Error('overlapping contract must not be approved');
      },
    } as never,
  );

  await assert.rejects(
    () =>
      service.approveContract({
        staff_profile_id: 'staff-1',
        role_title: 'Teacher',
        employment_type: 'full_time',
        workload: '40 lessons',
        starts_on: '2026-05-01',
        approval_state: 'approved',
      }),
    /overlapping active contract/,
  );
});

test('HrService requires override reason when approving leave beyond balance', async () => {
  const service = new HrService(
    { getStore: () => ({ tenant_id: 'tenant-a', user_id: 'user-1' }) } as never,
    {
      findLeaveBalance: async () => ({ available_days: 2 }),
      approveLeaveRequest: async () => {
        throw new Error('leave must not be approved without override');
      },
    } as never,
  );

  await assert.rejects(
    () =>
      service.approveLeave({
        staff_profile_id: 'staff-1',
        leave_type: 'annual',
        requested_days: 5,
      }),
    /override reason/,
  );
});

test('HrService records audit logs for staff status changes', async () => {
  const calls: string[] = [];
  const service = new HrService(
    { getStore: () => ({ tenant_id: 'tenant-a', user_id: 'user-1' }) } as never,
    {
      changeStaffStatus: async () => {
        calls.push('status');
        return { id: 'staff-1', status: 'suspended' };
      },
      appendAuditLog: async () => {
        calls.push('audit');
      },
    } as never,
  );

  const result = await service.changeStaffStatus({
    staff_profile_id: 'staff-1',
    status: 'suspended',
    reason: 'Safeguarding review',
  });

  assert.equal(result.status, 'suspended');
  assert.deepEqual(calls, ['status', 'audit']);
});

test('HrController exposes staff directory as a read endpoint', () => {
  const handler = HrController.prototype.listStaffDirectory as unknown as Function;

  assert.equal(typeof handler, 'function');
  assert.equal(Reflect.getMetadata(PATH_METADATA, handler), 'staff');
  assert.deepEqual(Reflect.getMetadata(PERMISSIONS_KEY, handler), ['hr:read']);
});

test('HrService lists staff directory without sensitive identifiers', async () => {
  let capturedInput: Record<string, unknown> | null = null;
  const service = new HrService(
    { getStore: () => ({ tenant_id: 'tenant-a', user_id: 'user-1' }) } as never,
    {
      listStaffDirectory: async (input: Record<string, unknown>) => {
        capturedInput = input;
        return [
          {
            id: 'staff-1',
            full_name: 'Mary Wanjiku',
            status: 'active',
            statutory_identifiers: { kra_pin: 'A123' },
            emergency_contact: { phone: '+254700000000' },
          },
        ];
      },
    } as never,
  );

  const rows = await (service as unknown as {
    listStaffDirectory: (query: Record<string, string | undefined>) => Promise<Array<Record<string, unknown>>>;
  }).listStaffDirectory({
    search: ' Mary ',
    status: 'active',
  });

  assert.deepEqual(capturedInput, {
    tenant_id: 'tenant-a',
    search: 'Mary',
    status: 'active',
    limit: 25,
    offset: 0,
  });
  assert.equal(rows[0]?.full_name, 'Mary Wanjiku');
  assert.equal('statutory_identifiers' in (rows[0] ?? {}), false);
  assert.equal('emergency_contact' in (rows[0] ?? {}), false);
});

test('HrRepository bounds staff directory reads with pagination', async () => {
  const queries: Array<{ text: string; values: unknown[] }> = [];
  const repository = new HrRepository({
    query: async (text: string, values: unknown[]) => {
      queries.push({ text, values });
      return { rows: [] };
    },
  } as never);

  await repository.listStaffDirectory({
    tenant_id: 'tenant-a',
    search: 'Mary',
    status: 'active',
    limit: 999,
    offset: 8,
  } as never);

  const directoryQuery = queries[0]?.text ?? '';
  assert.match(directoryQuery, /WHERE profile\.tenant_id = \$1/);
  assert.doesNotMatch(directoryQuery, /LIMIT 500/);
  assert.match(directoryQuery, /LIMIT \$4::integer/);
  assert.match(directoryQuery, /OFFSET \$5::integer/);
  assert.deepEqual(queries[0]?.values, ['tenant-a', 'Mary', 'active', 50, 8]);
});

test('HrService normalizes staff directory search and pagination before querying', async () => {
  let capturedInput: Record<string, unknown> | null = null;
  const service = new HrService(
    { getStore: () => ({ tenant_id: 'tenant-a', user_id: 'user-1' }) } as never,
    {
      listStaffDirectory: async (input: Record<string, unknown>) => {
        capturedInput = input;
        return [];
      },
    } as never,
  );

  await service.listStaffDirectory({
    search: ' M ',
    status: ' active ',
    limit: '999',
    offset: '-4',
  });

  assert.deepEqual(capturedInput, {
    tenant_id: 'tenant-a',
    search: undefined,
    status: 'active',
    limit: 50,
    offset: 0,
  });
});
