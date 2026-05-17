import { getCsrfToken } from "@/lib/auth/csrf-client";

export type PlatformSchool = {
  tenant_id: string;
  school_name: string;
  subdomain: string;
  status: "active" | "inactive";
  invitation_sent: boolean;
  invitation_status: "sent" | "queued" | "failed";
  invitation_message: string;
  invite_expires_at: string;
  admin_email: string;
  created_at: string;
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

async function parsePlatformResponse(response: Response) {
  const payload = (await response.json().catch(() => null)) as
    | { message?: string }
    | PlatformSchool
    | PlatformSchool[]
    | ApiEnvelope<PlatformSchool | PlatformSchool[]>
    | null;

  if (!response.ok) {
    throw new Error(
      payload && "message" in payload && payload.message
        ? payload.message
        : "Unable to complete this platform request.",
    );
  }

  return isEnvelope<PlatformSchool | PlatformSchool[]>(payload)
    ? payload.data
    : payload;
}

async function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit, timeoutMs = 20_000) {
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
  const payload = await parsePlatformResponse(response);

  return Array.isArray(payload) ? payload : [];
}

export async function createPlatformSchool(input: {
  schoolName: string;
  tenantId: string;
  adminEmail: string;
  adminName: string;
  county?: string;
}) {
  const response = await fetchWithTimeout("/api/platform/schools", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-shulehub-csrf": await getCsrfToken(),
    },
    credentials: "same-origin",
    body: JSON.stringify({
      school_name: input.schoolName,
      tenant_id: input.tenantId,
      admin_email: input.adminEmail,
      admin_name: input.adminName,
      county: input.county,
    }),
  });
  const payload = await parsePlatformResponse(response);

  return payload as PlatformSchool;
}

export async function resendPlatformSchoolAdminInvite(tenantId: string) {
  const response = await fetchWithTimeout(
    `/api/platform/schools/${encodeURIComponent(tenantId)}/admin-invite/resend`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-shulehub-csrf": await getCsrfToken(),
      },
      credentials: "same-origin",
    },
  );
  const payload = await parsePlatformResponse(response);

  return payload as PlatformSchool;
}
