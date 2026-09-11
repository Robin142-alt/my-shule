import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';

import { RequestContextService } from '../../common/request-context/request-context.service';
import { PrismaService } from '../../database/prisma.service';
import { AdminCommandOperationsService } from './admin-command-operations.service';

type ProcurementDecision = 'approved' | 'rejected';

@Injectable()
export class ProcurementOfficerCommandService {
  constructor(
    private readonly requestContext: RequestContextService,
    private readonly prisma: PrismaService,
    private readonly operations: AdminCommandOperationsService,
  ) {}

  private requireTenantId(): string {
    const tenantId = this.requestContext.getStore()?.tenant_id;
    if (!tenantId) {
      throw new UnauthorizedException('Tenant context is required');
    }
    return tenantId;
  }

  private currentUserId(): string | null {
    return this.requestContext.getStore()?.user_id ?? null;
  }

  private requireUserId(): string {
    const userId = this.currentUserId();
    if (!userId) {
      throw new UnauthorizedException('Authenticated user is required for procurement operations');
    }
    return userId;
  }

  private async executeSql<T = any>(query: string, params: any[] = []): Promise<{ rows: T[]; rowCount: number }> {
    try {
      return await this.prisma.query<T>(query, params);
    } catch {
      return { rows: [], rowCount: 0 };
    }
  }

  async getOverview() {
    const tenantId = this.requireTenantId();
    const metrics = await this.executeSql<{
      pending_requests: number;
      active_orders: number;
      deliveries_due: number;
      suppliers: number;
    }>(
      `
        SELECT
          (SELECT COUNT(*)::int FROM procurement_requests WHERE tenant_id = $1 AND status IN ('draft', 'submitted', 'returned')) AS pending_requests,
          (SELECT COUNT(*)::int FROM purchase_orders WHERE tenant_id = $1 AND lower(status::text) IN ('draft', 'issued', 'partially_received')) AS active_orders,
          (SELECT COUNT(*)::int FROM purchase_orders WHERE tenant_id = $1 AND lower(status::text) IN ('issued', 'partially_received') AND expected_delivery_date <= CURRENT_DATE) AS deliveries_due,
          (SELECT COUNT(*)::int FROM procurement_suppliers WHERE tenant_id = $1 AND status = 'active') AS suppliers
      `,
      [tenantId],
    );
    const row = metrics.rows[0] ?? { pending_requests: 0, active_orders: 0, deliveries_due: 0, suppliers: 0 };
    return {
      metrics: row,
      overviewList: [
        { id: 'pending_requests', metric: 'Pending requests', value: String(row.pending_requests ?? 0) },
        { id: 'active_orders', metric: 'Active orders', value: String(row.active_orders ?? 0) },
        { id: 'deliveries_due', metric: 'Deliveries due', value: String(row.deliveries_due ?? 0) },
        { id: 'suppliers', metric: 'Active suppliers', value: String(row.suppliers ?? 0) },
      ],
    };
  }

  async getSuppliers() {
    const tenantId = this.requireTenantId();
    const result = await this.executeSql(
      `
        SELECT
          id::text,
          name AS company_name,
          COALESCE(contact_name, 'Not recorded') AS contact_person,
          COALESCE(phone, 'Not recorded') AS phone,
          COALESCE(email, 'Not recorded') AS email,
          COALESCE(category, 'General') AS category,
          CASE status
            WHEN 'active' THEN 'Active'
            WHEN 'on_hold' THEN 'Blacklisted'
            WHEN 'retired' THEN 'Retired'
            ELSE initcap(status)
          END AS status
        FROM procurement_suppliers
        WHERE tenant_id = $1
        ORDER BY name ASC
      `,
      [tenantId],
    );

    const metrics = await this.executeSql<{ total_suppliers: number; active: number; blacklisted: number }>(
      `
        SELECT
          COUNT(*)::int AS total_suppliers,
          COUNT(*) FILTER (WHERE status = 'active')::int AS active,
          COUNT(*) FILTER (WHERE status = 'on_hold')::int AS blacklisted
        FROM procurement_suppliers
        WHERE tenant_id = $1
      `,
      [tenantId],
    );

    return {
      metrics: metrics.rows[0] ?? { total_suppliers: 0, active: 0, blacklisted: 0 },
      suppliersList: result.rows,
    };
  }

