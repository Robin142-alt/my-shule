"use client";
import { useState } from "react";
import { ClipboardCheck, Phone, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { Panel, StatusChip, Tone } from "./shared";
import { useSchoolQuery } from "@/lib/data/school-hooks";
import { sendAttendanceFollowUp, markAttendanceResolved } from "./api-client";

type AbsentRecord = {
  id: string;
  student_name: string;
  admission_no: string;
  absent_days: number;
  last_absent_date: string;
  parent_name: string;
  parent_phone: string;
  follow_up_status: string;
  reason: string | null;
};

type AttendanceFollowUpData = {
  metrics: {
    total_absent_today: number;
    chronic_absentees: number;
    pending_follow_ups: number;
    resolved_today: number;
  };
  absent_students: AbsentRecord[];
};

export function AttendanceFollowUpWorkspace() {
  const { data, isLoading, refetch } = useSchoolQuery<AttendanceFollowUpData>('/admin-command/class-teacher/attendance-follow-up');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const students = data?.absent_students || [];
  const metrics = data?.metrics;

  const getFollowUpTone = (s: string): Tone => {
    if (s === "Resolved") return "success";
    if (s === "Contacted") return "info";
    if (s === "Pending") return "warning";
    if (s === "Escalated") return "danger";
    return "neutral";
  };

  const handleNotifyParent = async (studentId: string) => {
    setActionLoading(studentId);
    try {
      await sendAttendanceFollowUp(studentId, { channel: "sms" });
      toast.success("Parent notified successfully.");
      refetch();
    } catch {
      toast.error("Failed to send notification.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleResolve = async (studentId: string) => {
    setActionLoading(`resolve-${studentId}`);
    try {
      await markAttendanceResolved(studentId);
      toast.success("Marked as resolved.");
      refetch();
    } catch {
      toast.error("Failed to resolve.");
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <Panel title="Attendance Follow-Up" description="Track absent learners, contact parents, and resolve attendance issues." icon={ClipboardCheck}>
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <div className="rounded-xl border border-danger-border bg-danger-soft p-4">
          <div className="text-sm font-semibold text-danger">Absent Today</div>
          <div className="mt-1 text-2xl font-black text-danger">{isLoading ? "..." : metrics?.total_absent_today ?? 0}</div>
        </div>
        <div className="rounded-xl border border-warning-border bg-warning-soft p-4">
          <div className="text-sm font-semibold text-warning">Chronic Absentees</div>
          <div className="mt-1 text-2xl font-black text-warning">{isLoading ? "..." : metrics?.chronic_absentees ?? 0}</div>
        </div>
        <div className="rounded-xl border border-info-border bg-info-soft p-4">
          <div className="text-sm font-semibold text-info">Pending Follow-Ups</div>
          <div className="mt-1 text-2xl font-black text-info">{isLoading ? "..." : metrics?.pending_follow_ups ?? 0}</div>
        </div>
        <div className="rounded-xl border border-success-border bg-success-soft p-4">
          <div className="text-sm font-semibold text-success">Resolved Today</div>
          <div className="mt-1 text-2xl font-black text-success">{isLoading ? "..." : metrics?.resolved_today ?? 0}</div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm text-left whitespace-nowrap">
          <thead className="bg-surface-muted text-foreground">
            <tr>
              <th className="px-4 py-3 font-bold border-b border-border">Student</th>
              <th className="px-4 py-3 font-bold border-b border-border">Adm No</th>
              <th className="px-4 py-3 font-bold border-b border-border">Days Absent</th>
              <th className="px-4 py-3 font-bold border-b border-border">Last Absent</th>
              <th className="px-4 py-3 font-bold border-b border-border">Parent</th>
              <th className="px-4 py-3 font-bold border-b border-border">Reason</th>
              <th className="px-4 py-3 font-bold border-b border-border">Status</th>
              <th className="px-4 py-3 font-bold border-b border-border text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-muted">Loading attendance data...</td></tr>
            ) : students.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-muted">All students are present or all absences have been resolved. Great work!</td></tr>
            ) : (
              students.map((s) => (
                <tr key={s.id} className="hover:bg-surface-muted">
                  <td className="px-4 py-3 font-semibold text-foreground">{s.student_name}</td>
                  <td className="px-4 py-3 text-muted">{s.admission_no}</td>
                  <td className="px-4 py-3">
                    <span className={`font-bold ${s.absent_days >= 5 ? "text-rose-600" : s.absent_days >= 3 ? "text-amber-600" : "text-foreground"}`}>{s.absent_days}</span>
                  </td>
                  <td className="px-4 py-3 text-muted">{s.last_absent_date}</td>
                  <td className="px-4 py-3 text-muted">{s.parent_name}</td>
                  <td className="px-4 py-3 text-muted">{s.reason || "Unknown"}</td>
                  <td className="px-4 py-3"><StatusChip label={s.follow_up_status} tone={getFollowUpTone(s.follow_up_status)} /></td>
                  <td className="px-4 py-3 text-right flex gap-2 justify-end">
                    {s.follow_up_status !== "Resolved" && (
                      <>
                        <button
                          disabled={actionLoading === s.id}
                          onClick={() => handleNotifyParent(s.id)}
                          className="inline-flex items-center gap-1 rounded-lg border border-info-border bg-info-soft px-3 py-1.5 text-xs font-bold text-info hover:bg-blue-100 disabled:opacity-50"
                        >
                          <Phone className="w-3 h-3" /> Notify
                        </button>
                        <button
                          disabled={actionLoading === `resolve-${s.id}`}
                          onClick={() => handleResolve(s.id)}
                          className="inline-flex items-center gap-1 rounded-lg border border-success-border bg-success-soft px-3 py-1.5 text-xs font-bold text-success hover:bg-emerald-100 disabled:opacity-50"
                        >
                          <CheckCircle className="w-3 h-3" /> Resolve
                        </button>
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
