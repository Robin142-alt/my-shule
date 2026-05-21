import assert from 'node:assert/strict';
import test from 'node:test';
import 'reflect-metadata';

import { PERMISSIONS_KEY } from '../../auth/auth.constants';
import { MODULE_ACCESS_KEY } from '../module-access/module-access.decorator';
import { ProcurementController } from './procurement.controller';
import { ProcurementSchemaService } from './procurement-schema.service';
import { ProcurementService } from './procurement.service';

test('ProcurementSchemaService creates tenant-safe supplier, request, approval, order, invoice, and budget tables', async () => {
  let schemaSql = '';
  const service = new ProcurementSchemaService({
    runSchemaBootstrap: async (sql: string) => {
      schemaSql += sql;
    },
  } as never);

  await service.onModuleInit();

  for (const table of [
    'procurement_suppliers',
    'procurement_requests',
    'procurement_request_items',
    'procurement_approvals',
    'purchase_orders',
    'purchase_order_items',
    'supplier_invoices',
    'procurement_budget_links',
    'procurement_audit_logs',
  ]) {
    assert.match(schemaSql, new RegExp(`CREATE TABLE IF NOT EXISTS ${table}`));
    assert.match(schemaSql, new RegExp(`ALTER TABLE ${table} FORCE ROW LEVEL SECURITY`));
  }

  assert.match(schemaSql, /current_setting\('app\.tenant_id'/);
  assert.match(schemaSql, /procurement_requests_budget/);
  assert.match(schemaSql, /ix_purchase_orders_supplier_status/);
});

test('ProcurementController is gated by procurement module and procurement permissions', () => {
  assert.deepEqual(Reflect.getMetadata(MODULE_ACCESS_KEY, ProcurementController), ['procurement']);
  const dashboardHandler = Object.getOwnPropertyDescriptor(ProcurementController.prototype, 'getDashboard')?.value;
  const approvalHandler = Object.getOwnPropertyDescriptor(ProcurementController.prototype, 'recordApproval')?.value;

  assert.ok(dashboardHandler);
  assert.ok(approvalHandler);
  assert.deepEqual(Reflect.getMetadata(PERMISSIONS_KEY, dashboardHandler), ['procurement:read']);
  assert.deepEqual(Reflect.getMetadata(PERMISSIONS_KEY, approvalHandler), ['procurement:approve']);
});

test('ProcurementService creates auditable suppliers, requests, approvals, purchase orders, and invoices', async () => {
  const calls: Array<Record<string, unknown>> = [];
  const service = new ProcurementService(
    { getStore: () => ({ tenant_id: 'tenant-a', user_id: 'user-1', permissions: ['procurement:*'] }) } as never,
    {
      createSupplier: async (input: Record<string, unknown>) => {
        calls.push({ method: 'createSupplier', ...input });
        return { id: 'supplier-1', name: input.name, status: 'active' };
      },
      createRequest: async (input: Record<string, unknown>) => {
        calls.push({ method: 'createRequest', ...input });
        return { id: 'request-1', title: input.title, status: 'submitted' };
      },
      recordApproval: async (input: Record<string, unknown>) => {
        calls.push({ method: 'recordApproval', ...input });
        return { id: 'approval-1', decision: input.decision };
      },
      createPurchaseOrder: async (input: Record<string, unknown>) => {
        calls.push({ method: 'createPurchaseOrder', ...input });
        return { id: 'po-1', status: 'issued' };
      },
      attachInvoice: async (input: Record<string, unknown>) => {
        calls.push({ method: 'attachInvoice', ...input });
        return { id: 'invoice-1', invoice_number: input.invoice_number };
      },
      appendAuditLog: async (input: Record<string, unknown>) => {
        calls.push({ method: 'appendAuditLog', ...input });
      },
      getDashboard: async (tenantId: string) => {
        calls.push({ method: 'getDashboard', tenant_id: tenantId });
        return {
          open_requests: 1,
          pending_approvals: 1,
          active_suppliers: 1,
          purchase_order_count: 1,
          invoices_attached: 1,
          budget_committed_minor: '120000',
          requests: [{ id: 'request-1', title: 'Science lab reagents' }],
          suppliers: [{ id: 'supplier-1', name: 'Acme Supplies' }],
          purchase_orders: [{ id: 'po-1', po_number: 'PO-001' }],
          invoices: [{ id: 'invoice-1', invoice_number: 'INV-001' }],
        };
      },
    } as never,
  );

  await service.createSupplier({ name: ' Acme Supplies ', category: 'Laboratory' });
  await service.createRequest({
    title: ' Science lab reagents ',
    department: 'Science',
    budget_code: 'SCI-2026',
    items: [{ item_name: 'Reagent pack', quantity: 3, estimated_unit_cost_minor: 40000 }],
  });
  await service.recordApproval('request-1', { decision: 'approved', reason: 'Within budget' });
  await service.createPurchaseOrder({
    supplier_id: 'supplier-1',
    request_id: 'request-1',
    items: [{ item_name: 'Reagent pack', quantity: 3, unit_cost_minor: 40000 }],
  });
  await service.attachInvoice('po-1', {
    invoice_number: ' INV-001 ',
    amount_minor: 120000,
    invoice_date: '2026-05-21',
  });
  const dashboard = await service.getDashboard();

  assert.equal(dashboard.open_requests, 1);
  assert.deepEqual(calls.map((call) => call.method), [
    'createSupplier',
    'appendAuditLog',
    'createRequest',
    'appendAuditLog',
    'recordApproval',
    'appendAuditLog',
    'createPurchaseOrder',
    'appendAuditLog',
    'attachInvoice',
    'appendAuditLog',
    'getDashboard',
  ]);
  assert.equal(calls[0]?.name, 'Acme Supplies');
  assert.equal(calls[2]?.tenant_id, 'tenant-a');
  assert.equal(calls[2]?.requested_by_user_id, 'user-1');
  assert.deepEqual(calls[2]?.items, [{ item_name: 'Reagent pack', quantity: 3, estimated_unit_cost_minor: 40000 }]);
  assert.equal(calls[4]?.decision, 'approved');
  assert.equal(calls[8]?.invoice_number, 'INV-001');
});

test('ProcurementService rejects purchase requests with no priced line items before repository writes', async () => {
  const calls: string[] = [];
  const service = new ProcurementService(
    { getStore: () => ({ tenant_id: 'tenant-a', user_id: 'user-1', permissions: ['procurement:*'] }) } as never,
    {
      createRequest: async () => {
        calls.push('createRequest');
      },
      appendAuditLog: async () => undefined,
    } as never,
  );

  await assert.rejects(
    () =>
      service.createRequest({
        title: 'Unpriced request',
        department: 'Science',
        items: [{ item_name: 'Microscope', quantity: 0, estimated_unit_cost_minor: -1 }],
      }),
    /valid procurement line item/i,
  );
  assert.deepEqual(calls, []);
});
