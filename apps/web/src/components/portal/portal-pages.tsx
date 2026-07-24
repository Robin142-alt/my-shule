"use client";

import { PermissionProvider } from "@/components/providers/permission-context";
import { SchoolCommandIdentityProvider } from "@/components/school/integrated-school-command-header";
import { LiveRoleCommandCenter } from "@/components/school/live-role-command-center";
import { DashboardCommunicationProvider } from "@/lib/dashboard-communication/dashboard-communication-provider";
import { SchoolTenantScopeProvider } from "@/lib/data/school-tenant-scope";
import type { PortalViewer } from "@/lib/experiences/types";

type PortalRouteMode = "hosted" | "public";

export function PortalPages({
  viewer,
  section = "dashboard",
  routeMode = "hosted",
  tenantSlug,
  userLabel,
}: {
  viewer: PortalViewer;
  section?: string;
  routeMode?: PortalRouteMode;
  tenantSlug?: string | null;
  userLabel?: string | null;
}) {
  const scopedTenantId = tenantSlug?.trim() || null;
  const commandCenter = (
    <SchoolCommandIdentityProvider tenantSlug={scopedTenantId} userLabel={userLabel}>
      <PermissionProvider schoolId={scopedTenantId ?? undefined}>
        <LiveRoleCommandCenter
          key={`${viewer}:${section}`}
          role={viewer}
          routeMode={routeMode}
          activeSection={section}
          tenantSlug={scopedTenantId}
          userLabel={userLabel}
          experience="portal"
        />
      </PermissionProvider>
    </SchoolCommandIdentityProvider>
  );

  if (!scopedTenantId) {
    return commandCenter;
  }

  return (
    <SchoolTenantScopeProvider tenantId={scopedTenantId}>
      <DashboardCommunicationProvider tenantId={scopedTenantId}>
        {commandCenter}
      </DashboardCommunicationProvider>
    </SchoolTenantScopeProvider>
  );
}
