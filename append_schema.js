const fs = require('fs');
const path = require('path');

const sql = `
-- ==========================================
-- GRADE MASTER DASHBOARD SCHEMA ADDITIONS
-- ==========================================

-- 1. Grade Master Assignments
CREATE TABLE IF NOT EXISTS grade_master_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id tenant_key NOT NULL,
    user_id UUID NOT NULL REFERENCES users(id),
    grade_level_id UUID NOT NULL, -- UUID only, no strict reference yet
    academic_year_id UUID NOT NULL, -- UUID only, no strict reference yet
    created_by_user_id UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE grade_master_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE grade_master_assignments FORCE ROW LEVEL SECURITY;
CREATE POLICY grade_master_assignments_tenant_policy ON grade_master_assignments FOR ALL USING (tenant_id = app.current_tenant_id()) WITH CHECK (tenant_id = app.current_tenant_id());
CREATE INDEX IF NOT EXISTS idx_grade_master_assignments_tenant_id ON grade_master_assignments(tenant_id);

-- 2. Learner Notes
CREATE TABLE IF NOT EXISTS learner_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id tenant_key NOT NULL,
    student_id UUID NOT NULL REFERENCES students(id),
    grade_level_id UUID NOT NULL,
    academic_year_id UUID NOT NULL,
    note_type TEXT NOT NULL,
    description TEXT NOT NULL,
    follow_up_date DATE,
    created_by_user_id UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE learner_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE learner_notes FORCE ROW LEVEL SECURITY;
CREATE POLICY learner_notes_tenant_policy ON learner_notes FOR ALL USING (tenant_id = app.current_tenant_id()) WITH CHECK (tenant_id = app.current_tenant_id());
CREATE INDEX IF NOT EXISTS idx_learner_notes_tenant_id ON learner_notes(tenant_id);

-- 3. Attendance Followups
CREATE TABLE IF NOT EXISTS attendance_followups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id tenant_key NOT NULL,
    student_id UUID NOT NULL REFERENCES students(id),
    date DATE NOT NULL,
    reason_category TEXT NOT NULL,
    detailed_reason TEXT,
    parent_contacted BOOLEAN NOT NULL DEFAULT FALSE,
    follow_up_required BOOLEAN NOT NULL DEFAULT FALSE,
    follow_up_date DATE,
    assigned_to UUID REFERENCES users(id),
    created_by_user_id UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE attendance_followups ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_followups FORCE ROW LEVEL SECURITY;
CREATE POLICY attendance_followups_tenant_policy ON attendance_followups FOR ALL USING (tenant_id = app.current_tenant_id()) WITH CHECK (tenant_id = app.current_tenant_id());
CREATE INDEX IF NOT EXISTS idx_attendance_followups_tenant_id ON attendance_followups(tenant_id);

-- 4. Academic Interventions
CREATE TABLE IF NOT EXISTS academic_interventions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id tenant_key NOT NULL,
    student_id UUID NOT NULL REFERENCES students(id),
    subject TEXT NOT NULL,
    concern_type TEXT NOT NULL,
    current_performance TEXT,
    target TEXT,
    intervention_plan TEXT NOT NULL,
    responsible_person UUID REFERENCES users(id),
    review_date DATE,
    created_by_user_id UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE academic_interventions ENABLE ROW LEVEL SECURITY;
ALTER TABLE academic_interventions FORCE ROW LEVEL SECURITY;
CREATE POLICY academic_interventions_tenant_policy ON academic_interventions FOR ALL USING (tenant_id = app.current_tenant_id()) WITH CHECK (tenant_id = app.current_tenant_id());
CREATE INDEX IF NOT EXISTS idx_academic_interventions_tenant_id ON academic_interventions(tenant_id);

-- 5. Report Readiness Reviews
CREATE TABLE IF NOT EXISTS report_readiness_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id tenant_key NOT NULL,
    student_id UUID NOT NULL REFERENCES students(id),
    exam_id UUID NOT NULL, -- UUID only
    readiness_status TEXT NOT NULL,
    missing_items TEXT,
    reviewed_by_user_id UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE report_readiness_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_readiness_reviews FORCE ROW LEVEL SECURITY;
CREATE POLICY report_readiness_reviews_tenant_policy ON report_readiness_reviews FOR ALL USING (tenant_id = app.current_tenant_id()) WITH CHECK (tenant_id = app.current_tenant_id());
CREATE INDEX IF NOT EXISTS idx_report_readiness_reviews_tenant_id ON report_readiness_reviews(tenant_id);

-- 6. Grade Form Requests
CREATE TABLE IF NOT EXISTS grade_form_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id tenant_key NOT NULL,
    student_id UUID REFERENCES students(id),
    request_type TEXT NOT NULL,
    priority TEXT NOT NULL,
    description TEXT NOT NULL,
    assigned_department TEXT,
    status TEXT NOT NULL DEFAULT 'open',
    suggested_action TEXT,
    created_by_user_id UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE grade_form_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE grade_form_requests FORCE ROW LEVEL SECURITY;
CREATE POLICY grade_form_requests_tenant_policy ON grade_form_requests FOR ALL USING (tenant_id = app.current_tenant_id()) WITH CHECK (tenant_id = app.current_tenant_id());
CREATE INDEX IF NOT EXISTS idx_grade_form_requests_tenant_id ON grade_form_requests(tenant_id);

-- 7. Grade Form Notifications
CREATE TABLE IF NOT EXISTS grade_form_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id tenant_key NOT NULL,
    grade_level_id UUID NOT NULL,
    type TEXT NOT NULL,
    message TEXT NOT NULL,
    priority TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'unread',
    related_student_id UUID REFERENCES students(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE grade_form_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE grade_form_notifications FORCE ROW LEVEL SECURITY;
CREATE POLICY grade_form_notifications_tenant_policy ON grade_form_notifications FOR ALL USING (tenant_id = app.current_tenant_id()) WITH CHECK (tenant_id = app.current_tenant_id());
CREATE INDEX IF NOT EXISTS idx_grade_form_notifications_tenant_id ON grade_form_notifications(tenant_id);

-- 8. Grade Form Followups
CREATE TABLE IF NOT EXISTS grade_form_followups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id tenant_key NOT NULL,
    student_id UUID NOT NULL REFERENCES students(id),
    followup_type TEXT NOT NULL,
    summary TEXT,
    date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    created_by_user_id UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE grade_form_followups ENABLE ROW LEVEL SECURITY;
ALTER TABLE grade_form_followups FORCE ROW LEVEL SECURITY;
CREATE POLICY grade_form_followups_tenant_policy ON grade_form_followups FOR ALL USING (tenant_id = app.current_tenant_id()) WITH CHECK (tenant_id = app.current_tenant_id());
CREATE INDEX IF NOT EXISTS idx_grade_form_followups_tenant_id ON grade_form_followups(tenant_id);

`;

const schemaPath = path.join(__dirname, 'apps', 'api', 'src', 'database', 'schema.sql');
fs.appendFileSync(schemaPath, sql);
console.log('Appended Grade Master Schema to schema.sql');
