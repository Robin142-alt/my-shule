"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Archive, ArrowRightLeft, History, Loader2, Pencil, RotateCcw, Trash2, UserMinus } from "lucide-react";
import { toast } from "sonner";

import {
  AcademicAttendancePolicyEditor,
  AcademicGradeBandsEditor,
  AcademicReportCardPolicyEditor,
  validateAcademicGradeBands,
  validateAttendanceConfiguration,
} from "@/components/school/academic-policy-builders";
import { Modal } from "@/components/ui/modal";
import { requestDashboardApi } from "@/lib/dashboard/api-client";

export type AcademicManagedEntity =
  | "academic-year"
  | "academic-term"
  | "calendar-period"
  | "class-section"
  | "class-stream"
  | "department"
  | "subject"
  | "class-subject"
  | "grading-system"
  | "attendance-setting"
  | "report-card-setting"
  | "curriculum-configuration";

export type AcademicEditableField = {
  name: string;
  label: string;
  type?:
    | "text"
    | "date"
    | "number"
    | "textarea"
    | "json"
    | "select"
    | "checkbox"
    | "grade-bands"
    | "attendance-policy"
    | "report-card-policy";
  options?: Array<{ value: string; label: string }>;
  placeholder?: string;
};

type ManagedRecord = Record<string, unknown> & {
  id: string;
  status?: string;
  is_active?: boolean;
  version?: number;
};

type DependencyResponse = {
  dependencies: Array<{ table: string; label: string; count: number }>;
  total: number;
  can_permanently_delete: boolean;
  recommendation: string;
};

type HistoryRecord = {
  id: string;
  action: string;
  actor_role?: string | null;
  reason?: string | null;
  created_at: string;
};

const endpointByEntity: Record<AcademicManagedEntity, string> = {
  "academic-year": "years",
  "academic-term": "terms",
  "calendar-period": "calendar-periods",
  "class-section": "class-sections",
  "class-stream": "class-streams",
  department: "departments",
  subject: "subjects",
  "class-subject": "class-subjects",
  "grading-system": "grading-systems",
  "attendance-setting": "attendance-settings",
  "report-card-setting": "report-card-settings",
  "curriculum-configuration": "curriculum-configurations",
};

const inputClass =
  "mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-900 outline-none focus:border-blue-500";

function currentStatus(record: ManagedRecord) {
  if (record.status) return String(record.status);
  return record.is_active === false ? "inactive" : "active";
}

function formValue(record: ManagedRecord, field: AcademicEditableField) {
  const fieldValue = record[field.name];
  if (field.type === "date" && fieldValue) return String(fieldValue).slice(0, 10);
  if (field.type === "checkbox") return Boolean(fieldValue);
  if ((field.type === "textarea" || field.type === "json") && fieldValue && typeof fieldValue === "object") return JSON.stringify(fieldValue, null, 2);
  return fieldValue == null ? "" : String(fieldValue);
}