  async createSupplier(dto: any) {
    const tenantId = this.requireTenantId();
    const userId = this.operations.uuidOrNull(this.requireUserId());
    const name = this.requiredText(dto?.name ?? dto?.company_name ?? dto?.companyName ?? dto?.supplier, 'Supplier name');
    const status = this.normalizeSupplierStatus(dto?.status);
    const result = await this.operations.writeSql(
      `
        INSERT INTO procurement_suppliers (
          tenant_id, name, category, contact_name, phone, email, kra_pin, status, created_by_user_id
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (tenant_id, name)
        DO UPDATE SET
          category = COALESCE(EXCLUDED.category, procurement_suppliers.category),
          contact_name = COALESCE(EXCLUDED.contact_name, procurement_suppliers.contact_name),
          phone = COALESCE(EXCLUDED.phone, procurement_suppliers.phone),
          email = COALESCE(EXCLUDED.email, procurement_suppliers.email),
          kra_pin = COALESCE(EXCLUDED.kra_pin, procurement_suppliers.kra_pin),
          status = EXCLUDED.status,
          updated_at = NOW()
        RETURNING *
      `,
      [
        tenantId,
        name,
        this.optionalText(dto?.category),
        this.optionalText(dto?.contact_name ?? dto?.contactPerson ?? dto?.contact_person),
        this.optionalText(dto?.phone),
        this.optionalText(dto?.email),
        this.optionalText(dto?.kra_pin ?? dto?.kraPin),
        status,
        userId,
      ],
    );
    const supplier = result.rows[0];
    await this.recordProcurementAudit('procurement.supplier.saved', 'procurement_supplier', supplier?.id, {
      name,
      status,
    });
    await this.notifyProcurement('procurement.supplier.saved', 'Supplier saved', `${name} is now available in the procurement supplier register.`, supplier?.id);
    return supplier;
  }

  async updateSupplier(id: string, dto: any) {
    const tenantId = this.requireTenantId();
    const result = await this.operations.writeSql(
      `
        UPDATE procurement_suppliers
        SET
          name = COALESCE($3, name),
          category = COALESCE($4, category),
          contact_name = COALESCE($5, contact_name),
          phone = COALESCE($6, phone),
          email = COALESCE($7, email),
          kra_pin = COALESCE($8, kra_pin),
          status = COALESCE($9, status),
          updated_at = NOW()
        WHERE tenant_id = $1
          AND id = $2::uuid
        RETURNING *
      `,
      [
        tenantId,
        id,
        this.optionalText(dto?.name ?? dto?.company_name ?? dto?.companyName),
        this.optionalText(dto?.category),
        this.optionalText(dto?.contact_name ?? dto?.contactPerson ?? dto?.contact_person),
        this.optionalText(dto?.phone),
        this.optionalText(dto?.email),
        this.optionalText(dto?.kra_pin ?? dto?.kraPin),
        dto?.status ? this.normalizeSupplierStatus(dto.status) : null,
      ],
    );
    const supplier = this.requireRow(result.rows[0], 'Supplier was not found in this school.');
    await this.recordProcurementAudit('procurement.supplier.updated', 'procurement_supplier', supplier.id, dto ?? {});
    return supplier;
  }

  async getPurchaseRequests() {
    const tenantId = this.requireTenantId();
    const result = await this.executeSql(
      `
        SELECT
          request.id::text,
          request.department,
          COALESCE(actor.display_name, request.requested_by_user_id::text) AS requested_by,
          COALESCE(string_agg(item.item_name, ', ' ORDER BY item.created_at), request.title) AS item,
          COALESCE(SUM(item.quantity), 0)::float AS quantity,
          COALESCE(SUM(item.quantity * item.estimated_unit_cost_minor), 0)::text AS estimated_cost_minor,
          request.created_at::date::text AS date,
          CASE request.status
            WHEN 'submitted' THEN 'Pending'
            WHEN 'approved' THEN 'Approved'
            WHEN 'rejected' THEN 'Rejected'
            WHEN 'returned' THEN 'Pending Review'
            WHEN 'ordered' THEN 'Issued'
            WHEN 'closed' THEN 'Completed'
            ELSE initcap(request.status)
          END AS status
        FROM procurement_requests request
        LEFT JOIN procurement_request_items item
          ON item.tenant_id = request.tenant_id
         AND item.request_id = request.id
        LEFT JOIN users actor
          ON actor.id = request.requested_by_user_id
        WHERE request.tenant_id = $1
        GROUP BY request.id, actor.display_name
        ORDER BY request.created_at DESC
      `,
      [tenantId],
    );

    const metrics = await this.executeSql<{ pending: number; approved: number; rejected: number }>(
      `
        SELECT
          COUNT(*) FILTER (WHERE status IN ('draft', 'submitted', 'returned'))::int AS pending,
          COUNT(*) FILTER (WHERE status = 'approved')::int AS approved,
          COUNT(*) FILTER (WHERE status = 'rejected')::int AS rejected
        FROM procurement_requests
        WHERE tenant_id = $1
      `,
      [tenantId],
    );

    return {
      metrics: metrics.rows[0] ?? { pending: 0, approved: 0, rejected: 0 },
      purchaserequestsList: result.rows.map((row: any) => ({
        ...row,
        estimated_cost: this.formatMoney(row.estimated_cost_minor),
      })),
    };
  }

