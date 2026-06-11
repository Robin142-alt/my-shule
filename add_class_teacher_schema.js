const fs = require('fs');
const filePath = 'apps/api/src/modules/academics/academics-schema.service.ts';
let content = fs.readFileSync(filePath, 'utf8');

const tablesString = `
      CREATE TABLE IF NOT EXISTS report_card_comments (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        student_id uuid NOT NULL,
        academic_term_id uuid NOT NULL,
        class_section_id uuid NOT NULL,
        academic_comment text,
        behaviour_comment text,
        attendance_comment text,
        improvement_advice text,
        final_comment text NOT NULL,
        comment_status text NOT NULL DEFAULT 'draft',
        created_by_user_id uuid,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_report_card_comments_tenant_id_id UNIQUE (tenant_id, id)
      );

      CREATE TABLE IF NOT EXISTS student_notes (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        student_id uuid NOT NULL,
        note_type text NOT NULL,
        visibility text NOT NULL DEFAULT 'private',
        description text NOT NULL,
        follow_up_date date,
        created_by_user_id uuid,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_student_notes_tenant_id_id UNIQUE (tenant_id, id)
      );

      CREATE TABLE IF NOT EXISTS parent_meetings (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        student_id uuid NOT NULL,
        guardian_id uuid,
        reason text NOT NULL,
        meeting_type text NOT NULL,
        meeting_date date NOT NULL,
        start_time text NOT NULL,
        end_time text NOT NULL,
        location text,
        status text NOT NULL DEFAULT 'scheduled',
        notes text,
        created_by_user_id uuid,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_parent_meetings_tenant_id_id UNIQUE (tenant_id, id)
      );

      CREATE TABLE IF NOT EXISTS class_requests (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        student_id uuid,
        request_type text NOT NULL,
        description text NOT NULL,
        priority text NOT NULL DEFAULT 'medium',
        target_role text NOT NULL,
        status text NOT NULL DEFAULT 'submitted',
        created_by_user_id uuid,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_class_requests_tenant_id_id UNIQUE (tenant_id, id)
      );

      CREATE INDEX IF NOT EXISTS ix_report_card_comments_term ON report_card_comments (tenant_id, academic_term_id, class_section_id);`;

const indexesAndRlsTarget = `      ALTER TABLE academic_years ENABLE ROW LEVEL SECURITY;`;
const rlsString = `
      ALTER TABLE report_card_comments ENABLE ROW LEVEL SECURITY;
      ALTER TABLE report_card_comments FORCE ROW LEVEL SECURITY;
      ALTER TABLE student_notes ENABLE ROW LEVEL SECURITY;
      ALTER TABLE student_notes FORCE ROW LEVEL SECURITY;
      ALTER TABLE parent_meetings ENABLE ROW LEVEL SECURITY;
      ALTER TABLE parent_meetings FORCE ROW LEVEL SECURITY;
      ALTER TABLE class_requests ENABLE ROW LEVEL SECURITY;
      ALTER TABLE class_requests FORCE ROW LEVEL SECURITY;
      
      ALTER TABLE academic_years ENABLE ROW LEVEL SECURITY;`;

const policiesTarget = `      DROP POLICY IF EXISTS academic_tenant_policy ON academic_years;`;
const policiesString = `
      DROP POLICY IF EXISTS report_card_comments_rls_policy ON report_card_comments;
      CREATE POLICY report_card_comments_rls_policy ON report_card_comments
      FOR ALL USING (tenant_id = current_setting('app.tenant_id', true))
      WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

      DROP POLICY IF EXISTS student_notes_rls_policy ON student_notes;
      CREATE POLICY student_notes_rls_policy ON student_notes
      FOR ALL USING (tenant_id = current_setting('app.tenant_id', true))
      WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

      DROP POLICY IF EXISTS parent_meetings_rls_policy ON parent_meetings;
      CREATE POLICY parent_meetings_rls_policy ON parent_meetings
      FOR ALL USING (tenant_id = current_setting('app.tenant_id', true))
      WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

      DROP POLICY IF EXISTS class_requests_rls_policy ON class_requests;
      CREATE POLICY class_requests_rls_policy ON class_requests
      FOR ALL USING (tenant_id = current_setting('app.tenant_id', true))
      WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

      DROP POLICY IF EXISTS academic_tenant_policy ON academic_years;`;

if (!content.includes('CREATE TABLE IF NOT EXISTS report_card_comments')) {
  // Inject tables before the academic audit logs
  content = content.replace("      CREATE TABLE IF NOT EXISTS academic_audit_logs (", tablesString + "\n\n      CREATE TABLE IF NOT EXISTS academic_audit_logs (");
  content = content.replace(indexesAndRlsTarget, rlsString);
  content = content.replace(policiesTarget, policiesString);

  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Class teacher schemas updated in academics-schema.service.ts.');
} else {
  console.log('Class teacher schemas already exist.');
}
