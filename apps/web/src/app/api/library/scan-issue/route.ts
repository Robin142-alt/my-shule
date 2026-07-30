import type { NextRequest } from "next/server";

import { proxySchoolApiRequest } from "@/lib/dashboard/server-api-proxy";
import { checkSchoolModuleAccess } from "@/lib/module-access/server-school-module-access";

export async function POST(request: NextRequest) {
  return proxySchoolApiRequest(
    request,
    { params: { path: [] } },
    "/library/circulation/issue",
    {
      moduleAccess: {
        check: checkSchoolModuleAccess,
        moduleCode: "library",
        disabledMessage: "Module not enabled for your school",
      },
      requiredSchoolRoles: ["librarian", "admin", "owner"],
      responseEnvelope: {
        successMessage: "Book issued from scanner.",
        defaultErrorMessage: "Scanner issue failed.",
      },
    },
  );
}
