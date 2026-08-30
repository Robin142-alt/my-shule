import assert from 'node:assert/strict';
import test from 'node:test';

import { PATH_METADATA } from '@nestjs/common/constants';
import { ForbiddenException, NotFoundException, ValidationPipe } from '@nestjs/common';

import { PERMISSIONS_KEY } from '../../auth/auth.constants';
import { ParentPortalController } from '../../parent-portal/parent-portal.controller';
import { ExamsController } from './exams.controller';
import { GenerateReportCardBatchDto, ModerateExamMarksDto } from './dto/exams.dto';
import { ExamsRepository } from './repositories/exams.repository';
import { ExamsSchemaService } from './exams-schema.service';
import { ExamsService } from './exams.service';
import { ReportCardGenerationService } from './services/report-card-generation.service';
import {
  extractPersistedReportCardPayload,
  ReportCardTemplateService,
} from './services/report-card-template.service';
import { StudentController } from '../students/student-portal.controller';

test('ExamsSchemaService creates exam and report-card tables with tenant RLS', async () => {
  let schemaSql = '';
  const service = new ExamsSchemaService({
    runSchemaBootstrap: async (sql: string) => {
      schemaSql += sql;
    },
  } as never);

  await service.onModuleInit();

  assert.match(schemaSql, /CREATE TABLE IF NOT EXISTS exam_series/);
  assert.match(schemaSql, /ALTER TABLE exam_series\s+ADD COLUMN IF NOT EXISTS grading_system_id uuid/);
  assert.match(schemaSql, /CREATE TABLE IF NOT EXISTS exam_marks/);
  assert.match(schemaSql, /CREATE TABLE IF NOT EXISTS student_report_cards/);
  assert.match(schemaSql, /ALTER TABLE exam_marks FORCE ROW LEVEL SECURITY/);
  assert.match(schemaSql, /CREATE INDEX IF NOT EXISTS ix_exam_marks_subject_scope/);
  assert.match(
    schemaSql,
    /CREATE UNIQUE INDEX IF NOT EXISTS uq_exam_marks_scope[\s\S]*tenant_id, assessment_id, student_id/,
  );
  assert.match(schemaSql, /CREATE INDEX IF NOT EXISTS ix_student_report_cards_tenant_published/);
  assert.match(schemaSql, /CREATE UNIQUE INDEX IF NOT EXISTS ux_exam_invigilators_tenant_slot_staff/);
  assert.match(schemaSql, /CREATE UNIQUE INDEX IF NOT EXISTS ux_exam_attendance_tenant_slot_student/);
  assert.match(schemaSql, /locked_at timestamptz/);
  assert.match(schemaSql, /locked_by_user_id uuid/);
  assert.match(schemaSql, /last_action text/);
  assert.match(schemaSql, /return_reason text/);
  assert.doesNotMatch(schemaSql, /CREATE TABLE IF NOT EXISTS student_attendance/i);
});

test('ExamsSchemaService creates grading policy, mark version, report-card workflow, and batch tables', async () => {
  let schemaSql = '';
  const service = new ExamsSchemaService({
    runSchemaBootstrap: async (sql: string) => {
      schemaSql += sql;
    },
  } as never);

  await service.onModuleInit();

  assert.match(schemaSql, /CREATE TABLE IF NOT EXISTS exam_grading_policies/);
  assert.match(schemaSql, /CREATE TABLE IF NOT EXISTS exam_grading_policy_boundaries/);
  assert.match(schemaSql, /CREATE TABLE IF NOT EXISTS exam_subject_weightings/);
  assert.match(schemaSql, /CREATE TABLE IF NOT EXISTS exam_competency_outcomes/);
  assert.match(schemaSql, /CREATE TABLE IF NOT EXISTS exam_assessment_components/);
  assert.match(schemaSql, /CREATE TABLE IF NOT EXISTS exam_mark_import_batches/);
  assert.match(schemaSql, /CREATE TABLE IF NOT EXISTS exam_mark_import_batch_items/);
  assert.match(schemaSql, /CREATE TABLE IF NOT EXISTS exam_mark_versions/);
  assert.match(schemaSql, /CREATE TABLE IF NOT EXISTS exam_settings/);
  assert.match(schemaSql, /CREATE TABLE IF NOT EXISTS exam_settings_audit_logs/);
  assert.match(schemaSql, /approval_state text NOT NULL/);
  assert.match(schemaSql, /CREATE TABLE IF NOT EXISTS report_card_generation_batches/);
  assert.match(schemaSql, /CREATE TABLE IF NOT EXISTS exam_result_snapshots/);
  assert.match(schemaSql, /CREATE TABLE IF NOT EXISTS report_card_artifacts/);
  assert.match(schemaSql, /CREATE TABLE IF NOT EXISTS academic_interventions/);
  assert.match(schemaSql, /CREATE TABLE IF NOT EXISTS academic_intervention_updates/);
  assert.match(schemaSql, /draft_requested/);
  assert.match(schemaSql, /regeneration_required/);
  assert.match(schemaSql, /verification_code text/);
  assert.match(schemaSql, /ALTER TABLE report_card_generation_batches FORCE ROW LEVEL SECURITY/);
  assert.match(schemaSql, /ALTER TABLE exam_result_snapshots FORCE ROW LEVEL SECURITY/);
  assert.match(schemaSql, /CREATE POLICY exam_result_snapshots_tenant_policy ON exam_result_snapshots/);
  assert.match(schemaSql, /ALTER TABLE exam_settings FORCE ROW LEVEL SECURITY/);
  assert.match(schemaSql, /CREATE POLICY exam_settings_tenant_policy ON exam_settings/);
  assert.match(schemaSql, /CREATE POLICY exam_mark_import_batches_tenant_policy ON exam_mark_import_batches/);
  assert.match(schemaSql, /CREATE POLICY exam_mark_import_batch_items_tenant_policy ON exam_mark_import_batch_items/);
  assert.match(schemaSql, /ALTER TABLE academic_interventions FORCE ROW LEVEL SECURITY/);
  assert.match(schemaSql, /CREATE POLICY academic_interventions_tenant_policy ON academic_interventions/);
  assert.match(schemaSql, /CREATE POLICY academic_intervention_updates_tenant_policy ON academic_intervention_updates/);
});

test('ExamsSchemaService upgrades legacy Prisma exam tables before evolved columns are used', async () => {
  let schemaSql = '';
  const service = new ExamsSchemaService({
    runSchemaBootstrap: async (sql: string) => {
      schemaSql += sql;
    },
  } as never);

  await service.onModuleInit();

  const addPolicyStatus = schemaSql.indexOf(
    "ALTER TABLE exam_grading_policies\n      ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'draft'",
  );
  const updatePolicyStatus = schemaSql.indexOf('UPDATE exam_grading_policies\n      SET status');
  const addPolicySeries = schemaSql.indexOf(
    'ALTER TABLE exam_grading_policies\n      ADD COLUMN IF NOT EXISTS exam_series_id uuid',
  );
  const policyEffectiveIndex = schemaSql.indexOf('CREATE INDEX IF NOT EXISTS ix_exam_grading_policies_effective');

  assert.ok(addPolicyStatus >= 0 && addPolicyStatus < updatePolicyStatus);
  assert.ok(addPolicySeries >= 0 && addPolicySeries < policyEffectiveIndex);
  assert.match(schemaSql, /ALTER COLUMN exam_series_id DROP NOT NULL/);
  assert.match(schemaSql, /ALTER COLUMN name DROP NOT NULL/);
  assert.match(schemaSql, /ALTER COLUMN report_snapshot_id TYPE text USING report_snapshot_id::text/);
  assert.match(schemaSql, /ALTER COLUMN total_students TYPE integer USING/);
  assert.match(schemaSql, /ALTER COLUMN first_approver_user_id DROP NOT NULL/);
  assert.match(schemaSql, /ALTER COLUMN second_approver_user_id DROP NOT NULL/);
});

test('ExamsSchemaService repairs legacy exam setup write defaults and upsert keys', async () => {
  let schemaSql = '';
  const service = new ExamsSchemaService({
    runSchemaBootstrap: async (sql: string) => {
      schemaSql += sql;
    },
  } as never);

  await service.onModuleInit();

  assert.match(schemaSql, /ALTER TABLE exam_series[\s\S]*ALTER COLUMN created_at SET DEFAULT NOW\(\)/);
  assert.match(schemaSql, /ALTER TABLE exam_series[\s\S]*ALTER COLUMN updated_at SET DEFAULT NOW\(\)/);
  assert.match(schemaSql, /ALTER TABLE exam_assessments[\s\S]*ALTER COLUMN created_at SET DEFAULT NOW\(\)/);
  assert.match(schemaSql, /ALTER TABLE exam_assessments[\s\S]*ALTER COLUMN updated_at SET DEFAULT NOW\(\)/);
  assert.match(
    schemaSql,
    /CREATE UNIQUE INDEX IF NOT EXISTS ux_exam_assessments_scope[\s\S]*tenant_id, exam_series_id, subject_id, name/,
  );
  assert.match(
    schemaSql,
    /CREATE UNIQUE INDEX IF NOT EXISTS ux_exam_mark_entry_windows_scope[\s\S]*tenant_id, exam_series_id, subject_id, class_section_id/,
  );
});

test('ExamsService saves tenant-scoped settings with audit log', async () => {
  const calls: Array<{ name: string; input?: Record<string, unknown> }> = [];
  const service = new ExamsService(
    { getStore: () => ({ tenant_id: 'tenant-a', user_id: 'exam-manager-1', role: 'exams_officer', permissions: ['exams:write'] }) } as never,
    {
      getExamSettings: async (tenantId: string) => {
        calls.push({ name: 'get', input: { tenantId } });
        return {
          lock_after_deadline: true,
          grace_period_hours: 24,
          include_school_logo: true,
          include_principal_signature: true,
          include_official_stamp: true,
          block_results_for_fee_balances: true,
          fee_balance_block_threshold: 1000,
          show_student_rank_to_parents: true,
        };
      },
      upsertExamSettings: async (input: Record<string, unknown>) => {
        calls.push({ name: 'upsert', input });
        return { id: 'settings-1', ...input };
      },
      appendExamSettingsAuditLog: async (input: Record<string, unknown>) => {
        calls.push({ name: 'audit', input });
      },
    } as never,
  );

  const result = await service.updateSettings({
    lock_after_deadline: false,
    grace_period_hours: 12,
    fee_balance_block_threshold: 2500,
  });

  assert.equal(result.success, true);
  assert.equal(result.data.tenant_id, 'tenant-a');
  assert.equal(result.data.updated_by_user_id, 'exam-manager-1');
  assert.equal(result.data.lock_after_deadline, false);
  assert.equal(result.data.grace_period_hours, 12);
  assert.equal(result.data.fee_balance_block_threshold, 2500);
  assert.deepEqual(calls.map((call) => call.name), ['get', 'upsert', 'audit']);
  assert.equal(calls[2].input?.action, 'exam_settings.updated');
});

test('ExamsService rejects invalid exam settings payloads', async () => {
  const service = new ExamsService(
    { getStore: () => ({ tenant_id: 'tenant-a', user_id: 'exam-manager-1', role: 'exams_officer', permissions: ['exams:write'] }) } as never,
    {
      getExamSettings: async () => null,
    } as never,
  );

  await assert.rejects(
    () => service.updateSettings({ grace_period_hours: 200 }),
    /grace_period_hours must be an integer between 0 and 168/,
  );
});

test('ExamsRepository creates a series only from an active same-tenant term whose dates contain the exam', async () => {
  const calls: Array<{ tenantId: string; sql: string; params: unknown[] }> = [];
  const repository = new ExamsRepository({
    executeWithTenant: async (
      tenantId: string,
      _context: unknown,
      callback: (tx: { $queryRawUnsafe: (sql: string, ...params: unknown[]) => Promise<unknown[]> }) => Promise<unknown>,
    ) => callback({
      $queryRawUnsafe: async (sql: string, ...params: unknown[]) => {
        calls.push({ tenantId, sql, params });
        return [{ id: 'series-1', academic_term_id: params[1], tenant_id: params[0] }];
      },
    }),
  } as never);

  const series = await repository.createSeries({
    tenant_id: 'tenant-a',
    academic_term_id: '11111111-1111-4111-8111-111111111111',
    name: 'Term 2 End-Term',
    starts_on: '2026-08-24',
    ends_on: '2026-08-28',
    created_by_user_id: '22222222-2222-4222-8222-222222222222',
  });

  assert.equal(series.id, 'series-1');
  assert.equal(calls.length, 1);
  assert.equal(calls[0].tenantId, 'tenant-a');
  assert.deepEqual(calls[0].params, [
    'tenant-a',
    '11111111-1111-4111-8111-111111111111',
    'Term 2 End-Term',
    '2026-08-24',
    '2026-08-28',
    '22222222-2222-4222-8222-222222222222',
  ]);
  assert.match(calls[0].sql, /INSERT INTO exam_series/);
  assert.match(calls[0].sql, /SELECT \$1, term\.id::uuid/);
  assert.match(calls[0].sql, /term\.tenant_id::text = \$1::text/);
  assert.match(calls[0].sql, /term\.id::text = \$2::text/);
  assert.doesNotMatch(calls[0].sql, /term\.id = \$2::uuid/);
  assert.match(calls[0].sql, /lower\(COALESCE\(term\.status, 'active'\)\) = 'active'/);
  assert.match(calls[0].sql, /term\.archived_at IS NULL/);
  assert.match(calls[0].sql, /\$4::date >= term\.starts_on/);
  assert.match(calls[0].sql, /\$5::date <= term\.ends_on/);
});

test('ExamsService validates series dates and fails closed when the scoped academic term is unavailable', async () => {
  const persisted: Array<Record<string, unknown>> = [];
  const events: Array<Record<string, unknown>> = [];
  const service = new ExamsService(
    {
      getStore: () => ({
        tenant_id: 'tenant-a',
        user_id: '22222222-2222-4222-8222-222222222222',
        role: 'principal',
      }),
    } as never,
    {
      createSeries: async (input: Record<string, unknown>) => {
        persisted.push(input);
        if (input.academic_term_id === '33333333-3333-4333-8333-333333333333') {
          return undefined;
        }
        return { id: 'series-1', ...input };
      },
    } as never,
    undefined,
    undefined,
    {
      recordSchoolOperation: async (input: Record<string, unknown>) => events.push(input),
    } as never,
  );

  const created = await service.createSeries({
    academic_term_id: '11111111-1111-4111-8111-111111111111',
    name: 'Term 2 End-Term',
    starts_on: '2026-08-24',
    ends_on: '2026-08-28',
  });

  assert.equal(created.id, 'series-1');
  assert.deepEqual(persisted[0], {
    tenant_id: 'tenant-a',
    created_by_user_id: '22222222-2222-4222-8222-222222222222',
    academic_term_id: '11111111-1111-4111-8111-111111111111',
    name: 'Term 2 End-Term',
    starts_on: '2026-08-24',
    ends_on: '2026-08-28',
  });
  assert.equal((events[0].event as Record<string, unknown>).type, 'exam.series_created');

  await assert.rejects(
    () => service.createSeries({
      academic_term_id: '11111111-1111-4111-8111-111111111111',
      name: 'Invalid dates',
      starts_on: '2026-08-30',
      ends_on: '2026-08-20',
    }),
    /Exam end date must be on or after the start date/,
  );
  assert.equal(persisted.length, 1, 'invalid dates must be rejected before persistence');

  await assert.rejects(
    () => service.createSeries({
      academic_term_id: '33333333-3333-4333-8333-333333333333',
      name: 'Another school term',
      starts_on: '2026-08-24',
      ends_on: '2026-08-28',
    }),
    (error: unknown) => error instanceof NotFoundException
      && /not found in this school|dates fall outside/i.test(error.message),
  );
  assert.equal(events.length, 1, 'failed term scope checks must not emit a creation event');
});

test('ExamsService rejects student exam cases outside the current tenant scope', async () => {
  const service = new ExamsService(
    { getStore: () => ({ tenant_id: 'tenant-a', user_id: 'exam-manager-1', role: 'exams_officer', permissions: ['exams:write'] }) } as never,
    {
      findStudentCaseScope: async () => null,
      reportStudentCase: async () => {
        throw new Error('student case must not be persisted');
      },
    } as never,
  );

  await assert.rejects(
    () => service.reportStudentCase({
      exam_series_id: '00000000-0000-0000-0000-000000000010',
      student_id: '00000000-0000-0000-0000-000000000020',
      case_type: 'irregularity',
      description: 'Student was found with unauthorized examination notes.',
    }),
    /student or exam series was not found for this school/i,
  );
});

test('ExamsService records a tenant-scoped operation after creating a student exam case', async () => {
  const calls: Array<{ name: string; input: Record<string, unknown> }> = [];
  const service = new ExamsService(
    { getStore: () => ({ tenant_id: 'tenant-a', user_id: 'exam-manager-1', role: 'exams_officer', permissions: ['exams:write'] }) } as never,
    {
      findStudentCaseScope: async (input: Record<string, unknown>) => {
        calls.push({ name: 'scope', input });
        return { exam_series_name: 'Term 2 Exams', student_name: 'Amina Otieno' };
      },
      reportStudentCase: async (input: Record<string, unknown>) => {
        calls.push({ name: 'persist', input });
        return { id: 'case-1', status: 'pending', ...input };
      },
    } as never,
    undefined,
    undefined,
    {
      recordSchoolOperation: async (input: Record<string, unknown>) => {
        calls.push({ name: 'event', input });
      },
    } as never,
  );

  const result = await service.reportStudentCase({
    exam_series_id: '00000000-0000-0000-0000-000000000010',
    student_id: '00000000-0000-0000-0000-000000000020',
    case_type: 'irregularity',
    description: 'Student was found with unauthorized examination notes.',
  });

  assert.equal(result.success, true);
  assert.deepEqual(calls.map((call) => call.name), ['scope', 'persist', 'event']);
  assert.equal(calls[0].input.tenant_id, 'tenant-a');
  assert.equal(calls[1].input.actor_user_id, 'exam-manager-1');
  assert.equal((calls[2].input.event as Record<string, unknown>).type, 'exam.student_case_reported');
  assert.deepEqual(
    ((calls[2].input.notifications as Array<Record<string, unknown>>)[0].audienceRoles),
    ['principal', 'deputy-principal'],
  );
});

test('ExamsService routes student exam case guidance only within the current tenant', async () => {
  const tasks: Array<Record<string, unknown>> = [];
  const notifications: Array<Record<string, unknown>> = [];
  const service = new ExamsService(
    { getStore: () => ({ tenant_id: 'tenant-a', user_id: 'exam-manager-1', role: 'exams_officer', permissions: ['exams:write'] }) } as never,
    {
      findStudentCaseById: async () => ({ id: 'case-1', student_id: 'student-1', student_name: 'Amina Otieno', case_type: 'medical' }),
    } as never,
    undefined,
    undefined,
    undefined,
    undefined,
    {
      createTask: async (input: Record<string, unknown>) => tasks.push(input),
      createNotification: async (input: Record<string, unknown>) => notifications.push(input),
    } as never,
  );
  const result = await service.requestStudentCaseGuidance('case-1', 'Please review the medical evidence and advise on a deferred paper.');
  assert.equal(result.success, true);
  assert.equal(tasks[0].tenant_id, 'tenant-a');
  assert.equal(tasks[0].assigned_to_role, 'principal');
  assert.equal(notifications[0].recipient_role, 'principal');
});

test('ExamsService rejects invigilator assignments outside the current tenant scope', async () => {
  const service = new ExamsService(
    { getStore: () => ({ tenant_id: 'tenant-a', user_id: 'exam-manager-1', role: 'exams_officer', permissions: ['exams:write'] }) } as never,
    {
      findInvigilatorAssignmentScope: async () => null,
      assignInvigilator: async () => {
        throw new Error('invigilator assignment must not be persisted');
      },
    } as never,
  );

  await assert.rejects(
    () => service.assignInvigilator({
      timetable_slot_id: '00000000-0000-0000-0000-000000000030',
      staff_user_id: '00000000-0000-0000-0000-000000000040',
      role: 'invigilator',
    }),
    /timetable slot or active staff account was not found for this school/i,
  );
});

test('ExamsService rejects duplicate invigilator assignments', async () => {
  const service = new ExamsService(
    { getStore: () => ({ tenant_id: 'tenant-a', user_id: 'exam-manager-1', role: 'exams_officer', permissions: ['exams:write'] }) } as never,
    {
      findInvigilatorAssignmentScope: async () => ({
        staff_name: 'John Kamau',
        slot_label: '2026-07-10 08:00',
        existing_assignment_id: 'assignment-1',
      }),
      assignInvigilator: async () => {
        throw new Error('duplicate assignment must not be persisted');
      },
    } as never,
  );

  await assert.rejects(
    () => service.assignInvigilator({
      timetable_slot_id: '00000000-0000-0000-0000-000000000030',
      staff_user_id: '00000000-0000-0000-0000-000000000040',
      role: 'invigilator',
    }),
    /already assigned to this timetable slot/i,
  );
});

test('ExamsService refuses invigilator status updates outside the current tenant', async () => {
  const service = new ExamsService(
    { getStore: () => ({ tenant_id: 'tenant-a', user_id: 'exam-manager-1', role: 'exams_officer', permissions: ['exams:write'] }) } as never,
    {
      updateInvigilatorStatus: async () => null,
    } as never,
  );

  await assert.rejects(
    () => service.updateInvigilatorStatus('00000000-0000-0000-0000-000000000050', 'present'),
    /invigilator assignment was not found for this school/i,
  );
});

test('ExamsService sends an invigilation reminder only to the assigned tenant staff user', async () => {
  const notifications: Array<Record<string, unknown>> = [];
  const service = new ExamsService(
    { getStore: () => ({ tenant_id: 'tenant-a', user_id: 'exam-manager-1', role: 'exams_officer', permissions: ['exams:write'] }) } as never,
    {
      findInvigilatorAssignmentById: async () => ({
        id: 'assignment-1',
        staff_user_id: 'staff-user-1',
        staff_name: 'John Kamau',
        slot_label: '2026-07-10 08:00 Room 2',
      }),
    } as never,
    undefined,
    undefined,
    undefined,
    undefined,
    {
      createNotification: async (input: Record<string, unknown>) => {
        notifications.push(input);
        return { created: true };
      },
    } as never,
  );

  const result = await service.remindInvigilator('assignment-1');

  assert.equal(result.success, true);
  assert.equal(notifications.length, 1);
  assert.equal(notifications[0].tenant_id, 'tenant-a');
  assert.equal(notifications[0].recipient_user_id, 'staff-user-1');
});

test('ExamsService refuses invigilator replacements outside the current tenant scope', async () => {
  const service = new ExamsService(
    { getStore: () => ({ tenant_id: 'tenant-a', user_id: 'exam-manager-1', role: 'exams_officer', permissions: ['exams:write'] }) } as never,
    {
      replaceInvigilator: async () => null,
    } as never,
  );

  await assert.rejects(
    () => service.replaceInvigilator(
      '00000000-0000-0000-0000-000000000050',
      '00000000-0000-0000-0000-000000000060',
      'relief',
    ),
    /assignment or replacement staff account was not found for this school/i,
  );
});

test('ExamsService auto-assigns only tenant-scoped conflict-free invigilation candidates', async () => {
  let capturedTenant = '';
  const service = new ExamsService(
    { getStore: () => ({ tenant_id: 'tenant-a', user_id: 'exam-manager-1', role: 'exams_officer', permissions: ['exams:write'] }) } as never,
    {
      autoAssignInvigilators: async (tenantId: string) => {
        capturedTenant = tenantId;
        return [{ id: 'assignment-1' }, { id: 'assignment-2' }];
      },
    } as never,
  );
  const result = await service.autoAssignInvigilators();
  assert.equal(capturedTenant, 'tenant-a');
  assert.equal(result.data.assigned, 2);
});