  async createPurchaseRequest(dto: any) {
    const tenantId = this.requireTenantId();
    const userId = this.operations.uuidOrNull(this.requireUserId());
    const title = this.requiredText(dto?.title ?? dto?.item ?? dto?.description, 'Purchase request title');
    const department = this.requiredText(dto?.department ?? 'Administration', 'Department');
    const items = this.normalizeRequestItems(dto);

    const result = await this.operations.writeSql(
      `
        INSERT INTO procurement_requests (
          tenant_id, title, department, budget_code, justification, needed_by, status, requested_by_user_id
        )
        VALUES ($1, $2, $3, $4, $5, $6::date, 'submitted', $7)
        RETURNING *
      `,
      [
        tenantId,
        title,
        department,
        this.optionalText(dto?.budget_code ?? dto?.budgetCode),
        this.optionalText(dto?.justification ?? dto?.reason ?? dto?.notes),
        this.optionalText(dto?.needed_by ?? dto?.neededBy),
        userId,
      ],
    );
    const request = result.rows[0];

    for (const item of items) {
      await this.operations.writeSql(
        `
          INSERT INTO procurement_request_items (
            tenant_id, request_id, item_name, quantity, estimated_unit_cost_minor, budget_code
          )
          VALUES ($1, $2::uuid, $3, $4, $5, $6)
        `,
        [tenantId, request.id, item.item_name, item.quantity, item.estimated_unit_cost_minor, item.budget_code ?? null],
      );
    }

    await this.recordProcurementAudit('procurement.request.created', 'procurement_request', request.id, {
      title,
      department,
      item_count: items.length,
    });
    await this.notifyProcurement('procurement.request.created', 'Purchase request submitted', `${department} submitted ${title} for approval.`, request.id);
    return request;
  }

  async decidePurchaseRequest(id: string, decision: ProcurementDecision, dto: any = {}) {
    const tenantId = this.requireTenantId();
    const userId = this.operations.uuidOrNull(this.requireUserId());
    const result = await this.operations.writeSql(
      `
        INSERT INTO procurement_approvals (
          tenant_id, request_id, decision, reason, approver_user_id
        )
        VALUES ($1, $2::uuid, $3, $4, $5)
        RETURNING *
      `,
      [tenantId, id, decision, this.optionalText(dto?.reason ?? dto?.notes), userId],
    );

    await this.operations.writeSql(
      `
        UPDATE procurement_requests
        SET status = $3,
            updated_at = NOW()
        WHERE tenant_id = $1
          AND id = $2::uuid
      `,
      [tenantId, id, decision],
    );

    const approval = result.rows[0];
    await this.recordProcurementAudit(`procurement.request.${decision}`, 'procurement_request', id, {
      approval_id: approval?.id ?? null,
      reason: dto?.reason ?? null,
    });
    await this.notifyProcurement(
      `procurement.request.${decision}`,
      `Purchase request ${decision}`,
      `A procurement request was ${decision}.`,
      id,
    );
    return approval;
  }

  async getQuotations() {
    const tenantId = this.requireTenantId();
    const result = await this.executeSql(
      `
        SELECT
          id::text,
          COALESCE(payload->>'supplier', payload->>'supplier_name', 'Supplier not recorded') AS supplier,
          COALESCE(payload->>'item', payload->>'item_name', title) AS item,
          COALESCE(payload->>'quoted_amount', payload->>'amount', payload->>'amount_minor', '0') AS quoted_amount_raw,
          COALESCE(payload->>'validity', payload->>'valid_until', '') AS validity,
          created_at::date::text AS date,
          CASE
            WHEN status = 'completed' OR payload->>'selected' = 'true' THEN 'Awarded'
            WHEN status = 'handled' THEN 'Compared'
            ELSE 'Pending Review'
          END AS status
        FROM workflow_events
        WHERE tenant_id = $1
          AND entity_type = 'procurement_quotation'
        ORDER BY created_at DESC
      `,
      [tenantId],
    );
    const metrics = {
      pending_review: result.rows.filter((row: any) => row.status === 'Pending Review').length,
      compared: result.rows.filter((row: any) => row.status === 'Compared').length,
      awarded: result.rows.filter((row: any) => row.status === 'Awarded').length,
    };
    return {
      metrics,
      quotationsList: result.rows.map((row: any) => ({
        ...row,
        quoted_amount: this.formatMoney(row.quoted_amount_raw),
      })),
    };
  }

