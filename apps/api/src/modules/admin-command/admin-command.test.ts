import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import 'reflect-metadata';
import { firstValueFrom, of } from 'rxjs';

import { PERMISSIONS_KEY, ROLES_KEY } from '../../auth/auth.constants';
import { MODULE_ACCESS_KEY } from '../module-access/module-access.decorator';
import { AdminCommandController } from './admin-command.controller';
import { AdminCommandOperationsService } from './admin-command-operations.service';
import { AdminCommandSchemaService } from './admin-command-schema.service';
import { AdminCommandService } from './admin-command.service';
import { AccountantCommandService } from './accountant-command.service';
import { BoardingMasterCommandService } from './boarding-master-command.service';
import { ClassTeacherCommandService } from './class-teacher-command.service';
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
import { LaboratoryTechnicianCommandService } from './laboratory-technician-command.service';
import { NurseCommandService } from './nurse-command.service';
import { ParentCommandService } from './parent-command.service';
import { ProcurementOfficerCommandService } from './procurement-officer-command.service';
import { StudentCommandService } from './student-command.service';
import { TransportManagerCommandService } from './transport-manager-command.service';
import { ExamsManagerCommandService } from './exams-manager-command.service';
import { TeacherCommandService } from './teacher-command.service';
import { DeanAcademicsCommandService } from './dean-academics-command.service';
import { DeanAcademicsCommandController } from './dean-academics-command.controller';
import { DeputyCommandService } from './deputy-command.service';
import { DeputyCommandController } from './deputy-command.controller';
import { AdmissionsCommandService } from './admissions-command.service';
import { AdmissionsCommandRepository } from './repositories/admissions-command.repository';

test('live role command reads surface database failures instead of fabricating empty school data', async () => {
  const requestContext = {
    getStore: () => ({
      tenant_id: 'tenant-a',
      user_id: '11111111-1111-4111-8111-111111111111',
    }),
  };
  const prisma = {
    query: async () => {
      throw new Error('database unavailable');
    },
  };
  const operations = {};
  const reads: Array<[string, () => Promise<unknown>]> = [
    ['boarding', () => new BoardingMasterCommandService(requestContext as never, prisma as never, operations as never).getHostels()],
    ['class teacher', () => new ClassTeacherCommandService(requestContext as never, prisma as never, operations as never).getMyClass()],
    ['counselling', () => new GuidanceCounsellingCommandService(requestContext as never, prisma as never, operations as never).getSessions()],
    ['ICT', () => new IctManagerCommandService(requestContext as never, prisma as never, operations as never).getAssets()],
    ['laboratory', () => new LaboratoryTechnicianCommandService(requestContext as never, prisma as never, operations as never).getLabInventory()],
    ['library', () => new LibrarianCommandService(requestContext as never, prisma as never, operations as never).getBooks()],
    ['nurse', () => new NurseCommandService(requestContext as never, prisma as never, operations as never).getVisits()],
    ['secretary', () => new SecretaryCommandService(requestContext as never, prisma as never, operations as never).getVisitors()],
    ['security', () => new SecurityOfficerCommandService(requestContext as never, prisma as never, operations as never).getVisitors()],
    ['transport', () => new TransportManagerCommandService(requestContext as never, prisma as never, operations as never).getVehicles()],
  ];

  for (const [role, read] of reads) {
    await assert.rejects(read, /database unavailable/, `${role} reads must not hide database failures`);
  }
});

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

  assert.match(
    schemaSql,
    /ALTER TABLE workflow_events ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending'/,
  );
  assert.match(
    schemaSql,
    /CREATE INDEX IF NOT EXISTS idx_workflow_events_status\s+ON workflow_events \(tenant_id, status\)/,
  );
});