test('ExamsService rejects exam attendance outside the current tenant scope', async () => {
  const service = new ExamsService(
    { getStore: () => ({ tenant_id: 'tenant-a', user_id: 'exam-manager-1', role: 'exams_officer', permissions: ['exams:write'] }) } as never,
    {
      findExamAttendanceScope: async () => null,
      markAttendance: async () => {
        throw new Error('exam attendance must not be persisted');
      },
    } as never,
  );

  await assert.rejects(
    () => service.markAttendance({
      timetable_slot_id: '00000000-0000-0000-0000-000000000030',
      student_id: '00000000-0000-0000-0000-000000000020',
      status: 'present',
      remarks: '',
    }),
    /student or timetable slot was not found for this school/i,
  );
});

test('ExamsService imports parsed attendance rows only within the current tenant', async () => {
  const calls: Array<Record<string, unknown>> = [];
  const service = new ExamsService(
    { getStore: () => ({ tenant_id: 'tenant-a', user_id: 'exam-manager-1', role: 'exams_officer', permissions: ['exams:write'] }) } as never,
    {
      bulkImportExamAttendance: async (input: Record<string, unknown>) => {
        calls.push(input);
        return [
          { row_number: 2, status: 'committed', attendance_id: 'attendance-1', errors: [] },
          { row_number: 3, status: 'invalid', attendance_id: null, errors: ['Student was not found for this school'] },
        ];
      },
    } as never,
  );

  const result = await service.importAttendance({
    originalname: 'exam-attendance.csv',
    mimetype: 'text/csv',
    size: 181,
    buffer: Buffer.from([
      'timetable_slot_id,admission_number,status,remarks',
      '00000000-0000-0000-0000-000000000030,ADM-001,present,On time',
      '00000000-0000-0000-0000-000000000030,ADM-404,absent,No notice',
    ].join('\n')),
  });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].tenant_id, 'tenant-a');
  assert.equal(calls[0].actor_user_id, 'exam-manager-1');
  assert.deepEqual(calls[0].rows, [
    {
      row_number: 2,
      timetable_slot_id: '00000000-0000-0000-0000-000000000030',
      admission_number: 'ADM-001',
      student_id: null,
      status: 'present',
      remarks: 'On time',
    },
    {
      row_number: 3,
      timetable_slot_id: '00000000-0000-0000-0000-000000000030',
      admission_number: 'ADM-404',
      student_id: null,
      status: 'absent',
      remarks: 'No notice',
    },
  ]);
  assert.equal(result.data.found, 2);
  assert.equal(result.data.committed, 1);
  assert.equal(result.data.failed, 1);
  assert.equal(result.data.rows[1].errors[0], 'Student was not found for this school');
});

test('ExamsService persists tenant-scoped result aggregates and rankings', async () => {
  const calls: Array<Record<string, unknown>> = [];
  const service = new ExamsService(
    { getStore: () => ({ tenant_id: 'tenant-a', user_id: 'exam-manager-1', role: 'exams_officer', permissions: ['exams:write'] }) } as never,
    {
      processResultBatch: async (input: Record<string, unknown>) => {
        calls.push(input);
        return { batch_id: input.batch_id, aggregate_count: 42, ranked_count: 42, processed_at: '2026-06-24T18:00:00.000Z' };
      },
    } as never,
  );

  const result = await service.processResultBatch('00000000-0000-0000-0000-000000000080', 'rankings');

  assert.deepEqual(calls[0], {
    tenant_id: 'tenant-a',
    actor_user_id: 'exam-manager-1',
    batch_id: '00000000-0000-0000-0000-000000000080',
    mode: 'rankings',
  });
  assert.equal(result.data.aggregate_count, 42);
  assert.equal(result.data.ranked_count, 42);
});

test('ExamsService refuses to clear result snapshots outside the current tenant', async () => {
  const service = new ExamsService(
    { getStore: () => ({ tenant_id: 'tenant-a', user_id: 'exam-manager-1', role: 'exams_officer', permissions: ['exams:write'] }) } as never,
    { clearResultProcessing: async () => null } as never,
  );
  await assert.rejects(
    () => service.clearResultProcessing('00000000-0000-0000-0000-000000000080'),
    /processing batch was not found for this school/i,
  );
});

test('ExamsService transitions report-card approval state only inside the current tenant', async () => {
  const calls: Array<Record<string, unknown>> = [];
  const service = new ExamsService(
    {
      getStore: () => ({
        tenant_id: 'tenant-a',
        user_id: 'principal-1',
        role: 'principal',
        permissions: ['exams:read', 'principal:write'],
      }),
    } as never,
    {
      transitionReportCard: async (input: Record<string, unknown>) => {
        calls.push(input);
        return { id: input.report_card_id, exam_series_id: 'series-1', student_id: 'student-1', status: 'published' };
      },
    } as never,
  );

  const result = await service.transitionReportCard('00000000-0000-0000-0000-000000000090', 'publish');

  assert.equal(result.data.status, 'published');
  assert.equal(calls[0].tenant_id, 'tenant-a');
  assert.equal(calls[0].actor_user_id, 'principal-1');
  assert.equal(calls[0].actor_role, 'principal');
  assert.equal(calls[0].action, 'publish');
});

test('ExamsService rejects report-card transitions outside the current tenant or state', async () => {
  const service = new ExamsService(
    {
      getStore: () => ({
        tenant_id: 'tenant-a',
        user_id: 'principal-1',
        role: 'principal',
        permissions: ['exams:read', 'principal:write'],
      }),
    } as never,
    { transitionReportCard: async () => null } as never,
  );
  await assert.rejects(
    () => service.transitionReportCard('00000000-0000-0000-0000-000000000090', 'publish'),
    /not found for this school or is not ready to publish/i,
  );
});

test('ExamsService enforces Exams Manager submission without Dean or Principal authority', async () => {
  const calls: Array<Record<string, unknown>> = [];
  const service = new ExamsService(
    {
      getStore: () => ({
        tenant_id: 'tenant-a',
        user_id: 'exam-manager-1',
        role: 'exams_manager',
        permissions: ['exams:read', 'exams:write', 'exams:review'],
      }),
    } as never,
    {
      transitionReportCard: async (input: Record<string, unknown>) => {
        calls.push(input);
        return {
          id: input.report_card_id,
          exam_series_id: 'series-1',
          student_id: 'student-1',
          status: 'under_review',
        };
      },
    } as never,
  );

  await service.transitionReportCard('report-card-1', 'submit');
  assert.equal(calls[0]?.action, 'submit');
  await assert.rejects(() => service.transitionReportCard('report-card-1', 'approve'), ForbiddenException);
  await assert.rejects(() => service.transitionReportCard('report-card-1', 'publish'), ForbiddenException);
});

test('ExamsService enforces Dean approval and correction return without publication authority', async () => {
  const calls: Array<Record<string, unknown>> = [];
  const service = new ExamsService(
    {
      getStore: () => ({
        tenant_id: 'tenant-a',
        user_id: 'dean-1',
        role: 'dean_academics',
        permissions: ['exams:read', 'exams:review', 'exams:approve'],
      }),
    } as never,
    {
      transitionReportCard: async (input: Record<string, unknown>) => {
        calls.push(input);
        return {
          id: input.report_card_id,
          exam_series_id: 'series-1',
          student_id: 'student-1',
          status: input.action === 'approve' ? 'approved' : 'draft_generated',
        };
      },
    } as never,
  );

  await service.transitionReportCard('report-card-1', 'approve');
  await service.transitionReportCard('report-card-2', 'recall', 'The Mathematics totals require correction');
  assert.equal(calls[1]?.reason, 'The Mathematics totals require correction');
  await assert.rejects(() => service.transitionReportCard('report-card-1', 'submit'), ForbiddenException);
  await assert.rejects(() => service.transitionReportCard('report-card-1', 'publish'), ForbiddenException);
});

test('ExamsService reserves publication and withdrawal for the Principal with a withdrawal reason', async () => {
  const calls: Array<Record<string, unknown>> = [];
  const service = new ExamsService(
    {
      getStore: () => ({
        tenant_id: 'tenant-a',
        user_id: 'principal-1',
        role: 'principal',
        permissions: ['principal:write', 'exams:read', 'exams:publish'],
      }),
    } as never,
    {
      transitionReportCard: async (input: Record<string, unknown>) => {
        calls.push(input);
        return {
          id: input.report_card_id,
          exam_series_id: 'series-1',
          student_id: 'student-1',
          status: input.action === 'publish' ? 'published' : 'withdrawn',
        };
      },
    } as never,
  );

  await service.transitionReportCard('report-card-1', 'publish');
  await assert.rejects(
    () => service.transitionReportCard('report-card-1', 'unpublish'),
    /withdrawal reason/i,
  );
  await service.transitionReportCard(
    'report-card-1',
    'unpublish',
    'Incorrect learner identity requires controlled withdrawal',
  );
  assert.equal(calls[1]?.reason, 'Incorrect learner identity requires controlled withdrawal');
  await assert.rejects(() => service.transitionReportCard('report-card-1', 'approve'), ForbiddenException);
});

test('ExamsService prevents HOD review capability from becoming report-card production authority', async () => {
  const service = new ExamsService(
    {
      getStore: () => ({
        tenant_id: 'tenant-a',
        user_id: 'hod-1',
        role: 'hod',
        permissions: ['exams:read', 'exams:review'],
      }),
    } as never,
    {
      transitionReportCard: async () => {
        throw new Error('transition should not be called');
      },
    } as never,
  );

  await assert.rejects(() => service.transitionReportCard('report-card-1', 'submit'), ForbiddenException);
  await assert.rejects(() => service.transitionReportCard('report-card-1', 'approve'), ForbiddenException);
  await assert.rejects(
    () => service.generateReportCard({ exam_series_id: 'series-1', student_id: 'student-1' }),
    ForbiddenException,
  );
});

test('ExamsService persists validated report-card comments inside the current tenant', async () => {
  const calls: Array<Record<string, unknown>> = [];
  const service = new ExamsService(
    { getStore: () => ({ tenant_id: 'tenant-a', user_id: 'exam-manager-1', role: 'exams_officer', permissions: ['exams:write'] }) } as never,
    {
      updateReportCardComments: async (input: Record<string, unknown>) => {
        calls.push(input);
        return { id: input.report_card_id, status: 'draft_generated', metadata: { class_teacher_comment: input.class_teacher_comment } };
      },
      appendReportCardAuditLog: async (input: Record<string, unknown>) => calls.push(input),
    } as never,
  );

  const result = await service.updateReportCardComments(
    '00000000-0000-0000-0000-000000000090',
    'Consistent progress across the term.',
    'A strong term. Maintain the same focus.',
  );

  assert.equal(result.success, true);
  assert.equal(calls[0].tenant_id, 'tenant-a');
  assert.equal(calls[0].actor_user_id, 'exam-manager-1');
  assert.equal(calls[1].action, 'report_card.comments_updated');
});

test('ExamsService transitions mark windows with tenant actor and correction reason', async () => {
  const calls: Array<Record<string, unknown>> = [];
  const service = new ExamsService(
    { getStore: () => ({ tenant_id: 'tenant-a', user_id: 'exam-manager-1', role: 'exams_officer', permissions: ['exams:write'] }) } as never,
    {
      transitionMarkWindow: async (input: Record<string, unknown>) => {
        calls.push(input);
        return { id: input.mark_window_id, status: 'open', workflow_status: 'returned', affected_marks: 14 };
      },
    } as never,
  );

  const result = await service.transitionMarkWindow(
    '00000000-0000-0000-0000-000000000095',
    'return',
    'Subject totals require correction before approval.',
  );

  assert.equal(calls[0].tenant_id, 'tenant-a');
  assert.equal(calls[0].actor_user_id, 'exam-manager-1');
  assert.equal(calls[0].action, 'return');
  assert.equal(calls[0].reason, 'Subject totals require correction before approval.');
  assert.equal(result.data.workflow_status, 'returned');
});

test('ExamsRepository opening a scheduled mark window makes it available immediately', async () => {
  const calls: Array<{ sql: string; params: unknown[] }> = [];
  const repository = new ExamsRepository({
    executeWithTenant: async function(_tenantId: string, _context: unknown, callback: (tx: unknown) => Promise<unknown>) {
      return callback({
        $queryRawUnsafe: async (sql: string, ...params: unknown[]) => {
          calls.push({ sql, params });
          return [{
            id: '00000000-0000-0000-0000-000000000095',
            status: 'open',
            workflow_status: 'opened',
            affected_marks: 0,
          }];
        },
      });
    },
  } as never);

  const result = await repository.transitionMarkWindow({
    tenant_id: 'tenant-a',
    actor_user_id: '00000000-0000-0000-0000-000000000801',
    mark_window_id: '00000000-0000-0000-0000-000000000095',
    action: 'open',
  });

  assert.equal(result.workflow_status, 'opened');
  assert.match(calls[0].sql, /opens_at = CASE WHEN \$4 = 'open' THEN LEAST\(mark_window\.opens_at, NOW\(\)\)/);
  assert.match(calls[0].sql, /WHERE mark_window\.tenant_id = \$1/);
  assert.deepEqual(calls[0].params, [
    'tenant-a',
    '00000000-0000-0000-0000-000000000801',
    '00000000-0000-0000-0000-000000000095',
    'open',
    null,
  ]);
});

test('ExamsRepository accepts only current mark-enabled teacher assignments', async () => {
  const calls: Array<{ sql: string; params: unknown[] }> = [];
  const repository = new ExamsRepository({
    executeWithTenant: async function(_tenantId: string, _context: unknown, callback: (tx: unknown) => Promise<unknown>) {
      return callback({
        $queryRawUnsafe: async (sql: string, ...params: unknown[]) => {
          calls.push({ sql, params });
          return [];
        },
      });
    },
  } as never);

  await repository.findTeacherAssignment({
    tenant_id: 'tenant-a',
    teacher_user_id: 'teacher-1',
    academic_term_id: 'term-1',
    class_section_id: 'class-1',
    subject_id: 'subject-1',
  });

  assert.match(calls[0].sql, /tenant_id = \$1/);
  assert.match(calls[0].sql, /teacher_user_id = \$2::text/);
  assert.match(calls[0].sql, /status = 'active'/);
  assert.match(calls[0].sql, /mark_entry_allowed = TRUE/);
  assert.match(calls[0].sql, /effective_from <= CURRENT_DATE/);
  assert.match(calls[0].sql, /effective_to IS NULL OR effective_to >= CURRENT_DATE/);
  assert.deepEqual(calls[0].params, [
    'tenant-a',
    'teacher-1',
    'term-1',
    'class-1',
    'subject-1',
  ]);
});

test('ExamsRepository treats an explicitly opened future mark window as open for validation', async () => {
  const calls: Array<{ sql: string; params: unknown[] }> = [];
  const repository = new ExamsRepository({
    executeWithTenant: async function(_tenantId: string, _context: unknown, callback: (tx: unknown) => Promise<unknown>) {
      return callback({
        $queryRawUnsafe: async (sql: string, ...params: unknown[]) => {
          calls.push({ sql, params });
          return [{ id: '00000000-0000-0000-0000-000000000401', status: 'open' }];
        },
      });
    },
  } as never);

  const result = await repository.findOpenMarkEntryWindow({
    tenant_id: 'tenant-a',
    exam_series_id: '00000000-0000-0000-0000-000000000101',
    academic_term_id: '00000000-0000-0000-0000-000000000103',
    class_section_id: '00000000-0000-0000-0000-000000000104',
    subject_id: '00000000-0000-0000-0000-000000000105',
  });

  assert.equal(result?.status, 'open');
  assert.match(calls[0].sql, /mark_window\.tenant_id = \$1/);
  assert.match(calls[0].sql, /mark_window\.opens_at <= NOW\(\) OR mark_window\.last_action = 'opened'/);
  assert.match(calls[0].sql, /mark_window\.closes_at >= NOW\(\)/);
  assert.deepEqual(calls[0].params, [
    'tenant-a',
    '00000000-0000-0000-0000-000000000101',
    '00000000-0000-0000-0000-000000000103',
    '00000000-0000-0000-0000-000000000104',
    '00000000-0000-0000-0000-000000000105',
  ]);
});

test('ExamsRepository saves and submits an explicitly opened future markbook within the current teacher scope', async () => {
  const calls: Array<{ sql: string; params: unknown[] }> = [];
  const repository = new ExamsRepository({
    executeWithTenant: async function(_tenantId: string, _actorUserId: string, callback: (tx: unknown) => Promise<unknown>) {
      let callIndex = 0;
      return callback({
        $queryRawUnsafe: async (sql: string, ...params: unknown[]) => {
          calls.push({ sql, params });
          callIndex += 1;
          if (callIndex === 1) return [{ id: '00000000-0000-0000-0000-000000000501' }];
          if (callIndex === 2) {
            return [{
              expected_count: 1,
              evidence_count: 1,
              foreign_owner_count: 0,
              immutable_count: 0,
              mark_ids: ['00000000-0000-0000-0000-000000000501'],
            }];
          }
          return [{ id: '00000000-0000-0000-0000-000000000501' }];
        },
      });
    },
  } as never);

  const result = await repository.saveTeacherMarkSheet({
    tenant_id: 'tenant-a',
    actor_user_id: '00000000-0000-0000-0000-000000000201',
    source_window_id: '00000000-0000-0000-0000-000000000401',
    submit: true,
    rows: [{
      row_number: 1,
      exam_series_id: '00000000-0000-0000-0000-000000000101',
      assessment_id: '00000000-0000-0000-0000-000000000102',
      academic_term_id: '00000000-0000-0000-0000-000000000103',
      class_section_id: '00000000-0000-0000-0000-000000000104',
      subject_id: '00000000-0000-0000-0000-000000000105',
      student_id: '00000000-0000-0000-0000-000000000106',
      score: 72,
      score_status: 'entered',
      remarks: null,
    }],
  });

  assert.equal(result.status, 'submitted');
  assert.equal(calls.length, 3);
  assert.match(calls[0].sql, /mark_window\.opens_at <= NOW\(\) OR mark_window\.last_action = 'opened'/);
  assert.match(calls[0].sql, /assignment\.mark_entry_allowed = TRUE/);
  assert.match(calls[0].sql, /assignment\.effective_from <= CURRENT_DATE/);
  assert.match(calls[0].sql, /assignment\.effective_to IS NULL OR assignment\.effective_to >= CURRENT_DATE/);
  assert.match(calls[0].sql, /student\.id::text = source\.student_id::text/);
  assert.match(calls[1].sql, /mark_window\.opens_at <= NOW\(\) OR mark_window\.last_action = 'opened'/);
  assert.match(calls[1].sql, /mark\.student_id::text = student\.id::text/);
  assert.doesNotMatch(calls[1].sql, /mark\.score_status IN \('not_assessed', 'incomplete'\)/);
  assert.match(calls[0].sql, /mark_window\.tenant_id = \$1/);
  assert.match(calls[1].sql, /mark_window\.tenant_id = \$1/);
});

test('ExamsService sends mark-window reminders only to assigned tenant teachers', async () => {
  const notifications: Array<Record<string, unknown>> = [];
  const service = new ExamsService(
    { getStore: () => ({ tenant_id: 'tenant-a', user_id: 'exam-manager-1', role: 'exams_officer', permissions: ['exams:write'] }) } as never,
    {
      findMarkWindowRecipients: async () => ({ id: 'window-1', class_name: 'Form 2 East', subject_name: 'Mathematics', closes_at: '2026-07-10', recipient_user_ids: ['teacher-1'] }),
    } as never,
    undefined,
    undefined,
    undefined,
    undefined,
    {
      createNotification: async (input: Record<string, unknown>) => notifications.push(input),
    } as never,
  );

  const result = await service.remindMarkWindow('window-1');
  assert.equal(result.data.sent, 1);
  assert.equal(notifications[0].tenant_id, 'tenant-a');
  assert.equal(notifications[0].recipient_user_id, 'teacher-1');
});

test('ExamsService submits selected marks only inside the current tenant', async () => {
  const calls: Array<Record<string, unknown>> = [];
  const service = new ExamsService(
    { getStore: () => ({ tenant_id: 'tenant-a', user_id: 'teacher-1', role: 'teacher', permissions: ['exams:enter-marks'] }) } as never,
    {
      submitMarks: async (input: Record<string, unknown>) => {
        calls.push(input);
        return { submitted_count: 2, mark_ids: input.mark_ids };
      },
    } as never,
  );

  const result = await service.submitMarks(['mark-1', 'mark-2']);

  assert.equal(result.success, true);
  assert.equal(calls[0].tenant_id, 'tenant-a');
  assert.equal(calls[0].actor_user_id, 'teacher-1');
  assert.deepEqual(calls[0].mark_ids, ['mark-1', 'mark-2']);
  assert.equal(calls[0].restrict_to_actor, true);
  assert.equal(result.data.submitted_count, 2);
});

test('ExamsService rejects teacher mark submission when no selected mark belongs to the actor', async () => {
  const calls: Array<Record<string, unknown>> = [];
  const service = new ExamsService(
    { getStore: () => ({ tenant_id: 'tenant-a', user_id: 'teacher-2', role: 'teacher', permissions: ['exams:enter-marks'] }) } as never,
    {
      submitMarks: async (input: Record<string, unknown>) => {
        calls.push(input);
        return { submitted_count: 0, mark_ids: [] };
      },
    } as never,
  );

  await assert.rejects(
    () => service.submitMarks(['mark-owned-by-teacher-1']),
    /No selected marks were available for this user to submit/i,
  );
  assert.equal(calls[0].restrict_to_actor, true);
});

test('ExamsService deletes subject weightings only inside the current tenant', async () => {
  const calls: Array<Record<string, unknown>> = [];
  const service = new ExamsService(
    { getStore: () => ({ tenant_id: 'tenant-a', user_id: 'exam-manager-1', role: 'exams_officer', permissions: ['exams:write'] }) } as never,
    {
      deleteSubjectWeighting: async (input: Record<string, unknown>) => {
        calls.push(input);
        return { id: input.weighting_id, subject_id: 'subject-1', weight: '1.0000', is_compulsory: true };
      },
    } as never,
  );

  const result = await service.deleteSubjectWeighting('00000000-0000-0000-0000-000000000096');

  assert.equal(result.success, true);
  assert.equal(calls[0].tenant_id, 'tenant-a');
  assert.equal(calls[0].actor_user_id, 'exam-manager-1');
  assert.equal(calls[0].weighting_id, '00000000-0000-0000-0000-000000000096');
  assert.equal(result.data.id, '00000000-0000-0000-0000-000000000096');
});

test('ExamsService updates timetable slots only inside the current tenant', async () => {
  const calls: Array<Record<string, unknown>> = [];
  const service = new ExamsService(
    { getStore: () => ({ tenant_id: 'tenant-a', user_id: 'exam-manager-1', role: 'exams_officer', permissions: ['exams:write'] }) } as never,
    {
      updateTimetableSlot: async (input: Record<string, unknown>) => {
        calls.push(input);
        return { id: input.timetable_slot_id, date: input.date, start_time: input.start_time, end_time: input.end_time, room_name: input.room_name, status: input.status };
      },
    } as never,
  );

  const result = await service.updateTimetableSlot('00000000-0000-0000-0000-000000000097', {
    date: '2026-07-15',
    start_time: '09:00',
    end_time: '10:30',
    room_name: 'Lab 2',
    status: 'scheduled',
  });

  assert.equal(result.success, true);
  assert.equal(calls[0].tenant_id, 'tenant-a');
  assert.equal(calls[0].actor_user_id, 'exam-manager-1');
  assert.equal(calls[0].timetable_slot_id, '00000000-0000-0000-0000-000000000097');
  assert.equal(calls[0].room_name, 'Lab 2');
  assert.equal(result.data.status, 'scheduled');
});

