import { cookies } from "next/headers";
import type { NextRequest } from "next/server";

import { isExperienceAudience } from "@/lib/auth/experience-audience";
import { readAudienceCookie } from "@/lib/auth/server-session";
import { proxySchoolApiRequest } from "@/lib/dashboard/server-api-proxy";

type RouteContext = {
  params: Promise<{ path?: string[] }> | { path?: string[] };
};

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, context: RouteContext) {
  return proxyObservabilityRequest(request, context);
}

export async function POST(request: NextRequest, context: RouteContext) {
  return proxyObservabilityRequest(request, context);
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  return proxyObservabilityRequest(request, context);
}

async function proxyObservabilityRequest(
  request: NextRequest,
  context: RouteContext,
) {
  const cookieStore = await cookies();
  const requestedAudience = new URL(request.url).searchParams.get("audience");
  const storedAudience = readAudienceCookie(cookieStore);
  const audience = isExperienceAudience(requestedAudience)
    ? requestedAudience
    : isExperienceAudience(storedAudience)
      ? storedAudience
      : "school";

  return proxySchoolApiRequest(request, context, "/observability", {
    audience,
    omitQueryParams: ["audience"],
  });
}
