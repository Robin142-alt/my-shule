"use client";
import { BookOpen } from "lucide-react";
import { Panel, StatusChip, Tone } from "./shared";
import { useSchoolQuery } from "@/lib/data/school-hooks";
import { useState } from "react";
import { toast } from "sonner";
import { markTeachingAttendance, logTeachingLesson } from "./api-client";

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
  const { data, isLoading, refetch } = useSchoolQuery<TeachingData>('/admin-command/deputy/teaching');
  const [submittingId, setSubmittingId] = useState<string | null>(null);

  const lessons = data?.lessons || [];

  const handleAction = async (id: string, type: "Attendance" | "Log") => {
    try {
      setSubmittingId(id);
      if (type === "Attendance") {
        await markTeachingAttendance(id);
        toast.success("Attendance marked successfully.");
      } else {
        await logTeachingLesson(id);
        toast.success("Lesson logged successfully.");
      }
      refetch();
    } catch (e) {
      toast.error(`Failed to ${type === "Attendance" ? "mark attendance" : "log lesson"}.`);
    } finally {
      setSubmittingId(null);
    }
  };

  const getTone = (st: string): Tone => st === "Pending" ? "warning" : "success";

  return (
    <Panel title="Teaching Workspace" description="Manage your assigned classes, attendance, and lesson logs." icon={BookOpen}>
      <div className="grid gap-4 md:grid-cols-2 mb-6">
        <div className="rounded-xl border border-border bg-surface-muted p-4">
          <div className="text-sm font-semibold text-muted">Total Lessons</div>
          <div className="mt-1 text-lg font-black text-foreground">{isLoading ? "..." : data?.metrics?.total_lessons || 0}</div>
        </div>
      </div>
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm text-left whitespace-nowrap">
          <thead className="bg-surface-muted text-foreground">
            <tr>
              <th className="px-4 py-3 font-bold border-b border-border">Class</th>
              <th className="px-4 py-3 font-bold border-b border-border">Subject</th>
              <th className="px-4 py-3 font-bold border-b border-border">Lesson Time</th>
              <th className="px-4 py-3 font-bold border-b border-border">Attendance</th>
              <th className="px-4 py-3 font-bold border-b border-border">Lesson Log</th>
              <th className="px-4 py-3 font-bold border-b border-border text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {lessons.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted">No assigned lessons.</td>
              </tr>
            ) : (
              lessons.map((ls) => (
                <tr key={ls.id} className="hover:bg-surface-muted">
                  <td className="px-4 py-3 font-semibold text-foreground">{ls.className}</td>
                  <td className="px-4 py-3 text-muted">{ls.subject}</td>
                  <td className="px-4 py-3 text-muted">{ls.lessonTime}</td>
                  <td className="px-4 py-3"><StatusChip label={ls.attendanceStatus} tone={getTone(ls.attendanceStatus)} /></td>
                  <td className="px-4 py-3"><StatusChip label={ls.logStatus} tone={getTone(ls.logStatus)} /></td>
                  <td className="px-4 py-3 text-right">
                    {ls.attendanceStatus === "Pending" && (
                      <button 
                        onClick={() => handleAction(ls.id, "Attendance")} 
                        disabled={submittingId === ls.id}
                        className="text-blue-600 hover:underline font-semibold text-xs mr-3 disabled:opacity-50"
                      >
                        {submittingId === ls.id ? "Marking..." : "Mark"}
                      </button>
                    )}
                    {ls.logStatus === "Pending" && (
                      <button 
                        onClick={() => handleAction(ls.id, "Log")} 
                        disabled={submittingId === ls.id}
                        className="text-blue-600 hover:underline font-semibold text-xs disabled:opacity-50"
                      >
                        {submittingId === ls.id ? "Logging..." : "Log"}
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
