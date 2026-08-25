import assert from 'node:assert/strict';
import test from 'node:test';

import { GradeMasterController } from './grade-master.controller';
import { GradeMasterService } from './grade-master.service';

const GRADE_MASTER_USER_ID = '00000000-0000-4000-8000-000000000001';
const CLASS_SECTION_ID = '00000000-0000-4000-8000-000000000002';
const STREAM_ID = '00000000-0000-4000-8000-000000000003';
const LEARNER_ID = '00000000-0000-4000-8000-000000000004';
const STAFF_RECIPIENT_ID = '00000000-0000-4000-8000-000000000005';
const EVENT_ID = '00000000-0000-4000-8000-000000000006';

const assignedScope = {
  class_section_id: CLASS_SECTION_ID,
  stream_id: STREAM_ID,
  academic_level_id: '00000000-0000-4000-8000-000000000007',
  grade_level: 'grade-10',
  section_name: 'Grade 10',
  stream_name: 'Blue',
  is_section_wide: true,
};

function createScopedService(
  dataRows: Array<Record<string, unknown>>,
  queries: Array<{ sql: string; params: unknown[] }>,
) {
  return new GradeMasterService({
    query: async (sql: string, params: unknown[]) => {
      queries.push({ sql, params });
      if (sql.includes('managed_scope AS')) {
        return { rows: [assignedScope], rowCount: 1 };
      }
      return { rows: dataRows, rowCount: dataRows.length };
    },
  } as never);
}

test('GradeMasterService returns only the active appointment scoped overview', async () => {
  const queries: Array<{ sql: string; params: unknown[] }> = [];
  const service = createScopedService([{
    total_learners: 42,
    present_today: 38,
    absent_today: 3,
    late_today: 1,
    streams_covered: 2,
    open_discipline_cases: 4,
    academic_risk_learners: 5,
    pending_parent_followups: 7,
    reports_not_ready: 8,
    counselling_referrals: 9,
    class_teacher_pending_updates: 10,
  }], queries);

  const result = await service.getOverview('tenant-a', GRADE_MASTER_USER_ID, 'grade-10');

  assert.equal(result.total_learners, 42);
  assert.equal(result.present_today, 38);
  assert.equal(result.reports_not_ready, 8);
  assert.match(queries[0].sql, /academics_role_appointments/);
  assert.match(queries[0].sql, /tenant_memberships/);
  assert.match(queries[0].sql, /membership\.status = 'active'/);
  assert.deepEqual(queries[0].params, ['tenant-a', GRADE_MASTER_USER_ID]);
  assert.match(queries[1].sql, /student_class_assignments/);
  assert.match(queries[1].sql, /academics_attendance/);
  assert.match(queries[1].sql, /discipline_incidents/);
  assert.deepEqual(queries[1].params, ['tenant-a', [CLASS_SECTION_ID], [STREAM_ID]]);
});

test('GradeMasterService lists real learners only inside the assigned class and stream', async () => {
  const queries: Array<{ sql: string; params: unknown[] }> = [];
  const service = createScopedService([{
    id: LEARNER_ID,
    admission_number: 'ADM-001',
    learner: 'Amina Otieno',
    stream: 'Grade 10 Blue',
    attendance_percentage: 88,
    average_score: 67,
    risk: 'Medium',
  }], queries);

  const result = await service.getLearners('tenant-a', GRADE_MASTER_USER_ID, 'grade-10');

  assert.equal(result.length, 1);
  assert.equal(result[0].learner, 'Amina Otieno');
  assert.equal(result[0].attendance, '88%');
  assert.equal(result[0].average, '67%');
  assert.match(queries[1].sql, /FROM student_class_assignments/);
  assert.match(queries[1].sql, /JOIN students/);
  assert.match(queries[1].sql, /assignment\.class_section_id::text = ANY\(\$2::text\[\]\)/);
  assert.match(queries[1].sql, /assignment\.stream_id::text = ANY\(\$3::text\[\]\)/);
  assert.deepEqual(queries[1].params, ['tenant-a', [CLASS_SECTION_ID], [STREAM_ID]]);
});

test('GradeMasterService exposes only scoped report snapshots with download URLs', async () => {
  const queries: Array<{ sql: string; params: unknown[] }> = [];
  const service = createScopedService([{
    id: 'report-row-a',
    snapshot_id: 'grade-snapshot-a',
    report_name: 'Grade learner list',
    type: 'csv',
    generated_at: '2026-06-20T09:15:00.000Z',
    status: 'Ready',
  }], queries);

  const result = await service.getReports('tenant-a', GRADE_MASTER_USER_ID, 'grade-10');

  assert.equal(result.length, 1);
  assert.equal(result[0].download_url, '/api/grade-master/reports/grade-snapshot-a/download');
  assert.match(queries[1].sql, /FROM report_snapshots/);
  assert.match(queries[1].sql, /tenant_id = \$1/);
  assert.match(queries[1].sql, /filters->>'class_section_id' = ANY\(\$2::text\[\]\)/);
  assert.deepEqual(queries[1].params.slice(0, 3), [
    'tenant-a',
    [CLASS_SECTION_ID],
    [STREAM_ID],
  ]);
});

test('GradeMasterService lists timetable lessons for active assigned streams', async () => {
  const queries: Array<{ sql: string; params: unknown[] }> = [];
  const service = createScopedService([{
    id: 'lesson-a',
    day: 'Today',
    time: '08:00',
    stream: 'Grade 10 Blue',
    subject: 'Mathematics',
    teacher: 'Mr Otieno',
    status: 'Completed',
  }], queries);

  const result = await service.getTimetable('tenant-a', GRADE_MASTER_USER_ID, 'grade-10');

  assert.equal(result.length, 1);
  assert.equal(result[0].stream, 'Grade 10 Blue');
  assert.match(queries[1].sql, /academics_timetable_slots/);
  assert.match(queries[1].sql, /class_sections/);
  assert.deepEqual(queries[1].params, [
    'tenant-a',
    [CLASS_SECTION_ID],
    [STREAM_ID],
    [CLASS_SECTION_ID],
  ]);
});

