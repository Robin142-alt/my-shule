import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

import { DatabaseService } from '../../database/database.service';

@Injectable()
export class AcademicsSchemaService implements OnModuleInit {
  private readonly logger = new Logger(AcademicsSchemaService.name);

  constructor(private readonly databaseService: DatabaseService) {}

  async onModuleInit(): Promise<void> {
    await this.databaseService.runSchemaBootstrap(`
      CREATE EXTENSION IF NOT EXISTS pgcrypto;

      CREATE TABLE IF NOT EXISTS academic_years (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        name text NOT NULL,
        starts_on date NOT NULL,
        ends_on date NOT NULL,
        status text NOT NULL DEFAULT 'draft',
        created_by_user_id uuid,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_academic_years_tenant_id_id UNIQUE (tenant_id, id),
        CONSTRAINT uq_academic_years_tenant_name UNIQUE (tenant_id, name),
        CONSTRAINT ck_academic_years_range CHECK (ends_on >= starts_on),
        CONSTRAINT ck_academic_years_status CHECK (status IN ('draft', 'active', 'closed'))
      );

      CREATE TABLE IF NOT EXISTS academic_terms (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        academic_year_id uuid NOT NULL,
        name text NOT NULL,
        starts_on date NOT NULL,
        ends_on date NOT NULL,
        status text NOT NULL DEFAULT 'draft',
        created_by_user_id uuid,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_academic_terms_tenant_id_id UNIQUE (tenant_id, id),
        CONSTRAINT uq_academic_terms_year_name UNIQUE (tenant_id, academic_year_id, name),
        CONSTRAINT fk_academic_terms_year
          FOREIGN KEY (tenant_id, academic_year_id)
          REFERENCES academic_years (tenant_id, id)
          ON DELETE CASCADE,
        CONSTRAINT ck_academic_terms_range CHECK (ends_on >= starts_on),
        CONSTRAINT ck_academic_terms_status CHECK (status IN ('draft', 'active', 'closed'))
      );

      CREATE TABLE IF NOT EXISTS academic_levels (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        system_type text NOT NULL,
        name text NOT NULL,
        order_index integer NOT NULL,
        is_active boolean NOT NULL DEFAULT true,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        audit_log_reference uuid,
        CONSTRAINT uq_academic_levels_tenant_id_id UNIQUE (tenant_id, id),
        CONSTRAINT uq_academic_levels_order UNIQUE (tenant_id, order_index),
        CONSTRAINT ck_academic_levels_system CHECK (system_type IN ('CBC', 'CBE', '8-4-4', 'International', 'Custom'))
      );

      CREATE TABLE IF NOT EXISTS class_sections (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        academic_year_id uuid NOT NULL,
        academic_level_id uuid,
        name text NOT NULL,
        grade_level text NOT NULL,
        stream text,
        custom_label text,
        capacity integer,
        is_active boolean NOT NULL DEFAULT true,
        status text NOT NULL DEFAULT 'active',
        created_by_user_id uuid,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_class_sections_tenant_id_id UNIQUE (tenant_id, id),
        CONSTRAINT uq_class_sections_scope UNIQUE (tenant_id, academic_year_id, name),
        CONSTRAINT fk_class_sections_year
          FOREIGN KEY (tenant_id, academic_year_id)
          REFERENCES academic_years (tenant_id, id)
          ON DELETE CASCADE
      );

      ALTER TABLE class_sections ADD COLUMN IF NOT EXISTS academic_level_id uuid;
      ALTER TABLE class_sections ADD COLUMN IF NOT EXISTS custom_label text;
      ALTER TABLE class_sections ADD COLUMN IF NOT EXISTS capacity integer;
      ALTER TABLE class_sections ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'fk_class_sections_academic_level'
        ) THEN
          ALTER TABLE class_sections
            ADD CONSTRAINT fk_class_sections_academic_level
            FOREIGN KEY (tenant_id, academic_level_id)
            REFERENCES academic_levels (tenant_id, id);
        END IF;
      END $$;

      CREATE TABLE IF NOT EXISTS class_streams (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        class_section_id uuid NOT NULL,
        name text NOT NULL,
        capacity integer,
        class_teacher_id uuid,
        is_active boolean NOT NULL DEFAULT true,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        audit_log_reference uuid,
        CONSTRAINT uq_class_streams_tenant_id_id UNIQUE (tenant_id, id),
        CONSTRAINT uq_class_streams_scope UNIQUE (tenant_id, class_section_id, name),
        CONSTRAINT fk_class_streams_class
          FOREIGN KEY (tenant_id, class_section_id)
          REFERENCES class_sections (tenant_id, id)
      );

      CREATE TABLE IF NOT EXISTS student_class_assignments (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        student_id uuid NOT NULL,
        class_section_id uuid NOT NULL,
        stream_id uuid,
        academic_level_id uuid NOT NULL,
        academic_year_id uuid NOT NULL,
        status text NOT NULL DEFAULT 'active',
        assigned_by_user_id uuid,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        audit_log_reference uuid,
        CONSTRAINT uq_student_class_assignments_tenant_id_id UNIQUE (tenant_id, id),
        CONSTRAINT fk_student_class_assignments_class
          FOREIGN KEY (tenant_id, class_section_id)
          REFERENCES class_sections (tenant_id, id),
        CONSTRAINT fk_student_class_assignments_stream
          FOREIGN KEY (tenant_id, stream_id)
          REFERENCES class_streams (tenant_id, id),
        CONSTRAINT fk_student_class_assignments_level
          FOREIGN KEY (tenant_id, academic_level_id)
          REFERENCES academic_levels (tenant_id, id),
        CONSTRAINT fk_student_class_assignments_year
          FOREIGN KEY (tenant_id, academic_year_id)
          REFERENCES academic_years (tenant_id, id),
        CONSTRAINT ck_student_class_assignment_status CHECK (status IN ('active', 'transferred', 'completed', 'withdrawn'))
      );

      CREATE UNIQUE INDEX IF NOT EXISTS ux_student_class_assignments_active_year
        ON student_class_assignments (tenant_id, student_id, academic_year_id)
        WHERE status = 'active';

      CREATE TABLE IF NOT EXISTS subjects (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        code text NOT NULL,
        name text NOT NULL,
        status text NOT NULL DEFAULT 'active',
        created_by_user_id uuid,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_subjects_tenant_id_id UNIQUE (tenant_id, id),
        CONSTRAINT uq_subjects_tenant_code UNIQUE (tenant_id, code)
      );

      CREATE TABLE IF NOT EXISTS class_subject_assignments (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        academic_term_id uuid NOT NULL,
        class_section_id uuid NOT NULL,
        subject_id uuid NOT NULL,
        created_by_user_id uuid,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_class_subject_assignments_tenant_id_id UNIQUE (tenant_id, id),
        CONSTRAINT uq_class_subject_assignments_scope UNIQUE (tenant_id, academic_term_id, class_section_id, subject_id)
      );

      CREATE TABLE IF NOT EXISTS teacher_subject_assignments (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        academic_term_id uuid NOT NULL,
        class_section_id uuid NOT NULL,
        subject_id uuid NOT NULL,
        teacher_user_id uuid NOT NULL,
        status text NOT NULL DEFAULT 'active',
        created_by_user_id uuid,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_teacher_subject_assignments_tenant_id_id UNIQUE (tenant_id, id),
        CONSTRAINT uq_teacher_subject_assignments_scope UNIQUE (
          tenant_id,
          academic_term_id,
          class_section_id,
          subject_id,
          teacher_user_id
        ),
        CONSTRAINT ck_teacher_subject_assignments_status CHECK (status IN ('active', 'inactive'))
      );


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

      CREATE INDEX IF NOT EXISTS ix_report_card_comments_term ON report_card_comments (tenant_id, academic_term_id, class_section_id);

      CREATE TABLE IF NOT EXISTS academic_audit_logs (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        entity_type text NOT NULL,
        entity_id uuid,
        action text NOT NULL,
        actor_user_id uuid,
        metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
        created_at timestamptz NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS academics_grading_systems (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        name text NOT NULL,
        description text,
        is_active boolean NOT NULL DEFAULT TRUE,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_academics_grading_systems_tenant_name UNIQUE (tenant_id, name)
      );

      CREATE TABLE IF NOT EXISTS academics_attendance_settings (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        name text NOT NULL,
        description text,
        is_active boolean NOT NULL DEFAULT TRUE,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_academics_attendance_settings_tenant_name UNIQUE (tenant_id, name)
      );

      CREATE INDEX IF NOT EXISTS ix_academic_terms_year
        ON academic_terms (tenant_id, academic_year_id, starts_on);
      CREATE INDEX IF NOT EXISTS ix_class_sections_year
        ON class_sections (tenant_id, academic_year_id, grade_level, name);
      CREATE INDEX IF NOT EXISTS ix_academic_levels_tenant_order
        ON academic_levels (tenant_id, order_index);
      CREATE INDEX IF NOT EXISTS ix_class_streams_class
        ON class_streams (tenant_id, class_section_id, name);
      CREATE INDEX IF NOT EXISTS ix_student_class_assignments_student_year
        ON student_class_assignments (tenant_id, student_id, academic_year_id, status);
      CREATE INDEX IF NOT EXISTS ix_teacher_subject_assignments_teacher
        ON teacher_subject_assignments (tenant_id, teacher_user_id, academic_term_id);

      ALTER TABLE subjects ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';


      ALTER TABLE report_card_comments ENABLE ROW LEVEL SECURITY;
      ALTER TABLE report_card_comments FORCE ROW LEVEL SECURITY;
      ALTER TABLE student_notes ENABLE ROW LEVEL SECURITY;
      ALTER TABLE student_notes FORCE ROW LEVEL SECURITY;
      ALTER TABLE parent_meetings ENABLE ROW LEVEL SECURITY;
      ALTER TABLE parent_meetings FORCE ROW LEVEL SECURITY;
      ALTER TABLE class_requests ENABLE ROW LEVEL SECURITY;
      ALTER TABLE class_requests FORCE ROW LEVEL SECURITY;
      
      ALTER TABLE academic_years ENABLE ROW LEVEL SECURITY;
      ALTER TABLE academic_years FORCE ROW LEVEL SECURITY;
      ALTER TABLE academic_terms ENABLE ROW LEVEL SECURITY;
      ALTER TABLE academic_terms FORCE ROW LEVEL SECURITY;
      ALTER TABLE academic_levels ENABLE ROW LEVEL SECURITY;
      ALTER TABLE academic_levels FORCE ROW LEVEL SECURITY;
      ALTER TABLE class_sections ENABLE ROW LEVEL SECURITY;
      ALTER TABLE class_sections FORCE ROW LEVEL SECURITY;
      ALTER TABLE class_streams ENABLE ROW LEVEL SECURITY;
      ALTER TABLE class_streams FORCE ROW LEVEL SECURITY;
      ALTER TABLE student_class_assignments ENABLE ROW LEVEL SECURITY;
      ALTER TABLE student_class_assignments FORCE ROW LEVEL SECURITY;
      ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
      ALTER TABLE subjects FORCE ROW LEVEL SECURITY;
      ALTER TABLE class_subject_assignments ENABLE ROW LEVEL SECURITY;
      ALTER TABLE class_subject_assignments FORCE ROW LEVEL SECURITY;
      ALTER TABLE teacher_subject_assignments ENABLE ROW LEVEL SECURITY;
      ALTER TABLE teacher_subject_assignments FORCE ROW LEVEL SECURITY;
      ALTER TABLE academic_audit_logs ENABLE ROW LEVEL SECURITY;
      ALTER TABLE academic_audit_logs FORCE ROW LEVEL SECURITY;

      ALTER TABLE academics_grading_systems ENABLE ROW LEVEL SECURITY;
      ALTER TABLE academics_grading_systems FORCE ROW LEVEL SECURITY;

      ALTER TABLE academics_attendance_settings ENABLE ROW LEVEL SECURITY;
      ALTER TABLE academics_attendance_settings FORCE ROW LEVEL SECURITY;

      DROP POLICY IF EXISTS academics_grading_systems_rls_policy ON academics_grading_systems;
      CREATE POLICY academics_grading_systems_rls_policy ON academics_grading_systems
      FOR ALL USING (tenant_id = current_setting('app.tenant_id', true))
      WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

      DROP POLICY IF EXISTS academics_attendance_settings_rls_policy ON academics_attendance_settings;
      CREATE POLICY academics_attendance_settings_rls_policy ON academics_attendance_settings
      FOR ALL USING (tenant_id = current_setting('app.tenant_id', true))
      WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

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

      DROP POLICY IF EXISTS academic_tenant_policy ON academic_years;
      CREATE POLICY academic_tenant_policy ON academic_years
      FOR ALL USING (
        tenant_id = current_setting('app.tenant_id', true)
        OR NULLIF(current_setting('app.role', true), '') = 'system'
      )
      WITH CHECK (
        tenant_id = current_setting('app.tenant_id', true)
        OR NULLIF(current_setting('app.role', true), '') = 'system'
      );

      DROP POLICY IF EXISTS academic_terms_tenant_policy ON academic_terms;
      CREATE POLICY academic_terms_tenant_policy ON academic_terms
      FOR ALL USING (
        tenant_id = current_setting('app.tenant_id', true)
        OR NULLIF(current_setting('app.role', true), '') = 'system'
      )
      WITH CHECK (
        tenant_id = current_setting('app.tenant_id', true)
        OR NULLIF(current_setting('app.role', true), '') = 'system'
      );

      DROP POLICY IF EXISTS academic_levels_tenant_policy ON academic_levels;
      CREATE POLICY academic_levels_tenant_policy ON academic_levels
      FOR ALL USING (
        tenant_id = current_setting('app.tenant_id', true)
        OR NULLIF(current_setting('app.role', true), '') = 'system'
      )
      WITH CHECK (
        tenant_id = current_setting('app.tenant_id', true)
        OR NULLIF(current_setting('app.role', true), '') = 'system'
      );

      DROP POLICY IF EXISTS class_sections_tenant_policy ON class_sections;
      CREATE POLICY class_sections_tenant_policy ON class_sections
      FOR ALL USING (
        tenant_id = current_setting('app.tenant_id', true)
        OR NULLIF(current_setting('app.role', true), '') = 'system'
      )
      WITH CHECK (
        tenant_id = current_setting('app.tenant_id', true)
        OR NULLIF(current_setting('app.role', true), '') = 'system'
      );

      DROP POLICY IF EXISTS class_streams_tenant_policy ON class_streams;
      CREATE POLICY class_streams_tenant_policy ON class_streams
      FOR ALL USING (
        tenant_id = current_setting('app.tenant_id', true)
        OR NULLIF(current_setting('app.role', true), '') = 'system'
      )
      WITH CHECK (
        tenant_id = current_setting('app.tenant_id', true)
        OR NULLIF(current_setting('app.role', true), '') = 'system'
      );

      DROP POLICY IF EXISTS student_class_assignments_tenant_policy ON student_class_assignments;
      CREATE POLICY student_class_assignments_tenant_policy ON student_class_assignments
      FOR ALL USING (
        tenant_id = current_setting('app.tenant_id', true)
        OR NULLIF(current_setting('app.role', true), '') = 'system'
      )
      WITH CHECK (
        tenant_id = current_setting('app.tenant_id', true)
        OR NULLIF(current_setting('app.role', true), '') = 'system'
      );

      DROP POLICY IF EXISTS subjects_tenant_policy ON subjects;
      CREATE POLICY subjects_tenant_policy ON subjects
      FOR ALL USING (
        tenant_id = current_setting('app.tenant_id', true)
        OR NULLIF(current_setting('app.role', true), '') = 'system'
      )
      WITH CHECK (
        tenant_id = current_setting('app.tenant_id', true)
        OR NULLIF(current_setting('app.role', true), '') = 'system'
      );

      DROP POLICY IF EXISTS class_subject_assignments_tenant_policy ON class_subject_assignments;
      CREATE POLICY class_subject_assignments_tenant_policy ON class_subject_assignments
      FOR ALL USING (
        tenant_id = current_setting('app.tenant_id', true)
        OR NULLIF(current_setting('app.role', true), '') = 'system'
      )
      WITH CHECK (
        tenant_id = current_setting('app.tenant_id', true)
        OR NULLIF(current_setting('app.role', true), '') = 'system'
      );

      DROP POLICY IF EXISTS teacher_subject_assignments_tenant_policy ON teacher_subject_assignments;
      CREATE POLICY teacher_subject_assignments_tenant_policy ON teacher_subject_assignments
      FOR ALL USING (
        tenant_id = current_setting('app.tenant_id', true)
        OR NULLIF(current_setting('app.role', true), '') = 'system'
      )
      WITH CHECK (
        tenant_id = current_setting('app.tenant_id', true)
        OR NULLIF(current_setting('app.role', true), '') = 'system'
      );

      DROP POLICY IF EXISTS academic_audit_logs_tenant_policy ON academic_audit_logs;
      CREATE POLICY academic_audit_logs_tenant_policy ON academic_audit_logs
      FOR ALL USING (
        tenant_id = current_setting('app.tenant_id', true)
        OR NULLIF(current_setting('app.role', true), '') = 'system'
      )
      WITH CHECK (
        tenant_id = current_setting('app.tenant_id', true)
        OR NULLIF(current_setting('app.role', true), '') = 'system'
      );
    `);

    this.logger.log('Academics schema and RLS policies verified');
  }
}
