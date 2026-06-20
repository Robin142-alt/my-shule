"use client";
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
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6 mb-6">
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-[#64748B]"><Users className="w-4 h-4" /> Visitors Today</div>
          <div className="mt-2 text-3xl font-black text-[#071D49]">{isLoading ? "..." : metrics?.visitors_today || 0}</div>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-amber-700"><Clock className="w-4 h-4" /> In Queue</div>
          <div className="mt-2 text-3xl font-black text-amber-700">{isLoading ? "..." : metrics?.in_queue || 0}</div>
        </div>
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-blue-700"><UserCheck className="w-4 h-4" /> Appointments</div>
          <div className="mt-2 text-3xl font-black text-blue-700">{isLoading ? "..." : metrics?.appointments_today || 0}</div>
        </div>
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-[#64748B]"><Phone className="w-4 h-4" /> Pending Calls</div>
          <div className="mt-2 text-3xl font-black text-[#071D49]">{isLoading ? "..." : metrics?.pending_calls || 0}</div>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-emerald-700"><Mail className="w-4 h-4" /> Unread Messages</div>
          <div className="mt-2 text-3xl font-black text-emerald-700">{isLoading ? "..." : metrics?.unread_messages || 0}</div>
        </div>
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-rose-700"><AlertCircle className="w-4 h-4" /> Clearances</div>
          <div className="mt-2 text-3xl font-black text-rose-700">{isLoading ? "..." : metrics?.pending_clearances || 0}</div>
        </div>
      </div>

      {/* Recent Activity Table */}
      <div className="overflow-x-auto rounded-xl border border-[#D8E0EC]">
        <table className="w-full text-sm text-left whitespace-nowrap">
          <thead className="bg-[#F8FAFC] text-[#071D49]">
            <tr>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Type</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Description</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Person</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Time</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D8E0EC]">
            {isLoading ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-[#64748B]">Loading today&apos;s activity...</td></tr>
            ) : activity.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-[#64748B]">No activity recorded yet today. Visitors, calls, and messages will appear here as they come in.</td></tr>
            ) : (
              activity.map((item) => (
                <tr key={item.id} className="hover:bg-[#F8FAFC]">
                  <td className="px-4 py-3"><StatusChip label={item.type} tone={getActivityTone(item.type)} /></td>
                  <td className="px-4 py-3 font-medium text-[#071D49]">{item.description}</td>
                  <td className="px-4 py-3 text-[#64748B]">{item.person}</td>
                  <td className="px-4 py-3 text-[#64748B]">{item.time}</td>
                  <td className="px-4 py-3 text-[#64748B]">{item.status}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
