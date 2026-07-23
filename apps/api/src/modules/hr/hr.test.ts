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

test('HR providers expose concrete Nest dependency metadata', () => {
  assert.deepEqual(Reflect.getMetadata('design:paramtypes', HrSchemaService), [PrismaService]);
  assert.deepEqual(Reflect.getMetadata('design:paramtypes', HrService), [
    RequestContextService,
    HrRepository,
    EventPublisherService,
    AgpExecutionService,
  ]);
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
  assert.match(schemaSql, /INSERT INTO staff_profiles[\s\S]+FROM tenant_memberships membership/);
  assert.match(schemaSql, /JOIN users user_account[\s\S]+membership\.user_id/);
  assert.match(schemaSql, /JOIN roles role[\s\S]+role\.tenant_id = membership\.tenant_id/);
  assert.match(schemaSql, /role\.code = ANY \(ARRAY\[[\s\S]+'teacher'[\s\S]+'admissions_officer'/);
  assert.match(schemaSql, /ON CONFLICT \(tenant_id, user_id\)[\s\S]+DO UPDATE SET/);
  assert.doesNotMatch(schemaSql, /role\.code = ANY \(ARRAY\[[^\]]*'(?:parent|student)'/);
  assert.match(schemaSql, /ALTER TABLE staff_profiles FORCE ROW LEVEL SECURITY/);
});

test('HrSchemaService reconciles accepted memberships into the shared staff directory', async () => {
  let reconciliationSql = '';
  const service = new HrSchemaService({
    query: async (sql: string) => {
      reconciliationSql = sql;
      return {
        rows: [
          { tenant_id: 'school-a', user_id: 'user-a' },
          { tenant_id: 'school-a', user_id: 'user-b' },
        ],
        rowCount: 2,
      };
    },
  } as never);

  await service.onApplicationBootstrap();

  assert.match(reconciliationSql, /INSERT INTO staff_profiles/);
  assert.match(reconciliationSql, /FROM tenant_memberships membership/);
  assert.match(reconciliationSql, /membership\.status = 'active'/);
  assert.match(reconciliationSql, /user_account\.status = 'active'/);
  assert.match(reconciliationSql, /ON CONFLICT \(tenant_id, user_id\)/);
  assert.doesNotMatch(
    reconciliationSql,
    /role\.code = ANY \(ARRAY\[[^\]]*'(?:parent|student)'/,
  );
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
