import assert from 'node:assert/strict';
import test from 'node:test';
import 'reflect-metadata';

import { PERMISSIONS_KEY } from '../../auth/auth.constants';
import { MODULE_ACCESS_KEY } from '../module-access/module-access.decorator';
import { ClinicController } from './clinic.controller';
import { ClinicSchemaService } from './clinic-schema.service';
import { ClinicService } from './clinic.service';
import { ClinicRepository } from './repositories/clinic.repository';

test('ClinicSchemaService creates medicine inventory, dispensing, parent history, and audit tables with RLS', async () => {
  let schemaSql = '';
  const service = new ClinicSchemaService({
    runSchemaBootstrap: async (sql: string) => {
      schemaSql += sql;
    },
  } as never, { onModuleInit: async () => undefined } as never);

  await service.onModuleInit();

  for (const table of [
    'clinic_locations',
    'clinic_medicines',
    'clinic_medicine_batches',
    'clinic_stock_movements',
    'clinic_visits',
    'clinic_medicine_dispenses',
    'clinic_disposal_requests',
    'clinic_alerts',
    'clinic_procurement_recommendations',
    'clinic_audit_logs',
  ]) {
    assert.match(schemaSql, new RegExp(`CREATE TABLE IF NOT EXISTS ${table}`));
    assert.match(schemaSql, new RegExp(`ALTER TABLE ${table} FORCE ROW LEVEL SECURITY`));
  }

  assert.match(schemaSql, /CREATE INDEX IF NOT EXISTS ix_clinic_medicines_tenant_active_category_name/);
});

test('ClinicController is gated by clinic module and separates clinic, principal, and parent permissions', () => {
  assert.deepEqual(Reflect.getMetadata(MODULE_ACCESS_KEY, ClinicController), ['clinic_health']);

  const dispenseHandler = Object.getOwnPropertyDescriptor(
    ClinicController.prototype,
    'dispenseMedicine',
  )?.value;
  const analyticsHandler = Object.getOwnPropertyDescriptor(
    ClinicController.prototype,
    'getPrincipalAnalytics',
  )?.value;
  const parentHistoryHandler = Object.getOwnPropertyDescriptor(
    ClinicController.prototype,
    'getParentMedicalHistory',
  )?.value;

  assert.deepEqual(Reflect.getMetadata(PERMISSIONS_KEY, dispenseHandler), ['clinic:dispense']);
  assert.deepEqual(Reflect.getMetadata(PERMISSIONS_KEY, analyticsHandler), ['clinic:reports']);
  assert.deepEqual(Reflect.getMetadata(PERMISSIONS_KEY, parentHistoryHandler), ['portal:read_own_children']);
});

test('ClinicRepository lists medicine inventory with bounded paging and no medicine star', async () => {
  const queries: Array<{ sql: string; values: unknown[] }> = [];
  const repository = new ClinicRepository({
        executeWithTenant: async function(tenantId: string, ctx: any, cb: any) {
      return cb({
        $queryRawUnsafe: async (sql: string, ...params: any[]) => {
          const res = await (this as any).query(sql, params);
          return res.rows || res;
        }
      });
    },
query: async (sql: string, values: unknown[]) => {
      queries.push({ sql, values });
      return { rows: [] };
    },
  } as never);

  await repository.listMedicines('tenant-a', {
    search: 'para',
    category: 'Painkillers',
    limit: 500,
    offset: 10,
  });

  const sql = queries[0]?.sql ?? '';
  assert.doesNotMatch(sql, /medicine\.\*/);
  assert.match(sql, /medicine\.id::text/);
  assert.match(sql, /quantity_in_stock/);
  assert.match(sql, /LIMIT \$4::integer/);
  assert.match(sql, /OFFSET \$5::integer/);
  assert.deepEqual(queries[0]?.values, ['tenant-a', '%para%', 'Painkillers', 50, 10]);
});

test('ClinicService normalizes medicine inventory search and pagination', async () => {
  const captured: Record<string, unknown> = {};
  const service = new ClinicService(
    {
      getStore: () => ({
        tenant_id: 'tenant-a',
        user_id: 'nurse-1',
        permissions: ['clinic:read'],
      }),
    } as never,
    {
      listMedicines: async (
        tenantId: string,
        options: Record<string, unknown>,
      ) => {
        captured.tenantId = tenantId;
        captured.options = options;
        return [];
      },
    } as never,
  );

  await service.listMedicines({
    search: 'p',
    category: ' Painkillers ',
    limit: 500,
    offset: -5,
  });

  assert.equal(captured.tenantId, 'tenant-a');
  assert.deepEqual(captured.options, {
    search: undefined,
    category: 'Painkillers',
    limit: 50,
    offset: 0,
  });
});

