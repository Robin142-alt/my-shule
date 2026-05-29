import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { validateCsrfRequest } from "@/lib/auth/csrf";
import { getDashboardApiBaseUrl } from "@/lib/dashboard/api-client";

const unavailableMessage =
  "Invitation acceptance is temporarily unavailable. Please contact support if you need immediate access.";

export async function POST(request: NextRequest) {
  try {
    if (!validateCsrfRequest(request)) {
      return NextResponse.json(
        { message: "Security check expired. Refresh the page and try again." },
        { status: 403 },
      );
    }

    const body = (await request.json()) as {
      token?: string;
      password?: string;
      displayName?: string;
      display_name?: string;
      tenantSlug?: string | null;
      tenant_id?: string | null;
    };
    const expectedTenantId = body.tenantSlug?.trim() || body.tenant_id?.trim() || null;
    const displayName = body.displayName?.trim() || body.display_name?.trim() || undefined;
    const baseUrl = getDashboardApiBaseUrl(expectedTenantId ?? undefined);

    if (!baseUrl) {
      return NextResponse.json(
        { message: unavailableMessage },
        { status: 503 },
      );
    }

    const response = await fetch(`${baseUrl}/auth/invitations/accept`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "x-auth-audience": "school",
        ...(expectedTenantId ? { "x-tenant-id": expectedTenantId } : {}),
      },
      body: JSON.stringify({
        token: body.token,
        password: body.password,
        display_name: displayName,
        expected_tenant_id: expectedTenantId,
      }),
      cache: "no-store",
    });
    const payload = (await response.json().catch(() => null)) as
      | {
          success?: boolean;
          message?: string;
          tenant_id?: string;
          email?: string;
          display_name?: string;
          role?: string;
        }
      | null;

    return NextResponse.json(
      response.ok
        ? {
            success: true,
            message: payload?.message ?? "Invitation accepted. You can now sign in.",
            tenantId: payload?.tenant_id,
            email: payload?.email,
            displayName: payload?.display_name,
            role: payload?.role,
          }
        : {
            message: payload?.message ?? unavailableMessage,
          },
      { status: response.ok ? 200 : response.status },
    );
  } catch {
    return NextResponse.json(
      { message: unavailableMessage },
      { status: 500 },
    );
  }
}