test('AdminCommandRepository builds principal teaching schedule only from the authenticated actor assignments', async () => {
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

  const actorUserId = '11111111-1111-4111-8111-111111111111';
  const result = await repository.getPrincipalTeachingSchedule('tenant-a', actorUserId);

  assert.equal(queries.length, 2);
  assert.match(queries[0].sql, /WHERE lesson\.tenant_id = \$1/);
  assert.match(queries[1].sql, /WHERE lesson\.tenant_id = \$1/);
  assert.match(queries[0].sql, /staff\.user_id = \$2::uuid/);
  assert.match(queries[1].sql, /staff\.user_id = \$2::uuid/);
  assert.match(queries[0].sql, /INNER JOIN tenant_memberships membership/);
  assert.doesNotMatch(queries[0].sql, /full_name ILIKE '%principal%'/);
  assert.deepEqual(queries[0].params, ['tenant-a', actorUserId]);
  assert.deepEqual(queries[1].params, ['tenant-a', actorUserId]);
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

test('AdminCommandRepository keeps fresh-school finance, discipline, and activity trends empty', async () => {
  const queries: Array<{ sql: string; params: unknown[] }> = [];
  const repository = new AdminCommandRepository({
    query: async (sql: string, params: unknown[]) => {
      queries.push({ sql, params });
      return { rows: [], rowCount: 0 };
    },
  } as never);

  const [finance, discipline, principal] = await Promise.all([
    repository.getFinanceOverview('tenant-a'),
    repository.getDisciplineOverview('tenant-a'),
    repository.getPrincipalOverview('tenant-a'),
  ]);

  assert.deepEqual(finance.collectionData, []);
  assert.deepEqual(discipline.incidentTrend, []);
  assert.deepEqual(principal.recentActivity, []);
  assert.equal(
    JSON.stringify({ finance, discipline, principal }).includes('Welcome to the Principal Dashboard'),
    false,
  );
  assert.ok(queries.length > 0);
  assert.ok(queries.every((query) => query.params[0] === 'tenant-a'));
});

test('AdminCommandRepository reads Principal visitor, health, and audit oversight from tenant-scoped canonical records', async () => {
  const queries: Array<{ sql: string; params: unknown[] }> = [];
  const repository = new AdminCommandRepository({
    query: async (sql: string, params: unknown[]) => {
      queries.push({ sql, params });
      if (/AS currently_on_premises/.test(sql)) {
        return { rows: [{ checked_in_today: 3, currently_on_premises: 1, checked_out_today: 2, flagged: 1 }], rowCount: 1 };
      }
      if (/FROM visitors_logs visitor/.test(sql)) {
        return {
          rows: [{
            id: 'visitor-1',
            name: 'Jane Guest',
            purpose: 'Parent meeting',
            host: 'Teacher A',
            checked_in_at: '2026-08-22 08:00:00+03',
            checked_out_at: null,
            status: 'Active',
          }],
          rowCount: 1,
        };
      }
      if (/AS visits_today/.test(sql)) {
        return {
          rows: [{
            visits_today: 4,
            open_cases: 1,
            referred_today: 1,
            low_stock_medicines: 2,
            out_of_stock_medicines: 1,
            expiring_soon: 1,
          }],
          rowCount: 1,
        };
      }
      if (/medicine_name[\s\S]*Out of stock/.test(sql)) {
        return {
          rows: [{
            id: 'medicine-1',
            medicine_name: 'Paracetamol',
            quantity_available: '0',
            reorder_level: '20',
            earliest_expiry: '2026-10-01',
            status: 'Out of stock',
          }],
          rowCount: 1,
        };
      }
      if (/AS sensitive_changes/.test(sql)) {
        return { rows: [{ actions_today: 8, sensitive_changes: 2, failed_actions: 1 }], rowCount: 1 };
      }
      if (/FROM audit_logs audit/.test(sql)) {
        return {
          rows: [{
            id: 'audit-1',
            action: 'approval.rejected',
            actor: 'Principal A',
            resource_type: 'approval_request',
            created_at: '2026-08-22 09:00:00+03',
            result: 'Rejected',
          }],
          rowCount: 1,
        };
      }
      return { rows: [], rowCount: 0 };
    },
  } as never);

  const [visitors, health, audit] = await Promise.all([
    repository.getPrincipalVisitorsOverview('tenant-a'),
    repository.getPrincipalHealthOverview('tenant-a'),
    repository.getPrincipalAuditOverview('tenant-a'),
  ]);

  assert.equal(visitors.metrics.currentlyOnPremises, 1);
  assert.equal(visitors.visitors[0]?.name, 'Jane Guest');
  assert.equal(health.metrics.outOfStockMedicines, 1);
  assert.equal(health.stockAlerts[0]?.medicine, 'Paracetamol');
  assert.equal(audit.metrics.sensitiveChanges, 2);
  assert.equal(audit.events[0]?.result, 'Rejected');
  assert.ok(queries.every((query) => query.params[0] === 'tenant-a'));
  assert.ok(queries.every((query) => !/confidential_notes|diagnosis_summary|phone_number|id_number/.test(query.sql)));
  assert.ok(queries.some((query) => /membership\.tenant_id = visitor\.tenant_id/.test(query.sql)));
  assert.ok(queries.some((query) => /membership\.tenant_id = audit\.tenant_id/.test(query.sql)));
});

test('AdminCommandRepository derives principal finance metrics from canonical fee records without fabricated percentages', async () => {
  const queries: Array<{ sql: string; params: unknown[] }> = [];
  const repository = new AdminCommandRepository({
    query: async (sql: string, params: unknown[]) => {
      queries.push({ sql, params });
      if (/AS collections_today_minor/.test(sql)) {
        return { rows: [{ collections_today_minor: '250000', outstanding_balance_minor: '875000' }], rowCount: 1 };
      }
      if (/FROM dashboard_approval_requests approval/.test(sql)) {
        return {
          rows: [{
            id: 'approval-1',
            student: 'Amina Otieno',
            class: 'Grade 8 East',
            amount_minor: '15000',
            reason: 'Scholarship',
            date: '2026-08-22T08:00:00.000Z',
          }],
          rowCount: 1,
        };
      }
      return {
        rows: [
          { label: '27 Jul', total_minor: '50000' },
          { label: '03 Aug', total_minor: '100000' },
        ],
        rowCount: 2,
      };
    },
  } as never);

  const result = await repository.getFinanceOverview('tenant-a');

  assert.equal(result.collectionsToday, 'KES 2,500');
  assert.equal(result.outstandingInvoices, 'KES 8,750');
  assert.deepEqual(result.collectionData.map((row) => row.value), [50, 100]);
  assert.equal(result.pendingWaivers[0]?.amount, 'KES 150');
  assert.ok(queries.every((query) => query.params[0] === 'tenant-a'));
  assert.ok(queries.some((query) => /FROM manual_fee_payments payment/.test(query.sql)));
  assert.ok(queries.some((query) => /NULLIF\(invoice\.metadata ->> 'student_id'/.test(query.sql)));
  assert.ok(queries.some((query) => /FROM dashboard_approval_requests approval/.test(query.sql)));
  assert.ok(queries.every((query) => !/tenant_finance_summary|tenant_pending_waivers/.test(query.sql)));
});

test('AdminCommandRepository reconciles live and offline attendance without invented history', async () => {
  const queries: Array<{ sql: string; params: unknown[] }> = [];
  const repository = new AdminCommandRepository({
    query: async (sql: string, params: unknown[]) => {
      queries.push({ sql, params });
      if (/AS chronic_absenteeism/.test(sql)) {
        return { rows: [{ present_today: 21, absent_today: 3, late_today: 2, chronic_absenteeism: 8 }], rowCount: 1 };
      }
      if (/attendance\.notes AS reason/.test(sql)) {
        return {
          rows: [{ id: 'absence-1', student_id: 'student-1', student_name: 'Amina Otieno', admission_number: 'ADM-1', date: '2026-08-22', status: 'excused', reason: 'Clinic visit' }],
          rowCount: 1,
        };
      }
      if (/ORDER BY s\.first_name ASC/.test(sql)) {
        return { rows: [{ id: 'student-1', name: 'Amina Otieno', admission_number: 'ADM-1', class: 'Grade 8 East' }], rowCount: 1 };
      }
      return { rows: [], rowCount: 0 };
    },
  } as never);

  const result = await repository.getAttendanceOverview('tenant-a');

  assert.equal(result.present, 21);
  assert.equal(result.absent, 3);
  assert.equal(result.late, 2);
  assert.equal(result.chronicAbsenteeism, 8);
  assert.deepEqual(result.attendanceTrend, []);
  assert.equal(result.recentAbsences[0]?.status, 'excused');
  assert.ok(queries.every((query) => query.params[0] === 'tenant-a'));
  assert.ok(queries.some((query) => /FROM attendance_records record/.test(query.sql) && /FROM academics_attendance live/.test(query.sql)));
  assert.ok(queries.every((query) => !/s\.school_id|LEFT JOIN classes/.test(query.sql)));
  assert.equal(JSON.stringify(result).includes('Historical'), false);
});

test('AdminCommandRepository uses real communication history and atomically queues broadcasts', async () => {
  const reads: Array<{ sql: string; params: unknown[] }> = [];
  const repository = new AdminCommandRepository({
    query: async (sql: string, params: unknown[]) => {
      reads.push({ sql, params });
      if (/AS provider_accepted_today/.test(sql)) {
        return {
          rows: [{
            provider_accepted_today: 12,
            failed_messages: 1,
            pending_messages: 4,
            delivery_unknown: 2,
          }],
          rowCount: 1,
        };
      }
      if (/date_trunc\('day', created_at\)/.test(sql)) {
        return { rows: [{ label: 'Fri', value: 7 }, { label: 'Sat', value: 5 }], rowCount: 2 };
      }
      if (/FROM workflow_events event/.test(sql)) {
        return { rows: [{ id: 'event-1', title: 'Broadcast to parents', body: 'School closes at noon', status: 'pending', audience: 'parents', channels: ['sms'], time: '2026-08-22 10:00' }], rowCount: 1 };
      }
      return {
        rows: [{
          id: 'event-2',
          title: 'Broadcast to parents',
          status: 'pending',
          created_at: '2026-08-22T10:00:00.000Z',
          sms_recipient_count: 3,
          in_app_recipient_count: 2,
        }],
        rowCount: 1,
      };
    },
  } as never);

  const overview = await repository.getCommunicationOverview('tenant-a');
  const broadcast = await repository.createCommunicationBroadcast({
    tenant_id: 'tenant-a',
    user_id: '11111111-1111-4111-8111-111111111111',
    audience: 'parents',
    message: 'School closes at noon',
    channels: ['sms', 'in_app'],
  });

  assert.equal(overview.smsBalance, null);
  assert.equal(overview.providerAcceptedToday, 12);
  assert.equal(overview.deliveryUnknown, 2);
  assert.deepEqual(overview.communicationTrend, [{ label: 'Fri', value: 7 }, { label: 'Sat', value: 5 }]);
  assert.equal(overview.recentBroadcasts[0]?.id, 'event-1');
  assert.equal(broadcast.smsRecipientCount, 3);
  assert.equal(broadcast.inAppRecipientCount, 2);
  const broadcastWrite = reads.at(-1)!;
  assert.match(broadcastWrite.sql, /WITH sms_recipients AS/);
  assert.match(broadcastWrite.sql, /INSERT INTO workflow_events/);
  assert.match(broadcastWrite.sql, /INSERT INTO communication_sms_outbox/);
  assert.match(broadcastWrite.sql, /INSERT INTO notifications/);
  assert.match(broadcastWrite.sql, /JOIN tenant_memberships membership/);
  assert.match(broadcastWrite.sql, /lower\(membership\.status::text\) = 'active'/);
  assert.doesNotMatch(broadcastWrite.sql, /communication_broadcasts|FROM guardians/);
  assert.equal(broadcastWrite.params[0], 'tenant-a');
  assert.equal(broadcastWrite.params[6], JSON.stringify(['principal']));
  const overviewRead = reads.find((read) => /AS provider_accepted_today/.test(read.sql))!;
  assert.match(overviewRead.sql, /lower\(status\) = 'accepted'/);
  assert.match(overviewRead.sql, /provider_accepted_at IS NOT NULL/);
  assert.match(overviewRead.sql, /lower\(status\) IN \('pending', 'queued', 'processing'\)/);
  assert.match(overviewRead.sql, /lower\(status\) = 'deliveryunknown'/);
  assert.doesNotMatch(overviewRead.sql, /lower\(status\) = 'sent'/);
});

test('AdminCommandService rejects a Principal broadcast when no tenant-scoped recipient exists', async () => {
  let auditCalled = false;
  const service = new AdminCommandService(
    {
      getStore: () => ({
        tenant_id: 'tenant-a',
        user_id: '11111111-1111-4111-8111-111111111111',
      }),
    } as never,
    {
      createCommunicationBroadcast: async () => ({
        broadcast: undefined,
        event: undefined,
        smsRecipientCount: 0,
        inAppRecipientCount: 0,
      }),
      appendAuditLog: async () => {
        auditCalled = true;
      },
    } as never,
    {} as never,
  );

  await assert.rejects(
    () => service.createCommunicationBroadcast({
      audience: 'parents',
      message: 'School closes at noon',
      channels: ['in_app'],
    }),
    (error: unknown) => error instanceof BadRequestException
      && /No active tenant-scoped recipients/.test(error.message),
  );
  assert.equal(auditCalled, false);
});

test('AdminCommandRepository upserts valid tenant attendance and propagates database failures', async () => {
  const writes: Array<{ sql: string; params: unknown[] }> = [];
  const repository = new AdminCommandRepository({
    query: async (sql: string, params: unknown[]) => {
      writes.push({ sql, params });
      return { rows: [{ id: 'attendance-1', status: params[3], notes: params[4] }], rowCount: 1 };
    },
  } as never);

  const attendance = await repository.logAbsence({
    tenant_id: 'tenant-a',
    user_id: '11111111-1111-4111-8111-111111111111',
    student_id: '22222222-2222-4222-8222-222222222222',
    date: '2026-08-22',
    reason: 'Clinic visit',
    is_excused: true,
  });

  assert.equal(attendance.status, 'excused');
  assert.equal(attendance.notes, 'Clinic visit');
  assert.match(writes[0].sql, /ON CONFLICT \(tenant_id, student_id, attendance_date\)/);
  assert.match(writes[0].sql, /student\.tenant_id = \$1/);
  assert.equal(writes[0].params[0], 'tenant-a');

  const failingRepository = new AdminCommandRepository({
    query: async () => {
      const error = new Error('principal database unavailable') as Error & { code: string };
      error.code = '42P01';
      throw error;
    },
  } as never);
  await assert.rejects(
    () => failingRepository.getStudentsOverview('tenant-a'),
    /principal database unavailable/,
  );
  await assert.rejects(
    () => failingRepository.getPrincipalOverviewSnapshot('tenant-a'),
    /principal database unavailable/,
  );
});

test('Leadership attendance summaries tolerate legacy text and date column variants', async () => {
  const principalQueries: string[] = [];
  const principalRepository = new AdminCommandRepository({
    query: async (sql: string) => {
      principalQueries.push(sql);
      return { rows: [{}], rowCount: 1 };
    },
  } as never);

  await principalRepository.getPrincipalOverviewSnapshot('tenant-a');
  assert.match(principalQueries[0]!, /attendance_date::text = CURRENT_DATE::text/);

  const deputyQueries: string[] = [];
  const deputyRepository = new DeputyCommandRepository({
    query: async (sql: string) => {
      deputyQueries.push(sql);
      return { rows: [{}], rowCount: 1 };
    },
  } as never);

  await deputyRepository.getDailyOperations('tenant-a');
  assert.match(deputyQueries[0]!, /attendance_date::text = CURRENT_DATE::text/);
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

test('Principal and Deputy class dashboards share the active tenant class-section projection', async () => {
  const principalQueries: Array<{ sql: string; params: unknown[] }> = [];
  const principalRepository = new AdminCommandRepository({
    query: async (sql: string, params: unknown[]) => {
      principalQueries.push({ sql, params });
      if (/FROM class_streams stream/.test(sql)) return { rows: [{ count: 3 }], rowCount: 1 };
      if (/COUNT\(DISTINCT sca\.student_id\)/.test(sql)) {
        return { rows: [{ label: 'Grade 9', value: 42 }], rowCount: 1 };
      }
      return { rows: [{ count: 2 }], rowCount: 1 };
    },
  } as never);
  const deputyQueries: Array<{ sql: string; params: unknown[] }> = [];
  const deputyRepository = new DeputyCommandRepository({
    query: async (sql: string, params: unknown[]) => {
      deputyQueries.push({ sql, params });
      if (/SELECT\s+section\.id::text/.test(sql)) {
        return {
          rows: [{
            id: 'class-1',
            name: 'Grade 9',
            classTeacher: 'Jane Wanjiku',
            studentCount: 42,
            status: 'Active',
          }],
          rowCount: 1,
        };
      }
      return { rows: [{ active_classes: 2 }], rowCount: 1 };
    },
  } as never);

  const principal = await principalRepository.getClassesOverview('tenant-a');
  const deputy = await deputyRepository.getClasses('tenant-a');

  assert.equal(principal.totalClasses, 2);
  assert.equal(principal.totalStreams, 3);
  assert.equal(principal.averageClassSize, 21);
  assert.equal(deputy.metrics.active_classes, 2);
  assert.equal(deputy.classesList[0]?.id, 'class-1');
  for (const query of [...principalQueries, ...deputyQueries]) {
    assert.deepEqual(query.params, ['tenant-a']);
    assert.match(query.sql, /tenant_id = \$1/);
  }
  const combinedSql = [...principalQueries, ...deputyQueries].map((query) => query.sql).join('\n');
  assert.match(combinedSql, /COALESCE\(section\.is_active, TRUE\) = TRUE/);
  assert.match(combinedSql, /COALESCE\(section\.status, 'active'\) = 'active'/);
  assert.match(combinedSql, /section\.archived_at IS NULL/);
  assert.match(combinedSql, /sca\.tenant_id = cs\.tenant_id/);
  assert.doesNotMatch(combinedSql, /FROM classes WHERE/);
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
  const service = new BoardingMasterCommandService(
    {
      getStore: () => ({ tenant_id: 'tenant-a', user_id: '11111111-1111-4111-8111-111111111111', role: 'boarding_master' }),
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
    guardian_id: '44444444-4444-4444-8444-444444444444',
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
  assert.match(writes[0].sql, /INSERT INTO workflow_events/);
  assert.match(writes[0].sql, /INSERT INTO audit_logs/);
  assert.match(writes[0].sql, /FROM inserted_leave leave/);
  assert.equal(writes[0].params[0], 'tenant-a');
  assert.equal(writes[0].params.at(-1), 'boarding_master');
});

test('BoardingMasterCommandService reads house-level roll calls from the canonical tenant-scoped check table', async () => {
  const queries: Array<{ sql: string; params: unknown[] }> = [];
  const service = new BoardingMasterCommandService(
    {
      getStore: () => ({ tenant_id: 'tenant-a', user_id: '11111111-1111-4111-8111-111111111111' }),
    } as never,
    {
      query: async (sql: string, params: unknown[]) => {
        queries.push({ sql, params });
        if (/AS checks_today/.test(sql)) {
          return {
            rows: [{ checks_today: 2, clear: 1, attention_required: 1 }],
            rowCount: 1,
          };
        }
        return {
          rows: [{
            id: '22222222-2222-4222-8222-222222222222',
            house_id: '33333333-3333-4333-8333-333333333333',
            house_name: 'Elgon House',
            checked_at: '2026-08-22 18:30:00+03',
            status: 'attention_required',
            notes: 'One learner is late returning.',
          }],
          rowCount: 1,
        };
      },
    } as never,
    {} as never,
  );

  const result = await service.getBoardingAttendance();

  assert.deepEqual(result, {
    metrics: { checks_today: 2, clear: 1, attention_required: 1 },
    boardingattendanceList: [{
      id: '22222222-2222-4222-8222-222222222222',
      house_id: '33333333-3333-4333-8333-333333333333',
      house_name: 'Elgon House',
      checked_at: '2026-08-22 18:30:00+03',
      status: 'attention_required',
      notes: 'One learner is late returning.',
    }],
  });
  assert.equal(queries.length, 2);
  assert.ok(queries.every((query) => query.params[0] === 'tenant-a'));
  assert.ok(queries.every((query) => /boarding_dormitory_checks/.test(query.sql)));
  assert.ok(queries.every((query) => !/boarding_attendance_logs/.test(query.sql)));
  const listQuery = queries.find((query) => /LEFT JOIN boarding_houses house/.test(query.sql));
  assert.ok(listQuery);
  assert.match(listQuery.sql, /house\.tenant_id = dormitory_check\.tenant_id/);
  assert.match(listQuery.sql, /dormitory_check\.tenant_id = \$1/);
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
  assert.match(writes[0].sql, /INSERT INTO workflow_events/);
  assert.match(writes[0].sql, /INSERT INTO audit_logs/);
  assert.match(writes[0].sql, /WHERE tenant_id = \$1/);
  assert.match(writes[0].sql, /status = 'pending'/);
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
  assert.match(writes[0].sql, /INSERT INTO workflow_events/);
  assert.match(writes[0].sql, /INSERT INTO audit_logs/);
  assert.match(writes[0].sql, /status = 'approved'/);
  assert.equal(writes[0].params[0], 'tenant-a');
});

test('AccountantCommandService queues arrears reminders only for exact active same-tenant guardians', async () => {
  const writes: Array<{ sql: string; params: unknown[] }> = [];
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
      uuidOrNull: (value: unknown) => value ? String(value) : null,
      writeSql: async (sql: string, params: unknown[]) => {
        writes.push({ sql, params });
        return {
          rows: [{
            requested_student_count: 2,
            eligible_student_count: 2,
            covered_student_count: 2,
            guardian_notification_count: 2,
            staff_notification_count: 4,
            event_id: '44444444-4444-4444-8444-444444444444',
          }],
          rowCount: 1,
        };
      },
    } as never,
  );

  const result = await service.recordFeeFollowUp({
    action: 'arrears_reminders_requested',
    title: 'Fee arrears reminders queued',
    message: '2 arrears reminders queued for linked guardian follow-up.',
    entity_type: 'student_arrears',
    source_dashboard: 'accountant-arrears-workspace',
    payload: {
      recipient_scope: 'linked_guardians',
      arrears_count: 2,
      students: [
        { student_id: '22222222-2222-4222-8222-222222222222', student_name: 'Learner A', balance_amount_minor: '50000' },
        { student_id: '33333333-3333-4333-8333-333333333333', student_name: 'Learner B', balance_amount_minor: '75000' },
      ],
    },
  });

  assert.equal(result.success, true);
  assert.equal(result.delivery.student_count, 2);
  assert.equal(result.delivery.guardian_notification_count, 2);
  assert.equal(writes.length, 1);
  assert.equal(writes[0].params[0], 'tenant-a');
  assert.deepEqual(writes[0].params[2], [
    '22222222-2222-4222-8222-222222222222',
    '33333333-3333-4333-8333-333333333333',
  ]);
  assert.deepEqual(JSON.parse(String(writes[0].params[3])), ['accountant', 'principal', 'deputy_principal', 'secretary']);
  assert.deepEqual(writes[0].params[6], ['accountant', 'principal', 'deputy_principal', 'secretary']);
  assert.match(writes[0].sql, /INNER JOIN students student\s+ON student\.tenant_id = \$1/);
  assert.match(writes[0].sql, /INNER JOIN student_guardians guardian/);
  assert.match(writes[0].sql, /INNER JOIN tenant_memberships membership/);
  assert.match(writes[0].sql, /recipient_user_id, recipient_guardian_id/);
  assert.match(writes[0].sql, /coverage\.covered_student_count = coverage\.eligible_student_count/);
});

test('AccountantCommandService rejects client-selected notification roles outside finance governance', async () => {
  let workflowRecorded = false;
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
      recordWorkflowAction: async () => {
        workflowRecorded = true;
        return {};
      },
    } as never,
  );

  await assert.rejects(
    () => service.recordAction({
      action: 'finance_note',
      title: 'Finance note',
      message: 'Internal finance note',
      target_roles: ['parent'],
    }),
    /authorized school finance or leadership roles/i,
  );
  assert.equal(workflowRecorded, false);
});

test('AccountantCommandService builds a live tenant-scoped overview without demo defaults', async () => {
  const queries: Array<{ sql: string; params: unknown[] }> = [];
  const tenantExecutions: Array<{ tenantId: string; userId: string | null | undefined }> = [];
  const service = new AccountantCommandService(
    {
      getStore: () => ({
        tenant_id: 'tenant-a',
        user_id: '11111111-1111-4111-8111-111111111111',
        role: 'accountant',
      }),
    } as never,
    {
      executeWithTenant: async (
        tenantId: string,
        userId: string | null | undefined,
        callback: (tx: { $queryRawUnsafe: (sql: string, ...params: unknown[]) => Promise<unknown[]> }) => Promise<unknown>,
      ) => {
        tenantExecutions.push({ tenantId, userId });
        return callback({
          $queryRawUnsafe: async (sql: string, ...params: unknown[]) => {
            queries.push({ sql, params });
            if (sql.includes('WITH payment_metrics')) {
              return [{
                collected_today_minor: '0',
                receipts_today_count: '0',
                outstanding_balance_minor: '0',
                balances_above_threshold_count: '0',
                open_invoice_count: '0',
                mpesa_review_count: '0',
                active_fee_structure_count: '0',
              }];
            }
            return [];
          },
        });
      },
    } as never,
    {} as never,
  );

  const overview = await service.getOverview();

  assert.deepEqual(tenantExecutions, [{
    tenantId: 'tenant-a',
    userId: '11111111-1111-4111-8111-111111111111',
  }]);
  assert.deepEqual(overview.metrics, {
    collected_today_minor: '0',
    receipts_today_count: 0,
    outstanding_balance_minor: '0',
    balances_above_threshold_count: 0,
    open_invoice_count: 0,
    mpesa_review_count: 0,
    active_fee_structure_count: 0,
  });
  assert.deepEqual(overview.recent_activity, []);
  assert.equal(queries.length, 2);
  for (const query of queries) {
    assert.deepEqual(query.params, ['tenant-a']);
    assert.match(query.sql, /tenant_id = \$1/);
    assert.doesNotMatch(query.sql, /248[,_]?500|Kisumu Boys/);
  }
});

test('AccountantCommandService reads the expense register inside the authenticated tenant', async () => {
  const queries: Array<{ sql: string; params: unknown[] }> = [];
  const service = new AccountantCommandService(
    {
      getStore: () => ({
        tenant_id: 'tenant-a',
        user_id: '11111111-1111-4111-8111-111111111111',
        role: 'accountant',
      }),
    } as never,
    {
      executeWithTenant: async (
        tenantId: string,
        userId: string | null | undefined,
        callback: (tx: { $queryRawUnsafe: (sql: string, ...params: unknown[]) => Promise<unknown[]> }) => Promise<unknown>,
      ) => {
        assert.equal(tenantId, 'tenant-a');
        assert.equal(userId, '11111111-1111-4111-8111-111111111111');
        return callback({
          $queryRawUnsafe: async (sql: string, ...params: unknown[]) => {
            queries.push({ sql, params });
            if (sql.includes('total_this_month_minor')) {
              return [{
                total_this_month_minor: '1250000',
                pending_approval: '1',
                approved: '2',
                total_count: '3',
              }];
            }
            return [{
              id: '22222222-2222-4222-8222-222222222222',
              date: new Date('2026-08-02T08:00:00.000Z'),
              category: 'utilities',
              description: 'Electricity tokens',
              amount_minor: '1250000',
              status: 'pending',
            }];
          },
        });
      },
    } as never,
    {} as never,
  );

  const response = await service.getExpenses();

  assert.deepEqual(response.metrics, {
    total_this_month_minor: '1250000',
    pending_approval: 1,
    approved: 2,
    total_count: 3,
  });
  assert.equal(response.items[0].description, 'Electricity tokens');
  assert.equal(response.items[0].amount_minor, '1250000');
  assert.equal(queries.length, 2);
  for (const query of queries) {
    assert.deepEqual(query.params, ['tenant-a']);
    assert.match(query.sql, /FROM school_expenses/);
    assert.match(query.sql, /WHERE tenant_id = \$1/);
  }
});

test('AccountantCommandService persists an expense before emitting its approval event', async () => {
  const workflowCalls: any[] = [];
  const notificationCalls: any[] = [];
  const queryCalls: Array<{ sql: string; params: unknown[] }> = [];
  const service = new AccountantCommandService(
    {
      getStore: () => ({
        tenant_id: 'tenant-a',
        user_id: '11111111-1111-4111-8111-111111111111',
        role: 'accountant',
      }),
    } as never,
    {
      executeWithTenant: async (
        tenantId: string,
        userId: string | null | undefined,
        callback: (tx: { $queryRawUnsafe: (sql: string, ...params: unknown[]) => Promise<unknown[]> }) => Promise<unknown>,
      ) => {
        assert.equal(tenantId, 'tenant-a');
        assert.equal(userId, '11111111-1111-4111-8111-111111111111');
        return callback({
          $queryRawUnsafe: async (sql: string, ...params: unknown[]) => {
            queryCalls.push({ sql, params });
            return [{
              id: '22222222-2222-4222-8222-222222222222',
              date: new Date('2026-08-02T08:00:00.000Z'),
              category: 'utilities',
              description: 'Electricity tokens',
              amount_minor: '1250000',
              status: 'pending',
            }];
          },
        });
      },
    } as never,
    {
      recordWorkflowAction: async (input: any) => {
        workflowCalls.push(input);
        return { id: 'event-expense-1', ...input };
      },
      notifyRoles: async (tenantId: string, input: any) => {
        notificationCalls.push({ tenantId, input });
      },
    } as never,
  );

  const response = await service.createExpense({
    category: 'utilities',
    description: 'Electricity tokens',
    amount_minor: '1250000',
  });

  assert.equal(response.success, true);
  assert.equal(response.expense.status, 'pending');
  assert.equal(queryCalls.length, 1);
  assert.match(queryCalls[0].sql, /INSERT INTO school_expenses/);
  assert.deepEqual(queryCalls[0].params, [
    'tenant-a',
    'utilities',
    'Electricity tokens',
    '1250000',
  ]);
  assert.equal(workflowCalls.length, 1);
  assert.equal(workflowCalls[0].eventType, 'accountant.expense_submitted');
  assert.deepEqual(workflowCalls[0].targetRoles, ['accountant', 'principal']);
  assert.equal(workflowCalls[0].entityId, '22222222-2222-4222-8222-222222222222');
  assert.equal(notificationCalls.length, 1);
  assert.equal(notificationCalls[0].tenantId, 'tenant-a');
});

test('GuidanceCounsellingCommandService creates real tenant-scoped counselling referrals before workflow events', async () => {
  const writes: Array<{ sql: string; params: unknown[] }> = [];
  const workflowCalls: any[] = [];
  const service = new GuidanceCounsellingCommandService(
    {
      getStore: () => ({
        tenant_id: 'tenant-a',
        user_id: '11111111-1111-4111-8111-111111111111',
      }),
    } as never,
    {
      query: async (sql: string) => /FROM tenants/.test(sql)
        ? { rows: [{ school_id: '22222222-2222-4222-8222-222222222222' }], rowCount: 1 }
        : { rows: [], rowCount: 0 },
    } as never,
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
  assert.match(writes[0].sql, /class_section\.tenant_id = student\.tenant_id/);
  assert.match(writes[0].sql, /academic_term\.tenant_id = student\.tenant_id/);
  assert.match(writes[0].sql, /academic_year\.tenant_id = student\.tenant_id/);
  assert.match(writes[0].sql, /incident\.tenant_id = student\.tenant_id/);
  assert.match(writes[0].sql, /counsellor_membership\.tenant_id = student\.tenant_id/);
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

test('GuidanceCounsellingCommandService returns the tenant-scoped referrals workspace contract', async () => {
  const queries: Array<{ sql: string; params: unknown[] }> = [];
  const service = new GuidanceCounsellingCommandService(
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
              id: 'referral-open',
              student_name: 'Amina Otieno',
              class: 'Grade 8 East',
              referred_by: 'Jane Wanjiku',
              reason: 'Academic stress check-in',
              risk_level: 'high',
              date: '2026-08-22',
              status: 'Open',
            },
            {
              id: 'referral-accepted',
              student_name: 'Brian Ouma',
              class: 'Grade 9 West',
              referred_by: 'Jane Wanjiku',
              reason: 'Peer support follow-up',
              risk_level: 'critical',
              date: '2026-08-21',
              status: 'Accepted',
            },
          ],
          rowCount: 2,
        };
      },
    } as never,
    {} as never,
  );

  const result = await service.getReferrals();

  assert.deepEqual(result.metrics, {
    pending_referrals: 1,
    accepted: 1,
    external: 0,
  });
  assert.equal(result.referralsList.length, 2);
  assert.equal(result.referralsList[0]?.student_name, 'Amina Otieno');
  assert.equal(result.referralsList[0]?.risk_level, 'high');
  assert.equal(result.referralsList[1]?.risk_level, 'critical');
  assert.equal(queries.length, 1);
  assert.deepEqual(queries[0].params, ['tenant-a']);
  assert.match(queries[0].sql, /WHERE referral\.tenant_id = \$1/);
  assert.match(queries[0].sql, /student\.tenant_id = referral\.tenant_id/);
  assert.match(queries[0].sql, /student\.id::text = referral\.student_id::text/);
  assert.match(queries[0].sql, /section\.tenant_id = referral\.tenant_id/);
  assert.match(queries[0].sql, /section\.id::text = referral\.class_id::text/);
  assert.match(queries[0].sql, /membership\.tenant_id = referral\.tenant_id/);
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
  assert.match(writes[0].sql, /WHERE referral\.tenant_id = \$1/);
  assert.equal(writes[0].params[0], 'tenant-a');
  assert.equal(writes[0].params[1], '99999999-9999-4999-8999-999999999999');
  assert.equal(workflowCalls[0].eventType, 'counselling.referral.status_updated');
  assert.equal(workflowCalls[0].entityType, 'counselling_referral');
});

test('GuidanceCounsellingCommandService keeps exact guardian engagement notices out of the role-wide parent feed', async () => {
  const writes: Array<{ sql: string; params: unknown[] }> = [];
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
      writeSql: async (sql: string, params: unknown[]) => {
        writes.push({ sql, params });
        return {
          rows: [{ id: '22222222-2222-4222-8222-222222222222' }],
          rowCount: 1,
        };
      },
      recordWorkflowAction: async (input: any) => {
        workflowCalls.push(input);
        return { id: 'workflow-1', ...input };
      },
    } as never,
  );

  const result = await service.notifyParentEngagement(
    '33333333-3333-4333-8333-333333333333',
    { message: 'Please review the agreed learner support plan.' },
  );

  assert.equal(result.delivery_state, 'queued');
  assert.match(writes[0].sql, /guardian\.tenant_id = engagement\.tenant_id::text/);
  assert.match(writes[0].sql, /recipient_user_id, recipient_guardian_id, recipient_role/);
  assert.deepEqual(workflowCalls[0].targetRoles, ['counsellor']);
  assert.equal(workflowCalls[0].eventType, 'counselling.parent_engagement.notification_queued');
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

test('LibrarianCommandService sends only non-person-specific notices through verified in-app role notifications', async () => {
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
    title: 'New set books available',
    message: 'The new set books are now available from the library desk.',
    notice_type: 'new_arrival',
    target_roles: ['parent', 'student'],
    channels: ['in_app'],
  });

  assert.equal(result.success, true);
  assert.equal(workflowCalls.length, 1);
  assert.equal(workflowCalls[0].tenantId, 'tenant-a');
  assert.equal(workflowCalls[0].entityType, 'library_notice');
  assert.equal(workflowCalls[0].eventType, 'library.notice_sent');
  assert.deepEqual(workflowCalls[0].targetRoles, ['parent', 'student']);
  assert.equal(notificationCalls.length, 1);
  assert.equal(notificationCalls[0].tenantId, 'tenant-a');
  assert.deepEqual(notificationCalls[0].input.targetRoles, ['parent', 'student']);
  assert.equal(notificationCalls[0].input.type, 'library.notice_sent');
  assert.deepEqual(result.recipientRoles, ['parent', 'student']);
  assert.deepEqual(result.channels, ['in_app']);
});

