"use client";
import { useState } from "react";
import { UserRoundCheck, Search } from "lucide-react";
import { Panel, StatusChip, Tone } from "./shared";
import { useSchoolQuery, useSchoolMutation } from "@/lib/data/school-hooks";
import { useQueryClient } from "@tanstack/react-query";

export type AttendanceRecord = {
  id: string;
  studentName: string;
  className: string;
  status: "Absent" | "Late" | "Present";
  reason: string;
  parentNotified: "Pending" | "Notified" | "Followed Up";
};

type AttendanceData = {
  metrics: {
    absent_students: number;
    late_students: number;
  };
  records: AttendanceRecord[];
};

export function DeputyAttendanceWorkspace() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useSchoolQuery<AttendanceData>('/admin-command/deputy/attendance');
  const notifyMutation = useSchoolMutation<{ id: string }>('/admin-command/deputy/attendance/:id/notify', 'POST', {
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["school", "session", '/admin-command/deputy/attendance'] });
    }
  });

  const records = data?.records || [];

  const handleNotifyParent = async (id: string, studentName: string) => {
    // The endpoint expects /attendance/:id/notify, so we replace :id in the hook or construct the URL manually if hook doesn't support it.
    // wait, `useSchoolMutation` takes url directly. We need to pass the constructed url.
    // Let's assume we can't easily change the hook, so we'll construct it in the mutation or use standard fetch if needed.
    // Wait! `useSchoolMutation` from `school-hooks` takes a fixed URL. 
    // We should use an API client directly or construct the hook carefully. Let's just create a quick fetch inside the handler since the hook might not support dynamic URLs easily.
  };

  const getStatusTone = (st: string): Tone => {
    if (st === "Absent") return "danger";
    if (st === "Late") return "warning";
    return "success";
  };

  const getNotifiedTone = (st: string): Tone => {
    if (st === "Pending") return "warning";
    if (st === "Notified") return "info";
    return "success";
  };

  return (
    <Panel title="Attendance & Punctuality" description="Follow up missing records, repeated absenteeism, and lateness." icon={UserRoundCheck} actions={
      <div className="flex gap-2">
        <button className="rounded-lg border border-[#D8E0EC] px-4 py-2 text-sm font-bold text-[#071D49]">Remind Unmarked</button>
        <button onClick={() => alert("Creating custom follow-up list...")} className="rounded-lg bg-[#071D49] px-4 py-2 text-sm font-black text-white hover:bg-blue-900 transition">Create Follow-Up</button>
      </div>
    }>
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#64748B]" />
          <input type="text" placeholder="Search student or admission no..." className="w-full rounded-xl border border-[#D8E0EC] py-2 pl-9 pr-3 text-sm focus:border-[#071D49] focus:outline-none" />
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2 mb-6">
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
          <div className="text-sm font-semibold text-rose-700">Absent Today</div>
          <div className="mt-1 text-lg font-black text-rose-700">{isLoading ? "..." : data?.metrics?.absent_students || 0}</div>
        </div>
        <div className="rounded-xl border border-orange-200 bg-orange-50 p-4">
          <div className="text-sm font-semibold text-orange-700">Late Today</div>
          <div className="mt-1 text-lg font-black text-orange-700">{isLoading ? "..." : data?.metrics?.late_students || 0}</div>
        </div>
      </div>
      <div className="overflow-x-auto rounded-xl border border-[#D8E0EC]">
        <table className="w-full text-sm text-left whitespace-nowrap">
          <thead className="bg-[#F8FAFC] text-[#071D49]">
            <tr>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Student</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Class</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Status</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Reason</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Parent Notified</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC] text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D8E0EC]">
            {records.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-[#64748B]">No recent attendance records found.</td>
              </tr>
            ) : (
              records.map((rec) => (
                <tr key={rec.id} className="hover:bg-[#F8FAFC]">
                  <td className="px-4 py-3 font-semibold text-[#071D49]">{rec.studentName}</td>
                  <td className="px-4 py-3 text-[#64748B]">{rec.className}</td>
                  <td className="px-4 py-3"><StatusChip label={rec.status} tone={getStatusTone(rec.status)} /></td>
                  <td className="px-4 py-3 text-[#64748B]">{rec.reason}</td>
                  <td className="px-4 py-3"><StatusChip label={rec.parentNotified} tone={getNotifiedTone(rec.parentNotified)} /></td>
                  <td className="px-4 py-3 text-right">
                    {rec.parentNotified === "Pending" && (
                      <button onClick={async () => {
                        try {
                          await fetch(`/api/v1/admin-command/deputy/attendance/${rec.id}/notify`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' }
                          });
                          queryClient.invalidateQueries({ queryKey: ["school", "session", '/admin-command/deputy/attendance'] });
                          alert(`Parent of ${rec.studentName} has been notified.`);
                        } catch (e) {
                          alert('Failed to notify parent');
                        }
                      }} className="text-blue-600 hover:underline font-semibold text-xs mr-3">Contact Parent</button>
                    )}
                    <button className="text-blue-600 hover:underline font-semibold text-xs">Follow Up</button>
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