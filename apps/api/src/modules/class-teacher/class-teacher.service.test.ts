import assert from 'node:assert/strict';
import test from 'node:test';
import 'reflect-metadata';

import { MODULE_ACCESS_KEY } from '../module-access/module-access.decorator';
import { ClassTeacherController } from './class-teacher.controller';
import { ClassTeacherService } from './class-teacher.service';

test('ClassTeacherService propagates failed sidebar queries instead of returning empty or zero records', async () => {
  const service = new ClassTeacherService({
    query: async () => { throw new Error('workspace database unavailable'); },
  } as never, {} as never);
  await assert.rejects(() => service.getDashboardOverview('school-a', 'teacher-a'), /workspace database unavailable/);
  await assert.rejects(() => service.getHomework('school-a', 'teacher-a', ''), /workspace database unavailable/);
  await assert.rejects(() => service.getLessonLogs('school-a', 'teacher-a'), /workspace database unavailable/);
  await assert.rejects(() => service.getNotifications('school-a', 'teacher-a', ''), /workspace database unavailable/);
});

test('ClassTeacherController gates teacher mark-entry reads and writes with the exams module', () => {
  const pendingMarksHandler = Object.getOwnPropertyDescriptor(
    ClassTeacherController.prototype,
    'getPendingMarks',
  )?.value;
  const saveMarksHandler = Object.getOwnPropertyDescriptor(
    ClassTeacherController.prototype,
    'saveMarks',
  )?.value;

  assert.deepEqual(Reflect.getMetadata(MODULE_ACCESS_KEY, pendingMarksHandler), ['exams']);
  assert.deepEqual(Reflect.getMetadata(MODULE_ACCESS_KEY, saveMarksHandler), ['exams']);
});

test('ClassTeacherService loads open teacher markbooks across text and uuid academic identifiers', async () => {
  const queries: Array<{ sql: string; params: unknown[] }> = [];
  const service = new ClassTeacherService(
    {
      query: async (sql: string, params: unknown[]) => {
        queries.push({ sql, params });
        return {
          rows: [{
            window_id: 'window-a',
            exam_series_id: 'series-a',
            academic_term_id: 'term-a',
            exam_name: 'Term 3 Opener',
            class_name: 'Form 2 Blue',
            class_section_id: 'class-a',
            subject_id: 'subject-a',
            subject_name: 'Mathematics',
            assessment_id: 'assessment-a',
            paper_name: 'Main Paper',
            out_of: '100',
            deadline: '2026-09-05T14:00:00.000Z',
            entered_count: '4',
            total_students: '30',
            window_status: 'open',
            entry_state: 'Open',
            opens_at: '2026-09-01T06:00:00.000Z',
          }],
          rowCount: 1,
        };
      },
    } as never,
    {} as never,
  );

  const result = await service.getPendingMarks('tenant-a', 'teacher-a');

  assert.equal(result.stats.totalWindows, 1);
  assert.equal(result.windows[0].classSectionId, 'class-a');
  assert.equal(result.windows[0].subjectId, 'subject-a');
  assert.equal(result.windows[0].status, 'Draft');
  assert.equal(result.windows[0].canEnter, true);
  assert.deepEqual(queries[0].params, ['tenant-a', 'teacher-a', false]);
  assert.match(queries[0].sql, /cs\.id\s*=\s*w\.class_section_id::text/);
  assert.match(queries[0].sql, /s\.id\s*=\s*w\.subject_id::text/);
  assert.match(queries[0].sql, /tsa\.class_section_id\s*=\s*w\.class_section_id::text/);
  assert.match(queries[0].sql, /tsa\.subject_id\s*=\s*w\.subject_id::text/);
  assert.match(queries[0].sql, /tsa\.academic_term_id\s*=\s*es\.academic_term_id::text/);
  assert.match(queries[0].sql, /\(tsa\.academic_term_id IS NULL OR tsa\.academic_term_id = es\.academic_term_id::text\)/);
  assert.match(queries[0].sql, /es\.academic_term_id,/);
  assert.match(queries[0].sql, /w\.tenant_id(?:::text)?\s*=\s*\$1/);
  assert.match(queries[0].sql, /tsa\.teacher_user_id\s*=\s*\$2/);
  assert.match(queries[0].sql, /tsa\.mark_entry_allowed\s*=\s*TRUE/);
  assert.match(queries[0].sql, /w\.status\s*=\s*'open'/);
  assert.match(queries[0].sql, /w\.opens_at\s*<=\s*NOW\(\)\s+OR\s+w\.last_action\s*=\s*'opened'/);
  assert.match(queries[0].sql, /w\.closes_at\s*>=\s*NOW\(\)/);
});

