import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service';

const ADMIN_COMMAND_TABLES = [
  'admin_incidents',
  'announcements',
  'meeting_minutes',
  'duty_rosters',
  'principal_dashboard_snapshots',
  'principal_alerts',
  'communication_templates',
] as const;

@Injectable()
export class AdminCommandSchemaService implements OnModuleInit {

  private async executeSql<T = any>(query: string, params: any[] = []): Promise<{ rows: T[], rowCount: number }> {
    const firstParam = params[0];
    const isUuid = typeof firstParam === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(firstParam);
    
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

  private readonly logger = new Logger(AdminCommandSchemaService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit(): Promise<void> {
    await this.prisma.runSchemaBootstrap(`
      CREATE EXTENSION IF NOT EXISTS pgcrypto;

      CREATE TABLE IF NOT EXISTS admin_incidents (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        title text NOT NULL,
        description text NOT NULL,
        severity text NOT NULL,
        status text NOT NULL DEFAULT 'reported',
        involved_parties jsonb NOT NULL DEFAULT '[]'::jsonb,
        created_by uuid NOT NULL,
        reviewed_by uuid,
        resolved_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        audit_log_reference uuid,
        CONSTRAINT ck_admin_incidents_severity CHECK (severity IN ('low', 'medium', 'high', 'critical')),
        CONSTRAINT ck_admin_incidents_status CHECK (status IN ('reported', 'reviewed', 'escalated', 'resolved'))
      );

      CREATE TABLE IF NOT EXISTS announcements (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        title text NOT NULL,
        body text NOT NULL,
        channels jsonb NOT NULL DEFAULT '[]'::jsonb,
        audience jsonb NOT NULL DEFAULT '{}'::jsonb,
        status text NOT NULL DEFAULT 'draft',
        created_by uuid NOT NULL,
        published_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        audit_log_reference uuid,
        CONSTRAINT ck_announcements_status CHECK (status IN ('draft', 'published', 'cancelled'))
      );

      CREATE TABLE IF NOT EXISTS meeting_minutes (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        meeting_date date NOT NULL,
        title text NOT NULL,
        agenda jsonb NOT NULL DEFAULT '[]'::jsonb,
        minutes text NOT NULL,
        action_items jsonb NOT NULL DEFAULT '[]'::jsonb,
        created_by uuid NOT NULL,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        audit_log_reference uuid
      );

      CREATE TABLE IF NOT EXISTS duty_rosters (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        duty_type text NOT NULL,
        duty_date date NOT NULL,
        start_time time NOT NULL,
        end_time time NOT NULL,
        assigned_user_id uuid NOT NULL,
        status text NOT NULL DEFAULT 'scheduled',
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        audit_log_reference uuid,
        CONSTRAINT ck_duty_rosters_type CHECK (duty_type IN ('morning', 'lunch', 'gate', 'evening', 'custom')),
        CONSTRAINT ck_duty_rosters_status CHECK (status IN ('scheduled', 'checked_in', 'missed', 'excused'))
      );

      CREATE TABLE IF NOT EXISTS principal_dashboard_snapshots (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        enabled_module_hash text NOT NULL,
        filter_hash text NOT NULL,
        payload jsonb NOT NULL,
        generated_at timestamptz NOT NULL DEFAULT NOW(),
        expires_at timestamptz NOT NULL,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        audit_log_reference uuid,
        UNIQUE (tenant_id, enabled_module_hash, filter_hash)
      );

      CREATE TABLE IF NOT EXISTS principal_alerts (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        module_code text NOT NULL,
        severity text NOT NULL,
        title text NOT NULL,
        message text NOT NULL,
        action_path text,
        status text NOT NULL DEFAULT 'open',
        source_entity_type text,
        source_entity_id uuid,
        metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        audit_log_reference uuid,
        CONSTRAINT ck_principal_alerts_severity CHECK (severity IN ('info', 'warning', 'critical')),
        CONSTRAINT ck_principal_alerts_status CHECK (status IN ('open', 'acknowledged', 'resolved', 'dismissed'))
      );

      CREATE TABLE IF NOT EXISTS communication_templates (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        name text NOT NULL,
        type text NOT NULL,
        subject text,
        body text NOT NULL,
        variables jsonb NOT NULL DEFAULT '[]'::jsonb,
        is_active boolean NOT NULL DEFAULT TRUE,
        created_by uuid,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        CONSTRAINT ck_communication_templates_type CHECK (type IN ('email', 'sms', 'push', 'letter')),
        CONSTRAINT uq_communication_templates_tenant_name UNIQUE (tenant_id, name)
      );

      CREATE INDEX IF NOT EXISTS ix_admin_incidents_queue
        ON admin_incidents (tenant_id, status, severity, created_at DESC);
      CREATE INDEX IF NOT EXISTS ix_announcements_status
        ON announcements (tenant_id, status, created_at DESC);
      CREATE INDEX IF NOT EXISTS ix_meeting_minutes_date
        ON meeting_minutes (tenant_id, meeting_date DESC);
      CREATE INDEX IF NOT EXISTS ix_duty_rosters_date
        ON duty_rosters (tenant_id, duty_date, status);
      CREATE INDEX IF NOT EXISTS ix_principal_dashboard_snapshots_expiry
        ON principal_dashboard_snapshots (tenant_id, enabled_module_hash, filter_hash, expires_at DESC);
      CREATE INDEX IF NOT EXISTS ix_principal_alerts_status
        ON principal_alerts (tenant_id, status, severity, created_at DESC);
    `);

    await this.prisma.runSchemaBootstrap(`
      ${ADMIN_COMMAND_TABLES.map((table) => `
        ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY;
        ALTER TABLE ${table} FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS ${table}_tenant_policy ON ${table};
        CREATE POLICY ${table}_tenant_policy ON ${table}
        FOR ALL USING (tenant_id = current_setting('app.tenant_id', true))
        WITH CHECK (tenant_id = current_setting('app.tenant_id', true));
      `).join('\n')}
    `);

    this.logger.log('Admin command schema and RLS policies verified');
  }
}
