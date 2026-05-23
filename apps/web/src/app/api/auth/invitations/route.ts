import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { validateCsrfRequest } from "@/lib/auth/csrf";
import { proxySchoolApiRequest } from "@/lib/auth/school-api-proxy";

const unavailableMessage =
  "Live invitation management is not available for this session.";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    return proxySchoolApiRequest({
      request,
      path: "/auth/invitations",
      method: "GET",
      unavailableMessage,
      fallbackPayload: { users: [] },
    });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Unable to load invitations.",
      },
      { status: 400 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!validateCsrfRequest(request)) {
      return NextResponse.json(
        { message: "Security check expired. Refresh the page and try again." },
        { status: 403 },
      );
    }

    const body = await request.json();
    return proxySchoolApiRequest({
      request,
      path: "/auth/invitations",
      method: "POST",
      body,
      unavailableMessage,
    });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Unable to create invitation.",
      },
      { status: 400 },
    );
  }
}
