type ApiEnvelope<T> = {
  data: T;
  meta: Record<string, unknown>;
};

import { getCsrfToken } from "@/lib/auth/csrf-client";
import type {
  AlertItem,
  DashboardRole,
  DashboardSnapshot,
  NotificationItem,
  StatusTone,
  FinanceWidgetData,
  AcademicsWidgetData,
  StudentsWidgetData
} from "./types";

export interface LiveAuthUser {
  user_id: string;
  tenant_id: string | null;
  role: string;
  email: string;
  display_name: string;
  email_verified?: boolean;
  email_verified_at?: string | null;
  permissions: string[];
  session_id: string;
}

export interface LiveAuthSession {
  tenantId: string;
  user: LiveAuthUser;
}

export interface LiveAuthTokenSession extends LiveAuthSession {
  accessToken: string;
  refreshToken: string;
}

interface AuthResponse {
  tokens: {
    access_token: string;
    refresh_token: string;
  };
  user: LiveAuthUser;
}

export interface ReadinessResponse {
  status: "ok" | "degraded";
  services: {
    postgres: string;
    redis: string;
    bullmq: string;
    transactional_email?: string;
    cors?: string;
    support_notifications?: string;
    object_storage?: string;
    malware_scanning?: string;
  };
  email?: {
    provider?: string;
    status: string;
    api_key_configured?: boolean;
    sender_configured?: boolean;
    public_app_url_configured?: boolean;
  };
  cors?: {
    status: string;
    credentials?: boolean;
    allow_all_origins?: boolean;
    origin_count?: number;
    production_locked?: boolean;
    error?: string;
  };
  support_notifications?: {
    status: string;
    email?: {
      status: string;
      provider?: string;
      transactional_email?: string;
      recipients_configured?: boolean;
      recipient_count?: number;
    };
    sms?: {
      status: string;
      dispatch_provider_configured?: boolean;
      dispatch_provider_status?: string;
      webhook_url_configured?: boolean;
      webhook_token_configured?: boolean;
      recipients_configured?: boolean;
      recipient_count?: number;
      missing?: string[];
    };
    retry?: {
      worker_enabled?: boolean;
      interval_ms?: number;
      batch_size?: number;
      lease_ms?: number;
      max_attempts?: number;
    };
  } | null;
  object_storage?: {
    status: string;
    enabled?: boolean;
    provider?: string;
    endpoint_configured?: boolean;
    bucket_configured?: boolean;
    region_configured?: boolean;
    access_key_configured?: boolean;
    secret_key_configured?: boolean;
    missing?: string[];
  };
  malware_scanning?: {
    status: string;
    required?: boolean;
    provider_configured?: boolean;
    api_url_configured?: boolean;
    api_token_configured?: boolean;
    health_url_configured?: boolean;
    missing?: string[];
  };
  database_pool?: {
    total_connections?: number;
    idle_connections?: number;
    active_connections?: number;
    waiting_requests?: number;
  };
  circuit_breakers?: Record<string, unknown>;
  slo: {
    generated_at: string;
    overall_status: "healthy" | "degraded" | "critical" | "unknown";
    active_alert_count: number;
    subsystem_statuses: Array<{
      subsystem: "api" | "mpesa" | "sync" | "queue" | "database";
      status: "healthy" | "degraded" | "critical" | "unknown";
    }>;
  } | null;
}

export interface ObservabilityAlert {
  id: string;
  subsystem: "api" | "mpesa" | "sync" | "queue" | "database";
  severity: "warning" | "critical";
  title: string;
  message: string;
  triggered_at: string;
}

export interface ObservabilityAlertsResponse {
  alerts: ObservabilityAlert[];
}

export interface ObservabilityHealthResponse {
  generated_at: string;
  overall_status: "healthy" | "degraded" | "critical" | "unknown";
  active_alert_count: number;
  failed_jobs?: number;
  sync_queue?: number;
  pending_emails?: number;
  pending_sms?: number;
  api_errors_1h?: number;
  subsystem_statuses: Array<{
    subsystem: "api" | "mpesa" | "sync" | "queue" | "database";
    status: "healthy" | "degraded" | "critical" | "unknown";
  }>;
}

const API_TIMEOUT_MS = 4_500;

function normalizeApiPath(path: string) {
  const normalized = path.startsWith("/") ? path : `/${path}`;

  return normalized.replace(/^\/api(?=\/)/, "");
}

