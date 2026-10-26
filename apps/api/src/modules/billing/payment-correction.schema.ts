/** Append-only proof of an accounting move. Original receipts remain unchanged. */
export const PAYMENT_CORRECTION_SCHEMA = `
CREATE TABLE IF NOT EXISTS fee_payment_corrections (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id text NOT NULL,
 approval_id uuid NOT NULL, collection_payment_id uuid,
 source_kind text NOT NULL CHECK(source_kind IN ('manual','stk')), source_id uuid NOT NULL,
 replacement_receipt_id uuid NOT NULL, from_student_id text NOT NULL, to_student_id text NOT NULL,
 amount_minor bigint NOT NULL CHECK(amount_minor>0), currency_code text NOT NULL CHECK(currency_code='KES'),
 original_ledger_id text NOT NULL, reversal_ledger_id text NOT NULL, replacement_ledger_id text NOT NULL,
 created_by text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
 CHECK(from_student_id<>to_student_id), CHECK(original_ledger_id<>replacement_ledger_id),
 UNIQUE(tenant_id,approval_id), UNIQUE(tenant_id,source_kind,source_id), UNIQUE(tenant_id,replacement_receipt_id)
);
CREATE INDEX IF NOT EXISTS ix_fee_payment_corrections_collection ON fee_payment_corrections(tenant_id,collection_payment_id);
ALTER TABLE fee_payment_corrections ENABLE ROW LEVEL SECURITY;
ALTER TABLE fee_payment_corrections FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS fee_payment_corrections_school ON fee_payment_corrections;
CREATE POLICY fee_payment_corrections_school ON fee_payment_corrections FOR ALL
 USING(tenant_id=current_setting('app.tenant_id',true)) WITH CHECK(tenant_id=current_setting('app.tenant_id',true));
CREATE OR REPLACE FUNCTION app.guard_fee_payment_correction() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP<>'INSERT' THEN RAISE EXCEPTION 'Payment correction history is immutable'; END IF;
 IF NOT EXISTS(SELECT 1 FROM finance_approval_requests a WHERE a.tenant_id=NEW.tenant_id AND a.id=NEW.approval_id
   AND a.action='move_payment' AND a.status='approved' AND a.second_approver_user_id::text=NEW.created_by
   AND a.first_approver_user_id<>a.second_approver_user_id AND a.requested_by_user_id<>a.first_approver_user_id
   AND a.requested_by_user_id<>a.second_approver_user_id AND a.amount_minor=NEW.amount_minor AND a.currency_code=NEW.currency_code
   AND a.evidence->>'target_student_id'=NEW.to_student_id AND a.evidence->>'original_receipt_id'=NEW.source_id::text)
 THEN RAISE EXCEPTION 'Payment move requires independent approval'; END IF;
 IF NOT EXISTS(SELECT 1 FROM manual_fee_payments m WHERE m.tenant_id=NEW.tenant_id AND m.id=NEW.replacement_receipt_id
   AND m.status='cleared' AND m.student_id::text=NEW.to_student_id AND m.amount_minor=NEW.amount_minor
   AND m.currency_code=NEW.currency_code AND m.ledger_transaction_id::text=NEW.replacement_ledger_id)
 THEN RAISE EXCEPTION 'Replacement receipt does not match correction'; END IF;
 IF NEW.source_kind='manual' AND NOT EXISTS(SELECT 1 FROM manual_fee_payments m WHERE m.tenant_id=NEW.tenant_id AND m.id=NEW.source_id
   AND m.status='reversed' AND COALESCE(m.student_id::text,(SELECT metadata->>'student_id' FROM invoices i WHERE i.tenant_id=m.tenant_id AND i.id::text=m.invoice_id::text))=NEW.from_student_id
   AND m.amount_minor=NEW.amount_minor AND m.currency_code=NEW.currency_code
   AND m.ledger_transaction_id::text=NEW.original_ledger_id AND m.reversal_ledger_transaction_id::text=NEW.reversal_ledger_id)
 THEN RAISE EXCEPTION 'Original receipt and reversal do not match correction'; END IF;
 IF NEW.source_kind='stk' AND NOT EXISTS(SELECT 1 FROM student_fee_payment_reversals r WHERE r.tenant_id=NEW.tenant_id
   AND r.payment_intent_id=NEW.source_id AND r.student_id=NEW.from_student_id AND r.amount_minor=NEW.amount_minor AND r.currency_code=NEW.currency_code
   AND r.original_ledger_transaction_id::text=NEW.original_ledger_id AND r.reversal_ledger_transaction_id::text=NEW.reversal_ledger_id AND r.approval_id=NEW.approval_id)
 THEN RAISE EXCEPTION 'Original STK receipt and reversal do not match correction'; END IF;
 IF (SELECT count(*) FROM transactions t WHERE t.tenant_id=NEW.tenant_id
   AND t.id::text IN (NEW.original_ledger_id,NEW.reversal_ledger_id,NEW.replacement_ledger_id)
   AND t.total_amount_minor::numeric=NEW.amount_minor AND t.currency_code=NEW.currency_code)<>3
   OR EXISTS(SELECT e.account_id FROM ledger_entries e WHERE e.tenant_id=NEW.tenant_id
     AND e.transaction_id::text IN (NEW.reversal_ledger_id,NEW.replacement_ledger_id) GROUP BY e.account_id
     HAVING sum(CASE WHEN e.direction='debit' THEN e.amount_minor::numeric ELSE -e.amount_minor::numeric END)<>0)
   OR (SELECT count(DISTINCT effective_at) FROM transactions WHERE tenant_id=NEW.tenant_id
     AND id::text IN (NEW.reversal_ledger_id,NEW.replacement_ledger_id))<>1
 THEN RAISE EXCEPTION 'Correction journals must conserve money in the same accounting period'; END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS fee_payment_correction_history ON fee_payment_corrections;
CREATE TRIGGER fee_payment_correction_history BEFORE INSERT OR UPDATE OR DELETE ON fee_payment_corrections
 FOR EACH ROW EXECUTE FUNCTION app.guard_fee_payment_correction();
`;
