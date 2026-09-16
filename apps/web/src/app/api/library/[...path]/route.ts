import type { NextRequest } from "next/server";

import { proxySchoolApiRequest } from "@/lib/dashboard/server-api-proxy";

type RouteContext = {
  params: Promise<{ path?: string[] }>;
};

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, context: RouteContext) {
  return proxyLibraryRequest(request, context);
}

export async function POST(request: NextRequest, context: RouteContext) {
  return proxyLibraryRequest(request, context);
}

async function proxyLibraryRequest(request: NextRequest, context: RouteContext) {
  const params = await context.params;
  const isParentRoute = params.path?.[0] === "parent";

  return proxySchoolApiRequest(
    request,
    { params },
    "/library",
    { audience: isParentRoute ? "portal" : "school" },
  );
}
