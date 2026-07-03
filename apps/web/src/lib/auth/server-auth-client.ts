import type { LiveAuthUser } from "@/lib/dashboard/api-client";
import type { ExperienceAudience } from "@/lib/auth/experience-audience";
import { resolveExperienceHost } from "@/lib/auth/experience-routing";
import { normalizeMfaCode } from "@/lib/auth/mfa-challenge";
import { normalizeSchoolExperienceRole } from "@/lib/auth/school-role-normalization";
import {
  readAccessCookie,
  readAudienceCookie,
  readExperienceSessionCookie,
  readRefreshCookie,
  readTenantCookie,
  type ExperienceGatewaySession,
} from "@/lib/auth/server-session";

type LoginInput = {
  audience: ExperienceAudience;
  identifier: string;
  password: string;
  verificationCode?: string;
  tenantSlug?: string | null;
};

type RefreshInput = {
  audience: ExperienceAudience;
  tenantSlug?: string | null;
};

type BackendAuthResponse = {
  tokens: {
    access_token: string;
    refresh_token: string;
  };
  user: LiveAuthUser;
};

type BackendMeResponse =
  | { user: LiveAuthUser }
  | { data: { user: LiveAuthUser } };

type CookieReader = {
  get(name: string): { value: string } | undefined;
};

function inferTenantSlug(request: Request) {
  const host = request.headers.get("host")?.split(":")[0].trim().toLowerCase() ?? null;

  const resolution = resolveExperienceHost(host);
  return resolution.experience === "school" ? resolution.tenantSlug : null;
}

function unauthorized(message: string) {
  return new Error(message);
}

function getBackendErrorMessage(payload: unknown) {
  if (!payload || typeof payload !== "object" || !("message" in payload)) {
    return "Authentication request failed.";
  }

  const message = (payload as { message?: unknown }).message;

  if (typeof message === "string" && message.trim()) {
    if (message.trim().toLowerCase() === "invalid email or password") {
      return "Invalid credentials";
    }

    return message;
  }

  if (Array.isArray(message)) {
    const normalized = message
      .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
      .join(" ");

    return normalized || "Authentication request failed.";
  }

  return "Authentication request failed.";
}

const AUTH_SERVICE_UNAVAILABLE =
  "Authentication service is temporarily unavailable. Please try again shortly.";
const AUTH_REQUEST_TIMEOUT_MS = 25_000;

