/** Evidence of an externally paid full refund. The approved receipt reversal
 * already contains the financial posting; evidence must never post it again. */
export const RECEIPT_REFUND_EVIDENCE_SCHEMA = `
CREATE TABLE IF NOT EXISTS receipt_refund_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id text NOT NULL CHECK(tenant_id<>'global'),
  receipt_id uuid NOT NULL,source_kind text NOT NULL CHECK(source_kind IN ('manual','stk')),
  student_id text NOT NULL,original_ledger_transaction_id text NOT NULL,reversal_ledger_transaction_id text NOT NULL,
  amount_minor bigint NOT NULL CHECK(amount_minor>0),currency_code text NOT NULL,
  external_reference text NOT NULL,evidence_reference text NOT NULL,paid_at timestamptz NOT NULL,reason text NOT NULL,
  status text NOT NULL DEFAULT 'pending_review' CHECK(status IN ('pending_review','approved','rejected')),
  requested_by text NOT NULL,reviewed_by text,decision_reason text,reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK(reviewed_by IS NULL OR reviewed_by<>requested_by),
  CHECK((status='pending_review' AND reviewed_by IS NULL AND reviewed_at IS NULL)
    OR (status<>'pending_review' AND reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL AND decision_reason IS NOT NULL))
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_refund_evidence_reversal ON receipt_refund_evidence(tenant_id,reversal_ledger_transaction_id)
  WHERE status IN ('pending_review','approved');
CREATE UNIQUE INDEX IF NOT EXISTS ux_refund_evidence_reference ON receipt_refund_evidence(tenant_id,external_reference)
  WHERE status IN ('pending_review','approved');
CREATE INDEX IF NOT EXISTS ix_refund_evidence_queue ON receipt_refund_evidence(tenant_id,created_at DESC,id);
ALTER TABLE receipt_refund_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE receipt_refund_evidence FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS receipt_refund_school ON receipt_refund_evidence;
CREATE POLICY receipt_refund_school ON receipt_refund_evidence FOR ALL
  USING(tenant_id=current_setting('app.tenant_id',true)) WITH CHECK(tenant_id=current_setting('app.tenant_id',true));
CREATE OR REPLACE FUNCTION app.guard_receipt_refund_evidence() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF current_setting('app.allow_tenant_deletion',true)='true' AND TG_OP='DELETE' THEN RETURN OLD; END IF;
  IF TG_OP='DELETE' OR OLD.status<>'pending_review' OR NEW.status NOT IN ('approved','rejected')
    OR (to_jsonb(NEW)-ARRAY['status','reviewed_by','reviewed_at','decision_reason','updated_at'])
      IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['status','reviewed_by','reviewed_at','decision_reason','updated_at'])
    THEN RAISE EXCEPTION 'Refund evidence and completed decisions are immutable' USING ERRCODE='55000'; END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS receipt_refund_history ON receipt_refund_evidence;
CREATE TRIGGER receipt_refund_history BEFORE UPDATE OR DELETE ON receipt_refund_evidence
  FOR EACH ROW EXECUTE FUNCTION app.guard_receipt_refund_evidence();
`;
