import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { validateCsrfRequest } from "@/lib/auth/csrf";
import { getDashboardApiBaseUrl } from "@/lib/dashboard/api-client";

export async function POST(request: NextRequest) {
  if (!validateCsrfRequest(request)) {
    return NextResponse.json(
      { message: "Security check expired. Refresh the page and try again." },
      { status: 403 },
    );
  }

  const baseUrl = getDashboardApiBaseUrl();
  if (!baseUrl) {
    return NextResponse.json(
      { message: "Student portal verification is temporarily unavailable." },
      { status: 503 },
    );
  }

  const upstreamResponse = await fetch(`${baseUrl}/auth/student/otp/request`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "x-auth-audience": "portal",
    },
    body: await request.text(),
    cache: "no-store",
  });

  return new NextResponse(await upstreamResponse.text(), {
    status: upstreamResponse.status,
    headers: {
      "content-type": upstreamResponse.headers.get("content-type") ?? "application/json",
    },
  });
}
