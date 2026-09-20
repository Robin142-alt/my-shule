"use client";

import { useEffect, useRef, useState } from "react";
import { Clock3, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useSchoolMutation } from "@/lib/data/school-hooks";
import { isOfflineQueued, teacherId, teacherLabel, type ClassSection, type OfflineAware, type RequirementsResponse, type Subject, type Teacher, type TeacherAssignment, type TimetableConfiguration, type TimetableRequirement, type TimetableResource } from "./timetable-types";

const fieldClass = "mt-1 h-11 w-full min-w-0 rounded-lg border border-[#C8D5EA] bg-white px-3 text-sm font-semibold text-[#071D49] focus:border-cyan-500";
const buttonClass = "min-h-11 rounded-lg border border-[#C8D5EA] px-4 text-sm font-bold disabled:opacity-50";

export function SubjectRequirementsPanel({ response, academicYear, termName, classes, subjects, teachers, resources, assignments = [], configuration, onContinue, onDirtyChange, loading, error, onRetry, onSaved, onSaveState }: {
  response?: RequirementsResponse;
  academicYear: string;
  termName: string;
  classes: ClassSection[];
  subjects: Subject[];
  teachers: Teacher[];
  resources: TimetableResource[];
  assignments?: TeacherAssignment[];
  configuration?: TimetableConfiguration | null;
  onContinue?: () => void;
  onDirtyChange?: (dirty: boolean) => void;
  loading: boolean;
  error?: Error | null;
  onRetry: () => void;
  onSaved: () => Promise<unknown> | void;
  onSaveState: (state: "saving" | "saved" | "queued" | "failed") => void;
}) {
  const [items, setItems] = useState<TimetableRequirement[]>([]);
  const [classFilter, setClassFilter] = useState("");
  const [defaultPeriods, setDefaultPeriods] = useState(5);
  const [dirty, setDirty] = useState(false);
  const [saveError, setSaveError] = useState("");
  const dirtyRef = useRef(false);
  const saveMutation = useSchoolMutation<OfflineAware<RequirementsResponse>, Record<string, unknown>>("/api/timetable/requirements", "PUT");

  useEffect(() => {
    if (!dirtyRef.current) setItems(structuredClone(response?.items ?? []));
  }, [response]);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => { if (dirtyRef.current) event.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, []);
  const edit = (updater: (current: TimetableRequirement[]) => TimetableRequirement[]) => {
    dirtyRef.current = true; setDirty(true); onDirtyChange?.(true); setItems(updater); setSaveError("");
  };
  const update = (index: number, patch: Partial<TimetableRequirement>) => edit((current) => current.map((item, i) => i === index ? {
    ...item, ...patch,
    ...(["class_section_id", "subject_id", "stream_id", "teacher_id"].some((key) => key in patch)
      ? { resolved_teacher_id: undefined, resolved_teacher_name: undefined, resolved_stream_id: undefined, resolved_stream_name: undefined, allocation_status: undefined } : {}),
  } : item));
  const today = new Date().toISOString().slice(0, 10);
  const activeAssignments = assignments.filter((assignment) => (!assignment.status || assignment.status === "active")
    && (!assignment.effective_from || assignment.effective_from.slice(0, 10) <= today)
    && (!assignment.effective_to || assignment.effective_to.slice(0, 10) >= today));
  const allocationFor = (item: TimetableRequirement) => {
    let matching = activeAssignments.filter((row) => row.class_section_id === item.class_section_id && row.subject_id === item.subject_id
      && (!item.stream_id || !row.stream_id || row.stream_id === item.stream_id)
      && (!item.teacher_id || row.teacher_user_id === item.teacher_id));
    if (!item.stream_id && matching.some((row) => !row.stream_id)) matching = matching.filter((row) => !row.stream_id);
    const streams = new Set(matching.map((row) => item.stream_id ?? row.stream_id ?? null));
    const streamRequired = item.allocation_status === "stream_required" || (!item.allocation_status && streams.size > 1);
    const streamId = item.stream_id ?? item.resolved_stream_id ?? (streams.size === 1 ? [...streams][0] : null);
    return { matching, streamRequired, streamId,
      streamName: item.stream_name || item.resolved_stream_name || matching.find((row) => row.stream_id === streamId)?.stream_name };
  };
  const add = () => edit((current) => [...current, { class_section_id: classFilter || classes[0]?.id || "", subject_id: "", teacher_id: null, periods_per_week: defaultPeriods, duration_periods: 1 }]);
  const visibleItems = items.map((item, index) => ({ item, index })).filter(({ item }) => !classFilter || item.class_section_id === classFilter);
  const capacity = configuration?.days.filter((day) => day.is_teaching_day).reduce((sum, day) => sum + day.periods.filter((period) => period.is_teaching).length, 0) ?? 0;

  const addAllocatedSubjects = () => {
    if (!Number.isInteger(defaultPeriods) || defaultPeriods < 1 || defaultPeriods > 40) {
      toast.error("Choose between 1 and 40 periods per week."); return;
    }
    const candidates = activeAssignments.filter((assignment) => (!classFilter || assignment.class_section_id === classFilter)
      && classes.some((row) => row.id === assignment.class_section_id) && subjects.some((row) => row.id === assignment.subject_id));
    const next = [...items];
    for (const assignment of candidates) {
      if (!next.some((row) => row.class_section_id === assignment.class_section_id && row.subject_id === assignment.subject_id && (allocationFor(row).streamId ?? null) === (assignment.stream_id ?? null))) {
        next.push({ class_section_id: assignment.class_section_id, stream_id: assignment.stream_id ?? null, subject_id: assignment.subject_id, teacher_id: null, periods_per_week: defaultPeriods, duration_periods: 1 });
      }
    }
    if (next.length === items.length) {
      toast.info(candidates.length ? "All allocated subjects are already listed." : "Assign subjects and teachers in Academic Setup first."); return;
    }
    edit(() => next);
    toast.info("Allocated subjects added for review. Adjust their weekly periods, then save requirements.");
  };

  const save = async () => {
    if (items.some((item) => !item.class_section_id || !item.subject_id || !Number.isInteger(item.periods_per_week) || item.periods_per_week < 1 || item.periods_per_week > 40 || !Number.isInteger(item.duration_periods) || item.duration_periods < 1 || item.duration_periods > 4)) {
      setSaveError("Every requirement needs a class, subject, 1–40 weekly periods and a lesson length of 1–4 periods."); return;
    }
    const keys = items.map((item) => JSON.stringify([item.class_section_id, item.subject_id, item.stream_id ?? null, item.teacher_id ?? null, item.parallel_key ?? null]));
    if (new Set(keys).size !== keys.length) {
      setSaveError("A class and subject combination is repeated. Remove the duplicate requirement before saving."); return;
    }
    onSaveState("saving"); setSaveError("");
    try {
      const result = await saveMutation.mutateAsync({ academic_year: academicYear, term_name: termName, replace_existing: true,
        requirements: items.map((item) => ({ id: item.id, class_section_id: item.class_section_id,
          stream_id: item.stream_id ?? null, subject_id: item.subject_id, teacher_id: item.teacher_id ?? null,
          periods_per_week: item.periods_per_week, duration_periods: item.duration_periods,
          resource_id: item.resource_id ?? null, parallel_key: item.parallel_key ?? null,
          preferred_days: item.preferred_days, preferred_start_period_ids: item.preferred_start_period_ids,
          expected_row_version: item.row_version })),
      });
      if (isOfflineQueued(result)) {
        onSaveState("queued"); toast.info("Requirements queued on this device; the server has not confirmed them yet."); return;
      }
      if (result.items.length !== items.length) throw new Error("The server did not confirm all requirements. Refresh and review before continuing.");
      dirtyRef.current = false; setDirty(false); onDirtyChange?.(false); setItems(structuredClone(result.items));
      onSaveState("saved"); toast.success("Subject period requirements saved.");
      await onSaved();
    } catch (mutationError) {
      onSaveState("failed"); setSaveError(mutationError instanceof Error ? mutationError.message : "Requirements could not be saved. Your edits are still here; retry saving.");
    }
  };

  if (loading) return <p role="status">Loading subject requirements...</p>;
  if (error) return <div role="alert" className="rounded-xl bg-rose-50 p-4 text-rose-800"><p>Subject requirements could not be loaded. {error.message}</p><button type="button" onClick={onRetry} className={buttonClass}>Retry</button></div>;

  return <section className="space-y-4" aria-label="Subject period requirements">
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div><h3 className="flex items-center gap-2 text-lg font-black text-[#071D49]"><Clock3 className="h-5 w-5" /> Subject period requirements</h3><p className="mt-1 text-sm text-[#64748B]">Add your allocated subjects together, adjust weekly periods, then save. Teachers come from Academic Setup.</p></div>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={save} disabled={saveMutation.isPending || !dirty} className={`${buttonClass} inline-flex items-center gap-2 bg-[#174EA6] text-white`}><Save className="h-4 w-4" /> {saveMutation.isPending ? "Saving..." : "Save requirements"}</button>
        {onContinue ? <button type="button" onClick={onContinue} disabled={dirty || saveMutation.isPending || !items.length} className={buttonClass}>Continue to generation</button> : null}
      </div>
    </div>
    {saveError ? <p role="alert" className="rounded-xl bg-rose-50 p-4 text-sm font-bold text-rose-800">{saveError}</p> : null}
    <fieldset disabled={saveMutation.isPending} className="min-w-0 space-y-4 disabled:opacity-60">
      <div className="grid items-end gap-3 rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4 sm:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_10rem_auto_auto]">
        <label className="min-w-0 text-sm font-bold">Show class<select value={classFilter} onChange={(event) => setClassFilter(event.target.value)} className={fieldClass}><option value="">All classes</option>{classes.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}</select></label>
        <label className="text-sm font-bold">Default periods/week<input type="number" min={1} max={40} value={defaultPeriods} onChange={(event) => setDefaultPeriods(Number(event.target.value))} className={fieldClass} /></label>
        <button type="button" onClick={addAllocatedSubjects} className={`${buttonClass} bg-[#071D49] text-white`}>Add allocated subjects</button>
        <button type="button" onClick={add} className={`${buttonClass} inline-flex items-center justify-center gap-2 bg-white`}><Plus className="h-4 w-4" /> Add requirement</button>
      </div>
      <p className="text-sm text-[#475569]" role="status">{dirty ? "Unsaved changes — save before leaving this step." : "Requirements match the saved setup."} Showing {visibleItems.length} of {items.length} requirements.</p>
      <p className="text-sm text-[#64748B]">Weekly periods include doubles: 5 periods with double lessons gives two doubles and one single.</p>
      {classes.filter((row) => !classFilter || row.id === classFilter).map((row) => {
        const total = items.filter((item) => item.class_section_id === row.id).reduce((sum, item) => sum + item.periods_per_week, 0);
        return total > 0 ? <p key={row.id} className={capacity && total > capacity ? "text-sm font-bold text-amber-800" : "text-sm text-[#475569]"}>{row.name}: {total} periods requested{capacity ? ` / ${capacity} available per week` : " (configure school periods to check capacity)"}{capacity && total > capacity ? ". Above capacity; reduce periods or review parallel groups before generating." : ""}</p> : null;
      })}
      {visibleItems.length === 0 ? <div className="rounded-xl border border-dashed border-amber-300 bg-amber-50 p-5 text-sm text-amber-900">No requirements for this selection. Use Add allocated subjects to start from your teaching assignments, or add a requirement manually.</div> : null}
      {visibleItems.map(({ item, index }) => {
        const allocation = allocationFor(item);
        const allocatedIds = new Set(activeAssignments.filter((row) => row.class_section_id === item.class_section_id && row.subject_id === item.subject_id
          && (allocation.streamRequired || !row.stream_id || row.stream_id === allocation.streamId)).map((row) => row.teacher_user_id));
        const allocatedNames = teachers.filter((row) => allocatedIds.has(teacherId(row))).map(teacherLabel);
        const selectedTeacher = teachers.find((row) => teacherId(row) === item.teacher_id);
        const classStreams = activeAssignments.filter((row) => row.class_section_id === item.class_section_id && row.stream_id);
        const streamOptions = [...new Map(classStreams.map((row) => [row.stream_id!, row.stream_name || row.stream_id!])).entries()];
        const teacherText = allocation.streamRequired ? "Teachers are already allocated. Choose the stream below."
          : item.allocation_status === "missing" ? "No active matching allocation. Review Academic Foundation."
          : item.allocation_status === "ambiguous" || (!item.teacher_id && !item.resolved_teacher_id && allocatedIds.size > 1)
            ? "Multiple teachers are allocated. Choose the teacher below."
            : selectedTeacher ? teacherLabel(selectedTeacher)
              : item.resolved_teacher_name || (allocatedIds.size === 1 ? allocatedNames[0] || "Allocated teacher" : "No allocation found. Assign a teacher in Academic Foundation before generating.");
        return <article key={item.id ?? `new-${index}`} aria-label={`Requirement ${index + 1}`} className="space-y-3 rounded-xl border border-[#D8E0EC] bg-white p-4">
          <div className="grid items-end gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)_8rem_10rem_auto]">
            <label className="min-w-0 text-sm font-bold">Class<select value={item.class_section_id} onChange={(event) => update(index, { class_section_id: event.target.value, stream_id: null, teacher_id: null })} className={fieldClass}><option value="">Select class</option>{classes.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}</select></label>
            <label className="min-w-0 text-sm font-bold">Subject<select value={item.subject_id} onChange={(event) => update(index, { subject_id: event.target.value, teacher_id: null })} className={fieldClass}><option value="">Select subject</option>{subjects.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}</select></label>
            <label className="text-sm font-bold">Periods/week<input type="number" min={1} max={40} value={item.periods_per_week} onChange={(event) => update(index, { periods_per_week: Number(event.target.value) })} className={fieldClass} /></label>
            <label className="text-sm font-bold">Lesson length<select value={item.duration_periods} onChange={(event) => update(index, { duration_periods: Number(event.target.value) })} className={fieldClass}><option value={1}>Single period</option><option value={2}>Double period</option><option value={3}>3 periods</option><option value={4}>4 periods</option></select></label>
            <button type="button" onClick={() => edit((current) => current.filter((_, i) => i !== index))} aria-label="Remove subject requirement" className="grid h-11 w-11 place-items-center rounded-lg border border-rose-200 bg-white text-rose-700"><Trash2 className="h-4 w-4" /></button>
          </div>
          <p className="text-sm text-[#64748B]">Teacher: {teacherText}{!allocation.streamRequired && !item.teacher_id && (item.allocation_status === "resolved" || (!item.allocation_status && allocatedIds.size === 1)) ? " (from academic allocation)" : ""}</p>
          {allocation.streamId ? <p className="text-sm text-[#64748B]">Stream: {allocation.streamName || allocation.streamId}{!item.stream_id ? " (from academic allocation)" : ""}</p> : null}
          <details open={Boolean(item.resource_id || item.parallel_key || item.teacher_id || item.stream_id || allocation.streamRequired || item.allocation_status === "ambiguous" || allocatedIds.size > 1)}>
            <summary className="cursor-pointer text-sm font-bold text-[#174EA6]">Teacher, room & parallel options</summary>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {streamOptions.length > 0 || item.stream_id || allocation.streamId ? <label className="min-w-0 text-sm font-bold">Stream<select value={item.stream_id ?? ""} onChange={(event) => update(index, { stream_id: event.target.value || null, teacher_id: null })} className={fieldClass}><option value="">Use academic allocation automatically</option>{item.stream_id && !streamOptions.some(([id]) => id === item.stream_id) ? <option value={item.stream_id}>{item.stream_name || item.stream_id}</option> : null}{streamOptions.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label> : null}
              <label className="min-w-0 text-sm font-bold">Allocated teacher<select value={item.teacher_id ?? ""} onChange={(event) => update(index, { teacher_id: event.target.value || null })} className={fieldClass}><option value="">Use academic allocation automatically</option>{item.teacher_id && !allocatedIds.has(item.teacher_id) ? <option value={item.teacher_id}>{selectedTeacher ? teacherLabel(selectedTeacher) : "Previous teacher"} (allocation needs review)</option> : null}{teachers.filter((row) => allocatedIds.has(teacherId(row))).map((row) => <option key={teacherId(row)} value={teacherId(row)}>{teacherLabel(row)}</option>)}</select></label>
              <label className="min-w-0 text-sm font-bold">Resource<select value={item.resource_id ?? ""} onChange={(event) => update(index, { resource_id: event.target.value || null })} className={fieldClass}><option value="">No exclusive resource</option>{resources.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}</select></label>
              <label className="text-sm font-bold">Parallel group<input value={item.parallel_key ?? ""} onChange={(event) => update(index, { parallel_key: event.target.value || null })} placeholder="Optional group" className={fieldClass} /></label>
            </div>
          </details>
        </article>;
      })}
    </fieldset>
  </section>;
}
