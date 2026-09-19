import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { validateCsrfRequest } from "@/lib/auth/csrf";
import {
  createServerAuthClient,
  getServerAuthErrorStatus,
  isServerAuthUnauthorized,
} from "@/lib/auth/server-auth-client";
import {
  clearExperienceSessionCookies,
  readAccessCookie,
  readExperienceSessionCookie,
  readRefreshCookie,
  readRememberSessionCookie,
  readTenantCookie,
  setExperienceSessionCookies,
  type ExperienceGatewaySession,
} from "@/lib/auth/server-session";
import { getDashboardApiBaseUrl } from "@/lib/dashboard/api-client";
import { resolveDashboardApiProxyTenant, type DashboardApiProxyAudience } from "@/lib/dashboard/proxy-tenant-context";
import { fetchWithSessionRefresh } from "@/lib/dashboard/session-refreshing-fetch";
import type { SchoolModuleAccessState } from "@/lib/module-access/server-school-module-access";

type CatchAllContext = {
  params: Promise<{ path?: string[] }> | { path?: string[] };
};

const MAX_PROXY_UPLOAD_BYTES = 11 * 1024 * 1024;
const EVENT_STREAM_CONTENT_TYPE = "text/event-stream";

type ProxyResponseEnvelope = {
  successMessage: string;
  defaultErrorMessage: string;
};

type RequiredModuleAccess = {
  check: (input: {
    tenantId: string | null | undefined;
    accessToken: string | null | undefined;
    moduleCode: string;
  }) => Promise<SchoolModuleAccessState>;
  moduleCode: string;
  disabledMessage: string;
};

type ProxyOptions = {
  requireSchoolSession?: boolean;
  audience?: DashboardApiProxyAudience;
  moduleAccess?: RequiredModuleAccess;
  omitQueryParams?: string[];
  requiredSchoolRoles?: string[];
  responseEnvelope?: ProxyResponseEnvelope;
};

function validateProxyBody(request: NextRequest) {
  if (request.method === "GET" || request.method === "HEAD") {
    return null;
  }

  const contentType = request.headers.get("content-type") ?? "";

  if (!contentType.toLowerCase().includes("multipart/form-data")) {
    return null;
  }

  const contentLengthHeader = request.headers.get("content-length");
  const contentLength = Number(contentLengthHeader);

  if (
    !contentLengthHeader
    || !Number.isFinite(contentLength)
    || !Number.isInteger(contentLength)
    || contentLength <= 0
  ) {
    return NextResponse.json(
      { message: "Upload size is required before files can be accepted." },
      { status: 411 },
    );
  }

  if (contentLength > MAX_PROXY_UPLOAD_BYTES) {
    return NextResponse.json(
      { message: "Upload is too large. Attachments must be 10 MB or smaller." },
      { status: 413 },
    );
  }

  return null;
}

