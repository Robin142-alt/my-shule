// @ts-nocheck
import assert from 'node:assert/strict';
import test from 'node:test';
import 'reflect-metadata';
import { MODULE_METADATA } from '@nestjs/common/constants';

import { BillingAccessService } from '../billing/billing-access.service';
import { RequestContextService } from '../../common/request-context/request-context.service';
import { ParentPortalService } from '../../parent-portal/parent-portal.service';
import { AttendanceService } from './attendance.service';
import { StudentPortalService } from './student-portal.service';
import '../academics/academic-tenant-boundary.test';
import { StudentLifecycleService } from './student-lifecycle.service';
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
  assert.match(schemaSql, /CREATE TABLE IF NOT EXISTS students \([\s\S]*id text PRIMARY KEY DEFAULT gen_random_uuid\(\)::text/);
  assert.match(schemaSql, /ON students\s+USING GIN/);
  assert.match(schemaSql, /to_tsvector\(\s*'simple'/);
  assert.match(schemaSql, /admission_number/);
  assert.match(schemaSql, /primary_guardian_phone/);
  assert.match(schemaSql, /ALTER TABLE students ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active'/);
  assert.match(schemaSql, /ALTER TABLE students ALTER COLUMN date_of_birth DROP NOT NULL/);
  assert.match(schemaSql, /ALTER TABLE students ALTER COLUMN date_of_birth DROP DEFAULT/);
  assert.match(schemaSql, /ALTER TABLE student_guardians ADD COLUMN IF NOT EXISTS email text/);
  assert.match(schemaSql, /ALTER TABLE student_guardians ADD COLUMN IF NOT EXISTS invitation_id uuid/);
  assert.match(schemaSql, /ALTER TABLE student_guardians ADD COLUMN IF NOT EXISTS relationship text/);
  assert.match(schemaSql, /CREATE TABLE IF NOT EXISTS parent_guardians/);
  assert.match(schemaSql, /ALTER TABLE student_guardians ADD COLUMN IF NOT EXISTS guardian_id text/);
  assert.match(schemaSql, /ALTER TABLE student_guardians ADD COLUMN IF NOT EXISTS relationship_type "GuardianRelationship"/);
  assert.match(schemaSql, /ALTER TABLE student_guardians ADD COLUMN IF NOT EXISTS is_primary boolean NOT NULL DEFAULT FALSE/);
  assert.match(schemaSql, /students_school_id_fkey/);
  assert.match(schemaSql, /parent_guardians_school_id_fkey/);
  assert.match(schemaSql, /student_guardians_school_id_fkey/);
  assert.match(schemaSql, /ALTER TABLE parent_guardians FORCE ROW LEVEL SECURITY/);
  assert.match(schemaSql, /CREATE POLICY parent_guardians_rls_policy/);
  assert.match(schemaSql, /UPDATE student_guardians[\s\S]*SET relationship/);
  assert.match(schemaSql, /ALTER TABLE student_guardians ALTER COLUMN relationship SET NOT NULL/);
  assert.match(schemaSql, /CREATE TABLE IF NOT EXISTS attendance_records/);
  assert.match(schemaSql, /source_device_id/);
  assert.match(schemaSql, /sync_version/);
  assert.match(schemaSql, /CREATE TABLE IF NOT EXISTS student_portal_access/);
  assert.match(schemaSql, /CREATE TABLE IF NOT EXISTS student_portal_access \([\s\S]*student_id text NOT NULL/);
  assert.match(schemaSql, /ux_student_portal_access_username/);
  assert.match(schemaSql, /ALTER TABLE student_portal_access ENABLE ROW LEVEL SECURITY/);
  assert.match(schemaSql, /ALTER TABLE student_portal_access FORCE ROW LEVEL SECURITY/);
  assert.match(schemaSql, /find_student_auth_subject_for_otp/);
  assert.match(schemaSql, /find_student_auth_subject_for_password/);
  assert.match(schemaSql, /find_linked_parent_auth_subject/);
  assert.match(schemaSql, /find_linked_parent_password_auth_subject/);
  assert.match(schemaSql, /parent_user\.password_changed_at IS NULL/);
  assert.match(schemaSql, /role\.code = 'parent'/);
  assert.match(schemaSql, /lower\(student\.admission_number\)/);
});

test('StudentLifecycleService rejects every cross-tenant class placement reference before mutation', async () => {
  const scenarios = [
    { name: 'class', classId: 'class-b', yearId: 'year-a', levelId: 'level-a', streamId: 'stream-a' },
    { name: 'stream', classId: 'class-a', yearId: 'year-a', levelId: 'level-a', streamId: 'stream-b' },
    { name: 'academic year', classId: 'class-a', yearId: 'year-b', levelId: 'level-a', streamId: 'stream-a' },
    { name: 'academic level', classId: 'class-a', yearId: 'year-a', levelId: 'level-b', streamId: 'stream-a' },
  ];

  for (const scenario of scenarios) {
    const mutations: string[] = [];
    const events: unknown[] = [];
    const tx = {
      student: {
        findFirst: async ({ where }: any) => where.schoolId === 'tenant-a'
          ? { id: 'student-a', schoolId: 'tenant-a', studentStatus: 'ENROLLED' }
          : null,
        update: async () => { mutations.push('student.update'); return {}; },
      },
      class: {
        findFirst: async ({ where }: any) => where.id === 'class-a' && where.schoolId === 'tenant-a'
          ? { id: 'class-a', schoolId: 'tenant-a', academicLevelId: 'level-a' }
          : null,
      },
      stream: {
        findFirst: async ({ where }: any) => where.id === 'stream-a'
          && where.schoolId === 'tenant-a'
          && where.classId === 'class-a'
          ? { id: 'stream-a', schoolId: 'tenant-a', classId: 'class-a' }
          : null,
      },
      academicYear: {
        findFirst: async ({ where }: any) => where.id === 'year-a' && where.schoolId === 'tenant-a'
          ? { id: 'year-a', schoolId: 'tenant-a' }
          : null,
      },
      academicLevel: {
        findFirst: async ({ where }: any) => where.id === 'level-a' && where.schoolId === 'tenant-a'
          ? { id: 'level-a', schoolId: 'tenant-a', isActive: true }
          : null,
      },
      studentClassAssignment: {
        updateMany: async () => { mutations.push('assignment.archive'); },
        create: async () => { mutations.push('assignment.create'); },
      },
      studentAuditLog: {
        create: async () => { mutations.push('audit.create'); },
      },
    };
    const service = new StudentLifecycleService(
      {
        executeWithTenant: async (tenantId: string, userId: string, callback: (client: any) => Promise<unknown>) => {
          assert.equal(tenantId, 'tenant-a');
          assert.equal(userId, 'user-a');
          return callback(tx);
        },
      } as never,
      { publish: async (event: unknown) => { events.push(event); } } as never,
    );

    await assert.rejects(
      () => service.placeInClass(
        'tenant-a',
        'student-a',
        scenario.classId,
        scenario.yearId,
        scenario.levelId,
        'user-a',
        scenario.streamId,
      ),
      /not found|selected school class/i,
      scenario.name,
    );
    assert.deepEqual(mutations, [], `${scenario.name} must reject before persistence`);
    assert.deepEqual(events, [], `${scenario.name} must reject before event publication`);
  }
});

test('StudentLifecycleService persists a valid same-tenant class placement after relationship validation', async () => {
  const calls: Array<{ method: string; input?: unknown }> = [];
  const tx = {
    student: {
      findFirst: async ({ where }: any) => {
        calls.push({ method: 'student.findFirst', input: where });
        return { id: 'student-a', schoolId: 'tenant-a', studentStatus: 'ENROLLED' };
      },
      update: async ({ data }: any) => {
        calls.push({ method: 'student.update', input: data });
        return { id: 'student-a', ...data };
      },
    },
    class: {
      findFirst: async ({ where }: any) => {
        calls.push({ method: 'class.findFirst', input: where });
        return { id: 'class-a', schoolId: 'tenant-a', academicLevelId: 'level-a' };
      },
    },
    stream: {
      findFirst: async ({ where }: any) => {
        calls.push({ method: 'stream.findFirst', input: where });
        return { id: 'stream-a', schoolId: 'tenant-a', classId: 'class-a' };
      },
    },
    academicYear: {
      findFirst: async ({ where }: any) => {
        calls.push({ method: 'year.findFirst', input: where });
        return { id: 'year-a', schoolId: 'tenant-a' };
      },
    },
    academicLevel: {
      findFirst: async ({ where }: any) => {
        calls.push({ method: 'level.findFirst', input: where });
        return { id: 'level-a', schoolId: 'tenant-a', isActive: true };
      },
    },
    studentClassAssignment: {
      updateMany: async ({ where }: any) => { calls.push({ method: 'assignment.archive', input: where }); },
      create: async ({ data }: any) => { calls.push({ method: 'assignment.create', input: data }); },
    },
    studentAuditLog: {
      create: async ({ data }: any) => { calls.push({ method: 'audit.create', input: data }); },
    },
  };
  const service = new StudentLifecycleService(
    {
      executeWithTenant: async (_tenantId: string, _userId: string, callback: (client: any) => Promise<unknown>) => callback(tx),
    } as never,
    { publish: async (input: unknown) => { calls.push({ method: 'event.publish', input }); } } as never,
  );

  const placed = await service.placeInClass(
    'tenant-a',
    'student-a',
    'class-a',
    'year-a',
    'level-a',
    'user-a',
    'stream-a',
  );

  assert.equal(placed.currentClassId, 'class-a');
  assert.deepEqual((calls.find((call) => call.method === 'stream.findFirst')?.input as any), {
    id: 'stream-a',
    schoolId: 'tenant-a',
    classId: 'class-a',
    deletedAt: null,
  });
  assert.deepEqual(calls.slice(-4).map((call) => call.method), [
    'assignment.create',
    'student.update',
    'audit.create',
    'event.publish',
  ]);
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

test('StudentsService summary binds slug tenants and reports persisted attendance truthfully', async () => {
  const requestContext = new RequestContextService();
  const tenantExecutions: Array<{ tenantId: string; userId: string | null }> = [];
  const queries: Array<{ sql: string; params: unknown[] }> = [];
  const service = new StudentsService(
    requestContext,
    {
      executeWithTenant: async (tenantId: string, userId: string | null, callback: any) => {
        tenantExecutions.push({ tenantId, userId });
        return callback({
          $queryRawUnsafe: async (sql: string, ...params: unknown[]) => {
            queries.push({ sql, params });
            return [{
              total_students: 12n,
              absent_today: 3n,
              new_enrollments: 2n,
              boys_count: 7n,
              girls_count: 5n,
            }];
          },
        });
      },
      $queryRawUnsafe: async () => {
        throw new Error('summary must not bypass tenant context');
      },
    } as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
  );

  const summary = await requestContext.run(
    {
      request_id: 'req-student-summary',
      tenant_id: 'school-kisumu-central',
      user_id: '00000000-0000-0000-0000-000000000001',
      role: 'Principal',
      session_id: 'session-summary',
      permissions: ['students:read'],
      is_authenticated: true,
      client_ip: '127.0.0.1',
      user_agent: 'test-suite',
      method: 'GET',
      path: '/students/summary/dashboard',
      started_at: '2026-08-25T00:00:00.000Z',
    },
    () => service.getSummary(),
  );

  assert.deepEqual(tenantExecutions, [{ tenantId: 'school-kisumu-central', userId: null }]);
  assert.equal(queries.length, 1);
  assert.deepEqual(queries[0]!.params, ['school-kisumu-central']);
  assert.match(queries[0]!.sql, /student\.tenant_id = \$1/);
  assert.match(queries[0]!.sql, /attendance\.tenant_id = \$1/);
  assert.deepEqual(summary, {
    totalStudents: '12',
    absentToday: '3',
    newEnrollments: '2',
    trendLabel: '+2 this month',
    demographics: [
      { label: 'Boys', value: 58 },
      { label: 'Girls', value: 42 },
    ],
  });
});

test('StudentsService summary does not invent demographic data for an empty tenant', async () => {
  const requestContext = new RequestContextService();
  const service = new StudentsService(
    requestContext,
    {
      executeWithTenant: async (_tenantId: string, _userId: string | null, callback: any) =>
        callback({
          $queryRawUnsafe: async () => [{
            total_students: 0n,
            absent_today: 0n,
            new_enrollments: 0n,
            boys_count: 0n,
            girls_count: 0n,
          }],
        }),
    } as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
  );

  const summary = await requestContext.run(
    {
      request_id: 'req-empty-student-summary',
      tenant_id: 'new-school-slug',
      user_id: '00000000-0000-0000-0000-000000000001',
      role: 'Principal',
      session_id: 'session-empty-summary',
      permissions: ['students:read'],
      is_authenticated: true,
      client_ip: '127.0.0.1',
      user_agent: 'test-suite',
      method: 'GET',
      path: '/students/summary/dashboard',
      started_at: '2026-08-25T00:00:00.000Z',
    },
    () => service.getSummary(),
  );

  assert.equal(summary.trendLabel, 'No enrollments this month');
  assert.deepEqual(summary.demographics, []);
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

test('ParentPortalService exposes only linked published academic records', async () => {
  const requestContext = new RequestContextService();
  const calls: Record<string, any[]> = {
    guardians: [],
    reportCards: [],
    marks: [],
    students: [],
    classSubjects: [],
  };
  const service = new ParentPortalService(
    {
      studentGuardian: {
        findMany: async (args: any) => {
          calls.guardians.push(args);

          if (args.select?.studentId) {
            return [{ studentId: 'student-linked' }];
          }

          return [];
        },
      },
      reportCard: {
        findMany: async (args: any) => {
          calls.reportCards.push(args);
          return [];
        },
      },
      marksEntry: {
        findMany: async (args: any) => {
          calls.marks.push(args);
          return [];
        },
      },
      student: {
        findMany: async (args: any) => {
          calls.students.push(args);
          return [];
        },
      },
      classSubject: {
        findMany: async (args: any) => {
          calls.classSubjects.push(args);
          return [];
        },
      },
    } as never,
    requestContext,
  );

  await requestContext.run(
    {
      request_id: 'req-parent-academics',
      tenant_id: 'tenant-a',
      user_id: 'parent-user-1',
      role: 'parent',
      session_id: 'session-parent',
      permissions: ['parent_portal:read'],
      is_authenticated: true,
      client_ip: '127.0.0.1',
      user_agent: 'test-suite',
      method: 'GET',
      path: '/portal/parent/academics',
      started_at: '2026-07-15T00:00:00.000Z',
    },
    () => service.getAcademics(),
  );

  assert.deepEqual(calls.guardians[0].where, {
    guardianId: 'parent-user-1',
    schoolId: 'tenant-a',
  });
  assert.deepEqual(calls.reportCards[0].where, {
    studentId: { in: ['student-linked'] },
    schoolId: 'tenant-a',
    status: 'RELEASED',
    releasedAt: { not: null },
  });
  assert.deepEqual(calls.marks[0].where, {
    studentId: { in: ['student-linked'] },
    schoolId: 'tenant-a',
    status: { in: ['APPROVED', 'LOCKED'] },
    examCycle: {
      reportCards: {
        some: {
          studentId: { in: ['student-linked'] },
          schoolId: 'tenant-a',
          status: 'RELEASED',
          releasedAt: { not: null },
        },
      },
    },
  });
  assert.deepEqual(calls.students[0].where, {
    id: { in: ['student-linked'] },
    schoolId: 'tenant-a',
  });
});

test('StudentPortalService exposes only the signed-in student released report cards', async () => {
  const requestContext = new RequestContextService();
  const reportCardCalls: any[] = [];
  const tenantTransactions: Array<{ tenantId: string; userId: string }> = [];
  const service = new StudentPortalService(
    {
      executeWithTenant: async (tenantId: string, userId: string, callback: (tx: any) => Promise<unknown>) => {
        tenantTransactions.push({ tenantId, userId });
        return callback({
          $queryRawUnsafe: async (sql: string) => {
            if (/FROM student_portal_access access/.test(sql)) {
              return [{ student_id: 'student-1' }];
            }
            return [];
          },
          reportCard: {
            findMany: async (args: any) => {
              reportCardCalls.push(args);
              return [];
            },
          },
        });
      },
      reportCard: {
        findMany: async () => {
          throw new Error('direct report card access must not be used');
        },
      },
    } as never,
    requestContext,
  );

  await requestContext.run(
    {
      request_id: 'req-student-academics',
      tenant_id: 'tenant-a',
      user_id: 'student-1',
      role: 'student',
      session_id: 'session-student',
      permissions: ['student_portal:read'],
      is_authenticated: true,
      client_ip: '127.0.0.1',
      user_agent: 'test-suite',
      method: 'GET',
      path: '/portal/student/academics',
      started_at: '2026-07-15T00:00:00.000Z',
    },
    () => service.getAcademics(),
  );

  assert.deepEqual(reportCardCalls[0].where, {
    studentId: 'student-1',
    schoolId: 'tenant-a',
    status: 'RELEASED',
    releasedAt: { not: null },
  });
  assert.equal(tenantTransactions.length >= 3, true);
  assert.equal(tenantTransactions.every((call) => call.tenantId === 'tenant-a'), true);
  assert.equal(tenantTransactions.every((call) => call.userId === 'student-1'), true);
});

test('StudentPortalService dashboard derives metrics from tenant-scoped records instead of stubs', async () => {
  const requestContext = new RequestContextService();
  const queries: any[] = [];
  const notificationBadgeCalls: any[][] = [];
  const tenantTransactions: Array<{ tenantId: string; userId: string }> = [];
  const service = new StudentPortalService(
    {
      executeWithTenant: async (tenantId: string, userId: string, callback: (tx: any) => Promise<unknown>) => {
        tenantTransactions.push({ tenantId, userId });
        return callback({
          student: {
            findUnique: async (args: any) => {
              queries.push({ model: 'student', args });
              return {
                id: 'student-1',
                firstName: 'Amina',
                lastName: 'Otieno',
                admissionNumber: 'ADM-001',
                currentClass: { name: 'Grade 8' },
                currentStream: { name: 'Blue' },
              };
            },
          },
          attendanceRecord: {
            findMany: async (args: any) => {
              queries.push({ model: 'attendanceRecord', args });
              return [
                { id: 'att-1', status: 'PRESENT', createdAt: new Date('2026-07-13T06:00:00.000Z') },
                { id: 'att-2', status: 'PRESENT', createdAt: new Date('2026-07-12T06:00:00.000Z') },
                { id: 'att-3', status: 'ABSENT', createdAt: new Date('2026-07-11T06:00:00.000Z') },
              ];
            },
          },
          reportCard: {
            findFirst: async (args: any) => {
              queries.push({ model: 'reportCard', args });
              return { meanGrade: 'B+', meanScore: 72, term: { name: 'Term 2' }, academicYear: { name: '2026' } };
            },
          },
          $queryRawUnsafe: async (sql: string, ...values: any[]) => {
            if (/FROM student_portal_access access/.test(sql)) {
              queries.push({ model: 'portal-access', sql, values });
              return [{ student_id: 'student-1' }];
            }
            queries.push({ model: 'assignments', sql, values });
            return [{ pending_count: '3' }];
          },
        });
      },
    } as never,
    requestContext,
    {
      getBadges: async (...args: any[]) => {
        notificationBadgeCalls.push(args);
        return { unreadCount: 4, urgentCount: 0, byModule: {} };
      },
    } as never,
  );

  const dashboard = await requestContext.run(
    {
      request_id: 'req-student-dashboard',
      tenant_id: 'tenant-a',
      user_id: 'student-1',
      role: 'student',
      session_id: 'session-student',
      permissions: ['student_portal:read'],
      is_authenticated: true,
      client_ip: '127.0.0.1',
      user_agent: 'test-suite',
      method: 'GET',
      path: '/portal/student',
      started_at: '2026-07-15T00:00:00.000Z',
    },
    () => service.getDashboard(),
  );

  assert.deepEqual(dashboard.metrics, {
    attendanceRate: 67,
    averageGrade: 'B+',
    pendingAssignments: 3,
    unreadMessages: 4,
  });
  assert.deepEqual(dashboard.attendanceSummary, {
    total: 3,
    present: 2,
    absent: 1,
    late: 0,
  });
  assert.deepEqual(queries.find((query) => query.model === 'student')?.args.where, {
    id: 'student-1',
    schoolId: 'tenant-a',
  });
  assert.deepEqual(queries.find((query) => query.model === 'reportCard')?.args.where, {
    studentId: 'student-1',
    schoolId: 'tenant-a',
    status: 'RELEASED',
    releasedAt: { not: null },
  });
  assert.deepEqual(notificationBadgeCalls[0], ['tenant-a', 'student-1', 'student']);
  assert.deepEqual(queries.find((query) => query.model === 'assignments')?.values, ['tenant-a', 'student-1']);
  assert.match(queries.find((query) => query.model === 'assignments')?.sql ?? '', /academics_assignments/);
  assert.match(queries.find((query) => query.model === 'assignments')?.sql ?? '', /academics_assignment_submissions/);
  assert.equal(tenantTransactions.every((call) => call.tenantId === 'tenant-a'), true);
  assert.equal(tenantTransactions.every((call) => call.userId === 'student-1'), true);
});

test('ParentPortalService blocks dashboard query access to unlinked child records', async () => {
  const requestContext = new RequestContextService();
  const service = new ParentPortalService(
    {
      studentGuardian: {
        findMany: async () => [
          {
            relationshipType: 'Mother',
            isPrimaryContact: true,
            student: {
              id: 'linked-child',
              admissionNumber: 'ADM-001',
              firstName: 'Amina',
              lastName: 'Otieno',
              middleName: null,
              studentStatus: 'ACTIVE',
              dateOfBirth: null,
              gender: 'F',
              currentClass: { name: 'Grade 8' },
              currentStream: { name: 'Blue' },
            },
          },
        ],
      },
    } as never,
    requestContext,
  );

  await assert.rejects(
    () => requestContext.run(
      {
        request_id: 'req-parent-dashboard-unlinked',
        tenant_id: 'tenant-a',
        user_id: 'parent-user-1',
        role: 'parent',
        session_id: 'session-parent',
        permissions: ['parent_portal:read'],
        is_authenticated: true,
        client_ip: '127.0.0.1',
        user_agent: 'test-suite',
        method: 'GET',
        path: '/portal/parent?studentId=other-child',
        started_at: '2026-07-15T00:00:00.000Z',
      },
      () => service.getDashboardData('other-child'),
    ),
    /Student not found or not linked to this account/,
  );
});

test('StudentPortalService completes a class assignment with audit and workflow events in one tenant transaction', async () => {
  const requestContext = new RequestContextService();
  const queries: Array<{ tenantId: string; userId: string; sql: string; params: any[] }> = [];
  const service = new StudentPortalService(
    {
      executeWithTenant: async (
        tenantId: string,
        userId: string,
        callback: (tx: any) => Promise<unknown>,
      ) => callback({
        $queryRawUnsafe: async (sql: string, ...params: any[]) => {
          queries.push({ tenantId, userId, sql, params });
          if (/FROM student_portal_access access/.test(sql)) {
            return [{ student_id: 'student-1' }];
          }
          if (/FROM academics_assignments assignment/.test(sql) && /FOR UPDATE OF assignment/.test(sql)) {
            return [{
              id: '22222222-2222-4222-8222-222222222222',
              title: 'Algebra practice',
              teacher_id: '33333333-3333-4333-8333-333333333333',
              submission_id: null,
              submission_status: null,
            }];
          }
          if (/INSERT INTO academics_assignment_submissions/.test(sql)) {
            return [{
              id: '44444444-4444-4444-8444-444444444444',
              status: 'completed',
              submitted_at: '2026-07-26T10:00:00.000Z',
              completed_at: '2026-07-26T10:00:00.000Z',
            }];
          }
          return [];
        },
      }),
    } as never,
    requestContext,
  );

  const result = await requestContext.run(
    {
      request_id: 'req-student-assignment-complete',
      tenant_id: 'tenant-a',
      user_id: '11111111-1111-4111-8111-111111111111',
      role: 'student',
      session_id: 'session-student',
      permissions: ['student_portal:write'],
      is_authenticated: true,
      client_ip: '127.0.0.1',
      user_agent: 'test-suite',
      method: 'POST',
      path: '/student-portal/assignments/mark-done',
      started_at: '2026-07-15T00:00:00.000Z',
    },
    () => service.markAssignmentDone('22222222-2222-4222-8222-222222222222'),
  );

  assert.equal(result.success, true);
  assert.equal(result.alreadyCompleted, false);
  assert.equal(result.submission.status, 'completed');
  assert.equal(queries.every((query) => query.tenantId === 'tenant-a'), true);
  assert.equal(
    queries.every((query) => query.userId === '11111111-1111-4111-8111-111111111111'),
    true,
  );
  assert.equal(queries.some((query) => /INSERT INTO academics_assignment_submissions/.test(query.sql)), true);
  assert.equal(queries.some((query) => /INSERT INTO academic_audit_logs/.test(query.sql)), true);
  assert.equal(queries.some((query) => /INSERT INTO workflow_events/.test(query.sql)), true);
});

