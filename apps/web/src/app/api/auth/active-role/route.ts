import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { validateCsrfRequest } from "@/lib/auth/csrf";
import {
  createServerAuthClient,
  getServerAuthErrorStatus,
} from "@/lib/auth/server-auth-client";
import {
  readRememberSessionCookie,
  setExperienceSessionCookies,
  toPublicExperienceGatewaySession,
} from "@/lib/auth/server-session";

export async function POST(request: NextRequest) {
  try {
    if (!validateCsrfRequest(request)) {
      return NextResponse.json(
        { message: "Security check expired. Refresh the page and try again." },
        { status: 403 },
      );
    }

    const body = (await request.json().catch(() => null)) as
      | { role_code?: unknown }
      | null;
    if (typeof body?.role_code !== "string" || !body.role_code.trim()) {
      return NextResponse.json(
        { message: "Choose a valid dashboard role." },
        { status: 400 },
      );
    }

    const cookieStore = await cookies();
    const authClient = createServerAuthClient(request);
    const session = await authClient.switchActiveRole(body.role_code, cookieStore);
    const response = NextResponse.json({
      redirectTo: session.redirectTo,
      roleContext: session.roleContext,
      session: toPublicExperienceGatewaySession(session),
      user: session.user,
    });

    setExperienceSessionCookies(response, session, {
      rememberSession: readRememberSessionCookie(cookieStore),
    });

    return response;
  } catch (error) {
    const response = NextResponse.json(
      {
        message: error instanceof Error
          ? error.message
          : "Unable to switch dashboards.",
      },
      { status: getServerAuthErrorStatus(error) },
    );

    // Do not erase credentials issued by a newer request in this browser.

    return response;
  }
}
