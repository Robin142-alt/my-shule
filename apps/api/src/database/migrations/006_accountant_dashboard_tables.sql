-- Migration: 006_accountant_dashboard_tables
-- Description: Adds missing tables for the accountant dashboard (student_invoices, tenant_pending_waivers, school_expenses, bank_entries)

CREATE TABLE IF NOT EXISTS student_invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL,
    student_id UUID NOT NULL,
    invoice_number TEXT NOT NULL,
    fee_structure_id UUID,
    term TEXT NOT NULL,
    academic_year TEXT NOT NULL,
    amount_minor BIGINT NOT NULL,
    balance_minor BIGINT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE student_invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY student_invoices_tenant_policy ON student_invoices FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true));

CREATE TABLE IF NOT EXISTS tenant_pending_waivers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL,
    waiver_number TEXT NOT NULL,
    student_id UUID NOT NULL,
    student_name TEXT,
    class_name TEXT,
    amount_minor BIGINT NOT NULL,
    reason TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE tenant_pending_waivers ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_pending_waivers_tenant_policy ON tenant_pending_waivers FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true));

CREATE TABLE IF NOT EXISTS school_expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL,
    category TEXT NOT NULL,
    description TEXT NOT NULL,
    amount_minor BIGINT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE school_expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY school_expenses_tenant_policy ON school_expenses FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true));

CREATE TABLE IF NOT EXISTS bank_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL,
    reference TEXT NOT NULL,
    description TEXT NOT NULL,
    type TEXT NOT NULL,
    amount_minor BIGINT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE bank_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY bank_entries_tenant_policy ON bank_entries FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true));


-- Tenant Isolation
ALTER TABLE student_invoices FORCE ROW LEVEL SECURITY;
ALTER TABLE tenant_pending_waivers FORCE ROW LEVEL SECURITY;
ALTER TABLE school_expenses FORCE ROW LEVEL SECURITY;
ALTER TABLE bank_entries FORCE ROW LEVEL SECURITY;
