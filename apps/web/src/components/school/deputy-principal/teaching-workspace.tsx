"use client";
import { useState, useEffect } from "react";
import { BookOpen } from "lucide-react";
import { Panel, StatusChip, Tone } from "./shared";
import { readSchoolData, updateSchoolRecord, subscribeToSchoolDataUpdates, createAuditLog } from "@/lib/school/school-operational-store";

export type TeachingLesson = {
  id: string;
  className: string;
  subject: string;
  lessonTime: string;
  attendanceStatus: "Pending" | "Marked";
  logStatus: "Pending" | "Logged";
};

export function DeputyTeachingWorkspace() {
  const [lessons, setLessons] = useState<TeachingLesson[]>([]);

  const loadData = () => {
    const data = readSchoolData<TeachingLesson>("deputyTeaching");
    setLessons(data.length > 0 ? data : [
      { id: "1", className: "Form 3 North", subject: "Geography", lessonTime: "11:20 - 12:00", attendanceStatus: "Pending", logStatus: "Pending" }
    ]);
  };

  useEffect(() => {
    loadData();
    const unsub = subscribeToSchoolDataUpdates(({ moduleName }) => {
      if (moduleName === "deputyTeaching") loadData();
    });
    return unsub;
  }, []);

  const handleAction = (id: string, type: "Attendance" | "Log") => {
    if (type === "Attendance") {
      updateSchoolRecord("deputyTeaching", id, { attendanceStatus: "Marked" });
      createAuditLog({ module: "teaching", action: "Mark Attendance", title: "Attendance Marked", body: `Attendance marked for lesson ${id}`, actorRole: "deputy_principal" });
      alert("Attendance marked successfully.");
    } else {
      updateSchoolRecord("deputyTeaching", id, { logStatus: "Logged" });
      createAuditLog({ module: "teaching", action: "Log Lesson", title: "Lesson Logged", body: `Lesson logged for ${id}`, actorRole: "deputy_principal" });
      alert("Lesson logged successfully.");
    }
  };

  const getTone = (st: string): Tone => st === "Pending" ? "warning" : "success";

  return (
    <Panel title="Teaching Workspace" description="Manage your assigned classes, attendance, and lesson logs." icon={BookOpen}>
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
            {lessons.map((ls) => (
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
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}