export async function proxySchoolApiRequest(
  request: NextRequest,
  context: CatchAllContext,
  upstreamPrefix: string,
  options?: ProxyOptions,
) {
  if (request.method !== "GET" && !validateCsrfRequest(request)) {
    return NextResponse.json(
      { message: "Security check expired. Refresh the page and try again." },
      { status: 403 },
    );
  }

  const invalidBodyResponse = validateProxyBody(request);

  if (invalidBodyResponse) {
    return invalidBodyResponse;
  }

  const cookieStore = await cookies();
  const audience = options?.audience ?? "school";
  const session = readExperienceSessionCookie(cookieStore, audience);
  const accessToken = readAccessCookie(cookieStore);
  const refreshToken = readRefreshCookie(cookieStore);

  if (
    (options?.requireSchoolSession ?? true)
    && (!session || (!accessToken && !refreshToken))
  ) {
    const response = createProxyJsonResponse(
      401,
      "A signed-in session is required.",
      options?.responseEnvelope,
    );
    clearExperienceSessionCookies(response);
    return response;
  }

  if (
    options?.requiredSchoolRoles?.length
    && (
      audience !== "school"
      || !session
      || !("role" in session)
      || !options.requiredSchoolRoles.includes(session.role)
    )
  ) {
    return createProxyJsonResponse(
      403,
      "Your school role is not permitted to perform this action.",
      options.responseEnvelope,
    );
  }

  const requestUrl = new URL(request.url);
  const sessionTenantSlug =
    audience !== "superadmin" && session && "tenantSlug" in session ? session.tenantSlug : null;
  const { tenantSlug, tenantMismatch } = resolveDashboardApiProxyTenant({
    audience,
    requestedTenantSlug: requestUrl.searchParams.get("tenantSlug"),
    tenantCookie: readTenantCookie(cookieStore),
    sessionTenantSlug,
  });

  if (tenantMismatch) {
    return NextResponse.json(
      { message: "Requested school workspace does not match the signed-in session." },
      { status: 403 },
    );
  }

  const baseUrl = getDashboardApiBaseUrl();

  if (!baseUrl) {
    return NextResponse.json(
      { message: "Live API is unavailable for this request." },
      { status: 503 },
    );
  }

  let effectiveAccessToken = accessToken;
  let moduleRefreshSession: ExperienceGatewaySession | undefined;

  if (options?.moduleAccess) {
    let moduleAccess = await options.moduleAccess.check({
      tenantId: tenantSlug,
      accessToken: effectiveAccessToken,
      moduleCode: options.moduleAccess.moduleCode,
    });

    if (
      !moduleAccess.enabled
      && (
        moduleAccess.reason === "missing_session"
        || moduleAccess.reason === "session_expired"
      )
      && refreshToken
    ) {
      try {
        moduleRefreshSession = await createServerAuthClient(request).refresh(
          {
            audience,
            tenantSlug,
          },
          cookieStore,
        );
        effectiveAccessToken = moduleRefreshSession.accessToken;
        moduleAccess = await options.moduleAccess.check({
          tenantId: tenantSlug,
          accessToken: effectiveAccessToken,
          moduleCode: options.moduleAccess.moduleCode,
        });
      } catch (error) {
        const sessionExpired = isServerAuthUnauthorized(error);
        const response = createProxyJsonResponse(
          getServerAuthErrorStatus(error),
          getProxyErrorMessage(
            error,
            sessionExpired
              ? "Your school session expired. Sign in again to continue."
              : "The session service is temporarily unavailable. Please retry this request.",
          ),
          options.responseEnvelope,
        );

        if (sessionExpired) {
          clearExperienceSessionCookies(response);
          response.headers.set("x-myshule-session-expired", "1");
        }

        return response;
      }
    }

    if (!moduleAccess.enabled) {
      const sessionExpired =
        moduleAccess.reason === "missing_session"
        || moduleAccess.reason === "session_expired";
      const response = createProxyJsonResponse(
        sessionExpired
          ? 401
          : moduleAccess.reason === "module_status_unavailable"
            ? 503
            : 403,
        moduleAccess.reason === "module_disabled"
          ? options.moduleAccess.disabledMessage
          : sessionExpired
            ? "Your school session expired. Sign in again to continue."
            : "Module access could not be verified for your school.",
        options.responseEnvelope,
      );

      if (moduleRefreshSession) {
        setExperienceSessionCookies(response, moduleRefreshSession, {
          rememberSession: readRememberSessionCookie(cookieStore),
        });
      }

      if (sessionExpired) {
        clearExperienceSessionCookies(response);
        response.headers.set("x-myshule-session-expired", "1");
      }

      return response;
    }
  }

  const params = await context.params;
  const upstreamPath = `${upstreamPrefix}/${(params.path ?? []).join("/")}`.replace(/\/$/, "");
  const upstreamQuery = new URLSearchParams(requestUrl.searchParams);
  upstreamQuery.delete("tenantSlug");
  for (const queryParam of options?.omitQueryParams ?? []) {
    upstreamQuery.delete(queryParam);
  }
  const query = upstreamQuery.toString();
  const body =
    request.method === "GET" || request.method === "HEAD"
      ? undefined
      : await request.arrayBuffer();
  const contentType = request.headers.get("content-type");
  const acceptHeader = request.headers.get("accept") ?? "application/json";
  const wantsEventStream = acceptHeader.toLowerCase().includes(EVENT_STREAM_CONTENT_TYPE);
  const wantsReportCardPdf = upstreamPath.startsWith("/exams/report-cards/")
    && acceptHeader.toLowerCase().includes("application/pdf");
  const upstreamUrl = `${baseUrl}${upstreamPath}${query ? `?${query}` : ""}`;
  const sendUpstream = (token: string) =>
    fetch(upstreamUrl, {
      method: request.method,
      headers: {
        Accept: wantsEventStream ? EVENT_STREAM_CONTENT_TYPE : acceptHeader,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(body && contentType ? { "Content-Type": contentType } : {}),
        "x-auth-audience": audience,
        ...(tenantSlug ? { "x-tenant-id": tenantSlug } : {}),
      },
      body: body && body.byteLength > 0 ? body : undefined,
      cache: "no-store",
    });

  if (wantsEventStream || wantsReportCardPdf) {
    const {
      response: upstreamResponse,
      refreshedSession,
      refreshError,
      sessionExpired,
    } = await fetchWithSessionRefresh({
      accessToken: effectiveAccessToken,
      send: sendUpstream,
      refreshSession: () =>
        createServerAuthClient(request).refresh(
          {
            audience,
            tenantSlug,
          },
          cookieStore,
        ),
      isRefreshSessionExpired: isServerAuthUnauthorized,
      consumeResponseBody: false,
    });

    if (refreshError && !sessionExpired) {
      return createProxyJsonResponse(
        getServerAuthErrorStatus(refreshError),
        getProxyErrorMessage(
          refreshError,
          "The session service is temporarily unavailable. Please retry this request.",
        ),
        options?.responseEnvelope,
      );
    }

    const response = new NextResponse(upstreamResponse.body, {
      status: upstreamResponse.status,
      headers: {
        "cache-control": "no-store, no-transform",
        "content-type": upstreamResponse.headers.get("content-type") ?? (wantsReportCardPdf ? "application/pdf" : EVENT_STREAM_CONTENT_TYPE),
        ...(upstreamResponse.headers.get("content-disposition")
          ? { "content-disposition": upstreamResponse.headers.get("content-disposition")! } : {}),
        "x-accel-buffering": "no",
      },
    });

    const sessionToPersist = refreshedSession ?? moduleRefreshSession;

    if (sessionToPersist) {
      setExperienceSessionCookies(response, sessionToPersist, {
        rememberSession: readRememberSessionCookie(cookieStore),
      });
    }

    if (sessionExpired) {
      clearExperienceSessionCookies(response);
      response.headers.set("x-myshule-session-expired", "1");
    }

    return response;
  }

  const {
    response: upstreamResponse,
    body: responseBody,
    refreshedSession,
    refreshError,
    sessionExpired,
  } = await fetchWithSessionRefresh({
      accessToken: effectiveAccessToken,
      send: sendUpstream,
      refreshSession: () =>
        createServerAuthClient(request).refresh(
          {
            audience,
            tenantSlug,
          },
          cookieStore,
        ),
      isRefreshSessionExpired: isServerAuthUnauthorized,
    });

  if (refreshError && !sessionExpired) {
    return createProxyJsonResponse(
      getServerAuthErrorStatus(refreshError),
      getProxyErrorMessage(
        refreshError,
        "The session service is temporarily unavailable. Please retry this request.",
      ),
      options?.responseEnvelope,
    );
  }

  const response = options?.responseEnvelope
    ? createEnvelopedProxyResponse(
        upstreamResponse,
        responseBody,
        options.responseEnvelope,
      )
    : new NextResponse(responseBody, {
        status: upstreamResponse.status,
        headers: {
          "content-type": upstreamResponse.headers.get("content-type") ?? "application/json",
          ...(upstreamResponse.headers.get("content-disposition")
            ? { "content-disposition": upstreamResponse.headers.get("content-disposition")! }
            : {}),
          "cache-control": upstreamResponse.headers.get("cache-control") ?? "no-store",
        },
      });

  const sessionToPersist = refreshedSession ?? moduleRefreshSession;

  if (sessionToPersist) {
    setExperienceSessionCookies(response, sessionToPersist, {
      rememberSession: readRememberSessionCookie(cookieStore),
    });
  }

  if (sessionExpired) {
    clearExperienceSessionCookies(response);
    response.headers.set("x-myshule-session-expired", "1");
  }

  return response;
}

