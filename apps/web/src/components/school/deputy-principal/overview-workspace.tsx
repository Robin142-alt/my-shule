"use client";
import { useState, useEffect } from "react";
import { LayoutDashboard, Users, UserX, UserCheck, AlertTriangle, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { Panel, StatusChip, Tone } from "./shared";
import { readSchoolData, subscribeToSchoolDataUpdates, updateSchoolRecord, createNotification } from "@/lib/school/school-operational-store";

import { useSchoolQuery } from "@/lib/data/school-hooks";

type DeputyOverviewData = {
  incident_summary: {
    reported_incidents: number;
    escalated_incidents: number;
  };
  metrics: {
    present_today: number;
    absent_today: number;
  };
  recent_incidents: Array<{
    id: string;
    title: string;
    status: string;
    involved_parties: string;
    severity: string;
    created_at: string;
  }>;
};

export function DeputyOverviewWorkspace() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { data, isLoading } = useSchoolQuery<DeputyOverviewData>('/admin-command/deputy/overview');

  const handleStartMorningReview = async () => {
    setIsSubmitting(true);
    try {
      await new Promise(res => setTimeout(res, 500));
      toast.success("Morning Review Started successfully!");
    } catch (e) {
      toast.error("Failed to start Morning Review.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const reportedIncidents = data?.incident_summary?.reported_incidents || 0;
  const escalatedIncidents = data?.incident_summary?.escalated_incidents || 0;
  const presentToday = data?.metrics?.present_today || 0;
  const absentToday = data?.metrics?.absent_today || 0;
  const recentIncidents = data?.recent_incidents || [];

  const getToneForSeverity = (severity: string): Tone => {
    switch (severity?.toLowerCase()) {
      case 'critical': return 'danger';
      case 'high': return 'danger';
      case 'medium': return 'warning';
      case 'low': return 'success';
      default: return 'info';
    }
  };

  return (
    <Panel title="Overview" description="Today's Priority Queue and school state." icon={LayoutDashboard} actions={
      <button disabled={isSubmitting} onClick={handleStartMorningReview} className="rounded-lg bg-[#071D49] px-4 py-2 text-sm font-black text-white hover:bg-blue-900 transition disabled:opacity-50">{isSubmitting ? "Starting..." : "Start Morning Review"}</button>
    }>
      <div className="grid gap-4 md:grid-cols-4 lg:grid-cols-4 mb-6">
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4 flex flex-col justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold text-[#64748B]"><UserCheck className="w-4 h-4"/> Present Today</div>
          <div className="mt-2 text-3xl font-black text-emerald-600">{isLoading ? "..." : presentToday}</div>
        </div>
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 flex flex-col justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold text-rose-700"><UserX className="w-4 h-4"/> Absent Today</div>
          <div className="mt-2 text-3xl font-black text-rose-700">{isLoading ? "..." : absentToday}</div>
        </div>
        <div className="rounded-xl border border-orange-200 bg-orange-50 p-4 flex flex-col justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold text-orange-700"><ShieldAlert className="w-4 h-4"/> Open Incidents</div>
          <div className="mt-2 text-3xl font-black text-orange-700">{isLoading ? "..." : reportedIncidents}</div>
        </div>
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4 flex flex-col justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold text-[#64748B]"><AlertTriangle className="w-4 h-4"/> Escalations</div>
          <div className="mt-2 text-3xl font-black text-[#071D49]">{isLoading ? "..." : escalatedIncidents}</div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-[#D8E0EC]">
        <table className="w-full text-sm text-left whitespace-nowrap">
          <thead className="bg-[#F8FAFC] text-[#071D49]">
            <tr>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Priority</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Title</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Student/Staff</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Status</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC] text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D8E0EC]">
            {recentIncidents.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-[#64748B]">No recent incidents found.</td>
              </tr>
            ) : (
              recentIncidents.map((incident) => (
                <tr key={incident.id} className="hover:bg-[#F8FAFC]">
                  <td className="px-4 py-3"><StatusChip label={incident.severity || "Normal"} tone={getToneForSeverity(incident.severity)} /></td>
                  <td className="px-4 py-3 font-semibold text-[#071D49]">{incident.title}</td>
                  <td className="px-4 py-3 text-[#64748B]">{incident.involved_parties || "Unknown"}</td>
                  <td className="px-4 py-3 text-[#64748B]">{incident.status}</td>
                  <td className="px-4 py-3 text-right">
                    <button className="text-blue-600 hover:underline font-semibold text-xs">View Details</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}