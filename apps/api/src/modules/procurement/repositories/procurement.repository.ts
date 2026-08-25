import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../../../database/prisma.service';

export interface ProcurementDashboardSummary {
  open_requests: number;
  pending_approvals: number;
  active_suppliers: number;
  purchase_order_count: number;
  invoices_attached: number;
  budget_committed_minor: string;
}

@Injectable()
export class ProcurementRepository {

  private async executeSql<T = any>(query: string, params: any[] = [], tx?: any): Promise<{ rows: T[], rowCount: number }> {
    if (tx) {
      if (/\bRETURNING\b/i.test(query) || /^\s*(?:SELECT|WITH)\b/i.test(query)) {
        const result = await tx.$queryRawUnsafe(query, ...params);
        const rows = Array.isArray(result) ? result : [result];
        return { rows, rowCount: rows.length };
      }
      const rowCount = await tx.$executeRawUnsafe(query, ...params);
      return { rows: [], rowCount };
    }

    const firstParam = params[0];
    const isUuid = typeof firstParam === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(firstParam);

    if ((this.prisma as any).query) {
      return (this.prisma as any).query(query, params);
    }

    
    if (isUuid) {
      return this.prisma.executeWithTenant(firstParam, null, async (tx: any) => {
        const result = await tx.$queryRawUnsafe(query, ...params);
        const arr = Array.isArray(result) ? result : [result];
        return { rows: arr, rowCount: arr.length };
      });
    } else {
      const result = await this.prisma.$queryRawUnsafe(query, ...params);
      const arr = Array.isArray(result) ? result : [result];
        return { rows: arr, rowCount: arr.length };
    }
  }

  constructor(private readonly prisma: PrismaService) {}

  async getDashboard(tenantId: string) {
    const [summary, requests, suppliers, orders, invoices] = await Promise.all([
      this.executeSql<ProcurementDashboardSummary>(
        `
          SELECT
            (SELECT COUNT(*)::int FROM procurement_requests WHERE tenant_id = $1 AND status IN ('draft', 'submitted', 'returned')) AS open_requests,
            (
              SELECT COUNT(*)::int
              FROM dashboard_approval_requests approval
              INNER JOIN procurement_requests request
                ON request.tenant_id::text = approval.tenant_id::text
               AND request.id::text = approval.record_id
              WHERE approval.tenant_id::text = $1::text
                AND approval.approval_key = 'procurement-approval-' || request.id::text
                AND regexp_replace(lower(btrim(COALESCE(approval.module, ''))), '[^a-z0-9]+', '_', 'g') = 'procurement'
                AND regexp_replace(lower(btrim(COALESCE(approval.approval_type, ''))), '[^a-z0-9]+', '_', 'g') = 'procurement'
                AND lower(approval.status) IN ('pending', 'pending_approval', 'changes_requested', 'escalated')
                AND lower(request.status) = 'submitted'
            ) AS pending_approvals,
            (SELECT COUNT(*)::int FROM procurement_suppliers WHERE tenant_id = $1 AND status = 'active') AS active_suppliers,
            (SELECT COUNT(*)::int FROM purchase_orders WHERE tenant_id = $1) AS purchase_order_count,
            (SELECT COUNT(*)::int FROM supplier_invoices WHERE tenant_id = $1) AS invoices_attached,
            COALESCE((SELECT SUM(committed_amount_minor) FROM procurement_budget_links WHERE tenant_id = $1), 0)::text AS budget_committed_minor
        `,
        [tenantId],
      ),
      this.executeSql(
        `
          SELECT
            request.id::text,
            request.title,
            request.department,
            request.status,
            request.budget_code,
            COALESCE(SUM(item.quantity * item.estimated_unit_cost_minor), 0)::text AS estimated_total_minor
          FROM procurement_requests request
          LEFT JOIN procurement_request_items item
            ON item.tenant_id = request.tenant_id
           AND item.request_id = request.id
          WHERE request.tenant_id = $1
          GROUP BY request.id
          ORDER BY request.created_at DESC
          LIMIT 12
        `,
        [tenantId],
      ),
      this.executeSql(
        `
          SELECT id::text, name, category, status, contact_name, phone, email
          FROM procurement_suppliers
          WHERE tenant_id = $1
          ORDER BY name ASC
          LIMIT 12
        `,
        [tenantId],
      ),
      this.executeSql(
        `
          SELECT
            po.id::text,
            po.po_number,
            supplier.name AS supplier_name,
            po.status,
            po.expected_delivery_date::text,
            po.total_amount_minor::text
          FROM purchase_orders po
          INNER JOIN procurement_suppliers supplier
            ON supplier.tenant_id = po.tenant_id
           AND supplier.id = po.supplier_id
          WHERE po.tenant_id = $1
          ORDER BY po.created_at DESC
          LIMIT 12
        `,
        [tenantId],
      ),
      this.executeSql(
        `
          SELECT
            invoice.id::text,
            invoice.invoice_number,
            supplier.name AS supplier_name,
            invoice.amount_minor::text,
            invoice.status,
            invoice.invoice_date::text
          FROM supplier_invoices invoice
          INNER JOIN purchase_orders po
            ON po.tenant_id = invoice.tenant_id
           AND po.id = invoice.purchase_order_id
          INNER JOIN procurement_suppliers supplier
            ON supplier.tenant_id = po.tenant_id
           AND supplier.id = po.supplier_id
          WHERE invoice.tenant_id = $1
          ORDER BY invoice.created_at DESC
          LIMIT 12
        `,
        [tenantId],
      ),
    ]);

    return {
      ...(summary.rows[0] ?? {
        open_requests: 0,
        pending_approvals: 0,
        active_suppliers: 0,
        purchase_order_count: 0,
        invoices_attached: 0,
        budget_committed_minor: '0',
      }),
      requests: requests.rows,
      suppliers: suppliers.rows,
      purchase_orders: orders.rows,
      invoices: invoices.rows,
    };
  }

