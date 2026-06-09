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
