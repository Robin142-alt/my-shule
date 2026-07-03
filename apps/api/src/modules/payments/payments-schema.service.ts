import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

import { AuthSchemaService } from '../../auth/auth-schema.service';
import { PrismaService } from '../../database/prisma.service';
import { FinanceSchemaService } from '../finance/finance-schema.service';
import { TenantFinanceSchemaService } from '../tenant-finance/tenant-finance-schema.service';

@Injectable()
export class PaymentsSchemaService implements OnModuleInit {

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

  private readonly logger = new Logger(PaymentsSchemaService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly authSchemaService: AuthSchemaService,
    private readonly financeSchemaService: FinanceSchemaService,
    private readonly tenantFinanceSchemaService: TenantFinanceSchemaService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.authSchemaService.onModuleInit();
    await this.financeSchemaService.onModuleInit();
    await this.tenantFinanceSchemaService.onModuleInit();

    await this.prisma.runSchemaBootstrap(`
      CREATE TABLE IF NOT EXISTS payment_intents (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        idempotency_key_id uuid NOT NULL,
        user_id uuid,
        student_id text,
        request_id text,
        external_reference text,
        account_reference text NOT NULL,
        transaction_desc text NOT NULL,
        phone_number text NOT NULL,
        amount_minor bigint NOT NULL,
        currency_code char(3) NOT NULL DEFAULT 'KES',
        payment_owner text NOT NULL DEFAULT 'tenant',
        mpesa_config_id uuid,
        payment_channel_id uuid,
        mpesa_short_code text,
        payment_channel_type text,
        ledger_debit_account_code text,
        ledger_credit_account_code text,
        status text NOT NULL DEFAULT 'pending',
        merchant_request_id text,
        checkout_request_id text,
        response_code text,
        response_description text,
        customer_message text,
        ledger_transaction_id uuid,
        failure_reason text,
        stk_requested_at timestamptz,
        callback_received_at timestamptz,
        completed_at timestamptz,
        expires_at timestamptz,
        metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        CONSTRAINT ck_payment_intents_amount_minor CHECK (amount_minor > 0),
        CONSTRAINT ck_payment_intents_currency_code CHECK (currency_code ~ '^[A-Z]{3}$'),
        CONSTRAINT ck_payment_intents_owner CHECK (payment_owner IN ('tenant', 'platform')),
        CONSTRAINT ck_payment_intents_status CHECK (
          status IN ('pending', 'stk_requested', 'callback_received', 'processing', 'completed', 'failed', 'cancelled', 'expired')
        ),
        CONSTRAINT uq_payment_intents_tenant_id_id UNIQUE (tenant_id, id),
        CONSTRAINT uq_payment_intents_tenant_idempotency_key UNIQUE (tenant_id, idempotency_key_id),
        CONSTRAINT uq_payment_intents_tenant_checkout_request_id UNIQUE (tenant_id, checkout_request_id),
        CONSTRAINT uq_payment_intents_tenant_merchant_request_id UNIQUE (tenant_id, merchant_request_id),
        CONSTRAINT fk_payment_intents_idempotency_key
          FOREIGN KEY (tenant_id, idempotency_key_id)
          REFERENCES idempotency_keys (tenant_id, id)
          ON DELETE RESTRICT,
        CONSTRAINT fk_payment_intents_user
          FOREIGN KEY (user_id)
          REFERENCES users (id)
          ON DELETE SET NULL,
        CONSTRAINT fk_payment_intents_ledger_transaction
          FOREIGN KEY (tenant_id, ledger_transaction_id)
          REFERENCES transactions (tenant_id, id)
          ON DELETE SET NULL
      );

      CREATE TABLE IF NOT EXISTS callback_logs (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        merchant_request_id text,
        checkout_request_id text,
        mpesa_short_code text,
        delivery_id text NOT NULL,
        request_fingerprint text NOT NULL,
        event_timestamp timestamptz,
        signature text,
        signature_verified boolean NOT NULL DEFAULT FALSE,
        headers jsonb NOT NULL DEFAULT '{}'::jsonb,
        raw_body text NOT NULL,
        raw_payload jsonb,
        raw_payload_encrypted_ref text,
        payload_sha256 char(64),
        source_ip inet,
        callback_trust_status text NOT NULL DEFAULT 'received_unverified',
        provider_verified_at timestamptz,
        provider_result_code text,
        provider_result_desc text,
        processing_status text NOT NULL DEFAULT 'received',
        queue_job_id text,
        failure_reason text,
        queued_at timestamptz,
        processed_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        CONSTRAINT ck_callback_logs_delivery_id_not_blank CHECK (btrim(delivery_id) <> ''),
        CONSTRAINT ck_callback_logs_request_fingerprint_not_blank CHECK (btrim(request_fingerprint) <> ''),
        CONSTRAINT ck_callback_logs_trust_status CHECK (
          callback_trust_status IN ('received_unverified', 'edge_signed', 'provider_verified', 'provider_failed', 'manual_review')
        ),
        CONSTRAINT ck_callback_logs_processing_status CHECK (
          processing_status IN ('received', 'queued', 'processing', 'processed', 'failed', 'rejected', 'replayed')
        ),
        CONSTRAINT uq_callback_logs_tenant_id_id UNIQUE (tenant_id, id)
      );

      CREATE TABLE IF NOT EXISTS mpesa_transactions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        payment_intent_id uuid NOT NULL,
        callback_log_id uuid NOT NULL,
        checkout_request_id text NOT NULL,
        merchant_request_id text NOT NULL,
        result_code integer NOT NULL,
        result_desc text NOT NULL,
        status text NOT NULL,
        transaction_id text,
        mpesa_short_code text,
        mpesa_receipt_number text,
        amount_minor bigint,
        phone_number text,
        raw_payload jsonb,
        raw_payload_encrypted_ref text,
        payload_sha256 char(64),
        transaction_occurred_at timestamptz,
        ledger_transaction_id uuid,
        processed_at timestamptz,
        metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        CONSTRAINT ck_mpesa_transactions_status CHECK (status IN ('succeeded', 'failed')),
        CONSTRAINT uq_mpesa_transactions_tenant_id_id UNIQUE (tenant_id, id),
        CONSTRAINT uq_mpesa_transactions_tenant_checkout_request_id UNIQUE (tenant_id, checkout_request_id),
        CONSTRAINT fk_mpesa_transactions_payment_intent
          FOREIGN KEY (tenant_id, payment_intent_id)
          REFERENCES payment_intents (tenant_id, id)
          ON DELETE RESTRICT,
        CONSTRAINT fk_mpesa_transactions_callback_log
          FOREIGN KEY (tenant_id, callback_log_id)
          REFERENCES callback_logs (tenant_id, id)
          ON DELETE RESTRICT,
        CONSTRAINT fk_mpesa_transactions_ledger_transaction
          FOREIGN KEY (tenant_id, ledger_transaction_id)
          REFERENCES transactions (tenant_id, id)
          ON DELETE SET NULL
      );

      CREATE TABLE IF NOT EXISTS mpesa_c2b_payments (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        mpesa_config_id uuid,
        payment_channel_id uuid,
        trans_id text NOT NULL,
        transaction_type text NOT NULL,
        business_short_code text NOT NULL,
        bill_ref_number text,
        invoice_number text,
        amount_minor bigint NOT NULL,
        currency_code char(3) NOT NULL DEFAULT 'KES',
        phone_number text,
        payer_name text,
        org_account_balance text,
        third_party_trans_id text,
        status text NOT NULL DEFAULT 'received_unverified',
        matched_invoice_id uuid,
        matched_student_id text,
        manual_fee_payment_id uuid,
        ledger_transaction_id uuid,
        received_at timestamptz NOT NULL,
        matched_at timestamptz,
        raw_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
        raw_payload_encrypted_ref text,
        payload_sha256 char(64),
        metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        CONSTRAINT ck_mpesa_c2b_payments_trans_id_not_blank CHECK (btrim(trans_id) <> ''),
        CONSTRAINT ck_mpesa_c2b_payments_business_short_code_not_blank CHECK (btrim(business_short_code) <> ''),
        CONSTRAINT ck_mpesa_c2b_payments_amount_minor CHECK (amount_minor > 0),
        CONSTRAINT ck_mpesa_c2b_payments_currency CHECK (currency_code ~ '^[A-Z]{3}$'),
        CONSTRAINT ck_mpesa_c2b_payments_status CHECK (
          status IN (
            'received_unverified',
            'verification_requested',
            'verified_matched',
            'verified_unmatched',
            'amount_mismatch',
            'duplicate_provider_receipt',
            'missing_provider_record',
            'reversed',
            'manual_review_required',
            'pending_review',
            'matched',
            'rejected'
          )
        ),
        CONSTRAINT uq_mpesa_c2b_payments_tenant_id_id UNIQUE (tenant_id, id),
        CONSTRAINT uq_mpesa_c2b_payments_tenant_trans_id UNIQUE (tenant_id, trans_id),
        CONSTRAINT fk_mpesa_c2b_payments_mpesa_config
          FOREIGN KEY (tenant_id, mpesa_config_id)
          REFERENCES tenant_mpesa_configs (tenant_id, id)
          ON DELETE SET NULL,
        CONSTRAINT fk_mpesa_c2b_payments_payment_channel
          FOREIGN KEY (tenant_id, payment_channel_id)
          REFERENCES tenant_payment_channels (tenant_id, id)
          ON DELETE SET NULL,
        CONSTRAINT fk_mpesa_c2b_payments_ledger_transaction
          FOREIGN KEY (tenant_id, ledger_transaction_id)
          REFERENCES transactions (tenant_id, id)
          ON DELETE SET NULL
      );

      CREATE TABLE IF NOT EXISTS mpesa_payload_vault (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        raw_payload_encrypted_ref text NOT NULL,
        source text NOT NULL,
        source_id text NOT NULL,
        payload_sha256 char(64) NOT NULL,
        encrypted_payload text NOT NULL,
        redacted_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
        purpose text NOT NULL,
        retention_expires_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        CONSTRAINT ck_mpesa_payload_vault_ref_not_blank CHECK (btrim(raw_payload_encrypted_ref) <> ''),
        CONSTRAINT ck_mpesa_payload_vault_payload_sha CHECK (payload_sha256 ~ '^[a-f0-9]{64}$'),
        CONSTRAINT ck_mpesa_payload_vault_source CHECK (
          source IN ('callback_logs', 'mpesa_transactions', 'mpesa_c2b_payments')
        ),
        CONSTRAINT ck_mpesa_payload_vault_purpose CHECK (
          purpose IN ('stk_callback', 'c2b_confirmation', 'transaction_snapshot')
        ),
        CONSTRAINT uq_mpesa_payload_vault_tenant_ref UNIQUE (tenant_id, raw_payload_encrypted_ref)
      );

      CREATE TABLE IF NOT EXISTS mpesa_payload_support_access_logs (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        raw_payload_encrypted_ref text NOT NULL,
        actor_user_id uuid NOT NULL,
        ticket_id text NOT NULL,
        reason text NOT NULL,
        payload_sha256 char(64) NOT NULL,
        access_expires_at timestamptz NOT NULL,
        accessed_at timestamptz NOT NULL DEFAULT NOW(),
        CONSTRAINT ck_mpesa_payload_support_ticket_not_blank CHECK (btrim(ticket_id) <> ''),
        CONSTRAINT ck_mpesa_payload_support_reason_not_blank CHECK (btrim(reason) <> ''),
        CONSTRAINT ck_mpesa_payload_support_payload_sha CHECK (payload_sha256 ~ '^[a-f0-9]{64}$'),
        CONSTRAINT fk_mpesa_payload_support_actor
          FOREIGN KEY (actor_user_id)
          REFERENCES users (id)
          ON DELETE RESTRICT
      );

      CREATE TABLE IF NOT EXISTS mpesa_verification_jobs (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        payment_intent_id uuid,
        callback_log_id uuid,
        c2b_payment_id uuid,
        checkout_request_id text,
        mpesa_receipt_number text,
        transaction_status text NOT NULL DEFAULT 'pending',
        verification_attempts integer NOT NULL DEFAULT 0,
        last_provider_response_encrypted text,
        verified_at timestamptz,
        failed_at timestamptz,
        next_retry_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        CONSTRAINT ck_mpesa_verification_jobs_status CHECK (
          transaction_status IN ('pending', 'provider_verified', 'provider_failed', 'retry_scheduled', 'manual_review')
        ),
        CONSTRAINT ck_mpesa_verification_jobs_attempts CHECK (verification_attempts >= 0),
        CONSTRAINT ck_mpesa_verification_jobs_target CHECK (
          payment_intent_id IS NOT NULL
          OR callback_log_id IS NOT NULL
          OR c2b_payment_id IS NOT NULL
          OR checkout_request_id IS NOT NULL
          OR mpesa_receipt_number IS NOT NULL
        ),
        CONSTRAINT uq_mpesa_verification_jobs_tenant_id_id UNIQUE (tenant_id, id),
        CONSTRAINT fk_mpesa_verification_jobs_payment_intent
          FOREIGN KEY (tenant_id, payment_intent_id)
          REFERENCES payment_intents (tenant_id, id)
          ON DELETE SET NULL,
        CONSTRAINT fk_mpesa_verification_jobs_callback_log
          FOREIGN KEY (tenant_id, callback_log_id)
          REFERENCES callback_logs (tenant_id, id)
          ON DELETE SET NULL,
        CONSTRAINT fk_mpesa_verification_jobs_c2b_payment
          FOREIGN KEY (tenant_id, c2b_payment_id)
          REFERENCES mpesa_c2b_payments (tenant_id, id)
          ON DELETE SET NULL
      );

      CREATE TABLE IF NOT EXISTS mpesa_reconciliation_batches (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        payment_channel_id uuid,
        report_date date NOT NULL,
        window_started_at timestamptz NOT NULL,
        window_ended_at timestamptz NOT NULL,
        reconciliation_state text NOT NULL,
        summary jsonb NOT NULL DEFAULT '{}'::jsonb,
        discrepancy_count integer NOT NULL DEFAULT 0,
        generated_by_user_id uuid,
        generated_at timestamptz NOT NULL DEFAULT NOW(),
        reviewed_by_user_id uuid,
        reviewed_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        CONSTRAINT ck_mpesa_reconciliation_batches_state CHECK (
          reconciliation_state IN (
            'provider_received',
            'system_received',
            'verified_matched',
            'verified_unmatched',
            'amount_mismatch',
            'duplicate_provider_receipt',
            'missing_provider_record',
            'reversed',
            'manual_review_required'
          )
        ),
        CONSTRAINT ck_mpesa_reconciliation_batches_window CHECK (window_ended_at > window_started_at),
        CONSTRAINT ck_mpesa_reconciliation_batches_count CHECK (discrepancy_count >= 0),
        CONSTRAINT uq_mpesa_reconciliation_batches_tenant_id_id UNIQUE (tenant_id, id),
        CONSTRAINT fk_mpesa_reconciliation_batches_payment_channel
          FOREIGN KEY (tenant_id, payment_channel_id)
          REFERENCES tenant_payment_channels (tenant_id, id)
          ON DELETE SET NULL,
        CONSTRAINT fk_mpesa_reconciliation_batches_generated_by
          FOREIGN KEY (generated_by_user_id)
          REFERENCES users (id)
          ON DELETE SET NULL,
        CONSTRAINT fk_mpesa_reconciliation_batches_reviewed_by
          FOREIGN KEY (reviewed_by_user_id)
          REFERENCES users (id)
          ON DELETE SET NULL
      );

      CREATE TABLE IF NOT EXISTS mpesa_reconciliation_discrepancies (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        reconciliation_batch_id uuid NOT NULL,
        discrepancy_type text NOT NULL,
        reconciliation_state text NOT NULL,
        severity text NOT NULL,
        detail text NOT NULL,
        occurred_at timestamptz NOT NULL,
        provider_transaction_id text,
        payment_intent_id uuid,
        mpesa_transaction_id uuid,
        fee_invoice_id uuid,
        ledger_transaction_id uuid,
        approving_user_id uuid,
        evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
        resolution_status text NOT NULL DEFAULT 'open',
        resolved_by_user_id uuid,
        resolved_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        CONSTRAINT ck_mpesa_reconciliation_discrepancies_state CHECK (
          reconciliation_state IN (
            'provider_received',
            'system_received',
            'verified_matched',
            'verified_unmatched',
            'amount_mismatch',
            'duplicate_provider_receipt',
            'missing_provider_record',
            'reversed',
            'manual_review_required'
          )
        ),
        CONSTRAINT ck_mpesa_reconciliation_discrepancies_severity CHECK (severity IN ('warning', 'critical')),
        CONSTRAINT ck_mpesa_reconciliation_discrepancies_resolution CHECK (
          resolution_status IN ('open', 'under_review', 'resolved', 'waived')
        ),
        CONSTRAINT uq_mpesa_reconciliation_discrepancies_tenant_id_id UNIQUE (tenant_id, id),
        CONSTRAINT fk_mpesa_reconciliation_discrepancies_batch
          FOREIGN KEY (tenant_id, reconciliation_batch_id)
          REFERENCES mpesa_reconciliation_batches (tenant_id, id)
          ON DELETE CASCADE,
        CONSTRAINT fk_mpesa_reconciliation_discrepancies_payment_intent
          FOREIGN KEY (tenant_id, payment_intent_id)
          REFERENCES payment_intents (tenant_id, id)
          ON DELETE SET NULL,
        CONSTRAINT fk_mpesa_reconciliation_discrepancies_mpesa_transaction
          FOREIGN KEY (tenant_id, mpesa_transaction_id)
          REFERENCES mpesa_transactions (tenant_id, id)
          ON DELETE SET NULL,
        CONSTRAINT fk_mpesa_reconciliation_discrepancies_ledger_transaction
          FOREIGN KEY (tenant_id, ledger_transaction_id)
          REFERENCES transactions (tenant_id, id)
          ON DELETE SET NULL,
        CONSTRAINT fk_mpesa_reconciliation_discrepancies_approving_user
          FOREIGN KEY (approving_user_id)
          REFERENCES users (id)
          ON DELETE SET NULL,
        CONSTRAINT fk_mpesa_reconciliation_discrepancies_resolved_by
          FOREIGN KEY (resolved_by_user_id)
          REFERENCES users (id)
          ON DELETE SET NULL
      );

      CREATE TABLE IF NOT EXISTS finance_close_periods (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        period_name text NOT NULL,
        period_started_at timestamptz NOT NULL,
        period_ended_at timestamptz NOT NULL,
        status text NOT NULL DEFAULT 'open',
        closed_by_user_id uuid,
        closed_at timestamptz,
        reopened_by_user_id uuid,
        reopened_at timestamptz,
        reason text,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        CONSTRAINT ck_finance_close_periods_status CHECK (status IN ('open', 'closed', 'reopened')),
        CONSTRAINT ck_finance_close_periods_window CHECK (period_ended_at > period_started_at),
        CONSTRAINT uq_finance_close_periods_tenant_id_id UNIQUE (tenant_id, id),
        CONSTRAINT uq_finance_close_periods_tenant_name UNIQUE (tenant_id, period_name),
        CONSTRAINT fk_finance_close_periods_closed_by
          FOREIGN KEY (closed_by_user_id)
          REFERENCES users (id)
          ON DELETE SET NULL,
        CONSTRAINT fk_finance_close_periods_reopened_by
          FOREIGN KEY (reopened_by_user_id)
          REFERENCES users (id)
          ON DELETE SET NULL
      );

      CREATE TABLE IF NOT EXISTS finance_approval_requests (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        action text NOT NULL,
        status text NOT NULL DEFAULT 'pending_first_approval',
        subject_type text NOT NULL,
        subject_id uuid,
        amount_minor bigint,
        currency_code char(3) NOT NULL DEFAULT 'KES',
        reason text NOT NULL,
        reconciliation_batch_id uuid,
        reconciliation_discrepancy_id uuid,
        close_period_id uuid,
        requested_by_user_id uuid NOT NULL,
        first_approver_user_id uuid,
        first_approved_at timestamptz,
        second_approver_user_id uuid,
        second_approved_at timestamptz,
        rejected_by_user_id uuid,
        rejected_at timestamptz,
        evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        CONSTRAINT ck_finance_approval_requests_action CHECK (
          action IN ('reversal', 'write_off', 'move_payment', 'post_after_mismatch')
        ),
        CONSTRAINT ck_finance_approval_requests_status CHECK (
          status IN ('pending_first_approval', 'pending_second_approval', 'approved', 'rejected', 'cancelled')
        ),
        CONSTRAINT ck_finance_approval_requests_currency CHECK (currency_code ~ '^[A-Z]{3}$'),
        CONSTRAINT ck_finance_approval_requests_amount CHECK (amount_minor IS NULL OR amount_minor > 0),
        CONSTRAINT ck_finance_approval_requests_dual_approval CHECK (
          second_approver_user_id IS NULL
          OR first_approver_user_id IS NULL
          OR second_approver_user_id <> first_approver_user_id
        ),
        CONSTRAINT uq_finance_approval_requests_tenant_id_id UNIQUE (tenant_id, id),
        CONSTRAINT fk_finance_approval_requests_batch
          FOREIGN KEY (tenant_id, reconciliation_batch_id)
          REFERENCES mpesa_reconciliation_batches (tenant_id, id)
          ON DELETE SET NULL,
        CONSTRAINT fk_finance_approval_requests_discrepancy
          FOREIGN KEY (tenant_id, reconciliation_discrepancy_id)
          REFERENCES mpesa_reconciliation_discrepancies (tenant_id, id)
          ON DELETE SET NULL,
        CONSTRAINT fk_finance_approval_requests_close_period
          FOREIGN KEY (tenant_id, close_period_id)
          REFERENCES finance_close_periods (tenant_id, id)
          ON DELETE SET NULL,
        CONSTRAINT fk_finance_approval_requests_requested_by
          FOREIGN KEY (requested_by_user_id)
          REFERENCES users (id)
          ON DELETE RESTRICT,
        CONSTRAINT fk_finance_approval_requests_first_approver
          FOREIGN KEY (first_approver_user_id)
          REFERENCES users (id)
          ON DELETE SET NULL,
        CONSTRAINT fk_finance_approval_requests_second_approver
          FOREIGN KEY (second_approver_user_id)
          REFERENCES users (id)
          ON DELETE SET NULL,
        CONSTRAINT fk_finance_approval_requests_rejected_by
          FOREIGN KEY (rejected_by_user_id)
          REFERENCES users (id)
          ON DELETE SET NULL
      );

      CREATE OR REPLACE FUNCTION app.ensure_finance_period_open()
      RETURNS trigger AS $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM finance_close_periods fcp
          WHERE fcp.tenant_id = NEW.tenant_id
            AND fcp.status = 'closed'
            AND COALESCE(NEW.effective_at, NEW.created_at, NOW()) >= fcp.period_started_at
            AND COALESCE(NEW.effective_at, NEW.created_at, NOW()) < fcp.period_ended_at
        ) THEN
          RAISE EXCEPTION 'finance period is closed for tenant "%" and cannot be silently modified', NEW.tenant_id
            USING ERRCODE = '55000';
        END IF;

        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      DO $$
      DECLARE
        target_table text;
      BEGIN
        FOREACH target_table IN ARRAY ARRAY[
          'payment_intents',
          'callback_logs',
          'mpesa_transactions',
          'mpesa_c2b_payments',
          'mpesa_payload_vault',
          'mpesa_payload_support_access_logs',
          'mpesa_verification_jobs',
          'mpesa_reconciliation_batches',
          'mpesa_reconciliation_discrepancies',
          'finance_close_periods',
          'finance_approval_requests'
        ]
        LOOP
          IF to_regclass('public.' || target_table) IS NOT NULL THEN
            IF NOT EXISTS (
              SELECT 1
              FROM information_schema.columns
              WHERE table_schema = 'public'
                AND table_name = target_table
                AND column_name = 'tenant_id'
            ) THEN
              EXECUTE format('ALTER TABLE %I ADD COLUMN tenant_id text', target_table);
            END IF;

            IF EXISTS (
              SELECT 1
              FROM information_schema.columns
              WHERE table_schema = 'public'
                AND table_name = target_table
                AND column_name = 'tenant_id'
                AND data_type <> 'text'
            ) THEN
              EXECUTE format('ALTER TABLE %I ALTER COLUMN tenant_id TYPE text USING tenant_id::text', target_table);
            END IF;
          END IF;
        END LOOP;

        IF to_regclass('public.mpesa_transactions') IS NOT NULL
          AND EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = 'mpesa_transactions'
              AND column_name = 'school_id'
          ) THEN
          UPDATE mpesa_transactions
          SET tenant_id = school_id
          WHERE tenant_id IS NULL
            AND school_id IS NOT NULL;
        END IF;
      END $$;

      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'uq_payment_intents_tenant_id_id'
        ) THEN
          ALTER TABLE payment_intents
            ADD CONSTRAINT uq_payment_intents_tenant_id_id UNIQUE (tenant_id, id);
        END IF;
      END $$;

      DO $$
      DECLARE
        student_id_type text;
      BEGIN
        SELECT data_type
        INTO student_id_type
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'students'
          AND column_name = 'id';

        IF student_id_type = 'uuid' THEN
          ALTER TABLE payment_intents ADD COLUMN IF NOT EXISTS student_id uuid;
          ALTER TABLE payment_intents
          ALTER COLUMN student_id TYPE uuid USING CASE
            WHEN student_id::text ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
              THEN student_id::text::uuid
            ELSE NULL
          END;
        ELSE
          ALTER TABLE payment_intents ADD COLUMN IF NOT EXISTS student_id text;
          ALTER TABLE payment_intents
          ALTER COLUMN student_id TYPE text USING NULLIF(student_id::text, '');
        END IF;
      END $$;

      ALTER TABLE payment_intents
      ADD COLUMN IF NOT EXISTS payment_owner text NOT NULL DEFAULT 'tenant';
      ALTER TABLE payment_intents
      ADD COLUMN IF NOT EXISTS mpesa_config_id uuid;
      ALTER TABLE payment_intents
      ADD COLUMN IF NOT EXISTS payment_channel_id uuid;
      ALTER TABLE payment_intents
      ADD COLUMN IF NOT EXISTS mpesa_short_code text;
      ALTER TABLE payment_intents
      ADD COLUMN IF NOT EXISTS payment_channel_type text;
      ALTER TABLE payment_intents
      ADD COLUMN IF NOT EXISTS ledger_debit_account_code text;
      ALTER TABLE payment_intents
      ADD COLUMN IF NOT EXISTS ledger_credit_account_code text;
      ALTER TABLE payment_intents
      ADD COLUMN IF NOT EXISTS merchant_request_id text;
      ALTER TABLE payment_intents
      ADD COLUMN IF NOT EXISTS checkout_request_id text;
      ALTER TABLE payment_intents
      ADD COLUMN IF NOT EXISTS response_code text;
      ALTER TABLE payment_intents
      ADD COLUMN IF NOT EXISTS response_description text;
      ALTER TABLE payment_intents
      ADD COLUMN IF NOT EXISTS customer_message text;
      ALTER TABLE payment_intents
      ADD COLUMN IF NOT EXISTS ledger_transaction_id uuid;
      ALTER TABLE payment_intents
      ADD COLUMN IF NOT EXISTS failure_reason text;
      ALTER TABLE payment_intents
      ADD COLUMN IF NOT EXISTS stk_requested_at timestamptz;
      ALTER TABLE payment_intents
      ADD COLUMN IF NOT EXISTS callback_received_at timestamptz;
      ALTER TABLE payment_intents
      ADD COLUMN IF NOT EXISTS completed_at timestamptz;
      ALTER TABLE payment_intents
      ADD COLUMN IF NOT EXISTS expires_at timestamptz;

      ALTER TABLE callback_logs
      ADD COLUMN IF NOT EXISTS mpesa_short_code text;
      ALTER TABLE callback_logs
      ADD COLUMN IF NOT EXISTS raw_payload_encrypted_ref text;
      ALTER TABLE callback_logs
      ADD COLUMN IF NOT EXISTS payload_sha256 char(64);
      ALTER TABLE callback_logs
      ADD COLUMN IF NOT EXISTS callback_trust_status text NOT NULL DEFAULT 'received_unverified';
      ALTER TABLE callback_logs
      ADD COLUMN IF NOT EXISTS provider_verified_at timestamptz;
      ALTER TABLE callback_logs
      ADD COLUMN IF NOT EXISTS provider_result_code text;
      ALTER TABLE callback_logs
      ADD COLUMN IF NOT EXISTS provider_result_desc text;

      ALTER TABLE mpesa_transactions
      ADD COLUMN IF NOT EXISTS payment_intent_id uuid;
      ALTER TABLE mpesa_transactions
      ADD COLUMN IF NOT EXISTS callback_log_id uuid;
      ALTER TABLE mpesa_transactions
      ADD COLUMN IF NOT EXISTS result_code integer;
      ALTER TABLE mpesa_transactions
      ADD COLUMN IF NOT EXISTS result_desc text;
      ALTER TABLE mpesa_transactions
      ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'succeeded';
      ALTER TABLE mpesa_transactions
      ADD COLUMN IF NOT EXISTS raw_payload jsonb;
      ALTER TABLE mpesa_transactions
      ADD COLUMN IF NOT EXISTS transaction_id text;
      ALTER TABLE mpesa_transactions
      ADD COLUMN IF NOT EXISTS mpesa_short_code text;
      ALTER TABLE mpesa_transactions
      ADD COLUMN IF NOT EXISTS raw_payload_encrypted_ref text;
      ALTER TABLE mpesa_transactions
      ADD COLUMN IF NOT EXISTS payload_sha256 char(64);

      ALTER TABLE mpesa_c2b_payments
      ADD COLUMN IF NOT EXISTS invoice_number text;
      ALTER TABLE mpesa_c2b_payments
      ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'received_unverified';
      ALTER TABLE mpesa_c2b_payments
      ADD COLUMN IF NOT EXISTS matched_invoice_id uuid;
      DO $$
      DECLARE
        student_id_type text;
      BEGIN
        SELECT data_type
        INTO student_id_type
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'students'
          AND column_name = 'id';

        IF student_id_type = 'uuid' THEN
          ALTER TABLE mpesa_c2b_payments ADD COLUMN IF NOT EXISTS matched_student_id uuid;
          ALTER TABLE mpesa_c2b_payments
          ALTER COLUMN matched_student_id TYPE uuid USING CASE
            WHEN matched_student_id::text ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
              THEN matched_student_id::text::uuid
            ELSE NULL
          END;
        ELSE
          ALTER TABLE mpesa_c2b_payments ADD COLUMN IF NOT EXISTS matched_student_id text;
          ALTER TABLE mpesa_c2b_payments
          ALTER COLUMN matched_student_id TYPE text USING NULLIF(matched_student_id::text, '');
        END IF;
      END $$;
      ALTER TABLE mpesa_c2b_payments
      ADD COLUMN IF NOT EXISTS manual_fee_payment_id uuid;
      ALTER TABLE mpesa_c2b_payments
      ADD COLUMN IF NOT EXISTS ledger_transaction_id uuid;
      ALTER TABLE mpesa_c2b_payments
      ADD COLUMN IF NOT EXISTS matched_at timestamptz;
      ALTER TABLE mpesa_c2b_payments
      ADD COLUMN IF NOT EXISTS raw_payload_encrypted_ref text;
      ALTER TABLE mpesa_c2b_payments
      ADD COLUMN IF NOT EXISTS payload_sha256 char(64);
      ALTER TABLE mpesa_c2b_payments
      ALTER COLUMN status SET DEFAULT 'received_unverified';
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'ck_mpesa_c2b_payments_status'
        ) THEN
          ALTER TABLE mpesa_c2b_payments
          DROP CONSTRAINT ck_mpesa_c2b_payments_status;
        END IF;

        ALTER TABLE mpesa_c2b_payments
        ADD CONSTRAINT ck_mpesa_c2b_payments_status CHECK (
          status IN (
            'received_unverified',
            'verification_requested',
            'verified_matched',
            'verified_unmatched',
            'amount_mismatch',
            'duplicate_provider_receipt',
            'missing_provider_record',
            'reversed',
            'manual_review_required',
            'pending_review',
            'matched',
            'rejected'
          )
        );
      END;
      $$;
      ALTER TABLE mpesa_payload_support_access_logs
      ADD COLUMN IF NOT EXISTS accessed_at timestamptz NOT NULL DEFAULT NOW();
      ALTER TABLE mpesa_payload_support_access_logs
      ADD COLUMN IF NOT EXISTS access_expires_at timestamptz;
      UPDATE mpesa_payload_support_access_logs
      SET access_expires_at = accessed_at + INTERVAL '1 hour'
      WHERE access_expires_at IS NULL;
      ALTER TABLE mpesa_payload_support_access_logs
      ALTER COLUMN access_expires_at SET NOT NULL;

      ALTER TABLE mpesa_reconciliation_batches
      ADD COLUMN IF NOT EXISTS reviewed_by_user_id uuid;
      ALTER TABLE mpesa_reconciliation_batches
      ADD COLUMN IF NOT EXISTS reviewed_at timestamptz;

      ALTER TABLE mpesa_reconciliation_discrepancies
      ADD COLUMN IF NOT EXISTS resolution_status text NOT NULL DEFAULT 'open';
      ALTER TABLE mpesa_reconciliation_discrepancies
      ADD COLUMN IF NOT EXISTS resolved_by_user_id uuid;
      ALTER TABLE mpesa_reconciliation_discrepancies
      ADD COLUMN IF NOT EXISTS resolved_at timestamptz;

      ALTER TABLE finance_close_periods
      ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'open';
      ALTER TABLE finance_close_periods
      ADD COLUMN IF NOT EXISTS closed_by_user_id uuid;
      ALTER TABLE finance_close_periods
      ADD COLUMN IF NOT EXISTS closed_at timestamptz;
      ALTER TABLE finance_close_periods
      ADD COLUMN IF NOT EXISTS reopened_by_user_id uuid;
      ALTER TABLE finance_close_periods
      ADD COLUMN IF NOT EXISTS reopened_at timestamptz;
      ALTER TABLE finance_close_periods
      ADD COLUMN IF NOT EXISTS reason text;

      ALTER TABLE finance_approval_requests
      ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending_first_approval';
      ALTER TABLE finance_approval_requests
      ADD COLUMN IF NOT EXISTS close_period_id uuid;
      ALTER TABLE finance_approval_requests
      ADD COLUMN IF NOT EXISTS first_approver_user_id uuid;
      ALTER TABLE finance_approval_requests
      ADD COLUMN IF NOT EXISTS first_approved_at timestamptz;
      ALTER TABLE finance_approval_requests
      ADD COLUMN IF NOT EXISTS second_approver_user_id uuid;
      ALTER TABLE finance_approval_requests
      ADD COLUMN IF NOT EXISTS second_approved_at timestamptz;
      ALTER TABLE finance_approval_requests
      ADD COLUMN IF NOT EXISTS rejected_by_user_id uuid;
      ALTER TABLE finance_approval_requests
      ADD COLUMN IF NOT EXISTS rejected_at timestamptz;

      DO $$
      BEGIN
        IF to_regclass('public.students') IS NOT NULL
          AND EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = 'students'
              AND column_name = 'tenant_id'
          ) THEN
          IF NOT EXISTS (
            SELECT 1
            FROM pg_constraint
            WHERE conname = 'uq_students_tenant_id_id'
          ) THEN
            ALTER TABLE students
            ADD CONSTRAINT uq_students_tenant_id_id
              UNIQUE (tenant_id, id);
          END IF;
        END IF;

        IF to_regclass('public.students') IS NOT NULL
          AND EXISTS (
            SELECT 1
            FROM pg_constraint
            WHERE conname = 'uq_students_tenant_id_id'
          )
          AND EXISTS (
            SELECT 1
            FROM information_schema.columns payment_column
            JOIN information_schema.columns student_column
              ON student_column.table_schema = 'public'
             AND student_column.table_name = 'students'
             AND student_column.column_name = 'id'
            WHERE payment_column.table_schema = 'public'
              AND payment_column.table_name = 'payment_intents'
              AND payment_column.column_name = 'student_id'
              AND payment_column.data_type = student_column.data_type
          )
          AND NOT EXISTS (
            SELECT 1
            FROM pg_constraint
            WHERE conname = 'fk_payment_intents_student'
          ) THEN
          ALTER TABLE payment_intents
          ADD CONSTRAINT fk_payment_intents_student
            FOREIGN KEY (tenant_id, student_id)
            REFERENCES students (tenant_id, id)
            ON DELETE SET NULL;
        END IF;
      END;
      $$;

      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'ck_payment_intents_owner'
        ) THEN
          ALTER TABLE payment_intents
          ADD CONSTRAINT ck_payment_intents_owner
            CHECK (payment_owner IN ('tenant', 'platform'));
        END IF;

        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'fk_payment_intents_mpesa_config'
        ) THEN
          ALTER TABLE payment_intents
          ADD CONSTRAINT fk_payment_intents_mpesa_config
            FOREIGN KEY (tenant_id, mpesa_config_id)
            REFERENCES tenant_mpesa_configs (tenant_id, id)
            ON DELETE RESTRICT;
        END IF;

        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'fk_payment_intents_payment_channel'
        ) THEN
          ALTER TABLE payment_intents
          ADD CONSTRAINT fk_payment_intents_payment_channel
            FOREIGN KEY (tenant_id, payment_channel_id)
            REFERENCES tenant_payment_channels (tenant_id, id)
            ON DELETE RESTRICT;
        END IF;
      END;
      $$;

      CREATE INDEX IF NOT EXISTS ix_payment_intents_status_created_at
        ON payment_intents (tenant_id, status, created_at DESC);
      CREATE INDEX IF NOT EXISTS ix_payment_intents_status_expires_at
        ON payment_intents (tenant_id, status, expires_at)
        WHERE status IN ('stk_requested', 'callback_received', 'processing');
      CREATE INDEX IF NOT EXISTS ix_payment_intents_phone_number
        ON payment_intents (tenant_id, phone_number, created_at DESC);
      CREATE INDEX IF NOT EXISTS ix_payment_intents_student_id
        ON payment_intents (tenant_id, student_id, created_at DESC)
        WHERE student_id IS NOT NULL;
      CREATE INDEX IF NOT EXISTS ix_payment_intents_mpesa_short_code
        ON payment_intents (tenant_id, mpesa_short_code, created_at DESC)
        WHERE mpesa_short_code IS NOT NULL;
      CREATE UNIQUE INDEX IF NOT EXISTS ux_payment_intents_checkout_request_id
        ON payment_intents (checkout_request_id)
        WHERE checkout_request_id IS NOT NULL;
      CREATE UNIQUE INDEX IF NOT EXISTS ux_payment_intents_merchant_request_id
        ON payment_intents (merchant_request_id)
        WHERE merchant_request_id IS NOT NULL;
      CREATE INDEX IF NOT EXISTS ix_callback_logs_processing_status
        ON callback_logs (tenant_id, processing_status, created_at DESC);
      CREATE INDEX IF NOT EXISTS ix_callback_logs_checkout_request_id
        ON callback_logs (tenant_id, checkout_request_id, created_at DESC);
      CREATE INDEX IF NOT EXISTS ix_callback_logs_request_fingerprint
        ON callback_logs (tenant_id, request_fingerprint, created_at DESC);
      CREATE INDEX IF NOT EXISTS ix_callback_logs_payload_sha256
        ON callback_logs (tenant_id, payload_sha256)
        WHERE payload_sha256 IS NOT NULL;
      CREATE INDEX IF NOT EXISTS ix_mpesa_transactions_status
        ON mpesa_transactions (tenant_id, status, created_at DESC);
      CREATE INDEX IF NOT EXISTS ix_mpesa_transactions_receipt_number
        ON mpesa_transactions (tenant_id, mpesa_receipt_number);
      CREATE UNIQUE INDEX IF NOT EXISTS ux_mpesa_transactions_tenant_receipt_number
        ON mpesa_transactions (tenant_id, mpesa_receipt_number)
        WHERE mpesa_receipt_number IS NOT NULL;
      CREATE UNIQUE INDEX IF NOT EXISTS ux_mpesa_transactions_transaction_id
        ON mpesa_transactions (transaction_id)
        WHERE transaction_id IS NOT NULL;
      CREATE INDEX IF NOT EXISTS ix_mpesa_c2b_payments_status_received
        ON mpesa_c2b_payments (tenant_id, status, received_at DESC);
      CREATE INDEX IF NOT EXISTS ix_mpesa_c2b_payments_reference
        ON mpesa_c2b_payments (tenant_id, bill_ref_number, received_at DESC)
        WHERE bill_ref_number IS NOT NULL;
      CREATE INDEX IF NOT EXISTS ix_mpesa_c2b_payments_student
        ON mpesa_c2b_payments (tenant_id, matched_student_id, received_at DESC)
        WHERE matched_student_id IS NOT NULL;
      CREATE INDEX IF NOT EXISTS ix_mpesa_payload_vault_source
        ON mpesa_payload_vault (tenant_id, source, source_id);
      CREATE INDEX IF NOT EXISTS ix_mpesa_payload_support_access_ref
        ON mpesa_payload_support_access_logs (tenant_id, raw_payload_encrypted_ref, accessed_at DESC);
      CREATE INDEX IF NOT EXISTS ix_mpesa_verification_jobs_next_retry
        ON mpesa_verification_jobs (tenant_id, transaction_status, next_retry_at)
        WHERE transaction_status IN ('pending', 'retry_scheduled');
      CREATE INDEX IF NOT EXISTS ix_mpesa_verification_jobs_checkout_request
        ON mpesa_verification_jobs (tenant_id, checkout_request_id, created_at DESC)
        WHERE checkout_request_id IS NOT NULL;
      CREATE INDEX IF NOT EXISTS ix_mpesa_reconciliation_batches_report_date
        ON mpesa_reconciliation_batches (tenant_id, report_date DESC, payment_channel_id);
      CREATE INDEX IF NOT EXISTS ix_mpesa_reconciliation_batches_state
        ON mpesa_reconciliation_batches (tenant_id, reconciliation_state, generated_at DESC);
      CREATE INDEX IF NOT EXISTS ix_mpesa_reconciliation_discrepancies_batch
        ON mpesa_reconciliation_discrepancies (tenant_id, reconciliation_batch_id, severity);
      CREATE INDEX IF NOT EXISTS ix_mpesa_reconciliation_discrepancies_resolution
        ON mpesa_reconciliation_discrepancies (tenant_id, resolution_status, occurred_at DESC);
      CREATE INDEX IF NOT EXISTS ix_finance_close_periods_window
        ON finance_close_periods (tenant_id, period_started_at, period_ended_at, status);
      CREATE INDEX IF NOT EXISTS ix_finance_approval_requests_status
        ON finance_approval_requests (tenant_id, status, created_at DESC);

      ALTER TABLE payment_intents ENABLE ROW LEVEL SECURITY;
      ALTER TABLE payment_intents FORCE ROW LEVEL SECURITY;
      ALTER TABLE callback_logs ENABLE ROW LEVEL SECURITY;
      ALTER TABLE callback_logs FORCE ROW LEVEL SECURITY;
      ALTER TABLE mpesa_transactions ENABLE ROW LEVEL SECURITY;
      ALTER TABLE mpesa_transactions FORCE ROW LEVEL SECURITY;
      ALTER TABLE mpesa_c2b_payments ENABLE ROW LEVEL SECURITY;
      ALTER TABLE mpesa_c2b_payments FORCE ROW LEVEL SECURITY;
      ALTER TABLE mpesa_payload_vault ENABLE ROW LEVEL SECURITY;
      ALTER TABLE mpesa_payload_vault FORCE ROW LEVEL SECURITY;
      ALTER TABLE mpesa_payload_support_access_logs ENABLE ROW LEVEL SECURITY;
      ALTER TABLE mpesa_payload_support_access_logs FORCE ROW LEVEL SECURITY;
      ALTER TABLE mpesa_verification_jobs ENABLE ROW LEVEL SECURITY;
      ALTER TABLE mpesa_verification_jobs FORCE ROW LEVEL SECURITY;
      ALTER TABLE mpesa_reconciliation_batches ENABLE ROW LEVEL SECURITY;
      ALTER TABLE mpesa_reconciliation_batches FORCE ROW LEVEL SECURITY;
      ALTER TABLE mpesa_reconciliation_discrepancies ENABLE ROW LEVEL SECURITY;
      ALTER TABLE mpesa_reconciliation_discrepancies FORCE ROW LEVEL SECURITY;
      ALTER TABLE finance_close_periods ENABLE ROW LEVEL SECURITY;
      ALTER TABLE finance_close_periods FORCE ROW LEVEL SECURITY;
      ALTER TABLE finance_approval_requests ENABLE ROW LEVEL SECURITY;
      ALTER TABLE finance_approval_requests FORCE ROW LEVEL SECURITY;

      DROP POLICY IF EXISTS payment_intents_rls_policy ON payment_intents;
      CREATE POLICY payment_intents_rls_policy ON payment_intents
      FOR ALL
      USING (tenant_id = current_setting('app.tenant_id', true))
      WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

      DROP POLICY IF EXISTS callback_logs_rls_policy ON callback_logs;
      CREATE POLICY callback_logs_rls_policy ON callback_logs
      FOR ALL
      USING (tenant_id = current_setting('app.tenant_id', true))
      WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

      DROP POLICY IF EXISTS mpesa_transactions_rls_policy ON mpesa_transactions;
      CREATE POLICY mpesa_transactions_rls_policy ON mpesa_transactions
      FOR ALL
      USING (tenant_id = current_setting('app.tenant_id', true))
      WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

      DROP POLICY IF EXISTS mpesa_c2b_payments_rls_policy ON mpesa_c2b_payments;
      CREATE POLICY mpesa_c2b_payments_rls_policy ON mpesa_c2b_payments
      FOR ALL
      USING (tenant_id = current_setting('app.tenant_id', true))
      WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

      DROP POLICY IF EXISTS mpesa_payload_vault_rls_policy ON mpesa_payload_vault;
      CREATE POLICY mpesa_payload_vault_rls_policy ON mpesa_payload_vault
      FOR ALL
      USING (tenant_id = current_setting('app.tenant_id', true))
      WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

      DROP POLICY IF EXISTS mpesa_payload_support_access_logs_rls_policy ON mpesa_payload_support_access_logs;
      CREATE POLICY mpesa_payload_support_access_logs_rls_policy ON mpesa_payload_support_access_logs
      FOR ALL
      USING (tenant_id = current_setting('app.tenant_id', true))
      WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

      DROP POLICY IF EXISTS mpesa_verification_jobs_rls_policy ON mpesa_verification_jobs;
      CREATE POLICY mpesa_verification_jobs_rls_policy ON mpesa_verification_jobs
      FOR ALL
      USING (tenant_id = current_setting('app.tenant_id', true))
      WITH CHECK (tenant_id = current_setting('app.tenant_id', true));
      DROP POLICY IF EXISTS mpesa_reconciliation_batches_rls_policy ON mpesa_reconciliation_batches;
      CREATE POLICY mpesa_reconciliation_batches_rls_policy ON mpesa_reconciliation_batches
      FOR ALL
      USING (tenant_id = current_setting('app.tenant_id', true))
      WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

      DROP POLICY IF EXISTS mpesa_reconciliation_discrepancies_rls_policy ON mpesa_reconciliation_discrepancies;
      CREATE POLICY mpesa_reconciliation_discrepancies_rls_policy ON mpesa_reconciliation_discrepancies
      FOR ALL
      USING (tenant_id = current_setting('app.tenant_id', true))
      WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

      DROP POLICY IF EXISTS finance_close_periods_rls_policy ON finance_close_periods;
      CREATE POLICY finance_close_periods_rls_policy ON finance_close_periods
      FOR ALL
      USING (tenant_id = current_setting('app.tenant_id', true))
      WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

      DROP POLICY IF EXISTS finance_approval_requests_rls_policy ON finance_approval_requests;
      CREATE POLICY finance_approval_requests_rls_policy ON finance_approval_requests
      FOR ALL
      USING (tenant_id = current_setting('app.tenant_id', true))
      WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

      DROP TRIGGER IF EXISTS trg_payment_intents_set_updated_at ON payment_intents;
      CREATE TRIGGER trg_payment_intents_set_updated_at
      BEFORE UPDATE ON payment_intents
      FOR EACH ROW
      EXECUTE FUNCTION set_updated_at();

      DROP TRIGGER IF EXISTS trg_callback_logs_set_updated_at ON callback_logs;
      CREATE TRIGGER trg_callback_logs_set_updated_at
      BEFORE UPDATE ON callback_logs
      FOR EACH ROW
      EXECUTE FUNCTION set_updated_at();

      DROP TRIGGER IF EXISTS trg_mpesa_transactions_set_updated_at ON mpesa_transactions;
      CREATE TRIGGER trg_mpesa_transactions_set_updated_at
      BEFORE UPDATE ON mpesa_transactions
      FOR EACH ROW
      EXECUTE FUNCTION set_updated_at();

      DROP TRIGGER IF EXISTS trg_mpesa_c2b_payments_set_updated_at ON mpesa_c2b_payments;
      CREATE TRIGGER trg_mpesa_c2b_payments_set_updated_at
      BEFORE UPDATE ON mpesa_c2b_payments
      FOR EACH ROW
      EXECUTE FUNCTION set_updated_at();

      DROP TRIGGER IF EXISTS trg_mpesa_payload_vault_set_updated_at ON mpesa_payload_vault;
      CREATE TRIGGER trg_mpesa_payload_vault_set_updated_at
      BEFORE UPDATE ON mpesa_payload_vault
      FOR EACH ROW
      EXECUTE FUNCTION set_updated_at();

      DROP TRIGGER IF EXISTS trg_mpesa_verification_jobs_set_updated_at ON mpesa_verification_jobs;
      CREATE TRIGGER trg_mpesa_verification_jobs_set_updated_at
      BEFORE UPDATE ON mpesa_verification_jobs
      FOR EACH ROW
      EXECUTE FUNCTION set_updated_at();
      DROP TRIGGER IF EXISTS trg_mpesa_reconciliation_batches_set_updated_at ON mpesa_reconciliation_batches;
      CREATE TRIGGER trg_mpesa_reconciliation_batches_set_updated_at
      BEFORE UPDATE ON mpesa_reconciliation_batches
      FOR EACH ROW
      EXECUTE FUNCTION set_updated_at();

      DROP TRIGGER IF EXISTS trg_mpesa_reconciliation_discrepancies_set_updated_at ON mpesa_reconciliation_discrepancies;
      CREATE TRIGGER trg_mpesa_reconciliation_discrepancies_set_updated_at
      BEFORE UPDATE ON mpesa_reconciliation_discrepancies
      FOR EACH ROW
      EXECUTE FUNCTION set_updated_at();

      DROP TRIGGER IF EXISTS trg_finance_close_periods_set_updated_at ON finance_close_periods;
      CREATE TRIGGER trg_finance_close_periods_set_updated_at
      BEFORE UPDATE ON finance_close_periods
      FOR EACH ROW
      EXECUTE FUNCTION set_updated_at();

      DROP TRIGGER IF EXISTS trg_finance_approval_requests_set_updated_at ON finance_approval_requests;
      CREATE TRIGGER trg_finance_approval_requests_set_updated_at
      BEFORE UPDATE ON finance_approval_requests
      FOR EACH ROW
      EXECUTE FUNCTION set_updated_at();

      DROP TRIGGER IF EXISTS trg_transactions_finance_period_open ON transactions;
      CREATE TRIGGER trg_transactions_finance_period_open
      BEFORE INSERT ON transactions
      FOR EACH ROW
      EXECUTE FUNCTION app.ensure_finance_period_open();
    `);

    this.logger.log('MPESA payment schema and RLS policies verified');
  }
}
