-- Migration: 003_discipline_schema
-- Description: Creates the admin_incidents table for discipline tracking

CREATE TABLE IF NOT EXISTS admin_incidents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    severity VARCHAR(50) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    involved_parties JSONB NOT NULL DEFAULT '[]'::jsonb,
    status VARCHAR(50) NOT NULL DEFAULT 'reported' CHECK (status IN ('reported', 'reviewed', 'escalated', 'resolved')),
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- RLS Policies
ALTER TABLE admin_incidents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation for admin_incidents" 
ON admin_incidents 
FOR ALL 
USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_admin_incidents_tenant ON admin_incidents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_admin_incidents_status ON admin_incidents(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_admin_incidents_severity ON admin_incidents(tenant_id, severity);


-- Tenant Isolation
ALTER TABLE admin_incidents FORCE ROW LEVEL SECURITY;
