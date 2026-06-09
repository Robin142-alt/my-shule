import assert from 'node:assert/strict';
import test from 'node:test';
import 'reflect-metadata';

import { PERMISSIONS_KEY } from '../../auth/auth.constants';
import { MODULE_ACCESS_KEY } from '../module-access/module-access.decorator';
import { BiometricAttendanceController } from './biometric-attendance.controller';
import { BiometricAttendanceProcessor } from './biometric-attendance.processor';
import { BiometricAttendanceSchemaService } from './biometric-attendance-schema.service';
import { BiometricAttendanceService } from './biometric-attendance.service';
import { BiometricAttendanceRepository } from './repositories/biometric-attendance.repository';

test('BiometricAttendanceSchemaService creates device, event, rule, and teacher log tables with RLS', async () => {
  let schemaSql = '';
  const service = new BiometricAttendanceSchemaService({
    runSchemaBootstrap: async (sql: string) => {
      schemaSql += sql;
    },
  } as never);

  await service.onModuleInit();

  for (const table of [
    'biometric_devices',
    'biometric_identities',
    'biometric_events',
    'teacher_attendance_logs',
    'attendance_rules',
  ]) {
    assert.match(schemaSql, new RegExp(`CREATE TABLE IF NOT EXISTS ${table}`));
    assert.match(schemaSql, new RegExp(`ALTER TABLE ${table} FORCE ROW LEVEL SECURITY`));
  }

  assert.match(schemaSql, /event_hash/);
  assert.match(schemaSql, /manual_override/);
  assert.match(schemaSql, /app\.role[\s\S]+'system'/);
});

test('BiometricAttendanceController is module-gated and protects manual overrides', () => {
  assert.deepEqual(
    Reflect.getMetadata(MODULE_ACCESS_KEY, BiometricAttendanceController),
    ['teacher_biometric_attendance'],
  );
  const handler = Object.getOwnPropertyDescriptor(
    BiometricAttendanceController.prototype,
    'createManualOverride',
  )?.value;

  assert.deepEqual(Reflect.getMetadata(PERMISSIONS_KEY, handler), ['teacher_attendance:override']);
});

test('BiometricAttendanceController exposes live feed and monthly report endpoints', () => {
  const liveFeedHandler = Object.getOwnPropertyDescriptor(
    BiometricAttendanceController.prototype,
    'listLiveFeed',
  )?.value;
  const monthlyReportHandler = Object.getOwnPropertyDescriptor(
    BiometricAttendanceController.prototype,
    'getMonthlyReport',
  )?.value;

  assert.ok(liveFeedHandler);
  assert.ok(monthlyReportHandler);
  assert.deepEqual(Reflect.getMetadata(PERMISSIONS_KEY, liveFeedHandler), ['teacher_attendance:read']);
  assert.deepEqual(Reflect.getMetadata(PERMISSIONS_KEY, monthlyReportHandler), ['teacher_attendance:read']);
});

test('BiometricAttendanceService bounds teacher attendance list requests', async () => {
  const observed: Record<string, unknown> = {};
  const service = new BiometricAttendanceService(
    { getStore: () => ({ tenant_id: 'tenant-a', user_id: 'principal-1' }) } as never,
    {
      listTeacherLogs: async (input: Record<string, unknown>) => {
        observed.teacherLogs = input;
        return [];
      },
      listLiveFeed: async (input: Record<string, unknown>) => {
        observed.liveFeed = input;
        return [];
      },
    } as never,
  );

  await service.listTeacherLogs(' teacher-1 ', '500', '-10');
  await service.listLiveFeed('500', '-10');

  assert.deepEqual(observed.teacherLogs, {
    tenant_id: 'tenant-a',
    teacher_user_id: 'teacher-1',
    limit: 50,
    offset: 0,
  });
  assert.deepEqual(observed.liveFeed, {
    tenant_id: 'tenant-a',
    limit: 50,
    offset: 0,
  });
});

