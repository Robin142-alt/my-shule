import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service';

/**
 * Additive bootstrap for the canonical timetable store.
 *
 * MyShule still has older timetable-shaped tables.  This service deliberately
 * does not guess academic year/term ownership while importing those rows.  It
 * adds provenance columns so a controlled migration can import them without
 * weakening the canonical tenant/version contract.
 */
@Injectable()
export class TimetableSchemaService implements OnModuleInit {
  private readonly logger = new Logger(TimetableSchemaService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit(): Promise<void> {
    await this.prisma.runSchemaBootstrap(`
      CREATE EXTENSION IF NOT EXISTS pgcrypto;

      CREATE TABLE IF NOT EXISTS timetable_versions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        academic_year text NOT NULL,
        term_name text NOT NULL,
        revision_number integer NOT NULL DEFAULT 1,
        source_version_id uuid,
        status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
        immutable boolean NOT NULL DEFAULT FALSE,
        row_version integer NOT NULL DEFAULT 1,
        notes text,
        configuration_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
        generation_summary jsonb NOT NULL DEFAULT '{}'::jsonb,
        source_kind text NOT NULL DEFAULT 'canonical',
        published_by_user_id uuid,
        published_at timestamptz,
        created_by_user_id uuid,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW()
      );

      ALTER TABLE timetable_versions ADD COLUMN IF NOT EXISTS revision_number integer NOT NULL DEFAULT 1;
      ALTER TABLE timetable_versions ADD COLUMN IF NOT EXISTS source_version_id uuid;
      ALTER TABLE timetable_versions ADD COLUMN IF NOT EXISTS row_version integer NOT NULL DEFAULT 1;
      ALTER TABLE timetable_versions ADD COLUMN IF NOT EXISTS configuration_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb;
      ALTER TABLE timetable_versions ADD COLUMN IF NOT EXISTS generation_summary jsonb NOT NULL DEFAULT '{}'::jsonb;
      ALTER TABLE timetable_versions ADD COLUMN IF NOT EXISTS source_kind text NOT NULL DEFAULT 'canonical';
      ALTER TABLE timetable_versions ADD COLUMN IF NOT EXISTS created_by_user_id uuid;

      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'timetable_versions'
            AND column_name = 'immutable' AND data_type <> 'boolean'
        ) THEN
          ALTER TABLE timetable_versions
            ALTER COLUMN immutable TYPE boolean
            USING lower(COALESCE(immutable::text, 'false')) IN ('true', 't', '1', 'yes');
        END IF;
      END $$;

      CREATE TABLE IF NOT EXISTS timetable_configurations (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        academic_year text NOT NULL,
        term_name text NOT NULL,
        row_version integer NOT NULL DEFAULT 1,
        created_by_user_id uuid,
        updated_by_user_id uuid,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_timetable_configuration_scope UNIQUE (tenant_id, academic_year, term_name),
        CONSTRAINT uq_timetable_configuration_tenant_id UNIQUE (tenant_id, id)
      );

      ALTER TABLE timetable_configurations ADD COLUMN IF NOT EXISTS school_starts_at time;
      ALTER TABLE timetable_configurations ADD COLUMN IF NOT EXISTS period_types jsonb NOT NULL DEFAULT '[]'::jsonb;

      CREATE TABLE IF NOT EXISTS timetable_days (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        configuration_id uuid NOT NULL,
        day_of_week integer NOT NULL CHECK (day_of_week BETWEEN 1 AND 7),
        name text NOT NULL,
        is_teaching_day boolean NOT NULL DEFAULT TRUE,
        order_index integer NOT NULL DEFAULT 0,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_timetable_days_scope UNIQUE (tenant_id, configuration_id, day_of_week),
        CONSTRAINT uq_timetable_days_tenant_id UNIQUE (tenant_id, id),
        CONSTRAINT fk_timetable_days_configuration FOREIGN KEY (tenant_id, configuration_id)
          REFERENCES timetable_configurations (tenant_id, id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS timetable_period_definitions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        configuration_id uuid NOT NULL,
        day_of_week integer NOT NULL CHECK (day_of_week BETWEEN 1 AND 7),
        name text NOT NULL,
        starts_at time NOT NULL,
        ends_at time NOT NULL,
        period_type text NOT NULL DEFAULT 'lesson',
        is_teaching boolean NOT NULL DEFAULT TRUE,
        order_index integer NOT NULL,
        metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        CONSTRAINT ck_timetable_period_time_order CHECK (starts_at < ends_at),
        CONSTRAINT uq_timetable_period_scope UNIQUE (tenant_id, configuration_id, day_of_week, order_index),
        CONSTRAINT uq_timetable_period_tenant_id UNIQUE (tenant_id, id),
        CONSTRAINT fk_timetable_period_configuration FOREIGN KEY (tenant_id, configuration_id)
          REFERENCES timetable_configurations (tenant_id, id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS timetable_common_blocks (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        configuration_id uuid NOT NULL,
        name text NOT NULL,
        activity_type text NOT NULL DEFAULT 'activity',
        day_of_week integer NOT NULL CHECK (day_of_week BETWEEN 1 AND 7),
        period_id uuid NOT NULL,
        duration_periods integer NOT NULL DEFAULT 1 CHECK (duration_periods >= 1),
        target_scope text NOT NULL DEFAULT 'school' CHECK (target_scope IN ('school', 'grade', 'class', 'stream')),
        target_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
        is_locked boolean NOT NULL DEFAULT TRUE,
        metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
        created_by_user_id uuid,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_timetable_common_block_tenant_id UNIQUE (tenant_id, id),
        CONSTRAINT fk_timetable_common_block_configuration FOREIGN KEY (tenant_id, configuration_id)
          REFERENCES timetable_configurations (tenant_id, id) ON DELETE CASCADE,
        CONSTRAINT fk_timetable_common_block_period FOREIGN KEY (tenant_id, period_id)
          REFERENCES timetable_period_definitions (tenant_id, id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS timetable_resources (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        name text NOT NULL,
        resource_type text NOT NULL DEFAULT 'room',
        capacity integer,
        is_exclusive boolean NOT NULL DEFAULT TRUE,
        status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),
        source_kind text,
        source_record_id text,
        metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
        row_version integer NOT NULL DEFAULT 1,
        created_by_user_id uuid,
        updated_by_user_id uuid,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_timetable_resource_name UNIQUE (tenant_id, name),
        CONSTRAINT uq_timetable_resource_tenant_id UNIQUE (tenant_id, id)
      );

      CREATE TABLE IF NOT EXISTS timetable_subject_requirements (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        academic_year text NOT NULL,
        term_name text NOT NULL,
        class_section_id text NOT NULL,
        stream_id text,
        subject_id text NOT NULL,
        teacher_id text,
        periods_per_week integer NOT NULL CHECK (periods_per_week >= 1),
        duration_periods integer NOT NULL DEFAULT 1 CHECK (duration_periods >= 1),
        resource_id uuid,
        parallel_key text,
        preferred_days jsonb NOT NULL DEFAULT '[]'::jsonb,
        preferred_start_period_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
        status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),
        row_version integer NOT NULL DEFAULT 1,
        created_by_user_id uuid,
        updated_by_user_id uuid,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_timetable_requirement_tenant_id UNIQUE (tenant_id, id),
        CONSTRAINT fk_timetable_requirement_resource FOREIGN KEY (tenant_id, resource_id)
          REFERENCES timetable_resources (tenant_id, id) ON DELETE SET NULL
      );

      CREATE TABLE IF NOT EXISTS timetable_teacher_availability (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        academic_year text NOT NULL,
        term_name text NOT NULL,
        teacher_id text NOT NULL,
        day_of_week integer NOT NULL CHECK (day_of_week BETWEEN 1 AND 7),
        period_id uuid NOT NULL,
        state text NOT NULL CHECK (state IN ('available', 'prefer_free', 'unavailable', 'protected')),
        reason text,
        row_version integer NOT NULL DEFAULT 1,
        created_by_user_id uuid,
        updated_by_user_id uuid,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_timetable_availability_scope UNIQUE (
          tenant_id, academic_year, term_name, teacher_id, day_of_week, period_id
        ),
        CONSTRAINT uq_timetable_availability_tenant_id UNIQUE (tenant_id, id),
        CONSTRAINT fk_timetable_availability_period FOREIGN KEY (tenant_id, period_id)
          REFERENCES timetable_period_definitions (tenant_id, id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS timetable_slots (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        version_id uuid REFERENCES timetable_versions(id) ON DELETE SET NULL,
        requirement_id uuid,
        generation_run_id uuid,
        academic_year text NOT NULL,
        term_name text NOT NULL,
        class_section_id text NOT NULL,
        stream_id text,
        subject_id text NOT NULL,
        teacher_id text NOT NULL,
        room_id text,
        resource_id uuid,
        period_id uuid,
        parallel_key text,
        day_of_week integer NOT NULL CHECK (day_of_week BETWEEN 1 AND 7),
        starts_at time NOT NULL,
        ends_at time NOT NULL,
        duration_periods integer NOT NULL DEFAULT 1,
        locked boolean NOT NULL DEFAULT FALSE,
        locked_by_user_id uuid,
        locked_at timestamptz,
        row_version integer NOT NULL DEFAULT 1,
        source_kind text NOT NULL DEFAULT 'canonical',
        source_record_id text,
        status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'cancelled')),
        created_by_user_id uuid,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        CONSTRAINT ck_timetable_slot_time_order CHECK (starts_at < ends_at)
      );

      ALTER TABLE timetable_slots ADD COLUMN IF NOT EXISTS version_id uuid;
      ALTER TABLE timetable_slots ADD COLUMN IF NOT EXISTS requirement_id uuid;
      ALTER TABLE timetable_slots ADD COLUMN IF NOT EXISTS generation_run_id uuid;
      ALTER TABLE timetable_slots ADD COLUMN IF NOT EXISTS stream_id text;
      ALTER TABLE timetable_slots ADD COLUMN IF NOT EXISTS resource_id uuid;
      ALTER TABLE timetable_slots ADD COLUMN IF NOT EXISTS period_id uuid;
      ALTER TABLE timetable_slots ADD COLUMN IF NOT EXISTS parallel_key text;
      ALTER TABLE timetable_slots ADD COLUMN IF NOT EXISTS duration_periods integer NOT NULL DEFAULT 1;
      ALTER TABLE timetable_slots ADD COLUMN IF NOT EXISTS locked boolean NOT NULL DEFAULT FALSE;
      ALTER TABLE timetable_slots ADD COLUMN IF NOT EXISTS locked_by_user_id uuid;
      ALTER TABLE timetable_slots ADD COLUMN IF NOT EXISTS locked_at timestamptz;
      ALTER TABLE timetable_slots ADD COLUMN IF NOT EXISTS row_version integer NOT NULL DEFAULT 1;
      ALTER TABLE timetable_slots ADD COLUMN IF NOT EXISTS source_kind text NOT NULL DEFAULT 'canonical';
      ALTER TABLE timetable_slots ADD COLUMN IF NOT EXISTS source_record_id text;
      ALTER TABLE timetable_slots ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'draft';

      DO $$
      DECLARE target_column text;
      BEGIN
        FOREACH target_column IN ARRAY ARRAY['class_section_id', 'subject_id', 'teacher_id', 'room_id', 'stream_id'] LOOP
          IF EXISTS (
            SELECT 1 FROM information_schema.columns schema_column
            WHERE schema_column.table_schema = 'public' AND schema_column.table_name = 'timetable_slots'
              AND schema_column.column_name = target_column AND schema_column.data_type <> 'text'
          ) THEN
            EXECUTE format(
              'ALTER TABLE timetable_slots ALTER COLUMN %I TYPE text USING %I::text',
              target_column, target_column
            );
          END IF;
        END LOOP;

        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'timetable_slots'
            AND column_name = 'day_of_week' AND data_type <> 'integer'
        ) THEN
          ALTER TABLE timetable_slots ALTER COLUMN day_of_week TYPE integer USING (
            CASE lower(day_of_week::text)
              WHEN 'monday' THEN 1 WHEN 'tuesday' THEN 2 WHEN 'wednesday' THEN 3
              WHEN 'thursday' THEN 4 WHEN 'friday' THEN 5 WHEN 'saturday' THEN 6
              WHEN 'sunday' THEN 7 ELSE day_of_week::text::integer
            END
          );
        END IF;

        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'timetable_slots'
            AND column_name = 'starts_at' AND data_type <> 'time without time zone'
        ) THEN
          ALTER TABLE timetable_slots ALTER COLUMN starts_at TYPE time USING starts_at::time;
        END IF;
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'timetable_slots'
            AND column_name = 'ends_at' AND data_type <> 'time without time zone'
        ) THEN
          ALTER TABLE timetable_slots ALTER COLUMN ends_at TYPE time USING ends_at::time;
        END IF;
      END $$;

      CREATE TABLE IF NOT EXISTS timetable_generation_runs (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        version_id uuid NOT NULL,
        status text NOT NULL CHECK (status IN ('running', 'completed', 'completed_with_gaps', 'failed')),
        scope jsonb NOT NULL DEFAULT '{"type":"school"}'::jsonb,
        required_lessons integer NOT NULL DEFAULT 0,
        scheduled_lessons integer NOT NULL DEFAULT 0,
        unscheduled_lessons integer NOT NULL DEFAULT 0,
        warnings jsonb NOT NULL DEFAULT '[]'::jsonb,
        error_message text,
        created_by_user_id uuid,
        started_at timestamptz NOT NULL DEFAULT NOW(),
        completed_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_timetable_generation_run_tenant_id UNIQUE (tenant_id, id)
      );

      CREATE TABLE IF NOT EXISTS timetable_unscheduled_requirements (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        version_id uuid NOT NULL,
        generation_run_id uuid,
        requirement_id uuid NOT NULL,
        remaining_periods integer NOT NULL CHECK (remaining_periods >= 0),
        duration_periods integer NOT NULL DEFAULT 1 CHECK (duration_periods >= 1),
        reason_code text NOT NULL,
        reason_message text NOT NULL,
        status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'partially_placed', 'placed', 'cancelled')),
        row_version integer NOT NULL DEFAULT 1,
        metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_timetable_unscheduled_scope UNIQUE (tenant_id, version_id, requirement_id),
        CONSTRAINT uq_timetable_unscheduled_tenant_id UNIQUE (tenant_id, id)
      );

      CREATE TABLE IF NOT EXISTS timetable_relief_assignments (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        version_id uuid NOT NULL,
        slot_id uuid NOT NULL,
        relief_date date NOT NULL,
        absent_teacher_id text NOT NULL,
        substitute_teacher_id text NOT NULL,
        reason text,
        status text NOT NULL DEFAULT 'assigned' CHECK (status IN ('assigned', 'cancelled', 'completed')),
        row_version integer NOT NULL DEFAULT 1,
        assigned_by_user_id uuid,
        cancelled_by_user_id uuid,
        cancelled_at timestamptz,
        cancellation_reason text,
        notification_id text,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_timetable_relief_tenant_id UNIQUE (tenant_id, id)
      );

      CREATE TABLE IF NOT EXISTS timetable_audit_logs (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        version_id uuid,
        slot_id uuid,
        actor_user_id uuid,
        action text NOT NULL,
        metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
        created_at timestamptz NOT NULL DEFAULT NOW()
      );

      ALTER TABLE timetable_audit_logs ADD COLUMN IF NOT EXISTS version_id uuid;
      ALTER TABLE timetable_audit_logs ADD COLUMN IF NOT EXISTS slot_id uuid;
      ALTER TABLE timetable_audit_logs ADD COLUMN IF NOT EXISTS actor_user_id uuid;
      ALTER TABLE timetable_audit_logs ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;
      ALTER TABLE timetable_audit_logs ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT NOW();
      -- Configuration, requirements, availability, and resource changes are
      -- timetable audit events without a lesson/version reference. Older
      -- installations created these columns as NOT NULL, which makes the
      -- configuration transaction roll back at its final audit insert.
      ALTER TABLE timetable_audit_logs ALTER COLUMN version_id DROP NOT NULL;
      ALTER TABLE timetable_audit_logs ALTER COLUMN slot_id DROP NOT NULL;
      ALTER TABLE timetable_audit_logs ALTER COLUMN actor_user_id DROP NOT NULL;
      ALTER TABLE timetable_audit_logs ALTER COLUMN metadata SET DEFAULT '{}'::jsonb;
      ALTER TABLE timetable_audit_logs ALTER COLUMN updated_at SET DEFAULT NOW();

      ALTER TABLE timetable_versions DROP CONSTRAINT IF EXISTS uq_timetable_versions_tenant_term;
      DROP INDEX IF EXISTS uq_timetable_versions_active_status;
      CREATE UNIQUE INDEX uq_timetable_versions_active_status
        ON timetable_versions (tenant_id, academic_year, term_name, status)
        WHERE status IN ('draft', 'published');
      CREATE INDEX IF NOT EXISTS ix_timetable_versions_history
        ON timetable_versions (tenant_id, academic_year, term_name, revision_number DESC, created_at DESC);
      CREATE INDEX IF NOT EXISTS ix_timetable_slots_conflict_lookup
        ON timetable_slots (tenant_id, version_id, day_of_week, starts_at, ends_at);
      CREATE INDEX IF NOT EXISTS ix_timetable_slots_teacher_view
        ON timetable_slots (tenant_id, version_id, teacher_id, day_of_week, starts_at)
        WHERE status <> 'cancelled';
      CREATE INDEX IF NOT EXISTS ix_timetable_slots_class_view
        ON timetable_slots (tenant_id, version_id, class_section_id, day_of_week, starts_at)
        WHERE status <> 'cancelled';
      CREATE INDEX IF NOT EXISTS ix_timetable_slots_stream_view
        ON timetable_slots (tenant_id, version_id, stream_id, day_of_week, starts_at)
        WHERE stream_id IS NOT NULL AND status <> 'cancelled';
      CREATE INDEX IF NOT EXISTS ix_timetable_slots_resource_view
        ON timetable_slots (tenant_id, version_id, resource_id, day_of_week, starts_at)
        WHERE resource_id IS NOT NULL AND status <> 'cancelled';
      CREATE INDEX IF NOT EXISTS ix_timetable_periods_configuration_day
        ON timetable_period_definitions (tenant_id, configuration_id, day_of_week, order_index);
      CREATE INDEX IF NOT EXISTS ix_timetable_requirements_scope
        ON timetable_subject_requirements (tenant_id, academic_year, term_name, class_section_id, status);
      CREATE UNIQUE INDEX IF NOT EXISTS ux_timetable_requirement_scope
        ON timetable_subject_requirements (
          tenant_id, academic_year, term_name, class_section_id, subject_id,
          COALESCE(stream_id, ''), COALESCE(teacher_id, ''), COALESCE(parallel_key, '')
        );
      CREATE INDEX IF NOT EXISTS ix_timetable_availability_teacher
        ON timetable_teacher_availability (tenant_id, academic_year, term_name, teacher_id, day_of_week);
      CREATE UNIQUE INDEX IF NOT EXISTS ux_timetable_relief_active_slot_date
        ON timetable_relief_assignments (tenant_id, slot_id, relief_date)
        WHERE status = 'assigned';

      DO $$
      DECLARE target_table text;
      DECLARE policy_record record;
      BEGIN
        FOREACH target_table IN ARRAY ARRAY[
          'timetable_versions',
          'timetable_configurations',
          'timetable_days',
          'timetable_period_definitions',
          'timetable_common_blocks',
          'timetable_resources',
          'timetable_subject_requirements',
          'timetable_teacher_availability',
          'timetable_slots',
          'timetable_generation_runs',
          'timetable_unscheduled_requirements',
          'timetable_relief_assignments',
          'timetable_audit_logs'
        ] LOOP
          IF to_regclass(format('public.%I', target_table)) IS NOT NULL THEN
            EXECUTE format('ALTER TABLE %I DISABLE ROW LEVEL SECURITY', target_table);
            FOR policy_record IN
              SELECT policyname FROM pg_policies
              WHERE schemaname = 'public' AND tablename = target_table
            LOOP
              EXECUTE format('DROP POLICY IF EXISTS %I ON %I', policy_record.policyname, target_table);
            END LOOP;
            EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS tenant_id text', target_table);
            IF EXISTS (
              SELECT 1 FROM information_schema.columns
              WHERE table_schema = 'public' AND table_name = target_table
                AND column_name = 'tenant_id' AND data_type <> 'text'
            ) THEN
              EXECUTE format('ALTER TABLE %I ALTER COLUMN tenant_id TYPE text USING tenant_id::text', target_table);
            END IF;
            EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS school_id text', target_table);
            EXECUTE format(
              'UPDATE %I SET tenant_id = COALESCE(NULLIF(tenant_id, ''''), school_id::text, ''global'') WHERE tenant_id IS NULL OR btrim(tenant_id) = ''''',
              target_table
            );
            EXECUTE format('ALTER TABLE %I ALTER COLUMN tenant_id SET DEFAULT ''global''', target_table);
            EXECUTE format('ALTER TABLE %I ALTER COLUMN tenant_id SET NOT NULL', target_table);
            EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', target_table);
            EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', target_table);
            EXECUTE format(
              'CREATE POLICY %I ON %I FOR ALL USING (tenant_id::text = current_setting(''app.tenant_id'', true)) WITH CHECK (tenant_id::text = current_setting(''app.tenant_id'', true))',
              target_table || '_rls_policy', target_table
            );
          END IF;
        END LOOP;
      END $$;

      -- Keep forced RLS explicit for both PostgreSQL and the release-time static
      -- tenant-isolation audit. The bootstrap loop above normalizes legacy tables
      -- and recreates policies; these statements are the final fail-closed guard.
      ALTER TABLE timetable_versions FORCE ROW LEVEL SECURITY;
      ALTER TABLE timetable_configurations FORCE ROW LEVEL SECURITY;
      ALTER TABLE timetable_days FORCE ROW LEVEL SECURITY;
      ALTER TABLE timetable_period_definitions FORCE ROW LEVEL SECURITY;
      ALTER TABLE timetable_common_blocks FORCE ROW LEVEL SECURITY;
      ALTER TABLE timetable_resources FORCE ROW LEVEL SECURITY;
      ALTER TABLE timetable_subject_requirements FORCE ROW LEVEL SECURITY;
      ALTER TABLE timetable_teacher_availability FORCE ROW LEVEL SECURITY;
      ALTER TABLE timetable_slots FORCE ROW LEVEL SECURITY;
      ALTER TABLE timetable_generation_runs FORCE ROW LEVEL SECURITY;
      ALTER TABLE timetable_unscheduled_requirements FORCE ROW LEVEL SECURITY;
      ALTER TABLE timetable_relief_assignments FORCE ROW LEVEL SECURITY;
      ALTER TABLE timetable_audit_logs FORCE ROW LEVEL SECURITY;
    `);

    this.logger.log('Canonical timetable schema verified');
  }
}
