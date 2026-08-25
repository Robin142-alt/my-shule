import assert from 'node:assert/strict';
import test from 'node:test';
import 'reflect-metadata';

import { PERMISSIONS_KEY } from '../../auth/auth.constants';
import { MODULE_ACCESS_KEY } from '../module-access/module-access.decorator';
import { ProcurementController } from './procurement.controller';
import { ProcurementRepository } from './repositories/procurement.repository';
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

test('ProcurementRepository does not hide audit persistence failures', async () => {
  const repository = new ProcurementRepository({
    query: async () => {
      throw new Error('procurement audit unavailable');
    },
  } as never);

  await assert.rejects(
    () => repository.appendAuditLog({
      tenant_id: 'tenant-a',
      actor_user_id: '00000000-0000-4000-8000-000000000101',
      action: 'procurement.request.created',
      resource_type: 'procurement_request',
      resource_id: '00000000-0000-4000-8000-000000000102',
      metadata: {},
    }),
    /procurement audit unavailable/,
  );
});

test('ProcurementRepository counts only actionable canonical procurement approval projections', async () => {
  const queries: Array<{ sql: string; params: unknown[] }> = [];
  const repository = new ProcurementRepository({
    query: async (sql: string, params: unknown[]) => {
      queries.push({ sql, params });
      if (/AS pending_approvals/i.test(sql)) {
        return {
          rows: [{
            open_requests: 3,
            pending_approvals: 1,
            active_suppliers: 0,
            purchase_order_count: 0,
            invoices_attached: 0,
            budget_committed_minor: '0',
          }],
          rowCount: 1,
        };
      }
      return { rows: [], rowCount: 0 };
    },
  } as never);

  const dashboard = await repository.getDashboard('kibabi-high');
  const summaryQuery = queries.find((query) => /AS pending_approvals/i.test(query.sql));

  assert.ok(summaryQuery);
  assert.deepEqual(summaryQuery.params, ['kibabi-high']);
  assert.equal(dashboard.open_requests, 3);
  assert.equal(dashboard.pending_approvals, 1);
  assert.match(summaryQuery.sql, /FROM dashboard_approval_requests approval/);
  assert.match(summaryQuery.sql, /request\.tenant_id::text = approval\.tenant_id::text/);
  assert.match(summaryQuery.sql, /approval\.approval_key = 'procurement-approval-' \|\| request\.id::text/);
  assert.match(summaryQuery.sql, /lower\(approval\.status\) IN \('pending', 'pending_approval', 'changes_requested', 'escalated'\)/);
  assert.match(summaryQuery.sql, /lower\(request\.status\) = 'submitted'/);
  assert.doesNotMatch(
    summaryQuery.sql,
    /FROM procurement_requests WHERE tenant_id = \$1 AND status = 'submitted'\) AS pending_approvals/,
  );
});

