"use client";

import { Implementation100LiveModuleScreen, type Implementation100Dashboard } from "@/components/modules/shared/implementation100-live-module";

export function BoardingModuleScreen({
  tenantSlug,
  initialDashboard,
}: {
  tenantSlug?: string | null;
  initialDashboard?: Implementation100Dashboard;
}) {
  return (
    <Implementation100LiveModuleScreen
      apiBase="/api/boarding"
      moduleTitle="Boarding operations"
      entityLabel="Boarding record"
      tenantSlug={tenantSlug}
      initialDashboard={initialDashboard}
      categories={["house", "meal", "roll_call", "incident"]}
    />
  );
}
