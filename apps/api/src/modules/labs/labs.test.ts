import assert from 'node:assert/strict';
import test from 'node:test';
import 'reflect-metadata';

import { PERMISSIONS_KEY } from '../../auth/auth.constants';
import { MODULE_ACCESS_KEY } from '../module-access/module-access.decorator';
import { LabsController } from './labs.controller';
import { LabsProcessor } from './labs.processor';
import { LabsSchemaService } from './labs-schema.service';
import { LabsService } from './labs.service';

test('LabsSchemaService creates tenant-safe lab, equipment, chemical, and attendance tables', async () => {
  let schemaSql = '';
  const service = new LabsSchemaService({
    runSchemaBootstrap: async (sql: string) => {
      schemaSql += sql;
    },
  } as never);

  await service.onModuleInit();

  for (const table of [
    'lab_departments',
    'labs',
    'lab_sessions',
    'lab_attendance',
    'lab_equipment',
    'chemical_items',
    'lab_session_equipment_usage',
    'lab_session_chemical_usage',
    'chemical_disposal_requests',
  ]) {
    assert.match(schemaSql, new RegExp(`CREATE TABLE IF NOT EXISTS ${table}`));
    assert.match(schemaSql, new RegExp(`ALTER TABLE ${table} FORCE ROW LEVEL SECURITY`));
  }

  assert.match(schemaSql, /expiry_date/);
  assert.match(schemaSql, /audit_log_reference/);
  assert.match(schemaSql, /app\.role[\s\S]+'system'/);
});

test('LabsController is gated by lab management module and lab permissions', () => {
  assert.deepEqual(Reflect.getMetadata(MODULE_ACCESS_KEY, LabsController), ['lab_management']);
  const handler = Object.getOwnPropertyDescriptor(LabsController.prototype, 'createLabSession')?.value;

  assert.ok(handler);
  assert.deepEqual(Reflect.getMetadata(PERMISSIONS_KEY, handler), ['labs:write']);
});

test('LabsService rejects expired chemical issue before repository mutation', async () => {
  const calls: string[] = [];
  const service = new LabsService(
    { getStore: () => ({ tenant_id: 'tenant-a', user_id: 'user-1' }) } as never,
    {
      findChemicalForIssue: async () => ({
        id: 'chemical-1',
        status: 'expired',
        expiry_date: '2026-05-18',
        quantity_available: '10',
      }),
      issueChemicalToSession: async () => {
        calls.push('issued');
      },
    } as never,
  );

  await assert.rejects(
    () =>
      service.issueChemical('session-1', {
        chemical_id: 'chemical-1',
        quantity_used: 1,
      }),
    /Expired chemicals cannot be issued/i,
  );
  assert.deepEqual(calls, []);
});

test('LabsService auto-records missing mandatory lab attendance before completing a session', async () => {
  const calls: Array<Record<string, unknown>> = [];
  const service = new LabsService(
    { getStore: () => ({ tenant_id: 'tenant-a', user_id: 'user-1' }) } as never,
    {
      getLabSessionForCompletion: async () => ({
        id: 'session-1',
        is_mandatory: true,
      }),
      markMissingMandatoryAttendanceAbsent: async (input: Record<string, unknown>) => {
        calls.push({ method: 'markMissingMandatoryAttendanceAbsent', ...input });
        return [{ id: 'attendance-1', student_id: 'student-1', status: 'absent' }];
      },
      recordMandatoryLabAttendanceEffects: async (input: Record<string, unknown>) => {
        calls.push({ method: 'recordMandatoryLabAttendanceEffects', ...input });
        return { behavior_events: 1, participation_metrics: 1 };
      },
      completeLabSession: async (input: Record<string, unknown>) => {
        calls.push({ method: 'completeLabSession', ...input });
        return { id: 'session-1', status: 'completed' };
      },
      appendAuditLog: async () => undefined,
    } as never,
  );

  const completed = await service.completeLabSession('session-1');

  assert.deepEqual(completed, { id: 'session-1', status: 'completed' });
  assert.deepEqual(calls, [
    {
      method: 'markMissingMandatoryAttendanceAbsent',
      tenant_id: 'tenant-a',
      session_id: 'session-1',
      recorded_by: 'user-1',
    },
    {
      method: 'completeLabSession',
      tenant_id: 'tenant-a',
      session_id: 'session-1',
    },
    {
      method: 'recordMandatoryLabAttendanceEffects',
      tenant_id: 'tenant-a',
      session_id: 'session-1',
      actor_user_id: 'user-1',
    },
  ]);
});

test('LabsProcessor runs chemical expiry, equipment reconciliation, and lab discipline checks', async () => {
  const calls: Array<Record<string, unknown>> = [];
  const contexts: Array<Record<string, unknown>> = [];
  const processor = new LabsProcessor({
    refreshChemicalExpiryStatuses: async (input: Record<string, unknown>) => {
      calls.push({ method: 'refreshChemicalExpiryStatuses', ...input });
      return { expired: 3, near_expiry: 2 };
    },
    flagOverdueEquipmentUsage: async (input: Record<string, unknown>) => {
      calls.push({ method: 'flagOverdueEquipmentUsage', ...input });
      return { unreconciled: 4 };
    },
    flagMandatoryAttendanceDisciplineGaps: async (input: Record<string, unknown>) => {
      calls.push({ method: 'flagMandatoryAttendanceDisciplineGaps', ...input });
      return { auto_absent: 5, behavior_events: 3, participation_metrics: 8 };
    },
  } as never, undefined, {
    getStore: () => undefined,
    run: (context: Record<string, unknown>, callback: () => unknown) => {
      contexts.push(context);
      return callback();
    },
  } as never);

  const chemicalResult = await processor.runChemicalExpiryCheck({ nearExpiryDays: 21 });
  const reconciliationResult = await processor.runEquipmentReconciliationCheck({ overdueHours: 6 });
  const disciplineResult = await processor.runMandatoryAttendanceDisciplineCheck({ lookbackDays: 4 });

  assert.equal(processor.queueName, 'labs-maintenance');
  assert.deepEqual(chemicalResult, {
    expired: 3,
    near_expiry: 2,
    near_expiry_days: 21,
  });
  assert.deepEqual(reconciliationResult, {
    unreconciled: 4,
    overdue_hours: 6,
  });
  assert.deepEqual(disciplineResult, {
    auto_absent: 5,
    behavior_events: 3,
    participation_metrics: 8,
    lookback_days: 4,
  });
  assert.deepEqual(calls, [
    { method: 'refreshChemicalExpiryStatuses', near_expiry_days: 21 },
    { method: 'flagOverdueEquipmentUsage', overdue_hours: 6 },
    { method: 'flagMandatoryAttendanceDisciplineGaps', lookback_days: 4 },
  ]);
  assert.equal(contexts[0]?.role, 'system');
  assert.equal(contexts[0]?.path, '/internal/labs/maintenance');
});