test('ProcurementService creates auditable suppliers, requests, purchase orders, and invoices and delegates approvals', async () => {
  const calls: Array<Record<string, unknown>> = [];
  const service = new ProcurementService(
    { getStore: () => ({
      tenant_id: 'tenant-a',
      user_id: 'user-1',
      role: 'principal',
      request_id: 'req-procurement',
      permissions: ['procurement:*'],
    }) } as never,
    {
      createSupplier: async (input: Record<string, unknown>) => {
        calls.push({ method: 'createSupplier', ...input });
        return { id: 'supplier-1', name: input.name, status: 'active' };
      },
      createRequest: async (input: Record<string, unknown>) => {
        calls.push({ method: 'createRequest', ...input });
        return { id: 'request-1', title: input.title, status: 'submitted' };
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
    {
      decideProcurementRequest: async (input: Record<string, unknown>) => {
        calls.push({ method: 'decideProcurementRequest', ...input });
        return { id: 'approval-1', status: 'approved' };
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
    'decideProcurementRequest',
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
  assert.equal(calls[4]?.decision, 'APPROVED');
  assert.equal(calls[4]?.actorRole, 'principal');
  assert.equal(calls[7]?.invoice_number, 'INV-001');
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
    { decideProcurementRequest: async () => undefined } as never,
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

test('ProcurementService routes decisions through the addressed projection and rejects returned state', async () => {
  const calls: Array<Record<string, unknown>> = [];
  const service = new ProcurementService(
    {
      getStore: () => ({
        tenant_id: 'tenant-a',
        user_id: '00000000-0000-4000-8000-000000000111',
        role: 'principal',
        request_id: 'req-addressed-approval',
        permissions: ['procurement:approve'],
      }),
    } as never,
    {
      recordApproval: async () => {
        throw new Error('The direct repository approval path must not be used');
      },
    } as never,
    {
      decideProcurementRequest: async (input: Record<string, unknown>) => {
        calls.push(input);
        return { id: 'approval-projection', status: 'approved' };
      },
    } as never,
  );

  await service.recordApproval('00000000-0000-4000-8000-000000000222', {
    decision: 'approved',
    reason: 'Within budget',
  });

  assert.deepEqual(calls, [{
    tenantId: 'tenant-a',
    procurementRequestId: '00000000-0000-4000-8000-000000000222',
    actorUserId: '00000000-0000-4000-8000-000000000111',
    actorRole: 'principal',
    requestId: 'req-addressed-approval',
    decision: 'APPROVED',
    note: 'Within budget',
  }]);

  await assert.rejects(
    () => service.recordApproval('00000000-0000-4000-8000-000000000222', {
      decision: 'returned',
      reason: 'Correct the quantities',
    }),
    /dedicated correction workflow/i,
  );
  assert.equal(calls.length, 1);
});

test('ProcurementService persists the request, audit, and cross-dashboard event in one tenant transaction', async () => {
  const calls: Array<{ method: string; tx?: unknown; payload?: Record<string, unknown> }> = [];
  const transaction = { id: 'tenant-transaction' };
  const service = new ProcurementService(
    {
      getStore: () => ({
        tenant_id: 'kibabi-high',
        user_id: '00000000-0000-4000-8000-000000000111',
        permissions: ['procurement:write'],
      }),
    } as never,
    {
      createRequest: async (_input: Record<string, unknown>, tx: unknown) => {
        calls.push({ method: 'request', tx });
        return { id: '00000000-0000-4000-8000-000000000222', status: 'submitted' };
      },
      appendAuditLog: async (_input: Record<string, unknown>, tx: unknown) => {
        calls.push({ method: 'audit', tx });
      },
    } as never,
    { decideProcurementRequest: async () => undefined } as never,
    {
      publishProcurementRequestSubmitted: async (payload: Record<string, unknown>, tx: unknown) => {
        calls.push({ method: 'event', payload, tx });
      },
    } as never,
    {
      executeWithTenant: async (
        tenantId: string,
        userId: string,
        callback: (tx: unknown) => Promise<unknown>,
      ) => {
        assert.equal(tenantId, 'kibabi-high');
        assert.equal(userId, '00000000-0000-4000-8000-000000000111');
        return callback(transaction);
      },
    } as never,
  );

  await service.createRequest({
    title: 'Science supplies',
    department: 'Science',
    items: [
      { item_name: 'Reagent pack', quantity: 3, estimated_unit_cost_minor: 40000 },
      { item_name: 'Gloves', quantity: 2, estimated_unit_cost_minor: 10000 },
    ],
  });

  assert.deepEqual(calls.map(({ method }) => method), ['request', 'audit', 'event']);
  assert.ok(calls.every(({ tx }) => tx === transaction));
  assert.deepEqual(calls[2].payload, {
    tenant_id: 'kibabi-high',
    request_id: '00000000-0000-4000-8000-000000000222',
    requested_by_user_id: '00000000-0000-4000-8000-000000000111',
    requested_at: calls[2].payload?.requested_at,
    item_name: 'Reagent pack and 1 more',
    quantity: 5,
    estimated_cost: 140000,
    status: 'submitted',
  });
  assert.match(String(calls[2].payload?.requested_at), /^\d{4}-\d{2}-\d{2}T/);
});
