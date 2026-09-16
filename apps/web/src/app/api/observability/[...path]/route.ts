import type { NextRequest } from "next/server";

import { proxySchoolApiRequest } from "@/lib/dashboard/server-api-proxy";

type RouteContext = {
  params: Promise<{ path?: string[] }>;
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
  return proxySchoolApiRequest(request, context, "/observability", {
    audience: "superadmin",
    omitQueryParams: ["audience"],
  });
}