  async createQuotation(dto: any) {
    const tenantId = this.requireTenantId();
    const supplier = this.requiredText(dto?.supplier ?? dto?.supplier_name ?? dto?.supplierName, 'Supplier');
    const item = this.requiredText(dto?.item ?? dto?.item_name ?? dto?.description, 'Quotation item');
    const amountMinor = this.nonNegativeNumber(dto?.amount_minor ?? dto?.quoted_amount_minor ?? dto?.amount ?? dto?.quoted_amount ?? 0, 'Quoted amount');
    const event = await this.operations.recordWorkflowAction({
      tenantId,
      actorUserId: this.currentUserId(),
      sourceRole: 'procurement_officer',
      targetRoles: ['procurement_officer', 'principal', 'accountant'],
      eventType: 'procurement.quotation.created',
      entityType: 'procurement_quotation',
      title: 'Supplier quotation recorded',
      message: `${supplier} quoted ${this.formatMoney(amountMinor)} for ${item}.`,
      priority: 'normal',
      payload: {
        ...dto,
        supplier,
        item,
        amount_minor: amountMinor,
        validity: dto?.validity ?? dto?.valid_until ?? null,
      },
    });
    return event;
  }

  async selectQuotation(id: string) {
    const tenantId = this.requireTenantId();
    const result = await this.operations.writeSql(
      `
        UPDATE workflow_events
        SET status = 'completed',
            payload = payload || '{"selected": true}'::jsonb,
            updated_at = NOW()
        WHERE tenant_id = $1
          AND id = $2::uuid
          AND entity_type = 'procurement_quotation'
        RETURNING *
      `,
      [tenantId, id],
    );
    const quotation = this.requireRow(result.rows[0], 'Quotation was not found in this school.');
    await this.recordProcurementAudit('procurement.quotation.selected', 'procurement_quotation', id, quotation.payload ?? {});
    await this.notifyProcurement('procurement.quotation.selected', 'Quotation selected', 'A supplier quotation was selected for ordering.', id);
    return quotation;
  }

  async getPurchaseOrders() {
    const tenantId = this.requireTenantId();
    const result = await this.executeSql(
      `
        SELECT
          po.id::text,
          po.po_number,
          supplier.name AS supplier,
          po.total_amount_minor::text AS total_amount_minor,
          po.created_at::date::text AS date,
          COALESCE(po.expected_delivery_date::text, '') AS delivery_date,
          CASE lower(po.status::text)
            WHEN 'draft' THEN 'Draft'
            WHEN 'issued' THEN 'Sent'
            WHEN 'partially_received' THEN 'Pending Review'
            WHEN 'received' THEN 'Delivered'
            WHEN 'cancelled' THEN 'Cancelled'
            WHEN 'closed' THEN 'Completed'
            ELSE initcap(po.status::text)
          END AS status
        FROM purchase_orders po
        INNER JOIN procurement_suppliers supplier
          ON supplier.tenant_id = po.tenant_id
         AND supplier.id::text = po.supplier_id::text
        WHERE po.tenant_id = $1
        ORDER BY po.created_at DESC
      `,
      [tenantId],
    );
    const metrics = await this.executeSql<{ draft: number; sent: number; delivered: number; cancelled: number }>(
      `
        SELECT
          COUNT(*) FILTER (WHERE lower(status::text) = 'draft')::int AS draft,
          COUNT(*) FILTER (WHERE lower(status::text) = 'issued')::int AS sent,
          COUNT(*) FILTER (WHERE lower(status::text) IN ('received', 'closed'))::int AS delivered,
          COUNT(*) FILTER (WHERE lower(status::text) = 'cancelled')::int AS cancelled
        FROM purchase_orders
        WHERE tenant_id = $1
      `,
      [tenantId],
    );
    return {
      metrics: metrics.rows[0] ?? { draft: 0, sent: 0, delivered: 0, cancelled: 0 },
      purchaseordersList: result.rows.map((row: any) => ({
        ...row,
        total_amount: this.formatMoney(row.total_amount_minor),
      })),
    };
  }

