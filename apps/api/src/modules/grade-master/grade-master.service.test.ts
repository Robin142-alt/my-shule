import assert from 'node:assert/strict';
import test from 'node:test';

import { GradeMasterController } from './grade-master.controller';
import { GradeMasterService } from './grade-master.service';

test('GradeMasterService returns tenant and grade scoped overview from live school data', async () => {
  const queries: Array<{ sql: string; params: unknown[] }> = [];
  const service = new GradeMasterService({
    query: async (sql: string, params: unknown[]) => {
      queries.push({ sql, params });
      return {
        rows: [{
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
        }],
        rowCount: 1,
      };
    },
  } as never);

  const result = await service.getOverview('tenant-a', 'grade-master-a', 'grade-10');

  assert.equal(result.total_learners, 42);
  assert.equal(result.present_today, 38);
  assert.equal(result.absent_today, 3);
  assert.equal(result.reports_not_ready, 8);
  assert.match(queries[0].sql, /student_class_assignments/);
  assert.match(queries[0].sql, /academics_attendance/);
  assert.match(queries[0].sql, /discipline_incidents/);
  assert.match(queries[0].sql, /tenant_id = \$1/);
  assert.match(queries[0].sql, /\$2::text IS NULL/);
  assert.equal(queries[0].params[0], 'tenant-a');
  assert.equal(queries[0].params[1], 'grade-10');
});

test('GradeMasterService lists real learners with tenant and grade scope', async () => {
  const queries: Array<{ sql: string; params: unknown[] }> = [];
  const service = new GradeMasterService({
    query: async (sql: string, params: unknown[]) => {
      queries.push({ sql, params });
      return {
        rows: [{
          id: 'student-a',
          admission_number: 'ADM-001',
          learner: 'Amina Otieno',
          stream: 'Form 2 Blue',
          attendance_percentage: 88,
          average_score: 67,
          risk: 'Medium',
        }],
        rowCount: 1,
      };
    },
  } as never);

  const result = await service.getLearners('tenant-a', 'grade-master-a', 'grade-10');

  assert.equal(result.length, 1);
  assert.equal(result[0].learner, 'Amina Otieno');
  assert.equal(result[0].attendance, '88%');
  assert.equal(result[0].average, '67%');
  assert.match(queries[0].sql, /FROM student_class_assignments/);
  assert.match(queries[0].sql, /JOIN students/);
  assert.match(queries[0].sql, /tenant_id = \$1/);
  assert.equal(queries[0].params[0], 'tenant-a');
  assert.equal(queries[0].params[1], 'grade-10');
});

test('GradeMasterService exposes tenant scoped report snapshots with download URLs', async () => {
  const queries: Array<{ sql: string; params: unknown[] }> = [];
  const service = new GradeMasterService({
    query: async (sql: string, params: unknown[]) => {
      queries.push({ sql, params });
      return {
        rows: [{
          id: 'report-row-a',
          snapshot_id: 'grade-snapshot-a',
          report_name: 'Grade learner list',
          type: 'csv',
          generated_at: '2026-06-20T09:15:00.000Z',
          status: 'Ready',
        }],
        rowCount: 1,
      };
    },
  } as never);

  const result = await service.getReports('tenant-a', 'grade-master-a', 'grade-10');

  assert.equal(result.length, 1);
  assert.equal(result[0].download_url, '/api/grade-master/reports/grade-snapshot-a/download');
  assert.match(queries[0].sql, /FROM report_snapshots/);
  assert.match(queries[0].sql, /tenant_id = \$1/);
  assert.equal(queries[0].params[0], 'tenant-a');
});

test('GradeMasterService lists timetable lessons for active grade streams from tenant data', async () => {
  const queries: Array<{ sql: string; params: unknown[] }> = [];
  const service = new GradeMasterService({
    query: async (sql: string, params: unknown[]) => {
      queries.push({ sql, params });
      return {
        rows: [{
          id: 'lesson-a',
          day: 'Today',
          time: '08:00',
          stream: 'Form 2 Blue',
          subject: 'Mathematics',
          teacher: 'Mr Otieno',
          status: 'Completed',
        }],
        rowCount: 1,
      };
    },
  } as never);

  const result = await service.getTimetable('tenant-a', 'grade-master-a', 'grade-10');

  assert.equal(result.length, 1);
  assert.equal(result[0].stream, 'Form 2 Blue');
  assert.match(queries[0].sql, /academics_timetable_slots/);
  assert.match(queries[0].sql, /class_sections/);
  assert.match(queries[0].sql, /tenant_id = \$1/);
  assert.equal(queries[0].params[0], 'tenant-a');
  assert.equal(queries[0].params[1], 'grade-10');
});

test('GradeMasterService lists assignments for active grade streams from tenant data', async () => {
  const queries: Array<{ sql: string; params: unknown[] }> = [];
  const service = new GradeMasterService({
    query: async (sql: string, params: unknown[]) => {
      queries.push({ sql, params });
      return {
        rows: [{
          id: 'assignment-a',
          assignment: 'Algebra Ch 4',
          subject: 'Mathematics',
          stream: 'Form 2 Blue',
          due_date: '2026-06-30T00:00:00.000Z',
          missing_count: 0,
        }],
        rowCount: 1,
      };
    },
  } as never);

  const result = await service.getAssignments('tenant-a', 'grade-master-a', 'grade-10');

  assert.equal(result.length, 1);
  assert.equal(result[0].assignment, 'Algebra Ch 4');
  assert.match(queries[0].sql, /academics_assignments/);
  assert.match(queries[0].sql, /class_sections/);
  assert.match(queries[0].sql, /tenant_id = \$1/);
  assert.equal(queries[0].params[0], 'tenant-a');
  assert.equal(queries[0].params[1], 'grade-10');
});

test('GradeMasterController routes grade-master workspaces through the service with request tenant context', async () => {
  const calls: Array<{ method: string; args: unknown[] }> = [];
  const service = {
    getLearners: async (...args: unknown[]) => {
      calls.push({ method: 'getLearners', args });
      return [{ id: 'student-a' }];
    },
  };
  const controller = new GradeMasterController(
    service as never,
    { requireStore: () => ({ tenant_id: 'tenant-a', user_id: 'grade-master-a' }) } as never,
  );

  const result = await controller.getLearners('grade-10');

  assert.deepEqual(result, [{ id: 'student-a' }]);
  assert.deepEqual(calls, [{ method: 'getLearners', args: ['tenant-a', 'grade-master-a', 'grade-10'] }]);
});
