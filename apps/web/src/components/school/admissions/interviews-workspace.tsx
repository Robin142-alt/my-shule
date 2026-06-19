"use client";
import { useState } from "react";
import { CalendarCheck, Clock, CheckCircle, XCircle } from "lucide-react";
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
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
          <div className="text-sm font-semibold text-[#64748B]">Total Scheduled</div>
          <div className="mt-1 text-2xl font-black text-[#071D49]">{isLoading ? "..." : data?.metrics?.total_scheduled ?? 0}</div>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <div className="text-sm font-semibold text-amber-700">Pending</div>
          <div className="mt-1 text-2xl font-black text-amber-700">{isLoading ? "..." : data?.metrics?.pending ?? 0}</div>
        </div>
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
          <div className="text-sm font-semibold text-blue-700">Completed</div>
          <div className="mt-1 text-2xl font-black text-blue-700">{isLoading ? "..." : data?.metrics?.completed ?? 0}</div>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <div className="text-sm font-semibold text-emerald-700">Passed</div>
          <div className="mt-1 text-2xl font-black text-emerald-700">{isLoading ? "..." : data?.metrics?.passed ?? 0}</div>
        </div>
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
          <div className="text-sm font-semibold text-rose-700">Failed</div>
          <div className="mt-1 text-2xl font-black text-rose-700">{isLoading ? "..." : data?.metrics?.failed ?? 0}</div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-[#D8E0EC]">
        <table className="w-full text-sm text-left whitespace-nowrap">
          <thead className="bg-[#F8FAFC] text-[#071D49]">
            <tr>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Student</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Grade</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Interviewer</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Date</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Time</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Status</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Outcome</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC] text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D8E0EC]">
            {isLoading ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-[#64748B]">Loading interviews...</td></tr>
            ) : interviews.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-[#64748B]">No interviews scheduled. Approve applications first, then schedule interviews for shortlisted candidates.</td></tr>
            ) : (
              interviews.map((iv) => (
                <tr key={iv.id} className="hover:bg-[#F8FAFC]">
                  <td className="px-4 py-3 font-semibold text-[#071D49]">{iv.student_name}</td>
                  <td className="px-4 py-3 text-[#64748B]">{iv.grade_applied}</td>
                  <td className="px-4 py-3 text-[#64748B]">{iv.interviewer}</td>
                  <td className="px-4 py-3 text-[#64748B]">{iv.scheduled_date}</td>
                  <td className="px-4 py-3 text-[#64748B]"><span className="inline-flex items-center gap-1"><Clock className="w-3 h-3" />{iv.scheduled_time}</span></td>
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