test('ClassTeacherService saves class-teacher settings as tenant and stream scoped workflow event', async () => {
  const queries: Array<{ sql: string; params: unknown[] }> = [];
  const service = new ClassTeacherService(
    {
      query: async (sql: string, params: unknown[]) => {
        queries.push({ sql, params });
        if (/FROM teacher_subject_assignments/.test(sql)) {
          return { rows: [{ id: 'assignment-a' }], rowCount: 1 };
        }
        return {
          rows: [{
            id: '55555555-5555-4555-8555-555555555555',
            payload: params[7],
          }],
          rowCount: 1,
        };
      },
    } as never,
    {} as never,
  );

  const result = await service.saveSettings('tenant-a', 'user-a', 'stream-a', {
    notificationsEnabled: false,
    defaultView: 'Timetable',
  });

  assert.equal(result.success, true);
  const settingsInsert = queries.find((query) => /INSERT INTO workflow_events/.test(query.sql));
  assert.ok(settingsInsert);
  assert.equal(settingsInsert.params[0], 'tenant-a');
  assert.equal(settingsInsert.params[1], 'user-a');
  assert.equal(settingsInsert.params[2], 'stream-a');
  assert.equal(settingsInsert.params[3], 'class_teacher.settings_saved');
});

test('ClassTeacherService requires an active class-teacher appointment before exposing a report signature', async () => {
  let signatureRead = false;
  const service = new ClassTeacherService(
    {
      query: async () => ({ rows: [], rowCount: 0 }),
    } as never,
    {} as never,
    {
      getOwnedReportCardSignature: async () => {
        signatureRead = true;
        return { available: false };
      },
    } as never,
    { getStore: () => ({ role: 'teacher' }) } as never,
  );

  await assert.rejects(
    () => service.getReportCardSignature('tenant-a', 'teacher-a', 'stream-a'),
    /active class-teacher appointment/,
  );
  assert.equal(signatureRead, false);
});

test('ClassTeacherService publishes attendance counts from submitted attendance values', async () => {
  const queries: Array<{ sql: string; params: unknown[] }> = [];
  const transactionQueries: Array<{ sql: string; params: unknown[] }> = [];
  const attendanceEvents: any[] = [];
  const service = new ClassTeacherService(
    {
      query: async (sql: string, params: unknown[]) => {
        queries.push({ sql, params });
        if (/FROM teacher_subject_assignments/.test(sql)) {
          return { rows: [{ id: 'assignment-a' }], rowCount: 1 };
        }
        if (/FROM student_class_assignments/.test(sql)) {
          return {
            rows: [
              { student_id: 'student-1' },
              { student_id: 'student-2' },
              { student_id: 'student-3' },
            ],
            rowCount: 3,
          };
        }
        return { rows: [], rowCount: 0 };
      },
      executeWithTenant: async (_tenantId: string, _userId: string, callback: (tx: any) => Promise<unknown>) =>
        callback({
          $executeRawUnsafe: async (sql: string, ...params: unknown[]) => {
            transactionQueries.push({ sql, params });
            return 1;
          },
        }),
    } as never,
    {
      publishAttendanceRegisterMarked: async (input: any) => {
        attendanceEvents.push(input);
      },
    } as never,
  );

  const result = await service.saveAttendance('tenant-a', 'teacher-a', 'stream-a', [
    { id: 'student-1', attendance: 'present' },
    { id: 'student-2', attendance: 'absent' },
    { id: 'student-3', attendance: 'late' },
  ]);

  assert.equal(result.success, true);
  assert.equal(result.count, 3);
  assert.match(transactionQueries[0].sql, /DELETE FROM academics_attendance/);
  assert.match(transactionQueries[1].sql, /INSERT INTO academics_attendance/);
  assert.equal(attendanceEvents.length, 1);
  assert.equal(attendanceEvents[0].present_count, 1);
  assert.equal(attendanceEvents[0].absent_count, 2);
  assert.equal(attendanceEvents[0].tenant_id, 'tenant-a');
  assert.equal(attendanceEvents[0].stream_id, 'stream-a');
});

