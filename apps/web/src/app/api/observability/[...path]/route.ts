import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { validateCsrfRequest } from "@/lib/auth/csrf";
import { isExperienceAudience } from "@/lib/auth/experience-audience";
import {
  readAccessCookie,
  readAudienceCookie,
  readTenantCookie,
} from "@/lib/auth/server-session";
import { getDashboardApiBaseUrl } from "@/lib/dashboard/api-client";

type RouteContext = {
  params: Promise<{ path?: string[] }> | { path?: string[] };
};

export const dynamic = "force-dynamic";

const UNAVAILABLE_MESSAGE =
  "Observability service is temporarily unavailable. Please try again shortly.";

export async function GET(request: NextRequest, context: RouteContext) {
  return proxyRequest(request, context);
}

export async function POST(request: NextRequest, context: RouteContext) {
  return proxyRequest(request, context);
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  return proxyRequest(request, context);
}

async function proxyRequest(request: NextRequest, context: RouteContext) {
  if (request.method !== "GET" && !validateCsrfRequest(request)) {
    return NextResponse.json(
      { message: "Security check expired. Refresh the page and try again." },
      { status: 403 },
    );
  }

  const cookieStore = await cookies();
  const accessToken = readAccessCookie(cookieStore);

  if (!accessToken) {
    return NextResponse.json(
      { message: "A signed-in session is required for observability operations." },
      { status: 401 },
    );
  }

  const requestUrl = new URL(request.url);
  const tenantSlug = requestUrl.searchParams.get("tenantSlug") ?? readTenantCookie(cookieStore);
  const audienceParam = requestUrl.searchParams.get("audience");
  const audience = isExperienceAudience(audienceParam)
    ? audienceParam
    : readAudienceCookie(cookieStore) ?? "school";
  const baseUrl = getDashboardApiBaseUrl();

  if (!baseUrl) {
    return NextResponse.json(
      { message: UNAVAILABLE_MESSAGE },
      { status: 503 },
    );
  }

  const params = await context.params;
  const pathPart = `/observability/${(params.path ?? []).join("/")}`;
  const upstreamQuery = new URLSearchParams(requestUrl.searchParams);
  upstreamQuery.delete("tenantSlug");
  upstreamQuery.delete("audience");
  const query = upstreamQuery.toString();

  const body = await buildProxyBody(request);

  const upstreamResponse = await fetch(`${baseUrl}${pathPart}${query ? `?${query}` : ""}`, {
    method: request.method,
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${accessToken}`,
      "x-auth-audience": audience,
      ...(tenantSlug ? { "x-tenant-id": tenantSlug } : {}),
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    ...(body ? { body } : {}),
    cache: "no-store",
  });
  const responseBody = await upstreamResponse.text();

  return new NextResponse(responseBody, {
    status: upstreamResponse.status,
    headers: {
      "content-type": upstreamResponse.headers.get("content-type") ?? "application/json",
    },
  });
}

async function buildProxyBody(request: Request) {
  if (request.method === "GET" || request.method === "HEAD") {
    return undefined;
  }

  const body = await request.text();
  return body.length > 0 ? body : undefined;
}
