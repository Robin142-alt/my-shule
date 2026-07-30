import type { NextRequest } from "next/server";

import { proxySchoolApiRequest } from "@/lib/dashboard/server-api-proxy";

export async function POST(request: NextRequest) {
  return proxySchoolApiRequest(
    request,
    { params: { path: [] } },
    "/inventory/stock-issues",
    {
      requiredSchoolRoles: ["storekeeper"],
      responseEnvelope: {
        successMessage: "Stock issue synced to the live inventory API.",
        defaultErrorMessage: "Live inventory sync failed.",
      },
    },
  );
}
