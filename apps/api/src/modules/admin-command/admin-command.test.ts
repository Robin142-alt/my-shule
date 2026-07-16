import assert from 'node:assert/strict';
import test from 'node:test';
import { BadRequestException } from '@nestjs/common';
import 'reflect-metadata';
import { firstValueFrom, of } from 'rxjs';

import { PERMISSIONS_KEY } from '../../auth/auth.constants';
import { MODULE_ACCESS_KEY } from '../module-access/module-access.decorator';
import { AdminCommandController } from './admin-command.controller';
import { AdminCommandSchemaService } from './admin-command-schema.service';
import { AdminCommandService } from './admin-command.service';
import { AccountantCommandService } from './accountant-command.service';
import { BoardingMasterCommandService } from './boarding-master-command.service';
import { PrincipalInsightsCacheService } from './principal-insights-cache.service';
import { PRINCIPAL_INSIGHT_PROVIDERS } from './principal-insights.providers';
import { PrincipalInsightsService } from './principal-insights.service';
import { AdminCommandRepository } from './repositories/admin-command.repository';
import { DeputyCommandRepository } from './repositories/deputy-command.repository';
import { SecurityOfficerCommandService } from './security-officer-command.service';
import { SecretaryCommandService } from './secretary-command.service';
import { IctManagerCommandService } from './ict-manager-command.service';
import { GuidanceCounsellingCommandService } from './guidance-counselling-command.service';
import { HodCommandService } from './hod-command.service';
import { LibrarianCommandService } from './librarian-command.service';
import { ProcurementOfficerCommandService } from './procurement-officer-command.service';
import { TransportManagerCommandService } from './transport-manager-command.service';
import { ExamsManagerCommandService } from './exams-manager-command.service';
import { TeacherCommandService } from './teacher-command.service';
import { DeanAcademicsCommandService } from './dean-academics-command.service';
import { AdmissionsCommandService } from './admissions-command.service';
import { AdmissionsCommandRepository } from './repositories/admissions-command.repository';

test('AdminCommandSchemaService creates leadership workflow tables with tenant RLS', async () => {
  let schemaSql = '';
  const service = new AdminCommandSchemaService({
    runSchemaBootstrap: async (sql: string) => {
      schemaSql += sql;
    },
  } as never);

  await service.onModuleInit();

  for (const table of [
    'admin_incidents',
    'announcements',
    'meeting_minutes',
    'duty_rosters',
    'boarding_exeats',
    'principal_dashboard_snapshots',
    'principal_alerts',
  ]) {
    assert.match(schemaSql, new RegExp(`CREATE TABLE IF NOT EXISTS ${table}`));
    assert.match(schemaSql, new RegExp(`ALTER TABLE ${table} FORCE ROW LEVEL SECURITY`));
  }
});

test('AdminCommandRepository builds principal teaching schedule from tenant timetable records', async () => {
  const queries: Array<{ sql: string; params: unknown[] }> = [];
  const repository = new AdminCommandRepository({
    query: async (sql: string, params: unknown[]) => {
      queries.push({ sql, params });
      if (/AS total_classes/i.test(sql)) {
        return { rows: [{ total_classes: 1, pending_grading: 2 }], rowCount: 1 };
      }
      return {
        rows: [{
          class_name: 'Grade 8 North',
          subject_name: 'Integrated Science',
          lesson_time: '08:00 - 08:40',
          room_name: 'Science Lab',
        }],
        rowCount: 1,
      };
    },
  } as never);

  const result = await repository.getPrincipalTeachingSchedule('tenant-a');

  assert.equal(queries.length, 2);
  assert.match(queries[0].sql, /WHERE lesson\.tenant_id = \$1/);
  assert.match(queries[1].sql, /WHERE lesson\.tenant_id = \$1/);
  assert.equal(queries[0].params[0], 'tenant-a');
  assert.equal(result.totalClasses, 1);
  assert.deepEqual(result.subjects, ['Integrated Science']);
  assert.deepEqual(result.upcomingClasses, [{
    class: 'Grade 8 North',
    subject: 'Integrated Science',
    time: '08:00 - 08:40',
    room: 'Science Lab',
  }]);
  assert.equal(result.pendingGrading, 2);
});

test('AdminCommandRepository persists and reads school profile settings inside the current tenant', async () => {
  const queries: Array<{ sql: string; params: unknown[] }> = [];
  const repository = new AdminCommandRepository({
    query: async (sql: string, params: unknown[] = []) => {
      queries.push({ sql, params });
      if (/UPDATE tenants/i.test(sql)) {
        return { rows: [{ tenant_id: 'tenant-a' }], rowCount: 1 };
      }
      return {
        rows: [{
          name: 'Maranda High',
          subdomain: 'maranda-high',
          status: 'active',
          settings: {
            email: 'office@maranda.test',
            phone: '+254700000001',
            county: 'Siaya',
            address: 'Box 1, Bondo',
            curriculum: 'CBC & 8-4-4',
            school_type: 'Boys Boarding',
          },
          metadata: { registration_status: 'registered' },
        }],
        rowCount: 1,
      };
    },
  } as never);

  const profile = await repository.updateSchoolProfile('tenant-a', {
    schoolName: 'Maranda High',
    motto: 'For excellence',
    curriculum: 'CBC & 8-4-4',
    schoolType: 'Boys Boarding',
    email: 'office@maranda.test',
    phone: '+254700000001',
    county: 'Siaya',
    subCounty: 'Bondo',
    ward: 'Central',
    address: 'Box 1, Bondo',
    website: 'https://maranda.test',
  });

  assert.equal(queries.length, 2);
  assert.match(queries[0].sql, /WHERE tenant_id = \$1/);
  assert.doesNotMatch(queries[0].sql, /id::text/);
  assert.equal(queries[0].params[0], 'tenant-a');
  assert.equal(queries[0].params[1], 'Maranda High');
  assert.match(String(queries[0].params[2]), /"county":"Siaya"/);
  assert.match(queries[1].sql, /WHERE tenant_id = \$1/);
  assert.doesNotMatch(queries[1].sql, /id::text/);
  assert.equal(profile?.status, 'active');
  assert.equal(profile?.contactInfo.email, 'office@maranda.test');
  assert.equal(profile?.county, 'Siaya');
});

test('DeputyCommandRepository attendance reads use tenant joins and do not hide query failures', async () => {
  const repository = new DeputyCommandRepository({
    query: async (sql: string, params: unknown[]) => {
      assert.equal(params[0], 'tenant-a');
      if (/FROM student_attendance_logs l/i.test(sql)) {
        throw new Error('attendance read failed');
      }
      return { rows: [{ absent_students: 0, late_students: 0 }], rowCount: 1 };
    },
  } as never);

  await assert.rejects(() => repository.getAttendance('tenant-a'), /attendance read failed/);
});

test('DeputyCommandRepository maps missing attendance relations to neutral labels', async () => {
  const repository = new DeputyCommandRepository({
    query: async (sql: string) => {
      if (/FROM student_attendance_logs l/i.test(sql)) {
        return {
          rows: [{
            id: 'log-1',
            student_name: null,
            class_name: null,
            status: 'late',
            reason: null,
            parent_notified: 'Pending',
          }],
          rowCount: 1,
        };
      }
      return { rows: [{ absent_students: 0, late_students: 1 }], rowCount: 1 };
    },
  } as never);

  const result = await repository.getAttendance('tenant-a');

  assert.equal(result.records[0].studentName, 'Learner not linked');
  assert.equal(result.records[0].className, 'Class not linked');
  assert.equal(result.records[0].reason, 'Unexplained');
});

test('AdmissionsCommandService rejects unsupported application statuses before persistence and audit', async () => {
  let updateCalls = 0;
  let auditCalls = 0;
  const service = new AdmissionsCommandService(
    {
      getStore: () => ({ tenant_id: 'tenant-a', user_id: '11111111-1111-4111-8111-111111111111' }),
    } as never,
    {
      recordAudit: async () => {
        auditCalls += 1;
      },
    } as never,
    {
      updateApplicationStatus: async () => {
        updateCalls += 1;
        return { id: 'application-1', status: 'withdrawn' };
      },
    } as never,
  );

  await assert.rejects(
    () => service.updateApplicationStatus('application-1', { status: 'withdrawn' }),
    (error) => error instanceof BadRequestException && /Unsupported application status/i.test(error.message),
  );
  assert.equal(updateCalls, 0);
  assert.equal(auditCalls, 0);
});

test('AdmissionsCommandService admits an approved application through the tenant-scoped student workflow', async () => {
  const audits: Array<{ action: string; resourceType: string; resourceId: string | null; metadata: Record<string, unknown> }> = [];
  const workflowEvents: Array<{ eventType: string; entityType: string; entityId?: string | null; payload?: Record<string, unknown> }> = [];
  const repoCalls: Array<{ tenantId: string; applicationId: string; userId: string }> = [];
  const service = new AdmissionsCommandService(
    {
      getStore: () => ({ tenant_id: 'tenant-a', user_id: '11111111-1111-4111-8111-111111111111' }),
    } as never,
    {
      recordAudit: async (_tenantId: string, action: string, resourceType: string, resourceId: string | null, metadata: Record<string, unknown>) => {
        audits.push({ action, resourceType, resourceId, metadata });
      },
      recordWorkflowAction: async (event: { eventType: string; entityType: string; entityId?: string | null; payload?: Record<string, unknown> }) => {
        workflowEvents.push(event);
        return { id: 'workflow-event-1' };
      },
      notifyRoles: async () => undefined,
    } as never,
    {
      admitStudent: async (tenantId: string, applicationId: string, userId: string) => {
        repoCalls.push({ tenantId, applicationId, userId });
        return {
          student: {
            id: '22222222-2222-4222-8222-222222222222',
            admission_number: 'ADM-2026-ABC12345',
          },
          application: {
            id: applicationId,
            full_name: 'Faith Anyango',
            class_applying: 'Grade 9',
            status: 'registered',
          },
          allocation: { id: 'allocation-1', class_name: 'Grade 9', stream_name: 'Default' },
          academicEnrollment: { id: 'enrollment-1', academic_year: '2026' },
        };
      },
    } as never,
  );

  const result = await service.admitStudent('33333333-3333-4333-8333-333333333333');

  assert.equal(result.student.admission_number, 'ADM-2026-ABC12345');
  assert.deepEqual(repoCalls, [{
    tenantId: 'tenant-a',
    applicationId: '33333333-3333-4333-8333-333333333333',
    userId: '11111111-1111-4111-8111-111111111111',
  }]);
  assert.equal(audits[0]?.action, 'admissions.student.admitted');
  assert.equal(audits[0]?.resourceType, 'student');
  assert.equal(audits[0]?.resourceId, '22222222-2222-4222-8222-222222222222');
  assert.equal(workflowEvents[0]?.eventType, 'admissions.student.admitted');
  assert.equal(workflowEvents[0]?.entityType, 'student');
  assert.equal(workflowEvents[0]?.entityId, '22222222-2222-4222-8222-222222222222');
});

test('AdmissionsCommandRepository admitStudent creates student allocation and enrollment inside the current tenant', async () => {
  const statements: Array<{ sql: string; params: unknown[] }> = [];
  const applicationId = '33333333-3333-4333-8333-333333333333';
  const studentId = '22222222-2222-4222-8222-222222222222';
  const repository = new AdmissionsCommandRepository({
    executeWithTenant: async (tenantId: string, userId: string | null, callback: (tx: { $queryRawUnsafe: (sql: string, ...params: unknown[]) => Promise<unknown[]> }) => Promise<unknown>) => {
      assert.equal(tenantId, 'tenant-a');
      return callback({
        $queryRawUnsafe: async (sql: string, ...params: unknown[]) => {
          statements.push({ sql, params });
          if (/FROM admission_applications/i.test(sql) && /LIMIT 1/i.test(sql)) {
            return [{
              id: applicationId,
              application_number: 'APP-2026-001',
              full_name: 'Faith Anyango',
              date_of_birth: '2013-02-14',
              gender: 'Female',
              birth_certificate_number: 'BC765432',
              nationality: 'Kenyan',
              class_applying: 'Grade 9',
              parent_name: 'Rose Anyango',
              parent_phone: '0700000000',
              parent_email: 'rose@example.com',
              relationship: 'mother',
              status: 'approved',
              admitted_student_id: null,
            }];
          }
          if (/INSERT INTO students/i.test(sql)) {
            assert.equal(params[0], 'tenant-a');
            return [{
              id: studentId,
              tenant_id: 'tenant-a',
              admission_number: 'ADM-2026-56B04666',
              first_name: 'Faith',
              last_name: 'Anyango',
              status: 'active',
            }];
          }
          if (/INSERT INTO student_allocations/i.test(sql)) {
            assert.equal(params[0], 'tenant-a');
            assert.equal(params[1], studentId);
            return [{ id: 'allocation-1', student_id: studentId, class_name: 'Grade 9', stream_name: 'Default' }];
          }
          if (/INSERT INTO student_academic_enrollments/i.test(sql)) {
            assert.equal(params[0], 'tenant-a');
            assert.equal(params[1], studentId);
            assert.equal(params[2], applicationId);
            return [{ id: 'enrollment-1', student_id: studentId, class_name: 'Grade 9', stream_name: 'Default', academic_year: '2026' }];
          }
          if (/UPDATE admission_applications/i.test(sql)) {
            assert.equal(params[0], 'tenant-a');
            assert.equal(params[1], applicationId);
            assert.equal(params[2], studentId);
            return [{ id: applicationId, status: 'registered', admitted_student_id: studentId }];
          }
          return [];
        },
      });
    },
  } as never);

  const result = await repository.admitStudent('tenant-a', applicationId, '11111111-1111-4111-8111-111111111111');

  assert.equal(result?.student.id, studentId);
  assert.equal(result?.application.status, 'registered');
  assert.ok(statements.some((statement) => /INSERT INTO students/i.test(statement.sql)));
  assert.ok(statements.some((statement) => /INSERT INTO student_allocations/i.test(statement.sql)));
  assert.ok(statements.some((statement) => /INSERT INTO student_academic_enrollments/i.test(statement.sql)));
  assert.ok(statements.every((statement) => statement.params[0] === 'tenant-a'));
});

test('DeputyCommandRepository discipline and welfare reads do not hide tenant query failures', async () => {
  const repository = new DeputyCommandRepository({
    query: async (_sql: string, params: unknown[]) => {
      assert.equal(params[0], 'tenant-a');
      throw new Error('deputy read failed');
    },
  } as never);

  await assert.rejects(() => repository.getDiscipline('tenant-a'), /deputy read failed/);
  await assert.rejects(() => repository.getWelfare('tenant-a'), /deputy read failed/);
});

test('BoardingMasterCommandService persists leave requests in tenant-scoped boarding_exeats', async () => {
  const writes: Array<{ sql: string; params: unknown[] }> = [];
  const audits: string[] = [];
  const service = new BoardingMasterCommandService(
    {
      getStore: () => ({ tenant_id: 'tenant-a', user_id: '11111111-1111-4111-8111-111111111111' }),
    } as never,
    { query: async () => ({ rows: [], rowCount: 0 }) } as never,
    {
      writeSql: async (sql: string, params: unknown[]) => {
        writes.push({ sql, params });
        return {
          rows: [{
            id: '22222222-2222-4222-8222-222222222222',
            tenant_id: 'tenant-a',
            student_name: 'Brian Otieno',
            leave_type: 'Medical Leave',
            status: 'pending',
          }],
          rowCount: 1,
        };
      },
      recordAudit: async (_tenantId: string, action: string) => {
        audits.push(action);
      },
      requiredText: (value: unknown, label: string) => {
        const text = String(value ?? '').trim();
        if (!text) throw new Error(`${label} is required`);
        return text;
      },
      uuidOrNull: (value: unknown) => String(value || ''),
      notifyRoles: async () => undefined,
    } as never,
  );

  const result = await service.createLeaveRequest({
    student_id: '33333333-3333-4333-8333-333333333333',
    student_name: 'Brian Otieno',
    hostel: 'St. Joseph',
    leave_type: 'Medical Leave',
    from_date: '2026-06-15',
    to_date: '2026-06-15',
    guardian_name: 'Mr. Otieno',
    reason: 'Clinic review',
  });

  assert.equal(result.leave.student_name, 'Brian Otieno');
  assert.match(writes[0].sql, /INSERT INTO boarding_exeats/);
  assert.doesNotMatch(writes[0].sql, /INSERT INTO workflow_events/);
  assert.equal(writes[0].params[0], 'tenant-a');
  assert.equal(audits.includes('boarding.exeat_requested'), true);
});

