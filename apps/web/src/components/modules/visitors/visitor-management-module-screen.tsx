"use client";

import { Implementation100LiveModuleScreen, type Implementation100Dashboard } from "@/components/modules/shared/implementation100-live-module";

export function VisitorManagementModuleScreen({
  tenantSlug,
  initialDashboard,
}: {
  tenantSlug?: string | null;
  initialDashboard?: Implementation100Dashboard;
}) {
  return (
    <Implementation100LiveModuleScreen
      apiBase="/api/visitors"
      moduleTitle="Visitor management"
      entityLabel="Visitor record"
      tenantSlug={tenantSlug}
      initialDashboard={initialDashboard}
      categories={["checkin", "appointment", "badge", "emergency"]}
    />
  );
}
