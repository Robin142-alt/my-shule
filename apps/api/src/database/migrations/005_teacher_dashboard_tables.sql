-- Missing Tables for Teacher Dashboard Endpoints

-- Academics Marks
CREATE TABLE IF NOT EXISTS academics_marks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id varchar(50) NOT NULL,
  student_id uuid NOT NULL,
  subject_id varchar(50) NOT NULL,
  exam_id uuid NOT NULL,
  score numeric(5,2),
  remarks text,
  recorded_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  CONSTRAINT ck_academics_marks_tenant CHECK (tenant_id <> 'global')
);
ALTER TABLE academics_marks ENABLE ROW LEVEL SECURITY;
ALTER TABLE academics_marks FORCE ROW LEVEL SECURITY;
CREATE POLICY academics_marks_tenant_policy ON academics_marks FOR ALL USING (tenant_id = app.current_tenant_id()) WITH CHECK (tenant_id = app.current_tenant_id());
CREATE INDEX IF NOT EXISTS idx_academics_marks_tenant_student ON academics_marks(tenant_id, student_id);

-- Academics Timetable Slots
CREATE TABLE IF NOT EXISTS academics_timetable_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id varchar(50) NOT NULL,
  class_id varchar(50) NOT NULL,
  subject_id varchar(50) NOT NULL,
  teacher_id uuid NOT NULL,
  day_of_week int NOT NULL CHECK (day_of_week BETWEEN 1 AND 7),
  start_time time NOT NULL,
  end_time time NOT NULL,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  CONSTRAINT ck_academics_timetable_slots_tenant CHECK (tenant_id <> 'global')
);
ALTER TABLE academics_timetable_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE academics_timetable_slots FORCE ROW LEVEL SECURITY;
CREATE POLICY academics_timetable_slots_tenant_policy ON academics_timetable_slots FOR ALL USING (tenant_id = app.current_tenant_id()) WITH CHECK (tenant_id = app.current_tenant_id());

-- Student Welfare Cases
CREATE TABLE IF NOT EXISTS student_welfare_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id varchar(50) NOT NULL,
  student_id uuid NOT NULL,
  category varchar(100) NOT NULL,
  description text,
  action_taken text,
  status varchar(50) NOT NULL DEFAULT 'OPEN',
  reported_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  CONSTRAINT ck_student_welfare_cases_tenant CHECK (tenant_id <> 'global')
);
ALTER TABLE student_welfare_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_welfare_cases FORCE ROW LEVEL SECURITY;
CREATE POLICY student_welfare_cases_tenant_policy ON student_welfare_cases FOR ALL USING (tenant_id = app.current_tenant_id()) WITH CHECK (tenant_id = app.current_tenant_id());
CREATE INDEX IF NOT EXISTS idx_student_welfare_cases_tenant_student ON student_welfare_cases(tenant_id, student_id);

-- School Meetings
CREATE TABLE IF NOT EXISTS school_meetings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id varchar(50) NOT NULL,
  title varchar(200) NOT NULL,
  description text,
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  organizer_id uuid NOT NULL,
  status varchar(50) NOT NULL DEFAULT 'SCHEDULED',
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  CONSTRAINT ck_school_meetings_tenant CHECK (tenant_id <> 'global')
);
ALTER TABLE school_meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_meetings FORCE ROW LEVEL SECURITY;
CREATE POLICY school_meetings_tenant_policy ON school_meetings FOR ALL USING (tenant_id = app.current_tenant_id()) WITH CHECK (tenant_id = app.current_tenant_id());

-- Student Requests
CREATE TABLE IF NOT EXISTS student_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id varchar(50) NOT NULL,
  student_id uuid NOT NULL,
  request_type varchar(100) NOT NULL,
  description text NOT NULL,
  status varchar(50) NOT NULL DEFAULT 'PENDING',
  requested_by varchar(100) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  CONSTRAINT ck_student_requests_tenant CHECK (tenant_id <> 'global')
);
ALTER TABLE student_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_requests FORCE ROW LEVEL SECURITY;
CREATE POLICY student_requests_tenant_policy ON student_requests FOR ALL USING (tenant_id = app.current_tenant_id()) WITH CHECK (tenant_id = app.current_tenant_id());
CREATE INDEX IF NOT EXISTS idx_student_requests_tenant_student ON student_requests(tenant_id, student_id);

-- School Tasks
CREATE TABLE IF NOT EXISTS school_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id varchar(50) NOT NULL,
  assigned_to uuid NOT NULL,
  title varchar(200) NOT NULL,
  due_date timestamptz,
  status varchar(50) NOT NULL DEFAULT 'PENDING',
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  CONSTRAINT ck_school_tasks_tenant CHECK (tenant_id <> 'global')
);
ALTER TABLE school_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_tasks FORCE ROW LEVEL SECURITY;
CREATE POLICY school_tasks_tenant_policy ON school_tasks FOR ALL USING (tenant_id = app.current_tenant_id()) WITH CHECK (tenant_id = app.current_tenant_id());
CREATE INDEX IF NOT EXISTS idx_school_tasks_tenant_assigned ON school_tasks(tenant_id, assigned_to);
