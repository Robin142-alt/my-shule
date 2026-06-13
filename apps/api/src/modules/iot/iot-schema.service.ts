import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service';

const IOT_TABLES = [
  'iot_devices',
  'iot_device_credentials',
  'iot_telemetry_readings',
  'iot_gateway_ingestions',
  'iot_device_commands',
  'iot_alerts',
  'iot_audit_logs',
] as const;

@Injectable()
export class IotSchemaService implements OnModuleInit {

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

  private readonly logger = new Logger(IotSchemaService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit(): Promise<void> {
    await this.prisma.runSchemaBootstrap(`
      CREATE EXTENSION IF NOT EXISTS pgcrypto;

      CREATE TABLE IF NOT EXISTS iot_devices (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        name text NOT NULL,
        device_type text NOT NULL,
        location_name text,
        external_device_id text,
        installation_date date,
        status text NOT NULL DEFAULT 'offline',
        health_status text NOT NULL DEFAULT 'unknown',
        last_seen_at timestamptz,
        metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
        created_by_user_id uuid,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        audit_log_reference uuid,
        CONSTRAINT uq_iot_devices_tenant_id_id UNIQUE (tenant_id, id),
        CONSTRAINT uq_iot_devices_external UNIQUE (tenant_id, external_device_id),
        CONSTRAINT ck_iot_devices_status CHECK (status IN ('online', 'offline', 'maintenance', 'retired')),
        CONSTRAINT ck_iot_devices_health CHECK (health_status IN ('ok', 'warning', 'critical', 'unknown'))
      );

      CREATE TABLE IF NOT EXISTS iot_device_credentials (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        device_id uuid NOT NULL,
        key_id text NOT NULL,
        label text,
        credential_hash text NOT NULL,
        status text NOT NULL DEFAULT 'active',
        last_used_at timestamptz,
        expires_at timestamptz,
        created_by_user_id uuid,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        audit_log_reference uuid,
        CONSTRAINT fk_iot_credentials_device
          FOREIGN KEY (tenant_id, device_id)
          REFERENCES iot_devices (tenant_id, id)
          ON DELETE CASCADE,
        CONSTRAINT uq_iot_credentials_tenant_id_id UNIQUE (tenant_id, id),
        CONSTRAINT uq_iot_credentials_key UNIQUE (tenant_id, key_id),
        CONSTRAINT ck_iot_credentials_status CHECK (status IN ('active', 'revoked', 'expired'))
      );

      CREATE TABLE IF NOT EXISTS iot_telemetry_readings (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        device_id uuid NOT NULL,
        metric_name text NOT NULL,
        metric_value numeric NOT NULL,
        unit text,
        severity text NOT NULL DEFAULT 'normal',
        recorded_at timestamptz NOT NULL DEFAULT NOW(),
        metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
        recorded_by_user_id uuid,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        audit_log_reference uuid,
        CONSTRAINT fk_iot_telemetry_device
          FOREIGN KEY (tenant_id, device_id)
          REFERENCES iot_devices (tenant_id, id)
          ON DELETE CASCADE,
        CONSTRAINT ck_iot_telemetry_severity CHECK (severity IN ('normal', 'warning', 'critical'))
      );

      CREATE TABLE IF NOT EXISTS iot_gateway_ingestions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        device_id uuid NOT NULL,
        credential_id uuid NOT NULL,
        idempotency_key text NOT NULL,
        payload_sha256 text NOT NULL,
        status text NOT NULL DEFAULT 'accepted',
        reading_count int NOT NULL DEFAULT 0,
        metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
        accepted_at timestamptz NOT NULL DEFAULT NOW(),
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        audit_log_reference uuid,
        CONSTRAINT fk_iot_gateway_ingestions_device
          FOREIGN KEY (tenant_id, device_id)
          REFERENCES iot_devices (tenant_id, id)
          ON DELETE CASCADE,
        CONSTRAINT fk_iot_gateway_ingestions_credential
          FOREIGN KEY (tenant_id, credential_id)
          REFERENCES iot_device_credentials (tenant_id, id)
          ON DELETE CASCADE,
        CONSTRAINT uq_iot_gateway_ingestion_idempotency UNIQUE (tenant_id, credential_id, idempotency_key),
        CONSTRAINT ck_iot_gateway_ingestions_status CHECK (status IN ('accepted', 'duplicate', 'rejected'))
      );

      CREATE TABLE IF NOT EXISTS iot_device_commands (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        device_id uuid NOT NULL,
        command_type text NOT NULL,
        payload jsonb NOT NULL DEFAULT '{}'::jsonb,
        priority text NOT NULL DEFAULT 'normal',
        status text NOT NULL DEFAULT 'queued',
        requested_by_user_id uuid,
        sent_at timestamptz,
        acknowledged_at timestamptz,
        result_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        audit_log_reference uuid,
        CONSTRAINT fk_iot_commands_device
          FOREIGN KEY (tenant_id, device_id)
          REFERENCES iot_devices (tenant_id, id)
          ON DELETE CASCADE,
        CONSTRAINT ck_iot_commands_priority CHECK (priority IN ('low', 'normal', 'high', 'critical')),
        CONSTRAINT ck_iot_commands_status CHECK (status IN ('queued', 'sent', 'acknowledged', 'failed', 'cancelled'))
      );

      CREATE TABLE IF NOT EXISTS iot_alerts (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        device_id uuid,
        title text NOT NULL,
        message text NOT NULL,
        severity text NOT NULL DEFAULT 'warning',
        status text NOT NULL DEFAULT 'open',
        metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
        created_by_user_id uuid,
        resolved_by_user_id uuid,
        resolved_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        audit_log_reference uuid,
        CONSTRAINT fk_iot_alerts_device
          FOREIGN KEY (tenant_id, device_id)
          REFERENCES iot_devices (tenant_id, id)
          ON DELETE SET NULL,
        CONSTRAINT ck_iot_alerts_severity CHECK (severity IN ('info', 'warning', 'critical')),
        CONSTRAINT ck_iot_alerts_status CHECK (status IN ('open', 'acknowledged', 'resolved'))
      );

      CREATE TABLE IF NOT EXISTS iot_audit_logs (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        actor_user_id uuid,
        action text NOT NULL,
        resource_type text NOT NULL,
        resource_id uuid,
        metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        audit_log_reference uuid
      );

      CREATE INDEX IF NOT EXISTS ix_iot_devices_status
        ON iot_devices (tenant_id, status, health_status);
      CREATE INDEX IF NOT EXISTS ix_iot_credentials_device_status
        ON iot_device_credentials (tenant_id, device_id, status, created_at DESC);
      CREATE INDEX IF NOT EXISTS ix_iot_telemetry_device_time
        ON iot_telemetry_readings (tenant_id, device_id, recorded_at DESC);
      CREATE INDEX IF NOT EXISTS ix_iot_gateway_ingestions_device_time
        ON iot_gateway_ingestions (tenant_id, device_id, accepted_at DESC);
      CREATE INDEX IF NOT EXISTS ix_iot_commands_device_status
        ON iot_device_commands (tenant_id, device_id, status, created_at DESC);
      CREATE INDEX IF NOT EXISTS ix_iot_alerts_open
        ON iot_alerts (tenant_id, status, severity, created_at DESC);

      ${IOT_TABLES.map((table) => `
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

    this.logger.log('IoT schema and RLS policies verified');
  }
}