test('ClassTeacherService normalizes numeric marks without selected evidence to entered drafts', async () => {
  const queries: Array<{ sql: string; params: unknown[] }> = [];
  const submissionEvents: any[] = [];
  const savedSheets: any[] = [];
  const service = new ClassTeacherService(
    {
      query: async (sql: string, params: unknown[]) => {
        queries.push({ sql, params });
        if (/FROM exam_mark_entry_windows/.test(sql) && /w\.id = \$1/.test(sql)) {
          return {
            rows: [{
              id: 'window-a',
              out_of: 80,
              exam_series_id: 'series-a',
              academic_term_id: 'term-a',
              assessment_id: 'assessment-a',
              class_section_id: 'stream-a',
              subject_id: 'subject-a',
            }],
            rowCount: 1,
          };
        }
        if (/FROM student_class_assignments/.test(sql)) {
          return { rows: [{ id: 'assignment-a' }], rowCount: 1 };
        }
        if (/SELECT id FROM exam_marks/.test(sql)) {
          return { rows: [], rowCount: 0 };
        }
        return { rows: [], rowCount: 0 };
      },
    } as never,
    {
      publishExamSubmitted: async (input: any) => {
        submissionEvents.push(input);
      },
    } as never,
    {
      saveTeacherMarkEntries: async (rows: any[], windowId: string, submit: boolean) => {
        savedSheets.push({ rows, windowId, submit });
        return {
          success: true,
          data: {
            status: 'draft',
            saved_count: rows.length,
            submitted_count: 0,
            mark_ids: ['mark-a'],
          },
        };
      },
    } as never,
  );

  const result = await service.saveMarks('tenant-a', 'teacher-a', {
    action: 'draft',
    examId: 'window-a',
    classSectionId: 'stream-a',
    marks: { 'student-a': { score: '74' } },
  });

  assert.equal(result.success, true);
  assert.equal(savedSheets.length, 1);
  assert.equal(savedSheets[0].windowId, 'window-a');
  assert.equal(savedSheets[0].submit, false);
  assert.equal(savedSheets[0].rows[0].score, 74);
  assert.equal(savedSheets[0].rows[0].score_status, 'entered');
  assert.equal(savedSheets[0].rows[0].student_id, 'student-a');
  const markWindowQuery = queries.find((query) => /FROM exam_mark_entry_windows/.test(query.sql));
  assert.ok(markWindowQuery);
  assert.match(markWindowQuery.sql, /cs\.id\s*=\s*w\.class_section_id::text/);
  assert.match(markWindowQuery.sql, /subject\.id\s*=\s*w\.subject_id::text/);
  assert.match(markWindowQuery.sql, /tsa\.class_section_id\s*=\s*w\.class_section_id::text/);
  assert.match(markWindowQuery.sql, /tsa\.subject_id\s*=\s*w\.subject_id::text/);
  assert.match(markWindowQuery.sql, /tsa\.teacher_user_id\s*=\s*\$3/);
  assert.match(markWindowQuery.sql, /w\.tenant_id\s*=\s*\$2/);
  assert.match(markWindowQuery.sql, /w\.opens_at\s*<=\s*NOW\(\)\s+OR\s+w\.last_action\s*=\s*'opened'/);
  assert.equal(
    queries.some((query) => /INSERT INTO exam_marks/.test(query.sql)),
    false,
  );
  assert.equal(submissionEvents.length, 0);
});

test('ClassTeacherService requires evidence for blank marks and accepts an explicit absent status', async () => {
  const savedSheets: any[] = [];
  const submissionEvents: any[] = [];
  const service = new ClassTeacherService(
    {
      query: async (sql: string) => {
        if (/FROM exam_mark_entry_windows/.test(sql) && /w\.id = \$1/.test(sql)) {
          return {
            rows: [{
              id: 'window-a',
              exam_series_id: 'series-a',
              academic_term_id: 'term-a',
              assessment_id: 'assessment-a',
              class_section_id: 'stream-a',
              subject_id: 'subject-a',
              out_of: 80,
              exam_name: 'Term 2 Opener',
              class_name: 'Form 2 Blue',
              subject_name: 'Mathematics',
            }],
            rowCount: 1,
          };
        }
        return { rows: [], rowCount: 0 };
      },
    } as never,
    {
      publishExamSubmitted: async (input: any) => {
        submissionEvents.push(input);
      },
    } as never,
    {
      saveTeacherMarkEntries: async (rows: any[], windowId: string, submit: boolean) => {
        savedSheets.push({ rows, windowId, submit });
        return {
          success: true,
          data: {
            status: 'submitted',
            saved_count: rows.length,
            submitted_count: rows.length,
            mark_ids: ['mark-a'],
          },
        };
      },
    } as never,
  );

  await assert.rejects(
    () => service.saveMarks('tenant-a', 'teacher-a', {
      action: 'submit',
      examId: 'window-a',
      classSectionId: 'stream-a',
      marks: { 'student-a': { score: null } },
    }),
    /Enter at least one learner score or explicit evidence status/i,
  );
  assert.equal(savedSheets.length, 0);
  assert.equal(submissionEvents.length, 0);

  const result = await service.saveMarks('tenant-a', 'teacher-a', {
    action: 'submit',
    examId: 'window-a',
    classSectionId: 'stream-a',
    marks: {
      'student-a': {
        score: null,
        score_status: 'absent',
        remarks: ' Guardian confirmed absence ',
      },
    },
  });

  assert.equal(result.success, true);
  assert.equal(result.status, 'submitted');
  assert.equal(savedSheets.length, 1);
  assert.equal(savedSheets[0].windowId, 'window-a');
  assert.equal(savedSheets[0].submit, true);
  assert.deepEqual(savedSheets[0].rows[0], {
    row_number: 1,
    exam_series_id: 'series-a',
    assessment_id: 'assessment-a',
    academic_term_id: 'term-a',
    class_section_id: 'stream-a',
    subject_id: 'subject-a',
    student_id: 'student-a',
    score: null,
    score_status: 'absent',
    remarks: 'Guardian confirmed absence',
  });
  assert.equal(submissionEvents.length, 1);
  assert.equal(submissionEvents[0].tenant_id, 'tenant-a');
});

