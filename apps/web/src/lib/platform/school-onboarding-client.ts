import { getCsrfToken } from "@/lib/auth/csrf-client";
import { ExpiredSessionError } from "@/lib/auth/session-expiry-client";
import {
  fallbackModuleCatalog,
  sortModuleCatalog,
  type ModuleRegistryItem,
} from "@/lib/module-access/module-access-map";
import { DashboardApi } from "@/lib/client/dashboard-api";

export type PlatformSchool = {
  tenant_id: string;
  school_name: string;
  subdomain: string;
  status: "active" | "inactive";
  invitation_sent: boolean;
  invitation_status: "sent" | "queued" | "failed" | "blocked" | "accepted" | null;
  invitation_message: string;
  invitation_failure_code?: string;
  invitation_failure_reason?: string;
  invitation_action_required?: string;
  can_resend_invite: boolean;
  invite_expires_at: string;
  admin_email: string;
  created_at: string;
  enabled_modules?: string[];
  billing?: PlatformSchoolBilling;
};

export type PlatformTenantProductSummary = {
  total_schools: number;
  active_schools: number;
  inactive_schools: number;
  billing_active_schools: number;
  billing_grace_period_schools: number;
  billing_restricted_schools: number;
  billing_suspended_schools: number;
  pending_principal_invites: number;
  failed_principal_invites: number;
  expired_principal_invites: number;
  schools_with_modules: number;
  enabled_module_assignments: number;
  generated_at: string;
};

export type PlatformManualBillingState =
  | "not_configured"
  | "active"
  | "grace_period"
  | "restricted"
  | "suspended"
  | "expired";

export type PlatformConfigurableBillingState = Exclude<
  PlatformManualBillingState,
  "not_configured"
>;

export type PlatformSchoolBilling = {
  state: PlatformManualBillingState;
  label: string;
  access_mode: "full" | "read_only" | "billing_only" | null;
  plan_code: string | null;
  effective_until?: string | null;
  configured_at?: string | null;
  configured_by_user_id?: string | null;
  note?: string | null;
};

export type PlatformSchoolModuleAccess = ModuleRegistryItem & {
  enabled: boolean;
  enabled_at?: string | null;
  disabled_at?: string | null;
  updated_by?: string | null;
};

export type PlatformSchoolDeleteResponse = {
  tenant_id: string;
  deleted: boolean;
  deprovisioned: boolean;
  message: string;
  usage_summary: {
    memberships: number;
    students: number;
    invoices: number;
    support_tickets: number;
    mpesa_transactions: number;
  };
  school?: PlatformSchool;
};

export type PlatformTemplate = {
  id: string;
  name: string;
  type: string;
  status: string;
  assignedCount: number;
};

export type PlatformBroadcast = {
  id: string;
  subject: string;
  target: string;
  dateSent: string;
  status: string;
};

export type PlatformAuditLog = {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  target: string;
  details: string;
};

export type PlatformBackup = {
  id: string;
  schoolName: string;
  lastBackup: string;
  size: string;
  status: string;
};

export type PlatformReport = {
  id: string;
  reportName: string;
  date: string;
  status: string;
  format?: string;
};

export type PlatformUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  lastActive: string;
  status: string;
};

export type PlatformSmsProviderCode = "textsms_kenya" | "africas_talking" | "twilio";

export type PlatformSmsProvider = {
  id: string;
  provider_name: string;
  provider_code: PlatformSmsProviderCode;
  api_key_masked: string;
  username_masked?: string | null;
  sender_id: string;
  base_url?: string | null;
  is_active: boolean;
  is_default: boolean;
  last_test_status?: string | null;
  last_tested_at?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type PlatformSmsProviderInput = {
  provider_name: string;
  provider_code: PlatformSmsProviderCode;
  api_key?: string;
  username?: string;
  sender_id: string;
  base_url?: string;
  is_active?: boolean;
  is_default?: boolean;
};

type ApiEnvelope<T> = {
  data: T;
  meta?: Record<string, unknown>;
};

function isEnvelope<T>(value: unknown): value is ApiEnvelope<T> {
  return (
    typeof value === "object" &&
    value !== null &&
    "data" in value
  );
}

async function parsePlatformResponse<T>(
  response: Response,
  fallbackMessage = "Unable to complete this platform request.",
) {
  const payload = (await response.json().catch(() => null)) as
    | { message?: string }
    | T
    | ApiEnvelope<T>
    | null;

  if (!response.ok) {
    if (response.status === 401) {
      throw new ExpiredSessionError("superadmin");
    }

    const message =
      payload &&
      typeof payload === "object" &&
      "message" in payload &&
      typeof payload.message === "string"
        ? payload.message
        : fallbackMessage;

    throw new Error(
      message,
    );
  }

  return isEnvelope<T>(payload)
    ? payload.data
    : payload;
}

async function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit, timeoutMs = 35_000) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("School creation is taking longer than expected. Refresh schools before trying again.");
    }

    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}