test('LibrarianCommandService rejects sensitive borrower broadcasts and unverified delivery channels', async () => {
  let eventCreated = false;
  let notificationCreated = false;
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
      recordWorkflowAction: async () => {
        eventCreated = true;
        return {};
      },
      notifyRoles: async () => {
        notificationCreated = true;
      },
    } as never,
  );

  await assert.rejects(
    () => service.sendNotice({
      title: 'Overdue book reminder',
      message: 'Please return the named overdue book.',
      notice_type: 'overdue',
      target_roles: ['parent'],
      channels: ['in_app'],
    }),
    /must be sent from the exact borrower record/i,
  );
  await assert.rejects(
    () => service.sendNotice({
      title: 'Library hours',
      message: 'The library closes at 4pm.',
      notice_type: 'general',
      target_roles: ['student'],
      channels: ['sms'],
    }),
    /verified in-app delivery only/i,
  );

  assert.equal(eventCreated, false);
  assert.equal(notificationCreated, false);
});

test('LibrarianCommandService queues overdue reminders only for exact active borrower or linked guardian accounts', async () => {
  const writes: Array<{ sql: string; params: unknown[] }> = [];
  const service = new LibrarianCommandService(
    {
      getStore: () => ({
        tenant_id: 'tenant-a',
        user_id: '11111111-1111-4111-8111-111111111111',
      }),
    } as never,
    {} as never,
    {
      uuidOrNull: (value: unknown) => value ? String(value) : null,
      writeSql: async (sql: string, params: unknown[]) => {
        writes.push({ sql, params });
        return {
          rows: [{
            overdue_count: 1,
            recipient_count: 2,
            notification_count: 2,
            event_id: 'event-overdue-1',
            borrower_id: 'borrower-1',
            book_title: 'Biology Reference',
            audits_created: 1,
          }],
          rowCount: 1,
        };
      },
    } as never,
  );

  const result = await service.remindOverdueBorrower('22222222-2222-4222-8222-222222222222');

  assert.equal(result.success, true);
  assert.equal(result.recipientCount, 2);
  assert.equal(result.notificationCount, 2);
  assert.equal(writes.length, 1);
  assert.deepEqual(writes[0].params, [
    'tenant-a',
    '22222222-2222-4222-8222-222222222222',
    '11111111-1111-4111-8111-111111111111',
  ]);
  assert.match(writes[0].sql, /issue\.id = \$2::uuid/);
  assert.match(writes[0].sql, /issue\.metadata->>'due_on' < CURRENT_DATE::text/);
  assert.match(writes[0].sql, /student_portal_access/);
  assert.match(writes[0].sql, /student_guardians/);
  assert.match(writes[0].sql, /staff_profiles/);
  assert.match(writes[0].sql, /tenant_memberships/);
  assert.match(writes[0].sql, /recipient_user_id, recipient_guardian_id/);
  assert.match(writes[0].sql, /'\["librarian"\]'::jsonb/);
  assert.doesNotMatch(writes[0].sql, /recipient_role/);
  assert.doesNotMatch(writes[0].sql, /\["librarian","class_teacher","parent"\]/);
  assert.match(writes[0].sql, /INSERT INTO audit_logs/);
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

test('SecurityOfficerCommandService returns canonical tenant-scoped visitor and student-pass workspace contracts', async () => {
  const queries: Array<{ sql: string; params: unknown[] }> = [];
  const service = new SecurityOfficerCommandService(
    { getStore: () => ({ tenant_id: 'tenant-a', user_id: '11111111-1111-4111-8111-111111111111' }) } as never,
    {
      query: async (sql: string, params: unknown[]) => {
        queries.push({ sql, params });
        if (/AS checked_in/.test(sql)) {
          return { rows: [{ checked_in: 1, checked_out_today: 2, flagged: 0 }], rowCount: 1 };
        }
        if (/visitor_log\.id::text/.test(sql)) {
          return {
            rows: [{ id: 'visitor-1', name: 'John Kamau', id_number: '12345678', purpose: 'Meeting', host: 'Jane Wanjiku', check_in: '2026-08-22', check_out: '', status: 'Active' }],
            rowCount: 1,
          };
        }
        if (/AS active_passes/.test(sql)) {
          return { rows: [{ active_passes: 1, pending_verification: 0, returned_today: 0 }], rowCount: 1 };
        }
        if (/AS currently_out/.test(sql)) {
          return { rows: [{ currently_out: 1, departed_today: 1, returned_today: 0 }], rowCount: 1 };
        }
        if (/movement\.id::text/.test(sql)) {
          return { rows: [{ id: 'movement-1', staff_name: 'Jane Wanjiku', department: 'Administration', departed_at: '2026-08-22', expected_return: '', status: 'Departed' }], rowCount: 1 };
        }
        if (/AS open_incidents/.test(sql)) {
          return { rows: [{ open_incidents: 1, resolved_today: 0, escalated: 0 }], rowCount: 1 };
        }
        if (/FROM security_incidents/.test(sql)) {
          return { rows: [{ id: 'incident-1', title: 'Gate alarm', date: '2026-08-22', description: 'Alarm triggered', location: 'Main gate', severity: 'High', status: 'Reported' }], rowCount: 1 };
        }
        return {
          rows: [{ id: 'pass-1', student_name: 'Amina Otieno', class: 'Grade 8 East', authorized_by: 'Jane Wanjiku', exit_time: '2026-08-22', return_time: '', status: 'Out' }],
          rowCount: 1,
        };
      },
    } as never,
    {} as never,
  );

  const [visitors, passes, staffMovement, incidents] = await Promise.all([
    service.getVisitors(),
    service.getStudentExitPasses(),
    service.getStaffMovement(),
    service.getIncidents(),
  ]);

  assert.equal(visitors.metrics.checked_in, 1);
  assert.equal(visitors.visitorsList[0]?.id_number, '12345678');
  assert.equal(passes.metrics.active_passes, 1);
  assert.equal(passes.studentexitpassesList[0]?.class, 'Grade 8 East');
  assert.equal(staffMovement.metrics.currently_out, 1);
  assert.equal(staffMovement.staffmovementList[0]?.staff_name, 'Jane Wanjiku');
  assert.equal(incidents.metrics.open_incidents, 1);
  assert.equal(incidents.incidentsList[0]?.title, 'Gate alarm');
  assert.ok(queries.every((query) => query.params[0] === 'tenant-a'));
  assert.ok(queries.every((query) => /tenant_id = \$1/.test(query.sql)));
  const passListQuery = queries.find((query) => /exit_pass\.id::text/.test(query.sql));
  assert.ok(passListQuery);
  assert.match(passListQuery.sql, /exit_pass\.time_out::text AS exit_time/);
  assert.doesNotMatch(passListQuery.sql, /ORDER BY exit_time/);
  assert.match(passListQuery.sql, /student\.tenant_id = exit_pass\.tenant_id/);
  assert.match(passListQuery.sql, /membership\.tenant_id = exit_pass\.tenant_id/);
});

test('SecurityOfficerCommandService generates and downloads tenant-scoped report artifacts from live workspace sections', async () => {
  const generatedInputs: any[] = [];
  const reads: Array<{ sql: string; params: unknown[] }> = [];
  const service = new SecurityOfficerCommandService(
    { getStore: () => ({ tenant_id: 'tenant-a', user_id: '11111111-1111-4111-8111-111111111111' }) } as never,
    { query: async () => ({ rows: [], rowCount: 0 }) } as never,
    {
      listReportSnapshots: async (tenantId: string, module: string) => {
        assert.equal(tenantId, 'tenant-a');
        assert.equal(module, 'security-officer-command');
        return [{ id: 'row-1', snapshotId: 'security-snapshot-1', reportName: 'Security operations report', generatedDate: '2026-08-22T09:00:00.000Z', type: 'csv', status: 'Ready' }];
      },
      generateReportSnapshot: async (input: any) => {
        generatedInputs.push(input);
        return { success: true, snapshotId: 'security-snapshot-2', artifact: { content_base64: 'U2VjdGlvbg==' } };
      },
      readSql: async (sql: string, params: unknown[]) => {
        reads.push({ sql, params });
        return {
          rows: [{
            snapshotId: 'security-snapshot-1',
            title: 'Security operations report',
            format: 'csv',
            artifact: { filename: 'security.csv', content_type: 'text/csv', content_base64: 'U2VjdGlvbg==' },
            manifest: { sections: { overview: { metrics: { visitors_today: 1 } } } },
            generatedDate: '2026-08-22T09:00:00.000Z',
          }],
          rowCount: 1,
        };
      },
      requiredText: (value: unknown) => String(value ?? '').trim(),
      uuidOrNull: (value: unknown) => String(value || ''),
    } as never,
  );

  (service as any).getOverview = async () => ({ metrics: { visitors_today: 1 } });
  (service as any).getVisitors = async () => ({ visitorsList: [{ id: 'visitor-1' }] });
  (service as any).getGateRegister = async () => ({ gateregisterList: [{ id: 'gate-1' }] });
  (service as any).getStudentExitPasses = async () => ({ studentexitpassesList: [{ id: 'pass-1' }] });
  (service as any).getStaffMovement = async () => ({ staffmovementList: [{ id: 'movement-1' }] });
  (service as any).getIncidents = async () => ({ incidentsList: [{ id: 'incident-1' }] });

  const reports = await service.getReports();
  const generated = await service.generateReport({ title: 'Security operations report', format: 'csv' });
  const downloaded = await service.downloadReport('security-snapshot-1');

  assert.equal(reports.reportsList[0].id, 'security-snapshot-1');
  assert.equal(generated.success, true);
  assert.equal(generatedInputs[0].tenantId, 'tenant-a');
  assert.equal(generatedInputs[0].module, 'security-officer-command');
  assert.equal(generatedInputs[0].sections.visitors.visitorsList[0].id, 'visitor-1');
  assert.equal(generatedInputs[0].sections.incidents.incidentsList[0].id, 'incident-1');
  assert.equal(downloaded.report.artifact.filename, 'security.csv');
  assert.equal(reads[0].params[0], 'tenant-a');
  assert.equal(reads[0].params[1], 'security-snapshot-1');
  assert.match(reads[0].sql, /module = 'security-officer-command'/);
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
  const reads: Array<{ sql: string; params: unknown[] }> = [];
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
        if (/INSERT INTO notifications/i.test(sql)) {
          return { rows: [{ recipient_user_id: '33333333-3333-4333-8333-333333333333' }], rowCount: 1 };
        }
        return { rows: [], rowCount: 0 };
      },
      readSql: async (sql: string, params: unknown[]) => {
        reads.push({ sql, params });
        if (/FROM workflow_events/i.test(sql)) {
          return {
            rows: [{
              id: '22222222-2222-4222-8222-222222222222',
              tenant_id: 'tenant-a',
              event_type: 'delivery.recorded',
              payload: { recipient: 'P-001', delivery_type: 'Office Document' },
            }],
            rowCount: 1,
          };
        }
        if (/FROM staff_profiles/i.test(sql)) {
          return {
            rows: [{
              staff_profile_id: '44444444-4444-4444-8444-444444444444',
              user_id: '33333333-3333-4333-8333-333333333333',
              staff_name: 'Jane Njeri',
            }],
            rowCount: 1,
          };
        }
        return { rows: [], rowCount: 0 };
      },
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

  const delivery = await service.recordDelivery({ delivery_type: 'Office Document', recipient: 'P-001', sender: 'Courier' });
  const notice = await service.notifyDeliveryRecipient('22222222-2222-4222-8222-222222222222');
  const collected = await service.markDeliveryCollected('22222222-2222-4222-8222-222222222222');

  assert.equal(delivery.delivery.event_type, 'delivery.recorded');
  assert.equal(notice.success, true);
  assert.equal(notice.recipient.user_id, '33333333-3333-4333-8333-333333333333');
  assert.equal(collected.delivery.event_type, 'delivery.recorded');
  assert.match(writes[0].sql, /INSERT INTO workflow_events/);
  const recipientNotice = writes.find((call) => /INSERT INTO notifications/i.test(call.sql));
  assert.ok(recipientNotice);
  assert.match(recipientNotice.sql, /recipient_user_id/);
  assert.doesNotMatch(recipientNotice.sql, /recipient_role/);
  assert.match(recipientNotice.sql, /membership\.tenant_id = \$1/);
  assert.equal(recipientNotice.params[0], 'tenant-a');
  assert.equal(recipientNotice.params[7], '33333333-3333-4333-8333-333333333333');
  assert.equal(reads.some((call) => /FROM staff_profiles/i.test(call.sql) && call.params[0] === 'tenant-a'), true);
  assert.equal(writes.some((call) => /UPDATE workflow_events/i.test(call.sql) && call.params[0] === 'tenant-a'), true);
  assert.equal(writes[0].params[0], 'tenant-a');
  assert.equal(audits.includes('security.delivery_recorded'), true);
  assert.equal(audits.includes('security.delivery_recipient_notified'), true);
  assert.equal(audits.includes('security.delivery_collected'), true);
  assert.equal(notifications.some((call) => call.input.type === 'security.delivery_recipient_notified'), false);
});

test('SecurityOfficerCommandService refuses a delivery notice when the exact same-tenant staff recipient cannot be resolved', async () => {
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
        if (/FROM workflow_events/i.test(sql)) {
          return {
            rows: [{
              id: '22222222-2222-4222-8222-222222222222',
              tenant_id: 'tenant-a',
              event_type: 'delivery.recorded',
              payload: { recipient: 'Principal office', delivery_type: 'Office Document' },
            }],
            rowCount: 1,
          };
        }
        return { rows: [], rowCount: 0 };
      },
      writeSql: async () => {
        throw new Error('A notification must not be inserted without an exact tenant recipient');
      },
      requiredText: (value: unknown) => String(value ?? '').trim(),
    } as never,
  );

  await assert.rejects(
    () => service.notifyDeliveryRecipient('22222222-2222-4222-8222-222222222222'),
    /not an active staff account in this school/,
  );
  assert.equal(reads.length, 2);
  assert.ok(reads.every((call) => call.params[0] === 'tenant-a'));
  assert.match(reads[1].sql, /FROM staff_profiles/);
  assert.match(reads[1].sql, /membership\.tenant_id = profile\.tenant_id/);
});

