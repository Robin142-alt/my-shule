export const PAYMENT_INGRESS_SCHEMA = `
CREATE TABLE IF NOT EXISTS payment_ingress (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id text NOT NULL, revision_id uuid NOT NULL,
 provider_code text NOT NULL, environment text NOT NULL CHECK(environment IN ('sandbox','production')),
 provider_transaction_id text NOT NULL, destination_account text NOT NULL, amount_minor bigint NOT NULL CHECK(amount_minor>0),
 currency_code text NOT NULL CHECK(currency_code='KES'), account_reference text NOT NULL, occurred_at timestamptz NOT NULL,
 state text NOT NULL DEFAULT 'received' CHECK(state IN ('received','verifying','verified','posted','unmatched','review','sandbox_verified')),
 payload_hash text NOT NULL, conflict_hash text, review_reason text,
 attempts integer NOT NULL DEFAULT 0, next_attempt_at timestamptz NOT NULL DEFAULT now(),
 collection_id uuid, student_id text, invoice_id uuid, verified_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(tenant_id,id), UNIQUE(tenant_id,environment,provider_code,destination_account,provider_transaction_id),
 FOREIGN KEY(tenant_id,revision_id) REFERENCES tenant_payment_channel_revisions(tenant_id,id),
 FOREIGN KEY(tenant_id,collection_id) REFERENCES collection_payments(tenant_id,id),
 CHECK(environment='production' OR collection_id IS NULL)
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_ingress_production_transaction
 ON payment_ingress(provider_code,destination_account,provider_transaction_id) WHERE environment='production';
CREATE INDEX IF NOT EXISTS ix_ingress_due ON payment_ingress(tenant_id,next_attempt_at) WHERE state IN ('received','verifying','verified');
CREATE TABLE IF NOT EXISTS payment_ingress_verifications (
 id uuid PRIMARY KEY, tenant_id text NOT NULL, ingress_id uuid NOT NULL, token_hash text NOT NULL,
 conversation_id text, evidence jsonb, state text NOT NULL DEFAULT 'pending'
 CHECK(state IN ('pending','received','failed','timeout','complete')),
 expires_at timestamptz NOT NULL DEFAULT now()+INTERVAL '1 hour', created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(tenant_id,ingress_id) REFERENCES payment_ingress(tenant_id,id)
);
CREATE INDEX IF NOT EXISTS ix_ingress_verification ON payment_ingress_verifications(tenant_id,ingress_id,created_at DESC);
ALTER TABLE payment_ingress ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_ingress FORCE ROW LEVEL SECURITY;
ALTER TABLE payment_ingress_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_ingress_verifications FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ingress_school ON payment_ingress;
CREATE POLICY ingress_school ON payment_ingress FOR ALL USING(tenant_id=current_setting('app.tenant_id',true)) WITH CHECK(tenant_id=current_setting('app.tenant_id',true));
DROP POLICY IF EXISTS ingress_verification_school ON payment_ingress_verifications;
CREATE POLICY ingress_verification_school ON payment_ingress_verifications FOR ALL USING(tenant_id=current_setting('app.tenant_id',true)) WITH CHECK(tenant_id=current_setting('app.tenant_id',true));
CREATE OR REPLACE FUNCTION app.guard_payment_ingress() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Payment evidence cannot be deleted'; END IF;
 IF ROW(NEW.tenant_id,NEW.revision_id,NEW.provider_code,NEW.environment,NEW.provider_transaction_id,NEW.destination_account,
 NEW.amount_minor,NEW.currency_code,NEW.account_reference,NEW.occurred_at,NEW.payload_hash,NEW.created_at)
 IS DISTINCT FROM ROW(OLD.tenant_id,OLD.revision_id,OLD.provider_code,OLD.environment,OLD.provider_transaction_id,OLD.destination_account,
 OLD.amount_minor,OLD.currency_code,OLD.account_reference,OLD.occurred_at,OLD.payload_hash,OLD.created_at)
 THEN RAISE EXCEPTION 'Payment evidence identity is immutable'; END IF;
 IF OLD.collection_id IS NOT NULL AND NEW.collection_id IS DISTINCT FROM OLD.collection_id
 THEN RAISE EXCEPTION 'Posted collection link is immutable'; END IF;
 IF OLD.state IN ('posted','unmatched','sandbox_verified') AND
    ROW(NEW.state,NEW.student_id,NEW.invoice_id,NEW.verified_at) IS DISTINCT FROM ROW(OLD.state,OLD.student_id,OLD.invoice_id,OLD.verified_at)
 THEN RAISE EXCEPTION 'Verified ingress history is immutable'; END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS payment_ingress_history ON payment_ingress;
CREATE TRIGGER payment_ingress_history BEFORE UPDATE OR DELETE ON payment_ingress FOR EACH ROW EXECUTE FUNCTION app.guard_payment_ingress();
`;
