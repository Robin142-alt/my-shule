/** Align historical Prisma receipt tables with the shared accounting contract.
 * Invalid amounts or duplicate identities fail closed; no balances are clamped. */
export const LEGACY_RECEIPT_SCHEMA = `
DO $$
DECLARE item record; receipt_table text; invalid_money boolean;
BEGIN
 FOR item IN SELECT * FROM (VALUES ('manual_fee_payments','amount_minor',1),
   ('manual_fee_payment_allocations','amount_minor',1),('student_fee_payment_allocations','amount_minor',1),
   ('student_fee_credits','amount_minor',1),('student_fee_credits','remaining_amount_minor',0)) AS fields(table_name,column_name,minimum)
 LOOP
   EXECUTE format('SELECT EXISTS(SELECT 1 FROM %I WHERE %I::numeric<%s OR %I::numeric>9223372036854775807 OR %I::numeric<>trunc(%I::numeric))',
     item.table_name,item.column_name,item.minimum,item.column_name,item.column_name,item.column_name) INTO invalid_money;
   IF invalid_money THEN RAISE EXCEPTION 'Reconcile invalid minor units in %.% before migration',item.table_name,item.column_name; END IF;
   IF EXISTS(SELECT 1 FROM information_schema.columns c WHERE c.table_schema=current_schema() AND c.table_name=item.table_name
     AND c.column_name=item.column_name AND c.data_type<>'bigint') THEN
     EXECUTE format('ALTER TABLE %I ALTER COLUMN %I TYPE bigint USING %I::bigint',item.table_name,item.column_name,item.column_name);
   END IF;
 END LOOP;
 FOREACH receipt_table IN ARRAY ARRAY['manual_fee_payments','manual_fee_payment_allocations','student_fee_payment_allocations','student_fee_credits'] LOOP
   IF EXISTS(SELECT 1 FROM information_schema.columns c WHERE c.table_schema=current_schema() AND c.table_name=receipt_table AND c.column_name='updated_at') THEN
     EXECUTE format('ALTER TABLE %I ALTER COLUMN updated_at SET DEFAULT now()',receipt_table);
   END IF;
   EXECUTE format('ALTER TABLE %I ALTER COLUMN metadata SET DEFAULT ''{}''::jsonb',receipt_table);
 END LOOP;
 ALTER TABLE manual_fee_payment_allocations ALTER COLUMN invoice_id DROP NOT NULL,ALTER COLUMN student_id DROP NOT NULL;
 ALTER TABLE student_fee_payment_allocations ALTER COLUMN parent_user_id DROP NOT NULL,ALTER COLUMN ledger_transaction_id DROP NOT NULL;
 ALTER TABLE student_fee_credits ALTER COLUMN parent_user_id DROP NOT NULL,ALTER COLUMN ledger_transaction_id DROP NOT NULL;
END $$;
CREATE UNIQUE INDEX IF NOT EXISTS ux_manual_receipt_idempotency ON manual_fee_payments(tenant_id,idempotency_key);
CREATE UNIQUE INDEX IF NOT EXISTS ux_manual_receipt_number ON manual_fee_payments(tenant_id,receipt_number);
CREATE UNIQUE INDEX IF NOT EXISTS ux_online_allocation_idempotency ON student_fee_payment_allocations(tenant_id,idempotency_key,invoice_id);
CREATE UNIQUE INDEX IF NOT EXISTS ux_online_credit_idempotency ON student_fee_credits(tenant_id,idempotency_key);
`;