test('ClinicService lists visits with tenant-scoped student names instead of hardcoded unknown labels', async () => {
  let capturedTenantId = '';
  const service = new ClinicService(
    {
      getStore: () => ({
        tenant_id: 'tenant-a',
        user_id: 'nurse-1',
        permissions: ['clinic:read'],
      }),
      requireStore: () => ({
        tenant_id: 'tenant-a',
        user_id: 'nurse-1',
        permissions: ['clinic:read'],
      }),
    } as never,
    {
      listVisits: async (tenantId: string) => {
        capturedTenantId = tenantId;
        return [{
          id: 'visit-1',
          created_at: '2026-06-26T08:00:00.000Z',
          reason: 'Headache',
          status: 'open',
          outcome: null,
          student_id: 'student-1',
          student_name: 'Amina Njeri',
        }];
      },
    } as never,
  );

  const visits = await service.listVisits();

  assert.equal(capturedTenantId, 'tenant-a');
  assert.equal(visits[0].student_name, 'Amina Njeri');
});

test('ClinicRepository lists canonical visits in one tenant and maps unlinked learners neutrally', async () => {
  let capturedSql = '';
  let capturedParams: unknown[] = [];
  const repository = new ClinicRepository({
    query: async (sql: string, params: unknown[]) => {
      capturedSql = sql;
      capturedParams = params;
      return {
        rows: [{
          id: 'visit-1',
          created_at: '2026-06-26T08:00:00.000Z',
          reason: 'Headache',
          status: 'open',
          outcome: null,
          student_id: 'student-1',
          student_name: null,
        }],
        rowCount: 1,
      };
    },
  } as never);

  const visits = await repository.listVisits('tenant-a');

  assert.match(capturedSql, /visit\.symptoms_summary/);
  assert.match(capturedSql, /student\.tenant_id = visit\.tenant_id/);
  assert.doesNotMatch(capturedSql, /visit\.reason|visit\.outcome/);
  assert.deepEqual(capturedParams, ['tenant-a']);
  assert.equal(visits[0].student_name, 'Learner not linked');
});

test('ClinicService exposes repository failures instead of returning an empty visit list', async () => {
  const service = new ClinicService(
    {
      getStore: () => ({ tenant_id: 'tenant-a', user_id: 'nurse-1', permissions: ['clinic:read'] }),
    } as never,
    {
      listVisits: async () => {
        throw new Error('clinic database unavailable');
      },
    } as never,
  );

  await assert.rejects(() => service.listVisits(), /clinic database unavailable/);
});

test('ClinicRepository atomically creates and audits visits only for an active student in the requested tenant', async () => {
  const queries: Array<{ sql: string; params: unknown[] }> = [];
  const repository = new ClinicRepository({
    query: async (sql: string, params: unknown[]) => {
      queries.push({ sql, params });
      return { rows: [], rowCount: 0 };
    },
  } as never);

  const visit = await repository.createVisit({
    tenant_id: 'tenant-a',
    student_id: 'student-from-another-school',
    recorded_by_user_id: '11111111-1111-4111-8111-111111111111',
  });

  assert.equal(visit, undefined);
  assert.deepEqual(queries[0].params.slice(0, 2), ['tenant-a', 'student-from-another-school']);
  assert.match(queries[0].sql, /FROM students student/i);
  assert.match(queries[0].sql, /student\.tenant_id = \$1/i);
  assert.match(queries[0].sql, /student\.id::text = \$2/i);
  assert.match(queries[0].sql, /student\.deleted_at IS NULL/i);
  assert.match(queries[0].sql, /LOWER\(COALESCE\(student\.status::text, 'active'\)\)/i);
  assert.match(queries[0].sql, /INSERT INTO clinic_visits/i);
  assert.match(queries[0].sql, /FROM selected_student student/i);
  assert.match(queries[0].sql, /INSERT INTO clinic_audit_logs/i);
  assert.match(queries[0].sql, /FROM inserted_visit visit/i);
});

