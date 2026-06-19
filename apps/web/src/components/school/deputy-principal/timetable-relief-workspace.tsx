"use client";
import { useState } from "react";
import { CalendarClock } from "lucide-react";
import { Panel, StatusChip, Tone } from "./shared";
import { useSchoolQuery, useSchoolMutation } from "@/lib/data/school-hooks";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { assignReliefTeacher, autoAssignRelief } from "./api-client";

export type ReliefLesson = {
  id: string;
  lessonTime: string;
  className: string;
  subject: string;
  absentTeacher: string;
  reliefStatus: "Needed" | "Assigned" | "Covered";
  assignedTeacher?: string;
};

type TimetableData = {
  metrics: {
    total_periods: number;
  };
  lessons: ReliefLesson[];
};

export function DeputyTimetableReliefWorkspace() {
  const queryClient = useQueryClient();
  const { data, isLoading, refetch } = useSchoolQuery<TimetableData>('/admin-command/deputy/timetable');
  const [isAutoAssigning, setIsAutoAssigning] = useState(false);

  const assignMutation = useSchoolMutation<
    { id: string; teacherName: string },
    { id: string; teacherName: string }
  >(
    ({ id }) => `/admin-command/deputy/timetable/${id}/assign`,
    'POST',
    {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ["school", "session", '/admin-command/deputy/timetable'] })
    }
  );

  const lessons = data?.lessons || [];

  const handleAssign = async (id: string, className: string, time: string) => {
    const teacher = prompt("Enter the name of the relief teacher to assign:");
    if (!teacher) return;
    
    try {
      await assignReliefTeacher(id, teacher);
      queryClient.invalidateQueries({ queryKey: ["school", "session", '/admin-command/deputy/timetable'] });
      toast.success(`${teacher} has been assigned to cover ${className} at ${time}.`);
    } catch (e: any) {
      toast.error(e.message || "Failed to assign relief teacher.");
    }
  };

  const handleAutoAssign = async () => {
    try {
      setIsAutoAssigning(true);
      await autoAssignRelief();
      toast.success("Auto-assignment complete. Free teachers have been assigned to needed lessons.");
      refetch();
    } catch (e: any) {
      toast.error("Failed to run auto-assignment algorithm.");
    } finally {
      setIsAutoAssigning(false);
    }
  };

  const getStatusTone = (st: string): Tone => {
    if (st === "Needed") return "danger";
    if (st === "Assigned") return "warning";
    return "success";
  };

  return (
    <Panel title="Timetable & Relief Lessons" description="Lesson disruptions, absences, and relief coverage." icon={CalendarClock} actions={
      <button 
        onClick={handleAutoAssign} 
        disabled={isAutoAssigning}
        className="rounded-lg bg-[#071D49] px-4 py-2 text-sm font-black text-white hover:bg-blue-900 transition disabled:opacity-50"
      >
        {isAutoAssigning ? "Assigning..." : "Auto-Assign Relief"}
      </button>
    }>
      <div className="grid gap-4 md:grid-cols-2 mb-6">
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
          <div className="text-sm font-semibold text-[#64748B]">Total Periods Today</div>
          <div className="mt-1 text-lg font-black text-[#071D49]">{isLoading ? "..." : data?.metrics?.total_periods || 0}</div>
        </div>
      </div>
      <div className="overflow-x-auto rounded-xl border border-[#D8E0EC]">
        <table className="w-full text-sm text-left whitespace-nowrap">
          <thead className="bg-[#F8FAFC] text-[#071D49]">
            <tr>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Lesson Time</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Class</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Subject</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Absent Teacher</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Relief</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC] text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D8E0EC]">
            {lessons.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-[#64748B]">No relief lessons found.</td>
              </tr>
            ) : (
              lessons.map((lesson) => (
                <tr key={lesson.id} className="hover:bg-[#F8FAFC]">
                  <td className="px-4 py-3 text-[#64748B]">{lesson.lessonTime}</td>
                  <td className="px-4 py-3 font-semibold text-[#071D49]">{lesson.className}</td>
                  <td className="px-4 py-3 text-[#64748B]">{lesson.subject}</td>
                  <td className="px-4 py-3 text-[#64748B]">{lesson.absentTeacher}</td>
                  <td className="px-4 py-3">
                    <StatusChip label={lesson.reliefStatus === "Assigned" ? `Assigned to ${lesson.assignedTeacher}` : lesson.reliefStatus} tone={getStatusTone(lesson.reliefStatus)} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    {lesson.reliefStatus === "Needed" && (
                      <button onClick={() => handleAssign(lesson.id, lesson.className, lesson.lessonTime)} className="text-blue-600 hover:underline font-semibold text-xs">Assign</button>
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
