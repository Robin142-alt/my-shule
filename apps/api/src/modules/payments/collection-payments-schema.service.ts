import { Injectable, OnModuleInit } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { PaymentChannelWorkflowSchemaService } from "../tenant-finance/payment-channel-workflow-schema.service";
import { MPESA_ASYNC_STATUS_SCHEMA } from "./mpesa-async-status.service";

export const COLLECTION_PAYMENTS_SCHEMA = `
CREATE TABLE IF NOT EXISTS collection_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id text NOT NULL,
  revision_id uuid, channel_id uuid, provider_code text NOT NULL,
  provider_transaction_id text NOT NULL, destination_account text NOT NULL,
  amount_minor bigint NOT NULL CHECK (amount_minor>0), currency_code text NOT NULL CHECK (currency_code='KES'),
  account_reference text NOT NULL, occurred_at timestamptz NOT NULL,
  source text NOT NULL CHECK (source IN ('provider','statement')),
  status text NOT NULL CHECK (status IN ('pending_review','verified','unmatched','posted','rejected','reversed')),
  student_id text, invoice_id uuid, manual_fee_payment_id uuid, payment_intent_id uuid,
  ledger_transaction_id uuid, receipt_number text,
  requested_by uuid, reviewed_by uuid, reviewed_at timestamptz, review_reason text,
  evidence_reference text, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(provider_code,destination_account,provider_transaction_id), UNIQUE(tenant_id,id),
  FOREIGN KEY(tenant_id,revision_id) REFERENCES tenant_payment_channel_revisions(tenant_id,id),
  FOREIGN KEY(tenant_id,channel_id) REFERENCES tenant_payment_channels(tenant_id,id),
  CHECK (reviewed_by IS NULL OR reviewed_by<>requested_by),
  CHECK (source<>'statement' OR status IN ('pending_review','rejected') OR reviewed_at IS NOT NULL),
  CHECK (status NOT IN ('posted','reversed') OR (student_id IS NOT NULL AND manual_fee_payment_id IS NOT NULL AND ledger_transaction_id IS NOT NULL AND receipt_number IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS ix_collections_review ON collection_payments(tenant_id,status,created_at DESC,id);
ALTER TABLE collection_payments ADD COLUMN IF NOT EXISTS suspense_transaction_id uuid;
ALTER TABLE collection_payments ADD COLUMN IF NOT EXISTS suspense_release_transaction_id uuid;
ALTER TABLE collection_payments ADD COLUMN IF NOT EXISTS asset_account_code text;
ALTER TABLE collection_payments ADD COLUMN IF NOT EXISTS fee_control_account_code text;
CREATE UNIQUE INDEX IF NOT EXISTS ux_collection_mpesa_receipt ON collection_payments(provider_transaction_id) WHERE provider_code='safaricom';
CREATE INDEX IF NOT EXISTS ix_collections_student ON collection_payments(tenant_id,student_id,occurred_at DESC);
CREATE TABLE IF NOT EXISTS collection_reversal_requests (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id text NOT NULL,payment_id uuid NOT NULL,
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')),
 reason text NOT NULL,requested_by uuid NOT NULL,reviewed_by uuid,decision_reason text,
 created_at timestamptz NOT NULL DEFAULT now(),reviewed_at timestamptz,
 FOREIGN KEY(tenant_id,payment_id) REFERENCES collection_payments(tenant_id,id),
 CHECK(reviewed_by IS NULL OR reviewed_by<>requested_by)
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_collection_pending_reversal ON collection_reversal_requests(tenant_id,payment_id) WHERE status='pending';
ALTER TABLE collection_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection_payments FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS collection_school ON collection_payments;
CREATE POLICY collection_school ON collection_payments FOR ALL USING(tenant_id=current_setting('app.tenant_id',true)) WITH CHECK(tenant_id=current_setting('app.tenant_id',true));
ALTER TABLE collection_reversal_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection_reversal_requests FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS collection_reversal_school ON collection_reversal_requests;
CREATE POLICY collection_reversal_school ON collection_reversal_requests FOR ALL USING(tenant_id=current_setting('app.tenant_id',true)) WITH CHECK(tenant_id=current_setting('app.tenant_id',true));
CREATE OR REPLACE FUNCTION app.guard_collection_payment_history() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Payment history cannot be deleted'; END IF;
 IF ROW(NEW.tenant_id,NEW.revision_id,NEW.channel_id,NEW.provider_code,NEW.provider_transaction_id,
   NEW.destination_account,NEW.amount_minor,NEW.currency_code,NEW.account_reference,NEW.occurred_at,NEW.source,NEW.created_at,NEW.requested_by,NEW.evidence_reference,NEW.asset_account_code,NEW.fee_control_account_code)
 IS DISTINCT FROM ROW(OLD.tenant_id,OLD.revision_id,OLD.channel_id,OLD.provider_code,OLD.provider_transaction_id,
   OLD.destination_account,OLD.amount_minor,OLD.currency_code,OLD.account_reference,OLD.occurred_at,OLD.source,OLD.created_at,OLD.requested_by,OLD.evidence_reference,OLD.asset_account_code,OLD.fee_control_account_code)
 THEN RAISE EXCEPTION 'Financial history is immutable'; END IF;
 IF OLD.status IN ('posted','reversed') AND ROW(NEW.student_id,NEW.invoice_id,NEW.manual_fee_payment_id,NEW.payment_intent_id,NEW.ledger_transaction_id,NEW.receipt_number)
 IS DISTINCT FROM ROW(OLD.student_id,OLD.invoice_id,OLD.manual_fee_payment_id,OLD.payment_intent_id,OLD.ledger_transaction_id,OLD.receipt_number)
 THEN RAISE EXCEPTION 'Posted payment allocation is immutable'; END IF;
 IF OLD.status='reversed' AND NEW.status<>'reversed' THEN RAISE EXCEPTION 'Reversal is final'; END IF;
 IF NEW.status<>OLD.status AND NOT (
   (OLD.status='pending_review' AND NEW.status IN ('verified','rejected')) OR
   (OLD.status='verified' AND NEW.status IN ('unmatched','posted')) OR
   (OLD.status='unmatched' AND NEW.status='posted') OR
   (OLD.status='posted' AND NEW.status='reversed')) THEN RAISE EXCEPTION 'Invalid collection state transition'; END IF;
 IF OLD.suspense_transaction_id IS NOT NULL AND NEW.suspense_transaction_id IS DISTINCT FROM OLD.suspense_transaction_id
   THEN RAISE EXCEPTION 'Suspense receipt history is immutable'; END IF;
 IF OLD.suspense_release_transaction_id IS NOT NULL AND NEW.suspense_release_transaction_id IS DISTINCT FROM OLD.suspense_release_transaction_id
   THEN RAISE EXCEPTION 'Suspense release history is immutable'; END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS collection_payment_history ON collection_payments;
CREATE TRIGGER collection_payment_history BEFORE UPDATE OR DELETE ON collection_payments FOR EACH ROW EXECUTE FUNCTION app.guard_collection_payment_history();
CREATE OR REPLACE FUNCTION app.guard_collection_reversal_history() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Reversal history cannot be deleted'; END IF;
 IF ROW(NEW.tenant_id,NEW.payment_id,NEW.requested_by,NEW.reason,NEW.created_at)
   IS DISTINCT FROM ROW(OLD.tenant_id,OLD.payment_id,OLD.requested_by,OLD.reason,OLD.created_at)
   THEN RAISE EXCEPTION 'Reversal request is immutable'; END IF;
 IF OLD.status<>'pending' AND NEW IS DISTINCT FROM OLD THEN RAISE EXCEPTION 'Reversal decision is immutable'; END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS collection_reversal_history ON collection_reversal_requests;
CREATE TRIGGER collection_reversal_history BEFORE UPDATE OR DELETE ON collection_reversal_requests FOR EACH ROW EXECUTE FUNCTION app.guard_collection_reversal_history();
`;

@Injectable()
export class CollectionPaymentsSchemaService implements OnModuleInit {
  constructor(
    private readonly db: PrismaService,
    private readonly channels: PaymentChannelWorkflowSchemaService,
  ) {}
  async onModuleInit() {
    await this.channels.onModuleInit();
    await this.db.runSchemaBootstrap(
      COLLECTION_PAYMENTS_SCHEMA + MPESA_ASYNC_STATUS_SCHEMA,
    );
  }
}