test('SecurityOfficerCommandService records late arrivals and queues parent notices in the current tenant', async () => {
  const writes: Array<{ sql: string; params: unknown[] }> = [];
  const reads: Array<{ sql: string; params: unknown[] }> = [];
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
        if (/INSERT INTO notifications/i.test(sql)) {
          return { rows: [{ recipient_user_id: '33333333-3333-4333-8333-333333333333' }], rowCount: 1 };
        }
        return { rows: [], rowCount: 0 };
      },
      readSql: async (sql: string, params: unknown[]) => {
        reads.push({ sql, params });
        if (/FROM students student/i.test(sql)) {
          return {
            rows: [{ id: '44444444-4444-4444-8444-444444444444', admission_number: 'ADM-004', student_name: 'Mike Omondi' }],
            rowCount: 1,
          };
        }
        if (/FROM workflow_events/i.test(sql)) {
          return {
            rows: [{
              id: '22222222-2222-4222-8222-222222222222',
              tenant_id: 'tenant-a',
              entity_id: '44444444-4444-4444-8444-444444444444',
              event_type: 'student.late_arrival_recorded',
              payload: { student_id: '44444444-4444-4444-8444-444444444444', student_name: 'Mike Omondi', reason: 'Transport Delay' },
            }],
            rowCount: 1,
          };
        }
        return { rows: [], rowCount: 0 };
      },
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
  assert.equal(notice.guardianNotificationCount, 1);
  const arrivalWrite = writes.find((call) => /INSERT INTO workflow_events/i.test(call.sql));
  const guardianNotice = writes.find((call) => /INSERT INTO notifications/i.test(call.sql));
  assert.ok(arrivalWrite);
  assert.ok(guardianNotice);
  assert.equal(arrivalWrite.params[0], 'tenant-a');
  assert.equal(arrivalWrite.params[3], '44444444-4444-4444-8444-444444444444');
  assert.doesNotMatch(String(arrivalWrite.params[2]), /parent/i);
  assert.match(guardianNotice.sql, /FROM student_guardians guardian/);
  assert.match(guardianNotice.sql, /recipient_user_id/);
  assert.doesNotMatch(guardianNotice.sql, /recipient_role/);
  assert.equal(guardianNotice.params[0], 'tenant-a');
  assert.equal(guardianNotice.params[8], '44444444-4444-4444-8444-444444444444');
  assert.equal(reads.filter((call) => /FROM students student/i.test(call.sql)).every((call) => call.params[0] === 'tenant-a'), true);
  assert.equal(audits.includes('security.late_arrival_recorded'), true);
  assert.equal(audits.includes('security.late_arrival_parent_notified'), true);
  assert.equal(notifications.some((call) => call.input.targetRoles?.includes('parent')), false);
});

test('SecurityOfficerCommandService records early departures and returns in the current tenant', async () => {
  const writes: Array<{ sql: string; params: unknown[] }> = [];
  const reads: Array<{ sql: string; params: unknown[] }> = [];
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
          return { rows: [{ id: '22222222-2222-4222-8222-222222222222', tenant_id: 'tenant-a', entity_id: '44444444-4444-4444-8444-444444444444', event_type: 'student.early_departure_recorded', payload: { student_id: '44444444-4444-4444-8444-444444444444', student_name: 'Sarah Lee' } }], rowCount: 1 };
        }
        if (/UPDATE workflow_events/i.test(sql)) {
          return { rows: [{ id: '22222222-2222-4222-8222-222222222222', tenant_id: 'tenant-a', entity_id: '44444444-4444-4444-8444-444444444444', event_type: 'student.early_departure_recorded', payload: { student_id: '44444444-4444-4444-8444-444444444444', student_name: 'Sarah Lee', returned_at: '2026-08-22T10:00:00.000Z' } }], rowCount: 1 };
        }
        if (/INSERT INTO notifications/i.test(sql)) {
          return { rows: [{ recipient_user_id: '33333333-3333-4333-8333-333333333333' }], rowCount: 1 };
        }
        return { rows: [], rowCount: 0 };
      },
      readSql: async (sql: string, params: unknown[]) => {
        reads.push({ sql, params });
        if (/FROM students student/i.test(sql)) {
          return {
            rows: [{ id: '44444444-4444-4444-8444-444444444444', admission_number: 'ADM-005', student_name: 'Sarah Lee' }],
            rowCount: 1,
          };
        }
        if (/FROM workflow_events/i.test(sql)) {
          return {
            rows: [{ id: '22222222-2222-4222-8222-222222222222', entity_id: '44444444-4444-4444-8444-444444444444', payload: { student_id: '44444444-4444-4444-8444-444444444444', student_name: 'Sarah Lee' } }],
            rowCount: 1,
          };
        }
        return { rows: [], rowCount: 0 };
      },
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
  assert.equal(departure.guardianNotificationStatus, 'queued');
  assert.equal(returned.departure.event_type, 'student.early_departure_recorded');
  assert.equal(returned.guardianNotificationStatus, 'queued');
  const departureWrite = writes.find((call) => /INSERT INTO workflow_events/i.test(call.sql));
  const returnWrite = writes.find((call) => /UPDATE workflow_events/i.test(call.sql));
  const guardianNotices = writes.filter((call) => /INSERT INTO notifications/i.test(call.sql));
  assert.ok(departureWrite);
  assert.ok(returnWrite);
  assert.equal(departureWrite.params[0], 'tenant-a');
  assert.equal(departureWrite.params[3], '44444444-4444-4444-8444-444444444444');
  assert.doesNotMatch(String(departureWrite.params[2]), /parent/i);
  assert.equal(returnWrite.params[0], 'tenant-a');
  assert.equal(guardianNotices.length, 2);
  guardianNotices.forEach((notice) => {
    assert.match(notice.sql, /FROM student_guardians guardian/);
    assert.match(notice.sql, /recipient_user_id/);
    assert.doesNotMatch(notice.sql, /recipient_role/);
    assert.equal(notice.params[0], 'tenant-a');
    assert.equal(notice.params[8], '44444444-4444-4444-8444-444444444444');
  });
  assert.equal(reads.every((call) => call.params[0] === 'tenant-a'), true);
  assert.equal(audits.includes('security.early_departure_recorded'), true);
  assert.equal(audits.includes('security.early_departure_return_recorded'), true);
  assert.equal(notifications.some((call) => call.input.type === 'security.early_departure_recorded'), true);
  assert.equal(notifications.some((call) => call.input.type === 'security.early_departure_return_recorded'), true);
  assert.equal(notifications.some((call) => call.input.targetRoles?.includes('parent')), false);
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

test('AdminCommandService delegates principal approval reads and decisions with the exact tenant actor and role', async () => {
  const store = {
    tenant_id: 'tenant-a',
    user_id: '11111111-1111-4111-8111-111111111111',
    role: 'principal',
    request_id: 'request-77',
  };
  const listCalls: Array<Record<string, unknown>> = [];
  const decisionCalls: Array<Record<string, unknown>> = [];
  const historyCalls: unknown[][] = [];
  const service = new AdminCommandService(
    {
      getStore: () => store,
      requireStore: () => store,
    } as never,
    {
      getPrincipalApprovalHistory: async (...args: unknown[]) => {
        historyCalls.push(args);
        return [{ id: 'approval-old', title: 'Prior request', status: 'approved' }];
      },
    } as never,
    {} as never,
    undefined,
    undefined,
    undefined,
    undefined,
    {
      listPendingForApprover: async (input: Record<string, unknown>) => {
        listCalls.push(input);
        return [{
          id: 'approval-1',
          module: 'procurement',
          approval_type: 'purchase_order',
          priority: 'urgent',
        }];
      },
      decideRequest: async (input: Record<string, unknown>) => {
        decisionCalls.push(input);
        return { id: input.approvalId, status: input.decision };
      },
    } as never,
  );

  const overview = await service.getApprovalsOverview();

  assert.deepEqual(listCalls, [{
    tenantId: 'tenant-a',
    actorUserId: '11111111-1111-4111-8111-111111111111',
    actorRole: 'principal',
  }]);
  assert.deepEqual(historyCalls, [[
    'tenant-a',
    '11111111-1111-4111-8111-111111111111',
    'principal',
  ]]);
  assert.equal(overview.pendingTotal, 1);
  assert.equal(overview.urgentApprovals, 1);
  assert.deepEqual(overview.categories, [{ name: 'Procurement', pending: 1, urgent: 1 }]);

  await assert.rejects(
    () => service.actionPrincipalApproval('approval-1', { action: 'reject' }),
    /A rejection reason is required/,
  );
  await assert.rejects(
    () => service.actionPrincipalApproval('approval-1', { action: 'forward' }),
    /Approval action must be approve or reject/,
  );
  assert.equal(decisionCalls.length, 0, 'invalid decisions must not reach the governed workflow');

  const rejected = await service.actionPrincipalApproval(' approval-1 ', {
    action: 'REJECT',
    reason: '  Budget evidence is incomplete.  ',
  });

  assert.equal(rejected.success, true);
  assert.deepEqual(decisionCalls, [{
    tenantId: 'tenant-a',
    approvalId: 'approval-1',
    actorUserId: '11111111-1111-4111-8111-111111111111',
    actorRole: 'principal',
    requestId: 'request-77',
    decision: 'REJECTED',
    note: 'Budget evidence is incomplete.',
  }]);
});

test('AdminCommandRepository reads Principal settings from the exact tenant user and active assignments', async () => {
  const queries: Array<{ sql: string; params: unknown[] }> = [];
  const repository = new AdminCommandRepository({
    query: async (sql: string, params: unknown[]) => {
      queries.push({ sql, params });
      if (/FROM workflow_events/.test(sql)) {
        return {
          rows: [{
            payload: {
              notifications: { emailAlerts: false, smsAlerts: true, dailyDigest: false },
              dashboard: { theme: 'dark', defaultView: 'attendance' },
            },
            updated_at: '2026-08-22T08:00:00.000Z',
          }],
          rowCount: 1,
        };
      }
      return {
        rows: [{
          mfa_enabled: true,
          password_changed_at: '2026-08-01T07:00:00.000Z',
          teaching_workspace_available: true,
        }],
        rowCount: 1,
      };
    },
  } as never);

  const result = await repository.getPrincipalSettings(
    'tenant-a',
    '11111111-1111-4111-8111-111111111111',
  );

  assert.equal(result.accountLinked, true);
  assert.deepEqual(result.notifications, { emailAlerts: false, smsAlerts: true, dailyDigest: false });
  assert.deepEqual(result.dashboard, { theme: 'dark', showTeachingWorkspace: true, defaultView: 'attendance' });
  assert.deepEqual(result.security, {
    twoFactorAuth: true,
    lastPasswordChange: '2026-08-01T07:00:00.000Z',
  });
  assert.equal(queries.length, 2);
  for (const query of queries) {
    assert.deepEqual(query.params, ['tenant-a', '11111111-1111-4111-8111-111111111111']);
  }
  assert.match(queries.find((query) => /FROM workflow_events/.test(query.sql))?.sql ?? '', /source_user_id = \$2::uuid/);
  const accountSql = queries.find((query) => /FROM users user_account/.test(query.sql))?.sql ?? '';
  assert.match(accountSql, /membership\.tenant_id = \$1/);
  assert.match(accountSql, /assignment\.tenant_id = membership\.tenant_id/);
  assert.match(accountSql, /assignment\.teacher_user_id::text = user_account\.id::text/);
});

