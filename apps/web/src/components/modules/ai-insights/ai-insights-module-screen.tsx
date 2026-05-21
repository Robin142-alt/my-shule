"use client";

import { Implementation100LiveModuleScreen, type Implementation100Dashboard } from "@/components/modules/shared/implementation100-live-module";

export function AiInsightsModuleScreen({
  tenantSlug,
  initialDashboard,
}: {
  tenantSlug?: string | null;
  initialDashboard?: Implementation100Dashboard;
}) {
  return (
    <Implementation100LiveModuleScreen
      apiBase="/api/ai-insights"
      moduleTitle="AI insights"
      entityLabel="AI insight"
      tenantSlug={tenantSlug}
      initialDashboard={initialDashboard}
      categories={["alert", "forecast", "anomaly", "recommendation"]}
    />
  );
}
