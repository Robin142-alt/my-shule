"use client";

import { Implementation100LiveModuleScreen, type Implementation100Dashboard } from "@/components/modules/shared/implementation100-live-module";

export function HostelModuleScreen({
  tenantSlug,
  initialDashboard,
}: {
  tenantSlug?: string | null;
  initialDashboard?: Implementation100Dashboard;
}) {
  return (
    <Implementation100LiveModuleScreen
      apiBase="/api/hostel"
      moduleTitle="Hostel operations"
      entityLabel="Hostel record"
      tenantSlug={tenantSlug}
      initialDashboard={initialDashboard}
      categories={["occupancy", "maintenance", "incident", "meal"]}
    />
  );
}