test('BoardingMasterCommandService approves leave requests on boarding_exeats only inside the current tenant', async () => {
  const writes: Array<{ sql: string; params: unknown[] }> = [];
  const service = new BoardingMasterCommandService(
    {
      getStore: () => ({ tenant_id: 'tenant-a', user_id: '11111111-1111-4111-8111-111111111111' }),
    } as never,
    { query: async () => ({ rows: [], rowCount: 0 }) } as never,
    {
      writeSql: async (sql: string, params: unknown[]) => {
        writes.push({ sql, params });
        return {
          rows: [{
            id: '22222222-2222-4222-8222-222222222222',
            tenant_id: 'tenant-a',
            status: 'approved',
            approved_by: '11111111-1111-4111-8111-111111111111',
          }],
          rowCount: 1,
        };
      },
      recordAudit: async () => undefined,
      requiredText: (value: unknown, label: string) => {
        const text = String(value ?? '').trim();
        if (!text) throw new Error(`${label} is required`);
        return text;
      },
      uuidOrNull: (value: unknown) => String(value || ''),
      notifyRoles: async () => undefined,
    } as never,
  );

  const result = await service.actionLeaveRequest('22222222-2222-4222-8222-222222222222', 'approved');

  assert.equal(result.leave.status, 'Approved');
  assert.match(writes[0].sql, /UPDATE boarding_exeats/);
  assert.doesNotMatch(writes[0].sql, /UPDATE workflow_events/);
  assert.match(writes[0].sql, /WHERE tenant_id = \$1/);
  assert.equal(writes[0].params[0], 'tenant-a');
});

test('BoardingMasterCommandService checks out approved boarders through boarding_exeats', async () => {
  const writes: Array<{ sql: string; params: unknown[] }> = [];
  const service = new BoardingMasterCommandService(
    {
      getStore: () => ({ tenant_id: 'tenant-a', user_id: '11111111-1111-4111-8111-111111111111' }),
    } as never,
    { query: async () => ({ rows: [], rowCount: 0 }) } as never,
    {
      writeSql: async (sql: string, params: unknown[]) => {
        writes.push({ sql, params });
        return {
          rows: [{
            id: '22222222-2222-4222-8222-222222222222',
            tenant_id: 'tenant-a',
            status: 'checked_out',
            checked_out_by: '11111111-1111-4111-8111-111111111111',
          }],
          rowCount: 1,
        };
      },
      recordAudit: async () => undefined,
      requiredText: (value: unknown, label: string) => {
        const text = String(value ?? '').trim();
        if (!text) throw new Error(`${label} is required`);
        return text;
      },
      uuidOrNull: (value: unknown) => String(value || ''),
      notifyRoles: async () => undefined,
    } as never,
  );

  const result = await service.actionLeaveRequest('22222222-2222-4222-8222-222222222222', 'checked_out');

  assert.equal(result.leave.status, 'Checked Out');
  assert.match(writes[0].sql, /checked_out_at = NOW\(\)/);
  assert.match(writes[0].sql, /UPDATE boarding_exeats/);
  assert.equal(writes[0].params[0], 'tenant-a');
});

test('AccountantCommandService records arrears reminders and queues tenant-scoped notifications', async () => {
  const workflowCalls: any[] = [];
  const notificationCalls: any[] = [];
  const service = new AccountantCommandService(
    {
      getStore: () => ({
        tenant_id: 'tenant-a',
        user_id: '11111111-1111-4111-8111-111111111111',
        role: 'accountant',
      }),
    } as never,
    {} as never,
    {
      recordWorkflowAction: async (input: any) => {
        workflowCalls.push(input);
        return { id: 'event-1', ...input };
      },
      notifyRoles: async (tenantId: string, input: any) => {
        notificationCalls.push({ tenantId, input });
      },
    } as never,
  );

  const result = await service.recordAction({
    action: 'arrears_reminders_requested',
    title: 'Fee arrears reminders queued',
    message: '2 arrears reminders queued for linked guardian follow-up.',
    entity_type: 'student_arrears',
    target_roles: ['accountant', 'principal', 'class_teacher', 'parent'],
    priority: 'high',
    payload: {
      recipient_scope: 'linked_guardians',
      arrears_count: 2,
    },
  });

  assert.equal(result.success, true);
  assert.equal(workflowCalls.length, 1);
  assert.equal(workflowCalls[0].tenantId, 'tenant-a');
  assert.equal(workflowCalls[0].eventType, 'accountant.arrears_reminders_requested');
  assert.deepEqual(workflowCalls[0].targetRoles, ['accountant', 'principal', 'class_teacher', 'parent']);
  assert.equal(notificationCalls.length, 1);
  assert.equal(notificationCalls[0].tenantId, 'tenant-a');
  assert.deepEqual(notificationCalls[0].input.targetRoles, ['accountant', 'principal', 'class_teacher', 'parent']);
  assert.match(notificationCalls[0].input.type, /accountant\.arrears_reminders_requested/);
  assert.equal(notificationCalls[0].input.metadata.recipient_scope, 'linked_guardians');
});

test('GuidanceCounsellingCommandService creates real tenant-scoped counselling referrals before workflow events', async () => {
  const writes: Array<{ sql: string; params: unknown[] }> = [];
  const workflowCalls: any[] = [];
  const service = new GuidanceCounsellingCommandService(
    {
      getStore: () => ({
        tenant_id: 'tenant-a',
        school_id: '22222222-2222-4222-8222-222222222222',
        user_id: '11111111-1111-4111-8111-111111111111',
      }),
    } as never,
    { query: async () => ({ rows: [], rowCount: 0 }) } as never,
    {
      writeSql: async (sql: string, params: unknown[]) => {
        writes.push({ sql, params });
        return {
          rows: [{
            id: '99999999-9999-4999-8999-999999999999',
            tenant_id: 'tenant-a',
            school_id: '22222222-2222-4222-8222-222222222222',
            student_id: '33333333-3333-4333-8333-333333333333',
            status: 'open',
            reason: 'Academic stress check-in',
            risk_level: 'high',
          }],
          rowCount: 1,
        };
      },
      recordWorkflowAction: async (input: any) => {
        workflowCalls.push(input);
        return { id: 'workflow-1', ...input };
      },
      requiredText: (value: unknown, label: string) => {
        const text = String(value ?? '').trim();
        if (!text) throw new Error(`${label} is required`);
        return text;
      },
      uuidOrNull: (value: unknown) => (value ? String(value) : null),
    } as never,
  );

  const result = await service.createReferral({
    student_id: '33333333-3333-4333-8333-333333333333',
    class_id: '44444444-4444-4444-8444-444444444444',
    academic_term_id: '55555555-5555-4555-8555-555555555555',
    academic_year_id: '66666666-6666-4666-8666-666666666666',
    reason: 'Academic stress check-in',
    risk_level: 'high',
  });

  assert.equal(result.referral.id, '99999999-9999-4999-8999-999999999999');
  assert.match(writes[0].sql, /INSERT INTO counselling_referrals/);
  assert.match(writes[0].sql, /tenant_id,\s*school_id,\s*student_id/s);
  assert.equal(writes[0].params[0], 'tenant-a');
  assert.equal(writes[0].params[1], '22222222-2222-4222-8222-222222222222');
  assert.equal(writes[0].params[7], '11111111-1111-4111-8111-111111111111');
  assert.equal(workflowCalls.length, 1);
  assert.equal(workflowCalls[0].tenantId, 'tenant-a');
  assert.equal(workflowCalls[0].eventType, 'counselling.referral.created');
  assert.equal(workflowCalls[0].entityType, 'counselling_referral');
  assert.equal(workflowCalls[0].entityId, '99999999-9999-4999-8999-999999999999');
});

test('GuidanceCounsellingCommandService returns tenant-scoped referral options for counsellor dropdowns', async () => {
  const queries: Array<{ sql: string; params: unknown[] }> = [];
  const service = new GuidanceCounsellingCommandService(
    {
      getStore: () => ({
        tenant_id: 'tenant-a',
        school_id: '22222222-2222-4222-8222-222222222222',
        user_id: '11111111-1111-4111-8111-111111111111',
      }),
    } as never,
    {
      query: async (sql: string, params: unknown[]) => {
        queries.push({ sql, params });
        if (/FROM students/.test(sql)) {
          return { rows: [{ id: 'student-a', label: 'Amina Otieno - ADM001', class_id: 'class-a' }], rowCount: 1 };
        }
        if (/FROM class_sections/.test(sql)) {
          return { rows: [{ id: 'class-a', label: 'Grade 8 North' }], rowCount: 1 };
        }
        if (/FROM academic_terms/.test(sql)) {
          return { rows: [{ id: 'term-a', label: 'Term 2 2026', status: 'active' }], rowCount: 1 };
        }
        if (/FROM academic_years/.test(sql)) {
          return { rows: [{ id: 'year-a', label: '2026', status: 'active' }], rowCount: 1 };
        }
        if (/FROM admin_incidents/.test(sql)) {
          return { rows: [{ id: 'incident-a', label: 'Bullying report - 2026-07-13' }], rowCount: 1 };
        }
        return { rows: [], rowCount: 0 };
      },
    } as never,
    {
      uuidOrNull: (value: unknown) => String(value || ''),
      requiredText: (value: unknown, label: string) => {
        const text = String(value ?? '').trim();
        if (!text) throw new Error(`${label} is required`);
        return text;
      },
      writeSql: async () => ({ rows: [], rowCount: 0 }),
      recordWorkflowAction: async (input: any) => ({ id: 'workflow-1', ...input }),
    } as never,
  );

  const result = await service.getReferralOptions();

  assert.deepEqual(result.students, [{ id: 'student-a', label: 'Amina Otieno - ADM001', class_id: 'class-a' }]);
  assert.deepEqual(result.classes, [{ id: 'class-a', label: 'Grade 8 North' }]);
  assert.deepEqual(result.terms, [{ id: 'term-a', label: 'Term 2 2026', status: 'active' }]);
  assert.deepEqual(result.years, [{ id: 'year-a', label: '2026', status: 'active' }]);
  assert.deepEqual(result.incidents, [{ id: 'incident-a', label: 'Bullying report - 2026-07-13' }]);
  assert.equal(queries.length, 5);
  assert.ok(queries.every((query) => query.params[0] === 'tenant-a'));
});

test('GuidanceCounsellingCommandService updates counselling referral status inside the current tenant', async () => {
  const writes: Array<{ sql: string; params: unknown[] }> = [];
  const workflowCalls: any[] = [];
  const service = new GuidanceCounsellingCommandService(
    {
      getStore: () => ({
        tenant_id: 'tenant-a',
        user_id: '11111111-1111-4111-8111-111111111111',
      }),
    } as never,
    { query: async () => ({ rows: [], rowCount: 0 }) } as never,
    {
      writeSql: async (sql: string, params: unknown[]) => {
        writes.push({ sql, params });
        return {
          rows: [{
            id: '99999999-9999-4999-8999-999999999999',
            tenant_id: 'tenant-a',
            status: 'accepted',
            response_note: 'Accepted for counselling support',
          }],
          rowCount: 1,
        };
      },
      recordWorkflowAction: async (input: any) => {
        workflowCalls.push(input);
        return { id: 'workflow-1', ...input };
      },
      requiredText: (value: unknown, label: string) => {
        const text = String(value ?? '').trim();
        if (!text) throw new Error(`${label} is required`);
        return text;
      },
      uuidOrNull: (value: unknown) => (value ? String(value) : null),
    } as never,
  );

  const result = await service.updateReferralStatus('99999999-9999-4999-8999-999999999999', {
    status: 'accepted',
    response_note: 'Accepted for counselling support',
  });

  assert.equal(result.referral.status, 'accepted');
  assert.match(writes[0].sql, /UPDATE counselling_referrals/);
  assert.match(writes[0].sql, /WHERE tenant_id = \$1/);
  assert.equal(writes[0].params[0], 'tenant-a');
  assert.equal(writes[0].params[1], '99999999-9999-4999-8999-999999999999');
  assert.equal(workflowCalls[0].eventType, 'counselling.referral.status_updated');
  assert.equal(workflowCalls[0].entityType, 'counselling_referral');
});

test('GuidanceCounsellingCommandService saves counsellor settings as tenant-scoped workflow state', async () => {
  const workflowCalls: any[] = [];
  const service = new GuidanceCounsellingCommandService(
    {
      getStore: () => ({
        tenant_id: 'tenant-a',
        user_id: '11111111-1111-4111-8111-111111111111',
      }),
    } as never,
    {} as never,
    {
      uuidOrNull: (value: unknown) => (value ? String(value) : null),
      requiredText: (value: unknown, label: string) => {
        const text = String(value ?? '').trim();
        if (!text) throw new Error(`${label} is required`);
        return text;
      },
      recordWorkflowAction: async (input: any) => {
        workflowCalls.push(input);
        return { id: 'settings-event-1', ...input };
      },
    } as never,
  );

  const result = await service.saveSettings({
    notify_referrer_on_acceptance: true,
    require_audit_reason: true,
    default_case_visibility: 'restricted',
  });

  assert.equal(result.success, true);
  assert.equal(workflowCalls.length, 1);
  assert.equal(workflowCalls[0].tenantId, 'tenant-a');
  assert.equal(workflowCalls[0].eventType, 'counselling.settings.saved');
  assert.equal(workflowCalls[0].entityType, 'counselling_settings');
  assert.deepEqual(workflowCalls[0].targetRoles, ['counsellor', 'principal', 'system_monitor']);
  assert.equal(workflowCalls[0].payload.default_case_visibility, 'restricted');
});

test('LibrarianCommandService issues department resources through staff borrower circulation ledger', async () => {
  const reads: Array<{ sql: string; params: unknown[] }> = [];
  const writes: Array<{ sql: string; params: unknown[] }> = [];
  const audits: Array<{ action: string; metadata: any }> = [];
  const service = new LibrarianCommandService(
    {
      getStore: () => ({
        tenant_id: 'tenant-a',
        user_id: '11111111-1111-4111-8111-111111111111',
      }),
    } as never,
    { query: async () => ({ rows: [], rowCount: 0 }) } as never,
    {
      readSql: async (sql: string, params: unknown[]) => {
        reads.push({ sql, params });
        if (/FROM library_borrowers/i.test(sql)) {
          return { rows: [], rowCount: 0 };
        }
        if (/FROM staff_profiles/i.test(sql)) {
          return {
            rows: [{
              id: '22222222-2222-4222-8222-222222222222',
              staff_number: 'T-001',
              display_name: 'Mr. Omondi',
            }],
            rowCount: 1,
          };
        }
        if (/FROM library_copies/i.test(sql)) {
          return {
            rows: [{
              id: '33333333-3333-4333-8333-333333333333',
              status: 'available',
            }],
            rowCount: 1,
          };
        }
        return { rows: [], rowCount: 0 };
      },
      writeSql: async (sql: string, params: unknown[]) => {
        writes.push({ sql, params });
        if (/INSERT INTO library_borrowers/i.test(sql)) {
          return {
            rows: [{ id: '44444444-4444-4444-8444-444444444444' }],
            rowCount: 1,
          };
        }
        if (/INSERT INTO library_circulation_ledger/i.test(sql)) {
          return {
            rows: [{ id: '55555555-5555-4555-8555-555555555555' }],
            rowCount: 1,
          };
        }
        return { rows: [{ id: '33333333-3333-4333-8333-333333333333' }], rowCount: 1 };
      },
      recordAudit: async (_tenantId: string, action: string, _resourceType: string, _resourceId: string | null, metadata: any) => {
        audits.push({ action, metadata });
      },
      requiredText: (value: unknown, label: string) => {
        const text = String(value ?? '').trim();
        if (!text) throw new Error(`${label} is required`);
        return text;
      },
      uuidOrNull: (value: unknown) => (value ? String(value) : null),
    } as never,
  );

  const result = await service.issueDepartmentResource({
    book_isbn: 'CHEM-ADV',
    staff_identifier: 'T-001',
    department: 'Science',
    assigned_to: 'Mr. Omondi',
    due_date: '2026-07-10',
    notes: 'Department reference set for Form 4 practicals',
  });

  assert.equal(result.id, '55555555-5555-4555-8555-555555555555');
  assert.match(writes[0].sql, /INSERT INTO library_borrowers/);
  assert.equal(writes[0].params[0], 'tenant-a');
  assert.equal(writes[0].params[1], '22222222-2222-4222-8222-222222222222');
  assert.match(writes[1].sql, /UPDATE library_copies SET status = 'issued'/);
  assert.match(writes[2].sql, /INSERT INTO library_circulation_ledger/);
  assert.match(String(writes[2].params[3]), /"department":"Science"/);
  assert.equal(audits[0].action, 'library.department_resource.issued');
  assert.equal(audits[0].metadata.department, 'Science');
});

