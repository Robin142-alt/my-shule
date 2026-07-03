"use client";
import { useState } from "react";
import { ClipboardList, Plus, Settings } from "lucide-react";
import { toast } from "sonner";
import { Panel, StatusChip, Tone } from "./shared";
import { useSchoolQuery } from "@/lib/data/school-hooks";
import { createExam } from "./api-client";
import { openPrintDocument } from "@/lib/dashboard/export";

type ExamConfig = {
  id: string;
  name: string;
  term: string;
  year: number;
  type: string;
  max_marks: number;
  grading_system: string;
  status: string;
  subjects_count: number;
  classes_count: number;
  created_at: string;
};

type ExamSetupData = {
  metrics: {
    total_exams: number;
    active_exams: number;
    draft_exams: number;
    completed_exams: number;
  };
  exams: ExamConfig[];
};

export function ExamSetupWorkspace() {
  const { data, isLoading, refetch } = useSchoolQuery<ExamSetupData>('/admin-command/exams-manager/exam-setup');
  const [isCreating, setIsCreating] = useState(false);

  const exams = data?.exams || [];

  const getStatusTone = (st: string): Tone => {
    switch (st?.toLowerCase()) {
      case "active": return "info";
      case "completed": return "success";
      case "draft": return "neutral";
      case "cancelled": return "danger";
      default: return "neutral";
    }
  };

  const handleCreate = async () => {
    setIsCreating(true);
    try {
      await createExam({});
      toast.success("Exam created successfully.");
      refetch();
    } catch {
      toast.error("Failed to create exam.");
    } finally {
      setIsCreating(false);
    }
  };

  const handleConfigureExam = (exam: ExamConfig) => {
    openPrintDocument({
      eyebrow: "Exam setup",
      title: "Exam Configuration",
      subtitle: `${exam.name} | ${exam.term} ${exam.year}`,
      rows: [
        { label: "Exam", value: exam.name },
        { label: "Term", value: exam.term },
        { label: "Year", value: String(exam.year) },
        { label: "Type", value: exam.type },
        { label: "Max marks", value: String(exam.max_marks) },
        { label: "Grading system", value: exam.grading_system },
        { label: "Subjects", value: String(exam.subjects_count) },
        { label: "Classes", value: String(exam.classes_count) },
        { label: "Status", value: exam.status },
      ],
      footer: "Configure subjects, classes, grading, and publication workflow before opening marks entry.",
    });
  };

  return (
    <Panel
      title="Exam Setup"
      description="Configure examinations, grading systems, and subject mappings."
      icon={ClipboardList}
      actions={
        <button onClick={handleCreate} disabled={isCreating} className="inline-flex items-center gap-2 rounded-lg bg-[#071D49] px-4 py-2 text-sm font-black text-white hover:bg-blue-900 transition disabled:opacity-50">
          <Plus className="w-4 h-4" /> {isCreating ? "Creating..." : "New Exam"}
        </button>
      }
    >
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
          <div className="text-sm font-semibold text-[#64748B]">Total Exams</div>
          <div className="mt-1 text-2xl font-black text-[#071D49]">{isLoading ? "..." : data?.metrics?.total_exams ?? 0}</div>
        </div>
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
          <div className="text-sm font-semibold text-blue-700">Active</div>
          <div className="mt-1 text-2xl font-black text-blue-700">{isLoading ? "..." : data?.metrics?.active_exams ?? 0}</div>
        </div>
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
          <div className="text-sm font-semibold text-[#64748B]">Draft</div>
          <div className="mt-1 text-2xl font-black text-[#071D49]">{isLoading ? "..." : data?.metrics?.draft_exams ?? 0}</div>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <div className="text-sm font-semibold text-emerald-700">Completed</div>
          <div className="mt-1 text-2xl font-black text-emerald-700">{isLoading ? "..." : data?.metrics?.completed_exams ?? 0}</div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-[#D8E0EC]">
        <table className="w-full text-sm text-left whitespace-nowrap">
          <thead className="bg-[#F8FAFC] text-[#071D49]">
            <tr>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Exam Name</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Term</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Year</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Type</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Max Marks</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Grading</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Subjects</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Classes</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Status</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC] text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D8E0EC]">
            {isLoading ? (
              <tr><td colSpan={10} className="px-4 py-8 text-center text-[#64748B]">Loading exam configurations...</td></tr>
            ) : exams.length === 0 ? (
              <tr><td colSpan={10} className="px-4 py-8 text-center text-[#64748B]">No exams configured yet. Click &quot;New Exam&quot; to set up the first examination.</td></tr>
            ) : (
              exams.map((exam) => (
                <tr key={exam.id} className="hover:bg-[#F8FAFC]">
                  <td className="px-4 py-3 font-semibold text-[#071D49]">{exam.name}</td>
                  <td className="px-4 py-3 text-[#64748B]">{exam.term}</td>
                  <td className="px-4 py-3 text-[#64748B]">{exam.year}</td>
                  <td className="px-4 py-3 text-[#64748B]">{exam.type}</td>
                  <td className="px-4 py-3 text-[#64748B]">{exam.max_marks}</td>
                  <td className="px-4 py-3 text-[#64748B]">{exam.grading_system}</td>
                  <td className="px-4 py-3 text-[#64748B]">{exam.subjects_count}</td>
                  <td className="px-4 py-3 text-[#64748B]">{exam.classes_count}</td>
                  <td className="px-4 py-3"><StatusChip label={exam.status} tone={getStatusTone(exam.status)} /></td>
                  <td className="px-4 py-3 text-right">
                    <button type="button" onClick={() => handleConfigureExam(exam)} className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:underline"><Settings className="w-3 h-3" /> Configure</button>
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
