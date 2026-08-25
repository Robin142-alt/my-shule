import assert from 'node:assert/strict';
import test from 'node:test';
import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';

import { PERMISSIONS_KEY } from '../../auth/auth.constants';
import { MODULE_ACCESS_KEY } from '../module-access/module-access.decorator';
import { BoardingMasterCommandService } from '../admin-command/boarding-master-command.service';
import { BoardingController } from './boarding.controller';
import { BoardingSchemaService } from './boarding-schema.service';
import { BoardingService } from './boarding.service';
import { BoardingRepository } from './repositories/boarding.repository';
import {
  CreateBoardingReferralDto,
  HandleLegacyExeatDto,
  SubmitLegacyBoardingRollCallDto,
} from './dto/legacy-boarding.dto';

test('BoardingSchemaService creates tenant-safe boarding tables', async () => {
  let schemaSql = '';
  const service = new BoardingSchemaService({ runSchemaBootstrap: async (sql: string) => { schemaSql += sql; } } as never);

  await service.onModuleInit();

  for (const table of ['boarding_houses', 'boarding_students', 'boarding_meals', 'boarding_dormitory_checks', 'boarding_incidents', 'boarding_referrals']) {
    assert.match(schemaSql, new RegExp(`CREATE TABLE IF NOT EXISTS "?${table}"?`));
    assert.match(schemaSql, new RegExp(`ALTER TABLE "?${table}"? FORCE ROW LEVEL SECURITY`));
  }
  assert.match(schemaSql, /CREATE TABLE IF NOT EXISTS boarding_referrals[\s\S]*tenant_id text NOT NULL[\s\S]*referred_to text NOT NULL[\s\S]*created_by uuid NOT NULL/i);
  assert.match(schemaSql, /ALTER TABLE boarding_referrals[\s\S]*ALTER COLUMN school_id DROP NOT NULL/i);
  assert.match(schemaSql, /CREATE INDEX IF NOT EXISTS ix_boarding_referrals_tenant_status/i);
});

test('BoardingController is gated by boarding module and permissions', () => {
  assert.deepEqual(Reflect.getMetadata(MODULE_ACCESS_KEY, BoardingController), ['boarding']);
  const dashboardHandler = Object.getOwnPropertyDescriptor(BoardingController.prototype, 'getDashboard')?.value;
  const createHandler = Object.getOwnPropertyDescriptor(BoardingController.prototype, 'createRecord')?.value;
  const createReferralHandler = Object.getOwnPropertyDescriptor(BoardingController.prototype, 'createReferral')?.value;
  const submitRollCallHandler = Object.getOwnPropertyDescriptor(BoardingController.prototype, 'submitRollCall')?.value;
  const handleExeatHandler = Object.getOwnPropertyDescriptor(BoardingController.prototype, 'handleExeat')?.value;

  assert.deepEqual(Reflect.getMetadata(PERMISSIONS_KEY, dashboardHandler), ['boarding:read']);
  assert.deepEqual(Reflect.getMetadata(PERMISSIONS_KEY, createHandler), ['boarding:write']);
  assert.deepEqual(Reflect.getMetadata(PERMISSIONS_KEY, createReferralHandler), ['boarding:write']);
  assert.deepEqual(Reflect.getMetadata(PERMISSIONS_KEY, submitRollCallHandler), ['boarding:write']);
  assert.deepEqual(Reflect.getMetadata(PERMISSIONS_KEY, handleExeatHandler), ['boarding:write']);
});

test('BoardingController adapts canonical tenant-scoped house checks for legacy roll-call readers', async () => {
  const calls: Array<Record<string, unknown>> = [];
  const controller = new BoardingController(
    {} as never,
    {
      getBoardingAttendance: async () => {
        calls.push({ method: 'getBoardingAttendance' });
        return {
          boardingattendanceList: [{
            id: '11111111-1111-4111-8111-111111111111',
            house_name: 'Lake House',
            status: 'attention_required',
            expected_students: 40,
            missing_students: 2,
            checked_at: '2026-05-21T18:30:00.000Z',
          }],
        };
      },
    } as never,
  );

  const rollCalls = await controller.getRollCalls();

  assert.deepEqual(calls, [{ method: 'getBoardingAttendance' }]);
  assert.deepEqual(rollCalls, [{
    id: '11111111-1111-4111-8111-111111111111',
    student: '2 missing learner(s)',
    className: 'House roll call',
    dorm: 'Lake House',
    bed: '40 expected',
    status: 'Missing',
    parentSmsSent: false,
    lastMarked: '2026-05-21T18:30:00.000Z',
  }]);
});

