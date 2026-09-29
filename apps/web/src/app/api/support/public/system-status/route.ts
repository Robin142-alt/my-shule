import { getClientIdentityHeaders } from "@/lib/auth/client-identity";
import { NextResponse } from "next/server";

import { getDashboardApiBaseUrl } from "@/lib/dashboard/api-client";

export const dynamic = "force-dynamic";

const STATUS_UNAVAILABLE_MESSAGE =
  "System status is temporarily unavailable. Please try again shortly.";

export async function GET(request: Request) {
  const baseUrl = getDashboardApiBaseUrl();

  if (!baseUrl) {
    return NextResponse.json(
      { message: STATUS_UNAVAILABLE_MESSAGE },
      { status: 503 },
    );
  }

  const upstreamResponse = await fetch(`${baseUrl}/support/public/system-status`, {
    method: "GET",
    headers: {
      Accept: "application/json",
      ...getClientIdentityHeaders(request),
    },
    cache: "no-store",
  });
  const responseBody = await upstreamResponse.text();

  return new NextResponse(responseBody, {
    status: upstreamResponse.status,
    headers: {
      "content-type": upstreamResponse.headers.get("content-type") ?? "application/json",
    },
  });
}
