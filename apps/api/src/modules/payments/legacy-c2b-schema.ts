/** Preserve historical values while restoring the C2B/vault write contracts. */
export const LEGACY_C2B_SCHEMA = `
DO $$
DECLARE field record; invalid_value boolean;
BEGIN
 IF EXISTS(SELECT 1 FROM mpesa_c2b_payments WHERE amount_minor::numeric<1 OR amount_minor::numeric>9223372036854775807
   OR amount_minor::numeric<>trunc(amount_minor::numeric)) THEN RAISE EXCEPTION 'Reconcile invalid C2B minor units before migration'; END IF;
 ALTER TABLE mpesa_c2b_payments ALTER COLUMN amount_minor TYPE bigint USING amount_minor::bigint,
   ALTER COLUMN trans_id TYPE text USING trans_id::text,ALTER COLUMN third_party_trans_id TYPE text USING third_party_trans_id::text,
   ALTER COLUMN org_account_balance TYPE text USING org_account_balance::text,
   ALTER COLUMN mpesa_config_id DROP NOT NULL,ALTER COLUMN payment_channel_id DROP NOT NULL,
   ALTER COLUMN bill_ref_number DROP NOT NULL,ALTER COLUMN invoice_number DROP NOT NULL,ALTER COLUMN phone_number DROP NOT NULL,
   ALTER COLUMN payer_name DROP NOT NULL,ALTER COLUMN org_account_balance DROP NOT NULL,ALTER COLUMN third_party_trans_id DROP NOT NULL,
   ALTER COLUMN raw_payload_encrypted_ref DROP NOT NULL,ALTER COLUMN payload_sha256 DROP NOT NULL,
   ALTER COLUMN updated_at SET DEFAULT now(),ALTER COLUMN metadata SET DEFAULT '{}'::jsonb,ALTER COLUMN raw_payload SET DEFAULT '{}'::jsonb;
 FOR field IN SELECT * FROM (VALUES ('mpesa_c2b_payments','raw_payload_encrypted_ref'),('mpesa_c2b_payments','payload_sha256'),
   ('mpesa_payload_vault','raw_payload_encrypted_ref'),('mpesa_payload_vault','payload_sha256'),('mpesa_payload_vault','encrypted_payload')) AS fields(table_name,column_name)
 LOOP
   IF EXISTS(SELECT 1 FROM information_schema.columns c WHERE c.table_schema=current_schema() AND c.table_name=field.table_name
     AND c.column_name=field.column_name AND c.data_type='jsonb') THEN
     EXECUTE format('SELECT EXISTS(SELECT 1 FROM %I WHERE %I IS NOT NULL AND jsonb_typeof(%I) NOT IN (''string'',''null''))',
       field.table_name,field.column_name,field.column_name) INTO invalid_value;
     IF invalid_value THEN RAISE EXCEPTION 'Reconcile invalid scalar evidence in %.%',field.table_name,field.column_name; END IF;
     EXECUTE format('ALTER TABLE %I ALTER COLUMN %I TYPE text USING %I #>> ''{}''',field.table_name,field.column_name,field.column_name);
   END IF;
 END LOOP;
 ALTER TABLE mpesa_payload_vault ALTER COLUMN source_id TYPE text USING source_id::text;
 IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema=current_schema() AND table_name='mpesa_payload_vault' AND column_name='updated_at') THEN
   ALTER TABLE mpesa_payload_vault ALTER COLUMN updated_at SET DEFAULT now();
 END IF;
END $$;
CREATE UNIQUE INDEX IF NOT EXISTS ux_c2b_tenant_transaction ON mpesa_c2b_payments(tenant_id,trans_id);
CREATE UNIQUE INDEX IF NOT EXISTS ux_payload_vault_tenant_reference ON mpesa_payload_vault(tenant_id,raw_payload_encrypted_ref);
`;