test('BoardingController does not hide boarding database failures as empty lists', async () => {
  const controller = new BoardingController(
    {} as never,
    {
      getBoardingAttendance: async () => {
        throw new Error('boarding database unavailable');
      },
    } as never,
  );

  await assert.rejects(() => controller.getRollCalls(), /boarding database unavailable/);
});

test('BoardingController routes legacy writes into the canonical roll-call and exeat workflows', async () => {
  const calls: Array<Record<string, unknown>> = [];
  const canonical = {
    submitRollCall: async (dto: Record<string, unknown>) => {
      calls.push({ method: 'submitRollCall', dto });
      return { success: true, rollCall: { id: 'roll-a' } };
    },
    createLeaveRequest: async (dto: Record<string, unknown>) => {
      calls.push({ method: 'createLeaveRequest', dto });
      return { success: true, leave: { id: 'leave-a' } };
    },
    actionLeaveRequest: async (id: string, action: string) => {
      calls.push({ method: 'actionLeaveRequest', id, action });
      return { success: true, leave: { id, status: 'Approved' } };
    },
    forwardLeaveRequest: async (id: string) => {
      calls.push({ method: 'forwardLeaveRequest', id });
      return { success: true, leave: { id, status: 'Forwarded' } };
    },
  };
  const controller = new BoardingController({} as never, canonical as never);
  const rollCallDto = {
    house_id: '11111111-1111-4111-8111-111111111111',
    status: 'attention_required' as const,
    missing_student_ids: ['22222222-2222-4222-8222-222222222222'],
    notes: 'One learner is not accounted for.',
  };
  const leaveRequest = {
    student_id: '22222222-2222-4222-8222-222222222222',
    guardian_id: '33333333-3333-4333-8333-333333333333',
    leave_type: 'Medical appointment',
    from_date: '2026-08-25',
    to_date: '2026-08-26',
    reason: 'Clinic review',
  };

  await controller.submitRollCall(rollCallDto);
  await controller.handleExeat({ action: 'add_request', request: leaveRequest });
  await controller.handleExeat({ action: 'approve_request', id: '44444444-4444-4444-8444-444444444444' });
  await controller.handleExeat({ action: 'forward_request', id: '55555555-5555-4555-8555-555555555555' });

  assert.deepEqual(calls, [
    { method: 'submitRollCall', dto: rollCallDto },
    { method: 'createLeaveRequest', dto: leaveRequest },
    { method: 'actionLeaveRequest', id: '44444444-4444-4444-8444-444444444444', action: 'approved' },
    { method: 'forwardLeaveRequest', id: '55555555-5555-4555-8555-555555555555' },
  ]);
});

test('Legacy Boarding DTOs reject free-text learner mutations and unknown action fields', async () => {
  const pipe = new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true });

  await assert.rejects(
    () => pipe.transform(
      { action: 'add_roll_call', record: { student: 'Learner One', dorm: 'Lake House' } },
      { type: 'body', metatype: SubmitLegacyBoardingRollCallDto, data: '' },
    ),
    (error: any) => error?.getStatus?.() === 400,
  );
  await assert.rejects(
    () => pipe.transform(
      {
        action: 'add_request',
        request: {
          student: 'Learner One',
          dorm: 'Lake House',
          parentPhone: '0712345678',
          reason: 'Medical appointment',
        },
      },
      { type: 'body', metatype: HandleLegacyExeatDto, data: '' },
    ),
    (error: any) => error?.getStatus?.() === 400,
  );
  await assert.rejects(
    () => pipe.transform(
      { student_id: 'Learner One', reason: '' },
      { type: 'body', metatype: CreateBoardingReferralDto, data: '' },
    ),
    (error: any) => error?.getStatus?.() === 400,
  );
  await assert.rejects(
    () => pipe.transform(
      {
        student_id: '22222222-2222-4222-8222-222222222222',
        reason: 'Follow up recurring homesickness',
        referred_to: 'arbitrary_external_role',
      },
      { type: 'body', metatype: CreateBoardingReferralDto, data: '' },
    ),
    (error: any) => error?.getStatus?.() === 400,
  );
});

