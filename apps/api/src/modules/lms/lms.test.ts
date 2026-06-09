import assert from 'node:assert/strict';
import test from 'node:test';
import 'reflect-metadata';

import { PERMISSIONS_KEY } from '../../auth/auth.constants';
import { MODULE_ACCESS_KEY } from '../module-access/module-access.decorator';
import { LmsController } from './lms.controller';
import { LmsSchemaService } from './lms-schema.service';
import { LmsService } from './lms.service';

test('LmsSchemaService creates tenant-safe lms tables', async () => {
  let schemaSql = '';
  const service = new LmsSchemaService({ runSchemaBootstrap: async (sql: string) => { schemaSql += sql; } } as never);

  await service.onModuleInit();

  for (const table of ['lms_courses', 'lms_content_items', 'lms_assignments', 'lms_submissions', 'lms_activity_events']) {
    assert.match(schemaSql, new RegExp(`CREATE TABLE IF NOT EXISTS "?${table}"?`));
    assert.match(schemaSql, new RegExp(`ALTER TABLE "?${table}"? FORCE ROW LEVEL SECURITY`));
  }
  assert.match(schemaSql, /ALTER TABLE lms_submissions\s+ADD COLUMN IF NOT EXISTS metadata jsonb/);
  assert.match(schemaSql, /CREATE INDEX IF NOT EXISTS ix_lms_submissions_student_assignment/);
});

test('LmsController is gated by lms module and permissions', () => {
  assert.deepEqual(Reflect.getMetadata(MODULE_ACCESS_KEY, LmsController), ['lms']);
  const dashboardHandler = Object.getOwnPropertyDescriptor(LmsController.prototype, 'getDashboard')?.value;
  const createHandler = Object.getOwnPropertyDescriptor(LmsController.prototype, 'createRecord')?.value;
  const submitHandler = Object.getOwnPropertyDescriptor(LmsController.prototype, 'submitAssignment')?.value;

  assert.deepEqual(Reflect.getMetadata(PERMISSIONS_KEY, dashboardHandler), ['lms:read']);
  assert.deepEqual(Reflect.getMetadata(PERMISSIONS_KEY, createHandler), ['lms:write']);
  assert.deepEqual(Reflect.getMetadata(PERMISSIONS_KEY, submitHandler), ['lms:read']);
});

test('LmsService creates auditable lms records', async () => {
  const calls: Array<Record<string, unknown>> = [];
  const service = new LmsService(
    { getStore: () => ({ tenant_id: 'tenant-a', user_id: 'user-1', permissions: ['lms:*'] }) } as never,
    {
      createRecord: async (input: Record<string, unknown>) => { calls.push({ method: 'createRecord', ...input }); return { id: 'lms-1', title: input.title }; },
      updateStatus: async (input: Record<string, unknown>) => { calls.push({ method: 'updateStatus', ...input }); return { id: input.record_id, status: input.status }; },
      appendAuditLog: async (input: Record<string, unknown>) => { calls.push({ method: 'appendAuditLog', ...input }); },
      getDashboard: async (tenantId: string) => { calls.push({ method: 'getDashboard', tenant_id: tenantId }); return { total_records: 1, open_records: 1, action_due: 0, critical_records: 0, records: [], activity: [] }; },
    } as never,
  );

  await service.createRecord({ title: 'Grade 8 online class', category: 'course', owner_name: 'Teacher' });
  await service.updateStatus('lms-1', { status: 'completed' });
  const dashboard = await service.getDashboard();

  assert.equal(dashboard.total_records, 1);
  assert.deepEqual(calls.map((call) => call.method), ['createRecord', 'appendAuditLog', 'updateStatus', 'appendAuditLog', 'getDashboard']);
});

test('LmsService stores assignment submissions with tenant scope and audit evidence', async () => {
  const calls: Array<Record<string, unknown>> = [];
  const service = new LmsService(
    { getStore: () => ({ tenant_id: 'tenant-a', user_id: 'student-user-1', permissions: ['lms:read'] }) } as never,
    {
      findAssignment: async (tenantId: string, assignmentId: string) => {
        calls.push({ method: 'findAssignment', tenantId, assignmentId });
        return {
          id: assignmentId,
          title: 'Math reflection',
          status: 'open',
        };
      },
      createAssignmentSubmission: async (input: Record<string, unknown>) => {
        calls.push({ method: 'createAssignmentSubmission', ...input });
        return {
          id: 'submission-1',
          status: input.status,
          student_id: input.student_id,
        };
      },
      appendAuditLog: async (input: Record<string, unknown>) => {
        calls.push({ method: 'appendAuditLog', ...input });
      },
    } as never,
  );

  const submission = await service.submitAssignment('00000000-0000-4000-8000-000000000501', {
    student_id: '00000000-0000-4000-8000-000000000601',
    answer_text: 'Completed the exercise.',
    attachment_url: 'https://files.example.test/submission.pdf',
  });

  assert.equal(submission.id, 'submission-1');
  assert.equal(calls[0]?.method, 'findAssignment');
  assert.equal(calls[1]?.tenant_id, 'tenant-a');
  assert.equal(calls[1]?.submitted_by_user_id, 'student-user-1');
  assert.equal(calls[2]?.action, 'lms.assignment.submitted');
});