test('ExamsService manages grading policies only inside the current tenant', async () => {
  const calls: Array<Record<string, unknown>> = [];
  let policyStatus = 'draft';
  const service = new ExamsService(
    { getStore: () => ({ tenant_id: 'tenant-a', user_id: 'exam-manager-1', role: 'exams_officer', permissions: ['exams:write'] }) } as never,
    {
      createGradingPolicy: async (input: Record<string, unknown>) => {
        calls.push({ method: 'create', ...input });
        return { id: 'policy-1', name: input.name, status: 'draft' };
      },
      getGradingPolicy: async (input: Record<string, unknown>) => ({
        id: input.policy_id,
        name: 'Policy 1',
        status: policyStatus,
        effective_from: null,
      }),
      getGradingPolicyBoundaries: async () => [
        { id: 'boundary-low', label: 'Below expectations', min_score: 0, max_score: 49 },
        { id: 'boundary-high', label: 'Meets expectations', min_score: 50, max_score: 100 },
      ],
      transitionGradingPolicy: async (input: Record<string, unknown>) => {
        calls.push({ method: 'transition', ...input });
        policyStatus = String(input.status);
        return { id: input.policy_id, name: 'Policy 1', status: input.status };
      },
      deleteDraftGradingPolicy: async (input: Record<string, unknown>) => {
        calls.push({ method: 'delete', ...input });
        return { id: input.policy_id, name: 'Policy 1', status: 'draft' };
      },
    } as never,
  );

  await service.createGradingPolicy({ name: 'CBC Scale', reporting_mode: 'cbc_competency' });
  await service.transitionGradingPolicy('00000000-0000-0000-0000-000000000098', 'validated');
  await service.transitionGradingPolicy('00000000-0000-0000-0000-000000000098', 'active');
  const deleted = await service.deleteDraftGradingPolicy('00000000-0000-0000-0000-000000000099');

  assert.equal(calls[0].tenant_id, 'tenant-a');
  assert.equal(calls[0].actor_user_id, 'exam-manager-1');
  assert.equal(calls[0].name, 'CBC Scale');
  assert.equal(calls[1].tenant_id, 'tenant-a');
  assert.equal(calls[1].policy_id, '00000000-0000-0000-0000-000000000098');
  assert.equal(calls[1].status, 'validated');
  assert.equal(calls[2].status, 'active');
  assert.equal(calls[3].tenant_id, 'tenant-a');
  assert.equal(calls[3].policy_id, '00000000-0000-0000-0000-000000000099');
  assert.equal(deleted.success, true);
});

test('ExamsService manages assessment components only inside the current tenant', async () => {
  const calls: Array<Record<string, unknown>> = [];
  const service = new ExamsService(
    { getStore: () => ({ tenant_id: 'tenant-a', user_id: 'exam-manager-1', role: 'exams_officer', permissions: ['exams:write'] }) } as never,
    {
      createAssessmentComponent: async (input: Record<string, unknown>) => {
        calls.push({ method: 'create', ...input });
        return { id: 'component-1', ...input };
      },
      updateAssessmentComponent: async (input: Record<string, unknown>) => {
        calls.push({ method: 'update', ...input });
        return { id: input.component_id, ...input };
      },
      deleteAssessmentComponent: async (input: Record<string, unknown>) => {
        calls.push({ method: 'delete', ...input });
        return { id: input.component_id, component_name: 'Paper 1' };
      },
    } as never,
  );

  await service.createAssessmentComponent({
    assessment_id: '00000000-0000-0000-0000-000000000101',
    component_code: 'P1',
    component_name: 'Paper 1',
    max_score: 100,
    weight: 60,
  });
  await service.updateAssessmentComponent('00000000-0000-0000-0000-000000000102', {
    component_name: 'Paper 1 Theory',
    max_score: 80,
    weight: 55,
  });
  const deleted = await service.deleteAssessmentComponent('00000000-0000-0000-0000-000000000102');

  assert.equal(calls[0].tenant_id, 'tenant-a');
  assert.equal(calls[0].actor_user_id, 'exam-manager-1');
  assert.equal(calls[0].assessment_id, '00000000-0000-0000-0000-000000000101');
  assert.equal(calls[1].tenant_id, 'tenant-a');
  assert.equal(calls[1].component_id, '00000000-0000-0000-0000-000000000102');
  assert.equal(calls[2].tenant_id, 'tenant-a');
  assert.equal(deleted.success, true);
});

test('ExamsService refuses to create components for assessments outside the current tenant', async () => {
  const service = new ExamsService(
    { getStore: () => ({ tenant_id: 'tenant-a', user_id: 'exam-manager-1', role: 'exams_officer', permissions: ['exams:write'] }) } as never,
    { createAssessmentComponent: async () => null } as never,
  );

  await assert.rejects(
    () => service.createAssessmentComponent({
      assessment_id: '00000000-0000-0000-0000-000000000199',
      component_code: 'P1',
      component_name: 'Paper 1',
      max_score: 100,
      weight: 100,
    }),
    /assessment was not found for this school/i,
  );
});

test('ExamsService blocks exam publishing when tenant-scoped marks are missing', async () => {
  const calls: Array<Record<string, unknown>> = [];
  const service = new ExamsService(
    { getStore: () => ({ tenant_id: 'tenant-a', user_id: 'exam-manager-1', role: 'exams_officer', permissions: ['exams:approve'] }) } as never,
    {
      getExamReadinessStats: async (input: Record<string, unknown>) => {
        calls.push(input);
        return { unapproved_count: 0, missing_count: 7 };
      },
    } as never,
  );

  const readiness = await service.getExamReadiness('00000000-0000-0000-0000-000000000301');

  assert.equal(readiness.ready, false);
  assert.equal(readiness.missingCount, 7);
  assert.match(readiness.issues.join(' '), /7 marks are missing/i);
  assert.equal(calls[0].tenant_id, 'tenant-a');
  assert.equal(calls[0].exam_series_id, '00000000-0000-0000-0000-000000000301');
});

test('ExamsService prevents the Exams Manager from bypassing Principal series publication', async () => {
  let repositoryCalled = false;
  const service = new ExamsService(
    {
      getStore: () => ({
        tenant_id: 'tenant-a',
        user_id: 'exam-manager-1',
        role: 'exams_manager',
        permissions: ['exams:read', 'exams:write', 'exams:review'],
      }),
    } as never,
    {
      getExamReadinessStats: async () => {
        repositoryCalled = true;
        return { unapproved_count: 0, missing_count: 0 };
      },
      publishExamSeries: async () => {
        repositoryCalled = true;
        return null;
      },
    } as never,
  );

  await assert.rejects(
    () => service.publishExamSeries('00000000-0000-0000-0000-000000000311'),
    ForbiddenException,
  );
  assert.equal(repositoryCalled, false);
});

test('ExamsService refuses Principal series publication before report cards exist', async () => {
  const service = new ExamsService(
    {
      getStore: () => ({
        tenant_id: 'tenant-a',
        user_id: 'principal-1',
        role: 'principal',
        permissions: ['principal:write', 'exams:read', 'exams:publish'],
      }),
    } as never,
    {
      getExamReadinessStats: async () => ({ unapproved_count: 0, missing_count: 0 }),
      publishExamSeries: async () => ({
        total_count: 0,
        approved_count: 0,
        already_published_count: 0,
        blocked_count: 0,
        published_cards: [],
        published_marks_count: 0,
        series_published: false,
      }),
    } as never,
  );

  await assert.rejects(
    () => service.publishExamSeries('00000000-0000-0000-0000-000000000312'),
    /generate, submit, and approve report cards/i,
  );
});

test('ExamsService publishes a Dean-approved series as Principal and notifies school workflows', async () => {
  const repositoryCalls: Array<Record<string, unknown>> = [];
  const operations: Array<Record<string, unknown>> = [];
  const publishedEvents: Array<Record<string, unknown>> = [];
  const service = new ExamsService(
    {
      getStore: () => ({
        tenant_id: 'tenant-a',
        user_id: 'principal-1',
        role: 'principal',
        permissions: ['principal:write', 'exams:read', 'exams:publish'],
      }),
    } as never,
    {
      getExamReadinessStats: async () => ({ unapproved_count: 0, missing_count: 0 }),
      publishExamSeries: async (input: Record<string, unknown>) => {
        repositoryCalls.push(input);
        return {
          total_count: 2,
          approved_count: 2,
          already_published_count: 0,
          blocked_count: 0,
          published_cards: [
            { id: 'report-card-1', student_id: 'student-1' },
            { id: 'report-card-2', student_id: 'student-2' },
          ],
          published_marks_count: 8,
          audit_count: 2,
          series_published: true,
        };
      },
    } as never,
    undefined,
    undefined,
    {
      recordSchoolOperation: async (input: Record<string, unknown>) => {
        operations.push(input);
      },
    } as never,
    {
      publishReportCardPublished: async (input: Record<string, unknown>) => {
        publishedEvents.push(input);
      },
    } as never,
  );

  const result = await service.publishExamSeries('00000000-0000-0000-0000-000000000313');

  assert.deepEqual(repositoryCalls[0], {
    tenant_id: 'tenant-a',
    exam_series_id: '00000000-0000-0000-0000-000000000313',
    actor_user_id: 'principal-1',
    actor_role: 'principal',
  });
  assert.equal(result.published_report_cards_count, 2);
  assert.equal(result.published_marks_count, 8);
  assert.equal(operations.length, 1);
  assert.equal(publishedEvents.length, 2);
  assert.equal(publishedEvents[0]?.tenant_id, 'tenant-a');
});

test('ExamsService prevents the Exams Manager from withdrawing Principal-published results', async () => {
  let repositoryCalled = false;
  const service = new ExamsService(
    {
      getStore: () => ({
        tenant_id: 'tenant-a',
        user_id: 'exam-manager-1',
        role: 'exams_manager',
        permissions: ['exams:read', 'exams:write', 'exams:review'],
      }),
    } as never,
    {
      unpublishExamSeries: async () => {
        repositoryCalled = true;
        return null;
      },
    } as never,
  );

  await assert.rejects(
    () => service.unpublishExamSeries('00000000-0000-0000-0000-000000000314', 'Incorrect release'),
    ForbiddenException,
  );
  assert.equal(repositoryCalled, false);
});

test('ExamsService requires a reason before withdrawing published results', async () => {
  const service = new ExamsService(
    {
      getStore: () => ({
        tenant_id: 'tenant-a',
        user_id: 'principal-1',
        role: 'principal',
        permissions: ['exams:read', 'exams:publish'],
      }),
    } as never,
    {} as never,
  );

  await assert.rejects(
    () => service.unpublishExamSeries('00000000-0000-0000-0000-000000000315', '   '),
    /Withdrawal reason is required/i,
  );
});

test('ExamsService withdraws a published series as Principal and notifies school workflows', async () => {
  const repositoryCalls: Array<Record<string, unknown>> = [];
  const operations: Array<Record<string, unknown>> = [];
  const service = new ExamsService(
    {
      getStore: () => ({
        tenant_id: 'tenant-a',
        user_id: 'principal-1',
        role: 'principal',
        permissions: ['exams:read', 'exams:publish'],
      }),
    } as never,
    {
      unpublishExamSeries: async (input: Record<string, unknown>) => {
        repositoryCalls.push(input);
        return {
          total_count: 2,
          published_count: 2,
          withdrawn_cards: [
            { id: 'report-card-1', student_id: 'student-1' },
            { id: 'report-card-2', student_id: 'student-2' },
          ],
          relocked_marks_count: 8,
          audit_count: 2,
          series_withdrawn: true,
        };
      },
    } as never,
    undefined,
    undefined,
    {
      recordSchoolOperation: async (input: Record<string, unknown>) => {
        operations.push(input);
      },
    } as never,
  );

  const result = await service.unpublishExamSeries(
    '00000000-0000-0000-0000-000000000316',
    'Published before the final verification',
  );

  assert.deepEqual(repositoryCalls[0], {
    tenant_id: 'tenant-a',
    exam_series_id: '00000000-0000-0000-0000-000000000316',
    actor_user_id: 'principal-1',
    actor_role: 'principal',
    reason: 'Published before the final verification',
  });
  assert.equal(result.withdrawn_report_cards_count, 2);
  assert.equal(result.relocked_marks_count, 8);
  assert.equal(operations.length, 1);
  assert.equal((operations[0]?.event as Record<string, unknown>)?.type, 'exam.series_withdrawn');
});

test('ExamsService updates and deletes assessments only inside the current tenant', async () => {
  const calls: Array<Record<string, unknown>> = [];
  const service = new ExamsService(
    { getStore: () => ({ tenant_id: 'tenant-a', user_id: 'exam-manager-1', role: 'exams_officer', permissions: ['exams:write'] }) } as never,
    {
      updateAssessment: async (input: Record<string, unknown>) => {
        calls.push({ method: 'update', ...input });
        return { id: input.assessment_id, name: input.name, max_score: input.max_score, weight: input.weight };
      },
      deleteAssessment: async (input: Record<string, unknown>) => {
        calls.push({ method: 'delete', ...input });
        return { id: input.assessment_id, name: 'Paper 1', deleted_id: input.assessment_id, mark_count: 0, component_count: 0 };
      },
    } as never,
  );

  await service.updateAssessment('00000000-0000-0000-0000-000000000302', { name: 'Paper 1 Revised', max_score: 80, weight: 1 });
  const deleted = await service.deleteAssessment('00000000-0000-0000-0000-000000000302');

  assert.equal(calls[0].tenant_id, 'tenant-a');
  assert.equal(calls[0].actor_user_id, 'exam-manager-1');
  assert.equal(calls[0].assessment_id, '00000000-0000-0000-0000-000000000302');
  assert.equal(calls[1].tenant_id, 'tenant-a');
  assert.equal(deleted.success, true);
});

test('ExamsService manages grading policy boundaries only inside the current tenant', async () => {
  const calls: Array<Record<string, unknown>> = [];
  const service = new ExamsService(
    { getStore: () => ({ tenant_id: 'tenant-a', user_id: 'exam-manager-1', role: 'exams_officer', permissions: ['exams:write'] }) } as never,
    {
      getGradingPolicy: async (input: Record<string, unknown>) => ({
        id: input.policy_id,
        status: 'draft',
      }),
      getGradingPolicyBoundary: async (input: Record<string, unknown>) => ({
        id: input.boundary_id,
        grading_policy_id: '00000000-0000-0000-0000-000000000303',
        policy_status: 'draft',
        label: 'A',
        min_score: 80,
        max_score: 100,
      }),
      createGradingPolicyBoundary: async (input: Record<string, unknown>) => { calls.push({ method: 'create', ...input }); return { id: 'boundary-1', ...input }; },
      updateGradingPolicyBoundary: async (input: Record<string, unknown>) => { calls.push({ method: 'update', ...input }); return { id: input.boundary_id, ...input }; },
      deleteGradingPolicyBoundary: async (input: Record<string, unknown>) => { calls.push({ method: 'delete', ...input }); return { id: input.boundary_id, label: 'A' }; },
    } as never,
  );

  await service.createGradingPolicyBoundary('00000000-0000-0000-0000-000000000303', { label: 'A', min_score: 80, max_score: 100, points: 4, descriptor: 'Exceeds expectations' });
  await service.updateGradingPolicyBoundary('00000000-0000-0000-0000-000000000304', { label: 'A1', min_score: 85, max_score: 100 });
  const deleted = await service.deleteGradingPolicyBoundary('00000000-0000-0000-0000-000000000304');

  assert.equal(calls[0].tenant_id, 'tenant-a');
  assert.equal(calls[0].actor_user_id, 'exam-manager-1');
  assert.equal(calls[0].policy_id, '00000000-0000-0000-0000-000000000303');
  assert.equal(calls[1].boundary_id, '00000000-0000-0000-0000-000000000304');
  assert.equal(calls[2].tenant_id, 'tenant-a');
  assert.equal(deleted.success, true);
});

test('ExamsService sends absence alerts only to linked guardians in the current tenant', async () => {
  const notifications: Array<Record<string, unknown>> = [];
  const service = new ExamsService(
    { getStore: () => ({ tenant_id: 'tenant-a', user_id: 'exam-manager-1', role: 'exams_officer', permissions: ['exams:write'] }) } as never,
    {
      listExamAbsenceGuardianRecipients: async () => [{
        attendance_id: 'attendance-1',
        guardian_user_id: 'guardian-user-1',
        student_name: 'Amina Otieno',
        slot_label: '2026-07-10 08:00 Room 2',
      }],
    } as never,
    undefined,
    undefined,
    undefined,
    undefined,
    {
      createNotification: async (input: Record<string, unknown>) => {
        notifications.push(input);
        return { created: true };
      },
    } as never,
  );

  const result = await service.sendExamAbsenceAlerts(['attendance-1']);

  assert.equal(result.success, true);
  assert.equal(result.data.sent, 1);
  assert.equal(notifications[0].tenant_id, 'tenant-a');
  assert.equal(notifications[0].recipient_user_id, 'guardian-user-1');
});

test('ExamsService refuses attendance locks outside the current tenant', async () => {
  const service = new ExamsService(
    { getStore: () => ({ tenant_id: 'tenant-a', user_id: 'exam-manager-1', role: 'exams_officer', permissions: ['exams:write'] }) } as never,
    { lockExamAttendance: async () => null } as never,
  );

  await assert.rejects(
    () => service.lockExamAttendance('00000000-0000-0000-0000-000000000070'),
    /attendance record was not found for this school/i,
  );
});

test('ExamsService refuses normal updates to locked exam attendance', async () => {
  const service = new ExamsService(
    { getStore: () => ({ tenant_id: 'tenant-a', user_id: 'exam-manager-1', role: 'exams_officer', permissions: ['exams:write'] }) } as never,
    {
      findExamAttendanceScope: async () => ({ student_name: 'Amina Otieno', slot_label: 'Term exam' }),
      markAttendance: async () => null,
    } as never,
  );
  await assert.rejects(
    () => service.markAttendance({ timetable_slot_id: 'slot-1', student_id: 'student-1', status: 'present' }),
    /attendance record is locked/i,
  );
});

test('ExamsService refuses attendance special cases outside the current tenant', async () => {
  const service = new ExamsService(
    { getStore: () => ({ tenant_id: 'tenant-a', user_id: 'exam-manager-1', role: 'exams_officer', permissions: ['exams:write'] }) } as never,
    { createAttendanceSpecialCase: async () => null } as never,
  );
  await assert.rejects(
    () => service.createAttendanceSpecialCase(
      '00000000-0000-0000-0000-000000000070',
      'medical',
      'Learner presented a medical note after missing the paper.',
    ),
    /attendance record was not found for this school/i,
  );
});

test('ExamsService allows an assigned teacher to enter subject-scoped marks with audit', async () => {
  const calls: string[] = [];
  const service = new ExamsService(
    { getStore: () => ({ tenant_id: 'tenant-a', user_id: 'teacher-1', role: 'teacher', permissions: ['exams:enter-marks'] }) } as never,
    {
      findTeacherAssignment: async () => ({ id: 'assignment-1' }),
      findSeriesState: async () => ({ status: 'draft', locked_at: null, published_at: null }),
      findOpenMarkEntryWindow: async () => ({ id: 'window-1', status: 'open' }),
      upsertMark: async (input: Record<string, unknown>) => {
        calls.push('mark');
        return { id: 'mark-1', score: input.score };
      },
      appendMarkAuditLog: async () => {
        calls.push('audit');
      },
    } as never,
  );

  const mark = await service.enterMark({
    exam_series_id: 'series-1',
    assessment_id: 'assessment-1',
    academic_term_id: 'term-1',
    class_section_id: 'class-1',
    subject_id: 'subject-1',
    student_id: 'student-1',
    score: 84,
  });

  assert.equal(mark.score, 84);
  assert.deepEqual(calls, ['mark', 'audit']);
});

test('ExamsService atomically saves and submits a teacher mark sheet with explicit evidence statuses', async () => {
  const calls: Array<{ name: string; input: Record<string, unknown> }> = [];
  const service = new ExamsService(
    { getStore: () => ({ tenant_id: 'tenant-a', user_id: 'teacher-1', role: 'teacher', permissions: ['exams:enter-marks'] }) } as never,
    {
      findTeacherAssignment: async () => ({ id: 'assignment-1' }),
      findSeriesState: async () => ({ status: 'draft', locked_at: null, published_at: null }),
      findOpenMarkEntryWindow: async () => ({ id: 'window-1', status: 'open' }),
      findStudentMarkEligibility: async () => ({ status: 'active' }),
      saveTeacherMarkSheet: async (input: Record<string, unknown>) => {
        calls.push({ name: 'save', input });
        return {
          saved_count: 2,
          submitted_count: 2,
          newly_submitted_count: 2,
          mark_ids: ['mark-1', 'mark-2'],
          status: 'submitted',
        };
      },
    } as never,
    undefined,
    undefined,
    {
      recordSchoolOperation: async (input: Record<string, unknown>) => {
        calls.push({ name: 'event', input });
      },
    } as never,
  );

  const result = await service.saveTeacherMarkEntries(
    [
      {
        row_number: 1,
        exam_series_id: 'series-1',
        assessment_id: 'assessment-1',
        academic_term_id: 'term-1',
        class_section_id: 'class-1',
        subject_id: 'subject-1',
        student_id: 'student-1',
        score: 87,
        score_status: 'entered',
      },
      {
        row_number: 2,
        exam_series_id: 'series-1',
        assessment_id: 'assessment-1',
        academic_term_id: 'term-1',
        class_section_id: 'class-1',
        subject_id: 'subject-1',
        student_id: 'student-2',
        score: null,
        score_status: 'absent',
        remarks: 'Absent with guardian notification recorded',
      },
    ],
    'window-1',
    true,
  );

  assert.equal(result.success, true);
  assert.equal(result.message, 'Marks submitted for review');
  assert.deepEqual(calls.map((call) => call.name), ['save', 'event']);
  assert.deepEqual(calls[0].input, {
    tenant_id: 'tenant-a',
    actor_user_id: 'teacher-1',
    source_window_id: 'window-1',
    submit: true,
    rows: [
      {
        row_number: 1,
        exam_series_id: 'series-1',
        assessment_id: 'assessment-1',
        academic_term_id: 'term-1',
        class_section_id: 'class-1',
        subject_id: 'subject-1',
        student_id: 'student-1',
        score: 87,
        score_status: 'entered',
        remarks: null,
      },
      {
        row_number: 2,
        exam_series_id: 'series-1',
        assessment_id: 'assessment-1',
        academic_term_id: 'term-1',
        class_section_id: 'class-1',
        subject_id: 'subject-1',
        student_id: 'student-2',
        score: null,
        score_status: 'absent',
        remarks: 'Absent with guardian notification recorded',
      },
    ],
  });
  assert.equal(
    ((calls[1].input.event as Record<string, unknown>).type),
    'exam.marks_submitted',
  );
});