test('BoardingController delegates validated referrals to the governed Boarding service', async () => {
  const calls: Array<Record<string, unknown>> = [];
  const controller = new BoardingController(
    {
      createReferral: async (dto: Record<string, unknown>) => {
        calls.push(dto);
        return { success: true, referral: { id: 'referral-a' } };
      },
    } as never,
    {} as never,
  );
  const dto = {
    student_id: '22222222-2222-4222-8222-222222222222',
    reason: 'Follow up recurring homesickness',
  };

  const result = await controller.createReferral(dto);

  assert.equal(result.success, true);
  assert.deepEqual(calls, [dto]);
});

test('BoardingMasterCommandService forwards only a pending same-tenant exeat with event and audit evidence', async () => {
  const writes: Array<{ sql: string; params: unknown[] }> = [];
  const notifications: Array<Record<string, unknown>> = [];
  const service = new BoardingMasterCommandService(
    {
      getStore: () => ({
        tenant_id: 'tenant-a',
        user_id: '11111111-1111-4111-8111-111111111111',
        role: 'boarding_master',
      }),
    } as never,
    {} as never,
    {
      uuidOrNull: (value: unknown) => typeof value === 'string' && /^[0-9a-f-]{36}$/i.test(value) ? value : null,
      writeSql: async (sql: string, params: unknown[]) => {
        writes.push({ sql, params });
        return {
          rows: [{
            id: '22222222-2222-4222-8222-222222222222',
            student_id: '33333333-3333-4333-8333-333333333333',
            student_name: 'Amina Njeri',
            status: 'pending',
            metadata: { forwarded_at: '2026-08-25T09:00:00.000Z' },
            forwarded_at: '2026-08-25T09:00:00.000Z',
            event_count: 1,
            audit_count: 1,
            outcome: 'forwarded',
          }],
          rowCount: 1,
        };
      },
      notifyRoles: async (tenantId: string, input: Record<string, unknown>) => {
        notifications.push({ tenantId, ...input });
      },
    } as never,
  );

  const result = await service.forwardLeaveRequest('22222222-2222-4222-8222-222222222222');

  assert.equal(result.success, true);
  assert.equal(result.leave.status, 'Forwarded');
  assert.deepEqual(result.delivery, { status: 'recorded', reasons: [] });
  assert.deepEqual(writes[0].params, [
    'tenant-a',
    '22222222-2222-4222-8222-222222222222',
    '11111111-1111-4111-8111-111111111111',
    'boarding_master',
  ]);
  assert.match(writes[0].sql, /UPDATE boarding_exeats/i);
  assert.match(writes[0].sql, /WHERE tenant_id = \$1[\s\S]*id = \$2::uuid[\s\S]*status = 'pending'/i);
  assert.match(writes[0].sql, /INSERT INTO workflow_events/i);
  assert.match(writes[0].sql, /INSERT INTO audit_logs/i);
  assert.deepEqual(notifications[0].targetRoles, ['deputy_principal', 'principal']);
});

test('BoardingMasterCommandService never reports a missing or cross-tenant exeat as forwarded', async () => {
  let notifications = 0;
  const service = new BoardingMasterCommandService(
    {
      getStore: () => ({
        tenant_id: 'tenant-a',
        user_id: '11111111-1111-4111-8111-111111111111',
        role: 'boarding_master',
      }),
    } as never,
    {} as never,
    {
      uuidOrNull: (value: unknown) => typeof value === 'string' && /^[0-9a-f-]{36}$/i.test(value) ? value : null,
      writeSql: async () => ({ rows: [], rowCount: 0 }),
      notifyRoles: async () => { notifications += 1; },
    } as never,
  );

  await assert.rejects(
    () => service.forwardLeaveRequest('22222222-2222-4222-8222-222222222222'),
    /not found in this school/i,
  );
  assert.equal(notifications, 0);
});