test('LibrarianCommandService returns tenant-scoped circulation options for librarian selects', async () => {
  const queries: Array<{ sql: string; params: unknown[] }> = [];
  const service = new LibrarianCommandService(
    {
      getStore: () => ({
        tenant_id: 'tenant-a',
        user_id: '11111111-1111-4111-8111-111111111111',
      }),
    } as never,
    {
      query: async (sql: string, params: unknown[]) => {
        queries.push({ sql, params });
        if (/FROM library_borrowers/i.test(sql)) {
          return {
            rows: [{
              id: 'borrower-1',
              label: 'Akinyi Wanjiru - ADM-001 - Form 2 East',
              borrower_type: 'student',
              admission_no: 'ADM-001',
              class_name: 'Form 2 East',
            }],
            rowCount: 1,
          };
        }
        if (/FROM library_catalog_items/i.test(sql)) {
          return {
            rows: [{
              id: 'catalogue-1',
              label: 'Chemistry Reference - CHEM-001 (3 available)',
              title: 'Chemistry Reference',
              isbn: 'CHEM-001',
              copies_available: 3,
            }],
            rowCount: 1,
          };
        }
        if (/FROM staff_profiles/i.test(sql)) {
          return {
            rows: [{
              id: 'staff-1',
              label: 'Mr. Omondi - T-001',
              staff_number: 'T-001',
              status: 'active',
            }],
            rowCount: 1,
          };
        }
        return { rows: [], rowCount: 0 };
      },
    } as never,
    {} as never,
  );

  const result = await service.getCirculationOptions();

  assert.equal(result.borrowers[0].id, 'borrower-1');
  assert.equal(result.catalogItems[0].id, 'catalogue-1');
  assert.equal(result.staff[0].id, 'staff-1');
  assert.equal(queries.length, 3);
  assert.ok(queries.every((query) => query.params[0] === 'tenant-a'));
  assert.match(queries[0].sql, /WHERE borrower\.tenant_id = \$1/);
  assert.match(queries[1].sql, /WHERE item\.tenant_id = \$1/);
  assert.match(queries[2].sql, /WHERE tenant_id = \$1/);
});

test('LibrarianCommandService routes workflow actions to requested target roles', async () => {
  const workflowCalls: any[] = [];
  const service = new LibrarianCommandService(
    {
      getStore: () => ({
        tenant_id: 'tenant-a',
        user_id: '11111111-1111-4111-8111-111111111111',
      }),
    } as never,
    {} as never,
    {
      requiredText: (value: unknown, label: string) => {
        const text = String(value ?? '').trim();
        if (!text) throw new Error(`${label} is required`);
        return text;
      },
      recordWorkflowAction: async (input: any) => {
        workflowCalls.push(input);
        return { id: 'event-1', ...input };
      },
    } as never,
  );

  await service.recordAction({
    action: 'request_submitted',
    title: 'Library request submitted',
    description: 'Purchase request submitted to procurement.',
    entityType: 'library_request',
    target_roles: ['procurement_officer', 'principal'],
  });

  assert.equal(workflowCalls.length, 1);
  assert.deepEqual(workflowCalls[0].targetRoles, ['procurement_officer', 'principal']);
  assert.equal(workflowCalls[0].entityType, 'library_request');
  assert.equal(workflowCalls[0].eventType, 'library.request_submitted');
});

test('LibrarianCommandService lists and creates tenant-scoped reservation workflow records', async () => {
  const queries: Array<{ sql: string; params: unknown[] }> = [];
  const workflowCalls: any[] = [];
  const service = new LibrarianCommandService(
    {
      getStore: () => ({
        tenant_id: 'tenant-a',
        user_id: '11111111-1111-4111-8111-111111111111',
      }),
    } as never,
    {
      query: async (sql: string, params: unknown[]) => {
        queries.push({ sql, params });
        return {
          rows: [{
            id: 'event-1',
            entity_id: 'reservation-1',
            created_at: '2026-06-26T10:00:00.000Z',
            payload: {
              borrower_id: 'borrower-1',
              borrower_name: 'Learner One',
              catalog_item_id: 'book-1',
              book_title: 'Biology Reference',
              expiry_date: '2026-07-03',
              status: 'waiting',
            },
          }],
          rowCount: 1,
        };
      },
    } as never,
    {
      recordWorkflowAction: async (input: any) => {
        workflowCalls.push(input);
        return { id: 'event-2', ...input };
      },
      requiredText: (value: unknown, label: string) => {
        const text = String(value ?? '').trim();
        if (!text) throw new Error(`${label} is required`);
        return text;
      },
    } as never,
  );

  const list = await service.getReservations();
  const created = await service.createReservation({
    borrower_id: 'borrower-2',
    borrower_name: 'Learner Two',
    catalog_item_id: 'book-2',
    book_title: 'Chemistry Reference',
    expiry_date: '2026-07-04',
  });

  assert.match(queries[0].sql, /FROM workflow_events/);
  assert.match(queries[0].sql, /WHERE tenant_id = \$1/);
  assert.deepEqual(queries[0].params, ['tenant-a']);
  assert.equal(list.reservations[0].borrower_name, 'Learner One');
  assert.equal(list.reservations[0].book_title, 'Biology Reference');
  assert.equal(workflowCalls[0].tenantId, 'tenant-a');
  assert.equal(workflowCalls[0].eventType, 'library.reservation.created');
  assert.equal(workflowCalls[0].entityType, 'library_reservation');
  assert.equal(created.success, true);
});

test('LibrarianCommandService sends library notices through tenant-scoped notifications', async () => {
  const workflowCalls: any[] = [];
  const notificationCalls: any[] = [];
  const service = new LibrarianCommandService(
    {
      getStore: () => ({
        tenant_id: 'tenant-a',
        user_id: '11111111-1111-4111-8111-111111111111',
      }),
    } as never,
    {} as never,
    {
      requiredText: (value: unknown, label: string) => {
        const text = String(value ?? '').trim();
        if (!text) throw new Error(`${label} is required`);
        return text;
      },
      recordWorkflowAction: async (input: any) => {
        workflowCalls.push(input);
        return { id: 'notice-event-1', ...input };
      },
      notifyRoles: async (tenantId: string, input: any) => {
        notificationCalls.push({ tenantId, input });
      },
    } as never,
  );

  const result = await service.sendNotice({
    title: 'Overdue book reminder',
    message: 'Please return overdue library books by Friday.',
    notice_type: 'overdue',
    target_roles: ['parent', 'class_teacher'],
    channels: ['in_app', 'sms'],
  });

  assert.equal(result.success, true);
  assert.equal(workflowCalls.length, 1);
  assert.equal(workflowCalls[0].tenantId, 'tenant-a');
  assert.equal(workflowCalls[0].entityType, 'library_notice');
  assert.equal(workflowCalls[0].eventType, 'library.notice_sent');
  assert.deepEqual(workflowCalls[0].targetRoles, ['parent', 'class_teacher']);
  assert.equal(notificationCalls.length, 1);
  assert.equal(notificationCalls[0].tenantId, 'tenant-a');
  assert.deepEqual(notificationCalls[0].input.targetRoles, ['parent', 'class_teacher']);
  assert.equal(notificationCalls[0].input.type, 'library.notice_sent');
});

test('LibrarianCommandService checks out library visits through tenant-scoped workflow events', async () => {
  const workflowCalls: any[] = [];
  const notificationCalls: any[] = [];
  const service = new LibrarianCommandService(
    {
      getStore: () => ({
        tenant_id: 'tenant-a',
        user_id: '11111111-1111-4111-8111-111111111111',
      }),
    } as never,
    {} as never,
    {
      requiredText: (value: unknown, label: string) => {
        const text = String(value ?? '').trim();
        if (!text) throw new Error(`${label} is required`);
        return text;
      },
      recordWorkflowAction: async (input: any) => {
        workflowCalls.push(input);
        return { id: 'visit-checkout-event-1', ...input };
      },
      notifyRoles: async (tenantId: string, input: any) => {
        notificationCalls.push({ tenantId, input });
      },
      uuidOrNull: (value: unknown) => (value ? String(value) : null),
    } as never,
  );

  const result = await service.checkoutLibraryVisit({
    visit_id: 'visit-001',
    visitor_name: 'Form 1 East',
    purpose: 'Class Session',
    checked_out_at: '2026-06-26T09:30:00.000Z',
    reading_notes: 'Returned all reference books before leaving.',
  });

  assert.equal(result.success, true);
  assert.equal(workflowCalls.length, 1);
  assert.equal(workflowCalls[0].tenantId, 'tenant-a');
  assert.equal(workflowCalls[0].eventType, 'library.visit.checked_out');
  assert.equal(workflowCalls[0].entityType, 'library_visit');
  assert.equal(workflowCalls[0].entityId, 'visit-001');
  assert.equal(workflowCalls[0].payload.checked_out_at, '2026-06-26T09:30:00.000Z');
  assert.equal(notificationCalls.length, 1);
  assert.equal(notificationCalls[0].tenantId, 'tenant-a');
  assert.deepEqual(notificationCalls[0].input.targetRoles, ['librarian', 'class_teacher']);
});

test('ProcurementOfficerCommandService records budget actions with live tenant metrics', async () => {
  const workflowCalls: any[] = [];
  const notificationCalls: any[] = [];
  const service = new ProcurementOfficerCommandService(
    {
      getStore: () => ({
        tenant_id: 'tenant-a',
        user_id: '11111111-1111-4111-8111-111111111111',
      }),
    } as never,
    {
      query: async (sql: string, params: unknown[]) => {
        assert.match(sql, /procurement_requests/);
        assert.equal(params[0], 'tenant-a');
        return {
          rows: [{ pending_requests: 4, active_orders: 2, deliveries_due: 1, suppliers: 5 }],
          rowCount: 1,
        };
      },
    } as never,
    {
      uuidOrNull: (value: unknown) => (value ? String(value) : null),
      recordWorkflowAction: async (input: any) => {
        workflowCalls.push(input);
        return { id: 'budget-event-1', ...input };
      },
      notifyRoles: async (tenantId: string, input: any) => {
        notificationCalls.push({ tenantId, input });
      },
    } as never,
  );

  const result = await service.runBudgetAction({ action: 'flag_overdue_deliveries' });

  assert.equal(result.success, true);
  assert.equal(workflowCalls.length, 1);
  assert.equal(workflowCalls[0].tenantId, 'tenant-a');
  assert.equal(workflowCalls[0].eventType, 'procurement.budget.flag_overdue_deliveries');
  assert.equal(workflowCalls[0].entityType, 'procurement_budget_review');
  assert.equal(workflowCalls[0].payload.metrics.deliveries_due, 1);
  assert.deepEqual(workflowCalls[0].targetRoles, ['procurement_officer', 'principal', 'storekeeper', 'accountant']);
  assert.equal(notificationCalls.length, 1);
  assert.equal(notificationCalls[0].tenantId, 'tenant-a');
});

test('SecurityOfficerCommandService records and claims lost items in the current tenant', async () => {
  const writes: Array<{ sql: string; params: unknown[] }> = [];
  const audits: Array<{ action: string; resourceId: string | null }> = [];
  const notifications: Array<{ tenantId: string; input: any }> = [];
  const service = new SecurityOfficerCommandService(
    {
      getStore: () => ({
        tenant_id: 'tenant-a',
        user_id: '11111111-1111-4111-8111-111111111111',
        role: 'security_officer',
      }),
    } as never,
    { query: async () => ({ rows: [], rowCount: 0 }) } as never,
    {
      writeSql: async (sql: string, params: unknown[]) => {
        writes.push({ sql, params });
        if (/INSERT INTO security_lost_found/i.test(sql)) {
          return {
            rows: [{
              id: '22222222-2222-4222-8222-222222222222',
              tenant_id: 'tenant-a',
              item_name: 'School ID Card',
              status: 'found',
            }],
            rowCount: 1,
          };
        }
        if (/UPDATE security_lost_found/i.test(sql)) {
          return {
            rows: [{
              id: '22222222-2222-4222-8222-222222222222',
              tenant_id: 'tenant-a',
              item_name: 'School ID Card',
              status: 'claimed',
            }],
            rowCount: 1,
          };
        }
        return { rows: [], rowCount: 0 };
      },
      readSql: async () => ({ rows: [], rowCount: 0 }),
      recordAudit: async (_tenantId: string, action: string, _resourceType: string, resourceId: string | null) => {
        audits.push({ action, resourceId });
      },
      notifyRoles: async (tenantId: string, input: any) => {
        notifications.push({ tenantId, input });
      },
      requiredText: (value: unknown, label: string) => {
        const text = String(value ?? '').trim();
        if (!text) throw new Error(`${label} is required`);
        return text;
      },
      uuidOrNull: (value: unknown) => String(value || ''),
    } as never,
  );

  const recorded = await service.recordLostFoundItem({
    item_name: 'School ID Card',
    found_location: 'Main gate',
    description: 'Blue school ID card collected at the gate.',
  });
  const claimed = await service.claimLostFoundItem('22222222-2222-4222-8222-222222222222', {
    claimant_name: 'Jane Atieno',
    verification_notes: 'Student ID verified by class teacher.',
  });

  assert.equal(recorded.item.item_name, 'School ID Card');
  assert.equal(claimed.item.status, 'claimed');
  assert.match(writes[0].sql, /INSERT INTO security_lost_found/);
  assert.match(writes[1].sql, /UPDATE security_lost_found/);
  assert.equal(writes[0].params[0], 'tenant-a');
  assert.equal(writes[1].params[0], 'tenant-a');
  assert.equal(audits.some((audit) => audit.action === 'security.lost_item_recorded'), true);
  assert.equal(audits.some((audit) => audit.action === 'security.lost_item_claimed'), true);
  assert.equal(notifications.length, 2);
  assert.deepEqual(notifications[0].input.targetRoles, ['security', 'secretary', 'principal']);
});

test('SecretaryCommandService records lost-found items through secretary tenant workflow', async () => {
  const writes: Array<{ sql: string; params: unknown[] }> = [];
  const audits: Array<{ action: string; resourceId: string | null }> = [];
  const notifications: Array<{ tenantId: string; input: any }> = [];
  const service = new SecretaryCommandService(
    {
      getStore: () => ({
        tenant_id: 'tenant-a',
        user_id: '11111111-1111-4111-8111-111111111111',
        role: 'secretary',
      }),
    } as never,
    { query: async () => ({ rows: [], rowCount: 0 }) } as never,
    {
      writeSql: async (sql: string, params: unknown[]) => {
        writes.push({ sql, params });
        return {
          rows: [{
            id: '33333333-3333-4333-8333-333333333333',
            tenant_id: 'tenant-a',
            item_name: 'Math textbook',
            found_location: 'Reception desk',
            status: 'found',
          }],
          rowCount: 1,
        };
      },
      readSql: async () => ({ rows: [], rowCount: 0 }),
      recordAudit: async (_tenantId: string, action: string, _resourceType: string, resourceId: string | null) => {
        audits.push({ action, resourceId });
      },
      notifyRoles: async (tenantId: string, input: any) => {
        notifications.push({ tenantId, input });
      },
      requiredText: (value: unknown, label: string) => {
        const text = String(value ?? '').trim();
        if (!text) throw new Error(`${label} is required`);
        return text;
      },
      uuidOrNull: (value: unknown) => String(value || ''),
    } as never,
  );

  const result = await service.recordLostFoundItem({
    item_name: 'Math textbook',
    found_location: 'Reception desk',
    description: 'Blue cover with student name inside.',
    source_dashboard: 'secretary-lost-found',
  });

  assert.equal(result.item.item_name, 'Math textbook');
  assert.match(writes[0].sql, /INSERT INTO security_lost_found/);
  assert.equal(writes[0].params[0], 'tenant-a');
  assert.equal(audits.some((audit) => audit.action === 'frontoffice.lost_item_recorded'), true);
  assert.equal(notifications[0].tenantId, 'tenant-a');
  assert.deepEqual(notifications[0].input.targetRoles, ['secretary', 'security', 'principal']);
});

test('SecretaryCommandService saves secretary preferences as tenant-scoped workflow events', async () => {
  const writes: Array<{ sql: string; params: unknown[] }> = [];
  const audits: Array<{ action: string; resourceId: string | null }> = [];
  const notifications: Array<{ tenantId: string; input: any }> = [];
  const service = new SecretaryCommandService(
    {
      getStore: () => ({
        tenant_id: 'tenant-a',
        user_id: '11111111-1111-4111-8111-111111111111',
        role: 'secretary',
      }),
    } as never,
    { query: async () => ({ rows: [], rowCount: 0 }) } as never,
    {
      writeSql: async (sql: string, params: unknown[]) => {
        writes.push({ sql, params });
        return {
          rows: [{
            id: '44444444-4444-4444-8444-444444444444',
            tenant_id: 'tenant-a',
            title: 'Secretary front-office preferences updated',
            message: 'Parent follow-up window set to 48 hours.',
          }],
          rowCount: 1,
        };
      },
      readSql: async () => ({ rows: [], rowCount: 0 }),
      recordAudit: async (_tenantId: string, action: string, _resourceType: string, resourceId: string | null) => {
        audits.push({ action, resourceId });
      },
      notifyRoles: async (tenantId: string, input: any) => {
        notifications.push({ tenantId, input });
      },
      requiredText: (value: unknown, label: string) => {
        const text = String(value ?? '').trim();
        if (!text) throw new Error(`${label} is required`);
        return text;
      },
      uuidOrNull: (value: unknown) => String(value || ''),
    } as never,
  );

  const result = await service.updatePreferences({
    auto_acknowledge_visitors: true,
    parent_follow_up_hours: 48,
    default_message_channel: 'sms',
    notify_principal_on_urgent: true,
  });

  assert.equal(result.preferences.parent_follow_up_hours, 48);
  assert.match(writes[0].sql, /INSERT INTO workflow_events/);
  assert.equal(writes[0].params[0], 'tenant-a');
  assert.match(String(writes[0].params[4]), /frontoffice\.preferences_updated/);
  assert.equal(audits.some((audit) => audit.action === 'frontoffice.preferences_updated'), true);
  assert.deepEqual(notifications[0].input.targetRoles, ['principal', 'system_monitor']);
});