  async createPurchaseOrder(dto: any) {
    const tenantId = this.requireTenantId();
    const userId = this.operations.uuidOrNull(this.requireUserId());
    const supplierId = await this.resolveSupplierId(dto);
    const requestId = this.optionalText(dto?.request_id ?? dto?.requestId);
    const items = this.normalizeOrderItems(dto);
    if (!requestId && items.length === 0) {
      throw new BadRequestException('At least one purchase order item or an approved request is required');
    }
    const totalAmount = items.reduce((sum: number, item: { quantity: number; unit_cost_minor: number }) => {
      return sum + item.quantity * item.unit_cost_minor;
    }, 0);
    const result = await this.operations.writeSql(
      `
        INSERT INTO purchase_orders (
          tenant_id, po_number, supplier_id, request_id, expected_delivery_date,
          notes, total_amount_minor, status, created_by_user_id
        )
        VALUES (
          $1,
          COALESCE($2, 'PO-' || to_char(NOW(), 'YYYYMMDD') || '-' || upper(substr(gen_random_uuid()::text, 1, 6))),
          $3::uuid,
          $4::uuid,
          $5::date,
          $6,
          $7,
          'draft',
          $8
        )
        RETURNING *
      `,
      [
        tenantId,
        this.optionalText(dto?.po_number ?? dto?.poNumber),
        supplierId,
        requestId,
        this.optionalText(dto?.expected_delivery_date ?? dto?.expectedDeliveryDate ?? dto?.delivery_date),
        this.optionalText(dto?.notes),
        totalAmount,
        userId,
      ],
    );
    const order = result.rows[0];

    if (items.length > 0) {
      for (const item of items) {
        await this.operations.writeSql(
          `
            INSERT INTO purchase_order_items (
              tenant_id, purchase_order_id, item_name, quantity, unit_cost_minor
            )
            VALUES ($1, $2::uuid, $3, $4, $5)
          `,
          [tenantId, order.id, item.item_name, item.quantity, item.unit_cost_minor],
        );
      }
    } else if (requestId) {
      await this.operations.writeSql(
        `
          INSERT INTO purchase_order_items (
            tenant_id, purchase_order_id, item_name, quantity, unit_cost_minor
          )
          SELECT tenant_id, $2::uuid, item_name, quantity, estimated_unit_cost_minor
          FROM procurement_request_items
          WHERE tenant_id = $1
            AND request_id = $3::uuid
        `,
        [tenantId, order.id, requestId],
      );
      await this.operations.writeSql(
        `
          UPDATE purchase_orders po
          SET total_amount_minor = totals.total_amount,
              updated_at = NOW()
          FROM (
            SELECT COALESCE(SUM(quantity * unit_cost_minor), 0)::bigint AS total_amount
            FROM purchase_order_items
            WHERE tenant_id = $1
              AND purchase_order_id = $2::uuid
          ) totals
          WHERE po.tenant_id = $1
            AND po.id = $2::uuid
        `,
        [tenantId, order.id],
      );
    }

    if (requestId) {
      await this.operations.writeSql(
        `
          UPDATE procurement_requests
          SET status = 'ordered',
              updated_at = NOW()
          WHERE tenant_id = $1
            AND id = $2::uuid
        `,
        [tenantId, requestId],
      );
    }

    await this.recordProcurementAudit('procurement.purchase_order.created', 'purchase_order', order.id, {
      request_id: requestId,
      supplier_id: supplierId,
      item_count: items.length,
    });
    return order;
  }

  async approvePurchaseOrder(id: string) {
    const tenantId = this.requireTenantId();
    const result = await this.operations.writeSql(
      `
        UPDATE purchase_orders
        SET status = 'issued',
            updated_at = NOW()
        WHERE tenant_id = $1
          AND id = $2::uuid
        RETURNING *
      `,
      [tenantId, id],
    );
    const order = this.requireRow(result.rows[0], 'Purchase order was not found in this school.');
    await this.recordProcurementAudit('procurement.purchase_order.issued', 'purchase_order', id, {
      po_number: order.po_number,
    });
    await this.notifyProcurement('procurement.purchase_order.issued', 'Purchase order issued', `${order.po_number} has been issued to the supplier.`, id);
    return order;
  }

