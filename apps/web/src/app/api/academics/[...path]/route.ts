import type { NextRequest } from "next/server";

import { proxySchoolApiRequest } from "@/lib/dashboard/server-api-proxy";

type RouteContext = {
  params: Promise<{ path?: string[] }> | { path?: string[] };
};

export const dynamic = "force-dynamic";

async function getUpstreamPrefix(context: RouteContext) {
  const resolvedParams = await context.params;
  const pathArr = resolvedParams.path ?? [];
  const firstSegment = pathArr[0];
  if (
    firstSegment === "communications" ||
    firstSegment === "dean" ||
    firstSegment === "exams-manager" ||
    firstSegment === "grade-master" ||
    firstSegment === "hod" ||
    (firstSegment === "marks" && pathArr[1] === "enter")
  ) {
    return "/academic";
  }
  return "/academics";
}

export async function GET(request: NextRequest, context: RouteContext) {
  const prefix = await getUpstreamPrefix(context);
  return proxySchoolApiRequest(request, context, prefix);
}

export async function POST(request: NextRequest, context: RouteContext) {
  const prefix = await getUpstreamPrefix(context);
  return proxySchoolApiRequest(request, context, prefix);
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const prefix = await getUpstreamPrefix(context);
  return proxySchoolApiRequest(request, context, prefix);
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const prefix = await getUpstreamPrefix(context);
  return proxySchoolApiRequest(request, context, prefix);
}

export async function PUT(request: NextRequest, context: RouteContext) {
  const prefix = await getUpstreamPrefix(context);
  return proxySchoolApiRequest(request, context, prefix);
}
