"use client";
import { useState } from "react";
import { CalendarCheck, Clock, CheckCircle, XCircle } from "lucide-react";
import Link from "next/link";
import { Panel, StatusChip, Tone } from "./shared";
import { useSchoolQuery } from "@/lib/data/school-hooks";
import { toast } from "sonner";
import { recordInterviewOutcome } from "./api-client";

type InterviewRecord = {
  id: string;
  student_name: string;
  grade_applied: string;
  interviewer: string;
  scheduled_date: string;
  scheduled_time: string;
  status: string;
  outcome: string;
};

type InterviewsData = {
  metrics: { total_scheduled: number; completed: number; pending: number; passed: number; failed: number };
  interviewsList: InterviewRecord[];
};

export function InterviewsWorkspace() {
  const { data, isLoading, refetch } = useSchoolQuery<InterviewsData>('/admin-command/admissions/interviews');
  const [actioningId, setActioningId] = useState<string | null>(null);

  const interviews = data?.interviewsList || [];

  const getStatusTone = (s: string): Tone => {
    switch (s?.toLowerCase()) {
      case "completed": return "success";
      case "scheduled": return "info";
      case "pending": return "warning";
      case "cancelled": return "danger";
      default: return "neutral";
    }
  };

  const getOutcomeTone = (o: string): Tone => {
    switch (o?.toLowerCase()) {
      case "passed": return "success";
      case "failed": return "danger";
      case "pending": return "warning";
      default: return "neutral";
    }
  };

  const handleOutcome = async (id: string, outcome: string) => {
    setActioningId(id);
    try {
      await recordInterviewOutcome(id, { outcome });
      toast.success(`Interview marked as ${outcome.toLowerCase()}.`);
      refetch();
    } catch {
      toast.error("Failed to record interview outcome.");
    } finally {
      setActioningId(null);
    }
  };

  return (
    <Panel title="Interviews" description="Schedule and manage admission interviews." icon={CalendarCheck}>
      <div className="grid gap-4 md:grid-cols-5 mb-6">
        <div className="rounded-xl border border-border bg-surface-muted p-4">
          <div className="text-sm font-semibold text-muted">Total Scheduled</div>
          <div className="mt-1 text-2xl font-black text-foreground">{isLoading ? "..." : data?.metrics?.total_scheduled ?? 0}</div>
        </div>
        <div className="rounded-xl border border-warning-border bg-warning-soft p-4">
          <div className="text-sm font-semibold text-warning">Pending</div>
          <div className="mt-1 text-2xl font-black text-warning">{isLoading ? "..." : data?.metrics?.pending ?? 0}</div>
        </div>
        <div className="rounded-xl border border-info-border bg-info-soft p-4">
          <div className="text-sm font-semibold text-info">Completed</div>
          <div className="mt-1 text-2xl font-black text-info">{isLoading ? "..." : data?.metrics?.completed ?? 0}</div>
        </div>
        <div className="rounded-xl border border-success-border bg-success-soft p-4">
          <div className="text-sm font-semibold text-success">Passed</div>
          <div className="mt-1 text-2xl font-black text-success">{isLoading ? "..." : data?.metrics?.passed ?? 0}</div>
        </div>
        <div className="rounded-xl border border-danger-border bg-danger-soft p-4">
          <div className="text-sm font-semibold text-danger">Failed</div>
          <div className="mt-1 text-2xl font-black text-danger">{isLoading ? "..." : data?.metrics?.failed ?? 0}</div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm text-left whitespace-nowrap">
          <thead className="bg-surface-muted text-foreground">
            <tr>
              <th className="px-4 py-3 font-bold border-b border-border">Student</th>
              <th className="px-4 py-3 font-bold border-b border-border">Grade</th>
              <th className="px-4 py-3 font-bold border-b border-border">Interviewer</th>
              <th className="px-4 py-3 font-bold border-b border-border">Date</th>
              <th className="px-4 py-3 font-bold border-b border-border">Time</th>
              <th className="px-4 py-3 font-bold border-b border-border">Status</th>
              <th className="px-4 py-3 font-bold border-b border-border">Outcome</th>
              <th className="px-4 py-3 font-bold border-b border-border text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-muted">Loading interviews...</td></tr>
            ) : interviews.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-muted">
                  <div className="mx-auto flex max-w-xl flex-col items-center gap-3">
                    <p>No interviews scheduled. Review applications first, then schedule interviews for shortlisted candidates.</p>
                    <Link href="/school/admissions/applications?action=start-admission" className="rounded-lg bg-primary px-4 py-2 text-xs font-black text-white">
                      Review applications
                    </Link>
                  </div>
                </td>
              </tr>
            ) : (
              interviews.map((iv) => (
                <tr key={iv.id} className="hover:bg-surface-muted">
                  <td className="px-4 py-3 font-semibold text-foreground">{iv.student_name}</td>
                  <td className="px-4 py-3 text-muted">{iv.grade_applied}</td>
                  <td className="px-4 py-3 text-muted">{iv.interviewer}</td>
                  <td className="px-4 py-3 text-muted">{iv.scheduled_date}</td>
                  <td className="px-4 py-3 text-muted"><span className="inline-flex items-center gap-1"><Clock className="w-3 h-3" />{iv.scheduled_time}</span></td>
                  <td className="px-4 py-3"><StatusChip label={iv.status} tone={getStatusTone(iv.status)} /></td>
                  <td className="px-4 py-3"><StatusChip label={iv.outcome || "Pending"} tone={getOutcomeTone(iv.outcome)} /></td>
                  <td className="px-4 py-3 text-right">
                    {iv.status?.toLowerCase() === "completed" && iv.outcome?.toLowerCase() === "pending" && (
                      <div className="flex items-center justify-end gap-2">
                        <button disabled={actioningId === iv.id} onClick={() => handleOutcome(iv.id, "Passed")}
                          className="text-emerald-600 hover:underline text-xs font-semibold inline-flex items-center gap-1 disabled:opacity-50"><CheckCircle className="w-3 h-3" /> Pass</button>
                        <button disabled={actioningId === iv.id} onClick={() => handleOutcome(iv.id, "Failed")}
                          className="text-rose-600 hover:underline text-xs font-semibold inline-flex items-center gap-1 disabled:opacity-50"><XCircle className="w-3 h-3" /> Fail</button>
                      </div>
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
