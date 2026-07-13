"use client";
import { useState, type FormEvent } from "react";
import { ClipboardList, Plus, Settings } from "lucide-react";
import { toast } from "sonner";
import { Panel, StatusChip, Tone } from "./shared";
import { useSchoolQuery } from "@/lib/data/school-hooks";
import { createExam } from "./api-client";
import { openPrintDocument } from "@/lib/dashboard/export";
import { Modal } from "@/components/ui/modal";

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
  starts_on?: string;
  ends_on?: string;
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
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    starts_on: "",
    ends_on: "",
    status: "scheduled",
  });

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

  const openCreateForm = () => {
    setFormError(null);
    setForm({
      name: "",
      starts_on: "",
      ends_on: "",
      status: "scheduled",
    });
    setIsCreateOpen(true);
  };

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    const name = form.name.trim();
    if (!name) {
      setFormError("Exam name is required.");
      return;
    }

    if (!form.starts_on || !form.ends_on) {
      setFormError("Start and end dates are required.");
      return;
    }

    if (new Date(form.ends_on) < new Date(form.starts_on)) {
      setFormError("End date cannot be before start date.");
      return;
    }

    setIsCreating(true);
    try {
      await createExam({
        name,
        starts_on: form.starts_on,
        ends_on: form.ends_on,
        status: form.status,
      });
      toast.success("Exam created successfully.");
      setIsCreateOpen(false);
      await refetch();
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
        <button type="button" onClick={openCreateForm} disabled={isCreating} className="inline-flex items-center gap-2 rounded-lg bg-[#071D49] px-4 py-2 text-sm font-black text-white hover:bg-blue-900 transition disabled:opacity-50">
          <Plus className="w-4 h-4" /> New Exam
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
              <tr><td colSpan={10} className="px-4 py-8 text-center text-[#64748B]">No exams configured yet. Create the first exam cycle here before timetable, marks entry, moderation, and report cards can run.</td></tr>
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

      <Modal
        open={isCreateOpen}
        onClose={() => !isCreating && setIsCreateOpen(false)}
        title="Create exam cycle"
        description="This creates a real tenant-scoped exam cycle for the current school."
        size="lg"
        footer={
          <>
            <button
              type="button"
              onClick={() => setIsCreateOpen(false)}
              disabled={isCreating}
              className="rounded-lg border border-[#D8E0EC] bg-white px-4 py-2 text-sm font-bold text-[#071D49] hover:bg-[#F8FAFC] disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="exam-setup-create-form"
              disabled={isCreating}
              className="rounded-lg bg-[#071D49] px-4 py-2 text-sm font-black text-white hover:bg-blue-900 disabled:opacity-50"
            >
              {isCreating ? "Creating..." : "Create exam"}
            </button>
          </>
        }
      >
        <form id="exam-setup-create-form" onSubmit={handleCreate} className="space-y-4">
          {formError ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">
              {formError}
            </div>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-1 text-sm font-bold text-[#334155] md:col-span-2">
              Exam name
              <input
                value={form.name}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                className="w-full rounded-xl border border-[#D8E0EC] px-3 py-2 text-sm font-semibold text-[#071D49] outline-none focus:border-blue-400"
                placeholder="Term 1 Opener"
                required
              />
            </label>

            <label className="space-y-1 text-sm font-bold text-[#334155]">
              Starts on
              <input
                type="date"
                value={form.starts_on}
                onChange={(event) => setForm((current) => ({ ...current, starts_on: event.target.value }))}
                className="w-full rounded-xl border border-[#D8E0EC] px-3 py-2 text-sm font-semibold text-[#071D49] outline-none focus:border-blue-400"
                required
              />
            </label>

            <label className="space-y-1 text-sm font-bold text-[#334155]">
              Ends on
              <input
                type="date"
                value={form.ends_on}
                onChange={(event) => setForm((current) => ({ ...current, ends_on: event.target.value }))}
                className="w-full rounded-xl border border-[#D8E0EC] px-3 py-2 text-sm font-semibold text-[#071D49] outline-none focus:border-blue-400"
                required
              />
            </label>

            <label className="space-y-1 text-sm font-bold text-[#334155]">
              Status
              <select
                value={form.status}
                onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}
                className="w-full rounded-xl border border-[#D8E0EC] px-3 py-2 text-sm font-semibold text-[#071D49] outline-none focus:border-blue-400"
              >
                <option value="scheduled">Scheduled</option>
                <option value="draft">Draft</option>
                <option value="active">Active</option>
              </select>
            </label>
          </div>
        </form>
      </Modal>
    </Panel>
  );
}
