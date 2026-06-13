import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service';

const PROCUREMENT_TABLES = [
  'procurement_suppliers',
  'procurement_requests',
  'procurement_request_items',
  'procurement_approvals',
  'purchase_orders',
  'purchase_order_items',
  'supplier_invoices',
  'procurement_budget_links',
  'procurement_audit_logs',
] as const;

@Injectable()
export class ProcurementSchemaService implements OnModuleInit {

  private async executeSql<T = any>(query: string, params: any[] = []): Promise<{ rows: T[], rowCount: number }> {
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

  private readonly logger = new Logger(ProcurementSchemaService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit(): Promise<void> {
    await this.prisma.runSchemaBootstrap(`
      CREATE EXTENSION IF NOT EXISTS pgcrypto;

      CREATE TABLE IF NOT EXISTS procurement_suppliers (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        name text NOT NULL,
        category text,
        contact_name text,
        phone text,
        email text,
        kra_pin text,
        status text NOT NULL DEFAULT 'active',
        created_by_user_id uuid,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        audit_log_reference uuid,
        CONSTRAINT uq_procurement_suppliers_tenant_id_id UNIQUE (tenant_id, id),
        CONSTRAINT uq_procurement_suppliers_name UNIQUE (tenant_id, name),
        CONSTRAINT ck_procurement_suppliers_status CHECK (status IN ('active', 'on_hold', 'retired'))
      );

      CREATE TABLE IF NOT EXISTS procurement_requests (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        title text NOT NULL,
        department text NOT NULL,
        budget_code text,
        justification text,
        needed_by date,
        status text NOT NULL DEFAULT 'draft',
        requested_by_user_id uuid NOT NULL,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        audit_log_reference uuid,
        CONSTRAINT uq_procurement_requests_tenant_id_id UNIQUE (tenant_id, id),
        CONSTRAINT ck_procurement_requests_status CHECK (status IN ('draft', 'submitted', 'returned', 'approved', 'rejected', 'ordered', 'closed'))
      );

      CREATE TABLE IF NOT EXISTS procurement_request_items (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        request_id uuid NOT NULL,
        item_name text NOT NULL,
        quantity numeric(12, 3) NOT NULL,
        estimated_unit_cost_minor bigint NOT NULL,
        budget_code text,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        audit_log_reference uuid,
        CONSTRAINT fk_procurement_request_items_request
          FOREIGN KEY (tenant_id, request_id)
          REFERENCES procurement_requests (tenant_id, id)
          ON DELETE CASCADE,
        CONSTRAINT ck_procurement_request_items_quantity CHECK (quantity > 0),
        CONSTRAINT ck_procurement_request_items_cost CHECK (estimated_unit_cost_minor >= 0)
      );

      CREATE TABLE IF NOT EXISTS procurement_approvals (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        request_id uuid NOT NULL,
        decision text NOT NULL,
        reason text,
        approver_user_id uuid NOT NULL,
        approved_at timestamptz NOT NULL DEFAULT NOW(),
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        audit_log_reference uuid,
        CONSTRAINT fk_procurement_approvals_request
          FOREIGN KEY (tenant_id, request_id)
          REFERENCES procurement_requests (tenant_id, id)
          ON DELETE CASCADE,
        CONSTRAINT ck_procurement_approvals_decision CHECK (decision IN ('approved', 'rejected', 'returned'))
      );

      CREATE TABLE IF NOT EXISTS purchase_orders (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        po_number text NOT NULL,
        supplier_id uuid NOT NULL,
        request_id uuid,
        expected_delivery_date date,
        notes text,
        total_amount_minor bigint NOT NULL DEFAULT 0,
        status text NOT NULL DEFAULT 'draft',
        created_by_user_id uuid NOT NULL,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        audit_log_reference uuid,
        CONSTRAINT uq_purchase_orders_tenant_id_id UNIQUE (tenant_id, id),
        CONSTRAINT uq_purchase_orders_number UNIQUE (tenant_id, po_number),
        CONSTRAINT fk_purchase_orders_supplier
          FOREIGN KEY (tenant_id, supplier_id)
          REFERENCES procurement_suppliers (tenant_id, id),
        CONSTRAINT fk_purchase_orders_request
          FOREIGN KEY (tenant_id, request_id)
          REFERENCES procurement_requests (tenant_id, id)
          ON DELETE SET NULL,
        CONSTRAINT ck_purchase_orders_status CHECK (status IN ('draft', 'issued', 'partially_received', 'received', 'cancelled', 'closed'))
      );

      CREATE TABLE IF NOT EXISTS purchase_order_items (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        purchase_order_id uuid NOT NULL,
        item_name text NOT NULL,
        quantity numeric(12, 3) NOT NULL,
        unit_cost_minor bigint NOT NULL,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        audit_log_reference uuid,
        CONSTRAINT fk_purchase_order_items_order
          FOREIGN KEY (tenant_id, purchase_order_id)
          REFERENCES purchase_orders (tenant_id, id)
          ON DELETE CASCADE,
        CONSTRAINT ck_purchase_order_items_quantity CHECK (quantity > 0),
        CONSTRAINT ck_purchase_order_items_cost CHECK (unit_cost_minor >= 0)
      );

      CREATE TABLE IF NOT EXISTS supplier_invoices (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        purchase_order_id uuid NOT NULL,
        invoice_number text NOT NULL,
        amount_minor bigint NOT NULL,
        invoice_date date NOT NULL DEFAULT CURRENT_DATE,
        file_url text,
        notes text,
        status text NOT NULL DEFAULT 'attached',
        attached_by_user_id uuid NOT NULL,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        audit_log_reference uuid,
        CONSTRAINT uq_supplier_invoices_number UNIQUE (tenant_id, purchase_order_id, invoice_number),
        CONSTRAINT fk_supplier_invoices_order
          FOREIGN KEY (tenant_id, purchase_order_id)
          REFERENCES purchase_orders (tenant_id, id)
          ON DELETE CASCADE,
        CONSTRAINT ck_supplier_invoices_amount CHECK (amount_minor >= 0),
        CONSTRAINT ck_supplier_invoices_status CHECK (status IN ('attached', 'matched', 'disputed', 'paid', 'void'))
      );

      CREATE TABLE IF NOT EXISTS procurement_budget_links (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        request_id uuid,
        purchase_order_id uuid,
        budget_code text,
        committed_amount_minor bigint NOT NULL DEFAULT 0,
        spent_amount_minor bigint NOT NULL DEFAULT 0,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        audit_log_reference uuid,
        CONSTRAINT fk_procurement_budget_links_request
          FOREIGN KEY (tenant_id, request_id)
          REFERENCES procurement_requests (tenant_id, id)
          ON DELETE SET NULL,
        CONSTRAINT fk_procurement_budget_links_order
          FOREIGN KEY (tenant_id, purchase_order_id)
          REFERENCES purchase_orders (tenant_id, id)
          ON DELETE SET NULL
      );

      CREATE TABLE IF NOT EXISTS procurement_audit_logs (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        actor_user_id uuid,
        action text NOT NULL,
        resource_type text NOT NULL,
        resource_id uuid,
        metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        audit_log_reference uuid
      );

      CREATE INDEX IF NOT EXISTS procurement_requests_budget
        ON procurement_requests (tenant_id, budget_code, status);
      CREATE INDEX IF NOT EXISTS ix_procurement_request_items_request
        ON procurement_request_items (tenant_id, request_id);
      CREATE INDEX IF NOT EXISTS ix_purchase_orders_supplier_status
        ON purchase_orders (tenant_id, supplier_id, status);
      CREATE INDEX IF NOT EXISTS ix_supplier_invoices_order
        ON supplier_invoices (tenant_id, purchase_order_id, status);
      CREATE INDEX IF NOT EXISTS ix_procurement_budget_links_code
        ON procurement_budget_links (tenant_id, budget_code);

      ${PROCUREMENT_TABLES.map((table) => `
        ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY;
        ALTER TABLE ${table} FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS ${table}_tenant_policy ON ${table};
        CREATE POLICY ${table}_tenant_policy ON ${table}
        FOR ALL USING (
          tenant_id = current_setting('app.tenant_id', true)
          OR NULLIF(current_setting('app.role', true), '') = 'system'
        )
        WITH CHECK (
          tenant_id = current_setting('app.tenant_id', true)
          OR NULLIF(current_setting('app.role', true), '') = 'system'
        );
      `).join('\n')}
    `);

    this.logger.log('Procurement schema and RLS policies verified');
  }
}