  async getDeliveries() {
    const tenantId = this.requireTenantId();
    const result = await this.executeSql(
      `
        SELECT
          po.id::text,
          supplier.name AS supplier,
          po.po_number,
          COUNT(item.id)::int AS items,
          COALESCE(po.expected_delivery_date::text, '') AS expected_date,
          COALESCE(delivery.created_at::date::text, '') AS received_date,
          CASE
            WHEN lower(po.status::text) = 'received' THEN 'Completed'
            WHEN lower(po.status::text) = 'partially_received' THEN 'Pending Review'
            WHEN po.expected_delivery_date < CURRENT_DATE THEN 'Overdue'
            ELSE 'Scheduled'
          END AS status
        FROM purchase_orders po
        INNER JOIN procurement_suppliers supplier
          ON supplier.tenant_id = po.tenant_id
         AND supplier.id::text = po.supplier_id::text
        LEFT JOIN purchase_order_items item
          ON item.tenant_id = po.tenant_id
         AND item.purchase_order_id::text = po.id::text
        LEFT JOIN LATERAL (
          SELECT created_at
          FROM workflow_events event
          WHERE event.tenant_id = po.tenant_id
            AND event.entity_type = 'procurement_delivery'
            AND event.entity_id::text = po.id::text
          ORDER BY event.created_at DESC
          LIMIT 1
        ) delivery ON TRUE
        WHERE po.tenant_id = $1
          AND lower(po.status::text) IN ('issued', 'partially_received', 'received', 'closed')
        GROUP BY po.id, supplier.name, delivery.created_at
        ORDER BY COALESCE(po.expected_delivery_date, po.created_at::date) DESC
      `,
      [tenantId],
    );
    const metrics = {
      expected_today: result.rows.filter((row: any) => row.expected_date === new Date().toISOString().slice(0, 10)).length,
      received: result.rows.filter((row: any) => row.status === 'Completed').length,
      pending_inspection: result.rows.filter((row: any) => row.status === 'Pending Review').length,
    };
    return { metrics, deliveriesList: result.rows };
  }

  async recordDelivery(dto: any) {
    const tenantId = this.requireTenantId();
    const order = await this.resolvePurchaseOrder(dto);
    const receivedItems = this.nonNegativeNumber(dto?.items ?? dto?.items_received ?? dto?.receivedItems ?? 0, 'Received items');
    await this.operations.writeSql(
      `
        UPDATE purchase_orders
        SET status = CASE WHEN $3 > 0 THEN 'partially_received' ELSE status END,
            updated_at = NOW()
        WHERE tenant_id = $1
          AND id = $2::uuid
      `,
      [tenantId, order.id, receivedItems],
    );
    const event = await this.operations.recordWorkflowAction({
      tenantId,
      actorUserId: this.currentUserId(),
      sourceRole: 'procurement_officer',
      targetRoles: ['procurement_officer', 'storekeeper', 'accountant', 'principal'],
      eventType: 'procurement.delivery.recorded',
      entityType: 'procurement_delivery',
      entityId: order.id,
      title: 'Supplier delivery recorded',
      message: `${order.po_number} delivery was recorded and is pending confirmation.`,
      priority: 'normal',
      payload: {
        ...dto,
        purchase_order_id: order.id,
        po_number: order.po_number,
        received_items: receivedItems,
      },
    });
    return event;
  }

  async confirmDelivery(id: string) {
    const tenantId = this.requireTenantId();
    const order = await this.resolvePurchaseOrder({ purchase_order_id: id });
    const result = await this.operations.writeSql(
      `
        UPDATE purchase_orders
        SET status = 'received',
            updated_at = NOW()
        WHERE tenant_id = $1
          AND id = $2::uuid
        RETURNING *
      `,
      [tenantId, order.id],
    );
    await this.operations.writeSql(
      `
        UPDATE workflow_events
        SET status = 'completed',
            updated_at = NOW()
        WHERE tenant_id = $1
          AND entity_type = 'procurement_delivery'
          AND entity_id = $2
      `,
      [tenantId, order.id],
    );
    const confirmed = this.requireRow(result.rows[0], 'Purchase order was not found in this school.');
    await this.recordProcurementAudit('procurement.delivery.confirmed', 'purchase_order', order.id, {
      po_number: order.po_number,
    });
    await this.notifyProcurement('procurement.delivery.confirmed', 'Delivery confirmed', `${order.po_number} has been confirmed as received.`, order.id);
    return confirmed;
  }

  async getReports() {
    const tenantId = this.requireTenantId();
    return this.operations.listReportSnapshots(tenantId, 'procurement-officer-command');
  }

  async generateReport(dto: any) {
    const tenantId = this.requireTenantId();
    const userId = this.operations.uuidOrNull(this.requestContext.getStore()?.user_id);
    const [overview, suppliers, purchaseRequests, quotations, purchaseOrders, deliveries] = await Promise.all([
      this.getOverview(),
      this.getSuppliers(),
      this.getPurchaseRequests(),
      this.getQuotations(),
      this.getPurchaseOrders(),
      this.getDeliveries(),
    ]);
    return this.operations.generateReportSnapshot({
      tenantId,
      module: 'procurement-officer-command',
      reportId: 'procurement-operations',
      title: String(dto?.name || dto?.title || 'Procurement operations report'),
      format: dto?.format,
      generatedByUserId: userId,
      sections: { overview, suppliers, purchaseRequests, quotations, purchaseOrders, deliveries },
      filters: { requested_from: 'procurement-officer-dashboard' },
      targetRoles: ['principal', 'procurement_officer', 'accountant'],
    });
  }

