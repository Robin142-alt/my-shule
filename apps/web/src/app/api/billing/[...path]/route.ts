import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { validateCsrfRequest } from "@/lib/auth/csrf";
import {
  clearExperienceSessionCookies,
  readAccessCookie,
  readExperienceSessionCookie,
  readTenantCookie,
  resolveSchoolTenantSlug,
} from "@/lib/auth/server-session";
import { getDashboardApiBaseUrl } from "@/lib/dashboard/api-client";

type RouteContext = {
  params: Promise<{ path?: string[] }> | { path?: string[] };
};

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, context: RouteContext) {
  return proxyBillingRequest(request, context);
}

export async function POST(request: NextRequest, context: RouteContext) {
  return proxyBillingRequest(request, context);
}

async function proxyBillingRequest(request: NextRequest, context: RouteContext) {
  if (request.method !== "GET" && !validateCsrfRequest(request)) {
    return NextResponse.json(
      { message: "Security check expired. Refresh the page and try again." },
      { status: 403 },
    );
  }

  const cookieStore = await cookies();
  const session = readExperienceSessionCookie(cookieStore, "school");
  const accessToken = readAccessCookie(cookieStore);

  if (!session || session.experience !== "school" || !accessToken) {
    const response = NextResponse.json(
      { message: "A signed-in school finance session is required." },
      { status: 401 },
    );
    clearExperienceSessionCookies(response);
    return response;
  }

  const requestUrl = new URL(request.url);
  const { tenantSlug, tenantMismatch } = resolveSchoolTenantSlug({
    requestedTenantSlug: requestUrl.searchParams.get("tenantSlug"),
    tenantCookie: readTenantCookie(cookieStore),
    sessionTenantSlug: session.tenantSlug,
  });

  if (tenantMismatch) {
    return NextResponse.json(
      { message: "Requested school workspace does not match the signed-in session." },
      { status: 403 },
    );
  }

  const baseUrl = getDashboardApiBaseUrl(tenantSlug ?? undefined);

  if (!tenantSlug || !baseUrl) {
    return NextResponse.json(
      { message: "Live billing API is unavailable for this school workspace." },
      { status: 503 },
    );
  }

  const params = await context.params;
  const billingPath = `/billing/${(params.path ?? []).join("/")}`;
  const upstreamQuery = new URLSearchParams(requestUrl.searchParams);
  upstreamQuery.delete("tenantSlug");
  const query = upstreamQuery.toString();
  const body = request.method === "GET" ? undefined : await request.text();
  const upstreamResponse = await fetch(`${baseUrl}${billingPath}${query ? `?${query}` : ""}`, {
    method: request.method,
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "x-auth-audience": "school",
      "x-tenant-id": tenantSlug,
    },
    body: body && body.length > 0 ? body : undefined,
    cache: "no-store",
  });
  const responseBody = await upstreamResponse.text();

  const response = new NextResponse(responseBody, {
    status: upstreamResponse.status,
    headers: {
      "content-type": upstreamResponse.headers.get("content-type") ?? "application/json",
    },
  });

  if (upstreamResponse.status === 401) {
    clearExperienceSessionCookies(response);
    response.headers.set("x-myshule-session-expired", "1");
  }

  return response;
}
