"use client";
import { BookOpen } from "lucide-react";
import { Panel, StatusChip, Tone } from "./shared";
import { useSchoolQuery, useSchoolMutation } from "@/lib/data/school-hooks";
import { useQueryClient } from "@tanstack/react-query";

export type TeachingLesson = {
  id: string;
  className: string;
  subject: string;
  lessonTime: string;
  attendanceStatus: "Pending" | "Marked";
  logStatus: "Pending" | "Logged";
};

type TeachingData = {
  metrics: {
    total_lessons: number;
  };
  lessons: TeachingLesson[];
};

export function DeputyTeachingWorkspace() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useSchoolQuery<TeachingData>('/admin-command/deputy/teaching');

  const attendanceMutation = useSchoolMutation<{ id: string }, { id: string }>(
    ({ id }) => `/admin-command/deputy/teaching/${id}/mark-attendance`,
    'POST',
    {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ["school", "session", '/admin-command/deputy/teaching'] })
    }
  );

  const logMutation = useSchoolMutation<{ id: string }, { id: string }>(
    ({ id }) => `/admin-command/deputy/teaching/${id}/log-lesson`,
    'POST',
    {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ["school", "session", '/admin-command/deputy/teaching'] })
    }
  );

  const lessons = data?.lessons || [];

  const handleAction = async (id: string, type: "Attendance" | "Log") => {
    try {
      if (type === "Attendance") {
        await attendanceMutation.mutateAsync({ id });
        alert("Attendance marked successfully.");
      } else {
        await logMutation.mutateAsync({ id });
        alert("Lesson logged successfully.");
      }
    } catch (e) {
      alert(`Failed to ${type === "Attendance" ? "mark attendance" : "log lesson"}.`);
    }
  };

  const getTone = (st: string): Tone => st === "Pending" ? "warning" : "success";

  return (
    <Panel title="Teaching Workspace" description="Manage your assigned classes, attendance, and lesson logs." icon={BookOpen}>
      <div className="grid gap-4 md:grid-cols-2 mb-6">
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
          <div className="text-sm font-semibold text-[#64748B]">Total Lessons</div>
          <div className="mt-1 text-lg font-black text-[#071D49]">{isLoading ? "..." : data?.metrics?.total_lessons || 0}</div>
        </div>
      </div>
      <div className="overflow-x-auto rounded-xl border border-[#D8E0EC]">
        <table className="w-full text-sm text-left whitespace-nowrap">
          <thead className="bg-[#F8FAFC] text-[#071D49]">
            <tr>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Class</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Subject</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Lesson Time</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Attendance</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Lesson Log</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC] text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D8E0EC]">
            {lessons.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-[#64748B]">No assigned lessons.</td>
              </tr>
            ) : (
              lessons.map((ls) => (
                <tr key={ls.id} className="hover:bg-[#F8FAFC]">
                  <td className="px-4 py-3 font-semibold text-[#071D49]">{ls.className}</td>
                  <td className="px-4 py-3 text-[#64748B]">{ls.subject}</td>
                  <td className="px-4 py-3 text-[#64748B]">{ls.lessonTime}</td>
                  <td className="px-4 py-3"><StatusChip label={ls.attendanceStatus} tone={getTone(ls.attendanceStatus)} /></td>
                  <td className="px-4 py-3"><StatusChip label={ls.logStatus} tone={getTone(ls.logStatus)} /></td>
                  <td className="px-4 py-3 text-right">
                    {ls.attendanceStatus === "Pending" && (
                      <button onClick={() => handleAction(ls.id, "Attendance")} className="text-blue-600 hover:underline font-semibold text-xs mr-3">Mark</button>
                    )}
                    {ls.logStatus === "Pending" && (
                      <button onClick={() => handleAction(ls.id, "Log")} className="text-blue-600 hover:underline font-semibold text-xs">Log</button>
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
