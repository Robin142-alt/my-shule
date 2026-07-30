import type { NextRequest } from "next/server";

import { proxySchoolApiRequest } from "@/lib/dashboard/server-api-proxy";

type RouteContext = {
  params: Promise<{ path?: string[] }> | { path?: string[] };
};

export const dynamic = "force-dynamic";

function proxyBillingRequest(request: NextRequest, context: RouteContext) {
  return proxySchoolApiRequest(request, context, "/billing");
}

export function GET(request: NextRequest, context: RouteContext) {
  return proxyBillingRequest(request, context);
}

export function POST(request: NextRequest, context: RouteContext) {
  return proxyBillingRequest(request, context);
}

export function PUT(request: NextRequest, context: RouteContext) {
  return proxyBillingRequest(request, context);
}

export function PATCH(request: NextRequest, context: RouteContext) {
  return proxyBillingRequest(request, context);
}

export function DELETE(request: NextRequest, context: RouteContext) {
  return proxyBillingRequest(request, context);
}
