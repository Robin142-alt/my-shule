import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

import { DatabaseService } from '../../database/database.service';

@Injectable()
export class ExamsSchemaService implements OnModuleInit {
  private readonly logger = new Logger(ExamsSchemaService.name);

  constructor(private readonly databaseService: DatabaseService) {}

  async onModuleInit(): Promise<void> {
    await this.databaseService.runSchemaBootstrap(`
      CREATE EXTENSION IF NOT EXISTS pgcrypto;

      CREATE TABLE IF NOT EXISTS exam_series (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        academic_term_id uuid NOT NULL,
        name text NOT NULL,
        starts_on date NOT NULL,
        ends_on date NOT NULL,
        status text NOT NULL DEFAULT 'draft',
        locked_at timestamptz,
        published_at timestamptz,
        created_by_user_id uuid,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_exam_series_tenant_id_id UNIQUE (tenant_id, id),
        CONSTRAINT uq_exam_series_term_name UNIQUE (tenant_id, academic_term_id, name),
        CONSTRAINT ck_exam_series_dates CHECK (ends_on >= starts_on),
        CONSTRAINT ck_exam_series_status CHECK (status IN ('draft', 'submitted', 'reviewed', 'locked', 'published'))
      );

      CREATE TABLE IF NOT EXISTS exam_assessments (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        exam_series_id uuid NOT NULL,
        subject_id uuid NOT NULL,
        name text NOT NULL,
        max_score numeric(8,2) NOT NULL DEFAULT 100,
        weight numeric(8,4) NOT NULL DEFAULT 1,
        created_by_user_id uuid,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_exam_assessments_tenant_id_id UNIQUE (tenant_id, id),
        CONSTRAINT uq_exam_assessments_scope UNIQUE (tenant_id, exam_series_id, subject_id, name),
        CONSTRAINT ck_exam_assessments_max_score CHECK (max_score > 0),
        CONSTRAINT ck_exam_assessments_weight CHECK (weight > 0)
      );

      CREATE TABLE IF NOT EXISTS exam_mark_entry_windows (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        exam_series_id uuid NOT NULL,
        subject_id uuid NOT NULL,
        class_section_id uuid NOT NULL,
        opens_at timestamptz NOT NULL,
        closes_at timestamptz NOT NULL,
        status text NOT NULL DEFAULT 'open',
        created_by_user_id uuid,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_exam_mark_entry_windows_tenant_id_id UNIQUE (tenant_id, id),
        CONSTRAINT uq_exam_mark_entry_windows_scope UNIQUE (tenant_id, exam_series_id, subject_id, class_section_id),
        CONSTRAINT ck_exam_mark_entry_windows_range CHECK (closes_at > opens_at),
        CONSTRAINT ck_exam_mark_entry_windows_status CHECK (status IN ('open', 'closed'))
      );

      CREATE TABLE IF NOT EXISTS exam_grade_boundaries (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        exam_series_id uuid NOT NULL,
        label text NOT NULL,
        min_score numeric(8,2) NOT NULL,
        max_score numeric(8,2) NOT NULL,
        remarks text,
        created_by_user_id uuid,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_exam_grade_boundaries_tenant_id_id UNIQUE (tenant_id, id),
        CONSTRAINT uq_exam_grade_boundaries_label UNIQUE (tenant_id, exam_series_id, label),
        CONSTRAINT ck_exam_grade_boundaries_range CHECK (max_score >= min_score)
      );

      CREATE TABLE IF NOT EXISTS exam_grading_policies (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        exam_series_id uuid,
        name text NOT NULL,
        reporting_mode text NOT NULL DEFAULT 'traditional',
        status text NOT NULL DEFAULT 'draft',
        created_by_user_id uuid,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_exam_grading_policies_tenant_id_id UNIQUE (tenant_id, id),
        CONSTRAINT ck_exam_grading_policies_mode CHECK (reporting_mode IN ('traditional', 'cbc_competency', 'hybrid')),
        CONSTRAINT ck_exam_grading_policies_status CHECK (status IN ('draft', 'active', 'retired'))
      );

      CREATE TABLE IF NOT EXISTS exam_grading_policy_boundaries (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        grading_policy_id uuid NOT NULL,
        label text NOT NULL,
        min_score numeric(8,2) NOT NULL,
        max_score numeric(8,2) NOT NULL,
        points numeric(8,2),
        descriptor text,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_exam_grading_policy_boundaries_tenant_id_id UNIQUE (tenant_id, id),
        CONSTRAINT ck_exam_grading_policy_boundaries_range CHECK (max_score >= min_score)
      );

      CREATE TABLE IF NOT EXISTS exam_subject_weightings (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        grading_policy_id uuid NOT NULL,
        subject_id uuid NOT NULL,
        weight numeric(8,4) NOT NULL DEFAULT 1,
        is_compulsory boolean NOT NULL DEFAULT TRUE,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_exam_subject_weightings_tenant_id_id UNIQUE (tenant_id, id),
        CONSTRAINT uq_exam_subject_weightings_scope UNIQUE (tenant_id, grading_policy_id, subject_id),
        CONSTRAINT ck_exam_subject_weightings_weight CHECK (weight > 0)
      );

      CREATE TABLE IF NOT EXISTS exam_competency_outcomes (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        grading_policy_id uuid NOT NULL,
        code text NOT NULL,
        label text NOT NULL,
        descriptor text NOT NULL,
        sort_order integer NOT NULL DEFAULT 0,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_exam_competency_outcomes_tenant_id_id UNIQUE (tenant_id, id),
        CONSTRAINT uq_exam_competency_outcomes_code UNIQUE (tenant_id, grading_policy_id, code)
      );

      CREATE TABLE IF NOT EXISTS exam_assessment_components (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        assessment_id uuid NOT NULL,
        component_code text NOT NULL,
        component_name text NOT NULL,
        max_score numeric(8,2) NOT NULL,
        weight numeric(8,4) NOT NULL DEFAULT 1,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_exam_assessment_components_tenant_id_id UNIQUE (tenant_id, id),
        CONSTRAINT uq_exam_assessment_components_scope UNIQUE (tenant_id, assessment_id, component_code),
        CONSTRAINT ck_exam_assessment_components_max_score CHECK (max_score > 0),
        CONSTRAINT ck_exam_assessment_components_weight CHECK (weight > 0)
      );

      CREATE TABLE IF NOT EXISTS exam_marks (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        exam_series_id uuid NOT NULL,
        assessment_id uuid NOT NULL,
        academic_term_id uuid NOT NULL,
        class_section_id uuid NOT NULL,
        subject_id uuid NOT NULL,
        student_id uuid NOT NULL,
        score numeric(8,2) NOT NULL,
        remarks text,
        status text NOT NULL DEFAULT 'draft',
        entered_by_user_id uuid NOT NULL,
        updated_by_user_id uuid,
        submitted_at timestamptz,
        reviewed_at timestamptz,
        locked_at timestamptz,
        published_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_exam_marks_tenant_id_id UNIQUE (tenant_id, id),
        CONSTRAINT uq_exam_marks_scope UNIQUE (tenant_id, assessment_id, student_id),
        CONSTRAINT ck_exam_marks_score CHECK (score >= 0),
        CONSTRAINT ck_exam_marks_status CHECK (status IN ('draft', 'submitted', 'reviewed', 'locked', 'published'))
      );

      CREATE TABLE IF NOT EXISTS exam_mark_versions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        mark_id uuid NOT NULL,
        original_score numeric(8,2) NOT NULL,
        correction_score numeric(8,2) NOT NULL,
        corrected_by_user_id uuid NOT NULL,
        reason text NOT NULL,
        approval_state text NOT NULL DEFAULT 'pending',
        first_approver_user_id uuid,
        second_approver_user_id uuid,
        metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_exam_mark_versions_tenant_id_id UNIQUE (tenant_id, id),
        CONSTRAINT ck_exam_mark_versions_approval_state CHECK (
          approval_state IN ('pending', 'approved', 'dual_approved', 'rejected')
        )
      );

      CREATE TABLE IF NOT EXISTS student_report_cards (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        exam_series_id uuid NOT NULL,
        student_id uuid NOT NULL,
        report_snapshot_id text NOT NULL,
        status text NOT NULL DEFAULT 'draft_requested',
        verification_code text,
        published_by_user_id uuid,
        published_at timestamptz,
        metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_student_report_cards_tenant_id_id UNIQUE (tenant_id, id),
        CONSTRAINT uq_student_report_cards_series_student UNIQUE (tenant_id, exam_series_id, student_id),
        CONSTRAINT ck_student_report_cards_status CHECK (
          status IN (
            'draft_requested',
            'draft_generated',
            'under_review',
            'approved',
            'published',
            'withdrawn',
            'regeneration_required',
            'draft'
          )
        )
      );

      CREATE TABLE IF NOT EXISTS report_card_generation_batches (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        exam_series_id uuid NOT NULL,
        class_section_id uuid,
        stream_name text,
        status text NOT NULL DEFAULT 'draft_requested',
        total_students integer NOT NULL DEFAULT 0,
        completed_students integer NOT NULL DEFAULT 0,
        failed_students integer NOT NULL DEFAULT 0,
        requested_by_user_id uuid NOT NULL,
        started_at timestamptz,
        completed_at timestamptz,
        metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_report_card_generation_batches_tenant_id_id UNIQUE (tenant_id, id),
        CONSTRAINT ck_report_card_generation_batches_status CHECK (
          status IN ('draft_requested', 'draft_generated', 'under_review', 'approved', 'published', 'failed')
        ),
        CONSTRAINT ck_report_card_generation_batches_counts CHECK (
          total_students >= 0 AND completed_students >= 0 AND failed_students >= 0
        )
      );

      CREATE TABLE IF NOT EXISTS report_card_artifacts (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        report_card_id uuid NOT NULL,
        artifact_type text NOT NULL,
        storage_key text NOT NULL,
        checksum_sha256 char(64) NOT NULL,
        byte_size bigint NOT NULL,
        verification_code text NOT NULL,
        generated_by_user_id uuid,
        generated_at timestamptz NOT NULL DEFAULT NOW(),
        metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
        CONSTRAINT uq_report_card_artifacts_tenant_id_id UNIQUE (tenant_id, id),
        CONSTRAINT ck_report_card_artifacts_type CHECK (artifact_type IN ('html', 'pdf')),
        CONSTRAINT ck_report_card_artifacts_checksum CHECK (checksum_sha256 ~ '^[a-f0-9]{64}$'),
        CONSTRAINT ck_report_card_artifacts_size CHECK (byte_size > 0)
      );

      ALTER TABLE student_report_cards
      ADD COLUMN IF NOT EXISTS verification_code text;
      ALTER TABLE student_report_cards
      ALTER COLUMN status SET DEFAULT 'draft_requested';
      ALTER TABLE student_report_cards
      ALTER COLUMN published_at DROP NOT NULL;
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'ck_student_report_cards_status'
        ) THEN
          ALTER TABLE student_report_cards DROP CONSTRAINT ck_student_report_cards_status;
        END IF;

        ALTER TABLE student_report_cards
        ADD CONSTRAINT ck_student_report_cards_status CHECK (
          status IN (
            'draft_requested',
            'draft_generated',
            'under_review',
            'approved',
            'published',
            'withdrawn',
            'regeneration_required',
            'draft'
          )
        );
      END;
      $$;

      CREATE TABLE IF NOT EXISTS student_report_card_audit_logs (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        report_card_id uuid,
        exam_series_id uuid,
        student_id uuid,
        action text NOT NULL,
        actor_user_id uuid,
        metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
        created_at timestamptz NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS exam_mark_audit_logs (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        mark_id uuid,
        exam_series_id uuid,
        assessment_id uuid,
        student_id uuid,
        action text NOT NULL,
        actor_user_id uuid,
        previous_score numeric(8,2),
        new_score numeric(8,2),
        reason text,
        metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
        created_at timestamptz NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS ix_exam_marks_subject_scope
        ON exam_marks (tenant_id, exam_series_id, academic_term_id, class_section_id, subject_id);
      CREATE INDEX IF NOT EXISTS ix_exam_marks_student
        ON exam_marks (tenant_id, student_id, exam_series_id);
      CREATE INDEX IF NOT EXISTS ix_student_report_cards_student
        ON student_report_cards (tenant_id, student_id, published_at DESC);
      CREATE INDEX IF NOT EXISTS ix_exam_mark_audit_logs_mark
        ON exam_mark_audit_logs (tenant_id, mark_id, created_at DESC);
      CREATE INDEX IF NOT EXISTS ix_exam_mark_versions_mark
        ON exam_mark_versions (tenant_id, mark_id, created_at DESC);
      CREATE INDEX IF NOT EXISTS ix_report_card_generation_batches_status
        ON report_card_generation_batches (tenant_id, status, created_at DESC);
      CREATE INDEX IF NOT EXISTS ix_report_card_artifacts_report_card
        ON report_card_artifacts (tenant_id, report_card_id, generated_at DESC);
      DROP INDEX IF EXISTS ux_report_card_artifacts_verification_code;
      CREATE UNIQUE INDEX IF NOT EXISTS ux_report_card_artifacts_verification_code_type
        ON report_card_artifacts (tenant_id, verification_code, artifact_type);

      ALTER TABLE exam_series ENABLE ROW LEVEL SECURITY;
      ALTER TABLE exam_series FORCE ROW LEVEL SECURITY;
      ALTER TABLE exam_assessments ENABLE ROW LEVEL SECURITY;
      ALTER TABLE exam_assessments FORCE ROW LEVEL SECURITY;
      ALTER TABLE exam_mark_entry_windows ENABLE ROW LEVEL SECURITY;
      ALTER TABLE exam_mark_entry_windows FORCE ROW LEVEL SECURITY;
      ALTER TABLE exam_grade_boundaries ENABLE ROW LEVEL SECURITY;
      ALTER TABLE exam_grade_boundaries FORCE ROW LEVEL SECURITY;
      ALTER TABLE exam_grading_policies ENABLE ROW LEVEL SECURITY;
      ALTER TABLE exam_grading_policies FORCE ROW LEVEL SECURITY;
      ALTER TABLE exam_grading_policy_boundaries ENABLE ROW LEVEL SECURITY;
      ALTER TABLE exam_grading_policy_boundaries FORCE ROW LEVEL SECURITY;
      ALTER TABLE exam_subject_weightings ENABLE ROW LEVEL SECURITY;
      ALTER TABLE exam_subject_weightings FORCE ROW LEVEL SECURITY;
      ALTER TABLE exam_competency_outcomes ENABLE ROW LEVEL SECURITY;
      ALTER TABLE exam_competency_outcomes FORCE ROW LEVEL SECURITY;
      ALTER TABLE exam_assessment_components ENABLE ROW LEVEL SECURITY;
      ALTER TABLE exam_assessment_components FORCE ROW LEVEL SECURITY;
      ALTER TABLE exam_marks ENABLE ROW LEVEL SECURITY;
      ALTER TABLE exam_marks FORCE ROW LEVEL SECURITY;
      ALTER TABLE exam_mark_versions ENABLE ROW LEVEL SECURITY;
      ALTER TABLE exam_mark_versions FORCE ROW LEVEL SECURITY;
      ALTER TABLE student_report_cards ENABLE ROW LEVEL SECURITY;
      ALTER TABLE student_report_cards FORCE ROW LEVEL SECURITY;
      ALTER TABLE report_card_generation_batches ENABLE ROW LEVEL SECURITY;
      ALTER TABLE report_card_generation_batches FORCE ROW LEVEL SECURITY;
      ALTER TABLE report_card_artifacts ENABLE ROW LEVEL SECURITY;
      ALTER TABLE report_card_artifacts FORCE ROW LEVEL SECURITY;
      ALTER TABLE student_report_card_audit_logs ENABLE ROW LEVEL SECURITY;
      ALTER TABLE student_report_card_audit_logs FORCE ROW LEVEL SECURITY;
      ALTER TABLE exam_mark_audit_logs ENABLE ROW LEVEL SECURITY;
      ALTER TABLE exam_mark_audit_logs FORCE ROW LEVEL SECURITY;

      DROP POLICY IF EXISTS exam_series_tenant_policy ON exam_series;
      CREATE POLICY exam_series_tenant_policy ON exam_series
      FOR ALL USING (tenant_id = current_setting('app.tenant_id', true))
      WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

      DROP POLICY IF EXISTS exam_assessments_tenant_policy ON exam_assessments;
      CREATE POLICY exam_assessments_tenant_policy ON exam_assessments
      FOR ALL USING (tenant_id = current_setting('app.tenant_id', true))
      WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

      DROP POLICY IF EXISTS exam_mark_windows_tenant_policy ON exam_mark_entry_windows;
      CREATE POLICY exam_mark_windows_tenant_policy ON exam_mark_entry_windows
      FOR ALL USING (tenant_id = current_setting('app.tenant_id', true))
      WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

      DROP POLICY IF EXISTS exam_grade_boundaries_tenant_policy ON exam_grade_boundaries;
      CREATE POLICY exam_grade_boundaries_tenant_policy ON exam_grade_boundaries
      FOR ALL USING (tenant_id = current_setting('app.tenant_id', true))
      WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

      DROP POLICY IF EXISTS exam_grading_policies_tenant_policy ON exam_grading_policies;
      CREATE POLICY exam_grading_policies_tenant_policy ON exam_grading_policies
      FOR ALL USING (tenant_id = current_setting('app.tenant_id', true))
      WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

      DROP POLICY IF EXISTS exam_grading_policy_boundaries_tenant_policy ON exam_grading_policy_boundaries;
      CREATE POLICY exam_grading_policy_boundaries_tenant_policy ON exam_grading_policy_boundaries
      FOR ALL USING (tenant_id = current_setting('app.tenant_id', true))
      WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

      DROP POLICY IF EXISTS exam_subject_weightings_tenant_policy ON exam_subject_weightings;
      CREATE POLICY exam_subject_weightings_tenant_policy ON exam_subject_weightings
      FOR ALL USING (tenant_id = current_setting('app.tenant_id', true))
      WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

      DROP POLICY IF EXISTS exam_competency_outcomes_tenant_policy ON exam_competency_outcomes;
      CREATE POLICY exam_competency_outcomes_tenant_policy ON exam_competency_outcomes
      FOR ALL USING (tenant_id = current_setting('app.tenant_id', true))
      WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

      DROP POLICY IF EXISTS exam_assessment_components_tenant_policy ON exam_assessment_components;
      CREATE POLICY exam_assessment_components_tenant_policy ON exam_assessment_components
      FOR ALL USING (tenant_id = current_setting('app.tenant_id', true))
      WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

      DROP POLICY IF EXISTS exam_marks_tenant_policy ON exam_marks;
      CREATE POLICY exam_marks_tenant_policy ON exam_marks
      FOR ALL USING (tenant_id = current_setting('app.tenant_id', true))
      WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

      DROP POLICY IF EXISTS exam_mark_versions_tenant_policy ON exam_mark_versions;
      CREATE POLICY exam_mark_versions_tenant_policy ON exam_mark_versions
      FOR ALL USING (tenant_id = current_setting('app.tenant_id', true))
      WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

      DROP POLICY IF EXISTS student_report_cards_tenant_policy ON student_report_cards;
      CREATE POLICY student_report_cards_tenant_policy ON student_report_cards
      FOR ALL USING (tenant_id = current_setting('app.tenant_id', true))
      WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

      DROP POLICY IF EXISTS report_card_generation_batches_tenant_policy ON report_card_generation_batches;
      CREATE POLICY report_card_generation_batches_tenant_policy ON report_card_generation_batches
      FOR ALL USING (tenant_id = current_setting('app.tenant_id', true))
      WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

      DROP POLICY IF EXISTS report_card_artifacts_tenant_policy ON report_card_artifacts;
      CREATE POLICY report_card_artifacts_tenant_policy ON report_card_artifacts
      FOR ALL USING (tenant_id = current_setting('app.tenant_id', true))
      WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

      DROP POLICY IF EXISTS student_report_card_audit_logs_tenant_policy ON student_report_card_audit_logs;
      CREATE POLICY student_report_card_audit_logs_tenant_policy ON student_report_card_audit_logs
      FOR ALL USING (tenant_id = current_setting('app.tenant_id', true))
      WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

      DROP POLICY IF EXISTS exam_mark_audit_logs_tenant_policy ON exam_mark_audit_logs;
      CREATE POLICY exam_mark_audit_logs_tenant_policy ON exam_mark_audit_logs
      FOR ALL USING (tenant_id = current_setting('app.tenant_id', true))
      WITH CHECK (tenant_id = current_setting('app.tenant_id', true));
    `);

    this.logger.log('Exams schema and RLS policies verified');
  }
}
