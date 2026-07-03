import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service';

const BIOMETRIC_TABLES = [
  'biometric_devices',
  'biometric_identities',
  'biometric_events',
  'teacher_attendance_logs',
  'attendance_rules',
] as const;

@Injectable()
export class BiometricAttendanceSchemaService implements OnModuleInit {

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

  private readonly logger = new Logger(BiometricAttendanceSchemaService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit(): Promise<void> {
    await this.prisma.runSchemaBootstrap(`
      CREATE EXTENSION IF NOT EXISTS pgcrypto;

      CREATE TABLE IF NOT EXISTS biometric_devices (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        name text NOT NULL,
        location text NOT NULL,
        type text NOT NULL,
        status text NOT NULL DEFAULT 'active',
        last_sync_time timestamptz,
        registered_by uuid,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        audit_log_reference uuid,
        CONSTRAINT uq_biometric_devices_tenant_id_id UNIQUE (tenant_id, id),
        CONSTRAINT ck_biometric_devices_status CHECK (status IN ('active', 'inactive', 'maintenance', 'revoked'))
      );

      CREATE TABLE IF NOT EXISTS biometric_identities (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        teacher_user_id uuid NOT NULL,
        biometric_hash text NOT NULL,
        status text NOT NULL DEFAULT 'active',
        enrolled_by uuid,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        audit_log_reference uuid,
        CONSTRAINT uq_biometric_identities_tenant_hash UNIQUE (tenant_id, biometric_hash),
        CONSTRAINT ck_biometric_identities_status CHECK (status IN ('active', 'disabled'))
      );

      CREATE TABLE IF NOT EXISTS biometric_events (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        device_id uuid NOT NULL,
        biometric_hash text NOT NULL,
        event_hash text NOT NULL,
        event_type text NOT NULL,
        occurred_at timestamptz NOT NULL,
        offline_mode_flag boolean NOT NULL DEFAULT false,
        raw_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
        processing_status text NOT NULL DEFAULT 'pending',
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        audit_log_reference uuid,
        CONSTRAINT uq_biometric_events_tenant_id_id UNIQUE (tenant_id, id),
        CONSTRAINT uq_biometric_events_hash UNIQUE (tenant_id, event_hash),
        CONSTRAINT fk_biometric_events_device
          FOREIGN KEY (tenant_id, device_id)
          REFERENCES biometric_devices (tenant_id, id),
        CONSTRAINT ck_biometric_events_type CHECK (event_type IN ('check_in', 'check_out')),
        CONSTRAINT ck_biometric_events_processing_status CHECK (processing_status IN ('pending', 'processed', 'duplicate', 'unmatched', 'rejected'))
      );

      CREATE TABLE IF NOT EXISTS teacher_attendance_logs (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        teacher_user_id uuid NOT NULL,
        attendance_date date NOT NULL,
        event_id uuid,
        event_type text NOT NULL,
        occurred_at timestamptz NOT NULL,
        device_id uuid,
        status text NOT NULL,
        rule_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
        manual_override boolean NOT NULL DEFAULT false,
        override_reason text,
        override_by uuid,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        audit_log_reference uuid,
        CONSTRAINT fk_teacher_attendance_logs_event
          FOREIGN KEY (tenant_id, event_id)
          REFERENCES biometric_events (tenant_id, id),
        CONSTRAINT ck_teacher_attendance_logs_event_type CHECK (event_type IN ('check_in', 'check_out', 'absence_mark', 'manual_override')),
        CONSTRAINT ck_teacher_attendance_logs_status CHECK (status IN ('present', 'late', 'absent', 'half_day', 'excused', 'manual_override'))
      );

      CREATE TABLE IF NOT EXISTS attendance_rules (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL UNIQUE,
        default_start_time time NOT NULL DEFAULT '07:30',
        grace_period_minutes integer NOT NULL DEFAULT 10,
        absence_cutoff_time time NOT NULL DEFAULT '09:00',
        half_day_checkout_cutoff time NOT NULL DEFAULT '12:30',
        is_active boolean NOT NULL DEFAULT true,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        audit_log_reference uuid,
        CONSTRAINT ck_attendance_rules_grace CHECK (grace_period_minutes BETWEEN 0 AND 60)
      );

      DO $$
      DECLARE
        biometric_table text;
      BEGIN
        FOREACH biometric_table IN ARRAY ARRAY[
          'biometric_devices',
          'biometric_identities',
          'biometric_events',
          'teacher_attendance_logs',
          'attendance_rules'
        ] LOOP
          EXECUTE format('ALTER TABLE %I DISABLE ROW LEVEL SECURITY', biometric_table);
          EXECUTE format('DROP POLICY IF EXISTS %I ON %I', biometric_table || '_tenant_policy', biometric_table);
          EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS tenant_id text', biometric_table);
          IF EXISTS (
            SELECT 1
            FROM information_schema.columns c
            WHERE c.table_name = biometric_table
              AND column_name = 'tenant_id'
              AND data_type <> 'text'
          ) THEN
            EXECUTE format('ALTER TABLE %I ALTER COLUMN tenant_id TYPE text USING tenant_id::text', biometric_table);
          END IF;
          EXECUTE format(
            'UPDATE %I SET tenant_id = COALESCE(NULLIF(tenant_id, ''''), NULLIF(current_setting(''app.tenant_id'', true), ''''), ''00000000-0000-0000-0000-000000000000'') WHERE tenant_id IS NULL OR tenant_id = ''''',
            biometric_table
          );
          EXECUTE format('ALTER TABLE %I ALTER COLUMN tenant_id SET DEFAULT ''00000000-0000-0000-0000-000000000000''', biometric_table);
          EXECUTE format('ALTER TABLE %I ALTER COLUMN tenant_id SET NOT NULL', biometric_table);
          EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT NOW()', biometric_table);
          EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT NOW()', biometric_table);
          EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS audit_log_reference uuid', biometric_table);
        END LOOP;
      END $$;

      ALTER TABLE biometric_devices ADD COLUMN IF NOT EXISTS name text NOT NULL DEFAULT 'Biometric device';
      ALTER TABLE biometric_devices ADD COLUMN IF NOT EXISTS location text NOT NULL DEFAULT 'Unassigned';
      ALTER TABLE biometric_devices ADD COLUMN IF NOT EXISTS type text NOT NULL DEFAULT 'fingerprint';
      ALTER TABLE biometric_devices ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';
      ALTER TABLE biometric_devices ADD COLUMN IF NOT EXISTS last_sync_time timestamptz;
      ALTER TABLE biometric_devices ADD COLUMN IF NOT EXISTS registered_by uuid;

      ALTER TABLE biometric_identities ADD COLUMN IF NOT EXISTS teacher_user_id uuid;
      ALTER TABLE biometric_identities ADD COLUMN IF NOT EXISTS biometric_hash text;
      UPDATE biometric_identities
      SET biometric_hash = COALESCE(NULLIF(biometric_hash, ''), id::text)
      WHERE biometric_hash IS NULL OR biometric_hash = '';
      ALTER TABLE biometric_identities ALTER COLUMN biometric_hash SET NOT NULL;
      ALTER TABLE biometric_identities ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';
      ALTER TABLE biometric_identities ADD COLUMN IF NOT EXISTS enrolled_by uuid;

      ALTER TABLE biometric_events ADD COLUMN IF NOT EXISTS device_id uuid;
      ALTER TABLE biometric_events ADD COLUMN IF NOT EXISTS biometric_hash text;
      UPDATE biometric_events
      SET biometric_hash = COALESCE(NULLIF(biometric_hash, ''), id::text)
      WHERE biometric_hash IS NULL OR biometric_hash = '';
      ALTER TABLE biometric_events ALTER COLUMN biometric_hash SET NOT NULL;
      ALTER TABLE biometric_events ADD COLUMN IF NOT EXISTS event_hash text;
      UPDATE biometric_events
      SET event_hash = COALESCE(NULLIF(event_hash, ''), id::text)
      WHERE event_hash IS NULL OR event_hash = '';
      ALTER TABLE biometric_events ALTER COLUMN event_hash SET NOT NULL;
      ALTER TABLE biometric_events ADD COLUMN IF NOT EXISTS event_type text NOT NULL DEFAULT 'check_in';
      ALTER TABLE biometric_events ADD COLUMN IF NOT EXISTS occurred_at timestamptz NOT NULL DEFAULT NOW();
      ALTER TABLE biometric_events ADD COLUMN IF NOT EXISTS offline_mode_flag boolean NOT NULL DEFAULT false;
      ALTER TABLE biometric_events ALTER COLUMN offline_mode_flag TYPE boolean
        USING CASE
          WHEN LOWER(offline_mode_flag::text) IN ('true', 't', '1', 'yes', 'y') THEN true
          ELSE false
        END;
      ALTER TABLE biometric_events ALTER COLUMN offline_mode_flag SET DEFAULT false;
      ALTER TABLE biometric_events ALTER COLUMN offline_mode_flag SET NOT NULL;
      ALTER TABLE biometric_events ADD COLUMN IF NOT EXISTS raw_payload jsonb NOT NULL DEFAULT '{}'::jsonb;
      ALTER TABLE biometric_events ADD COLUMN IF NOT EXISTS processing_status text NOT NULL DEFAULT 'pending';

      ALTER TABLE teacher_attendance_logs ADD COLUMN IF NOT EXISTS teacher_user_id uuid;
      ALTER TABLE teacher_attendance_logs ADD COLUMN IF NOT EXISTS attendance_date date NOT NULL DEFAULT CURRENT_DATE;
      ALTER TABLE teacher_attendance_logs ALTER COLUMN attendance_date TYPE date
        USING CASE
          WHEN attendance_date::text ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}' THEN attendance_date::text::date
          ELSE CURRENT_DATE
        END;
      ALTER TABLE teacher_attendance_logs ALTER COLUMN attendance_date SET DEFAULT CURRENT_DATE;
      ALTER TABLE teacher_attendance_logs ALTER COLUMN attendance_date SET NOT NULL;
      ALTER TABLE teacher_attendance_logs ADD COLUMN IF NOT EXISTS event_id uuid;
      ALTER TABLE teacher_attendance_logs ADD COLUMN IF NOT EXISTS event_type text NOT NULL DEFAULT 'manual_override';
      ALTER TABLE teacher_attendance_logs ADD COLUMN IF NOT EXISTS occurred_at timestamptz NOT NULL DEFAULT NOW();
      ALTER TABLE teacher_attendance_logs ADD COLUMN IF NOT EXISTS device_id uuid;
      ALTER TABLE teacher_attendance_logs ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'present';
      ALTER TABLE teacher_attendance_logs ADD COLUMN IF NOT EXISTS rule_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb;
      ALTER TABLE teacher_attendance_logs ALTER COLUMN rule_snapshot TYPE jsonb
        USING CASE
          WHEN rule_snapshot::text ~ '^[[:space:]]*[\\{\\[]' THEN rule_snapshot::text::jsonb
          ELSE '{}'::jsonb
        END;
      ALTER TABLE teacher_attendance_logs ALTER COLUMN rule_snapshot SET DEFAULT '{}'::jsonb;
      ALTER TABLE teacher_attendance_logs ALTER COLUMN rule_snapshot SET NOT NULL;
      ALTER TABLE teacher_attendance_logs ADD COLUMN IF NOT EXISTS manual_override boolean NOT NULL DEFAULT false;
      ALTER TABLE teacher_attendance_logs ALTER COLUMN manual_override TYPE boolean
        USING CASE
          WHEN LOWER(manual_override::text) IN ('true', 't', '1', 'yes', 'y') THEN true
          ELSE false
        END;
      ALTER TABLE teacher_attendance_logs ALTER COLUMN manual_override SET DEFAULT false;
      ALTER TABLE teacher_attendance_logs ALTER COLUMN manual_override SET NOT NULL;
      ALTER TABLE teacher_attendance_logs ADD COLUMN IF NOT EXISTS override_reason text;
      ALTER TABLE teacher_attendance_logs ADD COLUMN IF NOT EXISTS override_by uuid;

      ALTER TABLE attendance_rules ADD COLUMN IF NOT EXISTS default_start_time time NOT NULL DEFAULT '07:30';
      ALTER TABLE attendance_rules ADD COLUMN IF NOT EXISTS grace_period_minutes integer NOT NULL DEFAULT 10;
      ALTER TABLE attendance_rules ADD COLUMN IF NOT EXISTS absence_cutoff_time time NOT NULL DEFAULT '09:00';
      ALTER TABLE attendance_rules ADD COLUMN IF NOT EXISTS half_day_checkout_cutoff time NOT NULL DEFAULT '12:30';
      ALTER TABLE attendance_rules ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

      CREATE INDEX IF NOT EXISTS ix_biometric_events_processing
        ON biometric_events (tenant_id, processing_status, occurred_at);
      CREATE INDEX IF NOT EXISTS ix_teacher_attendance_logs_teacher_date
        ON teacher_attendance_logs (tenant_id, teacher_user_id, attendance_date, created_at DESC);

      ${BIOMETRIC_TABLES.map((table) => `
        ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY;
        ALTER TABLE ${table} FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS ${table}_tenant_policy ON ${table};
        CREATE POLICY ${table}_tenant_policy ON ${table}
        FOR ALL USING (
          tenant_id = current_setting('app.tenant_id', true)
          OR NULLIF(current_setting('app.role', true), '') = 'system'
        )
        WITH CHECK (
          tenant_id = current_setting('app.tenant_id', true)
          OR NULLIF(current_setting('app.role', true), '') = 'system'
        );
      `).join('\n')}
    `);

    this.logger.log('Biometric teacher attendance schema and RLS policies verified');
  }
}
