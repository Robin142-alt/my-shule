import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class PlatformOnboardingSchemaService implements OnModuleInit {

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

  private readonly logger = new Logger(PlatformOnboardingSchemaService.name);

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

      CREATE TABLE IF NOT EXISTS tenants (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        name text NOT NULL,
        subdomain text NOT NULL,
        status text NOT NULL DEFAULT 'active',
        settings jsonb NOT NULL DEFAULT '{}'::jsonb,
        metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        CONSTRAINT ck_tenants_tenant_id_not_blank CHECK (btrim(tenant_id) <> ''),
        CONSTRAINT ck_tenants_name_not_blank CHECK (btrim(name) <> ''),
        CONSTRAINT ck_tenants_subdomain_not_blank CHECK (btrim(subdomain) <> ''),
        CONSTRAINT ck_tenants_status CHECK (status IN ('active', 'inactive')),
        CONSTRAINT uq_tenants_tenant_id UNIQUE (tenant_id),
        CONSTRAINT uq_tenants_subdomain UNIQUE (subdomain)
      );

      DO $$
      BEGIN
        IF to_regclass('public.tenant_domains') IS NOT NULL THEN
          DROP POLICY IF EXISTS tenant_domains_rls_policy ON tenant_domains;
          ALTER TABLE tenant_domains DROP CONSTRAINT IF EXISTS fk_tenant_domains_tenant;
          ALTER TABLE tenant_domains ALTER COLUMN tenant_id TYPE text USING tenant_id::text;
        END IF;

        IF to_regclass('public.tenants') IS NOT NULL THEN
          DROP POLICY IF EXISTS tenants_rls_policy ON tenants;
          ALTER TABLE tenants ALTER COLUMN tenant_id TYPE text USING tenant_id::text;
          ALTER TABLE tenants ALTER COLUMN settings TYPE jsonb USING
            CASE
              WHEN settings IS NULL OR btrim(settings::text) = '' THEN '{}'::jsonb
              ELSE settings::jsonb
            END;
        END IF;
      END $$;

      ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
      ALTER TABLE tenants FORCE ROW LEVEL SECURITY;
      ALTER TABLE tenants ALTER COLUMN created_at SET DEFAULT NOW();
      ALTER TABLE tenants ALTER COLUMN updated_at SET DEFAULT NOW();
      UPDATE tenants SET created_at = NOW() WHERE created_at IS NULL;
      UPDATE tenants SET updated_at = COALESCE(updated_at, created_at, NOW()) WHERE updated_at IS NULL;
      ALTER TABLE tenants ALTER COLUMN created_at SET NOT NULL;
      ALTER TABLE tenants ALTER COLUMN updated_at SET NOT NULL;

      CREATE TABLE IF NOT EXISTS tenant_domains (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        domain text NOT NULL,
        domain_type text NOT NULL DEFAULT 'custom',
        status text NOT NULL DEFAULT 'pending_verification',
        verified_at timestamptz,
        created_by_user_id uuid,
        metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        CONSTRAINT ck_tenant_domains_tenant_id_not_blank CHECK (btrim(tenant_id) <> ''),
        CONSTRAINT ck_tenant_domains_domain_not_blank CHECK (btrim(domain) <> ''),
        CONSTRAINT ck_tenant_domains_domain_lower CHECK (domain = lower(domain)),
        CONSTRAINT ck_tenant_domains_type CHECK (domain_type IN ('subdomain', 'custom')),
        CONSTRAINT ck_tenant_domains_status CHECK (status IN ('pending_verification', 'active', 'disabled')),
        CONSTRAINT uq_tenant_domains_tenant_id_domain UNIQUE (tenant_id, domain),
        CONSTRAINT uq_tenant_domains_domain UNIQUE (domain),
        CONSTRAINT fk_tenant_domains_tenant
          FOREIGN KEY (tenant_id)
          REFERENCES tenants (tenant_id)
          ON DELETE CASCADE
      );

      ALTER TABLE tenant_domains ENABLE ROW LEVEL SECURITY;
      ALTER TABLE tenant_domains FORCE ROW LEVEL SECURITY;
      ALTER TABLE tenant_domains ALTER COLUMN created_at SET DEFAULT NOW();
      ALTER TABLE tenant_domains ALTER COLUMN updated_at SET DEFAULT NOW();
      UPDATE tenant_domains SET created_at = NOW() WHERE created_at IS NULL;
      UPDATE tenant_domains SET updated_at = COALESCE(updated_at, created_at, NOW()) WHERE updated_at IS NULL;
      ALTER TABLE tenant_domains ALTER COLUMN created_at SET NOT NULL;
      ALTER TABLE tenant_domains ALTER COLUMN updated_at SET NOT NULL;

      DROP POLICY IF EXISTS tenants_rls_policy ON tenants;
      CREATE POLICY tenants_rls_policy ON tenants
      FOR ALL
      USING (
        tenant_id::text = current_setting('app.tenant_id', true)
        OR NULLIF(current_setting('app.role', true), '') = 'platform_owner'
      )
      WITH CHECK (
        tenant_id::text = current_setting('app.tenant_id', true)
        OR NULLIF(current_setting('app.role', true), '') = 'platform_owner'
      );

      DROP POLICY IF EXISTS tenant_domains_rls_policy ON tenant_domains;
      CREATE POLICY tenant_domains_rls_policy ON tenant_domains
      FOR ALL
      USING (
        tenant_id::text = current_setting('app.tenant_id', true)
        OR NULLIF(current_setting('app.role', true), '') = 'platform_owner'
      )
      WITH CHECK (
        tenant_id::text = current_setting('app.tenant_id', true)
        OR NULLIF(current_setting('app.role', true), '') = 'platform_owner'
      );

      DROP TRIGGER IF EXISTS trg_tenants_set_updated_at ON tenants;
      CREATE TRIGGER trg_tenants_set_updated_at
      BEFORE UPDATE ON tenants
      FOR EACH ROW
      EXECUTE FUNCTION set_updated_at();

      DROP TRIGGER IF EXISTS trg_tenant_domains_set_updated_at ON tenant_domains;
      CREATE TRIGGER trg_tenant_domains_set_updated_at
      BEFORE UPDATE ON tenant_domains
      FOR EACH ROW
      EXECUTE FUNCTION set_updated_at();

      -- Platform Broadcasts
      CREATE TABLE IF NOT EXISTS platform_broadcasts (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        subject text NOT NULL,
        target text NOT NULL,
        message text NOT NULL,
        status text NOT NULL DEFAULT 'Sent',
        scheduled_for text NOT NULL DEFAULT 'Immediate',
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW()
      );

      ALTER TABLE platform_broadcasts ENABLE ROW LEVEL SECURITY;
      ALTER TABLE platform_broadcasts FORCE ROW LEVEL SECURITY;

      DROP POLICY IF EXISTS platform_broadcasts_rls_policy ON platform_broadcasts;
      CREATE POLICY platform_broadcasts_rls_policy ON platform_broadcasts
      FOR ALL
      USING (NULLIF(current_setting('app.role', true), '') = 'platform_owner')
      WITH CHECK (NULLIF(current_setting('app.role', true), '') = 'platform_owner');

      DROP TRIGGER IF EXISTS trg_platform_broadcasts_set_updated_at ON platform_broadcasts;
      CREATE TRIGGER trg_platform_broadcasts_set_updated_at
      BEFORE UPDATE ON platform_broadcasts
      FOR EACH ROW
      EXECUTE FUNCTION set_updated_at();

      CREATE INDEX IF NOT EXISTS idx_platform_broadcasts_created_at ON platform_broadcasts (created_at);

      -- Platform Templates
      CREATE TABLE IF NOT EXISTS platform_templates (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        name text NOT NULL,
        type text NOT NULL,
        status text NOT NULL DEFAULT 'Active',
        html_content text,
        css_content text,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW()
      );

      ALTER TABLE platform_templates ENABLE ROW LEVEL SECURITY;
      ALTER TABLE platform_templates FORCE ROW LEVEL SECURITY;

      DROP POLICY IF EXISTS platform_templates_rls_policy ON platform_templates;
      CREATE POLICY platform_templates_rls_policy ON platform_templates
      FOR ALL
      USING (NULLIF(current_setting('app.role', true), '') = 'platform_owner')
      WITH CHECK (NULLIF(current_setting('app.role', true), '') = 'platform_owner');

      DROP TRIGGER IF EXISTS trg_platform_templates_set_updated_at ON platform_templates;
      CREATE TRIGGER trg_platform_templates_set_updated_at
      BEFORE UPDATE ON platform_templates
      FOR EACH ROW
      EXECUTE FUNCTION set_updated_at();

      CREATE INDEX IF NOT EXISTS idx_platform_templates_created_at ON platform_templates (created_at);

      -- Platform Backups
      CREATE TABLE IF NOT EXISTS platform_backups (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        backup_name text NOT NULL,
        size text NOT NULL,
        status text NOT NULL DEFAULT 'Pending',
        last_backup timestamptz NOT NULL DEFAULT NOW(),
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW()
      );

      ALTER TABLE platform_backups ENABLE ROW LEVEL SECURITY;
      ALTER TABLE platform_backups FORCE ROW LEVEL SECURITY;

      DROP POLICY IF EXISTS platform_backups_rls_policy ON platform_backups;
      CREATE POLICY platform_backups_rls_policy ON platform_backups
      FOR ALL
      USING (NULLIF(current_setting('app.role', true), '') = 'platform_owner')
      WITH CHECK (NULLIF(current_setting('app.role', true), '') = 'platform_owner');

      DROP TRIGGER IF EXISTS trg_platform_backups_set_updated_at ON platform_backups;
      CREATE TRIGGER trg_platform_backups_set_updated_at
      BEFORE UPDATE ON platform_backups
      FOR EACH ROW
      EXECUTE FUNCTION set_updated_at();

      CREATE INDEX IF NOT EXISTS idx_platform_backups_created_at ON platform_backups (created_at);

      -- Platform Payment Gateways
      CREATE TABLE IF NOT EXISTS platform_payment_gateways (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        name text NOT NULL,
        gateway_type text NOT NULL,
        environment text NOT NULL DEFAULT 'Sandbox',
        status text NOT NULL DEFAULT 'Active',
        shortcode text,
        metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        CONSTRAINT ck_platform_payment_gateways_name_not_blank CHECK (btrim(name) <> ''),
        CONSTRAINT ck_platform_payment_gateways_type_not_blank CHECK (btrim(gateway_type) <> ''),
        CONSTRAINT ck_platform_payment_gateways_environment CHECK (environment IN ('Sandbox', 'Production')),
        CONSTRAINT ck_platform_payment_gateways_status CHECK (status IN ('Active', 'Inactive', 'Testing'))
      );

      ALTER TABLE platform_payment_gateways ENABLE ROW LEVEL SECURITY;
      ALTER TABLE platform_payment_gateways FORCE ROW LEVEL SECURITY;

      DROP POLICY IF EXISTS platform_payment_gateways_rls_policy ON platform_payment_gateways;
      CREATE POLICY platform_payment_gateways_rls_policy ON platform_payment_gateways
      FOR ALL
      USING (NULLIF(current_setting('app.role', true), '') = 'platform_owner')
      WITH CHECK (NULLIF(current_setting('app.role', true), '') = 'platform_owner');

      DROP TRIGGER IF EXISTS trg_platform_payment_gateways_set_updated_at ON platform_payment_gateways;
      CREATE TRIGGER trg_platform_payment_gateways_set_updated_at
      BEFORE UPDATE ON platform_payment_gateways
      FOR EACH ROW
      EXECUTE FUNCTION set_updated_at();

      CREATE INDEX IF NOT EXISTS idx_platform_payment_gateways_created_at ON platform_payment_gateways (created_at DESC);

      -- Platform Security Policies
      CREATE TABLE IF NOT EXISTS platform_security_policies (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        require_12_chars boolean NOT NULL DEFAULT false,
        require_special_chars boolean NOT NULL DEFAULT false,
        force_90_day_reset boolean NOT NULL DEFAULT false,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW()
      );

      ALTER TABLE platform_security_policies ENABLE ROW LEVEL SECURITY;
      ALTER TABLE platform_security_policies FORCE ROW LEVEL SECURITY;

      DROP POLICY IF EXISTS platform_security_policies_rls_policy ON platform_security_policies;
      CREATE POLICY platform_security_policies_rls_policy ON platform_security_policies
      FOR ALL
      USING (NULLIF(current_setting('app.role', true), '') = 'platform_owner')
      WITH CHECK (NULLIF(current_setting('app.role', true), '') = 'platform_owner');

      DROP TRIGGER IF EXISTS trg_platform_security_policies_set_updated_at ON platform_security_policies;
      CREATE TRIGGER trg_platform_security_policies_set_updated_at
      BEFORE UPDATE ON platform_security_policies
      FOR EACH ROW
      EXECUTE FUNCTION set_updated_at();

      INSERT INTO platform_security_policies (id, require_12_chars, require_special_chars, force_90_day_reset, created_at, updated_at)
      SELECT gen_random_uuid(), false, false, false, NOW(), NOW()
      WHERE NOT EXISTS (SELECT 1 FROM platform_security_policies);

      -- Platform Settings
      CREATE TABLE IF NOT EXISTS platform_settings (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        maintenance_mode boolean NOT NULL DEFAULT false,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW()
      );

      ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;
      ALTER TABLE platform_settings FORCE ROW LEVEL SECURITY;

      DROP POLICY IF EXISTS platform_settings_rls_policy ON platform_settings;
      CREATE POLICY platform_settings_rls_policy ON platform_settings
      FOR ALL
      USING (NULLIF(current_setting('app.role', true), '') = 'platform_owner')
      WITH CHECK (NULLIF(current_setting('app.role', true), '') = 'platform_owner');

      DROP TRIGGER IF EXISTS trg_platform_settings_set_updated_at ON platform_settings;
      CREATE TRIGGER trg_platform_settings_set_updated_at
      BEFORE UPDATE ON platform_settings
      FOR EACH ROW
      EXECUTE FUNCTION set_updated_at();

      INSERT INTO platform_settings (id, maintenance_mode, created_at, updated_at)
      SELECT gen_random_uuid(), false, NOW(), NOW()
      WHERE NOT EXISTS (SELECT 1 FROM platform_settings);
    `);

    this.logger.log('Platform onboarding schema and tenant RLS policies verified');
  }
}
