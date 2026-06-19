"use client";
import { useState } from "react";
import { ShieldAlert, ArrowUpRight, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { Panel, StatusChip, Tone } from "./shared";
import { useSchoolQuery } from "@/lib/data/school-hooks";
import { addDisciplineFollowUp, escalateDisciplineCase } from "./api-client";

type DisciplineRecord = {
  id: string;
  student_name: string;
  admission_no: string;
  incident_type: string;
  description: string;
  severity: string;
  status: string;
  reported_by: string;
  date: string;
  follow_up_count: number;
};

type DisciplineFollowUpData = {
  metrics: {
    open_cases: number;
    resolved_this_term: number;
    escalated: number;
    repeat_offenders: number;
  };
  cases: DisciplineRecord[];
};

export function DisciplineFollowUpWorkspace() {
  const { data, isLoading, refetch } = useSchoolQuery<DisciplineFollowUpData>('/admin-command/class-teacher/discipline-follow-up');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const cases = data?.cases || [];
  const metrics = data?.metrics;

  const getSeverityTone = (s: string): Tone => {
    if (s === "Critical" || s === "High") return "danger";
    if (s === "Medium") return "warning";
    if (s === "Low") return "info";
    return "neutral";
  };

  const getStatusTone = (s: string): Tone => {
    if (s === "Resolved") return "success";
    if (s === "Open") return "warning";
    if (s === "Escalated") return "danger";
    return "neutral";
  };

  const handleEscalate = async (id: string) => {
    setActionLoading(`esc-${id}`);
    try {
      await escalateDisciplineCase(id);
      toast.success("Case escalated to Discipline Master.");
      refetch();
    } catch {
      toast.error("Failed to escalate case.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleFollowUp = async (id: string) => {
    setActionLoading(`fu-${id}`);
    try {
      await addDisciplineFollowUp(id, { note: "Follow-up initiated by class teacher" });
      toast.success("Follow-up recorded.");
      refetch();
    } catch {
      toast.error("Failed to record follow-up.");
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <Panel title="Discipline Follow-Up" description="Track and follow up on discipline incidents involving your class students." icon={ShieldAlert}>
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <div className="text-sm font-semibold text-amber-700">Open Cases</div>
          <div className="mt-1 text-2xl font-black text-amber-700">{isLoading ? "..." : metrics?.open_cases ?? 0}</div>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <div className="text-sm font-semibold text-emerald-700">Resolved (Term)</div>
          <div className="mt-1 text-2xl font-black text-emerald-700">{isLoading ? "..." : metrics?.resolved_this_term ?? 0}</div>
        </div>
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
          <div className="text-sm font-semibold text-rose-700">Escalated</div>
          <div className="mt-1 text-2xl font-black text-rose-700">{isLoading ? "..." : metrics?.escalated ?? 0}</div>
        </div>
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
          <div className="text-sm font-semibold text-[#64748B]">Repeat Offenders</div>
          <div className="mt-1 text-2xl font-black text-[#071D49]">{isLoading ? "..." : metrics?.repeat_offenders ?? 0}</div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-[#D8E0EC]">
        <table className="w-full text-sm text-left whitespace-nowrap">
          <thead className="bg-[#F8FAFC] text-[#071D49]">
            <tr>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Student</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Incident</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Severity</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Status</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Reported By</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Date</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Follow-Ups</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC] text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D8E0EC]">
            {isLoading ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-[#64748B]">Loading discipline records...</td></tr>
            ) : cases.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-[#64748B]">No open discipline cases for your class. All clear!</td></tr>
            ) : (
              cases.map((c) => (
                <tr key={c.id} className="hover:bg-[#F8FAFC]">
                  <td className="px-4 py-3 font-semibold text-[#071D49]">{c.student_name}</td>
                  <td className="px-4 py-3 text-[#64748B]">{c.incident_type}</td>
                  <td className="px-4 py-3"><StatusChip label={c.severity} tone={getSeverityTone(c.severity)} /></td>
                  <td className="px-4 py-3"><StatusChip label={c.status} tone={getStatusTone(c.status)} /></td>
                  <td className="px-4 py-3 text-[#64748B]">{c.reported_by}</td>
                  <td className="px-4 py-3 text-[#64748B]">{c.date}</td>
                  <td className="px-4 py-3 text-[#071D49] font-bold text-center">{c.follow_up_count}</td>
                  <td className="px-4 py-3 text-right flex gap-2 justify-end">
                    {c.status !== "Resolved" && (
                      <>
                        <button
                          disabled={actionLoading === `fu-${c.id}`}
                          onClick={() => handleFollowUp(c.id)}
                          className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-100 disabled:opacity-50"
                        >
                          <MessageSquare className="w-3 h-3" /> Follow Up
                        </button>
                        {c.status !== "Escalated" && (
                          <button
                            disabled={actionLoading === `esc-${c.id}`}
                            onClick={() => handleEscalate(c.id)}
                            className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-100 disabled:opacity-50"
                          >
                            <ArrowUpRight className="w-3 h-3" /> Escalate
                          </button>
                        )}
                      </>
                    )}
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
