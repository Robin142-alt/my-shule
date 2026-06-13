-- Migration: 002_finance_projections
-- Description: Creates projection tables for Finance Overview dashboard

CREATE TABLE IF NOT EXISTS tenant_finance_summary (
    tenant_id UUID NOT NULL,
    current_term VARCHAR(50) NOT NULL,
    total_collections_minor BIGINT NOT NULL DEFAULT 0,
    total_arrears_minor BIGINT NOT NULL DEFAULT 0,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (tenant_id, current_term)
);

CREATE TABLE IF NOT EXISTS tenant_pending_waivers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    waiver_number VARCHAR(50) NOT NULL,
    student_id UUID NOT NULL,
    student_name VARCHAR(255) NOT NULL,
    class_name VARCHAR(100) NOT NULL,
    amount_minor BIGINT NOT NULL,
    reason TEXT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- RLS Policies for tenant_finance_summary
ALTER TABLE tenant_finance_summary ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation for tenant_finance_summary" 
ON tenant_finance_summary 
FOR ALL 
USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

-- RLS Policies for tenant_pending_waivers
ALTER TABLE tenant_pending_waivers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation for tenant_pending_waivers" 
ON tenant_pending_waivers 
FOR ALL 
USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

-- Indexes for fast retrieval
CREATE INDEX IF NOT EXISTS idx_tenant_finance_summary_tenant ON tenant_finance_summary(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_pending_waivers_tenant ON tenant_pending_waivers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_pending_waivers_status ON tenant_pending_waivers(tenant_id, status);


-- Tenant Isolation
ALTER TABLE tenant_finance_summary FORCE ROW LEVEL SECURITY;
ALTER TABLE tenant_pending_waivers FORCE ROW LEVEL SECURITY;
