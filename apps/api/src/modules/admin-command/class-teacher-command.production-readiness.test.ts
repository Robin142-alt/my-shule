import assert from 'node:assert/strict';
import test from 'node:test';

import { ClassTeacherCommandService } from './class-teacher-command.service';

const TENANT_ID = 'school-a';
const TEACHER_ID = '11111111-1111-4111-8111-111111111111';
const STUDENT_ID = '22222222-2222-4222-8222-222222222222';
const GUARDIAN_ID = '33333333-3333-4333-8333-333333333333';
const CLASS_ID = '44444444-4444-4444-8444-444444444444';

function requiredText(value: unknown, label: string) {
  const text = String(value ?? '').trim();
  if (!text) throw new Error(`${label} is required`);
  return text;
}

function createService(input: {
  query?: (sql: string, params: unknown[]) => Promise<{ rows: any[]; rowCount: number }>;
  operations?: Record<string, unknown>;
  store?: Record<string, unknown>;
}) {
  return new ClassTeacherCommandService(
    {
      getStore: () => ({
        tenant_id: TENANT_ID,
        user_id: TEACHER_ID,
        role: 'class_teacher',
        is_authenticated: true,
        ...(input.store ?? {}),
      }),
    } as never,
    {
      query: input.query ?? (async () => ({ rows: [], rowCount: 0 })),
    } as never,
    {
      requiredText,
      ...(input.operations ?? {}),
    } as never,
  );
}

test('ClassTeacherCommandService returns workspace envelopes only from the actor active appointment SQL scope', async () => {
  const statements: Array<{ sql: string; params: unknown[] }> = [];
  const service = createService({
    query: async (sql, params) => {
      statements.push({ sql, params });
      if (/guardian\.display_name AS parent_name/.test(sql)) {
        return {
          rows: [{
            id: GUARDIAN_ID,
            parent_name: 'Mary Atieno',
            phone: '+254700000000',
            email: 'mary@example.test',
            student_name: 'Akinyi Otieno',
            admission_no: 'ADM-001',
            relationship: 'mother',
            last_contacted: null,
            contact_count_term: 0,
          }],
          rowCount: 1,
        };
      }
      return {
        rows: [{
          id: STUDENT_ID,
          admission_no: 'ADM-001',
          full_name: 'Akinyi Otieno',
          gender: 'female',
          stream: 'Grade 8 Blue',
          status: 'Active',
          attendance_rate: 96,
          mean_score: 74,
        }],
        rowCount: 1,
      };
    },
  });

  const register = await service.getMyClass();
  const contacts = await service.getParentContacts();

  assert.equal(register.class_name, 'Grade 8 Blue');
  assert.equal(register.metrics.total_enrolled, 1);
  assert.equal(register.metrics.girls, 1);
  assert.equal(register.students[0].id, STUDENT_ID);
  assert.equal(contacts.metrics.total_parents, 1);
  assert.equal(contacts.metrics.never_contacted, 1);
  assert.equal(contacts.contacts[0].id, GUARDIAN_ID);

  for (const statement of statements) {
    assert.equal(statement.params[0], TENANT_ID);
    assert.equal(statement.params[1], TEACHER_ID);
    assert.match(statement.sql, /academics_class_teachers appointment/);
    assert.match(statement.sql, /appointment\.teacher_user_id = \$2::uuid/);
    assert.match(statement.sql, /appointment\.is_active = TRUE/);
    assert.match(statement.sql, /appointment\.effective_from/);
    assert.match(statement.sql, /appointment\.effective_to/);
    assert.match(statement.sql, /student_class_assignments assignment/);
    assert.doesNotMatch(statement.sql, /class_sections\.class_teacher_id|\$2::uuid IS NULL/);
  }
  assert.match(statements[1].sql, /guardian\.status = 'active'/);
  assert.match(statements[1].sql, /membership\.status = 'active'/);
});

test('ClassTeacherCommandService rejects missing or malformed authenticated actors before a school read', async () => {
  let queryCount = 0;
  const service = createService({
    store: { user_id: 'not-a-uuid' },
    query: async () => {
      queryCount += 1;
      return { rows: [], rowCount: 0 };
    },
  });

  await assert.rejects(() => service.getMyClass(), /authenticated class teacher account/);
  assert.equal(queryCount, 0);
});