test('ClassTeacherService submits teacher marks for moderation with tenant scoped completion event', async () => {
  const queries: Array<{ sql: string; params: unknown[] }> = [];
  const submissionEvents: any[] = [];
  const savedSheets: any[] = [];
  const service = new ClassTeacherService(
    {
      query: async (sql: string, params: unknown[]) => {
        queries.push({ sql, params });
        if (/FROM exam_mark_entry_windows/.test(sql) && /w\.id = \$1/.test(sql)) {
          return {
            rows: [{
              id: 'window-a',
              exam_series_id: 'series-a',
              academic_term_id: 'term-a',
              assessment_id: 'assessment-a',
              class_section_id: 'stream-a',
              subject_id: 'subject-a',
              out_of: 80,
              exam_name: 'Term 2 Opener',
              class_name: 'Form 2 Blue',
              subject_name: 'Mathematics',
            }],
            rowCount: 1,
          };
        }
        if (/FROM student_class_assignments/.test(sql) && /COUNT/.test(sql)) {
          return { rows: [{ total: 1 }], rowCount: 1 };
        }
        if (/FROM student_class_assignments/.test(sql)) {
          return { rows: [{ id: 'assignment-a' }], rowCount: 1 };
        }
        if (/SELECT id\s+FROM exam_marks/.test(sql)) {
          return { rows: [{ id: 'mark-a' }], rowCount: 1 };
        }
        if (/FROM exam_marks/.test(sql) && /COUNT/.test(sql)) {
          return { rows: [{ total: 1 }], rowCount: 1 };
        }
        return { rows: [], rowCount: 0 };
      },
    } as never,
    {
      publishExamSubmitted: async (input: any) => {
        submissionEvents.push(input);
      },
    } as never,
    {
      saveTeacherMarkEntries: async (rows: any[], windowId: string, submit: boolean) => {
        savedSheets.push({ rows, windowId, submit });
        return {
          success: true,
          data: {
            status: 'submitted',
            saved_count: rows.length,
            submitted_count: rows.length,
            mark_ids: ['mark-a'],
          },
        };
      },
    } as never,
  );

  const result = await service.saveMarks('tenant-a', 'teacher-a', {
    action: 'submit',
    examId: 'window-a',
    classSectionId: 'stream-a',
    scores: { 'student-a': '74' },
  });

  assert.equal(result.success, true);
  assert.equal(result.status, 'submitted');
  assert.equal(savedSheets.length, 1);
  assert.equal(savedSheets[0].submit, true);
  assert.equal(savedSheets[0].rows[0].score_status, 'entered');
  assert.equal(submissionEvents.length, 1);
  assert.equal(submissionEvents[0].tenant_id, 'tenant-a');
  assert.equal(submissionEvents[0].exam_id, 'series-a');
  assert.equal(submissionEvents[0].completion_status, 'SUBMITTED');
  assert.equal(submissionEvents[0].missing_marks_count, 0);
});

