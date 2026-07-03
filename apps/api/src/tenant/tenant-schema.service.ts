import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

import { DatabaseService } from '../database/database.service';

@Injectable()
export class TenantSchemaService implements OnModuleInit {
  private readonly logger = new Logger(TenantSchemaService.name);
  private bootstrapPromise: Promise<void> | null = null;

  constructor(private readonly databaseService: DatabaseService) {}

  async onModuleInit(): Promise<void> {
    if (!this.bootstrapPromise) {
      this.bootstrapPromise = this.bootstrapSchema().catch((error) => {
        this.bootstrapPromise = null;
        throw error;
      });
    }

    await this.bootstrapPromise;
  }

  private async bootstrapSchema(): Promise<void> {
    await this.databaseService.runSchemaBootstrap(`
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
        updated_at timestamptz NOT NULL DEFAULT NOW()
      );

      DO $$
      BEGIN
        IF to_regclass('public.tenants') IS NOT NULL THEN
          DROP POLICY IF EXISTS tenants_rls_policy ON tenants;
          ALTER TABLE tenants ALTER COLUMN tenant_id TYPE text USING tenant_id::text;
          ALTER TABLE tenants ADD COLUMN IF NOT EXISTS name text;
          ALTER TABLE tenants ADD COLUMN IF NOT EXISTS subdomain text;
          ALTER TABLE tenants ADD COLUMN IF NOT EXISTS status text DEFAULT 'active';
          ALTER TABLE tenants ADD COLUMN IF NOT EXISTS settings jsonb DEFAULT '{}'::jsonb;
          ALTER TABLE tenants ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;
          ALTER TABLE tenants ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT NOW();
          ALTER TABLE tenants ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT NOW();

          UPDATE tenants
          SET
            tenant_id = lower(btrim(COALESCE(NULLIF(tenant_id, ''), id::text))),
            name = COALESCE(NULLIF(name, ''), tenant_id, 'School'),
            subdomain = lower(btrim(COALESCE(NULLIF(subdomain, ''), tenant_id, id::text))),
            status = CASE lower(COALESCE(status, 'active'))
              WHEN 'active' THEN 'active'
              WHEN 'inactive' THEN 'inactive'
              ELSE 'active'
            END,
            settings = COALESCE(settings, '{}'::jsonb),
            metadata = COALESCE(metadata, '{}'::jsonb),
            created_at = COALESCE(created_at, NOW()),
            updated_at = COALESCE(updated_at, NOW());

          ALTER TABLE tenants ALTER COLUMN tenant_id SET NOT NULL;
          ALTER TABLE tenants ALTER COLUMN name SET NOT NULL;
          ALTER TABLE tenants ALTER COLUMN subdomain SET NOT NULL;
          ALTER TABLE tenants ALTER COLUMN status SET NOT NULL;
          ALTER TABLE tenants ALTER COLUMN status SET DEFAULT 'active';
          ALTER TABLE tenants ALTER COLUMN settings SET NOT NULL;
          ALTER TABLE tenants ALTER COLUMN settings SET DEFAULT '{}'::jsonb;
          ALTER TABLE tenants ALTER COLUMN metadata SET NOT NULL;
          ALTER TABLE tenants ALTER COLUMN metadata SET DEFAULT '{}'::jsonb;
          ALTER TABLE tenants ALTER COLUMN created_at SET NOT NULL;
          ALTER TABLE tenants ALTER COLUMN updated_at SET NOT NULL;
        END IF;

        IF to_regclass('public.tenant_domains') IS NOT NULL THEN
          DROP POLICY IF EXISTS tenant_domains_rls_policy ON tenant_domains;
          ALTER TABLE tenant_domains DROP CONSTRAINT IF EXISTS fk_tenant_domains_tenant;
          ALTER TABLE tenant_domains ALTER COLUMN tenant_id TYPE text USING tenant_id::text;
        END IF;
      END $$;

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
        updated_at timestamptz NOT NULL DEFAULT NOW()
      );

      ALTER TABLE tenant_domains ADD COLUMN IF NOT EXISTS domain_type text DEFAULT 'custom';
      ALTER TABLE tenant_domains ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending_verification';
      ALTER TABLE tenant_domains ADD COLUMN IF NOT EXISTS verified_at timestamptz;
      ALTER TABLE tenant_domains ADD COLUMN IF NOT EXISTS created_by_user_id uuid;
      ALTER TABLE tenant_domains ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;
      ALTER TABLE tenant_domains ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT NOW();
      ALTER TABLE tenant_domains ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT NOW();

      UPDATE tenant_domains
      SET
        tenant_id = lower(btrim(tenant_id)),
        domain = lower(btrim(domain)),
        domain_type = CASE lower(COALESCE(domain_type, 'custom'))
          WHEN 'subdomain' THEN 'subdomain'
          ELSE 'custom'
        END,
        status = CASE lower(COALESCE(status, 'pending_verification'))
          WHEN 'active' THEN 'active'
          WHEN 'disabled' THEN 'disabled'
          ELSE 'pending_verification'
        END,
        metadata = COALESCE(metadata, '{}'::jsonb),
        created_at = COALESCE(created_at, NOW()),
        updated_at = COALESCE(updated_at, NOW());

      ALTER TABLE tenant_domains ALTER COLUMN tenant_id SET NOT NULL;
      ALTER TABLE tenant_domains ALTER COLUMN domain SET NOT NULL;
      ALTER TABLE tenant_domains ALTER COLUMN domain_type SET NOT NULL;
      ALTER TABLE tenant_domains ALTER COLUMN domain_type SET DEFAULT 'custom';
      ALTER TABLE tenant_domains ALTER COLUMN status SET NOT NULL;
      ALTER TABLE tenant_domains ALTER COLUMN status SET DEFAULT 'pending_verification';
      ALTER TABLE tenant_domains ALTER COLUMN metadata SET NOT NULL;
      ALTER TABLE tenant_domains ALTER COLUMN metadata SET DEFAULT '{}'::jsonb;
      ALTER TABLE tenant_domains ALTER COLUMN created_at SET NOT NULL;
      ALTER TABLE tenant_domains ALTER COLUMN updated_at SET NOT NULL;

      ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
      ALTER TABLE tenants FORCE ROW LEVEL SECURITY;
      ALTER TABLE tenant_domains ENABLE ROW LEVEL SECURITY;
      ALTER TABLE tenant_domains FORCE ROW LEVEL SECURITY;

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

      CREATE UNIQUE INDEX IF NOT EXISTS uq_tenants_tenant_id ON tenants (tenant_id);
      CREATE UNIQUE INDEX IF NOT EXISTS uq_tenant_domains_domain ON tenant_domains (domain);
      CREATE UNIQUE INDEX IF NOT EXISTS uq_tenant_domains_tenant_id_domain ON tenant_domains (tenant_id, domain);
      CREATE INDEX IF NOT EXISTS idx_tenant_domains_active_verified
        ON tenant_domains (domain, tenant_id)
        WHERE status = 'active' AND verified_at IS NOT NULL;

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
    `);

    this.logger.log('Tenant trust-boundary schema verified');
  }
}
