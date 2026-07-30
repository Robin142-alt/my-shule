import type { NextRequest } from "next/server";

import { proxySchoolApiRequest } from "@/lib/dashboard/server-api-proxy";
import { checkSchoolModuleAccess } from "@/lib/module-access/server-school-module-access";

export async function POST(request: NextRequest) {
  return proxySchoolApiRequest(
    request,
    { params: { path: [] } },
    "/library/returns",
    {
      moduleAccess: {
        check: checkSchoolModuleAccess,
        moduleCode: "library",
        disabledMessage: "Module not enabled for your school",
      },
      requiredSchoolRoles: ["librarian"],
      responseEnvelope: {
        successMessage: "Return synced to the live library API.",
        defaultErrorMessage: "Live library API sync failed.",
      },
    },
  );
}