test('AdminCommandService persists validated Principal preferences as an audited completed event', async () => {
  const workflowCalls: Array<Record<string, unknown>> = [];
  const auditCalls: Array<Record<string, unknown>> = [];
  const service = new AdminCommandService(
    {
      getStore: () => ({
        tenant_id: 'tenant-a',
        user_id: '11111111-1111-4111-8111-111111111111',
        role: 'principal',
      }),
    } as never,
    {
      createPrincipalWorkflowAction: async (input: Record<string, unknown>) => {
        workflowCalls.push(input);
        return { id: 'event-1', ...input };
      },
      appendAuditLog: async (input: Record<string, unknown>) => {
        auditCalls.push(input);
      },
    } as never,
    {} as never,
  );

  await assert.rejects(
    () => service.updatePrincipalSettings({
      notifications: { emailAlerts: 'yes', smsAlerts: false, dailyDigest: true },
      dashboard: { theme: 'dark', defaultView: 'overview' },
    }),
    /Email alerts must be true or false/,
  );
  await assert.rejects(
    () => service.updatePrincipalSettings({
      notifications: { emailAlerts: true, smsAlerts: false, dailyDigest: true },
      dashboard: { theme: 'neon', defaultView: 'overview' },
    }),
    /Theme must be system, dark, or light/,
  );
  assert.equal(workflowCalls.length, 0);

  const result = await service.updatePrincipalSettings({
    notifications: { emailAlerts: false, smsAlerts: true, dailyDigest: false },
    dashboard: { theme: 'dark', defaultView: 'attendance' },
  });

  assert.equal(result.success, true);
  assert.equal(workflowCalls.length, 1);
  assert.deepEqual(workflowCalls[0], {
    tenant_id: 'tenant-a',
    user_id: '11111111-1111-4111-8111-111111111111',
    event_type: 'principal.settings_updated',
    entity_type: 'principal_preferences',
    entity_id: '11111111-1111-4111-8111-111111111111',
    title: 'Principal preferences updated',
    message: 'Principal dashboard and notification preferences were saved.',
    payload: {
      notifications: { emailAlerts: false, smsAlerts: true, dailyDigest: false },
      dashboard: { theme: 'dark', defaultView: 'attendance' },
    },
    target_roles: ['principal'],
    status: 'completed',
  });
  assert.equal(auditCalls.some((call) => call.action === 'principal.settings_updated'), true);
});

test('AdminCommandService rejects Principal settings reads without an active same-school membership', async () => {
  const calls: unknown[][] = [];
  const service = new AdminCommandService(
    {
      getStore: () => ({
        tenant_id: 'tenant-a',
        user_id: '11111111-1111-4111-8111-111111111111',
      }),
    } as never,
    {
      getPrincipalSettings: async (...args: unknown[]) => {
        calls.push(args);
        return { accountLinked: false };
      },
    } as never,
    {} as never,
  );

  await assert.rejects(
    () => service.getPrincipalSettings(),
    /not an active member of this school/,
  );
  assert.deepEqual(calls, [['tenant-a', '11111111-1111-4111-8111-111111111111']]);
});

test('AdminCommandService delegates principal exam creation and publication to the canonical exams workflow', async () => {
  const examCalls: Array<{ name: string; input: unknown }> = [];
  const auditCalls: Array<Record<string, unknown>> = [];
  const service = new AdminCommandService(
    {
      getStore: () => ({
        tenant_id: 'tenant-a',
        user_id: '11111111-1111-4111-8111-111111111111',
        role: 'principal',
      }),
    } as never,
    {
      appendAuditLog: async (input: Record<string, unknown>) => auditCalls.push(input),
    } as never,
    {} as never,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    {
      createSeries: async (input: Record<string, unknown>) => {
        examCalls.push({ name: 'create', input });
        return {
          id: '22222222-2222-4222-8222-222222222222',
          academic_term_id: input.academic_term_id,
          name: input.name,
          starts_on: input.starts_on,
          ends_on: input.ends_on,
        };
      },
      publishExamSeries: async (examSeriesId: string) => {
        examCalls.push({ name: 'publish', input: examSeriesId });
        return { success: true, published_report_cards_count: 24 };
      },
    } as never,
  );

  const created = await service.createExamCycle({
    academic_term_id: '33333333-3333-4333-8333-333333333333',
    name: '  Term 2 End-Term Examinations  ',
    starts_on: '2026-08-24',
    ends_on: '2026-08-28',
  });
  const published = await service.publishPrincipalExamSeries(' 22222222-2222-4222-8222-222222222222 ');

  assert.deepEqual(examCalls, [
    {
      name: 'create',
      input: {
        academic_term_id: '33333333-3333-4333-8333-333333333333',
        name: 'Term 2 End-Term Examinations',
        starts_on: '2026-08-24',
        ends_on: '2026-08-28',
      },
    },
    { name: 'publish', input: '22222222-2222-4222-8222-222222222222' },
  ]);
  assert.equal(created.examSeries.id, '22222222-2222-4222-8222-222222222222');
  assert.equal(published.published_report_cards_count, 24);
  assert.deepEqual(auditCalls, [{
    tenant_id: 'tenant-a',
    actor_user_id: '11111111-1111-4111-8111-111111111111',
    action: 'exam.series_created',
    entity_type: 'exam_series',
    entity_id: '22222222-2222-4222-8222-222222222222',
    metadata: {
      academic_term_id: '33333333-3333-4333-8333-333333333333',
      starts_on: '2026-08-24',
      ends_on: '2026-08-28',
      source_dashboard: 'principal-command',
    },
  }]);
});

test('AdminCommandRepository derives principal exam readiness from canonical report cards only', async () => {
  const queries: Array<{ sql: string; params: unknown[] }> = [];
  const repository = new AdminCommandRepository({
    query: async (sql: string, params: unknown[]) => {
      queries.push({ sql, params });
      if (/activeExams|COUNT\(\*\)::int AS count[\s\S]*FROM exam_series/i.test(sql)) {
        return { rows: [{ count: 1 }], rowCount: 1 };
      }
      if (/missing_windows/.test(sql)) {
        return { rows: [{ count: 2 }], rowCount: 1 };
      }
      if (/AS average_score/.test(sql)) {
        return { rows: [{ average_score: '72.50' }], rowCount: 1 };
      }
      if (/series\.id::text AS exam_id/.test(sql)) {
        return {
          rows: [{
            id: 'series-1',
            exam_id: 'series-1',
            title: 'Term 2',
            status: 'reviewed',
            starts_on: '2026-08-01',
            ends_on: '2026-08-10',
            total_report_cards: 2,
            approved_report_cards: 2,
            published_report_cards: 0,
            blocked_report_cards: 0,
          }],
          rowCount: 1,
        };
      }
      return { rows: [{ label: 'Term 2', value: '72.50' }], rowCount: 1 };
    },
  } as never);

  const result = await repository.getExamsOverview('tenant-a');

  assert.equal(result.activeExams, 1);
  assert.equal(result.missingMarksAlerts, 2);
  assert.equal(result.averageScore, 72.5);
  assert.equal(result.reportsPending, 1);
  assert.equal(result.recentResults[0]?.canPublish, true);
  assert.ok(queries.every((query) => query.params[0] === 'tenant-a'));
  assert.ok(queries.some((query) => /LEFT JOIN student_report_cards card/.test(query.sql)));
  assert.ok(queries.some((query) => /card\.is_current = TRUE/.test(query.sql)));
  assert.ok(queries.every((query) => !/report_readiness_reviews/i.test(query.sql)));
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

test('AdminCommandRepository repairs legacy database logo URLs with the authenticated content route', async () => {
  const repository = new AdminCommandRepository({
    query: async () => ({
      rows: [{
        name: 'Kibabi High',
        subdomain: 'kibabi-high',
        status: 'active',
        settings: {
          logo_url: '/api/v1/files/tenant%2Ftenant-a%2Fschool_logo%2Fkibabi.png/download',
        },
        metadata: {},
      }],
    }),
  } as never);

  const profile = await repository.getSchoolProfile('tenant-a');

  assert.equal(profile?.logoStoragePath, 'tenant/tenant-a/school_logo/kibabi.png');
  assert.equal(profile?.logoUrl, '/api/school/identity/logo');
});

test('AdminCommandService stores, audits, and serves school logos inside the current tenant', async () => {
  const calls: Array<Record<string, unknown>> = [];
  const content = Buffer.from('png-content');
  const storagePath = 'tenant/tenant-a/school_logo/kibabi.png';
  const service = new AdminCommandService(
    {
      getStore: () => ({
        tenant_id: 'tenant-a',
        user_id: '11111111-1111-4111-8111-111111111111',
      }),
    } as never,
    {
      updateSchoolLogoUrl: async (tenantId: string, url: string, path: string) => {
        calls.push({ kind: 'logo', tenantId, url, path });
      },
      createPrincipalWorkflowAction: async (input: Record<string, unknown>) => {
        calls.push({ kind: 'event', ...input });
        return { id: '22222222-2222-4222-8222-222222222222' };
      },
      appendAuditLog: async (input: Record<string, unknown>) => {
        calls.push({ kind: 'audit', ...input });
      },
      getSchoolProfile: async () => ({ logoStoragePath: storagePath }),
    } as never,
    {
      save: async () => ({
        stored_path: storagePath,
        original_file_name: 'kibabi.png',
        mime_type: 'image/png',
        size_bytes: content.length,
        sha256: 'checksum',
        storage_backend: 'database',
        retention_policy: 'operational',
        retention_expires_at: null,
      }),
      readForTenant: async (input: Record<string, unknown>) => ({
        stored_path: input.storagePath,
        original_file_name: 'kibabi.png',
        mime_type: 'image/png',
        size_bytes: content.length,
        sha256: 'checksum',
        storage_backend: 'database',
        retention_policy: 'operational',
        retention_expires_at: null,
        content,
      }),
    } as never,
  );

  const uploaded = await service.uploadSchoolLogo({
    originalname: 'kibabi.png',
    mimetype: 'image/png',
    size: content.length,
    buffer: content,
  });
  const served = await service.getSchoolLogoContent();

  assert.equal(uploaded.url, '/api/school/identity/logo');
  assert.deepEqual(served.content, content);
  assert.equal(calls[0].kind, 'logo');
  assert.equal(calls[1].event_type, 'principal.school_logo_uploaded');
  assert.equal(calls[2].action, 'principal.school_logo_uploaded');
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

test('IctManagerCommandService reads the shared tenant asset model instead of phantom ICT tables', async () => {
  const queries: Array<{ sql: string; params: unknown[] }> = [];
  const service = new IctManagerCommandService(
    { getStore: () => ({ tenant_id: 'tenant-a', user_id: '11111111-1111-4111-8111-111111111111' }) } as never,
    {
      query: async (sql: string, params: unknown[]) => {
        queries.push({ sql, params });
        if (/COUNT\(\*\)::int AS total_assets/.test(sql)) {
          return { rows: [{ total_assets: 1, active: 1, in_repair: 0, disposed: 0 }], rowCount: 1 };
        }
        if (/title AS asset_name/.test(sql)) {
          return {
            rows: [{
              id: '22222222-2222-4222-8222-222222222222',
              asset_name: 'ICT Lab Projector',
              asset_tag: 'ICT-001',
              category: 'projector',
              location: 'ICT Lab',
              purchase_date: '2026-01-15',
              status: 'Available',
            }],
            rowCount: 1,
          };
        }
        if (/FROM tenant_memberships membership/.test(sql)) {
          return { rows: [{ id: '33333333-3333-4333-8333-333333333333', label: 'Jane Wanjiku' }], rowCount: 1 };
        }
        return { rows: [{ id: '22222222-2222-4222-8222-222222222222', label: 'ICT Lab Projector - ICT-001' }], rowCount: 1 };
      },
    } as never,
    {} as never,
  );

  const [assets, options] = await Promise.all([service.getAssets(), service.getOptions()]);

  assert.equal(assets.metrics.total_assets, 1);
  assert.equal(assets.assetsList[0]?.asset_tag, 'ICT-001');
  assert.equal(options.assets.length, 1);
  assert.equal(options.staff[0]?.label, 'Jane Wanjiku');
  assert.ok(queries.every((query) => query.params[0] === 'tenant-a'));
  assert.ok(queries.every((query) => !/\bict_(?:assets|asset_assignments|asset_loans|maintenance_logs)\b/.test(query.sql)));
  assert.ok(queries.every((query) => /\b(?:assets|tenant_memberships)\b/.test(query.sql)));
});

test('IctManagerCommandService persists a validated asset before audit and cross-dashboard notification', async () => {
  const writes: Array<{ sql: string; params: unknown[] }> = [];
  const audits: any[] = [];
  const notifications: any[] = [];
  const service = new IctManagerCommandService(
    { getStore: () => ({ tenant_id: 'tenant-a', user_id: '11111111-1111-4111-8111-111111111111' }) } as never,
    {} as never,
    {
      uuidOrNull: (value: unknown) => typeof value === 'string' && /^[0-9a-f-]{36}$/i.test(value) ? value : null,
      requiredText: (value: unknown, label: string) => {
        const normalized = String(value ?? '').trim();
        if (!normalized) throw new Error(`${label} is required`);
        return normalized;
      },
      writeSql: async (sql: string, params: unknown[]) => {
        writes.push({ sql, params });
        return {
          rows: [{ id: '22222222-2222-4222-8222-222222222222', title: 'ICT Lab Projector' }],
          rowCount: 1,
        };
      },
      recordAudit: async (...args: unknown[]) => { audits.push(args); },
      notifyRoles: async (...args: unknown[]) => { notifications.push(args); },
    } as never,
  );

  const result = await service.createAsset({
    asset_name: 'ICT Lab Projector',
    asset_tag: 'ICT-001',
    category: 'projector',
    location: 'ICT Lab',
    purchase_date: '2026-01-15',
  });

  assert.equal(result.success, true);
  assert.equal(writes.length, 1);
  assert.match(writes[0].sql, /INSERT INTO assets/);
  assert.match(writes[0].sql, /existing\.tenant_id = \$1/);
  assert.equal(writes[0].params[0], 'tenant-a');
  assert.equal(audits.length, 1);
  assert.equal(audits[0][1], 'ict.asset_created');
  assert.equal(notifications.length, 1);
  assert.deepEqual(notifications[0][1].targetRoles, ['ict_manager', 'principal', 'system_monitor']);
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
    {} as never,
  );

  await assert.rejects(() => service.getAssessments(), /dean read failed/);
});

test('DeanAcademicsCommandService returns a tenant-scoped, actionable moderation queue', async () => {
  const queries: Array<{ sql: string; params: unknown[] }> = [];
  const service = new DeanAcademicsCommandService(
    {
      getStore: () => ({ tenant_id: 'tenant-a', user_id: 'dean-a', role: 'dean_academics' }),
    } as never,
    {
      query: async (sql: string, params: unknown[]) => {
        queries.push({ sql, params });
        return {
          rows: [
            { id: 'series:assessment:class:submitted', status: 'submitted', mark_ids: ['mark-a'] },
            { id: 'series:assessment:class:reviewed', status: 'reviewed', mark_ids: ['mark-b'] },
          ],
          rowCount: 2,
        };
      },
    } as never,
    {} as never,
    {} as never,
  );

  const result = await service.getAssessments();

  assert.deepEqual(result.metrics, {
    active_assessments: 2,
    pending_marking: 1,
    completed: 1,
  });
  assert.equal(result.assessmentsList.length, 2);
  assert.deepEqual(queries[0]?.params, ['tenant-a']);
  assert.match(queries[0]?.sql ?? '', /FROM exam_marks mark/);
  assert.match(queries[0]?.sql ?? '', /INNER JOIN exam_assessments assessment/);
  assert.match(queries[0]?.sql ?? '', /subject\.id = mark\.subject_id::text/);
  assert.match(queries[0]?.sql ?? '', /class_section\.id = mark\.class_section_id::text/);
  assert.match(queries[0]?.sql ?? '', /mark\.tenant_id = \$1/);
  assert.match(queries[0]?.sql ?? '', /mark\.status IN \('submitted', 'reviewed'\)/);
  assert.match(queries[0]?.sql ?? '', /array_agg\(mark\.id::text/);
  assert.doesNotMatch(queries[0]?.sql ?? '', /SELECT \* FROM exam_marks/);
});

test('Dean assessment batch locking uses the real exams workflow with Dean approval permission', async () => {
  let delegated: Record<string, unknown> | undefined;
  const service = new DeanAcademicsCommandService(
    {
      getStore: () => ({ tenant_id: 'tenant-a', user_id: 'dean-a', role: 'dean_academics' }),
    } as never,
    {} as never,
    {} as never,
    {
      lockMarks: async (input: Record<string, unknown>) => {
        delegated = input;
        return { success: true, locked_count: 2 };
      },
    } as never,
  );

  const result = await service.lockAssessmentBatch({ markIds: ['mark-a', 'mark-a', 'mark-b'] });

  assert.deepEqual(delegated, { mark_ids: ['mark-a', 'mark-b'] });
  assert.deepEqual(result, { success: true, locked_count: 2 });
  assert.deepEqual(
    Reflect.getMetadata(PERMISSIONS_KEY, DeanAcademicsCommandController.prototype.lockBatch),
    ['exams:approve'],
  );
  assert.deepEqual(
    Reflect.getMetadata(MODULE_ACCESS_KEY, DeanAcademicsCommandController.prototype.lockBatch),
    ['exams'],
  );
});

test('DeputyCommandService merges school academic summary with the central intervention read model', async () => {
  const calls: Array<{ method: string; input?: unknown }> = [];
  const service = new DeputyCommandService(
    {
      getStore: () => ({
        tenant_id: 'tenant-a',
        user_id: 'deputy-a',
        role: 'deputy_principal',
      }),
    } as never,
    {
      getAcademics: async (tenantId: string) => {
        calls.push({ method: 'academic-summary', input: tenantId });
        return {
          metrics: { active_subjects: 8, active_interventions: 99 },
          coverage: [],
        };
      },
    } as never,
    {
      listAcademicInterventions: async () => {
        calls.push({ method: 'central-interventions' });
        return {
          metrics: {
            active_interventions: 2,
            students_targeted: 1,
            completed: 4,
            overdue: 1,
          },
          items: [{ id: 'intervention-a', status: 'active' }],
        };
      },
    } as never,
  );

  const result = await service.getAcademics();

  assert.deepEqual(calls, [
    { method: 'academic-summary', input: 'tenant-a' },
    { method: 'central-interventions' },
  ]);
  assert.deepEqual(result.metrics, {
    active_subjects: 8,
    active_interventions: 2,
    students_targeted: 1,
    completed: 4,
    overdue: 1,
  });
  assert.deepEqual(result.interventions, [{ id: 'intervention-a', status: 'active' }]);
  assert.deepEqual(result.academicinterventionsList, result.interventions);
});

test('DeputyCommandService delegates intervention creation and HOD messaging to ExamsService', async () => {
  const calls: Array<{ method: string; input: unknown }> = [];
  const service = new DeputyCommandService(
    {
      getStore: () => ({
        tenant_id: 'tenant-a',
        user_id: 'deputy-a',
        role: 'deputy_principal',
      }),
    } as never,
    {} as never,
    {
      createAcademicIntervention: async (input: unknown) => {
        calls.push({ method: 'create', input });
        return { success: true };
      },
      notifyAcademicInterventionHod: async (input: unknown) => {
        calls.push({ method: 'notify-hod', input });
        return { success: true };
      },
    } as never,
  );

  await service.createIntervention({
    class_section_id: 'class-a',
    class_name: 'Form 2 East',
    subject_id: 'subject-a',
    subject: 'Mathematics',
    owner_user_id: 'teacher-a',
    teacher: 'Mary Teacher',
    hod_user_id: 'hod-a',
    concern: 'The class mean is below the agreed target.',
    notes: 'Run two remediation lessons and reassess.',
    priority: 'high',
    coverage: '62%',
  });
  await service.messageHOD('intervention-a');

  assert.deepEqual(calls[0], {
    method: 'create',
    input: {
      student_id: undefined,
      exam_series_id: undefined,
      class_section_id: 'class-a',
      class_name: 'Form 2 East',
      subject_id: 'subject-a',
      subject_name: 'Mathematics',
      owner_user_id: 'teacher-a',
      owner_name: 'Mary Teacher',
      hod_user_id: 'hod-a',
      source: 'manual',
      trigger_reason: 'The class mean is below the agreed target.',
      baseline: { coverage: '62%' },
      plan: 'Run two remediation lessons and reassess.',
      target: undefined,
      priority: 'high',
      starts_on: undefined,
      due_on: undefined,
    },
  });
  assert.deepEqual(calls[1], {
    method: 'notify-hod',
    input: 'intervention-a',
  });
});

test('Deputy role delegation is exact-role guarded and blocks owner, admin, peer, and opaque role escalation', async () => {
  const delegated: Array<{ tenantId: string; payload: Record<string, unknown> }> = [];
  const service = new DeputyCommandService(
    {
      getStore: () => ({
        tenant_id: 'tenant-a',
        user_id: 'deputy-a',
        role: 'deputy_principal',
      }),
    } as never,
    {
      assignRole: async (tenantId: string, payload: Record<string, unknown>) => {
        delegated.push({ tenantId, payload });
        return { success: true };
      },
    } as never,
    {} as never,
  );

  assert.deepEqual(
    Reflect.getMetadata(ROLES_KEY, DeputyCommandController.prototype.assignRole),
    ['deputy_principal'],
  );

  for (const [staffId, role] of [
    ['deputy-a', 'owner'],
    ['deputy-a', 'accountant'],
    ['staff-a', 'owner'],
    ['staff-a', 'admin'],
    ['staff-a', 'principal'],
    ['staff-a', 'deputy_principal'],
  ]) {
    await assert.rejects(
      () => service.assignRole({ staffId, role }),
      ForbiddenException,
    );
  }

  await assert.rejects(
    () => service.assignRole({
      staffId: 'staff-a',
      roleId: '11111111-1111-4111-8111-111111111111',
    }),
    (error: unknown) =>
      error instanceof ForbiddenException
      && /opaque role IDs/i.test(error.message),
  );
  assert.equal(delegated.length, 0);
});

test('Deputy role delegation repository blocks self-assignment after tenant-scoped staff resolution', async () => {
  let capturedSql = '';
  const repository = new DeputyCommandRepository({
    query: async (sql: string) => {
      capturedSql = sql;
      return {
        rows: [{
          id: null,
          userId: '11111111-1111-4111-8111-111111111111',
          staffName: 'Deputy Principal',
          roleId: 'role-accountant',
          roleName: 'Accountant',
          status: 'self_assignment_blocked',
        }],
      };
    },
  } as never);

  await assert.rejects(
    () => repository.assignRole('tenant-a', {
      staffId: 'staff-profile-for-deputy',
      roleCode: 'accountant',
      assignedByUserId: '11111111-1111-4111-8111-111111111111',
    }),
    (error: unknown) =>
      error instanceof ForbiddenException
      && /cannot assign additional roles to themselves/i.test(error.message),
  );
  assert.match(
    capturedSql,
    /target_staff\.user_id IS DISTINCT FROM \$4::uuid/,
  );
});

test('Deputy role delegation canonicalizes approved lower-privilege roles and binds the current tenant and actor', async () => {
  let delegated: { tenantId: string; payload: Record<string, unknown> } | null = null;
  const service = new DeputyCommandService(
    {
      getStore: () => ({
        tenant_id: 'tenant-a',
        user_id: 'deputy-a',
        role: 'deputy_principal',
      }),
    } as never,
    {
      assignRole: async (tenantId: string, payload: Record<string, unknown>) => {
        delegated = { tenantId, payload };
        return { success: true };
      },
    } as never,
    {} as never,
  );

  await service.assignRole({
    staffId: 'staff-a',
    role: 'Head of Department',
    department: 'Sciences',
  });

  assert.deepEqual(delegated, {
    tenantId: 'tenant-a',
    payload: {
      staffId: 'staff-a',
      roleCode: 'hod',
      department: 'Sciences',
      assignedByUserId: 'deputy-a',
    },
  });
});

test('DeanAcademicsCommandService reads interventions from the same central academic model', async () => {
  const calls: string[] = [];
  const service = new DeanAcademicsCommandService(
    {
      getStore: () => ({
        tenant_id: 'tenant-a',
        user_id: 'dean-a',
        role: 'dean_academics',
      }),
    } as never,
    {} as never,
    {} as never,
    {
      listAcademicInterventions: async () => {
        calls.push('listAcademicInterventions');
        return {
          metrics: { active_interventions: 1 },
          items: [{ id: 'intervention-a', tenant_id: 'tenant-a' }],
        };
      },
    } as never,
  );

  const result = await service.getAcademicInterventions();

  assert.deepEqual(calls, ['listAcademicInterventions']);
  assert.deepEqual(result.items, [{ id: 'intervention-a', tenant_id: 'tenant-a' }]);
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

test('TeacherCommandService derives syllabus coverage only from the current teacher active assignments', async () => {
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
              id: 'assignment-a',
              subject: 'Mathematics',
              class_name: 'Form 2 East',
              topic: 'Quadratic equations',
              coverage: 100,
              target: 100,
              status: 'On Track',
            },
            {
              id: 'assignment-b',
              subject: 'Physics',
              class_name: 'Form 3 North',
              topic: 'Waves',
              coverage: 50,
              target: 100,
              status: 'Behind',
            },
          ],
          rowCount: 2,
        };
      },
    } as never,
    {} as never,
  );

  const result = await service.getSyllabusCoverage();

  assert.deepEqual(result.metrics, { on_track: 1, behind: 1 });
  assert.equal(result.items[0].topic, 'Quadratic equations');
  assert.deepEqual(queries[0].params, [
    'tenant-a',
    '11111111-1111-4111-8111-111111111111',
  ]);
  assert.match(queries[0].sql, /FROM teacher_subject_assignments assignment/i);
  assert.match(queries[0].sql, /LEFT JOIN academics_lesson_plans plan/i);
  assert.match(queries[0].sql, /LEFT JOIN academics_lesson_logs log/i);
  assert.match(queries[0].sql, /assignment\.tenant_id = \$1/i);
  assert.match(queries[0].sql, /assignment\.teacher_user_id::text = \$2/i);
  assert.match(queries[0].sql, /assignment\.effective_from <= CURRENT_DATE/i);
  assert.match(queries[0].sql, /assignment\.effective_to IS NULL/i);
});

