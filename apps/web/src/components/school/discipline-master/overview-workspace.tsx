"use client";

import { DocxOperationalWorkspace } from "@/components/school/docx-operational-workspace";
import { DashboardEngine } from "@/components/dashboard/dashboard-engine";

export function OverviewWorkspace() {
  return (
    <div className="space-y-6">
      <DashboardEngine role="discipline-master" />
      <DocxOperationalWorkspace moduleId="overview" />
    </div>
  );
}
