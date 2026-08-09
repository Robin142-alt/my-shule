import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import {
  createServerAuthClient,
  getServerAuthErrorStatus,
  isServerAuthUnauthorized,
} from "@/lib/auth/server-auth-client";
import {
  clearExperienceSessionCookies,
} from "@/lib/auth/server-session";

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();
    const authClient = createServerAuthClient(request);
    const roleContext = await authClient.dashboardRoles(cookieStore);

    return NextResponse.json({
      roleContext,
    });
  } catch (error) {
    const response = NextResponse.json(
      {
        message: error instanceof Error
          ? error.message
          : "Unable to load dashboard roles.",
      },
      { status: getServerAuthErrorStatus(error) },
    );

    if (isServerAuthUnauthorized(error)) {
      clearExperienceSessionCookies(response);
    }

    return response;
  }
}
