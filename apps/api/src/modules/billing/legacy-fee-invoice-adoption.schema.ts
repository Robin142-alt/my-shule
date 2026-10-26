export const LEGACY_FEE_INVOICE_ADOPTION_SCHEMA = `
CREATE TABLE IF NOT EXISTS legacy_fee_invoice_adoptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id text NOT NULL,
  legacy_id text NOT NULL, invoice_id text NOT NULL, source_fingerprint text NOT NULL,
  source_snapshot jsonb NOT NULL, reason text NOT NULL, created_by text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id,legacy_id),UNIQUE(tenant_id,invoice_id)
);
ALTER TABLE legacy_fee_invoice_adoptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE legacy_fee_invoice_adoptions FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS invoice_adoption_school ON legacy_fee_invoice_adoptions;
CREATE POLICY invoice_adoption_school ON legacy_fee_invoice_adoptions FOR ALL
  USING(tenant_id=current_setting('app.tenant_id',true)) WITH CHECK(tenant_id=current_setting('app.tenant_id',true));
CREATE OR REPLACE FUNCTION app.guard_invoice_adoption_history() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP='DELETE' AND current_setting('app.allow_tenant_deletion',true)='true' THEN RETURN OLD; END IF;
  RAISE EXCEPTION 'Invoice adoption history is immutable' USING ERRCODE='55000';
END $$;
DROP TRIGGER IF EXISTS invoice_adoption_history ON legacy_fee_invoice_adoptions;
CREATE TRIGGER invoice_adoption_history BEFORE UPDATE OR DELETE ON legacy_fee_invoice_adoptions
  FOR EACH ROW EXECUTE FUNCTION app.guard_invoice_adoption_history();
CREATE OR REPLACE FUNCTION app.guard_adopted_legacy_invoice() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP='DELETE' AND current_setting('app.allow_tenant_deletion',true)='true' THEN RETURN OLD; END IF;
  IF EXISTS(SELECT 1 FROM legacy_fee_invoice_adoptions WHERE tenant_id=OLD.tenant_id::text AND legacy_id=OLD.id::text) THEN
    RAISE EXCEPTION 'This invoice was adopted; use the canonical billing workflow' USING ERRCODE='55000';
  END IF;
  IF TG_OP='DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END $$;
DO $$ BEGIN
  IF to_regclass('student_invoices') IS NOT NULL THEN
    CREATE INDEX IF NOT EXISTS ix_legacy_invoice_school_number ON student_invoices(tenant_id,invoice_number);
    DROP TRIGGER IF EXISTS adopted_legacy_invoice_history ON student_invoices;
    CREATE TRIGGER adopted_legacy_invoice_history BEFORE UPDATE OR DELETE ON student_invoices
      FOR EACH ROW EXECUTE FUNCTION app.guard_adopted_legacy_invoice();
  END IF;
END $$;
`;

/** Operator-only rollback of an unused schema expansion. Never discards adopted history. */
export const LEGACY_FEE_INVOICE_ADOPTION_DOWN_SQL = `
DO $$ BEGIN
  PERFORM set_config('row_security','off',true);
  IF EXISTS(SELECT 1 FROM legacy_fee_invoice_adoptions) THEN
    RAISE EXCEPTION 'Adopted invoices exist; preserve lineage and use a forward correction' USING ERRCODE='55000';
  END IF;
  IF to_regclass('student_invoices') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS adopted_legacy_invoice_history ON student_invoices;
  END IF;
  DROP TABLE legacy_fee_invoice_adoptions;
  DROP FUNCTION app.guard_invoice_adoption_history();
  DROP FUNCTION app.guard_adopted_legacy_invoice();
END $$;
`;
