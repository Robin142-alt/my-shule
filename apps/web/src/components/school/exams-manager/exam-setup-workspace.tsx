"use client";
import { useState, type FormEvent } from "react";
import { ClipboardList, Plus, Settings } from "lucide-react";
import { toast } from "sonner";
import { Panel, StatusChip, Tone } from "./shared";
import { useSchoolQuery } from "@/lib/data/school-hooks";
import { configureExam, createExam } from "./api-client";
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

const toDateInputValue = (value?: string) => value ? value.slice(0, 10) : "";

export function ExamSetupWorkspace() {
  const { data, isLoading, refetch } = useSchoolQuery<ExamSetupData>('/admin-command/exams-manager/exam-setup');
  const [isCreating, setIsCreating] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [configuringExam, setConfiguringExam] = useState<ExamConfig | null>(null);
  const [isConfiguring, setIsConfiguring] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    starts_on: "",
    ends_on: "",
    status: "draft",
  });

  const exams = data?.exams || [];

  const getStatusTone = (st: string): Tone => {
    switch (st?.toLowerCase()) {
      case "submitted": return "info";
      case "reviewed": return "info";
      case "locked": return "warning";
      case "published": return "success";
      case "draft": return "neutral";
      case "archived": return "danger";
      default: return "neutral";
    }
  };

  const openCreateForm = () => {
    setFormError(null);
    setForm({
      name: "",
      starts_on: "",
      ends_on: "",
      status: "draft",
    });
    setIsCreateOpen(true);
  };

  const openConfigureForm = (exam: ExamConfig) => {
    setFormError(null);
    setForm({
      name: exam.name || "",
      starts_on: toDateInputValue(exam.starts_on),
      ends_on: toDateInputValue(exam.ends_on),
      status: exam.status?.toLowerCase() || "draft",
    });
    setConfiguringExam(exam);
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

  const handleConfigure = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    if (!configuringExam) {
      setFormError("Choose an exam cycle to configure.");
      return;
    }

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

    setIsConfiguring(true);
    try {
      await configureExam(configuringExam.id, {
        name,
        starts_on: form.starts_on,
        ends_on: form.ends_on,
        status: form.status,
      });
      toast.success("Exam configured successfully.");
      setConfiguringExam(null);
      await refetch();
    } catch {
      toast.error("Failed to configure exam.");
    } finally {
      setIsConfiguring(false);
    }
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
          <div className="text-sm font-semibold text-blue-700">In workflow</div>
          <div className="mt-1 text-2xl font-black text-blue-700">{isLoading ? "..." : data?.metrics?.active_exams ?? 0}</div>
        </div>
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
          <div className="text-sm font-semibold text-[#64748B]">Draft</div>
          <div className="mt-1 text-2xl font-black text-[#071D49]">{isLoading ? "..." : data?.metrics?.draft_exams ?? 0}</div>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <div className="text-sm font-semibold text-emerald-700">Published/archived</div>
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
              <tr>
                <td colSpan={10} className="px-4 py-8 text-center">
                  <div className="mx-auto flex max-w-xl flex-col items-center gap-3 text-[#64748B]">
                    <div>
                      <p className="font-black text-[#071D49]">No exams configured yet</p>
                      <p className="mt-1 text-sm leading-6">
                        Create the first exam cycle here before timetable, marks entry, moderation, and report cards can run.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={openCreateForm}
                      className="inline-flex items-center gap-2 rounded-lg bg-[#071D49] px-4 py-2 text-xs font-black text-white hover:bg-blue-900"
                    >
                      <Plus className="h-4 w-4" />
                      Create first exam cycle
                    </button>
                  </div>
                </td>
              </tr>
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
                    <button type="button" onClick={() => openConfigureForm(exam)} className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:underline"><Settings className="w-3 h-3" /> Configure</button>
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
                <option value="draft">Draft</option>
                <option value="submitted">Open for marks</option>
                <option value="reviewed">Reviewed</option>
                <option value="locked">Locked for report cards</option>
              </select>
            </label>
          </div>
        </form>
      </Modal>

      <Modal
        open={Boolean(configuringExam)}
        onClose={() => !isConfiguring && setConfiguringExam(null)}
        title="Configure exam cycle"
        description={configuringExam ? `Update ${configuringExam.name} for the current school. Subjects, classes, and grading remain governed by their own setup workspaces.` : "Update this tenant-scoped exam cycle."}
        size="lg"
        footer={
          <>
            <button
              type="button"
              onClick={() => setConfiguringExam(null)}
              disabled={isConfiguring}
              className="rounded-lg border border-[#D8E0EC] bg-white px-4 py-2 text-sm font-bold text-[#071D49] hover:bg-[#F8FAFC] disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="exam-setup-configure-form"
              disabled={isConfiguring}
              className="rounded-lg bg-[#071D49] px-4 py-2 text-sm font-black text-white hover:bg-blue-900 disabled:opacity-50"
            >
              {isConfiguring ? "Saving..." : "Save configuration"}
            </button>
          </>
        }
      >
        <form id="exam-setup-configure-form" onSubmit={handleConfigure} className="space-y-4">
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
                <option value="draft">Draft</option>
                <option value="submitted">Open for marks</option>
                <option value="reviewed">Reviewed</option>
                <option value="locked">Locked for report cards</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </select>
            </label>
          </div>
        </form>
      </Modal>
    </Panel>
  );
}
