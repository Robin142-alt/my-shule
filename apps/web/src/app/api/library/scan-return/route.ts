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
import {
  checkSchoolModuleAccess,
  getSchoolModuleAccessFailureMessage,
  getSchoolModuleAccessFailureStatus,
} from "@/lib/module-access/server-school-module-access";

export async function POST(request: NextRequest) {
  if (!validateCsrfRequest(request)) {
    return NextResponse.json(
      { synced: false, message: "Security check expired. Refresh the page and try again." },
      { status: 403 },
    );
  }

  const cookieStore = await cookies();
  const session = readExperienceSessionCookie(cookieStore, "school");

  if (!session || session.experience !== "school" || !["librarian", "admin", "owner"].includes(session.role ?? "")) {
    return NextResponse.json(
      { synced: false, message: "Librarian library access is required." },
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
      { synced: false, message: "Librarian session expired. Sign in again to return the book." },
      { status: 401 },
    );
  }

  const moduleAccess = await checkSchoolModuleAccess({
    tenantId,
    accessToken,
    moduleCode: "library",
  });

  if (!moduleAccess.enabled) {
    return NextResponse.json(
      {
        synced: false,
        message:
          moduleAccess.reason === "module_disabled"
            ? "Module not enabled for your school"
            : getSchoolModuleAccessFailureMessage(moduleAccess),
      },
      { status: getSchoolModuleAccessFailureStatus(moduleAccess) },
    );
  }

  if (!isDashboardApiConfigured()) {
    return NextResponse.json(
      { synced: false, message: "Live library API is not configured." },
      { status: 503 },
    );
  }

  try {
    const upstream = await requestDashboardApi("/library/circulation/return", {
      method: "POST",
      tenantId,
      accessToken,
      body: await request.json(),
      unwrapEnvelope: false,
    });

    return NextResponse.json({ synced: true, message: "Book returned from scanner.", upstream });
  } catch (error) {
    return NextResponse.json(
      { synced: false, message: error instanceof Error ? error.message : "Scanner return failed." },
      { status: 502 },
    );
  }
}