export async function fetchPlatformSchools() {
  const response = await fetch("/api/platform/schools", {
    method: "GET",
    credentials: "same-origin",
    cache: "no-store",
  });
  const payload = await parsePlatformResponse<PlatformSchool[]>(response);

  return Array.isArray(payload) ? payload : [];
}

export async function fetchPlatformTenantProductSummary() {
  const response = await fetch("/api/platform/schools/summary", {
    method: "GET",
    credentials: "same-origin",
    cache: "no-store",
  });
  const payload = await parsePlatformResponse<PlatformTenantProductSummary>(
    response,
    "Unable to load tenants in product summary.",
  );

  return payload as PlatformTenantProductSummary;
}

export async function fetchPlatformModules() {
  const response = await fetch("/api/platform/modules", {
    method: "GET",
    credentials: "same-origin",
    cache: "no-store",
  });
  const payload = await parsePlatformResponse<ModuleRegistryItem[]>(
    response,
    "Unable to load the platform module registry.",
  );

  return sortModuleCatalog(Array.isArray(payload) ? payload : fallbackModuleCatalog);
}

export async function fetchPlatformSchoolModules(tenantId: string) {
  const response = await fetch(
    `/api/platform/schools/${encodeURIComponent(tenantId)}/modules`,
    {
      method: "GET",
      credentials: "same-origin",
      cache: "no-store",
    },
  );
  const payload = await parsePlatformResponse<PlatformSchoolModuleAccess[]>(
    response,
    "Unable to load school module access.",
  );

  return Array.isArray(payload) ? sortModuleCatalog(payload) as PlatformSchoolModuleAccess[] : [];
}

export async function createPlatformSchool(input: {
  schoolName: string;
  tenantId: string;
  adminEmail: string;
  adminName: string;
  county?: string;
  moduleCodes?: string[];
}) {
  const response = await fetchWithTimeout("/api/platform/schools", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-myshule-csrf": await getCsrfToken(),
    },
    credentials: "same-origin",
    body: JSON.stringify({
      school_name: input.schoolName,
      tenant_id: input.tenantId,
      admin_email: input.adminEmail,
      admin_name: input.adminName,
      county: input.county,
      module_codes: input.moduleCodes,
    }),
  });
  const payload = await parsePlatformResponse<PlatformSchool>(response);
  if (!payload || !('tenant_id' in payload)) throw new Error("Failed to create school");

  // Dispatch workflow event
  try {
    await DashboardApi.createEvent({
      event_type: 'SCHOOL_CREATED',
      entity_type: 'school',
      entity_id: payload.tenant_id,
      module_name: 'superadmin',
      action_name: 'create_school',
      metadata: { schoolName: payload.school_name }
    });
  } catch (e) { console.error('Failed to dispatch event', e); }

  return payload as PlatformSchool;
}

