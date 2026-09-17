import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class SyncSchemaService implements OnModuleInit {

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

  private readonly logger = new Logger(SyncSchemaService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit(): Promise<void> {
    await this.prisma.runSchemaBootstrap(`
      CREATE EXTENSION IF NOT EXISTS pgcrypto;
      CREATE SCHEMA IF NOT EXISTS app;

      CREATE OR REPLACE FUNCTION set_updated_at()
      RETURNS trigger AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      CREATE OR REPLACE FUNCTION app.prevent_append_only_mutation()
      RETURNS trigger AS $$
      BEGIN
        IF current_setting('app.allow_tenant_deletion', true) = 'true' THEN
          RETURN OLD;
        END IF;
        RAISE EXCEPTION 'append-only table "%" cannot be %', TG_TABLE_NAME, lower(TG_OP)
          USING ERRCODE = '55000';
      END;
      $$ LANGUAGE plpgsql;

      CREATE TABLE IF NOT EXISTS sync_devices (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        device_id text NOT NULL,
        platform text NOT NULL,
        app_version text,
        metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
        last_seen_at timestamptz NOT NULL DEFAULT NOW(),
        last_push_at timestamptz,
        last_pull_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        CONSTRAINT ck_sync_devices_device_id_not_blank CHECK (btrim(device_id) <> ''),
        CONSTRAINT ck_sync_devices_platform_not_blank CHECK (btrim(platform) <> ''),
        CONSTRAINT uq_sync_devices_tenant_id_id UNIQUE (tenant_id, id),
        CONSTRAINT uq_sync_devices_tenant_device UNIQUE (tenant_id, device_id)
      );

      CREATE TABLE IF NOT EXISTS sync_cursors (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        device_id text NOT NULL,
        entity text NOT NULL,
        last_version bigint NOT NULL DEFAULT 0,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        CONSTRAINT ck_sync_cursors_entity CHECK (entity IN ('attendance', 'finance')),
        CONSTRAINT ck_sync_cursors_last_version_non_negative CHECK (last_version >= 0),
        CONSTRAINT uq_sync_cursors_tenant_id_id UNIQUE (tenant_id, id),
        CONSTRAINT uq_sync_cursors_tenant_device_entity UNIQUE (tenant_id, device_id, entity)
      );

      CREATE TABLE IF NOT EXISTS sync_operation_logs (
        op_id uuid PRIMARY KEY,
        tenant_id text NOT NULL,
        device_id text NOT NULL,
        entity text NOT NULL,
        payload jsonb NOT NULL,
        version bigint GENERATED ALWAYS AS IDENTITY,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        CONSTRAINT ck_sync_operation_logs_entity CHECK (entity IN ('attendance', 'finance')),
        CONSTRAINT uq_sync_operation_logs_tenant_version UNIQUE (tenant_id, version)
      );

      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'sync_devices'
            AND column_name = 'tenant_id'
            AND data_type <> 'text'
        ) THEN
          ALTER TABLE sync_devices ALTER COLUMN tenant_id TYPE text USING tenant_id::text;
        END IF;

        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'sync_devices'
            AND column_name = 'device_id'
            AND data_type <> 'text'
        ) THEN
          ALTER TABLE sync_devices ALTER COLUMN device_id TYPE text USING device_id::text;
        END IF;

        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'sync_cursors'
            AND column_name = 'tenant_id'
            AND data_type <> 'text'
        ) THEN
          ALTER TABLE sync_cursors ALTER COLUMN tenant_id TYPE text USING tenant_id::text;
        END IF;

        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'sync_cursors'
            AND column_name = 'device_id'
            AND data_type <> 'text'
        ) THEN
          ALTER TABLE sync_cursors ALTER COLUMN device_id TYPE text USING device_id::text;
        END IF;

        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'sync_cursors'
            AND column_name = 'last_version'
            AND data_type <> 'bigint'
        ) THEN
          ALTER TABLE sync_cursors
            ALTER COLUMN last_version TYPE bigint
            USING CASE
              WHEN last_version::text ~ '^[0-9]+$' THEN last_version::text::bigint
              ELSE 0
            END;
        END IF;

        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'sync_operation_logs'
            AND column_name = 'tenant_id'
            AND data_type <> 'text'
        ) THEN
          ALTER TABLE sync_operation_logs ALTER COLUMN tenant_id TYPE text USING tenant_id::text;
        END IF;

        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'sync_operation_logs'
            AND column_name = 'device_id'
            AND data_type <> 'text'
        ) THEN
          ALTER TABLE sync_operation_logs ALTER COLUMN device_id TYPE text USING device_id::text;
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'sync_operation_logs'
            AND column_name = 'version'
        ) THEN
          ALTER TABLE sync_operation_logs ADD COLUMN version bigint;
        END IF;
      END;
      $$;

      ALTER TABLE sync_operation_logs
        ADD COLUMN IF NOT EXISTS version bigint,
        ALTER COLUMN payload SET DEFAULT '{}'::jsonb,
        ALTER COLUMN payload SET NOT NULL,
        ALTER COLUMN updated_at SET DEFAULT NOW(),
        ALTER COLUMN updated_at SET NOT NULL;

      DO $$
      DECLARE
        version_is_identity boolean;
      BEGIN
        SELECT COALESCE(bool_or(is_identity = 'YES'), false)
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'sync_operation_logs'
          AND column_name = 'version'
        INTO version_is_identity;

        IF NOT version_is_identity THEN
          CREATE SEQUENCE IF NOT EXISTS sync_operation_logs_version_seq;

          UPDATE sync_operation_logs
          SET version = nextval('sync_operation_logs_version_seq')
          WHERE version IS NULL;

          PERFORM setval(
            'sync_operation_logs_version_seq',
            GREATEST(COALESCE((SELECT MAX(version) FROM sync_operation_logs), 0), 1),
            true
          );

          ALTER SEQUENCE sync_operation_logs_version_seq OWNED BY sync_operation_logs.version;
          ALTER TABLE sync_operation_logs
            ALTER COLUMN version SET DEFAULT nextval('sync_operation_logs_version_seq');
        END IF;

        ALTER TABLE sync_operation_logs
          ALTER COLUMN version SET NOT NULL;
      END $$;

      ALTER TABLE sync_devices
        ADD COLUMN IF NOT EXISTS last_push_at timestamptz,
        ADD COLUMN IF NOT EXISTS last_pull_at timestamptz;
      ALTER TABLE sync_devices
        ALTER COLUMN app_version DROP NOT NULL,
        ALTER COLUMN metadata SET DEFAULT '{}'::jsonb,
        ALTER COLUMN metadata SET NOT NULL,
        ALTER COLUMN last_seen_at SET DEFAULT NOW(),
        ALTER COLUMN last_seen_at SET NOT NULL,
        ALTER COLUMN updated_at SET DEFAULT NOW(),
        ALTER COLUMN updated_at SET NOT NULL;

      ALTER TABLE sync_cursors
        ALTER COLUMN last_version SET DEFAULT 0,
        ALTER COLUMN last_version SET NOT NULL,
        ALTER COLUMN updated_at SET DEFAULT NOW(),
        ALTER COLUMN updated_at SET NOT NULL;

      DO $$
      BEGIN
        ALTER TABLE sync_cursors
        DROP CONSTRAINT IF EXISTS ck_sync_cursors_entity;
        ALTER TABLE sync_cursors
        ADD CONSTRAINT ck_sync_cursors_entity CHECK (entity IN ('attendance', 'finance')) NOT VALID;

        ALTER TABLE sync_operation_logs
        DROP CONSTRAINT IF EXISTS ck_sync_operation_logs_entity;
        ALTER TABLE sync_operation_logs
        ADD CONSTRAINT ck_sync_operation_logs_entity CHECK (entity IN ('attendance', 'finance')) NOT VALID;

        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'uq_sync_devices_tenant_id_id'
        ) THEN
          ALTER TABLE sync_devices
          ADD CONSTRAINT uq_sync_devices_tenant_id_id UNIQUE (tenant_id, id);
        END IF;

        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'uq_sync_devices_tenant_device'
        ) THEN
          ALTER TABLE sync_devices
          ADD CONSTRAINT uq_sync_devices_tenant_device UNIQUE (tenant_id, device_id);
        END IF;

        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'uq_sync_cursors_tenant_id_id'
        ) THEN
          ALTER TABLE sync_cursors
          ADD CONSTRAINT uq_sync_cursors_tenant_id_id UNIQUE (tenant_id, id);
        END IF;

        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'uq_sync_operation_logs_tenant_version'
        ) THEN
          ALTER TABLE sync_operation_logs
          ADD CONSTRAINT uq_sync_operation_logs_tenant_version UNIQUE (tenant_id, version);
        END IF;

        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'fk_sync_cursors_device'
        ) THEN
          ALTER TABLE sync_cursors
          ADD CONSTRAINT fk_sync_cursors_device
            FOREIGN KEY (tenant_id, device_id)
            REFERENCES sync_devices (tenant_id, device_id)
            ON DELETE CASCADE;
        END IF;

      END;
      $$;

      CREATE INDEX IF NOT EXISTS ix_sync_devices_last_seen_at
        ON sync_devices (tenant_id, last_seen_at DESC);
      CREATE INDEX IF NOT EXISTS ix_sync_devices_platform
        ON sync_devices (tenant_id, platform, updated_at DESC);
      CREATE INDEX IF NOT EXISTS ix_sync_cursors_device_updated_at
        ON sync_cursors (tenant_id, device_id, updated_at DESC);
      CREATE INDEX IF NOT EXISTS ix_sync_operation_logs_tenant_entity_version
        ON sync_operation_logs (tenant_id, entity, version);
      CREATE INDEX IF NOT EXISTS ix_sync_operation_logs_device_created_at
        ON sync_operation_logs (tenant_id, device_id, created_at DESC);

      ALTER TABLE sync_devices ENABLE ROW LEVEL SECURITY;
      ALTER TABLE sync_devices FORCE ROW LEVEL SECURITY;
      ALTER TABLE sync_cursors ENABLE ROW LEVEL SECURITY;
      ALTER TABLE sync_cursors FORCE ROW LEVEL SECURITY;
      ALTER TABLE sync_operation_logs ENABLE ROW LEVEL SECURITY;
      ALTER TABLE sync_operation_logs FORCE ROW LEVEL SECURITY;

      DROP POLICY IF EXISTS sync_devices_rls_policy ON sync_devices;
      CREATE POLICY sync_devices_rls_policy ON sync_devices
      FOR ALL
      USING (tenant_id = current_setting('app.tenant_id', true))
      WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

      DROP POLICY IF EXISTS sync_cursors_rls_policy ON sync_cursors;
      CREATE POLICY sync_cursors_rls_policy ON sync_cursors
      FOR ALL
      USING (tenant_id = current_setting('app.tenant_id', true))
      WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

      DROP POLICY IF EXISTS sync_operation_logs_select_policy ON sync_operation_logs;
      CREATE POLICY sync_operation_logs_select_policy ON sync_operation_logs
      FOR SELECT
      USING (tenant_id = current_setting('app.tenant_id', true));

      DROP POLICY IF EXISTS sync_operation_logs_insert_policy ON sync_operation_logs;
      CREATE POLICY sync_operation_logs_insert_policy ON sync_operation_logs
      FOR INSERT
      WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

      DROP TRIGGER IF EXISTS trg_sync_devices_set_updated_at ON sync_devices;
      CREATE TRIGGER trg_sync_devices_set_updated_at
      BEFORE UPDATE ON sync_devices
      FOR EACH ROW
      EXECUTE FUNCTION set_updated_at();

      DROP TRIGGER IF EXISTS trg_sync_cursors_set_updated_at ON sync_cursors;
      CREATE TRIGGER trg_sync_cursors_set_updated_at
      BEFORE UPDATE ON sync_cursors
      FOR EACH ROW
      EXECUTE FUNCTION set_updated_at();

      DROP TRIGGER IF EXISTS trg_sync_operation_logs_set_updated_at ON sync_operation_logs;
      DROP TRIGGER IF EXISTS trg_sync_operation_logs_prevent_update ON sync_operation_logs;
      CREATE TRIGGER trg_sync_operation_logs_prevent_update
      BEFORE UPDATE OR DELETE ON sync_operation_logs
      FOR EACH ROW
      EXECUTE FUNCTION app.prevent_append_only_mutation();
    `);

    this.logger.log('Finance sync schema and device registry verified');
  }
}
