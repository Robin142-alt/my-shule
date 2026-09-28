"use client";

import { useState, type FormEvent } from "react";
import { ClipboardList, Plus, Settings, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Modal } from "@/components/ui/modal";
import { useSchoolQuery } from "@/lib/data/school-hooks";

import { configureExam, createExam, deleteExam } from "./api-client";
import { Panel, StatusChip, type Tone } from "./shared";

type ExamConfig = {
  id: string;
  name: string;
  term: string;
  year: number;
  type: string;
  max_marks: number;
  grading_system: string;
  grading_system_id?: string | null;
  status: string;
  subjects_count: number;
  classes_count: number;
  created_at: string;
  starts_on?: string;
  ends_on?: string;
  academic_term_id: string | null;
  subject_ids: string[];
  class_section_ids: string[];
  can_delete: boolean;
  delete_block_reason?: string | null;
  marks_count: number;
};

type ExamSetupData = {
  can_manage: boolean;
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
  gradingSystems?: ExamManagerOption[];
};

const toDateInputValue = (value?: string) => value ? value.slice(0, 10) : "";

const emptyForm = {
  name: "",
  academic_term_id: "",
  starts_on: "",
  ends_on: "",
  status: "draft",
  exam_type: "Opener",
  max_marks: "100",
  grading_system_id: "",
  subject_ids: [] as string[],
  class_section_ids: [] as string[],
};

function toggleSelection(values: string[], value: string) {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
}

