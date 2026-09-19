/** Idempotent compatibility migration; existing academic history is never deleted. */
export const COHORT_SCHEMA_SQL = `
  CREATE TABLE IF NOT EXISTS academic_cohorts (
    id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
    tenant_id text NOT NULL,
    parent_cohort_id text,
    status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'retired')),
    created_by_user_id uuid,
    created_at timestamptz NOT NULL DEFAULT NOW(), updated_at timestamptz NOT NULL DEFAULT NOW(),
    UNIQUE (tenant_id, id),
    FOREIGN KEY (tenant_id, parent_cohort_id) REFERENCES academic_cohorts (tenant_id, id)
  );
  CREATE TABLE IF NOT EXISTS academic_cohort_placements (
    id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
    tenant_id text NOT NULL, cohort_id text NOT NULL, academic_year_id text NOT NULL,
    class_section_id text NOT NULL, stream_id text, source_placement_id text,
    status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed')),
    version integer NOT NULL DEFAULT 1,
    created_by_user_id uuid,
    created_at timestamptz NOT NULL DEFAULT NOW(), updated_at timestamptz NOT NULL DEFAULT NOW(),
    UNIQUE (tenant_id, id), UNIQUE (tenant_id, cohort_id, id),
    FOREIGN KEY (tenant_id, cohort_id) REFERENCES academic_cohorts (tenant_id, id),
    FOREIGN KEY (tenant_id, academic_year_id) REFERENCES academic_years (tenant_id, id),
    FOREIGN KEY (tenant_id, class_section_id) REFERENCES class_sections (tenant_id, id),
    FOREIGN KEY (tenant_id, class_section_id, stream_id) REFERENCES class_streams (tenant_id, class_section_id, id),
    FOREIGN KEY (tenant_id, source_placement_id) REFERENCES academic_cohort_placements (tenant_id, id)
  );
  CREATE UNIQUE INDEX IF NOT EXISTS ux_cohort_current_context
    ON academic_cohort_placements (tenant_id, class_section_id, COALESCE(stream_id, '')) WHERE status = 'active';
  CREATE UNIQUE INDEX IF NOT EXISTS ux_cohort_class_year_context
    ON class_sections (tenant_id, id, academic_year_id);
  DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='fk_cohort_placement_class_year') THEN
      ALTER TABLE academic_cohort_placements ADD CONSTRAINT fk_cohort_placement_class_year
        FOREIGN KEY (tenant_id,class_section_id,academic_year_id)
        REFERENCES class_sections (tenant_id,id,academic_year_id) NOT VALID;
    END IF;
  END $$;
  CREATE UNIQUE INDEX IF NOT EXISTS ux_cohort_current_placement
    ON academic_cohort_placements (tenant_id, cohort_id) WHERE status = 'active';
  CREATE TABLE IF NOT EXISTS academic_cohort_promotion_operations (
    id text PRIMARY KEY DEFAULT gen_random_uuid()::text, tenant_id text NOT NULL,
    request_id text NOT NULL, request_fingerprint text NOT NULL,
    status text NOT NULL DEFAULT 'completed' CHECK (status = 'completed'), actor_user_id uuid,
    reason text NOT NULL, result jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT NOW(),
    completed_at timestamptz NOT NULL DEFAULT NOW(), UNIQUE (tenant_id, request_id), UNIQUE (tenant_id, id)
  );
  CREATE TABLE IF NOT EXISTS academic_cohort_migrations (
    tenant_id text PRIMARY KEY, version integer NOT NULL DEFAULT 1,
    completed_at timestamptz NOT NULL DEFAULT NOW(), summary jsonb NOT NULL DEFAULT '{}'::jsonb
  );
  CREATE TABLE IF NOT EXISTS academic_cohort_migration_issues (
    id text PRIMARY KEY DEFAULT gen_random_uuid()::text, tenant_id text NOT NULL,
    entity_type text NOT NULL, class_section_id text NOT NULL, stream_id text, subject_id text,
    cohort_placement_id text, source_assignment_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
    reason text NOT NULL, details jsonb NOT NULL DEFAULT '{}'::jsonb,
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'resolved')),
    resolved_by_user_id uuid, resolved_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT NOW(), updated_at timestamptz NOT NULL DEFAULT NOW(),
    UNIQUE (tenant_id, id),
    FOREIGN KEY (tenant_id, cohort_placement_id) REFERENCES academic_cohort_placements (tenant_id, id)
  );
  CREATE UNIQUE INDEX IF NOT EXISTS ux_cohort_migration_issue
    ON academic_cohort_migration_issues (tenant_id, entity_type, class_section_id,
      COALESCE(stream_id, ''), COALESCE(subject_id, ''), reason) WHERE status = 'pending';

  ALTER TABLE class_subject_assignments DROP CONSTRAINT IF EXISTS uq_class_subject_assignments_scope;
  DROP INDEX IF EXISTS uq_class_subject_assignments_scope;
  ALTER TABLE class_subject_assignments DROP CONSTRAINT IF EXISTS uq_class_subject_assignments_tenant_term_stream_subject;
  ALTER TABLE class_subject_assignments DROP CONSTRAINT IF EXISTS fk_class_subject_assignments_stream;
  ALTER TABLE class_subject_assignments ADD COLUMN IF NOT EXISTS stream_id text;
  ALTER TABLE class_subject_assignments ALTER COLUMN stream_id TYPE text USING stream_id::text;
  ALTER TABLE class_subject_assignments ALTER COLUMN academic_term_id DROP NOT NULL;
  DO $$ DECLARE target_table text; BEGIN
    FOREACH target_table IN ARRAY ARRAY['class_subject_assignments', 'teacher_subject_assignments',
      'student_class_assignments', 'student_academic_enrollments'] LOOP
      IF to_regclass('public.' || target_table) IS NOT NULL THEN
        EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS cohort_id text', target_table);
        EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS cohort_placement_id text', target_table);
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_' || target_table || '_cohort_placement') THEN
          EXECUTE format('ALTER TABLE %I ADD CONSTRAINT %I FOREIGN KEY (tenant_id, cohort_id, cohort_placement_id)
            REFERENCES academic_cohort_placements (tenant_id, cohort_id, id) NOT VALID',
            target_table, 'fk_' || target_table || '_cohort_placement');
        END IF;
      END IF;
    END LOOP;
    IF to_regclass('public.student_academic_enrollments') IS NOT NULL THEN
      ALTER TABLE student_academic_enrollments ADD COLUMN IF NOT EXISTS stream_id text;
    END IF;
  END $$;
  ALTER TABLE class_subject_assignments ADD COLUMN IF NOT EXISTS source_assignment_id text;
  ALTER TABLE class_subject_assignments ADD COLUMN IF NOT EXISTS lessons_per_week integer DEFAULT 5;
  ALTER TABLE class_subject_assignments ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;
  ALTER TABLE teacher_subject_assignments ADD COLUMN IF NOT EXISTS source_assignment_id text;
  DROP INDEX IF EXISTS uq_teacher_subject_assignments_active_scope;
  CREATE UNIQUE INDEX IF NOT EXISTS ux_cohort_subject_active
    ON class_subject_assignments (tenant_id, cohort_placement_id, subject_id)
    WHERE status = 'active';
  CREATE UNIQUE INDEX IF NOT EXISTS ux_cohort_teacher_active
    ON teacher_subject_assignments (tenant_id, cohort_placement_id, subject_id, teacher_user_id)
    WHERE status = 'active';
  CREATE UNIQUE INDEX IF NOT EXISTS ux_cohort_subject_source
    ON class_subject_assignments (tenant_id, cohort_placement_id, source_assignment_id)
    WHERE cohort_placement_id IS NOT NULL AND source_assignment_id IS NOT NULL;
  CREATE UNIQUE INDEX IF NOT EXISTS ux_cohort_teacher_source
    ON teacher_subject_assignments (tenant_id, cohort_placement_id, source_assignment_id)
    WHERE cohort_placement_id IS NOT NULL AND source_assignment_id IS NOT NULL;

  CREATE OR REPLACE FUNCTION validate_cohort_configuration() RETURNS trigger AS $$
  DECLARE placement academic_cohort_placements%ROWTYPE;
  BEGIN
    IF NEW.cohort_placement_id IS NULL AND NEW.cohort_id IS NULL THEN RETURN NEW; END IF;
    PERFORM pg_advisory_xact_lock(hashtextextended('cohort-teaching:' || NEW.tenant_id, 0));
    SELECT * INTO placement FROM academic_cohort_placements
      WHERE tenant_id = NEW.tenant_id AND id = NEW.cohort_placement_id AND cohort_id = NEW.cohort_id;
    IF NOT FOUND OR placement.class_section_id IS DISTINCT FROM NEW.class_section_id::text
      OR placement.stream_id IS DISTINCT FROM NEW.stream_id::text OR NEW.academic_term_id IS NOT NULL THEN
      RAISE EXCEPTION 'Teaching configuration must match its cohort placement and have no term' USING ERRCODE = '23514';
    END IF;
    IF NEW.status = 'active' AND placement.status <> 'active' THEN
      RAISE EXCEPTION 'Completed cohort placement cannot receive active teaching configuration' USING ERRCODE = '23514';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM subjects subject WHERE subject.tenant_id = NEW.tenant_id
      AND subject.id::text = NEW.subject_id::text) THEN
      RAISE EXCEPTION 'Subject must belong to the cohort school' USING ERRCODE = '23503';
    END IF;
    IF TG_TABLE_NAME = 'teacher_subject_assignments' AND NEW.status = 'active' THEN
      IF NEW.effective_to IS NOT NULL AND NEW.effective_to < NEW.effective_from THEN
        RAISE EXCEPTION 'Teaching assignment end precedes its start' USING ERRCODE = '23514';
      END IF;
      IF EXISTS (SELECT 1 FROM teacher_subject_assignments existing
        WHERE existing.tenant_id = NEW.tenant_id AND existing.cohort_placement_id = NEW.cohort_placement_id
          AND existing.subject_id = NEW.subject_id AND existing.id::text <> NEW.id::text
          AND existing.status = 'active'
          AND ((existing.is_primary AND NEW.is_primary) OR existing.teacher_user_id = NEW.teacher_user_id)
          AND daterange(existing.effective_from, existing.effective_to, '[]') && daterange(NEW.effective_from, NEW.effective_to, '[]')) THEN
        RAISE EXCEPTION 'Overlapping teachers for cohort subject; end or replace the existing assignment' USING ERRCODE = '23P01';
      END IF;
    END IF;
    RETURN NEW;
  END $$ LANGUAGE plpgsql;
  DROP TRIGGER IF EXISTS trg_cohort_subject_configuration ON class_subject_assignments;
  CREATE TRIGGER trg_cohort_subject_configuration BEFORE INSERT OR UPDATE ON class_subject_assignments
    FOR EACH ROW EXECUTE FUNCTION validate_cohort_configuration();
  DROP TRIGGER IF EXISTS trg_cohort_teacher_configuration ON teacher_subject_assignments;
  CREATE TRIGGER trg_cohort_teacher_configuration BEFORE INSERT OR UPDATE ON teacher_subject_assignments
    FOR EACH ROW EXECUTE FUNCTION validate_cohort_configuration();
  ALTER TABLE academic_cohorts ENABLE ROW LEVEL SECURITY;
  ALTER TABLE academic_cohorts FORCE ROW LEVEL SECURITY;
  ALTER TABLE academic_cohort_placements ENABLE ROW LEVEL SECURITY;
  ALTER TABLE academic_cohort_placements FORCE ROW LEVEL SECURITY;
  ALTER TABLE academic_cohort_migrations ENABLE ROW LEVEL SECURITY;
  ALTER TABLE academic_cohort_migrations FORCE ROW LEVEL SECURITY;
  ALTER TABLE academic_cohort_migration_issues ENABLE ROW LEVEL SECURITY;
  ALTER TABLE academic_cohort_migration_issues FORCE ROW LEVEL SECURITY;
  ALTER TABLE academic_cohort_promotion_operations ENABLE ROW LEVEL SECURITY;
  ALTER TABLE academic_cohort_promotion_operations FORCE ROW LEVEL SECURITY;
  DO $$ DECLARE target_table text; BEGIN
    FOREACH target_table IN ARRAY ARRAY['academic_cohorts', 'academic_cohort_placements',
      'academic_cohort_migrations', 'academic_cohort_migration_issues', 'academic_cohort_promotion_operations'] LOOP
      EXECUTE format('DROP POLICY IF EXISTS cohort_tenant_policy ON %I', target_table);
      EXECUTE format('CREATE POLICY cohort_tenant_policy ON %I USING
        (tenant_id = current_setting(''app.tenant_id'', true) OR current_setting(''app.role'', true) = ''system'') WITH CHECK
        (tenant_id = current_setting(''app.tenant_id'', true) OR current_setting(''app.role'', true) = ''system'')', target_table);
    END LOOP;
  END $$;
`;