export async function updatePlatformSchoolModules(
  tenantIdOrInput: string | { tenantId: string; moduleCodes: string[] },
  moduleCodes?: string[],
) {
  const isObject = typeof tenantIdOrInput === "object" && tenantIdOrInput !== null;
  const tenantId = isObject ? tenantIdOrInput.tenantId : tenantIdOrInput;
  const codes = isObject ? tenantIdOrInput.moduleCodes : moduleCodes || [];

  const response = await fetchWithTimeout(
    `/api/platform/schools/${encodeURIComponent(tenantId)}/modules`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "x-myshule-csrf": await getCsrfToken(),
      },
      credentials: "same-origin",
      body: JSON.stringify({
        module_codes: codes,
      }),
    },
  );
  const payload = await parsePlatformResponse<PlatformSchoolModuleAccess[]>(
    response,
    "Unable to update school modules.",
  );

  // Dispatch workflow event
  try {
    await DashboardApi.createEvent({
      event_type: 'MODULES_UPDATED',
      entity_type: 'school',
      entity_id: tenantId,
      module_name: 'superadmin',
      action_name: 'update_modules',
      metadata: { moduleCodes: codes }
    });
  } catch (e) { console.error('Failed to dispatch event', e); }

  return Array.isArray(payload) ? sortModuleCatalog(payload) as PlatformSchoolModuleAccess[] : [];
}

export async function updatePlatformSchoolBilling(input: {
  tenantId: string;
  state: PlatformConfigurableBillingState;
  effectiveUntil?: string;
  note?: string;
}) {
  const response = await fetchWithTimeout(
    `/api/platform/schools/${encodeURIComponent(input.tenantId)}/billing`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "x-myshule-csrf": await getCsrfToken(),
      },
      credentials: "same-origin",
      body: JSON.stringify({
        state: input.state,
        effective_until: input.effectiveUntil,
        note: input.note,
      }),
    },
  );
  const payload = await parsePlatformResponse<PlatformSchool>(
    response,
    "Unable to update school billing.",
  );

  // Dispatch workflow event
  try {
    await DashboardApi.createEvent({
      event_type: 'BILLING_UPDATED',
      entity_type: 'school',
      entity_id: input.tenantId,
      module_name: 'superadmin',
      action_name: 'update_billing',
      metadata: { state: input.state }
    });
  } catch (e) { console.error('Failed to dispatch event', e); }

  return payload as PlatformSchool;
}

export async function resendPlatformSchoolAdminInvite(tenantId: string) {
  const response = await fetchWithTimeout(
    `/api/platform/schools/${encodeURIComponent(tenantId)}/admin-invite/resend`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-myshule-csrf": await getCsrfToken(),
      },
      credentials: "same-origin",
    },
  );
  const payload = await parsePlatformResponse<PlatformSchool>(response);

  return payload as PlatformSchool;
}

export async function deletePlatformSchool(input: {
  tenantId: string;
  confirmation: string;
  reason: string;
  hardDeleteEmptyTenant: boolean;
}) {
  const response = await fetchWithTimeout(
    `/api/platform/schools/${encodeURIComponent(input.tenantId)}`,
    {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        "x-myshule-csrf": await getCsrfToken(),
      },
      credentials: "same-origin",
      body: JSON.stringify({
        confirmation: input.confirmation,
        reason: input.reason,
        hard_delete_empty_tenant: input.hardDeleteEmptyTenant,
      }),
    },
  );
  const payload = await parsePlatformResponse<PlatformSchoolDeleteResponse>(response);

  // Dispatch workflow event
  try {
    await DashboardApi.createEvent({
      event_type: 'SCHOOL_DELETED',
      entity_type: 'school',
      entity_id: input.tenantId,
      module_name: 'superadmin',
      action_name: 'delete_school',
      metadata: { reason: input.reason }
    });
  } catch (e) { console.error('Failed to dispatch event', e); }

  return payload as PlatformSchoolDeleteResponse;
}

export async function hardDeletePlatformSchool(input: {
  tenantId: string;
  confirmation: string;
  reason: string;
}) {
  const response = await fetchWithTimeout(
    `/api/platform/schools/${encodeURIComponent(input.tenantId)}/hard-delete`,
    {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        "x-myshule-csrf": await getCsrfToken(),
      },
      credentials: "same-origin",
      body: JSON.stringify({
        confirmation: input.confirmation,
        reason: input.reason,
      }),
    },
  );
  const payload = await parsePlatformResponse<PlatformSchoolDeleteResponse>(response);

  // Dispatch workflow event
  try {
    await DashboardApi.createEvent({
      event_type: 'SCHOOL_HARD_DELETED',
      entity_type: 'school',
      entity_id: input.tenantId,
      module_name: 'superadmin',
      action_name: 'hard_delete_school',
      metadata: { reason: input.reason }
    });
  } catch (e) { console.error('Failed to dispatch event', e); }

  return payload as PlatformSchoolDeleteResponse;
}

