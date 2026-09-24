// Additive migration, also used by the existing schema bootstrap. Academic snapshots
// and their audit records are deliberately not given a temporary retention policy.
// Time-based policy activation must change request identity even without a write.
export const REPORT_SCHOOL_REVISION_SQL = `SELECT concat(
  (SELECT COALESCE(sum(version),0)::text FROM report_source_versions WHERE tenant_id=$1), ':',
  (SELECT max(boundary)::text FROM exam_grading_policies policy
    CROSS JOIN LATERAL (VALUES(policy.effective_from),(policy.effective_to)) dates(boundary)
    WHERE policy.tenant_id=$1 AND policy.status='active' AND boundary<=now())) AS revision`;

export const REPORT_INFRASTRUCTURE_SCHEMA = `
CREATE TABLE IF NOT EXISTS report_source_versions (
  tenant_id text NOT NULL, scope_key text NOT NULL, version bigint NOT NULL DEFAULT 1,
  PRIMARY KEY (tenant_id, scope_key)
);
CREATE TABLE IF NOT EXISTS report_work (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id text NOT NULL,
  actor_user_id uuid NOT NULL, kind text NOT NULL, identity text NOT NULL,
  context jsonb NOT NULL, input jsonb NOT NULL, result jsonb, progress jsonb NOT NULL DEFAULT '{}',
  state text NOT NULL DEFAULT 'queued' CHECK (state IN ('queued','running','completed','failed')),
  attempts integer NOT NULL DEFAULT 0, dispatch_version integer NOT NULL DEFAULT 0,
  lease_token uuid, lease_until timestamptz, available_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT now() + interval '1 day',
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  error_code text, UNIQUE (tenant_id, actor_user_id, kind, identity)
);
CREATE INDEX IF NOT EXISTS ix_report_work_dispatch ON report_work(available_at, created_at)
  WHERE state IN ('queued','running');
CREATE INDEX IF NOT EXISTS ix_report_work_tenant_active ON report_work(tenant_id, state, lease_until)
  WHERE state IN ('queued','running');
CREATE INDEX IF NOT EXISTS ix_report_work_tenant_dispatch ON report_work(tenant_id,available_at,created_at,id)
  WHERE state IN ('queued','running');
CREATE INDEX IF NOT EXISTS ix_report_work_expiry ON report_work(expires_at);
CREATE INDEX IF NOT EXISTS ix_report_work_recent ON report_work(tenant_id,actor_user_id,created_at DESC);
CREATE INDEX IF NOT EXISTS ix_report_work_export_reuse ON report_work(tenant_id,identity,expires_at)
  WHERE kind='export' AND state='completed';
CREATE TABLE IF NOT EXISTS report_pdf_cache (
  tenant_id text NOT NULL, report_card_id uuid NOT NULL, identity text NOT NULL,
  storage_path text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, report_card_id, identity)
);
CREATE TABLE IF NOT EXISTS report_object_uploads (
  tenant_id text NOT NULL, storage_path text NOT NULL, expires_at timestamptz NOT NULL DEFAULT now()+interval '1 day',
  PRIMARY KEY(tenant_id,storage_path)
);
CREATE INDEX IF NOT EXISTS ix_report_pdf_cache_path ON report_pdf_cache(storage_path);
CREATE INDEX IF NOT EXISTS ix_report_object_uploads_expiry ON report_object_uploads(expires_at);
DO $$ DECLARE tbl text; BEGIN
  FOREACH tbl IN ARRAY ARRAY['report_source_versions','report_work','report_pdf_cache','report_object_uploads'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', tbl);
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname=current_schema() AND tablename=tbl AND policyname='report_tenant') THEN
      EXECUTE format('CREATE POLICY report_tenant ON %I USING (tenant_id = current_setting(''app.tenant_id'', true)) WITH CHECK (tenant_id = current_setting(''app.tenant_id'', true))', tbl);
    END IF;
  END LOOP;
END $$;
`;

