import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class ExamsSchemaService implements OnModuleInit {

  private async executeSql<T = any>(query: string, params: any[] = []): Promise<{ rows: T[], rowCount: number }> {
    const firstParam = params[0];
    const isUuid = typeof firstParam === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(firstParam);

    if ((this.prisma as any).query) {
      return (this.prisma as any).query(query, params);
    }

    
    if (isUuid) {
      return this.prisma.executeWithTenant(firstParam, null, async (tx: any) => {
        const result = await tx.$queryRawUnsafe(query, ...params);
        const arr = Array.isArray(result) ? result : [result];
        return { rows: arr, rowCount: arr.length };
      });
    } else {
      const result = await this.prisma.$queryRawUnsafe(query, ...params);
      const arr = Array.isArray(result) ? result : [result];
        return { rows: arr, rowCount: arr.length };
    }
  }

  private readonly logger = new Logger(ExamsSchemaService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit(): Promise<void> {
    await this.prisma.runSchemaBootstrap(`
      CREATE EXTENSION IF NOT EXISTS pgcrypto;

      CREATE TABLE IF NOT EXISTS exam_series (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        academic_term_id uuid NOT NULL,
        name text NOT NULL,
        starts_on date NOT NULL,
        ends_on date NOT NULL,
        status text NOT NULL DEFAULT 'draft',
        grading_system_id uuid,
        locked_at timestamptz,
        published_at timestamptz,
        created_by_user_id uuid,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_exam_series_tenant_id_id UNIQUE (tenant_id, id),
        CONSTRAINT uq_exam_series_term_name UNIQUE (tenant_id, academic_term_id, name),
        CONSTRAINT ck_exam_series_dates CHECK (ends_on >= starts_on),
        CONSTRAINT ck_exam_series_status CHECK (status IN ('draft', 'submitted', 'reviewed', 'locked', 'published', 'archived'))
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
        last_action text,
        last_action_at timestamptz,
        last_action_by_user_id uuid,
        return_reason text,
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
        version integer NOT NULL DEFAULT 1,
        effective_from timestamptz,
        effective_to timestamptz,
        supersedes_policy_id uuid,
        validated_at timestamptz,
        activated_at timestamptz,
        scope jsonb NOT NULL DEFAULT '{}'::jsonb,
        created_by_user_id uuid,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_exam_grading_policies_tenant_id_id UNIQUE (tenant_id, id),
        CONSTRAINT ck_exam_grading_policies_mode CHECK (reporting_mode IN ('traditional', 'cbc_competency', 'hybrid')),
        CONSTRAINT ck_exam_grading_policies_status CHECK (
          status IN ('draft', 'validated', 'scheduled', 'active', 'replaced', 'archived')
        ),
        CONSTRAINT ck_exam_grading_policies_version CHECK (version > 0),
        CONSTRAINT ck_exam_grading_policies_effective_range CHECK (
          effective_to IS NULL OR effective_from IS NULL OR effective_to > effective_from
        )
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
        remark text,
        is_pass boolean NOT NULL DEFAULT FALSE,
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
        score numeric(8,2),
        score_status text NOT NULL DEFAULT 'entered',
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
        CONSTRAINT ck_exam_marks_score_status CHECK (
          score_status IN (
            'entered',
            'absent',
            'exempt',
            'not_assessed',
            'incomplete',
            'withheld',
            'medical_exception',
            'transfer_student'
          )
        ),
        CONSTRAINT ck_exam_marks_score_evidence CHECK (
          (score_status = 'entered' AND score IS NOT NULL)
          OR (score_status <> 'entered' AND score IS NULL)
        ),
        CONSTRAINT ck_exam_marks_status CHECK (status IN ('draft', 'submitted', 'reviewed', 'locked', 'published'))
      );

      CREATE TABLE IF NOT EXISTS exam_mark_versions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        mark_id uuid NOT NULL,
        original_score numeric(8,2),
        original_score_status text NOT NULL DEFAULT 'entered',
        correction_score numeric(8,2),
        correction_score_status text NOT NULL DEFAULT 'entered',
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

      CREATE TABLE IF NOT EXISTS exam_mark_import_batches (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        file_name text NOT NULL,
        status text NOT NULL DEFAULT 'imported',
        total_rows integer NOT NULL,
        valid_rows integer NOT NULL,
        invalid_rows integer NOT NULL DEFAULT 0,
        duplicate_rows integer NOT NULL DEFAULT 0,
        committed_rows integer NOT NULL,
        preview_hash char(64) NOT NULL,
        imported_by_user_id uuid NOT NULL,
        imported_at timestamptz NOT NULL DEFAULT NOW(),
        rolled_back_by_user_id uuid,
        rolled_back_at timestamptz,
        rollback_reason text,
        metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
        CONSTRAINT uq_exam_mark_import_batches_tenant_id_id UNIQUE (tenant_id, id),
        CONSTRAINT ck_exam_mark_import_batches_status CHECK (status IN ('imported', 'rolled_back', 'failed')),
        CONSTRAINT ck_exam_mark_import_batches_counts CHECK (
          total_rows >= 0 AND valid_rows >= 0 AND invalid_rows >= 0
          AND duplicate_rows >= 0 AND committed_rows >= 0
        )
      );

      CREATE TABLE IF NOT EXISTS exam_mark_import_batch_items (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        batch_id uuid NOT NULL,
        mark_id uuid NOT NULL,
        row_number integer NOT NULL,
        previous_exists boolean NOT NULL,
        previous_score numeric(8,2),
        previous_score_status text,
        previous_remarks text,
        previous_status text,
        imported_score numeric(8,2),
        imported_score_status text NOT NULL DEFAULT 'entered',
        imported_remarks text,
        imported_status text NOT NULL,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_exam_mark_import_batch_items_tenant_id_id UNIQUE (tenant_id, id),
        CONSTRAINT uq_exam_mark_import_batch_items_scope UNIQUE (tenant_id, batch_id, mark_id),
        CONSTRAINT fk_exam_mark_import_batch_items_batch FOREIGN KEY (tenant_id, batch_id)
          REFERENCES exam_mark_import_batches (tenant_id, id) ON DELETE CASCADE,
        CONSTRAINT ck_exam_mark_import_batch_items_row CHECK (row_number > 0)
      );

      CREATE TABLE IF NOT EXISTS student_report_cards (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        exam_series_id uuid NOT NULL,
        student_id uuid NOT NULL,
        report_snapshot_id text NOT NULL,
        status text NOT NULL DEFAULT 'draft_requested',
        revision_number integer NOT NULL DEFAULT 1,
        is_current boolean NOT NULL DEFAULT TRUE,
        supersedes_report_card_id uuid,
        grading_policy_id uuid,
        grading_policy_version integer,
        template_version integer NOT NULL DEFAULT 1,
        approved_result_version text,
        verification_code text,
        submitted_by_user_id uuid,
        submitted_at timestamptz,
        approved_by_user_id uuid,
        approved_at timestamptz,
        approval_role text,
        published_by_user_id uuid,
        published_at timestamptz,
        withdrawn_by_user_id uuid,
        withdrawn_at timestamptz,
        workflow_version integer NOT NULL DEFAULT 1,
        metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_student_report_cards_tenant_id_id UNIQUE (tenant_id, id),
        CONSTRAINT uq_student_report_cards_revision UNIQUE (
          tenant_id, exam_series_id, student_id, revision_number
        ),
        CONSTRAINT ck_student_report_cards_revision CHECK (revision_number > 0),
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

      CREATE TABLE IF NOT EXISTS academic_interventions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        student_id text,
        exam_series_id uuid,
        subject_id text,
        class_section_id text,
        scope_type text NOT NULL DEFAULT 'student',
        source text NOT NULL DEFAULT 'manual',
        trigger_reason text NOT NULL,
        baseline jsonb NOT NULL DEFAULT '{}'::jsonb,
        plan text NOT NULL,
        target jsonb NOT NULL DEFAULT '{}'::jsonb,
        owner_user_id uuid,
        hod_user_id uuid,
        priority text NOT NULL DEFAULT 'normal',
        status text NOT NULL DEFAULT 'planned',
        starts_on date,
        due_on date,
        completed_at timestamptz,
        outcome jsonb NOT NULL DEFAULT '{}'::jsonb,
        created_by_user_id uuid NOT NULL,
        updated_by_user_id uuid,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_academic_interventions_tenant_id_id UNIQUE (tenant_id, id),
        CONSTRAINT ck_academic_interventions_source CHECK (
          source IN ('manual', 'analytics', 'moderation', 'attendance', 'reassessment')
        ),
        CONSTRAINT ck_academic_interventions_priority CHECK (
          priority IN ('low', 'normal', 'high', 'urgent')
        ),
        CONSTRAINT ck_academic_interventions_status CHECK (
          status IN ('planned', 'active', 'monitoring', 'completed', 'cancelled')
        ),
        CONSTRAINT ck_academic_interventions_scope_type CHECK (
          scope_type IN ('student', 'class', 'subject', 'class_subject')
        ),
        CONSTRAINT ck_academic_interventions_scope CHECK (
          student_id IS NOT NULL OR class_section_id IS NOT NULL OR subject_id IS NOT NULL
        ),
        CONSTRAINT ck_academic_interventions_dates CHECK (
          due_on IS NULL OR starts_on IS NULL OR due_on >= starts_on
        )
      );

      CREATE TABLE IF NOT EXISTS academic_intervention_updates (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        intervention_id uuid NOT NULL,
        update_type text NOT NULL DEFAULT 'progress',
        notes text NOT NULL,
        score numeric(8,2),
        score_status text,
        metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
        recorded_by_user_id uuid NOT NULL,
        recorded_at timestamptz NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_academic_intervention_updates_tenant_id_id UNIQUE (tenant_id, id),
        CONSTRAINT fk_academic_intervention_updates_intervention FOREIGN KEY (tenant_id, intervention_id)
          REFERENCES academic_interventions (tenant_id, id) ON DELETE CASCADE,
        CONSTRAINT ck_academic_intervention_updates_type CHECK (
          update_type IN ('progress', 'assessment', 'reassessment', 'note', 'status_change')
        ),
        CONSTRAINT ck_academic_intervention_updates_score CHECK (score IS NULL OR score >= 0),
        CONSTRAINT ck_academic_intervention_updates_score_status CHECK (
          score_status IS NULL OR score_status IN (
            'entered',
            'absent',
            'exempt',
            'not_assessed',
            'incomplete',
            'withheld',
            'medical_exception',
            'transfer_student'
          )
        ),
        CONSTRAINT ck_academic_intervention_updates_score_evidence CHECK (
          (score_status IS NULL AND score IS NULL)
          OR (score_status = 'entered' AND score IS NOT NULL)
          OR (score_status <> 'entered' AND score IS NULL)
        )
      );

      ALTER TABLE academic_interventions
        ADD COLUMN IF NOT EXISTS scope_type text NOT NULL DEFAULT 'student',
        ADD COLUMN IF NOT EXISTS target jsonb NOT NULL DEFAULT '{}'::jsonb,
        ADD COLUMN IF NOT EXISTS hod_user_id uuid;
      ALTER TABLE academic_interventions
        ALTER COLUMN student_id DROP NOT NULL,
        ALTER COLUMN student_id TYPE text USING student_id::text,
        ALTER COLUMN subject_id TYPE text USING subject_id::text,
        ALTER COLUMN class_section_id TYPE text USING class_section_id::text;
      UPDATE academic_interventions
      SET scope_type = CASE
        WHEN student_id IS NOT NULL THEN 'student'
        WHEN class_section_id IS NOT NULL AND subject_id IS NOT NULL THEN 'class_subject'
        WHEN class_section_id IS NOT NULL THEN 'class'
        ELSE 'subject'
      END,
      target = COALESCE(target, '{}'::jsonb)
      WHERE scope_type IS NULL
         OR scope_type NOT IN ('student', 'class', 'subject', 'class_subject')
         OR target IS NULL;
      ALTER TABLE academic_interventions
        DROP CONSTRAINT IF EXISTS ck_academic_interventions_scope_type;
      ALTER TABLE academic_interventions
        ADD CONSTRAINT ck_academic_interventions_scope_type CHECK (
          scope_type IN ('student', 'class', 'subject', 'class_subject')
        );
      ALTER TABLE academic_interventions
        DROP CONSTRAINT IF EXISTS ck_academic_interventions_scope;
      ALTER TABLE academic_interventions
        ADD CONSTRAINT ck_academic_interventions_scope CHECK (
          student_id IS NOT NULL OR class_section_id IS NOT NULL OR subject_id IS NOT NULL
        );

      DROP POLICY IF EXISTS exam_series_tenant_policy ON exam_series;
      DROP POLICY IF EXISTS exam_assessments_tenant_policy ON exam_assessments;
      DROP POLICY IF EXISTS exam_mark_windows_tenant_policy ON exam_mark_entry_windows;
      DROP POLICY IF EXISTS exam_grade_boundaries_tenant_policy ON exam_grade_boundaries;
      DROP POLICY IF EXISTS exam_grading_policies_tenant_policy ON exam_grading_policies;
      DROP POLICY IF EXISTS exam_grading_policy_boundaries_tenant_policy ON exam_grading_policy_boundaries;
      DROP POLICY IF EXISTS exam_subject_weightings_tenant_policy ON exam_subject_weightings;
      DROP POLICY IF EXISTS exam_competency_outcomes_tenant_policy ON exam_competency_outcomes;
      DROP POLICY IF EXISTS exam_assessment_components_tenant_policy ON exam_assessment_components;
      DROP POLICY IF EXISTS exam_marks_tenant_policy ON exam_marks;
      DROP POLICY IF EXISTS exam_mark_versions_tenant_policy ON exam_mark_versions;
      DROP POLICY IF EXISTS exam_mark_import_batches_tenant_policy ON exam_mark_import_batches;
      DROP POLICY IF EXISTS exam_mark_import_batch_items_tenant_policy ON exam_mark_import_batch_items;
      DROP POLICY IF EXISTS student_report_cards_tenant_policy ON student_report_cards;
      DROP POLICY IF EXISTS report_card_generation_batches_tenant_policy ON report_card_generation_batches;
      DROP POLICY IF EXISTS exam_result_snapshots_tenant_policy ON exam_result_snapshots;
      DROP POLICY IF EXISTS report_card_artifacts_tenant_policy ON report_card_artifacts;
      DROP POLICY IF EXISTS student_report_card_audit_logs_tenant_policy ON student_report_card_audit_logs;
      DROP POLICY IF EXISTS exam_mark_audit_logs_tenant_policy ON exam_mark_audit_logs;
      DROP POLICY IF EXISTS exam_settings_tenant_policy ON exam_settings;
      DROP POLICY IF EXISTS exam_settings_audit_logs_tenant_policy ON exam_settings_audit_logs;
      DROP POLICY IF EXISTS exam_timetable_slots_tenant_policy ON exam_timetable_slots;
      DROP POLICY IF EXISTS exam_invigilators_tenant_policy ON exam_invigilators;
      DROP POLICY IF EXISTS exam_attendance_records_tenant_policy ON exam_attendance_records;
      DROP POLICY IF EXISTS exam_student_cases_tenant_policy ON exam_student_cases;
      DROP POLICY IF EXISTS academic_interventions_tenant_policy ON academic_interventions;
      DROP POLICY IF EXISTS academic_intervention_updates_tenant_policy ON academic_intervention_updates;

      -- Reconcile tables first created by the legacy Prisma schema before any
      -- evolved exam workflow reads, updates, constraints, or indexes use them.
      ALTER TABLE exam_mark_entry_windows
      ADD COLUMN IF NOT EXISTS created_by_user_id uuid;
      ALTER TABLE exam_mark_entry_windows
      ALTER COLUMN created_at SET DEFAULT NOW();
      ALTER TABLE exam_mark_entry_windows
      ALTER COLUMN updated_at SET DEFAULT NOW();

      -- Legacy Prisma-created exam setup tables kept NOT NULL lifecycle
      -- columns without defaults. Repair them before command-center inserts run.
      ALTER TABLE exam_series
      ALTER COLUMN created_at SET DEFAULT NOW();
      ALTER TABLE exam_series
      ALTER COLUMN updated_at SET DEFAULT NOW();
      ALTER TABLE exam_assessments
      ALTER COLUMN created_at SET DEFAULT NOW();
      ALTER TABLE exam_assessments
      ALTER COLUMN updated_at SET DEFAULT NOW();

      ALTER TABLE exam_grade_boundaries
      ADD COLUMN IF NOT EXISTS exam_series_id uuid;
      ALTER TABLE exam_grade_boundaries
      ADD COLUMN IF NOT EXISTS label text;
      ALTER TABLE exam_grade_boundaries
      ADD COLUMN IF NOT EXISTS remarks text;
      ALTER TABLE exam_grade_boundaries
      ADD COLUMN IF NOT EXISTS created_by_user_id uuid;
      ALTER TABLE exam_grade_boundaries
      ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT NOW();
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = current_schema()
            AND table_name = 'exam_grade_boundaries'
            AND column_name = 'grade'
        ) THEN
          UPDATE exam_grade_boundaries
          SET label = COALESCE(label, NULLIF(grade, ''), 'Grade')
          WHERE label IS NULL;
        ELSE
          UPDATE exam_grade_boundaries
          SET label = COALESCE(label, 'Grade')
          WHERE label IS NULL;
        END IF;
      END $$;
      ALTER TABLE exam_grade_boundaries
      ALTER COLUMN label SET NOT NULL;
      ALTER TABLE exam_grade_boundaries
      ALTER COLUMN created_at SET DEFAULT NOW();
      ALTER TABLE exam_grade_boundaries
      ALTER COLUMN updated_at SET DEFAULT NOW();

      ALTER TABLE exam_grading_policies
      ADD COLUMN IF NOT EXISTS exam_series_id uuid;
      ALTER TABLE exam_grading_policies
      ADD COLUMN IF NOT EXISTS reporting_mode text NOT NULL DEFAULT 'traditional';
      ALTER TABLE exam_grading_policies
      ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'draft';
      ALTER TABLE exam_grading_policies
      ADD COLUMN IF NOT EXISTS created_by_user_id uuid;
      ALTER TABLE exam_grading_policies
      ALTER COLUMN created_at SET DEFAULT NOW();
      ALTER TABLE exam_grading_policies
      ALTER COLUMN updated_at SET DEFAULT NOW();
      ALTER TABLE exam_grading_policies
      DROP CONSTRAINT IF EXISTS ck_exam_grading_policies_mode;
      ALTER TABLE exam_grading_policies
      ADD CONSTRAINT ck_exam_grading_policies_mode CHECK (
        reporting_mode IN ('traditional', 'cbc_competency', 'hybrid')
      );

      ALTER TABLE exam_subject_weightings
      ADD COLUMN IF NOT EXISTS grading_policy_id uuid;
      ALTER TABLE exam_subject_weightings
      ADD COLUMN IF NOT EXISTS exam_series_id uuid;
      ALTER TABLE exam_subject_weightings
      ADD COLUMN IF NOT EXISTS is_compulsory boolean NOT NULL DEFAULT TRUE;
      ALTER TABLE exam_subject_weightings
      ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT NOW();
      ALTER TABLE exam_subject_weightings
      ALTER COLUMN exam_series_id DROP NOT NULL;
      ALTER TABLE exam_subject_weightings
      ALTER COLUMN created_at SET DEFAULT NOW();
      ALTER TABLE exam_subject_weightings
      ALTER COLUMN updated_at SET DEFAULT NOW();

      ALTER TABLE exam_assessment_components
      ADD COLUMN IF NOT EXISTS name text;
      ALTER TABLE exam_assessment_components
      ADD COLUMN IF NOT EXISTS component_code text;
      ALTER TABLE exam_assessment_components
      ADD COLUMN IF NOT EXISTS component_name text;
      ALTER TABLE exam_assessment_components
      ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT NOW();
      UPDATE exam_assessment_components
      SET component_name = COALESCE(component_name, NULLIF(name, ''), 'Assessment component'),
          component_code = COALESCE(
            component_code,
            'COMP-' || UPPER(LEFT(REPLACE(id::text, '-', ''), 8))
          )
      WHERE component_name IS NULL
         OR component_code IS NULL;
      ALTER TABLE exam_assessment_components
      ALTER COLUMN name DROP NOT NULL;
      ALTER TABLE exam_assessment_components
      ALTER COLUMN component_code SET NOT NULL;
      ALTER TABLE exam_assessment_components
      ALTER COLUMN component_name SET NOT NULL;
      ALTER TABLE exam_assessment_components
      ALTER COLUMN created_at SET DEFAULT NOW();
      ALTER TABLE exam_assessment_components
      ALTER COLUMN updated_at SET DEFAULT NOW();

      ALTER TABLE exam_marks
      ADD COLUMN IF NOT EXISTS submitted_at timestamptz;
      ALTER TABLE exam_marks
      ADD COLUMN IF NOT EXISTS published_at timestamptz;
      ALTER TABLE exam_marks
      ALTER COLUMN remarks DROP NOT NULL;
      ALTER TABLE exam_marks
      ALTER COLUMN updated_by_user_id DROP NOT NULL;
      ALTER TABLE exam_marks
      ALTER COLUMN created_at SET DEFAULT NOW();
      ALTER TABLE exam_marks
      ALTER COLUMN updated_at SET DEFAULT NOW();

      ALTER TABLE exam_mark_versions
      ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT NOW();
      ALTER TABLE exam_mark_versions
      ALTER COLUMN first_approver_user_id DROP NOT NULL;
      ALTER TABLE exam_mark_versions
      ALTER COLUMN second_approver_user_id DROP NOT NULL;
      ALTER TABLE exam_mark_versions
      ALTER COLUMN created_at SET DEFAULT NOW();
      ALTER TABLE exam_mark_versions
      ALTER COLUMN updated_at SET DEFAULT NOW();

      ALTER TABLE exam_grading_policies
      ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1;
      ALTER TABLE exam_grading_policies
      ADD COLUMN IF NOT EXISTS effective_from timestamptz;
      ALTER TABLE exam_grading_policies
      ADD COLUMN IF NOT EXISTS effective_to timestamptz;
      ALTER TABLE exam_grading_policies
      ADD COLUMN IF NOT EXISTS supersedes_policy_id uuid;
      ALTER TABLE exam_grading_policies
      ADD COLUMN IF NOT EXISTS validated_at timestamptz;
      ALTER TABLE exam_grading_policies
      ADD COLUMN IF NOT EXISTS activated_at timestamptz;
      ALTER TABLE exam_grading_policies
      ADD COLUMN IF NOT EXISTS scope jsonb NOT NULL DEFAULT '{}'::jsonb;
      ALTER TABLE exam_grading_policies
      DROP CONSTRAINT IF EXISTS ck_exam_grading_policies_status;
      ALTER TABLE exam_grading_policies
      DROP CONSTRAINT IF EXISTS ck_exam_grading_policies_version;
      ALTER TABLE exam_grading_policies
      DROP CONSTRAINT IF EXISTS ck_exam_grading_policies_effective_range;
      UPDATE exam_grading_policies
      SET status = 'archived'
      WHERE status = 'retired';
      UPDATE exam_grading_policies
      SET scope = COALESCE(scope, '{}'::jsonb),
          activated_at = CASE
            WHEN status = 'active' THEN COALESCE(activated_at, updated_at, created_at)
            ELSE activated_at
          END,
          effective_from = CASE
            WHEN status = 'active' THEN COALESCE(effective_from, activated_at, updated_at, created_at)
            ELSE effective_from
          END
      WHERE scope IS NULL
         OR (status = 'active' AND (activated_at IS NULL OR effective_from IS NULL));
      ALTER TABLE exam_grading_policies
      ADD CONSTRAINT ck_exam_grading_policies_status CHECK (
        status IN ('draft', 'validated', 'scheduled', 'active', 'replaced', 'archived')
      );
      ALTER TABLE exam_grading_policies
      ADD CONSTRAINT ck_exam_grading_policies_version CHECK (version > 0);
      ALTER TABLE exam_grading_policies
      ADD CONSTRAINT ck_exam_grading_policies_effective_range CHECK (
        effective_to IS NULL OR effective_from IS NULL OR effective_to > effective_from
      );

      ALTER TABLE exam_grading_policy_boundaries
      ADD COLUMN IF NOT EXISTS remark text;
      ALTER TABLE exam_grading_policy_boundaries
      ADD COLUMN IF NOT EXISTS is_pass boolean NOT NULL DEFAULT FALSE;

      ALTER TABLE exam_marks
      ADD COLUMN IF NOT EXISTS score_status text NOT NULL DEFAULT 'entered';
      ALTER TABLE exam_marks
      ALTER COLUMN score DROP NOT NULL;
      UPDATE exam_marks
      SET score_status = CASE WHEN score IS NULL THEN 'not_assessed' ELSE 'entered' END
      WHERE score_status IS NULL
         OR (score_status = 'entered' AND score IS NULL)
         OR (score_status <> 'entered' AND score IS NOT NULL);
      ALTER TABLE exam_marks
      DROP CONSTRAINT IF EXISTS ck_exam_marks_score_status;
      ALTER TABLE exam_marks
      DROP CONSTRAINT IF EXISTS ck_exam_marks_score_evidence;
      ALTER TABLE exam_marks
      ADD CONSTRAINT ck_exam_marks_score_status CHECK (
        score_status IN (
          'entered',
          'absent',
          'exempt',
          'not_assessed',
          'incomplete',
          'withheld',
          'medical_exception',
          'transfer_student'
        )
      );
      ALTER TABLE exam_marks
      ADD CONSTRAINT ck_exam_marks_score_evidence CHECK (
        (score_status = 'entered' AND score IS NOT NULL)
        OR (score_status <> 'entered' AND score IS NULL)
      );

      ALTER TABLE exam_mark_versions
      ALTER COLUMN original_score DROP NOT NULL;
      ALTER TABLE exam_mark_versions
      ALTER COLUMN correction_score DROP NOT NULL;
      ALTER TABLE exam_mark_versions
      ADD COLUMN IF NOT EXISTS original_score_status text NOT NULL DEFAULT 'entered';
      ALTER TABLE exam_mark_versions
      ADD COLUMN IF NOT EXISTS correction_score_status text NOT NULL DEFAULT 'entered';
      UPDATE exam_mark_versions
      SET original_score_status = CASE WHEN original_score IS NULL THEN 'not_assessed' ELSE 'entered' END,
          correction_score_status = CASE WHEN correction_score IS NULL THEN 'not_assessed' ELSE 'entered' END
      WHERE original_score_status IS NULL
         OR correction_score_status IS NULL
         OR (original_score_status = 'entered' AND original_score IS NULL)
         OR (correction_score_status = 'entered' AND correction_score IS NULL);

      ALTER TABLE exam_mark_import_batch_items
      ADD COLUMN IF NOT EXISTS previous_score_status text;
      ALTER TABLE exam_mark_import_batch_items
      ADD COLUMN IF NOT EXISTS imported_score_status text NOT NULL DEFAULT 'entered';
      ALTER TABLE exam_mark_import_batch_items
      ALTER COLUMN imported_score DROP NOT NULL;
      UPDATE exam_mark_import_batch_items
      SET previous_score_status = CASE
            WHEN NOT previous_exists THEN NULL
            WHEN previous_score IS NULL THEN 'not_assessed'
            ELSE 'entered'
          END,
          imported_score_status = CASE WHEN imported_score IS NULL THEN 'not_assessed' ELSE 'entered' END
      WHERE previous_score_status IS NULL
         OR imported_score_status IS NULL
         OR (imported_score_status = 'entered' AND imported_score IS NULL);

      ALTER TABLE student_report_cards
      ADD COLUMN IF NOT EXISTS verification_code text;
      ALTER TABLE student_report_cards
      ADD COLUMN IF NOT EXISTS published_at timestamptz;
      ALTER TABLE student_report_cards
      ADD COLUMN IF NOT EXISTS revision_number integer NOT NULL DEFAULT 1;
      ALTER TABLE student_report_cards
      ADD COLUMN IF NOT EXISTS is_current boolean NOT NULL DEFAULT TRUE;
      ALTER TABLE student_report_cards
      ADD COLUMN IF NOT EXISTS supersedes_report_card_id uuid;
      ALTER TABLE student_report_cards
      ADD COLUMN IF NOT EXISTS grading_policy_id uuid;
      ALTER TABLE student_report_cards
      ADD COLUMN IF NOT EXISTS grading_policy_version integer;
      ALTER TABLE student_report_cards
      ADD COLUMN IF NOT EXISTS template_version integer NOT NULL DEFAULT 1;
      ALTER TABLE student_report_cards
      ADD COLUMN IF NOT EXISTS approved_result_version text;
      ALTER TABLE student_report_cards
      ADD COLUMN IF NOT EXISTS submitted_by_user_id uuid;
      ALTER TABLE student_report_cards
      ADD COLUMN IF NOT EXISTS submitted_at timestamptz;
      ALTER TABLE student_report_cards
      ADD COLUMN IF NOT EXISTS approved_by_user_id uuid;
      ALTER TABLE student_report_cards
      ADD COLUMN IF NOT EXISTS approved_at timestamptz;
      ALTER TABLE student_report_cards
      ADD COLUMN IF NOT EXISTS approval_role text;
      ALTER TABLE student_report_cards
      ADD COLUMN IF NOT EXISTS withdrawn_by_user_id uuid;
      ALTER TABLE student_report_cards
      ADD COLUMN IF NOT EXISTS withdrawn_at timestamptz;
      ALTER TABLE student_report_cards
      ADD COLUMN IF NOT EXISTS workflow_version integer NOT NULL DEFAULT 1;
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = current_schema()
            AND table_name = 'student_report_cards'
            AND column_name = 'report_snapshot_id'
            AND data_type <> 'text'
        ) THEN
          ALTER TABLE student_report_cards
          ALTER COLUMN report_snapshot_id TYPE text USING report_snapshot_id::text;
        END IF;
      END $$;
      ALTER TABLE student_report_cards
      ALTER COLUMN status SET DEFAULT 'draft_requested';
      ALTER TABLE student_report_cards
      ALTER COLUMN published_at DROP NOT NULL;
      ALTER TABLE student_report_cards
      ALTER COLUMN verification_code DROP NOT NULL;
      ALTER TABLE student_report_cards
      ALTER COLUMN published_by_user_id DROP NOT NULL;
      ALTER TABLE student_report_cards
      ALTER COLUMN created_at SET DEFAULT NOW();
      ALTER TABLE student_report_cards
      ALTER COLUMN updated_at SET DEFAULT NOW();
      ALTER TABLE student_report_cards
      ALTER COLUMN tenant_id TYPE text USING tenant_id::text;
      UPDATE student_report_cards
      SET metadata = COALESCE(metadata, '{}'::jsonb),
          workflow_version = GREATEST(COALESCE(workflow_version, 1), 1),
          published_at = CASE
            WHEN status = 'published' THEN COALESCE(published_at, updated_at, created_at, NOW())
            ELSE published_at
          END
      WHERE metadata IS NULL
         OR workflow_version IS NULL
         OR workflow_version < 1
         OR (status = 'published' AND published_at IS NULL);
      ALTER TABLE student_report_cards
      DROP CONSTRAINT IF EXISTS uq_student_report_cards_series_student;
      ALTER TABLE student_report_cards
      DROP CONSTRAINT IF EXISTS uq_student_report_cards_revision;
      ALTER TABLE student_report_cards
      DROP CONSTRAINT IF EXISTS ck_student_report_cards_revision;
      ALTER TABLE student_report_cards
      ADD CONSTRAINT uq_student_report_cards_revision UNIQUE (
        tenant_id, exam_series_id, student_id, revision_number
      );
      ALTER TABLE student_report_cards
      ADD CONSTRAINT ck_student_report_cards_revision CHECK (revision_number > 0);
      ALTER TABLE student_report_cards
      DROP CONSTRAINT IF EXISTS ck_student_report_cards_workflow_version;
      ALTER TABLE student_report_cards
      ADD CONSTRAINT ck_student_report_cards_workflow_version CHECK (workflow_version > 0);
      CREATE UNIQUE INDEX IF NOT EXISTS ux_student_report_cards_current_revision
        ON student_report_cards (tenant_id, exam_series_id, student_id)
        WHERE is_current;

      ALTER TABLE report_card_artifacts
      ADD COLUMN IF NOT EXISTS generated_at timestamptz NOT NULL DEFAULT NOW();
      ALTER TABLE report_card_artifacts
      ADD COLUMN IF NOT EXISTS generated_by_user_id uuid;
      ALTER TABLE report_card_artifacts
      ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;
      ALTER TABLE report_card_artifacts
      ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT NOW();
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = current_schema()
            AND table_name = 'report_card_artifacts'
            AND column_name = 'byte_size'
            AND data_type <> 'bigint'
        ) THEN
          ALTER TABLE report_card_artifacts
          ALTER COLUMN byte_size TYPE bigint USING (
            CASE
              WHEN TRIM(byte_size::text) ~ '^[0-9]+$' THEN TRIM(byte_size::text)::bigint
              ELSE 0
            END
          );
        END IF;
      END $$;
      ALTER TABLE report_card_artifacts
      ALTER COLUMN generated_by_user_id DROP NOT NULL;
      ALTER TABLE report_card_artifacts
      ALTER COLUMN created_at SET DEFAULT NOW();
      ALTER TABLE report_card_artifacts
      ALTER COLUMN updated_at SET DEFAULT NOW();
      UPDATE report_card_artifacts
      SET metadata = COALESCE(metadata, '{}'::jsonb),
          generated_at = COALESCE(generated_at, NOW())
      WHERE metadata IS NULL
         OR generated_at IS NULL;

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

      ALTER TABLE student_report_card_audit_logs
      ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT NOW();
      ALTER TABLE student_report_card_audit_logs
      ALTER COLUMN report_card_id DROP NOT NULL;
      ALTER TABLE student_report_card_audit_logs
      ALTER COLUMN exam_series_id DROP NOT NULL;
      ALTER TABLE student_report_card_audit_logs
      ALTER COLUMN student_id DROP NOT NULL;
      ALTER TABLE student_report_card_audit_logs
      ALTER COLUMN actor_user_id DROP NOT NULL;
      ALTER TABLE student_report_card_audit_logs
      ALTER COLUMN created_at SET DEFAULT NOW();
      ALTER TABLE student_report_card_audit_logs
      ALTER COLUMN updated_at SET DEFAULT NOW();

      ALTER TABLE exam_mark_audit_logs
      ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT NOW();
      ALTER TABLE exam_mark_audit_logs
      ALTER COLUMN mark_id DROP NOT NULL;
      ALTER TABLE exam_mark_audit_logs
      ALTER COLUMN exam_series_id DROP NOT NULL;
      ALTER TABLE exam_mark_audit_logs
      ALTER COLUMN assessment_id DROP NOT NULL;
      ALTER TABLE exam_mark_audit_logs
      ALTER COLUMN student_id DROP NOT NULL;
      ALTER TABLE exam_mark_audit_logs
      ALTER COLUMN actor_user_id DROP NOT NULL;
      ALTER TABLE exam_mark_audit_logs
      ALTER COLUMN previous_score DROP NOT NULL;
      ALTER TABLE exam_mark_audit_logs
      ALTER COLUMN new_score DROP NOT NULL;
      ALTER TABLE exam_mark_audit_logs
      ALTER COLUMN reason DROP NOT NULL;
      ALTER TABLE exam_mark_audit_logs
      ALTER COLUMN created_at SET DEFAULT NOW();
      ALTER TABLE exam_mark_audit_logs
      ALTER COLUMN updated_at SET DEFAULT NOW();

      CREATE TABLE IF NOT EXISTS exam_result_snapshots (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        batch_id uuid NOT NULL,
        exam_series_id uuid NOT NULL,
        class_section_id uuid,
        student_id uuid NOT NULL,
        raw_total numeric(12,2) NOT NULL,
        assessment_count integer NOT NULL,
        average_percentage numeric(8,2) NOT NULL,
        grade_label text,
        class_rank integer,
        processed_by_user_id uuid NOT NULL,
        processed_at timestamptz NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_exam_result_snapshots_tenant_id_id UNIQUE (tenant_id, id),
        CONSTRAINT uq_exam_result_snapshots_batch_student UNIQUE (tenant_id, batch_id, student_id),
        CONSTRAINT ck_exam_result_snapshots_counts CHECK (assessment_count > 0),
        CONSTRAINT ck_exam_result_snapshots_average CHECK (average_percentage >= 0),
        CONSTRAINT ck_exam_result_snapshots_rank CHECK (class_rank IS NULL OR class_rank > 0)
      );

      CREATE TABLE IF NOT EXISTS exam_settings (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL UNIQUE,
        lock_after_deadline boolean NOT NULL DEFAULT true,
        grace_period_hours integer NOT NULL DEFAULT 24,
        include_school_logo boolean NOT NULL DEFAULT true,
        include_principal_signature boolean NOT NULL DEFAULT true,
        include_official_stamp boolean NOT NULL DEFAULT true,
        block_results_for_fee_balances boolean NOT NULL DEFAULT true,
        fee_balance_block_threshold numeric(12,2) NOT NULL DEFAULT 1000,
        show_student_rank_to_parents boolean NOT NULL DEFAULT true,
        updated_by_user_id uuid,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        CONSTRAINT ck_exam_settings_grace_period CHECK (grace_period_hours >= 0 AND grace_period_hours <= 168),
        CONSTRAINT ck_exam_settings_fee_threshold CHECK (fee_balance_block_threshold >= 0)
      );

      CREATE TABLE IF NOT EXISTS exam_settings_audit_logs (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        action text NOT NULL,
        actor_user_id uuid,
        previous_settings jsonb NOT NULL DEFAULT '{}'::jsonb,
        new_settings jsonb NOT NULL DEFAULT '{}'::jsonb,
        metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
        created_at timestamptz NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS exam_timetable_slots (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        exam_series_id uuid NOT NULL,
        assessment_id uuid,
        date date NOT NULL,
        start_time time NOT NULL,
        end_time time NOT NULL,
        room_name text,
        status text NOT NULL DEFAULT 'scheduled',
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        CONSTRAINT ck_exam_timetable_slots_time CHECK (end_time > start_time)
      );

      CREATE TABLE IF NOT EXISTS exam_invigilators (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        timetable_slot_id uuid NOT NULL,
        staff_user_id uuid NOT NULL,
        role text NOT NULL DEFAULT 'invigilator',
        status text NOT NULL DEFAULT 'assigned',
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS exam_attendance_records (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        timetable_slot_id uuid NOT NULL,
        student_id uuid NOT NULL,
        status text NOT NULL DEFAULT 'present',
        remarks text,
        recorded_by_user_id uuid,
        locked_at timestamptz,
        locked_by_user_id uuid,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS exam_student_cases (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        exam_series_id uuid NOT NULL,
        student_id uuid NOT NULL,
        case_type text NOT NULL,
        description text NOT NULL,
        status text NOT NULL DEFAULT 'pending',
        resolution text,
        reported_by_user_id uuid,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW()
      );

      ALTER TABLE exam_timetable_slots
      ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'scheduled';
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = current_schema()
            AND table_name = 'exam_timetable_slots'
            AND column_name = 'date'
            AND data_type <> 'date'
        ) THEN
          ALTER TABLE exam_timetable_slots
          ALTER COLUMN date TYPE date USING date::date;
        END IF;
        IF EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = current_schema()
            AND table_name = 'exam_timetable_slots'
            AND column_name = 'start_time'
            AND data_type <> 'time without time zone'
        ) THEN
          ALTER TABLE exam_timetable_slots
          ALTER COLUMN start_time TYPE time USING start_time::time;
        END IF;
        IF EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = current_schema()
            AND table_name = 'exam_timetable_slots'
            AND column_name = 'end_time'
            AND data_type <> 'time without time zone'
        ) THEN
          ALTER TABLE exam_timetable_slots
          ALTER COLUMN end_time TYPE time USING end_time::time;
        END IF;
      END $$;
      ALTER TABLE exam_timetable_slots
      ALTER COLUMN assessment_id DROP NOT NULL;
      ALTER TABLE exam_timetable_slots
      ALTER COLUMN room_name DROP NOT NULL;
      ALTER TABLE exam_timetable_slots
      ALTER COLUMN created_at SET DEFAULT NOW();
      ALTER TABLE exam_timetable_slots
      ALTER COLUMN updated_at SET DEFAULT NOW();

      ALTER TABLE exam_invigilators
      ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'assigned';
      ALTER TABLE exam_invigilators
      ALTER COLUMN created_at SET DEFAULT NOW();
      ALTER TABLE exam_invigilators
      ALTER COLUMN updated_at SET DEFAULT NOW();

      ALTER TABLE exam_attendance_records
      ALTER COLUMN remarks DROP NOT NULL;
      ALTER TABLE exam_attendance_records
      ALTER COLUMN recorded_by_user_id DROP NOT NULL;
      ALTER TABLE exam_attendance_records
      ALTER COLUMN created_at SET DEFAULT NOW();
      ALTER TABLE exam_attendance_records
      ALTER COLUMN updated_at SET DEFAULT NOW();

      ALTER TABLE exam_student_cases
      ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending';
      ALTER TABLE exam_student_cases
      ADD COLUMN IF NOT EXISTS resolution text;
      ALTER TABLE exam_student_cases
      ALTER COLUMN reported_by_user_id DROP NOT NULL;
      ALTER TABLE exam_student_cases
      ALTER COLUMN created_at SET DEFAULT NOW();
      ALTER TABLE exam_student_cases
      ALTER COLUMN updated_at SET DEFAULT NOW();

      ALTER TABLE exam_series
      ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'draft';
      ALTER TABLE exam_series
      ADD COLUMN IF NOT EXISTS grading_system_id uuid;
      ALTER TABLE exam_series
      ADD COLUMN IF NOT EXISTS locked_at timestamptz;
      ALTER TABLE exam_series
      ADD COLUMN IF NOT EXISTS published_at timestamptz;
      ALTER TABLE exam_series
      ADD COLUMN IF NOT EXISTS created_by_user_id uuid;
      ALTER TABLE exam_series
      ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT NOW();
      UPDATE exam_series
      SET status = COALESCE(status, 'draft'),
          updated_at = COALESCE(updated_at, created_at, NOW())
      WHERE status IS NULL
         OR updated_at IS NULL;

      ALTER TABLE report_card_generation_batches
      ADD COLUMN IF NOT EXISTS completed_students integer NOT NULL DEFAULT 0;
      ALTER TABLE report_card_generation_batches
      ADD COLUMN IF NOT EXISTS failed_students integer NOT NULL DEFAULT 0;
      ALTER TABLE report_card_generation_batches
      ADD COLUMN IF NOT EXISTS completed_at timestamptz;
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = current_schema()
            AND table_name = 'report_card_generation_batches'
            AND column_name = 'total_students'
            AND data_type <> 'integer'
        ) THEN
          ALTER TABLE report_card_generation_batches
          ALTER COLUMN total_students TYPE integer USING (
            CASE
              WHEN TRIM(total_students::text) ~ '^[0-9]+$' THEN TRIM(total_students::text)::integer
              ELSE 0
            END
          );
        END IF;
      END $$;
      ALTER TABLE report_card_generation_batches
      ALTER COLUMN total_students SET DEFAULT 0;
      ALTER TABLE report_card_generation_batches
      ALTER COLUMN class_section_id DROP NOT NULL;
      ALTER TABLE report_card_generation_batches
      ALTER COLUMN stream_name DROP NOT NULL;
      ALTER TABLE report_card_generation_batches
      ALTER COLUMN started_at DROP NOT NULL;
      ALTER TABLE report_card_generation_batches
      ALTER COLUMN created_at SET DEFAULT NOW();
      ALTER TABLE report_card_generation_batches
      ALTER COLUMN updated_at SET DEFAULT NOW();
      UPDATE report_card_generation_batches
      SET completed_students = COALESCE(completed_students, 0),
          failed_students = COALESCE(failed_students, 0),
          status = COALESCE(status, 'draft_requested'),
          metadata = COALESCE(metadata, '{}'::jsonb),
          updated_at = COALESCE(updated_at, created_at, NOW())
      WHERE completed_students IS NULL
         OR failed_students IS NULL
         OR status IS NULL
         OR metadata IS NULL
         OR updated_at IS NULL;

      DROP POLICY IF EXISTS exam_series_tenant_policy ON exam_series;
      DROP POLICY IF EXISTS exam_assessments_tenant_policy ON exam_assessments;
      DROP POLICY IF EXISTS exam_mark_windows_tenant_policy ON exam_mark_entry_windows;
      DROP POLICY IF EXISTS exam_grade_boundaries_tenant_policy ON exam_grade_boundaries;
      DROP POLICY IF EXISTS exam_grading_policies_tenant_policy ON exam_grading_policies;
      DROP POLICY IF EXISTS exam_grading_policy_boundaries_tenant_policy ON exam_grading_policy_boundaries;
      DROP POLICY IF EXISTS exam_subject_weightings_tenant_policy ON exam_subject_weightings;
      DROP POLICY IF EXISTS exam_competency_outcomes_tenant_policy ON exam_competency_outcomes;
      DROP POLICY IF EXISTS exam_assessment_components_tenant_policy ON exam_assessment_components;
      DROP POLICY IF EXISTS exam_marks_tenant_policy ON exam_marks;
      DROP POLICY IF EXISTS exam_mark_versions_tenant_policy ON exam_mark_versions;
      DROP POLICY IF EXISTS exam_mark_import_batches_tenant_policy ON exam_mark_import_batches;
      DROP POLICY IF EXISTS exam_mark_import_batch_items_tenant_policy ON exam_mark_import_batch_items;
      DROP POLICY IF EXISTS student_report_cards_tenant_policy ON student_report_cards;
      DROP POLICY IF EXISTS report_card_generation_batches_tenant_policy ON report_card_generation_batches;
      DROP POLICY IF EXISTS exam_result_snapshots_tenant_policy ON exam_result_snapshots;
      DROP POLICY IF EXISTS report_card_artifacts_tenant_policy ON report_card_artifacts;
      DROP POLICY IF EXISTS student_report_card_audit_logs_tenant_policy ON student_report_card_audit_logs;
      DROP POLICY IF EXISTS exam_mark_audit_logs_tenant_policy ON exam_mark_audit_logs;
      DROP POLICY IF EXISTS exam_settings_tenant_policy ON exam_settings;
      DROP POLICY IF EXISTS exam_settings_audit_logs_tenant_policy ON exam_settings_audit_logs;
      DROP POLICY IF EXISTS exam_timetable_slots_tenant_policy ON exam_timetable_slots;
      DROP POLICY IF EXISTS exam_invigilators_tenant_policy ON exam_invigilators;
      DROP POLICY IF EXISTS exam_attendance_records_tenant_policy ON exam_attendance_records;
      DROP POLICY IF EXISTS exam_student_cases_tenant_policy ON exam_student_cases;

      DO $$
      DECLARE
        table_name text;
        existing_policy text;
      BEGIN
        FOREACH table_name IN ARRAY ARRAY[
          'exam_series',
          'exam_assessments',
          'exam_mark_entry_windows',
          'exam_grade_boundaries',
          'exam_grading_policies',
          'exam_grading_policy_boundaries',
          'exam_subject_weightings',
          'exam_competency_outcomes',
          'exam_assessment_components',
          'exam_marks',
          'exam_mark_versions',
          'exam_mark_import_batches',
          'exam_mark_import_batch_items',
          'student_report_cards',
          'report_card_generation_batches',
          'report_card_artifacts',
          'exam_result_snapshots',
          'exam_settings_audit_logs',
          'exam_mark_audit_logs',
          'student_report_card_audit_logs',
          'exam_settings',
          'exam_import_templates',
          'exam_audit_approvals',
          'exam_timetable_slots',
          'exam_papers',
          'exam_invigilators',
          'exam_attendance_records',
          'exam_student_cases',
          'academic_interventions',
          'academic_intervention_updates'
        ]
        LOOP
          IF to_regclass('public.' || table_name) IS NOT NULL THEN
            EXECUTE format('ALTER TABLE %I NO FORCE ROW LEVEL SECURITY', table_name);
            EXECUTE format('ALTER TABLE %I DISABLE ROW LEVEL SECURITY', table_name);

            FOR existing_policy IN
              SELECT policyname
              FROM pg_policies
              WHERE pg_policies.schemaname = 'public'
                AND pg_policies.tablename = table_name
            LOOP
              EXECUTE format('DROP POLICY IF EXISTS %I ON %I', existing_policy, table_name);
            END LOOP;

            EXECUTE format('ALTER TABLE %I ALTER COLUMN tenant_id TYPE text USING tenant_id::text', table_name);
          END IF;
        END LOOP;
      END $$;

      ALTER TABLE exam_mark_versions
      DROP CONSTRAINT IF EXISTS ck_exam_mark_versions_original_score_status;
      ALTER TABLE exam_mark_versions
      DROP CONSTRAINT IF EXISTS ck_exam_mark_versions_correction_score_status;
      ALTER TABLE exam_mark_versions
      DROP CONSTRAINT IF EXISTS ck_exam_mark_versions_score_evidence;
      ALTER TABLE exam_mark_versions
      ADD CONSTRAINT ck_exam_mark_versions_original_score_status CHECK (
        original_score_status IN (
          'entered', 'absent', 'exempt', 'not_assessed', 'incomplete',
          'withheld', 'medical_exception', 'transfer_student'
        )
      );
      ALTER TABLE exam_mark_versions
      ADD CONSTRAINT ck_exam_mark_versions_correction_score_status CHECK (
        correction_score_status IN (
          'entered', 'absent', 'exempt', 'not_assessed', 'incomplete',
          'withheld', 'medical_exception', 'transfer_student'
        )
      );
      ALTER TABLE exam_mark_versions
      ADD CONSTRAINT ck_exam_mark_versions_score_evidence CHECK (
        (
          (original_score_status = 'entered' AND original_score IS NOT NULL)
          OR (original_score_status <> 'entered' AND original_score IS NULL)
        )
        AND (
          (correction_score_status = 'entered' AND correction_score IS NOT NULL)
          OR (correction_score_status <> 'entered' AND correction_score IS NULL)
        )
      );

      ALTER TABLE exam_mark_import_batch_items
      DROP CONSTRAINT IF EXISTS ck_exam_mark_import_batch_items_score_status;
      ALTER TABLE exam_mark_import_batch_items
      DROP CONSTRAINT IF EXISTS ck_exam_mark_import_batch_items_score_evidence;
      ALTER TABLE exam_mark_import_batch_items
      ADD CONSTRAINT ck_exam_mark_import_batch_items_score_status CHECK (
        (previous_score_status IS NULL OR previous_score_status IN (
          'entered', 'absent', 'exempt', 'not_assessed', 'incomplete',
          'withheld', 'medical_exception', 'transfer_student'
        ))
        AND imported_score_status IN (
          'entered', 'absent', 'exempt', 'not_assessed', 'incomplete',
          'withheld', 'medical_exception', 'transfer_student'
        )
      );
      ALTER TABLE exam_mark_import_batch_items
      ADD CONSTRAINT ck_exam_mark_import_batch_items_score_evidence CHECK (
        (
          NOT previous_exists
          OR (previous_score_status = 'entered' AND previous_score IS NOT NULL)
          OR (previous_score_status <> 'entered' AND previous_score IS NULL)
        )
        AND (
          (imported_score_status = 'entered' AND imported_score IS NOT NULL)
          OR (imported_score_status <> 'entered' AND imported_score IS NULL)
        )
      );

      CREATE INDEX IF NOT EXISTS ix_exam_marks_subject_scope
        ON exam_marks (tenant_id, exam_series_id, academic_term_id, class_section_id, subject_id);
      CREATE UNIQUE INDEX IF NOT EXISTS uq_exam_marks_scope
        ON exam_marks (tenant_id, assessment_id, student_id);
      CREATE UNIQUE INDEX IF NOT EXISTS ux_exam_assessments_scope
        ON exam_assessments (tenant_id, exam_series_id, subject_id, name);
      CREATE UNIQUE INDEX IF NOT EXISTS ux_exam_mark_entry_windows_scope
        ON exam_mark_entry_windows (tenant_id, exam_series_id, subject_id, class_section_id);
      CREATE INDEX IF NOT EXISTS ix_exam_marks_student
        ON exam_marks (tenant_id, student_id, exam_series_id);
      CREATE INDEX IF NOT EXISTS ix_student_report_cards_student
        ON student_report_cards (tenant_id, student_id, published_at DESC);
      CREATE INDEX IF NOT EXISTS ix_student_report_cards_tenant_published
        ON student_report_cards (tenant_id, published_at DESC NULLS LAST, created_at DESC);
      CREATE INDEX IF NOT EXISTS ix_exam_mark_audit_logs_mark
        ON exam_mark_audit_logs (tenant_id, mark_id, created_at DESC);
      CREATE INDEX IF NOT EXISTS ix_exam_settings_audit_logs_tenant
        ON exam_settings_audit_logs (tenant_id, created_at DESC);
      CREATE UNIQUE INDEX IF NOT EXISTS ux_exam_invigilators_tenant_slot_staff
        ON exam_invigilators (tenant_id, timetable_slot_id, staff_user_id);
      CREATE UNIQUE INDEX IF NOT EXISTS ux_exam_attendance_tenant_slot_student
        ON exam_attendance_records (tenant_id, timetable_slot_id, student_id);
      ALTER TABLE exam_mark_entry_windows ADD COLUMN IF NOT EXISTS last_action text;
      ALTER TABLE exam_mark_entry_windows ADD COLUMN IF NOT EXISTS last_action_at timestamptz;
      ALTER TABLE exam_mark_entry_windows ADD COLUMN IF NOT EXISTS last_action_by_user_id uuid;
      ALTER TABLE exam_mark_entry_windows ADD COLUMN IF NOT EXISTS return_reason text;
      ALTER TABLE exam_attendance_records ADD COLUMN IF NOT EXISTS locked_at timestamptz;
      ALTER TABLE exam_attendance_records ADD COLUMN IF NOT EXISTS locked_by_user_id uuid;
      CREATE INDEX IF NOT EXISTS ix_exam_mark_versions_mark
        ON exam_mark_versions (tenant_id, mark_id, created_at DESC);
      CREATE INDEX IF NOT EXISTS ix_exam_mark_import_batches_history
        ON exam_mark_import_batches (tenant_id, imported_at DESC);
      CREATE INDEX IF NOT EXISTS ix_exam_mark_import_batch_items_batch
        ON exam_mark_import_batch_items (tenant_id, batch_id, row_number);
      CREATE INDEX IF NOT EXISTS ix_report_card_generation_batches_status
        ON report_card_generation_batches (tenant_id, status, created_at DESC);
      CREATE INDEX IF NOT EXISTS ix_exam_result_snapshots_batch_rank
        ON exam_result_snapshots (tenant_id, batch_id, class_rank, student_id);
      CREATE INDEX IF NOT EXISTS ix_report_card_artifacts_report_card
        ON report_card_artifacts (tenant_id, report_card_id, generated_at DESC);
      CREATE INDEX IF NOT EXISTS ix_exam_grading_policies_effective
        ON exam_grading_policies (
          tenant_id, exam_series_id, status, effective_from DESC NULLS LAST, version DESC
        );
      CREATE INDEX IF NOT EXISTS ix_academic_interventions_student
        ON academic_interventions (tenant_id, student_id, status, created_at DESC);
      CREATE INDEX IF NOT EXISTS ix_academic_interventions_owner
        ON academic_interventions (tenant_id, owner_user_id, status, due_on);
      CREATE INDEX IF NOT EXISTS ix_academic_intervention_updates_history
        ON academic_intervention_updates (tenant_id, intervention_id, recorded_at DESC);
      ALTER TABLE exam_series DROP CONSTRAINT IF EXISTS ck_exam_series_status;
      ALTER TABLE exam_series ADD CONSTRAINT ck_exam_series_status CHECK (status IN ('draft', 'submitted', 'reviewed', 'locked', 'published', 'archived'));
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
      ALTER TABLE exam_mark_import_batches ENABLE ROW LEVEL SECURITY;
      ALTER TABLE exam_mark_import_batches FORCE ROW LEVEL SECURITY;
      ALTER TABLE exam_mark_import_batch_items ENABLE ROW LEVEL SECURITY;
      ALTER TABLE exam_mark_import_batch_items FORCE ROW LEVEL SECURITY;
      ALTER TABLE student_report_cards ENABLE ROW LEVEL SECURITY;
      ALTER TABLE student_report_cards FORCE ROW LEVEL SECURITY;
      ALTER TABLE report_card_generation_batches ENABLE ROW LEVEL SECURITY;
      ALTER TABLE report_card_generation_batches FORCE ROW LEVEL SECURITY;
      ALTER TABLE exam_result_snapshots ENABLE ROW LEVEL SECURITY;
      ALTER TABLE exam_result_snapshots FORCE ROW LEVEL SECURITY;
      ALTER TABLE report_card_artifacts ENABLE ROW LEVEL SECURITY;
      ALTER TABLE report_card_artifacts FORCE ROW LEVEL SECURITY;
      ALTER TABLE student_report_card_audit_logs ENABLE ROW LEVEL SECURITY;
      ALTER TABLE student_report_card_audit_logs FORCE ROW LEVEL SECURITY;
      ALTER TABLE exam_mark_audit_logs ENABLE ROW LEVEL SECURITY;
      ALTER TABLE exam_mark_audit_logs FORCE ROW LEVEL SECURITY;
      ALTER TABLE exam_settings ENABLE ROW LEVEL SECURITY;
      ALTER TABLE exam_settings FORCE ROW LEVEL SECURITY;
      ALTER TABLE exam_settings_audit_logs ENABLE ROW LEVEL SECURITY;
      ALTER TABLE exam_settings_audit_logs FORCE ROW LEVEL SECURITY;
      ALTER TABLE exam_timetable_slots ENABLE ROW LEVEL SECURITY;
      ALTER TABLE exam_timetable_slots FORCE ROW LEVEL SECURITY;
      ALTER TABLE exam_invigilators ENABLE ROW LEVEL SECURITY;
      ALTER TABLE exam_invigilators FORCE ROW LEVEL SECURITY;
      ALTER TABLE exam_attendance_records ENABLE ROW LEVEL SECURITY;
      ALTER TABLE exam_attendance_records FORCE ROW LEVEL SECURITY;
      ALTER TABLE exam_student_cases ENABLE ROW LEVEL SECURITY;
      ALTER TABLE exam_student_cases FORCE ROW LEVEL SECURITY;
      ALTER TABLE academic_interventions ENABLE ROW LEVEL SECURITY;
      ALTER TABLE academic_interventions FORCE ROW LEVEL SECURITY;
      ALTER TABLE academic_intervention_updates ENABLE ROW LEVEL SECURITY;
      ALTER TABLE academic_intervention_updates FORCE ROW LEVEL SECURITY;

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

      DROP POLICY IF EXISTS exam_mark_import_batches_tenant_policy ON exam_mark_import_batches;
      CREATE POLICY exam_mark_import_batches_tenant_policy ON exam_mark_import_batches
      FOR ALL USING (tenant_id = current_setting('app.tenant_id', true))
      WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

      DROP POLICY IF EXISTS exam_mark_import_batch_items_tenant_policy ON exam_mark_import_batch_items;
      CREATE POLICY exam_mark_import_batch_items_tenant_policy ON exam_mark_import_batch_items
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

      DROP POLICY IF EXISTS exam_result_snapshots_tenant_policy ON exam_result_snapshots;
      CREATE POLICY exam_result_snapshots_tenant_policy ON exam_result_snapshots
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

      DROP POLICY IF EXISTS exam_settings_tenant_policy ON exam_settings;
      CREATE POLICY exam_settings_tenant_policy ON exam_settings
      FOR ALL USING (tenant_id = current_setting('app.tenant_id', true))
      WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

      DROP POLICY IF EXISTS exam_settings_audit_logs_tenant_policy ON exam_settings_audit_logs;
      CREATE POLICY exam_settings_audit_logs_tenant_policy ON exam_settings_audit_logs
      FOR ALL USING (tenant_id = current_setting('app.tenant_id', true))
      WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

      DROP POLICY IF EXISTS exam_timetable_slots_tenant_policy ON exam_timetable_slots;
      CREATE POLICY exam_timetable_slots_tenant_policy ON exam_timetable_slots
      FOR ALL USING (tenant_id = current_setting('app.tenant_id', true))
      WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

      DROP POLICY IF EXISTS exam_invigilators_tenant_policy ON exam_invigilators;
      CREATE POLICY exam_invigilators_tenant_policy ON exam_invigilators
      FOR ALL USING (tenant_id = current_setting('app.tenant_id', true))
      WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

      DROP POLICY IF EXISTS exam_attendance_records_tenant_policy ON exam_attendance_records;
      CREATE POLICY exam_attendance_records_tenant_policy ON exam_attendance_records
      FOR ALL USING (tenant_id = current_setting('app.tenant_id', true))
      WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

      DROP POLICY IF EXISTS exam_student_cases_tenant_policy ON exam_student_cases;
      CREATE POLICY exam_student_cases_tenant_policy ON exam_student_cases
      FOR ALL USING (tenant_id = current_setting('app.tenant_id', true))
      WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

      DROP POLICY IF EXISTS academic_interventions_tenant_policy ON academic_interventions;
      CREATE POLICY academic_interventions_tenant_policy ON academic_interventions
      FOR ALL USING (tenant_id = current_setting('app.tenant_id', true))
      WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

      DROP POLICY IF EXISTS academic_intervention_updates_tenant_policy ON academic_intervention_updates;
      CREATE POLICY academic_intervention_updates_tenant_policy ON academic_intervention_updates
      FOR ALL USING (tenant_id = current_setting('app.tenant_id', true))
      WITH CHECK (tenant_id = current_setting('app.tenant_id', true));
    `);

    this.logger.log('Exams schema and RLS policies verified');
  }
}
