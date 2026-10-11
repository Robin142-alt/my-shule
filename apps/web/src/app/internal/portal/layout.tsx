import { cookies } from "next/headers";
import type { ReactNode } from "react";
import { parseExperienceSession, PORTAL_SESSION_COOKIE } from "@/lib/auth/experience-routing";
import { readTenantCookie } from "@/lib/auth/server-session";
import { PortalWorkspaceLayout } from "@/components/portal/portal-workspace-layout";
export default async function PortalLayout({ children }: { children: ReactNode }) {
  const store = await cookies();
  const session = parseExperienceSession("portal", store.get(PORTAL_SESSION_COOKIE)?.value);
  const portal = session?.experience === "portal" ? session : null;
  return <PortalWorkspaceLayout viewer={portal?.viewer ?? "parent"} tenantSlug={readTenantCookie(store)} userLabel={portal?.userLabel} routeMode="hosted">{children}</PortalWorkspaceLayout>;
}
