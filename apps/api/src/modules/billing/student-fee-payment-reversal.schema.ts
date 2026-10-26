/** Preserve successful provider evidence and original allocations. Corrections
 * are additional immutable records, never a rewrite of the original payment. */
export const STUDENT_FEE_PAYMENT_REVERSAL_SCHEMA = `
DO $$ DECLARE ledger_id_type text; BEGIN
  SELECT format_type(atttypid,atttypmod) INTO ledger_id_type FROM pg_attribute
    WHERE attrelid=to_regclass('transactions') AND attname='id' AND NOT attisdropped;
  IF ledger_id_type IS NOT NULL AND ledger_id_type NOT IN ('uuid','text') THEN
    RAISE EXCEPTION 'Unsupported ledger identity type for student payment reversals';
  END IF;
  EXECUTE format('CREATE TABLE IF NOT EXISTS student_fee_payment_reversals (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id text NOT NULL CHECK(tenant_id<>''global''),
    payment_intent_id uuid NOT NULL,student_id text NOT NULL,approval_id uuid NOT NULL,
    original_ledger_transaction_id %s NOT NULL,reversal_ledger_transaction_id %s NOT NULL,
    amount_minor bigint NOT NULL CHECK(amount_minor>0),currency_code text NOT NULL,
    reason text NOT NULL,created_by text NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id,payment_intent_id),UNIQUE(tenant_id,original_ledger_transaction_id),
    UNIQUE(tenant_id,reversal_ledger_transaction_id),UNIQUE(tenant_id,approval_id))',
    COALESCE(ledger_id_type,'text'),COALESCE(ledger_id_type,'text'));
  IF ledger_id_type IS NOT NULL AND NOT EXISTS(SELECT 1 FROM pg_constraint
    WHERE conrelid='student_fee_payment_reversals'::regclass AND conname='student_payment_reversal_original_ledger') THEN
    ALTER TABLE student_fee_payment_reversals ADD CONSTRAINT student_payment_reversal_original_ledger
      FOREIGN KEY(tenant_id,original_ledger_transaction_id) REFERENCES transactions(tenant_id,id);
    ALTER TABLE student_fee_payment_reversals ADD CONSTRAINT student_payment_reversal_ledger
      FOREIGN KEY(tenant_id,reversal_ledger_transaction_id) REFERENCES transactions(tenant_id,id);
  END IF;
END $$;
ALTER TABLE student_fee_payment_reversals ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_fee_payment_reversals FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS student_fee_payment_reversal_school ON student_fee_payment_reversals;
CREATE POLICY student_fee_payment_reversal_school ON student_fee_payment_reversals FOR ALL
  USING(tenant_id=current_setting('app.tenant_id',true)) WITH CHECK(tenant_id=current_setting('app.tenant_id',true));
DROP TRIGGER IF EXISTS student_fee_payment_reversal_history ON student_fee_payment_reversals;
CREATE TRIGGER student_fee_payment_reversal_history BEFORE UPDATE OR DELETE ON student_fee_payment_reversals
  FOR EACH ROW EXECUTE FUNCTION app.guard_fee_credit_history();
`;
