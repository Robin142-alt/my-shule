import type { NextRequest } from "next/server";

import { proxySchoolApiRequest } from "@/lib/dashboard/server-api-proxy";

export async function POST(request: NextRequest) {
  return proxySchoolApiRequest(
    request,
    { params: { path: [] } },
    "/inventory/stocktake-sessions",
    {
      requiredSchoolRoles: ["storekeeper"],
      responseEnvelope: {
        successMessage: "Stocktake session synced to the live inventory API.",
        defaultErrorMessage: "Live inventory sync failed.",
      },
    },
  );
}
