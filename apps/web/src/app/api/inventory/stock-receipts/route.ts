import type { NextRequest } from "next/server";

import { proxySchoolApiRequest } from "@/lib/dashboard/server-api-proxy";

export async function POST(request: NextRequest) {
  return proxySchoolApiRequest(
    request,
    { params: { path: [] } },
    "/inventory/stock-receipts",
    {
      requiredSchoolRoles: ["storekeeper"],
      responseEnvelope: {
        successMessage: "Stock receipt synced to the live inventory API.",
        defaultErrorMessage: "Live inventory sync failed.",
      },
    },
  );
}
