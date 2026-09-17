import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import {
  createServerAuthClient,
  getServerAuthErrorStatus,
} from "@/lib/auth/server-auth-client";

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();
    const authClient = createServerAuthClient(request);
    const roleContext = await authClient.dashboardRoles(cookieStore);

    return NextResponse.json({
      roleContext,
    }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    const response = NextResponse.json(
      {
        message: error instanceof Error
          ? error.message
          : "Unable to load dashboard roles.",
      },
      { status: getServerAuthErrorStatus(error), headers: { "Cache-Control": "private, no-store" } },
    );

    // An in-flight role read can be rejected after switching invalidates its
    // access token. It must never clear the newly issued session cookies.

    return response;
  }
}
