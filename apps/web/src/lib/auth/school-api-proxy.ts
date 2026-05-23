import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { createServerAuthClient } from "@/lib/auth/server-auth-client";
import {
  readAccessCookie,
  readAudienceCookie,
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
  method: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  unavailableMessage: string;
  fallbackPayload?: unknown;
};

export async function proxySchoolApiRequest(input: SchoolProxyRequest) {
  const session = await getSchoolApiSession();

  if (!session) {
    return NextResponse.json(
      { message: input.unavailableMessage },
      { status: 503 },
    );
  }

  let response = await fetchSchoolApi(session, input);
  let payload = await response.json().catch(() => null);

  if (response.status !== 401) {
    return NextResponse.json(payload ?? input.fallbackPayload ?? {}, {
      status: response.status,
    });
  }

  const refreshedSession = await refreshSchoolApiSession(input.request, session.tenantSlug);

  if (!refreshedSession) {
    return NextResponse.json(payload ?? { message: "Session expired. Sign in again." }, {
      status: response.status,
    });
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

  const nextResponse = NextResponse.json(payload ?? input.fallbackPayload ?? {}, {
    status: response.status,
  });
  setExperienceSessionCookies(nextResponse, refreshedSession.session);

  return nextResponse;
}

async function getSchoolApiSession(): Promise<SchoolApiSession | null> {
  const cookieStore = await cookies();
  const tenantSlug = readTenantCookie(cookieStore);
  const audience = readAudienceCookie(cookieStore);
  const accessToken = readAccessCookie(cookieStore);
  const baseUrl = tenantSlug ? getDashboardApiBaseUrl(tenantSlug) : null;

  if (!tenantSlug || !baseUrl || !accessToken || audience !== "school") {
    return null;
  }

  return { accessToken, baseUrl, tenantSlug };
}

async function refreshSchoolApiSession(request: Request, tenantSlug: string) {
  try {
    const authClient = createServerAuthClient(request);
    const cookieStore = await cookies();
    const session = await authClient.refresh(
      { audience: "school", tenantSlug },
      cookieStore,
    );
    const resolvedTenantSlug = session.tenantSlug ?? tenantSlug;
    const baseUrl = getDashboardApiBaseUrl(resolvedTenantSlug);

    if (!baseUrl) {
      return null;
    }

    return {
      accessToken: session.accessToken,
      baseUrl,
      tenantSlug: resolvedTenantSlug,
      session,
    };
  } catch {
    return null;
  }
}

function fetchSchoolApi(session: SchoolApiSession, input: SchoolProxyRequest) {
  return fetch(`${session.baseUrl}${input.path}`, {
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
