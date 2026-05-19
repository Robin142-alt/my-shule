import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

import { DatabaseService } from '../../database/database.service';

const BIOMETRIC_TABLES = [
  'biometric_devices',
  'biometric_identities',
  'biometric_events',
  'teacher_attendance_logs',
  'attendance_rules',
] as const;

@Injectable()
export class BiometricAttendanceSchemaService implements OnModuleInit {
  private readonly logger = new Logger(BiometricAttendanceSchemaService.name);

  constructor(private readonly databaseService: DatabaseService) {}

  async onModuleInit(): Promise<void> {
    await this.databaseService.runSchemaBootstrap(`
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

      CREATE INDEX IF NOT EXISTS ix_biometric_events_processing
        ON biometric_events (tenant_id, processing_status, occurred_at);
      CREATE INDEX IF NOT EXISTS ix_teacher_attendance_logs_teacher_date
        ON teacher_attendance_logs (tenant_id, teacher_user_id, attendance_date, created_at DESC);
    `);

    await this.databaseService.runSchemaBootstrap(`
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
