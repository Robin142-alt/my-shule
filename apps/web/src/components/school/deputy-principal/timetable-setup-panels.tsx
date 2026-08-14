"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CalendarRange, Clock3, Pencil, Plus, Save, Trash2, UserRoundCheck, Warehouse } from "lucide-react";
import { toast } from "sonner";

import { useSchoolMutation } from "@/lib/data/school-hooks";
import {
  type AvailabilityResponse,
  type AvailabilityRule,
  type ClassSection,
  type ConfigurationDay,
  type ConfigurationPeriod,
  type ConfigurationResponse,
  type OfflineAware,
  type RequirementsResponse,
  type Subject,
  type Teacher,
  type TimetableConfiguration,
  type TimetableCommonBlock,
  type TimetableRequirement,
  type TimetableResource,
  type ResourcesResponse,
  TIMETABLE_DAYS,
  configurationFrom,
  dayLabel,
  isOfflineQueued,
  teacherId,
  teacherLabel,
} from "./timetable-types";

const fieldClass = "mt-1 h-11 w-full rounded-lg border border-[#C8D5EA] bg-white px-3 text-sm font-semibold text-[#071D49] outline-none focus:border-cyan-500 focus:ring-4 focus:ring-cyan-200/30";

function localId(prefix: string) {
  void prefix;
  return crypto.randomUUID();
}

