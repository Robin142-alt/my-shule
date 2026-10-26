import { CREDIT_REFUND_SCHEMA } from './credit-refund.schema';
import { PAYMENT_CORRECTION_SCHEMA } from './payment-correction.schema';
/** Applications, refunds and their reversals are durable financial history. */
export const FEE_CREDIT_APPLICATION_SCHEMA_SQL = `
${CREDIT_REFUND_SCHEMA}
${PAYMENT_CORRECTION_SCHEMA}
CREATE TABLE IF NOT EXISTS fee_credit_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id text NOT NULL,
  student_id text NOT NULL, source_kind text NOT NULL CHECK(source_kind IN ('manual','online')),
  source_id uuid NOT NULL, invoice_id uuid NOT NULL, amount_minor bigint NOT NULL CHECK(amount_minor>0),
  reason text NOT NULL, created_by text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id,id), CHECK(tenant_id <> 'global')
);
CREATE TABLE IF NOT EXISTS fee_credit_application_reversals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id text NOT NULL, application_id uuid NOT NULL,
  reason text NOT NULL, created_by text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id,application_id),
  FOREIGN KEY(tenant_id,application_id) REFERENCES fee_credit_applications(tenant_id,id)
);
CREATE INDEX IF NOT EXISTS ix_fee_credit_applications_source ON fee_credit_applications(tenant_id,source_kind,source_id);
CREATE INDEX IF NOT EXISTS ix_fee_credit_applications_student ON fee_credit_applications(tenant_id,student_id,created_at);
ALTER TABLE fee_credit_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE fee_credit_applications FORCE ROW LEVEL SECURITY;
ALTER TABLE fee_credit_application_reversals ENABLE ROW LEVEL SECURITY;
ALTER TABLE fee_credit_application_reversals FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS credit_application_school ON fee_credit_applications;
CREATE POLICY credit_application_school ON fee_credit_applications FOR ALL
  USING(tenant_id=current_setting('app.tenant_id',true)) WITH CHECK(tenant_id=current_setting('app.tenant_id',true));
DROP POLICY IF EXISTS credit_application_reversal_school ON fee_credit_application_reversals;
CREATE POLICY credit_application_reversal_school ON fee_credit_application_reversals FOR ALL
  USING(tenant_id=current_setting('app.tenant_id',true)) WITH CHECK(tenant_id=current_setting('app.tenant_id',true));
CREATE OR REPLACE FUNCTION app.guard_fee_credit_history() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF current_setting('app.allow_tenant_deletion',true)='true' THEN RETURN OLD; END IF;
  RAISE EXCEPTION 'Fee credit application history is immutable' USING ERRCODE='55000';
END $$;
DROP TRIGGER IF EXISTS fee_credit_application_history ON fee_credit_applications;
CREATE TRIGGER fee_credit_application_history BEFORE UPDATE OR DELETE ON fee_credit_applications
  FOR EACH ROW EXECUTE FUNCTION app.guard_fee_credit_history();
DROP TRIGGER IF EXISTS fee_credit_application_reversal_history ON fee_credit_application_reversals;
CREATE TRIGGER fee_credit_application_reversal_history BEFORE UPDATE OR DELETE ON fee_credit_application_reversals
  FOR EACH ROW EXECUTE FUNCTION app.guard_fee_credit_history();
`;

export const ACTIVE_CREDIT_APPLICATION_SQL = `SELECT application.* FROM fee_credit_applications application
  WHERE NOT EXISTS(SELECT 1 FROM fee_credit_application_reversals reversal
    WHERE reversal.tenant_id=application.tenant_id AND reversal.application_id=application.id)`;
