import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { validateCsrfRequest } from "@/lib/auth/csrf";
import { isExperienceAudience } from "@/lib/auth/experience-audience";
import {
  createServerAuthClient,
  getServerAuthErrorStatus,
  isServerAuthUnauthorized,
} from "@/lib/auth/server-auth-client";
import {
  clearExperienceSessionCookies,
  readAudienceCookie,
  readRememberSessionCookie,
  readTenantCookie,
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

    const body = (await request.json()) as {
      audience?: string;
      tenantSlug?: string | null;
    };

    const cookieStore = await cookies();
    const cookieAudience = readAudienceCookie(cookieStore);
    const audience = body.audience ?? cookieAudience;

    if (!isExperienceAudience(audience)) {
      return NextResponse.json(
        { message: "Unsupported authentication audience." },
        { status: 400 },
      );
    }

    if (cookieAudience && body.audience && cookieAudience !== body.audience) {
      return NextResponse.json(
        { message: "Refresh audience does not match the active session." },
        { status: 400 },
      );
    }

    const authClient = createServerAuthClient(request);
    const session = await authClient.refresh(
      {
        audience,
        tenantSlug: body.tenantSlug ?? readTenantCookie(cookieStore),
      },
      cookieStore,
    );

    const response = NextResponse.json({
      redirectTo: session.redirectTo,
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
        message:
          error instanceof Error
            ? error.message
            : "Unable to refresh the current session.",
      },
      { status: getServerAuthErrorStatus(error) },
    );
    if (isServerAuthUnauthorized(error)) {
      clearExperienceSessionCookies(response);
    }
    return response;
  }
}
