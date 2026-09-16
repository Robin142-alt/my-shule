import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { validateCsrfRequest } from "@/lib/auth/csrf";
import { proxySchoolApiRequest } from "@/lib/auth/school-api-proxy";

type RouteContext = {
  params: Promise<{ membershipId: string }>;
};

const unavailableMessage =
  "Live school user management is not available for this session.";

export const dynamic = "force-dynamic";

export async function PATCH(request: NextRequest, context: RouteContext) {
  if (!validateCsrfRequest(request)) {
    return NextResponse.json(
      { message: "Security check expired. Refresh the page and try again." },
      { status: 403 },
    );
  }

  const params = await context.params;
  const membershipId = encodeURIComponent(params.membershipId);
  const body = await request.json();

  return proxySchoolApiRequest({
    request,
    path: `/auth/tenant-users/${membershipId}`,
    method: "PATCH",
    body,
    unavailableMessage,
    unwrapResponseEnvelope: true,
  });
}
