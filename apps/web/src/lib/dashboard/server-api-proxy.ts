import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { validateCsrfRequest } from "@/lib/auth/csrf";
import { createServerAuthClient } from "@/lib/auth/server-auth-client";
import {
  clearExperienceSessionCookies,
  readAccessCookie,
  readExperienceSessionCookie,
  readTenantCookie,
  setExperienceSessionCookies,
} from "@/lib/auth/server-session";
import { getDashboardApiBaseUrl } from "@/lib/dashboard/api-client";
import { resolveDashboardApiProxyTenant, type DashboardApiProxyAudience } from "@/lib/dashboard/proxy-tenant-context";
import { fetchWithSessionRefresh } from "@/lib/dashboard/session-refreshing-fetch";

type CatchAllContext = {
  params: Promise<{ path?: string[] }> | { path?: string[] };
};

const MAX_PROXY_UPLOAD_BYTES = 11 * 1024 * 1024;
const EVENT_STREAM_CONTENT_TYPE = "text/event-stream";

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
  options?: {
    requireSchoolSession?: boolean;
    audience?: DashboardApiProxyAudience;
  },
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

  if ((options?.requireSchoolSession ?? true) && (!session || !accessToken)) {
    const response = NextResponse.json(
      { message: "A signed-in session is required." },
      { status: 401 },
    );
    clearExperienceSessionCookies(response);
    return response;
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

  const baseUrl = getDashboardApiBaseUrl(tenantSlug ?? undefined);

  if (!baseUrl) {
    return NextResponse.json(
      { message: "Live API is unavailable for this request." },
      { status: 503 },
    );
  }

  const params = await context.params;
  const upstreamPath = `${upstreamPrefix}/${(params.path ?? []).join("/")}`.replace(/\/$/, "");
  const upstreamQuery = new URLSearchParams(requestUrl.searchParams);
  upstreamQuery.delete("tenantSlug");
  const query = upstreamQuery.toString();
  const body =
    request.method === "GET" || request.method === "HEAD"
      ? undefined
      : await request.arrayBuffer();
  const contentType = request.headers.get("content-type");
  const acceptHeader = request.headers.get("accept") ?? "application/json";
  const wantsEventStream = acceptHeader.toLowerCase().includes(EVENT_STREAM_CONTENT_TYPE);
  const upstreamUrl = `${baseUrl}${upstreamPath}${query ? `?${query}` : ""}`;
  const sendUpstream = (token: string) =>
    fetch(upstreamUrl, {
      method: request.method,
      headers: {
        Accept: wantsEventStream ? EVENT_STREAM_CONTENT_TYPE : "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(body && contentType ? { "Content-Type": contentType } : {}),
        "x-auth-audience": audience,
        ...(tenantSlug ? { "x-tenant-id": tenantSlug } : {}),
      },
      body: body && body.byteLength > 0 ? body : undefined,
      cache: "no-store",
    });

  if (wantsEventStream) {
    const upstreamResponse = await sendUpstream(accessToken ?? "");

    return new NextResponse(upstreamResponse.body, {
      status: upstreamResponse.status,
      headers: {
        "cache-control": "no-store, no-transform",
        "content-type": upstreamResponse.headers.get("content-type") ?? EVENT_STREAM_CONTENT_TYPE,
        "x-accel-buffering": "no",
      },
    });
  }

  const { response: upstreamResponse, body: responseBody, refreshedSession, sessionExpired } =
    await fetchWithSessionRefresh({
      accessToken,
      send: sendUpstream,
      refreshSession: () =>
        createServerAuthClient(request).refresh(
          {
            audience,
            tenantSlug,
          },
          cookieStore,
        ),
    });

  const response = new NextResponse(responseBody, {
    status: upstreamResponse.status,
    headers: {
      "content-type": upstreamResponse.headers.get("content-type") ?? "application/json",
    },
  });

  if (refreshedSession) {
    setExperienceSessionCookies(response, refreshedSession);
  }

  if (sessionExpired) {
    clearExperienceSessionCookies(response);
    response.headers.set("x-myshule-session-expired", "1");
  }

  return response;
}
