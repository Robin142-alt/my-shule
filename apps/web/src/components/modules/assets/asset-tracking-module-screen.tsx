"use client";

import { Implementation100LiveModuleScreen, type Implementation100Dashboard } from "@/components/modules/shared/implementation100-live-module";

export function AssetTrackingModuleScreen({
  tenantSlug,
  initialDashboard,
}: {
  tenantSlug?: string | null;
  initialDashboard?: Implementation100Dashboard;
}) {
  return (
    <Implementation100LiveModuleScreen
      apiBase="/api/assets"
      moduleTitle="Asset tracking"
      entityLabel="Asset record"
      tenantSlug={tenantSlug}
      initialDashboard={initialDashboard}
      categories={["asset", "assignment", "repair", "depreciation"]}
    />
  );
}
