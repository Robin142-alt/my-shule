import type { NextRequest } from "next/server";

import { proxySchoolApiRequest } from "@/lib/dashboard/server-api-proxy";

const schoolsContext = { params: { path: ["schools"] } };

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  return proxySchoolApiRequest(request, schoolsContext, "/platform", {
    audience: "superadmin",
  });
}

export async function POST(request: NextRequest) {
  return proxySchoolApiRequest(request, schoolsContext, "/platform", {
    audience: "superadmin",
  });
}
