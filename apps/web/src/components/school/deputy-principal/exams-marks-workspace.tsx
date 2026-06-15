"use client";
import { useState } from "react";
import { ClipboardCheck } from "lucide-react";
import { Panel, StatusChip, Tone } from "./shared";
import { useSchoolQuery, useSchoolMutation } from "@/lib/data/school-hooks";
import { useQueryClient } from "@tanstack/react-query";

export type ExamMarkProgress = {
  id: string;
  exam: string;
  className: string;
  subject: string;
  teacher: string;
  progress: "Missing Marks" | "In Progress" | "Completed";
};

type ExamsData = {
  metrics: {
    draft_marks: number;
  };
  examsList: ExamMarkProgress[];
};

export function DeputyExamsMarksWorkspace() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useSchoolQuery<ExamsData>('/admin-command/deputy/exams');

  const flagMutation = useSchoolMutation<{ id: string }>('/admin-command/deputy/exams/:id/flag-delay', 'POST', {
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["school", "session", '/admin-command/deputy/exams'] })
  });

  const exams = data?.examsList || [];

  const handleFlagDelay = async (id: string, teacher: string) => {
    try {
      await fetch(`/api/v1/admin-command/deputy/exams/${id}/flag-delay`, { method: 'POST', headers: { 'Content-Type': 'application/json' } });
      queryClient.invalidateQueries({ queryKey: ["school", "session", '/admin-command/deputy/exams'] });
      alert(`Reminder sent to ${teacher} regarding delayed marks.`);
    } catch (e) {
      alert("Failed to flag delay.");
    }
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
      <div className="grid gap-4 md:grid-cols-2 mb-6">
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
          <div className="text-sm font-semibold text-[#64748B]">Draft Marks Pending</div>
          <div className="mt-1 text-lg font-black text-[#071D49]">{isLoading ? "..." : data?.metrics?.draft_marks || 0}</div>
        </div>
      </div>
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
            {exams.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-[#64748B]">No active exam records found.</td>
              </tr>
            ) : (
              exams.map((ex) => (
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
              ))
            )}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}