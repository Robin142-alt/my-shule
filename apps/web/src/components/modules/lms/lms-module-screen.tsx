"use client";

import { Implementation100LiveModuleScreen, type Implementation100Dashboard } from "@/components/modules/shared/implementation100-live-module";

export function LmsModuleScreen({
  tenantSlug,
  initialDashboard,
}: {
  tenantSlug?: string | null;
  initialDashboard?: Implementation100Dashboard;
}) {
  return (
    <Implementation100LiveModuleScreen
      apiBase="/api/lms"
      moduleTitle="LMS operations"
      entityLabel="LMS record"
      tenantSlug={tenantSlug}
      initialDashboard={initialDashboard}
      categories={["course", "content", "assignment", "submission"]}
    />
  );
}