test('ClassTeacherService calculates assigned class average attendance from attendance rows', async () => {
  const queries: Array<{ sql: string; params: unknown[] }> = [];
  const service = new ClassTeacherService(
    {
      query: async (sql: string, params: unknown[]) => {
        queries.push({ sql, params });
        return {
          rows: [
            {
              id: 'assignment-a',
              class_section_id: 'stream-a',
              subject_id: 'subject-a',
              class_name: 'Form 1 East',
              subject_name: 'Mathematics',
              learners_count: 40,
              attendance_status: 'Completed',
              cat_average: '--',
              attendance_present_count: 30,
              attendance_total_count: 40,
            },
          ],
          rowCount: 1,
        };
      },
    } as never,
    {} as never,
  );

  const result = await service.getMyClasses('tenant-a', 'teacher-a');

  assert.equal(result.stats.assignedClasses, 1);
  assert.equal(result.stats.totalLearnersTaught, 40);
  assert.equal(result.stats.averageAttendance, '75%');
  assert.equal(result.classes[0].subjectId, 'subject-a');
  assert.match(queries[0].sql, /academics_attendance/);
  assert.match(queries[0].sql, /teacher_subject_assignments/);
  assert.equal(queries[0].params[0], 'tenant-a');
  assert.equal(queries[0].params[1], 'teacher-a');
});

test('ClassTeacherService rejects homework for classes or subjects not assigned to the teacher', async () => {
  const queries: Array<{ sql: string; params: unknown[] }> = [];
  const service = new ClassTeacherService(
    {
      query: async (sql: string, params: unknown[]) => {
        queries.push({ sql, params });
        if (/FROM teacher_subject_assignments/.test(sql)) {
          return { rows: [], rowCount: 0 };
        }
        return { rows: [], rowCount: 0 };
      },
    } as never,
    {} as never,
  );

  await assert.rejects(
    () => service.saveHomework('tenant-a', 'teacher-a', {
      title: 'Algebra',
      classId: 'stream-a',
      subjectId: 'subject-a',
      dueDate: '2026-07-20',
    }),
    /class and subject.*active.*teaching assignments/,
  );

  assert.match(queries[0].sql, /teacher_subject_assignments/);
  assert.equal(queries[0].params[0], 'tenant-a');
  assert.equal(queries[0].params[1], 'teacher-a');
  assert.equal(queries[0].params[2], 'stream-a');
  assert.equal(queries[0].params[3], 'subject-a');
  assert.equal(queries.some((query) => /INSERT INTO academics_assignments/.test(query.sql)), false);
});

test('ClassTeacherService atomically persists homework, audit, event, and exact active class notifications', async () => {
  const queries: Array<{ sql: string; params: unknown[] }> = [];
  const service = new ClassTeacherService(
    {
      query: async (sql: string, params: unknown[]) => {
        queries.push({ sql, params });
        if (/^\s*SELECT id[\s\S]*FROM teacher_subject_assignments/.test(sql)) {
          return { rows: [{ id: 'assignment-link-a' }], rowCount: 1 };
        }
        if (/WITH authorized_assignment/.test(sql)) {
          return {
            rows: [{
              assignment_id: 'homework-a',
              workflow_event_id: 'event-a',
              student_notification_count: 18,
              guardian_notification_count: 17,
              audits_created: 1,
            }],
            rowCount: 1,
          };
        }
        return { rows: [], rowCount: 0 };
      },
    } as never,
    {} as never,
  );

  const result = await service.saveHomework('tenant-a', 'teacher-a', {
    title: 'Algebra Chapter 4',
    description: 'Complete exercise 4.2',
    classId: 'stream-a',
    subjectId: 'subject-a',
    dueDate: '2026-07-20',
  });

  assert.equal(result.success, true);
  assert.equal(result.assignmentId, 'homework-a');
  assert.equal(result.studentNotificationCount, 18);
  assert.equal(result.guardianNotificationCount, 17);
  const insertQuery = queries.find((query) => /INSERT INTO academics_assignments/.test(query.sql));
  assert.ok(insertQuery);
  assert.equal(insertQuery.params[0], 'tenant-a');
  assert.equal(insertQuery.params[3], 'stream-a');
  assert.equal(insertQuery.params[4], 'subject-a');
  assert.equal(insertQuery.params[6], 'teacher-a');
  assert.equal(insertQuery.params[7], 'teacher');
  assert.match(insertQuery.sql, /WITH authorized_assignment/);
  assert.match(insertQuery.sql, /student_portal_access/);
  assert.match(insertQuery.sql, /student_guardians/);
  assert.match(insertQuery.sql, /tenant_memberships/);
  assert.match(insertQuery.sql, /recipient_user_id/);
  assert.match(insertQuery.sql, /recipient_guardian_id/);
  assert.match(insertQuery.sql, /INSERT INTO audit_logs/);
  assert.match(insertQuery.sql, /'\[\]'::jsonb/);
  assert.doesNotMatch(insertQuery.sql, /\["class_teacher","student","parent"\]/);
});

