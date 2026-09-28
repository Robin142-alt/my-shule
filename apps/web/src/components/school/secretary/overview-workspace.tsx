"use client";
import { RecordTable } from "@/components/ui/record-table";
import { useState } from "react";
import { LayoutDashboard, Users, Clock, Phone, FileText, Mail, UserCheck, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Panel, StatusChip, Tone } from "./shared";
import { useSchoolQuery } from "@/lib/data/school-hooks";
import { fetchSecretaryOverview } from "./api-client";

type OverviewData = {
  metrics: {
    visitors_today: number;
    in_queue: number;
    appointments_today: number;
    pending_calls: number;
    unread_messages: number;
    pending_clearances: number;
  };
  recent_activity: Array<{
    id: string;
    type: string;
    description: string;
    person: string;
    time: string;
    status: string;
  }>;
};

export function OverviewWorkspace() {
  const { data, isLoading } = useSchoolQuery<OverviewData>('/admin-command/secretary/overview');

  const metrics = data?.metrics;
  const activity = data?.recent_activity || [];

  const getActivityTone = (type: string): Tone => {
    switch (type) {
      case "visitor": return "info";
      case "appointment": return "warning";
      case "call": return "neutral";
      case "message": return "success";
      case "clearance": return "danger";
      default: return "neutral";
    }
  };

  return (
    <Panel title="Front Office Overview" description="Today's reception activity at a glance." icon={LayoutDashboard}>
      {/* Metrics */}
      <div className="app-metric-grid grid gap-4 md:grid-cols-3 lg:grid-cols-6 mb-6">
        <div className="rounded-xl border border-border bg-surface-muted p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-muted"><Users className="w-4 h-4" /> Visitors Today</div>
          <div className="mt-2 text-3xl font-black text-foreground">{isLoading ? "..." : metrics?.visitors_today || 0}</div>
        </div>
        <div className="rounded-xl border border-warning-border bg-warning-soft p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-warning"><Clock className="w-4 h-4" /> In Queue</div>
          <div className="mt-2 text-3xl font-black text-warning">{isLoading ? "..." : metrics?.in_queue || 0}</div>
        </div>
        <div className="rounded-xl border border-info-border bg-info-soft p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-info"><UserCheck className="w-4 h-4" /> Appointments</div>
          <div className="mt-2 text-3xl font-black text-info">{isLoading ? "..." : metrics?.appointments_today || 0}</div>
        </div>
        <div className="rounded-xl border border-border bg-surface-muted p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-muted"><Phone className="w-4 h-4" /> Pending Calls</div>
          <div className="mt-2 text-3xl font-black text-foreground">{isLoading ? "..." : metrics?.pending_calls || 0}</div>
        </div>
        <div className="rounded-xl border border-success-border bg-success-soft p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-success"><Mail className="w-4 h-4" /> Unread Messages</div>
          <div className="mt-2 text-3xl font-black text-success">{isLoading ? "..." : metrics?.unread_messages || 0}</div>
        </div>
        <div className="rounded-xl border border-danger-border bg-danger-soft p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-danger"><AlertCircle className="w-4 h-4" /> Clearances</div>
          <div className="mt-2 text-3xl font-black text-danger">{isLoading ? "..." : metrics?.pending_clearances || 0}</div>
        </div>
      </div>

      {/* Recent Activity Table */}
      <div className="overflow-x-auto rounded-xl border border-border">
        <RecordTable className="w-full text-sm text-left whitespace-nowrap">
          <thead className="bg-surface-muted text-foreground">
            <tr>
              <th className="px-4 py-3 font-bold border-b border-border">Type</th>
              <th className="px-4 py-3 font-bold border-b border-border">Description</th>
              <th className="px-4 py-3 font-bold border-b border-border">Person</th>
              <th className="px-4 py-3 font-bold border-b border-border">Time</th>
              <th className="px-4 py-3 font-bold border-b border-border">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-muted">Loading today&apos;s activity...</td></tr>
            ) : activity.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-muted">No activity recorded yet today. Visitors, calls, and messages will appear here as they come in.</td></tr>
            ) : (
              activity.map((item) => (
                <tr key={item.id} className="hover:bg-surface-muted">
                  <td className="px-4 py-3"><StatusChip label={item.type} tone={getActivityTone(item.type)} /></td>
                  <td className="px-4 py-3 font-medium text-foreground">{item.description}</td>
                  <td className="px-4 py-3 text-muted">{item.person}</td>
                  <td className="px-4 py-3 text-muted">{item.time}</td>
                  <td className="px-4 py-3 text-muted">{item.status}</td>
                </tr>
              ))
            )}
          </tbody>
        </RecordTable>
      </div>
    </Panel>
  );
}