test('ExamsService rejects a teacher mark sheet when a learner is outside the active class-subject enrollment', async () => {
  let persisted = false;
  const service = new ExamsService(
    { getStore: () => ({ tenant_id: 'tenant-a', user_id: 'teacher-1', role: 'teacher', permissions: ['exams:enter-marks'] }) } as never,
    {
      findTeacherAssignment: async () => ({ id: 'assignment-1' }),
      findSeriesState: async () => ({ status: 'draft', locked_at: null, published_at: null }),
      findOpenMarkEntryWindow: async () => ({ id: 'window-1', status: 'open' }),
      findStudentMarkEligibility: async () => null,
      saveTeacherMarkSheet: async () => {
        persisted = true;
        return {};
      },
    } as never,
  );

  await assert.rejects(
    () => service.saveTeacherMarkEntries(
      [{
        row_number: 1,
        exam_series_id: 'series-1',
        assessment_id: 'assessment-1',
        academic_term_id: 'term-1',
        class_section_id: 'class-1',
        subject_id: 'subject-1',
        student_id: 'student-outside-scope',
        score: null,
        score_status: 'absent',
      }],
      'window-1',
    ),
    (error: unknown) => {
      const response = (error as { getResponse?: () => unknown }).getResponse?.() as {
        message?: string;
        errors?: Array<{ message?: string }>;
      };
      assert.equal(response.message, 'Mark sheet contains invalid learner entries');
      assert.match(response.errors?.[0]?.message ?? '', /not actively enrolled/i);
      return true;
    },
  );
  assert.equal(persisted, false);
});

test('ExamsService blocks teacher mark entry until a matching mark-entry window is open', async () => {
  const service = new ExamsService(
    { getStore: () => ({ tenant_id: 'tenant-a', user_id: 'teacher-1', role: 'teacher', permissions: ['exams:enter-marks'] }) } as never,
    {
      findTeacherAssignment: async () => ({ id: 'assignment-1' }),
      findSeriesState: async () => ({ status: 'draft', locked_at: null, published_at: null }),
      findOpenMarkEntryWindow: async () => null,
      upsertMark: async () => {
        throw new Error('marks must not be saved before the mark-entry window opens');
      },
    } as never,
  );

  await assert.rejects(
    () =>
      service.enterMark({
        exam_series_id: 'series-1',
        assessment_id: 'assessment-1',
        academic_term_id: 'term-1',
        class_section_id: 'class-1',
        subject_id: 'subject-1',
        student_id: 'student-1',
        score: 84,
      }),
    /mark-entry window is not open/i,
  );
});

test('ExamsService lets an assigned teacher lock a live mark sheet for approval', async () => {
  const calls: Array<{ name: string; input: Record<string, unknown> }> = [];
  const service = new ExamsService(
    { getStore: () => ({ tenant_id: 'tenant-a', user_id: 'teacher-1', role: 'teacher', permissions: ['exams:enter-marks'] }) } as never,
    {
      listMarkSheets: async (input: Record<string, unknown>) => {
        calls.push({ name: 'listMarkSheets', input });
        return [{ id: 'window-1', status: 'open' }];
      },
      lockMarkSheet: async (input: Record<string, unknown>) => {
        calls.push({ name: 'lockMarkSheet', input });
        return { id: input.mark_sheet_id, status: 'closed' };
      },
    } as never,
  );

  const locked = await service.lockMarkSheet('window-1');

  assert.equal(locked.status, 'closed');
  assert.deepEqual(calls, [
    {
      name: 'listMarkSheets',
      input: {
        tenant_id: 'tenant-a',
        teacher_user_id: 'teacher-1',
      },
    },
    {
      name: 'lockMarkSheet',
      input: {
        tenant_id: 'tenant-a',
        mark_sheet_id: 'window-1',
        actor_user_id: 'teacher-1',
      },
    },
  ]);
});

test('ExamsService enforces assessment maximum score before mark entry', async () => {
  const service = new ExamsService(
    { getStore: () => ({ tenant_id: 'tenant-a', user_id: 'teacher-1', role: 'teacher', permissions: ['exams:enter-marks'] }) } as never,
    {
      findTeacherAssignment: async () => ({ id: 'assignment-1' }),
      findSeriesState: async () => ({ status: 'draft', locked_at: null, published_at: null }),
      findOpenMarkEntryWindow: async () => ({ id: 'window-1', status: 'open' }),
      findAssessmentScope: async () => ({
        id: 'assessment-1',
        exam_series_id: 'series-1',
        academic_term_id: 'term-1',
        class_section_id: 'class-1',
        subject_id: 'subject-1',
        max_score: 80,
      }),
      upsertMark: async () => {
        throw new Error('over-maximum marks must not be saved');
      },
      appendMarkAuditLog: async () => undefined,
    } as never,
  );

  await assert.rejects(
    () =>
      service.enterMark({
        exam_series_id: 'series-1',
        assessment_id: 'assessment-1',
        academic_term_id: 'term-1',
        class_section_id: 'class-1',
        subject_id: 'subject-1',
        student_id: 'student-1',
        score: 84,
      }),
    /maximum score/,
  );
});

test('ExamsService rejects marks outside configured grade boundaries before persistence', async () => {
  const service = new ExamsService(
    { getStore: () => ({ tenant_id: 'tenant-a', user_id: 'teacher-1', role: 'teacher', permissions: ['exams:enter-marks'] }) } as never,
    {
      findTeacherAssignment: async () => ({ id: 'assignment-1' }),
      findSeriesState: async () => ({ status: 'draft', locked_at: null, published_at: null }),
      findOpenMarkEntryWindow: async () => ({ id: 'window-1', status: 'open' }),
      findAssessmentScope: async () => ({
        id: 'assessment-1',
        exam_series_id: 'series-1',
        academic_term_id: 'term-1',
        class_section_id: 'class-1',
        subject_id: 'subject-1',
        max_score: 100,
      }),
      findGradeBoundaryForScore: async () => ({
        configured_count: 4,
        match_count: 0,
        boundary: null,
      }),
      upsertMark: async () => {
        throw new Error('unexpected persistence');
      },
      appendMarkAuditLog: async () => undefined,
    } as never,
  );

  await assert.rejects(
    () =>
      service.enterMark({
        exam_series_id: 'series-1',
        assessment_id: 'assessment-1',
        academic_term_id: 'term-1',
        class_section_id: 'class-1',
        subject_id: 'subject-1',
        student_id: 'student-1',
        score: 47,
      }),
    /grade boundaries/,
  );
});

test('ExamsService rejects marks matching overlapping grade boundaries', async () => {
  const service = new ExamsService(
    { getStore: () => ({ tenant_id: 'tenant-a', user_id: 'teacher-1', role: 'teacher', permissions: ['exams:enter-marks'] }) } as never,
    {
      findTeacherAssignment: async () => ({ id: 'assignment-1' }),
      findSeriesState: async () => ({ status: 'draft', locked_at: null, published_at: null }),
      findOpenMarkEntryWindow: async () => ({ id: 'window-1', status: 'open' }),
      findAssessmentScope: async () => ({
        id: 'assessment-1',
        exam_series_id: 'series-1',
        academic_term_id: 'term-1',
        class_section_id: 'class-1',
        subject_id: 'subject-1',
        max_score: 100,
      }),
      findGradeBoundaryForScore: async () => ({
        configured_count: 5,
        match_count: 2,
        boundary: { label: 'A' },
      }),
      upsertMark: async () => {
        throw new Error('marks matching overlapping grade boundaries must not be saved');
      },
      appendMarkAuditLog: async () => undefined,
    } as never,
  );

  await assert.rejects(
    () =>
      service.enterMark({
        exam_series_id: 'series-1',
        assessment_id: 'assessment-1',
        academic_term_id: 'term-1',
        class_section_id: 'class-1',
        subject_id: 'subject-1',
        student_id: 'student-1',
        score: 76,
      }),
    /multiple grade boundaries/,
  );
});

test('ExamsService rejects teacher mark entry outside assigned subject scope', async () => {
  const service = new ExamsService(
    { getStore: () => ({ tenant_id: 'tenant-a', user_id: 'teacher-1', role: 'teacher', permissions: ['exams:enter-marks'] }) } as never,
    {
      findTeacherAssignment: async () => null,
      upsertMark: async () => {
        throw new Error('unassigned marks must not be saved');
      },
    } as never,
  );

  await assert.rejects(
    () =>
      service.enterMark({
        exam_series_id: 'series-1',
        assessment_id: 'assessment-1',
        academic_term_id: 'term-1',
        class_section_id: 'class-1',
        subject_id: 'subject-2',
        student_id: 'student-1',
        score: 84,
      }),
    ForbiddenException,
  );
});

test('ExamsService blocks regular mark mutation after lock and allows audited officer correction', async () => {
  const teacherService = new ExamsService(
    { getStore: () => ({ tenant_id: 'tenant-a', user_id: 'teacher-1', role: 'teacher', permissions: ['exams:enter-marks'] }) } as never,
    {
      findTeacherAssignment: async () => ({ id: 'assignment-1' }),
      findSeriesState: async () => ({ status: 'locked', locked_at: '2026-05-14T08:00:00.000Z', published_at: null }),
    } as never,
  );

  await assert.rejects(
    () =>
      teacherService.enterMark({
        exam_series_id: 'series-1',
        assessment_id: 'assessment-1',
        academic_term_id: 'term-1',
        class_section_id: 'class-1',
        subject_id: 'subject-1',
        student_id: 'student-1',
        score: 86,
      }),
    /locked/,
  );

  const calls: string[] = [];
  const officerService = new ExamsService(
    { getStore: () => ({ tenant_id: 'tenant-a', user_id: 'officer-1', role: 'admin', permissions: ['exams:approve'] }) } as never,
    {
      findExistingMark: async () => ({ id: 'mark-1', score: 84 }),
      correctLockedMark: async () => {
        calls.push('correct');
        return { id: 'mark-1', score: 86 };
      },
      appendMarkAuditLog: async () => {
        calls.push('audit');
      },
    } as never,
  );

  const corrected = await officerService.correctLockedMark({
    mark_id: 'mark-1',
    score: 86,
    reason: 'HOD-approved correction',
  });

  assert.equal(corrected.score, 86);
  assert.deepEqual(calls, ['correct', 'audit']);
});

test('ExamsService requires dual approval and marks report-card regeneration after published corrections', async () => {
  const calls: Array<{ name: string; input?: Record<string, unknown> }> = [];
  const officerService = new ExamsService(
    { getStore: () => ({ tenant_id: 'tenant-a', user_id: 'officer-1', role: 'admin', permissions: ['exams:approve'] }) } as never,
    {
      findExistingMark: async () => ({
        id: 'mark-1',
        score: 84,
        exam_series_id: 'series-1',
        assessment_id: 'assessment-1',
        student_id: 'student-1',
      }),
      findPublishedReportCardsForMark: async () => [
        {
          id: 'report-card-1',
          status: 'published',
        },
      ],
      correctLockedMark: async (input: Record<string, unknown>) => {
        calls.push({ name: 'correct', input });
        return { id: 'mark-1', score: 86 };
      },
      createMarkVersion: async (input: Record<string, unknown>) => {
        calls.push({ name: 'version', input });
        return { id: 'mark-version-1' };
      },
      markReportCardsRegenerationRequired: async (input: Record<string, unknown>) => {
        calls.push({ name: 'regeneration', input });
      },
      appendMarkAuditLog: async () => {
        calls.push({ name: 'audit' });
      },
    } as never,
  );

  await assert.rejects(
    () =>
      (officerService as unknown as {
        correctLockedMark: (dto: Record<string, unknown>) => Promise<Record<string, unknown>>;
      }).correctLockedMark({
        mark_id: 'mark-1',
        score: 86,
        reason: 'Published result correction',
        first_approver_user_id: 'officer-1',
      }),
    /dual approval/,
  );

  const corrected = await (officerService as unknown as {
    correctLockedMark: (dto: Record<string, unknown>) => Promise<Record<string, unknown>>;
  }).correctLockedMark({
    mark_id: 'mark-1',
    score: 86,
    reason: 'Published result correction',
    first_approver_user_id: 'officer-1',
    second_approver_user_id: 'principal-1',
  });

  assert.equal(corrected.score, 86);
  assert.deepEqual(calls.map((call) => call.name), ['correct', 'version', 'regeneration', 'audit']);
  assert.equal(calls[1]?.input?.approval_state, 'dual_approved');
  assert.equal(calls[2]?.input?.status, 'regeneration_required');
});

test('ExamsService publishes approved report cards through the atomic lifecycle transition', async () => {
  const calls: Array<{ name: string; input?: Record<string, unknown> }> = [];
  const service = new ExamsService(
    { getStore: () => ({ tenant_id: 'tenant-a', user_id: 'officer-1', role: 'admin', permissions: ['exams:approve'] }) } as never,
    {
      findGeneratedReportCardForPublication: async () => {
        calls.push({ name: 'lookup' });
        return {
          id: 'report-card-1',
          report_snapshot_id: 'report-snapshot:tenant-a:exams:term-2',
          status: 'approved',
        };
      },
      transitionReportCard: async () => {
        calls.push({ name: 'transition' });
        return {
          id: 'report-card-1',
          report_snapshot_id: 'report-snapshot:tenant-a:exams:term-2',
          status: 'published',
        };
      },
    } as never,
  );

  const reportCard = await service.publishReportCard({
    exam_series_id: 'series-1',
    student_id: 'student-1',
    report_snapshot_id: 'report-snapshot:tenant-a:exams:term-2',
  });

  assert.equal(reportCard.status, 'published');
  assert.equal(reportCard.report_snapshot_id, 'report-snapshot:tenant-a:exams:term-2');
  assert.deepEqual(calls.map((call) => call.name), ['lookup', 'transition']);
});

test('ExamsService refuses direct report-card publication without an approved generated snapshot', async () => {
  const calls: string[] = [];
  const service = new ExamsService(
    { getStore: () => ({ tenant_id: 'tenant-a', user_id: 'officer-1', role: 'admin', permissions: ['exams:approve'] }) } as never,
    {
      findGeneratedReportCardForPublication: async () => null,
      createReportCardSnapshot: async () => {
        calls.push('report-card');
        return { id: 'report-card-1', status: 'published' };
      },
      appendReportCardAuditLog: async () => {
        calls.push('audit');
      },
    } as never,
  );

  await assert.rejects(
    () =>
      service.publishReportCard({
        exam_series_id: 'series-1',
        student_id: 'student-1',
        report_snapshot_id: 'unapproved-or-missing-snapshot',
      }),
    /approved generated report card/i,
  );
  assert.deepEqual(calls, []);
});

test('ExamsRepository does not mutate already-published report cards on conflict', async () => {
  const queries: string[] = [];
  const repository = new ExamsRepository({
        executeWithTenant: async function(tenantId: string, ctx: any, cb: any) {
      return cb({
        $queryRawUnsafe: async (sql: string, ...params: any[]) => {
          const res = await (this as any).query(sql, params);
          return res.rows || res;
        }
      });
    },
query: async (sql: string) => {
      queries.push(sql);
      return {
        rows: [
          {
            id: 'report-card-1',
            report_snapshot_id: 'report-snapshot:tenant-a:exams:term-2',
            status: 'published',
          },
        ],
      };
    },
  } as never);

  await repository.createReportCardSnapshot({
    tenant_id: 'tenant-a',
    actor_user_id: 'officer-1',
    exam_series_id: 'series-1',
    student_id: 'student-1',
    report_snapshot_id: 'report-snapshot:tenant-a:exams:term-2',
    metadata: {},
  });

  assert.match(queries[0] ?? '', /AND current_card\.status <> 'published'/);
  assert.match(queries[0] ?? '', /WHERE current_card\.id IS NULL[\s\S]*OR EXISTS \(SELECT 1 FROM superseded\)/);
});

test('ExamsRepository finds only approved generated report cards for publication', async () => {
  const calls: Array<{ sql: string; params: unknown[] }> = [];
  const repository = new ExamsRepository({
    executeWithTenant: async function(tenantId: string, ctx: any, cb: any) {
      return cb({
        $queryRawUnsafe: async (sql: string, ...params: unknown[]) => {
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
            id: 'report-card-1',
            report_snapshot_id: 'report-snapshot:tenant-a:exams:term-2',
            status: 'approved',
          },
        ],
      };
    },
  } as never);

  const reportCard = await repository.findGeneratedReportCardForPublication({
    tenant_id: 'tenant-a',
    exam_series_id: '00000000-0000-0000-0000-000000000401',
    student_id: '00000000-0000-0000-0000-000000000402',
    report_snapshot_id: 'report-snapshot:tenant-a:exams:term-2',
  });

  assert.equal(reportCard?.status, 'approved');
  assert.match(calls[0]!.sql, /FROM student_report_cards card/);
  assert.match(calls[0]!.sql, /card\.status = 'approved'/);
  assert.match(calls[0]!.sql, /card\.report_snapshot_id = \$4/);
  assert.deepEqual(calls[0]!.params, [
    'tenant-a',
    '00000000-0000-0000-0000-000000000401',
    '00000000-0000-0000-0000-000000000402',
    'report-snapshot:tenant-a:exams:term-2',
  ]);
});

test('ExamsRepository transitions report cards with tenant scope, workflow evidence, and atomic audit', async () => {
  const calls: Array<{ sql: string; params: unknown[] }> = [];
  const repository = new ExamsRepository({
    executeWithTenant: async function(tenantId: string, ctx: any, cb: any) {
      return cb({
        $queryRawUnsafe: async (sql: string, ...params: unknown[]) => {
          const res = await (this as any).query(sql, params);
          return res.rows || res;
        },
      });
    },
    query: async (sql: string, params: unknown[]) => {
      calls.push({ sql, params });
      return {
        rows: [{
          id: 'report-card-1',
          status: 'approved',
          workflow_version: 2,
          audit_recorded: 1,
        }],
      };
    },
  } as never);

  const result = await repository.transitionReportCard({
    tenant_id: 'tenant-a',
    actor_user_id: '00000000-0000-0000-0000-000000000411',
    actor_role: 'dean_academics',
    report_card_id: '00000000-0000-0000-0000-000000000412',
    action: 'approve',
    reason: 'Academic review completed',
  });

  assert.equal(result?.status, 'approved');
  assert.match(calls[0]!.sql, /WHERE card\.tenant_id = \$1/);
  assert.match(calls[0]!.sql, /submitted_by_user_id/);
  assert.match(calls[0]!.sql, /approved_by_user_id/);
  assert.match(calls[0]!.sql, /withdrawn_by_user_id/);
  assert.match(calls[0]!.sql, /workflow_version = card\.workflow_version \+ 1/);
  assert.match(calls[0]!.sql, /INSERT INTO student_report_card_audit_logs/);
  assert.match(calls[0]!.sql, /FROM updated/);
  assert.deepEqual(calls[0]!.params, [
    'tenant-a',
    '00000000-0000-0000-0000-000000000411',
    '00000000-0000-0000-0000-000000000412',
    'approve',
    'dean_academics',
    'Academic review completed',
  ]);
});

test('ExamsRepository edits comments only on current tenant-scoped working drafts', async () => {
  const calls: Array<{ sql: string; params: unknown[] }> = [];
  const repository = new ExamsRepository({
    executeWithTenant: async function(tenantId: string, ctx: any, cb: any) {
      return cb({
        $queryRawUnsafe: async (sql: string, ...params: unknown[]) => {
          const res = await (this as any).query(sql, params);
          return res.rows || res;
        },
      });
    },
    query: async (sql: string, params: unknown[]) => {
      calls.push({ sql, params });
      return {
        rows: [{
          id: '00000000-0000-0000-0000-000000000413',
          tenant_id: 'tenant-a',
          status: 'draft_generated',
          is_current: true,
        }],
      };
    },
  } as never);

  const result = await repository.updateReportCardComments({
    tenant_id: 'tenant-a',
    actor_user_id: '00000000-0000-0000-0000-000000000411',
    report_card_id: '00000000-0000-0000-0000-000000000413',
    class_teacher_comment: 'Consistent progress.',
    principal_comment: 'Proceed to the next term.',
  });

  assert.equal(result?.status, 'draft_generated');
  assert.match(calls[0]!.sql, /WHERE tenant_id = \$1/);
  assert.match(calls[0]!.sql, /AND id = \$3::uuid/);
  assert.match(calls[0]!.sql, /AND is_current = TRUE/);
  assert.match(
    calls[0]!.sql,
    /status IN \('draft_requested', 'draft_generated', 'draft', 'regeneration_required'\)/,
  );
  assert.match(calls[0]!.sql, /metadata->'report_card'->'template_fields'/);
  assert.deepEqual(calls[0]!.params, [
    'tenant-a',
    '00000000-0000-0000-0000-000000000411',
    '00000000-0000-0000-0000-000000000413',
    'Consistent progress.',
    'Proceed to the next term.',
  ]);
});

test('ExamsRepository publishes a series only when every current report card is approved', async () => {
  const calls: Array<{ sql: string; params: unknown[] }> = [];
  const repository = new ExamsRepository({
    executeWithTenant: async function(tenantId: string, ctx: any, cb: any) {
      return cb({
        $queryRawUnsafe: async (sql: string, ...params: unknown[]) => {
          const res = await (this as any).query(sql, params);
          return res.rows || res;
        },
      });
    },
    query: async (sql: string, params: unknown[]) => {
      calls.push({ sql, params });
      return {
        rows: [{
          total_count: 2,
          approved_count: 2,
          already_published_count: 0,
          blocked_count: 0,
          published_cards: [],
          published_marks_count: 4,
          audit_count: 2,
          series_published: true,
        }],
      };
    },
  } as never);

  const result = await repository.publishExamSeries({
    tenant_id: 'tenant-a',
    exam_series_id: '00000000-0000-0000-0000-000000000421',
    actor_user_id: '00000000-0000-0000-0000-000000000422',
    actor_role: 'principal',
  });

  assert.equal(result?.series_published, true);
  assert.match(calls[0]!.sql, /card\.tenant_id = \$1/);
  assert.match(calls[0]!.sql, /card\.is_current = TRUE/);
  assert.match(calls[0]!.sql, /blocked_count = 0/);
  assert.match(calls[0]!.sql, /card\.status = 'approved'/);
  assert.match(calls[0]!.sql, /INSERT INTO student_report_card_audit_logs/);
  assert.match(calls[0]!.sql, /mark\.tenant_id = \$1/);
  assert.match(calls[0]!.sql, /series\.tenant_id = \$1/);
  assert.deepEqual(calls[0]!.params, [
    'tenant-a',
    '00000000-0000-0000-0000-000000000421',
    '00000000-0000-0000-0000-000000000422',
    'principal',
  ]);
});

test('ExamsRepository withdraws only current tenant-published report cards and relocks marks', async () => {
  const calls: Array<{ sql: string; params: unknown[] }> = [];
  const repository = new ExamsRepository({
    executeWithTenant: async function(tenantId: string, ctx: any, cb: any) {
      return cb({
        $queryRawUnsafe: async (sql: string, ...params: unknown[]) => {
          const res = await (this as any).query(sql, params);
          return res.rows || res;
        },
      });
    },
    query: async (sql: string, params: unknown[]) => {
      calls.push({ sql, params });
      return {
        rows: [{
          total_count: 2,
          published_count: 2,
          withdrawn_cards: [],
          relocked_marks_count: 4,
          audit_count: 2,
          series_withdrawn: true,
        }],
      };
    },
  } as never);

  const result = await repository.unpublishExamSeries({
    tenant_id: 'tenant-a',
    exam_series_id: '00000000-0000-0000-0000-000000000423',
    actor_user_id: '00000000-0000-0000-0000-000000000424',
    actor_role: 'principal',
    reason: 'Correction required before release',
  });

  assert.equal(result?.series_withdrawn, true);
  assert.match(calls[0]!.sql, /series\.tenant_id = \$1/);
  assert.match(calls[0]!.sql, /series\.status = 'published'/);
  assert.match(calls[0]!.sql, /card\.tenant_id = \$1/);
  assert.match(calls[0]!.sql, /card\.is_current = TRUE/);
  assert.match(calls[0]!.sql, /card\.status = 'published'/);
  assert.match(calls[0]!.sql, /SET status = 'withdrawn'/);
  assert.match(calls[0]!.sql, /INSERT INTO student_report_card_audit_logs/);
  assert.match(calls[0]!.sql, /'reason', \$5::text/);
  assert.match(calls[0]!.sql, /mark\.tenant_id = \$1/);
  assert.match(calls[0]!.sql, /SET status = 'locked'/);
  assert.deepEqual(calls[0]!.params, [
    'tenant-a',
    '00000000-0000-0000-0000-000000000423',
    '00000000-0000-0000-0000-000000000424',
    'principal',
    'Correction required before release',
  ]);
});