export function ExamSetupWorkspace() {
  const { data, isLoading, error: setupError, refetch } = useSchoolQuery<ExamSetupData>("/admin-command/exams-manager/exam-setup");
  const {
    data: options,
    isLoading: optionsLoading,
    error: optionsError,
    refetch: refetchOptions,
  } = useSchoolQuery<ExamManagerOptions>("/admin-command/exams-manager/options");
  const [isCreating, setIsCreating] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [configuringExam, setConfiguringExam] = useState<ExamConfig | null>(null);
  const [isConfiguring, setIsConfiguring] = useState(false);
  const [deletingExam, setDeletingExam] = useState<ExamConfig | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const exams = data?.exams || [];
  const canManage = data?.can_manage === true;
  const termOptions = options?.terms || [];
  const subjectOptions = options?.subjects || [];
  const classOptions = options?.classes || [];
  const gradingSystemOptions = options?.gradingSystems || [];
  const hasTerms = termOptions.length > 0;
  const hasSubjects = subjectOptions.length > 0;
  const hasClasses = classOptions.length > 0;
  const hasGradingSystems = gradingSystemOptions.length > 0;
  const setupReady = hasTerms && hasSubjects && hasClasses && hasGradingSystems;

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
      grading_system_id: gradingSystemOptions[0]?.id ?? "",
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
      grading_system_id: exam.grading_system_id || "",
      academic_term_id: exam.academic_term_id || "",
      subject_ids: [...(exam.subject_ids ?? [])],
      class_section_ids: [...(exam.class_section_ids ?? [])],
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
    if (!hasTerms) return "The Principal must configure an academic term before an exam can be created.";
    if (!hasGradingSystems) return "The Principal must configure a grading system before an exam can be created.";
    if (!hasSubjects) return "The Principal must add subjects in Subjects & Departments before an exam can be created.";
    if (!hasClasses) return "The Principal must add classes and streams before an exam can be created.";
    if (!form.academic_term_id) return "Choose the academic term for this exam.";
    if (!form.grading_system_id) return "Choose the school grading system for this exam.";
    if (form.subject_ids.length === 0) return "Choose at least one subject for this exam.";
    if (form.class_section_ids.length === 0) return "Choose at least one class for this exam.";
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
    grading_system_id: form.grading_system_id,
    subject_ids: form.subject_ids,
    class_section_ids: form.class_section_ids,
  });

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isCreating || !canManage) return;
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
    if (isConfiguring || !canManage) return;
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

  const handleDelete = async () => {
    if (!deletingExam || isDeleting || !canManage) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await deleteExam(deletingExam.id);
      toast.success(`${deletingExam.name} deleted.`);
      setDeletingExam(null);
      await Promise.all([refetch(), refetchOptions()]);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to delete exam. Please retry.";
      setDeleteError(message);
      toast.error(message);
      await refetch();
    } finally {
      setIsDeleting(false);
    }
  };

  const setupWarning = !optionsLoading && !optionsError && !setupReady ? (
    <div className="mb-4 rounded-xl border border-warning-border bg-warning-soft px-4 py-3 text-sm font-semibold text-warning">
      Exam setup needs school data first:
      {!hasTerms ? " add an academic term;" : ""}
      {!hasSubjects ? " add subjects;" : ""}
      {!hasClasses ? " add classes and streams;" : ""}
      {!hasGradingSystems ? " add a grading system;" : ""}
      {" "}Use Principal setup before opening marks entry.
    </div>
  ) : null;

  const renderOptionChecklist = (kind: "subjects" | "classes") => {
    const list = kind === "subjects" ? subjectOptions : classOptions;
    const selected = kind === "subjects" ? form.subject_ids : form.class_section_ids;
    const label = kind === "subjects" ? "Subjects / learning areas" : "Classes / streams";
    const emptyText = kind === "subjects" ? "No subjects configured yet" : "No classes configured yet";

    return (
      <fieldset className="rounded-xl border border-border p-3 md:col-span-2">
        <legend className="px-1 text-sm font-black text-foreground">{label} ({selected.length} selected)</legend>
        {list.length === 0 ? (
          <p className="text-sm font-semibold text-warning">{emptyText}. Configure this in Principal setup first.</p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {list.map((item) => (
              <label key={item.id} className="flex items-center gap-2 rounded-lg border border-border bg-white px-3 py-2 text-sm font-semibold text-foreground">
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
      {configuringExam && configuringExam.marks_count > 0 ? <p className="text-sm text-warning">This exam has saved results. Their subjects, classes, term, grading system and maximum marks are protected.</p> : null}

      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-1 text-sm font-bold text-foreground md:col-span-2">
          Exam name
          <input
            value={form.name}
            onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
            className="w-full rounded-xl border border-border px-3 py-2 text-sm font-semibold text-foreground outline-none focus:border-blue-400"
            placeholder="Term 1 Opener"
            required
          />
        </label>

        <label className="space-y-1 text-sm font-bold text-foreground">
          Academic term
          <select
            name="academic_term_id"
            value={form.academic_term_id}
            onChange={(event) => setForm((current) => ({ ...current, academic_term_id: event.target.value }))}
            className="w-full rounded-xl border border-border px-3 py-2 text-sm font-semibold text-foreground outline-none focus:border-blue-400"
            disabled={optionsLoading || termOptions.length === 0}
          >
            <option value="">{optionsLoading ? "Loading terms..." : termOptions.length === 0 ? "No academic terms configured" : "Select term"}</option>
            {termOptions.map((term) => <option key={term.id} value={term.id}>{term.label}</option>)}
          </select>
        </label>

        <label className="space-y-1 text-sm font-bold text-foreground">
          Exam type
          <select
            value={form.exam_type}
            onChange={(event) => setForm((current) => ({ ...current, exam_type: event.target.value }))}
            className="w-full rounded-xl border border-border px-3 py-2 text-sm font-semibold text-foreground outline-none focus:border-blue-400"
          >
            {form.exam_type === "Exam cycle" ? <option value="Exam cycle">Exam cycle</option> : null}
            <option value="Opener">Opener</option>
            <option value="Midterm">Midterm</option>
            <option value="End Term">End Term</option>
            <option value="Mock">Mock</option>
            <option value="Continuous Assessment">Continuous Assessment</option>
            <option value="Practical">Practical</option>
          </select>
        </label>

        <label className="space-y-1 text-sm font-bold text-foreground">
          Starts on
          <input
            type="date"
            value={form.starts_on}
            onChange={(event) => setForm((current) => ({ ...current, starts_on: event.target.value }))}
            className="w-full rounded-xl border border-border px-3 py-2 text-sm font-semibold text-foreground outline-none focus:border-blue-400"
            required
          />
        </label>

        <label className="space-y-1 text-sm font-bold text-foreground">
          Ends on
          <input
            type="date"
            value={form.ends_on}
            onChange={(event) => setForm((current) => ({ ...current, ends_on: event.target.value }))}
            className="w-full rounded-xl border border-border px-3 py-2 text-sm font-semibold text-foreground outline-none focus:border-blue-400"
            required
          />
        </label>

        <label className="space-y-1 text-sm font-bold text-foreground">
          Max marks
          <input
            type="number"
            min={1}
            value={form.max_marks}
            onChange={(event) => setForm((current) => ({ ...current, max_marks: event.target.value }))}
            className="w-full rounded-xl border border-border px-3 py-2 text-sm font-semibold text-foreground outline-none focus:border-blue-400"
          />
        </label>

        <label className="space-y-1 text-sm font-bold text-foreground">
          Grading
          <select
            value={form.grading_system_id}
            onChange={(event) => setForm((current) => ({ ...current, grading_system_id: event.target.value }))}
            className="w-full rounded-xl border border-border px-3 py-2 text-sm font-semibold text-foreground outline-none focus:border-blue-400"
            disabled={optionsLoading || gradingSystemOptions.length === 0}
          >
            <option value="">{optionsLoading ? "Loading grading systems..." : gradingSystemOptions.length === 0 ? "No grading systems configured" : "Select grading system"}</option>
            {gradingSystemOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
          </select>
        </label>

        <label className="space-y-1 text-sm font-bold text-foreground">
          Status
          <select
            value={form.status}
            onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}
            className="w-full rounded-xl border border-border px-3 py-2 text-sm font-semibold text-foreground outline-none focus:border-blue-400"
          >
            <option value="draft">Draft</option>
            <option value="submitted">Open for marks</option>
            {configuringExam && !["draft", "submitted"].includes(configuringExam.status) ? <option value={configuringExam.status}>{configuringExam.status}</option> : null}
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
        <button type="button" onClick={openCreateForm} disabled={!canManage || isCreating || optionsLoading || Boolean(optionsError) || !setupReady} title={!setupReady ? "Complete term, subject, class, and grading setup first" : undefined} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-black text-white transition hover:bg-blue-900 disabled:opacity-50">
          <Plus className="w-4 h-4" /> New Exam
        </button>
      }
    >
      {setupWarning}
      {setupError ? <div role="alert" className="mb-4 rounded-xl border border-danger-border bg-danger-soft p-4 text-sm text-danger">
        Exam configurations could not be loaded. <button type="button" onClick={() => void refetch()} className="font-bold underline">Retry exams</button>
      </div> : null}

      {optionsError ? (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-danger-border bg-danger-soft px-4 py-3 text-sm font-semibold text-danger">
          <span>School setup options could not be loaded. Your saved configuration has not been removed.</span>
          <button
            type="button"
            onClick={() => void refetchOptions()}
            className="rounded-lg border border-rose-300 bg-white px-3 py-1.5 text-xs font-black text-danger hover:bg-rose-100"
          >
            Retry
          </button>
        </div>
      ) : null}

      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <div className="rounded-xl border border-border bg-surface-muted p-4">
          <div className="text-sm font-semibold text-muted">Total Exams</div>
          <div className="mt-1 text-2xl font-black text-foreground">{isLoading ? "..." : data?.metrics?.total_exams ?? 0}</div>
        </div>
        <div className="rounded-xl border border-info-border bg-info-soft p-4">
          <div className="text-sm font-semibold text-info">In workflow</div>
          <div className="mt-1 text-2xl font-black text-info">{isLoading ? "..." : data?.metrics?.active_exams ?? 0}</div>
        </div>
        <div className="rounded-xl border border-border bg-surface-muted p-4">
          <div className="text-sm font-semibold text-muted">Draft</div>
          <div className="mt-1 text-2xl font-black text-foreground">{isLoading ? "..." : data?.metrics?.draft_exams ?? 0}</div>
        </div>
        <div className="rounded-xl border border-success-border bg-success-soft p-4">
          <div className="text-sm font-semibold text-success">Published/archived</div>
          <div className="mt-1 text-2xl font-black text-success">{isLoading ? "..." : data?.metrics?.completed_exams ?? 0}</div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-surface-muted text-foreground">
            <tr>
              <th className="border-b border-border px-4 py-3 font-bold">Exam Name</th>
              <th className="border-b border-border px-4 py-3 font-bold">Term</th>
              <th className="border-b border-border px-4 py-3 font-bold">Year</th>
              <th className="border-b border-border px-4 py-3 font-bold">Type</th>
              <th className="border-b border-border px-4 py-3 font-bold">Max Marks</th>
              <th className="border-b border-border px-4 py-3 font-bold">Grading</th>
              <th className="border-b border-border px-4 py-3 font-bold">Subjects</th>
              <th className="border-b border-border px-4 py-3 font-bold">Classes</th>
              <th className="border-b border-border px-4 py-3 font-bold">Status</th>
              <th className="border-b border-border px-4 py-3 text-right font-bold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              <tr><td colSpan={10} className="px-4 py-8 text-center text-muted">Loading exam configurations...</td></tr>
            ) : setupError ? <tr><td colSpan={10} className="px-4 py-8 text-center">Use Retry exams above to reload your school’s exams.</td></tr> : exams.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-4 py-8 text-center">
                  <div className="mx-auto flex max-w-xl flex-col items-center gap-3 text-muted">
                    <div>
                      <p className="font-black text-foreground">No exams configured yet</p>
                      <p className="mt-1 text-sm leading-6">
                        Create the first exam cycle with term, subjects, classes, max marks, and grading before marks entry, moderation, and report cards can run.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={openCreateForm}
                      disabled={!canManage || !setupReady || optionsLoading || Boolean(optionsError)}
                      title={!setupReady ? "Complete term, subject, class, and grading setup first" : undefined}
                      className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-black text-white hover:bg-blue-900 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Plus className="h-4 w-4" />
                      Create first exam cycle
                    </button>
                  </div>
                </td>
              </tr>
            ) : (
              exams.map((exam) => (
                <tr key={exam.id} className="hover:bg-surface-muted">
                  <td className="px-4 py-3 font-semibold text-foreground">{exam.name}</td>
                  <td className="px-4 py-3 text-muted">{exam.term}</td>
                  <td className="px-4 py-3 text-muted">{exam.year}</td>
                  <td className="px-4 py-3 text-muted">{exam.type}</td>
                  <td className="px-4 py-3 text-muted">{exam.max_marks}</td>
                  <td className="px-4 py-3 text-muted">{exam.grading_system}</td>
                  <td className="px-4 py-3 text-muted">{exam.subjects_count}</td>
                  <td className="px-4 py-3 text-muted">{exam.classes_count}</td>
                  <td className="px-4 py-3"><StatusChip label={exam.status} tone={getStatusTone(exam.status)} /></td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-3">
                      <button type="button" onClick={() => openConfigureForm(exam)} disabled={!canManage || optionsLoading || Boolean(optionsError)} className="inline-flex min-h-11 items-center gap-1 text-xs font-semibold text-blue-600 hover:underline disabled:opacity-50"><Settings className="h-3 w-3" /> Configure</button>
                      <button type="button" aria-label={`Delete ${exam.name}`} disabled={!canManage || !exam.can_delete}
                        title={!canManage ? "Exam management permission is required" : exam.delete_block_reason || "Delete this exam before results are entered"}
                        onClick={() => { setDeleteError(null); setDeletingExam(exam); }}
                        className="inline-flex min-h-11 items-center gap-1 text-xs font-semibold text-danger hover:underline disabled:cursor-not-allowed disabled:opacity-50"><Trash2 className="h-3 w-3" /> Delete</button>
                    </div>
                    {exam.delete_block_reason ? <p className="max-w-xs whitespace-normal text-xs text-slate-500">{exam.delete_block_reason}</p> : null}
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
        description="Choose the exam details, subjects and classes to prepare for marks entry."
        size="lg"
        footer={
          <>
            {formError ? <p role="alert" className="w-full text-sm font-semibold text-danger">{formError}</p> : null}
            <button type="button" onClick={() => setIsCreateOpen(false)} disabled={isCreating} className="rounded-lg border border-border bg-white px-4 py-2 text-sm font-bold text-foreground hover:bg-surface-muted disabled:opacity-50">
              Cancel
            </button>
            <button type="submit" form="exam-setup-create-form" disabled={!canManage || isCreating || optionsLoading || Boolean(optionsError)} className="rounded-lg bg-primary px-4 py-2 text-sm font-black text-white hover:bg-blue-900 disabled:opacity-50">
              {isCreating ? "Creating..." : "Create exam"}
            </button>
          </>
        }
      >
        <form id="exam-setup-create-form" onSubmit={handleCreate} className="space-y-4">
          <fieldset disabled={isCreating}>{renderExamFields()}</fieldset>
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
            {formError ? <p role="alert" className="w-full text-sm font-semibold text-danger">{formError}</p> : null}
            <button type="button" onClick={() => setConfiguringExam(null)} disabled={isConfiguring} className="rounded-lg border border-border bg-white px-4 py-2 text-sm font-bold text-foreground hover:bg-surface-muted disabled:opacity-50">
              Cancel
            </button>
            <button type="submit" form="exam-setup-configure-form" disabled={!canManage || isConfiguring || optionsLoading || Boolean(optionsError)} className="rounded-lg bg-primary px-4 py-2 text-sm font-black text-white hover:bg-blue-900 disabled:opacity-50">
              {isConfiguring ? "Saving..." : "Save configuration"}
            </button>
          </>
        }
      >
        <form id="exam-setup-configure-form" onSubmit={handleConfigure} className="space-y-4">
          <fieldset disabled={isConfiguring}>{renderExamFields()}</fieldset>
        </form>
      </Modal>
      <Modal open={Boolean(deletingExam)} onClose={() => !isDeleting && setDeletingExam(null)}
        title="Delete exam?" description={deletingExam?.name} size="sm"
        footer={<>
          <button type="button" disabled={isDeleting} onClick={() => setDeletingExam(null)} className="rounded-lg border px-4 py-2 text-sm font-bold">Cancel</button>
          <button type="button" disabled={isDeleting || !canManage} onClick={() => void handleDelete()} className="rounded-lg bg-rose-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{isDeleting ? "Deleting..." : "Delete exam"}</button>
        </>}
      >
        <p className="text-sm text-slate-700">This permanently removes the exam, its papers, mark-entry windows and timetable. Only exams with no entered results or student records can be deleted. This cannot be undone.</p>
        {deleteError ? <p role="alert" className="mt-3 text-sm font-semibold text-danger">{deleteError}</p> : null}
      </Modal>
    </Panel>
  );
}
