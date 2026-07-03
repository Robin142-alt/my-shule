import { createCsrfResponse } from "@/lib/auth/csrf";
import type { NextRequest } from "next/server";

export function GET(request: NextRequest) {
  return createCsrfResponse(request);
}