export async function fetchPlatformTemplates() {
  const response = await fetch("/api/platform/templates", { method: "GET", credentials: "same-origin", cache: "no-store" });
  const payload = await parsePlatformResponse<any[]>(response);
  return Array.isArray(payload) ? payload : [];
}

export async function fetchPlatformBroadcasts() {
  const response = await fetch("/api/platform/broadcasts", { method: "GET", credentials: "same-origin", cache: "no-store" });
  const payload = await parsePlatformResponse<any[]>(response);
  return Array.isArray(payload) ? payload : [];
}

export async function fetchPlatformAuditLogs() {
  const response = await fetch("/api/platform/audit-logs", { method: "GET", credentials: "same-origin", cache: "no-store" });
  const payload = await parsePlatformResponse<any[]>(response);
  return Array.isArray(payload) ? payload : [];
}

export async function fetchPlatformBackups() {
  const response = await fetch("/api/platform/backups", { method: "GET", credentials: "same-origin", cache: "no-store" });
  const payload = await parsePlatformResponse<any[]>(response);
  return Array.isArray(payload) ? payload : [];
}

export async function fetchPlatformSecurityPolicies() {
  const response = await fetch("/api/platform/security-policies", { method: "GET", credentials: "same-origin", cache: "no-store" });
  const payload = await parsePlatformResponse<any[]>(response);
  return Array.isArray(payload) ? payload : [];
}

export async function fetchPlatformReports() {
  const response = await fetch("/api/platform/reports", { method: "GET", credentials: "same-origin", cache: "no-store" });
  const payload = await parsePlatformResponse<any[]>(response);
  return Array.isArray(payload) ? payload : [];
}

export async function fetchPlatformUsers() {
  const response = await fetch("/api/platform/users", { method: "GET", credentials: "same-origin", cache: "no-store" });
  const payload = await parsePlatformResponse<any[]>(response);
  return Array.isArray(payload) ? payload : [];
}

export async function updatePlatformUserStatus(id: string, status: "active" | "disabled") {
  const response = await fetchWithTimeout(`/api/platform/users/${encodeURIComponent(id)}/status`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      "x-myshule-csrf": await getCsrfToken(),
    },
    credentials: "same-origin",
    body: JSON.stringify({ status }),
  });

  return await parsePlatformResponse<PlatformUser>(response);
}

export async function createPlatformTemplate(input: Partial<PlatformTemplate>) {
  const response = await fetchWithTimeout("/api/platform/templates", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-myshule-csrf": await getCsrfToken(),
    },
    credentials: "same-origin",
    body: JSON.stringify(input),
  });
  return await parsePlatformResponse<PlatformTemplate>(response);
}

export async function createPlatformBroadcast(input: Partial<PlatformBroadcast>) {
  const response = await fetchWithTimeout("/api/platform/broadcasts", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-myshule-csrf": await getCsrfToken(),
    },
    credentials: "same-origin",
    body: JSON.stringify(input),
  });
  return await parsePlatformResponse<PlatformBroadcast>(response);
}

export async function createPlatformSecurityPolicy(input: any) {
  const response = await fetchWithTimeout("/api/platform/security-policies", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-myshule-csrf": await getCsrfToken(),
    },
    credentials: "same-origin",
    body: JSON.stringify(input),
  });
  return await parsePlatformResponse<PlatformReport>(response);
}

export async function requestPlatformReport(input: Partial<PlatformReport>) {
  const response = await fetchWithTimeout("/api/platform/reports/request", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-myshule-csrf": await getCsrfToken(),
    },
    credentials: "same-origin",
    body: JSON.stringify(input),
  });
  return await parsePlatformResponse<any>(response);
}

export async function updatePlatformSettings(input: any) {
  const response = await fetchWithTimeout("/api/platform/settings", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "x-myshule-csrf": await getCsrfToken(),
    },
    credentials: "same-origin",
    body: JSON.stringify(input),
  });
  return await parsePlatformResponse<any>(response);
}

