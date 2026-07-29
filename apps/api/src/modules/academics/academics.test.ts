import assert from 'node:assert/strict';
import test from 'node:test';

import { AcademicsSchemaService } from './academics-schema.service';
import { AcademicsService } from './academics.service';
import { AcademicsRepository } from './repositories/academics.repository';

test('AcademicsSchemaService creates academic lifecycle tables with tenant RLS', async () => {
  let schemaSql = '';
  const service = new AcademicsSchemaService({
    runSchemaBootstrap: async (sql: string) => {
      schemaSql += sql;
    },
  } as never);

  await service.onModuleInit();

  assert.match(schemaSql, /CREATE TABLE IF NOT EXISTS academic_years/);
  assert.match(schemaSql, /CREATE TABLE IF NOT EXISTS academic_terms/);
  assert.match(schemaSql, /CREATE TABLE IF NOT EXISTS academics_calendar_periods/);
  assert.match(schemaSql, /ALTER TABLE class_subject_assignments ADD COLUMN IF NOT EXISTS is_compulsory/);
  assert.match(schemaSql, /CREATE TABLE IF NOT EXISTS teacher_subject_assignments/);
  assert.match(schemaSql, /CREATE TABLE IF NOT EXISTS academics_departments/);
  assert.match(schemaSql, /CREATE TABLE IF NOT EXISTS academics_class_teachers/);
  assert.match(schemaSql, /CREATE TABLE IF NOT EXISTS academics_report_card_settings/);
  assert.match(schemaSql, /CREATE TABLE IF NOT EXISTS academics_department_hod_appointments/);
  assert.match(schemaSql, /CREATE TABLE IF NOT EXISTS academics_role_appointments/);
  assert.match(schemaSql, /CREATE TABLE IF NOT EXISTS academics_curriculum_configurations/);
  assert.match(schemaSql, /CREATE TABLE IF NOT EXISTS academic_levels/);
  assert.match(schemaSql, /CREATE TABLE IF NOT EXISTS class_streams/);
  assert.match(schemaSql, /CREATE TABLE IF NOT EXISTS student_class_assignments/);
  assert.match(schemaSql, /CREATE TABLE IF NOT EXISTS academics_assignment_submissions/);
  assert.match(schemaSql, /uq_academics_assignment_submission/);
  assert.match(schemaSql, /ALTER TABLE subjects ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active'/);
  assert.match(schemaSql, /ALTER TABLE subjects ADD COLUMN IF NOT EXISTS department_id uuid/);
  assert.match(schemaSql, /ALTER TABLE subjects ADD COLUMN IF NOT EXISTS created_by_user_id uuid/);
  assert.match(schemaSql, /ALTER TABLE subjects ADD COLUMN IF NOT EXISTS deleted_at timestamptz/);
  assert.match(schemaSql, /CREATE INDEX IF NOT EXISTS ix_subjects_department/);
  assert.match(schemaSql, /ALTER TABLE %I ALTER COLUMN id SET DEFAULT gen_random_uuid\(\)/);
  assert.match(schemaSql, /ALTER TABLE %I ALTER COLUMN id SET DEFAULT gen_random_uuid\(\)::text/);
  assert.match(schemaSql, /ALTER TABLE academic_years ALTER COLUMN school_id DROP NOT NULL/);
  assert.match(schemaSql, /ALTER TABLE subjects DROP CONSTRAINT IF EXISTS subjects_department_id_fkey/);
  assert.match(schemaSql, /ALTER TABLE teacher_subject_assignments ALTER COLUMN assigned_by_user_id DROP NOT NULL/);
  assert.match(schemaSql, /ALTER TABLE teacher_subject_assignments ADD COLUMN IF NOT EXISTS created_by_user_id uuid/);
  assert.match(schemaSql, /CBE/);
  assert.match(schemaSql, /ALTER TABLE teacher_subject_assignments FORCE ROW LEVEL SECURITY/);
  assert.match(schemaSql, /ALTER TABLE student_class_assignments FORCE ROW LEVEL SECURITY/);
  assert.match(schemaSql, /ALTER TABLE academics_assignment_submissions FORCE ROW LEVEL SECURITY/);
  assert.match(schemaSql, /CREATE POLICY academics_assignment_submissions_tenant_policy/);
  assert.match(schemaSql, /ALTER TABLE academics_departments FORCE ROW LEVEL SECURITY/);
  assert.match(schemaSql, /ALTER TABLE academics_class_teachers FORCE ROW LEVEL SECURITY/);
  assert.match(schemaSql, /ALTER TABLE academics_report_card_settings FORCE ROW LEVEL SECURITY/);
  assert.match(schemaSql, /student_class_assignments_school_id_fkey/);
  assert.match(schemaSql, /student_class_assignments_class_section_id_fkey/);
  assert.match(schemaSql, /student_class_assignments_stream_id_fkey/);
  assert.match(schemaSql, /ALTER TABLE student_class_assignments ALTER COLUMN id SET DEFAULT gen_random_uuid\(\)::text/);
  assert.match(schemaSql, /ALTER TABLE student_class_assignments ALTER COLUMN updated_at SET DEFAULT NOW\(\)/);
  assert.match(schemaSql, /ALTER TABLE academics_department_hod_appointments FORCE ROW LEVEL SECURITY/);
  assert.match(schemaSql, /ALTER TABLE academics_role_appointments FORCE ROW LEVEL SECURITY/);
  assert.match(schemaSql, /ALTER TABLE academics_curriculum_configurations FORCE ROW LEVEL SECURITY/);
  assert.match(schemaSql, /ALTER TABLE academics_calendar_periods FORCE ROW LEVEL SECURITY/);
  assert.match(schemaSql, /uq_teacher_subject_assignments_scope/);
  assert.match(schemaSql, /uq_academic_years_tenant_name/);
  assert.match(schemaSql, /uq_academics_report_card_settings_tenant_name/);
  assert.match(schemaSql, /CREATE UNIQUE INDEX IF NOT EXISTS uq_subjects_tenant_code/);
  assert.match(schemaSql, /PARTITION BY tenant_id, code/);
  assert.match(schemaSql, /academic_audit_logs DROP CONSTRAINT IF EXISTS academic_audit_logs_school_id_fkey/);
  assert.match(schemaSql, /UPDATE academic_audit_logs SET school_id = tenant_id/);
  assert.match(schemaSql, /academics_grading_systems ALTER COLUMN updated_at SET DEFAULT NOW\(\)/);
  assert.match(schemaSql, /academics_attendance_settings ALTER COLUMN updated_at SET DEFAULT NOW\(\)/);
  assert.match(schemaSql, /academics_report_card_settings ALTER COLUMN updated_at SET DEFAULT NOW\(\)/);
  assert.match(schemaSql, /CREATE UNIQUE INDEX ux_academics_class_teachers_scope/);
  assert.match(schemaSql, /UPDATE class_sections\s+SET grade_level = name/);
  assert.match(schemaSql, /CREATE UNIQUE INDEX IF NOT EXISTS ux_academics_department_hod_active/);
  assert.match(schemaSql, /CREATE UNIQUE INDEX IF NOT EXISTS ux_academics_role_appointments_active/);
  assert.match(schemaSql, /uq_academics_curriculum_name_start/);
  assert.match(schemaSql, /NULLIF\(current_setting\('app\.role', true\), ''\) = 'system'/);
  assert.match(schemaSql, /ALTER TABLE teacher_subject_assignments FORCE ROW LEVEL SECURITY/);
  assert.match(schemaSql, /ALTER TABLE student_class_assignments FORCE ROW LEVEL SECURITY/);
  assert.match(schemaSql, /uq_teacher_subject_assignments_scope/);
  assert.match(schemaSql, /NULLIF\(current_setting\('app\.role', true\), ''\) = 'system'/);
  assert.doesNotMatch(schemaSql, /CREATE TABLE IF NOT EXISTS attendance_/i);
});

test('AcademicsRepository writes settings across legacy UUID and current text schemas', async () => {
  const calls: string[] = [];
  const repository = new AcademicsRepository({
    executeWithTenant: async (
      tenantId: string,
      _userId: string | null,
      callback: (tx: { $queryRawUnsafe: (sql: string, ...params: unknown[]) => Promise<unknown[]> }) => Promise<unknown>,
    ) => {
      assert.equal(tenantId, 'maranda-high');
      return callback({
        $queryRawUnsafe: async (sql: string) => {
          calls.push(sql);
          return [{ id: '11111111-1111-4111-8111-111111111111' }];
        },
      });
    },
  } as never);

  await repository.createGradingSystem('maranda-high', 'CBC', null);
  await repository.createAttendanceSetting('maranda-high', 'Daily register', null);
  await repository.createReportCardSetting(
    'maranda-high',
    'Term report',
    '11111111-1111-4111-8111-111111111111',
    true,
    true,
  );
  await repository.updateGradingSystem('maranda-high', 'grading-1', 'CBC revised', null);
  await repository.updateAttendanceSetting('maranda-high', 'attendance-1', 'AM register', null);
  await repository.archiveReportCardSetting('maranda-high', 'report-1');

  assert.equal(calls.length, 6);
  for (const sql of calls.slice(0, 3)) {
    assert.match(sql, /updated_at/);
    assert.match(sql, /NOW\(\)/);
  }
  for (const sql of calls.slice(3)) {
    assert.match(sql, /id::text = \$2/);
  }
});

test('AcademicsRepository previews dependencies for many records in one tenant transaction', async () => {
  const calls: Array<{ sql: string; params: unknown[] }> = [];
  let transactionCount = 0;
  const repository = new AcademicsRepository({
    executeWithTenant: async (
      tenantId: string,
      _userId: string | null,
      callback: (tx: { $queryRawUnsafe: (sql: string, ...params: unknown[]) => Promise<unknown[]> }) => Promise<unknown>,
    ) => {
      assert.equal(tenantId, 'tenant-a');
      transactionCount += 1;
      return callback({
        $queryRawUnsafe: async (sql: string, ...params: unknown[]) => {
          calls.push({ sql, params });
          if (/information_schema\.columns/.test(sql)) {
            return [
              { table_name: 'student_class_assignments', column_name: 'tenant_id' },
              { table_name: 'student_class_assignments', column_name: 'class_section_id' },
            ];
          }
          if (/FROM student_class_assignments/.test(sql)) {
            return [{ entity_id: 'class-1', count: 2 }];
          }
          return [];
        },
      });
    },
  } as never);

  const result = await repository.getBulkSetupDependencies('tenant-a', 'class-section', ['class-1', 'class-2']);

  assert.equal(transactionCount, 1);
  assert.equal(calls.length, 2);
  assert.match(calls[0]!.sql, /table_name = ANY\(\$1::text\[\]\)/);
  assert.match(calls[1]!.sql, /class_section_id::text = ANY\(\$2::text\[\]\)/);
  assert.deepEqual(calls[1]!.params, ['tenant-a', ['class-1', 'class-2']]);
  assert.equal(result[0]!.total, 2);
  assert.equal(result[0]!.can_permanently_delete, false);
  assert.equal(result[1]!.total, 0);
  assert.equal(result[1]!.can_permanently_delete, true);
});

test('AcademicsRepository types every lifecycle parameter for status-only records', async () => {
  const calls: Array<{ sql: string; params: unknown[] }> = [];
  const repository = new AcademicsRepository({
    executeWithTenant: async (
      tenantId: string,
      _userId: string | null,
      callback: (tx: { $queryRawUnsafe: (sql: string, ...params: unknown[]) => Promise<unknown[]> }) => Promise<unknown>,
    ) => {
      assert.equal(tenantId, 'tenant-a');
      return callback({
        $queryRawUnsafe: async (sql: string, ...params: unknown[]) => {
          calls.push({ sql, params });
          return [{ id: 'year-1', status: 'inactive', version: 2 }];
        },
      });
    },
  } as never);

  const result = await repository.applySetupLifecycle(
    'tenant-a',
    'academic-year',
    'year-1',
    'deactivate',
    '11111111-1111-4111-8111-111111111111',
    1,
  );

  assert.equal(result.status, 'inactive');
  assert.equal(calls.length, 1);
  const captured = calls[0]!;
  assert.match(captured.sql, /WITH lifecycle_input AS/);
  assert.match(captured.sql, /\$3::text AS status/);
  assert.match(captured.sql, /\$4::boolean AS active/);
  assert.match(captured.sql, /\$5::uuid AS actor_user_id/);
  assert.match(captured.sql, /\$6::integer AS expected_version/);
  assert.match(captured.sql, /status = lifecycle\.status/);
  assert.doesNotMatch(captured.sql, /is_active = lifecycle\.active/);
  assert.deepEqual(captured.params, [
    'tenant-a',
    'year-1',
    'inactive',
    false,
    '11111111-1111-4111-8111-111111111111',
    1,
  ]);
});

test('AcademicsRepository supplies durable IDs when creating academic years and terms', async () => {
  const calls: Array<{ sql: string; params: unknown[] }> = [];
  const repository = new AcademicsRepository({
    executeWithTenant: async (
      tenantId: string,
      _userId: string | null,
      callback: (tx: { $queryRawUnsafe: (sql: string, ...params: unknown[]) => Promise<unknown[]> }) => Promise<unknown>,
    ) => {
      assert.equal(tenantId, 'kibabi-high');
      return callback({
        $queryRawUnsafe: async (sql: string, ...params: unknown[]) => {
          calls.push({ sql, params });
          return [{ id: params[1], tenant_id: params[0] }];
        },
      });
    },
  } as never);

  const actorUserId = '11111111-1111-4111-8111-111111111111';
  const year = await repository.createAcademicYear({
    tenant_id: 'kibabi-high',
    name: '2026 Academic Year',
    starts_on: '2026-01-05',
    ends_on: '2026-10-30',
    created_by_user_id: actorUserId,
  });
  const term = await repository.createAcademicTerm({
    tenant_id: 'kibabi-high',
    academic_year_id: year.id,
    name: 'Term 1',
    starts_on: '2026-01-05',
    ends_on: '2026-04-02',
    created_by_user_id: actorUserId,
  });

  assert.equal(calls.length, 2);
  assert.match(calls[0]!.sql, /INSERT INTO academic_years\s*\(\s*tenant_id,\s*id,/);
  assert.match(calls[0]!.sql, /name,\s*start_date,\s*end_date,\s*starts_on,\s*ends_on/);
  assert.match(calls[0]!.sql, /VALUES \(\$1, \$2, \$3,/);
  assert.match(calls[1]!.sql, /INSERT INTO academic_terms\s*\(\s*tenant_id, id,/);
  assert.match(calls[0]!.sql, /ON CONFLICT \(tenant_id, name\)/);
  assert.match(calls[1]!.sql, /ON CONFLICT \(tenant_id, academic_year_id, name\)/);
  assert.match(String(calls[0]!.params[1]), /^[0-9a-f-]{36}$/i);
  assert.match(String(calls[1]!.params[1]), /^[0-9a-f-]{36}$/i);
  assert.equal(calls[0]!.params[0], 'kibabi-high');
  assert.equal(calls[1]!.params[0], 'kibabi-high');
  assert.equal(term.id, calls[1]!.params[1]);
});

test('AcademicsRepository dual-writes tenant ownership for legacy audit compatibility', async () => {
  const calls: Array<{ sql: string; params: unknown[] }> = [];
  const repository = new AcademicsRepository({
    executeWithTenant: async (
      tenantId: string,
      _userId: string | null,
      callback: (tx: { $queryRawUnsafe: (sql: string, ...params: unknown[]) => Promise<unknown[]> }) => Promise<unknown>,
    ) => {
      assert.equal(tenantId, 'maranda-high');
      return callback({
        $queryRawUnsafe: async (sql: string, ...params: unknown[]) => {
          calls.push({ sql, params });
          return [{ id: 'audit-1' }];
        },
      });
    },
  } as never);

  await repository.appendAuditLog({
    tenant_id: 'maranda-high',
    entity_type: 'academic_year',
    entity_id: '11111111-1111-4111-8111-111111111111',
    action: 'academics.academic_year_created',
    actor_user_id: '22222222-2222-4222-8222-222222222222',
    metadata: { name: '2026 Academic Year' },
  });

  assert.equal(calls.length, 1);
  assert.match(calls[0]!.sql, /INSERT INTO academic_audit_logs\s*\(\s*school_id, tenant_id,/);
  assert.match(calls[0]!.sql, /VALUES\s*\(\s*\$1,\s*\$1,/);
  assert.equal(calls[0]!.params[0], 'maranda-high');
});

test('AcademicsService assigns teachers to deterministic subject class term scopes', async () => {
  const calls: string[] = [];
  let scopeRead = 0;
  const service = new AcademicsService(
    { getStore: () => ({ tenant_id: 'tenant-a', user_id: 'user-1' }) } as never,
    {
      executeSql: async () => {
        scopeRead += 1;
        return scopeRead === 1
          ? { rows: [{ id: 'term-1' }], rowCount: 1 }
          : { rows: [], rowCount: 0 };
      },
      findTeacherOptionByUserId: async () => ({ id: 'staff-1', user_id: 'teacher-1', label: 'Teacher One' }),
      createTeacherAssignment: async (input: Record<string, unknown>) => {
        calls.push('assign');
        return { id: 'assignment-1', ...input };
      },
      appendAuditLog: async () => {
        calls.push('audit');
      },
    } as never,
    {} as never,
  );

  const assignment = await service.assignTeacher({
    academic_term_id: 'term-1',
    class_section_id: 'class-1',
    subject_id: 'subject-1',
    teacher_user_id: 'teacher-1',
  });

  assert.equal(assignment.id, 'assignment-1');
  assert.deepEqual(calls, ['assign', 'audit']);
});

test('AcademicsService stores one canonical class, form, or grade name', async () => {
  const writes: Array<Record<string, unknown>> = [];
  let queryCount = 0;
  const service = new AcademicsService(
    { getStore: () => ({ tenant_id: 'tenant-a', user_id: 'user-1' }) } as never,
    {
      executeSql: async () => {
        queryCount += 1;
        return queryCount === 1
          ? { rows: [{ id: 'year-1' }], rowCount: 1 }
          : { rows: [], rowCount: 0 };
      },
      createClassSection: async (input: Record<string, unknown>) => {
        writes.push(input);
        return { id: 'class-1', ...input };
      },
      appendAuditLog: async () => ({ id: 'audit-1' }),
    } as never,
    {} as never,
  );

  const result = await service.createClassSection({
    academic_year_id: 'year-1',
    name: 'Grade 9',
    curriculum_model: 'CBE',
  });

  assert.equal(result.name, 'Grade 9');
  assert.equal(result.grade_level, 'Grade 9');
  assert.equal(writes.length, 1);
  assert.equal(writes[0]!.name, 'Grade 9');
  assert.equal(writes[0]!.grade_level, 'Grade 9');
});

test('AcademicsService rejects academic terms outside their selected year dates', async () => {
  const service = new AcademicsService(
    { getStore: () => ({ tenant_id: 'tenant-a', user_id: 'user-1' }) } as never,
    {
      executeSql: async () => ({
        rows: [{ id: 'year-1', starts_on: '2026-01-05', ends_on: '2026-10-30' }],
        rowCount: 1,
      }),
      createAcademicTerm: async () => {
        throw new Error('createAcademicTerm should not run');
      },
    } as never,
    {} as never,
  );

  await assert.rejects(
    () => service.createAcademicTerm({
      academic_year_id: 'year-1',
      name: 'Term 3',
      starts_on: '2026-10-01',
      ends_on: '2026-11-15',
    }),
    /must fall within the selected academic year/,
  );
});

test('AcademicsService creates structured levels, classes, and streams in one tenant transaction', async () => {
  const calls: string[] = [];
  const service = new AcademicsService(
    { getStore: () => ({ tenant_id: 'tenant-a', user_id: 'user-1' }) } as never,
    {
      createClassStructure: async (input: Record<string, unknown>) => {
        calls.push('structure');
        return input;
      },
      appendAuditLog: async (input: Record<string, unknown>) => {
        calls.push(`audit:${input.action}`);
      },
    } as never,
    {} as never,
  );

  const result = await service.createClassStructure({
    system_type: 'CBE',
    levels: [
      {
        name: 'Grade 7',
        order_index: 7,
        classes: [
          {
            name: 'Grade 7 Blue',
            custom_label: 'Junior Secondary 7 Blue',
            capacity: 45,
            streams: [{ name: 'Blue', capacity: 45, class_teacher_id: 'teacher-1' }],
          },
        ],
      },
    ],
  });

  assert.equal((result as Record<string, unknown>).tenant_id, 'tenant-a');
  assert.deepEqual(calls, ['structure', 'audit:academics.class_structure_created']);
});

test('AcademicsService assigns a student to a class and audits the assignment', async () => {
  const calls: string[] = [];
  const service = new AcademicsService(
    { getStore: () => ({ tenant_id: 'tenant-a', user_id: 'user-1' }) } as never,
    {
      assignStudentToClass: async (input: Record<string, unknown>) => {
        calls.push('assign-student');
        return { id: 'assignment-1', ...input };
      },
      appendAuditLog: async (input: Record<string, unknown>) => {
        calls.push(`audit:${input.action}`);
      },
    } as never,
    {} as never,
  );

  const result = await service.assignStudentToClass({
    student_id: 'student-1',
    class_section_id: 'class-1',
    stream_id: 'stream-1',
    academic_level_id: 'level-1',
    academic_year_id: 'year-1',
  });

  assert.equal(result.id, 'assignment-1');
  assert.deepEqual(calls, ['assign-student', 'audit:academics.student_class_assigned']);
});

test('AcademicsService bounds teacher assignment lists', async () => {
  const observed: Record<string, unknown> = {};
  const service = new AcademicsService(
    { getStore: () => ({ tenant_id: 'tenant-a', user_id: 'user-1' }) } as never,
    {
      listTeacherAssignments: async (input: Record<string, unknown>) => {
        observed.input = input;
        return [];
      },
    } as never,
    {} as never,
  );

  await service.listTeacherAssignments(' teacher-1 ', '500', '-10');

  assert.deepEqual(observed.input, {
    tenantId: 'tenant-a',
    teacherUserId: 'teacher-1',
    limit: 300,
    offset: 0,
  });
});

test('AcademicsService lists tenant-scoped teacher options for human assignment controls', async () => {
  const observed: Record<string, unknown> = {};
  const service = new AcademicsService(
    { getStore: () => ({ tenant_id: 'tenant-a', user_id: 'user-1' }) } as never,
    {
      listTeacherOptions: async (tenantId: string) => {
        observed.tenantId = tenantId;
        return [
          {
            id: 'staff-1',
            user_id: 'teacher-user-1',
            label: 'Amina Otieno',
            staff_number: 'TSC-102',
            status: 'active',
          },
        ];
      },
    } as never,
    {} as never,
  );

  const result = await service.listTeacherOptions();

  assert.equal(observed.tenantId, 'tenant-a');
  assert.deepEqual(result, [
    {
      id: 'staff-1',
      user_id: 'teacher-user-1',
      label: 'Amina Otieno',
      staff_number: 'TSC-102',
      status: 'active',
    },
  ]);
});

test('AcademicsService rejects subject teacher assignments outside active tenant staff', async () => {
  const service = new AcademicsService(
    { getStore: () => ({ tenant_id: 'tenant-a', user_id: 'user-1' }) } as never,
    {
      executeSql: async () => ({ rows: [], rowCount: 0 }),
      findTeacherOptionByUserId: async () => null,
      createTeacherAssignment: async () => {
        throw new Error('createTeacherAssignment should not run');
      },
    } as never,
    {} as never,
  );

  await assert.rejects(
    () => service.assignTeacher({
      academic_term_id: 'term-1',
      class_section_id: 'class-1',
      subject_id: 'subject-1',
      teacher_user_id: 'external-user-1',
    }),
    /active staff member in this school/,
  );
});

test('AcademicsService rejects subject departments outside the active tenant', async () => {
  const service = new AcademicsService(
    { getStore: () => ({ tenant_id: 'tenant-a', user_id: 'user-1' }) } as never,
    {
      executeSql: async () => ({ rows: [] }),
      createSubject: async () => {
        throw new Error('createSubject should not run');
      },
    } as never,
    {} as never,
  );

  await assert.rejects(
    () => service.createSubject({
      code: 'MAT',
      name: 'Mathematics',
      department_id: 'external-department',
    }),
    /active academic department from this school/,
  );
});

test('AcademicsService creates lesson logs with tenant teacher and selected date', async () => {
  const observed: Record<string, unknown> = {};
  const service = new AcademicsService(
    { getStore: () => ({ tenant_id: 'tenant-a', user_id: '11111111-1111-4111-8111-111111111111' }) } as never,
    {
      createLessonLog: async (input: Record<string, unknown>) => {
        observed.input = input;
        return { id: 'lesson-log-1', ...input };
      },
    } as never,
    {} as never,
  );

  const result = await service.createLessonLog({
    class_id: 'class-1',
    subject_id: 'subject-1',
    topic: 'Linear equations',
    notes: 'Two students need follow-up.',
    date: '2026-06-26',
  });

  assert.equal((result as Record<string, unknown>).id, 'lesson-log-1');
  assert.deepEqual(observed.input, {
    tenant_id: 'tenant-a',
    class_id: 'class-1',
    subject_id: 'subject-1',
    teacher_id: '11111111-1111-4111-8111-111111111111',
    topic: 'Linear equations',
    notes: 'Two students need follow-up.',
    date: '2026-06-26',
  });
});

test('AcademicsRepository lists teacher assignments with explicit columns and pagination', async () => {
  const calls: Array<{ sql: string; params: unknown[] }> = [];
  let tenantIdUsed: string | undefined;
  const repository = new AcademicsRepository({
        executeWithTenant: async function(tenantId: string, ctx: any, cb: any) {
      tenantIdUsed = tenantId;
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

  await repository.listTeacherAssignments({
    tenantId: 'tenant-a',
    teacherUserId: 'teacher-1',
    limit: 500,
    offset: -10,
  });

  assert.doesNotMatch(calls[0]!.sql, /SELECT\s+\*/i);
  assert.match(calls[0]!.sql, /LIMIT \$3::integer\s+OFFSET \$4::integer/);
  assert.match(calls[0]!.sql, /teacher_user_id = \$2::text/);
  assert.match(calls[0]!.sql, /staff\.user_id::text = assignment\.teacher_user_id/);
  assert.match(calls[0]!.sql, /staff\.display_name/);
  assert.doesNotMatch(calls[0]!.sql, /staff\.full_name/);
  assert.doesNotMatch(calls[0]!.sql, /teacher_user_id = \$2::uuid/);
  assert.equal(tenantIdUsed, 'tenant-a');
  assert.equal(calls[0]!.params[2], 50);
  assert.equal(calls[0]!.params[3], 0);
});

test('AcademicsRepository lists active staff teacher options without cross-tenant reads', async () => {
  const calls: Array<{ sql: string; params: unknown[] }> = [];
  let tenantIdUsed: string | undefined;
  const repository = new AcademicsRepository({
    executeWithTenant: async function(tenantId: string, ctx: any, cb: any) {
      tenantIdUsed = tenantId;
      return cb({
        $queryRawUnsafe: async (sql: string, ...params: any[]) => {
          const res = await (this as any).query(sql, params);
          return res.rows || res;
        },
      });
    },
    query: async (sql: string, params: unknown[]) => {
      calls.push({ sql, params });
      return {
        rows: [
          {
            id: 'staff-1',
            user_id: 'teacher-user-1',
            label: 'Amina Otieno',
            staff_number: 'TSC-102',
            status: 'active',
            role_code: 'teacher',
          },
        ],
      };
    },
  } as never);

  const result = await repository.listTeacherOptions('tenant-a');

  assert.equal(tenantIdUsed, 'tenant-a');
  assert.match(calls[0]!.sql, /FROM tenant_memberships membership/i);
  assert.match(calls[0]!.sql, /JOIN users user_account/i);
  assert.match(calls[0]!.sql, /JOIN roles role/i);
  assert.match(calls[0]!.sql, /LEFT JOIN staff_profiles staff/i);
  assert.match(calls[0]!.sql, /WHERE membership\.tenant_id = \$1/i);
  assert.match(calls[0]!.sql, /membership\.status = 'active'/i);
  assert.match(calls[0]!.sql, /user_account\.status = 'active'/i);
  assert.match(calls[0]!.sql, /role\.code = ANY/i);
  assert.match(calls[0]!.sql, /display_name/i);
  assert.match(calls[0]!.sql, /full_name/i);
  assert.deepEqual(calls[0]!.params, ['tenant-a']);
  assert.deepEqual(result, [
    {
      id: 'staff-1',
      user_id: 'teacher-user-1',
      label: 'Amina Otieno',
      staff_number: 'TSC-102',
      status: 'active',
      role_code: 'teacher',
    },
  ]);
});

test('AcademicsRepository loads the complete academic foundation in one tenant transaction', async () => {
  let transactionCount = 0;
  let observedSql = '';
  let observedTenantId = '';
  const repository = new AcademicsRepository({
    executeWithTenant: async (tenantId: string, _userId: string | null, callback: (tx: unknown) => Promise<unknown>) => {
      transactionCount += 1;
      observedTenantId = tenantId;
      return callback({
        $queryRawUnsafe: async (sql: string) => {
          observedSql = sql;
          return [{
            years: [{ id: 'year-1', name: '2026' }],
            terms: [],
            classes: [],
            streams: [],
            subjects: [],
            departments: [],
            teachers: [],
            class_teachers: [],
            teacher_assignments: [],
          }];
        },
      });
    },
  } as never);

  const result = await repository.getAcademicFoundation('kibabi-high');

  assert.equal(transactionCount, 1);
  assert.equal(observedTenantId, 'kibabi-high');
  assert.match(observedSql, /FROM academic_years/);
  assert.match(observedSql, /FROM academic_terms/);
  assert.match(observedSql, /FROM academics_calendar_periods/);
  assert.match(observedSql, /FROM class_subject_assignments/);
  assert.match(observedSql, /FROM class_streams/);
  assert.match(observedSql, /FROM teacher_subject_assignments/);
  assert.match(observedSql, /FROM tenant_memberships membership/);
  assert.match(observedSql, /JOIN roles role/);
  assert.match(observedSql, /role\.code = ANY/);
  assert.deepEqual(result.years, [{ id: 'year-1', name: '2026' }]);
});

test('AcademicsRepository finds active teacher options by tenant and user id', async () => {
  const calls: Array<{ sql: string; params: unknown[] }> = [];
  let tenantIdUsed: string | undefined;
  const repository = new AcademicsRepository({
    executeWithTenant: async function(tenantId: string, ctx: any, cb: any) {
      tenantIdUsed = tenantId;
      return cb({
        $queryRawUnsafe: async (sql: string, ...params: any[]) => {
          const res = await (this as any).query(sql, params);
          return res.rows || res;
        },
      });
    },
    query: async (sql: string, params: unknown[]) => {
      calls.push({ sql, params });
      return {
        rows: [
          {
            id: 'staff-1',
            user_id: 'teacher-user-1',
            label: 'Amina Otieno',
            staff_number: 'TSC-102',
            status: 'active',
            role_code: 'teacher',
          },
        ],
      };
    },
  } as never);

  const result = await repository.findTeacherOptionByUserId('tenant-a', 'teacher-user-1');

  assert.equal(tenantIdUsed, 'tenant-a');
  assert.match(calls[0]!.sql, /FROM tenant_memberships membership/i);
  assert.match(calls[0]!.sql, /JOIN users user_account/i);
  assert.match(calls[0]!.sql, /JOIN roles role/i);
  assert.match(calls[0]!.sql, /LEFT JOIN staff_profiles staff/i);
  assert.match(calls[0]!.sql, /WHERE membership\.tenant_id = \$1/i);
  assert.match(calls[0]!.sql, /membership\.user_id = \$2::uuid/i);
  assert.match(calls[0]!.sql, /role\.code = ANY/i);
  assert.deepEqual(calls[0]!.params, ['tenant-a', 'teacher-user-1']);
  assert.deepEqual(result, {
    id: 'staff-1',
    user_id: 'teacher-user-1',
    label: 'Amina Otieno',
    staff_number: 'TSC-102',
    status: 'active',
    role_code: 'teacher',
  });
});

test('AcademicsService rejects department HOD assignments outside active tenant staff', async () => {
  const service = new AcademicsService(
    { getStore: () => ({ tenant_id: 'tenant-a', user_id: 'user-1' }) } as never,
    {
      findTeacherOptionByUserId: async () => null,
      createDepartment: async () => {
        throw new Error('createDepartment should not run');
      },
    } as never,
    {} as never,
  );

  await assert.rejects(
    () => service.createDepartment({
      name: 'Sciences',
      head_of_department_user_id: 'external-user-1',
    }),
    /active staff member in this school/,
  );
});

test('AcademicsService rejects class teacher assignments outside active tenant staff', async () => {
  const service = new AcademicsService(
    { getStore: () => ({ tenant_id: 'tenant-a', user_id: 'user-1' }) } as never,
    {
      findTeacherOptionByUserId: async () => null,
      assignClassTeacher: async () => {
        throw new Error('assignClassTeacher should not run');
      },
    } as never,
    {} as never,
  );

  await assert.rejects(
    () => service.assignClassTeacher({
      academic_year_id: 'year-1',
      class_section_id: 'class-1',
      teacher_user_id: 'external-user-1',
    }),
    /active staff member in this school/,
  );
});

test('AcademicsService lists class streams only through the active tenant repository scope', async () => {
  let observedTenantId = '';
  const service = new AcademicsService(
    { getStore: () => ({ tenant_id: 'tenant-a', user_id: 'user-1' }) } as never,
    {
      listClassStreams: async (tenantId: string) => {
        observedTenantId = tenantId;
        return [{ id: 'stream-1', name: 'North' }];
      },
    } as never,
    {} as never,
  );

  const result = await service.listClassStreams();

  assert.equal(observedTenantId, 'tenant-a');
  assert.deepEqual(result, [{ id: 'stream-1', name: 'North' }]);
});

test('AcademicsService validates and audits HOD reassignment in the active school', async () => {
  const calls: string[] = [];
  const service = new AcademicsService(
    { getStore: () => ({ tenant_id: 'tenant-a', user_id: 'user-1' }) } as never,
    {
      getSetupRecord: async (tenantId: string, entityType: string, id: string) => {
        calls.push(`record:${tenantId}:${entityType}:${id}`);
        return { id, name: 'Science', head_of_department_user_id: null, version: 1 };
      },
      findTeacherOptionByUserId: async (tenantId: string, userId: string) => {
        calls.push(`teacher:${tenantId}:${userId}`);
        return { user_id: userId };
      },
      assignDepartmentHead: async (tenantId: string, id: string, hodUserId: string | null) => {
        calls.push(`department:${tenantId}:${id}:${hodUserId}`);
        return { department: { id, name: 'Science', head_of_department_user_id: hodUserId, version: 2 } };
      },
      appendAuditLog: async (input: Record<string, unknown>) => {
        calls.push(`audit:${input.action}`);
      },
    } as never,
    {} as never,
  );

  const result = await service.updateDepartment('department-1', {
    head_of_department_user_id: 'teacher-1',
  });

  assert.equal(result.head_of_department_user_id, 'teacher-1');
  assert.deepEqual(calls, [
    'record:tenant-a:department:department-1',
    'teacher:tenant-a:teacher-1',
    'department:tenant-a:department-1:teacher-1',
    'audit:academics.academic_department_hod_reassigned',
  ]);
});

test('AcademicsService archives and audits subject teacher allocations in the active school', async () => {
  const calls: string[] = [];
  const service = new AcademicsService(
    { getStore: () => ({ tenant_id: 'tenant-a', user_id: 'user-1' }) } as never,
    {
      getSetupRecord: async (tenantId: string, entityType: string, id: string) => {
        calls.push(`record:${tenantId}:${entityType}:${id}`);
        return { id, teacher_user_id: null, version: 1 };
      },
      archiveTeacherAssignment: async (tenantId: string, id: string) => {
        calls.push(`archive:${tenantId}:${id}`);
        return { id, teacher_user_id: null, version: 2 };
      },
      appendAuditLog: async (input: Record<string, unknown>) => {
        calls.push(`audit:${input.action}`);
      },
    } as never,
    {} as never,
  );

  const result = await service.archiveTeacherAssignment('assignment-1');

  assert.equal(result.id, 'assignment-1');
  assert.deepEqual(calls, [
    'record:tenant-a:teacher-assignment:assignment-1',
    'archive:tenant-a:assignment-1',
    'audit:academics.teacher_subject_unassigned',
  ]);
});

test('AcademicsService delegates enterMarks to ExamsService and calls new repository methods', async () => {
  const calls: string[] = [];
  const service = new AcademicsService(
    { getStore: () => ({ tenant_id: 'tenant-a', user_id: 'user-1' }) } as never,
    {
      createAttendance: async (input: Record<string, unknown>) => {
        calls.push('create-attendance');
        return { id: 'att-1', ...input };
      },
    } as never,
    {
      enterMark: async () => {
        calls.push('enter-mark-exams');
        return {};
      },
    } as never,
  );

  await service.createAttendance({
    class_id: 'class-1',
    attendance_date: '2023-01-01',
    student_id: 'student-1',
    status: 'Present',
  });

  await service.enterMarks({
    exam_series_id: 'series-1',
    assessment_id: 'assessment-1',
    academic_term_id: 'term-1',
    class_section_id: 'class-1',
    subject_id: 'subject-1',
    student_id: 'student-1',
    score: 95,
  });

  assert.deepEqual(calls, ['create-attendance', 'enter-mark-exams']);
});

test('AcademicsService blocks class capacity reductions below active enrolment', async () => {
  let updateAttempted = false;
  const service = new AcademicsService(
    { getStore: () => ({ tenant_id: 'tenant-a', user_id: 'user-1' }) } as never,
    {
      getSetupRecord: async () => ({ id: 'class-1', academic_year_id: 'year-1', name: 'Form 1' }),
      executeSql: async () => ({ rows: [{ count: 42 }], rowCount: 1 }),
      updateClassSection: async () => {
        updateAttempted = true;
        return null;
      },
    } as never,
    {} as never,
  );

  await assert.rejects(() => service.updateClassSection('class-1', { capacity: 40 }), /cannot be below 42/);
  assert.equal(updateAttempted, false);
});

test('AcademicsService blocks term closure while marks and publishing work remain open', async () => {
  let lifecycleAttempted = false;
  const service = new AcademicsService(
    { getStore: () => ({ tenant_id: 'tenant-a', user_id: 'user-1' }) } as never,
    {
      getSetupRecord: async () => ({ id: 'term-1', name: 'Term 1', status: 'active' }),
      getSetupDependencies: async () => ({ dependencies: [], total: 0, can_permanently_delete: true }),
      getTermClosureBlockers: async () => ({
        blockers: [{ key: 'exam_marks', label: 'draft or submitted marks', count: 16 }],
        total: 16,
        can_close: false,
      }),
      applySetupLifecycle: async () => {
        lifecycleAttempted = true;
        return null;
      },
    } as never,
    {} as never,
  );

  await assert.rejects(
    () => service.manageSetupLifecycle('academic-term', 'term-1', { action: 'close', reason: 'End of term' }),
    /cannot be closed while academic workflows remain incomplete/,
  );
  assert.equal(lifecycleAttempted, false);
});

test('AcademicsService preloads bulk dependencies and preserves per-record audit actions', async () => {
  let dependencyLoads = 0;
  let lifecycleUpdates = 0;
  let auditWrites = 0;
  const service = new AcademicsService(
    { getStore: () => ({ tenant_id: 'tenant-a', user_id: 'user-1', role: 'principal' }) } as never,
    {
      getBulkSetupDependencies: async (_tenantId: string, entityType: string, ids: string[]) => {
        dependencyLoads += 1;
        return ids.map((id) => ({
          entity_type: entityType,
          entity_id: id,
          dependencies: [],
          total: 0,
          can_permanently_delete: true,
          recommendation: 'Safe to proceed.',
          outcome: 'safe_to_proceed',
          reversible: false,
        }));
      },
      getSetupDependencies: async () => {
        throw new Error('Bulk lifecycle must reuse the dependency preload.');
      },
      getSetupRecord: async (_tenantId: string, _entityType: string, id: string) => ({
        id,
        name: id,
        status: 'active',
        version: 1,
      }),
      applySetupLifecycle: async (_tenantId: string, _entityType: string, id: string) => {
        lifecycleUpdates += 1;
        return { id, status: 'inactive', version: 2 };
      },
      appendAuditLog: async () => {
        auditWrites += 1;
        return {};
      },
    } as never,
    {} as never,
  );

  const result = await service.bulkManageSetup('class-section', {
    ids: ['class-1', 'class-2'],
    action: 'deactivate',
    reason: 'Close unused classes',
  });

  assert.equal(dependencyLoads, 1);
  assert.equal(lifecycleUpdates, 2);
  assert.equal(auditWrites, 2);
  assert.equal(result.completed, 2);
  assert.equal(result.failed, 0);
  assert.equal(result.status, 'completed');
});

test('AcademicsRepository preserves HOD appointment history in the tenant transaction', async () => {
  const calls: Array<{ sql: string; params: unknown[] }> = [];
  const repository = new AcademicsRepository({
    executeWithTenant: async (
      tenantId: string,
      _userId: string | null,
      callback: (tx: { $queryRawUnsafe: (sql: string, ...params: unknown[]) => Promise<unknown[]> }) => Promise<unknown>,
    ) => {
      assert.equal(tenantId, 'tenant-a');
      return callback({
        $queryRawUnsafe: async (sql: string, ...params: unknown[]) => {
          calls.push({ sql, params });
          if (/INSERT INTO academics_department_hod_appointments/.test(sql)) return [{ id: 'hod-2', status: 'active' }];
          if (/UPDATE academics_departments/.test(sql)) return [{ id: 'department-1', head_of_department_user_id: 'teacher-2' }];
          return [];
        },
      });
    },
  } as never);

  const result = await repository.assignDepartmentHead('tenant-a', 'department-1', 'teacher-2', {
    actor_user_id: '11111111-1111-4111-8111-111111111111',
    effective_from: '2026-09-01',
    appointment_type: 'acting',
    reason: 'Acting appointment',
  });

  assert.equal(calls.length, 3);
  assert.match(calls[0]!.sql, /status = 'ended'/);
  assert.match(calls[1]!.sql, /ON CONFLICT \(tenant_id, department_id\) WHERE status = 'active'/);
  assert.match(calls[2]!.sql, /WHERE tenant_id = \$1 AND id::text = \$2/);
  assert.equal(result.appointment.id, 'hod-2');
  assert.equal(result.department.head_of_department_user_id, 'teacher-2');
});

test('AcademicsService creates a term-scoped calendar period inside the selected school dates', async () => {
  const calls: string[] = [];
  const service = new AcademicsService(
    { getStore: () => ({ tenant_id: 'tenant-a', user_id: '11111111-1111-4111-8111-111111111111', role: 'principal' }) } as never,
    {
      getSetupRecord: async (_tenantId: string, entityType: string) => entityType === 'academic-year'
        ? { id: 'year-1', starts_on: '2026-01-01', ends_on: '2026-12-31' }
        : { id: 'term-1', academic_year_id: 'year-1', starts_on: '2026-05-01', ends_on: '2026-08-31' },
      createAcademicCalendarPeriod: async (tenantId: string, input: Record<string, unknown>) => {
        assert.equal(tenantId, 'tenant-a');
        calls.push('create');
        return { id: 'period-1', version: 1, ...input };
      },
      appendAuditLog: async (input: Record<string, unknown>) => {
        assert.equal(input.tenant_id, 'tenant-a');
        calls.push('audit');
      },
    } as never,
    {} as never,
  );

  const result = await service.createAcademicCalendarPeriod({
    academic_year_id: 'year-1',
    academic_term_id: 'term-1',
    name: 'End-term examination',
    period_type: 'exam',
    starts_on: '2026-07-20',
    ends_on: '2026-08-07',
    reason: 'Publish the school examination calendar',
  });

  assert.equal(result.id, 'period-1');
  assert.deepEqual(calls, ['create', 'audit']);
});

test('AcademicsService rejects class subject offerings across different academic years', async () => {
  let createAttempted = false;
  const service = new AcademicsService(
    { getStore: () => ({ tenant_id: 'tenant-a', user_id: '11111111-1111-4111-8111-111111111111' }) } as never,
    {
      getSetupRecord: async (_tenantId: string, entityType: string) => {
        if (entityType === 'academic-term') return { id: 'term-1', academic_year_id: 'year-1' };
        if (entityType === 'class-section') return { id: 'class-1', academic_year_id: 'year-2' };
        return { id: 'subject-1' };
      },
      createClassSubjectAssignment: async () => {
        createAttempted = true;
        return { id: 'offering-1' };
      },
    } as never,
    {} as never,
  );

  await assert.rejects(
    () => service.createClassSubjectAssignment({
      academic_term_id: 'term-1',
      class_section_id: 'class-1',
      subject_id: 'subject-1',
      is_compulsory: true,
      is_examinable: true,
    }),
    /same academic year/,
  );
  assert.equal(createAttempted, false);
});

test('AcademicsService returns truthful partial success for teacher responsibility transfer', async () => {
  const calls: string[] = [];
  const service = new AcademicsService(
    { getStore: () => ({ tenant_id: 'tenant-a', user_id: 'user-1', role: 'deputy_principal' }) } as never,
    {
      findTeacherOptionByUserId: async () => ({ user_id: 'teacher-2' }),
      getSetupRecord: async () => ({ id: 'assignment-1', teacher_user_id: 'teacher-1' }),
      reassignTeacherAssignment: async () => ({
        previous: { id: 'assignment-1' },
        assignment: { id: 'assignment-2', version: 1 },
        transferred: { timetable_slots: 4 },
        manual_review: ['Pending approvals require review.'],
      }),
      appendAuditLog: async () => { calls.push('audit'); },
    } as never,
    {} as never,
    undefined,
    { createNotification: async () => { calls.push('notification'); } } as never,
  );

  const result = await service.reassignTeacher('assignment-1', {
    teacher_user_id: 'teacher-2',
    effective_from: '2026-09-01',
    reason: 'Teacher transfer',
    transfer_future_timetable: true,
    transfer_pending_approvals: true,
  });

  assert.equal(result.status, 'partial_success');
  assert.deepEqual(result.transferred, { timetable_slots: 4 });
  assert.deepEqual(calls, ['audit', 'notification']);
});