test('ExamsRepository prevents mark upsert conflicts from crossing exam or subject scope', async () => {
  const queries: string[] = [];
  const repository = new ExamsRepository({
        executeWithTenant: async function(tenantId: string, ctx: any, cb: any) {
      return cb({
        $queryRawUnsafe: async (sql: string, ...params: any[]) => {
          const res = await (this as any).query(sql, params);
          return res.rows || res;
        }
      });
    },
query: async (sql: string) => {
      queries.push(sql);
      return {
        rows: [
          {
            id: 'mark-1',
            exam_series_id: 'series-1',
            academic_term_id: 'term-1',
            class_section_id: 'class-1',
            subject_id: 'subject-1',
            student_id: 'student-1',
          },
        ],
      };
    },
  } as never);

  await repository.upsertMark({
    tenant_id: 'tenant-a',
    actor_user_id: 'teacher-1',
    exam_series_id: 'series-1',
    assessment_id: 'assessment-1',
    academic_term_id: 'term-1',
    class_section_id: 'class-1',
    subject_id: 'subject-1',
    student_id: 'student-1',
    score: 84,
    remarks: null,
  });

  assert.match(queries[0] ?? '', /exam_marks\.exam_series_id = EXCLUDED\.exam_series_id/);
  assert.match(queries[0] ?? '', /exam_marks\.academic_term_id = EXCLUDED\.academic_term_id/);
  assert.match(queries[0] ?? '', /exam_marks\.class_section_id = EXCLUDED\.class_section_id/);
  assert.match(queries[0] ?? '', /exam_marks\.subject_id = EXCLUDED\.subject_id/);
});

test('ExamsRepository restricts teacher mark submission to actor-entered marks', async () => {
  const queries: string[] = [];
  const paramsList: unknown[][] = [];
  const repository = new ExamsRepository({
    executeWithTenant: async function(tenantId: string, ctx: any, cb: any) {
      return cb({
        $queryRawUnsafe: async (sql: string, ...params: unknown[]) => {
          const res = await (this as any).query(sql, params);
          return res.rows || res;
        },
      });
    },
    query: async (sql: string, params: unknown[]) => {
      queries.push(sql);
      paramsList.push(params);
      return { rows: [{ id: 'mark-1' }] };
    },
  } as never);

  await repository.submitMarks({
    tenant_id: 'tenant-a',
    actor_user_id: 'teacher-1',
    mark_ids: ['mark-1'],
    restrict_to_actor: true,
  });

  assert.match(queries[0] ?? '', /entered_by_user_id = \$3::uuid/);
  assert.deepEqual(paramsList[0], ['tenant-a', ['mark-1'], 'teacher-1', true]);
});

test('ExamsRepository moderates only submitted or reviewed marks and never locked or published marks', async () => {
  const queries: string[] = [];
  const paramsList: unknown[][] = [];
  const repository = new ExamsRepository({
    executeWithTenant: async function(tenantId: string, ctx: any, cb: any) {
      return cb({
        $queryRawUnsafe: async (sql: string, ...params: unknown[]) => {
          const res = await (this as any).query(sql, params);
          return res.rows || res;
        },
      });
    },
    query: async (sql: string, params: unknown[]) => {
      queries.push(sql);
      paramsList.push(params);
      return { rows: [{ id: 'mark-1', status: 'reviewed', score: 84 }] };
    },
  } as never);

  await repository.moderateMarks({
    tenant_id: 'tenant-a',
    actor_user_id: 'hod-1',
    mark_ids: ['mark-1'],
    action: 'approve',
  });

  assert.match(queries[0] ?? '', /\$5::text = 'approve' AND status = 'submitted'/);
  assert.match(queries[0] ?? '', /\$5::text = 'return_for_correction' AND status IN \('submitted', 'reviewed'\)/);
  assert.doesNotMatch(queries[0] ?? '', /locked', 'published/);
  assert.deepEqual(paramsList[0], ['tenant-a', ['mark-1'], 'reviewed', 'hod-1', 'approve']);
});

test('ExamsRepository scopes mark listing and moderation to HOD departments across legacy text identifiers', async () => {
  const queries: string[] = [];
  const paramsList: unknown[][] = [];
  const repository = new ExamsRepository({
    executeWithTenant: async function(tenantId: string, ctx: any, cb: any) {
      return cb({
        $queryRawUnsafe: async (sql: string, ...params: unknown[]) => {
          const res = await (this as any).query(sql, params);
          return res.rows || res;
        },
      });
    },
    query: async (sql: string, params: unknown[]) => {
      queries.push(sql);
      paramsList.push(params);
      return { rows: [{ id: 'mark-1', status: 'reviewed', score: 84 }] };
    },
  } as never);

  await repository.listMarks({
    tenant_id: 'tenant-a',
    department_ids: ['11111111-1111-1111-1111-111111111111'],
    status_in: ['submitted'],
  });

  await repository.moderateMarks({
    tenant_id: 'tenant-a',
    actor_user_id: '22222222-2222-2222-2222-222222222222',
    mark_ids: ['33333333-3333-3333-3333-333333333333'],
    action: 'approve',
    department_ids: ['11111111-1111-1111-1111-111111111111'],
  });

  assert.match(queries[0] ?? '', /JOIN subjects s ON s\.id::text = m\.subject_id::text AND s\.tenant_id = m\.tenant_id/);
  assert.match(queries[0] ?? '', /s\.department_id::text = ANY\(\$2::text\[\]\)/);
  assert.doesNotMatch(queries[0] ?? '', /s\.department_id = ANY\([^)]*::uuid\[\]\)/);
  assert.deepEqual(paramsList[0], ['tenant-a', ['11111111-1111-1111-1111-111111111111'], ['submitted'], 25, 0]);
  assert.match(queries[1] ?? '', /UPDATE exam_marks mark/);
  assert.match(queries[1] ?? '', /FROM subjects subject/);
  assert.match(queries[1] ?? '', /subject\.id::text = mark\.subject_id::text/);
  assert.match(queries[1] ?? '', /subject\.department_id::text = ANY\(\$6::text\[\]\)/);
  assert.doesNotMatch(queries[1] ?? '', /subject\.department_id = ANY\([^)]*::uuid\[\]\)/);
  assert.deepEqual(paramsList[1], [
    'tenant-a',
    ['33333333-3333-3333-3333-333333333333'],
    'reviewed',
    '22222222-2222-2222-2222-222222222222',
    'approve',
    ['11111111-1111-1111-1111-111111111111'],
  ]);
});

test('ModerateExamMarksDto accepts valid HOD actions through the global validation contract', async () => {
  const pipe = new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: true,
  });
  const markId = '33333333-3333-4333-8333-333333333333';

  const approve = await pipe.transform(
    { mark_ids: [markId], action: 'approve' },
    { type: 'body', metatype: ModerateExamMarksDto },
  );
  assert.deepEqual(approve.mark_ids, [markId]);
  assert.equal(approve.action, 'approve');

  const returned = await pipe.transform(
    { mark_ids: [markId], action: 'return_for_correction', reason: 'Please verify the score.' },
    { type: 'body', metatype: ModerateExamMarksDto },
  );
  assert.equal(returned.action, 'return_for_correction');
  assert.equal(returned.reason, 'Please verify the score.');

  await assert.rejects(() => pipe.transform(
    { mark_ids: [markId], action: 'approve', unexpected: true },
    { type: 'body', metatype: ModerateExamMarksDto },
  ));
  await assert.rejects(() => pipe.transform(
    { mark_ids: [], action: 'approve' },
    { type: 'body', metatype: ModerateExamMarksDto },
  ));
});

test('GenerateReportCardBatchDto accepts class generation through the global validation contract', async () => {
  const pipe = new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: true,
  });
  const payload = {
    exam_series_id: '11111111-1111-4111-8111-111111111111',
    class_section_id: '22222222-2222-4222-8222-222222222222',
    stream_name: 'North',
    batch_size: 200,
    offset: 0,
  };

  const validated = await pipe.transform(payload, {
    type: 'body',
    metatype: GenerateReportCardBatchDto,
  });
  assert.deepEqual({ ...validated }, payload);

  await assert.rejects(() => pipe.transform(
    { ...payload, unexpected: true },
    { type: 'body', metatype: GenerateReportCardBatchDto },
  ));
  await assert.rejects(() => pipe.transform(
    { ...payload, batch_size: 201 },
    { type: 'body', metatype: GenerateReportCardBatchDto },
  ));
  await assert.rejects(() => pipe.transform(
    { ...payload, offset: -1 },
    { type: 'body', metatype: GenerateReportCardBatchDto },
  ));
});

test('ExamsService generates report-card payloads from marks before publishing', async () => {
  let generatedSnapshotInput: Record<string, unknown> | null = null;
  const service = new ExamsService(
    { getStore: () => ({ tenant_id: 'tenant-a', user_id: 'officer-1', role: 'admin', permissions: ['exams:approve'] }) } as never,
    {
      loadReportCardData: async () => ({
        exam_series: {
          id: 'series-1',
          name: 'Term 2 Opener',
          academic_term_name: 'Term 2',
          academic_year_name: '2026',
        },
        student: {
          id: 'student-1',
          full_name: 'Amina Otieno',
          admission_number: 'ADM-001',
          class_name: 'Grade 6',
          stream_name: 'Blue',
        },
        subjects: [
          {
            subject_id: 'subject-1',
            subject_name: 'Mathematics',
            score: 84,
            max_score: 100,
            grade_label: 'A',
            remarks: 'Strong problem solving',
          },
          {
            subject_id: 'subject-2',
            subject_name: 'English',
            score: 72,
            max_score: 100,
            grade_label: 'B',
            remarks: null,
          },
        ],
        attendance: {
          days_present: 58,
          days_absent: 2,
        },
      }),
      createGeneratedReportCardSnapshot: async (input: Record<string, unknown>) => {
        generatedSnapshotInput = input;
        return {
          id: 'report-card-1',
          report_snapshot_id: 'report-card:tenant-a:series-1:student-1:v1',
          status: 'draft',
          metadata: input.metadata,
        };
      },
      appendReportCardAuditLog: async () => undefined,
    } as never,
  );

  const reportCard = await (service as unknown as {
    generateReportCard: (dto: { exam_series_id: string; student_id: string }) => Promise<Record<string, unknown>>;
  }).generateReportCard({
    exam_series_id: 'series-1',
    student_id: 'student-1',
  });

  assert.equal(reportCard.status, 'draft');
  assert.equal(reportCard.report_snapshot_id, 'report-card:tenant-a:series-1:student-1:v1');
  assert.equal(
    (
      generatedSnapshotInput as {
        metadata?: { report_card?: { subjects?: Array<{ subject_name?: string; grade_label?: string }> } };
      } | null
    )?.metadata?.report_card?.subjects?.[0]?.subject_name,
    'Mathematics',
  );
  assert.equal(
    (
      generatedSnapshotInput as {
        metadata?: { report_card?: { totals?: { total_score?: number; mean_score?: number } } };
      } | null
    )?.metadata?.report_card?.totals?.total_score,
    156,
  );
  assert.equal(
    (
      generatedSnapshotInput as {
        metadata?: { report_card?: { totals?: { total_score?: number; mean_score?: number } } };
      } | null
    )?.metadata?.report_card?.totals?.mean_score,
    78,
  );
});

test('ExamsService previews bulk mark uploads and commits only previewed valid rows with audit', async () => {
  const calls: Array<{ name: string; input?: Record<string, unknown> }> = [];
  const service = new ExamsService(
    { getStore: () => ({ tenant_id: 'tenant-a', user_id: 'teacher-1', role: 'teacher', permissions: ['exams:enter-marks'] }) } as never,
    {
      findTeacherAssignment: async () => ({ id: 'assignment-1' }),
      findSeriesState: async () => ({ status: 'draft', locked_at: null, published_at: null }),
      findOpenMarkEntryWindow: async () => ({ id: 'window-1', status: 'open' }),
      findAssessmentScope: async () => ({
        id: 'assessment-1',
        exam_series_id: 'series-1',
        academic_term_id: 'term-1',
        class_section_id: 'class-1',
        subject_id: 'subject-1',
        max_score: 100,
      }),
      findGradeBoundaryForScore: async () => ({
        configured_count: 4,
        match_count: 1,
        boundary: { label: 'A', min_score: 80, max_score: 100 },
      }),
      upsertMark: async (input: Record<string, unknown>) => {
        calls.push({ name: 'mark', input });
        return { id: `mark-${calls.length}`, score: input.score };
      },
      appendMarkAuditLog: async (input: Record<string, unknown>) => {
        calls.push({ name: 'audit', input });
      },
      commitBulkMarkImport: async (input: Record<string, unknown>) => {
        calls.push({ name: 'commit', input });
        return { batch_id: 'batch-1', committed_rows: 1 };
      },
    } as never,
  );

  const rows = [
    {
      row_number: 2,
      exam_series_id: 'series-1',
      assessment_id: 'assessment-1',
      academic_term_id: 'term-1',
      class_section_id: 'class-1',
      subject_id: 'subject-1',
      student_id: 'student-1',
      score: 84,
    },
  ];
  const preview = await (service as unknown as {
    bulkUploadMarks: (dto: Record<string, unknown>) => Promise<Record<string, unknown>>;
  }).bulkUploadMarks({ mode: 'preview', rows });

  assert.equal(preview.valid_rows, 1);
  assert.equal(preview.invalid_rows, 0);
  assert.equal(preview.committed_rows, 0);
  assert.equal(calls.length, 0);

  const committed = await (service as unknown as {
    bulkUploadMarks: (dto: Record<string, unknown>) => Promise<Record<string, unknown>>;
  }).bulkUploadMarks({ mode: 'commit', preview_token: preview.preview_token, file_name: 'term-1-marks.csv', rows });

  assert.equal(committed.committed_rows, 1);
  assert.equal(committed.batch_id, 'batch-1');
  assert.deepEqual(calls.map((call) => call.name), ['commit']);
  assert.equal(calls[0]?.input?.tenant_id, 'tenant-a');
  assert.equal(calls[0]?.input?.file_name, 'term-1-marks.csv');
});

test('ExamsService lists mark imports and lets the Dean roll back a tenant-scoped batch', async () => {
  const calls: Array<Record<string, unknown>> = [];
  const service = new ExamsService(
    {
      getStore: () => ({
        tenant_id: 'tenant-a',
        user_id: 'dean-1',
        role: 'dean_academics',
        permissions: ['exams:read', 'exams:review', 'exams:approve'],
      }),
    } as never,
    {
      listMarkImportBatches: async (input: Record<string, unknown>) => {
        calls.push({ method: 'list', ...input });
        return [{ id: 'batch-1', status: 'imported', committed_rows: 12 }];
      },
      getMarkImportBatch: async (input: Record<string, unknown>) => {
        calls.push({ method: 'detail', ...input });
        return { id: input.batch_id, file_name: 'marks.csv', source_rows: [{ student_id: 'student-1', score: 80 }] };
      },
      rollbackMarkImportBatch: async (input: Record<string, unknown>) => {
        calls.push({ method: 'rollback', ...input });
        return { id: input.batch_id, status: 'rolled_back', restored_rows: 2, deleted_rows: 10 };
      },
    } as never,
  );

  const listed = await service.getMarkImportBatches({ limit: '25' });
  const detail = await service.getMarkImportBatch('00000000-0000-0000-0000-000000000201');
  const rolledBack = await service.rollbackMarkImportBatch('00000000-0000-0000-0000-000000000201', 'Incorrect student mapping');

  assert.equal(listed.data[0].id, 'batch-1');
  assert.equal(calls[0].tenant_id, 'tenant-a');
  assert.equal(detail.data.source_rows[0].student_id, 'student-1');
  assert.equal(calls[1].tenant_id, 'tenant-a');
  assert.equal(calls[2].tenant_id, 'tenant-a');
  assert.equal(calls[2].actor_user_id, 'dean-1');
  assert.equal(calls[2].reason, 'Incorrect student mapping');
  assert.equal(rolledBack.data.status, 'rolled_back');
});

test('ExamsService reports duplicate and unauthorized rows during bulk mark upload preview', async () => {
  const service = new ExamsService(
    { getStore: () => ({ tenant_id: 'tenant-a', user_id: 'teacher-1', role: 'teacher', permissions: ['exams:enter-marks'] }) } as never,
    {
      findTeacherAssignment: async (input: Record<string, unknown>) =>
        input.subject_id === 'subject-1' ? { id: 'assignment-1' } : null,
      findSeriesState: async () => ({ status: 'draft', locked_at: null, published_at: null }),
      findOpenMarkEntryWindow: async () => ({ id: 'window-1', status: 'open' }),
      findAssessmentScope: async () => ({
        id: 'assessment-1',
        exam_series_id: 'series-1',
        academic_term_id: 'term-1',
        class_section_id: 'class-1',
        subject_id: 'subject-1',
        max_score: 100,
      }),
      findGradeBoundaryForScore: async () => ({
        configured_count: 4,
        match_count: 1,
        boundary: { label: 'A', min_score: 80, max_score: 100 },
      }),
      upsertMark: async () => {
        throw new Error('bulk preview must not save rows');
      },
      appendMarkAuditLog: async () => undefined,
    } as never,
  );

  const preview = await (service as unknown as {
    bulkUploadMarks: (dto: Record<string, unknown>) => Promise<{
      invalid_rows: number;
      duplicate_rows: number;
      row_results: Array<{ row_number: number; status: string; errors: string[] }>;
    }>;
  }).bulkUploadMarks({
    mode: 'preview',
    rows: [
      {
        row_number: 2,
        exam_series_id: 'series-1',
        assessment_id: 'assessment-1',
        academic_term_id: 'term-1',
        class_section_id: 'class-1',
        subject_id: 'subject-1',
        student_id: 'student-1',
        score: 84,
      },
      {
        row_number: 3,
        exam_series_id: 'series-1',
        assessment_id: 'assessment-1',
        academic_term_id: 'term-1',
        class_section_id: 'class-1',
        subject_id: 'subject-1',
        student_id: 'student-1',
        score: 84,
      },
      {
        row_number: 4,
        exam_series_id: 'series-1',
        assessment_id: 'assessment-2',
        academic_term_id: 'term-1',
        class_section_id: 'class-1',
        subject_id: 'subject-2',
        student_id: 'student-2',
        score: 81,
      },
    ],
  });

  assert.equal(preview.invalid_rows, 2);
  assert.equal(preview.duplicate_rows, 1);
  assert.match(preview.row_results[1]?.errors.join(' '), /Duplicate/);
  assert.match(preview.row_results[2]?.errors.join(' '), /not assigned/);
});

test('ReportCardGenerationService generates HTML and PDF artifacts with a verification code', async () => {
  const calls: Array<{ name: string; input?: Record<string, unknown> }> = [];
  const service = new ReportCardGenerationService(
    {
      loadReportCardData: async () => ({
        exam_series: {
          id: 'series-1',
          name: 'Term 2 Opener',
          academic_term_name: 'Term 2',
          academic_year_name: '2026',
        },
        student: {
          id: 'student-1',
          full_name: 'Amina Otieno',
          admission_number: 'ADM-001',
          class_name: 'Grade 6',
          stream_name: 'Blue',
        },
        school: {
          name: 'Shule Demo Primary',
          address: 'Nairobi',
          phone: '+254700000000',
          email: 'office@shule.test',
          logo_ref: 'https://cdn.example.test/logo.png',
          motto: 'Knowledge and service',
        },
        comments: {
          class_teacher: 'Good consistency.',
          principal: 'Promoted to the next class.',
        },
        next_term: {
          opening_date: '2026-09-01',
        },
        subjects: [
          {
            subject_id: 'subject-1',
            subject_name: 'Mathematics',
            score: 84,
            max_score: 100,
            grade_label: 'A',
            remarks: 'Strong problem solving',
          },
        ],
      }),
      createGeneratedReportCardSnapshot: async (input: Record<string, unknown>) => {
        calls.push({ name: 'snapshot', input });
        return {
          id: 'report-card-1',
          status: 'draft_generated',
          verification_code: input.verification_code,
          metadata: input.metadata,
        };
      },
      recordReportCardArtifact: async (input: Record<string, unknown>) => {
        calls.push({ name: 'artifact', input });
        return {
          id: `artifact-${calls.filter((call) => call.name === 'artifact').length}`,
          ...input,
        };
      },
      appendReportCardAuditLog: async (input: Record<string, unknown>) => {
        calls.push({ name: 'audit', input });
      },
    } as never,
    new ReportCardTemplateService(),
  );

  const result = await service.generateStudentReportCard({
    tenant_id: 'tenant-a',
    actor_user_id: 'officer-1',
    exam_series_id: 'series-1',
    student_id: 'student-1',
    generated_at: '2026-05-20T08:00:00.000Z',
  });

  assert.equal(result.status, 'draft_generated');
  assert.match(String(result.verification_code), /^[A-Z0-9]{12}$/);
  assert.deepEqual(calls.map((call) => call.name), ['snapshot', 'artifact', 'artifact', 'audit']);
  assert.deepEqual(
    calls.filter((call) => call.name === 'artifact').map((call) => call.input?.artifact_type).sort(),
    ['html', 'pdf'],
  );
  assert.equal(
    (
      calls[0]?.input?.metadata as {
        report_card?: {
          template_fields?: {
            school_name?: string;
            school_logo_ref?: string;
            school_motto?: string;
            learner_class?: string;
            learner_stream?: string;
            principal_comment?: string;
          };
        };
      }
    ).report_card?.template_fields?.school_name,
    'Shule Demo Primary',
  );
  assert.equal(
    (
      calls[0]?.input?.metadata as {
        report_card?: { template_fields?: { school_logo_ref?: string } };
      }
    ).report_card?.template_fields?.school_logo_ref,
    'https://cdn.example.test/logo.png',
  );
  assert.equal(
    (
      calls[0]?.input?.metadata as {
        report_card?: { template_fields?: { school_motto?: string } };
      }
    ).report_card?.template_fields?.school_motto,
    'Knowledge and service',
  );
  assert.equal(
    (
      calls[0]?.input?.metadata as {
        report_card?: { template_fields?: { learner_class?: string; learner_stream?: string } };
      }
    ).report_card?.template_fields?.learner_class,
    'Grade 6',
  );
  assert.equal(
    (
      calls[0]?.input?.metadata as {
        report_card?: { template_fields?: { learner_class?: string; learner_stream?: string } };
      }
    ).report_card?.template_fields?.learner_stream,
    'Blue',
  );
  assert.equal(
    (
      calls[0]?.input?.metadata as {
        report_card?: { template_fields?: { school_name?: string; principal_comment?: string } };
      }
    ).report_card?.template_fields?.principal_comment,
    'Promoted to the next class.',
  );
});

