"use client";

import { useState, type FormEvent } from "react";
import { ClipboardList, Plus, Settings } from "lucide-react";
import { toast } from "sonner";

import { Modal } from "@/components/ui/modal";
import { useSchoolQuery } from "@/lib/data/school-hooks";

import { configureExam, createExam } from "./api-client";
import { Panel, StatusChip, type Tone } from "./shared";

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

type ExamManagerOption = {
  id: string;
  label: string;
  code?: string | null;
  status?: string | null;
};

type ExamManagerOptions = {
  terms?: ExamManagerOption[];
  subjects?: ExamManagerOption[];
  classes?: ExamManagerOption[];
};

const toDateInputValue = (value?: string) => value ? value.slice(0, 10) : "";

const gradingOptions = [
  "CBC performance levels",
  "8-4-4 A to E",
  "Percentage bands",
  "Competency rubric",
];

const emptyForm = {
  name: "",
  academic_term_id: "",
  starts_on: "",
  ends_on: "",
  status: "draft",
  exam_type: "Opener",
  max_marks: "100",
  grading_system: "CBC performance levels",
  subject_ids: [] as string[],
  class_section_ids: [] as string[],
};

function toggleSelection(values: string[], value: string) {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
}

export function ExamSetupWorkspace() {
  const { data, isLoading, refetch } = useSchoolQuery<ExamSetupData>("/admin-command/exams-manager/exam-setup");
  const { data: options, isLoading: optionsLoading, refetch: refetchOptions } = useSchoolQuery<ExamManagerOptions>("/admin-command/exams-manager/options");
  const [isCreating, setIsCreating] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [configuringExam, setConfiguringExam] = useState<ExamConfig | null>(null);
  const [isConfiguring, setIsConfiguring] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const exams = data?.exams || [];
  const termOptions = options?.terms || [];
  const subjectOptions = options?.subjects || [];
  const classOptions = options?.classes || [];
  const hasTerms = termOptions.length > 0;
  const hasSubjects = subjectOptions.length > 0;
  const hasClasses = classOptions.length > 0;
  const setupReady = hasTerms && hasSubjects && hasClasses;

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
      ...emptyForm,
      academic_term_id: termOptions.find((term) => String(term.status || "").toLowerCase() === "active")?.id ?? termOptions[0]?.id ?? "",
      subject_ids: subjectOptions.map((subject) => subject.id),
      class_section_ids: classOptions.map((schoolClass) => schoolClass.id),
    });
    setIsCreateOpen(true);
  };

  const openConfigureForm = (exam: ExamConfig) => {
    setFormError(null);
    setForm({
      ...emptyForm,
      name: exam.name || "",
      starts_on: toDateInputValue(exam.starts_on),
      ends_on: toDateInputValue(exam.ends_on),
      status: exam.status?.toLowerCase() || "draft",
      exam_type: exam.type || "Exam cycle",
      max_marks: String(exam.max_marks || 100),
      grading_system: exam.grading_system || "CBC performance levels",
      academic_term_id: termOptions.find((term) => exam.term?.includes(term.label))?.id ?? termOptions[0]?.id ?? "",
      subject_ids: subjectOptions.map((subject) => subject.id),
      class_section_ids: classOptions.map((schoolClass) => schoolClass.id),
    });
    setConfiguringExam(exam);
  };

  const validateForm = () => {
    const name = form.name.trim();
    const maxMarks = Number(form.max_marks);
    if (!name) return "Exam name is required.";
    if (!form.starts_on || !form.ends_on) return "Start and end dates are required.";
    if (new Date(form.ends_on) < new Date(form.starts_on)) return "End date cannot be before start date.";
    if (!Number.isFinite(maxMarks) || maxMarks <= 0) return "Max marks must be a positive number.";
    if (hasTerms && !form.academic_term_id) return "Choose the academic term for this exam.";
    if (hasSubjects && form.subject_ids.length === 0) return "Choose at least one subject for this exam.";
    if (hasClasses && form.class_section_ids.length === 0) return "Choose at least one class for this exam.";
    return null;
  };

  const payload = () => ({
    name: form.name.trim(),
    starts_on: form.starts_on,
    ends_on: form.ends_on,
    status: form.status,
    academic_term_id: form.academic_term_id || null,
    type: form.exam_type,
    exam_type: form.exam_type,
    max_marks: Number(form.max_marks),
    grading_system: form.grading_system,
    subject_ids: form.subject_ids,
    class_section_ids: form.class_section_ids,
  });

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    const validation = validateForm();
    if (validation) {
      setFormError(validation);
      return;
    }

    setIsCreating(true);
    try {
      await createExam(payload());
      toast.success("Exam created with the selected subjects and classes.");
      setIsCreateOpen(false);
      await Promise.all([refetch(), refetchOptions()]);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create exam.";
      setFormError(message);
      toast.error(message);
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

    const validation = validateForm();
    if (validation) {
      setFormError(validation);
      return;
    }

    setIsConfiguring(true);
    try {
      await configureExam(configuringExam.id, payload());
      toast.success("Exam configuration saved.");
      setConfiguringExam(null);
      await Promise.all([refetch(), refetchOptions()]);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to configure exam.";
      setFormError(message);
      toast.error(message);
    } finally {
      setIsConfiguring(false);
    }
  };

  const setupWarning = !optionsLoading && !setupReady ? (
    <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
      Exam setup needs school data first:
      {!hasTerms ? " add an academic term;" : ""}
      {!hasSubjects ? " add subjects;" : ""}
      {!hasClasses ? " add classes and streams;" : ""}
      {" "}Use Principal setup before opening marks entry.
    </div>
  ) : null;

  const renderOptionChecklist = (kind: "subjects" | "classes") => {
    const list = kind === "subjects" ? subjectOptions : classOptions;
    const selected = kind === "subjects" ? form.subject_ids : form.class_section_ids;
    const label = kind === "subjects" ? "Subjects / learning areas" : "Classes / streams";
    const emptyText = kind === "subjects" ? "No subjects configured yet" : "No classes configured yet";

    return (
      <fieldset className="rounded-xl border border-[#D8E0EC] p-3 md:col-span-2">
        <legend className="px-1 text-sm font-black text-[#334155]">{label}</legend>
        {list.length === 0 ? (
          <p className="text-sm font-semibold text-amber-700">{emptyText}. Configure this in Principal setup first.</p>
        ) : (
          <div className="grid max-h-44 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
            {list.map((item) => (
              <label key={item.id} className="flex items-center gap-2 rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 text-sm font-semibold text-[#071D49]">
                <input
                  type="checkbox"
                  checked={selected.includes(item.id)}
                  onChange={() => setForm((current) => kind === "subjects"
                    ? { ...current, subject_ids: toggleSelection(current.subject_ids, item.id) }
                    : { ...current, class_section_ids: toggleSelection(current.class_section_ids, item.id) })}
                />
                <span>{item.label}{item.code ? ` (${item.code})` : ""}</span>
              </label>
            ))}
          </div>
        )}
      </fieldset>
    );
  };

  const renderExamFields = () => (
    <div className="space-y-4">
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
          Academic term
          <select
            name="academic_term_id"
            value={form.academic_term_id}
            onChange={(event) => setForm((current) => ({ ...current, academic_term_id: event.target.value }))}
            className="w-full rounded-xl border border-[#D8E0EC] px-3 py-2 text-sm font-semibold text-[#071D49] outline-none focus:border-blue-400"
            disabled={optionsLoading || termOptions.length === 0}
          >
            <option value="">{optionsLoading ? "Loading terms..." : termOptions.length === 0 ? "No academic terms configured" : "Select term"}</option>
            {termOptions.map((term) => <option key={term.id} value={term.id}>{term.label}</option>)}
          </select>
        </label>

        <label className="space-y-1 text-sm font-bold text-[#334155]">
          Exam type
          <select
            value={form.exam_type}
            onChange={(event) => setForm((current) => ({ ...current, exam_type: event.target.value }))}
            className="w-full rounded-xl border border-[#D8E0EC] px-3 py-2 text-sm font-semibold text-[#071D49] outline-none focus:border-blue-400"
          >
            <option value="Opener">Opener</option>
            <option value="Midterm">Midterm</option>
            <option value="End Term">End Term</option>
            <option value="Mock">Mock</option>
            <option value="Continuous Assessment">Continuous Assessment</option>
            <option value="Practical">Practical</option>
          </select>
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
          Max marks
          <input
            type="number"
            min={1}
            value={form.max_marks}
            onChange={(event) => setForm((current) => ({ ...current, max_marks: event.target.value }))}
            className="w-full rounded-xl border border-[#D8E0EC] px-3 py-2 text-sm font-semibold text-[#071D49] outline-none focus:border-blue-400"
          />
        </label>

        <label className="space-y-1 text-sm font-bold text-[#334155]">
          Grading
          <select
            value={form.grading_system}
            onChange={(event) => setForm((current) => ({ ...current, grading_system: event.target.value }))}
            className="w-full rounded-xl border border-[#D8E0EC] px-3 py-2 text-sm font-semibold text-[#071D49] outline-none focus:border-blue-400"
          >
            {gradingOptions.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
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
            {configuringExam ? <option value="published">Published</option> : null}
            {configuringExam ? <option value="archived">Archived</option> : null}
          </select>
        </label>

        {renderOptionChecklist("subjects")}
        {renderOptionChecklist("classes")}
      </div>
    </div>
  );

  return (
    <Panel
      title="Exam Setup"
      description="Configure exam cycles, terms, subjects, classes, max marks, grading policy, and mark-entry readiness."
      icon={ClipboardList}
      actions={
        <button type="button" onClick={openCreateForm} disabled={isCreating || optionsLoading} className="inline-flex items-center gap-2 rounded-lg bg-[#071D49] px-4 py-2 text-sm font-black text-white transition hover:bg-blue-900 disabled:opacity-50">
          <Plus className="w-4 h-4" /> New Exam
        </button>
      }
    >
      {setupWarning}

      <div className="mb-6 grid gap-4 md:grid-cols-4">
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
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-[#F8FAFC] text-[#071D49]">
            <tr>
              <th className="border-b border-[#D8E0EC] px-4 py-3 font-bold">Exam Name</th>
              <th className="border-b border-[#D8E0EC] px-4 py-3 font-bold">Term</th>
              <th className="border-b border-[#D8E0EC] px-4 py-3 font-bold">Year</th>
              <th className="border-b border-[#D8E0EC] px-4 py-3 font-bold">Type</th>
              <th className="border-b border-[#D8E0EC] px-4 py-3 font-bold">Max Marks</th>
              <th className="border-b border-[#D8E0EC] px-4 py-3 font-bold">Grading</th>
              <th className="border-b border-[#D8E0EC] px-4 py-3 font-bold">Subjects</th>
              <th className="border-b border-[#D8E0EC] px-4 py-3 font-bold">Classes</th>
              <th className="border-b border-[#D8E0EC] px-4 py-3 font-bold">Status</th>
              <th className="border-b border-[#D8E0EC] px-4 py-3 text-right font-bold">Actions</th>
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
                        Create the first exam cycle with term, subjects, classes, max marks, and grading before marks entry, moderation, and report cards can run.
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
                    <button type="button" onClick={() => openConfigureForm(exam)} className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:underline"><Settings className="h-3 w-3" /> Configure</button>
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
        description="This creates a real tenant-scoped exam cycle and prepares subject/class mark-entry windows for the current school."
        size="lg"
        footer={
          <>
            <button type="button" onClick={() => setIsCreateOpen(false)} disabled={isCreating} className="rounded-lg border border-[#D8E0EC] bg-white px-4 py-2 text-sm font-bold text-[#071D49] hover:bg-[#F8FAFC] disabled:opacity-50">
              Cancel
            </button>
            <button type="submit" form="exam-setup-create-form" disabled={isCreating || optionsLoading} className="rounded-lg bg-[#071D49] px-4 py-2 text-sm font-black text-white hover:bg-blue-900 disabled:opacity-50">
              {isCreating ? "Creating..." : "Create exam"}
            </button>
          </>
        }
      >
        <form id="exam-setup-create-form" onSubmit={handleCreate} className="space-y-4">
          {renderExamFields()}
        </form>
      </Modal>

      <Modal
        open={Boolean(configuringExam)}
        onClose={() => !isConfiguring && setConfiguringExam(null)}
        title="Configure exam cycle"
        description={configuringExam ? `Update ${configuringExam.name} for this school, including subject/class readiness for marks entry.` : "Update this tenant-scoped exam cycle."}
        size="lg"
        footer={
          <>
            <button type="button" onClick={() => setConfiguringExam(null)} disabled={isConfiguring} className="rounded-lg border border-[#D8E0EC] bg-white px-4 py-2 text-sm font-bold text-[#071D49] hover:bg-[#F8FAFC] disabled:opacity-50">
              Cancel
            </button>
            <button type="submit" form="exam-setup-configure-form" disabled={isConfiguring || optionsLoading} className="rounded-lg bg-[#071D49] px-4 py-2 text-sm font-black text-white hover:bg-blue-900 disabled:opacity-50">
              {isConfiguring ? "Saving..." : "Save configuration"}
            </button>
          </>
        }
      >
        <form id="exam-setup-configure-form" onSubmit={handleConfigure} className="space-y-4">
          {renderExamFields()}
        </form>
      </Modal>
    </Panel>
  );
}
