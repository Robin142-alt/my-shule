import type { NextRequest } from "next/server";

import { proxySchoolApiRequest } from "@/lib/dashboard/server-api-proxy";

type RouteContext = {
  params: Promise<{ path?: string[] }>;
};

export const dynamic = "force-dynamic";

async function getRouteContext(request: NextRequest, context: RouteContext): Promise<RouteContext> {
  const resolvedParams = await context.params;
  const path = [...(resolvedParams.path ?? [])];
  if (request.method === "POST") {
    const joinedPath = path.join("/");
    if (joinedPath === "frontoffice/visitors") {
      path[1] = "visitor";
    } else if (joinedPath === "frontoffice/appointments") {
      path[1] = "appointment";
    } else if (joinedPath === "frontoffice/mail") {
      path[1] = "dispatch";
    }
  }
  return {
    params: Promise.resolve({ path })
  };
}

export async function GET(request: NextRequest, context: RouteContext) {
  const ctx = await getRouteContext(request, context);
  return proxySchoolApiRequest(request, ctx, "/admin-command");
}

export async function POST(request: NextRequest, context: RouteContext) {
  const ctx = await getRouteContext(request, context);
  return proxySchoolApiRequest(request, ctx, "/admin-command");
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const ctx = await getRouteContext(request, context);
  return proxySchoolApiRequest(request, ctx, "/admin-command");
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const ctx = await getRouteContext(request, context);
  return proxySchoolApiRequest(request, ctx, "/admin-command");
}

export async function PUT(request: NextRequest, context: RouteContext) {
  const ctx = await getRouteContext(request, context);
  return proxySchoolApiRequest(request, ctx, "/admin-command");
}
