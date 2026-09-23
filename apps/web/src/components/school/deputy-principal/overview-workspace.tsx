"use client";
import { RecordTable } from "@/components/ui/record-table";
import { useState } from "react";
import { LayoutDashboard, UserX, UserCheck, AlertTriangle, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { Panel, StatusChip, Tone, openDeputyRecord } from "./shared";

import { useSchoolQuery } from "@/lib/data/school-hooks";
import { requestDashboardApi } from "@/lib/dashboard/api-client";
import {
  getCurrentSchoolId,
  publishSchoolOperationalEvent,
  readSchoolData,
} from "@/lib/school/school-operational-store";

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

type CounsellingFollowUp = {
  id: string;
  student: string;
  riskLevel: string;
  sessionType: string;
  status: string;
};

export function DeputyOverviewWorkspace({ schoolId }: { schoolId?: string }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const currentSchoolId = schoolId?.trim() || getCurrentSchoolId();
  const { data, isLoading } = useSchoolQuery<DeputyOverviewData>('/admin-command/deputy/overview');
  const { data: fetchedCounsellingSessions } = useSchoolQuery<CounsellingFollowUp[]>('/api/support/counselling');

  const handleStartMorningReview = async () => {
    setIsSubmitting(true);
    try {
      await requestDashboardApi("/admin-command/deputy/morning-review", {
        method: "POST",
        body: {
          started_at: new Date().toISOString(),
          present_today: presentToday,
          absent_today: absentToday,
          reported_incidents: reportedIncidents,
          escalated_incidents: escalatedIncidents,
        },
      });
      publishSchoolOperationalEvent({
        schoolId: currentSchoolId,
        type: "deputy.morning_review.started",
        module: "deputy-principal",
        actorRole: "deputy-principal",
        title: "Morning review started",
        body: "Deputy Principal started the daily morning review from live attendance and incident metrics.",
        severity: "info",
        payload: {
          presentToday,
          absentToday,
          reportedIncidents,
          escalatedIncidents,
        },
      });
      toast.success("Morning review started and recorded.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to start Morning Review.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const reportedIncidents = data?.incident_summary?.reported_incidents || 0;
  const escalatedIncidents = data?.incident_summary?.escalated_incidents || 0;
  const presentToday = data?.metrics?.present_today || 0;
  const absentToday = data?.metrics?.absent_today || 0;
  const recentIncidents = data?.recent_incidents || [];
  const storedCounsellingSessions = readSchoolData<CounsellingFollowUp>(
    "counselling-sessions",
    currentSchoolId,
  );
  const counsellingSessions = Array.from(
    new Map(
      [
        ...(Array.isArray(fetchedCounsellingSessions) ? fetchedCounsellingSessions : []),
        ...storedCounsellingSessions,
      ].map((session) => [session.id, session]),
    ).values(),
  );
  const counsellingFollowUps = counsellingSessions.filter(
    (session) =>
      session.status !== "Closed"
      && ["high", "critical"].includes(session.riskLevel.toLowerCase()),
  );

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
      <button type="button" disabled={isSubmitting} onClick={handleStartMorningReview} className="rounded-lg bg-[#071D49] px-4 py-2 text-sm font-black text-white hover:bg-blue-900 transition disabled:opacity-50">{isSubmitting ? "Starting..." : "Start Morning Review"}</button>
    }>
      <div className="app-metric-grid grid gap-4 md:grid-cols-4 lg:grid-cols-4 mb-6">
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

      {counsellingFollowUps.length > 0 ? (
        <section className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4" aria-labelledby="deputy-counselling-follow-ups">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <h2 id="deputy-counselling-follow-ups" className="font-black text-amber-950">Counselling support requiring follow-up</h2>
              <div className="mt-3 grid gap-2">
                {counsellingFollowUps.slice(0, 5).map((session) => (
                  <div key={session.id} className="rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm text-[#071D49]">
                    <p className="font-black">{session.student} high-risk counselling follow-up</p>
                    <p className="mt-1 text-[#64748B]">{session.sessionType} - {session.status}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      ) : null}

      <div className="overflow-x-auto rounded-xl border border-[#D8E0EC]">
        <RecordTable className="w-full text-sm text-left whitespace-nowrap">
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
                    <button type="button" className="text-blue-600 hover:underline font-semibold text-xs" onClick={() => openDeputyRecord("Priority incident details", [["Title", incident.title], ["Parties", incident.involved_parties || "Unknown"], ["Status", incident.status], ["Severity", incident.severity || "Normal"], ["Created At", incident.created_at || "-"]])}>View Details</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </RecordTable>
      </div>
    </Panel>
  );
}
