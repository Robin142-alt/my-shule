import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { validateCsrfRequest } from "@/lib/auth/csrf";
import {
  readAccessCookie,
  readExperienceSessionCookie,
  readTenantCookie,
  resolveSchoolTenantSlug,
} from "@/lib/auth/server-session";
import {
  isDashboardApiConfigured,
  requestDashboardApi,
} from "@/lib/dashboard/api-client";

export async function POST(request: NextRequest) {
  if (!validateCsrfRequest(request)) {
    return NextResponse.json(
      { synced: false, message: "Security check expired. Refresh the page and try again." },
      { status: 403 },
    );
  }

  const cookieStore = await cookies();
  const session = readExperienceSessionCookie(cookieStore, "school");

  if (!session || session.experience !== "school" || session.role !== "storekeeper") {
    return NextResponse.json(
      { synced: false, message: "Storekeeper inventory access is required." },
      { status: 403 },
    );
  }

  const { tenantSlug: tenantId, tenantMismatch } = resolveSchoolTenantSlug({
    tenantCookie: readTenantCookie(cookieStore),
    sessionTenantSlug: session.tenantSlug,
  });
  const accessToken = readAccessCookie(cookieStore);

  if (tenantMismatch) {
    return NextResponse.json(
      { synced: false, message: "Requested school workspace does not match the signed-in session." },
      { status: 403 },
    );
  }

  if (!tenantId || !accessToken) {
    return NextResponse.json(
      {
        synced: false,
        message: "Storekeeper session expired. Sign in again to submit the stock request.",
      },
      { status: 401 },
    );
  }

  if (!isDashboardApiConfigured()) {
    return NextResponse.json(
      {
        synced: false,
        message: "Live inventory API is unavailable. The stock request was not submitted.",
      },
      { status: 503 },
    );
  }

  try {
    const upstream = await requestDashboardApi("/inventory/stock-requests", {
      method: "POST",
      tenantId,
      accessToken,
      body: await request.json(),
      unwrapEnvelope: false,
    });

    return NextResponse.json({
      synced: true,
      message: "Stock request synced to the live inventory API.",
      upstream,
    });
  } catch (error) {
    return NextResponse.json(
      {
        synced: false,
        message:
          error instanceof Error
            ? error.message
            : "Live inventory sync failed.",
      },
      { status: 502 },
    );
  }
}