  async runBudgetAction(dto: any) {
    const tenantId = this.requireTenantId();
    const action = String(dto?.action ?? '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
    const allowedActions = new Set(['review_commitments', 'flag_overdue_deliveries', 'generate_budget_report']);
    if (!allowedActions.has(action)) {
      throw new BadRequestException('Unsupported procurement budget action');
    }

    if (action === 'generate_budget_report') {
      return this.generateReport({
        title: 'Procurement budget reconciliation report',
        format: dto?.format ?? 'xlsx',
      });
    }

    const overview = await this.getOverview();
    const metrics = overview.metrics ?? {};
    const isOverdueFlag = action === 'flag_overdue_deliveries';
    const title = isOverdueFlag ? 'Overdue procurement deliveries flagged' : 'Procurement budget commitments reviewed';
    const message = isOverdueFlag
      ? `${metrics.deliveries_due ?? 0} due procurement deliveries were flagged for school follow-up.`
      : `${metrics.pending_requests ?? 0} pending requests and ${metrics.active_orders ?? 0} active orders were reviewed against budget commitments.`;
    const targetRoles = isOverdueFlag
      ? ['procurement_officer', 'principal', 'storekeeper', 'accountant']
      : ['procurement_officer', 'accountant', 'principal'];

    const event = await this.operations.recordWorkflowAction({
      tenantId,
      actorUserId: this.currentUserId(),
      sourceRole: 'procurement_officer',
      targetRoles,
      eventType: `procurement.budget.${action}`,
      entityType: 'procurement_budget_review',
      entityId: null,
      title,
      message,
      priority: isOverdueFlag && Number(metrics.deliveries_due ?? 0) > 0 ? 'high' : 'normal',
      payload: {
        action,
        metrics,
        source_dashboard: 'procurement-officer-dashboard',
      },
    });

    await this.operations.notifyRoles(tenantId, {
      key: `procurement-budget-${action}-${event?.id ?? Date.now()}`,
      type: `procurement.budget.${action}`,
      title,
      body: message,
      targetRoles,
      metadata: {
        action,
        event_id: event?.id ?? null,
        metrics,
      },
    });

    return { success: true, action, event, metrics };
  }

  async recordAction(dto: any) {
    const tenantId = this.requireTenantId();
    const action = String(dto?.action || 'workflow_action')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '') || 'workflow_action';
    const title = this.requiredText(dto?.title || `Procurement ${action.replace(/_/g, ' ')}`, 'Procurement action title');
    const message = this.requiredText(dto?.description || dto?.message || title, 'Procurement action description');
    return this.operations.recordWorkflowAction({
      tenantId,
      actorUserId: this.currentUserId(),
      sourceRole: 'procurement_officer',
      targetRoles: ['procurement_officer', 'principal', 'accountant', 'storekeeper'],
      eventType: `procurement.${action}`,
      entityType: String(dto?.entityType || 'procurement_workflow'),
      entityId: dto?.entityId ?? dto?.entity_id ?? null,
      title,
      message,
      priority: dto?.priority === 'high' || dto?.priority === 'urgent' ? 'high' : 'normal',
      payload: {
        ...dto,
        action,
        source_dashboard: 'procurement-officer-dashboard',
      },
    });
  }

  private normalizeRequestItems(dto: any) {
    const rawItems = Array.isArray(dto?.items) && dto.items.length > 0
      ? dto.items
      : [{
        item_name: dto?.item_name ?? dto?.item ?? dto?.title ?? dto?.description,
        quantity: dto?.quantity ?? 1,
        estimated_unit_cost_minor: dto?.estimated_unit_cost_minor ?? dto?.estimatedCostMinor ?? dto?.estimated_cost ?? dto?.cost ?? 0,
        budget_code: dto?.budget_code ?? dto?.budgetCode,
      }];

    return rawItems.map((item: any) => ({
      item_name: this.requiredText(item?.item_name ?? item?.item ?? item?.name, 'Purchase request item'),
      quantity: this.positiveNumber(item?.quantity ?? 1, 'Item quantity'),
      estimated_unit_cost_minor: this.nonNegativeNumber(item?.estimated_unit_cost_minor ?? item?.estimatedCostMinor ?? item?.cost ?? 0, 'Estimated unit cost'),
      budget_code: this.optionalText(item?.budget_code ?? item?.budgetCode ?? dto?.budget_code ?? dto?.budgetCode),
    }));
  }