test('ExamsRepository applies the configured academic grading system to report-card subjects', async () => {
  const queries: string[] = [];
  const repository = new ExamsRepository({
    executeWithTenant: async function(_tenantId: string, _context: unknown, callback: any) {
      return callback({
        $queryRawUnsafe: async (sql: string, ...params: unknown[]) => {
          const result = await (this as any).query(sql, params);
          return result.rows;
        },
      });
    },
    query: async (sql: string) => {
      queries.push(sql);
      if (/FROM tenants tenant/.test(sql)) return { rows: [{ name: 'Kibabi' }] };
      if (/academic_term_name/.test(sql)) return { rows: [{ id: 'series-1', name: 'Term 3' }] };
      if (/FROM students student/.test(sql)) return { rows: [{ id: 'student-1', full_name: 'Learner One' }] };
      if (/FROM exam_grading_policies policy/.test(sql) && !/FROM exam_marks mark/.test(sql)) return { rows: [] };
      if (/FROM academics_grading_systems system/.test(sql)) {
        return {
          rows: [{
            id: 'f559ae72-8374-4b0c-9a73-e3239f1b6fe9',
            name: '2026 Senior model',
            version: 1,
            rules: [
              { min: 80, max: 100, label: 'A', points: 12, remark: 'Excellent', is_pass: true },
              { min: 70, max: 79, label: 'B', points: 10, remark: 'Very good', is_pass: true },
            ],
          }],
        };
      }
      if (/FROM exam_marks mark/.test(sql)) {
        return {
          rows: [{
            subject_id: 'subject-1',
            subject_name: 'Mathematics',
            score: 80,
            score_status: 'entered',
            max_score: 100,
            percentage: 80,
            grade_label: null,
            points: null,
            descriptor: null,
            is_pass: null,
            remarks: null,
          }],
        };
      }
      return { rows: [] };
    },
  } as never);

  const data = await repository.loadReportCardData({
    tenant_id: 'kibabi-high',
    exam_series_id: '0e9d0e2c-7cb4-4336-b383-9a74d90ab3d0',
    student_id: 'fc599890-3b68-4c85-b6ef-0ac4e199c30b',
  });
  const subject = (data.subjects as Array<Record<string, unknown>>)[0];
  const policy = data.grading_policy as Record<string, unknown>;

  assert.equal(subject?.grade_label, 'A');
  assert.equal(subject?.points, 12);
  assert.equal(subject?.remarks, 'Excellent');
  assert.equal(policy.source, 'academic_setup');
  assert.equal(policy.id, 'f559ae72-8374-4b0c-9a73-e3239f1b6fe9');
  assert.equal(queries.some((sql) => /academics_report_card_settings/.test(sql)), true);
});

test('ReportCardGenerationService refuses report-card generation when a numeric subject has no grade boundary', async () => {
  const service = new ReportCardGenerationService(
    {
      loadReportCardData: async () => ({
        exam_series: {
          id: 'series-1',
          name: 'Term 2 Opener',
        },
        student: {
          id: 'student-1',
          full_name: 'Amina Otieno',
        },
        subjects: [
          {
            subject_id: 'subject-1',
            subject_name: 'Mathematics',
            score: 64,
            max_score: 100,
            grade_label: null,
            remarks: null,
          },
        ],
      }),
      createGeneratedReportCardSnapshot: async () => {
        throw new Error('ungraded report cards must not be saved');
      },
      recordReportCardArtifact: async () => {
        throw new Error('ungraded report cards must not create artifacts');
      },
      appendReportCardAuditLog: async () => undefined,
    } as never,
    new ReportCardTemplateService(),
  );

  await assert.rejects(
    () =>
      service.generateStudentReportCard({
        tenant_id: 'tenant-a',
        actor_user_id: 'officer-1',
        exam_series_id: 'series-1',
        student_id: 'student-1',
        generated_at: '2026-05-20T08:00:00.000Z',
      }),
    /grade boundary/,
  );
});

test('ExamsService starts class report-card batches and returns progress status', async () => {
  const calls: Array<{ name: string; input?: Record<string, unknown> }> = [];
  const reportCardGenerationService = {
    generateReportCardBatch: async (input: Record<string, unknown>) => {
      calls.push({ name: 'batch', input });
      return {
        id: 'batch-1',
        status: 'draft_generated',
        queue_status: 'completed',
        total_students: 2,
        completed_students: 2,
        failed_students: 0,
      };
    },
    getReportCardBatchStatus: async (input: Record<string, unknown>) => {
      calls.push({ name: 'status', input });
      return {
        id: input.batch_id,
        status: 'draft_generated',
        queue_status: 'completed',
        total_students: 2,
        completed_students: 2,
        failed_students: 0,
      };
    },
  };
  const service = new ExamsService(
    {
      getStore: () => ({
        tenant_id: 'tenant-a',
        user_id: 'officer-1',
        role: 'admin',
        permissions: ['exams:approve'],
      }),
    } as never,
    {} as never,
    undefined,
    reportCardGenerationService as never,
  );

  const batch = await service.generateReportCardBatch({
    exam_series_id: 'series-1',
    class_section_id: 'class-1',
    stream_name: 'Blue',
  });
  const status = await service.getReportCardBatchStatus('batch-1');

  assert.equal(batch.queue_status, 'completed');
  assert.equal(status.completed_students, 2);
  assert.deepEqual(calls, [
    {
      name: 'batch',
      input: {
        tenant_id: 'tenant-a',
        actor_user_id: 'officer-1',
        exam_series_id: 'series-1',
        class_section_id: 'class-1',
        stream_name: 'Blue',
        batch_size: 200,
        offset: 0,
      },
    },
    {
      name: 'status',
      input: {
        tenant_id: 'tenant-a',
        batch_id: 'batch-1',
      },
    },
  ]);
});

test('ExamsService verifies printed report cards by tenant-scoped verification code', async () => {
  const reportCardGenerationService = {
    verifyPrintedReportCard: async (input: Record<string, unknown>) => ({
      verification_code: input.verification_code,
      status: 'valid',
      student: { full_name: 'Amina Otieno' },
      exam_series: { name: 'Term 2 Opener' },
      artifact_types: ['html', 'pdf'],
    }),
  };
  const service = new ExamsService(
    {
      getStore: () => ({
        tenant_id: 'tenant-a',
        user_id: 'officer-1',
        role: 'admin',
        permissions: ['exams:read'],
      }),
    } as never,
    {} as never,
    undefined,
    reportCardGenerationService as never,
  );

  const verification = await service.verifyReportCard(' RC-2026-ABC ');

  assert.deepEqual(verification, {
    verification_code: 'RC-2026-ABC',
    status: 'valid',
    student: { full_name: 'Amina Otieno' },
    exam_series: { name: 'Term 2 Opener' },
    artifact_types: ['html', 'pdf'],
  });
});

test('ExamsController exposes teacher mark sheets as a read endpoint', () => {
  const handler = ExamsController.prototype.listMarkSheets as unknown as Function;
  const lockHandler = ExamsController.prototype.lockMarkSheet as unknown as Function;

  assert.equal(typeof handler, 'function');
  assert.equal(Reflect.getMetadata(PATH_METADATA, handler), 'mark-sheets');
  assert.deepEqual(Reflect.getMetadata(PERMISSIONS_KEY, handler), ['exams:read']);
  assert.equal(typeof lockHandler, 'function');
  assert.equal(Reflect.getMetadata(PATH_METADATA, lockHandler), 'mark-sheets/:markSheetId/lock');
  assert.deepEqual(Reflect.getMetadata(PERMISSIONS_KEY, lockHandler), ['exams:enter-marks']);
});

test('ExamsService lists tenant mark sheets with teacher and series filters', async () => {
  let capturedInput: Record<string, unknown> | null = null;
  const service = new ExamsService(
    { getStore: () => ({ tenant_id: 'tenant-a', user_id: 'teacher-1', role: 'teacher', permissions: ['exams:read'] }) } as never,
    {
      listMarkSheets: async (input: Record<string, unknown>) => {
        capturedInput = input;
        return [
          {
            exam_series_id: 'series-1',
            subject_id: 'subject-1',
            class_section_id: 'class-1',
            mark_count: 18,
          },
        ];
      },
    } as never,
  );

  const rows = await (service as unknown as {
    listMarkSheets: (query: Record<string, string | undefined>) => Promise<Array<Record<string, unknown>>>;
  }).listMarkSheets({
    teacher_user_id: ' teacher-1 ',
    exam_series_id: 'series-1',
    subject_id: '',
    limit: '500',
    offset: '-10',
  });

  assert.deepEqual(capturedInput, {
    tenant_id: 'tenant-a',
    teacher_user_id: 'teacher-1',
    exam_series_id: 'series-1',
    limit: 50,
    offset: 0,
  });
  assert.equal(rows[0]?.mark_count, 18);
});

test('ReportCardGenerationService preserves actionable learner failures on a batch', async () => {
  let capturedFailures: unknown = null;
  const service = new ReportCardGenerationService(
    {
      getReportCardBatchReadiness: async () => ({
        expected_mark_count: 1,
        ready_mark_count: 1,
        not_ready_mark_count: 0,
        learner_count: 1,
      }),
      listStudentsForReportCardBatch: async () => [{ id: 'fc599890-3b68-4c85-b6ef-0ac4e199c30b' }],
      createReportCardGenerationBatch: async () => ({ id: '40fdbade-8119-4fef-8ae1-0dc9821fe03e' }),
      loadReportCardData: async () => ({
        exam_series: { id: 'series-1', name: 'Term 3' },
        student: { id: 'student-1', full_name: 'Learner One' },
        subjects: [{
          subject_id: 'subject-1',
          subject_name: 'Mathematics',
          score: 80,
          score_status: 'entered',
          max_score: 100,
          grade_label: null,
        }],
      }),
      updateReportCardGenerationBatch: async (input: Record<string, unknown>) => {
        capturedFailures = input.failures;
        return { id: 'batch-1', status: input.status, queue_status: input.queue_status, ...input };
      },
    } as never,
    new ReportCardTemplateService(),
  );

  const result = await service.generateReportCardBatch({
    tenant_id: 'kibabi-high',
    actor_user_id: '11111111-1111-4111-8111-111111111111',
    exam_series_id: '0e9d0e2c-7cb4-4336-b383-9a74d90ab3d0',
  });

  assert.equal(result.failed_students, 1);
  assert.match(result.failures?.[0]?.message ?? '', /Mathematics has no grade boundary match/);
  assert.deepEqual(result.failures, capturedFailures);
});

test('ExamsService scopes teacher mark-entry rows to the current teacher assignments', async () => {
  let capturedTenantId: string | null = null;
  let capturedFilters: Record<string, unknown> | null = null;
  const service = new ExamsService(
    { getStore: () => ({ tenant_id: 'tenant-a', user_id: 'teacher-1', role: 'teacher', permissions: ['exams:read', 'exams:enter-marks'] }) } as never,
    {
      getMarks: async (tenantId: string, filters: Record<string, unknown>) => {
        capturedTenantId = tenantId;
        capturedFilters = filters;
        return [
          {
            student_id: 'student-1',
            assessment_id: 'assessment-1',
            score: null,
            status: 'draft',
          },
        ];
      },
    } as never,
  );

  const result = await service.getMarks({
    teacher_user_id: 'other-teacher',
    exam_series_id: 'series-1',
    student_id: '',
    limit: '500',
    offset: '-10',
  });

  assert.equal(capturedTenantId, 'tenant-a');
  assert.deepEqual(capturedFilters, {
    exam_series_id: 'series-1',
    teacher_user_id: 'teacher-1',
    limit: 100,
    offset: 0,
  });
  assert.equal(result.data[0]?.student_id, 'student-1');
});

