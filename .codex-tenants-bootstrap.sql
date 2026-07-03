
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
    