export function AcademicRecordManager({
  entityType,
  record,
  title,
  fields,
  mergeCandidates = [],
  onUpdated,
}: {
  entityType: AcademicManagedEntity;
  record: ManagedRecord;
  title: string;
  fields: AcademicEditableField[];
  mergeCandidates?: Array<{ id: string; label: string }>;
  onUpdated: () => Promise<unknown> | unknown;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [dependencies, setDependencies] = useState<DependencyResponse | null>(null);
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [dependenciesLoading, setDependenciesLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [dependencyError, setDependencyError] = useState<string | null>(null);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [contextReload, setContextReload] = useState(0);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [mergeTarget, setMergeTarget] = useState("");
  const [mergePreview, setMergePreview] = useState<Record<string, any> | null>(null);
  const status = currentStatus(record);

  useEffect(() => {
    if (!open) return;
    let active = true;
    setDetailError(null);
    setDependencyError(null);
    setHistoryError(null);
    setDependenciesLoading(true);
    setHistoryLoading(true);
    Promise.all([
      requestDashboardApi<DependencyResponse>(`/academics/setup/${entityType}/${record.id}/dependencies`),
      requestDashboardApi<HistoryRecord[]>(`/academics/setup/${entityType}/${record.id}/history`),
    ].map((request) => request.then(
      (value) => ({ status: "fulfilled" as const, value }),
      (reason) => ({ status: "rejected" as const, reason }),
    ))).then(([dependencyResult, historyResult]) => {
      if (!active) return;
      if (dependencyResult.status === "fulfilled") {
        setDependencies(dependencyResult.value as DependencyResponse);
      } else {
        setDependencies(null);
        setDependencyError(dependencyResult.reason instanceof Error
          ? dependencyResult.reason.message
          : "Dependency safety could not be checked.");
      }
      if (historyResult.status === "fulfilled") {
        const records = historyResult.value as HistoryRecord[];
        setHistory(Array.isArray(records) ? records : []);
      } else {
        setHistory([]);
        setHistoryError(historyResult.reason instanceof Error
          ? historyResult.reason.message
          : "Change history could not be loaded.");
      }
      setDependenciesLoading(false);
      setHistoryLoading(false);
    });
    return () => { active = false; };
  }, [contextReload, entityType, open, record.id, record.version]);

  const lifecycleActions = useMemo(() => {
    if (status === "archived") return ["restore", "delete"] as const;
    if (status === "inactive" || status === "closed") return ["activate", "archive"] as const;
    return entityType === "academic-year" || entityType === "academic-term"
      ? (["deactivate", "close", "archive"] as const)
      : (["deactivate", "archive"] as const);
  }, [entityType, status]);

  async function perform(action: string, request: () => Promise<unknown>, success: string) {
    setBusy(action);
    setDetailError(null);
    try {
      await request();
      await onUpdated();
      toast.success(success);
      setReason("");
      if (action === "delete") setOpen(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "The academic setup change failed.";
      setDetailError(message);
      toast.error(message);
    } finally {
      setBusy(null);
    }
  }

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const body: Record<string, unknown> = { expected_version: Number(record.version ?? 1), reason: reason || undefined };
    for (const field of fields) {
      if (field.type === "checkbox") body[field.name] = data.get(field.name) === "on";
      else if (field.type === "number") body[field.name] = Number(data.get(field.name));
      else if (
        field.type === "json"
        || field.type === "grade-bands"
        || field.type === "attendance-policy"
        || field.type === "report-card-policy"
      ) {
        try {
          body[field.name] = JSON.parse(String(data.get(field.name) ?? "{}"));
        } catch {
          setDetailError(`${field.label} could not be read. Review the guided fields and try again.`);
          return;
        }
        if (field.type === "grade-bands") {
          const validation = validateAcademicGradeBands(body[field.name]);
          if (validation) {
            setDetailError(validation);
            return;
          }
        }
        if (field.type === "attendance-policy") {
          const validation = validateAttendanceConfiguration(body[field.name]);
          if (validation) {
            setDetailError(validation);
            return;
          }
        }
      } else body[field.name] = String(data.get(field.name) ?? "").trim() || null;
    }
    return perform("save", () => requestDashboardApi(
      `/academics/${endpointByEntity[entityType]}/${record.id}`,
      { method: "PATCH", body },
    ), `${title} updated.`);
  }

  function changeLifecycle(action: string) {
    if ((action === "archive" || action === "delete") && !reason.trim()) {
      setDetailError("Enter a reason before archiving or permanently deleting this record.");
      return;
    }
    return perform(action, () => requestDashboardApi(
      `/academics/setup/${entityType}/${record.id}/lifecycle`,
      {
        method: "POST",
        body: { action, reason: reason.trim() || undefined, expected_version: Number(record.version ?? 1) },
      },
    ), action === "delete" ? `${title} permanently deleted.` : `${title} ${action}d.`);
  }

  async function previewMerge() {
    if (!mergeTarget) {
      setDetailError("Select the surviving record first.");
      return;
    }
    setBusy("merge-preview");
    setDetailError(null);
    try {
      const preview = await requestDashboardApi<Record<string, any>>(
        `/academics/setup/${entityType}/${record.id}/merge-preview?target_id=${encodeURIComponent(mergeTarget)}`,
      );
      setMergePreview(preview);
    } catch (error) {
      setDetailError(error instanceof Error ? error.message : "The merge impact could not be loaded.");
    } finally {
      setBusy(null);
    }
  }

  async function confirmMerge() {
    if (!mergeTarget || !reason.trim()) {
      setDetailError("Select the survivor and enter a reason before merging.");
      return;
    }
    return perform("merge", () => requestDashboardApi(
      `/academics/setup/${entityType}/${record.id}/merge`,
      { method: "POST", body: { target_id: mergeTarget, reason: reason.trim(), confirm: true } },
    ), `${title} merged into the selected survivor.`).then(() => setOpen(false));
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex min-h-9 items-center justify-center gap-2 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs font-black text-white transition hover:bg-white/10"
      >
        <Pencil className="h-3.5 w-3.5" /> Manage
      </button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={`Manage ${title}`}
        description={`Edit, review dependencies, and manage the lifecycle of this ${entityType.replaceAll("-", " ")}.`}
        size="lg"
      >
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold capitalize text-slate-700">{status}</span>
            <span className="text-xs font-semibold text-slate-500">Version {Number(record.version ?? 1)}</span>
          </div>

          {detailError ? <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">{detailError}</div> : null}

          <form onSubmit={save} className="grid gap-3 sm:grid-cols-2">
            {fields.map((field) => {
              if (field.type === "grade-bands") {
                return (
                  <div key={field.name} className="sm:col-span-2">
                    <AcademicGradeBandsEditor
                      name={field.name}
                      label={field.label}
                      defaultValue={record[field.name]}
                      initialPreset="blank"
                      theme="light"
                    />
                  </div>
                );
              }
              if (field.type === "attendance-policy") {
                return (
                  <div key={field.name} className="sm:col-span-2">
                    <AcademicAttendancePolicyEditor name={field.name} defaultValue={record[field.name]} theme="light" />
                  </div>
                );
              }
              if (field.type === "report-card-policy") {
                return (
                  <div key={field.name} className="sm:col-span-2">
                    <AcademicReportCardPolicyEditor name={field.name} defaultValue={record[field.name]} theme="light" />
                  </div>
                );
              }
              return (
                <label key={field.name} className={`text-sm font-bold text-slate-700 ${field.type === "textarea" || field.type === "json" ? "sm:col-span-2" : ""}`}>
                  {field.label}
                  {field.type === "select" ? (
                    <select name={field.name} defaultValue={String(formValue(record, field))} className={inputClass}>
                      <option value="">Not assigned</option>
                      {(field.options ?? []).map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </select>
                  ) : field.type === "textarea" || field.type === "json" ? (
                    <textarea name={field.name} defaultValue={String(formValue(record, field))} className={inputClass} rows={3} />
                  ) : field.type === "checkbox" ? (
                    <input name={field.name} type="checkbox" defaultChecked={Boolean(formValue(record, field))} className="ml-3 h-4 w-4" />
                  ) : (
                    <input name={field.name} type={field.type ?? "text"} defaultValue={String(formValue(record, field))} placeholder={field.placeholder} className={inputClass} />
                  )}
                </label>
              );
            })}
            <label className="sm:col-span-2 text-sm font-bold text-slate-700">
              Reason or change note
              <textarea value={reason} onChange={(event) => setReason(event.target.value)} className={inputClass} rows={2} placeholder="Required for archive or permanent delete" />
            </label>
            <button disabled={busy !== null} className="sm:col-span-2 inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">
              {busy === "save" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Pencil className="h-4 w-4" />} Save changes
            </button>
          </form>

          <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <h4 className="font-bold text-slate-900">Lifecycle and dependency safety</h4>
            {dependenciesLoading ? <p className="mt-2 text-sm text-slate-500">Loading dependencies...</p> : dependencyError ? (
              <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                <p className="font-semibold">Dependency safety could not be loaded. Editing remains available, but destructive actions are blocked until the check succeeds.</p>
                <button type="button" onClick={() => setContextReload((value) => value + 1)} className="mt-2 min-h-9 rounded-lg border border-amber-300 bg-white px-3 text-xs font-bold">Retry dependency check</button>
              </div>
            ) : dependencies ? (
              <>
                <p className="mt-1 text-sm text-slate-600">{dependencies.recommendation}</p>
                {dependencies.dependencies.length ? (
                  <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                    {dependencies.dependencies.map((dependency) => (
                      <li key={`${dependency.table}-${dependency.label}`} className="rounded-lg bg-white px-3 py-2 text-sm font-semibold text-slate-700">
                        {dependency.count} {dependency.label}
                      </li>
                    ))}
                  </ul>
                ) : <p className="mt-3 text-sm font-semibold text-emerald-700">No linked operational records were found.</p>}
              </>
            ) : null}
            <div className="mt-4 flex flex-wrap gap-2">
              {lifecycleActions.map((action) => (
                <button
                  key={action}
                  type="button"
                  disabled={busy !== null || (action === "delete" && dependencies?.can_permanently_delete !== true)}
                  onClick={() => changeLifecycle(action)}
                  className={`inline-flex min-h-9 items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold disabled:cursor-not-allowed disabled:opacity-40 ${
                    action === "delete" ? "bg-red-700 text-white" : "border border-slate-300 bg-white text-slate-700"
                  }`}
                >
                  {busy === action ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : action === "delete" ? <Trash2 className="h-3.5 w-3.5" /> : action === "restore" ? <RotateCcw className="h-3.5 w-3.5" /> : <Archive className="h-3.5 w-3.5" />}
                  <span className="capitalize">{action}</span>
                </button>
              ))}
            </div>
          </section>

          {mergeCandidates.length ? (
            <section className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <h4 className="flex items-center gap-2 font-bold text-slate-900"><ArrowRightLeft className="h-4 w-4" /> Controlled merge</h4>
              <p className="mt-1 text-sm text-slate-600">Select the record that will survive. Linked records move transactionally; conflicts leave everything unchanged.</p>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <select value={mergeTarget} onChange={(event) => { setMergeTarget(event.target.value); setMergePreview(null); }} className={`${inputClass} mt-0 flex-1`}>
                  <option value="">Select surviving record</option>
                  {mergeCandidates.filter((candidate) => candidate.id !== record.id).map((candidate) => (
                    <option key={candidate.id} value={candidate.id}>{candidate.label}</option>
                  ))}
                </select>
                <button type="button" disabled={busy !== null || !mergeTarget} onClick={previewMerge} className="min-h-10 rounded-lg border border-amber-300 bg-white px-4 text-sm font-bold text-amber-900 disabled:opacity-50">
                  {busy === "merge-preview" ? "Checking..." : "Preview impact"}
                </button>
              </div>
              {mergePreview ? (
                <div className="mt-3 rounded-lg border border-amber-200 bg-white p-3 text-sm text-slate-700">
                  <p className="font-bold capitalize">{String(mergePreview.outcome ?? "migration required").replaceAll("_", " ")}</p>
                  <p className="mt-1">{String(mergePreview.warning ?? "Review the affected records before continuing.")}</p>
                  <p className="mt-1 font-semibold">Affected records: {Number(mergePreview.affected_records ?? 0)}. The source will be archived and history retained.</p>
                  <button type="button" disabled={busy !== null || !reason.trim()} onClick={confirmMerge} className="mt-3 min-h-10 rounded-lg bg-amber-700 px-4 text-sm font-bold text-white disabled:opacity-50">
                    {busy === "merge" ? "Merging..." : "Confirm merge"}
                  </button>
                </div>
              ) : null}
            </section>
          ) : null}

          <section className="rounded-xl border border-slate-200 p-4">
            <h4 className="flex items-center gap-2 font-bold text-slate-900"><History className="h-4 w-4" /> Change history</h4>
            {historyLoading ? <p className="mt-2 text-sm text-slate-500">Loading change history...</p> : historyError ? (
              <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                <p className="font-semibold">Change history could not be loaded. No saved history was removed.</p>
                <button type="button" onClick={() => setContextReload((value) => value + 1)} className="mt-2 min-h-9 rounded-lg border border-amber-300 bg-white px-3 text-xs font-bold">Retry history</button>
              </div>
            ) : history.length === 0 ? <p className="mt-2 text-sm text-slate-500">No previous changes have been recorded.</p> : (
              <div className="mt-3 max-h-52 space-y-2 overflow-y-auto">
                {history.map((entry) => (
                  <div key={entry.id} className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">
                    <p className="font-semibold">{entry.action.replaceAll("_", " ")}</p>
                    <p className="text-xs text-slate-500">{entry.actor_role || "Authorized staff"} - {new Date(entry.created_at).toLocaleString("en-KE")}{entry.reason ? ` - ${entry.reason}` : ""}</p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </Modal>
    </>
  );
}

export function AcademicAssignmentEndButton({
  assignmentType,
  assignmentId,
  label,
  onUpdated,
}: {
  assignmentType: "class-teacher" | "teacher-assignment" | "academic-role";
  assignmentId: string;
  label: string;
  onUpdated: () => Promise<unknown> | unknown;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const reason = String(data.get("reason") ?? "").trim();
    const effectiveTo = String(data.get("effective_to") ?? "").trim();
    setBusy(true);
    setError(null);
    try {
      const path = assignmentType === "class-teacher"
        ? `/academics/class-teachers/${assignmentId}/end`
        : assignmentType === "academic-role"
          ? `/academics/academic-roles/${assignmentId}/end`
          : `/academics/teacher-assignments/${assignmentId}/end`;
      await requestDashboardApi(path, {
        method: "POST",
        body: { reason, effective_to: effectiveTo || undefined },
      });
      await onUpdated();
      toast.success(`${label} ended.`);
      setOpen(false);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "The assignment could not be ended.";
      setError(message);
      toast.error(message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex min-h-9 items-center justify-center gap-2 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs font-black text-white transition hover:bg-white/10"
      >
        <UserMinus className="h-3.5 w-3.5" /> End assignment
      </button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={`End ${label}`}
        description="The previous allocation remains in academic history. Enter when and why the responsibility ended."
        size="sm"
      >
        <form onSubmit={submit} className="space-y-4">
          {error ? <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</div> : null}
          <label className="block text-sm font-bold text-slate-700">
            Effective end date
            <input name="effective_to" type="date" defaultValue={new Date().toISOString().slice(0, 10)} className={inputClass} />
          </label>
          <label className="block text-sm font-bold text-slate-700">
            Reason
            <textarea name="reason" required minLength={3} rows={3} className={inputClass} placeholder="e.g. Reassigned to another class" />
          </label>
          <button disabled={busy} className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg bg-red-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserMinus className="h-4 w-4" />} Confirm end assignment
          </button>
        </form>
      </Modal>
    </>
  );
}

export function AcademicTeacherReassignmentButton({
  assignmentId,
  currentTeacherId,
  teachers,
  onUpdated,
}: {
  assignmentId: string;
  currentTeacherId: string;
  teachers: Array<{ id: string; label: string }>;
  onUpdated: () => Promise<unknown> | unknown;
}) {
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<Record<string, any> | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let active = true;
    setPreview(null);
    setError(null);
    requestDashboardApi<Record<string, any>>(`/academics/teacher-assignments/${assignmentId}/reassignment-preview`)
      .then((result) => { if (active) setPreview(result); })
      .catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : "Reassignment impact could not be loaded."); });
    return () => { active = false; };
  }, [assignmentId, open]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setBusy(true);
    setError(null);
    try {
      const result = await requestDashboardApi<Record<string, any>>(`/academics/teacher-assignments/${assignmentId}/reassign`, {
        method: "POST",
        body: {
          teacher_user_id: String(data.get("teacher_user_id") ?? ""),
          effective_from: String(data.get("effective_from") ?? ""),
          reason: String(data.get("reason") ?? "").trim(),
          transfer_future_timetable: data.get("transfer_future_timetable") === "on",
          transfer_pending_marks: data.get("transfer_pending_marks") === "on",
          transfer_assignments: data.get("transfer_assignments") === "on",
          transfer_comments: data.get("transfer_comments") === "on",
          transfer_lesson_plans: data.get("transfer_lesson_plans") === "on",
          transfer_pending_approvals: data.get("transfer_pending_approvals") === "on",
        },
      });
      await onUpdated();
      result.status === "partial_success" ? toast.warning(String(result.message)) : toast.success(String(result.message));
      setOpen(false);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "The teacher assignment could not be transferred.";
      setError(message);
      toast.error(message);
    } finally {
      setBusy(false);
    }
  }

  const pending = preview?.pending_work ?? {};
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="inline-flex min-h-9 items-center justify-center gap-2 rounded-lg border border-cyan-200/25 bg-cyan-200/10 px-3 py-2 text-xs font-black text-cyan-100 hover:bg-cyan-200/20">
        <ArrowRightLeft className="h-3.5 w-3.5" /> Reassign
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Reassign subject teacher" description="End the current allocation, create a dated replacement, and choose which pending responsibilities should move." size="lg">
        <form onSubmit={submit} className="space-y-4">
          {error ? <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</div> : null}
          {!preview && !error ? <p className="text-sm font-semibold text-slate-500">Loading scoped reassignment impact...</p> : null}
          {preview ? <div className="grid gap-2 rounded-xl bg-slate-50 p-3 text-sm sm:grid-cols-2">{Object.entries(pending).map(([key, count]) => <div key={key} className="rounded-lg bg-white px-3 py-2"><span className="font-bold capitalize">{key.replaceAll("_", " ")}</span>: {Number(count)}</div>)}</div> : null}
          <label className="block text-sm font-bold text-slate-700">Replacement teacher<select name="teacher_user_id" required defaultValue="" className={inputClass}><option value="">Select teacher</option>{teachers.filter((teacher) => teacher.id !== currentTeacherId).map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.label}</option>)}</select></label>
          <label className="block text-sm font-bold text-slate-700">Effective from<input name="effective_from" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} className={inputClass} /></label>
          <label className="block text-sm font-bold text-slate-700">Reason<textarea name="reason" required minLength={3} rows={2} className={inputClass} /></label>
          <div className="grid gap-2 sm:grid-cols-2">{[
            ["transfer_future_timetable", "Future timetable lessons"], ["transfer_pending_marks", "Pending mark responsibilities"],
            ["transfer_assignments", "Future assignments"], ["transfer_lesson_plans", "Draft lesson plans"],
            ["transfer_comments", "Pending comments (manual review)"], ["transfer_pending_approvals", "Pending approvals (manual review)"],
          ].map(([name, label]) => <label key={name} className="flex items-center gap-2 rounded-lg border border-slate-200 p-3 text-sm font-semibold text-slate-700"><input type="checkbox" name={name} /> {label}</label>)}</div>
          <button disabled={busy || !preview} className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRightLeft className="h-4 w-4" />} Confirm reassignment</button>
        </form>
      </Modal>
    </>
  );
}