test('ClassTeacherService fails closed when the teaching assignment ends before the atomic homework write', async () => {
  const queries: Array<{ sql: string; params: unknown[] }> = [];
  const service = new ClassTeacherService(
    {
      query: async (sql: string, params: unknown[]) => {
        queries.push({ sql, params });
        if (/^\s*SELECT id[\s\S]*FROM teacher_subject_assignments/.test(sql)) {
          return { rows: [{ id: 'assignment-link-a' }], rowCount: 1 };
        }
        return { rows: [], rowCount: 0 };
      },
    } as never,
    {} as never,
  );

  await assert.rejects(
    () => service.saveHomework('tenant-a', 'teacher-a', {
      title: 'Algebra Chapter 4',
      classId: 'stream-a',
      subjectId: 'subject-a',
      dueDate: '2026-07-20',
    }),
    /no longer active in your teaching assignments/,
  );

  assert.equal(queries.length, 2);
  assert.match(queries[1].sql, /INSERT INTO academics_assignments/);
  assert.match(queries[1].sql, /FROM authorized_assignment/);
});

test('ClassTeacherService returns persisted guardian meeting context only after an active class appointment check', async () => {
  const queries: Array<{ sql: string; params: unknown[] }> = [];
  const service = new ClassTeacherService(
    {
      query: async (sql: string, params: unknown[]) => {
        queries.push({ sql, params });
        if (/FROM school_meetings/.test(sql)) {
          return {
            rows: [{
              id: 'meeting-a',
              date: '2026-08-24T08:30:00.000Z',
              time: '11:30',
              parent: 'Guardian: Amina Kamau; learner: Njeri Kamau. Progress review',
              agenda: 'Term progress review',
              status: 'SCHEDULED',
            }],
            rowCount: 1,
          };
        }
        if (/FROM academics_class_teachers/.test(sql)) {
          return { rows: [{ id: 'appointment-a' }], rowCount: 1 };
        }
        return { rows: [], rowCount: 0 };
      },
    } as never,
    {} as never,
  );

  const meetings = await service.getMeetings('tenant-a', 'teacher-a', 'stream-a');

  assert.equal(meetings[0].parent, 'Guardian: Amina Kamau; learner: Njeri Kamau. Progress review');
  assert.deepEqual(queries[0].params, ['tenant-a', 'teacher-a', 'stream-a']);
  assert.match(queries[0].sql, /FROM academics_class_teachers/);
  assert.deepEqual(queries[1].params, ['tenant-a', 'teacher-a', 'stream-a']);
  assert.match(queries[1].sql, /NULLIF\(TRIM\(meeting\.description\), ''\)/);
  assert.match(queries[1].sql, /meeting_scope\.payload->>'class_section_id' = \$3/);
  assert.match(queries[1].sql, /COUNT\(\*\) FROM active_class_scope/);
  assert.doesNotMatch(queries[1].sql, /'N\/A' as parent/);
});

test('ClassTeacherService dashboard overview counts teacher inventory requests from tenant data', async () => {
  const queries: Array<{ sql: string; params: unknown[] }> = [];
  const service = new ClassTeacherService(
    {
      query: async (sql: string, params: unknown[]) => {
        queries.push({ sql, params });
        if (/inventory_requests/.test(sql)) {
          return { rows: [{ count: 3 }], rowCount: 1 };
        }
        if (/FROM exam_mark_entry_windows/.test(sql)) {
          return { rows: [], rowCount: 0 };
        }
        if (/CASE WHEN ar\.id IS NULL/.test(sql)) {
          return {
            rows: [
              { assignment_id: 'assignment-a', class_name: 'Form 1 East', class_section_id: 'stream-a', subject_name: 'Math', expected: 30, status: 'Pending' },
            ],
            rowCount: 1,
          };
        }
        return { rows: [{ count: 0 }], rowCount: 1 };
      },
    } as never,
    {} as never,
  );

  const result = await service.getDashboardOverview('tenant-a', 'teacher-a');

  assert.equal(result.storeRequests.count, 3);
  assert.equal(result.storeRequests.detail, '3 pending store requests');
  const inventoryQuery = queries.find((query) => /inventory_requests/.test(query.sql));
  assert.ok(inventoryQuery);
  assert.match(inventoryQuery.sql, /WHERE tenant_id(?:::text)? = \$1/);
  assert.match(inventoryQuery.sql, /requested_by = \$2/);
  assert.equal(inventoryQuery.params[0], 'tenant-a');
  assert.equal(inventoryQuery.params[1], 'teacher-a');
});