test('SecurityOfficerCommandService verifies and returns boarding gate movements in the current tenant', async () => {
  const writes: Array<{ sql: string; params: unknown[] }> = [];
  const audits: string[] = [];
  const notifications: Array<{ tenantId: string; input: any }> = [];
  const service = new SecurityOfficerCommandService(
    {
      getStore: () => ({
        tenant_id: 'tenant-a',
        user_id: '11111111-1111-4111-8111-111111111111',
        role: 'security_officer',
      }),
    } as never,
    { query: async () => ({ rows: [], rowCount: 0 }) } as never,
    {
      writeSql: async (sql: string, params: unknown[]) => {
        writes.push({ sql, params });
        if (/status = CASE WHEN status = 'approved' THEN 'checked_out'/i.test(sql)) {
          return {
            rows: [{
              id: '22222222-2222-4222-8222-222222222222',
              tenant_id: 'tenant-a',
              student_name: 'Peter Ochieng',
              status: 'checked_out',
            }],
            rowCount: 1,
          };
        }
        if (/SET status = 'returned'/i.test(sql)) {
          return {
            rows: [{
              id: '22222222-2222-4222-8222-222222222222',
              tenant_id: 'tenant-a',
              student_name: 'Peter Ochieng',
              status: 'returned',
            }],
            rowCount: 1,
          };
        }
        return { rows: [], rowCount: 0 };
      },
      readSql: async () => ({
        rows: [{
          id: '22222222-2222-4222-8222-222222222222',
          tenant_id: 'tenant-a',
          student_name: 'Peter Ochieng',
          status: 'checked_out',
        }],
        rowCount: 1,
      }),
      recordAudit: async (_tenantId: string, action: string) => {
        audits.push(action);
      },
      notifyRoles: async (tenantId: string, input: any) => {
        notifications.push({ tenantId, input });
      },
      requiredText: (value: unknown, label: string) => {
        const text = String(value ?? '').trim();
        if (!text) throw new Error(`${label} is required`);
        return text;
      },
      uuidOrNull: (value: unknown) => String(value || ''),
    } as never,
  );

  const verified = await service.verifyBoardingMovement('22222222-2222-4222-8222-222222222222');
  const returned = await service.recordBoardingReturn('22222222-2222-4222-8222-222222222222');
  const notice = await service.notifyBoardingMaster('22222222-2222-4222-8222-222222222222');

  assert.equal(verified.movement.status, 'checked_out');
  assert.equal(returned.movement.status, 'returned');
  assert.equal(notice.success, true);
  assert.match(writes[0].sql, /UPDATE boarding_exeats/);
  assert.match(writes[1].sql, /UPDATE boarding_exeats/);
  assert.equal(writes[0].params[0], 'tenant-a');
  assert.equal(writes[1].params[0], 'tenant-a');
  assert.equal(audits.includes('security.boarding_pass_verified'), true);
  assert.equal(audits.includes('security.boarding_return_recorded'), true);
  assert.equal(notifications.some((call) => call.input.type === 'security.boarding_master_notified'), true);
});

test('SecurityOfficerCommandService records transport gate departures and arrivals in the current tenant', async () => {
  const writes: Array<{ sql: string; params: unknown[] }> = [];
  const audits: string[] = [];
  const notifications: Array<{ tenantId: string; input: any }> = [];
  const service = new SecurityOfficerCommandService(
    {
      getStore: () => ({
        tenant_id: 'tenant-a',
        user_id: '11111111-1111-4111-8111-111111111111',
        role: 'security_officer',
      }),
    } as never,
    { query: async () => ({ rows: [], rowCount: 0 }) } as never,
    {
      writeSql: async (sql: string, params: unknown[]) => {
        writes.push({ sql, params });
        if (/SET status = 'in_progress'/i.test(sql)) {
          return { rows: [{ id: '22222222-2222-4222-8222-222222222222', tenant_id: 'tenant-a', status: 'in_progress' }], rowCount: 1 };
        }
        if (/SET status = 'completed'/i.test(sql)) {
          return { rows: [{ id: '22222222-2222-4222-8222-222222222222', tenant_id: 'tenant-a', status: 'completed' }], rowCount: 1 };
        }
        return { rows: [], rowCount: 0 };
      },
      readSql: async () => ({ rows: [], rowCount: 0 }),
      recordAudit: async (_tenantId: string, action: string) => {
        audits.push(action);
      },
      notifyRoles: async (tenantId: string, input: any) => {
        notifications.push({ tenantId, input });
      },
      requiredText: (value: unknown, label: string) => {
        const text = String(value ?? '').trim();
        if (!text) throw new Error(`${label} is required`);
        return text;
      },
      uuidOrNull: (value: unknown) => String(value || ''),
    } as never,
  );

  const departed = await service.recordTransportDeparture('22222222-2222-4222-8222-222222222222');
  const arrived = await service.recordTransportArrival('22222222-2222-4222-8222-222222222222');

  assert.equal(departed.trip.status, 'in_progress');
  assert.equal(arrived.trip.status, 'completed');
  assert.match(writes[0].sql, /UPDATE transport_trips/);
  assert.match(writes[1].sql, /UPDATE transport_trips/);
  assert.equal(writes[0].params[0], 'tenant-a');
  assert.equal(writes[1].params[0], 'tenant-a');
  assert.equal(audits.includes('security.transport_departure_recorded'), true);
  assert.equal(audits.includes('security.transport_arrival_recorded'), true);
  assert.equal(notifications.some((call) => call.input.type === 'security.transport_departure_recorded'), true);
  assert.equal(notifications.some((call) => call.input.type === 'security.transport_arrival_recorded'), true);
});

test('SecurityOfficerCommandService records vehicle gate entry and exit in the current tenant', async () => {
  const writes: Array<{ sql: string; params: unknown[] }> = [];
  const audits: string[] = [];
  const notifications: Array<{ tenantId: string; input: any }> = [];
  const service = new SecurityOfficerCommandService(
    {
      getStore: () => ({
        tenant_id: 'tenant-a',
        user_id: '11111111-1111-4111-8111-111111111111',
        role: 'security_officer',
      }),
    } as never,
    { query: async () => ({ rows: [], rowCount: 0 }) } as never,
    {
      writeSql: async (sql: string, params: unknown[]) => {
        writes.push({ sql, params });
        if (/INSERT INTO workflow_events/i.test(sql)) {
          return { rows: [{ id: '22222222-2222-4222-8222-222222222222', tenant_id: 'tenant-a', event_type: 'vehicle.entry_logged' }], rowCount: 1 };
        }
        if (/UPDATE workflow_events/i.test(sql)) {
          return { rows: [{ id: '22222222-2222-4222-8222-222222222222', tenant_id: 'tenant-a', event_type: 'vehicle.entry_logged' }], rowCount: 1 };
        }
        return { rows: [], rowCount: 0 };
      },
      readSql: async () => ({ rows: [], rowCount: 0 }),
      recordAudit: async (_tenantId: string, action: string) => {
        audits.push(action);
      },
      notifyRoles: async (tenantId: string, input: any) => {
        notifications.push({ tenantId, input });
      },
      requiredText: (value: unknown, label: string) => {
        const text = String(value ?? '').trim();
        if (!text) throw new Error(`${label} is required`);
        return text;
      },
      uuidOrNull: (value: unknown) => String(value || ''),
    } as never,
  );

  const entry = await service.recordVehicleEntry({
    vehicle_registration: 'KCA 123A',
    driver_name: 'Mwangi',
    purpose: 'Delivery',
  });
  const exit = await service.recordVehicleExit('22222222-2222-4222-8222-222222222222');

  assert.equal(entry.log.event_type, 'vehicle.entry_logged');
  assert.equal(exit.log.event_type, 'vehicle.entry_logged');
  assert.match(writes[0].sql, /INSERT INTO workflow_events/);
  assert.match(writes[1].sql, /UPDATE workflow_events/);
  assert.equal(writes[0].params[0], 'tenant-a');
  assert.equal(writes[1].params[0], 'tenant-a');
  assert.equal(audits.includes('security.vehicle_entry_recorded'), true);
  assert.equal(audits.includes('security.vehicle_exit_recorded'), true);
  assert.equal(notifications.some((call) => call.input.type === 'security.vehicle_entry_recorded'), true);
  assert.equal(notifications.some((call) => call.input.type === 'security.vehicle_exit_recorded'), true);
});

test('SecurityOfficerCommandService records deliveries, notifies recipients, and marks collection in the current tenant', async () => {
  const writes: Array<{ sql: string; params: unknown[] }> = [];
  const audits: string[] = [];
  const notifications: Array<{ tenantId: string; input: any }> = [];
  const service = new SecurityOfficerCommandService(
    {
      getStore: () => ({
        tenant_id: 'tenant-a',
        user_id: '11111111-1111-4111-8111-111111111111',
        role: 'security_officer',
      }),
    } as never,
    { query: async () => ({ rows: [], rowCount: 0 }) } as never,
    {
      writeSql: async (sql: string, params: unknown[]) => {
        writes.push({ sql, params });
        if (/INSERT INTO workflow_events/i.test(sql)) {
          return { rows: [{ id: '22222222-2222-4222-8222-222222222222', tenant_id: 'tenant-a', event_type: 'delivery.recorded' }], rowCount: 1 };
        }
        if (/UPDATE workflow_events/i.test(sql)) {
          return { rows: [{ id: '22222222-2222-4222-8222-222222222222', tenant_id: 'tenant-a', event_type: 'delivery.recorded' }], rowCount: 1 };
        }
        return { rows: [], rowCount: 0 };
      },
      readSql: async () => ({
        rows: [{
          id: '22222222-2222-4222-8222-222222222222',
          tenant_id: 'tenant-a',
          event_type: 'delivery.recorded',
          payload: { recipient: 'Principal', delivery_type: 'Office Document' },
        }],
        rowCount: 1,
      }),
      recordAudit: async (_tenantId: string, action: string) => {
        audits.push(action);
      },
      notifyRoles: async (tenantId: string, input: any) => {
        notifications.push({ tenantId, input });
      },
      requiredText: (value: unknown, label: string) => {
        const text = String(value ?? '').trim();
        if (!text) throw new Error(`${label} is required`);
        return text;
      },
      uuidOrNull: (value: unknown) => String(value || ''),
    } as never,
  );

  const delivery = await service.recordDelivery({ delivery_type: 'Office Document', recipient: 'Principal', sender: 'Courier' });
  const notice = await service.notifyDeliveryRecipient('22222222-2222-4222-8222-222222222222');
  const collected = await service.markDeliveryCollected('22222222-2222-4222-8222-222222222222');

  assert.equal(delivery.delivery.event_type, 'delivery.recorded');
  assert.equal(notice.success, true);
  assert.equal(collected.delivery.event_type, 'delivery.recorded');
  assert.match(writes[0].sql, /INSERT INTO workflow_events/);
  assert.match(writes[1].sql, /UPDATE workflow_events/);
  assert.equal(writes[0].params[0], 'tenant-a');
  assert.equal(writes[1].params[0], 'tenant-a');
  assert.equal(audits.includes('security.delivery_recorded'), true);
  assert.equal(audits.includes('security.delivery_recipient_notified'), true);
  assert.equal(audits.includes('security.delivery_collected'), true);
  assert.equal(notifications.some((call) => call.input.type === 'security.delivery_recipient_notified'), true);
});

test('SecurityOfficerCommandService records late arrivals and queues parent notices in the current tenant', async () => {
  const writes: Array<{ sql: string; params: unknown[] }> = [];
  const audits: string[] = [];
  const notifications: Array<{ tenantId: string; input: any }> = [];
  const service = new SecurityOfficerCommandService(
    {
      getStore: () => ({
        tenant_id: 'tenant-a',
        user_id: '11111111-1111-4111-8111-111111111111',
        role: 'security_officer',
      }),
    } as never,
    { query: async () => ({ rows: [], rowCount: 0 }) } as never,
    {
      writeSql: async (sql: string, params: unknown[]) => {
        writes.push({ sql, params });
        if (/INSERT INTO workflow_events/i.test(sql)) {
          return { rows: [{ id: '22222222-2222-4222-8222-222222222222', tenant_id: 'tenant-a', event_type: 'student.late_arrival_recorded' }], rowCount: 1 };
        }
        return { rows: [], rowCount: 0 };
      },
      readSql: async () => ({
        rows: [{
          id: '22222222-2222-4222-8222-222222222222',
          tenant_id: 'tenant-a',
          event_type: 'student.late_arrival_recorded',
          payload: { student_name: 'Mike Omondi', reason: 'Transport Delay' },
        }],
        rowCount: 1,
      }),
      recordAudit: async (_tenantId: string, action: string) => {
        audits.push(action);
      },
      notifyRoles: async (tenantId: string, input: any) => {
        notifications.push({ tenantId, input });
      },
      requiredText: (value: unknown, label: string) => {
        const text = String(value ?? '').trim();
        if (!text) throw new Error(`${label} is required`);
        return text;
      },
      uuidOrNull: (value: unknown) => String(value || ''),
    } as never,
  );

  const arrival = await service.recordLateArrival({ student_name: 'Mike Omondi', reason: 'Transport Delay', action_taken: 'Allowed to Class' });
  const notice = await service.notifyLateArrivalParent('22222222-2222-4222-8222-222222222222');

  assert.equal(arrival.arrival.event_type, 'student.late_arrival_recorded');
  assert.equal(notice.success, true);
  assert.match(writes[0].sql, /INSERT INTO workflow_events/);
  assert.equal(writes[0].params[0], 'tenant-a');
  assert.equal(audits.includes('security.late_arrival_recorded'), true);
  assert.equal(audits.includes('security.late_arrival_parent_notified'), true);
  assert.equal(notifications.some((call) => call.input.type === 'security.late_arrival_parent_notified'), true);
});

test('SecurityOfficerCommandService records early departures and returns in the current tenant', async () => {
  const writes: Array<{ sql: string; params: unknown[] }> = [];
  const audits: string[] = [];
  const notifications: Array<{ tenantId: string; input: any }> = [];
  const service = new SecurityOfficerCommandService(
    {
      getStore: () => ({
        tenant_id: 'tenant-a',
        user_id: '11111111-1111-4111-8111-111111111111',
        role: 'security_officer',
      }),
    } as never,
    { query: async () => ({ rows: [], rowCount: 0 }) } as never,
    {
      writeSql: async (sql: string, params: unknown[]) => {
        writes.push({ sql, params });
        if (/INSERT INTO workflow_events/i.test(sql)) {
          return { rows: [{ id: '22222222-2222-4222-8222-222222222222', tenant_id: 'tenant-a', event_type: 'student.early_departure_recorded' }], rowCount: 1 };
        }
        if (/UPDATE workflow_events/i.test(sql)) {
          return { rows: [{ id: '22222222-2222-4222-8222-222222222222', tenant_id: 'tenant-a', event_type: 'student.early_departure_recorded' }], rowCount: 1 };
        }
        return { rows: [], rowCount: 0 };
      },
      readSql: async () => ({ rows: [], rowCount: 0 }),
      recordAudit: async (_tenantId: string, action: string) => {
        audits.push(action);
      },
      notifyRoles: async (tenantId: string, input: any) => {
        notifications.push({ tenantId, input });
      },
      requiredText: (value: unknown, label: string) => {
        const text = String(value ?? '').trim();
        if (!text) throw new Error(`${label} is required`);
        return text;
      },
      uuidOrNull: (value: unknown) => String(value || ''),
    } as never,
  );

  const departure = await service.recordEarlyDeparture({ student_name: 'Sarah Lee', reason: 'Medical', status: 'Awaiting Return' });
  const returned = await service.recordEarlyDepartureReturn('22222222-2222-4222-8222-222222222222');

  assert.equal(departure.departure.event_type, 'student.early_departure_recorded');
  assert.equal(returned.departure.event_type, 'student.early_departure_recorded');
  assert.match(writes[0].sql, /INSERT INTO workflow_events/);
  assert.match(writes[1].sql, /UPDATE workflow_events/);
  assert.equal(writes[0].params[0], 'tenant-a');
  assert.equal(writes[1].params[0], 'tenant-a');
  assert.equal(audits.includes('security.early_departure_recorded'), true);
  assert.equal(audits.includes('security.early_departure_return_recorded'), true);
  assert.equal(notifications.some((call) => call.input.type === 'security.early_departure_recorded'), true);
  assert.equal(notifications.some((call) => call.input.type === 'security.early_departure_return_recorded'), true);
});

