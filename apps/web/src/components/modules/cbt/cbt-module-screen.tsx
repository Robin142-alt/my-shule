"use client";

import { Implementation100LiveModuleScreen, type Implementation100Dashboard } from "@/components/modules/shared/implementation100-live-module";

export function CbtModuleScreen({
  tenantSlug,
  initialDashboard,
}: {
  tenantSlug?: string | null;
  initialDashboard?: Implementation100Dashboard;
}) {
  return (
    <Implementation100LiveModuleScreen
      apiBase="/api/cbt"
      moduleTitle="CBT exams"
      entityLabel="CBT session"
      tenantSlug={tenantSlug}
      initialDashboard={initialDashboard}
      categories={["exam", "question_bank", "attempt", "invigilation"]}
    />
  );
}
