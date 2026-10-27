// Syllabus content is versioned as one document. Stable subtopic IDs survive revisions.
export const SYLLABUS_SCHEMA_SQL = `
  CREATE TABLE IF NOT EXISTS academics_syllabi (
    id text PRIMARY KEY DEFAULT gen_random_uuid()::text, tenant_id text NOT NULL,
    subject_id text NOT NULL, academic_year_id text NOT NULL, academic_term_id text NOT NULL, grade_level text NOT NULL,
    topics jsonb NOT NULL, milestones jsonb NOT NULL DEFAULT '[]'::jsonb,
    version integer NOT NULL DEFAULT 1 CHECK (version > 0),
    created_by_user_id uuid NOT NULL, updated_by_user_id uuid NOT NULL,
    created_at timestamptz NOT NULL DEFAULT NOW(), updated_at timestamptz NOT NULL DEFAULT NOW(),
    UNIQUE (tenant_id, id), UNIQUE (tenant_id, subject_id, academic_year_id, academic_term_id, grade_level),
    FOREIGN KEY (tenant_id, subject_id) REFERENCES subjects (tenant_id, id),
    FOREIGN KEY (tenant_id, academic_year_id) REFERENCES academic_years (tenant_id, id),
    FOREIGN KEY (tenant_id, academic_term_id) REFERENCES academic_terms (tenant_id, id),
    CHECK (jsonb_typeof(topics) = 'array' AND jsonb_typeof(milestones) = 'array')
  );
  CREATE TABLE IF NOT EXISTS academics_syllabus_coverage (
    id text PRIMARY KEY DEFAULT gen_random_uuid()::text, tenant_id text NOT NULL,
    syllabus_id text NOT NULL, assignment_id text NOT NULL, subtopic_id text NOT NULL,
    teacher_user_id text NOT NULL, completed boolean NOT NULL DEFAULT false, completed_at timestamptz,
    note text NOT NULL DEFAULT '' CHECK (length(note) <= 2000), version integer NOT NULL DEFAULT 1,
    created_by_user_id uuid NOT NULL, updated_by_user_id uuid NOT NULL,
    created_at timestamptz NOT NULL DEFAULT NOW(), updated_at timestamptz NOT NULL DEFAULT NOW(),
    UNIQUE (tenant_id, id), UNIQUE (tenant_id, syllabus_id, assignment_id, teacher_user_id, subtopic_id),
    FOREIGN KEY (tenant_id, syllabus_id) REFERENCES academics_syllabi (tenant_id, id),
    FOREIGN KEY (tenant_id, assignment_id) REFERENCES teacher_subject_assignments (tenant_id, id),
    CHECK (completed = (completed_at IS NOT NULL))
  );
  CREATE INDEX IF NOT EXISTS ix_syllabus_coverage_assignment ON academics_syllabus_coverage (tenant_id, assignment_id, syllabus_id);
  ALTER TABLE academics_syllabi ENABLE ROW LEVEL SECURITY;
  ALTER TABLE academics_syllabi FORCE ROW LEVEL SECURITY;
  ALTER TABLE academics_syllabus_coverage ENABLE ROW LEVEL SECURITY;
  ALTER TABLE academics_syllabus_coverage FORCE ROW LEVEL SECURITY;
  DROP POLICY IF EXISTS syllabus_school_scope ON academics_syllabi;
  CREATE POLICY syllabus_school_scope ON academics_syllabi FOR ALL
    USING (tenant_id = current_setting('app.tenant_id', true) OR current_setting('app.role', true) = 'system')
    WITH CHECK (tenant_id = current_setting('app.tenant_id', true) OR current_setting('app.role', true) = 'system');
  DROP POLICY IF EXISTS syllabus_school_scope ON academics_syllabus_coverage;
  CREATE POLICY syllabus_school_scope ON academics_syllabus_coverage FOR ALL
    USING (tenant_id = current_setting('app.tenant_id', true) OR current_setting('app.role', true) = 'system')
    WITH CHECK (tenant_id = current_setting('app.tenant_id', true) OR current_setting('app.role', true) = 'system');
`;