test('SecurityOfficerCommandService records and acknowledges watchlist entries in the current tenant', async () => {
  const writes: Array<{ sql: string; params: unknown[] }> = [];
  const audits: string[] = [];
  const notifications: Array<{ tenantId: string; input: any }> = [];
  const service = new SecurityOfficerCommandService(
    {
      getStore: () => ({
        tenant_id: 'tenant-a',
        user_id: '11111111-1111-4111-8111-111111111111',
        role: 'security_officer',
      }),
    } as never,
    { query: async () => ({ rows: [], rowCount: 0 }) } as never,
    {
      writeSql: async (sql: string, params: unknown[]) => {
        writes.push({ sql, params });
        if (/INSERT INTO workflow_events/i.test(sql)) {
          return { rows: [{ id: '22222222-2222-4222-8222-222222222222', tenant_id: 'tenant-a', event_type: 'security.watchlist_entry_recorded' }], rowCount: 1 };
        }
        if (/UPDATE workflow_events/i.test(sql)) {
          return { rows: [{ id: '22222222-2222-4222-8222-222222222222', tenant_id: 'tenant-a', event_type: 'security.watchlist_entry_recorded' }], rowCount: 1 };
        }
        return { rows: [], rowCount: 0 };
      },
      readSql: async () => ({ rows: [], rowCount: 0 }),
      recordAudit: async (_tenantId: string, action: string) => {
        audits.push(action);
      },
      notifyRoles: async (tenantId: string, input: any) => {
        notifications.push({ tenantId, input });
      },
      requiredText: (value: unknown, label: string) => {
        const text = String(value ?? '').trim();
        if (!text) throw new Error(`${label} is required`);
        return text;
      },
      uuidOrNull: (value: unknown) => String(value || ''),
    } as never,
  );

  const entry = await service.recordWatchlistEntry({ subject: 'KBC 999Z', subject_type: 'Vehicle', instruction: 'Deny Entry', risk_level: 'Critical' });
  const acknowledged = await service.acknowledgeWatchlistEntry('22222222-2222-4222-8222-222222222222');

  assert.equal(entry.entry.event_type, 'security.watchlist_entry_recorded');
  assert.equal(acknowledged.entry.event_type, 'security.watchlist_entry_recorded');
  assert.match(writes[0].sql, /INSERT INTO workflow_events/);
  assert.match(writes[1].sql, /UPDATE workflow_events/);
  assert.equal(writes[0].params[0], 'tenant-a');
  assert.equal(writes[1].params[0], 'tenant-a');
  assert.equal(audits.includes('security.watchlist_entry_recorded'), true);
  assert.equal(audits.includes('security.watchlist_entry_acknowledged'), true);
  assert.equal(notifications.some((call) => call.input.type === 'security.watchlist_entry_recorded'), true);
  assert.equal(notifications.some((call) => call.input.type === 'security.watchlist_entry_acknowledged'), true);
});

test('SecurityOfficerCommandService starts and ends security shifts in the current tenant', async () => {
  const writes: Array<{ sql: string; params: unknown[] }> = [];
  const audits: string[] = [];
  const notifications: Array<{ tenantId: string; input: any }> = [];
  const service = new SecurityOfficerCommandService(
    {
      getStore: () => ({
        tenant_id: 'tenant-a',
        user_id: '11111111-1111-4111-8111-111111111111',
        role: 'security_officer',
      }),
    } as never,
    { query: async () => ({ rows: [], rowCount: 0 }) } as never,
    {
      writeSql: async (sql: string, params: unknown[]) => {
        writes.push({ sql, params });
        if (/INSERT INTO workflow_events/i.test(sql)) {
          const eventType = String(params[4] || 'security.shift_started');
          return { rows: [{ id: '22222222-2222-4222-8222-222222222222', tenant_id: 'tenant-a', event_type: eventType }], rowCount: 1 };
        }
        return { rows: [], rowCount: 0 };
      },
      readSql: async () => ({ rows: [], rowCount: 0 }),
      recordAudit: async (_tenantId: string, action: string) => {
        audits.push(action);
      },
      notifyRoles: async (tenantId: string, input: any) => {
        notifications.push({ tenantId, input });
      },
      requiredText: (value: unknown, label: string) => {
        const text = String(value ?? '').trim();
        if (!text) throw new Error(`${label} is required`);
        return text;
      },
      uuidOrNull: (value: unknown) => String(value || ''),
    } as never,
  );

  const started = await service.startShift({ gate_point: 'Main Gate', shift_name: 'Morning' });
  const ended = await service.endShift({ gate_point: 'Main Gate', handover_notes: 'All clear' });

  assert.equal(started.shift.event_type, 'security.shift_started');
  assert.equal(ended.shift.event_type, 'security.shift_ended');
  assert.match(writes[0].sql, /INSERT INTO workflow_events/);
  assert.match(writes[1].sql, /INSERT INTO workflow_events/);
  assert.equal(writes[0].params[0], 'tenant-a');
  assert.equal(writes[1].params[0], 'tenant-a');
  assert.equal(audits.includes('security.shift_started'), true);
  assert.equal(audits.includes('security.shift_ended'), true);
  assert.equal(notifications.some((call) => call.input.type === 'security.shift_started'), true);
  assert.equal(notifications.some((call) => call.input.type === 'security.shift_ended'), true);
});

test('SecurityOfficerCommandService records staff entry, exit, and return in the current tenant', async () => {
  const writes: Array<{ sql: string; params: unknown[] }> = [];
  const audits: string[] = [];
  const notifications: Array<{ tenantId: string; input: any }> = [];
  const service = new SecurityOfficerCommandService(
    {
      getStore: () => ({
        tenant_id: 'tenant-a',
        user_id: '11111111-1111-4111-8111-111111111111',
        role: 'security_officer',
      }),
    } as never,
    { query: async () => ({ rows: [], rowCount: 0 }) } as never,
    {
      writeSql: async (sql: string, params: unknown[]) => {
        writes.push({ sql, params });
        if (/INSERT INTO workflow_events/i.test(sql)) {
          const eventType = /staff\.entry_logged/i.test(sql) ? 'staff.entry_logged' : 'staff.departure_logged';
          return { rows: [{ id: '22222222-2222-4222-8222-222222222222', tenant_id: 'tenant-a', event_type: eventType }], rowCount: 1 };
        }
        if (/UPDATE workflow_events/i.test(sql)) {
          return { rows: [{ id: '22222222-2222-4222-8222-222222222222', tenant_id: 'tenant-a', event_type: 'staff.departure_logged' }], rowCount: 1 };
        }
        return { rows: [], rowCount: 0 };
      },
      readSql: async () => ({ rows: [], rowCount: 0 }),
      recordAudit: async (_tenantId: string, action: string) => {
        audits.push(action);
      },
      notifyRoles: async (tenantId: string, input: any) => {
        notifications.push({ tenantId, input });
      },
      requiredText: (value: unknown, label: string) => {
        const text = String(value ?? '').trim();
        if (!text) throw new Error(`${label} is required`);
        return text;
      },
      uuidOrNull: (value: unknown) => String(value || ''),
    } as never,
  );

  const entry = await service.logStaffEntry({ staffId: 'Mary Wanjiku', notes: 'Reported at main gate' });
  const exit = await service.logStaffDeparture({ staffId: 'Mary Wanjiku', notes: 'Left for official duty' });
  const returned = await service.logStaffReturn('22222222-2222-4222-8222-222222222222');

  assert.equal(entry.movement.event_type, 'staff.entry_logged');
  assert.equal(exit.movement.event_type, 'staff.departure_logged');
  assert.equal(returned.movement.event_type, 'staff.departure_logged');
  assert.match(writes[0].sql, /INSERT INTO workflow_events/);
  assert.match(writes[1].sql, /INSERT INTO workflow_events/);
  assert.match(writes[2].sql, /UPDATE workflow_events/);
  assert.equal(writes[0].params[0], 'tenant-a');
  assert.equal(writes[1].params[0], 'tenant-a');
  assert.equal(writes[2].params[0], 'tenant-a');
  assert.equal(audits.includes('staff.entry_logged'), true);
  assert.equal(audits.includes('staff.departure_logged'), true);
  assert.equal(audits.includes('staff.return_logged'), true);
  assert.equal(notifications.some((call) => call.input.type === 'staff.entry_logged'), true);
  assert.equal(notifications.some((call) => call.input.type === 'staff.departure_logged'), true);
});

test('SecurityOfficerCommandService searches security records inside the current tenant', async () => {
  const reads: Array<{ sql: string; params: unknown[] }> = [];
  const service = new SecurityOfficerCommandService(
    {
      getStore: () => ({
        tenant_id: 'tenant-a',
        user_id: '11111111-1111-4111-8111-111111111111',
        role: 'security_officer',
      }),
    } as never,
    { query: async () => ({ rows: [], rowCount: 0 }) } as never,
    {
      readSql: async (sql: string, params: unknown[]) => {
        reads.push({ sql, params });
        return {
          rows: [{ source: 'workflow_event', id: '22222222-2222-4222-8222-222222222222', title: 'Vehicle entry: KCA 123A' }],
          rowCount: 1,
        };
      },
      writeSql: async () => ({ rows: [], rowCount: 0 }),
      recordAudit: async () => undefined,
      notifyRoles: async () => undefined,
      requiredText: (value: unknown, label: string) => {
        const text = String(value ?? '').trim();
        if (!text) throw new Error(`${label} is required`);
        return text;
      },
      uuidOrNull: (value: unknown) => String(value || ''),
    } as never,
  );

  const results = await service.searchSecurityRecords('KCA');

  assert.equal(results[0].source, 'workflow_event');
  assert.match(reads[0].sql, /WHERE tenant_id = \$1/);
  assert.equal(reads[0].params[0], 'tenant-a');
  assert.equal(reads[0].params[1], '%KCA%');
});

test('PrincipalInsightsService audits dashboard views and stores persistent snapshots', async () => {
  const calls: string[] = [];
  const service = new PrincipalInsightsService(
    {
      getStore: () => ({
        tenant_id: 'tenant-a',
        user_id: 'principal-1',
        permissions: ['principal:read'],
      }),
    } as never,
    {
      listCurrentTenantModules: async () => ['principal_dashboard'],
    } as never,
    {
      findPrincipalDashboardSnapshot: async () => null,
      getPrincipalOverviewSnapshot: async () => ({
        total_students: 0,
        total_teachers: 0,
        total_support_staff: 0,
        student_gender_distribution: {},
        active_classes_streams: 0,
        student_attendance_today: 0,
        teacher_attendance_today: 0,
        parent_engagement_rate: 0,
        school_population_trends: [],
        active_users_online: 0,
      }),
      getPrincipalModuleMetrics: async () => ({}),
      upsertPrincipalDashboardSnapshot: async (input: Record<string, unknown>) => {
        calls.push(`snapshot:${input.tenant_id}`);
      },
      appendAuditLog: async (input: Record<string, unknown>) => {
        calls.push(`audit:${input.action}`);
      },
    } as never,
    new PrincipalInsightsCacheService(),
  );

  const dashboard = await service.buildDashboard('tenant-a');
  await service.buildDashboard('tenant-a');

  assert.equal(dashboard.tenant_id, 'tenant-a');
  assert.deepEqual(calls, [
    'audit:principal_dashboard.viewed',
    'snapshot:tenant-a',
  ]);
});

test('AI smart alerts provider exposes deterministic operational risk widgets', () => {
  const provider = PRINCIPAL_INSIGHT_PROVIDERS.find((item) => item.module_code === 'ai_insights');
  const metricKeys = new Set(provider?.widgets.map((widget) => widget.metric_key) ?? []);

  for (const key of [
    'fee_default_risk_alerts',
    'medicine_shortage_predictions',
    'attendance_irregularities',
    'budget_overrun_alerts',
    'performance_decline_warnings',
  ]) {
    assert.equal(metricKeys.has(key), true, `${key} missing from AI smart alerts widgets`);
  }
});

test('AdminCommandRepository calculates deterministic AI smart alert metrics from module signals', async () => {
  let observedSql = '';
  const repository = new AdminCommandRepository({
        executeWithTenant: async function(tenantId: string, ctx: any, cb: any) {
      return cb({
        $queryRawUnsafe: async (sql: string, ...params: any[]) => {
          const res = await (this as any).query(sql, params);
          return res.rows || res;
        }
      });
    },
query: async (sql: string) => {
      observedSql = sql;

      return {
        rows: [{
          smart_risk_alerts: '11',
          operational_anomalies: '2',
          predictions_generated: '6',
          fee_default_risk_alerts: '3',
          medicine_shortage_predictions: '4',
          attendance_irregularities: '2',
          budget_overrun_alerts: '1',
          performance_decline_warnings: '1',
        }],
      };
    },
  } as never);

  const metrics = await repository.getPrincipalModuleMetrics('tenant-a', 'ai_insights');

  assert.equal(metrics.smart_risk_alerts, 11);
  assert.equal(metrics.medicine_shortage_predictions, 4);
  assert.match(observedSql, /fee_default_risk_alerts/);
  assert.match(observedSql, /medicine_shortage_predictions/);
  assert.match(observedSql, /attendance_irregularities/);
  assert.match(observedSql, /budget_overrun_alerts/);
  assert.match(observedSql, /performance_decline_warnings/);
});

test('clinic principal insight provider exposes finance-safe medicine analytics widgets', () => {
  const provider = PRINCIPAL_INSIGHT_PROVIDERS.find((item) => item.module_code === 'clinic_health');
  const metricKeys = new Set(provider?.widgets.map((widget) => widget.metric_key) ?? []);

  for (const key of [
    'out_of_stock_medicines',
    'medicine_consumption_cost_minor',
    'wastage_due_to_expiry_minor',
    'emergency_supply_ready_rate',
    'most_used_medicine',
  ]) {
    assert.equal(metricKeys.has(key), true, `${key} missing from clinic widgets`);
  }
});

test('AdminCommandRepository calculates finance-safe clinic principal metrics without invoice exposure', async () => {
  let observedSql = '';
  const repository = new AdminCommandRepository({
        executeWithTenant: async function(tenantId: string, ctx: any, cb: any) {
      return cb({
        $queryRawUnsafe: async (sql: string, ...params: any[]) => {
          const res = await (this as any).query(sql, params);
          return res.rows || res;
        }
      });
    },
query: async (sql: string) => {
      observedSql = sql;

      return {
        rows: [{
          clinic_visits_today: '12',
          medicine_low_stock: '3',
          medicine_expiring_soon: '4',
          critical_medicine_shortages: '1',
          out_of_stock_medicines: '2',
          medicine_consumption_cost_minor: '250000',
          wastage_due_to_expiry_minor: '45000',
          emergency_supply_ready_rate: '80.5',
          most_used_medicine: 'Paracetamol',
        }],
      };
    },
  } as never);

  const metrics = await repository.getPrincipalModuleMetrics('tenant-a', 'clinic_health');

  assert.equal(metrics.medicine_consumption_cost_minor, 250000);
  assert.equal(metrics.wastage_due_to_expiry_minor, 45000);
  assert.equal(metrics.most_used_medicine, 'Paracetamol');
  assert.match(observedSql, /medicine_consumption_cost_minor/);
  assert.match(observedSql, /wastage_due_to_expiry_minor/);
  assert.match(observedSql, /emergency_supply_ready_rate/);
  assert.doesNotMatch(observedSql, /supplier_invoice_reference/);
  assert.doesNotMatch(observedSql, /confidential_notes/);
});

test('AdminCommandController is module-gated with role-specific permissions', () => {
  assert.deepEqual(Reflect.getMetadata(MODULE_ACCESS_KEY, AdminCommandController), ['admin_command_centers']);

  const principalHandler = Object.getOwnPropertyDescriptor(
    AdminCommandController.prototype,
    'getPrincipalDashboard',
  )?.value;
  const principalStreamHandler = Object.getOwnPropertyDescriptor(
    AdminCommandController.prototype,
    'streamPrincipalDashboard',
  )?.value;
  const deputyHandler = Object.getOwnPropertyDescriptor(
    AdminCommandController.prototype,
    'getDeputyDashboard',
  )?.value;
  const secretaryHandler = Object.getOwnPropertyDescriptor(
    AdminCommandController.prototype,
    'getSecretaryDashboard',
  )?.value;

  assert.deepEqual(Reflect.getMetadata(PERMISSIONS_KEY, principalHandler), ['principal:read']);
  assert.deepEqual(Reflect.getMetadata(PERMISSIONS_KEY, principalStreamHandler), ['principal:read']);
  assert.deepEqual(Reflect.getMetadata(PERMISSIONS_KEY, deputyHandler), ['deputy:read']);
  assert.deepEqual(Reflect.getMetadata(PERMISSIONS_KEY, secretaryHandler), ['secretary:read']);
});

