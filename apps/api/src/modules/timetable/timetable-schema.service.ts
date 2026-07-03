import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class TimetableSchemaService implements OnModuleInit {

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

  private readonly logger = new Logger(TimetableSchemaService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit(): Promise<void> {
    await this.prisma.runSchemaBootstrap(`
      CREATE TABLE IF NOT EXISTS timetable_versions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        academic_year text NOT NULL,
        term_name text NOT NULL,
        status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
        immutable boolean NOT NULL DEFAULT FALSE,
        notes text,
        published_by_user_id uuid,
        published_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_timetable_versions_tenant_term UNIQUE (tenant_id, academic_year, term_name, status)
      );

      CREATE TABLE IF NOT EXISTS timetable_slots (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        version_id uuid REFERENCES timetable_versions(id) ON DELETE SET NULL,
        academic_year text NOT NULL,
        term_name text NOT NULL,
        class_section_id text NOT NULL,
        subject_id text NOT NULL,
        teacher_id text NOT NULL,
        room_id text,
        day_of_week integer NOT NULL CHECK (day_of_week BETWEEN 1 AND 7),
        starts_at time NOT NULL,
        ends_at time NOT NULL,
        status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'cancelled')),
        created_by_user_id uuid,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        CONSTRAINT ck_timetable_slot_time_order CHECK (starts_at < ends_at)
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

      DO $$
      DECLARE
        target_table text;
        policy_record record;
      BEGIN
        FOREACH target_table IN ARRAY ARRAY[
          'timetable_versions',
          'timetable_slots',
          'timetable_audit_logs'
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
            EXECUTE format('ALTER TABLE %I ALTER COLUMN tenant_id TYPE text USING tenant_id::text', target_table);
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

      CREATE INDEX IF NOT EXISTS ix_timetable_slots_conflict_lookup
        ON timetable_slots (tenant_id, academic_year, term_name, day_of_week, starts_at, ends_at);
      CREATE INDEX IF NOT EXISTS ix_timetable_versions_tenant_term
        ON timetable_versions (tenant_id, academic_year, term_name, status);

      ALTER TABLE timetable_versions ENABLE ROW LEVEL SECURITY;
      ALTER TABLE timetable_versions FORCE ROW LEVEL SECURITY;
      ALTER TABLE timetable_slots ENABLE ROW LEVEL SECURITY;
      ALTER TABLE timetable_slots FORCE ROW LEVEL SECURITY;
      ALTER TABLE timetable_audit_logs ENABLE ROW LEVEL SECURITY;
      ALTER TABLE timetable_audit_logs FORCE ROW LEVEL SECURITY;

      DROP POLICY IF EXISTS timetable_versions_rls_policy ON timetable_versions;
      CREATE POLICY timetable_versions_rls_policy ON timetable_versions
      FOR ALL
      USING (tenant_id::text = current_setting('app.tenant_id', true))
      WITH CHECK (tenant_id::text = current_setting('app.tenant_id', true));

      DROP POLICY IF EXISTS timetable_slots_rls_policy ON timetable_slots;
      CREATE POLICY timetable_slots_rls_policy ON timetable_slots
      FOR ALL
      USING (tenant_id::text = current_setting('app.tenant_id', true))
      WITH CHECK (tenant_id::text = current_setting('app.tenant_id', true));

      DROP POLICY IF EXISTS timetable_audit_logs_rls_policy ON timetable_audit_logs;
      CREATE POLICY timetable_audit_logs_rls_policy ON timetable_audit_logs
      FOR ALL
      USING (tenant_id::text = current_setting('app.tenant_id', true))
      WITH CHECK (tenant_id::text = current_setting('app.tenant_id', true));
    `);

    this.logger.log('Timetable schema verified');
  }
}
