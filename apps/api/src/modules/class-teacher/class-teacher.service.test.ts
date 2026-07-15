import assert from 'node:assert/strict';
import test from 'node:test';

import { ClassTeacherService } from './class-teacher.service';

test('ClassTeacherService saves class-teacher settings as tenant and stream scoped workflow event', async () => {
  const queries: Array<{ sql: string; params: unknown[] }> = [];
  const service = new ClassTeacherService(
    {
      query: async (sql: string, params: unknown[]) => {
        queries.push({ sql, params });
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
  assert.match(queries[0].sql, /INSERT INTO workflow_events/);
  assert.equal(queries[0].params[0], 'tenant-a');
  assert.equal(queries[0].params[1], 'user-a');
  assert.equal(queries[0].params[2], 'stream-a');
  assert.equal(queries[0].params[3], 'class_teacher.settings_saved');
});

test('ClassTeacherService publishes attendance counts from submitted attendance values', async () => {
  const queries: Array<{ sql: string; params: unknown[] }> = [];
  const attendanceEvents: any[] = [];
  const service = new ClassTeacherService(
    {
      query: async (sql: string, params: unknown[]) => {
        queries.push({ sql, params });
        return { rows: [], rowCount: 0 };
      },
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
  assert.match(queries[0].sql, /DELETE FROM academics_attendance/);
  assert.match(queries[1].sql, /INSERT INTO academics_attendance/);
  assert.equal(attendanceEvents.length, 1);
  assert.equal(attendanceEvents[0].present_count, 1);
  assert.equal(attendanceEvents[0].absent_count, 2);
  assert.equal(attendanceEvents[0].tenant_id, 'tenant-a');
  assert.equal(attendanceEvents[0].stream_id, 'stream-a');
});

test('ClassTeacherService saves teacher mark drafts with current exam mark schema and without false submission events', async () => {
  const queries: Array<{ sql: string; params: unknown[] }> = [];
  const submissionEvents: any[] = [];
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
  );

  const result = await service.saveMarks('tenant-a', 'teacher-a', {
    action: 'draft',
    examId: 'window-a',
    classSectionId: 'stream-a',
    scores: { 'student-a': '74' },
  });

  assert.equal(result.success, true);
  const insertQuery = queries.find((query) => /INSERT INTO exam_marks/.test(query.sql));
  assert.ok(insertQuery);
  assert.match(insertQuery.sql, /entered_by_user_id/);
  assert.match(insertQuery.sql, /updated_by_user_id/);
  assert.doesNotMatch(insertQuery.sql, /\bentered_by\b/);
  assert.equal(submissionEvents.length, 0);
});

test('ClassTeacherService submits teacher marks for moderation with tenant scoped completion event', async () => {
  const queries: Array<{ sql: string; params: unknown[] }> = [];
  const submissionEvents: any[] = [];
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
  );

  const result = await service.saveMarks('tenant-a', 'teacher-a', {
    action: 'submit',
    examId: 'window-a',
    classSectionId: 'stream-a',
    scores: { 'student-a': '74' },
  });

  assert.equal(result.success, true);
  assert.equal(result.status, 'submitted');
  const updateQuery = queries.find((query) => /UPDATE exam_marks/.test(query.sql));
  assert.ok(updateQuery);
  assert.match(updateQuery.sql, /status = \$2/);
  assert.equal(updateQuery.params[1], 'submitted');
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
    /assigned class and subject/,
  );

  assert.match(queries[0].sql, /teacher_subject_assignments/);
  assert.equal(queries[0].params[0], 'tenant-a');
  assert.equal(queries[0].params[1], 'teacher-a');
  assert.equal(queries[0].params[2], 'stream-a');
  assert.equal(queries[0].params[3], 'subject-a');
  assert.equal(queries.some((query) => /INSERT INTO academics_assignments/.test(query.sql)), false);
});

test('ClassTeacherService persists homework only for the teacher assigned class-subject pair', async () => {
  const queries: Array<{ sql: string; params: unknown[] }> = [];
  const service = new ClassTeacherService(
    {
      query: async (sql: string, params: unknown[]) => {
        queries.push({ sql, params });
        if (/FROM teacher_subject_assignments/.test(sql)) {
          return { rows: [{ id: 'assignment-link-a' }], rowCount: 1 };
        }
        if (/INSERT INTO academics_assignments/.test(sql)) {
          return { rows: [{ id: 'homework-a' }], rowCount: 1 };
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
  const insertQuery = queries.find((query) => /INSERT INTO academics_assignments/.test(query.sql));
  assert.ok(insertQuery);
  assert.equal(insertQuery.params[0], 'tenant-a');
  assert.equal(insertQuery.params[3], 'stream-a');
  assert.equal(insertQuery.params[4], 'subject-a');
  assert.equal(insertQuery.params[6], 'teacher-a');
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
  assert.match(inventoryQuery.sql, /WHERE tenant_id = \$1/);
  assert.match(inventoryQuery.sql, /requested_by = \$2/);
  assert.equal(inventoryQuery.params[0], 'tenant-a');
  assert.equal(inventoryQuery.params[1], 'teacher-a');
});

test('ClassTeacherService returns tenant and stream scoped fee arrears for class-teacher fees workspace', async () => {
  const queries: Array<{ sql: string; params: unknown[] }> = [];
  const service = new ClassTeacherService(
    {
      query: async (sql: string, params: unknown[]) => {
        queries.push({ sql, params });
        return {
          rows: [
            {
              id: 'student-a',
              learner: 'Amina Otieno',
              balance_minor: 125000,
              last_payment_at: '2026-06-20T09:15:00.000Z',
            },
          ],
          rowCount: 1,
        };
      },
    } as never,
    {} as never,
  );

  const result = await service.getFees('tenant-a', 'teacher-a', 'stream-a');

  assert.equal(result.length, 1);
  assert.equal(result[0].id, 'student-a');
  assert.equal(result[0].learner, 'Amina Otieno');
  assert.equal(result[0].balance, 'KES 1,250.00');
  assert.equal(result[0].lastPayment, '6/20/2026');
  assert.equal(result[0].status, 'Overdue');
  assert.match(queries[0].sql, /student_invoices/);
  assert.match(queries[0].sql, /manual_fee_payments/);
  assert.match(queries[0].sql, /sca\.class_section_id = \$2/);
  assert.equal(queries[0].params[0], 'tenant-a');
  assert.equal(queries[0].params[1], 'stream-a');
});

test('ClassTeacherService returns tenant scoped report snapshots for class-teacher reports endpoint', async () => {
  const queries: Array<{ sql: string; params: unknown[] }> = [];
  const service = new ClassTeacherService(
    {
      query: async (sql: string, params: unknown[]) => {
        queries.push({ sql, params });
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
  assert.match(queries[0].sql, /FROM report_snapshots/);
  assert.match(queries[0].sql, /tenant_id = \$1/);
  assert.equal(queries[0].params[0], 'tenant-a');
});

test('ClassTeacherService verifies discipline students belong to the selected stream before persisting', async () => {
  const queries: Array<{ sql: string; params: unknown[] }> = [];
  const disciplineEvents: any[] = [];
  const service = new ClassTeacherService(
    {
      query: async (sql: string, params: unknown[]) => {
        queries.push({ sql, params });
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
  );

  const result = await service.reportDisciplineIncident('tenant-a', 'teacher-a', 'stream-a', {
    studentId: 'student-a',
    description: 'Persistent lateness',
    severity: 'medium',
  });

  assert.equal(result.success, true);
  assert.match(queries[0].sql, /student_class_assignments/);
  assert.equal(queries[0].params[0], 'tenant-a');
  assert.equal(queries[0].params[1], 'stream-a');
  assert.equal(queries[0].params[2], 'student-a');
  assert.match(queries[1].sql, /INSERT INTO discipline_incidents/);
  assert.equal(disciplineEvents[0].incident_id, 'incident-a');
});

test('ClassTeacherService persists welfare referrals before publishing the referral event', async () => {
  const queries: Array<{ sql: string; params: unknown[] }> = [];
  const welfareEvents: any[] = [];
  const service = new ClassTeacherService(
    {
      query: async (sql: string, params: unknown[]) => {
        queries.push({ sql, params });
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
  assert.match(queries[0].sql, /student_class_assignments/);
  assert.match(queries[1].sql, /INSERT INTO student_welfare_cases/);
  assert.equal(queries[1].params[0], 'tenant-a');
  assert.equal(queries[1].params[1], 'student-a');
  assert.equal(queries[1].params[3], 'Needs counselling follow up');
  assert.equal(welfareEvents[0].referral_id, 'welfare-a');
  assert.equal(welfareEvents[0].tenant_id, 'tenant-a');
});
