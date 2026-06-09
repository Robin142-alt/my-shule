-- Batch 4 Operational Schemas
CREATE TABLE IF NOT EXISTS academics_attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id tenant_key NOT NULL,
  class_id text NOT NULL,
  attendance_date date NOT NULL,
  student_id uuid NOT NULL,
  status text NOT NULL,
  submitted_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  CONSTRAINT ck_academics_attendance_tenant CHECK (tenant_id <> 'global')
);

CREATE TABLE IF NOT EXISTS academics_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id tenant_key NOT NULL,
  title text NOT NULL,
  description text,
  class_id text NOT NULL,
  subject_id text NOT NULL,
  due_date timestamptz NOT NULL,
  teacher_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'Draft',
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  CONSTRAINT ck_academics_assignments_tenant CHECK (tenant_id <> 'global')
);

CREATE TABLE IF NOT EXISTS academics_resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id tenant_key NOT NULL,
  title text NOT NULL,
  type text NOT NULL,
  url text,
  class_id text NOT NULL,
  subject_id text NOT NULL,
  teacher_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'Draft',
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  CONSTRAINT ck_academics_resources_tenant CHECK (tenant_id <> 'global')
);

CREATE TABLE IF NOT EXISTS operations_emergencies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id tenant_key NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  severity text NOT NULL,
  status text NOT NULL DEFAULT 'Active',
  reported_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  CONSTRAINT ck_operations_emergencies_tenant CHECK (tenant_id <> 'global')
);

CREATE TABLE IF NOT EXISTS operations_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id tenant_key NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  severity text NOT NULL,
  status text NOT NULL DEFAULT 'Pending',
  reported_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  CONSTRAINT ck_operations_alerts_tenant CHECK (tenant_id <> 'global')
);

CREATE TABLE IF NOT EXISTS operations_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id tenant_key NOT NULL,
  title text NOT NULL,
  content text NOT NULL,
  status text NOT NULL DEFAULT 'Draft',
  prepared_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  CONSTRAINT ck_operations_reports_tenant CHECK (tenant_id <> 'global')
);

CREATE TABLE IF NOT EXISTS security_incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id tenant_key NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  severity text NOT NULL,
  location text NOT NULL,
  status text NOT NULL DEFAULT 'Reported',
  reported_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  CONSTRAINT ck_security_incidents_tenant CHECK (tenant_id <> 'global')
);

CREATE TABLE IF NOT EXISTS security_panic_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id tenant_key NOT NULL,
  location text NOT NULL,
  status text NOT NULL DEFAULT 'Active',
  triggered_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  CONSTRAINT ck_security_panic_alerts_tenant CHECK (tenant_id <> 'global')
);

CREATE TABLE IF NOT EXISTS finance_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id tenant_key NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  due_date timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'Pending',
  assigned_to uuid,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  CONSTRAINT ck_finance_tasks_tenant CHECK (tenant_id <> 'global')
);

CREATE TABLE IF NOT EXISTS communication_sms_outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id tenant_key NOT NULL,
  recipient_phone text NOT NULL,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'Pending',
  provider_reference text,
  sent_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  CONSTRAINT ck_communication_sms_outbox_tenant CHECK (tenant_id <> 'global')
);

ALTER TABLE operations_emergencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE operations_emergencies FORCE ROW LEVEL SECURITY;
CREATE POLICY operations_emergencies_tenant_policy ON operations_emergencies FOR ALL USING (tenant_id = app.current_tenant_id()) WITH CHECK (tenant_id = app.current_tenant_id());

ALTER TABLE operations_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE operations_alerts FORCE ROW LEVEL SECURITY;
CREATE POLICY operations_alerts_tenant_policy ON operations_alerts FOR ALL USING (tenant_id = app.current_tenant_id()) WITH CHECK (tenant_id = app.current_tenant_id());

ALTER TABLE operations_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE operations_reports FORCE ROW LEVEL SECURITY;
CREATE POLICY operations_reports_tenant_policy ON operations_reports FOR ALL USING (tenant_id = app.current_tenant_id()) WITH CHECK (tenant_id = app.current_tenant_id());

ALTER TABLE security_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_incidents FORCE ROW LEVEL SECURITY;
CREATE POLICY security_incidents_tenant_policy ON security_incidents FOR ALL USING (tenant_id = app.current_tenant_id()) WITH CHECK (tenant_id = app.current_tenant_id());

ALTER TABLE security_panic_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_panic_alerts FORCE ROW LEVEL SECURITY;
CREATE POLICY security_panic_alerts_tenant_policy ON security_panic_alerts FOR ALL USING (tenant_id = app.current_tenant_id()) WITH CHECK (tenant_id = app.current_tenant_id());