test('BoardingMasterCommandService reports forwarding notification failure without undoing audited persistence', async () => {
  const service = new BoardingMasterCommandService(
    {
      getStore: () => ({
        tenant_id: 'tenant-a',
        user_id: '11111111-1111-4111-8111-111111111111',
        role: 'boarding_master',
      }),
    } as never,
    {} as never,
    {
      uuidOrNull: (value: unknown) => typeof value === 'string' && /^[0-9a-f-]{36}$/i.test(value) ? value : null,
      writeSql: async () => ({
        rows: [{
          id: '22222222-2222-4222-8222-222222222222',
          student_name: 'Amina Njeri',
          status: 'pending',
          forwarded_at: '2026-08-25T09:00:00.000Z',
          event_count: 1,
          audit_count: 1,
          outcome: 'forwarded',
        }],
        rowCount: 1,
      }),
      notifyRoles: async () => { throw new Error('notification store unavailable'); },
    } as never,
  );

  const result = await service.forwardLeaveRequest('22222222-2222-4222-8222-222222222222');
  assert.equal(result.success, true);
  assert.match(result.message, /forwarded and audited/i);
  assert.deepEqual(result.delivery, {
    status: 'degraded',
    reasons: ['leadership_notification_failed'],
  });
});

test('BoardingMasterCommandService does not duplicate an already-forwarded exeat', async () => {
  let notifications = 0;
  const writes: string[] = [];
  const service = new BoardingMasterCommandService(
    {
      getStore: () => ({
        tenant_id: 'tenant-a',
        user_id: '11111111-1111-4111-8111-111111111111',
        role: 'boarding_master',
      }),
    } as never,
    {} as never,
    {
      uuidOrNull: (value: unknown) => typeof value === 'string' && /^[0-9a-f-]{36}$/i.test(value) ? value : null,
      writeSql: async (sql: string) => {
        writes.push(sql);
        return {
          rows: [{
            id: '22222222-2222-4222-8222-222222222222',
            student_name: 'Amina Njeri',
            status: 'pending',
            forwarded_at: '2026-08-25T09:00:00.000Z',
            event_count: 0,
            audit_count: 0,
            outcome: 'already_forwarded',
          }],
          rowCount: 1,
        };
      },
      notifyRoles: async () => { notifications += 1; },
    } as never,
  );

  await assert.rejects(
    () => service.forwardLeaveRequest('22222222-2222-4222-8222-222222222222'),
    /already been forwarded/i,
  );
  assert.match(writes[0], /metadata->>'forwarded_at' IS NULL/i);
  assert.match(writes[0], /'already_forwarded'/i);
  assert.equal(notifications, 0);
});

test('Canonical exeat creation and approval keep core state, workflow event, guardian notice, and audit atomic', async () => {
  const writes: string[] = [];
  const service = new BoardingMasterCommandService(
    {
      getStore: () => ({
        tenant_id: 'tenant-a',
        user_id: '11111111-1111-4111-8111-111111111111',
        role: 'boarding_master',
      }),
    } as never,
    {} as never,
    {
      uuidOrNull: (value: unknown) => typeof value === 'string' && /^[0-9a-f-]{36}$/i.test(value) ? value : null,
      requiredText: (value: unknown, label: string) => {
        const text = String(value ?? '').trim();
        if (!text) throw new Error(`${label} is required`);
        return text;
      },
      writeSql: async (sql: string) => {
        writes.push(sql);
        if (/INSERT INTO boarding_exeats/i.test(sql)) {
          return {
            rows: [{
              id: '22222222-2222-4222-8222-222222222222',
              student_id: '33333333-3333-4333-8333-333333333333',
              guardian_id: '44444444-4444-4444-8444-444444444444',
              student_name: 'Amina Njeri',
              leave_type: 'Medical appointment',
              status: 'pending',
              guardian_notifications_created: 1,
              event_count: 1,
              audit_count: 1,
            }],
            rowCount: 1,
          };
        }
        return {
          rows: [{
            id: '22222222-2222-4222-8222-222222222222',
            student_id: '33333333-3333-4333-8333-333333333333',
            guardian_id: '44444444-4444-4444-8444-444444444444',
            student_name: 'Amina Njeri',
            status: 'approved',
            guardian_notifications_created: 1,
            event_count: 1,
            audit_count: 1,
          }],
          rowCount: 1,
        };
      },
      notifyRoles: async () => { throw new Error('role notification store unavailable'); },
    } as never,
  );

  const created = await service.createLeaveRequest({
    student_id: '33333333-3333-4333-8333-333333333333',
    guardian_id: '44444444-4444-4444-8444-444444444444',
    leave_type: 'Medical appointment',
    from_date: '2026-08-25',
    to_date: '2026-08-26',
    reason: 'Clinic review',
  });
  const approved = await service.actionLeaveRequest('22222222-2222-4222-8222-222222222222', 'approved');

  assert.equal(created.success, true);
  assert.deepEqual(created.delivery, {
    status: 'degraded',
    guardian_notifications_created: 1,
    reasons: ['leadership_notification_failed'],
  });
  assert.equal(approved.success, true);
  assert.deepEqual(approved.delivery, {
    status: 'degraded',
    guardian_notifications_created: 1,
    reasons: ['staff_notification_failed'],
  });
  for (const sql of writes) {
    assert.match(sql, /INSERT INTO notifications/i);
    assert.match(sql, /INSERT INTO workflow_events/i);
    assert.match(sql, /INSERT INTO audit_logs/i);
  }
});

