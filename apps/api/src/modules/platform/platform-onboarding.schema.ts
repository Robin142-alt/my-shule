import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class PlatformOnboardingSchemaService implements OnModuleInit {

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

      ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
      ALTER TABLE tenants FORCE ROW LEVEL SECURITY;

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

      DROP POLICY IF EXISTS tenants_rls_policy ON tenants;
      CREATE POLICY tenants_rls_policy ON tenants
      FOR ALL
      USING (
        tenant_id = current_setting('app.tenant_id', true)
        OR NULLIF(current_setting('app.role', true), '') = 'platform_owner'
      )
      WITH CHECK (
        tenant_id = current_setting('app.tenant_id', true)
        OR NULLIF(current_setting('app.role', true), '') = 'platform_owner'
      );

      DROP POLICY IF EXISTS tenant_domains_rls_policy ON tenant_domains;
      CREATE POLICY tenant_domains_rls_policy ON tenant_domains
      FOR ALL
      USING (
        tenant_id = current_setting('app.tenant_id', true)
        OR NULLIF(current_setting('app.role', true), '') = 'platform_owner'
      )
      WITH CHECK (
        tenant_id = current_setting('app.tenant_id', true)
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
    `);

    this.logger.log('Platform onboarding schema and tenant RLS policies verified');
  }
}