export async function fetchPlatformSettings() {
  const response = await fetch("/api/platform/settings", { method: "GET", credentials: "same-origin", cache: "no-store" });
  return await parsePlatformResponse<any>(response);
}

export async function fetchPlatformPaymentGateways() {
  const response = await fetch("/api/platform/gateways", { method: "GET", credentials: "same-origin", cache: "no-store" });
  const payload = await parsePlatformResponse<any[]>(response);
  return Array.isArray(payload) ? payload : [];
}

export async function fetchPlatformSmsProviders() {
  const response = await fetch("/api/platform/sms/providers", { method: "GET", credentials: "same-origin", cache: "no-store" });
  const payload = await parsePlatformResponse<PlatformSmsProvider[]>(response);
  return Array.isArray(payload) ? payload : [];
}

export async function createPlatformSmsProvider(input: PlatformSmsProviderInput) {
  const response = await fetchWithTimeout("/api/platform/sms/providers", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-myshule-csrf": await getCsrfToken(),
    },
    credentials: "same-origin",
    body: JSON.stringify(input),
  });

  return await parsePlatformResponse<PlatformSmsProvider>(response);
}

export async function updatePlatformSmsProvider(id: string, input: PlatformSmsProviderInput) {
  const response = await fetchWithTimeout(`/api/platform/sms/providers/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      "x-myshule-csrf": await getCsrfToken(),
    },
    credentials: "same-origin",
    body: JSON.stringify(input),
  });

  return await parsePlatformResponse<PlatformSmsProvider>(response);
}

export async function testPlatformSmsProvider(id: string) {
  const response = await fetchWithTimeout(`/api/platform/sms/providers/${encodeURIComponent(id)}/test`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-myshule-csrf": await getCsrfToken(),
    },
    credentials: "same-origin",
  });

  return await parsePlatformResponse<{
    status: "configuration_valid";
    provider_id: string;
    connectivity_tested: false;
  }>(response);
}

export async function setDefaultPlatformSmsProvider(id: string) {
  const response = await fetchWithTimeout(`/api/platform/sms/providers/${encodeURIComponent(id)}/set-default`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-myshule-csrf": await getCsrfToken(),
    },
    credentials: "same-origin",
  });

  return await parsePlatformResponse<PlatformSmsProvider>(response);
}

export async function createPlatformPaymentGateway(input: {
  name: string;
  type: string;
  environment: string;
  shortcode?: string;
  consumerKey?: string;
}) {
  const response = await fetchWithTimeout("/api/platform/gateways", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-myshule-csrf": await getCsrfToken(),
    },
    credentials: "same-origin",
    body: JSON.stringify(input),
  });

  return await parsePlatformResponse<any>(response);
}

export async function updatePlatformPaymentGateway(id: string, input: {
  name: string;
  type: string;
  environment: string;
  status?: string;
  shortcode?: string;
  consumerKey?: string;
}) {
  const response = await fetchWithTimeout(`/api/platform/gateways/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      "x-myshule-csrf": await getCsrfToken(),
    },
    credentials: "same-origin",
    body: JSON.stringify(input),
  });

  return await parsePlatformResponse<any>(response);
}

export async function deletePlatformBroadcast(id: string) {
  const response = await fetchWithTimeout(
    `/api/platform/broadcasts/${encodeURIComponent(id)}`,
    {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        "x-myshule-csrf": await getCsrfToken(),
      },
      credentials: "same-origin",
    },
  );
  return await parsePlatformResponse<any>(response);
}

export async function deletePlatformTemplate(id: string) {
  const response = await fetchWithTimeout(
    `/api/platform/templates/${encodeURIComponent(id)}`,
    {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        "x-myshule-csrf": await getCsrfToken(),
      },
      credentials: "same-origin",
    },
  );
  return await parsePlatformResponse<any>(response);
}

export async function triggerPlatformBackup() {
  const response = await fetchWithTimeout(
    "/api/platform/backups",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-myshule-csrf": await getCsrfToken(),
      },
      credentials: "same-origin",
      body: JSON.stringify({}),
    },
  );
  return await parsePlatformResponse<any>(response);
}
