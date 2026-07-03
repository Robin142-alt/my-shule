import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service';
import {
  MODULE_REGISTRY_SEED,
  ModuleRegistrySeedItem,
} from './module-access.constants';

@Injectable()
export class ModuleAccessSchemaService implements OnModuleInit {

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

  private readonly logger = new Logger(ModuleAccessSchemaService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit(): Promise<void> {
    await this.prisma.runSchemaBootstrap(`
      CREATE EXTENSION IF NOT EXISTS pgcrypto;

      CREATE TABLE IF NOT EXISTS module_registry (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        code text NOT NULL UNIQUE,
        name text NOT NULL,
        description text NOT NULL,
        feature_flags jsonb NOT NULL DEFAULT '{}'::jsonb,
        status text NOT NULL DEFAULT 'active',
        base_price_cents integer NOT NULL DEFAULT 0,
        per_student_price_cents integer NOT NULL DEFAULT 0,
        billing_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
        category text NOT NULL DEFAULT 'operations',
        route_segment text,
        permission_scopes jsonb NOT NULL DEFAULT '[]'::jsonb,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        audit_log_reference uuid,
        CONSTRAINT ck_module_registry_status CHECK (status IN ('active', 'inactive')),
        CONSTRAINT ck_module_registry_pricing_non_negative CHECK (
          base_price_cents >= 0 AND per_student_price_cents >= 0
        )
      );

      ALTER TABLE module_registry
        ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'operations',
        ADD COLUMN IF NOT EXISTS route_segment text,
        ADD COLUMN IF NOT EXISTS permission_scopes jsonb NOT NULL DEFAULT '[]'::jsonb,
        ADD COLUMN IF NOT EXISTS feature_flags jsonb NOT NULL DEFAULT '{}'::jsonb,
        ADD COLUMN IF NOT EXISTS billing_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
        ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT NOW(),
        ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT NOW();

      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'module_registry'
            AND column_name = 'tenant_id'
            AND data_type <> 'text'
        ) THEN
          ALTER TABLE module_registry ALTER COLUMN tenant_id TYPE text USING tenant_id::text;
        END IF;

        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'module_registry'
            AND column_name = 'tenant_id'
        ) THEN
          ALTER TABLE module_registry ALTER COLUMN tenant_id SET DEFAULT 'global';
          UPDATE module_registry SET tenant_id = COALESCE(NULLIF(tenant_id, ''), 'global') WHERE tenant_id IS NULL OR tenant_id = '';
          ALTER TABLE module_registry ALTER COLUMN tenant_id SET NOT NULL;
        END IF;

        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'module_registry'
            AND column_name = 'feature_flags'
            AND data_type <> 'jsonb'
        ) THEN
          ALTER TABLE module_registry ALTER COLUMN feature_flags TYPE jsonb USING COALESCE(NULLIF(feature_flags, ''), '{}')::jsonb;
        END IF;

        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'module_registry'
            AND column_name = 'permission_scopes'
            AND data_type <> 'jsonb'
        ) THEN
          ALTER TABLE module_registry ALTER COLUMN permission_scopes TYPE jsonb USING COALESCE(NULLIF(permission_scopes, ''), '[]')::jsonb;
        END IF;

        ALTER TABLE module_registry ALTER COLUMN feature_flags SET DEFAULT '{}'::jsonb;
        ALTER TABLE module_registry ALTER COLUMN feature_flags SET NOT NULL;
        ALTER TABLE module_registry ALTER COLUMN permission_scopes SET DEFAULT '[]'::jsonb;
        ALTER TABLE module_registry ALTER COLUMN permission_scopes SET NOT NULL;
        ALTER TABLE module_registry ALTER COLUMN billing_metadata SET DEFAULT '{}'::jsonb;
        ALTER TABLE module_registry ALTER COLUMN billing_metadata SET NOT NULL;
        ALTER TABLE module_registry ALTER COLUMN created_at SET DEFAULT NOW();
        UPDATE module_registry SET created_at = NOW() WHERE created_at IS NULL;
        ALTER TABLE module_registry ALTER COLUMN created_at SET NOT NULL;
        ALTER TABLE module_registry ALTER COLUMN updated_at SET DEFAULT NOW();
        UPDATE module_registry SET updated_at = COALESCE(updated_at, created_at, NOW()) WHERE updated_at IS NULL;
        ALTER TABLE module_registry ALTER COLUMN updated_at SET NOT NULL;
        ALTER TABLE module_registry ALTER COLUMN route_segment DROP NOT NULL;
      END;
      $$;

      CREATE TABLE IF NOT EXISTS school_module_access (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        module_id uuid NOT NULL REFERENCES module_registry(id),
        enabled boolean NOT NULL DEFAULT true,
        enabled_at timestamptz,
        disabled_at timestamptz,
        updated_by uuid,
        access_level text NOT NULL DEFAULT 'standard',
        trial_ends_at timestamptz,
        expires_at timestamptz,
        billing_plan_code text,
        feature_flags jsonb NOT NULL DEFAULT '{}'::jsonb,
        activation_reason text,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        audit_log_reference uuid,
        CONSTRAINT uq_school_module_access_tenant_id_id UNIQUE (tenant_id, id),
        CONSTRAINT uq_school_module_access UNIQUE (tenant_id, module_id),
        CONSTRAINT ck_school_module_access_dates CHECK (
          (enabled = true AND enabled_at IS NOT NULL AND disabled_at IS NULL)
          OR (enabled = false AND disabled_at IS NOT NULL)
        )
      );

      ALTER TABLE school_module_access
        ADD COLUMN IF NOT EXISTS access_level text NOT NULL DEFAULT 'standard',
        ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz,
        ADD COLUMN IF NOT EXISTS expires_at timestamptz,
        ADD COLUMN IF NOT EXISTS billing_plan_code text,
        ADD COLUMN IF NOT EXISTS feature_flags jsonb NOT NULL DEFAULT '{}'::jsonb,
        ADD COLUMN IF NOT EXISTS activation_reason text,
        ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT NOW(),
        ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT NOW();

      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'school_module_access'
            AND column_name = 'tenant_id'
            AND data_type <> 'text'
        ) THEN
          ALTER TABLE school_module_access ALTER COLUMN tenant_id TYPE text USING tenant_id::text;
        END IF;

        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'school_module_access'
            AND column_name = 'enabled'
            AND data_type <> 'boolean'
        ) THEN
          ALTER TABLE school_module_access ALTER COLUMN enabled TYPE boolean USING lower(enabled) IN ('true', 't', '1', 'yes', 'enabled', 'active');
        END IF;

        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'school_module_access'
            AND column_name = 'feature_flags'
            AND data_type <> 'jsonb'
        ) THEN
          ALTER TABLE school_module_access ALTER COLUMN feature_flags TYPE jsonb USING COALESCE(NULLIF(feature_flags, ''), '{}')::jsonb;
        END IF;

        ALTER TABLE school_module_access ALTER COLUMN enabled SET DEFAULT true;
        ALTER TABLE school_module_access ALTER COLUMN enabled SET NOT NULL;
        ALTER TABLE school_module_access ALTER COLUMN feature_flags SET DEFAULT '{}'::jsonb;
        ALTER TABLE school_module_access ALTER COLUMN feature_flags SET NOT NULL;
        ALTER TABLE school_module_access ALTER COLUMN created_at SET DEFAULT NOW();
        UPDATE school_module_access SET created_at = NOW() WHERE created_at IS NULL;
        ALTER TABLE school_module_access ALTER COLUMN created_at SET NOT NULL;
        ALTER TABLE school_module_access ALTER COLUMN updated_at SET DEFAULT NOW();
        UPDATE school_module_access SET updated_at = COALESCE(updated_at, created_at, NOW()) WHERE updated_at IS NULL;
        ALTER TABLE school_module_access ALTER COLUMN updated_at SET NOT NULL;
        ALTER TABLE school_module_access ALTER COLUMN enabled_at DROP NOT NULL;
        ALTER TABLE school_module_access ALTER COLUMN disabled_at DROP NOT NULL;
        ALTER TABLE school_module_access ALTER COLUMN updated_by DROP NOT NULL;
        ALTER TABLE school_module_access ALTER COLUMN trial_ends_at DROP NOT NULL;
        ALTER TABLE school_module_access ALTER COLUMN expires_at DROP NOT NULL;
        ALTER TABLE school_module_access ALTER COLUMN billing_plan_code DROP NOT NULL;
        ALTER TABLE school_module_access ALTER COLUMN activation_reason DROP NOT NULL;
      END;
      $$;

      UPDATE school_module_access
      SET access_level = 'standard',
          trial_ends_at = NULL,
          expires_at = NULL,
          billing_plan_code = NULL,
          updated_at = NOW()
      WHERE enabled = true
        AND (
          expires_at <= NOW()
          OR (access_level = 'trial' AND trial_ends_at <= NOW())
        );

      WITH ranked_school_module_access AS (
        SELECT
          id,
          ROW_NUMBER() OVER (
            PARTITION BY tenant_id, module_id
            ORDER BY
              enabled DESC,
              enabled_at DESC NULLS LAST,
              updated_at DESC NULLS LAST,
              created_at DESC NULLS LAST,
              id DESC
          ) AS duplicate_rank
        FROM school_module_access
      )
      DELETE FROM school_module_access sma
      USING ranked_school_module_access ranked
      WHERE sma.id = ranked.id
        AND ranked.duplicate_rank > 1;

      CREATE TABLE IF NOT EXISTS module_packages (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        code text NOT NULL UNIQUE,
        name text NOT NULL,
        description text,
        pricing_model text NOT NULL DEFAULT 'custom',
        billing_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
        is_active boolean NOT NULL DEFAULT true,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        audit_log_reference uuid,
        CONSTRAINT ck_module_packages_pricing_model CHECK (
          pricing_model IN ('per_student', 'per_module', 'tiered', 'enterprise', 'custom')
        )
      );

      CREATE TABLE IF NOT EXISTS module_package_items (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        package_id uuid NOT NULL REFERENCES module_packages(id),
        module_code text NOT NULL,
        feature_flags jsonb NOT NULL DEFAULT '{}'::jsonb,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        audit_log_reference uuid,
        UNIQUE(package_id, module_code)
      );

      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'module_packages'
            AND column_name = 'tenant_id'
            AND data_type <> 'text'
        ) THEN
          ALTER TABLE module_packages ALTER COLUMN tenant_id TYPE text USING tenant_id::text;
        END IF;

        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'module_packages'
            AND column_name = 'tenant_id'
        ) THEN
          ALTER TABLE module_packages ALTER COLUMN tenant_id SET DEFAULT 'global';
          UPDATE module_packages SET tenant_id = COALESCE(NULLIF(tenant_id, ''), 'global') WHERE tenant_id IS NULL OR tenant_id = '';
          ALTER TABLE module_packages ALTER COLUMN tenant_id SET NOT NULL;
        END IF;

        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'module_package_items'
            AND column_name = 'tenant_id'
            AND data_type <> 'text'
        ) THEN
          ALTER TABLE module_package_items ALTER COLUMN tenant_id TYPE text USING tenant_id::text;
        END IF;

        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'module_package_items'
            AND column_name = 'tenant_id'
        ) THEN
          ALTER TABLE module_package_items ALTER COLUMN tenant_id SET DEFAULT 'global';
          UPDATE module_package_items SET tenant_id = COALESCE(NULLIF(tenant_id, ''), 'global') WHERE tenant_id IS NULL OR tenant_id = '';
          ALTER TABLE module_package_items ALTER COLUMN tenant_id SET NOT NULL;
        END IF;

        ALTER TABLE module_package_items ADD COLUMN IF NOT EXISTS feature_flags jsonb NOT NULL DEFAULT '{}'::jsonb;
      END;
      $$;

      CREATE TABLE IF NOT EXISTS module_usage_events (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        module_code text NOT NULL,
        event_name text NOT NULL,
        actor_user_id uuid,
        metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        audit_log_reference uuid
      );

      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'module_usage_events'
            AND column_name = 'tenant_id'
            AND data_type <> 'text'
        ) THEN
          ALTER TABLE module_usage_events ALTER COLUMN tenant_id TYPE text USING tenant_id::text;
        END IF;

        ALTER TABLE module_usage_events ALTER COLUMN actor_user_id DROP NOT NULL;
        ALTER TABLE module_usage_events ALTER COLUMN metadata SET DEFAULT '{}'::jsonb;
        ALTER TABLE module_usage_events ALTER COLUMN metadata SET NOT NULL;
      END;
      $$;

      CREATE INDEX IF NOT EXISTS ix_school_module_access_tenant_enabled
        ON school_module_access (tenant_id, enabled);
      CREATE UNIQUE INDEX IF NOT EXISTS ux_module_registry_code
        ON module_registry (code);
      CREATE UNIQUE INDEX IF NOT EXISTS ux_school_module_access_tenant_module
        ON school_module_access (tenant_id, module_id);
      CREATE UNIQUE INDEX IF NOT EXISTS ux_school_module_access_tenant_id
        ON school_module_access (tenant_id, id);
      CREATE INDEX IF NOT EXISTS ix_school_module_access_module
        ON school_module_access (module_id, enabled);
      CREATE INDEX IF NOT EXISTS ix_module_usage_events_tenant_module
        ON module_usage_events (tenant_id, module_code, created_at DESC);

      ALTER TABLE school_module_access ENABLE ROW LEVEL SECURITY;
      ALTER TABLE school_module_access FORCE ROW LEVEL SECURITY;
      ALTER TABLE module_usage_events ENABLE ROW LEVEL SECURITY;
      ALTER TABLE module_usage_events FORCE ROW LEVEL SECURITY;

      DROP POLICY IF EXISTS school_module_access_tenant_policy ON school_module_access;
      CREATE POLICY school_module_access_tenant_policy ON school_module_access
      FOR ALL USING (
        tenant_id = current_setting('app.tenant_id', true)
        OR NULLIF(current_setting('app.role', true), '') IN ('system', 'superadmin', 'platform_owner')
      )
      WITH CHECK (
        tenant_id = current_setting('app.tenant_id', true)
        OR NULLIF(current_setting('app.role', true), '') IN ('system', 'superadmin', 'platform_owner')
      );

      DROP POLICY IF EXISTS module_usage_events_tenant_policy ON module_usage_events;
      CREATE POLICY module_usage_events_tenant_policy ON module_usage_events
      FOR ALL USING (
        tenant_id = current_setting('app.tenant_id', true)
        OR NULLIF(current_setting('app.role', true), '') IN ('system', 'superadmin', 'platform_owner')
      )
      WITH CHECK (
        tenant_id = current_setting('app.tenant_id', true)
        OR NULLIF(current_setting('app.role', true), '') IN ('system', 'superadmin', 'platform_owner')
      );
    `);

    const seedValues: unknown[] = [];
    const seedRows = (MODULE_REGISTRY_SEED as readonly ModuleRegistrySeedItem[]).map((moduleDefinition) => {
      const offset = seedValues.length;

      seedValues.push(
        moduleDefinition.code,
        moduleDefinition.name,
        moduleDefinition.description,
        JSON.stringify(moduleDefinition.feature_flags ?? {}),
        moduleDefinition.status ?? 'active',
        moduleDefinition.base_price_cents ?? 0,
        moduleDefinition.per_student_price_cents ?? 0,
        JSON.stringify(moduleDefinition.billing_metadata ?? {}),
        moduleDefinition.category ?? 'operations',
        moduleDefinition.route_segment ?? null,
        JSON.stringify(moduleDefinition.permission_scopes ?? []),
      );

      return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}::jsonb, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}::jsonb, $${offset + 9}, $${offset + 10}, $${offset + 11}::jsonb, NOW(), NOW())`;
    }).join(',\n');

    await this.executeSql(
      `
        INSERT INTO module_registry (
          code, name, description, feature_flags, status,
          base_price_cents, per_student_price_cents, billing_metadata,
          category, route_segment, permission_scopes, created_at, updated_at
        )
        VALUES ${seedRows}
        ON CONFLICT (code)
        DO UPDATE SET
          name = EXCLUDED.name,
          description = EXCLUDED.description,
          feature_flags = EXCLUDED.feature_flags,
          status = EXCLUDED.status,
          base_price_cents = EXCLUDED.base_price_cents,
          per_student_price_cents = EXCLUDED.per_student_price_cents,
          billing_metadata = EXCLUDED.billing_metadata,
          category = EXCLUDED.category,
          route_segment = EXCLUDED.route_segment,
          permission_scopes = EXCLUDED.permission_scopes,
          updated_at = NOW()
      `,
      seedValues,
    );

    this.logger.log('Module registry and school module access schema verified');
  }
}