test('TeacherCommandService exposes only active assigned co-curricular duties and published sessions', async () => {
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
              id: 'assignment-club-a',
              activity: 'Debate Club',
              date: 'Fri 15:30',
              expected: 28,
              present: 'Not recorded',
              status: 'Scheduled Today',
              sessions_today: 1,
            },
          ],
          rowCount: 1,
        };
      },
    } as never,
    {} as never,
  );

  const result = await service.getClubs();

  assert.deepEqual(result.metrics, { active_clubs: 1, sessions_today: 1 });
  assert.equal(result.items[0].activity, 'Debate Club');
  assert.equal('sessions_today' in result.items[0], false);
  assert.deepEqual(queries[0].params, [
    'tenant-a',
    '11111111-1111-4111-8111-111111111111',
  ]);
  assert.match(queries[0].sql, /FROM teacher_subject_assignments assignment/i);
  assert.match(queries[0].sql, /LEFT JOIN timetable_slots timetable/i);
  assert.match(queries[0].sql, /timetable\.status = 'published'/i);
  assert.match(queries[0].sql, /subject\.is_co_curricular = TRUE/i);
  assert.match(queries[0].sql, /assignment\.effective_from <= CURRENT_DATE/i);
});

test('TeacherCommandService resource requests require current assignment and remain owner scoped', async () => {
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
              item: 'Graph books',
              quantity: 30,
              date: '2026-08-09',
              priority: 'normal',
              status: 'approved',
            },
          ],
          rowCount: 1,
        };
      },
    } as never,
    {} as never,
  );

  const result = await service.getResourceRequests();

  assert.equal(result.metrics.approved, 1);
  assert.equal(result.items[0].item, 'Graph books');
  assert.deepEqual(queries[0].params, [
    'tenant-a',
    '11111111-1111-4111-8111-111111111111',
    true,
  ]);
  assert.match(queries[0].sql, /FROM inventory_requests/i);
  assert.match(queries[0].sql, /FROM teacher_subject_assignments assignment/i);
  assert.match(queries[0].sql, /assignment\.tenant_id = inventory_requests\.tenant_id/i);
  assert.match(queries[0].sql, /assignment\.teacher_user_id::text = \$2/i);
  assert.match(queries[0].sql, /requested_by = \$2/i);
  assert.match(queries[0].sql, /assignment\.effective_to IS NULL/i);
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
  assert.equal(writes[0].params[3], '11111111-1111-4111-8111-111111111111');
  assert.match(String(writes[0].params[6]), /Exercise books/);
  assert.match(String(writes[0].params[6]), /11111111-1111-4111-8111-111111111111/);
  assert.equal(workflowCalls.length, 1);
  assert.equal(workflowCalls[0].tenantId, 'tenant-a');
  assert.equal(workflowCalls[0].sourceRole, 'teacher');
  assert.deepEqual(workflowCalls[0].targetRoles, ['storekeeper', 'hod', 'principal']);
  assert.equal(workflowCalls[0].eventType, 'inventory.requested');
  assert.equal(workflowCalls[0].entityType, 'inventory_request');
});

test('TransportManagerCommandService queues notices only for selected same-tenant transport guardians', async () => {
  const writes: Array<{ sql: string; params: unknown[] }> = [];
  const service = new TransportManagerCommandService(
    {
      getStore: () => ({
        tenant_id: 'tenant-a',
        user_id: '11111111-1111-4111-8111-111111111111',
        role: 'transport_manager',
      }),
    } as never,
    {} as never,
    {
      uuidOrNull: (value: unknown) => {
        const text = String(value ?? '').trim();
        return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(text)
          ? text
          : null;
      },
      requiredText: (value: unknown, label: string) => {
        const text = String(value ?? '').trim();
        if (!text) throw new Error(`${label} is required`);
        return text;
      },
      writeSql: async (sql: string, params: unknown[]) => {
        writes.push({ sql, params });
        return {
          rows: [{
            id: 'transport-notice-event-1',
            targeted_students: 1,
            sms_queued: 1,
            in_app_notifications_created: 1,
            delivery_status: 'queued',
            workflow_status: 'pending',
            audits_created: 1,
          }],
          rowCount: 1,
        };
      },
    } as never,
  );

  const result = await service.sendNotice({
    title: 'Bus delayed',
    message: 'Bus 11 is delayed by 14 minutes.',
    notice_type: 'delay',
    route_id: '22222222-2222-4222-8222-222222222222',
    student_ids: ['33333333-3333-4333-8333-333333333333'],
    channels: ['in_app', 'sms'],
  });

  assert.equal(result.success, true);
  assert.equal(result.status, 'queued');
  assert.equal(result.sms_queued, 1);
  assert.equal(result.in_app_notifications_created, 1);
  assert.equal(result.event.type, 'transport.notice_queued');
  assert.equal(writes.length, 1);
  assert.equal(writes[0].params[0], 'tenant-a');
  assert.equal(writes[0].params[1], '22222222-2222-4222-8222-222222222222');
  assert.deepEqual(writes[0].params[2], ['33333333-3333-4333-8333-333333333333']);
  assert.match(writes[0].sql, /FROM transport_manifest_students manifest_student/);
  assert.match(writes[0].sql, /manifest_student\.tenant_id = \$1/);
  assert.match(writes[0].sql, /LEFT JOIN student_guardians guardian/);
  assert.match(writes[0].sql, /INSERT INTO notifications/);
  assert.match(writes[0].sql, /INSERT INTO communication_sms_outbox/);
  assert.match(writes[0].sql, /INSERT INTO workflow_events/);
  assert.match(writes[0].sql, /'transport\.notice_queued'/);
  assert.match(writes[0].sql, /INSERT INTO audit_logs/);
  assert.doesNotMatch(writes[0].sql, /transport\.notice_sent/);
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

test('TransportManagerCommandService returns route metrics and rows from tenant-scoped route relationships', async () => {
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
        return {
          rows: [
            {
              id: 'route-a',
              route_name: 'Town Route',
              pickup_points: 4,
              students_count: 32,
              driver: 'John Kamau',
              vehicle: 'KDA 123A',
              status: 'Active',
            },
            {
              id: 'route-b',
              route_name: 'Hill Route',
              pickup_points: 2,
              students_count: 0,
              driver: '',
              vehicle: '',
              status: 'Paused',
            },
          ],
          rowCount: 2,
        };
      },
    } as never,
    {} as never,
  );

  const result = await service.getRoutes();

  assert.deepEqual(result.metrics, { total_routes: 2, active_routes: 1 });
  assert.equal(result.routesList.length, 2);
  assert.equal(result.routesList[0]?.students_count, 32);
  assert.equal(queries.length, 1);
  assert.deepEqual(queries[0].params, ['tenant-a']);
  assert.match(queries[0].sql, /WHERE route\.tenant_id = \$1/);
  assert.match(queries[0].sql, /stop\.tenant_id = route\.tenant_id/);
  assert.match(queries[0].sql, /manifest\.tenant_id = route\.tenant_id/);
  assert.match(queries[0].sql, /manifest_student\.tenant_id = manifest\.tenant_id/);
  assert.match(queries[0].sql, /trip\.tenant_id = route\.tenant_id/);
  assert.match(queries[0].sql, /vehicle\.tenant_id = trip\.tenant_id/);
  assert.match(queries[0].sql, /driver\.tenant_id = trip\.tenant_id/);
});