test('BiometricAttendanceRepository lists teacher logs with explicit columns and pagination', async () => {
  const calls: Array<{ sql: string; params: unknown[] }> = [];
  const repository = new BiometricAttendanceRepository({
    query: async (sql: string, params: unknown[]) => {
      calls.push({ sql, params });
      return { rows: [] };
    },
  } as never);

  await repository.listTeacherLogs({
    tenant_id: 'tenant-a',
    teacher_user_id: 'teacher-1',
    limit: 500,
    offset: -10,
  });
  await repository.listLiveFeed({
    tenant_id: 'tenant-a',
    limit: 500,
    offset: -10,
  });

  assert.doesNotMatch(calls[0]!.sql, /SELECT\s+\*/i);
  assert.match(calls[0]!.sql, /LIMIT \$3::integer\s+OFFSET \$4::integer/);
  assert.equal(calls[0]!.params[2], 50);
  assert.equal(calls[0]!.params[3], 0);
  assert.match(calls[1]!.sql, /LIMIT \$2::integer\s+OFFSET \$3::integer/);
  assert.equal(calls[1]!.params[1], 50);
  assert.equal(calls[1]!.params[2], 0);
});

test('BiometricAttendanceProcessor runs daily absence and half-day rule checks', async () => {
  const calls: Array<Record<string, unknown>> = [];
  const contexts: Array<Record<string, unknown>> = [];
  const processor = new BiometricAttendanceProcessor({
    applyDailyAttendanceRules: async (input: Record<string, unknown>) => {
      calls.push(input);
      return { absent_marked: 5, half_day_marked: 2 };
    },
  } as never, undefined, {
    getStore: () => undefined,
    run: (context: Record<string, unknown>, callback: () => unknown) => {
      contexts.push(context);
      return callback();
    },
  } as never);

  const result = await processor.runDailyAttendanceRuleCheck({
    attendanceDate: '2026-05-19',
    absenceCutoffTime: '09:00',
  });

  assert.equal(processor.queueName, 'biometric-attendance');
  assert.deepEqual(result, {
    attendance_date: '2026-05-19',
    absent_marked: 5,
    half_day_marked: 2,
  });
  assert.deepEqual(calls, [
    {
      attendance_date: '2026-05-19',
      absence_cutoff_time: '09:00',
    },
  ]);
  assert.equal(contexts[0]?.role, 'system');
  assert.equal(contexts[0]?.path, '/internal/biometric-attendance/rule-check');
});

test('BiometricAttendanceService deduplicates offline device events by event hash', async () => {
  const calls: string[] = [];
  const service = new BiometricAttendanceService(
    { getStore: () => ({ tenant_id: 'tenant-a', user_id: 'user-1' }) } as never,
    {
      registerEvent: async (input: Record<string, unknown>) => {
        calls.push(`event:${input.event_hash}`);
        return input.event_hash === 'hash-1'
          ? { id: 'event-1', duplicate: false, biometric_hash: 'bio-1', event_type: 'check_in', occurred_at: '2026-05-19T04:35:00.000Z', device_id: 'device-1' }
          : { id: 'event-2', duplicate: true };
      },
      findIdentityByHash: async () => ({ teacher_user_id: 'teacher-1' }),
      getAttendanceRule: async () => ({
        default_start_time: '07:30',
        grace_period_minutes: 10,
        absence_cutoff_time: '09:00',
        half_day_checkout_cutoff: '12:30',
      }),
      appendTeacherAttendanceLog: async () => {
        calls.push('log');
      },
      markEventProcessed: async () => undefined,
      appendAuditLog: async () => undefined,
    } as never,
  );

  const result = await service.syncEvents({
    device_id: 'device-1',
    events: [
      {
        event_hash: 'hash-1',
        biometric_hash: 'bio-1',
        timestamp: '2026-05-19T04:35:00.000Z',
        event_type: 'check_in',
        offline_mode_flag: true,
      },
      {
        event_hash: 'hash-2',
        biometric_hash: 'bio-1',
        timestamp: '2026-05-19T04:35:00.000Z',
        event_type: 'check_in',
        offline_mode_flag: true,
      },
    ],
  });

  assert.equal(result.accepted, 1);
  assert.equal(result.duplicates, 1);
  assert.deepEqual(calls, ['event:hash-1', 'log', 'event:hash-2']);
});

test('BiometricAttendanceService requires manual override reason', async () => {
  const service = new BiometricAttendanceService(
    { getStore: () => ({ tenant_id: 'tenant-a', user_id: 'principal-1' }) } as never,
    {} as never,
  );

  await assert.rejects(
    () =>
      service.createManualOverride({
        teacher_user_id: 'teacher-1',
        attendance_date: '2026-05-19',
        status: 'excused',
        reason: 'Sick',
      }),
    /override reason/i,
  );
});