test('BoardingService creates auditable boarding records', async () => {
  const calls: Array<Record<string, unknown>> = [];
  const service = new BoardingService(
    {
      getStore: () => ({ tenant_id: 'tenant-a', user_id: 'user-1', permissions: ['boarding:*'] }),
      requireStore: () => ({ tenant_id: 'tenant-a', user_id: 'user-1', permissions: ['boarding:*'] }),
    } as never,
    {
      createRecord: async (input: Record<string, unknown>) => { calls.push({ method: 'createRecord', ...input }); return { id: 'boarding-1', title: input.title }; },
      updateStatus: async (input: Record<string, unknown>) => { calls.push({ method: 'updateStatus', ...input }); return { id: input.record_id, status: input.status }; },
      appendAuditLog: async (input: Record<string, unknown>) => { calls.push({ method: 'appendAuditLog', ...input }); },
      getDashboard: async (tenantId: string) => { calls.push({ method: 'getDashboard', tenant_id: tenantId }); return { total_records: 1, open_records: 1, action_due: 0, critical_records: 0, records: [], activity: [] }; },
      getOperationalMetrics: async (tenantId: string) => {
        calls.push({ method: 'getOperationalMetrics', tenant_id: tenantId });
        return { total_boarders: 40, open_incidents: 2, approved_leave: 3 };
      },
    } as never,
  );

  await service.createRecord({ title: 'Dormitory roll call', category: 'roll_call', owner_name: 'House parent' });
  await service.updateStatus('boarding-1', { status: 'completed' });
  const dashboard = await service.getDashboard();

  assert.equal(dashboard.total_records, 1);
  assert.equal(dashboard.total_boarders, 40);
  assert.equal(dashboard.open_incidents, 2);
  assert.equal(dashboard.approved_leave, 3);
  assert.deepEqual(calls.map((call) => call.method), [
    'createRecord',
    'appendAuditLog',
    'updateStatus',
    'appendAuditLog',
    'getDashboard',
    'getOperationalMetrics',
  ]);
});