test('TransportManagerCommandService assigns same-tenant learners by route in one governed mutation', async () => {
  const writes: Array<{ sql: string; params: unknown[] }> = [];
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
        return {
          rows: [{
            id: 'assignment-a',
            manifest_id: 'manifest-created',
            route_id: params[2],
            student_id: params[3],
            workflow_event_id: 'event-a',
            audits_created: 1,
            notifications_created: 3,
          }],
          rowCount: 1,
        };
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
  assert.equal(writes.length, 1);
  assert.match(writes[0].sql, /WITH selected_student AS/);
  assert.match(writes[0].sql, /student\.tenant_id = \$1/);
  assert.match(writes[0].sql, /INNER JOIN transport_routes route[\s\S]*route\.tenant_id = manifest\.tenant_id/);
  assert.match(writes[0].sql, /pickup_stop\.tenant_id = candidate_route\.tenant_id/);
  assert.match(writes[0].sql, /INSERT INTO transport_manifests/);
  assert.match(writes[0].sql, /INSERT INTO transport_manifest_students/);
  assert.match(writes[0].sql, /INSERT INTO workflow_events/);
  assert.match(writes[0].sql, /INSERT INTO audit_logs/);
  assert.match(writes[0].sql, /INSERT INTO notifications/);
  assert.equal(writes[0].params[0], 'tenant-a');
  assert.equal(writes[0].params[1], null);
  assert.equal(writes[0].params[2], 'route-a');
  assert.equal(writes[0].params[3], 'student-a');
  assert.equal(writes[0].params[4], 'stop-a');
  assert.equal(writes[0].params[5], 'stop-b');
  assert.equal(result.assignment.route_id, 'route-a');
  assert.equal(result.assignment.student_id, 'student-a');
  assert.equal(result.assignment.audits_created, 1);
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
  assert.equal(reads.some((read) => /FROM exam_mark_entry_windows mark_window/i.test(read.sql)), true);
  assert.equal(reads.some((read) => /LEFT JOIN exam_marks mark/i.test(read.sql)), true);
  assert.equal(reads.every((read) => /tenant_id = \$1/.test(read.sql)), true);
});

test('ExamsManagerCommandService loads exam setup options from the canonical staff profile contract', async () => {
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

  const options = await service.getExamSetupOptions();
  const staffRead = reads.find((read) => /FROM staff_profiles/i.test(read.sql));
  const assessmentRead = reads.find((read) => /FROM exam_assessments assessment/i.test(read.sql));

  assert.deepEqual(options.subjects, []);
  assert.deepEqual(options.classes, []);
  assert.deepEqual(options.gradingSystems, []);
  assert.equal(reads.length, 7);
  assert.equal(reads.every((read) => read.params[0] === 'tenant-a'), true);
  assert.ok(staffRead);
  assert.match(staffRead.sql, /NULLIF\(display_name, ''\)/i);
  assert.doesNotMatch(staffRead.sql, /\bfull_name\b|\bpreferred_name\b|\bemail\b/i);
  assert.ok(assessmentRead);
  assert.deepEqual(assessmentRead.params, ['tenant-a']);
  assert.match(assessmentRead.sql, /subject\.id::text\s*=\s*assessment\.subject_id::text/i);
  assert.match(assessmentRead.sql, /WHERE assessment\.tenant_id = \$1/i);
  assert.doesNotMatch(assessmentRead.sql, /subject\.id\s*=\s*assessment\.subject_id/i);
});

test('ExamsManagerCommandService reads timetable with canonical staff fields and schema-compatible joins', async () => {
  const reads: Array<{ sql: string; params: unknown[] }> = [];
  const service = new ExamsManagerCommandService(
    {
      getStore: () => ({ tenant_id: 'tenant-a', user_id: '11111111-1111-4111-8111-111111111111' }),
    } as never,
    {} as never,
    {
      readSql: async (sql: string, params: unknown[]) => {
        reads.push({ sql, params });
        return {
          rows: [{
            id: 'slot-1',
            exam_name: 'Term 1 Opener',
            subject: 'Mathematics',
            class_name: 'All assigned learners',
            date: '2026-01-12',
            start_time: '08:00:00',
            end_time: '10:00:00',
            venue: 'Room 1',
            invigilator: 'Amina Otieno',
            status: 'Scheduled',
          }],
          rowCount: 1,
        };
      },
    } as never,
  );

  const timetable = await service.getExamTimetable();

  assert.equal(timetable.metrics.total_slots, 1);
  assert.equal(timetable.metrics.scheduled, 1);
  assert.equal(reads.length, 1);
  assert.deepEqual(reads[0].params, ['tenant-a']);
  assert.match(reads[0].sql, /staff\.display_name/i);
  assert.match(reads[0].sql, /staff\.staff_number/i);
  assert.doesNotMatch(reads[0].sql, /\bstaff\.(?:full_name|preferred_name|email)\b/i);
  assert.match(reads[0].sql, /series\.id::text\s*=\s*slot\.exam_series_id::text/i);
  assert.match(reads[0].sql, /assessment\.id::text\s*=\s*slot\.assessment_id::text/i);
  assert.match(reads[0].sql, /invigilator\.timetable_slot_id::text\s*=\s*slot\.id::text/i);
  assert.match(reads[0].sql, /staff\.user_id::text\s*=\s*invigilator\.staff_user_id::text/i);
  assert.match(reads[0].sql, /WHERE slot\.tenant_id = \$1/i);
});

test('ExamsManagerCommandService creates exam setup as a durable tenant-scoped exam series', async () => {
  const writes: Array<{ sql: string; params: unknown[] }> = [];
  const workflowCalls: any[] = [];
  const schoolEventCalls: any[] = [];
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
            name: 'Term 1 Opener',
            starts_on: '2026-01-12',
            ends_on: '2026-01-16',
            status: 'draft',
            created_at: '2026-07-13T00:00:00.000Z',
          }],
          rowCount: 1,
        };
      },
      readSql: async () => ({
        rows: [
          { column_name: 'academic_term_id' },
          { column_name: 'created_by_user_id' },
          { column_name: 'created_at' },
          { column_name: 'updated_at' },
        ],
        rowCount: 4,
      }),
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
    undefined,
    {
      recordSchoolOperation: async (input: any) => {
        schoolEventCalls.push(input);
        return { status: 'accepted' };
      },
    } as never,
  );

  const result = await service.createExamSetup({
    name: 'Term 1 Opener',
    academic_term_id: '33333333-3333-4333-8333-333333333333',
    starts_on: '2026-01-12',
    ends_on: '2026-01-16',
    status: 'scheduled',
    subject_ids: ['44444444-4444-4444-8444-444444444444'],
    class_section_ids: ['55555555-5555-4555-8555-555555555555'],
  });

  assert.equal(result.success, true);
  assert.equal(result.exam.name, 'Term 1 Opener');
  assert.match(writes[0].sql, /INSERT INTO exam_series/i);
  assert.doesNotMatch(writes[0].sql, /\$1::uuid/i);
  assert.match(writes[0].sql, /created_at, updated_at/i);
  assert.match(writes[0].sql, /NOW\(\), NOW\(\)/i);
  assert.equal(writes[0].params[0], 'tenant-a');
  assert.equal(writes[0].params[1], '33333333-3333-4333-8333-333333333333');
  assert.equal(writes[0].params[2], 'Term 1 Opener');
  assert.equal(writes[0].params[5], 'draft');
  assert.equal(workflowCalls.length, 1);
  assert.equal(workflowCalls[0].tenantId, 'tenant-a');
  assert.equal(workflowCalls[0].eventType, 'exams.exam-setup.created');
  assert.equal(workflowCalls[0].entityType, 'exam_series');
  assert.equal(workflowCalls[0].entityId, '22222222-2222-4222-8222-222222222222');
  assert.deepEqual(workflowCalls[0].targetRoles, ['principal', 'dean_academics', 'hod', 'teacher']);
  assert.equal(workflowCalls[0].payload.exam_series_id, '22222222-2222-4222-8222-222222222222');
  assert.equal(schoolEventCalls.length, 1);
  assert.equal(schoolEventCalls[0].event.type, 'exam.series_created');
  assert.equal(schoolEventCalls[0].event.entityId, '22222222-2222-4222-8222-222222222222');
  assert.deepEqual(schoolEventCalls[0].notifications[0].audienceRoles, ['principal', 'dean_academics', 'hod', 'teacher']);
});

test('ExamsManagerCommandService rejects unscoped exam setup before persistence', async () => {
  let writeCount = 0;
  const service = new ExamsManagerCommandService(
    {
      getStore: () => ({ tenant_id: 'kibabi-high', user_id: '11111111-1111-4111-8111-111111111111' }),
    } as never,
    {} as never,
    {
      writeSql: async () => {
        writeCount += 1;
        return { rows: [], rowCount: 0 };
      },
      readSql: async () => ({ rows: [], rowCount: 0 }),
      recordWorkflowAction: async () => ({ id: 'workflow-1' }),
      requiredText: (value: unknown, label: string) => {
        const text = String(value ?? '').trim();
        if (!text) throw new Error(`${label} is required`);
        return text;
      },
    } as never,
  );

  await assert.rejects(
    service.createExamSetup({
      name: 'Unscoped exam',
      starts_on: '2026-01-12',
      ends_on: '2026-01-16',
      status: 'draft',
    }),
    /Choose at least one subject and one class/i,
  );
  assert.equal(writeCount, 0);
});