function normalizeConfiguredUrl(value: string | undefined) {
  const normalized = value?.trim().replace(/^['"]|['"]$/g, "").replace(/\/+$/, "") ?? null;

  return normalized?.replace(/\/api$/i, "") ?? null;
}

function isLocalApiDomain(domain: string | null) {
  return Boolean(domain && /^(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/i.test(domain));
}

function buildTenantOrigin(tenantId: string, domain: string) {
  const trimmedDomain = normalizeConfiguredUrl(domain)?.replace(/^\.+/, "") ?? "";

  if (/^https?:\/\//i.test(trimmedDomain)) {
    const parsed = new URL(trimmedDomain);
    return `${parsed.protocol}//${tenantId}.${parsed.host}`;
  }

  const protocol = /localhost|127\.0\.0\.1/i.test(trimmedDomain) ? "http" : "https";
  return `${protocol}://${tenantId}.${trimmedDomain}`;
}

export function getDashboardApiBaseUrl(tenantId?: string) {
  // In the browser, always route through the Next.js proxy to attach HTTP-only cookies
  if (typeof window !== "undefined") {
    return "/api";
  }

  const configuredBaseUrl = normalizeConfiguredUrl(process.env.NEXT_PUBLIC_API_BASE_URL);
  const configuredBaseDomain = normalizeConfiguredUrl(process.env.NEXT_PUBLIC_API_BASE_DOMAIN)?.replace(/^\.+/, "") ?? null;

  if (configuredBaseDomain && tenantId && !isLocalApiDomain(configuredBaseDomain)) {
    return buildTenantOrigin(tenantId, configuredBaseDomain);
  }

  return configuredBaseUrl;
}

export function isDashboardApiConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_API_BASE_URL?.trim() ||
      process.env.NEXT_PUBLIC_API_BASE_DOMAIN?.trim(),
  );
}

function isEnvelope<T>(value: unknown): value is ApiEnvelope<T> {
  return (
    typeof value === "object" &&
    value !== null &&
    "data" in value &&
    "meta" in value
  );
}

export async function requestDashboardApi<T>(
  path: string,
  options?: {
    unwrapEnvelope?: boolean;
    method?: "GET" | "POST" | "PATCH" | "DELETE" | "PUT";
    tenantId?: string;
    accessToken?: string | null;
    body?: BodyInit | Record<string, unknown> | null;
  },
): Promise<T> {
  const baseUrl = getDashboardApiBaseUrl(options?.tenantId);
  const apiPath = normalizeApiPath(path);

  if (!baseUrl) {
    throw new Error("Dashboard API base URL is not configured.");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), API_TIMEOUT_MS);
  const method = options?.method ?? "GET";
  const csrfToken =
    typeof window !== "undefined" && method !== "GET"
      ? await getCsrfToken()
      : null;

  const isFormData =
    typeof FormData !== "undefined" && options?.body instanceof FormData;
  const hasJsonBody =
    options?.body !== null
    && options?.body !== undefined
    && !isFormData;
  const requestBody: BodyInit | undefined =
    options?.body === undefined || options?.body === null
      ? undefined
      : isFormData
        ? (options.body as FormData)
        : JSON.stringify(options.body);

  try {
    const response = await fetch(`${baseUrl}${apiPath}`, {
      method,
      headers: {
        Accept: "application/json",
        ...(options?.tenantId ? { "x-tenant-id": options.tenantId } : {}),
        ...(csrfToken ? { "x-myshule-csrf": csrfToken } : {}),
        ...(hasJsonBody ? { "Content-Type": "application/json" } : {}),
        ...(options?.accessToken
          ? {
              Authorization: `Bearer ${options.accessToken}`,
              "x-auth-audience": "school",
            }
          : {}),
      },
      cache: "no-store",
      credentials: "include",
      signal: controller.signal,
      ...(requestBody !== undefined ? { body: requestBody } : {}),
    });

    if (!response.ok) {
      throw new Error(`Request failed: ${response.status}`);
    }

    const json = (await response.json()) as T | ApiEnvelope<T>;

    if (options?.unwrapEnvelope === false) {
      return json as T;
    }

    return isEnvelope<T>(json) ? json.data : (json as T);
  } finally {
    clearTimeout(timeout);
  }
}

export async function loginToDashboardApi(input: {
  tenantId: string;
  email: string;
  password: string;
}): Promise<LiveAuthTokenSession> {
  const response = await requestDashboardApi<AuthResponse>("/auth/login", {
    method: "POST",
    tenantId: input.tenantId,
    body: {
      email: input.email,
      password: input.password,
    },
  });

  return {
    tenantId: input.tenantId,
    accessToken: response.tokens.access_token,
    refreshToken: response.tokens.refresh_token,
    user: response.user,
  };
}

export async function fetchApiMe(session: LiveAuthTokenSession) {
  const response = await requestDashboardApi<{ user: LiveAuthUser }>("/auth/me", {
    tenantId: session.tenantId,
    accessToken: session.accessToken,
    unwrapEnvelope: false,
  });

  return response.user;
}

export function fetchApiReadiness() {
  return requestDashboardApi<ReadinessResponse>("/health/ready", {
    unwrapEnvelope: false,
  });
}

export function fetchApiObservabilityHealth() {
  return requestDashboardApi<ObservabilityHealthResponse>("/observability/health");
}

export function fetchApiObservabilityAlerts() {
  return requestDashboardApi<ObservabilityAlertsResponse>("/observability/alerts");
}

export function fetchApiDashboardSummary(role: string, accessToken?: string) {
  return requestDashboardApi<any>(`/dashboard/summary?role=${encodeURIComponent(role)}`, {
    accessToken,
    unwrapEnvelope: false,
  });
}

export function fetchApiFinanceSummary(accessToken?: string) {
  return requestDashboardApi<FinanceWidgetData>("/finance/summary", {
    accessToken,
    unwrapEnvelope: false,
  });
}

export function fetchApiAcademicsSummary(accessToken?: string) {
  return requestDashboardApi<AcademicsWidgetData>("/academics/summary", {
    accessToken,
    unwrapEnvelope: false,
  });
}

export function fetchApiStudentsSummary(accessToken?: string) {
  return requestDashboardApi<StudentsWidgetData>("/students/summary/dashboard", {
    accessToken,
    unwrapEnvelope: false,
  });
}

export function withSession<T>(
  session: LiveAuthSession,
  path: string,
  options?: {
    method?: "GET" | "POST" | "PATCH" | "DELETE";
    body?: Record<string, unknown>;
  },
): Promise<T> {
  return requestDashboardApi<T>(path, {
    tenantId: session.tenantId,
    accessToken: (session as any).accessToken,
    method: options?.method || "GET",
    body: options?.body,
  });
}