test('AdminCommandService returns module-aware principal executive dashboard when insight service is available', async () => {
  const service = new AdminCommandService(
    { getStore: () => ({ tenant_id: 'tenant-a', user_id: 'principal-1' }) } as never,
    { getPrincipalDashboard: async () => ({ legacy: true }) } as never,
    {} as never, // fileStorage
    undefined, // objectStorage
    undefined, // configService
    {
      buildDashboard: async (tenantId: string) => ({
        tenant_id: tenantId,
        enabled_modules: ['finance', 'clinic_health'],
        sections: [
          { id: 'finance', module_code: 'finance', title: 'Finance Insights', widgets: [] },
          { id: 'clinic', module_code: 'clinic_health', title: 'Clinic Insights', widgets: [] },
        ],
        alerts: [],
      }),
    } as never,
  );

  const dashboard = await service.getPrincipalDashboard() as {
    tenant_id: string;
    enabled_modules: string[];
    sections: unknown[];
  };

  assert.equal(dashboard.tenant_id, 'tenant-a');
  assert.deepEqual(dashboard.enabled_modules, ['finance', 'clinic_health']);
  assert.equal(dashboard.sections.length, 2);
});

test('AdminCommandService exposes a tenant-scoped principal dashboard event stream', async () => {
  const service = new AdminCommandService(
    { getStore: () => ({ tenant_id: 'tenant-a', user_id: 'principal-1' }) } as never,
    { getPrincipalDashboard: async () => ({ legacy: true }) } as never,
    {} as never, // fileStorage
    undefined, // objectStorage
    undefined, // configService
    {
      streamDashboard: (tenantId: string) => of({
        type: 'principal.dashboard',
        data: {
          tenant_id: tenantId,
          generated_at: '2026-05-19T00:00:00.000Z',
        },
      }),
    } as never,
  );

  const firstEvent = await firstValueFrom(service.streamPrincipalDashboard());

  assert.equal(firstEvent.type, 'principal.dashboard');
  assert.deepEqual(firstEvent.data, {
    tenant_id: 'tenant-a',
    generated_at: '2026-05-19T00:00:00.000Z',
  });
});

test('AdminCommandService creates incidents with audit trail', async () => {
  const calls: string[] = [];
  const service = new AdminCommandService(
    { getStore: () => ({ tenant_id: 'tenant-a', user_id: 'user-1' }) } as never,
    {
      createIncident: async (input: Record<string, unknown>) => {
        calls.push('incident');
        return { id: 'incident-1', ...input };
      },
      appendAuditLog: async (input: Record<string, unknown>) => {
        calls.push(`audit:${input.action}`);
      },
    } as never,
    {} as never,
  );

  const result = await service.createIncident({
    title: 'Gate duty incident',
    description: 'Teacher did not report for morning duty',
    severity: 'medium',
    involved_parties: [{ type: 'teacher', id: 'teacher-1' }],
  });

  assert.equal(result.id, 'incident-1');
  assert.deepEqual(calls, ['incident', 'audit:admin_command.incident_created']);
});

test('AdminCommandService persists a principal school profile and records the completed workflow', async () => {
  const calls: string[] = [];
  const service = new AdminCommandService(
    {
      getStore: () => ({
        tenant_id: 'tenant-a',
        user_id: '11111111-1111-4111-8111-111111111111',
      }),
    } as never,
    {
      updateSchoolProfile: async (tenantId: string, input: Record<string, string>) => {
        calls.push(`update:${tenantId}:${input.schoolName}`);
        return {
          status: 'active',
          schoolName: input.schoolName,
          county: input.county,
          contactInfo: { email: input.email, phone: input.phone },
        };
      },
      createPrincipalWorkflowAction: async (input: Record<string, unknown>) => {
        calls.push(`event:${input.event_type}:${input.status}`);
        return { id: '22222222-2222-4222-8222-222222222222' };
      },
      appendAuditLog: async (input: Record<string, unknown>) => {
        calls.push(`audit:${input.action}`);
      },
    } as never,
    {} as never,
  );

  const result = await service.updatePrincipalSchoolProfile({
    schoolName: 'Maranda High',
    email: 'OFFICE@MARANDA.TEST',
    phone: '+254700000001',
    county: 'Siaya',
    address: 'Box 1, Bondo',
  });

  assert.equal(result.success, true);
  assert.deepEqual(calls, [
    'update:tenant-a:Maranda High',
    'event:principal.school_profile_updated:completed',
    'audit:principal.school_profile_updated',
  ]);
  assert.equal(result.profile.contactInfo.email, 'office@maranda.test');
});

test('IctManagerCommandService records asset management requests as tenant-scoped workflow events', async () => {
  const workflowCalls: any[] = [];
  const service = new IctManagerCommandService(
    {
      getStore: () => ({ tenant_id: 'tenant-a', user_id: '11111111-1111-4111-8111-111111111111' }),
    } as never,
    { query: async () => ({ rows: [], rowCount: 0 }) } as never,
    {
      recordWorkflowAction: async (input: any) => {
        workflowCalls.push(input);
        return { id: 'workflow-1', ...input };
      },
    } as never,
  );

  const result = await service.manageAsset('asset-123', {
    action: 'Schedule maintenance',
    condition: 'needs_maintenance',
    notes: 'Projector lamp is dim',
  }) as any;

  assert.equal(workflowCalls.length, 1);
  assert.equal(workflowCalls[0].tenantId, 'tenant-a');
  assert.equal(workflowCalls[0].actorUserId, '11111111-1111-4111-8111-111111111111');
  assert.equal(workflowCalls[0].sourceRole, 'ict_manager');
  assert.deepEqual(workflowCalls[0].targetRoles, ['ict_manager', 'system_monitor', 'principal']);
  assert.equal(workflowCalls[0].eventType, 'ict.asset.management_requested');
  assert.equal(workflowCalls[0].entityType, 'ict_asset');
  assert.equal(workflowCalls[0].entityId, 'asset-123');
  assert.equal(workflowCalls[0].priority, 'high');
  assert.equal(workflowCalls[0].payload.action, 'Schedule maintenance');
  assert.equal(workflowCalls[0].payload.condition, 'needs_maintenance');
  assert.equal(result.eventType, 'ict.asset.management_requested');
});

test('HodCommandService routes roster review requests as tenant-scoped workflow events', async () => {
  const workflowCalls: any[] = [];
  const service = new HodCommandService(
    {
      getStore: () => ({ tenant_id: 'tenant-a', user_id: '11111111-1111-4111-8111-111111111111' }),
    } as never,
    { query: async () => ({ rows: [], rowCount: 0 }) } as never,
    {
      uuidOrNull: (value: unknown) => String(value || ''),
      recordWorkflowAction: async (input: any) => {
        workflowCalls.push(input);
        return { id: 'hod-roster-review-event-1', ...input };
      },
    } as never,
  );

  const result = await service.recordRosterReview({
    assignment_id: '22222222-2222-4222-8222-222222222222',
    subject_name: 'Mathematics',
    class_name: 'Form 2 East',
  });

  assert.equal(result.success, true);
  assert.equal(workflowCalls.length, 1);
  assert.equal(workflowCalls[0].tenantId, 'tenant-a');
  assert.equal(workflowCalls[0].actorUserId, '11111111-1111-4111-8111-111111111111');
  assert.equal(workflowCalls[0].sourceRole, 'hod');
  assert.deepEqual(workflowCalls[0].targetRoles, ['hod', 'teacher', 'dean_academics', 'principal']);
  assert.equal(workflowCalls[0].eventType, 'hod.roster_review.requested');
  assert.equal(workflowCalls[0].entityType, 'department_roster_review');
  assert.equal(workflowCalls[0].entityId, '22222222-2222-4222-8222-222222222222');
  assert.equal(workflowCalls[0].payload.subject_name, 'Mathematics');
  assert.equal(workflowCalls[0].payload.class_name, 'Form 2 East');
});

test('HodCommandService routes subject allocation revoke requests without deleting assignments', async () => {
  const workflowCalls: any[] = [];
  const service = new HodCommandService(
    {
      getStore: () => ({ tenant_id: 'tenant-a', user_id: '11111111-1111-4111-8111-111111111111' }),
    } as never,
    { query: async () => ({ rows: [], rowCount: 0 }) } as never,
    {
      uuidOrNull: (value: unknown) => String(value || ''),
      recordWorkflowAction: async (input: any) => {
        workflowCalls.push(input);
        return { id: 'hod-revoke-event-1', ...input };
      },
    } as never,
  );

  const result = await service.requestSubjectAllocationRevocation({
    assignment_id: '33333333-3333-4333-8333-333333333333',
    subject_id: '44444444-4444-4444-8444-444444444444',
    teacher_id: '55555555-5555-4555-8555-555555555555',
    class_section_id: '66666666-6666-4666-8666-666666666666',
    reason: 'Teacher transferred to boarding supervision.',
  });

  assert.equal(result.success, true);
  assert.equal(workflowCalls.length, 1);
  assert.equal(workflowCalls[0].tenantId, 'tenant-a');
  assert.equal(workflowCalls[0].sourceRole, 'hod');
  assert.equal(workflowCalls[0].eventType, 'hod.subject_allocation.revoke_requested');
  assert.equal(workflowCalls[0].entityType, 'hod_workflow');
  assert.equal(workflowCalls[0].entityId, '33333333-3333-4333-8333-333333333333');
  assert.equal(workflowCalls[0].payload.requires_review, true);
  assert.equal(workflowCalls[0].payload.teacher_id, '55555555-5555-4555-8555-555555555555');
});

test('HodCommandService returns tenant-scoped subject allocation options for HOD dropdowns', async () => {
  const queries: Array<{ sql: string; params: unknown[] }> = [];
  const service = new HodCommandService(
    {
      getStore: () => ({ tenant_id: 'tenant-a', user_id: '11111111-1111-4111-8111-111111111111' }),
    } as never,
    {
      query: async (sql: string, params: unknown[]) => {
        queries.push({ sql, params });
        if (/FROM staff_profiles/.test(sql)) {
          return { rows: [{ id: 'staff-a', user_id: 'teacher-a', label: 'Teacher A' }], rowCount: 1 };
        }
        if (/FROM subjects/.test(sql)) {
          return { rows: [{ id: 'subject-a', label: 'Mathematics', code: 'MATH' }], rowCount: 1 };
        }
        if (/FROM class_sections/.test(sql)) {
          return { rows: [{ id: 'class-a', label: 'Form 2 East', grade_level: 'Form 2', stream: 'East' }], rowCount: 1 };
        }
        if (/FROM academic_terms/.test(sql)) {
          return { rows: [{ id: 'term-a', label: 'Term 2 2026', status: 'active' }], rowCount: 1 };
        }
        return { rows: [], rowCount: 0 };
      },
    } as never,
    {
      uuidOrNull: (value: unknown) => String(value || ''),
      recordWorkflowAction: async (input: any) => ({ id: 'workflow-a', ...input }),
    } as never,
  );

  const result = await service.getSubjectAllocationOptions();

  assert.deepEqual(result.teachers, [{ id: 'staff-a', user_id: 'teacher-a', label: 'Teacher A' }]);
  assert.deepEqual(result.subjects, [{ id: 'subject-a', label: 'Mathematics', code: 'MATH' }]);
  assert.deepEqual(result.classes, [{ id: 'class-a', label: 'Form 2 East', grade_level: 'Form 2', stream: 'East' }]);
  assert.deepEqual(result.terms, [{ id: 'term-a', label: 'Term 2 2026', status: 'active' }]);
  assert.equal(queries.length, 4);
  assert.ok(queries.every((query) => query.params[0] === 'tenant-a'));
});

test('HodCommandService does not convert tenant query failures into fake empty workspaces', async () => {
  const service = new HodCommandService(
    {
      getStore: () => ({ tenant_id: 'tenant-a', user_id: '11111111-1111-4111-8111-111111111111' }),
    } as never,
    {
      query: async (_sql: string, params: unknown[]) => {
        assert.equal(params[0], 'tenant-a');
        throw new Error('hod read failed');
      },
    } as never,
    {} as never,
  );

  await assert.rejects(() => service.getCoverageReview(), /hod read failed/);
});

test('DeanAcademicsCommandService does not convert tenant query failures into fake empty workspaces', async () => {
  const service = new DeanAcademicsCommandService(
    {
      getStore: () => ({ tenant_id: 'tenant-a', user_id: '11111111-1111-4111-8111-111111111111' }),
    } as never,
    {
      query: async (_sql: string, params: unknown[]) => {
        assert.equal(params[0], 'tenant-a');
        throw new Error('dean read failed');
      },
    } as never,
    {} as never,
  );

  await assert.rejects(() => service.getAssessments(), /dean read failed/);
});

test('TeacherCommandService lists only the current teacher store requests with actionable metrics', async () => {
  const queries: Array<{ sql: string; params: unknown[] }> = [];
  const service = new TeacherCommandService(
    {
      getStore: () => ({
        tenant_id: 'tenant-a',
        user_id: '11111111-1111-4111-8111-111111111111',
      }),
    } as never,
    {
      query: async (sql: string, params: unknown[]) => {
        queries.push({ sql, params });
        return {
          rows: [
            {
              id: 'request-a',
              request_number: 'REQ-2026-00001',
              item: 'Exercise books',
              quantity: 40,
              needed_by: '2026-07-18',
              date: '2026-07-13',
              priority: 'High',
              status: 'Pending',
            },
          ],
          rowCount: 1,
        };
      },
    } as never,
    {
      requiredText: (value: unknown, label: string) => {
        const text = String(value ?? '').trim();
        if (!text) throw new Error(`${label} is required`);
        return text;
      },
      positiveInteger: (value: unknown) => Number(value),
      uuidOrNull: (value: unknown) => String(value || ''),
      writeSql: async () => ({ rows: [], rowCount: 0 }),
      recordWorkflowAction: async (input: any) => ({ id: 'event-a', ...input }),
    } as never,
  );

  const result = await service.getStoreRequests();

  assert.equal(result.metrics.pending, 1);
  assert.equal(result.metrics.fulfilled, 0);
  assert.equal(result.items[0].item, 'Exercise books');
  assert.equal(queries[0].params[0], 'tenant-a');
  assert.equal(queries[0].params[1], '11111111-1111-4111-8111-111111111111');
  assert.match(queries[0].sql, /tenant_id = \$1/);
  assert.match(queries[0].sql, /requested_by_user_id/);
});

test('TeacherCommandService reads mark entry only for the current teacher and does not fake empty failures', async () => {
  const queries: Array<{ sql: string; params: unknown[] }> = [];
  const service = new TeacherCommandService(
    {
      getStore: () => ({
        tenant_id: 'tenant-a',
        user_id: '11111111-1111-4111-8111-111111111111',
      }),
    } as never,
    {
      query: async (sql: string, params: unknown[]) => {
        queries.push({ sql, params });
        return {
          rows: [
            {
              id: 'mark-a',
              student_name: 'Achieng Otieno',
              exam_name: 'Term 1 Opener',
              score: '78',
              status: 'draft',
            },
          ],
          rowCount: 1,
        };
      },
    } as never,
    {} as never,
  );

  const marks = await service.getMarkEntry();

  assert.equal(marks.length, 1);
  assert.equal(queries[0].params[0], 'tenant-a');
  assert.equal(queries[0].params[1], '11111111-1111-4111-8111-111111111111');
  assert.match(queries[0].sql, /FROM exam_marks mark/i);
  assert.match(queries[0].sql, /entered_by_user_id = \$2::uuid/i);
  assert.doesNotMatch(queries[0].sql, /SELECT \* FROM exam_marks WHERE tenant_id = \$1/i);

  const failingService = new TeacherCommandService(
    {
      getStore: () => ({
        tenant_id: 'tenant-a',
        user_id: '11111111-1111-4111-8111-111111111111',
      }),
    } as never,
    {
      query: async () => {
        throw new Error('teacher mark query failed');
      },
    } as never,
    {} as never,
  );

  await assert.rejects(() => failingService.getMarkEntry(), /teacher mark query failed/);
});

test('TeacherCommandService creates tenant-scoped store requests for the storekeeper queue', async () => {
  const writes: Array<{ sql: string; params: unknown[] }> = [];
  const workflowCalls: any[] = [];
  const service = new TeacherCommandService(
    {
      getStore: () => ({
        tenant_id: 'tenant-a',
        user_id: '11111111-1111-4111-8111-111111111111',
      }),
    } as never,
    { query: async () => ({ rows: [{ count: 2 }], rowCount: 1 }) } as never,
    {
      requiredText: (value: unknown, label: string) => {
        const text = String(value ?? '').trim();
        if (!text) throw new Error(`${label} is required`);
        return text;
      },
      positiveInteger: (value: unknown, label: string) => {
        const number = Number(value);
        if (!Number.isInteger(number) || number <= 0) throw new Error(`${label} must be positive`);
        return number;
      },
      uuidOrNull: (value: unknown) => String(value || ''),
      writeSql: async (sql: string, params: unknown[]) => {
        writes.push({ sql, params });
        return {
          rows: [{ id: 'request-a', request_number: 'REQ-2026-00003', status: 'pending' }],
          rowCount: 1,
        };
      },
      recordWorkflowAction: async (input: any) => {
        workflowCalls.push(input);
        return { id: 'teacher-store-request-event-1', ...input };
      },
    } as never,
  );

  const result = await service.createStoreRequest({
    item: 'Exercise books',
    quantity: 40,
    needed_by: '2026-07-18',
    priority: 'high',
    notes: 'For Form 1 English assignment.',
  });

  assert.equal(result.success, true);
  assert.equal(result.request.request_number, 'REQ-2026-00003');
  assert.match(writes[0].sql, /INSERT INTO inventory_requests/);
  assert.equal(writes[0].params[0], 'tenant-a');
  assert.equal(writes[0].params[3], 'Teacher request');
  assert.match(String(writes[0].params[6]), /Exercise books/);
  assert.match(String(writes[0].params[6]), /11111111-1111-4111-8111-111111111111/);
  assert.equal(workflowCalls.length, 1);
  assert.equal(workflowCalls[0].tenantId, 'tenant-a');
  assert.equal(workflowCalls[0].sourceRole, 'teacher');
  assert.deepEqual(workflowCalls[0].targetRoles, ['storekeeper', 'hod', 'principal']);
  assert.equal(workflowCalls[0].eventType, 'inventory.requested');
  assert.equal(workflowCalls[0].entityType, 'inventory_request');
});

