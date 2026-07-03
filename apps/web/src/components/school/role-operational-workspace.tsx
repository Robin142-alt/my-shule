"use client";

import { RoleOperationalCommandCenter } from "@/components/school/role-operational-command-center";
import type { SchoolExperienceRole } from "@/lib/experiences/school-data";
import type { SchoolRouteMode } from "@/components/school/school-pages";

export function RoleOperationalWorkspace({
  role,
  initialSection,
  tenantSlug,
  routeMode,
}: {
  role: SchoolExperienceRole;
  initialSection?: string;
  tenantSlug?: string | null;
  routeMode?: SchoolRouteMode;
}) {
  return (
    <RoleOperationalCommandCenter
      role={role}
      initialSection={initialSection}
      tenantSlug={tenantSlug}
      routeMode={routeMode}
    />
  );
}
