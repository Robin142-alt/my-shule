import { NextResponse } from "next/server";

import type { LiveAuthUser } from "@/lib/dashboard/api-client";
import type { ExperienceAudience } from "@/lib/auth/experience-audience";
import {
  parseExperienceSession,
  serializeExperienceSession,
  type ExperienceSession,
} from "@/lib/auth/experience-routing";
import type { PortalViewer } from "@/lib/experiences/types";
import {
  ACCESS_COOKIE,
  AUDIENCE_COOKIE,
  getExperienceSessionCookieName,
  REMEMBER_SESSION_COOKIE,
  REFRESH_COOKIE,
  TENANT_COOKIE,
} from "@/lib/auth/session-cookies";
import { normalizeSchoolExperienceRole } from "@/lib/auth/school-role-normalization";

export type ExperienceGatewaySession = {
  audience: ExperienceAudience;
  homePath: string;
  redirectTo: string;
  tenantSlug: string | null;
  userLabel: string;
  accessToken: string;
  refreshToken: string;
  role?: string;
  viewer?: string;
  user: LiveAuthUser;
};

export type PublicExperienceGatewaySession = Omit<
  ExperienceGatewaySession,
  "accessToken" | "refreshToken"
>;

type CookieReader = {
  get(name: string): { value: string } | undefined;
};

const secureCookies = process.env.NODE_ENV === "production";

function cookieOptions(maxAge?: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: secureCookies,
    path: "/",
    ...(typeof maxAge === "number" ? { maxAge } : {}),
  };
}

function deleteCookie(response: NextResponse, name: string) {
  response.cookies.set(name, "", {
    ...cookieOptions(),
    maxAge: 0,
  });
}

function toExperienceSession(
  session: ExperienceGatewaySession,
): ExperienceSession {
  if (session.audience === "superadmin") {
    return {
      experience: "superadmin",
      homePath: session.homePath,
      userLabel: session.userLabel,
    };
  }

  if (session.audience === "school") {
    return {
      experience: "school",
      homePath: session.homePath,
      role: normalizeSchoolExperienceRole(session.role),
      tenantSlug: session.tenantSlug ?? "",
      userLabel: session.userLabel,
    };
  }

  return {
    experience: "portal",
    homePath: session.homePath,
    viewer: (session.viewer ?? "parent") as PortalViewer,
    userLabel: session.userLabel,
  };
}

export function toPublicExperienceGatewaySession(
  session: ExperienceGatewaySession,
): PublicExperienceGatewaySession {
  const publicSession = { ...session } as Omit<
    ExperienceGatewaySession,
    "accessToken" | "refreshToken"
  > & Partial<Pick<ExperienceGatewaySession, "accessToken" | "refreshToken">>;

  delete publicSession.accessToken;
  delete publicSession.refreshToken;

  return publicSession;
}

export function setExperienceSessionCookies(
  response: NextResponse,
  session: ExperienceGatewaySession,
  options: { rememberSession?: boolean } = {},
) {
  const maxAge = options.rememberSession
    ? getRefreshTokenMaxAge(session.refreshToken)
    : undefined;
  const sessionCookieOptions = cookieOptions(maxAge);

  response.cookies.set(
    getExperienceSessionCookieName(session.audience),
    serializeExperienceSession(toExperienceSession(session)),
    sessionCookieOptions,
  );
  response.cookies.set(ACCESS_COOKIE, session.accessToken, sessionCookieOptions);
  response.cookies.set(REFRESH_COOKIE, session.refreshToken, sessionCookieOptions);
  response.cookies.set(AUDIENCE_COOKIE, session.audience, sessionCookieOptions);

  if (session.tenantSlug) {
    response.cookies.set(TENANT_COOKIE, session.tenantSlug, sessionCookieOptions);
  } else {
    deleteCookie(response, TENANT_COOKIE);
  }

  if (options.rememberSession) {
    response.cookies.set(REMEMBER_SESSION_COOKIE, "1", sessionCookieOptions);
  } else {
    deleteCookie(response, REMEMBER_SESSION_COOKIE);
  }
}

export function clearExperienceSessionCookies(response: NextResponse) {
  deleteCookie(response, ACCESS_COOKIE);
  deleteCookie(response, REFRESH_COOKIE);
  deleteCookie(response, AUDIENCE_COOKIE);
  deleteCookie(response, TENANT_COOKIE);
  deleteCookie(response, REMEMBER_SESSION_COOKIE);
  deleteCookie(response, getExperienceSessionCookieName("superadmin"));
  deleteCookie(response, getExperienceSessionCookieName("school"));
  deleteCookie(response, getExperienceSessionCookieName("portal"));
}

export function readAudienceCookie(cookieStore: CookieReader) {
  return cookieStore.get(AUDIENCE_COOKIE)?.value ?? null;
}

export function readTenantCookie(cookieStore: CookieReader) {
  return cookieStore.get(TENANT_COOKIE)?.value ?? null;
}

export function readAccessCookie(cookieStore: CookieReader) {
  return cookieStore.get(ACCESS_COOKIE)?.value ?? "";
}

export function readRefreshCookie(cookieStore: CookieReader) {
  return cookieStore.get(REFRESH_COOKIE)?.value ?? "";
}

export function readRememberSessionCookie(cookieStore: CookieReader) {
  return cookieStore.get(REMEMBER_SESSION_COOKIE)?.value === "1";
}

export function readExperienceSessionCookie(
  cookieStore: CookieReader,
  audience: ExperienceAudience,
) {
  return parseExperienceSession(
    audience,
    cookieStore.get(getExperienceSessionCookieName(audience))?.value ?? null,
  );
}

export function resolveSchoolTenantSlug(input: {
  requestedTenantSlug?: string | null;
  tenantCookie?: string | null;
  sessionTenantSlug?: string | null;
}) {
  const requestedTenantSlug = normalizeTenantSlug(input.requestedTenantSlug);
  const tenantCookie = normalizeTenantSlug(input.tenantCookie);
  const sessionTenantSlug = normalizeTenantSlug(input.sessionTenantSlug);
  const tenantSlug = sessionTenantSlug ?? tenantCookie ?? requestedTenantSlug;
  const tenantMismatch =
    Boolean(sessionTenantSlug && tenantCookie && sessionTenantSlug !== tenantCookie)
    || Boolean(sessionTenantSlug && requestedTenantSlug && sessionTenantSlug !== requestedTenantSlug)
    || Boolean(!sessionTenantSlug && tenantCookie && requestedTenantSlug && tenantCookie !== requestedTenantSlug);

  return {
    tenantSlug,
    tenantMismatch,
  };
}

function normalizeTenantSlug(value?: string | null) {
  const normalized = value?.trim();
  return normalized && normalized.length > 0 ? normalized : null;
}

function getRefreshTokenMaxAge(refreshToken: string) {
  const fallbackSeconds = 30 * 24 * 60 * 60;

  try {
    const payloadSegment = refreshToken.split(".")[1];

    if (!payloadSegment) {
      return fallbackSeconds;
    }

    const normalized = payloadSegment
      .replace(/-/g, "+")
      .replace(/_/g, "/")
      .padEnd(Math.ceil(payloadSegment.length / 4) * 4, "=");
    const payload = JSON.parse(atob(normalized)) as { exp?: number };

    const expiresAt = payload.exp;

    if (!Number.isFinite(expiresAt)) {
      return fallbackSeconds;
    }

    return Math.max(1, Math.floor((expiresAt as number) - Date.now() / 1000));
  } catch {
    return fallbackSeconds;
  }
}
