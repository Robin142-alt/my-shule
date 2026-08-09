import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service';

const TENANT_TABLES = [
  'school_sms_wallets',
  'sms_logs',
  'sms_wallet_transactions',
  'sms_purchase_requests',
  'school_integrations',
  'integration_logs',
  'school_onboarding_status',
  'parent_otp_challenges',
] as const;

@Injectable()
export class IntegrationsSchemaService implements OnModuleInit {

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

  private readonly logger = new Logger(IntegrationsSchemaService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit(): Promise<void> {
    await this.prisma.runSchemaBootstrap(`
      CREATE EXTENSION IF NOT EXISTS pgcrypto;

      CREATE TABLE IF NOT EXISTS platform_sms_providers (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        provider_name text NOT NULL,
        provider_code text NOT NULL CHECK (provider_code IN ('textsms_kenya', 'africas_talking', 'twilio')),
        api_key_ciphertext text NOT NULL,
        username_ciphertext text,
        sender_id text NOT NULL,
        base_url text,
        is_active boolean NOT NULL DEFAULT FALSE,
        is_default boolean NOT NULL DEFAULT FALSE,
        last_test_status text,
        last_tested_at timestamptz,
        metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
        created_by_user_id uuid,
        updated_by_user_id uuid,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        CONSTRAINT ck_platform_sms_sender_not_blank CHECK (btrim(sender_id) <> ''),
        CONSTRAINT uq_platform_sms_provider_code UNIQUE (provider_code)
      );

      CREATE UNIQUE INDEX IF NOT EXISTS ux_platform_sms_default_provider
        ON platform_sms_providers ((is_default))
        WHERE is_default = TRUE;

      CREATE TABLE IF NOT EXISTS school_sms_wallets (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        sms_balance integer NOT NULL DEFAULT 0,
        monthly_used integer NOT NULL DEFAULT 0,
        monthly_limit integer,
        sms_plan text NOT NULL DEFAULT 'starter',
        low_balance_threshold integer NOT NULL DEFAULT 100,
        allow_negative_balance boolean NOT NULL DEFAULT FALSE,
        billing_status text NOT NULL DEFAULT 'active',
        last_reset_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_school_sms_wallets_tenant UNIQUE (tenant_id),
        CONSTRAINT ck_school_sms_wallets_monthly_used_non_negative CHECK (monthly_used >= 0),
        CONSTRAINT ck_school_sms_wallets_balance_policy CHECK (allow_negative_balance OR sms_balance >= 0)
      );

      CREATE TABLE IF NOT EXISTS sms_logs (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        provider_id uuid REFERENCES platform_sms_providers(id) ON DELETE SET NULL,
        recipient_ciphertext text NOT NULL,
        recipient_last4 text,
        recipient_hash text NOT NULL,
        message_ciphertext text,
        message_preview text,
        message_type text,
        status text NOT NULL CHECK (status IN ('queued', 'sent', 'delivered', 'failed', 'rejected')),
        credit_cost integer NOT NULL DEFAULT 1,
        provider_message_id text,
        failure_reason text,
        sent_by_user_id uuid,
        sent_at timestamptz,
        delivered_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS sms_wallet_transactions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        transaction_type text NOT NULL CHECK (transaction_type IN ('purchase', 'adjustment', 'deduction', 'refund')),
        quantity integer NOT NULL,
        balance_after integer NOT NULL,
        reference text,
        reason text,
        created_by_user_id uuid,
        created_at timestamptz NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS sms_purchase_requests (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        quantity integer NOT NULL CHECK (quantity > 0),
        status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'fulfilled')),
        note text,
        requested_by_user_id uuid,
        reviewed_by_user_id uuid,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS school_integrations (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        integration_type text NOT NULL CHECK (integration_type IN ('mpesa_daraja')),
        paybill_number text,
        till_number text,
        shortcode text,
        consumer_key_ciphertext text,
        consumer_secret_ciphertext text,
        passkey_ciphertext text,
        environment text NOT NULL DEFAULT 'sandbox' CHECK (environment IN ('sandbox', 'production')),
        callback_url text,
        callback_secret_hash text,
        is_active boolean NOT NULL DEFAULT FALSE,
        last_test_status text,
        last_tested_at timestamptz,
        created_by_user_id uuid,
        updated_by_user_id uuid,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_school_integrations_tenant_type_environment UNIQUE (tenant_id, integration_type, environment)
      );

      CREATE INDEX IF NOT EXISTS ix_school_integrations_shortcode
        ON school_integrations (shortcode)
        WHERE shortcode IS NOT NULL;

      CREATE TABLE IF NOT EXISTS integration_logs (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text,
        integration_type text NOT NULL,
        operation text NOT NULL,
        status text NOT NULL,
        provider_reference text,
        error_message text,
        request_id text,
        created_by_user_id uuid,
        created_at timestamptz NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS school_onboarding_status (
        tenant_id text PRIMARY KEY,
        school_info_completed_at timestamptz,
        admin_account_completed_at timestamptz,
        daraja_setup_status text NOT NULL DEFAULT 'pending' CHECK (daraja_setup_status IN ('pending', 'skipped', 'complete')),
        sms_plan_status text NOT NULL DEFAULT 'pending' CHECK (sms_plan_status IN ('pending', 'complete')),
        overall_status text NOT NULL DEFAULT 'pending_setup' CHECK (overall_status IN ('pending_setup', 'partially_configured', 'fully_configured')),
        updated_at timestamptz NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS parent_otp_challenges (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        user_id uuid,
        phone_hash text,
        phone_last4 text,
        email text,
        otp_hash text NOT NULL,
        purpose text NOT NULL DEFAULT 'parent_login',
        expires_at timestamptz NOT NULL,
        consumed_at timestamptz,
        attempts integer NOT NULL DEFAULT 0,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW()
      );

      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'school_sms_wallets'
            AND column_name = 'tenant_id'
            AND data_type <> 'text'
        ) THEN
          ALTER TABLE school_sms_wallets ALTER COLUMN tenant_id TYPE text USING tenant_id::text;
        END IF;

        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'sms_logs'
            AND column_name = 'id'
            AND data_type <> 'uuid'
        ) AND NOT EXISTS (
          SELECT 1 FROM sms_logs
          WHERE id::text !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
        ) THEN
          ALTER TABLE sms_logs ALTER COLUMN id TYPE uuid USING id::uuid;
        END IF;

        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'sms_logs'
            AND column_name = 'status'
            AND data_type <> 'text'
        ) THEN
          ALTER TABLE sms_logs ALTER COLUMN status TYPE text USING lower(status::text);
        END IF;

        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'sms_wallet_transactions'
            AND column_name = 'tenant_id'
            AND data_type <> 'text'
        ) THEN
          ALTER TABLE sms_wallet_transactions ALTER COLUMN tenant_id TYPE text USING tenant_id::text;
        END IF;

        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'sms_wallet_transactions'
            AND column_name = 'balance_after'
            AND data_type <> 'integer'
        ) THEN
          ALTER TABLE sms_wallet_transactions ALTER COLUMN balance_after TYPE integer USING balance_after::integer;
        END IF;

        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'sms_purchase_requests'
            AND column_name = 'tenant_id'
            AND data_type <> 'text'
        ) THEN
          ALTER TABLE sms_purchase_requests ALTER COLUMN tenant_id TYPE text USING tenant_id::text;
        END IF;

        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'school_integrations'
            AND column_name = 'tenant_id'
            AND data_type <> 'text'
        ) THEN
          ALTER TABLE school_integrations ALTER COLUMN tenant_id TYPE text USING tenant_id::text;
        END IF;

        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'integration_logs'
            AND column_name = 'tenant_id'
            AND data_type <> 'text'
        ) THEN
          ALTER TABLE integration_logs ALTER COLUMN tenant_id TYPE text USING tenant_id::text;
        END IF;

        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'integration_logs'
            AND column_name = 'request_id'
            AND data_type <> 'text'
        ) THEN
          ALTER TABLE integration_logs ALTER COLUMN request_id TYPE text USING request_id::text;
        END IF;

        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'parent_otp_challenges'
            AND column_name = 'tenant_id'
            AND data_type <> 'text'
        ) THEN
          ALTER TABLE parent_otp_challenges ALTER COLUMN tenant_id TYPE text USING tenant_id::text;
        END IF;
      END;
      $$;

      ALTER TABLE school_sms_wallets
        ADD COLUMN IF NOT EXISTS sms_balance integer NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS monthly_used integer NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS monthly_limit integer,
        ADD COLUMN IF NOT EXISTS sms_plan text NOT NULL DEFAULT 'starter',
        ADD COLUMN IF NOT EXISTS low_balance_threshold integer NOT NULL DEFAULT 100,
        ADD COLUMN IF NOT EXISTS allow_negative_balance boolean NOT NULL DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS billing_status text NOT NULL DEFAULT 'active',
        ADD COLUMN IF NOT EXISTS last_reset_at timestamptz;
      ALTER TABLE school_sms_wallets
        ALTER COLUMN sms_balance SET DEFAULT 0,
        ALTER COLUMN sms_balance SET NOT NULL,
        ALTER COLUMN monthly_used SET DEFAULT 0,
        ALTER COLUMN monthly_used SET NOT NULL,
        ALTER COLUMN sms_plan SET DEFAULT 'starter',
        ALTER COLUMN sms_plan SET NOT NULL,
        ALTER COLUMN low_balance_threshold SET DEFAULT 100,
        ALTER COLUMN low_balance_threshold SET NOT NULL,
        ALTER COLUMN allow_negative_balance SET DEFAULT FALSE,
        ALTER COLUMN allow_negative_balance SET NOT NULL,
        ALTER COLUMN billing_status SET DEFAULT 'active',
        ALTER COLUMN billing_status SET NOT NULL,
        ALTER COLUMN updated_at SET DEFAULT NOW(),
        ALTER COLUMN updated_at SET NOT NULL;

      ALTER TABLE sms_logs
        ADD COLUMN IF NOT EXISTS school_id text,
        ADD COLUMN IF NOT EXISTS phone_number text,
        ADD COLUMN IF NOT EXISTS message text,
        ADD COLUMN IF NOT EXISTS cost double precision,
        ADD COLUMN IF NOT EXISTS error_message text,
        ADD COLUMN IF NOT EXISTS tenant_id text,
        ADD COLUMN IF NOT EXISTS provider_id uuid,
        ADD COLUMN IF NOT EXISTS recipient_ciphertext text,
        ADD COLUMN IF NOT EXISTS recipient_last4 text,
        ADD COLUMN IF NOT EXISTS recipient_hash text,
        ADD COLUMN IF NOT EXISTS message_ciphertext text,
        ADD COLUMN IF NOT EXISTS message_preview text,
        ADD COLUMN IF NOT EXISTS message_type text,
        ADD COLUMN IF NOT EXISTS credit_cost integer NOT NULL DEFAULT 1,
        ADD COLUMN IF NOT EXISTS failure_reason text,
        ADD COLUMN IF NOT EXISTS sent_by_user_id uuid,
        ADD COLUMN IF NOT EXISTS sent_at timestamptz,
        ADD COLUMN IF NOT EXISTS delivered_at timestamptz;
      UPDATE sms_logs
      SET tenant_id = COALESCE(NULLIF(tenant_id, ''), NULLIF(school_id, ''), 'legacy-unassigned'),
          recipient_ciphertext = COALESCE(NULLIF(recipient_ciphertext, ''), NULLIF(phone_number, ''), 'legacy-redacted'),
          recipient_hash = COALESCE(NULLIF(recipient_hash, ''), encode(digest(COALESCE(NULLIF(phone_number, ''), id::text), 'sha256'), 'hex')),
          message_preview = COALESCE(NULLIF(message_preview, ''), left(COALESCE(message, ''), 160)),
          message_ciphertext = COALESCE(NULLIF(message_ciphertext, ''), NULLIF(message, '')),
          message_type = COALESCE(NULLIF(message_type, ''), 'sms'),
          credit_cost = COALESCE(credit_cost, GREATEST(1, CEIL(COALESCE(cost, 1))::integer)),
          failure_reason = COALESCE(NULLIF(failure_reason, ''), NULLIF(error_message, '')),
          status = CASE lower(status)
            WHEN 'delivered' THEN 'delivered'
            WHEN 'sent' THEN 'sent'
            WHEN 'failed' THEN 'failed'
            WHEN 'rejected' THEN 'rejected'
            ELSE 'queued'
          END,
          updated_at = COALESCE(updated_at, created_at, NOW())
      WHERE tenant_id IS NULL
         OR recipient_ciphertext IS NULL
         OR recipient_hash IS NULL
         OR credit_cost IS NULL
         OR status IS NULL
         OR updated_at IS NULL;
      ALTER TABLE sms_logs
        ALTER COLUMN tenant_id SET NOT NULL,
        ALTER COLUMN recipient_ciphertext SET NOT NULL,
        ALTER COLUMN recipient_hash SET NOT NULL,
        ALTER COLUMN status SET DEFAULT 'queued',
        ALTER COLUMN status SET NOT NULL,
        ALTER COLUMN credit_cost SET DEFAULT 1,
        ALTER COLUMN credit_cost SET NOT NULL,
        ALTER COLUMN updated_at SET DEFAULT NOW(),
        ALTER COLUMN updated_at SET NOT NULL;

      ALTER TABLE sms_wallet_transactions
        ALTER COLUMN reference DROP NOT NULL,
        ALTER COLUMN reason DROP NOT NULL,
        ALTER COLUMN created_by_user_id DROP NOT NULL;

      ALTER TABLE sms_purchase_requests
        ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending',
        ADD COLUMN IF NOT EXISTS reviewed_by_user_id uuid;
      ALTER TABLE sms_purchase_requests
        ALTER COLUMN note DROP NOT NULL,
        ALTER COLUMN requested_by_user_id DROP NOT NULL,
        ALTER COLUMN status SET DEFAULT 'pending',
        ALTER COLUMN status SET NOT NULL,
        ALTER COLUMN updated_at SET DEFAULT NOW(),
        ALTER COLUMN updated_at SET NOT NULL;

      ALTER TABLE school_integrations
        ADD COLUMN IF NOT EXISTS callback_secret_hash text,
        ADD COLUMN IF NOT EXISTS last_test_status text,
        ADD COLUMN IF NOT EXISTS last_tested_at timestamptz;
      ALTER TABLE school_integrations
        ALTER COLUMN paybill_number DROP NOT NULL,
        ALTER COLUMN till_number DROP NOT NULL,
        ALTER COLUMN shortcode DROP NOT NULL,
        ALTER COLUMN consumer_key_ciphertext DROP NOT NULL,
        ALTER COLUMN consumer_secret_ciphertext DROP NOT NULL,
        ALTER COLUMN passkey_ciphertext DROP NOT NULL,
        ALTER COLUMN callback_url DROP NOT NULL,
        ALTER COLUMN created_by_user_id DROP NOT NULL,
        ALTER COLUMN updated_by_user_id DROP NOT NULL,
        ALTER COLUMN environment SET DEFAULT 'sandbox',
        ALTER COLUMN is_active SET DEFAULT FALSE,
        ALTER COLUMN is_active SET NOT NULL,
        ALTER COLUMN updated_at SET DEFAULT NOW(),
        ALTER COLUMN updated_at SET NOT NULL;

      ALTER TABLE integration_logs
        ALTER COLUMN tenant_id SET NOT NULL,
        ALTER COLUMN provider_reference DROP NOT NULL,
        ALTER COLUMN error_message DROP NOT NULL,
        ALTER COLUMN request_id DROP NOT NULL,
        ALTER COLUMN created_by_user_id DROP NOT NULL;

      ALTER TABLE parent_otp_challenges
        ADD COLUMN IF NOT EXISTS purpose text NOT NULL DEFAULT 'parent_login',
        ADD COLUMN IF NOT EXISTS consumed_at timestamptz,
        ADD COLUMN IF NOT EXISTS attempts integer NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT NOW(),
        ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT NOW();
      UPDATE parent_otp_challenges
      SET created_at = COALESCE(created_at, updated_at, NOW()),
          updated_at = COALESCE(updated_at, created_at, NOW())
      WHERE created_at IS NULL OR updated_at IS NULL;
      ALTER TABLE parent_otp_challenges
        ALTER COLUMN user_id DROP NOT NULL,
        ALTER COLUMN phone_hash DROP NOT NULL,
        ALTER COLUMN phone_last4 DROP NOT NULL,
        ALTER COLUMN email DROP NOT NULL,
        ALTER COLUMN purpose SET DEFAULT 'parent_login',
        ALTER COLUMN purpose SET NOT NULL,
        ALTER COLUMN attempts SET DEFAULT 0,
        ALTER COLUMN attempts SET NOT NULL,
        ALTER COLUMN created_at SET DEFAULT NOW(),
        ALTER COLUMN created_at SET NOT NULL,
        ALTER COLUMN updated_at SET DEFAULT NOW(),
        ALTER COLUMN updated_at SET NOT NULL;

      CREATE INDEX IF NOT EXISTS ix_sms_logs_tenant_created ON sms_logs (tenant_id, created_at DESC);
      CREATE INDEX IF NOT EXISTS ix_sms_logs_tenant_status_created ON sms_logs (tenant_id, status, created_at DESC);
      CREATE INDEX IF NOT EXISTS ix_sms_wallet_transactions_tenant_created ON sms_wallet_transactions (tenant_id, created_at DESC);
      CREATE INDEX IF NOT EXISTS ix_school_integrations_tenant_active ON school_integrations (tenant_id, integration_type, is_active);
      CREATE INDEX IF NOT EXISTS ix_integration_logs_tenant_created ON integration_logs (tenant_id, created_at DESC);
      CREATE INDEX IF NOT EXISTS ix_parent_otp_challenges_phone_hash ON parent_otp_challenges (tenant_id, phone_hash, created_at DESC);

      ALTER TABLE users
        ADD COLUMN IF NOT EXISTS phone_number_ciphertext text,
        ADD COLUMN IF NOT EXISTS phone_number_hash text,
        ADD COLUMN IF NOT EXISTS phone_number_last4 text;

      CREATE INDEX IF NOT EXISTS ix_users_phone_number_hash
        ON users (phone_number_hash)
        WHERE phone_number_hash IS NOT NULL;



      ${TENANT_TABLES.map((table) => `
        ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY;
        ALTER TABLE ${table} FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS ${table}_rls_policy ON ${table};
        CREATE POLICY ${table}_rls_policy ON ${table}
        FOR ALL
        USING (tenant_id = current_setting('app.tenant_id', true))
        WITH CHECK (tenant_id = current_setting('app.tenant_id', true));
      `).join('\n')}

      CREATE SCHEMA IF NOT EXISTS app;
      CREATE OR REPLACE FUNCTION app.find_daraja_integration_by_id_for_callback(input_integration_id uuid)
      RETURNS TABLE (
        id uuid,
        tenant_id text,
        integration_type text,
        paybill_number text,
        till_number text,
        shortcode text,
        consumer_key_ciphertext text,
        consumer_secret_ciphertext text,
        passkey_ciphertext text,
        environment text,
        callback_url text,
        is_active boolean,
        last_test_status text,
        last_tested_at timestamptz,
        created_at timestamptz,
        updated_at timestamptz
      )
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path = public, app, pg_temp
      AS $$
      DECLARE
        request_user_id text;
        request_path text;
      BEGIN
        request_user_id := COALESCE(NULLIF(current_setting('app.user_id', true), ''), 'anonymous');
        request_path := COALESCE(NULLIF(current_setting('app.path', true), ''), '');

        IF request_user_id <> 'anonymous' THEN
          RAISE EXCEPTION 'Daraja callback integration lookup is only available before authentication'
            USING ERRCODE = '42501';
        END IF;

        IF request_path NOT LIKE '/payments/mpesa/callback/%'
           AND request_path NOT LIKE '/mpesa/callback/%' THEN
          RAISE EXCEPTION 'Daraja callback integration lookup is only available on callback routes'
            USING ERRCODE = '42501';
        END IF;

        RETURN QUERY
        SELECT
          si.id,
          si.tenant_id,
          si.integration_type,
          si.paybill_number,
          si.till_number,
          si.shortcode,
          si.consumer_key_ciphertext,
          si.consumer_secret_ciphertext,
          si.passkey_ciphertext,
          si.environment,
          si.callback_url,
          si.is_active,
          si.last_test_status,
          si.last_tested_at,
          si.created_at,
          si.updated_at
        FROM school_integrations si
        WHERE si.id = input_integration_id
          AND si.integration_type = 'mpesa_daraja'
        LIMIT 1;
      END;
      $$;

      CREATE OR REPLACE FUNCTION app.find_parent_auth_subject_for_otp(
        input_identifier text,
        input_phone_hash text
      )
      RETURNS TABLE (
        user_id uuid,
        tenant_id text,
        role_id uuid,
        role_code text,
        email text,
        display_name text,
        phone_number_hash text,
        phone_number_last4 text
      )
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path = public, app, pg_temp
      AS $$
      DECLARE
        request_user_id text;
        request_path text;
      BEGIN
        request_user_id := COALESCE(NULLIF(current_setting('app.user_id', true), ''), 'anonymous');
        request_path := COALESCE(NULLIF(current_setting('app.path', true), ''), '');

        IF request_user_id <> 'anonymous' THEN
          RAISE EXCEPTION 'Parent OTP lookup is only available before authentication'
            USING ERRCODE = '42501';
        END IF;

        IF request_path NOT IN ('/auth/parent/otp/request', '/auth/parent/otp/verify') THEN
          RAISE EXCEPTION 'Parent OTP lookup is only available on parent OTP routes'
            USING ERRCODE = '42501';
        END IF;

        RETURN QUERY
        SELECT
          u.id AS user_id,
          tm.tenant_id,
          tm.role_id,
          r.code AS role_code,
          u.email::text,
          u.display_name,
          u.phone_number_hash,
          u.phone_number_last4
        FROM users u
        INNER JOIN tenant_memberships tm
          ON tm.user_id = u.id
         AND tm.status = 'active'
        INNER JOIN roles r
          ON r.tenant_id = tm.tenant_id
         AND r.id = tm.role_id
         AND r.code = 'parent'
        WHERE u.status = 'active'
          AND (
            lower(u.email::text) = lower(input_identifier)
            OR (
              input_phone_hash IS NOT NULL
              AND u.phone_number_hash = input_phone_hash
            )
          )
        ORDER BY tm.created_at DESC
        LIMIT 1;
      END;
      $$;

      -- PostgreSQL cannot replace a table-returning function when its OUT
      -- columns change. Recreate this internal lookup so rolling schema
      -- bootstraps remain compatible with existing production databases.
      DROP FUNCTION IF EXISTS app.find_parent_otp_challenge_for_verify(uuid);

      CREATE FUNCTION app.find_parent_otp_challenge_for_verify(input_challenge_id uuid)
      RETURNS TABLE (
        id uuid,
        tenant_id text,
        user_id uuid,
        email text,
        phone_hash text,
        phone_last4 text,
        otp_hash text,
        purpose text,
        expires_at timestamptz,
        consumed_at timestamptz,
        attempts integer
      )
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path = public, app, pg_temp
      AS $$
      DECLARE
        request_user_id text;
        request_path text;
      BEGIN
        request_user_id := COALESCE(NULLIF(current_setting('app.user_id', true), ''), 'anonymous');
        request_path := COALESCE(NULLIF(current_setting('app.path', true), ''), '');

        IF request_user_id <> 'anonymous' THEN
          RAISE EXCEPTION 'Parent OTP verification is only available before authentication'
            USING ERRCODE = '42501';
        END IF;

        IF request_path NOT IN ('/auth/parent/otp/verify', '/auth/student/otp/verify') THEN
          RAISE EXCEPTION 'OTP verification is only available on portal OTP verify routes'
            USING ERRCODE = '42501';
        END IF;

        RETURN QUERY
        SELECT
          c.id,
          c.tenant_id,
          c.user_id,
          c.email,
          c.phone_hash,
          c.phone_last4,
          c.otp_hash,
          c.purpose,
          c.expires_at,
          c.consumed_at,
          c.attempts
        FROM parent_otp_challenges c
        WHERE c.id = input_challenge_id
        LIMIT 1;
      END;
      $$;
    `);

    this.logger.log('Integrations schema verified');
  }
}