function normalizeConfiguredAuthUrl(value: string | undefined) {
  const normalized = value?.trim().replace(/^['"]|['"]$/g, "").replace(/\/+$/, "") ?? null;

  return normalized?.replace(/\/api$/i, "") ?? null;
}

function buildTenantAuthOrigin(tenantId: string, domain: string) {
  const trimmedDomain = normalizeConfiguredAuthUrl(domain)?.replace(/^\.+/, "") ?? "";

  if (/^https?:\/\//i.test(trimmedDomain)) {
    const parsed = new URL(trimmedDomain);
    return `${parsed.protocol}//${tenantId}.${parsed.host}`;
  }

  const protocol = /localhost|127\.0\.0\.1/i.test(trimmedDomain) ? "http" : "https";
  return `${protocol}://${tenantId}.${trimmedDomain}`;
}

function isLocalAuthDomain(domain: string | null) {
  return Boolean(domain && /^(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/i.test(domain));
}

function getServerAuthBaseUrl(tenantId?: string) {
  const configuredBaseUrl = normalizeConfiguredAuthUrl(process.env.NEXT_PUBLIC_API_BASE_URL);
  const configuredBaseDomain =
    normalizeConfiguredAuthUrl(process.env.NEXT_PUBLIC_API_BASE_DOMAIN)?.replace(/^\.+/, "") ?? null;

  if (configuredBaseDomain && tenantId && !isLocalAuthDomain(configuredBaseDomain)) {
    return buildTenantAuthOrigin(tenantId, configuredBaseDomain);
  }

  return configuredBaseUrl;
}

function buildExperienceHomePath(input: {
  audience: ExperienceAudience;
  role?: string;
  viewer?: string;
}) {
  if (input.audience === "superadmin") {
    return "/superadmin";
  }

  if (input.audience === "school") {
    const role = normalizeSchoolExperienceRole(input.role);

    return `/school/${role}`;
  }

  return `/portal/${input.viewer ?? "parent"}`;
}

function buildGatewaySession(input: {
  audience: ExperienceAudience;
  userLabel: string;
  tenantSlug: string | null;
  role?: string;
  viewer?: string;
  accessToken?: string;
  refreshToken?: string;
  user: LiveAuthUser;
}) {
  const role =
    input.audience === "school"
      ? normalizeSchoolExperienceRole(input.role)
      : input.role;
  const homePath = buildExperienceHomePath({
    audience: input.audience,
    role,
    viewer: input.viewer,
  });

  return {
    audience: input.audience,
    homePath,
    redirectTo: homePath,
    tenantSlug: input.tenantSlug,
    userLabel: input.userLabel,
    accessToken: input.accessToken ?? "",
    refreshToken: input.refreshToken ?? "",
    role,
    viewer: input.viewer,
    user: input.user,
  } satisfies ExperienceGatewaySession;
}

function unwrapBackendUser(response: BackendMeResponse) {
  if ("user" in response) {
    return response.user;
  }

  return response.data.user;
}

async function requestBackendAuth<T>(
  path: string,
  input: {
    audience: ExperienceAudience;
    tenantSlug?: string | null;
    method: "GET" | "POST";
    accessToken?: string;
    body?: Record<string, unknown>;
  },
) {
  const tenantSlug = input.tenantSlug?.trim() || undefined;
  const baseUrl = getServerAuthBaseUrl(tenantSlug);

  if (!baseUrl) {
    throw unauthorized(AUTH_SERVICE_UNAVAILABLE);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), AUTH_REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${baseUrl}${path}`, {
      method: input.method,
      headers: {
        Accept: "application/json",
        "x-auth-audience": input.audience,
        ...(tenantSlug ? { "x-tenant-id": tenantSlug } : {}),
        ...(input.body ? { "Content-Type": "application/json" } : {}),
        ...(input.accessToken ? { Authorization: `Bearer ${input.accessToken}` } : {}),
      },
      body: input.body ? JSON.stringify(input.body) : undefined,
      cache: "no-store",
      signal: controller.signal,
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      const message = getBackendErrorMessage(payload);

      if (
        response.status >= 500 ||
        message.toLowerCase().includes("application failed to respond")
      ) {
        throw unauthorized(AUTH_SERVICE_UNAVAILABLE);
      }

      throw unauthorized(message);
    }

    return (await response.json()) as T;
  } catch (error) {
    if (
      error instanceof TypeError ||
      (error instanceof Error && error.name === "AbortError")
    ) {
      throw unauthorized(AUTH_SERVICE_UNAVAILABLE);
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

async function loginSchoolAudience(input: LoginInput) {
  const response = await requestBackendAuth<BackendAuthResponse>("/auth/login", {
    audience: "school",
    tenantSlug: input.tenantSlug?.trim() || null,
    method: "POST",
    body: {
      email: input.identifier.trim(),
      password: input.password,
      audience: "school",
      mfa_code: normalizeMfaCode(input.verificationCode) || undefined,
    },
  });

  return buildGatewaySession({
    audience: "school",
    userLabel: response.user.display_name || response.user.email,
    tenantSlug: response.user.tenant_id,
    role: response.user.role,
    accessToken: response.tokens.access_token,
    refreshToken: response.tokens.refresh_token,
    user: response.user,
  });
}

async function loginSuperadminAudience(input: LoginInput) {
  const response = await requestBackendAuth<BackendAuthResponse>("/auth/login", {
    audience: "superadmin",
    tenantSlug: null,
    method: "POST",
    body: {
      email: input.identifier.trim(),
      password: input.password,
      audience: "superadmin",
      mfa_code: normalizeMfaCode(input.verificationCode) || undefined,
    },
  });

  return buildGatewaySession({
    audience: "superadmin",
    userLabel: response.user.display_name || response.user.email,
    tenantSlug: null,
    role: response.user.role,
    accessToken: response.tokens.access_token,
    refreshToken: response.tokens.refresh_token,
    user: response.user,
  });
}

async function loginPortalAudience(input: LoginInput) {
  const response = await requestBackendAuth<BackendAuthResponse>("/auth/login", {
    audience: "portal",
    tenantSlug: input.tenantSlug?.trim() || null,
    method: "POST",
    body: {
      email: input.identifier.trim(),
      password: input.password,
      audience: "portal",
      mfa_code: normalizeMfaCode(input.verificationCode) || undefined,
    },
  });

  return buildGatewaySession({
    audience: "portal",
    userLabel: response.user.display_name || response.user.email,
    tenantSlug: response.user.tenant_id,
    viewer: response.user.role === "student" ? "student" : "parent",
    role: response.user.role,
    accessToken: response.tokens.access_token,
    refreshToken: response.tokens.refresh_token,
    user: response.user,
  });
}

export function createServerAuthClient(request: Request) {
  const inferredTenantSlug = inferTenantSlug(request);

  return {
    async login(input: LoginInput) {
      const normalizedInput = {
        ...input,
        tenantSlug: input.tenantSlug ?? inferredTenantSlug,
      };

      switch (normalizedInput.audience) {
        case "superadmin":
          return loginSuperadminAudience(normalizedInput);
        case "school":
          return loginSchoolAudience(normalizedInput);
        case "portal":
          return loginPortalAudience(normalizedInput);
      }
    },

    async refresh(input: RefreshInput, cookies: CookieReader) {
      const tenantSlug = input.tenantSlug?.trim() || readTenantCookie(cookies);
      const refreshToken = readRefreshCookie(cookies);

      if (!refreshToken) {
        throw unauthorized("No refresh session found.");
      }

      if (input.audience === "school" && !tenantSlug) {
        throw unauthorized("No refresh session found.");
      }

      const response = await requestBackendAuth<BackendAuthResponse>("/auth/refresh", {
        audience: input.audience,
        tenantSlug,
        method: "POST",
        body: {
          refresh_token: refreshToken,
        },
      });

      return buildGatewaySession({
        audience: input.audience,
        userLabel: response.user.display_name || response.user.email,
        tenantSlug: response.user.tenant_id ?? tenantSlug ?? null,
        role: response.user.role,
        viewer: input.audience === "portal" ? (response.user.role === "student" ? "student" : "parent") : undefined,
        accessToken: response.tokens.access_token,
        refreshToken: response.tokens.refresh_token,
        user: response.user,
      });
    },

    async me(requestedAudience: ExperienceAudience, cookies: CookieReader) {
      const audience = readAudienceCookie(cookies) ?? requestedAudience;
      const session = readExperienceSessionCookie(cookies, requestedAudience);

      if (!session || audience !== requestedAudience) {
        throw unauthorized("No active session found.");
      }

      if (session.experience !== requestedAudience) {
        throw unauthorized("No active session found.");
      }

      const sessionTenantSlug = session.experience === "school" ? session.tenantSlug : null;
      const tenantSlug = readTenantCookie(cookies) ?? sessionTenantSlug;
      const accessToken = readAccessCookie(cookies);

      if (!accessToken) {
        throw unauthorized("No active session found.");
      }

      if (requestedAudience === "school" && !tenantSlug) {
        throw unauthorized("No active session found.");
      }

      const response = await requestBackendAuth<BackendMeResponse>("/auth/me", {
        audience: requestedAudience,
        tenantSlug,
        method: "GET",
        accessToken,
      });
      const user = unwrapBackendUser(response);

      return buildGatewaySession({
        audience: requestedAudience,
        userLabel: user.display_name || user.email,
        tenantSlug: user.tenant_id ?? tenantSlug ?? null,
        role: user.role,
        viewer: requestedAudience === "portal" ? (user.role === "student" ? "student" : "parent") : undefined,
        accessToken,
        refreshToken: readRefreshCookie(cookies),
        user,
      });
    },
  };
}
