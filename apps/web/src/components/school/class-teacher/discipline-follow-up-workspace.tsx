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
        <div className="rounded-xl border border-warning-border bg-warning-soft p-4">
          <div className="text-sm font-semibold text-warning">Open Cases</div>
          <div className="mt-1 text-2xl font-black text-warning">{isLoading ? "..." : metrics?.open_cases ?? 0}</div>
        </div>
        <div className="rounded-xl border border-success-border bg-success-soft p-4">
          <div className="text-sm font-semibold text-success">Resolved (Term)</div>
          <div className="mt-1 text-2xl font-black text-success">{isLoading ? "..." : metrics?.resolved_this_term ?? 0}</div>
        </div>
        <div className="rounded-xl border border-danger-border bg-danger-soft p-4">
          <div className="text-sm font-semibold text-danger">Escalated</div>
          <div className="mt-1 text-2xl font-black text-danger">{isLoading ? "..." : metrics?.escalated ?? 0}</div>
        </div>
        <div className="rounded-xl border border-border bg-surface-muted p-4">
          <div className="text-sm font-semibold text-muted">Repeat Offenders</div>
          <div className="mt-1 text-2xl font-black text-foreground">{isLoading ? "..." : metrics?.repeat_offenders ?? 0}</div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm text-left whitespace-nowrap">
          <thead className="bg-surface-muted text-foreground">
            <tr>
              <th className="px-4 py-3 font-bold border-b border-border">Student</th>
              <th className="px-4 py-3 font-bold border-b border-border">Incident</th>
              <th className="px-4 py-3 font-bold border-b border-border">Severity</th>
              <th className="px-4 py-3 font-bold border-b border-border">Status</th>
              <th className="px-4 py-3 font-bold border-b border-border">Reported By</th>
              <th className="px-4 py-3 font-bold border-b border-border">Date</th>
              <th className="px-4 py-3 font-bold border-b border-border">Follow-Ups</th>
              <th className="px-4 py-3 font-bold border-b border-border text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-muted">Loading discipline records...</td></tr>
            ) : cases.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-muted">No open discipline cases for your class. All clear!</td></tr>
            ) : (
              cases.map((c) => (
                <tr key={c.id} className="hover:bg-surface-muted">
                  <td className="px-4 py-3 font-semibold text-foreground">{c.student_name}</td>
                  <td className="px-4 py-3 text-muted">{c.incident_type}</td>
                  <td className="px-4 py-3"><StatusChip label={c.severity} tone={getSeverityTone(c.severity)} /></td>
                  <td className="px-4 py-3"><StatusChip label={c.status} tone={getStatusTone(c.status)} /></td>
                  <td className="px-4 py-3 text-muted">{c.reported_by}</td>
                  <td className="px-4 py-3 text-muted">{c.date}</td>
                  <td className="px-4 py-3 text-foreground font-bold text-center">{c.follow_up_count}</td>
                  <td className="px-4 py-3 text-right flex gap-2 justify-end">
                    {c.status !== "Resolved" && (
                      <>
                        <button
                          disabled={actionLoading === `fu-${c.id}`}
                          onClick={() => handleFollowUp(c.id)}
                          className="inline-flex items-center gap-1 rounded-lg border border-info-border bg-info-soft px-3 py-1.5 text-xs font-bold text-info hover:bg-blue-100 disabled:opacity-50"
                        >
                          <MessageSquare className="w-3 h-3" /> Follow Up
                        </button>
                        {c.status !== "Escalated" && (
                          <button
                            disabled={actionLoading === `esc-${c.id}`}
                            onClick={() => handleEscalate(c.id)}
                            className="inline-flex items-center gap-1 rounded-lg border border-danger-border bg-danger-soft px-3 py-1.5 text-xs font-bold text-danger hover:bg-rose-100 disabled:opacity-50"
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
