const fs = require('fs');
const path = require('path');

const sql = `
-- ==========================================
-- SECRETARY DASHBOARD SCHEMA ADDITIONS
-- ==========================================

-- 1. Front Office Queue Tickets
CREATE TABLE IF NOT EXISTS secretary_queue_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id tenant_key NOT NULL,
    ticket_number TEXT NOT NULL,
    visitor_name TEXT NOT NULL,
    purpose TEXT NOT NULL,
    assigned_to_role TEXT,
    assigned_to_user_id UUID REFERENCES users(id),
    status TEXT NOT NULL DEFAULT 'WAITING',
    wait_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    wait_end TIMESTAMPTZ,
    created_by_user_id UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE secretary_queue_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE secretary_queue_tickets FORCE ROW LEVEL SECURITY;
CREATE POLICY secretary_queue_tickets_tenant_policy ON secretary_queue_tickets FOR ALL USING (tenant_id = app.current_tenant_id()) WITH CHECK (tenant_id = app.current_tenant_id());
CREATE INDEX IF NOT EXISTS idx_secretary_queue_tickets_tenant_id ON secretary_queue_tickets(tenant_id);

-- 2. Parent Requests
CREATE TABLE IF NOT EXISTS parent_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id tenant_key NOT NULL,
    parent_name TEXT NOT NULL,
    student_id UUID REFERENCES students(id),
    request_type TEXT NOT NULL,
    description TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'OPEN',
    assigned_to UUID REFERENCES users(id),
    created_by_user_id UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE parent_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE parent_requests FORCE ROW LEVEL SECURITY;
CREATE POLICY parent_requests_tenant_policy ON parent_requests FOR ALL USING (tenant_id = app.current_tenant_id()) WITH CHECK (tenant_id = app.current_tenant_id());
CREATE INDEX IF NOT EXISTS idx_parent_requests_tenant_id ON parent_requests(tenant_id);

-- 3. Visitor Logs
CREATE TABLE IF NOT EXISTS visitor_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id tenant_key NOT NULL,
    visitor_name TEXT NOT NULL,
    visitor_company TEXT,
    purpose TEXT NOT NULL,
    check_in TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    check_out TIMESTAMPTZ,
    host_user_id UUID REFERENCES users(id),
    pass_number TEXT,
    created_by_user_id UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE visitor_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE visitor_logs FORCE ROW LEVEL SECURITY;
CREATE POLICY visitor_logs_tenant_policy ON visitor_logs FOR ALL USING (tenant_id = app.current_tenant_id()) WITH CHECK (tenant_id = app.current_tenant_id());
CREATE INDEX IF NOT EXISTS idx_visitor_logs_tenant_id ON visitor_logs(tenant_id);

-- 4. Calls Log
CREATE TABLE IF NOT EXISTS call_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id tenant_key NOT NULL,
    caller_name TEXT NOT NULL,
    phone_number TEXT NOT NULL,
    call_type TEXT NOT NULL, -- INCOMING, OUTGOING
    purpose TEXT NOT NULL,
    duration_minutes INTEGER,
    requires_follow_up BOOLEAN NOT NULL DEFAULT FALSE,
    follow_up_notes TEXT,
    created_by_user_id UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE call_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_logs FORCE ROW LEVEL SECURITY;
CREATE POLICY call_logs_tenant_policy ON call_logs FOR ALL USING (tenant_id = app.current_tenant_id()) WITH CHECK (tenant_id = app.current_tenant_id());
CREATE INDEX IF NOT EXISTS idx_call_logs_tenant_id ON call_logs(tenant_id);

-- 5. Appointments
CREATE TABLE IF NOT EXISTS appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id tenant_key NOT NULL,
    visitor_name TEXT NOT NULL,
    host_user_id UUID NOT NULL REFERENCES users(id),
    appointment_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME,
    purpose TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'SCHEDULED',
    created_by_user_id UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments FORCE ROW LEVEL SECURITY;
CREATE POLICY appointments_tenant_policy ON appointments FOR ALL USING (tenant_id = app.current_tenant_id()) WITH CHECK (tenant_id = app.current_tenant_id());
CREATE INDEX IF NOT EXISTS idx_appointments_tenant_id ON appointments(tenant_id);

-- 6. Office Documents
CREATE TABLE IF NOT EXISTS office_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id tenant_key NOT NULL,
    document_title TEXT NOT NULL,
    document_type TEXT NOT NULL,
    issued_to TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'DRAFT',
    created_by_user_id UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE office_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE office_documents FORCE ROW LEVEL SECURITY;
CREATE POLICY office_documents_tenant_policy ON office_documents FOR ALL USING (tenant_id = app.current_tenant_id()) WITH CHECK (tenant_id = app.current_tenant_id());
CREATE INDEX IF NOT EXISTS idx_office_documents_tenant_id ON office_documents(tenant_id);
\n`;

const schemaPath = path.join(__dirname, 'apps/api/src/database/schema.sql');
fs.appendFileSync(schemaPath, sql);
console.log('Successfully appended Secretary schemas to schema.sql');
