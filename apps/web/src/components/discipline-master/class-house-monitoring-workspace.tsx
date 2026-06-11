"use client";

import { BarChart3, TrendingUp } from "lucide-react";
import { Panel, EmptyState } from "./shared";

export function ClassHouseMonitoringWorkspace() {
  return (
    <Panel title="Class & House Monitoring" description="Analyze discipline trends across different classes and dormitories." icon={BarChart3}>
      <div className="grid gap-6 md:grid-cols-2 mb-8">
        <div className="rounded-2xl border border-[#D8E0EC] p-6 bg-white">
          <h3 className="text-sm font-black uppercase text-[#64748B] mb-4">Most Frequent Offenses by Class</h3>
          <EmptyState 
            message="No sufficient data to render class charts yet." 
            icon={TrendingUp} 
          />
        </div>
        <div className="rounded-2xl border border-[#D8E0EC] p-6 bg-white">
          <h3 className="text-sm font-black uppercase text-[#64748B] mb-4">House / Dormitory Incidents</h3>
          <EmptyState 
            message="No sufficient data to render house charts yet." 
            icon={TrendingUp} 
          />
        </div>
      </div>
    </Panel>
  );
}
