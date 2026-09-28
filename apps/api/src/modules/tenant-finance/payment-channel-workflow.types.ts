import type {
  CollectionChannelKind,
  CollectionConnectionMode,
  CollectionProviderCode,
} from "./payment-provider.catalog";

export type PaymentChannelRevisionStatus =
  | "pending_approval"
  | "approved"
  | "rejected"
  | "connecting"
  | "ready"
  | "active"
  | "superseded"
  | "suspended";
export interface PaymentChannelRevision {
  id: string;
  tenant_id: string;
  channel_id: string | null;
  replaces_revision_id: string | null;
  provider_code: CollectionProviderCode;
  channel_kind: CollectionChannelKind;
  display_name: string;
  account_name: string;
  account_number: string;
  paybill_number: string | null;
  bank_name: string | null;
  status: PaymentChannelRevisionStatus;
  connection_mode: CollectionConnectionMode | null;
  environment: "sandbox" | "production" | null;
  credentials_ciphertext: string | null;
  credential_version: number;
  requested_by: string;
  reviewed_by: string | null;
  reason: string;
  decision_reason: string | null;
  created_at: Date;
  reviewed_at: Date | null;
  activated_at: Date | null;
  last_test_status: string | null;
  last_tested_at: Date | null;
  last_error: string | null;
  school_name?: string;
}
export type PaymentChannelRevisionView = Omit<
  PaymentChannelRevision,
  "credentials_ciphertext"
> & { credentials_configured: boolean };