test('ClassTeacherCommandService atomically delivers class communication to exact active guardians and truthful SMS counts', async () => {
  const writes: Array<{ sql: string; params: unknown[] }> = [];
  const service = createService({
    operations: {
      writeSql: async (sql: string, params: unknown[]) => {
        writes.push({ sql, params });
        return { rows: [{ learner_count: 1, portal_count: 2, sms_count: 1, event_id: 'event-a' }], rowCount: 1 };
      },
    },
  });

  const result = await service.sendClassCommunication({
    audience: 'individual_parent',
    learnerId: STUDENT_ID,
    subject: 'Attendance follow-up',
    message: 'Please review today’s attendance record.',
    sendSms: true,
  });

  assert.equal(result.notificationCount, 2);
  assert.equal(result.smsQueuedCount, 1);
  assert.match(result.message, /2 exact parent portal notices; SMS: 1 queued/);
  assert.equal(writes.length, 1);
  assert.deepEqual(writes[0].params.slice(0, 5), [TENANT_ID, TEACHER_ID, 'individual_parent', STUDENT_ID, null]);
  assert.match(writes[0].sql, /recipient_user_id, recipient_guardian_id/);
  assert.match(writes[0].sql, /guardian\.status = 'active'/);
  assert.match(writes[0].sql, /tenant_memberships membership/);
  assert.match(writes[0].sql, /membership\.status = 'active'/);
  assert.match(writes[0].sql, /INSERT INTO communication_sms_outbox/);
  assert.match(writes[0].sql, /INSERT INTO workflow_events/);
  assert.match(writes[0].sql, /INSERT INTO audit_logs/);
  assert.match(writes[0].sql, /\["principal","secretary"\]/);
  assert.doesNotMatch(writes[0].sql, /\["parent"|\["student"/);
});

test('ClassTeacherCommandService fails closed when a communication learner is stale or outside the appointment', async () => {
  const service = createService({
    operations: {
      writeSql: async () => ({ rows: [{ learner_count: 0, portal_count: 0, sms_count: 0 }], rowCount: 1 }),
    },
  });

  await assert.rejects(
    () => service.sendClassCommunication({
      audience: 'individual_parent',
      learnerId: STUDENT_ID,
      subject: 'Follow-up',
      message: 'Please contact the school.',
    }),
    /outside your active class-teacher appointment/,
  );
});

test('ClassTeacherCommandService refuses to persist a learner note when assignment validation returns no learner', async () => {
  let audited = false;
  const service = createService({
    operations: {
      writeSql: async () => ({ rows: [], rowCount: 0 }),
      recordAudit: async () => { audited = true; },
    },
  });

  await assert.rejects(
    () => service.createLearnerNote(STUDENT_ID, { note: 'Requires a private follow-up.' }),
    /outside your active class-teacher appointment/,
  );
  assert.equal(audited, false);
});

test('ClassTeacherCommandService atomically preserves welfare category and severity with event, audit, and high-priority staff notices', async () => {
  const writes: Array<{ sql: string; params: unknown[] }> = [];
  let separatelyAudited = false;
  const service = createService({
    operations: {
      writeSql: async (sql: string, params: unknown[]) => {
        writes.push({ sql, params });
        return {
          rows: [{
            id: '55555555-5555-4555-8555-555555555555',
            student_id: STUDENT_ID,
            category: 'Health',
            severity: 'High',
            workflow_event_id: 'event-a',
            staff_notification_count: 2,
            audits_created: 1,
          }],
          rowCount: 1,
        };
      },
      recordAudit: async () => { separatelyAudited = true; },
    },
  });

  const result = await service.createWelfareNote({
    student_id: STUDENT_ID,
    category: 'Health',
    severity: 'High',
    note: 'Requires a safeguarding review.',
  });

  assert.equal(result.note.category, 'Health');
  assert.equal(result.note.severity, 'High');
  assert.match(result.message, /2 safeguarding notification/);
  assert.equal(writes.length, 1);
  assert.equal(separatelyAudited, false);
  assert.deepEqual(writes[0].params.slice(0, 6), [
    TENANT_ID,
    TEACHER_ID,
    STUDENT_ID,
    'Health',
    'High',
    'Requires a safeguarding review.',
  ]);
  assert.match(writes[0].sql, /INSERT INTO student_notes/);
  assert.match(writes[0].sql, /'welfare\.note_created'/);
  assert.match(writes[0].sql, /'category', \$4/);
  assert.match(writes[0].sql, /'severity', \$5/);
  assert.match(writes[0].sql, /recipient_role/);
  assert.match(writes[0].sql, /school_counsellor/);
  assert.match(writes[0].sql, /INSERT INTO audit_logs/);
  assert.doesNotMatch(writes[0].sql, /recipient_guardian_id|\["parent"\]/);
});

test('ClassTeacherCommandService escalates only an assigned welfare record and preserves its canonical entity type atomically', async () => {
  const writes: Array<{ sql: string; params: unknown[] }> = [];
  const service = createService({
    operations: {
      writeSql: async (sql: string, params: unknown[]) => {
        writes.push({ sql, params });
        return {
          rows: [{
            event_id: 'event-a',
            entity_type: 'student_welfare_case',
            entity_id: '55555555-5555-4555-8555-555555555555',
            staff_notification_count: 3,
            audits_created: 1,
          }],
          rowCount: 1,
        };
      },
    },
  });

  const result = await service.escalateWelfareNote('55555555-5555-4555-8555-555555555555');

  assert.equal(result.event.entity_type, 'student_welfare_case');
  assert.match(result.message, /3 safeguarding role inbox/);
  assert.equal(writes.length, 1);
  assert.match(writes[0].sql, /welfare_candidates/);
  assert.match(writes[0].sql, /record\.entity_type/);
  assert.match(writes[0].sql, /academics_class_teachers appointment/);
  assert.match(writes[0].sql, /NOT EXISTS[\s\S]*'welfare\.note_escalated'/);
  assert.match(writes[0].sql, /INSERT INTO workflow_events/);
  assert.match(writes[0].sql, /INSERT INTO notifications/);
  assert.match(writes[0].sql, /INSERT INTO audit_logs/);
});

test('ClassTeacherCommandService resolves an attendance follow-up without rewriting the attendance fact', async () => {
  const writes: Array<{ sql: string; params: unknown[] }> = [];
  const service = createService({
    operations: {
      writeSql: async (sql: string, params: unknown[]) => {
        writes.push({ sql, params });
        return { rows: [{ event_id: 'event-a', student_id: STUDENT_ID }], rowCount: 1 };
      },
    },
  });

  const result = await service.resolveAttendanceFollowUp(STUDENT_ID);

  assert.equal(result.resolvedCount, 1);
  assert.match(writes[0].sql, /EXISTS \(\s*SELECT 1 FROM academics_attendance attendance/);
  assert.match(writes[0].sql, /'attendance\.follow_up_resolved'/);
  assert.match(writes[0].sql, /INSERT INTO audit_logs/);
  assert.doesNotMatch(writes[0].sql, /UPDATE (?:student_attendance_logs|academics_attendance)/);
});

test('ClassTeacherCommandService schedules a meeting only through an exact assigned learner guardian', async () => {
  const writes: Array<{ sql: string; params: unknown[] }> = [];
  const service = createService({
    operations: {
      writeSql: async (sql: string, params: unknown[]) => {
        writes.push({ sql, params });
        return {
          rows: [{ id: '55555555-5555-4555-8555-555555555555', guardian_id: GUARDIAN_ID, student_id: STUDENT_ID }],
          rowCount: 1,
        };
      },
    },
  });

  const result = await service.scheduleMeeting({
    studentId: STUDENT_ID,
    title: 'Academic progress review',
    start_time: '2026-08-24T09:00:00.000Z',
  });

  assert.equal(result.meeting.student_id, STUDENT_ID);
  assert.equal(writes[0].params[2], STUDENT_ID);
  assert.match(writes[0].sql, /student_guardians guardian/);
  assert.match(writes[0].sql, /recipient_guardian_id/);
  assert.match(writes[0].sql, /membership\.status = 'active'/);
  assert.match(writes[0].sql, /INSERT INTO school_meetings/);
  assert.match(writes[0].sql, /INSERT INTO workflow_events/);
  assert.match(writes[0].sql, /INSERT INTO audit_logs/);
  assert.match(writes[0].sql, /'class_section_id', guardian\.class_section_id/);
});

test('ClassTeacherCommandService scopes report downloads to the exact generating actor', async () => {
  const reads: Array<{ sql: string; params: unknown[] }> = [];
  const service = createService({
    query: async () => ({ rows: [{ id: 'appointment-a' }], rowCount: 1 }),
    operations: {
      readSql: async (sql: string, params: unknown[]) => {
        reads.push({ sql, params });
        return { rows: [{ snapshot_id: 'snapshot-a', title: 'Class register' }], rowCount: 1 };
      },
    },
  });

  await service.downloadReport('snapshot-a');

  assert.match(reads[0].sql, /tenant_id = \$1/);
  assert.match(reads[0].sql, /module = 'class-teacher-command'/);
  assert.match(reads[0].sql, /generated_by_user_id::text = \$3/);
  assert.deepEqual(reads[0].params, [TENANT_ID, 'snapshot-a', TEACHER_ID]);
});
