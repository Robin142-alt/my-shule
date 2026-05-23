import { getCsrfToken } from "@/lib/auth/csrf-client";
import {
  fallbackModuleCatalog,
  sortModuleCatalog,
  type ModuleRegistryItem,
} from "@/lib/module-access/module-access-map";

export type PlatformSchool = {
  tenant_id: string;
  school_name: string;
  subdomain: string;
  status: "active" | "inactive";
  invitation_sent: boolean;
  invitation_status: "sent" | "queued" | "failed" | "blocked";
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

  return payload as PlatformSchool;
}

export async function updatePlatformSchoolModules(input: {
  tenantId: string;
  moduleCodes: string[];
}) {
  const response = await fetchWithTimeout(
    `/api/platform/schools/${encodeURIComponent(input.tenantId)}/modules`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "x-myshule-csrf": await getCsrfToken(),
      },
      credentials: "same-origin",
      body: JSON.stringify({
        module_codes: input.moduleCodes,
      }),
    },
  );
  const payload = await parsePlatformResponse<PlatformSchoolModuleAccess[]>(
    response,
    "Unable to update school modules.",
  );

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

  return payload as PlatformSchoolDeleteResponse;
}
