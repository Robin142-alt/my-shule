/** Additive progression state. Canonical academic/financial history is retained. */
export const PROGRESSION_SCHEMA_SQL = `
ALTER TABLE students DROP CONSTRAINT IF EXISTS ck_students_status;
ALTER TABLE students ADD CONSTRAINT ck_students_status CHECK(status IN ('applicant','accepted','enrolled','active','inactive','suspended','on_leave','transferred','transferred_out','withdrawn','expelled','graduated','alumni','archived')) NOT VALID;
CREATE TABLE IF NOT EXISTS academic_progression_activation (
  tenant_id text PRIMARY KEY, activated_at timestamptz NOT NULL DEFAULT NOW(),
  last_checked_at timestamptz, last_error text
);
CREATE TABLE IF NOT EXISTS academic_progression_runs (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text, tenant_id text NOT NULL, academic_year_id text NOT NULL,
  status text NOT NULL DEFAULT 'upcoming' CHECK(status IN ('upcoming','running','completed','attention','failed')),
  counts jsonb NOT NULL DEFAULT '{}'::jsonb, message text, lease_until timestamptz, lease_owner text,
  started_at timestamptz, completed_at timestamptz, updated_at timestamptz NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id,id), UNIQUE(tenant_id,academic_year_id),
  FOREIGN KEY(tenant_id,academic_year_id) REFERENCES academic_years(tenant_id,id)
);
CREATE TABLE IF NOT EXISTS academic_progression_decisions (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text, tenant_id text NOT NULL, student_id text NOT NULL,
  academic_year_id text NOT NULL, decision text NOT NULL CHECK(decision IN ('hold','repeat','eligible')),
  reason text NOT NULL, actor_user_id uuid, created_at timestamptz NOT NULL DEFAULT NOW(), updated_at timestamptz NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id,id), UNIQUE(tenant_id,student_id,academic_year_id),
  FOREIGN KEY(tenant_id,academic_year_id) REFERENCES academic_years(tenant_id,id)
);
CREATE TABLE IF NOT EXISTS academic_student_transitions (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text, tenant_id text NOT NULL, student_id text NOT NULL,
  academic_year_id text NOT NULL, action text NOT NULL, outcome text NOT NULL, reason text NOT NULL CHECK(btrim(reason)<>''),
  actor_user_id uuid, actor_role text NOT NULL, automated boolean NOT NULL DEFAULT FALSE,
  request_id text NOT NULL, before_state jsonb NOT NULL, after_state jsonb NOT NULL, reversal_of text,
  created_at timestamptz NOT NULL DEFAULT NOW(), UNIQUE(tenant_id,id),
  UNIQUE(tenant_id,request_id,student_id),
  FOREIGN KEY(tenant_id,academic_year_id) REFERENCES academic_years(tenant_id,id),
  FOREIGN KEY(tenant_id,reversal_of) REFERENCES academic_student_transitions(tenant_id,id)
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_student_transition_reversal ON academic_student_transitions(tenant_id,reversal_of) WHERE reversal_of IS NOT NULL;
CREATE INDEX IF NOT EXISTS ix_student_transition_history ON academic_student_transitions(tenant_id,student_id,created_at DESC,id);
CREATE TABLE IF NOT EXISTS academic_progression_items (
  tenant_id text NOT NULL, academic_year_id text NOT NULL, student_id text NOT NULL,
  status text NOT NULL CHECK(status IN ('promoted','repeating','graduated','completed','held','exception','excluded')),
  transition_id text, message text, attempts integer NOT NULL DEFAULT 0, retry_after timestamptz,
  updated_at timestamptz NOT NULL DEFAULT NOW(), PRIMARY KEY(tenant_id,academic_year_id,student_id),
  FOREIGN KEY(tenant_id,academic_year_id) REFERENCES academic_years(tenant_id,id),
  FOREIGN KEY(tenant_id,transition_id) REFERENCES academic_student_transitions(tenant_id,id)
);
CREATE TABLE IF NOT EXISTS academic_progression_commands (
  tenant_id text NOT NULL, request_id text NOT NULL, fingerprint text NOT NULL, result jsonb NOT NULL,
  actor_user_id uuid, created_at timestamptz NOT NULL DEFAULT NOW(), PRIMARY KEY(tenant_id,request_id)
);
CREATE INDEX IF NOT EXISTS ix_progression_items_retry ON academic_progression_items(tenant_id,academic_year_id,status,retry_after);
ALTER TABLE student_academic_enrollments ADD COLUMN IF NOT EXISTS academic_year_id text;
CREATE INDEX IF NOT EXISTS ix_annual_enrollment_year_id ON student_academic_enrollments(tenant_id,academic_year_id,student_id);
UPDATE student_academic_enrollments enrollment SET academic_year_id=section.academic_year_id
FROM class_sections section WHERE enrollment.academic_year_id IS NULL AND enrollment.tenant_id=section.tenant_id
  AND enrollment.class_section_id::text=section.id::text;
ALTER TABLE academic_progression_activation ENABLE ROW LEVEL SECURITY;
ALTER TABLE academic_progression_activation FORCE ROW LEVEL SECURITY;
ALTER TABLE academic_progression_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE academic_progression_runs FORCE ROW LEVEL SECURITY;
ALTER TABLE academic_progression_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE academic_progression_decisions FORCE ROW LEVEL SECURITY;
ALTER TABLE academic_student_transitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE academic_student_transitions FORCE ROW LEVEL SECURITY;
ALTER TABLE academic_progression_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE academic_progression_items FORCE ROW LEVEL SECURITY;
ALTER TABLE academic_progression_commands ENABLE ROW LEVEL SECURITY;
ALTER TABLE academic_progression_commands FORCE ROW LEVEL SECURITY;
DO $$ DECLARE target text; BEGIN
  FOREACH target IN ARRAY ARRAY['academic_progression_activation','academic_progression_runs','academic_progression_decisions',
    'academic_student_transitions','academic_progression_items','academic_progression_commands'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS progression_school_policy ON %I',target);
    EXECUTE format('CREATE POLICY progression_school_policy ON %I USING (tenant_id=current_setting(''app.tenant_id'',true)) WITH CHECK (tenant_id=current_setting(''app.tenant_id'',true))',target);
  END LOOP;
END $$;
`;
