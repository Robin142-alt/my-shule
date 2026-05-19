import type { NextRequest } from "next/server";

import { proxySchoolApiRequest } from "@/lib/dashboard/server-api-proxy";

type RouteContext = {
  params: Promise<{ path?: string[] }> | { path?: string[] };
};

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, context: RouteContext) {
  return proxyClinicRequest(request, context);
}

export async function POST(request: NextRequest, context: RouteContext) {
  return proxyClinicRequest(request, context);
}

async function proxyClinicRequest(request: NextRequest, context: RouteContext) {
  const params = await context.params;
  const isParentRoute = params.path?.[0] === "parent";

  return proxySchoolApiRequest(
    request,
    { params },
    "/clinic",
    { audience: isParentRoute ? "portal" : "school" },
  );
}