function SetupState({ loading, error, onRetry }: { loading: boolean; error?: Error | null; onRetry: () => void }) {
  if (loading) return <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-8 text-center text-sm font-bold text-[#64748B]">Loading timetable setup...</div>;
  if (!error) return null;
  return (
    <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-800">
      <p>Timetable setup could not be loaded.</p>
      <button type="button" onClick={onRetry} className="mt-3 rounded-lg border border-rose-300 bg-white px-3 py-2">Retry</button>
    </div>
  );
}

function saveMessage(result: unknown, label: string, onState: (state: "saved" | "queued" | "failed") => void) {
  if (isOfflineQueued(result)) {
    onState("queued");
    toast.warning(`${label} saved on this device and queued for sync.`);
    return;
  }
  onState("saved");
  toast.success(`${label} saved.`);
}

export function PeriodConfigurationPanel({
  response,
  academicYear,
  termName,
  classes,
  loading,
  error,
  onRetry,
  onSaved,
  onSaveState,
}: {
  response?: ConfigurationResponse;
  academicYear: string;
  termName: string;
  classes: ClassSection[];
  loading: boolean;
  error?: Error | null;
  onRetry: () => void;
  onSaved: () => Promise<unknown> | void;
  onSaveState: (state: "saving" | "saved" | "queued" | "failed") => void;
}) {
  const [draft, setDraft] = useState<TimetableConfiguration | null>(null);
  const saveMutation = useSchoolMutation<OfflineAware<ConfigurationResponse>, Record<string, unknown>>(
    "/api/timetable/configuration",
    "PUT",
  );

  useEffect(() => {
    const configuration = configurationFrom(response);
    setDraft(configuration
      ? structuredClone(configuration)
      : academicYear && termName
        ? { academic_year: academicYear, term_name: termName, days: [], common_blocks: [] }
        : null);
  }, [response, academicYear, termName]);

  const addDay = () => {
    setDraft((current) => {
      if (!current) return current;
      const used = new Set(current.days.map((day) => Number(day.day_of_week)));
      const next = TIMETABLE_DAYS.find((day) => !used.has(day.value));
      if (!next) return current;
      return {
        ...current,
        days: [...current.days, { day_of_week: next.value, name: next.label, is_teaching_day: true, periods: [] }],
      };
    });
  };

  const updateDay = (dayIndex: number, patch: Partial<ConfigurationDay>) => {
    setDraft((current) => current ? {
      ...current,
      days: current.days.map((day, index) => index === dayIndex ? { ...day, ...patch } : day),
    } : current);
  };

  const addPeriod = (dayIndex: number) => {
    setDraft((current) => {
      if (!current) return current;
      return {
        ...current,
        days: current.days.map((day, index) => index === dayIndex
          ? {
              ...day,
              periods: [...day.periods, {
                id: localId("period"),
                name: `Period ${day.periods.length + 1}`,
                starts_at: "08:00",
                ends_at: "08:40",
                period_type: "lesson",
                is_teaching: true,
                order_index: day.periods.length,
              }],
            }
          : day),
      };
    });
  };

  const updatePeriod = (dayIndex: number, periodIndex: number, patch: Partial<ConfigurationPeriod>) => {
    setDraft((current) => current ? {
      ...current,
      days: current.days.map((day, index) => index === dayIndex
        ? { ...day, periods: day.periods.map((period, pIndex) => pIndex === periodIndex ? { ...period, ...patch } : period) }
        : day),
    } : current);
  };

  const removePeriod = (dayIndex: number, periodIndex: number) => {
    setDraft((current) => current ? {
      ...current,
      days: current.days.map((day, index) => index === dayIndex
        ? { ...day, periods: day.periods.filter((_, pIndex) => pIndex !== periodIndex).map((period, order_index) => ({ ...period, order_index })) }
        : day),
    } : current);
  };

  const addCommonBlock = () => {
    setDraft((current) => {
      if (!current) return current;
      const day = current.days.find((candidate) => candidate.is_teaching_day && candidate.periods.length > 0);
      const period = day?.periods[0];
      if (!day || !period) {
        toast.error("Configure at least one school day and period before adding a common block.");
        return current;
      }
      return {
        ...current,
        common_blocks: [...current.common_blocks, {
          name: "Assembly",
          activity_type: "assembly",
          target_scope: "school",
          target_ids: [],
          day_of_week: day.day_of_week,
          period_id: period.id,
          duration_periods: 1,
          is_locked: true,
        }],
      };
    });
  };

  const updateCommonBlock = (index: number, patch: Partial<TimetableCommonBlock>) => {
    setDraft((current) => current ? {
      ...current,
      common_blocks: current.common_blocks.map((block, blockIndex) => blockIndex === index ? { ...block, ...patch } : block),
    } : current);
  };

  const save = async () => {
    if (!draft) return;
    const invalidPeriod = draft.days.flatMap((day) => day.periods).find((period) => !period.name.trim() || period.starts_at >= period.ends_at);
    if (invalidPeriod) {
      toast.error("Every period needs a name and an end time after its start time.");
      return;
    }
    onSaveState("saving");
    try {
      const result = await saveMutation.mutateAsync({
        academic_year: academicYear,
        term_name: termName,
        expected_row_version: draft.row_version,
        days: draft.days.map((day) => ({
          ...day,
          periods: day.periods.map((period, order_index) => ({
            ...period,
            id: period.id.startsWith("period-") ? undefined : period.id,
            order_index,
          })),
        })),
        common_blocks: draft.common_blocks,
      });
      saveMessage(result, "Period configuration", onSaveState);
      if (!isOfflineQueued(result)) await onSaved();
    } catch (mutationError) {
      onSaveState("failed");
      toast.error(mutationError instanceof Error ? mutationError.message : "Period configuration could not be saved.");
    }
  };

  if (loading || error) return <SetupState loading={loading} error={error} onRetry={onRetry} />;
  if (!draft) return null;

  return (
    <section className="space-y-4" aria-label="School day and period configuration">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="flex items-center gap-2 text-lg font-black text-[#071D49]"><CalendarRange className="h-5 w-5" /> School day & periods</h3>
          <p className="mt-1 text-sm text-[#64748B]">Configure each teaching day independently. Breaks and school activities occupy time without becoming lessons.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={addDay} disabled={draft.days.length >= 7} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[#C8D5EA] bg-white px-3 text-sm font-black text-[#071D49] disabled:opacity-50"><Plus className="h-4 w-4" /> Add day</button>
          <button type="button" onClick={save} disabled={saveMutation.isPending} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#174EA6] px-4 text-sm font-black text-white disabled:opacity-50"><Save className="h-4 w-4" /> {saveMutation.isPending ? "Saving..." : "Save periods"}</button>
        </div>
      </div>

      {draft.days.length === 0 ? (
        <div className="rounded-xl border border-dashed border-amber-300 bg-amber-50 p-6 text-center text-sm font-bold text-amber-900">
          No school days are configured. Add the first day, then add teaching periods and non-teaching activities.
        </div>
      ) : draft.days.map((day, dayIndex) => ({ day, dayIndex })).sort((a, b) => a.day.day_of_week - b.day.day_of_week).map(({ day, dayIndex }) => (
        <div key={`${day.day_of_week}-${dayIndex}`} className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
          <div className="grid gap-3 sm:grid-cols-[minmax(180px,1fr)_auto_auto] sm:items-end">
            <label className="text-sm font-bold text-[#071D49]">Day
              <select value={day.day_of_week} onChange={(event) => updateDay(dayIndex, { day_of_week: Number(event.target.value), name: dayLabel(Number(event.target.value)) })} className={fieldClass}>
                {TIMETABLE_DAYS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
            <label className="flex min-h-11 items-center gap-2 rounded-lg border border-[#C8D5EA] bg-white px-3 text-sm font-bold text-[#071D49]">
              <input type="checkbox" checked={day.is_teaching_day} onChange={(event) => updateDay(dayIndex, { is_teaching_day: event.target.checked })} /> Teaching day
            </label>
            <button type="button" onClick={() => setDraft((current) => current ? { ...current, days: current.days.filter((_, index) => index !== dayIndex) } : current)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-rose-200 bg-white px-3 text-sm font-bold text-rose-700"><Trash2 className="h-4 w-4" /> Remove day</button>
          </div>

          <div className="mt-4 space-y-3">
            {day.periods.map((period, periodIndex) => (
              <div key={period.id || periodIndex} className="grid gap-3 rounded-xl border border-[#D8E0EC] bg-white p-3 md:grid-cols-[1.2fr_1fr_1fr_1fr_auto_auto] md:items-end">
                <label className="text-xs font-black uppercase tracking-wide text-[#64748B]">Name<input value={period.name} onChange={(event) => updatePeriod(dayIndex, periodIndex, { name: event.target.value })} className={fieldClass} /></label>
                <label className="text-xs font-black uppercase tracking-wide text-[#64748B]">Start<input type="time" value={period.starts_at.slice(0, 5)} onChange={(event) => updatePeriod(dayIndex, periodIndex, { starts_at: event.target.value })} className={fieldClass} /></label>
                <label className="text-xs font-black uppercase tracking-wide text-[#64748B]">End<input type="time" value={period.ends_at.slice(0, 5)} onChange={(event) => updatePeriod(dayIndex, periodIndex, { ends_at: event.target.value })} className={fieldClass} /></label>
                <label className="text-xs font-black uppercase tracking-wide text-[#64748B]">Type
                  <select value={period.period_type} onChange={(event) => updatePeriod(dayIndex, periodIndex, { period_type: event.target.value, is_teaching: event.target.value === "lesson" })} className={fieldClass}>
                    {[["lesson", "Lesson"], ["break", "Break"], ["lunch", "Lunch"], ["assembly", "Assembly"], ["games", "Games"], ["clubs", "Clubs"], ["guidance", "Guidance/Counselling"], ["class_meeting", "Class meeting"], ["religious", "Religious activity"], ["prep", "Prep"], ["remedial", "Remedial"], ["activity", "School activity"]].map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </label>
                <label className="flex min-h-11 items-center gap-2 text-xs font-bold text-[#071D49]"><input type="checkbox" checked={period.is_teaching} onChange={(event) => updatePeriod(dayIndex, periodIndex, { is_teaching: event.target.checked })} /> Teaching</label>
                <button type="button" onClick={() => removePeriod(dayIndex, periodIndex)} aria-label={`Remove ${period.name}`} className="grid h-11 w-11 place-items-center rounded-lg border border-rose-200 text-rose-700"><Trash2 className="h-4 w-4" /></button>
              </div>
            ))}
            <button type="button" onClick={() => addPeriod(dayIndex)} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-dashed border-[#8FA7C8] bg-white px-4 text-sm font-black text-[#174EA6]"><Plus className="h-4 w-4" /> Add period or activity</button>
          </div>
        </div>
      ))}

      <div className="space-y-3 border-t border-[#D8E0EC] pt-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h4 className="font-black text-[#071D49]">Common timetable blocks</h4><p className="mt-1 text-sm text-[#64748B]">Apply assemblies, games, clubs, prep, guidance, or school-defined activities in bulk. These blocks occupy time and pass the same conflict engine.</p></div><button type="button" onClick={addCommonBlock} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-[#C8D5EA] bg-white px-4 text-sm font-black"><Plus className="h-4 w-4" /> Add common block</button></div>
        {draft.common_blocks.length === 0 ? <div className="rounded-xl border border-dashed border-[#C8D5EA] bg-[#F8FAFC] p-5 text-center text-sm font-bold text-[#64748B]">No school-wide or group activity block is configured.</div> : draft.common_blocks.map((block, blockIndex) => {
          const blockDay = draft.days.find((day) => day.day_of_week === block.day_of_week);
          const targetOptions = block.target_scope === "stream"
            ? classes.filter((section) => section.stream_id).map((section) => ({ id: section.stream_id!, label: `${section.name}${section.stream ? ` - ${section.stream}` : ""}` }))
            : classes.map((section) => ({ id: section.id, label: block.target_scope === "grade" ? `${section.grade_level ?? "Grade/form"} - ${section.name}` : section.name }));
          return (
            <div key={block.id ?? `block-${blockIndex}`} className="grid gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 sm:grid-cols-2 xl:grid-cols-[1.2fr_1fr_1fr_1fr_1.2fr_.7fr_auto] xl:items-end">
              <label className="text-xs font-black uppercase text-[#64748B]">Activity name<input value={block.name} onChange={(event) => updateCommonBlock(blockIndex, { name: event.target.value })} className={fieldClass} /></label>
              <label className="text-xs font-black uppercase text-[#64748B]">Type<select value={block.activity_type} onChange={(event) => updateCommonBlock(blockIndex, { activity_type: event.target.value })} className={fieldClass}>{[["teaching", "Teaching activity"], ["break", "Break"], ["lunch", "Lunch"], ["assembly", "Assembly"], ["games", "Games"], ["clubs", "Clubs"], ["guidance_counselling", "Guidance/Counselling"], ["class_meeting", "Class meeting"], ["religious_activity", "Religious activity"], ["prep", "Prep"], ["remedial", "Remedial"], ["custom", "School-defined"]].map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
              <label className="text-xs font-black uppercase text-[#64748B]">Apply to<select value={block.target_scope} onChange={(event) => updateCommonBlock(blockIndex, { target_scope: event.target.value as TimetableCommonBlock["target_scope"], target_ids: [] })} className={fieldClass}><option value="school">Whole school</option><option value="grade">Selected grade/form classes</option><option value="class">Selected classes</option><option value="stream">Selected streams</option></select></label>
              <label className="text-xs font-black uppercase text-[#64748B]">Day<select value={block.day_of_week} onChange={(event) => { const day = Number(event.target.value); const first = draft.days.find((candidate) => candidate.day_of_week === day)?.periods[0]; updateCommonBlock(blockIndex, { day_of_week: day, period_id: first?.id ?? "" }); }} className={fieldClass}>{draft.days.map((day) => <option key={day.day_of_week} value={day.day_of_week}>{day.name}</option>)}</select></label>
              <label className="text-xs font-black uppercase text-[#64748B]">Period<select value={block.period_id} onChange={(event) => updateCommonBlock(blockIndex, { period_id: event.target.value })} className={fieldClass}>{(blockDay?.periods ?? []).map((period) => <option key={period.id} value={period.id}>{period.name} - {period.starts_at.slice(0, 5)}</option>)}</select></label>
              <label className="text-xs font-black uppercase text-[#64748B]">Duration<input type="number" min={1} max={20} value={block.duration_periods} onChange={(event) => updateCommonBlock(blockIndex, { duration_periods: Number(event.target.value) })} className={fieldClass} /></label>
              <button type="button" onClick={() => setDraft((current) => current ? { ...current, common_blocks: current.common_blocks.filter((_, index) => index !== blockIndex) } : current)} aria-label={`Remove ${block.name}`} className="grid h-11 w-11 place-items-center rounded-lg border border-rose-200 bg-white text-rose-700"><Trash2 className="h-4 w-4" /></button>
              {block.target_scope !== "school" ? <fieldset className="rounded-lg border border-blue-200 bg-white p-3 sm:col-span-2 xl:col-span-7"><legend className="px-1 text-xs font-black uppercase text-[#64748B]">Selected {block.target_scope === "grade" ? "grade/form classes" : `${block.target_scope}s`}</legend><div className="mt-2 grid max-h-36 gap-2 overflow-y-auto sm:grid-cols-2 lg:grid-cols-3">{targetOptions.length === 0 ? <p className="text-xs font-bold text-amber-800">No matching school records are available for this scope.</p> : targetOptions.map((option) => <label key={option.id} className="flex min-h-10 items-center gap-2 rounded-lg border border-[#D8E0EC] px-3 text-sm font-bold"><input type="checkbox" checked={block.target_ids.includes(option.id)} onChange={(event) => updateCommonBlock(blockIndex, { target_ids: event.target.checked ? [...block.target_ids, option.id] : block.target_ids.filter((id) => id !== option.id) })} /> {option.label}</label>)}</div></fieldset> : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function SubjectRequirementsPanel({
  response,
  academicYear,
  termName,
  classes,
  subjects,
  teachers,
  resources,
  loading,
  error,
  onRetry,
  onSaved,
  onSaveState,
}: {
  response?: RequirementsResponse;
  academicYear: string;
  termName: string;
  classes: ClassSection[];
  subjects: Subject[];
  teachers: Teacher[];
  resources: TimetableResource[];
  loading: boolean;
  error?: Error | null;
  onRetry: () => void;
  onSaved: () => Promise<unknown> | void;
  onSaveState: (state: "saving" | "saved" | "queued" | "failed") => void;
}) {
  const [items, setItems] = useState<TimetableRequirement[]>([]);
  const saveMutation = useSchoolMutation<OfflineAware<RequirementsResponse>, Record<string, unknown>>("/api/timetable/requirements", "PUT");

  useEffect(() => setItems(structuredClone(response?.items ?? [])), [response]);

  const update = (index: number, patch: Partial<TimetableRequirement>) => setItems((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item));
  const add = () => setItems((current) => [...current, {
    class_section_id: classes[0]?.id ?? "",
    subject_id: subjects[0]?.id ?? "",
    teacher_id: null,
    periods_per_week: 1,
    duration_periods: 1,
    resource_id: null,
    parallel_key: null,
  }]);

  const save = async () => {
    if (items.length === 0) {
      toast.error("Add at least one subject requirement before saving.");
      return;
    }
    if (items.some((item) => !item.class_section_id || !item.subject_id || item.periods_per_week < 1 || item.duration_periods < 1)) {
      toast.error("Every requirement needs a class, subject, weekly period count, and valid duration.");
      return;
    }
    onSaveState("saving");
    try {
      const result = await saveMutation.mutateAsync({
        academic_year: academicYear,
        term_name: termName,
        replace_existing: true,
        requirements: items.map(({ row_version, ...item }) => ({ ...item, expected_row_version: row_version })),
      });
      if (!isOfflineQueued(result) && result.items.length !== items.length) {
        throw new Error("The server did not confirm a complete transactional replacement of the subject requirements. Refresh before making more changes.");
      }
      saveMessage(result, "Subject period requirements", onSaveState);
      if (!isOfflineQueued(result)) await onSaved();
    } catch (mutationError) {
      onSaveState("failed");
      toast.error(mutationError instanceof Error ? mutationError.message : "Requirements could not be saved.");
    }
  };

  if (loading || error) return <SetupState loading={loading} error={error} onRetry={onRetry} />;

  return (
    <section className="space-y-4" aria-label="Subject period requirements">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div><h3 className="flex items-center gap-2 text-lg font-black text-[#071D49]"><Clock3 className="h-5 w-5" /> Subject period requirements</h3><p className="mt-1 text-sm text-[#64748B]">Define weekly frequency and single, double, or extended duration without duplicating teacher allocations.</p></div>
        <div className="flex gap-2"><button type="button" onClick={add} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[#C8D5EA] bg-white px-3 text-sm font-black"><Plus className="h-4 w-4" /> Add requirement</button><button type="button" onClick={save} disabled={saveMutation.isPending} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#174EA6] px-4 text-sm font-black text-white disabled:opacity-50"><Save className="h-4 w-4" /> {saveMutation.isPending ? "Saving..." : "Save requirements"}</button></div>
      </div>
      {items.length === 0 ? <div className="rounded-xl border border-dashed border-amber-300 bg-amber-50 p-6 text-center text-sm font-bold text-amber-900">No weekly subject requirements exist. Add the first class-subject requirement before automatic generation.</div> : null}
      <div className="space-y-3">
        {items.map((item, index) => (
          <div key={item.id ?? `new-${index}`} className="grid gap-3 rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4 sm:grid-cols-2 xl:grid-cols-[1.2fr_1.2fr_1.2fr_.7fr_.7fr_1fr_1fr_auto] xl:items-end">
            <label className="text-xs font-black uppercase text-[#64748B]">Class<select value={item.class_section_id} onChange={(event) => update(index, { class_section_id: event.target.value })} className={fieldClass}><option value="">Select class</option>{classes.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}</select></label>
            <label className="text-xs font-black uppercase text-[#64748B]">Subject<select value={item.subject_id} onChange={(event) => update(index, { subject_id: event.target.value })} className={fieldClass}><option value="">Select subject</option>{subjects.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}</select></label>
            <label className="text-xs font-black uppercase text-[#64748B]">Allocated teacher<select value={item.teacher_id ?? ""} onChange={(event) => update(index, { teacher_id: event.target.value || null })} className={fieldClass}><option value="">Use academic allocation</option>{teachers.map((row) => <option key={teacherId(row)} value={teacherId(row)}>{teacherLabel(row)}</option>)}</select></label>
            <label className="text-xs font-black uppercase text-[#64748B]">Per week<input type="number" min={1} max={30} value={item.periods_per_week} onChange={(event) => update(index, { periods_per_week: Number(event.target.value) })} className={fieldClass} /></label>
            <label className="text-xs font-black uppercase text-[#64748B]">Duration<input type="number" min={1} max={4} value={item.duration_periods} onChange={(event) => update(index, { duration_periods: Number(event.target.value) })} className={fieldClass} /></label>
            <label className="text-xs font-black uppercase text-[#64748B]">Resource<select value={item.resource_id ?? ""} onChange={(event) => update(index, { resource_id: event.target.value || null })} className={fieldClass}><option value="">No exclusive resource</option>{resources.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}</select></label>
            <label className="text-xs font-black uppercase text-[#64748B]">Parallel group<input value={item.parallel_key ?? ""} onChange={(event) => update(index, { parallel_key: event.target.value || null })} placeholder="Optional group" className={fieldClass} /></label>
            <button type="button" onClick={() => setItems((current) => current.filter((_, itemIndex) => itemIndex !== index))} aria-label="Remove subject requirement" className="grid h-11 w-11 place-items-center rounded-lg border border-rose-200 bg-white text-rose-700"><Trash2 className="h-4 w-4" /></button>
          </div>
        ))}
      </div>
    </section>
  );
}

export function TeacherAvailabilityPanel({
  response,
  configuration,
  academicYear,
  termName,
  teachers,
  loading,
  error,
  onRetry,
  onSaved,
  onSaveState,
}: {
  response?: AvailabilityResponse;
  configuration?: TimetableConfiguration | null;
  academicYear: string;
  termName: string;
  teachers: Teacher[];
  loading: boolean;
  error?: Error | null;
  onRetry: () => void;
  onSaved: () => Promise<unknown> | void;
  onSaveState: (state: "saving" | "saved" | "queued" | "failed") => void;
}) {
  const [items, setItems] = useState<AvailabilityRule[]>([]);
  const [selectedTeacher, setSelectedTeacher] = useState("");
  const saveMutation = useSchoolMutation<OfflineAware<AvailabilityResponse>, Record<string, unknown>>("/api/timetable/availability", "PUT");

  useEffect(() => setItems(structuredClone(response?.items ?? [])), [response]);
  useEffect(() => {
    if (!selectedTeacher && teachers.length > 0) setSelectedTeacher(teacherId(teachers[0]));
  }, [selectedTeacher, teachers]);

  const periods = useMemo(() => configuration?.days.flatMap((day) => day.periods.map((period) => ({ ...period, day_of_week: day.day_of_week }))) ?? [], [configuration]);
  const visibleItems = items.map((item, index) => ({ item, index })).filter(({ item }) => item.teacher_id === selectedTeacher);

  const add = () => {
    const period = periods[0];
    if (!selectedTeacher || !period) {
      toast.error("Select a teacher and configure at least one period first.");
      return;
    }
    setItems((current) => [...current, { teacher_id: selectedTeacher, day_of_week: period.day_of_week, period_id: period.id, state: "unavailable", reason: "" }]);
  };

  const save = async () => {
    if (items.length === 0) {
      toast.error("Add at least one availability rule before saving.");
      return;
    }
    onSaveState("saving");
    try {
      const result = await saveMutation.mutateAsync({
        academic_year: academicYear,
        term_name: termName,
        replace_existing: true,
        items: items.map(({ row_version, ...item }) => ({ ...item, expected_row_version: row_version })),
      });
      if (!isOfflineQueued(result) && result.items.length !== items.length) {
        throw new Error("The server did not confirm a complete transactional replacement of teacher availability. Refresh before making more changes.");
      }
      saveMessage(result, "Teacher availability", onSaveState);
      if (!isOfflineQueued(result)) await onSaved();
    } catch (mutationError) {
      onSaveState("failed");
      toast.error(mutationError instanceof Error ? mutationError.message : "Teacher availability could not be saved.");
    }
  };

  if (loading || error) return <SetupState loading={loading} error={error} onRetry={onRetry} />;

  return (
    <section className="space-y-4" aria-label="Teacher availability">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div><h3 className="flex items-center gap-2 text-lg font-black text-[#071D49]"><UserRoundCheck className="h-5 w-5" /> Teacher availability</h3><p className="mt-1 text-sm text-[#64748B]">Availability, preferred-free, unavailable, and protected administrative periods guide generation and relief suggestions.</p></div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <label className="min-w-64 text-xs font-black uppercase text-[#64748B]">Teacher<select value={selectedTeacher} onChange={(event) => setSelectedTeacher(event.target.value)} className={fieldClass}><option value="">Select teacher</option>{teachers.map((teacher) => <option key={teacherId(teacher)} value={teacherId(teacher)}>{teacherLabel(teacher)}</option>)}</select></label>
          <button type="button" onClick={add} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[#C8D5EA] bg-white px-3 text-sm font-black"><Plus className="h-4 w-4" /> Add rule</button>
          <button type="button" onClick={save} disabled={saveMutation.isPending} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#174EA6] px-4 text-sm font-black text-white disabled:opacity-50"><Save className="h-4 w-4" /> {saveMutation.isPending ? "Saving..." : "Save availability"}</button>
        </div>
      </div>

      {periods.length === 0 ? <div className="flex gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm font-bold text-amber-900"><AlertTriangle className="h-5 w-5 shrink-0" /> Configure school periods before adding period-level availability.</div> : null}
      {visibleItems.length === 0 ? <div className="rounded-xl border border-dashed border-[#C8D5EA] bg-[#F8FAFC] p-6 text-center text-sm font-bold text-[#64748B]">No availability exceptions are recorded for this teacher. They remain available unless a rule is added.</div> : null}
      <div className="space-y-3">
        {visibleItems.map(({ item, index }) => {
          const dayPeriods = periods.filter((period) => period.day_of_week === Number(item.day_of_week));
          return (
            <div key={item.id ?? `availability-${index}`} className="grid gap-3 rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4 sm:grid-cols-2 xl:grid-cols-[1fr_1.4fr_1fr_2fr_auto] xl:items-end">
              <label className="text-xs font-black uppercase text-[#64748B]">Day<select value={item.day_of_week} onChange={(event) => { const day = Number(event.target.value); const first = periods.find((period) => period.day_of_week === day); setItems((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, day_of_week: day, period_id: first?.id ?? "" } : row)); }} className={fieldClass}>{TIMETABLE_DAYS.map((day) => <option key={day.value} value={day.value}>{day.label}</option>)}</select></label>
              <label className="text-xs font-black uppercase text-[#64748B]">Period<select value={item.period_id} onChange={(event) => setItems((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, period_id: event.target.value } : row))} className={fieldClass}>{dayPeriods.map((period) => <option key={period.id} value={period.id}>{period.name} ({period.starts_at.slice(0, 5)})</option>)}</select></label>
              <label className="text-xs font-black uppercase text-[#64748B]">State<select value={item.state} onChange={(event) => setItems((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, state: event.target.value as AvailabilityRule["state"] } : row))} className={fieldClass}><option value="available">Available</option><option value="prefer_free">Prefer free</option><option value="unavailable">Unavailable</option><option value="protected">Protected admin</option></select></label>
              <label className="text-xs font-black uppercase text-[#64748B]">Reason<input value={item.reason ?? ""} onChange={(event) => setItems((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, reason: event.target.value } : row))} placeholder="Why this period is protected" className={fieldClass} /></label>
              <button type="button" onClick={() => setItems((current) => current.filter((_, rowIndex) => rowIndex !== index))} aria-label="Remove availability rule" className="grid h-11 w-11 place-items-center rounded-lg border border-rose-200 bg-white text-rose-700"><Trash2 className="h-4 w-4" /></button>
            </div>
          );
        })}
      </div>
    </section>
  );
}

type ResourceDraft = {
  name: string;
  resource_type: string;
  capacity: number;
  is_exclusive: boolean;
  status: "active" | "inactive" | "archived";
};

const EMPTY_RESOURCE: ResourceDraft = {
  name: "",
  resource_type: "special_room",
  capacity: 1,
  is_exclusive: true,
  status: "active",
};

export function TimetableResourcesPanel({
  response,
  loading,
  error,
  onRetry,
  onSaved,
  onSaveState,
}: {
  response?: ResourcesResponse;
  loading: boolean;
  error?: Error | null;
  onRetry: () => void;
  onSaved: () => Promise<unknown> | void;
  onSaveState: (state: "saving" | "saved" | "queued" | "failed") => void;
}) {
  const [createDraft, setCreateDraft] = useState<ResourceDraft>(EMPTY_RESOURCE);
  const [editing, setEditing] = useState<(ResourceDraft & { id: string; row_version: number }) | null>(null);
  const createMutation = useSchoolMutation<OfflineAware<TimetableResource>, ResourceDraft>("/api/timetable/resources", "POST");
  const updateMutation = useSchoolMutation<OfflineAware<TimetableResource>, ResourceDraft & { expected_row_version: number }>(
    `/api/timetable/resources/${encodeURIComponent(editing?.id ?? "missing")}`,
    "PATCH",
  );

  const create = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!createDraft.name.trim()) {
      toast.error("Give the timetable resource a clear school-facing name.");
      return;
    }
    onSaveState("saving");
    try {
      const result = await createMutation.mutateAsync({ ...createDraft, name: createDraft.name.trim() });
      saveMessage(result, "Timetable resource", onSaveState);
      if (!isOfflineQueued(result)) {
        setCreateDraft(EMPTY_RESOURCE);
        await onSaved();
      }
    } catch (mutationError) {
      onSaveState("failed");
      toast.error(mutationError instanceof Error ? mutationError.message : "The timetable resource could not be created.");
    }
  };

  const update = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editing) return;
    onSaveState("saving");
    try {
      const result = await updateMutation.mutateAsync({
        name: editing.name.trim(),
        resource_type: editing.resource_type,
        capacity: editing.capacity,
        is_exclusive: editing.is_exclusive,
        status: editing.status,
        expected_row_version: editing.row_version,
      });
      saveMessage(result, "Timetable resource", onSaveState);
      if (!isOfflineQueued(result)) {
        setEditing(null);
        await onSaved();
      }
    } catch (mutationError) {
      onSaveState("failed");
      toast.error(mutationError instanceof Error ? mutationError.message : "The timetable resource could not be updated.");
    }
  };

  if (loading || error) return <SetupState loading={loading} error={error} onRetry={onRetry} />;
  const resources = response?.items ?? [];

  return (
    <section className="space-y-5" aria-label="Rooms and exclusive timetable resources">
      <div><h3 className="flex items-center gap-2 text-lg font-black text-[#071D49]"><Warehouse className="h-5 w-5" /> Rooms, labs & exclusive resources</h3><p className="mt-1 text-sm text-[#64748B]">Manage only resources whose occupancy creates a real timetable constraint, such as special rooms, labs, workshops, halls, or shared equipment. Ordinary classrooms need no extra administration.</p></div>

      <form onSubmit={create} className="grid gap-3 rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4 sm:grid-cols-2 xl:grid-cols-[1.5fr_1fr_.7fr_auto_auto] xl:items-end">
        <label className="text-xs font-black uppercase text-[#64748B]">Resource name<input required value={createDraft.name} onChange={(event) => setCreateDraft((current) => ({ ...current, name: event.target.value }))} placeholder="e.g. Chemistry Lab" className={fieldClass} /></label>
        <label className="text-xs font-black uppercase text-[#64748B]">Type<select value={createDraft.resource_type} onChange={(event) => setCreateDraft((current) => ({ ...current, resource_type: event.target.value }))} className={fieldClass}><option value="special_room">Special room</option><option value="laboratory">Laboratory</option><option value="workshop">Workshop</option><option value="hall">Hall</option><option value="equipment">Shared equipment</option><option value="custom">School-defined</option></select></label>
        <label className="text-xs font-black uppercase text-[#64748B]">Capacity<input type="number" min={1} max={10000} value={createDraft.capacity} onChange={(event) => setCreateDraft((current) => ({ ...current, capacity: Number(event.target.value) }))} className={fieldClass} /></label>
        <label className="flex min-h-11 items-center gap-2 rounded-lg border border-[#C8D5EA] bg-white px-3 text-sm font-bold text-[#071D49]"><input type="checkbox" checked={createDraft.is_exclusive} onChange={(event) => setCreateDraft((current) => ({ ...current, is_exclusive: event.target.checked }))} /> Exclusive</label>
        <button type="submit" disabled={createMutation.isPending} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#174EA6] px-4 text-sm font-black text-white disabled:opacity-50"><Plus className="h-4 w-4" /> {createMutation.isPending ? "Adding..." : "Add resource"}</button>
      </form>

      {resources.length === 0 ? <div className="rounded-xl border border-dashed border-[#C8D5EA] bg-[#F8FAFC] p-6 text-center text-sm font-bold text-[#64748B]">No exclusive timetable resources are configured. Add one only if lessons compete for it.</div> : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{resources.map((resource) => (
          <article key={resource.id} className="rounded-xl border border-[#D8E0EC] bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3"><div><p className="font-black text-[#071D49]">{resource.name}</p><p className="mt-1 text-xs uppercase text-[#64748B]">{resource.resource_type.replaceAll("_", " ")}</p></div><span className={`rounded-full px-2 py-1 text-[10px] font-black uppercase ${resource.status === "active" ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-700"}`}>{resource.status}</span></div>
            <p className="mt-3 text-sm text-[#475569]">Capacity {resource.capacity ?? "not set"} - {resource.is_exclusive ? "Exclusive occupancy" : "Shareable"}</p>
            <button type="button" onClick={() => setEditing({ id: resource.id, name: resource.name, resource_type: resource.resource_type, capacity: resource.capacity ?? 1, is_exclusive: resource.is_exclusive, status: resource.status === "archived" ? "archived" : resource.status === "inactive" ? "inactive" : "active", row_version: resource.row_version ?? 1 })} className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-[#C8D5EA] text-sm font-black text-[#174EA6]"><Pencil className="h-4 w-4" /> Edit resource</button>
          </article>
        ))}</div>
      )}

      {editing ? (
        <form onSubmit={update} className="grid gap-3 rounded-xl border border-blue-300 bg-blue-50 p-4 sm:grid-cols-2 xl:grid-cols-[1.5fr_1fr_.7fr_1fr_auto_auto] xl:items-end">
          <label className="text-xs font-black uppercase text-[#64748B]">Resource name<input required value={editing.name} onChange={(event) => setEditing((current) => current ? { ...current, name: event.target.value } : current)} className={fieldClass} /></label>
          <label className="text-xs font-black uppercase text-[#64748B]">Type<input value={editing.resource_type} onChange={(event) => setEditing((current) => current ? { ...current, resource_type: event.target.value } : current)} className={fieldClass} /></label>
          <label className="text-xs font-black uppercase text-[#64748B]">Capacity<input type="number" min={1} max={10000} value={editing.capacity} onChange={(event) => setEditing((current) => current ? { ...current, capacity: Number(event.target.value) } : current)} className={fieldClass} /></label>
          <label className="text-xs font-black uppercase text-[#64748B]">Status<select value={editing.status} onChange={(event) => setEditing((current) => current ? { ...current, status: event.target.value as ResourceDraft["status"] } : current)} className={fieldClass}><option value="active">Active</option><option value="inactive">Inactive</option><option value="archived">Archived</option></select></label>
          <label className="flex min-h-11 items-center gap-2 rounded-lg border border-[#C8D5EA] bg-white px-3 text-sm font-bold"><input type="checkbox" checked={editing.is_exclusive} onChange={(event) => setEditing((current) => current ? { ...current, is_exclusive: event.target.checked } : current)} /> Exclusive</label>
          <div className="flex gap-2"><button type="button" onClick={() => setEditing(null)} className="min-h-11 rounded-lg border border-[#C8D5EA] bg-white px-3 text-sm font-black">Cancel</button><button type="submit" disabled={updateMutation.isPending} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#174EA6] px-3 text-sm font-black text-white disabled:opacity-50"><Save className="h-4 w-4" /> Save</button></div>
        </form>
      ) : null}
    </section>
  );
}