test('ClassTeacherService returns tenant scoped report snapshots for class-teacher reports endpoint', async () => {
  const queries: Array<{ sql: string; params: unknown[] }> = [];
  const service = new ClassTeacherService(
    {
      query: async (sql: string, params: unknown[]) => {
        queries.push({ sql, params });
        if (/FROM teacher_subject_assignments/.test(sql)) {
          return { rows: [{ id: 'assignment-a' }], rowCount: 1 };
        }
        return {
          rows: [
            {
              id: 'report-row-a',
              snapshot_id: 'snapshot-a',
              report_name: 'Class register',
              type: 'pdf',
              generated_at: '2026-06-20T09:15:00.000Z',
              status: 'Ready',
            },
          ],
          rowCount: 1,
        };
      },
    } as never,
    {} as never,
  );

  const result = await service.getReports('tenant-a', 'teacher-a', 'stream-a');

  assert.equal(result.metrics.total_reports, 1);
  assert.equal(result.metrics.generated_this_term, 1);
  assert.equal(result.reports[0].report_name, 'Class register');
  assert.equal(result.reports[0].download_url, '/api/admin-command/class-teacher/reports/snapshot-a/download');
  const reportQuery = queries.find((query) => /FROM report_snapshots/.test(query.sql));
  assert.ok(reportQuery);
  assert.match(reportQuery.sql, /tenant_id(?:::text)? = \$1/);
  assert.equal(reportQuery.params[0], 'tenant-a');
});

test('ClassTeacherService authorizes class-teacher discipline through an active appointment and publishes once', async () => {
  const queries: Array<{ sql: string; params: unknown[] }> = [];
  const disciplineEvents: any[] = [];
  const service = new ClassTeacherService(
    {
      query: async (sql: string, params: unknown[]) => {
        queries.push({ sql, params });
        if (/FROM academics_class_teachers/.test(sql)) {
          return { rows: [{ id: 'appointment-a' }], rowCount: 1 };
        }
        if (/student_class_assignments/.test(sql)) {
          return { rows: [{ id: 'assignment-a' }], rowCount: 1 };
        }
        return {
          rows: [{ id: 'incident-a' }],
          rowCount: 1,
        };
      },
    } as never,
    {
      publishDisciplineIncidentReported: async (input: any) => {
        disciplineEvents.push(input);
      },
    } as never,
    undefined,
    { getStore: () => ({ role: 'class_teacher' }) } as never,
  );

  const result = await service.reportDisciplineIncident('tenant-a', 'teacher-a', 'stream-a', {
    studentId: 'student-a',
    description: 'Persistent lateness',
    severity: 'medium',
  });

  assert.equal(result.success, true);
  assert.match(queries[0].sql, /academics_class_teachers/);
  assert.match(queries[0].sql, /effective_from <= CURRENT_DATE/);
  assert.equal(queries.some((query) => /teacher_subject_assignments/.test(query.sql)), false);
  const studentScopeQuery = queries.find((query) => /student_class_assignments/.test(query.sql));
  assert.ok(studentScopeQuery);
  assert.equal(studentScopeQuery.params[0], 'tenant-a');
  assert.equal(studentScopeQuery.params[1], 'stream-a');
  assert.equal(studentScopeQuery.params[2], 'student-a');
  assert.ok(queries.find((query) => /INSERT INTO discipline_incidents/.test(query.sql)));
  assert.equal(disciplineEvents.length, 1);
  assert.equal(disciplineEvents[0].incident_id, 'incident-a');
});

test('ClassTeacherService persists welfare referrals before publishing the referral event', async () => {
  const queries: Array<{ sql: string; params: unknown[] }> = [];
  const welfareEvents: any[] = [];
  const service = new ClassTeacherService(
    {
      query: async (sql: string, params: unknown[]) => {
        queries.push({ sql, params });
        if (/FROM teacher_subject_assignments/.test(sql)) {
          return { rows: [{ id: 'teacher-assignment-a' }], rowCount: 1 };
        }
        if (/student_class_assignments/.test(sql)) {
          return { rows: [{ id: 'assignment-a' }], rowCount: 1 };
        }
        return {
          rows: [{ id: 'welfare-a' }],
          rowCount: 1,
        };
      },
    } as never,
    {
      publishWelfareCaseReferred: async (input: any) => {
        welfareEvents.push(input);
      },
    } as never,
  );

  const result = await service.referWelfareCase('tenant-a', 'teacher-a', 'stream-a', {
    studentId: 'student-a',
    reason: 'Needs counselling follow up',
  });

  assert.equal(result.success, true);
  assert.equal(result.referralId, 'welfare-a');
  const studentScopeQuery = queries.find((query) => /student_class_assignments/.test(query.sql));
  assert.ok(studentScopeQuery);
  const insertQuery = queries.find((query) => /INSERT INTO student_welfare_cases/.test(query.sql));
  assert.ok(insertQuery);
  assert.equal(insertQuery.params[0], 'tenant-a');
  assert.equal(insertQuery.params[1], 'student-a');
  assert.equal(insertQuery.params[3], 'Needs counselling follow up');
  assert.equal(welfareEvents[0].referral_id, 'welfare-a');
  assert.equal(welfareEvents[0].tenant_id, 'tenant-a');
});

