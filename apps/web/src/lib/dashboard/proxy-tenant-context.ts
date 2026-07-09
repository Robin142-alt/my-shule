import { resolveSchoolTenantSlug } from "@/lib/auth/server-session";

export type DashboardApiProxyAudience = "school" | "superadmin" | "portal";

export function resolveDashboardApiProxyTenant(input: {
  audience: DashboardApiProxyAudience;
  requestedTenantSlug?: string | null;
  tenantCookie?: string | null;
  sessionTenantSlug?: string | null;
}) {
  if (input.audience === "superadmin") {
    return {
      tenantSlug: null,
      tenantMismatch: false,
    };
  }

  return resolveSchoolTenantSlug({
    requestedTenantSlug: input.requestedTenantSlug,
    tenantCookie: input.tenantCookie,
    sessionTenantSlug: input.sessionTenantSlug,
  });
}