test('GradeMasterService lists assignments for active assigned streams', async () => {
  const queries: Array<{ sql: string; params: unknown[] }> = [];
  const service = createScopedService([{
    id: 'assignment-a',
    assignment: 'Algebra Ch 4',
    subject: 'Mathematics',
    stream: 'Grade 10 Blue',
    due_date: '2026-06-30T00:00:00.000Z',
    missing_count: 0,
  }], queries);

  const result = await service.getAssignments('tenant-a', GRADE_MASTER_USER_ID, 'grade-10');

  assert.equal(result.length, 1);
  assert.equal(result[0].assignment, 'Algebra Ch 4');
  assert.match(queries[1].sql, /academics_assignments/);
  assert.match(queries[1].sql, /class_sections/);
  assert.deepEqual(queries[1].params, [
    'tenant-a',
    [CLASS_SECTION_ID],
    [STREAM_ID],
    [CLASS_SECTION_ID],
  ]);
});

test('GradeMasterService fails closed without an active tenant membership and appointment', async () => {
  const queries: Array<{ sql: string; params: unknown[] }> = [];
  const service = new GradeMasterService({
    query: async (sql: string, params: unknown[]) => {
      queries.push({ sql, params });
      return { rows: [], rowCount: 0 };
    },
  } as never);

  await assert.rejects(
    () => service.getOverview('tenant-a', GRADE_MASTER_USER_ID),
    /No active grade or form master appointment/,
  );
  assert.equal(queries.length, 1, 'an unappointed actor must not reach the dashboard data query');
  assert.match(queries[0].sql, /membership\.status = 'active'/);
});

test('GradeMasterService records exact staff delivery, event, and audit atomically', async () => {
  const queries: Array<{ sql: string; params: unknown[] }> = [];
  const service = new GradeMasterService({
    query: async (sql: string, params: unknown[]) => {
      queries.push({ sql, params });
      if (sql.includes('managed_scope AS')) {
        return { rows: [assignedScope], rowCount: 1 };
      }
      if (sql.includes('INSERT INTO workflow_events')) {
        return {
          rows: [{
            id: EVENT_ID,
            event_type: 'grade_master.teacher_message',
            guardian_notification_count: 0,
            staff_notification_count: 1,
            audit_count: 1,
          }],
          rowCount: 1,
        };
      }
      if (sql.includes('FROM student_class_assignments assignment')) {
        return {
          rows: [{
            learner_id: LEARNER_ID,
            class_section_id: CLASS_SECTION_ID,
            stream_id: STREAM_ID,
            learner_name: 'Amina Otieno',
          }],
          rowCount: 1,
        };
      }
      return { rows: [], rowCount: 0 };
    },
  } as never);

  const result = await service.recordAction('tenant-a', GRADE_MASTER_USER_ID, {
    action: 'teacher_message',
    title: 'Stream update requested',
    message: 'Please provide the current stream update.',
    targetRoles: ['class_teacher'],
    payload: {
      learnerId: LEARNER_ID,
      recipientUserId: STAFF_RECIPIENT_ID,
    },
  });

  const write = queries.find((query) => query.sql.includes('INSERT INTO workflow_events'));
  assert.ok(write);
  assert.match(write.sql, /eligible_staff_recipients AS/);
  assert.match(write.sql, /membership\.tenant_id = \$1/);
  assert.match(write.sql, /membership\.status = 'active'/);
  assert.match(write.sql, /exact_staff_notifications AS/);
  assert.match(write.sql, /inserted_audit AS/);
  assert.equal(write.params[18], STAFF_RECIPIENT_ID);
  assert.equal(write.params[19], true);
  assert.equal(result.success, true);
  assert.equal(result.staff_notification_count, 1);
  assert.match(result.message, /queued for 1 authorised staff recipient/);
});

test('GradeMasterService rejects recipient identifiers on actions without exact-recipient semantics', async () => {
  const service = new GradeMasterService({
    query: async (sql: string) => {
      if (sql.includes('managed_scope AS')) {
        return { rows: [assignedScope], rowCount: 1 };
      }
      throw new Error('a rejected action must not reach the mutation query');
    },
  } as never);

  await assert.rejects(
    () => service.recordAction('tenant-a', GRADE_MASTER_USER_ID, {
      action: 'report_approval_requested',
      title: 'Report approval requested',
      message: 'Please review the assigned grade reports.',
      targetRoles: ['exams_manager'],
      payload: {
        classSectionId: CLASS_SECTION_ID,
        recipientUserId: STAFF_RECIPIENT_ID,
      },
    }),
    /staff recipient is not supported/,
  );
});

test('GradeMasterController routes grade-master workspaces through the request tenant context', async () => {
  const calls: Array<{ method: string; args: unknown[] }> = [];
  const service = {
    getLearners: async (...args: unknown[]) => {
      calls.push({ method: 'getLearners', args });
      return [{ id: LEARNER_ID }];
    },
  };
  const controller = new GradeMasterController(
    service as never,
    { requireStore: () => ({ tenant_id: 'tenant-a', user_id: GRADE_MASTER_USER_ID }) } as never,
  );

  const result = await controller.getLearners('grade-10');

  assert.deepEqual(result, [{ id: LEARNER_ID }]);
  assert.deepEqual(calls, [{
    method: 'getLearners',
    args: ['tenant-a', GRADE_MASTER_USER_ID, 'grade-10'],
  }]);
});
