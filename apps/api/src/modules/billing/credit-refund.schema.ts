/** Reservations and paid refunds retain their complete decision and payout history. */
export const CREDIT_REFUND_SCHEMA = `
CREATE TABLE IF NOT EXISTS fee_credit_refunds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id text NOT NULL CHECK(tenant_id<>'global'),
  idempotency_key uuid NOT NULL,source_kind text NOT NULL CHECK(source_kind IN ('manual','online')),source_id uuid NOT NULL,
  receipt_id uuid NOT NULL,student_id text NOT NULL,original_ledger_transaction_id text NOT NULL,
  amount_minor bigint NOT NULL CHECK(amount_minor>0),currency_code text NOT NULL CHECK(currency_code='KES'),
  reason text NOT NULL,requested_by text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected','cancelled','completed')),
  reviewed_by text,reviewed_at timestamptz,decision_reason text,cancelled_by text,cancelled_at timestamptz,cancellation_reason text,
  external_reference text,evidence_reference text,paid_at timestamptz,completed_by text,completed_at timestamptz,ledger_transaction_id text,
  created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id,idempotency_key),UNIQUE(tenant_id,ledger_transaction_id),UNIQUE(tenant_id,external_reference),
  CHECK(reviewed_by IS NULL OR reviewed_by<>requested_by),
  CHECK(status NOT IN ('approved','rejected','completed') OR (reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL AND decision_reason IS NOT NULL)),
  CHECK(status<>'cancelled' OR (cancelled_by IS NOT NULL AND cancelled_at IS NOT NULL AND cancellation_reason IS NOT NULL)),
  CHECK((status='completed' AND ledger_transaction_id IS NOT NULL AND external_reference IS NOT NULL AND evidence_reference IS NOT NULL
    AND paid_at IS NOT NULL AND completed_by IS NOT NULL AND completed_at IS NOT NULL)
    OR (status<>'completed' AND ledger_transaction_id IS NULL AND external_reference IS NULL AND evidence_reference IS NULL
      AND paid_at IS NULL AND completed_by IS NULL AND completed_at IS NULL))
);
CREATE INDEX IF NOT EXISTS ix_credit_refund_source ON fee_credit_refunds(tenant_id,source_kind,source_id,status);
CREATE INDEX IF NOT EXISTS ix_credit_refund_receipt ON fee_credit_refunds(tenant_id,receipt_id,status);
CREATE INDEX IF NOT EXISTS ix_credit_refund_student ON fee_credit_refunds(tenant_id,student_id,created_at DESC);
ALTER TABLE fee_credit_refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE fee_credit_refunds FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS credit_refund_school ON fee_credit_refunds;
CREATE POLICY credit_refund_school ON fee_credit_refunds FOR ALL
  USING(tenant_id=current_setting('app.tenant_id',true)) WITH CHECK(tenant_id=current_setting('app.tenant_id',true));
CREATE OR REPLACE FUNCTION app.guard_credit_refund_history() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE allowed text[];
BEGIN
  IF current_setting('app.allow_tenant_deletion',true)='true' AND TG_OP='DELETE' THEN RETURN OLD; END IF;
  IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Credit refund history is immutable' USING ERRCODE='55000'; END IF;
  IF OLD.status='pending' AND NEW.status IN ('approved','rejected') THEN allowed:=ARRAY['status','reviewed_by','reviewed_at','decision_reason','updated_at'];
  ELSIF OLD.status IN ('pending','approved') AND NEW.status='cancelled' THEN allowed:=ARRAY['status','cancelled_by','cancelled_at','cancellation_reason','updated_at'];
  ELSIF OLD.status='approved' AND NEW.status='completed' THEN allowed:=ARRAY['status','external_reference','evidence_reference','paid_at','completed_by','completed_at','ledger_transaction_id','updated_at'];
  ELSE RAISE EXCEPTION 'Credit refund decision history is immutable' USING ERRCODE='55000'; END IF;
  IF (to_jsonb(NEW)-allowed) IS DISTINCT FROM (to_jsonb(OLD)-allowed) THEN
    RAISE EXCEPTION 'Credit refund source and evidence are immutable' USING ERRCODE='55000'; END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS credit_refund_history ON fee_credit_refunds;
CREATE TRIGGER credit_refund_history BEFORE UPDATE OR DELETE ON fee_credit_refunds
  FOR EACH ROW EXECUTE FUNCTION app.guard_credit_refund_history();
`;