test('ClassTeacherService saves class discipline concerns from an active appointment without a subject assignment', async () => {
  const queries: Array<{ sql: string; params: unknown[] }> = [];
  const service = new ClassTeacherService(
    {
      query: async (sql: string, params: unknown[]) => {
        queries.push({ sql, params });
        if (/FROM academics_class_teachers appointment/.test(sql)) {
          return { rows: [{ id: 'appointment-a' }], rowCount: 1 };
        }
        return { rows: [], rowCount: 1 };
      },
    } as never,
    {} as never,
  );

  const result = await service.saveDisciplineConcern('tenant-a', 'teacher-a', {
    studentId: 'student-a',
    concernType: 'welfare',
    description: 'Follow-up required',
  });

  assert.equal(result.success, true);
  const appointmentQuery = queries.find((query) => /FROM academics_class_teachers appointment/.test(query.sql));
  assert.ok(appointmentQuery);
  assert.match(appointmentQuery.sql, /student_class_assignments/);
  assert.match(appointmentQuery.sql, /effective_from <= CURRENT_DATE/);
  assert.equal(queries.some((query) => /teacher_subject_assignments/.test(query.sql)), false);
  const insertQuery = queries.find((query) => /INSERT INTO discipline_incidents/.test(query.sql));
  assert.ok(insertQuery);
  assert.match(insertQuery.sql, /reported_by/);
  assert.doesNotMatch(insertQuery.sql, /reported_by_user_id/);
});

test('ClassTeacherService rejects class discipline concerns after the class-teacher appointment ends', async () => {
  const queries: Array<{ sql: string; params: unknown[] }> = [];
  const service = new ClassTeacherService(
    {
      query: async (sql: string, params: unknown[]) => {
        queries.push({ sql, params });
        return { rows: [], rowCount: 0 };
      },
    } as never,
    {} as never,
  );

  await assert.rejects(
    () => service.saveDisciplineConcern('tenant-a', 'teacher-a', {
      studentId: 'student-a',
      concernType: 'attendance',
      description: 'Repeated absence',
    }),
    /active class-teacher appointment/,
  );
  assert.equal(queries.some((query) => /INSERT INTO discipline_incidents/.test(query.sql)), false);
});

test('ClassTeacherService scopes class-mode homework reads by appointment and teacher-mode reads by teaching assignment', async () => {
  const classModeQueries: Array<{ sql: string; params: unknown[] }> = [];
  const classModeService = new ClassTeacherService(
    {
      query: async (sql: string, params: unknown[]) => {
        classModeQueries.push({ sql, params });
        if (/FROM academics_class_teachers/.test(sql)) {
          return { rows: [{ id: 'appointment-a' }], rowCount: 1 };
        }
        return { rows: [], rowCount: 0 };
      },
    } as never,
    {} as never,
    undefined,
    { getStore: () => ({ role: 'class_teacher' }) } as never,
  );
  await classModeService.getHomework('tenant-a', 'teacher-a', 'stream-a');
  assert.match(classModeQueries[0].sql, /academics_class_teachers/);
  assert.equal(classModeQueries.some((query) => /teacher_subject_assignments/.test(query.sql)), false);

  const teacherModeQueries: Array<{ sql: string; params: unknown[] }> = [];
  const teacherModeService = new ClassTeacherService(
    {
      query: async (sql: string, params: unknown[]) => {
        teacherModeQueries.push({ sql, params });
        if (/FROM teacher_subject_assignments/.test(sql)) {
          return { rows: [{ id: 'assignment-a' }], rowCount: 1 };
        }
        return { rows: [], rowCount: 0 };
      },
    } as never,
    {} as never,
    undefined,
    { getStore: () => ({ role: 'teacher' }) } as never,
  );
  await teacherModeService.getHomework('tenant-a', 'teacher-a', 'stream-a');
  assert.match(teacherModeQueries[0].sql, /teacher_subject_assignments/);
  assert.match(teacherModeQueries[0].sql, /effective_from <= CURRENT_DATE/);
  assert.equal(teacherModeQueries.some((query) => /academics_class_teachers/.test(query.sql)), false);
});
