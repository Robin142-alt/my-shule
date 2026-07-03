import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

import { createServerAuthClient } from "@/lib/auth/server-auth-client";
import {
  readExperienceSessionCookie,
  readTenantCookie,
  resolveSchoolTenantSlug,
} from "@/lib/auth/server-session";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const cookieStore = await cookies();
  const session = readExperienceSessionCookie(cookieStore, "school");

  if (!session || session.experience !== "school") {
    return NextResponse.json(
      { message: "A signed-in school session is required.", data: [] },
      { status: 401 },
    );
  }

  const requestUrl = new URL(request.url);
  const { tenantSlug, tenantMismatch } = resolveSchoolTenantSlug({
    requestedTenantSlug: requestUrl.searchParams.get("schoolId"),
    tenantCookie: readTenantCookie(cookieStore),
    sessionTenantSlug: session.tenantSlug,
  });

  if (tenantMismatch || tenantSlug !== session.tenantSlug) {
    return NextResponse.json(
      { message: "Requested school permissions do not match the signed-in session.", data: [] },
      { status: 403 },
    );
  }

  try {
    const authClient = createServerAuthClient(request);
    const activeSession = await authClient.me("school", cookieStore);

    return NextResponse.json({ data: activeSession.user.permissions ?? [] });
  } catch (error) {
    return NextResponse.json(
      {
        message: error instanceof Error ? error.message : "Unable to load school permissions.",
        data: [],
      },
      { status: 401 },
    );
  }
}
