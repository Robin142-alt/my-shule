import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';

import { DeputyCommandService } from '../deputy-command.service';
import { DeputyCommandRepository } from './deputy-command.repository';

type QueryResult = { rows: any[]; rowCount: number };

function repositoryWithQuery(query: (sql: string, params: unknown[]) => Promise<QueryResult>) {
  return new DeputyCommandRepository({ query } as never);
}

test('DeputyCommandRepository contains no false-empty catch or fabricated dashboard status literals', () => {
  const source = readFileSync(
    path.join(process.cwd(), 'apps/api/src/modules/admin-command/repositories/deputy-command.repository.ts'),
    'utf8',
  );

  assert.doesNotMatch(source, /\.catch\s*\(/);
  assert.doesNotMatch(source, /morning_parade_status:\s*["']Completed["']/);
  assert.doesNotMatch(source, /gate_security_status:\s*["']Report Received["']/);
  assert.doesNotMatch(source, /['"]School Counsellor['"]\s+AS\s+["']assignedTo["']/i);
  assert.doesNotMatch(source, /['"]Ready['"]\s+AS\s+status/i);
  assert.doesNotMatch(source, /['"]Active['"]\s+AS\s+status/i);
  assert.doesNotMatch(source, /compiled-json-report/);
  assert.doesNotMatch(source, /UPDATE\s+operational_requests[\s\S]*Deputy Principal/i);
  assert.doesNotMatch(source, /async\s+actionApproval\s*\(/);
  assert.match(source, /event\.event_type IN \('security\.shift_started', 'security\.shift_ended'\)/);
  assert.match(source, /event\.event_type = 'deputy\.welfare\.assigned'/);
  assert.match(source, /createCsvReportArtifact/);
  assert.match(source, /createXlsxReportArtifact/);
  assert.match(source, /createPdfReportArtifact/);
  assert.match(source, /WITH inserted_snapshot AS/);
  assert.match(source, /INSERT INTO report_snapshot_audit_logs/);
  assert.match(source, /recipient_role/);
  assert.match(source, /FROM unnest\(\$7::text\[\]\) AS role_name/);
});

test('Deputy dashboard collection reads surface tenant query failures instead of returning empty data', async () => {
  const methods = [
    'getOverview',
    'getDailyOperations',
    'getAttendance',
    'getWelfare',
    'getStaffDuty',
    'getTeaching',
    'getTimetable',
    'getAcademics',
    'getExams',
    'getReports',
    'getStaff',
  ] as const;

  for (const method of methods) {
    let queryCount = 0;
    const repository = repositoryWithQuery(async (sql, params) => {
      queryCount += 1;
      assert.equal(params[0], 'tenant-a');
      assert.match(sql, /tenant_id\s*=\s*\$1|tenant_id = \$1|tenant_id\s*=\s*section\.tenant_id/i);
      if (queryCount === 1) return { rows: [{}], rowCount: 1 };
      throw new Error(`${method} tenant read failed`);
    });

    await assert.rejects(
      () => repository[method]('tenant-a'),
      new RegExp(`${method} tenant read failed`),
    );
  }

  const communicationRepository = repositoryWithQuery(async () => {
    throw new Error('communication tenant read failed');
  });
  await assert.rejects(
    () => communicationRepository.getCommunication('tenant-a'),
    /communication tenant read failed/,
  );
});

test('Deputy mutations surface database failures and never convert them into verification success', async () => {
  const repository = repositoryWithQuery(async (_sql, params) => {
    assert.equal(params[0], 'tenant-a');
    throw new Error('deputy mutation database failed');
  });

  await assert.rejects(
    () => repository.notifyParent('tenant-a', null, 'attendance-log-a'),
    /deputy mutation database failed/,
  );
  await assert.rejects(
    () => repository.assignReliefTeacher('tenant-a', null, 'relief-a', 'Teacher A'),
    /deputy mutation database failed/,
  );
  await assert.rejects(
    () => repository.autoAssignRelief('tenant-a', null),
    /deputy mutation database failed/,
  );
  await assert.rejects(
    () => repository.messageHOD('tenant-a', 'intervention-a'),
    /deputy mutation database failed/,
  );
  await assert.rejects(
    () => repository.flagExamDelay('tenant-a', 'mark-a'),
    /deputy mutation database failed/,
  );
});

test('Deputy mutations fail closed when the tenant-scoped target does not exist', async () => {
  const repository = repositoryWithQuery(async (_sql, params) => {
    assert.equal(params[0], 'tenant-a');
    return { rows: [], rowCount: 0 };
  });

  await assert.rejects(
    () => repository.notifyParent('tenant-a', null, 'missing-attendance'),
    (error: unknown) => error instanceof NotFoundException && /Attendance log/i.test(error.message),
  );
  await assert.rejects(
    () => repository.assignReliefTeacher('tenant-a', null, 'missing-relief', 'Teacher A'),
    (error: unknown) => error instanceof NotFoundException && /Relief lesson or teacher/i.test(error.message),
  );
});

test('Deputy attendance notices target only active same-tenant linked guardian users', async () => {
  const statements: Array<{ sql: string; params: unknown[] }> = [];
  const actorUserId = '11111111-1111-4111-8111-111111111111';
  const repository = repositoryWithQuery(async (sql, params) => {
    statements.push({ sql, params });
    return {
      rows: [{
        id: 'attendance-log-a',
        student_id: 'student-a',
        student_name: 'Learner A',
        class_name: 'Grade 8 North',
        status: 'absent',
        reason: 'Unexplained',
        guardian_notification_count: 2,
        event_id: 'event-a',
      }],
      rowCount: 1,
    };
  });

  const result = await repository.notifyParent('tenant-a', actorUserId, 'attendance-log-a');

  assert.equal(result.guardianNotificationCount, 2);
  assert.match(result.message, /2 linked guardian accounts/);
  assert.deepEqual(statements[0].params, ['tenant-a', 'attendance-log-a', actorUserId]);
  assert.match(statements[0].sql, /INNER JOIN students student[\s\S]*student\.tenant_id = log\.tenant_id/);
  assert.match(statements[0].sql, /INNER JOIN student_guardians guardian/);
  assert.match(statements[0].sql, /INNER JOIN tenant_memberships membership/);
  assert.match(statements[0].sql, /recipient_user_id, recipient_guardian_id/);
  assert.match(statements[0].sql, /recipient_scope', 'linked_guardian_users'/);
  assert.match(statements[0].sql, /INSERT INTO workflow_events/);
  assert.match(statements[0].sql, /'\[\]'::jsonb/);
  assert.match(statements[0].sql, /INSERT INTO audit_logs/);
  assert.doesNotMatch(statements[0].sql, /recipient_role/);
  assert.doesNotMatch(statements[0].sql, /unnest\([^)]*parent/i);
});

test('Deputy attendance notice reports truthful failure when no linked guardian can receive it', async () => {
  const repository = repositoryWithQuery(async () => ({
    rows: [{
      id: 'attendance-log-a',
      student_id: 'student-a',
      guardian_notification_count: 0,
      event_id: null,
    }],
    rowCount: 1,
  }));

  await assert.rejects(
    () => repository.notifyParent('tenant-a', null, 'attendance-log-a'),
    (error: unknown) => error instanceof BadRequestException && /no parent notice was sent/i.test(error.message),
  );
});

test('Deputy approval history is restricted to decisions made by the exact tenant user and role', async () => {
  const statements: Array<{ sql: string; params: unknown[] }> = [];
  const repository = repositoryWithQuery(async (sql, params) => {
    statements.push({ sql, params });
    return {
      rows: [{
        id: 'approval-a',
        title: 'Purchase request',
        status: 'approved',
        note: 'Within budget',
        module: 'procurement',
        record_id: 'request-a',
        date: '2026-08-22',
      }],
      rowCount: 1,
    };
  });

  const history = await repository.getDeputyApprovalHistory(
    'tenant-a',
    '11111111-1111-4111-8111-111111111111',
    'deputy_principal',
  );

  assert.equal(history[0].id, 'approval-a');
  assert.deepEqual(statements[0].params, [
    'tenant-a',
    '11111111-1111-4111-8111-111111111111',
    'deputy_principal',
  ]);
  assert.match(statements[0].sql, /FROM dashboard_approval_requests approval/);
  assert.match(statements[0].sql, /approval\.tenant_id::text = \$1::text/);
  assert.match(statements[0].sql, /approval\.approver_user_id = \$2::uuid/);
  assert.match(statements[0].sql, /decisionByRole/);
  assert.match(statements[0].sql, /btrim\(\$3\)/);
  assert.doesNotMatch(statements[0].sql, /operational_requests/);
});

test('Deputy approval service delegates addressed reads and validated decisions to ApprovalService', async () => {
  const store = {
    tenant_id: 'tenant-a',
    user_id: '11111111-1111-4111-8111-111111111111',
    role: 'deputy_principal',
    request_id: 'request-44',
  };
  const listCalls: Array<Record<string, unknown>> = [];
  const decisionCalls: Array<Record<string, unknown>> = [];
  const historyCalls: unknown[][] = [];
  const service = new DeputyCommandService(
    { getStore: () => store, requireStore: () => store } as never,
    {
      getDeputyApprovalHistory: async (...args: unknown[]) => {
        historyCalls.push(args);
        return [{ id: 'approval-old', title: 'Prior approval', status: 'approved' }];
      },
    } as never,
    {} as never,
    {
      listPendingForApprover: async (input: Record<string, unknown>) => {
        listCalls.push(input);
        return [{
          id: 'approval-a',
          title: 'Purchase request',
          status: 'pending',
          module: 'procurement',
          approval_type: 'procurement',
          priority: 'high',
        }];
      },
      decideRequest: async (input: Record<string, unknown>) => {
        decisionCalls.push(input);
        return { id: input.approvalId, status: input.decision };
      },
    } as never,
  );

  const overview = await service.getApprovals();

  assert.deepEqual(listCalls, [{
    tenantId: 'tenant-a',
    actorUserId: '11111111-1111-4111-8111-111111111111',
    actorRole: 'deputy_principal',
  }]);
  assert.deepEqual(historyCalls, [[
    'tenant-a',
    '11111111-1111-4111-8111-111111111111',
    'deputy_principal',
  ]]);
  assert.deepEqual(overview.metrics, { pending_approvals: 1, urgent_approvals: 1 });
  assert.equal(overview.approvalsList[0].id, 'approval-a');

  await assert.rejects(
    () => service.actionApproval('approval-a', { action: 'reject' }),
    /A rejection reason is required/,
  );
  await assert.rejects(
    () => service.actionApproval('approval-a', { action: 'forward' }),
    /Approval action must be approve or reject/,
  );
  assert.equal(decisionCalls.length, 0);

  const result = await service.actionApproval(' approval-a ', {
    action: 'REJECT',
    comment: '  Missing quotation evidence.  ',
  });

  assert.equal(result.success, true);
  assert.deepEqual(decisionCalls, [{
    tenantId: 'tenant-a',
    approvalId: 'approval-a',
    actorUserId: '11111111-1111-4111-8111-111111111111',
    actorRole: 'deputy_principal',
    requestId: 'request-44',
    decision: 'REJECTED',
    note: 'Missing quotation evidence.',
  }]);
});

test('Deputy incident mutations bind involved parties as structured JSONB', async () => {
  const statements: Array<{ sql: string; params: unknown[] }> = [];
  let incidentSequence = 0;
  const repository = repositoryWithQuery(async (sql, params) => {
    statements.push({ sql, params });
    if (/INSERT INTO admin_incidents/i.test(sql)) {
      incidentSequence += 1;
      return { rows: [{ id: `incident-${incidentSequence}` }], rowCount: 1 };
    }
    if (/INSERT INTO workflow_events/i.test(sql)) {
      return { rows: [{ id: 'event-welfare' }], rowCount: 1 };
    }
    return { rows: [], rowCount: 1 };
  });

  await repository.createDailyOperationNote('tenant-a', '11111111-1111-4111-8111-111111111111', {
    area: 'Morning Parade',
    issue: 'Uniform inspection completed',
  });
  await repository.createDisciplineIncident('tenant-a', '11111111-1111-4111-8111-111111111111', {
    studentName: 'Amina Otieno',
    incidentType: 'Late arrival',
    severity: 'Medium',
  });
  await repository.createWelfareCase('tenant-a', '11111111-1111-4111-8111-111111111111', {
    studentName: 'Brian Ouma',
    concern: 'Bereavement support',
    assignedTo: 'School Counsellor',
  });

  const incidentWrites = statements.filter((statement) => /INSERT INTO admin_incidents/i.test(statement.sql));
  assert.equal(incidentWrites.length, 3);
  for (const statement of incidentWrites) {
    assert.match(statement.sql, /involved_parties/);
    assert.match(statement.sql, /::jsonb/);
  }
  assert.deepEqual(JSON.parse(String(incidentWrites[0].params[3])), { area: 'Morning Parade' });
  assert.deepEqual(JSON.parse(String(incidentWrites[1].params[2])), { student_name: 'Amina Otieno' });
  assert.deepEqual(JSON.parse(String(incidentWrites[2].params[2])), { student_name: 'Brian Ouma' });
});

test('Deputy discipline reads derive a stable case reference without querying a nonexistent case_no column', async () => {
  const statements: Array<{ sql: string; params: unknown[] }> = [];
  const repository = repositoryWithQuery(async (sql, params) => {
    statements.push({ sql, params });
    return {
      rows: [{
        id: '11111111-1111-4111-8111-111111111111',
        caseNo: 'CAS-11111111',
        studentName: 'Amina Otieno',
        incidentType: 'Late arrival',
        severity: 'medium',
        status: 'reported',
      }],
      rowCount: 1,
    };
  });

  const discipline = await repository.getDiscipline('tenant-a');

  assert.equal(discipline[0].caseNo, 'CAS-11111111');
  assert.equal(discipline[0].studentName, 'Amina Otieno');
  assert.deepEqual(statements[0].params, ['tenant-a']);
  assert.match(statements[0].sql, /CONCAT\('CAS-', UPPER\(LEFT\(REPLACE\(id::text/);
  assert.match(statements[0].sql, /involved_parties ->> 'student_name'/);
  assert.doesNotMatch(statements[0].sql, /\bcase_no\b/i);
});

test('Deputy teaching reads pre-aggregate attendance and lesson logs before joining timetable lessons', async () => {
  const statements: Array<{ sql: string; params: unknown[] }> = [];
  const repository = repositoryWithQuery(async (sql, params) => {
    statements.push({ sql, params });
    if (/AS total_lessons/i.test(sql)) {
      return { rows: [{ total_lessons: 1 }], rowCount: 1 };
    }
    return {
      rows: [{
        id: 'lesson-a',
        className: 'Grade 8 East',
        subject: 'Mathematics',
        lessonTime: '08:00 - 08:40',
        attendanceStatus: 'Exceptions',
        logStatus: 'Submitted',
      }],
      rowCount: 1,
    };
  });

  const teaching = await repository.getTeaching('tenant-a');

  assert.equal(teaching.lessons.length, 1);
  assert.equal(teaching.lessons[0].attendanceStatus, 'Exceptions');
  assert.equal(statements.every((statement) => statement.params[0] === 'tenant-a'), true);
  assert.match(statements[1].sql, /WITH attendance_summary AS/);
  assert.match(statements[1].sql, /lesson_log_summary AS/);
  assert.match(statements[1].sql, /GROUP BY attendance\.tenant_id, attendance\.class_id, attendance\.attendance_date/);
  assert.match(statements[1].sql, /GROUP BY lesson_log\.tenant_id, lesson_log\.class_id, lesson_log\.log_date/);
  assert.match(statements[1].sql, /LEFT JOIN attendance_summary att/);
  assert.match(statements[1].sql, /LEFT JOIN lesson_log_summary log/);
  assert.doesNotMatch(statements[1].sql, /LEFT JOIN student_attendance_logs/);
  assert.doesNotMatch(statements[1].sql, /LEFT JOIN academics_lesson_logs/);
});

test('Deputy daily-operation status is returned from same-tenant parade and security records', async () => {
  const statements: Array<{ sql: string; params: unknown[] }> = [];
  const repository = repositoryWithQuery(async (sql, params) => {
    statements.push({ sql, params });
    if (/FROM teacher_attendance_logs/i.test(sql)) {
      return {
        rows: [{
          absent_teachers: 2,
          late_teachers: 1,
          total_staff: 30,
          present_staff: 27,
          morning_parade_status: 'Reviewed',
          gate_security_status: 'Shift Active',
        }],
        rowCount: 1,
      };
    }
    return {
      rows: [{
        id: 'note-a',
        created_at: '2026-08-22T06:30:00.000Z',
        involved_parties: 'Morning Parade',
        description: 'Parade completed after uniform checks',
        status: 'resolved',
      }],
      rowCount: 1,
    };
  });

  const result = await repository.getDailyOperations('tenant-a');

  assert.equal(result.metrics.morning_parade_status, 'Reviewed');
  assert.equal(result.metrics.gate_security_status, 'Shift Active');
  assert.equal(result.metrics.staff_on_duty_present, 27);
  assert.equal(result.metrics.staff_on_duty_total, 30);
  assert.equal(result.notes[0].area, 'Morning Parade');
  assert.equal(statements.every((statement) => statement.params[0] === 'tenant-a'), true);
  assert.match(statements[0].sql, /incident\.tenant_id = \$1/);
  assert.match(statements[0].sql, /event\.tenant_id = \$1/);
});

test('Deputy welfare assignment is persisted as a tenant-scoped workflow event and notification', async () => {
  const statements: Array<{ sql: string; params: unknown[] }> = [];
  const repository = repositoryWithQuery(async (sql, params) => {
    statements.push({ sql, params });
    assert.equal(params[0], 'tenant-a');
    if (/INSERT INTO admin_incidents/i.test(sql)) {
      return { rows: [{ id: 'case-a', description: 'Student support' }], rowCount: 1 };
    }
    if (/INSERT INTO workflow_events/i.test(sql)) {
      return { rows: [{ id: 'event-a', event_type: 'deputy.welfare.assigned' }], rowCount: 1 };
    }
    return { rows: [], rowCount: 1 };
  });

  const result = await repository.createWelfareCase(
    'tenant-a',
    '11111111-1111-4111-8111-111111111111',
    {
      studentName: 'Achieng Otieno',
      concern: 'Bereavement support',
      assignedTo: 'School Counsellor',
    },
  );

  assert.equal(result.rows[0].id, 'case-a');
  const eventWrite = statements.find((statement) => /INSERT INTO workflow_events/i.test(statement.sql));
  assert.ok(eventWrite);
  assert.equal(eventWrite.params[3], 'deputy.welfare.assigned');
  assert.equal(eventWrite.params[4], 'admin_incident');
  assert.equal(eventWrite.params[5], 'case-a');
  assert.deepEqual(JSON.parse(String(eventWrite.params[2])), ['guidance_counselling', 'deputy_principal']);
  assert.equal(JSON.parse(String(eventWrite.params[8])).assignedTo, 'School Counsellor');

  const notificationWrite = statements.find((statement) => /INSERT INTO notifications/i.test(statement.sql));
  assert.ok(notificationWrite);
  assert.match(notificationWrite.sql, /recipient_role/);
  assert.deepEqual(notificationWrite.params[6], ['guidance_counselling', 'deputy_principal']);
  assert.ok(statements.some((statement) => /INSERT INTO audit_logs/i.test(statement.sql)));
});

test('Deputy welfare reads use the stored assignment event and preserve the dashboard response shape', async () => {
  const statements: Array<{ sql: string; params: unknown[] }> = [];
  let queryCount = 0;
  const repository = repositoryWithQuery(async (sql, params) => {
    queryCount += 1;
    statements.push({ sql, params });
    if (queryCount === 1) {
      return { rows: [{ clinic_visits_today: 1 }], rowCount: 1 };
    }
    return {
      rows: [{
        id: 'case-a',
        studentName: 'Achieng Otieno',
        concern: 'Bereavement support',
        assignedTo: 'School Counsellor',
        status: 'reported',
      }],
      rowCount: 1,
    };
  });

  const result = await repository.getWelfare('tenant-a');

  assert.deepEqual(result.metrics, { clinic_visits_today: 1 });
  assert.equal(result.cases[0].studentName, 'Achieng Otieno');
  assert.equal(result.cases[0].assignedTo, 'School Counsellor');
  assert.equal(result.cases[0].status, 'Referred');
  assert.match(statements[1].sql, /event\.tenant_id = incident\.tenant_id/);
  assert.match(statements[1].sql, /event\.entity_id = incident\.id::text/);
  assert.equal(statements.every((statement) => statement.params[0] === 'tenant-a'), true);
});

test('Deputy notification and audit failures surface to callers', async () => {
  const notificationFailureRepository = repositoryWithQuery(async (sql) => {
    if (/INSERT INTO admin_incidents/i.test(sql)) {
      return { rows: [{ id: 'case-a' }], rowCount: 1 };
    }
    if (/INSERT INTO workflow_events/i.test(sql)) {
      return { rows: [{ id: 'event-a' }], rowCount: 1 };
    }
    if (/INSERT INTO notifications/i.test(sql)) {
      throw new Error('notification persistence failed');
    }
    return { rows: [], rowCount: 1 };
  });
  await assert.rejects(
    () => notificationFailureRepository.createWelfareCase('tenant-a', 'system', {
      studentName: 'Learner A',
      concern: 'Support needed',
      assignedTo: 'Nurse',
    }),
    /notification persistence failed/,
  );

  const auditFailureRepository = repositoryWithQuery(async (sql) => {
    if (/INSERT INTO workflow_events/i.test(sql)) {
      return { rows: [{ id: 'event-a' }], rowCount: 1 };
    }
    if (/INSERT INTO audit_logs/i.test(sql)) {
      throw new Error('audit persistence failed');
    }
    return { rows: [], rowCount: 1 };
  });
  await assert.rejects(
    () => auditFailureRepository.requestDutyReport('tenant-a', null, 'roster-a'),
    /audit persistence failed/,
  );
});

test('Deputy report generation stores truthful CSV, XLSX, and PDF bytes with atomic tenant audits', async () => {
  const actorUserId = '11111111-1111-4111-8111-111111111111';
  const statements: Array<{ sql: string; params: unknown[] }> = [];
  const repository = repositoryWithQuery(async (sql, params) => {
    statements.push({ sql, params });
    assert.equal(params[0], 'tenant-a');
    if (/WITH inserted_snapshot AS/i.test(sql)) {
      return { rows: [{ snapshot_id: params[1] }], rowCount: 1 };
    }
    return { rows: [], rowCount: 1 };
  });

  Object.assign(repository, {
    getOverview: async () => ({ metrics: { active_students: 420 } }),
    getDailyOperations: async () => ({ metrics: { gate_security_status: 'Shift Active' }, notes: [] }),
    getAttendance: async () => ({ metrics: { present_today: 400 }, attendanceList: [{ studentName: 'Learner A' }] }),
    getDiscipline: async () => ({ metrics: { open_cases: 1 }, incidents: [] }),
    getWelfare: async () => ({ metrics: { clinic_visits_today: 2 }, cases: [] }),
    getTeaching: async () => ({ metrics: { lessons_today: 14 }, teachingList: [] }),
    getTimetable: async () => ({ metrics: { relief_required: 0 }, timetableList: [] }),
    getAcademics: async () => ({ metrics: { interventions: 1 }, interventions: [] }),
    getExams: async () => ({ metrics: { pending_marks: 3 }, examsList: [] }),
    getClasses: async () => ({ metrics: { active_classes: 12 }, classesList: [] }),
    getApprovals: async () => ({ metrics: { pending_approvals: 2 }, approvalsList: [] }),
    getStaff: async () => ({ metrics: { active_staff: 35 }, staffList: [] }),
  });

  const expectations = {
    csv: {
      contentType: 'text/csv; charset=utf-8',
      magic: (content: Buffer) => content.toString('utf8').startsWith('Section,Group,Record,Value\r\n'),
    },
    xlsx: {
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      magic: (content: Buffer) => content.subarray(0, 2).toString('ascii') === 'PK',
    },
    pdf: {
      contentType: 'application/pdf',
      magic: (content: Buffer) => content.subarray(0, 4).toString('ascii') === '%PDF',
    },
  } as const;

  for (const format of ['csv', 'xlsx', 'pdf'] as const) {
    const result = await repository.generateReport(
      'tenant-a',
      'Deputy Operational Extract',
      format,
      actorUserId,
    );
    const content = Buffer.from(result.artifact.content_base64, 'base64');
    const expectation = expectations[format];

    assert.equal(result.report.format, format);
    assert.equal(result.artifact.kind, 'generated-report');
    assert.equal(result.artifact.encoding, 'base64');
    assert.equal(result.artifact.content_type, expectation.contentType);
    assert.equal(result.artifact.filename.endsWith(`.${format}`), true);
    assert.equal(result.artifact.byte_length, content.length);
    assert.equal(result.artifact.checksum_sha256, createHash('sha256').update(content).digest('hex'));
    assert.equal(expectation.magic(content), true);
    if (format === 'csv') assert.match(content.toString('utf8'), /Learner A/);

    const reportWrite = statements.filter((statement) => /WITH inserted_snapshot AS/i.test(statement.sql)).at(-1);
    assert.ok(reportWrite);
    assert.equal(reportWrite.params[0], 'tenant-a');
    assert.equal(reportWrite.params[4], format);
    assert.equal(reportWrite.params[6], actorUserId);
    assert.deepEqual(JSON.parse(String(reportWrite.params[5])), result.artifact);
    assert.match(reportWrite.sql, /INSERT INTO report_snapshots/);
    assert.match(reportWrite.sql, /INSERT INTO report_snapshot_audit_logs/);
    assert.match(reportWrite.sql, /INSERT INTO audit_logs/);
    assert.match(String(reportWrite.params[2]), /^deputy-/);
    assert.doesNotMatch(String(reportWrite.params[2]), /attendance/i);
    const auditMetadata = JSON.parse(String(reportWrite.params[9]));
    assert.equal(auditMetadata.artifact_checksum_sha256, result.artifact.checksum_sha256);
    assert.equal(auditMetadata.byte_length, content.length);
  }
});

test('Deputy reports only become Ready when the stored artifact bytes pass integrity checks', async () => {
  const content = Buffer.from(
    'Section,Group,Record,Value\r\noverview,metrics,active_students,420\r\n',
    'utf8',
  );
  const validArtifact = {
    kind: 'generated-report',
    filename: 'deputy-operational-report.csv',
    content_type: 'text/csv; charset=utf-8',
    byte_length: content.length,
    row_count: 1,
    checksum_sha256: createHash('sha256').update(content).digest('hex'),
    generated_at: '2026-08-22T10:00:00.000Z',
    section_count: 1,
    encoding: 'base64',
    content_base64: content.toString('base64'),
  };
  const statements: Array<{ sql: string; params: unknown[] }> = [];
  let queryCount = 0;
  const repository = repositoryWithQuery(async (sql, params) => {
    queryCount += 1;
    statements.push({ sql, params });
    if (queryCount === 1) return { rows: [{ generated_reports: 4 }], rowCount: 1 };
    return {
      rows: [
        {
          id: 'report-ready',
          reportName: 'Ready report',
          generatedDate: '2026-08-22T10:00:00.000Z',
          type: 'csv',
          artifact: validArtifact,
          manifest: { format: 'csv' },
        },
        {
          id: 'report-metadata-only',
          reportName: 'Metadata only',
          generatedDate: '2026-08-22T09:00:00.000Z',
          type: 'pdf',
          artifact: { kind: 'compiled-json-report', filename: 'metadata.pdf' },
          manifest: { format: 'pdf' },
        },
        {
          id: 'report-corrupt',
          reportName: 'Corrupt report',
          generatedDate: '2026-08-22T08:00:00.000Z',
          type: 'csv',
          artifact: { ...validArtifact, checksum_sha256: '0'.repeat(64) },
          manifest: { format: 'csv' },
        },
        {
          id: 'report-missing',
          reportName: 'Missing artifact',
          generatedDate: '2026-08-22T07:00:00.000Z',
          type: 'xlsx',
          artifact: null,
          manifest: { format: 'xlsx' },
        },
      ],
      rowCount: 4,
    };
  });

  const result = await repository.getReports('tenant-a');

  assert.deepEqual(result.metrics, { generated_reports: 4 });
  assert.deepEqual(result.reportsList.map((report) => report.status), ['Ready', 'Failed', 'Failed', 'Failed']);
  assert.deepEqual(Object.keys(result.reportsList[0]).sort(), ['generatedDate', 'id', 'reportName', 'status', 'type']);
  assert.equal(statements.every((statement) => statement.params[0] === 'tenant-a'), true);
  assert.match(statements[1].sql, /WHERE tenant_id = \$1/);
  assert.doesNotMatch(statements[1].sql, /['"]Ready['"]\s+AS\s+status/i);
});

test('Deputy report download returns only a verified same-tenant artifact and records both audits', async () => {
  const content = Buffer.from(
    'Section,Group,Record,Value\r\noverview,metrics,active_students,420\r\n',
    'utf8',
  );
  const artifact = {
    kind: 'generated-report',
    filename: 'deputy-operational-report.csv',
    content_type: 'text/csv; charset=utf-8',
    byte_length: content.length,
    row_count: 1,
    checksum_sha256: createHash('sha256').update(content).digest('hex'),
    generated_at: '2026-08-22T10:00:00.000Z',
    section_count: 1,
    encoding: 'base64',
    content_base64: content.toString('base64'),
  };
  const actorUserId = '11111111-1111-4111-8111-111111111111';
  const statements: Array<{ sql: string; params: unknown[] }> = [];
  const repository = repositoryWithQuery(async (sql, params) => {
    statements.push({ sql, params });
    return {
      rows: [{
        id: '22222222-2222-4222-8222-222222222222',
        snapshotId: 'deputy-snapshot-1',
        title: 'Deputy operational report',
        format: 'csv',
        artifact,
        manifest: { format: 'csv' },
        generatedDate: '2026-08-22T10:00:00.000Z',
      }],
      rowCount: 1,
    };
  });

  const result = await repository.downloadReportArtifact('tenant-a', 'deputy-snapshot-1', actorUserId);

  assert.equal(result.success, true);
  assert.deepEqual(result.report.artifact, artifact);
  assert.deepEqual(statements[0].params, ['tenant-a', 'deputy-snapshot-1', actorUserId]);
  assert.match(statements[0].sql, /WHERE tenant_id = \$1/);
  assert.match(statements[0].sql, /module = 'deputy-command'/);
  assert.match(statements[0].sql, /INSERT INTO report_snapshot_audit_logs/);
  assert.match(statements[0].sql, /report\.snapshot\.downloaded/);
  assert.match(statements[0].sql, /INSERT INTO audit_logs/);
  assert.match(statements[0].sql, /deputy\.report\.downloaded/);
});

test('Deputy report download fails closed for missing or corrupt tenant artifacts', async () => {
  const missingRepository = repositoryWithQuery(async () => ({ rows: [], rowCount: 0 }));
  await assert.rejects(
    () => missingRepository.downloadReportArtifact('tenant-a', 'foreign-report', null),
    (error: unknown) => error instanceof NotFoundException,
  );

  const corruptRepository = repositoryWithQuery(async () => ({
    rows: [{
      id: 'report-corrupt',
      snapshotId: 'snapshot-corrupt',
      title: 'Corrupt report',
      format: 'pdf',
      artifact: { kind: 'generated-report', encoding: 'base64', content_base64: 'bm90IGEgcGRm' },
      manifest: { format: 'pdf' },
    }],
    rowCount: 1,
  }));
  await assert.rejects(
    () => corruptRepository.downloadReportArtifact('tenant-a', 'snapshot-corrupt', null),
    (error: unknown) => error instanceof ConflictException,
  );
});

test('Deputy report generation surfaces an atomic snapshot or audit write failure', async () => {
  const repository = repositoryWithQuery(async (sql) => {
    if (/WITH inserted_snapshot AS/i.test(sql)) throw new Error('report snapshot audit transaction failed');
    return { rows: [], rowCount: 0 };
  });
  const emptySection = async () => ({});
  Object.assign(repository, {
    getOverview: emptySection,
    getDailyOperations: emptySection,
    getAttendance: emptySection,
    getDiscipline: emptySection,
    getWelfare: emptySection,
    getTeaching: emptySection,
    getTimetable: emptySection,
    getAcademics: emptySection,
    getExams: emptySection,
    getClasses: emptySection,
    getApprovals: emptySection,
    getStaff: emptySection,
  });

  await assert.rejects(
    () => repository.generateReport('tenant-a', 'Deputy Report', 'pdf', null),
    /report snapshot audit transaction failed/,
  );
});

test('Deputy report service binds the authenticated actor and tenant to generation', async () => {
  const calls: unknown[][] = [];
  const store = {
    tenant_id: 'tenant-a',
    user_id: '11111111-1111-4111-8111-111111111111',
    role: 'deputy_principal',
    request_id: 'request-report',
  };
  const service = new DeputyCommandService(
    {
      getStore: () => store,
      requireStore: () => store,
    } as never,
    {
      generateReport: async (...args: unknown[]) => {
        calls.push(args);
        return { success: true };
      },
      getDeputyApprovalHistory: async () => [],
    } as never,
    {} as never,
    {
      listPendingForApprover: async () => [],
    } as never,
  );

  await service.generateReport({ name: 'Deputy Report', format: 'xlsx' });

  assert.deepEqual(calls, [[
    'tenant-a',
    'Deputy Report',
    'xlsx',
    '11111111-1111-4111-8111-111111111111',
    {
      metrics: { pending_approvals: 0, urgent_approvals: 0 },
      approvalsList: [],
      recentApprovals: [],
    },
  ]]);
});
