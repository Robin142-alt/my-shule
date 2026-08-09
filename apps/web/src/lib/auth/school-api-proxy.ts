import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import {
  createServerAuthClient,
  getServerAuthErrorStatus,
  isServerAuthUnauthorized,
} from "@/lib/auth/server-auth-client";
import {
  clearExperienceSessionCookies,
  readAccessCookie,
  readAudienceCookie,
  readExperienceSessionCookie,
  readRefreshCookie,
  readRememberSessionCookie,
  readTenantCookie,
  setExperienceSessionCookies,
} from "@/lib/auth/server-session";
import { getDashboardApiBaseUrl } from "@/lib/dashboard/api-client";

type SchoolApiSession = {
  accessToken: string;
  baseUrl: string;
  tenantSlug: string;
};

type SchoolProxyRequest = {
  request: Request;
  path: string;
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  unavailableMessage: string;
  unwrapResponseEnvelope?: boolean;
};

export async function proxySchoolApiRequest(input: SchoolProxyRequest) {
  let session = await getSchoolApiSession();
  let didRefreshSession = false;

  if (!session) {
    const response = NextResponse.json(
      { message: "A signed-in school session is required." },
      { status: 401 },
    );
    clearExperienceSessionCookies(response);
    return response;
  }

  let refreshedSession:
    | Awaited<ReturnType<typeof refreshSchoolApiSession>>
    | undefined;

  if (!session.accessToken) {
    try {
      refreshedSession = await refreshSchoolApiSession(input.request, session.tenantSlug);
      session = {
        accessToken: refreshedSession.accessToken,
        baseUrl: refreshedSession.baseUrl,
        tenantSlug: refreshedSession.tenantSlug,
      };
      didRefreshSession = true;
    } catch (error) {
      return createSchoolAuthFailureResponse(error);
    }
  }

  let response = await fetchSchoolApi(session, input);
  let payload = await response.json().catch(() => null);

  // Role baselines can add a permission after a long-lived school session was
  // created. Refresh once on a 403 so the retried request uses the current
  // tenant-scoped permission snapshot, then return a genuine denial unchanged.
  const needsSessionRefresh = response.status === 401 || response.status === 403;

  if (!needsSessionRefresh) {
    const nextResponse = createSchoolApiResponse(response, payload, input);

    if (refreshedSession) {
      setExperienceSessionCookies(nextResponse, refreshedSession.session, {
        rememberSession: refreshedSession.rememberSession,
      });
    }

    return nextResponse;
  }

  if (didRefreshSession) {
    const nextResponse = createSchoolApiResponse(response, payload, input);
    if (response.status === 401) {
      clearExperienceSessionCookies(nextResponse);
      nextResponse.headers.set("x-myshule-session-expired", "1");
    } else if (refreshedSession) {
      setExperienceSessionCookies(nextResponse, refreshedSession.session, {
        rememberSession: refreshedSession.rememberSession,
      });
    }
    return nextResponse;
  }

  try {
    refreshedSession = await refreshSchoolApiSession(input.request, session.tenantSlug);
  } catch (error) {
    return createSchoolAuthFailureResponse(error, payload);
  }

  response = await fetchSchoolApi(
    {
      accessToken: refreshedSession.accessToken,
      baseUrl: refreshedSession.baseUrl,
      tenantSlug: refreshedSession.tenantSlug,
    },
    input,
  );
  payload = await response.json().catch(() => null);

  const nextResponse = createSchoolApiResponse(response, payload, input);

  if (response.status === 401) {
    clearExperienceSessionCookies(nextResponse);
    nextResponse.headers.set("x-myshule-session-expired", "1");
  } else {
    setExperienceSessionCookies(nextResponse, refreshedSession.session, {
      rememberSession: refreshedSession.rememberSession,
    });
  }

  return nextResponse;
}

export function unwrapSchoolApiResponseEnvelope(payload: unknown) {
  if (
    !payload
    || typeof payload !== "object"
    || Array.isArray(payload)
    || !Object.prototype.hasOwnProperty.call(payload, "data")
  ) {
    return payload;
  }

  return (payload as { data?: unknown }).data;
}

function createSchoolApiResponse(
  response: Response,
  payload: unknown,
  input: SchoolProxyRequest,
) {
  const shouldUnwrap = input.unwrapResponseEnvelope && response.ok;
  const normalizedPayload = shouldUnwrap
    ? unwrapSchoolApiResponseEnvelope(payload)
    : payload;

  if (shouldUnwrap && normalizedPayload == null) {
    return NextResponse.json(
      { message: input.unavailableMessage },
      { status: 502 },
    );
  }

  return NextResponse.json(normalizedPayload ?? {}, {
    status: response.status,
  });
}

async function getSchoolApiSession(): Promise<SchoolApiSession | null> {
  const cookieStore = await cookies();
  const tenantSlug = readTenantCookie(cookieStore);
  const audience = readAudienceCookie(cookieStore);
  const publicSession = readExperienceSessionCookie(cookieStore, "school");
  const accessToken = readAccessCookie(cookieStore);
  const refreshToken = readRefreshCookie(cookieStore);
  const baseUrl = tenantSlug ? getDashboardApiBaseUrl() : null;

  if (
    !tenantSlug
    || !baseUrl
    || (!accessToken && !refreshToken)
    || audience !== "school"
    || !publicSession
    || publicSession.experience !== "school"
    || publicSession.tenantSlug !== tenantSlug
  ) {
    return null;
  }

  return { accessToken, baseUrl, tenantSlug };
}

async function refreshSchoolApiSession(request: Request, tenantSlug: string) {
  const authClient = createServerAuthClient(request);
  const cookieStore = await cookies();
  const session = await authClient.refresh(
    { audience: "school", tenantSlug },
    cookieStore,
  );
  const resolvedTenantSlug = session.tenantSlug ?? tenantSlug;
  const baseUrl = getDashboardApiBaseUrl();

  if (!baseUrl) {
    throw new Error("Live school API is unavailable.");
  }

  return {
    accessToken: session.accessToken,
    baseUrl,
    tenantSlug: resolvedTenantSlug,
    session,
    rememberSession: readRememberSessionCookie(cookieStore),
  };
}

function createSchoolAuthFailureResponse(error: unknown, payload?: unknown) {
  const sessionExpired = isServerAuthUnauthorized(error);
  const status = sessionExpired ? 401 : getServerAuthErrorStatus(error);
  const message =
    error instanceof Error && error.message.trim()
      ? error.message
      : "Authentication service is temporarily unavailable. Please try again shortly.";
  const response = NextResponse.json(
    payload && sessionExpired ? payload : { message },
    { status },
  );

  if (sessionExpired) {
    clearExperienceSessionCookies(response);
    response.headers.set("x-myshule-session-expired", "1");
  }

  return response;
}

function fetchSchoolApi(session: SchoolApiSession, input: SchoolProxyRequest) {
  const requestUrl = new URL(input.request.url);
  const query = requestUrl.searchParams.toString();
  const upstreamPath = query
    ? `${input.path}${input.path.includes("?") ? "&" : "?"}${query}`
    : input.path;

  return fetch(`${session.baseUrl}${upstreamPath}`, {
    method: input.method,
    headers: {
      Accept: "application/json",
      ...(input.body === undefined ? {} : { "Content-Type": "application/json" }),
      Authorization: `Bearer ${session.accessToken}`,
      "x-auth-audience": "school",
      "x-tenant-id": session.tenantSlug,
    },
    body: input.body === undefined ? undefined : JSON.stringify(input.body),
    cache: "no-store",
  });
}
