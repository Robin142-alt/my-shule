/** Invalid JSON or fractional/out-of-range minor units abort the migration. */
export const LEGACY_RECONCILIATION_SCHEMA = `
DO $$
DECLARE item record;
BEGIN
 FOR item IN SELECT * FROM (VALUES ('finance_approval_requests','evidence'),('mpesa_reconciliation_discrepancies','evidence'),
   ('mpesa_reconciliation_batches','summary')) AS fields(table_name,column_name)
 LOOP
   IF EXISTS(SELECT 1 FROM information_schema.columns c WHERE c.table_schema=current_schema() AND c.table_name=item.table_name
     AND c.column_name=item.column_name AND c.data_type<>'jsonb') THEN
     EXECUTE format('ALTER TABLE %I ALTER COLUMN %I DROP DEFAULT',item.table_name,item.column_name);
     EXECUTE format('ALTER TABLE %I ALTER COLUMN %I TYPE jsonb USING COALESCE(NULLIF(btrim(%I::text),''''),''{}'')::jsonb',item.table_name,item.column_name,item.column_name);
   END IF;
   EXECUTE format('ALTER TABLE %I ALTER COLUMN %I SET DEFAULT ''{}''::jsonb',item.table_name,item.column_name);
 END LOOP;
 IF EXISTS(SELECT 1 FROM finance_approval_requests WHERE amount_minor::numeric<>trunc(amount_minor::numeric)
   OR amount_minor::numeric<1 OR amount_minor::numeric>9223372036854775807) THEN
   RAISE EXCEPTION 'Reconcile invalid correction amounts before migration';
 END IF;
 IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema=current_schema() AND table_name='finance_approval_requests'
   AND column_name='amount_minor' AND data_type<>'bigint') THEN
   ALTER TABLE finance_approval_requests ALTER COLUMN amount_minor TYPE bigint USING amount_minor::bigint;
 END IF;
 ALTER TABLE finance_approval_requests ALTER COLUMN reconciliation_batch_id DROP NOT NULL,
   ALTER COLUMN reconciliation_discrepancy_id DROP NOT NULL,ALTER COLUMN amount_minor DROP NOT NULL,ALTER COLUMN updated_at SET DEFAULT now();
 ALTER TABLE mpesa_reconciliation_discrepancies ALTER COLUMN provider_transaction_id TYPE text USING provider_transaction_id::text,
   ALTER COLUMN approving_user_id DROP NOT NULL,ALTER COLUMN fee_invoice_id DROP NOT NULL,ALTER COLUMN ledger_transaction_id DROP NOT NULL,
   ALTER COLUMN mpesa_transaction_id DROP NOT NULL,ALTER COLUMN payment_intent_id DROP NOT NULL,ALTER COLUMN provider_transaction_id DROP NOT NULL,
   ALTER COLUMN updated_at SET DEFAULT now();
 ALTER TABLE mpesa_reconciliation_batches ALTER COLUMN payment_channel_id DROP NOT NULL,ALTER COLUMN generated_by_user_id DROP NOT NULL,
   ALTER COLUMN generated_at SET DEFAULT now(),ALTER COLUMN updated_at SET DEFAULT now(),ALTER COLUMN discrepancy_count SET DEFAULT 0,
   ALTER COLUMN report_date TYPE date USING report_date::date;
END $$;
`;
