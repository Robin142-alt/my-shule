import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { validateCsrfRequest } from "@/lib/auth/csrf";
import { proxySchoolApiRequest } from "@/lib/auth/school-api-proxy";

type RouteContext = {
  params: Promise<{ invitationId: string }> | { invitationId: string };
};

const unavailableMessage =
  "Live invitation management is not available for this session.";

export const dynamic = "force-dynamic";

export async function DELETE(request: NextRequest, context: RouteContext) {
  if (!validateCsrfRequest(request)) {
    return NextResponse.json(
      { message: "Security check expired. Refresh the page and try again." },
      { status: 403 },
    );
  }

  const params = await context.params;
  const invitationId = encodeURIComponent(params.invitationId);

  return proxySchoolApiRequest({
    request,
    path: `/auth/invitations/${invitationId}`,
    method: "DELETE",
    unavailableMessage,
  });
}