function createProxyJsonResponse(
  status: number,
  message: string,
  envelope?: ProxyResponseEnvelope,
) {
  return NextResponse.json(
    envelope
      ? { synced: false, message: message || envelope.defaultErrorMessage }
      : { message },
    { status },
  );
}

function createEnvelopedProxyResponse(
  upstreamResponse: Response,
  responseBody: ArrayBuffer,
  envelope: ProxyResponseEnvelope,
) {
  const payload = parseProxyResponseBody(responseBody);

  if (!upstreamResponse.ok) {
    return createProxyJsonResponse(
      upstreamResponse.status,
      getPayloadMessage(payload) ?? envelope.defaultErrorMessage,
      envelope,
    );
  }

  return NextResponse.json(
    {
      synced: true,
      message: envelope.successMessage,
      upstream: payload,
    },
    { status: upstreamResponse.status },
  );
}

function parseProxyResponseBody(responseBody: ArrayBuffer) {
  if (responseBody.byteLength === 0) {
    return null;
  }

  const responseText = new TextDecoder().decode(responseBody);

  try {
    return JSON.parse(responseText) as unknown;
  } catch {
    return responseText;
  }
}

function getPayloadMessage(payload: unknown) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return null;
  }

  const message = (payload as { message?: unknown }).message;

  if (typeof message === "string" && message.trim()) {
    return message;
  }

  if (Array.isArray(message)) {
    const normalized = message
      .filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0)
      .join(" ");

    return normalized || null;
  }

  return null;
}

function getProxyErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message.trim()
    ? error.message
    : fallback;
}
