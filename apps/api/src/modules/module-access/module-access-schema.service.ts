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
        ADD COLUMN IF NOT EXISTS billing_metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

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
        ADD COLUMN IF NOT EXISTS activation_reason text;

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

      CREATE INDEX IF NOT EXISTS ix_school_module_access_tenant_enabled
        ON school_module_access (tenant_id, enabled);
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

    for (const moduleDefinition of MODULE_REGISTRY_SEED as readonly ModuleRegistrySeedItem[]) {
      await this.executeSql(
        `
          INSERT INTO module_registry (
            code, name, description, feature_flags, status,
            base_price_cents, per_student_price_cents, billing_metadata,
            category, route_segment, permission_scopes
          )
          VALUES ($1, $2, $3, $4::jsonb, $5, $6, $7, $8::jsonb, $9, $10, $11::jsonb)
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
        [
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
        ],
      );
    }

    this.logger.log('Module registry and school module access schema verified');
  }
}