  async createSupplier(input: Record<string, unknown>) {
    const result = await this.executeSql(
      `
        INSERT INTO procurement_suppliers (
          tenant_id, name, category, contact_name, phone, email, kra_pin, created_by_user_id
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8::uuid)
        RETURNING *
      `,
      [
        input.tenant_id,
        input.name,
        input.category ?? null,
        input.contact_name ?? null,
        input.phone ?? null,
        input.email ?? null,
        input.kra_pin ?? null,
        input.created_by_user_id,
      ],
    );

    return result.rows[0];
  }

  async createRequest(input: Record<string, unknown>, tx?: any) {
    const persist = async (activeTx: any) => {
      const result = await this.executeSql(
        `
          INSERT INTO procurement_requests (
            tenant_id, title, department, budget_code, justification, needed_by,
            status, requested_by_user_id
          )
          VALUES ($1, $2, $3, $4, $5, $6::date, 'submitted', $7::uuid)
          RETURNING *
        `,
        [
          input.tenant_id,
          input.title,
          input.department,
          input.budget_code ?? null,
          input.justification ?? null,
          input.needed_by ?? null,
          input.requested_by_user_id,
        ],
        activeTx,
      );
      const request = result.rows[0];

      for (const item of (input.items ?? []) as Array<Record<string, unknown>>) {
        await this.executeSql(
          `
            INSERT INTO procurement_request_items (
              tenant_id, request_id, item_name, quantity, estimated_unit_cost_minor, budget_code
            )
            VALUES ($1, $2::uuid, $3, $4, $5, $6)
          `,
          [
            input.tenant_id,
            request.id,
            item.item_name,
            item.quantity,
            item.estimated_unit_cost_minor,
            item.budget_code ?? input.budget_code ?? null,
          ],
          activeTx,
        );
      }

      return request;
    };

    if (tx) {
      return persist(tx);
    }

    return this.prisma.executeWithTenant(
      String(input.tenant_id),
      typeof input.requested_by_user_id === 'string' ? input.requested_by_user_id : null,
      persist,
    );
  }

