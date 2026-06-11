
-- ==============================================================================
-- COUNSELLING MODULE SCHEMA
-- ==============================================================================

CREATE TABLE IF NOT EXISTS counselling_cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    school_id VARCHAR(50) NOT NULL,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    case_number VARCHAR(50) NOT NULL,
    category VARCHAR(100) NOT NULL,
    priority VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'New',
    opened_by UUID REFERENCES users(id) ON DELETE SET NULL,
    assigned_counsellor_id UUID REFERENCES users(id) ON DELETE SET NULL,
    referral_id UUID,
    summary TEXT,
    private_initial_note TEXT,
    opened_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    closed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS counselling_referrals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    school_id VARCHAR(50) NOT NULL,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    referred_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    source_role VARCHAR(100),
    source_module VARCHAR(100),
    reason TEXT NOT NULL,
    category VARCHAR(100),
    priority VARCHAR(50),
    status VARCHAR(50) NOT NULL DEFAULT 'New',
    reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS counselling_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    school_id VARCHAR(50) NOT NULL,
    case_id UUID REFERENCES counselling_cases(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    counsellor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_type VARCHAR(100) NOT NULL,
    session_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    private_note TEXT,
    shared_summary TEXT,
    follow_up_required BOOLEAN DEFAULT false,
    follow_up_date DATE,
    visibility_level VARCHAR(50) DEFAULT 'Private',
    locked_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS counselling_appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    school_id VARCHAR(50) NOT NULL,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    case_id UUID REFERENCES counselling_cases(id) ON DELETE CASCADE,
    appointment_type VARCHAR(100) NOT NULL,
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    location VARCHAR(200),
    status VARCHAR(50) NOT NULL DEFAULT 'Scheduled',
    reminder_sent BOOLEAN DEFAULT false,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS counselling_followups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    school_id VARCHAR(50) NOT NULL,
    case_id UUID REFERENCES counselling_cases(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    due_date DATE NOT NULL,
    priority VARCHAR(50),
    assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'Pending',
    completed_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS welfare_concerns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    school_id VARCHAR(50) NOT NULL,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    category VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    priority VARCHAR(50),
    source VARCHAR(100),
    reported_by UUID REFERENCES users(id) ON DELETE SET NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'Open',
    follow_up_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS parent_contact_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    school_id VARCHAR(50) NOT NULL,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    case_id UUID REFERENCES counselling_cases(id) ON DELETE CASCADE,
    guardian_id UUID, 
    contact_method VARCHAR(50),
    reason TEXT NOT NULL,
    summary TEXT,
    agreed_action TEXT,
    follow_up_date DATE,
    contacted_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS counselling_escalations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    school_id VARCHAR(50) NOT NULL,
    case_id UUID REFERENCES counselling_cases(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    priority VARCHAR(50) NOT NULL,
    reason TEXT NOT NULL,
    recommended_action TEXT,
    escalated_to VARCHAR(100) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'Submitted',
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    closed_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE counselling_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE counselling_cases FORCE ROW LEVEL SECURITY;
CREATE POLICY counselling_cases_tenant_policy ON counselling_cases FOR ALL USING (tenant_id = app.current_tenant_id()) WITH CHECK (tenant_id = app.current_tenant_id());

ALTER TABLE counselling_referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE counselling_referrals FORCE ROW LEVEL SECURITY;
CREATE POLICY counselling_referrals_tenant_policy ON counselling_referrals FOR ALL USING (tenant_id = app.current_tenant_id()) WITH CHECK (tenant_id = app.current_tenant_id());

ALTER TABLE counselling_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE counselling_sessions FORCE ROW LEVEL SECURITY;
CREATE POLICY counselling_sessions_tenant_policy ON counselling_sessions FOR ALL USING (tenant_id = app.current_tenant_id()) WITH CHECK (tenant_id = app.current_tenant_id());

ALTER TABLE counselling_appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE counselling_appointments FORCE ROW LEVEL SECURITY;
CREATE POLICY counselling_appointments_tenant_policy ON counselling_appointments FOR ALL USING (tenant_id = app.current_tenant_id()) WITH CHECK (tenant_id = app.current_tenant_id());

ALTER TABLE counselling_followups ENABLE ROW LEVEL SECURITY;
ALTER TABLE counselling_followups FORCE ROW LEVEL SECURITY;
CREATE POLICY counselling_followups_tenant_policy ON counselling_followups FOR ALL USING (tenant_id = app.current_tenant_id()) WITH CHECK (tenant_id = app.current_tenant_id());

ALTER TABLE welfare_concerns ENABLE ROW LEVEL SECURITY;
ALTER TABLE welfare_concerns FORCE ROW LEVEL SECURITY;
CREATE POLICY welfare_concerns_tenant_policy ON welfare_concerns FOR ALL USING (tenant_id = app.current_tenant_id()) WITH CHECK (tenant_id = app.current_tenant_id());

ALTER TABLE parent_contact_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE parent_contact_logs FORCE ROW LEVEL SECURITY;
CREATE POLICY parent_contact_logs_tenant_policy ON parent_contact_logs FOR ALL USING (tenant_id = app.current_tenant_id()) WITH CHECK (tenant_id = app.current_tenant_id());

ALTER TABLE counselling_escalations ENABLE ROW LEVEL SECURITY;
ALTER TABLE counselling_escalations FORCE ROW LEVEL SECURITY;
CREATE POLICY counselling_escalations_tenant_policy ON counselling_escalations FOR ALL USING (tenant_id = app.current_tenant_id()) WITH CHECK (tenant_id = app.current_tenant_id());

CREATE INDEX IF NOT EXISTS idx_counselling_cases_tenant_id ON counselling_cases(tenant_id);
CREATE INDEX IF NOT EXISTS idx_counselling_referrals_tenant_id ON counselling_referrals(tenant_id);
CREATE INDEX IF NOT EXISTS idx_counselling_sessions_tenant_id ON counselling_sessions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_counselling_appointments_tenant_id ON counselling_appointments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_counselling_followups_tenant_id ON counselling_followups(tenant_id);
CREATE INDEX IF NOT EXISTS idx_welfare_concerns_tenant_id ON welfare_concerns(tenant_id);
CREATE INDEX IF NOT EXISTS idx_parent_contact_logs_tenant_id ON parent_contact_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_counselling_escalations_tenant_id ON counselling_escalations(tenant_id);
