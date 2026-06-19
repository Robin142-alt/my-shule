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
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
          <div className="text-sm font-semibold text-rose-700">Absent Today</div>
          <div className="mt-1 text-2xl font-black text-rose-700">{isLoading ? "..." : metrics?.total_absent_today ?? 0}</div>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <div className="text-sm font-semibold text-amber-700">Chronic Absentees</div>
          <div className="mt-1 text-2xl font-black text-amber-700">{isLoading ? "..." : metrics?.chronic_absentees ?? 0}</div>
        </div>
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
          <div className="text-sm font-semibold text-blue-700">Pending Follow-Ups</div>
          <div className="mt-1 text-2xl font-black text-blue-700">{isLoading ? "..." : metrics?.pending_follow_ups ?? 0}</div>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <div className="text-sm font-semibold text-emerald-700">Resolved Today</div>
          <div className="mt-1 text-2xl font-black text-emerald-700">{isLoading ? "..." : metrics?.resolved_today ?? 0}</div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-[#D8E0EC]">
        <table className="w-full text-sm text-left whitespace-nowrap">
          <thead className="bg-[#F8FAFC] text-[#071D49]">
            <tr>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Student</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Adm No</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Days Absent</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Last Absent</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Parent</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Reason</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Status</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC] text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D8E0EC]">
            {isLoading ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-[#64748B]">Loading attendance data...</td></tr>
            ) : students.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-[#64748B]">All students are present or all absences have been resolved. Great work!</td></tr>
            ) : (
              students.map((s) => (
                <tr key={s.id} className="hover:bg-[#F8FAFC]">
                  <td className="px-4 py-3 font-semibold text-[#071D49]">{s.student_name}</td>
                  <td className="px-4 py-3 text-[#64748B]">{s.admission_no}</td>
                  <td className="px-4 py-3">
                    <span className={`font-bold ${s.absent_days >= 5 ? "text-rose-600" : s.absent_days >= 3 ? "text-amber-600" : "text-[#071D49]"}`}>{s.absent_days}</span>
                  </td>
                  <td className="px-4 py-3 text-[#64748B]">{s.last_absent_date}</td>
                  <td className="px-4 py-3 text-[#64748B]">{s.parent_name}</td>
                  <td className="px-4 py-3 text-[#64748B]">{s.reason || "Unknown"}</td>
                  <td className="px-4 py-3"><StatusChip label={s.follow_up_status} tone={getFollowUpTone(s.follow_up_status)} /></td>
                  <td className="px-4 py-3 text-right flex gap-2 justify-end">
                    {s.follow_up_status !== "Resolved" && (
                      <>
                        <button
                          disabled={actionLoading === s.id}
                          onClick={() => handleNotifyParent(s.id)}
                          className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-100 disabled:opacity-50"
                        >
                          <Phone className="w-3 h-3" /> Notify
                        </button>
                        <button
                          disabled={actionLoading === `resolve-${s.id}`}
                          onClick={() => handleResolve(s.id)}
                          className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
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
