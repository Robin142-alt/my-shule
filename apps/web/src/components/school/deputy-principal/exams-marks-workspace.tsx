"use client";
import { useState, useEffect } from "react";
import { ClipboardCheck } from "lucide-react";
import { Panel, StatusChip, Tone } from "./shared";
import { readSchoolData, updateSchoolRecord, subscribeToSchoolDataUpdates, createNotification } from "@/lib/school/school-operational-store";

export type ExamMarkProgress = {
  id: string;
  exam: string;
  className: string;
  subject: string;
  teacher: string;
  progress: "Missing Marks" | "In Progress" | "Completed";
};

export function DeputyExamsMarksWorkspace() {
  const [exams, setExams] = useState<ExamMarkProgress[]>([]);

  const loadData = () => {
    const data = readSchoolData<ExamMarkProgress>("deputyExams");
    setExams(data.length > 0 ? data : [
      { id: "1", exam: "Term 2 Midterm", className: "Form 2", subject: "English", teacher: "Mr. Kamau", progress: "Missing Marks" }
    ]);
  };

  useEffect(() => {
    loadData();
    const unsub = subscribeToSchoolDataUpdates(({ moduleName }) => {
      if (moduleName === "deputyExams") loadData();
    });
    return unsub;
  }, []);

  const handleFlagDelay = (id: string, teacher: string) => {
    updateSchoolRecord("deputyExams", id, { progress: "In Progress" });
    createNotification({
      audienceRoles: ["teacher"],
      sourceModule: "exams",
      title: "Marks Entry Delayed",
      body: `Please expedite the marks entry for your assigned class as the deadline approaches.`,
      severity: "warning",
    });
    alert(`Reminder sent to ${teacher} regarding delayed marks.`);
  };

  const getTone = (st: string): Tone => {
    if (st === "Missing Marks") return "danger";
    if (st === "In Progress") return "warning";
    return "success";
  };

  return (
    <Panel title="Exams & Marks" description="Monitor exams at senior level and enter marks for assigned classes." icon={ClipboardCheck} actions={
      <button onClick={() => alert("Launching gradebook...")} className="rounded-lg bg-[#071D49] px-4 py-2 text-sm font-black text-white hover:bg-blue-900 transition">Enter My Marks</button>
    }>
      <div className="overflow-x-auto rounded-xl border border-[#D8E0EC]">
        <table className="w-full text-sm text-left whitespace-nowrap">
          <thead className="bg-[#F8FAFC] text-[#071D49]">
            <tr>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Exam</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Class</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Subject</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Teacher</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Progress</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC] text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D8E0EC]">
            {exams.map((ex) => (
              <tr key={ex.id} className="hover:bg-[#F8FAFC]">
                <td className="px-4 py-3 font-semibold text-[#071D49]">{ex.exam}</td>
                <td className="px-4 py-3 text-[#64748B]">{ex.className}</td>
                <td className="px-4 py-3 text-[#64748B]">{ex.subject}</td>
                <td className="px-4 py-3 text-[#64748B]">{ex.teacher}</td>
                <td className="px-4 py-3"><StatusChip label={ex.progress} tone={getTone(ex.progress)} /></td>
                <td className="px-4 py-3 text-right">
                  {ex.progress === "Missing Marks" && (
                    <button onClick={() => handleFlagDelay(ex.id, ex.teacher)} className="text-blue-600 hover:underline font-semibold text-xs">Flag Delay</button>
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