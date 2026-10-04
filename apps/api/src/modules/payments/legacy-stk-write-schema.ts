/** Compatibility expansion for installations whose original Prisma tables
 * predate the governed STK contract. Retains legacy columns and values. Invalid
 * existing values or duplicate provider identities abort the whole bootstrap;
 * this must never infer a payment, school, ledger link or provider verification.
 * Rollback keeps the expanded schema (old callers still accept their old values).
 */
export const LEGACY_STK_WRITE_SCHEMA = `
  DO $$
  DECLARE col text;
  BEGIN
    FOREACH col IN ARRAY ARRAY['account_reference','ledger_debit_account_code','ledger_credit_account_code','request_id'] LOOP
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema=current_schema()
        AND table_name='payment_intents' AND column_name=col AND data_type<>'text') THEN
        EXECUTE format('ALTER TABLE payment_intents ALTER COLUMN %I TYPE text USING %I::text',col,col);
      END IF;
    END LOOP;
    FOREACH col IN ARRAY ARRAY['user_id','student_id','request_id','external_reference','mpesa_config_id',
      'payment_channel_id','mpesa_short_code','payment_channel_type','ledger_debit_account_code','ledger_credit_account_code'] LOOP
      EXECUTE format('ALTER TABLE payment_intents ALTER COLUMN %I DROP NOT NULL',col);
    END LOOP;
  END $$;
  ALTER TABLE payment_intents ALTER COLUMN updated_at SET DEFAULT now();
  CREATE UNIQUE INDEX IF NOT EXISTS ux_payment_intents_tenant_idempotency
    ON payment_intents(tenant_id,idempotency_key_id);

  DO $$
  DECLARE col text; invalid_scalar boolean;
  BEGIN
    FOREACH col IN ARRAY ARRAY['checkout_request_id','merchant_request_id','delivery_id'] LOOP
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema=current_schema()
        AND table_name='callback_logs' AND column_name=col AND data_type<>'text') THEN
        EXECUTE format('ALTER TABLE callback_logs ALTER COLUMN %I TYPE text USING %I::text',col,col);
      END IF;
    END LOOP;
    FOREACH col IN ARRAY ARRAY['raw_payload_encrypted_ref','payload_sha256'] LOOP
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema=current_schema()
        AND table_name='callback_logs' AND column_name=col AND data_type='jsonb') THEN
        -- Only JSON strings represent these scalar values. Reject objects/numbers.
        EXECUTE format('SELECT EXISTS(SELECT 1 FROM callback_logs WHERE %I IS NOT NULL AND jsonb_typeof(%I)<>''string'')',col,col) INTO invalid_scalar;
        IF invalid_scalar THEN
          RAISE EXCEPTION 'Legacy callback scalar metadata needs explicit review';
        END IF;
        EXECUTE format('ALTER TABLE callback_logs ALTER COLUMN %I TYPE text USING %I #>> ''{}''',col,col);
      END IF;
    END LOOP;
    FOREACH col IN ARRAY ARRAY['merchant_request_id','checkout_request_id','mpesa_short_code','event_timestamp',
      'signature','raw_payload','raw_payload_encrypted_ref','payload_sha256','source_ip'] LOOP
      EXECUTE format('ALTER TABLE callback_logs ALTER COLUMN %I DROP NOT NULL',col);
    END LOOP;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema=current_schema()
      AND table_name='callback_logs' AND column_name='headers' AND data_type='text') THEN
      ALTER TABLE callback_logs ALTER COLUMN headers TYPE jsonb USING headers::jsonb;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema=current_schema()
      AND table_name='callback_logs' AND column_name='signature_verified' AND data_type='text') THEN
      ALTER TABLE callback_logs ALTER COLUMN signature_verified TYPE boolean USING signature_verified::boolean;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema=current_schema()
      AND table_name='callback_logs' AND column_name='event_timestamp' AND data_type='text') THEN
      IF EXISTS (SELECT 1 FROM callback_logs WHERE event_timestamp IS NOT NULL
        AND event_timestamp !~ '[T ][0-9]{2}:[0-9]{2}.*(Z|[+-][0-9]{2}(:?[0-9]{2})?)$') THEN
        RAISE EXCEPTION 'Legacy callback timestamps without a timezone need explicit review';
      END IF;
      ALTER TABLE callback_logs ALTER COLUMN event_timestamp TYPE timestamptz USING event_timestamp::timestamptz;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema=current_schema()
      AND table_name='callback_logs' AND column_name='source_ip' AND data_type='text') THEN
      ALTER TABLE callback_logs ALTER COLUMN source_ip TYPE inet USING source_ip::inet;
    END IF;
  END $$;
  ALTER TABLE callback_logs ADD COLUMN IF NOT EXISTS queue_job_id text;
  ALTER TABLE callback_logs ADD COLUMN IF NOT EXISTS failure_reason text;
  ALTER TABLE callback_logs ADD COLUMN IF NOT EXISTS queued_at timestamptz;
  ALTER TABLE callback_logs ADD COLUMN IF NOT EXISTS processed_at timestamptz;
  ALTER TABLE callback_logs ALTER COLUMN updated_at SET DEFAULT now();
  CREATE UNIQUE INDEX IF NOT EXISTS ux_callback_logs_tenant_id ON callback_logs(tenant_id,id);

  -- School ownership remains mandatory through tenant_id and the existing RLS
  -- policy. The old school_id FK and every legacy value are retained.
  ALTER TABLE mpesa_transactions ALTER COLUMN tenant_id SET NOT NULL;
  DO $$
  DECLARE col text;
  BEGIN
    FOREACH col IN ARRAY ARRAY['school_id','amount','transaction_date','match_status','raw_payload_json'] LOOP
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema=current_schema()
        AND table_name='mpesa_transactions' AND column_name=col) THEN
        EXECUTE format('ALTER TABLE mpesa_transactions ALTER COLUMN %I DROP NOT NULL',col);
      END IF;
    END LOOP;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema=current_schema()
      AND table_name='mpesa_transactions' AND column_name='id' AND data_type='text') THEN
      ALTER TABLE mpesa_transactions ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;
    END IF;
  END $$;
  ALTER TABLE mpesa_transactions ALTER COLUMN mpesa_receipt_number DROP NOT NULL;
  ALTER TABLE mpesa_transactions ALTER COLUMN phone_number DROP NOT NULL;
  ALTER TABLE mpesa_transactions ALTER COLUMN updated_at SET DEFAULT now();
  CREATE UNIQUE INDEX IF NOT EXISTS ux_mpesa_transactions_tenant_checkout
    ON mpesa_transactions(tenant_id,checkout_request_id);
  DO $$
  BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='mpesa_transactions'::regclass AND conname='fk_mpesa_transactions_payment_intent') THEN
      ALTER TABLE mpesa_transactions ADD CONSTRAINT fk_mpesa_transactions_payment_intent
        FOREIGN KEY(tenant_id,payment_intent_id) REFERENCES payment_intents(tenant_id,id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='mpesa_transactions'::regclass AND conname='fk_mpesa_transactions_callback_log') THEN
      ALTER TABLE mpesa_transactions ADD CONSTRAINT fk_mpesa_transactions_callback_log
        FOREIGN KEY(tenant_id,callback_log_id) REFERENCES callback_logs(tenant_id,id);
    END IF;
  END $$;
`;
