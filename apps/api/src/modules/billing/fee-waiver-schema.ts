/** Expand the invoice contract for fully approved waivers. Creation still requires a positive charge. */
export const FEE_WAIVER_INVOICE_SCHEMA_SQL = `
  DO $$
  BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'invoices'::regclass AND conname = 'ck_invoices_total_non_negative') THEN
      ALTER TABLE invoices ADD CONSTRAINT ck_invoices_total_non_negative CHECK (total_amount_minor >= 0);
    END IF;
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'invoices'::regclass AND conname = 'ck_invoices_total_positive') THEN
      ALTER TABLE invoices DROP CONSTRAINT ck_invoices_total_positive;
    END IF;
  END $$;
`;
