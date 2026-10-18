// Kept separate so the exact production expansion can be rehearsed transactionally.
export const INVOICE_WRITE_SCHEMA_SQL = `
  ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS last_invoice_at timestamptz;
  ALTER TABLE invoices ALTER COLUMN id SET DEFAULT gen_random_uuid();
  ALTER TABLE invoices ALTER COLUMN updated_at SET DEFAULT NOW();

  -- Older Prisma installations keep major-unit fields alongside the billing ledger.
  -- Synchronize writes in the same transaction; never invent academic-period IDs.
  CREATE OR REPLACE FUNCTION sync_legacy_invoice_write()
  RETURNS trigger AS $$
  BEGIN
    NEW.tenant_id := COALESCE(NEW.tenant_id, NEW.school_id);
    NEW.school_id := COALESCE(NEW.school_id, NEW.tenant_id);
    IF NEW.school_id IS DISTINCT FROM NEW.tenant_id THEN
      RAISE EXCEPTION 'Invoice school does not match tenant' USING ERRCODE = '23514';
    END IF;
    NEW.metadata := COALESCE(NEW.metadata, '{}'::jsonb);
    NEW.student_id := COALESCE(NEW.student_id, NULLIF(NEW.metadata->>'student_id', ''));
    IF NEW.student_id IS NOT NULL THEN
      IF NULLIF(NEW.metadata->>'student_id', '') IS NOT NULL
        AND NEW.student_id IS DISTINCT FROM NEW.metadata->>'student_id' THEN
        RAISE EXCEPTION 'Invoice learner references disagree' USING ERRCODE = '23514';
      END IF;
      IF NOT EXISTS (SELECT 1 FROM students WHERE id::text = NEW.student_id AND tenant_id = NEW.tenant_id) THEN
        RAISE EXCEPTION 'Invoice learner must belong to its school' USING ERRCODE = '23514';
      END IF;
      NEW.metadata := NEW.metadata || jsonb_build_object('student_id', NEW.student_id);
    END IF;
    IF NEW.academic_year_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM academic_years WHERE id::text = NEW.academic_year_id AND school_id = NEW.tenant_id
    ) THEN
      RAISE EXCEPTION 'Invoice academic year must belong to its school' USING ERRCODE = '23514';
    END IF;
    IF NEW.term_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM terms WHERE id::text = NEW.term_id AND school_id = NEW.tenant_id
    ) THEN
      RAISE EXCEPTION 'Invoice term must belong to its school' USING ERRCODE = '23514';
    END IF;

    IF TG_OP = 'INSERT' AND NEW.total_amount_minor IS NULL THEN
      NEW.total_amount_minor := round(NEW.amount_due::numeric * 100)::bigint;
      NEW.amount_paid_minor := round(COALESCE(NEW.amount_paid, 0)::numeric * 100)::bigint;
    ELSIF TG_OP = 'UPDATE' THEN
      IF NEW.total_amount_minor IS NOT DISTINCT FROM OLD.total_amount_minor
        AND NEW.amount_due IS DISTINCT FROM OLD.amount_due THEN
        NEW.total_amount_minor := round(NEW.amount_due::numeric * 100)::bigint;
      END IF;
      IF NEW.amount_paid_minor IS NOT DISTINCT FROM OLD.amount_paid_minor
        AND NEW.amount_paid IS DISTINCT FROM OLD.amount_paid THEN
        NEW.amount_paid_minor := round(NEW.amount_paid::numeric * 100)::bigint;
      END IF;
      IF NEW.due_at IS NOT DISTINCT FROM OLD.due_at AND NEW.due_date IS DISTINCT FROM OLD.due_date THEN
        NEW.due_at := NEW.due_date::timestamptz;
      END IF;
    END IF;
    NEW.amount_paid_minor := COALESCE(NEW.amount_paid_minor, 0);
    NEW.subtotal_amount_minor := COALESCE(NEW.subtotal_amount_minor, NEW.total_amount_minor);
    NEW.tax_amount_minor := COALESCE(NEW.tax_amount_minor, 0);
    IF NEW.total_amount_minor < 0 OR NEW.amount_paid_minor < 0 THEN
      RAISE EXCEPTION 'Invoice amounts cannot be negative' USING ERRCODE = '23514';
    END IF;
    NEW.amount_due := NEW.total_amount_minor::numeric / 100;
    NEW.amount_paid := NEW.amount_paid_minor::numeric / 100;
    NEW.balance := GREATEST(NEW.total_amount_minor - NEW.amount_paid_minor, 0)::numeric / 100;
    NEW.due_at := COALESCE(NEW.due_at, NEW.due_date::timestamptz);
    NEW.due_date := (NEW.due_at AT TIME ZONE 'Africa/Nairobi')::date;
    NEW.status := CASE lower(NEW.status)
      WHEN 'issued' THEN 'open' WHEN 'overdue' THEN 'open'
      WHEN 'partially_paid' THEN 'pending_payment'
      WHEN 'cancelled' THEN 'void' WHEN 'canceled' THEN 'void'
      ELSE lower(NEW.status) END;
    RETURN NEW;
  END;
  $$ LANGUAGE plpgsql;

  DO $$
  BEGIN
    IF EXISTS (SELECT 1 FROM pg_attribute WHERE attrelid = 'invoices'::regclass
      AND attname = 'school_id' AND NOT attisdropped) THEN
      ALTER TABLE invoices ALTER COLUMN student_id DROP NOT NULL;
      ALTER TABLE invoices ALTER COLUMN academic_year_id DROP NOT NULL;
      ALTER TABLE invoices ALTER COLUMN term_id DROP NOT NULL;
      CREATE OR REPLACE TRIGGER trg_invoice_legacy_write
        BEFORE INSERT OR UPDATE ON invoices FOR EACH ROW EXECUTE FUNCTION sync_legacy_invoice_write();
    END IF;
  END $$;
`;