test('TransportManagerCommandService sends transport notices through tenant-scoped notifications', async () => {
  const workflowCalls: any[] = [];
  const notificationCalls: any[] = [];
  const service = new TransportManagerCommandService(
    {
      getStore: () => ({
        tenant_id: 'tenant-a',
        user_id: '11111111-1111-4111-8111-111111111111',
      }),
    } as never,
    {} as never,
    {
      requiredText: (value: unknown, label: string) => {
        const text = String(value ?? '').trim();
        if (!text) throw new Error(`${label} is required`);
        return text;
      },
      recordWorkflowAction: async (input: any) => {
        workflowCalls.push(input);
        return { id: 'transport-notice-event-1', ...input };
      },
      notifyRoles: async (tenantId: string, input: any) => {
        notificationCalls.push({ tenantId, input });
      },
    } as never,
  );

  const result = await service.sendNotice({
    title: 'Bus delayed',
    message: 'Bus 11 is delayed by 14 minutes.',
    notice_type: 'delay',
    target_roles: ['parent', 'class_teacher'],
    channels: ['in_app', 'sms'],
  });

  assert.equal(result.success, true);
  assert.equal(workflowCalls.length, 1);
  assert.equal(workflowCalls[0].tenantId, 'tenant-a');
  assert.equal(workflowCalls[0].entityType, 'transport_notice');
  assert.equal(workflowCalls[0].eventType, 'transport.notice_sent');
  assert.deepEqual(workflowCalls[0].targetRoles, ['parent', 'class_teacher']);
  assert.equal(notificationCalls.length, 1);
  assert.equal(notificationCalls[0].tenantId, 'tenant-a');
  assert.deepEqual(notificationCalls[0].input.targetRoles, ['parent', 'class_teacher']);
  assert.equal(notificationCalls[0].input.type, 'transport.notice_sent');
});

test('TransportManagerCommandService returns tenant-scoped assignment options for transport dropdowns', async () => {
  const queries: Array<{ sql: string; params: unknown[] }> = [];
  const service = new TransportManagerCommandService(
    {
      getStore: () => ({
        tenant_id: 'tenant-a',
        user_id: '11111111-1111-4111-8111-111111111111',
      }),
    } as never,
    {
      query: async (sql: string, params: unknown[]) => {
        queries.push({ sql, params });
        if (/FROM transport_routes route/.test(sql)) {
          return { rows: [{ id: 'route-a', label: 'Town Route - T1', status: 'active' }], rowCount: 1 };
        }
        if (/FROM transport_manifests manifest/.test(sql)) {
          return { rows: [{ id: 'manifest-a', route_id: 'route-a', label: 'Town Route manifest from 2026-07-15', status: 'active' }], rowCount: 1 };
        }
        if (/FROM students student/.test(sql)) {
          return { rows: [{ id: 'student-a', label: 'Amina Otieno - ADM001', class_id: 'class-a', guardian_contact: '0700000000' }], rowCount: 1 };
        }
        if (/FROM transport_route_stops stop/.test(sql)) {
          return { rows: [{ id: 'stop-a', route_id: 'route-a', label: 'Town Route - 1. Main Gate' }], rowCount: 1 };
        }
        if (/FROM transport_vehicles vehicle/.test(sql)) {
          return { rows: [{ id: 'vehicle-a', label: 'KDA 123A - Isuzu Bus (active)', status: 'active' }], rowCount: 1 };
        }
        return { rows: [], rowCount: 0 };
      },
    } as never,
    {} as never,
  );

  const result = await service.getAssignmentOptions();

  assert.deepEqual(result.routes, [{ id: 'route-a', label: 'Town Route - T1', status: 'active' }]);
  assert.deepEqual(result.manifests, [{ id: 'manifest-a', route_id: 'route-a', label: 'Town Route manifest from 2026-07-15', status: 'active' }]);
  assert.deepEqual(result.students, [{ id: 'student-a', label: 'Amina Otieno - ADM001', class_id: 'class-a', guardian_contact: '0700000000' }]);
  assert.deepEqual(result.stops, [{ id: 'stop-a', route_id: 'route-a', label: 'Town Route - 1. Main Gate' }]);
  assert.deepEqual(result.vehicles, [{ id: 'vehicle-a', label: 'KDA 123A - Isuzu Bus (active)', status: 'active' }]);
  assert.equal(queries.length, 5);
  assert.ok(queries.every((query) => query.params[0] === 'tenant-a'));
});

test('TransportManagerCommandService assigns learners by route and prepares an active manifest', async () => {
  const writes: Array<{ sql: string; params: unknown[] }> = [];
  const audits: any[] = [];
  const service = new TransportManagerCommandService(
    {
      getStore: () => ({
        tenant_id: 'tenant-a',
        user_id: '11111111-1111-4111-8111-111111111111',
      }),
    } as never,
    {
      query: async () => ({ rows: [], rowCount: 0 }),
    } as never,
    {
      uuidOrNull: (value: unknown) => (value ? String(value) : null),
      requiredText: (value: unknown, label: string) => {
        const text = String(value ?? '').trim();
        if (!text) throw new Error(`${label} is required`);
        return text;
      },
      writeSql: async (sql: string, params: unknown[]) => {
        writes.push({ sql, params });
        if (/INSERT INTO transport_manifests/.test(sql)) {
          return { rows: [{ id: 'manifest-created' }], rowCount: 1 };
        }
        return { rows: [{ id: 'assignment-a', manifest_id: params[1], student_id: params[2] }], rowCount: 1 };
      },
      recordAudit: async (...args: any[]) => {
        audits.push(args);
      },
    } as never,
  );

  const result = await service.assignStudentTransport({
    route_id: 'route-a',
    student_id: 'student-a',
    pickup_stop_id: 'stop-a',
    dropoff_stop_id: 'stop-b',
    guardian_contact: '0700000000',
  });

  assert.equal(result.success, true);
  assert.match(writes[0].sql, /INSERT INTO transport_manifests/);
  assert.equal(writes[0].params[0], 'tenant-a');
  assert.equal(writes[0].params[1], 'route-a');
  assert.match(writes[1].sql, /INSERT INTO transport_manifest_students/);
  assert.equal(writes[1].params[1], 'manifest-created');
  assert.equal(writes[1].params[2], 'student-a');
  assert.equal(audits.length, 1);
  assert.equal(audits[0][0], 'tenant-a');
  assert.equal(audits[0][1], 'transport.student_assigned');
});

test('ExamsManagerCommandService reads fresh-school overview from tenant-scoped exam series only', async () => {
  const reads: Array<{ sql: string; params: unknown[] }> = [];
  const service = new ExamsManagerCommandService(
    {
      getStore: () => ({ tenant_id: 'tenant-a', user_id: '11111111-1111-4111-8111-111111111111' }),
    } as never,
    {} as never,
    {
      readSql: async (sql: string, params: unknown[]) => {
        reads.push({ sql, params });
        return { rows: [], rowCount: 0 };
      },
    } as never,
  );

  const result = await service.getOverview();

  assert.equal(result.metrics.active_exams, 0);
  assert.equal(result.metrics.pending_moderation, 0);
  assert.deepEqual(result.recent_exams, []);
  assert.equal(reads.length >= 1, true);
  assert.equal(reads.every((read) => read.params[0] === 'tenant-a'), true);
  assert.equal(reads.some((read) => /exam_series/i.test(read.sql)), true);
  assert.equal(reads.some((read) => /exam_cycles/i.test(read.sql)), false);
});

test('ExamsManagerCommandService returns clean exam setup and marks entry for a fresh tenant', async () => {
  const reads: Array<{ sql: string; params: unknown[] }> = [];
  const service = new ExamsManagerCommandService(
    {
      getStore: () => ({ tenant_id: 'tenant-fresh', user_id: '11111111-1111-4111-8111-111111111111' }),
    } as never,
    {} as never,
    {
      readSql: async (sql: string, params: unknown[]) => {
        reads.push({ sql, params });
        return { rows: [], rowCount: 0 };
      },
    } as never,
  );

  const setup = await service.getExamSetup();
  const marksEntry = await service.getMarksEntry();

  assert.deepEqual(setup.exams, []);
  assert.equal(setup.metrics.total_exams, 0);
  assert.equal(setup.metrics.active_exams, 0);
  assert.deepEqual(marksEntry.entries, []);
  assert.equal(marksEntry.metrics.total_entries, 0);
  assert.equal(marksEntry.metrics.completion_rate, 0);
  assert.equal(reads.length, 2);
  assert.equal(reads.every((read) => read.params[0] === 'tenant-fresh'), true);
  assert.equal(reads.some((read) => /FROM exam_series series/i.test(read.sql)), true);
  assert.equal(reads.some((read) => /FROM exam_marks mark/i.test(read.sql)), true);
  assert.equal(reads.every((read) => /tenant_id = \$1/.test(read.sql)), true);
});

test('ExamsManagerCommandService creates exam setup as a durable tenant-scoped exam series', async () => {
  const writes: Array<{ sql: string; params: unknown[] }> = [];
  const workflowCalls: any[] = [];
  const service = new ExamsManagerCommandService(
    {
      getStore: () => ({ tenant_id: 'tenant-a', user_id: '11111111-1111-4111-8111-111111111111' }),
    } as never,
    {} as never,
    {
      writeSql: async (sql: string, params: unknown[]) => {
        writes.push({ sql, params });
        return {
          rows: [{
            id: '22222222-2222-4222-8222-222222222222',
            name: params[1],
            starts_on: params[2],
            ends_on: params[3],
            status: params[4],
            created_at: '2026-07-13T00:00:00.000Z',
          }],
          rowCount: 1,
        };
      },
      readSql: async () => ({ rows: [], rowCount: 0 }),
      recordWorkflowAction: async (input: any) => {
        workflowCalls.push(input);
        return { id: 'workflow-1', ...input };
      },
      requiredText: (value: unknown, label: string) => {
        const text = String(value ?? '').trim();
        if (!text) throw new Error(`${label} is required`);
        return text;
      },
    } as never,
  );

  const result = await service.createExamSetup({
    name: 'Term 1 Opener',
    starts_on: '2026-01-12',
    ends_on: '2026-01-16',
    status: 'scheduled',
  });

  assert.equal(result.success, true);
  assert.equal(result.exam.name, 'Term 1 Opener');
  assert.match(writes[0].sql, /INSERT INTO exam_series/i);
  assert.equal(writes[0].params[0], 'tenant-a');
  assert.equal(writes[0].params[1], 'Term 1 Opener');
  assert.equal(writes[0].params[4], 'draft');
  assert.equal(workflowCalls.length, 1);
  assert.equal(workflowCalls[0].tenantId, 'tenant-a');
  assert.equal(workflowCalls[0].eventType, 'exams.exam-setup.created');
  assert.equal(workflowCalls[0].entityType, 'exam_series');
  assert.equal(workflowCalls[0].entityId, '22222222-2222-4222-8222-222222222222');
});

test('ExamsManagerCommandService persists selected exam subjects and class mark-entry windows', async () => {
  const writes: Array<{ sql: string; params: unknown[] }> = [];
  const workflowCalls: any[] = [];
  const service = new ExamsManagerCommandService(
    {
      getStore: () => ({ tenant_id: '11111111-1111-4111-8111-111111111111', user_id: '22222222-2222-4222-8222-222222222222' }),
    } as never,
    {} as never,
    {
      writeSql: async (sql: string, params: unknown[]) => {
        writes.push({ sql, params });
        if (/INSERT INTO exam_series/i.test(sql)) {
          return {
            rows: [{
              id: '33333333-3333-4333-8333-333333333333',
              name: params[1],
              starts_on: params[2],
              ends_on: params[3],
              status: params[4],
              created_at: '2026-07-13T00:00:00.000Z',
            }],
            rowCount: 1,
          };
        }
        if (/INSERT INTO exam_assessments/i.test(sql)) {
          return {
            rows: [
              { id: 'assessment-1', subject_id: '44444444-4444-4444-8444-444444444444' },
              { id: 'assessment-2', subject_id: '55555555-5555-4555-8555-555555555555' },
            ],
            rowCount: 2,
          };
        }
        if (/INSERT INTO exam_mark_entry_windows/i.test(sql)) {
          return {
            rows: [
              { id: 'window-1', subject_id: '44444444-4444-4444-8444-444444444444', class_section_id: '66666666-6666-4666-8666-666666666666' },
              { id: 'window-2', subject_id: '55555555-5555-4555-8555-555555555555', class_section_id: '77777777-7777-4777-8777-777777777777' },
            ],
            rowCount: 4,
          };
        }
        return { rows: [], rowCount: 0 };
      },
      readSql: async () => ({ rows: [], rowCount: 0 }),
      recordWorkflowAction: async (input: any) => {
        workflowCalls.push(input);
        return { id: 'workflow-1', ...input };
      },
      requiredText: (value: unknown, label: string) => {
        const text = String(value ?? '').trim();
        if (!text) throw new Error(`${label} is required`);
        return text;
      },
    } as never,
  );

  const result = await service.createExamSetup({
    name: 'Term 1 Opener',
    starts_on: '2026-01-12',
    ends_on: '2026-01-16',
    status: 'submitted',
    max_marks: 80,
    subject_ids: [
      '44444444-4444-4444-8444-444444444444',
      '55555555-5555-4555-8555-555555555555',
    ],
    class_section_ids: [
      '66666666-6666-4666-8666-666666666666',
      '77777777-7777-4777-8777-777777777777',
    ],
  });

  assert.equal(result.success, true);
  assert.equal((result as any).scope.subjectsConfigured, 2);
  assert.equal((result as any).scope.markEntryWindowsConfigured, 4);
  assert.match(writes[1].sql, /INSERT INTO exam_assessments/i);
  assert.equal(writes[1].params[0], '11111111-1111-4111-8111-111111111111');
  assert.equal(writes[1].params[1], '33333333-3333-4333-8333-333333333333');
  assert.deepEqual(writes[1].params[2], [
    '44444444-4444-4444-8444-444444444444',
    '55555555-5555-4555-8555-555555555555',
  ]);
  assert.match(writes[2].sql, /INSERT INTO exam_mark_entry_windows/i);
  assert.deepEqual(writes[2].params[3], [
    '66666666-6666-4666-8666-666666666666',
    '77777777-7777-4777-8777-777777777777',
  ]);
  assert.equal(workflowCalls[0].payload.subjectsConfigured, 2);
  assert.equal(workflowCalls[0].payload.markEntryWindowsConfigured, 4);
});

test('ExamsManagerCommandService configures an existing exam setup inside the current tenant', async () => {
  const writes: Array<{ sql: string; params: unknown[] }> = [];
  const workflowCalls: any[] = [];
  const service = new ExamsManagerCommandService(
    {
      getStore: () => ({ tenant_id: 'tenant-a', user_id: '11111111-1111-4111-8111-111111111111' }),
    } as never,
    {} as never,
    {
      writeSql: async (sql: string, params: unknown[]) => {
        writes.push({ sql, params });
        return {
          rows: [{
            id: params[1],
            name: params[2],
            starts_on: params[3],
            ends_on: params[4],
            status: params[5],
            updated_at: '2026-07-13T00:00:00.000Z',
          }],
          rowCount: 1,
        };
      },
      recordWorkflowAction: async (input: any) => {
        workflowCalls.push(input);
        return { id: 'workflow-1', ...input };
      },
      requiredText: (value: unknown, label: string) => {
        const text = String(value ?? '').trim();
        if (!text) throw new Error(`${label} is required`);
        return text;
      },
    } as never,
  );

  const result = await service.configureExamSetup('22222222-2222-4222-8222-222222222222', {
    name: 'Term 1 Midterm',
    starts_on: '2026-02-02',
    ends_on: '2026-02-06',
    status: 'submitted',
  });

  assert.equal(result.success, true);
  assert.match(writes[0].sql, /UPDATE exam_series/i);
  assert.match(writes[0].sql, /WHERE tenant_id = \$1\s+AND id = \$2::uuid/i);
  assert.equal(writes[0].params[0], 'tenant-a');
  assert.equal(writes[0].params[1], '22222222-2222-4222-8222-222222222222');
  assert.equal(writes[0].params[2], 'Term 1 Midterm');
  assert.equal(writes[0].params[5], 'submitted');
  assert.equal(workflowCalls.length, 1);
  assert.equal(workflowCalls[0].eventType, 'exams.exam-setup.configured');
  assert.equal(workflowCalls[0].entityType, 'exam_series');
  assert.equal(workflowCalls[0].entityId, '22222222-2222-4222-8222-222222222222');
});