  async recordApproval(input: Record<string, unknown>, tx?: any) {
    const persist = async (activeTx: any) => {
      const request = await this.executeSql<{ id: string }>(
        `
          UPDATE procurement_requests
          SET status = $3,
              updated_at = NOW()
          WHERE tenant_id = $1
            AND id = $2::uuid
            AND status IN ('submitted', 'returned')
          RETURNING id::text
        `,
        [
          input.tenant_id,
          input.request_id,
          input.decision === 'approved'
            ? 'approved'
            : input.decision === 'rejected'
              ? 'rejected'
              : 'returned',
        ],
        activeTx,
      );

      if (!request.rows[0]) {
        throw new NotFoundException('Pending procurement request was not found in the active school');
      }

      const result = await this.executeSql(
        `
          INSERT INTO procurement_approvals (
            tenant_id, request_id, decision, reason, approver_user_id
          )
          VALUES ($1, $2::uuid, $3, $4, $5::uuid)
          RETURNING *
        `,
        [
          input.tenant_id,
          input.request_id,
          input.decision,
          input.reason ?? null,
          input.approver_user_id,
        ],
        activeTx,
      );

      return result.rows[0];
    };

    if (tx) {
      return persist(tx);
    }

    return this.prisma.executeWithTenant(
      String(input.tenant_id),
      typeof input.approver_user_id === 'string' ? input.approver_user_id : null,
      persist,
    );
  }

  async createPurchaseOrder(input: Record<string, unknown>) {
    return this.prisma.withRequestTransaction(async () => {
      const totalAmount = ((input.items ?? []) as Array<Record<string, unknown>>)
        .reduce((sum, item) => sum + Number(item.quantity) * Number(item.unit_cost_minor), 0);
      const result = await this.executeSql(
        `
          INSERT INTO purchase_orders (
            tenant_id, po_number, supplier_id, request_id, expected_delivery_date,
            notes, total_amount_minor, status, created_by_user_id
          )
          VALUES (
            $1,
            'PO-' || to_char(NOW(), 'YYYYMMDD') || '-' || upper(substr(gen_random_uuid()::text, 1, 6)),
            $2::uuid,
            $3::uuid,
            $4::date,
            $5,
            $6,
            'issued',
            $7::uuid
          )
          RETURNING *
        `,
        [
          input.tenant_id,
          input.supplier_id,
          input.request_id ?? null,
          input.expected_delivery_date ?? null,
          input.notes ?? null,
          totalAmount,
          input.created_by_user_id,
        ],
      );
      const order = result.rows[0];

      for (const item of (input.items ?? []) as Array<Record<string, unknown>>) {
        await this.executeSql(
          `
            INSERT INTO purchase_order_items (
              tenant_id, purchase_order_id, item_name, quantity, unit_cost_minor
            )
            VALUES ($1, $2::uuid, $3, $4, $5)
          `,
          [
            input.tenant_id,
            order.id,
            item.item_name,
            item.quantity,
            item.unit_cost_minor,
          ],
        );
      }

      if (input.request_id) {
        await this.executeSql(
          `
            INSERT INTO procurement_budget_links (
              tenant_id, request_id, purchase_order_id, budget_code, committed_amount_minor
            )
            SELECT $1, $2::uuid, $3::uuid, budget_code, $4
            FROM procurement_requests
            WHERE tenant_id = $1
              AND id = $2::uuid
          `,
          [input.tenant_id, input.request_id, order.id, totalAmount],
        );
      }

      return order;
    });
  }

  async attachInvoice(input: Record<string, unknown>) {
    const result = await this.executeSql(
      `
        INSERT INTO supplier_invoices (
          tenant_id, purchase_order_id, invoice_number, amount_minor,
          invoice_date, file_url, notes, attached_by_user_id
        )
        VALUES ($1, $2::uuid, $3, $4, COALESCE($5::date, CURRENT_DATE), $6, $7, $8::uuid)
        RETURNING *
      `,
      [
        input.tenant_id,
        input.purchase_order_id,
        input.invoice_number,
        input.amount_minor,
        input.invoice_date ?? null,
        input.file_url ?? null,
        input.notes ?? null,
        input.attached_by_user_id,
      ],
    );

    return result.rows[0];
  }

  async appendAuditLog(input: Record<string, unknown>, tx?: any) {
    const write = this.executeSql(
      `
        INSERT INTO procurement_audit_logs (
          tenant_id, actor_user_id, action, resource_type, resource_id, metadata
        )
        VALUES ($1, $2::uuid, $3, $4, $5::uuid, $6::jsonb)
      `,
      [
        input.tenant_id,
        input.actor_user_id ?? null,
        input.action,
        input.resource_type,
        input.resource_id ?? null,
        JSON.stringify(input.metadata ?? {}),
      ],
      tx,
    );

    if (tx) {
      await write;
      return;
    }

    await write;
  }
}
