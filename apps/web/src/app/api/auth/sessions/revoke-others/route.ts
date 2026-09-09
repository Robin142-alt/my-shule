import type { NextRequest } from "next/server";
import { proxySchoolApiRequest } from "@/lib/dashboard/server-api-proxy";

export async function POST(request: NextRequest) {
  return proxySchoolApiRequest(request, { params: { path: [] } }, "/auth/my-sessions/revoke-others");
}
