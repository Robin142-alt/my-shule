import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

import { AuthSchemaService } from '../../auth/auth-schema.service';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class TenantFinanceSchemaService implements OnModuleInit {

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

  private readonly logger = new Logger(TenantFinanceSchemaService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly authSchemaService: AuthSchemaService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.authSchemaService.onModuleInit();

    await this.prisma.runSchemaBootstrap(`
      CREATE EXTENSION IF NOT EXISTS pgcrypto;

      CREATE TABLE IF NOT EXISTS tenant_financial_accounts (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        mpesa_clearing_account_code text NOT NULL DEFAULT '1110-MPESA-CLEARING',
        fee_control_account_code text NOT NULL DEFAULT '1100-AR-FEES',
        currency_code char(3) NOT NULL DEFAULT 'KES',
        status text NOT NULL DEFAULT 'active',
        metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        CONSTRAINT ck_tenant_financial_accounts_currency CHECK (currency_code ~ '^[A-Z]{3}$'),
        CONSTRAINT ck_tenant_financial_accounts_status CHECK (status IN ('draft', 'active', 'inactive', 'revoked')),
        CONSTRAINT uq_tenant_financial_accounts_tenant_id_id UNIQUE (tenant_id, id)
      );

      CREATE UNIQUE INDEX IF NOT EXISTS ux_tenant_financial_accounts_active_tenant
        ON tenant_financial_accounts (tenant_id)
        WHERE status = 'active';

      CREATE TABLE IF NOT EXISTS tenant_mpesa_configs (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        shortcode text NOT NULL,
        paybill_number text,
        till_number text,
        consumer_key text NOT NULL,
        consumer_secret text NOT NULL,
        passkey text NOT NULL,
        callback_secret_hash text,
        callback_secret_rotated_at timestamptz,
        initiator_name text,
        environment text NOT NULL DEFAULT 'sandbox',
        callback_url text NOT NULL,
        status text NOT NULL DEFAULT 'draft',
        credential_version integer NOT NULL DEFAULT 1,
        rotated_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        CONSTRAINT ck_tenant_mpesa_configs_shortcode_not_blank CHECK (btrim(shortcode) <> ''),
        CONSTRAINT ck_tenant_mpesa_configs_receiving_channel CHECK (
          paybill_number IS NOT NULL OR till_number IS NOT NULL
        ),
        CONSTRAINT ck_tenant_mpesa_configs_environment CHECK (environment IN ('sandbox', 'production')),
        CONSTRAINT ck_tenant_mpesa_configs_status CHECK (status IN ('draft', 'active', 'inactive', 'revoked')),
        CONSTRAINT ck_tenant_mpesa_configs_callback_url CHECK (callback_url ~ '^https://'),
        CONSTRAINT ck_tenant_mpesa_configs_callback_secret_hash CHECK (
          callback_secret_hash IS NULL OR callback_secret_hash ~ '^[a-f0-9]{64}$'
        ),
        CONSTRAINT ck_tenant_mpesa_configs_credential_version CHECK (credential_version > 0),
        CONSTRAINT uq_tenant_mpesa_configs_tenant_id_id UNIQUE (tenant_id, id)
      );

      ALTER TABLE tenant_mpesa_configs
        ADD COLUMN IF NOT EXISTS callback_secret_hash text;
      ALTER TABLE tenant_mpesa_configs
        ADD COLUMN IF NOT EXISTS callback_secret_rotated_at timestamptz;
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'ck_tenant_mpesa_configs_callback_secret_hash'
        ) THEN
          ALTER TABLE tenant_mpesa_configs
            ADD CONSTRAINT ck_tenant_mpesa_configs_callback_secret_hash
            CHECK (callback_secret_hash IS NULL OR callback_secret_hash ~ '^[a-f0-9]{64}$');
        END IF;
      END $$;

      CREATE INDEX IF NOT EXISTS ix_tenant_mpesa_configs_tenant_status
        ON tenant_mpesa_configs (tenant_id, status, updated_at DESC);
      CREATE INDEX IF NOT EXISTS ix_tenant_mpesa_configs_shortcode
        ON tenant_mpesa_configs (shortcode);
      CREATE UNIQUE INDEX IF NOT EXISTS ux_tenant_mpesa_configs_tenant_shortcode
        ON tenant_mpesa_configs (tenant_id, shortcode);
      CREATE UNIQUE INDEX IF NOT EXISTS ux_tenant_mpesa_configs_active_shortcode
        ON tenant_mpesa_configs (shortcode)
        WHERE status = 'active';
      CREATE UNIQUE INDEX IF NOT EXISTS ux_tenant_mpesa_configs_active_tenant_environment_channel
        ON tenant_mpesa_configs (
          tenant_id,
          environment,
          COALESCE(paybill_number, ''),
          COALESCE(till_number, '')
        )
        WHERE status = 'active';

      CREATE TABLE IF NOT EXISTS mpesa_config_audit_logs (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        mpesa_config_id uuid NOT NULL,
        action text NOT NULL,
        changed_fields text[] NOT NULL DEFAULT ARRAY[]::text[],
        old_values jsonb NOT NULL DEFAULT '{}'::jsonb,
        new_values jsonb NOT NULL DEFAULT '{}'::jsonb,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        CONSTRAINT ck_mpesa_config_audit_logs_action_not_blank CHECK (btrim(action) <> ''),
        CONSTRAINT uq_mpesa_config_audit_logs_tenant_id_id UNIQUE (tenant_id, id),
        CONSTRAINT fk_mpesa_config_audit_logs_mpesa_config
          FOREIGN KEY (tenant_id, mpesa_config_id)
          REFERENCES tenant_mpesa_configs (tenant_id, id)
          ON DELETE RESTRICT
      );

      CREATE INDEX IF NOT EXISTS ix_mpesa_config_audit_logs_config_created
        ON mpesa_config_audit_logs (tenant_id, mpesa_config_id, created_at DESC);

      CREATE TABLE IF NOT EXISTS tenant_bank_accounts (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        bank_name text NOT NULL,
        branch_name text,
        account_name text NOT NULL,
        account_number text NOT NULL,
        account_number_hash text NOT NULL,
        currency char(3) NOT NULL DEFAULT 'KES',
        status text NOT NULL DEFAULT 'active',
        metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        CONSTRAINT ck_tenant_bank_accounts_bank_name_not_blank CHECK (btrim(bank_name) <> ''),
        CONSTRAINT ck_tenant_bank_accounts_account_name_not_blank CHECK (btrim(account_name) <> ''),
        CONSTRAINT ck_tenant_bank_accounts_currency CHECK (currency ~ '^[A-Z]{3}$'),
        CONSTRAINT ck_tenant_bank_accounts_status CHECK (status IN ('draft', 'active', 'inactive', 'revoked')),
        CONSTRAINT uq_tenant_bank_accounts_tenant_id_id UNIQUE (tenant_id, id),
        CONSTRAINT uq_tenant_bank_accounts_tenant_account_hash UNIQUE (tenant_id, account_number_hash)
      );

      CREATE INDEX IF NOT EXISTS ix_tenant_bank_accounts_tenant_status
        ON tenant_bank_accounts (tenant_id, status, bank_name);

      CREATE TABLE IF NOT EXISTS tenant_payment_channels (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        channel_type text NOT NULL,
        name text NOT NULL,
        mpesa_config_id uuid,
        bank_account_id uuid,
        status text NOT NULL DEFAULT 'inactive',
        metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        CONSTRAINT ck_tenant_payment_channels_type CHECK (
          channel_type IN ('mpesa_paybill', 'mpesa_till', 'bank_account', 'manual_bank_deposit')
        ),
        CONSTRAINT ck_tenant_payment_channels_status CHECK (status IN ('active', 'inactive', 'testing')),
        CONSTRAINT ck_tenant_payment_channels_name_not_blank CHECK (btrim(name) <> ''),
        CONSTRAINT ck_tenant_payment_channels_target CHECK (
          (channel_type IN ('mpesa_paybill', 'mpesa_till') AND mpesa_config_id IS NOT NULL)
          OR (channel_type IN ('bank_account', 'manual_bank_deposit') AND bank_account_id IS NOT NULL)
        ),
        CONSTRAINT uq_tenant_payment_channels_tenant_id_id UNIQUE (tenant_id, id),
        CONSTRAINT fk_tenant_payment_channels_mpesa_config
          FOREIGN KEY (tenant_id, mpesa_config_id)
          REFERENCES tenant_mpesa_configs (tenant_id, id)
          ON DELETE RESTRICT,
        CONSTRAINT fk_tenant_payment_channels_bank_account
          FOREIGN KEY (tenant_id, bank_account_id)
          REFERENCES tenant_bank_accounts (tenant_id, id)
          ON DELETE RESTRICT
      );

      CREATE INDEX IF NOT EXISTS ix_tenant_payment_channels_tenant_status
        ON tenant_payment_channels (tenant_id, status, channel_type);
      CREATE UNIQUE INDEX IF NOT EXISTS ux_tenant_payment_channels_active_mpesa_config
        ON tenant_payment_channels (tenant_id, mpesa_config_id)
        WHERE status = 'active' AND mpesa_config_id IS NOT NULL;

      CREATE TABLE IF NOT EXISTS mpesa_callback_channels (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        channel_id uuid NOT NULL,
        shortcode text NOT NULL,
        environment text NOT NULL DEFAULT 'sandbox',
        callback_secret_hash text NOT NULL,
        allowed_source_cidrs cidr[] NOT NULL DEFAULT ARRAY[]::cidr[],
        requires_edge_signature boolean NOT NULL DEFAULT TRUE,
        requires_transaction_status boolean NOT NULL DEFAULT TRUE,
        secret_version integer NOT NULL DEFAULT 1,
        is_current boolean NOT NULL DEFAULT TRUE,
        accepts_until timestamptz,
        rotated_from_id uuid,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        rotated_at timestamptz,
        disabled_at timestamptz,
        CONSTRAINT ck_mpesa_callback_channels_shortcode_not_blank CHECK (btrim(shortcode) <> ''),
        CONSTRAINT ck_mpesa_callback_channels_environment CHECK (environment IN ('sandbox', 'production')),
        CONSTRAINT ck_mpesa_callback_channels_secret_hash CHECK (callback_secret_hash ~ '^[a-f0-9]{64}$'),
        CONSTRAINT ck_mpesa_callback_channels_secret_version CHECK (secret_version > 0),
        CONSTRAINT uq_mpesa_callback_channels_tenant_id_id UNIQUE (tenant_id, id),
        CONSTRAINT fk_mpesa_callback_channels_payment_channel
          FOREIGN KEY (tenant_id, channel_id)
          REFERENCES tenant_payment_channels (tenant_id, id)
          ON DELETE RESTRICT
      );

      CREATE INDEX IF NOT EXISTS ix_mpesa_callback_channels_tenant_shortcode
        ON mpesa_callback_channels (tenant_id, shortcode, environment)
        WHERE disabled_at IS NULL;
      ALTER TABLE mpesa_callback_channels
        ADD COLUMN IF NOT EXISTS secret_version integer NOT NULL DEFAULT 1;
      ALTER TABLE mpesa_callback_channels
        ADD COLUMN IF NOT EXISTS is_current boolean NOT NULL DEFAULT TRUE;
      ALTER TABLE mpesa_callback_channels
        ADD COLUMN IF NOT EXISTS accepts_until timestamptz;
      ALTER TABLE mpesa_callback_channels
        ADD COLUMN IF NOT EXISTS rotated_from_id uuid;
      DROP INDEX IF EXISTS ux_mpesa_callback_channels_active_channel_environment;
      CREATE UNIQUE INDEX IF NOT EXISTS ux_mpesa_callback_channels_current_channel_environment
        ON mpesa_callback_channels (tenant_id, channel_id, environment)
        WHERE disabled_at IS NULL AND is_current = TRUE;
      CREATE UNIQUE INDEX IF NOT EXISTS ux_mpesa_callback_channels_secret_hash
        ON mpesa_callback_channels (tenant_id, channel_id, environment, callback_secret_hash)
        WHERE disabled_at IS NULL;

      ALTER TABLE tenant_financial_accounts ENABLE ROW LEVEL SECURITY;
      ALTER TABLE tenant_financial_accounts FORCE ROW LEVEL SECURITY;
      ALTER TABLE tenant_mpesa_configs ENABLE ROW LEVEL SECURITY;
      ALTER TABLE tenant_mpesa_configs FORCE ROW LEVEL SECURITY;
      ALTER TABLE mpesa_config_audit_logs ENABLE ROW LEVEL SECURITY;
      ALTER TABLE mpesa_config_audit_logs FORCE ROW LEVEL SECURITY;
      ALTER TABLE tenant_bank_accounts ENABLE ROW LEVEL SECURITY;
      ALTER TABLE tenant_bank_accounts FORCE ROW LEVEL SECURITY;
      ALTER TABLE tenant_payment_channels ENABLE ROW LEVEL SECURITY;
      ALTER TABLE tenant_payment_channels FORCE ROW LEVEL SECURITY;
      ALTER TABLE mpesa_callback_channels ENABLE ROW LEVEL SECURITY;
      ALTER TABLE mpesa_callback_channels FORCE ROW LEVEL SECURITY;

      DROP POLICY IF EXISTS tenant_financial_accounts_rls_policy ON tenant_financial_accounts;
      CREATE POLICY tenant_financial_accounts_rls_policy ON tenant_financial_accounts
      FOR ALL
      USING (tenant_id = current_setting('app.tenant_id', true))
      WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

      DROP POLICY IF EXISTS tenant_mpesa_configs_rls_policy ON tenant_mpesa_configs;
      CREATE POLICY tenant_mpesa_configs_rls_policy ON tenant_mpesa_configs
      FOR ALL
      USING (tenant_id = current_setting('app.tenant_id', true))
      WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

      DROP POLICY IF EXISTS mpesa_config_audit_logs_rls_policy ON mpesa_config_audit_logs;
      CREATE POLICY mpesa_config_audit_logs_rls_policy ON mpesa_config_audit_logs
      FOR ALL
      USING (tenant_id = current_setting('app.tenant_id', true))
      WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

      DROP POLICY IF EXISTS tenant_bank_accounts_rls_policy ON tenant_bank_accounts;
      CREATE POLICY tenant_bank_accounts_rls_policy ON tenant_bank_accounts
      FOR ALL
      USING (tenant_id = current_setting('app.tenant_id', true))
      WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

      DROP POLICY IF EXISTS tenant_payment_channels_rls_policy ON tenant_payment_channels;
      CREATE POLICY tenant_payment_channels_rls_policy ON tenant_payment_channels
      FOR ALL
      USING (tenant_id = current_setting('app.tenant_id', true))
      WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

      DROP POLICY IF EXISTS mpesa_callback_channels_rls_policy ON mpesa_callback_channels;
      CREATE POLICY mpesa_callback_channels_rls_policy ON mpesa_callback_channels
      FOR ALL
      USING (tenant_id = current_setting('app.tenant_id', true))
      WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

      DROP TRIGGER IF EXISTS trg_tenant_financial_accounts_set_updated_at ON tenant_financial_accounts;
      CREATE TRIGGER trg_tenant_financial_accounts_set_updated_at
      BEFORE UPDATE ON tenant_financial_accounts
      FOR EACH ROW
      EXECUTE FUNCTION set_updated_at();

      DROP TRIGGER IF EXISTS trg_tenant_mpesa_configs_set_updated_at ON tenant_mpesa_configs;
      CREATE TRIGGER trg_tenant_mpesa_configs_set_updated_at
      BEFORE UPDATE ON tenant_mpesa_configs
      FOR EACH ROW
      EXECUTE FUNCTION set_updated_at();

      DROP TRIGGER IF EXISTS trg_tenant_bank_accounts_set_updated_at ON tenant_bank_accounts;
      CREATE TRIGGER trg_tenant_bank_accounts_set_updated_at
      BEFORE UPDATE ON tenant_bank_accounts
      FOR EACH ROW
      EXECUTE FUNCTION set_updated_at();

      DROP TRIGGER IF EXISTS trg_tenant_payment_channels_set_updated_at ON tenant_payment_channels;
      CREATE TRIGGER trg_tenant_payment_channels_set_updated_at
      BEFORE UPDATE ON tenant_payment_channels
      FOR EACH ROW
      EXECUTE FUNCTION set_updated_at();
    `);

    this.logger.log('Tenant-owned finance configuration schema and RLS policies verified');
  }
}
