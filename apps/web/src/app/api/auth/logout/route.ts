import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";

import { validateCsrfRequest } from "@/lib/auth/csrf";
import { clearExperienceSessionCookies } from "@/lib/auth/server-session";
import { createServerAuthClient, getServerAuthErrorStatus } from "@/lib/auth/server-auth-client";

export async function POST(request: NextRequest) {
  if (!validateCsrfRequest(request)) {
    return NextResponse.json(
      { message: "Security check expired. Refresh the page and try again." },
      { status: 403 },
    );
  }

  try {
    await createServerAuthClient(request).logoutRegularSession(await cookies());
  } catch (error) {
    return NextResponse.json({ message: "Unable to revoke this session. Please retry sign out." }, { status: getServerAuthErrorStatus(error) });
  }
  const response = NextResponse.json({ success: true });
  clearExperienceSessionCookies(response);
  return response;
}
