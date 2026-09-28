import { Injectable, OnModuleInit } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { TenantFinanceSchemaService } from "./tenant-finance-schema.service";

export const PAYMENT_CHANNEL_WORKFLOW_SCHEMA = `
  CREATE TABLE IF NOT EXISTS tenant_payment_channel_revisions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id text NOT NULL,
    channel_id uuid, replaces_revision_id uuid,
    provider_code text NOT NULL CHECK (provider_code IN ('safaricom','equity','kcb','coop','other_bank')),
    channel_kind text NOT NULL CHECK (channel_kind IN ('mpesa_paybill','bank_paybill','bank_account')),
    display_name text NOT NULL, account_name text NOT NULL, account_number text NOT NULL, bank_name text, paybill_number text,
    status text NOT NULL DEFAULT 'pending_approval' CHECK (status IN
      ('pending_approval','approved','rejected','connecting','ready','active','superseded','suspended')),
    connection_mode text CHECK (connection_mode IN ('daraja','statement')),
    environment text CHECK (environment IN ('sandbox','production')),
    credentials_ciphertext text, credential_version integer NOT NULL DEFAULT 0,
    requested_by uuid NOT NULL, reviewed_by uuid, reason text NOT NULL, decision_reason text,
    created_at timestamptz NOT NULL DEFAULT NOW(), reviewed_at timestamptz, activated_at timestamptz,
    last_test_status text, last_tested_at timestamptz, last_error text,
    UNIQUE (tenant_id,id),
    FOREIGN KEY (tenant_id,channel_id) REFERENCES tenant_payment_channels(tenant_id,id) ON DELETE RESTRICT,
    FOREIGN KEY (tenant_id,replaces_revision_id) REFERENCES tenant_payment_channel_revisions(tenant_id,id) ON DELETE RESTRICT,
    CHECK (channel_kind <> 'bank_paybill' OR (paybill_number IS NOT NULL AND paybill_number ~ '^[0-9]{5,10}$')),
    CHECK (reviewed_by IS NULL OR reviewed_by <> requested_by),
    CHECK (status IN ('pending_approval','rejected') OR (reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL)),
    CHECK (credentials_ciphertext IS NULL OR credentials_ciphertext LIKE 'enc:v1:%')
  );
  CREATE INDEX IF NOT EXISTS ix_collection_revision_school_state
    ON tenant_payment_channel_revisions(tenant_id,status,created_at DESC);
  CREATE INDEX IF NOT EXISTS ix_collection_revision_connection_queue
    ON tenant_payment_channel_revisions(status,created_at DESC);
  CREATE UNIQUE INDEX IF NOT EXISTS ux_collection_active_destination
    ON tenant_payment_channel_revisions(provider_code,channel_kind,account_number)
    WHERE status = 'active';
  CREATE UNIQUE INDEX IF NOT EXISTS ux_collection_pending_replacement
    ON tenant_payment_channel_revisions(tenant_id,replaces_revision_id)
    WHERE replaces_revision_id IS NOT NULL AND status IN ('pending_approval','approved','connecting','ready');
  ALTER TABLE tenant_payment_channel_revisions ENABLE ROW LEVEL SECURITY;
  ALTER TABLE tenant_payment_channel_revisions FORCE ROW LEVEL SECURITY;
  DROP POLICY IF EXISTS collection_revision_school ON tenant_payment_channel_revisions;
  CREATE POLICY collection_revision_school ON tenant_payment_channel_revisions FOR ALL
    USING (tenant_id = current_setting('app.tenant_id',true))
    WITH CHECK (tenant_id = current_setting('app.tenant_id',true));
  DROP POLICY IF EXISTS collection_revision_platform_read ON tenant_payment_channel_revisions;
  CREATE POLICY collection_revision_platform_read ON tenant_payment_channel_revisions FOR SELECT
    USING (current_setting('app.role',true) = 'platform_owner' AND current_setting('app.is_authenticated',true) = 'true');

  CREATE OR REPLACE FUNCTION app.guard_collection_revision_history() RETURNS trigger
  LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
  BEGIN
    IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'Payment configuration history cannot be deleted'; END IF;
    IF ROW(NEW.tenant_id,NEW.provider_code,NEW.channel_kind,NEW.display_name,NEW.account_name,
      NEW.account_number,NEW.bank_name,NEW.paybill_number,NEW.requested_by,NEW.reason,NEW.replaces_revision_id,NEW.created_at)
      IS DISTINCT FROM ROW(OLD.tenant_id,OLD.provider_code,OLD.channel_kind,OLD.display_name,OLD.account_name,
      OLD.account_number,OLD.bank_name,OLD.paybill_number,OLD.requested_by,OLD.reason,OLD.replaces_revision_id,OLD.created_at)
      THEN RAISE EXCEPTION 'Create a new revision to change school payment details'; END IF;
    IF OLD.reviewed_at IS NOT NULL AND ROW(NEW.reviewed_by,NEW.reviewed_at,NEW.decision_reason)
      IS DISTINCT FROM ROW(OLD.reviewed_by,OLD.reviewed_at,OLD.decision_reason)
      THEN RAISE EXCEPTION 'Payment configuration decision is immutable'; END IF;
    IF OLD.activated_at IS NOT NULL AND ROW(NEW.credentials_ciphertext,NEW.connection_mode,NEW.environment,NEW.channel_id,NEW.activated_at,NEW.credential_version)
      IS DISTINCT FROM ROW(OLD.credentials_ciphertext,OLD.connection_mode,OLD.environment,OLD.channel_id,OLD.activated_at,OLD.credential_version)
      THEN RAISE EXCEPTION 'Activated payment connection is immutable'; END IF;
    RETURN NEW;
  END $$;
  DROP TRIGGER IF EXISTS collection_revision_history ON tenant_payment_channel_revisions;
  CREATE TRIGGER collection_revision_history BEFORE UPDATE OR DELETE ON tenant_payment_channel_revisions
    FOR EACH ROW EXECUTE FUNCTION app.guard_collection_revision_history();
`;

@Injectable()
export class PaymentChannelWorkflowSchemaService implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly financeSchema: TenantFinanceSchemaService,
  ) {}
  async onModuleInit(): Promise<void> {
    await this.financeSchema.onModuleInit();
    await this.prisma.runSchemaBootstrap(PAYMENT_CHANNEL_WORKFLOW_SCHEMA);
  }
}
