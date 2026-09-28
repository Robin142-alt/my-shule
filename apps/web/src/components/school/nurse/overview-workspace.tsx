"use client";
import { RecordTable } from "@/components/ui/record-table";
import { HeartPulse, Users, BedDouble, Pill, AlertTriangle } from "lucide-react";
import { Panel, StatusChip, Tone } from "./shared";
import { useSchoolQuery } from "@/lib/data/school-hooks";

type RecentVisit = {
  id: string;
  student_name: string;
  class_name: string;
  complaint: string;
  status: string;
  visit_time: string;
};

type NurseOverviewData = {
  metrics: {
    todayVisits?: number;
    waitingQueue?: number;
    lowStockMeds?: number;
    pending_parent_alerts?: number;
  };
  recentVisits?: RecentVisit[];
};

export function OverviewWorkspace() {
  const { data, isLoading } = useSchoolQuery<NurseOverviewData>('/admin-command/nurse/overview');

  const metrics = data?.metrics ?? {};
  const visits = data?.recentVisits || [];
  const todayVisits = metrics.todayVisits ?? 0;
  const sickBayOccupied = metrics.waitingQueue ?? 0;
  const lowStockItems = metrics.lowStockMeds ?? 0;
  const pendingParentAlerts = metrics.pending_parent_alerts ?? 0;

  const getStatusTone = (st: string): Tone => {
    if (st === "In Sick Bay") return "warning";
    if (st === "Treated & Released") return "success";
    if (st === "Referred") return "danger";
    if (st === "Waiting") return "info";
    return "neutral";
  };

  return (
    <Panel title="Health Centre Overview" description="Today's health activity, sick bay occupancy, and alerts." icon={HeartPulse}>
      <div className="app-metric-grid grid gap-4 md:grid-cols-4 mb-6">
        <div className="rounded-xl border border-border bg-surface-muted p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-muted"><Users className="w-4 h-4" /> Visits Today</div>
          <div className="mt-2 text-3xl font-black text-foreground">{isLoading ? "..." : todayVisits}</div>
        </div>
        <div className="rounded-xl border border-warning-border bg-warning-soft p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-warning"><BedDouble className="w-4 h-4" /> Sick Bay Occupied</div>
          <div className="mt-2 text-3xl font-black text-warning">{isLoading ? "..." : sickBayOccupied}</div>
        </div>
        <div className="rounded-xl border border-danger-border bg-danger-soft p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-danger"><Pill className="w-4 h-4" /> Low Stock Items</div>
          <div className="mt-2 text-3xl font-black text-danger">{isLoading ? "..." : lowStockItems}</div>
        </div>
        <div className="rounded-xl border border-info-border bg-info-soft p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-info"><AlertTriangle className="w-4 h-4" /> Pending Parent Alerts</div>
          <div className="mt-2 text-3xl font-black text-info">{isLoading ? "..." : pendingParentAlerts}</div>
        </div>
      </div>

      <h3 className="text-sm font-bold text-foreground mb-3">Recent Visits</h3>
      <div className="overflow-x-auto rounded-xl border border-border">
        <RecordTable className="w-full text-sm text-left whitespace-nowrap">
          <thead className="bg-surface-muted text-foreground">
            <tr>
              <th className="px-4 py-3 font-bold border-b border-border">Student</th>
              <th className="px-4 py-3 font-bold border-b border-border">Class</th>
              <th className="px-4 py-3 font-bold border-b border-border">Complaint</th>
              <th className="px-4 py-3 font-bold border-b border-border">Time</th>
              <th className="px-4 py-3 font-bold border-b border-border">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-muted">Loading health centre data...</td></tr>
            ) : visits.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-muted">No visits recorded today. Students visiting the health centre will appear here.</td></tr>
            ) : (
              visits.map(v => (
                <tr key={v.id} className="hover:bg-surface-muted">
                  <td className="px-4 py-3 font-semibold text-foreground">{v.student_name}</td>
                  <td className="px-4 py-3 text-muted">{v.class_name}</td>
                  <td className="px-4 py-3 text-muted">{v.complaint}</td>
                  <td className="px-4 py-3 text-muted">{v.visit_time}</td>
                  <td className="px-4 py-3"><StatusChip label={v.status} tone={getStatusTone(v.status)} /></td>
                </tr>
              ))
            )}
          </tbody>
        </RecordTable>
      </div>
    </Panel>
  );
}
