/** Keep Prisma text identifiers/amounts compatible while enforcing exact money
 * and replacing references to the retired school registry without losing rows. */
export const LEGACY_FINANCE_SCHEMA = `
DO $$
DECLARE table_name text; constraint_row record;
BEGIN
 FOREACH table_name IN ARRAY ARRAY['accounts','idempotency_keys','transactions','ledger_entries'] LOOP
   EXECUTE format('ALTER TABLE %I ALTER COLUMN updated_at SET DEFAULT now()',table_name);
   IF to_regclass('tenants') IS NOT NULL AND EXISTS(SELECT 1 FROM pg_constraint c
     WHERE c.conrelid=to_regclass(table_name) AND c.contype='f' AND c.confrelid=to_regclass('schools')) THEN
     IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid=to_regclass(table_name) AND conname='fk_'||table_name||'_active_tenant') THEN
       EXECUTE format('ALTER TABLE %I ADD CONSTRAINT %I FOREIGN KEY(tenant_id) REFERENCES tenants(tenant_id) NOT VALID',table_name,'fk_'||table_name||'_active_tenant');
     END IF;
     EXECUTE format('ALTER TABLE %I VALIDATE CONSTRAINT %I',table_name,'fk_'||table_name||'_active_tenant');
     FOR constraint_row IN SELECT conname FROM pg_constraint WHERE conrelid=to_regclass(table_name) AND contype='f' AND confrelid=to_regclass('schools') LOOP
       EXECUTE format('ALTER TABLE %I DROP CONSTRAINT %I',table_name,constraint_row.conname);
     END LOOP;
   END IF;
 END LOOP;
 IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='transactions'::regclass AND conname='ck_transaction_exact_minor') THEN
   ALTER TABLE transactions ADD CONSTRAINT ck_transaction_exact_minor CHECK(total_amount_minor::numeric BETWEEN 1 AND 9223372036854775807
     AND total_amount_minor::numeric=trunc(total_amount_minor::numeric));
 END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='ledger_entries'::regclass AND conname='ck_ledger_exact_minor') THEN
   ALTER TABLE ledger_entries ADD CONSTRAINT ck_ledger_exact_minor CHECK(amount_minor::numeric BETWEEN 1 AND 9223372036854775807
     AND amount_minor::numeric=trunc(amount_minor::numeric));
 END IF;
END $$;
`;