  private normalizeOrderItems(dto: any) {
    const rawItems = Array.isArray(dto?.items) ? dto.items : [];
    return rawItems.map((item: any) => ({
      item_name: this.requiredText(item?.item_name ?? item?.item ?? item?.name, 'Purchase order item'),
      quantity: this.positiveNumber(item?.quantity ?? 1, 'Item quantity'),
      unit_cost_minor: this.nonNegativeNumber(item?.unit_cost_minor ?? item?.unitCostMinor ?? item?.cost ?? 0, 'Unit cost'),
    }));
  }

  private async resolveSupplierId(dto: any): Promise<string> {
    const tenantId = this.requireTenantId();
    const supplierId = this.optionalText(dto?.supplier_id ?? dto?.supplierId);
    if (supplierId) {
      const existing = await this.executeSql<{ id: string }>(
        `SELECT id::text FROM procurement_suppliers WHERE tenant_id = $1 AND id = $2::uuid LIMIT 1`,
        [tenantId, supplierId],
      );
      if (existing.rows[0]?.id) {
        return existing.rows[0].id;
      }
    }

    const supplierName = this.optionalText(dto?.supplier ?? dto?.supplier_name ?? dto?.supplierName);
    if (!supplierName) {
      throw new BadRequestException('A valid supplier is required');
    }
    const created = await this.createSupplier({ name: supplierName, category: dto?.supplier_category ?? 'General' });
    return created.id;
  }

  private async resolvePurchaseOrder(dto: any): Promise<any> {
    const tenantId = this.requireTenantId();
    const purchaseOrderId = this.optionalText(dto?.purchase_order_id ?? dto?.purchaseOrderId ?? dto?.id);
    const poNumber = this.optionalText(dto?.po_number ?? dto?.poNumber);
    const result = await this.executeSql(
      `
        SELECT id::text, po_number
        FROM purchase_orders
        WHERE tenant_id = $1
          AND (
            ($2::text IS NOT NULL AND id = $2::uuid)
            OR ($3::text IS NOT NULL AND po_number = $3)
          )
        LIMIT 1
      `,
      [tenantId, purchaseOrderId, poNumber],
    );
    return this.requireRow(result.rows[0], 'Purchase order was not found in this school.');
  }

  private async recordProcurementAudit(action: string, resourceType: string, resourceId: string | null, metadata: Record<string, unknown>) {
    const tenantId = this.requireTenantId();
    await this.operations.readSql(
      `
        INSERT INTO procurement_audit_logs (
          tenant_id, actor_user_id, action, resource_type, resource_id, metadata
        )
        VALUES ($1, $2, $3, $4, $5::uuid, $6::jsonb)
      `,
      [
        tenantId,
        this.operations.uuidOrNull(this.currentUserId()),
        action,
        resourceType,
        this.operations.uuidOrNull(resourceId),
        JSON.stringify(metadata ?? {}),
      ],
    );
    await this.operations.recordAudit(tenantId, action, resourceType, resourceId, metadata ?? {}, this.currentUserId());
  }

  private async notifyProcurement(type: string, title: string, body: string, entityId?: string | null) {
    await this.operations.notifyRoles(this.requireTenantId(), {
      key: `${type}-${entityId ?? Date.now()}`,
      type,
      title,
      body,
      targetRoles: ['procurement_officer', 'principal', 'accountant', 'storekeeper'],
      metadata: { entityId: entityId ?? null },
    });
  }

  private requiredText(value: unknown, label: string): string {
    const text = String(value ?? '').trim();
    if (!text) {
      throw new BadRequestException(`${label} is required`);
    }
    return text;
  }

  private optionalText(value: unknown): string | null {
    const text = String(value ?? '').trim();
    return text || null;
  }

  private positiveNumber(value: unknown, label: string): number {
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric <= 0) {
      throw new BadRequestException(`${label} must be greater than zero`);
    }
    return numeric;
  }

  private nonNegativeNumber(value: unknown, label: string): number {
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric < 0) {
      throw new BadRequestException(`${label} cannot be negative`);
    }
    return numeric;
  }

  private normalizeSupplierStatus(value: unknown): string {
    const normalized = String(value ?? 'active').trim().toLowerCase().replace(/\s+/g, '_');
    if (['active', 'on_hold', 'retired'].includes(normalized)) {
      return normalized;
    }
    if (['blacklisted', 'blocked', 'suspended'].includes(normalized)) {
      return 'on_hold';
    }
    return 'active';
  }

  private formatMoney(value: unknown): string {
    const numeric = Number(value ?? 0);
    return `KES ${(Number.isFinite(numeric) ? numeric / 100 : 0).toLocaleString('en-KE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }

  private requireRow<T>(row: T | undefined, message: string): T {
    if (!row) {
      throw new NotFoundException(message);
    }
    return row;
  }
}