test('ClinicRepository materializes visit notices only for exact active guardian accounts', async () => {
  const queries: Array<{ sql: string; params: unknown[] }> = [];
  const repository = new ClinicRepository({
    query: async (sql: string, params: unknown[]) => {
      queries.push({ sql, params });
      return { rows: [{ guardian_count: 2, notification_count: 2 }], rowCount: 1 };
    },
  } as never);

  const delivery = await repository.notifyVisitGuardians({
    tenant_id: 'tenant-a',
    student_id: 'student-a',
    visit_id: 'visit-a',
    title: 'School clinic visit recorded',
    body: 'A clinic visit was recorded for Amina Njeri.',
  });

  assert.deepEqual(delivery, { guardian_count: 2, notification_count: 2 });
  assert.deepEqual(queries[0].params.slice(0, 3), ['tenant-a', 'student-a', 'visit-a']);
  assert.match(queries[0].sql, /guardian\.tenant_id = \$1/i);
  assert.match(queries[0].sql, /guardian\.student_id::text = \$2/i);
  assert.match(queries[0].sql, /LOWER\(guardian\.status\) = 'active'/i);
  assert.match(queries[0].sql, /INNER JOIN tenant_memberships membership/i);
  assert.match(queries[0].sql, /recipient_user_id, recipient_guardian_id/i);
  assert.doesNotMatch(queries[0].sql, /recipient_role/i);
});