test('BoardingRepository creates late returns only for an active boarder in the requested tenant', async () => {
  const queries: Array<{ sql: string; params: unknown[] }> = [];
  const repository = new BoardingRepository({
    query: async (sql: string, params: unknown[]) => {
      queries.push({ sql, params });
      return { rows: [], rowCount: 0 };
    },
  } as never);

  const record = await repository.createLateReturnRecord({
    tenant_id: 'tenant-a',
    student_id: 'student-from-another-school',
    title: 'Late return from weekend leave',
    owner_name: 'House A',
    status: 'active',
    priority: 'high',
    due_date: null,
    metric_count: 1,
    notes: 'Returned after curfew.',
    metadata: { student_id: 'student-from-another-school' },
    created_by_user_id: '11111111-1111-4111-8111-111111111111',
  });

  assert.equal(record, null);
  assert.deepEqual(queries[0].params.slice(0, 2), ['tenant-a', 'student-from-another-school']);
  assert.match(queries[0].sql, /FROM students student/i);
  assert.match(queries[0].sql, /student\.tenant_id = \$1/i);
  assert.match(queries[0].sql, /student\.id::text = \$2/i);
  assert.match(queries[0].sql, /student\.deleted_at IS NULL/i);
  assert.match(queries[0].sql, /FROM boarding_students boarding_student[\s\S]*boarding_student\.tenant_id = student\.tenant_id/i);
  assert.match(queries[0].sql, /FROM boarding_allocations allocation[\s\S]*allocation\.tenant_id = student\.tenant_id/i);
  assert.match(queries[0].sql, /INSERT INTO boarding_houses/i);
  assert.match(queries[0].sql, /INSERT INTO boarding_audit_logs/i);
  assert.match(queries[0].sql, /FROM selected_student/i);
});

