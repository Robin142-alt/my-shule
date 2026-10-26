export const BANK_SYNCHRONIZATION_SCHEMA = `
CREATE TABLE IF NOT EXISTS bank_connection_sync (
  tenant_id text NOT NULL, revision_id uuid NOT NULL, scan_date date NOT NULL,
  earliest_at timestamptz NOT NULL, next_attempt_at timestamptz NOT NULL DEFAULT now(),
  lease_token uuid, attempts integer NOT NULL DEFAULT 0, last_success_at timestamptz,
  last_error text, last_entry_count integer, created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(tenant_id,revision_id),
  FOREIGN KEY(tenant_id,revision_id) REFERENCES tenant_payment_channel_revisions(tenant_id,id)
);
CREATE INDEX IF NOT EXISTS ix_bank_sync_due ON bank_connection_sync(tenant_id,next_attempt_at);
ALTER TABLE bank_connection_sync ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_connection_sync FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS bank_sync_school ON bank_connection_sync;
CREATE POLICY bank_sync_school ON bank_connection_sync FOR ALL
 USING(tenant_id=current_setting('app.tenant_id',true))
 WITH CHECK(tenant_id=current_setting('app.tenant_id',true));
`;