test('ExamsRepository paginates mark-sheet lists', async () => {
  const calls: Array<{ sql: string; params: unknown[] }> = [];
  const repository = new ExamsRepository({
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

  await repository.listMarkSheets({
    tenant_id: 'tenant-a',
    teacher_user_id: '00000000-0000-0000-0000-000000000801',
    limit: 500,
    offset: -10,
  });

  assert.match(calls[0]!.sql, /LIMIT \$6::integer\s+OFFSET \$7::integer/);
  assert.equal(calls[0]!.params[5], 50);
  assert.equal(calls[0]!.params[6], 0);
});

test('ExamsRepository derives teacher mark-entry rows from open windows, assessments, and active students', async () => {
  const calls: Array<{ sql: string; params: unknown[] }> = [];
  const repository = new ExamsRepository({
    executeWithTenant: async function(tenantId: string, ctx: any, cb: any) {
      return cb({
        $queryRawUnsafe: async (sql: string, ...params: unknown[]) => {
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
            mark_entry_window_id: 'window-1',
            assessment_id: 'assessment-1',
            student_id: 'student-1',
            score: null,
            status: 'draft',
          },
        ],
      };
    },
  } as never);

  const rows = await repository.getMarks('tenant-a', {
    exam_series_id: '00000000-0000-0000-0000-000000000101',
    teacher_user_id: '00000000-0000-0000-0000-000000000201',
    student_id: '00000000-0000-0000-0000-000000000301',
    limit: 500,
    offset: -10,
  });

  assert.equal(rows[0]?.status, 'draft');
  assert.match(calls[0]!.sql, /FROM exam_mark_entry_windows mark_window/);
  assert.match(calls[0]!.sql, /JOIN exam_assessments assessment/);
  assert.match(calls[0]!.sql, /JOIN students student/);
  assert.match(calls[0]!.sql, /FROM student_class_assignments class_assignment/);
  assert.match(calls[0]!.sql, /FROM student_subject_enrollments subject_enrollment/);
  assert.match(calls[0]!.sql, /LEFT JOIN exam_marks mark/);
  assert.match(calls[0]!.sql, /mark\.student_id::text = student\.id::text/);
  assert.match(calls[0]!.sql, /\$3::text IS NULL OR student\.id::text = \$3::text/);
  assert.match(calls[0]!.sql, /mark_window\.status = 'open'/);
  assert.match(calls[0]!.sql, /mark_window\.opens_at <= NOW\(\) OR mark_window\.last_action = 'opened'/);
  assert.match(calls[0]!.sql, /assignment\.teacher_user_id = \$4::text/);
  assert.match(calls[0]!.sql, /LIMIT \$6::integer\s+OFFSET \$7::integer/);
  assert.deepEqual(calls[0]!.params, [
    'tenant-a',
    '00000000-0000-0000-0000-000000000101',
    '00000000-0000-0000-0000-000000000301',
    '00000000-0000-0000-0000-000000000201',
    null,
    100,
    0,
    null,
    null,
  ]);
});

test('ExamsRepository validates mark eligibility across legacy text and UUID learner identifiers', async () => {
  const calls: Array<{ sql: string; params: unknown[] }> = [];
  const repository = new ExamsRepository({
    executeWithTenant: async function(_tenantId: string, _context: unknown, callback: (tx: unknown) => Promise<unknown>) {
      return callback({
        $queryRawUnsafe: async (sql: string, ...params: unknown[]) => {
          calls.push({ sql, params });
          return [{ id: '00000000-0000-0000-0000-000000000301' }];
        },
      });
    },
  } as never);

  const learner = await repository.findStudentMarkEligibility({
    tenant_id: 'tenant-a',
    student_id: '00000000-0000-0000-0000-000000000301',
    class_section_id: '00000000-0000-0000-0000-000000000401',
    subject_id: '00000000-0000-0000-0000-000000000501',
  });

  assert.equal(learner?.id, '00000000-0000-0000-0000-000000000301');
  assert.match(calls[0]!.sql, /student\.id::text = \$2::text/);
  assert.match(calls[0]!.sql, /class_assignment\.student_id = student\.id::text/);
  assert.match(calls[0]!.sql, /subject_enrollment\.student_id = student\.id::text/);
  assert.deepEqual(calls[0]!.params, [
    'tenant-a',
    '00000000-0000-0000-0000-000000000301',
    '00000000-0000-0000-0000-000000000401',
    '00000000-0000-0000-0000-000000000501',
  ]);
});

test('ExamsService creates actor-bound signed parent report-card downloads for linked children', async () => {
  const calls: Array<Record<string, unknown>> = [];
  const service = new ExamsService(
    {
      getStore: () => ({
        tenant_id: 'tenant-a',
        user_id: 'parent-1',
        role: 'parent',
        permissions: ['portal:read_own_children'],
      }),
    } as never,
    {
      findReportCardForGuardian: async (input: Record<string, unknown>) => {
        calls.push(input);
        return {
          id: 'report-card-1',
          student_id: 'student-1',
          report_snapshot_id: 'report-card:tenant-a:series-1:student-1:v1',
          status: 'published',
          metadata: {
            report_card: {
              student: { full_name: 'Amina Otieno' },
              totals: { percentage: 84 },
            },
          },
        };
      },
    } as never,
    {
      get: (key: string) => {
        if (key === 'reportCards.downloadSigningSecret') return 'report-card-download-secret-with-32-characters';
        if (key === 'reportCards.downloadTtlSeconds') return 900;
        return undefined;
      },
    } as never,
  );

  const signed = await (service as unknown as {
    createParentReportCardDownload: (reportCardId: string) => Promise<Record<string, unknown>>;
  }).createParentReportCardDownload(' report-card-1 ');

  assert.equal(calls[0]?.tenant_id, 'tenant-a');
  assert.equal(calls[0]?.guardian_user_id, 'parent-1');
  assert.equal(calls[0]?.report_card_id, 'report-card-1');
  assert.equal(signed.report_card_id, 'report-card-1');
  assert.equal(signed.student_id, 'student-1');
  assert.match(String(signed.token), /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);
  assert.match(String(signed.download_url), /^\/exams\/report-cards\/download\//);

  const downloaded = await (service as unknown as {
    readParentReportCardDownloadToken: (token: string) => Promise<Record<string, unknown>>;
  }).readParentReportCardDownloadToken(String(signed.token));

  assert.equal(downloaded.report_snapshot_id, 'report-card:tenant-a:series-1:student-1:v1');
  assert.equal(
    (downloaded.metadata as { report_card?: { totals?: { percentage?: number } } }).report_card?.totals?.percentage,
    84,
  );
});

test('ExamsService hides report-card downloads from unrelated parents', async () => {
  const service = new ExamsService(
    {
      getStore: () => ({
        tenant_id: 'tenant-a',
        user_id: 'parent-2',
        role: 'parent',
        permissions: ['portal:read_own_children'],
      }),
    } as never,
    {
      findReportCardForGuardian: async () => null,
    } as never,
    {
      get: (key: string) => {
        if (key === 'reportCards.downloadSigningSecret') return 'report-card-download-secret-with-32-characters';
        return undefined;
      },
    } as never,
  );

  await assert.rejects(
    () =>
      (service as unknown as {
        createParentReportCardDownload: (reportCardId: string) => Promise<Record<string, unknown>>;
      }).createParentReportCardDownload('report-card-1'),
    NotFoundException,
  );
});

test('ExamsService rejects withdrawn report-card downloads for linked parents', async () => {
  const service = new ExamsService(
    {
      getStore: () => ({
        tenant_id: 'tenant-a',
        user_id: 'parent-1',
        role: 'parent',
        permissions: ['portal:read_own_children'],
      }),
    } as never,
    {
      findReportCardForGuardian: async () => ({
        id: 'report-card-1',
        student_id: 'student-1',
        report_snapshot_id: 'report-card:tenant-a:series-1:student-1:v1',
        status: 'withdrawn',
        metadata: {
          withdrawn_at: '2026-05-18T12:00:00.000Z',
        },
      }),
    } as never,
    {
      get: (key: string) => {
        if (key === 'reportCards.downloadSigningSecret') return 'report-card-download-secret-with-32-characters';
        return undefined;
      },
    } as never,
  );

  await assert.rejects(
    () =>
      (service as unknown as {
        createParentReportCardDownload: (reportCardId: string) => Promise<Record<string, unknown>>;
      }).createParentReportCardDownload('report-card-1'),
    ForbiddenException,
  );
});

test('ExamsController exposes guardian-scoped report-card download endpoints', () => {
  const tokenHandler = ExamsController.prototype.createParentReportCardDownload as unknown as Function;
  const downloadHandler = ExamsController.prototype.downloadParentReportCard as unknown as Function;

  assert.equal(Reflect.getMetadata(PATH_METADATA, tokenHandler), 'report-cards/:reportCardId/parent-download');
  assert.deepEqual(Reflect.getMetadata(PERMISSIONS_KEY, tokenHandler), ['portal:read_own_children']);
  assert.equal(Reflect.getMetadata(PATH_METADATA, downloadHandler), 'report-cards/download/:token');
  assert.deepEqual(Reflect.getMetadata(PERMISSIONS_KEY, downloadHandler), ['portal:read_own_children']);
});

test('ExamsController exposes report-card batch, regeneration, and verification endpoints', () => {
  const batchHandler = ExamsController.prototype.generateReportCardBatch as unknown as Function;
  const batchStatusHandler = ExamsController.prototype.getReportCardBatchStatus as unknown as Function;
  const regenerateHandler = ExamsController.prototype.regenerateReportCard as unknown as Function;
  const verifyHandler = ExamsController.prototype.verifyReportCard as unknown as Function;

  assert.equal(Reflect.getMetadata(PATH_METADATA, batchHandler), 'report-cards/batches');
  assert.deepEqual(Reflect.getMetadata(PERMISSIONS_KEY, batchHandler), ['exams:write']);
  assert.equal(Reflect.getMetadata(PATH_METADATA, batchStatusHandler), 'report-cards/batches/:batchId');
  assert.deepEqual(Reflect.getMetadata(PERMISSIONS_KEY, batchStatusHandler), ['exams:read']);
  assert.equal(Reflect.getMetadata(PATH_METADATA, regenerateHandler), 'report-cards/regenerate');
  assert.deepEqual(Reflect.getMetadata(PERMISSIONS_KEY, regenerateHandler), ['exams:write']);
  assert.equal(Reflect.getMetadata(PATH_METADATA, verifyHandler), 'report-cards/verify/:verificationCode');
  assert.deepEqual(Reflect.getMetadata(PERMISSIONS_KEY, verifyHandler), ['exams:read']);
});

test('ExamsRepository bounds report-card listing and avoids SELECT star', async () => {
  const queries: Array<{ text: string; values: unknown[] }> = [];
  const repository = new ExamsRepository({
        executeWithTenant: async function(tenantId: string, ctx: any, cb: any) {
      return cb({
        $queryRawUnsafe: async (sql: string, ...params: any[]) => {
          const res = await (this as any).query(sql, params);
          return res.rows || res;
        }
      });
    },
query: async (text: string, values: unknown[]) => {
      queries.push({ text, values });
      return { rows: [] };
    },
  } as never);

  await repository.listReportCards({
    tenant_id: 'tenant-a',
    student_id: '00000000-0000-0000-0000-000000000101',
    limit: 999,
    offset: 6,
  } as never);

  const reportCardsQuery = queries[0]?.text ?? '';
  assert.doesNotMatch(reportCardsQuery, /SELECT\s+\*/i);
  assert.match(reportCardsQuery, /card\.id::text/);
  assert.match(reportCardsQuery, /series\.name AS exam_series_name/);
  assert.match(reportCardsQuery, /term\.name AS term/);
  assert.match(reportCardsQuery, /year\.name AS academic_year/);
  assert.match(reportCardsQuery, /student\.admission_number/);
  assert.match(reportCardsQuery, /WHERE card\.tenant_id = \$1/);
  assert.match(
    reportCardsQuery,
    /series\.tenant_id = card\.tenant_id[\s\S]*series\.id = card\.exam_series_id/,
  );
  assert.match(
    reportCardsQuery,
    /term\.tenant_id = series\.tenant_id[\s\S]*term\.id::text = series\.academic_term_id::text/,
  );
  assert.match(
    reportCardsQuery,
    /year\.tenant_id = term\.tenant_id[\s\S]*year\.id = term\.academic_year_id/,
  );
  assert.match(
    reportCardsQuery,
    /student\.tenant_id = card\.tenant_id[\s\S]*student\.id = card\.student_id::text/,
  );
  assert.doesNotMatch(reportCardsQuery, /student\.id = card\.student_id(?:\s|$)/);
  assert.match(reportCardsQuery, /card\.is_current = TRUE/);
  assert.match(reportCardsQuery, /LIMIT \$3::integer/);
  assert.match(reportCardsQuery, /OFFSET \$4::integer/);
  assert.deepEqual(queries[0]?.values, [
    'tenant-a',
    '00000000-0000-0000-0000-000000000101',
    50,
    6,
  ]);
});

test('ExamsRepository chunks report-card batch students with limit and offset', async () => {
  const queries: Array<{ text: string; values: unknown[] }> = [];
  const repository = new ExamsRepository({
        executeWithTenant: async function(tenantId: string, ctx: any, cb: any) {
      return cb({
        $queryRawUnsafe: async (sql: string, ...params: any[]) => {
          const res = await (this as any).query(sql, params);
          return res.rows || res;
        }
      });
    },
query: async (text: string, values: unknown[]) => {
      queries.push({ text, values });
      return { rows: [] };
    },
  } as never);

  await repository.listStudentsForReportCardBatch({
    tenant_id: 'tenant-a',
    exam_series_id: '00000000-0000-0000-0000-000000000201',
    class_section_id: null,
    stream_name: null,
    limit: 1000,
    offset: 20,
  } as never);

  const studentsQuery = queries[0]?.text ?? '';
  assert.doesNotMatch(studentsQuery, /LIMIT 1000/);
  assert.match(studentsQuery, /FROM exam_marks mark/);
  assert.match(studentsQuery, /mark\.status IN \('locked', 'published'\)/);
  assert.match(studentsQuery, /LIMIT \$5::integer/);
  assert.match(studentsQuery, /OFFSET \$6::integer/);
  assert.deepEqual(queries[0]?.values, [
    'tenant-a',
    '00000000-0000-0000-0000-000000000201',
    null,
    null,
    200,
    20,
  ]);
});

test('ExamsRepository checks complete finalized report-card readiness inside one tenant and exam scope', async () => {
  const queries: Array<{ text: string; values: unknown[] }> = [];
  const repository = new ExamsRepository({
    executeWithTenant: async function(tenantId: string, ctx: any, cb: any) {
      return cb({
        $queryRawUnsafe: async (sql: string, ...params: any[]) => {
          const res = await (this as any).query(sql, params);
          return res.rows || res;
        },
      });
    },
    query: async (text: string, values: unknown[]) => {
      queries.push({ text, values });
      return { rows: [{ expected_mark_count: 2, ready_mark_count: 2, not_ready_mark_count: 0, learner_count: 1 }] };
    },
  } as never);

  const readiness = await repository.getReportCardBatchReadiness({
    tenant_id: 'tenant-a',
    exam_series_id: '00000000-0000-0000-0000-000000000201',
    class_section_id: '00000000-0000-0000-0000-000000000202',
    stream_name: 'North',
  });

  assert.equal(readiness.not_ready_mark_count, 0);
  assert.match(queries[0]?.text ?? '', /WHERE mark\.tenant_id = \$1/);
  assert.match(queries[0]?.text ?? '', /mark\.exam_series_id = \$2::uuid/);
  assert.match(queries[0]?.text ?? '', /mark\.status IN \('locked', 'published'\)/);
  assert.deepEqual(queries[0]?.values, [
    'tenant-a',
    '00000000-0000-0000-0000-000000000201',
    '00000000-0000-0000-0000-000000000202',
    'North',
  ]);
});

test('ReportCardGenerationService refuses an empty or unfinalized report-card scope before creating a batch', async () => {
  let batchCreated = false;
  const service = new ReportCardGenerationService(
    {
      getReportCardBatchReadiness: async () => ({
        expected_mark_count: 0,
        ready_mark_count: 0,
        not_ready_mark_count: 0,
        learner_count: 0,
      }),
      listStudentsForReportCardBatch: async (input: Record<string, unknown>) => {
        assert.equal(input.exam_series_id, '00000000-0000-0000-0000-000000000201');
        return [];
      },
      createReportCardGenerationBatch: async () => {
        batchCreated = true;
        return { id: 'batch-1' };
      },
    } as never,
    {} as never,
  );

  await assert.rejects(
    () => service.generateReportCardBatch({
      tenant_id: 'tenant-a',
      actor_user_id: '00000000-0000-0000-0000-000000000301',
      exam_series_id: '00000000-0000-0000-0000-000000000201',
    }),
    /No active learner-subject records are available/,
  );
  assert.equal(batchCreated, false);
});

test('ReportCardGenerationService refuses a partially finalized report-card scope', async () => {
  let studentsListed = false;
  let batchCreated = false;
  const service = new ReportCardGenerationService(
    {
      getReportCardBatchReadiness: async () => ({
        expected_mark_count: 3,
        ready_mark_count: 2,
        not_ready_mark_count: 1,
        learner_count: 2,
      }),
      listStudentsForReportCardBatch: async () => {
        studentsListed = true;
        return [];
      },
      createReportCardGenerationBatch: async () => {
        batchCreated = true;
        return { id: 'batch-1' };
      },
    } as never,
    {} as never,
  );

  await assert.rejects(
    () => service.generateReportCardBatch({
      tenant_id: 'tenant-a',
      actor_user_id: '00000000-0000-0000-0000-000000000301',
      exam_series_id: '00000000-0000-0000-0000-000000000201',
    }),
    /1 learner-subject mark must be entered, moderated, and locked/,
  );
  assert.equal(studentsListed, false);
  assert.equal(batchCreated, false);
});

test('ExamsService exposes one department-scoped workflow projection for HOD handoff', async () => {
  let capturedInput: Record<string, unknown> | null = null;
  const service = new ExamsService(
    {
      getStore: () => ({
        tenant_id: 'tenant-a',
        user_id: '00000000-0000-0000-0000-000000000401',
        role: 'hod',
        permissions: ['exams:read', 'exams:review'],
      }),
    } as never,
    {
      listDepartmentsLedByUser: async () => ['00000000-0000-0000-0000-000000000501'],
      getWorkflowOverview: async (input: Record<string, unknown>) => {
        capturedInput = input;
        return {
          series: [{
            id: 'series-1',
            name: 'Term 3',
            status: 'submitted',
            term_name: 'Term 3',
            assessment_count: 1,
            subject_count: 1,
            entry_window_count: 1,
            open_window_count: 1,
            class_count: 1,
            learner_count: 2,
            total_marks: 2,
            draft_marks: 0,
            submitted_marks: 2,
            reviewed_marks: 0,
            locked_marks: 0,
            published_marks: 0,
            total_report_cards: 0,
            draft_report_cards: 0,
            review_report_cards: 0,
            approved_report_cards: 0,
            published_report_cards: 0,
          }],
          moderation_batches: [{ id: 'batch-1', mark_ids: ['mark-1', 'mark-2'], mark_count: 2 }],
        };
      },
    } as never,
  );

  const result = await service.getWorkflowOverview();
  assert.deepEqual(capturedInput, {
    tenant_id: 'tenant-a',
    department_ids: ['00000000-0000-0000-0000-000000000501'],
    limit: 25,
  });
  assert.equal(result.scope.level, 'department');
  assert.equal(result.series[0]?.stage, 'hod_moderation');
  assert.equal(result.series[0]?.next_owner, 'Head of Department');
  assert.equal(result.metrics.marks_awaiting_moderation, 2);
  assert.deepEqual(result.moderation_batches[0]?.mark_ids, ['mark-1', 'mark-2']);
});

test('ExamsController exposes the shared workflow as an exams read endpoint', () => {
  const handler = ExamsController.prototype.getWorkflowOverview as unknown as Function;
  assert.equal(Reflect.getMetadata(PATH_METADATA, handler), 'workflow');
  assert.deepEqual(Reflect.getMetadata(PERMISSIONS_KEY, handler), ['exams:read']);
});

test('ExamsService normalizes report-card list pagination before querying', async () => {
  let capturedInput: Record<string, unknown> | null = null;
  const service = new ExamsService(
    { getStore: () => ({ tenant_id: 'tenant-a', user_id: 'exam-1', role: 'exams_manager', permissions: ['exams:read'] }) } as never,
    {
      listReportCards: async (input: Record<string, unknown>) => {
        capturedInput = input;
        return [];
      },
    } as never,
  );

  await service.listReportCards({
    student_id: ' 00000000-0000-0000-0000-000000000101 ',
    limit: '999',
    offset: '-5',
  });

  assert.deepEqual(capturedInput, {
    tenant_id: 'tenant-a',
    student_id: '00000000-0000-0000-0000-000000000101',
    limit: 50,
    offset: 0,
  });
});

test('ExamsService lists parent report cards through active guardian scope only', async () => {
  let capturedInput: Record<string, unknown> | null = null;
  const service = new ExamsService(
    { getStore: () => ({ tenant_id: 'tenant-a', user_id: 'parent-1', role: 'parent', permissions: ['portal:read_own_children'] }) } as never,
    {
      listGuardianReportCards: async (input: Record<string, unknown>) => {
        capturedInput = input;
        return [];
      },
    } as never,
  );

  await service.listGuardianReportCards({
    studentId: ' 00000000-0000-0000-0000-000000000101 ',
    status: 'draft,published',
    limit: '999',
    offset: '-10',
  });

  assert.deepEqual(capturedInput, {
    tenant_id: 'tenant-a',
    guardian_user_id: 'parent-1',
    student_id: '00000000-0000-0000-0000-000000000101',
    limit: 50,
    offset: 0,
  });
});

test('ExamsService lists student report cards for the authenticated student only', async () => {
  let capturedInput: Record<string, unknown> | null = null;
  const service = new ExamsService(
    { getStore: () => ({ tenant_id: 'tenant-a', user_id: '00000000-0000-0000-0000-000000000201', role: 'student', permissions: ['student-portal:read'] }) } as never,
    {
      listStudentReportCards: async (input: Record<string, unknown>) => {
        capturedInput = input;
        return [];
      },
    } as never,
  );

  await service.listStudentPortalReportCards({
    student_id: '00000000-0000-0000-0000-000000000999',
    limit: '2',
    offset: '4',
  });

  assert.deepEqual(capturedInput, {
    tenant_id: 'tenant-a',
    student_id: '00000000-0000-0000-0000-000000000201',
    limit: 2,
    offset: 4,
  });
});

test('ExamsRepository lists only published report cards linked to the active guardian', async () => {
  const queries: Array<{ text: string; values: unknown[] }> = [];
  const repository = new ExamsRepository({
        executeWithTenant: async function(tenantId: string, ctx: any, cb: any) {
      return cb({
        $queryRawUnsafe: async (sql: string, ...params: any[]) => {
          const res = await (this as any).query(sql, params);
          return res.rows || res;
        }
      });
    },
query: async (text: string, values: unknown[]) => {
      queries.push({ text, values });
      return { rows: [] };
    },
  } as never);

  await repository.listGuardianReportCards({
    tenant_id: 'tenant-a',
    guardian_user_id: '00000000-0000-0000-0000-000000000301',
    student_id: '00000000-0000-0000-0000-000000000101',
    limit: 999,
    offset: 3,
  });

  const sql = queries[0]?.text ?? '';
  assert.match(sql, /INNER JOIN student_guardians guardian/);
  assert.match(sql, /guardian\.student_id = card\.student_id::text/);
  assert.match(sql, /student\.id = card\.student_id::text/);
  assert.match(sql, /guardian\.user_id = \$2::uuid/);
  assert.match(sql, /guardian\.status = 'active'/);
  assert.match(sql, /term\.id::text = series\.academic_term_id::text/);
  assert.match(sql, /card\.status = 'published'/);
  assert.match(sql, /card\.tenant_id = \$1/);
  assert.deepEqual(queries[0]?.values, [
    'tenant-a',
    '00000000-0000-0000-0000-000000000301',
    '00000000-0000-0000-0000-000000000101',
    50,
    3,
  ]);
});

test('ExamsRepository lists only published report cards owned by the student', async () => {
  const queries: Array<{ text: string; values: unknown[] }> = [];
  const repository = new ExamsRepository({
        executeWithTenant: async function(tenantId: string, ctx: any, cb: any) {
      return cb({
        $queryRawUnsafe: async (sql: string, ...params: any[]) => {
          const res = await (this as any).query(sql, params);
          return res.rows || res;
        }
      });
    },
query: async (text: string, values: unknown[]) => {
      queries.push({ text, values });
      return { rows: [] };
    },
  } as never);

  await repository.listStudentReportCards({
    tenant_id: 'tenant-a',
    student_id: '00000000-0000-0000-0000-000000000201',
    limit: 999,
    offset: 8,
  });

  const sql = queries[0]?.text ?? '';
  assert.match(sql, /INNER JOIN students student/);
  assert.match(sql, /student\.id = card\.student_id::text/);
  assert.match(sql, /card\.student_id = \$2::uuid/);
  assert.match(sql, /card\.status = 'published'/);
  assert.match(sql, /term\.id::text = series\.academic_term_id::text/);
  assert.match(sql, /card\.tenant_id = \$1/);
  assert.deepEqual(queries[0]?.values, [
    'tenant-a',
    '00000000-0000-0000-0000-000000000201',
    50,
    8,
  ]);
});

test('Parent and student portal controllers expose scoped report-card routes', () => {
  const parentList = ParentPortalController.prototype.getReportCards as unknown as Function;
  const parentDownload = ParentPortalController.prototype.downloadReportCard as unknown as Function;
  const studentList = StudentController.prototype.getReportCards as unknown as Function;
  const studentDownload = StudentController.prototype.downloadReportCard as unknown as Function;

  assert.equal(Reflect.getMetadata(PATH_METADATA, parentList), 'report-cards');
  assert.deepEqual(Reflect.getMetadata(PERMISSIONS_KEY, parentList), ['portal:read_own_children']);
  assert.equal(Reflect.getMetadata(PATH_METADATA, parentDownload), 'report-cards/:reportCardId/download');
  assert.deepEqual(Reflect.getMetadata(PERMISSIONS_KEY, parentDownload), ['portal:read_own_children']);
  assert.equal(Reflect.getMetadata(PATH_METADATA, studentList), 'report-cards');
  assert.deepEqual(Reflect.getMetadata(PERMISSIONS_KEY, studentList), ['student-portal:read']);
  assert.equal(Reflect.getMetadata(PATH_METADATA, studentDownload), 'report-cards/:reportCardId/download');
  assert.deepEqual(Reflect.getMetadata(PERMISSIONS_KEY, studentDownload), ['student-portal:read']);
});

test('ExamsController exposes configuration, draft, alignment, review, and lifecycle endpoints', () => {
  const configureExam = Reflect.getMetadata(PATH_METADATA, ExamsController.prototype.configureExam);
  const saveDraft = Reflect.getMetadata(PATH_METADATA, ExamsController.prototype.saveDraft);
  const alignExam = Reflect.getMetadata(PATH_METADATA, ExamsController.prototype.alignExam);
  const reviewExam = Reflect.getMetadata(PATH_METADATA, ExamsController.prototype.reviewExam);
  const updateLifecycle = Reflect.getMetadata(PATH_METADATA, ExamsController.prototype.updateLifecycle);

  assert.equal(configureExam, 'configuration');
  assert.equal(saveDraft, 'draft');
  assert.equal(alignExam, 'alignment');
  assert.equal(reviewExam, 'review');
  assert.equal(updateLifecycle, 'lifecycle');
});

test('ExamsService moderateMarks updates mark statuses and adds versions for rejected marks', async () => {
  const calls: string[] = [];
  const service = new ExamsService(
    { getStore: () => ({ tenant_id: 'tenant-a', user_id: 'hod-1', role: 'admin', permissions: ['exams:approve'] }) } as never,
    {
      moderateMarks: async (input: Record<string, unknown>) => {
        calls.push(`moderate:${input.action}`);
        return [{ id: 'mark-1', score: 85 }];
      },
      createMarkVersion: async (input: Record<string, unknown>) => {
        calls.push(`version:${input.approval_state}`);
      },
    } as never,
  );

  const result = await service.moderateMarks({
    mark_ids: ['mark-1'],
    action: 'return_for_correction',
    reason: 'Score too high',
  });

  assert.equal(result.updated_count, 1);
  assert.deepEqual(calls, ['moderate:return_for_correction', 'version:rejected']);
});

test('ExamsService validates moderation before mutating marks', async () => {
  const calls: string[] = [];
  const service = new ExamsService(
    { getStore: () => ({ tenant_id: 'tenant-a', user_id: 'teacher-1', role: 'teacher', permissions: ['exams:enter-marks'] }) } as never,
    {
      moderateMarks: async () => {
        calls.push('moderate');
        return [];
      },
    } as never,
  );

  await assert.rejects(
    () => service.moderateMarks({ mark_ids: ['mark-1'], action: 'approve' }),
    /Exam review permission is required/i,
  );
  assert.equal(calls.length, 0);

  const hodService = new ExamsService(
    { getStore: () => ({ tenant_id: 'tenant-a', user_id: 'hod-1', role: 'hod', permissions: ['exams:review'] }) } as never,
    {
      moderateMarks: async () => {
        calls.push('moderate');
        return [];
      },
    } as never,
  );

  await assert.rejects(
    () => hodService.moderateMarks({ mark_ids: ['mark-1'], action: 'return_for_correction' }),
    /Reason is required/i,
  );
  assert.equal(calls.length, 0);
});

test('ExamsService rejects fake moderation success when no marks changed', async () => {
  const service = new ExamsService(
    { getStore: () => ({ tenant_id: 'tenant-a', user_id: 'officer-1', role: 'admin', permissions: ['exams:approve'] }) } as never,
    {
      moderateMarks: async () => [],
    } as never,
  );

  await assert.rejects(
    () => service.moderateMarks({ mark_ids: ['mark-1'], action: 'approve' }),
    /No selected marks were available for moderation/i,
  );
});

test('extractPersistedReportCardPayload preserves entered zero and missing-mark evidence', () => {
  const payload = extractPersistedReportCardPayload(JSON.stringify({
    report_card: {
      generated_at: '2026-05-20T08:00:00.000Z',
      exam_series: { id: 'series-1', name: 'Term 2 Opener' },
      student: { id: 'student-1', full_name: 'Amina Otieno' },
      attendance: null,
      template_fields: {
        school_name: 'Shule Demo Primary',
        learner_name: 'Amina Otieno',
      },
      totals: {
        total_score: 0,
        total_max_score: 100,
        mean_score: 0,
        percentage: 0,
      },
      subjects: [
        {
          subject_id: 'subject-1',
          subject_name: 'Mathematics',
          score: 0,
          score_status: 'entered',
          max_score: 100,
          grade_label: 'E',
          remarks: null,
        },
        {
          subject_id: 'subject-2',
          subject_name: 'English',
          score: null,
          score_status: 'absent',
          max_score: 100,
          grade_label: null,
          remarks: null,
        },
      ],
    },
  }));

  assert.equal(payload?.subjects[0]?.score, 0);
  assert.equal(payload?.subjects[0]?.score_status, 'entered');
  assert.equal(payload?.subjects[1]?.score, null);
  assert.equal(payload?.subjects[1]?.score_status, 'absent');
  assert.equal(extractPersistedReportCardPayload({ report_card: { generated_at: 'now' } }), null);
});

test('ExamsService limits HOD moderation to assigned departments', async () => {
  const calls: Array<{ method: string; input: Record<string, unknown> }> = [];
  const service = new ExamsService(
    { getStore: () => ({ tenant_id: 'tenant-a', user_id: 'hod-1', role: 'hod', permissions: ['exams:review'] }) } as never,
    {
      listDepartmentsLedByUser: async (input: Record<string, unknown>) => {
        calls.push({ method: 'listDepartmentsLedByUser', input });
        return ['dept-1'];
      },
      listMarks: async (input: Record<string, unknown>) => {
        calls.push({ method: 'listMarks', input });
        return [];
      },
      moderateMarks: async (input: Record<string, unknown>) => {
        calls.push({ method: 'moderateMarks', input });
        return [{ id: 'mark-1', score: 85 }];
      },
    } as never,
  );

  await service.getDepartmentMarks({});
  assert.deepEqual(calls[1], {
    method: 'listMarks',
    input: {
      tenant_id: 'tenant-a',
      department_ids: ['dept-1'],
      status_in: ['submitted', 'reviewed'],
      limit: 25,
      offset: 0,
    },
  });

  await assert.rejects(
    () => service.getDepartmentMarks({ department_id: 'dept-2' }),
    /not assigned to this department/i,
  );

  const result = await service.moderateMarks({ mark_ids: ['mark-1'], action: 'approve' });
  assert.equal(result.updated_count, 1);
  assert.deepEqual(calls.at(-1), {
    method: 'moderateMarks',
    input: {
      tenant_id: 'tenant-a',
      mark_ids: ['mark-1'],
      action: 'approve',
      actor_user_id: 'hod-1',
      department_ids: ['dept-1'],
    },
  });
});

test('ExamsService restricts intervention reads to the current tenant and assigned teacher', async () => {
  let capturedInput: Record<string, unknown> | undefined;
  const service = new ExamsService(
    {
      getStore: () => ({
        tenant_id: 'tenant-a',
        user_id: 'teacher-a',
        role: 'teacher',
        permissions: ['academics:read'],
      }),
    } as never,
    {
      listAcademicInterventions: async (input: Record<string, unknown>) => {
        capturedInput = input;
        return {
          metrics: {
            active_interventions: 0,
            students_targeted: 0,
            completed: 0,
            overdue: 0,
          },
          items: [],
          academicinterventionsList: [],
        };
      },
    } as never,
  );

  await service.listAcademicInterventions({
    status: 'active,monitoring',
    owner_user_id: 'teacher-from-another-school',
    limit: '999',
  });

  assert.deepEqual(capturedInput, {
    tenant_id: 'tenant-a',
    statuses: ['active', 'monitoring'],
    student_id: undefined,
    owner_user_id: 'teacher-a',
    hod_user_id: undefined,
    limit: 250,
  });
});

test('ExamsService rejects unresolved intervention scope before persistence', async () => {
  let persisted = false;
  const service = new ExamsService(
    {
      getStore: () => ({
        tenant_id: 'tenant-a',
        user_id: 'deputy-a',
        role: 'deputy_principal',
        permissions: ['academics:read', 'deputy:write'],
      }),
    } as never,
    {
      resolveAcademicInterventionScope: async () => ({
        class_section_id: 'class-a',
        class_name: 'Form 2 East',
        subject_id: null,
      }),
      createAcademicIntervention: async () => {
        persisted = true;
        return null;
      },
    } as never,
  );

  await assert.rejects(
    () => service.createAcademicIntervention({
      class_section_id: 'class-a',
      subject_id: 'subject-from-another-school',
      trigger_reason: 'The class needs targeted Mathematics support.',
      plan: 'Run two guided practice sessions each week.',
    }),
    /Subject or learning area was not found as an active record in this school/i,
  );
  assert.equal(persisted, false);
});

test('ExamsService persists interventions and emits school-scoped events, notifications, and owner tasks', async () => {
  const calls: Array<{ method: string; input: Record<string, any> }> = [];
  const intervention = {
    id: 'intervention-a',
    tenant_id: 'tenant-a',
    class_section_id: 'class-a',
    subject_id: 'subject-a',
    owner_user_id: 'teacher-a',
    hod_user_id: 'hod-a',
    priority: 'high',
    status: 'planned',
    updated_at: '2026-07-26T08:00:00.000Z',
  };
  const service = new ExamsService(
    {
      getStore: () => ({
        tenant_id: 'tenant-a',
        user_id: 'deputy-a',
        role: 'deputy_principal',
        permissions: ['academics:read', 'deputy:write'],
      }),
    } as never,
    {
      resolveAcademicInterventionScope: async (input: Record<string, unknown>) => {
        calls.push({ method: 'scope', input });
        return {
          class_section_id: 'class-a',
          class_name: 'Form 2 East',
          subject_id: 'subject-a',
          subject_name: 'Mathematics',
          owner_user_id: 'teacher-a',
          owner_name: 'Mary Teacher',
          hod_user_id: 'hod-a',
          hod_name: 'Peter HOD',
        };
      },
      createAcademicIntervention: async (input: Record<string, unknown>) => {
        calls.push({ method: 'persist', input });
        return { ...intervention, ...input };
      },
      listAcademicInterventionRecipients: async (input: Record<string, unknown>) => {
        calls.push({ method: 'recipients', input });
        return [
          { user_id: 'teacher-a', display_name: 'Mary Teacher' },
          { user_id: 'hod-a', display_name: 'Peter HOD' },
        ];
      },
    } as never,
    undefined,
    undefined,
    {
      recordSchoolOperation: async (input: Record<string, any>) => {
        calls.push({ method: 'event', input });
      },
    } as never,
    undefined,
    {
      createNotification: async (input: Record<string, any>) => {
        calls.push({ method: 'notification', input });
      },
      createTask: async (input: Record<string, any>) => {
        calls.push({ method: 'task', input });
      },
    } as never,
  );

  const result = await service.createAcademicIntervention({
    class_section_id: 'class-a',
    subject_id: 'subject-a',
    owner_user_id: 'teacher-a',
    trigger_reason: 'The class mean is below the approved target.',
    plan: 'Provide guided remediation and reassess after two weeks.',
    target: { description: 'Raise the class mean to 60 percent.' },
    priority: 'high',
    starts_on: '2026-07-27',
    due_on: '2026-08-10',
  });

  assert.equal(result.success, true);
  assert.equal(result.data.tenant_id, 'tenant-a');
  const persisted = calls.find((call) => call.method === 'persist')?.input;
  assert.equal(persisted?.tenant_id, 'tenant-a');
  assert.equal(persisted?.class_section_id, 'class-a');
  assert.equal(persisted?.subject_id, 'subject-a');
  assert.equal(persisted?.owner_user_id, 'teacher-a');
  const event = calls.find((call) => call.method === 'event')?.input;
  assert.equal(event?.schoolId, 'tenant-a');
  assert.equal(event?.event.type, 'academic_intervention.created');
  assert.equal(
    calls.filter((call) => call.method === 'notification').length,
    2,
  );
  const ownerTask = calls.find((call) => call.method === 'task')?.input;
  assert.equal(ownerTask?.tenant_id, 'tenant-a');
  assert.equal(ownerTask?.assigned_to_user_id, 'teacher-a');
});

test('ExamsService requires valid evidence and a measured outcome before completing an intervention', async () => {
  const writes: Record<string, unknown>[] = [];
  const existing = {
    id: 'intervention-a',
    tenant_id: 'tenant-a',
    owner_user_id: 'teacher-a',
    hod_user_id: 'hod-a',
    priority: 'normal',
    status: 'active',
    updated_at: '2026-07-26T08:00:00.000Z',
  };
  const service = new ExamsService(
    {
      getStore: () => ({
        tenant_id: 'tenant-a',
        user_id: 'dean-a',
        role: 'dean_academics',
        permissions: ['academics:read', 'exams:approve'],
      }),
    } as never,
    {
      findAcademicIntervention: async () => existing,
      addAcademicInterventionUpdate: async (input: Record<string, unknown>) => {
        writes.push(input);
        return {
          ...existing,
          ...input,
          update_id: 'update-a',
          status: input.status ?? existing.status,
        };
      },
    } as never,
  );

  await assert.rejects(
    () => service.addAcademicInterventionUpdate('intervention-a', {
      notes: 'Support cycle completed.',
      status: 'completed',
    }),
    /measured outcome is required/i,
  );
  await assert.rejects(
    () => service.addAcademicInterventionUpdate('intervention-a', {
      notes: 'Learner was absent for reassessment.',
      status: 'completed',
      score: 0,
      score_status: 'absent',
      outcome: { summary: 'Reassessment could not be completed.' },
    }),
    /absent intervention evidence cannot include a numeric score/i,
  );
  assert.equal(writes.length, 0);

  const result = await service.addAcademicInterventionUpdate('intervention-a', {
    update_type: 'reassessment',
    notes: 'The learner met the agreed improvement target.',
    status: 'completed',
    score: 68,
    score_status: 'entered',
    outcome: {
      summary: 'The support plan improved the learner result.',
      measured_result: 'Score increased from 42 to 68.',
    },
  });

  assert.equal(result.success, true);
  assert.equal(writes.length, 1);
  assert.equal(writes[0].tenant_id, 'tenant-a');
  assert.equal(writes[0].score, 68);
  assert.equal(writes[0].score_status, 'entered');
  assert.equal(writes[0].status, 'completed');
});

test('ExamsService notifies only the active HOD attached to the school intervention', async () => {
  const calls: Array<{ method: string; input: Record<string, any> }> = [];
  const intervention = {
    id: 'intervention-a',
    tenant_id: 'tenant-a',
    subject_id: 'subject-a',
    owner_user_id: 'teacher-a',
    hod_user_id: 'hod-a',
    trigger_reason: 'Mathematics performance requires review.',
    priority: 'high',
    status: 'active',
    updated_at: '2026-07-26T08:00:00.000Z',
  };
  const service = new ExamsService(
    {
      getStore: () => ({
        tenant_id: 'tenant-a',
        user_id: 'deputy-a',
        role: 'deputy_principal',
        permissions: ['academics:read', 'deputy:write'],
      }),
    } as never,
    {
      findAcademicIntervention: async (input: Record<string, unknown>) => {
        calls.push({ method: 'find', input });
        return intervention;
      },
      listAcademicInterventionRecipients: async (input: Record<string, unknown>) => {
        calls.push({ method: 'recipients', input });
        return [
          { user_id: 'teacher-a', display_name: 'Mary Teacher' },
          { user_id: 'hod-a', display_name: 'Peter HOD' },
        ];
      },
      addAcademicInterventionUpdate: async (input: Record<string, unknown>) => {
        calls.push({ method: 'history', input });
        return { ...intervention, ...input, update_id: 'update-a' };
      },
    } as never,
    undefined,
    undefined,
    {
      recordSchoolOperation: async (input: Record<string, any>) => {
        calls.push({ method: 'event', input });
      },
    } as never,
    undefined,
    {
      createNotification: async (input: Record<string, any>) => {
        calls.push({ method: 'notification', input });
      },
    } as never,
  );

  const result = await service.notifyAcademicInterventionHod(
    'intervention-a',
    'Please review the remediation plan before Friday.',
  );

  assert.equal(result.data.recipient_user_id, 'hod-a');
  assert.equal(calls[0].input.tenant_id, 'tenant-a');
  const directNotification = calls.find(
    (call) => call.method === 'notification'
      && call.input.notification_key?.startsWith('academic-intervention-hod:'),
  )?.input;
  assert.equal(directNotification?.tenant_id, 'tenant-a');
  assert.equal(directNotification?.recipient_user_id, 'hod-a');
  assert.equal(
    calls.find((call) => call.method === 'event')?.input.event.type,
    'academic_intervention.review_due',
  );
});

test('ExamsRepository applies identical tenant and staff scope to intervention metrics and records', async () => {
  const queries: Array<{ text: string; values: unknown[] }> = [];
  const repository = new ExamsRepository({
    executeWithTenant: async function(_tenantId: string, _ctx: unknown, callback: Function) {
      return callback({
        $queryRawUnsafe: async (text: string, ...values: unknown[]) => {
          queries.push({ text, values });
          return [];
        },
      });
    },
  } as never);

  await repository.listAcademicInterventions({
    tenant_id: 'tenant-a',
    statuses: ['active'],
    student_id: 'student-a',
    owner_user_id: 'teacher-a',
    hod_user_id: 'hod-a',
    limit: 25,
  });

  assert.equal(queries.length, 2);
  assert.deepEqual(queries[0].values, [
    'tenant-a',
    ['active'],
    'student-a',
    'teacher-a',
    'hod-a',
  ]);
  assert.deepEqual(queries[1].values, [
    'tenant-a',
    ['active'],
    'student-a',
    'teacher-a',
    'hod-a',
    25,
  ]);
  for (const query of queries) {
    assert.match(query.text, /tenant_id = \$1|intervention\.tenant_id = \$1/);
    assert.match(query.text, /owner_user_id::text = \$4::text/);
    assert.match(query.text, /hod_user_id::text = \$5::text/);
  }
});

test('ExamsController exposes new moderation and publishing endpoints', () => {
  const getDepartmentMarks = Reflect.getMetadata(PATH_METADATA, ExamsController.prototype.getDepartmentMarks);
  const moderateMarks = Reflect.getMetadata(PATH_METADATA, ExamsController.prototype.moderateMarks);
  const getDepartmentMarksPerms = Reflect.getMetadata(PERMISSIONS_KEY, ExamsController.prototype.getDepartmentMarks);
  const moderateMarksPerms = Reflect.getMetadata(PERMISSIONS_KEY, ExamsController.prototype.moderateMarks);
  const lockMarks = Reflect.getMetadata(PATH_METADATA, ExamsController.prototype.lockMarks);
  const publishExamSeries = Reflect.getMetadata(PATH_METADATA, ExamsController.prototype.publishExamSeries);
  const publishExamSeriesPerms = Reflect.getMetadata(PERMISSIONS_KEY, ExamsController.prototype.publishExamSeries);
  const unpublishExamSeries = Reflect.getMetadata(PATH_METADATA, ExamsController.prototype.unpublishExamSeries);
  const unpublishExamSeriesPerms = Reflect.getMetadata(PERMISSIONS_KEY, ExamsController.prototype.unpublishExamSeries);
  const transitionReportCard = Reflect.getMetadata(PATH_METADATA, ExamsController.prototype.transitionReportCard);
  const transitionReportCardPerms = Reflect.getMetadata(PERMISSIONS_KEY, ExamsController.prototype.transitionReportCard);
  const generateReportCardPerms = Reflect.getMetadata(PERMISSIONS_KEY, ExamsController.prototype.generateReportCard);
  const listInterventions = Reflect.getMetadata(PATH_METADATA, ExamsController.prototype.listAcademicInterventions);
  const createIntervention = Reflect.getMetadata(PATH_METADATA, ExamsController.prototype.createAcademicIntervention);
  const updateIntervention = Reflect.getMetadata(PATH_METADATA, ExamsController.prototype.addAcademicInterventionUpdate);
  const notifyInterventionHod = Reflect.getMetadata(PATH_METADATA, ExamsController.prototype.notifyAcademicInterventionHod);
  const interventionPermissions = [
    ExamsController.prototype.listAcademicInterventions,
    ExamsController.prototype.createAcademicIntervention,
    ExamsController.prototype.addAcademicInterventionUpdate,
    ExamsController.prototype.notifyAcademicInterventionHod,
  ].map((handler) => Reflect.getMetadata(PERMISSIONS_KEY, handler));

  assert.equal(getDepartmentMarks, 'marks/department');
  assert.equal(moderateMarks, 'marks/moderate');
  assert.deepEqual(getDepartmentMarksPerms, ['exams:review']);
  assert.deepEqual(moderateMarksPerms, ['exams:review']);
  assert.equal(lockMarks, 'marks/lock');
  assert.equal(publishExamSeries, 'series/:id/publish');
  assert.deepEqual(publishExamSeriesPerms, ['exams:read']);
  assert.equal(unpublishExamSeries, 'series/:id/unpublish');
  assert.deepEqual(unpublishExamSeriesPerms, ['exams:read']);
  assert.equal(transitionReportCard, 'report-cards/:reportCardId/transition');
  assert.deepEqual(transitionReportCardPerms, ['exams:read']);
  assert.deepEqual(generateReportCardPerms, ['exams:write']);
  assert.equal(listInterventions, 'interventions');
  assert.equal(createIntervention, 'interventions');
  assert.equal(updateIntervention, 'interventions/:interventionId/updates');
  assert.equal(notifyInterventionHod, 'interventions/:interventionId/notify-hod');
  assert.deepEqual(interventionPermissions, [
    ['academics:read'],
    ['academics:read'],
    ['academics:read'],
    ['academics:read'],
  ]);
});


test('ExamsService enforces strict Mark Entry permission rules based on teacher allocation', async () => {
  const service = new ExamsService(
    { getStore: () => ({ tenant_id: 'tenant-a', user_id: 'teacher-2', role: 'teacher', permissions: ['academics:write'] }) } as never,
    {
      findTeacherAssignment: async () => null, // No allocation found
      findSeriesState: async () => ({ status: 'draft', locked_at: null, published_at: null }),
    } as never,
  );

  await assert.rejects(
    () => service.enterMark({
      exam_series_id: 'series-1',
      assessment_id: 'assessment-1',
      academic_term_id: 'term-1',
      class_section_id: 'class-1',
      subject_id: 'subject-1',
      student_id: 'student-1',
      score: 84,
    }),
    /Teacher is not assigned to this subject/i
  );
});

test('ExamsService handles HOD Review workflow for returning submitted marks', async () => {
  const repositoryCalls: Array<{ method: string; args: any }> = [];

  const mockRepository = {
    listDepartmentsLedByUser: async (args: any) => {
      repositoryCalls.push({ method: 'listDepartmentsLedByUser', args });
      return ['dept-1'];
    },
    moderateMarks: async (args: any) => {
      repositoryCalls.push({ method: 'moderateMarks', args });
      return [
        { id: 'mark-1', score: 85 }
      ];
    },
    createMarkVersion: async (args: any) => {
      repositoryCalls.push({ method: 'createMarkVersion', args });
      return { id: 'version-1' };
    }
  };

  const mockRequestContext = {
    getStore: () => ({
      tenant_id: 'tenant-a',
      user_id: 'hod-1',
      role: 'hod',
      permissions: ['exams:review']
    })
  };

  const service = new ExamsService(
    mockRequestContext as never,
    mockRepository as never
  );

  const res = await service.moderateMarks({
    mark_ids: ['mark-1'],
    action: 'return_for_correction',
    reason: 'Incorrect entry',
  });

  assert.deepEqual(res, { success: true, updated_count: 1 });
  assert.equal(repositoryCalls.length, 3);
  assert.equal(repositoryCalls[0].method, 'listDepartmentsLedByUser');
  assert.deepEqual(repositoryCalls[0].args, {
    tenant_id: 'tenant-a',
    user_id: 'hod-1'
  });
  assert.equal(repositoryCalls[1].method, 'moderateMarks');
  assert.deepEqual(repositoryCalls[1].args, {
    tenant_id: 'tenant-a',
    mark_ids: ['mark-1'],
    action: 'return_for_correction',
    actor_user_id: 'hod-1',
    department_ids: ['dept-1']
  });
  assert.equal(repositoryCalls[2].method, 'createMarkVersion');
  assert.deepEqual(repositoryCalls[2].args, {
    tenant_id: 'tenant-a',
    mark_id: 'mark-1',
    original_score: 85,
    correction_score: 85,
    corrected_by_user_id: 'hod-1',
    reason: 'Incorrect entry',
    approval_state: 'rejected'
  });
});

test('ExamsController and ExamsService support live exams analytics with isolation', async () => {
  // Verify controller route metadata
  const analyticsPath = Reflect.getMetadata(PATH_METADATA, ExamsController.prototype.getAnalytics);
  const analyticsPerms = Reflect.getMetadata(PERMISSIONS_KEY, ExamsController.prototype.getAnalytics);
  
  assert.equal(analyticsPath, 'analytics');
  assert.deepEqual(analyticsPerms, ['exams:read']);

  // Verify ExamsService calls repository with requireTenantId
  let passedTenantId = '';
  let passedScope: Record<string, unknown> | undefined;
  const service = new ExamsService(
    { getStore: () => ({ tenant_id: 'tenant-abc', user_id: 'officer-1', role: 'admin', permissions: ['exams:read'] }) } as never,
    {
      getAnalytics: async (tenantId: string, scope: Record<string, unknown>) => {
        passedTenantId = tenantId;
        passedScope = scope;
        return {
          kpis: { school_average: 75.5, pending_reviews: 0, missing_marks_alerts: 0, active_exams: 1 },
          trends: [],
          subjectPerformance: [],
          studentProgress: { topPerformers: [], topImprovers: [], atRiskStudents: [] }
        };
      }
    } as never
  );

  const res = await service.getAnalytics();
  assert.equal(passedTenantId, 'tenant-abc');
  assert.deepEqual(passedScope, {
    level: 'school',
    actor_user_id: null,
    role: 'admin',
  });
  assert.equal(res.kpis.school_average, 75.5);
});

test('ExamsService limits academic analytics to the current HOD department or teacher assignments', async () => {
  const scopes: Record<string, unknown>[] = [];
  const repository = {
    getAnalytics: async (_tenantId: string, scope: Record<string, unknown>) => {
      scopes.push(scope);
      return {
        scope,
        kpis: { school_average: null, pending_reviews: 0, missing_marks_alerts: 0, active_exams: 0 },
        trends: [],
        subjectPerformance: [],
        studentProgress: { topPerformers: [], topImprovers: [], atRiskStudents: [] },
        data_quality: { final_mark_count: 0, explicit_evidence_count: 0, missing_or_incomplete_count: 0 },
      };
    },
  };

  const hodService = new ExamsService(
    {
      getStore: () => ({
        tenant_id: 'tenant-a',
        user_id: 'hod-1',
        role: 'Head of Department',
        permissions: ['exams:read'],
      }),
    } as never,
    repository as never,
  );
  await hodService.getAnalytics();

  const teacherService = new ExamsService(
    {
      getStore: () => ({
        tenant_id: 'tenant-a',
        user_id: 'teacher-1',
        role: 'teacher',
        permissions: ['exams:read'],
      }),
    } as never,
    repository as never,
  );
  await teacherService.getAnalytics();

  assert.deepEqual(scopes, [
    {
      level: 'department',
      actor_user_id: 'hod-1',
      role: 'head_of_department',
    },
    {
      level: 'assignment',
      actor_user_id: 'teacher-1',
      role: 'teacher',
    },
  ]);
});

test('ExamsRepository correctly aggregates exam analytics data', async () => {
  const queries: string[] = [];
  const paramsList: any[][] = [];
  const responses = [
    [{
      school_average: 78.5,
      pending_reviews: 2,
      missing_marks_alerts: 5,
      active_exams: 1,
      final_mark_count: 120,
      explicit_evidence_count: 6,
      missing_or_incomplete_count: 5,
    }],
    [
      { exam_series_id: 'series-1', exam_series_name: 'Term 1', starts_on: '2026-01-01', average_score: 65.2 },
      { exam_series_id: 'series-2', exam_series_name: 'Term 2', starts_on: '2026-05-01', average_score: 72.8 },
    ],
    [{
      subject_id: 'subject-1',
      subject_name: 'Mathematics',
      mean_score: 74.25,
      pass_rate: 82.5,
      ee_count: 10,
      me_count: 12,
      ae_count: 3,
      be_count: 1,
    }],
    [{
      student_id: 'student-1',
      student_name: 'Amina Njeri',
      admission_number: 'ADM-001',
      average_percentage: 88.5,
      assessments_taken: 6,
    }],
    [{
      student_id: 'student-2',
      student_name: 'Brian Otieno',
      admission_number: 'ADM-002',
      latest_exam_series: 'Term 2',
      latest_average: 78,
      previous_exam_series: 'Term 1',
      previous_average: 70,
      improvement: 8,
    }],
    [{
      student_id: 'student-3',
      student_name: 'Carol Wanjiku',
      admission_number: 'ADM-003',
      average_percentage: 43.5,
      assessments_taken: 6,
    }],
  ];
  let responseIndex = 0;
  
  const repository = new ExamsRepository({
    executeWithTenant: async function(tenantId: string, ctx: any, cb: any) {
      return cb({
        $queryRawUnsafe: async (sql: string, ...params: any[]) => {
          queries.push(sql);
          paramsList.push(params);
          return responses[responseIndex++] ?? [];
        }
      });
    }
  } as never);

  const analytics = await repository.getAnalytics('tenant-xyz');
  
  assert.equal(analytics.kpis.school_average, 78.5);
  assert.equal(analytics.trends.length, 2);
  assert.equal(analytics.trends[1].average_score, 72.8);
  assert.equal(analytics.trends[1].exam_series_name, 'Term 2');
  assert.equal(analytics.subjectPerformance[0].pass_rate, 82.5);
  assert.equal(analytics.studentProgress.topPerformers[0].student_name, 'Amina Njeri');
  assert.equal(analytics.studentProgress.topImprovers[0].improvement, 8);
  assert.equal(analytics.studentProgress.atRiskStudents[0].average_percentage, 43.5);
  assert.deepEqual(analytics.data_quality, {
    final_mark_count: 120,
    explicit_evidence_count: 6,
    missing_or_incomplete_count: 5,
  });
  
  assert.equal(queries.length, 6);
  assert.equal(paramsList.every((params) => params[0] === 'tenant-xyz'), true);
  assert.match(queries[0], /mark_window\.class_section_id::text = class_assignment\.class_section_id/);
  assert.match(queries[0], /mark\.student_id::text = expected\.student_id/);
  for (const query of queries) {
    assert.doesNotMatch(
      query,
      /\b(?:FROM|JOIN|UPDATE)\s+exam_mark_entry_windows\s+window\b/i,
      'PostgreSQL reserves WINDOW; mark-entry tables must use a safe alias',
    );
  }
  for (const query of queries.slice(1)) {
    assert.match(query, /mark\.status IN \('locked', 'published'\)/);
    assert.match(query, /mark\.score_status = 'entered'/);
    assert.match(query, /assessment\.max_score > 0/);
  }
  for (const query of queries) {
    assert.match(query, /student_report_cards card/);
    assert.match(
      query,
      /card\.tenant_id = (?:mark|exam_marks)\.tenant_id/,
    );
    assert.match(query, /card\.is_current = TRUE/);
    assert.match(query, /card\.status IN \('approved', 'published'\)/);
  }
});

test('ExamsRepository does not disguise analytics database failures as zero results', async () => {
  const repository = new ExamsRepository({
    executeWithTenant: async function(tenantId: string, ctx: any, cb: any) {
      return cb({
        $queryRawUnsafe: async () => {
          throw new Error('analytics database unavailable');
        },
      });
    },
  } as never);

  await assert.rejects(
    () => repository.getAnalytics('tenant-xyz'),
    /analytics database unavailable/,
  );
});

test('ExamsRepository applies assignment scope to every academic analytics query', async () => {
  const queries: string[] = [];
  const paramsList: any[][] = [];
  let queryIndex = 0;
  const responses = [
    [{
      school_average: null,
      pending_reviews: 0,
      missing_marks_alerts: 0,
      active_exams: 0,
      final_mark_count: 0,
      explicit_evidence_count: 0,
      missing_or_incomplete_count: 0,
    }],
    [],
    [],
    [],
    [],
    [],
  ];
  const repository = new ExamsRepository({
    executeWithTenant: async (_tenantId: string, _context: unknown, callback: (tx: any) => unknown) =>
      callback({
        $queryRawUnsafe: async (sql: string, ...params: any[]) => {
          queries.push(sql);
          paramsList.push(params);
          return responses[queryIndex++] ?? [];
        },
      }),
  } as never);

  const analytics = await repository.getAnalytics('tenant-a', {
    level: 'assignment',
    actor_user_id: 'teacher-1',
    role: 'teacher',
  });

  assert.deepEqual(analytics.scope, {
    level: 'assignment',
    role: 'teacher',
  });
  assert.equal(queries.length, 6);
  assert.equal(paramsList.every((params) =>
    params[0] === 'tenant-a' && params[1] === 'teacher-1'), true);
  for (const query of queries) {
    assert.match(query, /teacher_subject_assignments teacher_assignment/);
    assert.match(query, /teacher_assignment\.teacher_user_id::text = \$2/);
    assert.match(query, /academics_class_teachers class_teacher/);
    assert.match(query, /class_teacher\.teacher_user_id::text = \$2/);
  }
});
