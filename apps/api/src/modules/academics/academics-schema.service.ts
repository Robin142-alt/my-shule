import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class AcademicsSchemaService implements OnModuleInit {

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

  private readonly logger = new Logger(AcademicsSchemaService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit(): Promise<void> {
    await this.prisma.runSchemaBootstrap(`
      CREATE EXTENSION IF NOT EXISTS pgcrypto;

      CREATE TABLE IF NOT EXISTS academic_years (
        id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
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

      ALTER TABLE academic_years ADD COLUMN IF NOT EXISTS tenant_id text;
      ALTER TABLE academic_years ADD COLUMN IF NOT EXISTS school_id text;
      UPDATE academic_years
      SET tenant_id = COALESCE(NULLIF(tenant_id, ''), school_id::text, 'global')
      WHERE tenant_id IS NULL OR btrim(tenant_id) = '';
      ALTER TABLE academic_years ALTER COLUMN tenant_id SET DEFAULT 'global';
      ALTER TABLE academic_years ALTER COLUMN tenant_id SET NOT NULL;
      ALTER TABLE academic_years ADD COLUMN IF NOT EXISTS start_date date;
      ALTER TABLE academic_years ADD COLUMN IF NOT EXISTS end_date date;
      ALTER TABLE academic_years ADD COLUMN IF NOT EXISTS starts_on date;
      UPDATE academic_years SET starts_on = start_date WHERE starts_on IS NULL AND start_date IS NOT NULL;
      UPDATE academic_years SET starts_on = CURRENT_DATE WHERE starts_on IS NULL;
      ALTER TABLE academic_years ALTER COLUMN starts_on SET NOT NULL;
      ALTER TABLE academic_years ADD COLUMN IF NOT EXISTS ends_on date;
      UPDATE academic_years SET ends_on = end_date WHERE ends_on IS NULL AND end_date IS NOT NULL;
      UPDATE academic_years SET ends_on = starts_on WHERE ends_on IS NULL;
      ALTER TABLE academic_years ALTER COLUMN ends_on SET NOT NULL;
      ALTER TABLE academic_years ADD COLUMN IF NOT EXISTS created_by_user_id uuid;
      ALTER TABLE academic_years ALTER COLUMN status TYPE text USING status::text;
      ALTER TABLE academic_years ALTER COLUMN status SET DEFAULT 'draft';
      ALTER TABLE academic_years ALTER COLUMN updated_at SET DEFAULT NOW();
      ALTER TABLE academic_years ALTER COLUMN school_id DROP NOT NULL;
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_academic_years_tenant_id_id') THEN
          ALTER TABLE academic_years ADD CONSTRAINT uq_academic_years_tenant_id_id UNIQUE (tenant_id, id);
        END IF;
      END $$;

      CREATE TABLE IF NOT EXISTS academic_terms (
        id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
        tenant_id text NOT NULL,
        academic_year_id text NOT NULL,
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
        id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
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

      ALTER TABLE academic_levels ADD COLUMN IF NOT EXISTS tenant_id text;
      ALTER TABLE academic_levels ADD COLUMN IF NOT EXISTS school_id text;
      UPDATE academic_levels
      SET tenant_id = COALESCE(NULLIF(tenant_id, ''), school_id::text, 'global')
      WHERE tenant_id IS NULL OR btrim(tenant_id) = '';
      ALTER TABLE academic_levels ALTER COLUMN tenant_id SET DEFAULT 'global';
      ALTER TABLE academic_levels ALTER COLUMN tenant_id SET NOT NULL;
      ALTER TABLE academic_levels ADD COLUMN IF NOT EXISTS audit_log_reference uuid;
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_academic_levels_tenant_id_id') THEN
          ALTER TABLE academic_levels ADD CONSTRAINT uq_academic_levels_tenant_id_id UNIQUE (tenant_id, id);
        END IF;
      END $$;

      CREATE TABLE IF NOT EXISTS class_sections (
        id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
        tenant_id text NOT NULL,
        academic_year_id text NOT NULL,
        academic_level_id text,
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

      ALTER TABLE class_sections ADD COLUMN IF NOT EXISTS academic_level_id text;
      ALTER TABLE class_sections ADD COLUMN IF NOT EXISTS custom_label text;
      ALTER TABLE class_sections ADD COLUMN IF NOT EXISTS capacity integer;
      ALTER TABLE class_sections ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;
      ALTER TABLE class_sections ADD COLUMN IF NOT EXISTS tenant_id text;
      ALTER TABLE class_sections ADD COLUMN IF NOT EXISTS school_id text;
      UPDATE class_sections
      SET tenant_id = COALESCE(NULLIF(tenant_id, ''), school_id::text, 'global')
      WHERE tenant_id IS NULL OR btrim(tenant_id) = '';
      ALTER TABLE class_sections ALTER COLUMN tenant_id SET DEFAULT 'global';
      ALTER TABLE class_sections ALTER COLUMN tenant_id SET NOT NULL;
      ALTER TABLE class_sections ALTER COLUMN academic_year_id TYPE text USING academic_year_id::text;
      ALTER TABLE class_sections ALTER COLUMN academic_level_id TYPE text USING academic_level_id::text;
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_class_sections_tenant_id_id') THEN
          ALTER TABLE class_sections ADD CONSTRAINT uq_class_sections_tenant_id_id UNIQUE (tenant_id, id);
        END IF;
      END $$;

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
        id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
        tenant_id text NOT NULL,
        class_section_id text NOT NULL,
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
        id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
        tenant_id text NOT NULL,
        student_id text NOT NULL,
        class_section_id text NOT NULL,
        stream_id text,
        academic_level_id text NOT NULL,
        academic_year_id text NOT NULL,
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

      ALTER TABLE student_class_assignments ADD COLUMN IF NOT EXISTS tenant_id text;
      ALTER TABLE student_class_assignments ADD COLUMN IF NOT EXISTS school_id text;
      UPDATE student_class_assignments
      SET tenant_id = COALESCE(NULLIF(tenant_id, ''), school_id::text, 'global')
      WHERE tenant_id IS NULL OR btrim(tenant_id) = '';
      ALTER TABLE student_class_assignments ALTER COLUMN tenant_id SET DEFAULT 'global';
      ALTER TABLE student_class_assignments ALTER COLUMN tenant_id SET NOT NULL;
      ALTER TABLE student_class_assignments ALTER COLUMN student_id TYPE text USING student_id::text;
      ALTER TABLE student_class_assignments ALTER COLUMN class_section_id TYPE text USING class_section_id::text;
      ALTER TABLE student_class_assignments ALTER COLUMN stream_id TYPE text USING stream_id::text;
      ALTER TABLE student_class_assignments ALTER COLUMN academic_level_id TYPE text USING academic_level_id::text;
      ALTER TABLE student_class_assignments ALTER COLUMN academic_year_id TYPE text USING academic_year_id::text;
      ALTER TABLE student_class_assignments ALTER COLUMN status TYPE text USING status::text;
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_student_class_assignments_tenant_id_id') THEN
          ALTER TABLE student_class_assignments ADD CONSTRAINT uq_student_class_assignments_tenant_id_id UNIQUE (tenant_id, id);
        END IF;
      END $$;

      CREATE UNIQUE INDEX IF NOT EXISTS ux_student_class_assignments_active_year
        ON student_class_assignments (tenant_id, student_id, academic_year_id)
        WHERE status = 'active';

      CREATE TABLE IF NOT EXISTS subjects (
        id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
        tenant_id text NOT NULL,
        code text NOT NULL,
        name text NOT NULL,
        department_id uuid,
        status text NOT NULL DEFAULT 'active',
        created_by_user_id uuid,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_subjects_tenant_id_id UNIQUE (tenant_id, id),
        CONSTRAINT uq_subjects_tenant_code UNIQUE (tenant_id, code)
      );

      CREATE TABLE IF NOT EXISTS academics_departments (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        name text NOT NULL,
        head_of_department_user_id uuid,
        is_active boolean NOT NULL DEFAULT true,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_academics_departments_tenant_name UNIQUE (tenant_id, name)
      );

      CREATE TABLE IF NOT EXISTS academics_class_teachers (
        id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
        school_id text NOT NULL,
        tenant_id text,
        academic_year_id text NOT NULL,
        class_section_id text NOT NULL,
        teacher_user_id uuid NOT NULL,
        is_active boolean NOT NULL DEFAULT true,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW()
      );

      ALTER TABLE academics_class_teachers ADD COLUMN IF NOT EXISTS tenant_id text;
      ALTER TABLE academics_class_teachers ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;
      UPDATE academics_class_teachers assignment
      SET tenant_id = school.slug
      FROM schools school
      WHERE (assignment.tenant_id IS NULL OR btrim(assignment.tenant_id) = '')
        AND assignment.school_id::text = school.id::text;
      UPDATE academics_class_teachers
      SET tenant_id = 'global'
      WHERE tenant_id IS NULL OR btrim(tenant_id) = '';
      ALTER TABLE academics_class_teachers ALTER COLUMN tenant_id SET NOT NULL;

      WITH duplicate_assignments AS (
        SELECT id,
          ROW_NUMBER() OVER (
            PARTITION BY tenant_id, academic_year_id, class_section_id, teacher_user_id
            ORDER BY updated_at DESC, created_at DESC, id DESC
          ) AS duplicate_rank
        FROM academics_class_teachers
        WHERE is_active = true
      )
      UPDATE academics_class_teachers assignment
      SET is_active = false, updated_at = NOW()
      FROM duplicate_assignments duplicate
      WHERE assignment.id = duplicate.id
        AND duplicate.duplicate_rank > 1;

      CREATE UNIQUE INDEX IF NOT EXISTS ux_academics_class_teachers_scope
        ON academics_class_teachers (tenant_id, academic_year_id, class_section_id, teacher_user_id)
        WHERE is_active = true;

      CREATE TABLE IF NOT EXISTS class_subject_assignments (
        id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
        tenant_id text NOT NULL,
        academic_term_id text NOT NULL,
        class_section_id text NOT NULL,
        subject_id text NOT NULL,
        created_by_user_id uuid,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_class_subject_assignments_tenant_id_id UNIQUE (tenant_id, id),
        CONSTRAINT uq_class_subject_assignments_scope UNIQUE (tenant_id, academic_term_id, class_section_id, subject_id)
      );

      CREATE TABLE IF NOT EXISTS teacher_subject_assignments (
        id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
        tenant_id text NOT NULL,
        academic_term_id text NOT NULL,
        class_section_id text NOT NULL,
        subject_id text NOT NULL,
        teacher_user_id text NOT NULL,
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

      DO $$
      DECLARE
        target_table text;
        policy_record record;
      BEGIN
        FOREACH target_table IN ARRAY ARRAY[
          'subjects',
          'class_subject_assignments',
          'teacher_subject_assignments'
        ] LOOP
          IF to_regclass(format('public.%I', target_table)) IS NOT NULL THEN
            EXECUTE format('ALTER TABLE %I DISABLE ROW LEVEL SECURITY', target_table);
            FOR policy_record IN
              SELECT policyname
              FROM pg_policies
              WHERE schemaname = 'public'
                AND tablename = target_table
            LOOP
              EXECUTE format('DROP POLICY IF EXISTS %I ON %I', policy_record.policyname, target_table);
            END LOOP;

            EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS tenant_id text', target_table);
            EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS school_id text', target_table);
            EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS academic_term_id text', target_table);
            EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS class_section_id text', target_table);
            EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS subject_id text', target_table);
            IF target_table = 'teacher_subject_assignments' THEN
              EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS teacher_user_id text', target_table);
            END IF;
            EXECUTE format(
              'UPDATE %I SET tenant_id = COALESCE(NULLIF(tenant_id, ''''), school_id::text, ''global'') WHERE tenant_id IS NULL OR btrim(tenant_id) = ''''',
              target_table
            );
            EXECUTE format('ALTER TABLE %I ALTER COLUMN tenant_id SET DEFAULT ''global''', target_table);
            EXECUTE format('ALTER TABLE %I ALTER COLUMN tenant_id SET NOT NULL', target_table);

            IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = target_table AND column_name = 'academic_term_id') THEN
              EXECUTE format('ALTER TABLE %I ALTER COLUMN academic_term_id TYPE text USING academic_term_id::text', target_table);
            END IF;
            IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = target_table AND column_name = 'class_section_id') THEN
              EXECUTE format('ALTER TABLE %I ALTER COLUMN class_section_id TYPE text USING class_section_id::text', target_table);
            END IF;
            IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = target_table AND column_name = 'subject_id') THEN
              EXECUTE format('ALTER TABLE %I ALTER COLUMN subject_id TYPE text USING subject_id::text', target_table);
            END IF;
            IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = target_table AND column_name = 'teacher_user_id') THEN
              EXECUTE format('ALTER TABLE %I ALTER COLUMN teacher_user_id TYPE text USING teacher_user_id::text', target_table);
            END IF;
            IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = target_table AND column_name = 'status') THEN
              EXECUTE format('ALTER TABLE %I ALTER COLUMN status TYPE text USING status::text', target_table);
            END IF;
            IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = format('uq_%s_tenant_id_id', target_table)) THEN
              EXECUTE format('ALTER TABLE %I ADD CONSTRAINT %I UNIQUE (tenant_id, id)', target_table, format('uq_%s_tenant_id_id', target_table));
            END IF;
          END IF;
        END LOOP;
      END $$;

      CREATE TABLE IF NOT EXISTS report_card_comments (
        id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
        tenant_id text NOT NULL,
        student_id text NOT NULL,
        academic_term_id text NOT NULL,
        class_section_id text NOT NULL,
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
        id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
        tenant_id text NOT NULL,
        student_id text NOT NULL,
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
        id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
        tenant_id text NOT NULL,
        student_id text NOT NULL,
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
        id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
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

      DO $$
      DECLARE
        target_table text;
        policy_record record;
      BEGIN
        FOREACH target_table IN ARRAY ARRAY[
          'report_card_comments',
          'student_notes',
          'parent_meetings',
          'class_requests'
        ] LOOP
          IF to_regclass(format('public.%I', target_table)) IS NOT NULL THEN
            EXECUTE format('ALTER TABLE %I DISABLE ROW LEVEL SECURITY', target_table);
            FOR policy_record IN
              SELECT policyname
              FROM pg_policies
              WHERE schemaname = 'public'
                AND tablename = target_table
            LOOP
              EXECUTE format('DROP POLICY IF EXISTS %I ON %I', policy_record.policyname, target_table);
            END LOOP;
            EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS tenant_id text', target_table);
            EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS school_id text', target_table);
            EXECUTE format(
              'UPDATE %I SET tenant_id = COALESCE(NULLIF(tenant_id, ''''), school_id::text, ''global'') WHERE tenant_id IS NULL OR btrim(tenant_id) = ''''',
              target_table
            );
            EXECUTE format('ALTER TABLE %I ALTER COLUMN tenant_id SET DEFAULT ''global''', target_table);
            EXECUTE format('ALTER TABLE %I ALTER COLUMN tenant_id SET NOT NULL', target_table);

            IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = target_table AND column_name = 'student_id') THEN
              EXECUTE format('ALTER TABLE %I ALTER COLUMN student_id TYPE text USING student_id::text', target_table);
            END IF;
            IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = target_table AND column_name = 'academic_term_id') THEN
              EXECUTE format('ALTER TABLE %I ALTER COLUMN academic_term_id TYPE text USING academic_term_id::text', target_table);
            END IF;
            IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = target_table AND column_name = 'class_section_id') THEN
              EXECUTE format('ALTER TABLE %I ALTER COLUMN class_section_id TYPE text USING class_section_id::text', target_table);
            END IF;
            IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = format('uq_%s_tenant_id_id', target_table)) THEN
              EXECUTE format('ALTER TABLE %I ADD CONSTRAINT %I UNIQUE (tenant_id, id)', target_table, format('uq_%s_tenant_id_id', target_table));
            END IF;
          END IF;
        END LOOP;
      END $$;

      CREATE INDEX IF NOT EXISTS ix_report_card_comments_term ON report_card_comments (tenant_id, academic_term_id, class_section_id);

      CREATE TABLE IF NOT EXISTS academic_audit_logs (
        id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
        tenant_id text NOT NULL,
        entity_type text NOT NULL,
        entity_id uuid,
        action text NOT NULL,
        actor_user_id uuid,
        metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
        created_at timestamptz NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS academics_grading_systems (
        id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
        tenant_id text NOT NULL,
        name text NOT NULL,
        description text,
        is_active boolean NOT NULL DEFAULT TRUE,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_academics_grading_systems_tenant_name UNIQUE (tenant_id, name)
      );

      CREATE TABLE IF NOT EXISTS academics_attendance_settings (
        id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
        tenant_id text NOT NULL,
        name text NOT NULL,
        description text,
        is_active boolean NOT NULL DEFAULT TRUE,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_academics_attendance_settings_tenant_name UNIQUE (tenant_id, name)
      );

      CREATE TABLE IF NOT EXISTS academics_report_card_settings (
        id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
        tenant_id text NOT NULL,
        school_id text NOT NULL,
        name text NOT NULL,
        grading_system_id uuid,
        show_rank boolean NOT NULL DEFAULT TRUE,
        show_attendance boolean NOT NULL DEFAULT TRUE,
        is_active boolean NOT NULL DEFAULT TRUE,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW()
      );
      ALTER TABLE academics_report_card_settings ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT TRUE;
      ALTER TABLE academics_report_card_settings ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT NOW();

      DO $$
      DECLARE
        target_table text;
        policy_record record;
      BEGIN
        FOREACH target_table IN ARRAY ARRAY[
          'academic_audit_logs',
          'academics_grading_systems',
          'academics_attendance_settings',
          'academics_report_card_settings'
        ] LOOP
          IF to_regclass(format('public.%I', target_table)) IS NOT NULL THEN
            EXECUTE format('ALTER TABLE %I DISABLE ROW LEVEL SECURITY', target_table);
            FOR policy_record IN
              SELECT policyname
              FROM pg_policies
              WHERE schemaname = 'public'
                AND tablename = target_table
            LOOP
              EXECUTE format('DROP POLICY IF EXISTS %I ON %I', policy_record.policyname, target_table);
            END LOOP;

            EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS tenant_id text', target_table);
            EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS school_id text', target_table);
            EXECUTE format(
              'UPDATE %I SET tenant_id = COALESCE(NULLIF(tenant_id, ''''), school_id::text, ''global'') WHERE tenant_id IS NULL OR btrim(tenant_id) = ''''',
              target_table
            );
            EXECUTE format('ALTER TABLE %I ALTER COLUMN tenant_id SET DEFAULT ''global''', target_table);
            EXECUTE format('ALTER TABLE %I ALTER COLUMN tenant_id SET NOT NULL', target_table);
          END IF;
        END LOOP;
      END $$;

      -- Active schools live in tenants; these foreign keys still reference the
      -- retired schools registry and reject otherwise valid tenant-scoped writes.
      ALTER TABLE academic_audit_logs DROP CONSTRAINT IF EXISTS academic_audit_logs_school_id_fkey;
      ALTER TABLE academics_grading_systems DROP CONSTRAINT IF EXISTS academics_grading_systems_school_id_fkey;
      ALTER TABLE academics_attendance_settings DROP CONSTRAINT IF EXISTS academics_attendance_settings_school_id_fkey;
      ALTER TABLE academics_report_card_settings DROP CONSTRAINT IF EXISTS academics_report_card_settings_school_id_fkey;

      UPDATE academic_audit_logs SET school_id = tenant_id
      WHERE school_id IS NULL OR btrim(school_id) = '';
      UPDATE academics_grading_systems SET school_id = tenant_id
      WHERE school_id IS NULL OR btrim(school_id) = '';
      UPDATE academics_attendance_settings SET school_id = tenant_id
      WHERE school_id IS NULL OR btrim(school_id) = '';
      UPDATE academics_report_card_settings SET school_id = tenant_id
      WHERE school_id IS NULL OR btrim(school_id) = '';
      ALTER TABLE academic_audit_logs ALTER COLUMN school_id SET NOT NULL;
      ALTER TABLE academics_grading_systems ALTER COLUMN school_id SET NOT NULL;
      ALTER TABLE academics_attendance_settings ALTER COLUMN school_id SET NOT NULL;
      ALTER TABLE academics_report_card_settings ALTER COLUMN school_id SET NOT NULL;

      CREATE UNIQUE INDEX IF NOT EXISTS uq_academic_years_tenant_name
        ON academic_years (tenant_id, name);
      CREATE UNIQUE INDEX IF NOT EXISTS uq_academics_grading_systems_tenant_name
        ON academics_grading_systems (tenant_id, name);
      CREATE UNIQUE INDEX IF NOT EXISTS uq_academics_attendance_settings_tenant_name
        ON academics_attendance_settings (tenant_id, name);
      CREATE UNIQUE INDEX IF NOT EXISTS uq_academics_report_card_settings_tenant_name
        ON academics_report_card_settings (tenant_id, name);

      ALTER TABLE academics_class_teachers DROP CONSTRAINT IF EXISTS academics_class_teachers_class_section_id_fkey;
      ALTER TABLE academics_class_teachers DROP CONSTRAINT IF EXISTS academics_class_teachers_school_id_fkey;
      WITH ranked_class_teachers AS (
        SELECT id,
          ROW_NUMBER() OVER (
            PARTITION BY tenant_id, academic_year_id, class_section_id
            ORDER BY updated_at DESC, created_at DESC, id DESC
          ) AS assignment_rank
        FROM academics_class_teachers
        WHERE is_active = true
      )
      UPDATE academics_class_teachers assignment
      SET is_active = false, updated_at = NOW()
      FROM ranked_class_teachers ranked
      WHERE assignment.id = ranked.id AND ranked.assignment_rank > 1;
      DROP INDEX IF EXISTS ux_academics_class_teachers_scope;
      CREATE UNIQUE INDEX ux_academics_class_teachers_scope
        ON academics_class_teachers (tenant_id, academic_year_id, class_section_id)
        WHERE is_active = true;

      CREATE UNIQUE INDEX IF NOT EXISTS uq_teacher_subject_assignments_scope
        ON teacher_subject_assignments (
          tenant_id, academic_term_id, class_section_id, subject_id, teacher_user_id
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
      ALTER TABLE subjects ADD COLUMN IF NOT EXISTS department_id uuid;
      ALTER TABLE subjects ADD COLUMN IF NOT EXISTS created_by_user_id uuid;
      ALTER TABLE teacher_subject_assignments ADD COLUMN IF NOT EXISTS created_by_user_id uuid;
      CREATE INDEX IF NOT EXISTS ix_subjects_department
        ON subjects (tenant_id, department_id, name);
      CREATE INDEX IF NOT EXISTS ix_academics_departments_tenant_active
        ON academics_departments (tenant_id, is_active, name);

      ALTER TABLE academic_levels ALTER COLUMN school_id DROP NOT NULL;
      ALTER TABLE academic_levels ALTER COLUMN updated_at SET DEFAULT NOW();
      ALTER TABLE subjects ALTER COLUMN school_id DROP NOT NULL;
      ALTER TABLE subjects ALTER COLUMN status SET DEFAULT 'active';
      ALTER TABLE subjects ALTER COLUMN updated_at SET DEFAULT NOW();
      ALTER TABLE subjects DROP CONSTRAINT IF EXISTS subjects_department_id_fkey;
      ALTER TABLE teacher_subject_assignments ALTER COLUMN school_id DROP NOT NULL;
      ALTER TABLE teacher_subject_assignments ALTER COLUMN status SET DEFAULT 'active';
      ALTER TABLE teacher_subject_assignments ALTER COLUMN updated_at SET DEFAULT NOW();
      ALTER TABLE academics_class_teachers ALTER COLUMN school_id DROP NOT NULL;
      ALTER TABLE academics_class_teachers ALTER COLUMN updated_at SET DEFAULT NOW();

      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'subjects' AND column_name = 'curriculum_type'
        ) THEN
          ALTER TABLE subjects ALTER COLUMN curriculum_type DROP NOT NULL;
        END IF;

        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'teacher_subject_assignments' AND column_name = 'academic_year_id'
        ) THEN
          ALTER TABLE teacher_subject_assignments ALTER COLUMN academic_year_id DROP NOT NULL;
        END IF;

        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'teacher_subject_assignments' AND column_name = 'class_id'
        ) THEN
          ALTER TABLE teacher_subject_assignments ALTER COLUMN class_id DROP NOT NULL;
        END IF;

        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'teacher_subject_assignments' AND column_name = 'assigned_by_user_id'
        ) THEN
          ALTER TABLE teacher_subject_assignments ALTER COLUMN assigned_by_user_id DROP NOT NULL;
        END IF;
      END $$;

      DO $$
      DECLARE
        target_table text;
        id_data_type text;
      BEGIN
        FOREACH target_table IN ARRAY ARRAY[
          'academic_years',
          'academic_terms',
          'academic_levels',
          'class_sections',
          'class_streams',
          'student_class_assignments',
          'subjects',
          'academics_departments',
          'academics_class_teachers',
          'class_subject_assignments',
          'teacher_subject_assignments',
          'report_card_comments',
          'student_notes',
          'parent_meetings',
          'class_requests',
          'academic_audit_logs',
          'academics_grading_systems',
          'academics_attendance_settings',
          'academics_report_card_settings'
        ] LOOP
          IF to_regclass(format('public.%I', target_table)) IS NOT NULL THEN
            SELECT data_type
            INTO id_data_type
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = target_table
              AND column_name = 'id';

            IF id_data_type = 'uuid' THEN
              EXECUTE format(
                'ALTER TABLE %I ALTER COLUMN id SET DEFAULT gen_random_uuid()',
                target_table
              );
            ELSIF id_data_type IN ('text', 'character varying', 'character') THEN
              EXECUTE format(
                'ALTER TABLE %I ALTER COLUMN id SET DEFAULT gen_random_uuid()::text',
                target_table
              );
            END IF;
          END IF;
        END LOOP;
      END $$;


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
      ALTER TABLE academics_departments ENABLE ROW LEVEL SECURITY;
      ALTER TABLE academics_departments FORCE ROW LEVEL SECURITY;
      ALTER TABLE academics_class_teachers ENABLE ROW LEVEL SECURITY;
      ALTER TABLE academics_class_teachers FORCE ROW LEVEL SECURITY;

      ALTER TABLE academics_grading_systems ENABLE ROW LEVEL SECURITY;
      ALTER TABLE academics_grading_systems FORCE ROW LEVEL SECURITY;

      ALTER TABLE academics_attendance_settings ENABLE ROW LEVEL SECURITY;
      ALTER TABLE academics_attendance_settings FORCE ROW LEVEL SECURITY;

      ALTER TABLE academics_report_card_settings ENABLE ROW LEVEL SECURITY;
      ALTER TABLE academics_report_card_settings FORCE ROW LEVEL SECURITY;

      DROP POLICY IF EXISTS academics_grading_systems_rls_policy ON academics_grading_systems;
      CREATE POLICY academics_grading_systems_rls_policy ON academics_grading_systems
      FOR ALL USING (tenant_id = current_setting('app.tenant_id', true))
      WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

      DROP POLICY IF EXISTS academics_attendance_settings_rls_policy ON academics_attendance_settings;
      CREATE POLICY academics_attendance_settings_rls_policy ON academics_attendance_settings
      FOR ALL USING (tenant_id = current_setting('app.tenant_id', true))
      WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

      DROP POLICY IF EXISTS academics_report_card_settings_rls_policy ON academics_report_card_settings;
      CREATE POLICY academics_report_card_settings_rls_policy ON academics_report_card_settings
      FOR ALL USING (
        tenant_id = current_setting('app.tenant_id', true)
        OR NULLIF(current_setting('app.role', true), '') = 'system'
      )
      WITH CHECK (
        tenant_id = current_setting('app.tenant_id', true)
        OR NULLIF(current_setting('app.role', true), '') = 'system'
      );

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

      DROP POLICY IF EXISTS academics_departments_tenant_policy ON academics_departments;
      CREATE POLICY academics_departments_tenant_policy ON academics_departments
      FOR ALL USING (
        tenant_id = current_setting('app.tenant_id', true)
        OR NULLIF(current_setting('app.role', true), '') = 'system'
      )
      WITH CHECK (
        tenant_id = current_setting('app.tenant_id', true)
        OR NULLIF(current_setting('app.role', true), '') = 'system'
      );

      DROP POLICY IF EXISTS academics_class_teachers_tenant_policy ON academics_class_teachers;
      CREATE POLICY academics_class_teachers_tenant_policy ON academics_class_teachers
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
