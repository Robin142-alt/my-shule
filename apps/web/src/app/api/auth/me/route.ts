import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { isExperienceAudience } from "@/lib/auth/experience-audience";
import {
  createServerAuthClient,
  getServerAuthErrorStatus,
  isServerAuthUnauthorized,
} from "@/lib/auth/server-auth-client";
import {
  readRememberSessionCookie,
  readTenantCookie,
  setExperienceSessionCookies,
  toPublicExperienceGatewaySession,
} from "@/lib/auth/server-session";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const audience = searchParams.get("audience");

  if (!isExperienceAudience(audience)) {
    return NextResponse.json(
      { message: "Unsupported authentication audience." },
      { status: 400 },
    );
  }

  try {
    const authClient = createServerAuthClient(request);
    const cookieStore = await cookies();
    let session;
    let refreshed = false;

    try {
      session = await authClient.me(audience, cookieStore);
    } catch (error) {
      if (!isServerAuthUnauthorized(error)) {
        throw error;
      }

      session = await authClient.refresh(
        {
          audience,
          tenantSlug:
            searchParams.get("tenantSlug") ?? readTenantCookie(cookieStore),
        },
        cookieStore,
      );
      refreshed = true;
    }

    const response = NextResponse.json({
      session: toPublicExperienceGatewaySession(session),
      user: session.user,
    });
    response.headers.set("Cache-Control", "private, no-store");
    // A delayed read must not restore cookies captured before a role switch.
    // Only an actual token rotation needs to issue session cookies.
    if (refreshed) {
      setExperienceSessionCookies(response, session, {
        rememberSession: readRememberSessionCookie(cookieStore),
      });
    }
    return response;
  } catch (error) {
    const response = NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "No active session found.",
      },
      { status: getServerAuthErrorStatus(error) },
    );
    // An in-flight read has an older cookie snapshot. Only explicit logout may
    // clear credentials; this response must not erase a completed role switch.
    return response;
  }
}
