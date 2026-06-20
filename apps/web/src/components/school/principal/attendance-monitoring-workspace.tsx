"use client";
import { useState } from "react";
import { UserCheck, UserX, Clock, Bell } from "lucide-react";
import { toast } from "sonner";
import { Panel, StatusChip, MetricCard, Tone } from "./shared";
import { useSchoolQuery } from "@/lib/data/school-hooks";
import { sendAttendanceAlert } from "./api-client";

type ClassAttendance = {
  id: string;
  class_name: string;
  stream: string;
  total_students: number;
  present: number;
  absent: number;
  rate: number;
  class_teacher: string;
  marked_at: string | null;
};

type AttendanceData = {
  metrics: {
    overall_rate: number;
    total_present: number;
    total_absent: number;
    classes_not_marked: number;
  };
  classes: ClassAttendance[];
};

export function AttendanceMonitoringWorkspace() {
  const { data, isLoading, refetch } = useSchoolQuery<AttendanceData>('/admin-command/principal/attendance-monitoring');
  const [alertingId, setAlertingId] = useState<string | null>(null);

  const classes = data?.classes || [];

  const getRateTone = (rate: number): Tone => {
    if (rate >= 90) return "success";
    if (rate >= 75) return "warning";
    return "danger";
  };

  const handleAlert = async (classId: string) => {
    setAlertingId(classId);
    try {
      await sendAttendanceAlert(classId);
      toast.success("Attendance alert sent to class teacher.");
    } catch {
      toast.error("Failed to send attendance alert.");
    } finally {
      setAlertingId(null);
    }
  };

  return (
    <Panel title="Attendance Monitoring" description="Track daily attendance rates across all classes." icon={UserCheck}>
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <MetricCard label="Overall Rate" value={isLoading ? "…" : `${data?.metrics?.overall_rate ?? 0}%`} icon={UserCheck} tone={getRateTone(data?.metrics?.overall_rate ?? 0)} />
        <MetricCard label="Present Today" value={isLoading ? "…" : data?.metrics?.total_present ?? 0} icon={UserCheck} tone="success" />
        <MetricCard label="Absent Today" value={isLoading ? "…" : data?.metrics?.total_absent ?? 0} icon={UserX} tone={(data?.metrics?.total_absent ?? 0) > 10 ? "danger" : "neutral"} />
        <MetricCard label="Not Yet Marked" value={isLoading ? "…" : data?.metrics?.classes_not_marked ?? 0} icon={Clock} tone={(data?.metrics?.classes_not_marked ?? 0) > 0 ? "warning" : "success"} />
      </div>

      <div className="overflow-x-auto rounded-xl border border-[#D8E0EC]">
        <table className="w-full text-sm text-left whitespace-nowrap">
          <thead className="bg-[#F8FAFC] text-[#071D49]">
            <tr>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Class</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Stream</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Total</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Present</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Absent</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Rate</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Class Teacher</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Marked</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC] text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D8E0EC]">
            {isLoading ? (
              <tr><td colSpan={9} className="px-4 py-8 text-center text-[#64748B]">Loading attendance data…</td></tr>
            ) : classes.length === 0 ? (
              <tr><td colSpan={9} className="px-4 py-8 text-center text-[#64748B]">No attendance records for today. Attendance will appear once class teachers mark their registers.</td></tr>
            ) : (
              classes.map((c) => (
                <tr key={c.id} className="hover:bg-[#F8FAFC]">
                  <td className="px-4 py-3 font-semibold text-[#071D49]">{c.class_name}</td>
                  <td className="px-4 py-3 text-[#64748B]">{c.stream || "—"}</td>
                  <td className="px-4 py-3 text-[#64748B]">{c.total_students}</td>
                  <td className="px-4 py-3 text-emerald-700 font-bold">{c.present}</td>
                  <td className="px-4 py-3 text-rose-700 font-bold">{c.absent}</td>
                  <td className="px-4 py-3"><StatusChip label={`${c.rate}%`} tone={getRateTone(c.rate)} /></td>
                  <td className="px-4 py-3 text-[#64748B]">{c.class_teacher}</td>
                  <td className="px-4 py-3 text-[#64748B]">{c.marked_at || <StatusChip label="Not Marked" tone="warning" />}</td>
                  <td className="px-4 py-3 text-right">
                    {!c.marked_at && (
                      <button
                        disabled={alertingId === c.id}
                        onClick={() => handleAlert(c.id)}
                        className="inline-flex items-center gap-1 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-amber-700 transition disabled:opacity-50"
                      >
                        <Bell className="h-3 w-3" /> Remind
                      </button>
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