// Revision counters make freshness a pair of indexed reads rather than reloading
// every mark, signature and grading rule on each download. Student changes are
// local; shared configuration changes conservatively invalidate the school.
export const REPORT_SOURCE_TRIGGERS = `
CREATE OR REPLACE FUNCTION myshule_report_source_changed() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE old_row jsonb; new_row jsonb; row_data jsonb; school text; scope text;
BEGIN
  IF TG_OP <> 'INSERT' THEN old_row := to_jsonb(OLD); END IF;
  IF TG_OP <> 'DELETE' THEN new_row := to_jsonb(NEW); END IF;
  IF TG_OP = 'UPDATE' THEN
    IF TG_TABLE_NAME = 'tenants' THEN
      IF (old_row->>'name',old_row->'settings'->>'address',old_row->'settings'->>'phone',old_row->'settings'->>'email',
          old_row->'settings'->>'logo_storage_path',old_row->'settings'->>'logo_url',old_row->'settings'->>'motto')
        IS NOT DISTINCT FROM (new_row->>'name',new_row->'settings'->>'address',new_row->'settings'->>'phone',new_row->'settings'->>'email',
          new_row->'settings'->>'logo_storage_path',new_row->'settings'->>'logo_url',new_row->'settings'->>'motto') THEN RETURN NEW; END IF;
    ELSIF TG_TABLE_NAME = 'student_report_cards' THEN
      IF (old_row->'metadata'->'class_teacher_comment') IS NOT DISTINCT FROM (new_row->'metadata'->'class_teacher_comment')
        AND (old_row->'metadata'->'principal_comment') IS NOT DISTINCT FROM (new_row->'metadata'->'principal_comment') THEN RETURN NEW; END IF;
    ELSIF TG_TABLE_NAME = 'exam_marks' THEN
      -- Publishing already locked results is a visibility transition, not new marks.
      IF (old_row - ARRAY['updated_at','status','published_at','updated_by_user_id']) = (new_row - ARRAY['updated_at','status','published_at','updated_by_user_id'])
        AND old_row->>'status' IN ('locked','published') AND new_row->>'status' IN ('locked','published') THEN RETURN NEW; END IF;
    ELSIF TG_TABLE_NAME = 'exam_series' THEN
      IF (old_row - ARRAY['updated_at','status','published_at','locked_at']) = (new_row - ARRAY['updated_at','status','published_at','locked_at']) THEN RETURN NEW; END IF;
    ELSIF (old_row - ARRAY['updated_at']) = (new_row - ARRAY['updated_at']) THEN RETURN NEW;
    END IF;
  END IF;
  FOR row_data IN SELECT DISTINCT value FROM jsonb_array_elements(jsonb_build_array(old_row,new_row)) WHERE value <> 'null'::jsonb LOOP
    school := row_data->>'tenant_id';
    IF school IS NULL THEN CONTINUE; END IF;
    IF TG_TABLE_NAME='file_objects' THEN
      IF NOT COALESCE(row_data->>'mime_type','') LIKE 'image/%' THEN CONTINUE; END IF;
      IF TG_OP='UPDATE' AND (old_row->>'sha256',old_row->>'storage_path',old_row->>'mime_type')
        IS NOT DISTINCT FROM (new_row->>'sha256',new_row->>'storage_path',new_row->>'mime_type') THEN CONTINUE; END IF;
      IF to_regclass('tenants') IS NULL OR to_regclass('exam_report_card_signatures') IS NULL THEN CONTINUE; END IF;
      IF NOT EXISTS(SELECT 1 FROM tenants WHERE tenant_id=school AND
        (settings->>'logo_storage_path'=row_data->>'storage_path' OR settings->>'logo_url'=row_data->>'storage_path'))
        AND NOT EXISTS(SELECT 1 FROM exam_report_card_signatures WHERE tenant_id=school AND storage_path=row_data->>'storage_path') THEN CONTINUE; END IF;
    END IF;
    scope := CASE WHEN TG_TABLE_NAME IN ('exam_result_snapshots','student_class_assignments') THEN 'school'
      WHEN TG_TABLE_NAME='students' THEN 'student:' || (row_data->>'id')
      WHEN row_data->>'student_id' IS NOT NULL THEN 'student:' || (row_data->>'student_id') ELSE 'school' END;
    INSERT INTO report_source_versions(tenant_id,scope_key,version) VALUES(school,scope,1)
      ON CONFLICT(tenant_id,scope_key) DO UPDATE SET version=report_source_versions.version+1;
  END LOOP;
  RETURN COALESCE(NEW,OLD);
END $$;

-- A global account can sign for multiple schools. Its identity changes must
-- invalidate every dependent school even when the initiating request has RLS
-- scope for just one. This trigger returns no data, accepts no arguments, and
-- can only increment counters derived from existing signature/appointment rows.
CREATE OR REPLACE FUNCTION myshule_report_signer_changed() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE old_row jsonb; new_row jsonb; school text;
BEGIN
  IF TG_TABLE_NAME<>'users' THEN RAISE EXCEPTION 'Signer trigger requires users'; END IF;
  IF TG_OP<>'INSERT' THEN old_row:=to_jsonb(OLD); END IF;
  IF TG_OP<>'DELETE' THEN new_row:=to_jsonb(NEW); END IF;
  IF TG_OP='UPDATE' AND (old_row->>'full_name',old_row->>'display_name',old_row->>'email',old_row->>'status')
    IS NOT DISTINCT FROM (new_row->>'full_name',new_row->>'display_name',new_row->>'email',new_row->>'status') THEN RETURN NEW; END IF;
  IF to_regclass('exam_report_card_signatures') IS NOT NULL AND to_regclass('academics_class_teachers') IS NOT NULL THEN
    FOR school IN SELECT tenant_id FROM exam_report_card_signatures WHERE signer_user_id::text=COALESCE(new_row,old_row)->>'id'
      UNION SELECT tenant_id FROM academics_class_teachers WHERE teacher_user_id::text=COALESCE(new_row,old_row)->>'id' ORDER BY tenant_id LOOP
      INSERT INTO report_source_versions(tenant_id,scope_key) VALUES(school,'school')
        ON CONFLICT(tenant_id,scope_key) DO UPDATE SET version=report_source_versions.version+1;
    END LOOP;
  END IF;
  RETURN COALESCE(NEW,OLD);
END $$;
REVOKE ALL ON FUNCTION myshule_report_signer_changed() FROM PUBLIC;
DO $$ DECLARE granted record; BEGIN
  -- Bootstrap default privileges may grant runtime EXECUTE to newly created
  -- functions. Trigger invocation needs no direct EXECUTE grant.
  FOR granted IN SELECT DISTINCT acl.grantee FROM pg_proc proc
    CROSS JOIN LATERAL aclexplode(proc.proacl) acl
    WHERE proc.oid=to_regprocedure('myshule_report_signer_changed()')
      AND acl.grantee<>proc.proowner AND acl.grantee<>0 LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION myshule_report_signer_changed() FROM %I',pg_get_userbyid(granted.grantee));
  END LOOP;
END $$;
DO $$ DECLARE tbl text; BEGIN
  -- Pin the definer's lookup path to the bootstrap schema; put temp objects last.
  EXECUTE format('ALTER FUNCTION myshule_report_signer_changed() SET search_path TO %I, pg_temp',current_schema());
  FOREACH tbl IN ARRAY ARRAY[
    'tenants','students','student_class_assignments','student_subject_enrollments','exam_marks',
    'exam_assessments','exam_assessment_components','exam_grading_policies','exam_grading_policy_boundaries',
    'exam_grade_boundaries','academics_grading_systems','academics_report_card_settings','exam_settings',
    'exam_report_card_signatures','academics_class_teachers','staff_profiles','report_card_comments',
    'attendance_records','exam_result_snapshots','academic_terms','academic_years','class_sections','class_streams',
    'subjects','exam_series','tenant_memberships','user_roles','roles','file_objects'
  ] LOOP
    IF to_regclass(tbl) IS NOT NULL THEN
      EXECUTE format('DROP TRIGGER IF EXISTS report_source_changed ON %I',tbl);
      EXECUTE format('CREATE TRIGGER report_source_changed AFTER INSERT OR UPDATE OR DELETE ON %I FOR EACH ROW EXECUTE FUNCTION myshule_report_source_changed()',tbl);
    END IF;
  END LOOP;
  IF to_regclass('users') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS report_source_changed ON users;
    CREATE TRIGGER report_source_changed AFTER INSERT OR UPDATE OR DELETE ON users
      FOR EACH ROW EXECUTE FUNCTION myshule_report_signer_changed();
  END IF;
  DROP TRIGGER IF EXISTS report_comments_changed ON student_report_cards;
  CREATE TRIGGER report_comments_changed AFTER UPDATE OF metadata ON student_report_cards
    FOR EACH ROW EXECUTE FUNCTION myshule_report_source_changed();
END $$;
`;