test('ClinicService notifies exact active guardians and keeps the realtime event staff scoped', async () => {
  const repositoryCalls: Array<{ method: string; input: Record<string, unknown> }> = [];
  const eventCalls: Array<Record<string, any>> = [];
  const service = new ClinicService(
    {
      getStore: () => ({
        tenant_id: 'tenant-a',
        user_id: '11111111-1111-4111-8111-111111111111',
        role: 'nurse',
        permissions: ['clinic:write'],
      }),
      requireStore: () => ({
        tenant_id: 'tenant-a',
        user_id: '11111111-1111-4111-8111-111111111111',
        role: 'nurse',
        permissions: ['clinic:write'],
      }),
    } as never,
    {
      createVisit: async (input: Record<string, unknown>) => {
        repositoryCalls.push({ method: 'createVisit', input });
        return {
          id: 'visit-a',
          student_id: 'student-a',
          student_name: 'Amina Njeri',
          status: 'open',
          audit_count: 1,
        };
      },
      notifyVisitGuardians: async (input: Record<string, unknown>) => {
        repositoryCalls.push({ method: 'notifyVisitGuardians', input });
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

  const result = await service.recordVisit({
    student_id: 'student-a',
    symptoms_summary: 'Headache',
  });

  assert.equal(result.id, 'visit-a');
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
  assert.deepEqual(eventCalls[0].notifications[0].audienceRoles, ['nurse', 'boarding_master']);
  assert.equal(eventCalls[0].notifications[0].audienceRoles.includes('parent'), false);
});

test('ClinicService rejects a non-canonical learner and reports post-persistence delivery failure as degraded', async () => {
  const baseContext = {
    getStore: () => ({
      tenant_id: 'tenant-a',
      user_id: '11111111-1111-4111-8111-111111111111',
      role: 'nurse',
      permissions: ['clinic:write'],
    }),
    requireStore: () => ({
      tenant_id: 'tenant-a',
      user_id: '11111111-1111-4111-8111-111111111111',
      role: 'nurse',
      permissions: ['clinic:write'],
    }),
  } as never;
  const rejected = new ClinicService(baseContext, {
    createVisit: async () => undefined,
  } as never);
  await assert.rejects(
    () => rejected.recordVisit({ student_id: 'student-from-another-school' }),
    /not active in this school/i,
  );

  const persisted = new ClinicService(
    baseContext,
    {
      createVisit: async () => ({
        id: 'visit-a',
        student_id: 'student-a',
        student_name: 'Amina Njeri',
        audit_count: 1,
      }),
      notifyVisitGuardians: async () => {
        throw new Error('notification store unavailable');
      },
    } as never,
    {
      recordSchoolOperation: async () => {
        throw new Error('event outbox unavailable');
      },
    } as never,
  );

  const result = await persisted.recordVisit({ student_id: 'student-a' });
  assert.equal(result.id, 'visit-a', 'the canonical clinic record remains persisted');
  assert.equal(result.delivery.status, 'degraded');
  assert.equal(result.delivery.staff_event_status, 'failed');
  assert.deepEqual(result.delivery.reasons, ['guardian_notification_failed', 'staff_event_failed']);
});

test('ClinicService blocks dispensing expired medicine and preserves inventory data', async () => {
  const service = new ClinicService(
    {
      getStore: () => ({
        tenant_id: 'tenant-a',
        user_id: 'nurse-1',
        permissions: ['clinic:dispense'],
      }),
    } as never,
    {
      findBatchForDispensing: async () => ({
        id: 'batch-1',
        medicine_id: 'medicine-1',
        status: 'expired',
        expiry_date: '2026-01-01',
        quantity_available: 20,
      }),
    } as never,
  );

  await assert.rejects(
    () => service.dispenseMedicine('visit-1', {
      batch_id: 'batch-1',
      quantity_dispensed: 2,
      dosage: '1 tablet',
    }),
    /expired medicine cannot be dispensed/i,
  );
});

test('ClinicService exposes parent medical history without confidential diagnosis notes', async () => {
  const service = new ClinicService(
    {
      getStore: () => ({
        tenant_id: 'tenant-a',
        user_id: 'parent-1',
        permissions: ['portal:read_own_children'],
      }),
    } as never,
    {
      isGuardianLinkedToStudent: async () => true,
      listParentMedicalHistory: async () => [
        {
          id: 'visit-1',
          diagnosis_summary: 'Flu-like symptoms',
          confidential_notes: 'Private clinician note',
          medicines_dispensed: [{ medicine_name: 'Paracetamol', dosage: '1 tablet' }],
        },
      ],
    } as never,
  );

  const history = await service.getParentMedicalHistory('student-1');

  assert.equal(history[0].diagnosis_summary, 'Flu-like symptoms');
  assert.equal('confidential_notes' in history[0], false);
  assert.deepEqual(history[0].medicines_dispensed, [
    { medicine_name: 'Paracetamol', dosage: '1 tablet' },
  ]);
});

test('ClinicService creates procurement recommendations for low-stock medicine only when procurement is enabled', async () => {
  const recommendations: Array<Record<string, unknown>> = [];
  const service = new ClinicService(
    {
      getStore: () => ({
        tenant_id: 'tenant-a',
        user_id: 'nurse-1',
        permissions: ['clinic:inventory'],
      }),
    } as never,
    {
      listLowStockBatches: async () => [
        {
          batch_id: 'batch-1',
          medicine_id: 'medicine-1',
          medicine_name: 'Paracetamol',
          batch_number: 'PCM-001',
          quantity_available: 12,
          minimum_stock_threshold: 50,
          shortage_quantity: 38,
          recommended_order_quantity: 76,
        },
      ],
      createProcurementRecommendation: async (input: Record<string, unknown>) => {
        recommendations.push(input);
        return { id: 'recommendation-1', ...input };
      },
      appendAuditLog: async () => undefined,
    } as never,
    undefined,
    {
      listEnabledModulesForTenant: async () => ['clinic_health', 'procurement'],
    } as never,
  );

  const result = await service.createLowStockProcurementRecommendations();

  assert.equal(result.recommendations_created, 1);
  assert.equal(recommendations[0].module_code, 'clinic_health');
  assert.equal(recommendations[0].item_name, 'Paracetamol');
  assert.equal(recommendations[0].shortage_quantity, 38);
});

test('ClinicRepository principal analytics include finance-safe costs and medicine usage without private notes', async () => {
  let observedSql = '';
  const repository = new ClinicRepository({
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
          total_medicines: '10',
          low_stock_medicines: '2',
          out_of_stock_medicines: '1',
          expiring_medicines: '3',
          clinic_visits_today: '8',
          medicine_units_dispensed_month: '120',
          medicine_consumption_cost_minor: '90000',
          wastage_due_to_expiry_minor: '15000',
          emergency_supply_ready_rate: '75',
          most_used_medicine: 'ORS',
          critical_alerts: '1',
        }],
      };
    },
  } as never);

  const analytics = await repository.getPrincipalAnalytics('tenant-a');

  assert.equal(analytics.medicine_consumption_cost_minor, '90000');
  assert.equal(analytics.wastage_due_to_expiry_minor, '15000');
  assert.equal(analytics.most_used_medicine, 'ORS');
  assert.match(observedSql, /medicine_consumption_cost_minor/);
  assert.match(observedSql, /wastage_due_to_expiry_minor/);
  assert.match(observedSql, /emergency_supply_ready_rate/);
  assert.doesNotMatch(observedSql, /supplier_invoice_reference/);
  assert.doesNotMatch(observedSql, /confidential_notes/);
});
