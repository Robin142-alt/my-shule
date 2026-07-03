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

      DO $$
      DECLARE
        iot_table text;
      BEGIN
        FOREACH iot_table IN ARRAY ARRAY[
          'iot_devices',
          'iot_device_credentials',
          'iot_telemetry_readings',
          'iot_gateway_ingestions',
          'iot_device_commands',
          'iot_alerts',
          'iot_audit_logs'
        ] LOOP
          EXECUTE format('ALTER TABLE %I DISABLE ROW LEVEL SECURITY', iot_table);
          EXECUTE format('DROP POLICY IF EXISTS %I ON %I', iot_table || '_tenant_policy', iot_table);
          EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS tenant_id text', iot_table);
          IF EXISTS (
            SELECT 1
            FROM information_schema.columns c
            WHERE c.table_name = iot_table
              AND c.column_name = 'tenant_id'
              AND c.data_type <> 'text'
          ) THEN
            EXECUTE format('ALTER TABLE %I ALTER COLUMN tenant_id TYPE text USING tenant_id::text', iot_table);
          END IF;
          EXECUTE format(
            'UPDATE %I SET tenant_id = COALESCE(NULLIF(tenant_id, ''''), NULLIF(current_setting(''app.tenant_id'', true), ''''), ''00000000-0000-0000-0000-000000000000'') WHERE tenant_id IS NULL OR tenant_id = ''''',
            iot_table
          );
          EXECUTE format('ALTER TABLE %I ALTER COLUMN tenant_id SET DEFAULT ''00000000-0000-0000-0000-000000000000''', iot_table);
          EXECUTE format('ALTER TABLE %I ALTER COLUMN tenant_id SET NOT NULL', iot_table);
          EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT NOW()', iot_table);
          EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT NOW()', iot_table);
          EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS audit_log_reference uuid', iot_table);
        END LOOP;
      END $$;

      ALTER TABLE iot_devices ADD COLUMN IF NOT EXISTS name text NOT NULL DEFAULT 'IoT device';
      ALTER TABLE iot_devices ADD COLUMN IF NOT EXISTS device_type text NOT NULL DEFAULT 'sensor';
      ALTER TABLE iot_devices ADD COLUMN IF NOT EXISTS location_name text;
      ALTER TABLE iot_devices ADD COLUMN IF NOT EXISTS external_device_id text;
      ALTER TABLE iot_devices ALTER COLUMN external_device_id TYPE text USING external_device_id::text;
      ALTER TABLE iot_devices ADD COLUMN IF NOT EXISTS installation_date date;
      ALTER TABLE iot_devices ALTER COLUMN installation_date TYPE date
        USING CASE
          WHEN installation_date::text ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}' THEN installation_date::text::date
          ELSE CURRENT_DATE
        END;
      ALTER TABLE iot_devices ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'offline';
      ALTER TABLE iot_devices ADD COLUMN IF NOT EXISTS health_status text NOT NULL DEFAULT 'unknown';
      ALTER TABLE iot_devices ADD COLUMN IF NOT EXISTS last_seen_at timestamptz;
      ALTER TABLE iot_devices ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;
      ALTER TABLE iot_devices ADD COLUMN IF NOT EXISTS created_by_user_id uuid;

      ALTER TABLE iot_device_credentials ADD COLUMN IF NOT EXISTS device_id uuid;
      ALTER TABLE iot_device_credentials ADD COLUMN IF NOT EXISTS key_id text;
      ALTER TABLE iot_device_credentials ALTER COLUMN key_id TYPE text USING key_id::text;
      UPDATE iot_device_credentials
      SET key_id = COALESCE(NULLIF(key_id, ''), id::text)
      WHERE key_id IS NULL OR key_id = '';
      ALTER TABLE iot_device_credentials ALTER COLUMN key_id SET NOT NULL;
      ALTER TABLE iot_device_credentials ADD COLUMN IF NOT EXISTS label text;
      ALTER TABLE iot_device_credentials ADD COLUMN IF NOT EXISTS credential_hash text;
      UPDATE iot_device_credentials
      SET credential_hash = COALESCE(NULLIF(credential_hash, ''), id::text)
      WHERE credential_hash IS NULL OR credential_hash = '';
      ALTER TABLE iot_device_credentials ALTER COLUMN credential_hash SET NOT NULL;
      ALTER TABLE iot_device_credentials ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';
      ALTER TABLE iot_device_credentials ADD COLUMN IF NOT EXISTS last_used_at timestamptz;
      ALTER TABLE iot_device_credentials ADD COLUMN IF NOT EXISTS expires_at timestamptz;
      ALTER TABLE iot_device_credentials ADD COLUMN IF NOT EXISTS created_by_user_id uuid;

      ALTER TABLE iot_telemetry_readings ADD COLUMN IF NOT EXISTS device_id uuid;
      ALTER TABLE iot_telemetry_readings ADD COLUMN IF NOT EXISTS metric_name text NOT NULL DEFAULT 'reading';
      ALTER TABLE iot_telemetry_readings ADD COLUMN IF NOT EXISTS metric_value numeric NOT NULL DEFAULT 0;
      ALTER TABLE iot_telemetry_readings ALTER COLUMN metric_value TYPE numeric
        USING CASE
          WHEN metric_value::text ~ '^-?[0-9]+(\\.[0-9]+)?$' THEN metric_value::text::numeric
          ELSE 0
        END;
      ALTER TABLE iot_telemetry_readings ADD COLUMN IF NOT EXISTS unit text;
      ALTER TABLE iot_telemetry_readings ADD COLUMN IF NOT EXISTS severity text NOT NULL DEFAULT 'normal';
      ALTER TABLE iot_telemetry_readings ADD COLUMN IF NOT EXISTS recorded_at timestamptz NOT NULL DEFAULT NOW();
      ALTER TABLE iot_telemetry_readings ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;
      ALTER TABLE iot_telemetry_readings ADD COLUMN IF NOT EXISTS recorded_by_user_id uuid;

      ALTER TABLE iot_gateway_ingestions ADD COLUMN IF NOT EXISTS device_id uuid;
      ALTER TABLE iot_gateway_ingestions ADD COLUMN IF NOT EXISTS credential_id uuid;
      ALTER TABLE iot_gateway_ingestions ADD COLUMN IF NOT EXISTS idempotency_key text;
      UPDATE iot_gateway_ingestions
      SET idempotency_key = COALESCE(NULLIF(idempotency_key, ''), id::text)
      WHERE idempotency_key IS NULL OR idempotency_key = '';
      ALTER TABLE iot_gateway_ingestions ALTER COLUMN idempotency_key SET NOT NULL;
      ALTER TABLE iot_gateway_ingestions ADD COLUMN IF NOT EXISTS payload_sha256 text;
      ALTER TABLE iot_gateway_ingestions ALTER COLUMN payload_sha256 TYPE text USING payload_sha256::text;
      UPDATE iot_gateway_ingestions
      SET payload_sha256 = COALESCE(NULLIF(payload_sha256, ''), id::text)
      WHERE payload_sha256 IS NULL OR payload_sha256 = '';
      ALTER TABLE iot_gateway_ingestions ALTER COLUMN payload_sha256 SET NOT NULL;
      ALTER TABLE iot_gateway_ingestions ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'accepted';
      ALTER TABLE iot_gateway_ingestions ADD COLUMN IF NOT EXISTS reading_count int NOT NULL DEFAULT 0;
      ALTER TABLE iot_gateway_ingestions ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;
      ALTER TABLE iot_gateway_ingestions ADD COLUMN IF NOT EXISTS accepted_at timestamptz NOT NULL DEFAULT NOW();

      ALTER TABLE iot_device_commands ADD COLUMN IF NOT EXISTS device_id uuid;
      ALTER TABLE iot_device_commands ADD COLUMN IF NOT EXISTS command_type text NOT NULL DEFAULT 'sync';
      ALTER TABLE iot_device_commands ADD COLUMN IF NOT EXISTS payload jsonb NOT NULL DEFAULT '{}'::jsonb;
      ALTER TABLE iot_device_commands ADD COLUMN IF NOT EXISTS priority text NOT NULL DEFAULT 'normal';
      ALTER TABLE iot_device_commands ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'queued';
      ALTER TABLE iot_device_commands ADD COLUMN IF NOT EXISTS requested_by_user_id uuid;
      ALTER TABLE iot_device_commands ADD COLUMN IF NOT EXISTS sent_at timestamptz;
      ALTER TABLE iot_device_commands ADD COLUMN IF NOT EXISTS acknowledged_at timestamptz;
      ALTER TABLE iot_device_commands ADD COLUMN IF NOT EXISTS result_metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

      ALTER TABLE iot_alerts ADD COLUMN IF NOT EXISTS device_id uuid;
      ALTER TABLE iot_alerts ADD COLUMN IF NOT EXISTS title text NOT NULL DEFAULT 'IoT alert';
      ALTER TABLE iot_alerts ADD COLUMN IF NOT EXISTS message text NOT NULL DEFAULT 'IoT alert requires review.';
      ALTER TABLE iot_alerts ADD COLUMN IF NOT EXISTS severity text NOT NULL DEFAULT 'warning';
      ALTER TABLE iot_alerts ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'open';
      ALTER TABLE iot_alerts ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;
      ALTER TABLE iot_alerts ADD COLUMN IF NOT EXISTS created_by_user_id uuid;
      ALTER TABLE iot_alerts ADD COLUMN IF NOT EXISTS resolved_by_user_id uuid;
      ALTER TABLE iot_alerts ADD COLUMN IF NOT EXISTS resolved_at timestamptz;

      ALTER TABLE iot_audit_logs ADD COLUMN IF NOT EXISTS actor_user_id uuid;
      ALTER TABLE iot_audit_logs ADD COLUMN IF NOT EXISTS action text NOT NULL DEFAULT 'iot.audit';
      ALTER TABLE iot_audit_logs ADD COLUMN IF NOT EXISTS resource_type text NOT NULL DEFAULT 'iot';
      ALTER TABLE iot_audit_logs ADD COLUMN IF NOT EXISTS resource_id uuid;
      ALTER TABLE iot_audit_logs ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

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