test('ExamsManagerCommandService persists selected exam subjects and class mark-entry windows', async () => {
  const writes: Array<{ sql: string; params: unknown[] }> = [];
  const workflowCalls: any[] = [];
  const service = new ExamsManagerCommandService(
    {
      getStore: () => ({ tenant_id: 'kibabi-high', user_id: '22222222-2222-4222-8222-222222222222' }),
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
  assert.equal(writes[1].params[0], 'kibabi-high');
  assert.equal(writes[1].params[1], '33333333-3333-4333-8333-333333333333');
  assert.deepEqual(writes[1].params[2], [
    '44444444-4444-4444-8444-444444444444',
    '55555555-5555-4555-8555-555555555555',
  ]);
  assert.match(writes[1].sql, /subject\.id::uuid/i);
  assert.doesNotMatch(writes[1].sql, /\$1::uuid/i);
  assert.match(writes[1].sql, /subject\.id::text\s*=\s*ANY\(\$3::text\[\]\)/i);
  assert.doesNotMatch(writes[1].sql, /NOT EXISTS/i);
  assert.doesNotMatch(writes[1].sql, /subject\.id\s*=\s*ANY\(\$3::uuid\[\]\)/i);
  assert.match(writes[1].sql, /ON CONFLICT\s*\(tenant_id, exam_series_id, subject_id, name\)\s*DO UPDATE/i);
  assert.match(writes[1].sql, /created_at,\s*updated_at/i);
  assert.match(writes[1].sql, /NOW\(\),\s*NOW\(\)/i);
  assert.match(writes[1].sql, /max_score\s*=\s*EXCLUDED\.max_score/i);
  assert.match(writes[2].sql, /INSERT INTO exam_mark_entry_windows/i);
  assert.deepEqual(writes[2].params[3], [
    '66666666-6666-4666-8666-666666666666',
    '77777777-7777-4777-8777-777777777777',
  ]);
  assert.match(writes[2].sql, /subject\.id::uuid/i);
  assert.match(writes[2].sql, /section\.id::uuid/i);
  assert.doesNotMatch(writes[2].sql, /\$1::uuid/i);
  assert.match(writes[2].sql, /subject\.id::text\s*=\s*ANY\(\$3::text\[\]\)/i);
  assert.match(writes[2].sql, /section\.id::text\s*=\s*ANY\(\$4::text\[\]\)/i);
  assert.doesNotMatch(writes[2].sql, /NOT EXISTS/i);
  assert.doesNotMatch(writes[2].sql, /(?:subject|section)\.id\s*=\s*ANY\(\$[34]::uuid\[\]\)/i);
  assert.match(writes[2].sql, /ON CONFLICT\s*\(tenant_id, exam_series_id, subject_id, class_section_id\)\s*DO UPDATE/i);
  assert.match(writes[2].sql, /created_at,\s*updated_at/i);
  assert.match(writes[2].sql, /NOW\(\),\s*NOW\(\)/i);
  assert.match(writes[2].sql, /status\s*=\s*EXCLUDED\.status/i);
  assert.equal(writes[2].params[6], 'open');
  assert.equal(workflowCalls[0].payload.subjectsConfigured, 2);
  assert.equal(workflowCalls[0].payload.markEntryWindowsConfigured, 4);
});

test('ExamsManagerCommandService keeps draft mark-entry windows closed using the database lifecycle', async () => {
  const writes: Array<{ sql: string; params: unknown[] }> = [];
  const service = new ExamsManagerCommandService(
    {
      getStore: () => ({ tenant_id: 'kibabi-high', user_id: '22222222-2222-4222-8222-222222222222' }),
    } as never,
    {} as never,
    {
      writeSql: async (sql: string, params: unknown[]) => {
        writes.push({ sql, params });
        return { rows: [{ id: 'saved-row' }], rowCount: 1 };
      },
    } as never,
  );

  await (service as unknown as {
    syncExamScope: (
      tenantId: string,
      examSeriesId: string,
      dto: Record<string, unknown>,
      startsOn: string,
      endsOn: string,
    ) => Promise<unknown>;
  }).syncExamScope(
    'kibabi-high',
    '33333333-3333-4333-8333-333333333333',
    {
      status: 'draft',
      subject_ids: ['44444444-4444-4444-8444-444444444444'],
      class_section_ids: ['66666666-6666-4666-8666-666666666666'],
    },
    '2026-01-12',
    '2026-01-16',
  );

  assert.equal(writes.length, 2);
  assert.equal(writes[1].params[6], 'closed');
});

test('ExamsManagerCommandService reads configured windows before teachers enter the first mark', async () => {
  const reads: Array<{ sql: string; params: unknown[] }> = [];
  const service = new ExamsManagerCommandService(
    {
      getStore: () => ({ tenant_id: 'kibabi-high', user_id: '22222222-2222-4222-8222-222222222222' }),
    } as never,
    {} as never,
    {
      readSql: async (sql: string, params: unknown[]) => {
        reads.push({ sql, params });
        return {
          rows: [{
            id: '77777777-7777-4777-8777-777777777777',
            exam_name: 'Term 1 Opener',
            subject: 'Mathematics',
            class_name: 'Form 1 East',
            teacher: 'Amina Otieno',
            total_students: 35,
            entered: 0,
            missing: 35,
            status: 'Pending',
            deadline: '2026-01-16',
          }],
          rowCount: 1,
        };
      },
    } as never,
  );

  const result = await service.getMarksEntry();

  assert.equal(result.metrics.total_entries, 1);
  assert.equal(result.metrics.pending, 1);
  assert.equal(result.entries[0]?.exam_name, 'Term 1 Opener');
  assert.deepEqual(reads[0].params, ['kibabi-high']);
  assert.match(reads[0].sql, /FROM exam_mark_entry_windows mark_window/i);
  assert.match(reads[0].sql, /LEFT JOIN exam_marks mark/i);
  assert.match(reads[0].sql, /LEFT JOIN subjects subject/i);
  assert.match(reads[0].sql, /LEFT JOIN class_sections class_section/i);
  assert.match(reads[0].sql, /WHERE mark_window\.tenant_id = \$1/i);
});

test('ExamsManagerCommandService locks a whole tenant-scoped mark-entry window and its marks', async () => {
  const writes: Array<{ sql: string; params: unknown[] }> = [];
  const workflowCalls: any[] = [];
  const service = new ExamsManagerCommandService(
    {
      getStore: () => ({ tenant_id: 'kibabi-high', user_id: '22222222-2222-4222-8222-222222222222' }),
    } as never,
    {} as never,
    {
      writeSql: async (sql: string, params: unknown[]) => {
        writes.push({ sql, params });
        return { rows: [{ id: params[1], status: 'closed', marks_locked: 35 }], rowCount: 1 };
      },
      recordWorkflowAction: async (input: any) => {
        workflowCalls.push(input);
        return { id: 'workflow-1', ...input };
      },
    } as never,
  );

  const result = await service.lockMarksEntry('77777777-7777-4777-8777-777777777777');

  assert.equal(result.success, true);
  assert.deepEqual(writes[0].params, [
    'kibabi-high',
    '77777777-7777-4777-8777-777777777777',
    '22222222-2222-4222-8222-222222222222',
  ]);
  assert.match(writes[0].sql, /UPDATE exam_mark_entry_windows/i);
  assert.match(writes[0].sql, /UPDATE exam_marks mark/i);
  assert.match(writes[0].sql, /WHERE tenant_id = \$1/i);
  assert.equal(workflowCalls[0].eventType, 'exams.marks-entry.locked');
});

test('ExamsManagerCommandService configures an existing exam setup inside the current tenant', async () => {
  const writes: Array<{ sql: string; params: unknown[] }> = [];
  const workflowCalls: any[] = [];
  const schoolEventCalls: any[] = [];
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
    undefined,
    {
      recordSchoolOperation: async (input: any) => {
        schoolEventCalls.push(input);
        return { status: 'accepted' };
      },
    } as never,
  );

  const result = await service.configureExamSetup('22222222-2222-4222-8222-222222222222', {
    name: 'Term 1 Midterm',
    starts_on: '2026-02-02',
    ends_on: '2026-02-06',
    status: 'submitted',
    subject_ids: ['44444444-4444-4444-8444-444444444444'],
    class_section_ids: ['55555555-5555-4555-8555-555555555555'],
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
  assert.equal(schoolEventCalls.length, 1);
  assert.equal(schoolEventCalls[0].event.type, 'exam.series_configured');
  assert.equal(schoolEventCalls[0].event.entityId, '22222222-2222-4222-8222-222222222222');
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

test('ExamsManagerCommandService delegates report-card generation to the governed exams lifecycle', async () => {
  const workflowCalls: any[] = [];
  const lifecycleCalls: Array<Record<string, unknown>> = [];
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
    {
      generateReportCardBatch: async (input: Record<string, unknown>) => {
        lifecycleCalls.push(input);
        return {
          completed_students: 2,
          failed_students: 0,
          generated_report_card_ids: ['card-1', 'card-2'],
        };
      },
    } as never,
  );

  const result = await service.generateReportCards('22222222-2222-4222-8222-222222222222', { note: 'Term reports' });

  assert.equal(result.success, true);
  assert.equal(result.generated_count, 2);
  assert.deepEqual(lifecycleCalls[0], {
    exam_series_id: '22222222-2222-4222-8222-222222222222',
  });
  assert.equal(workflowCalls.length, 1);
  assert.equal(workflowCalls[0].eventType, 'exams.report-card.generated');
  assert.equal(workflowCalls[0].entityId, '22222222-2222-4222-8222-222222222222');
  assert.equal(workflowCalls[0].payload.generated_count, 2);
});

test('ExamsManagerCommandService delegates publication to the Principal-governed exams lifecycle', async () => {
  const lifecycleCalls: string[] = [];
  const service = new ExamsManagerCommandService(
    {
      getStore: () => ({ tenant_id: 'tenant-a', user_id: '11111111-1111-4111-8111-111111111111' }),
    } as never,
    {} as never,
    {} as never,
    {
      publishExamSeries: async (examSeriesId: string) => {
        lifecycleCalls.push(examSeriesId);
        return {
          success: true,
          published_report_cards_count: 2,
          published_marks_count: 8,
          already_published_count: 0,
        };
      },
    } as never,
  );

  const result = await service.publishResults('22222222-2222-4222-8222-222222222222', { notes: 'Release to portals' });

  assert.equal(result.success, true);
  assert.equal(result.published_count, 2);
  assert.deepEqual(lifecycleCalls, ['22222222-2222-4222-8222-222222222222']);
});

test('ExamsManagerCommandService propagates governed publication readiness failures', async () => {
  const service = new ExamsManagerCommandService(
    {
      getStore: () => ({ tenant_id: 'tenant-a', user_id: '11111111-1111-4111-8111-111111111111' }),
    } as never,
    {} as never,
    {} as never,
    {
      publishExamSeries: async () => {
        throw new BadRequestException('Generate, submit, and approve report cards before publishing this exam series');
      },
    } as never,
  );

  await assert.rejects(
    service.publishResults('22222222-2222-4222-8222-222222222222', {}),
    /Generate, submit, and approve report cards/i,
  );
});

test('ExamsManagerCommandService delegates withdrawal with a required reason', async () => {
  const lifecycleCalls: Array<{ id: string; reason: string }> = [];
  const service = new ExamsManagerCommandService(
    {
      getStore: () => ({ tenant_id: 'tenant-a', user_id: '11111111-1111-4111-8111-111111111111' }),
    } as never,
    {} as never,
    {
      requiredText: (value: unknown, label: string) => {
        const text = String(value ?? '').trim();
        if (!text) throw new BadRequestException(`${label} is required`);
        return text;
      },
    } as never,
    {
      unpublishExamSeries: async (id: string, reason: string) => {
        lifecycleCalls.push({ id, reason });
        return {
          success: true,
          withdrawn_report_cards_count: 2,
          relocked_marks_count: 8,
        };
      },
    } as never,
  );

  const result = await service.unpublishResults(
    '22222222-2222-4222-8222-222222222222',
    { reason: 'Incorrect release scope' },
  );

  assert.equal(result.success, true);
  assert.equal(result.unpublished_count, 2);
  assert.deepEqual(lifecycleCalls, [{
    id: '22222222-2222-4222-8222-222222222222',
    reason: 'Incorrect release scope',
  }]);
});

test('ParentCommandService scopes finance reads to the authenticated parent and school', async () => {
  const queries: Array<{ sql: string; params: unknown[] }> = [];
  const service = new ParentCommandService(
    {
      getStore: () => ({
        tenant_id: 'tenant-a',
        user_id: '11111111-1111-4111-8111-111111111111',
      }),
    } as never,
    {
      query: async (sql: string, params: unknown[]) => {
        queries.push({ sql, params });
        return { rows: [], rowCount: 0 };
      },
    } as never,
  );

  const result = await service.getFees();

  assert.deepEqual(result, {
    metrics: {
      balance_minor: 0,
      open_invoices: 0,
      payments: 0,
    },
    accounts: [],
    invoices: [],
    transactions: [],
  });
  assert.equal(queries.length, 3);
  for (const query of queries) {
    assert.deepEqual(query.params, [
      'tenant-a',
      '11111111-1111-4111-8111-111111111111',
    ]);
    assert.match(query.sql, /student_guardians/i);
    assert.match(query.sql, /guardian\.tenant_id = \$1/i);
    assert.match(query.sql, /guardian\.user_id = \$2::uuid/i);
  }
});

test('ParentCommandService keeps database failures visible to the portal', async () => {
  const service = new ParentCommandService(
    {
      getStore: () => ({
        tenant_id: 'tenant-a',
        user_id: '11111111-1111-4111-8111-111111111111',
      }),
    } as never,
    {
      query: async () => {
        throw new Error('parent finance read failed');
      },
    } as never,
  );

  await assert.rejects(service.getFees(), /parent finance read failed/i);
});

test('ParentCommandService reads canonical role-array notifications without exposing another explicit user', async () => {
  const queries: Array<{ sql: string; params: unknown[] }> = [];
  const service = new ParentCommandService(
    {
      getStore: () => ({
        tenant_id: 'tenant-a',
        user_id: '11111111-1111-4111-8111-111111111111',
      }),
    } as never,
    {
      query: async (sql: string, params: unknown[]) => {
        queries.push({ sql, params });
        return { rows: [], rowCount: 0 };
      },
    } as never,
  );

  await service.getNotifications();

  assert.deepEqual(queries[0].params, [
    'tenant-a',
    '11111111-1111-4111-8111-111111111111',
    'parent',
  ]);
  assert.match(queries[0].sql, /recipient_user_id::text/);
  assert.match(queries[0].sql, /metadata->'target_roles'/);
  assert.match(queries[0].sql, /metadata->'audienceRoles'/);
});

test('StudentCommandService scopes finance reads to the authenticated student and school', async () => {
  const queries: Array<{ sql: string; params: unknown[] }> = [];
  const service = new StudentCommandService(
    {
      getStore: () => ({
        tenant_id: 'tenant-a',
        user_id: '11111111-1111-4111-8111-111111111111',
      }),
    } as never,
    {
      query: async (sql: string, params: unknown[]) => {
        queries.push({ sql, params });
        return { rows: [], rowCount: 0 };
      },
    } as never,
  );

  const result = await service.getFees();

  assert.deepEqual(result, {
    metrics: {
      balance_minor: 0,
      open_invoices: 0,
      payments: 0,
    },
    account: null,
    invoices: [],
    transactions: [],
  });
  assert.equal(queries.length, 3);
  for (const query of queries) {
    assert.deepEqual(query.params, [
      'tenant-a',
      '11111111-1111-4111-8111-111111111111',
    ]);
    assert.match(query.sql, /student_portal_access/i);
    assert.match(query.sql, /access\.tenant_id = \$1/i);
    assert.match(query.sql, /access\.user_id = \$2::uuid/i);
  }
});

test('StudentCommandService shares only current-class assignments and preserves non-score evidence', async () => {
  const queries: Array<{ sql: string; params: unknown[] }> = [];
  const service = new StudentCommandService(
    {
      getStore: () => ({
        tenant_id: 'tenant-a',
        user_id: '11111111-1111-4111-8111-111111111111',
      }),
    } as never,
    {
      query: async (sql: string, params: unknown[]) => {
        queries.push({ sql, params });
        if (/FROM student_portal_access access[\s\S]*JOIN academics_assignments assignment/.test(sql)) {
          return {
            rows: [{
              id: 'assignment-a',
              title: 'Algebra practice',
              description: null,
              subject: 'Mathematics',
              teacher: 'Ms Wanjiku',
              due_at: '2026-07-31T15:00:00.000Z',
              status: 'Published',
              submission_status: null,
              submitted_at: null,
              completed_at: null,
            }],
            rowCount: 1,
          };
        }
        if (/JOIN exam_marks mark/.test(sql)) {
          return {
            rows: [{
              id: 'mark-a',
              subject: 'Mathematics',
              exam: 'Term 2',
              teacher: 'Ms Wanjiku',
              score: null,
              score_status: 'medical_exception',
              remarks: 'Medical evidence recorded',
              status: 'published',
              published_at: '2026-07-25T10:00:00.000Z',
            }],
            rowCount: 1,
          };
        }
        return { rows: [], rowCount: 0 };
      },
    } as never,
  );

  const result = await service.getAcademics();

  assert.equal(result.assignments.length, 1);
  assert.equal(result.assignments[0].is_complete, false);
  assert.equal(result.metrics.pending_assignments, 1);
  assert.equal(result.metrics.entered_scores, 0);
  assert.equal(result.marks[0].score, null);
  assert.equal(result.marks[0].score_status, 'medical_exception');
  assert.equal(queries.length, 3);
  for (const query of queries) {
    assert.deepEqual(query.params, [
      'tenant-a',
      '11111111-1111-4111-8111-111111111111',
    ]);
    assert.match(query.sql, /student_portal_access/i);
  }
  assert.match(queries[0].sql, /student_class_assignments/);
  assert.match(queries[0].sql, /academics_assignment_submissions/);
  assert.match(queries[2].sql, /report_card\.is_current = TRUE/);
});

test('StudentCommandService keeps database failures visible to the portal', async () => {
  const service = new StudentCommandService(
    {
      getStore: () => ({
        tenant_id: 'tenant-a',
        user_id: '11111111-1111-4111-8111-111111111111',
      }),
    } as never,
    {
      query: async () => {
        throw new Error('student finance read failed');
      },
    } as never,
  );

  await assert.rejects(service.getFees(), /student finance read failed/i);
});

test('StudentCommandService reads canonical role-array notifications without exposing another explicit user', async () => {
  const queries: Array<{ sql: string; params: unknown[] }> = [];
  const service = new StudentCommandService(
    {
      getStore: () => ({
        tenant_id: 'tenant-a',
        user_id: '11111111-1111-4111-8111-111111111111',
      }),
    } as never,
    {
      query: async (sql: string, params: unknown[]) => {
        queries.push({ sql, params });
        return { rows: [], rowCount: 0 };
      },
    } as never,
  );

  await service.getNotifications();

  assert.deepEqual(queries[0].params, [
    'tenant-a',
    '11111111-1111-4111-8111-111111111111',
    'student',
  ]);
  assert.match(queries[0].sql, /recipient_user_id::text/);
  assert.match(queries[0].sql, /metadata->'target_roles'/);
  assert.match(queries[0].sql, /metadata->'audienceRoles'/);
});

test('AdminCommandOperationsService stores a real downloadable report artifact with atomic tenant audit records', async () => {
  const queries: Array<{ sql: string; params: unknown[] }> = [];
  const service = new AdminCommandOperationsService({
    query: async (sql: string, params: unknown[]) => {
      queries.push({ sql, params });
      return { rows: [{ snapshot_id: 'snapshot-a' }], rowCount: 1 };
    },
  } as never);

  const result = await service.generateReportSnapshot({
    tenantId: 'tenant-a',
    module: 'ict-manager-command',
    reportId: 'ict-operations',
    title: 'ICT operations report',
    format: 'csv',
    generatedByUserId: '11111111-1111-4111-8111-111111111111',
    filters: { status: 'active' },
    sections: {
      overview: { metrics: { active_assets: 2 } },
      assets: [{ tag: 'ICT-001', status: 'active' }],
      repairs: [],
    },
  });

  const content = Buffer.from(result.artifact.content_base64, 'base64');
  assert.equal(result.artifact.kind, 'generated-report');
  assert.equal(result.artifact.content_type, 'text/csv; charset=utf-8');
  assert.equal(result.artifact.byte_length, content.length);
  assert.equal(result.artifact.checksum_sha256, createHash('sha256').update(content).digest('hex'));
  assert.match(content.toString('utf8'), /^Section,Group,Record,Value\r\n/);
  assert.match(content.toString('utf8'), /ICT-001/);
  assert.equal(queries.length, 1);
  assert.equal(queries[0].params[0], 'tenant-a');
  assert.match(queries[0].sql, /WITH inserted_snapshot AS/);
  assert.match(queries[0].sql, /INSERT INTO report_snapshot_audit_logs/);
  assert.match(queries[0].sql, /INSERT INTO audit_logs/);
  assert.equal(JSON.parse(String(queries[0].params[6])).content_base64, result.artifact.content_base64);
});

test('AdminCommandOperationsService never labels JSON metadata as a PDF artifact', async () => {
  const service = new AdminCommandOperationsService({
    query: async () => ({ rows: [{ snapshot_id: 'snapshot-b' }], rowCount: 1 }),
  } as never);

  const result = await service.generateReportSnapshot({
    tenantId: 'tenant-a',
    module: 'security-officer-command',
    title: 'Security operations report',
    format: 'json',
    sections: { incidents: [{ title: 'Gate alarm', status: 'resolved' }] },
  });
  const content = Buffer.from(result.artifact.content_base64, 'base64');

  assert.equal(result.report.format, 'pdf');
  assert.equal(result.artifact.content_type, 'application/pdf');
  assert.equal(content.subarray(0, 4).toString('ascii'), '%PDF');
});

test('AdminCommandOperationsService surfaces report and audit database failures', async () => {
  const service = new AdminCommandOperationsService({
    query: async () => {
      throw new Error('database unavailable');
    },
  } as never);

  await assert.rejects(
    () => service.readSql('SELECT * FROM report_snapshots WHERE tenant_id = $1', ['tenant-a']),
    (error: any) => error?.getResponse?.()?.detail === 'database unavailable',
  );
  await assert.rejects(
    () => service.recordAudit('tenant-a', 'report.generated', 'report_snapshot', 'not-a-uuid', {}),
    (error: any) => error?.getResponse?.()?.detail === 'database unavailable',
  );
});
