// @ts-nocheck
import assert from 'node:assert/strict';
import test from 'node:test';
import 'reflect-metadata';
import { MODULE_METADATA } from '@nestjs/common/constants';

import { BillingAccessService } from '../billing/billing-access.service';
import { RequestContextService } from '../../common/request-context/request-context.service';
import { AttendanceService } from './attendance.service';
import { StudentsModule } from './students.module';
import { StudentsRepository } from './repositories/students.repository';
import { StudentsSchemaService } from './students-schema.service';
import { StudentsService } from './students.service';

test('StudentsModule exposes student lifecycle and attendance providers', () => {
  const providers =
    (Reflect.getMetadata(MODULE_METADATA.PROVIDERS, StudentsModule) as Array<{ name?: string }> | undefined) ?? [];

  assert.equal(
    providers.some((provider) => provider?.name === 'AttendanceService'),
    true,
  );
});

test('AttendanceService is available for offline student attendance sync', () => {
  assert.equal(typeof AttendanceService, 'function');
});

test('StudentsSchemaService adds a full-text index for active student directory search', async () => {
  let schemaSql = '';
  const service = new StudentsSchemaService(
    {
      runSchemaBootstrap: async (sql: string) => {
        schemaSql += sql;
      },
    } as never,
    {
      onModuleInit: async () => undefined,
    } as never,
  );

  await service.onModuleInit();

  assert.match(schemaSql, /CREATE INDEX IF NOT EXISTS ix_students_search_vector/);
  assert.match(schemaSql, /ON students\s+USING GIN/);
  assert.match(schemaSql, /to_tsvector\(\s*'simple'/);
  assert.match(schemaSql, /admission_number/);
  assert.match(schemaSql, /primary_guardian_phone/);
  assert.match(schemaSql, /ALTER TABLE students ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active'/);
  assert.match(schemaSql, /ALTER TABLE student_guardians ADD COLUMN IF NOT EXISTS email text/);
  assert.match(schemaSql, /ALTER TABLE student_guardians ADD COLUMN IF NOT EXISTS invitation_id uuid/);
  assert.match(schemaSql, /CREATE TABLE IF NOT EXISTS attendance_records/);
  assert.match(schemaSql, /source_device_id/);
  assert.match(schemaSql, /sync_version/);
});

test('StudentsService creates a student and publishes student.created', async () => {
  const requestContext = new RequestContextService();
  let publishedPayload: Record<string, unknown> | null = null;

  const service = new StudentsService(
    requestContext,
    {
      withRequestTransaction: async <T>(callback: () => Promise<T>): Promise<T> => callback(),
    } as never,
    {
      createStudent: async () => ({
        id: '00000000-0000-0000-0000-000000000101',
        tenant_id: 'tenant-a',
        admission_number: 'ADM-001',
        first_name: 'Amina',
        last_name: 'Otieno',
        middle_name: null,
        status: 'active',
        date_of_birth: '2014-01-10',
        gender: 'female',
        primary_guardian_name: 'Grace Otieno',
        primary_guardian_phone: '254700000001',
        metadata: { stream: 'red' },
        created_by_user_id: '00000000-0000-0000-0000-000000000001',
        created_at: new Date(),
        updated_at: new Date(),
      }),
      countActiveStudents: async () => 150,
    } as never,
    { resolveForTenant: async () => null } as never,
    {} as never,
    { publishStudentCreated: async (payload: any) => { publishedPayload = payload; } } as never,
    { execute: async (req: any) => req.handler() } as never,
    { recordUsage: async () => {} } as never,
  );

  const response = await requestContext.run(
    {
      request_id: 'req-student-1',
      tenant_id: 'tenant-a',
      user_id: '00000000-0000-0000-0000-000000000001',
      role: 'owner',
      session_id: 'session-1',
      permissions: ['*:*'],
      is_authenticated: true,
      client_ip: '127.0.0.1',
      user_agent: 'test-suite',
      method: 'POST',
      path: '/students',
      started_at: '2026-04-26T00:00:00.000Z',
    },
    () =>
      service.createStudent({
        admission_number: 'ADM-001',
        first_name: 'Amina',
        last_name: 'Otieno',
        middle_name: undefined,
        date_of_birth: '2014-01-10',
        gender: 'female',
        status: 'active',
        primary_guardian_name: 'Grace Otieno',
        primary_guardian_phone: '254700000001',
        metadata: { stream: 'red' },
      }),
  );

  assert.equal(response.admission_number, 'ADM-001');
  assert.ok(publishedPayload);
  const studentCreatedPayload = publishedPayload as {
    student_id: string;
    tenant_id: string;
  };
  assert.equal(studentCreatedPayload.student_id, '00000000-0000-0000-0000-000000000101');
  assert.equal(studentCreatedPayload.tenant_id, 'tenant-a');
});

test('StudentsRepository uses keyset cursor pagination for the high-volume student directory', async () => {
  const queries: Array<{ text: string; values: unknown[] }> = [];
  const repository = new StudentsRepository(
    {
      executeWithTenant: async (tenantId: string, userId: string | null, cb: any) => {
        return cb({
          $queryRawUnsafe: async (sql: string, ...params: any[]) => {
            queries.push({ text: sql, values: params });
            return [
              {
                id: '00000000-0000-0000-0000-000000000202',
                schoolId: 'tenant-a',
                admissionNumber: 'ADM-202',
                firstName: 'Amina',
                lastName: 'Wanjiku',
                middleName: null,
                studentStatus: 'ACTIVE',
                dateOfBirth: new Date('2013-02-01'),
                gender: 'female',
                primaryGuardianName: null,
                primaryGuardianPhone: null,
                metadata: {},
                createdByUserId: null,
                createdAt: new Date('2026-05-20T06:00:00.000Z'),
                updatedAt: new Date('2026-05-20T06:00:00.000Z'),
              },
            ];
          },
        });
      },
    } as never,
    {
      decryptNullable: (value: string | null) => value,
    } as never,
  );
  const cursor = Buffer.from(
    JSON.stringify({
      created_at: '2026-05-20T07:00:00.000Z',
      id: '00000000-0000-0000-0000-000000000201',
    }),
  ).toString('base64url');

  await repository.listStudents('tenant-a', {
    status: 'active',
    limit: 50,
    cursor,
  });

  assert.equal(queries.length, 1);
  assert.match(queries[0]!.text, /WHERE tenant_id = \$1 AND school_id = \$1/);
  assert.match(queries[0]!.text, /student_status::text = \$2/);
  assert.match(queries[0]!.text, /\(created_at, id\) < \(\$3::timestamptz, \$4::uuid\)/);
  assert.match(queries[0]!.text, /ORDER BY created_at DESC, id DESC/);
  assert.match(queries[0]!.text, /LIMIT \$5::integer/);
  assert.doesNotMatch(queries[0]!.text, /OFFSET/i);
  assert.deepEqual(queries[0]!.values, [
    'tenant-a',
    'ACTIVE',
    '2026-05-20T07:00:00.000Z',
    '00000000-0000-0000-0000-000000000201',
    50,
  ]);
});

