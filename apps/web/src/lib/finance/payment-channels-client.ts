import { requestDashboardApi } from "@/lib/dashboard/api-client";

export interface CollectionProvider {
  code: string;
  name: string;
  description: string;
  channel_kinds: string[];
  connection_modes: string[];
  credential_fields: Array<{
    key: string;
    label: string;
    required: boolean;
    secret: boolean;
    description?: string;
  }>;
}
export interface CollectionChannelRevision {
  id: string;
  tenant_id: string;
  channel_id: string | null;
  provider_code: string;
  channel_kind: string;
  display_name: string;
  account_name: string;
  account_number: string;
  bank_name: string | null;
  status: string;
  connection_mode: string | null;
  environment?: string | null;
  paybill_number?: string | null;
  reason: string;
  decision_reason: string | null;
  requested_by: string;
  reviewed_by: string | null;
  created_at: string;
  reviewed_at: string | null;
  activated_at: string | null;
  last_test_status: string | null;
  last_tested_at: string | null;
  last_error: string | null;
  credentials_configured: boolean;
  school_name?: string;
  replaces_revision_id?: string | null;
}
export const requestCollectionChannel = (
  tenantId: string,
  body: Record<string, unknown>,
) =>
  requestDashboardApi<CollectionChannelRevision>(
    "/tenant-finance/collection-channels",
    { tenantId, method: "POST", body },
  );
export const decideCollectionChannel = (
  tenantId: string,
  id: string,
  decision: string,
  reason: string,
) =>
  requestDashboardApi<CollectionChannelRevision>(
    `/tenant-finance/collection-channels/${id}/decision`,
    { tenantId, method: "POST", body: { decision, reason } },
  );
export interface PaymentSetupSummary {
  total: number;
  pending_approval: number;
  awaiting_connection: number;
  ready: number;
  active: number;
  sandbox: number;
  attention: number;
}
export const getPaymentIntegrationSummary = () =>
  requestDashboardApi<PaymentSetupSummary>("/platform/payment-integrations/summary?audience=superadmin");

export const listPaymentIntegrations = (offset = 0, status = "all", search = "") =>
  requestDashboardApi<CollectionChannelRevision[]>(
    `/platform/payment-integrations?audience=superadmin&limit=50&offset=${offset}&status=${encodeURIComponent(status)}&search=${encodeURIComponent(search)}`,
  );
export const listIntegrationProviders = () =>
  requestDashboardApi<CollectionProvider[]>(
    "/platform/payment-integrations/providers?audience=superadmin",
  );
export interface CollectionHealth {
  last_collection_at: string | null;
  unmatched_count: number;
  pending_review_count: number;
  delayed_confirmation_count: number;
  provider_exception_count: number;
  checked_at: string;
}
export const getIntegrationHealth = (row: CollectionChannelRevision) =>
  requestDashboardApi<CollectionHealth>(
    `/platform/payment-integrations/${row.tenant_id}/${row.id}/health?audience=superadmin`,
  );
export interface IntegrationCallbacks {
  confirmation_url: string; validation_url: string; environment: string; trust_mode: string;
}
export const getIntegrationCallbacks = (row: CollectionChannelRevision) =>
  requestDashboardApi<IntegrationCallbacks>(`/platform/payment-integrations/${row.tenant_id}/${row.id}/callbacks?audience=superadmin`);
export const simulateIntegrationPayment = (row: CollectionChannelRevision, body: Record<string,unknown>) =>
  requestDashboardApi<{accepted:boolean;provider_reference:string;message:string}>(`/platform/payment-integrations/${row.tenant_id}/${row.id}/sandbox-test?audience=superadmin`,
    {method:'POST',body,timeoutMs:75000});
const integrationAction = (
  row: CollectionChannelRevision,
  action: string,
  body?: Record<string, unknown>,
) =>
  requestDashboardApi<CollectionChannelRevision>(
    `/platform/payment-integrations/${row.tenant_id}/${row.id}/${action}?audience=superadmin`,
    { method: "POST", body, timeoutMs: 45000 },
  );
export const connectPaymentIntegration = (
  row: CollectionChannelRevision,
  body: Record<string, unknown>,
) => integrationAction(row, "connect", body);
export const testPaymentIntegration = (row: CollectionChannelRevision) =>
  integrationAction(row, "test");
export const activatePaymentIntegration = (row: CollectionChannelRevision) =>
  integrationAction(row, "activate");
export const suspendPaymentIntegration = (
  row: CollectionChannelRevision,
  reason: string,
) => integrationAction(row, "suspend", { reason });