test('BoardingRepository creates a referral only for a same-tenant active boarder and atomically records event and audit evidence', async () => {
  const queries: Array<{ sql: string; params: unknown[] }> = [];
  const repository = new BoardingRepository({
    query: async (sql: string, params: unknown[]) => {
      queries.push({ sql, params });
      return {
        rows: [{
          id: '33333333-3333-4333-8333-333333333333',
          tenant_id: 'tenant-a',
          student_id: '22222222-2222-4222-8222-222222222222',
          student_name: 'Amina Njeri',
          reason: 'Follow up recurring homesickness',
          referred_to: 'boarding_master',
          status: 'PENDING',
          created_by: '11111111-1111-4111-8111-111111111111',
          event_count: 1,
          audit_count: 1,
        }],
        rowCount: 1,
      };
    },
  } as never);

  const referral = await repository.createReferral({
    tenant_id: 'tenant-a',
    student_id: '22222222-2222-4222-8222-222222222222',
    reason: 'Follow up recurring homesickness',
    referred_to: 'boarding_master',
    created_by: '11111111-1111-4111-8111-111111111111',
    actor_role: 'boarding_master',
  });

  assert.equal(referral?.status, 'PENDING');
  assert.deepEqual(queries[0].params, [
    'tenant-a',
    '22222222-2222-4222-8222-222222222222',
    'Follow up recurring homesickness',
    'boarding_master',
    '11111111-1111-4111-8111-111111111111',
    'boarding_master',
  ]);
  assert.match(queries[0].sql, /student\.tenant_id = \$1[\s\S]*student\.id = \$2::uuid/i);
  assert.match(queries[0].sql, /FROM boarding_students boarding_student[\s\S]*boarding_student\.tenant_id = student\.tenant_id[\s\S]*LOWER\(boarding_student\.status\) = 'active'/i);
  assert.match(queries[0].sql, /FROM boarding_allocations allocation[\s\S]*allocation\.tenant_id = student\.tenant_id[\s\S]*LOWER\(allocation\.status\) = 'active'/i);
  assert.match(queries[0].sql, /INSERT INTO boarding_referrals \([\s\S]*tenant_id, student_id, reason, referred_to, status, created_by/i);
  assert.match(queries[0].sql, /INSERT INTO workflow_events/i);
  assert.match(queries[0].sql, /jsonb_build_array\(\$4::text\)/i);
  assert.match(queries[0].sql, /INSERT INTO audit_logs/i);
  assert.doesNotMatch(queries[0].sql, /INSERT INTO boarding_referrals \([\s\S]{0,200}school_id/i);
});

test('BoardingService returns not-found for a foreign or inactive boarder without reporting referral success', async () => {
  let repositoryCalls = 0;
  const service = new BoardingService(
    {
      getStore: () => ({
        tenant_id: 'tenant-a',
        user_id: '11111111-1111-4111-8111-111111111111',
        role: 'boarding_master',
        permissions: ['boarding:write'],
      }),
    } as never,
    {
      createReferral: async () => {
        repositoryCalls += 1;
        return null;
      },
    } as never,
  );

  await assert.rejects(
    () => service.createReferral({
      student_id: '22222222-2222-4222-8222-222222222222',
      reason: 'Follow up recurring homesickness',
    }),
    (error: any) => error?.getStatus?.() === 404 && /not found in this school/i.test(error.message),
  );
  assert.equal(repositoryCalls, 1);
});

test('BoardingRepository materializes late-return notices only for exact active guardian accounts', async () => {
  const queries: Array<{ sql: string; params: unknown[] }> = [];
  const repository = new BoardingRepository({
    query: async (sql: string, params: unknown[]) => {
      queries.push({ sql, params });
      return { rows: [{ guardian_count: 2, notification_count: 2 }], rowCount: 1 };
    },
  } as never);

  const delivery = await repository.notifyLateReturnGuardians({
    tenant_id: 'tenant-a',
    student_id: 'student-a',
    record_id: 'record-a',
    title: 'Boarding late return recorded',
    body: 'Amina Njeri was logged for a late return to boarding.',
  });

  assert.deepEqual(delivery, { guardian_count: 2, notification_count: 2 });
  assert.deepEqual(queries[0].params.slice(0, 3), ['tenant-a', 'student-a', 'record-a']);
  assert.match(queries[0].sql, /guardian\.tenant_id = \$1/i);
  assert.match(queries[0].sql, /guardian\.student_id::text = \$2/i);
  assert.match(queries[0].sql, /LOWER\(guardian\.status\) = 'active'/i);
  assert.match(queries[0].sql, /INNER JOIN tenant_memberships membership/i);
  assert.match(queries[0].sql, /recipient_user_id, recipient_guardian_id/i);
  assert.doesNotMatch(queries[0].sql, /recipient_role/i);
});

test('BoardingService sends exact guardian notices and keeps late-return realtime events staff scoped', async () => {
  const repositoryCalls: Array<{ method: string; input: Record<string, unknown> }> = [];
  const eventCalls: Array<Record<string, any>> = [];
  const service = new BoardingService(
    {
      getStore: () => ({
        tenant_id: 'tenant-a',
        user_id: '11111111-1111-4111-8111-111111111111',
        role: 'boarding_master',
        permissions: ['boarding:write'],
      }),
      requireStore: () => ({
        tenant_id: 'tenant-a',
        user_id: '11111111-1111-4111-8111-111111111111',
        role: 'boarding_master',
        permissions: ['boarding:write'],
      }),
    } as never,
    {
      createRecord: async () => {
        throw new Error('late return must not use the generic create path');
      },
      createLateReturnRecord: async (input: Record<string, unknown>) => {
        repositoryCalls.push({ method: 'createLateReturnRecord', input });
        return {
          id: 'record-a',
          tenant_id: 'tenant-a',
          title: input.title,
          category: 'late_return',
          status: 'active',
          priority: 'high',
          metadata: input.metadata,
          student_name: 'Amina Njeri',
        };
      },
      notifyLateReturnGuardians: async (input: Record<string, unknown>) => {
        repositoryCalls.push({ method: 'notifyLateReturnGuardians', input });
        return { guardian_count: 2, notification_count: 2 };
      },
    } as never,
    {
      recordSchoolOperation: async (input: Record<string, any>) => {
        eventCalls.push(input);
        return { status: 'accepted' };
      },
    } as never,
  );

  const result = await service.createRecord({
    title: 'Late return from weekend leave',
    category: 'late_return',
    priority: 'high',
    notes: 'Returned after curfew.',
    metadata: { student_id: 'student-a' },
  });

  assert.equal(result.id, 'record-a');
  assert.deepEqual(result.delivery, {
    status: 'complete',
    guardian_count: 2,
    guardian_notification_count: 2,
    guardian_recipient_scope: 'exact_linked_guardian_users',
    staff_event_status: 'accepted',
    reasons: [],
  });
  assert.equal(repositoryCalls[0].input.tenant_id, 'tenant-a');
  assert.equal(repositoryCalls[0].input.student_id, 'student-a');
  assert.equal(repositoryCalls[1].input.student_id, 'student-a');
  assert.deepEqual(eventCalls[0].notifications[0].audienceRoles, ['boarding_master', 'discipline_master']);
  assert.equal(eventCalls[0].notifications[0].audienceRoles.includes('parent'), false);
});

test('BoardingService rejects a non-canonical learner and reports post-persistence delivery failure as degraded', async () => {
  const context = {
    getStore: () => ({
      tenant_id: 'tenant-a',
      user_id: '11111111-1111-4111-8111-111111111111',
      role: 'boarding_master',
      permissions: ['boarding:write'],
    }),
    requireStore: () => ({
      tenant_id: 'tenant-a',
      user_id: '11111111-1111-4111-8111-111111111111',
      role: 'boarding_master',
      permissions: ['boarding:write'],
    }),
  } as never;
  const rejected = new BoardingService(context, {
    createLateReturnRecord: async () => null,
  } as never);
  await assert.rejects(
    () => rejected.createRecord({
      title: 'Late return',
      category: 'late_return',
      metadata: { student_id: 'student-from-another-school' },
    }),
    /not active in this school/i,
  );

  const persisted = new BoardingService(
    context,
    {
      createLateReturnRecord: async () => ({
        id: 'record-a',
        tenant_id: 'tenant-a',
        title: 'Late return',
        category: 'late_return',
        status: 'active',
        priority: 'high',
        metadata: { student_id: 'student-a' },
        student_name: 'Amina Njeri',
      }),
      notifyLateReturnGuardians: async () => {
        throw new Error('notification store unavailable');
      },
    } as never,
    {
      recordSchoolOperation: async () => {
        throw new Error('event outbox unavailable');
      },
    } as never,
  );

  const result = await persisted.createRecord({
    title: 'Late return',
    category: 'late_return',
    metadata: { student_id: 'student-a' },
  });
  assert.equal(result.id, 'record-a', 'the canonical boarding record remains persisted');
  assert.equal(result.delivery.status, 'degraded');
  assert.equal(result.delivery.staff_event_status, 'failed');
  assert.deepEqual(result.delivery.reasons, ['guardian_notification_failed', 'staff_event_failed']);
});

test('BoardingRepository loads operational metrics inside the requested tenant transaction', async () => {
  const calls: Array<Record<string, unknown>> = [];
  const repository = new BoardingRepository({
    executeWithTenant: async (
      tenantId: string,
      userId: string | null,
      callback: (tx: { $queryRawUnsafe: (sql: string, ...params: unknown[]) => Promise<unknown[]> }) => Promise<unknown>,
    ) => {
      calls.push({ tenantId, userId });
      return callback({
        $queryRawUnsafe: async (sql: string, ...params: unknown[]) => {
          calls.push({ sql, params });
          return [{ total_boarders: 40, open_incidents: 2, approved_leave: 3 }];
        },
      });
    },
  } as never);

  const metrics = await repository.getOperationalMetrics('tenant-a');

  assert.deepEqual(calls[0], { tenantId: 'tenant-a', userId: null });
  assert.match(String(calls[1]?.sql), /FROM boarding_students/);
  assert.match(String(calls[1]?.sql), /FROM boarding_allocations/);
  assert.match(String(calls[1]?.sql), /FROM boarding_incidents/);
  assert.match(String(calls[1]?.sql), /FROM boarding_exeats exeat/);
  assert.match(String(calls[1]?.sql), /LOWER\(exeat\.status\) IN \('approved', 'checked_out'\)/);
  assert.deepEqual(calls[1]?.params, ['tenant-a']);
  assert.deepEqual(metrics, { total_boarders: 40, open_incidents: 2, approved_leave: 3 });
});

test('BoardingService exposes metric query failures instead of silently dropping dashboard fields', async () => {
  const service = new BoardingService(
    {
      getStore: () => ({ tenant_id: 'tenant-a', user_id: 'user-1', permissions: ['boarding:read'] }),
      requireStore: () => ({ tenant_id: 'tenant-a', user_id: 'user-1', permissions: ['boarding:read'] }),
    } as never,
    {
      getDashboard: async () => ({ total_records: 1, records: [] }),
      getOperationalMetrics: async () => {
        throw new Error('boarding metrics unavailable');
      },
    } as never,
  );

  await assert.rejects(() => service.getDashboard(), /boarding metrics unavailable/);
});
