import type { NextRequest } from "next/server";

import { proxySchoolApiRequest } from "@/lib/dashboard/server-api-proxy";

type RouteContext = {
  params: Promise<{ path?: string[] }>;
};

export const dynamic = "force-dynamic";

const platformProxyOptions = {
  audience: "superadmin" as const,
  requireSchoolSession: false,
};

export async function GET(request: NextRequest, context: RouteContext) {
  return proxySchoolApiRequest(request, context, "/platform", platformProxyOptions);
}

export async function POST(request: NextRequest, context: RouteContext) {
  return proxySchoolApiRequest(request, context, "/platform", platformProxyOptions);
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  return proxySchoolApiRequest(request, context, "/platform", platformProxyOptions);
}

export async function PUT(request: NextRequest, context: RouteContext) {
  return proxySchoolApiRequest(request, context, "/platform", platformProxyOptions);
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  return proxySchoolApiRequest(request, context, "/platform", platformProxyOptions);
}
