"use client";
import { useState, useEffect } from "react";
import { CalendarClock } from "lucide-react";
import { Panel, StatusChip, Tone } from "./shared";
import { readSchoolData, addSchoolRecord, updateSchoolRecord, subscribeToSchoolDataUpdates, createNotification } from "@/lib/school/school-operational-store";

export type ReliefLesson = {
  id: string;
  lessonTime: string;
  className: string;
  subject: string;
  absentTeacher: string;
  reliefStatus: "Needed" | "Assigned" | "Covered";
  assignedTeacher?: string;
};

export function DeputyTimetableReliefWorkspace() {
  const [lessons, setLessons] = useState<ReliefLesson[]>([]);

  const loadData = () => {
    const data = readSchoolData<ReliefLesson>("deputyRelief");
    setLessons(data.length > 0 ? data : [
      { id: "1", lessonTime: "09:00 - 09:40", className: "Form 2 East", subject: "Mathematics", absentTeacher: "Mr. Omondi", reliefStatus: "Needed" }
    ]);
  };

  useEffect(() => {
    loadData();
    const unsub = subscribeToSchoolDataUpdates(({ moduleName }) => {
      if (moduleName === "deputyRelief") loadData();
    });
    return unsub;
  }, []);

  const handleAssign = (id: string, className: string, time: string) => {
    const teacher = prompt("Enter the name of the relief teacher to assign:");
    if (!teacher) return;
    
    updateSchoolRecord("deputyRelief", id, { reliefStatus: "Assigned", assignedTeacher: teacher });
    createNotification({
      audienceRoles: ["teacher", "deputy_principal"],
      sourceModule: "timetable",
      title: "Relief Lesson Assigned",
      body: `You have been assigned to cover ${className} at ${time}.`,
      severity: "info",
    });
    alert(`${teacher} has been assigned to cover ${className}.`);
  };

  const getStatusTone = (st: string): Tone => {
    if (st === "Needed") return "danger";
    if (st === "Assigned") return "warning";
    return "success";
  };

  return (
    <Panel title="Timetable & Relief Lessons" description="Lesson disruptions, absences, and relief coverage." icon={CalendarClock} actions={
      <button onClick={() => alert("Auto-assigning available teachers...")} className="rounded-lg bg-[#071D49] px-4 py-2 text-sm font-black text-white hover:bg-blue-900 transition">Auto-Assign Relief</button>
    }>
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
            {lessons.map((lesson) => (
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
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}