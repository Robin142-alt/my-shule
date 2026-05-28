import assert from 'node:assert/strict';
import test from 'node:test';

import { AcademicsSchemaService } from './academics-schema.service';
import { AcademicsService } from './academics.service';

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
  assert.match(schemaSql, /CREATE TABLE IF NOT EXISTS teacher_subject_assignments/);
  assert.match(schemaSql, /CREATE TABLE IF NOT EXISTS academic_levels/);
  assert.match(schemaSql, /CREATE TABLE IF NOT EXISTS class_streams/);
  assert.match(schemaSql, /CREATE TABLE IF NOT EXISTS student_class_assignments/);
  assert.match(schemaSql, /ALTER TABLE subjects ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active'/);
  assert.match(schemaSql, /CBE/);
  assert.match(schemaSql, /ALTER TABLE teacher_subject_assignments FORCE ROW LEVEL SECURITY/);
  assert.match(schemaSql, /ALTER TABLE student_class_assignments FORCE ROW LEVEL SECURITY/);
  assert.match(schemaSql, /uq_teacher_subject_assignments_scope/);
  assert.match(schemaSql, /NULLIF\(current_setting\('app\.role', true\), ''\) = 'system'/);
  assert.doesNotMatch(schemaSql, /attendance/i);
});

test('AcademicsService assigns teachers to deterministic subject class term scopes', async () => {
  const calls: string[] = [];
  const service = new AcademicsService(
    { getStore: () => ({ tenant_id: 'tenant-a', user_id: 'user-1' }) } as never,
    {
      createTeacherAssignment: async (input: Record<string, unknown>) => {
        calls.push('assign');
        return { id: 'assignment-1', ...input };
      },
      appendAuditLog: async () => {
        calls.push('audit');
      },
    } as never,
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