test('ExamsManagerCommandService returns tenant-scoped exam setup options for human dropdowns', async () => {
  const reads: Array<{ sql: string; params: unknown[] }> = [];
  const service = new ExamsManagerCommandService(
    {
      getStore: () => ({ tenant_id: 'tenant-a', user_id: '11111111-1111-4111-8111-111111111111' }),
    } as never,
    {} as never,
    {
      readSql: async (sql: string, params: unknown[]) => {
        reads.push({ sql, params });
        if (/FROM academic_terms/.test(sql)) {
          return { rows: [{ id: 'term-a', label: 'Term 2 2026', status: 'active' }], rowCount: 1 };
        }
        if (/FROM subjects/.test(sql)) {
          return { rows: [{ id: 'subject-a', label: 'Mathematics', code: 'MATH' }], rowCount: 1 };
        }
        if (/FROM class_sections/.test(sql)) {
          return { rows: [{ id: 'class-a', label: 'Form 2 East' }], rowCount: 1 };
        }
        if (/FROM academics_grading_systems/.test(sql)) {
          return {
            rows: [{
              id: 'grading-a',
              label: 'Kenya CBC Performance Levels',
              description: 'Exceeding, Meeting, Approaching, Below expectation',
              status: 'active',
            }],
            rowCount: 1,
          };
        }
        if (/FROM staff_profiles/.test(sql)) {
          return {
            rows: [{
              id: 'staff-a',
              user_id: 'teacher-user-a',
              label: 'Teacher A',
              staff_number: 'T-001',
              status: 'active',
            }],
            rowCount: 1,
          };
        }
        if (/FROM exam_series/.test(sql)) {
          return {
            rows: [{
              id: 'series-a',
              label: 'Term 2 Opener',
              status: 'draft',
            }],
            rowCount: 1,
          };
        }
        if (/FROM exam_assessments/.test(sql)) {
          return {
            rows: [{
              id: 'assessment-a',
              exam_series_id: 'series-a',
              label: 'Mathematics Paper 1',
              subject_id: 'subject-a',
            }],
            rowCount: 1,
          };
        }
        return { rows: [], rowCount: 0 };
      },
      writeSql: async () => ({ rows: [], rowCount: 0 }),
      recordWorkflowAction: async (input: any) => ({ id: 'workflow-1', ...input }),
    } as never,
  );

  const result = await service.getExamSetupOptions();

  assert.deepEqual(result.terms, [{ id: 'term-a', label: 'Term 2 2026', status: 'active' }]);
  assert.deepEqual(result.subjects, [{ id: 'subject-a', label: 'Mathematics', code: 'MATH' }]);
  assert.deepEqual(result.classes, [{ id: 'class-a', label: 'Form 2 East' }]);
  assert.deepEqual((result as any).gradingSystems, [{
    id: 'grading-a',
    label: 'Kenya CBC Performance Levels',
    description: 'Exceeding, Meeting, Approaching, Below expectation',
    status: 'active',
  }]);
  assert.deepEqual(result.staff, [{
    id: 'staff-a',
    user_id: 'teacher-user-a',
    label: 'Teacher A',
    staff_number: 'T-001',
    status: 'active',
  }]);
  assert.deepEqual((result as any).examSeries, [{ id: 'series-a', label: 'Term 2 Opener', status: 'draft' }]);
  assert.deepEqual((result as any).assessments, [{
    id: 'assessment-a',
    exam_series_id: 'series-a',
    label: 'Mathematics Paper 1',
    subject_id: 'subject-a',
  }]);
  assert.equal(reads.length, 7);
  assert.ok(reads.every((read) => read.params[0] === 'tenant-a'));
});

test('ExamsManagerCommandService creates a durable tenant-scoped timetable slot and invigilator', async () => {
  const writes: Array<{ sql: string; params: unknown[] }> = [];
  const workflowCalls: any[] = [];
  const service = new ExamsManagerCommandService(
    {
      getStore: () => ({ tenant_id: 'tenant-a', user_id: '11111111-1111-4111-8111-111111111111' }),
    } as never,
    {} as never,
    {
      writeSql: async (sql: string, params: unknown[]) => {
        writes.push({ sql, params });
        if (/INSERT INTO exam_timetable_slots/i.test(sql)) {
          return {
            rows: [{
              id: '44444444-4444-4444-8444-444444444444',
              exam_series_id: params[1],
              assessment_id: params[2],
              date: params[3],
              start_time: params[4],
              end_time: params[5],
              room_name: params[6],
              status: 'scheduled',
            }],
            rowCount: 1,
          };
        }
        if (/INSERT INTO exam_invigilators/i.test(sql)) {
          return {
            rows: [{
              id: '55555555-5555-4555-8555-555555555555',
              staff_user_id: params[2],
              role: params[3],
              status: 'assigned',
            }],
            rowCount: 1,
          };
        }
        return { rows: [], rowCount: 0 };
      },
      recordWorkflowAction: async (input: any) => {
        workflowCalls.push(input);
        return { id: 'workflow-1', ...input };
      },
      requiredText: (value: unknown, label: string) => {
        const text = String(value ?? '').trim();
        if (!text) throw new Error(`${label} is required`);
        return text;
      },
    } as never,
  );

  const result = await (service as any).createExamTimetableSlot({
    exam_series_id: '22222222-2222-4222-8222-222222222222',
    assessment_id: '33333333-3333-4333-8333-333333333333',
    date: '2026-07-20',
    start_time: '08:00',
    end_time: '10:00',
    room_name: 'Main Hall',
    staff_user_id: '66666666-6666-4666-8666-666666666666',
    invigilator_role: 'chief invigilator',
  });

  assert.equal(result.success, true);
  assert.equal(result.slot.id, '44444444-4444-4444-8444-444444444444');
  assert.equal(result.invigilator.staff_user_id, '66666666-6666-4666-8666-666666666666');
  assert.match(writes[0].sql, /INSERT INTO exam_timetable_slots/i);
  assert.match(writes[0].sql, /tenant_id,\s*exam_series_id,\s*assessment_id,\s*date,\s*start_time,\s*end_time,\s*room_name,\s*status/i);
  assert.equal(writes[0].params[0], 'tenant-a');
  assert.equal(writes[0].params[1], '22222222-2222-4222-8222-222222222222');
  assert.equal(writes[0].params[2], '33333333-3333-4333-8333-333333333333');
  assert.equal(writes[0].params[3], '2026-07-20');
  assert.equal(writes[0].params[4], '08:00');
  assert.equal(writes[0].params[5], '10:00');
  assert.equal(writes[0].params[6], 'Main Hall');
  assert.match(writes[1].sql, /INSERT INTO exam_invigilators/i);
  assert.equal(writes[1].params[0], 'tenant-a');
  assert.equal(writes[1].params[1], '44444444-4444-4444-8444-444444444444');
  assert.equal(writes[1].params[2], '66666666-6666-4666-8666-666666666666');
  assert.equal(writes[1].params[3], 'chief invigilator');
  assert.equal(workflowCalls.length, 1);
  assert.equal(workflowCalls[0].tenantId, 'tenant-a');
  assert.equal(workflowCalls[0].eventType, 'exams.exam-timetable.created');
  assert.equal(workflowCalls[0].entityType, 'exam_timetable_slot');
  assert.equal(workflowCalls[0].entityId, '44444444-4444-4444-8444-444444444444');
});

test('ExamsManagerCommandService refuses timetable slots whose end time is not after start time', async () => {
  const writes: Array<{ sql: string; params: unknown[] }> = [];
  const service = new ExamsManagerCommandService(
    {
      getStore: () => ({ tenant_id: 'tenant-a', user_id: '11111111-1111-4111-8111-111111111111' }),
    } as never,
    {} as never,
    {
      writeSql: async (sql: string, params: unknown[]) => {
        writes.push({ sql, params });
        return { rows: [], rowCount: 0 };
      },
      recordWorkflowAction: async (input: any) => ({ id: 'workflow-1', ...input }),
      requiredText: (value: unknown, label: string) => {
        const text = String(value ?? '').trim();
        if (!text) throw new Error(`${label} is required`);
        return text;
      },
    } as never,
  );

  await assert.rejects(
    () => (service as any).createExamTimetableSlot({
      exam_series_id: '22222222-2222-4222-8222-222222222222',
      date: '2026-07-20',
      start_time: '10:00',
      end_time: '08:00',
      room_name: 'Main Hall',
    }),
    /End time must be after start time/i,
  );

  assert.equal(writes.length, 0);
});

test('ExamsManagerCommandService rejects unconfigured live Zeraki sync without fake success', async () => {
  const workflowCalls: any[] = [];
  const service = new ExamsManagerCommandService(
    {
      getStore: () => ({ tenant_id: 'tenant-a', user_id: '11111111-1111-4111-8111-111111111111' }),
    } as never,
    {} as never,
    {
      recordWorkflowAction: async (input: any) => {
        workflowCalls.push(input);
        return { id: 'workflow-1', ...input };
      },
    } as never,
  );

  await assert.rejects(
    () => (service as any).requestZerakiSync({ requested_action: 'zeraki_sync' }),
    /Zeraki live sync is not configured/i,
  );

  assert.equal(workflowCalls.length, 1);
  assert.equal(workflowCalls[0].tenantId, 'tenant-a');
  assert.equal(workflowCalls[0].eventType, 'exams.zeraki-sync.unconfigured');
  assert.equal(workflowCalls[0].entityType, 'exam_import_provider');
  assert.equal(workflowCalls[0].payload.provider, 'zeraki');
});

test('ExamsManagerCommandService maps moderation approve to reviewed mark status', async () => {
  const writes: Array<{ sql: string; params: unknown[] }> = [];
  const workflowCalls: any[] = [];
  const service = new ExamsManagerCommandService(
    {
      getStore: () => ({ tenant_id: 'tenant-a', user_id: '11111111-1111-4111-8111-111111111111' }),
    } as never,
    {} as never,
    {
      writeSql: async (sql: string, params: unknown[]) => {
        writes.push({ sql, params });
        return { rows: [{ id: params[1], status: params[2] }], rowCount: 1 };
      },
      recordWorkflowAction: async (input: any) => {
        workflowCalls.push(input);
        return { id: 'workflow-1', ...input };
      },
    } as never,
  );

  const result = await service.approveModeration('33333333-3333-4333-8333-333333333333', {});

  assert.equal(result.success, true);
  assert.equal(writes[0].params[0], 'tenant-a');
  assert.equal(writes[0].params[2], 'reviewed');
  assert.match(writes[0].sql, /UPDATE exam_marks/i);
  assert.equal(workflowCalls[0].eventType, 'exams.moderation.approved');
  assert.equal(workflowCalls[0].payload.status, 'reviewed');
});

test('ExamsManagerCommandService maps moderation rejection to draft and stores the return reason', async () => {
  const writes: Array<{ sql: string; params: unknown[] }> = [];
  const workflowCalls: any[] = [];
  const service = new ExamsManagerCommandService(
    {
      getStore: () => ({ tenant_id: 'tenant-a', user_id: '11111111-1111-4111-8111-111111111111' }),
    } as never,
    {} as never,
    {
      writeSql: async (sql: string, params: unknown[]) => {
        writes.push({ sql, params });
        return { rows: [{ id: params[1], status: params[2] }], rowCount: 1 };
      },
      recordWorkflowAction: async (input: any) => {
        workflowCalls.push(input);
        return { id: 'workflow-1', ...input };
      },
    } as never,
  );

  const result = await service.rejectModeration('33333333-3333-4333-8333-333333333333', { reason: 'Missing CAT marks' });

  assert.equal(result.success, true);
  assert.equal(writes[0].params[2], 'draft');
  assert.equal(writes[0].params[3], 'Missing CAT marks');
  assert.match(writes[0].sql, /remarks = COALESCE/i);
  assert.equal(workflowCalls[0].eventType, 'exams.moderation.rejected');
  assert.equal(workflowCalls[0].payload.status, 'draft');
});

test('ExamsManagerCommandService generates durable tenant-scoped report cards from moderated marks', async () => {
  const writes: Array<{ sql: string; params: unknown[] }> = [];
  const workflowCalls: any[] = [];
  const service = new ExamsManagerCommandService(
    {
      getStore: () => ({ tenant_id: 'tenant-a', user_id: '11111111-1111-4111-8111-111111111111' }),
    } as never,
    {} as never,
    {
      writeSql: async (sql: string, params: unknown[]) => {
        writes.push({ sql, params });
        if (/INSERT INTO student_report_cards/i.test(sql)) {
          return {
            rows: [
              { id: 'card-1', student_id: 'student-1', status: 'approved' },
              { id: 'card-2', student_id: 'student-2', status: 'approved' },
            ],
            rowCount: 2,
          };
        }
        if (/UPDATE exam_series/i.test(sql)) {
          return { rows: [{ id: params[1], status: 'locked' }], rowCount: 1 };
        }
        return { rows: [], rowCount: 0 };
      },
      recordWorkflowAction: async (input: any) => {
        workflowCalls.push(input);
        return { id: 'workflow-1', ...input };
      },
    } as never,
  );

  const result = await service.generateReportCards('22222222-2222-4222-8222-222222222222', { note: 'Term reports' });

  assert.equal(result.success, true);
  assert.equal(result.generated_count, 2);
  assert.match(writes[0].sql, /INSERT INTO student_report_cards/i);
  assert.match(writes[0].sql, /exam_marks/i);
  assert.equal(writes[0].params[0], 'tenant-a');
  assert.equal(writes[0].params[1], '22222222-2222-4222-8222-222222222222');
  assert.match(writes[1].sql, /UPDATE exam_series/i);
  assert.equal(workflowCalls.length, 1);
  assert.equal(workflowCalls[0].eventType, 'exams.report-card.generated');
  assert.equal(workflowCalls[0].entityId, '22222222-2222-4222-8222-222222222222');
  assert.equal(workflowCalls[0].payload.generated_count, 2);
});

test('ExamsManagerCommandService publishes approved report cards and marks the exam series published', async () => {
  const writes: Array<{ sql: string; params: unknown[] }> = [];
  const workflowCalls: any[] = [];
  const service = new ExamsManagerCommandService(
    {
      getStore: () => ({ tenant_id: 'tenant-a', user_id: '11111111-1111-4111-8111-111111111111' }),
    } as never,
    {} as never,
    {
      writeSql: async (sql: string, params: unknown[]) => {
        writes.push({ sql, params });
        if (/UPDATE student_report_cards/i.test(sql)) {
          return {
            rows: [
              { id: 'card-1', student_id: 'student-1', status: 'published' },
              { id: 'card-2', student_id: 'student-2', status: 'published' },
            ],
            rowCount: 2,
          };
        }
        if (/UPDATE exam_series/i.test(sql)) {
          return { rows: [{ id: params[1], status: 'published' }], rowCount: 1 };
        }
        return { rows: [], rowCount: 0 };
      },
      recordWorkflowAction: async (input: any) => {
        workflowCalls.push(input);
        return { id: 'workflow-1', ...input };
      },
      notifyRoles: async () => undefined,
    } as never,
  );

  const result = await service.publishResults('22222222-2222-4222-8222-222222222222', { notes: 'Release to portals' });

  assert.equal(result.success, true);
  assert.equal(result.published_count, 2);
  assert.match(writes[0].sql, /UPDATE student_report_cards/i);
  assert.match(writes[0].sql, /status = 'published'/i);
  assert.equal(writes[0].params[0], 'tenant-a');
  assert.equal(writes[0].params[1], '22222222-2222-4222-8222-222222222222');
  assert.match(writes[1].sql, /UPDATE exam_series/i);
  assert.match(writes[1].sql, /status = 'published'/i);
  assert.equal(workflowCalls.length, 1);
  assert.equal(workflowCalls[0].eventType, 'exams.publishing.published');
  assert.equal(workflowCalls[0].payload.published_count, 2);
});

test('ExamsManagerCommandService refuses fake publication when no report cards are ready', async () => {
  const writes: Array<{ sql: string; params: unknown[] }> = [];
  const workflowCalls: any[] = [];
  const service = new ExamsManagerCommandService(
    {
      getStore: () => ({ tenant_id: 'tenant-a', user_id: '11111111-1111-4111-8111-111111111111' }),
    } as never,
    {} as never,
    {
      writeSql: async (sql: string, params: unknown[]) => {
        writes.push({ sql, params });
        return { rows: [], rowCount: 0 };
      },
      recordWorkflowAction: async (input: any) => {
        workflowCalls.push(input);
        return { id: 'workflow-1', ...input };
      },
    } as never,
  );

  await assert.rejects(
    service.publishResults('22222222-2222-4222-8222-222222222222', {}),
    /No approved report cards are ready for publication/i,
  );

  assert.equal(writes.length, 1);
  assert.equal(workflowCalls.length, 0);
});
