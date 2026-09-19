"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, Copy, Plus, Trash2 } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import type { ConfigurationDay, PeriodType, TimetableConfiguration } from "./timetable-types";
import { TIMETABLE_DAYS, dayLabel, timeLabel } from "./timetable-types";
import { changePeriodType, copyDay, editPeriodTime, insertPeriod, movePeriod, numberPeriods, removePeriod, startDayAt } from "./school-day-builder";

const field = "h-11 min-w-0 w-full rounded-lg border border-[#C8D5EA] bg-white px-3 text-sm font-semibold text-[#071D49] focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100";
const button = "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-[#C8D5EA] bg-white px-3 text-sm font-bold text-[#174EA6] hover:bg-blue-50 disabled:opacity-40";

// Commit on blur so typing a time does not shift the day on every partial keystroke.
function TimeField({ value, label, onCommit }: { value: string; label: string; onCommit: (value: string) => void }) {
  const [text, setText] = useState<string | null>(null);
  return <input aria-label={label} type="time" className={field} value={text ?? value} onChange={(event) => setText(event.target.value)} onBlur={() => {
    if (text !== null && text !== value) onCommit(text);
    setText(null);
  }} onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); }} />;
}

function TypeButtons({ types, onAdd }: { types: PeriodType[]; onAdd: (type: PeriodType) => void }) {
  return <div className="flex flex-wrap gap-2">
    {types.slice(0, 4).map((type) => <button key={type.id} type="button" onClick={() => onAdd(type)} className={button}><Plus className="h-4 w-4" /> {type.name}</button>)}
    {types.length > 4 ? <select aria-label="Add another period type" value="" className={`${field} !w-28 max-w-full`} onChange={(event) => { const type = types.find((item) => item.id === event.target.value); if (type) onAdd(type); }}>
      <option value="">+ More</option>{types.slice(4).map((type) => <option key={type.id} value={type.id}>{type.name} · {type.default_duration_minutes} min</option>)}
    </select> : null}
  </div>;
}

export function SchoolDayEditor({ draft, onChange, disabled }: { draft: TimetableConfiguration; onChange: (next: TimetableConfiguration) => void; disabled: boolean }) {
  const [selectedDay, setSelectedDay] = useState(draft.days[0]?.day_of_week ?? 1);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [manageTypes, setManageTypes] = useState(false);
  const [typeDrafts, setTypeDrafts] = useState<PeriodType[]>([]);
  const [typeEdit, setTypeEdit] = useState<PeriodType | null>(null);
  const [typeError, setTypeError] = useState("");
  const [copyOpen, setCopyOpen] = useState(false);
  const [copyTargets, setCopyTargets] = useState<number[]>([]);
  const [insertAt, setInsertAt] = useState<number | null>(null);
  const types = draft.period_types ?? [];
  const day = draft.days.find((item) => item.day_of_week === selectedDay) ?? draft.days[0];
  const start = draft.school_starts_at ?? "08:00";

  function change(operation: () => TimetableConfiguration): boolean {
    try { const next = operation(); onChange(next); setError(""); setNotice(""); return true; }
    catch (cause) { setError(cause instanceof Error ? cause.message : "This change could not be made."); return false; }
  }
  function changeDay(operation: (day: ConfigurationDay) => ConfigurationDay) {
    if (!day) return;
    change(() => ({ ...draft, days: draft.days.map((item) => item === day ? operation(item) : item) }));
  }
  function add(type: PeriodType, index = day?.periods.length ?? 0) {
    changeDay((item) => insertPeriod(item, index, type, start, types));
    setInsertAt(null);
  }
  function deletePeriod(index: number) {
    changeDay((item) => {
      if (draft.common_blocks.some((block) => block.period_id === item.periods[index].id)) throw new Error("Move or remove the common timetable block using this period before deleting it.");
      return removePeriod(item, index, types);
    });
  }
  function openCopy() {
    setCopyTargets(TIMETABLE_DAYS.filter((option) => option.value !== day?.day_of_week && option.value <= 5 && draft.days.find((item) => item.day_of_week === option.value)?.is_teaching_day !== false).map((option) => option.value));
    setCopyOpen(true);
  }
  function applyTypeEdit(event: React.FormEvent) {
    event.preventDefault();
    if (!typeEdit) return;
    const name = typeEdit.name.trim();
    if (!name || typeDrafts.some((type) => type.id !== typeEdit.id && type.name.toLowerCase() === name.toLowerCase())) { setTypeError("Give each period type a different name."); return; }
    if (!Number.isInteger(typeEdit.default_duration_minutes) || typeEdit.default_duration_minutes < 1 || typeEdit.default_duration_minutes > 360) { setTypeError("Enter a duration from 1 to 360 minutes."); return; }
    const next = { ...typeEdit, name };
    setTypeDrafts((current) => current.some((type) => type.id === next.id) ? current.map((type) => type.id === next.id ? next : type) : [...current, next]);
    setTypeEdit(null); setTypeError("");
  }
  const copyActions = <><button type="button" className={button} onClick={() => setCopyOpen(false)}>Cancel</button><button type="button" disabled={!copyTargets.length || disabled} className={`${button} !bg-[#174EA6] !text-white`} onClick={() => {
    if (day && change(() => copyDay(draft, day.day_of_week, copyTargets))) { setCopyOpen(false); setNotice(`Copied to ${copyTargets.map(dayLabel).join(", ")}. Use Save periods to save your changes.`); }
  }}>Copy schedule</button></>;
  const typeActions = typeEdit ? <><button type="button" className={button} onClick={() => { setTypeEdit(null); setTypeError(""); }}>Cancel</button><button type="submit" form="school-period-type-form" className={`${button} !bg-[#174EA6] !text-white`}>Save type</button></> : <><button type="button" className={button} onClick={() => setManageTypes(false)}>Cancel</button><button type="button" disabled={disabled} className={`${button} !bg-[#174EA6] !text-white`} onClick={() => {
    if (change(() => ({ ...draft, period_types: typeDrafts, days: draft.days.map((item) => ({ ...item, periods: numberPeriods(item.periods, typeDrafts) })) }))) setManageTypes(false);
  }}>Done</button></>;

  return <fieldset disabled={disabled} className="min-w-0 space-y-5 disabled:opacity-70">
    <div className="flex flex-wrap items-end gap-4 rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
      <label className="grid w-40 gap-2 text-sm font-bold text-[#071D49]">School starts at
        <TimeField label="School starts at" value={start} onCommit={(value) => change(() => ({ ...draft, school_starts_at: value, days: draft.days.map((item) => startDayAt(item, value)) }))} />
      </label>
      <div className="min-w-0 flex-1"><p className="text-sm font-bold text-[#071D49]">Period types</p><p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-[#475569]">{types.slice(0, 4).map((type) => <span key={type.id}>{type.name} <strong>{type.default_duration_minutes} min</strong></span>)}</p></div>
      <button type="button" className={button} onClick={() => { setTypeDrafts(structuredClone(types)); setTypeEdit(null); setTypeError(""); setManageTypes(true); }}>Manage period types</button>
    </div>
    {error ? <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</p> : null}
    {notice ? <p role="status" className="rounded-lg bg-blue-50 p-3 text-sm text-blue-900">{notice}</p> : null}
    <div className="flex flex-wrap gap-2" aria-label="School days">
      {[...draft.days].sort((a, b) => a.day_of_week - b.day_of_week).map((item) => <button type="button" key={item.day_of_week} aria-pressed={day === item} onClick={() => { setSelectedDay(item.day_of_week); setInsertAt(null); }} className={`${button} ${day === item ? "!border-[#174EA6] !bg-[#174EA6] !text-white" : ""}`}>{dayLabel(item.day_of_week)}{item.periods.length ? <span className="text-xs opacity-75">{item.periods.length}</span> : null}</button>)}
      {draft.days.length < 7 ? <select aria-label="Add day" value="" className={`${field} !w-auto`} onChange={(event) => {
        const value = Number(event.target.value);
        if (change(() => ({ ...draft, days: [...draft.days, { day_of_week: value, name: dayLabel(value), is_teaching_day: true, periods: [] }] }))) setSelectedDay(value);
      }}><option value="">+ Add day</option>{TIMETABLE_DAYS.filter((option) => !draft.days.some((item) => item.day_of_week === option.value)).map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}</select> : null}
    </div>
    {day ? <div className="space-y-4" aria-label={`${dayLabel(day.day_of_week)} schedule`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h4 className="font-bold text-[#071D49]">{dayLabel(day.day_of_week)}</h4><p className="text-sm text-[#64748B]">{day.periods.length ? `${day.periods.length} periods · ${timeLabel(day.periods[0].starts_at)} – ${timeLabel(day.periods[day.periods.length - 1].ends_at)}` : "Click what happens next. Times are calculated for you."}</p></div>
        <details className="text-sm"><summary className="cursor-pointer py-3 font-semibold text-[#174EA6]">Day options</summary><div className="flex flex-wrap items-center gap-3 py-2">
          <label className="flex min-h-11 items-center gap-2"><input type="checkbox" checked={day.is_teaching_day} onChange={(event) => changeDay((item) => ({ ...item, is_teaching_day: event.target.checked }))} /> Teaching day</label>
          <button className={`${button} !text-rose-700`} type="button" onClick={() => change(() => {
            if (draft.common_blocks.some((block) => block.day_of_week === day.day_of_week)) throw new Error("Move or remove this day's common timetable blocks before removing the day.");
            return { ...draft, days: draft.days.filter((item) => item !== day) };
          })}><Trash2 className="h-4 w-4" /> Remove day</button>
        </div></details>
      </div>
      {!day.is_teaching_day ? <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">This is a non-teaching day. Its periods are excluded from lesson generation.</p> : null}
      <TypeButtons types={types} onAdd={(type) => add(type)} />
      {!day.periods.length ? <div className="rounded-xl border border-dashed border-[#C8D5EA] p-6 text-sm text-[#64748B]">No periods yet. Click <strong>+ Lesson</strong> to start at {timeLabel(start)}, then add the next lesson or break.</div> : <ol className="space-y-2">
        {day.periods.map((period, index) => <li key={period.id} className="rounded-xl border border-[#D8E0EC] bg-white p-3">
          <div className="grid grid-cols-2 items-center gap-3 sm:grid-cols-[minmax(90px,1fr)_minmax(110px,1fr)_minmax(110px,1fr)] xl:grid-cols-[minmax(90px,1fr)_140px_140px_minmax(140px,1fr)_auto]">
            <div className="col-span-2 sm:col-span-1"><p className="font-bold text-[#071D49]">{period.name}</p><p className="text-xs text-[#64748B]">{types.find((type) => type.id === period.period_type)?.name}</p></div>
            <label className="grid gap-1 text-xs font-semibold text-[#64748B]">Start<TimeField label={`${period.name} start`} value={period.starts_at} onCommit={(value) => changeDay((item) => editPeriodTime(item, index, "starts_at", value, types))} /></label>
            <label className="grid gap-1 text-xs font-semibold text-[#64748B]">End<TimeField label={`${period.name} end`} value={period.ends_at} onCommit={(value) => changeDay((item) => editPeriodTime(item, index, "ends_at", value, types))} /></label>
            <label className="grid gap-1 text-xs font-semibold text-[#64748B]">Type<select aria-label={`${period.name} type`} className={field} value={period.period_type} onChange={(event) => changeDay((item) => changePeriodType(item, index, types.find((type) => type.id === event.target.value)!, types))}>{types.map((type) => <option value={type.id} key={type.id}>{type.name}</option>)}</select></label>
            <details className="self-end text-sm sm:col-span-2 xl:col-span-1"><summary className="cursor-pointer rounded-lg px-3 py-3 font-semibold text-[#174EA6]">Edit</summary><div className="flex flex-wrap gap-2 py-2">
              <button type="button" className={button} onClick={() => setInsertAt(index)}>Insert before</button>
              <button type="button" className={button} onClick={() => setInsertAt(index + 1)}>Insert after</button>
              <button type="button" aria-label={`Move ${period.name} up`} disabled={index === 0} className={button} onClick={() => changeDay((item) => movePeriod(item, index, index - 1, types))}><ArrowUp className="h-4 w-4" /></button>
              <button type="button" aria-label={`Move ${period.name} down`} disabled={index === day.periods.length - 1} className={button} onClick={() => changeDay((item) => movePeriod(item, index, index + 1, types))}><ArrowDown className="h-4 w-4" /></button>
              <button type="button" aria-label={`Remove ${period.name}`} className={`${button} !text-rose-700`} onClick={() => deletePeriod(index)}><Trash2 className="h-4 w-4" /> Remove</button>
            </div></details>
          </div>
        </li>)}
      </ol>}
      {day.periods.length > 0 ? <><TypeButtons types={types} onAdd={(type) => add(type)} /><p className="text-xs text-[#64748B]">Changing a time moves the following periods automatically.</p><button type="button" className={button} onClick={openCopy}><Copy className="h-4 w-4" /> Copy {dayLabel(day.day_of_week)} to…</button></> : null}
    </div> : <p className="rounded-xl border border-dashed p-6 text-sm">No school days are configured. Choose <strong>+ Add day</strong> to start building your school day.</p>}

    <Modal open={insertAt !== null} title="Insert a period" description="Choose what happens here. Following periods move automatically." onClose={() => setInsertAt(null)}>
      <div className="py-4"><TypeButtons types={types} onAdd={(type) => add(type, insertAt ?? 0)} /></div>
    </Modal>
    <Modal open={copyOpen} title={`Copy ${day ? dayLabel(day.day_of_week) : "schedule"} to…`} onClose={() => setCopyOpen(false)} footer={copyActions}>
      <div className="space-y-4 py-4"><p className="text-sm text-[#475569]">Copy all periods and your time changes. Selected days will be replaced; each day stays independently editable.</p>
        <div className="grid gap-2 sm:grid-cols-2">{TIMETABLE_DAYS.filter((option) => option.value !== day?.day_of_week).map((option) => <label key={option.value} className="flex min-h-11 items-center gap-3 rounded-lg border p-3 text-sm font-semibold"><input type="checkbox" checked={copyTargets.includes(option.value)} onChange={(event) => setCopyTargets((current) => event.target.checked ? [...current, option.value] : current.filter((value) => value !== option.value))} />{option.label}</label>)}</div>
        {error ? <p role="alert" className="text-sm text-rose-700">{error}</p> : null}
      </div>
    </Modal>
    <Modal open={manageTypes} title="Manage period types" description="Set normal durations once. Existing times stay as they are; new periods use these defaults." onClose={() => setManageTypes(false)} footer={typeActions}>
      <div className="space-y-4 py-4">
        {typeEdit ? <form id="school-period-type-form" className="space-y-3" onSubmit={applyTypeEdit}>
          <label className="grid gap-1 text-sm font-semibold">Name<input autoFocus required maxLength={100} className={field} value={typeEdit.name} onChange={(event) => setTypeEdit({ ...typeEdit, name: event.target.value })} /></label>
          <label className="grid gap-1 text-sm font-semibold">Duration (minutes)<input type="number" required min={1} max={360} className={field} value={typeEdit.default_duration_minutes || ""} onChange={(event) => setTypeEdit({ ...typeEdit, default_duration_minutes: Number(event.target.value) })} /></label>
          <label className="grid gap-1 text-sm font-semibold">Teaching or non-teaching<select className={field} value={String(typeEdit.is_teaching)} onChange={(event) => setTypeEdit({ ...typeEdit, is_teaching: event.target.value === "true" })}><option value="true">Teaching</option><option value="false">Non-teaching</option></select></label>
          {typeError ? <p role="alert" className="text-sm text-rose-700">{typeError}</p> : null}
        </form> : <>
          <ul className="divide-y">{typeDrafts.map((type) => <li key={type.id} className="flex items-center justify-between gap-3 py-2"><div className="min-w-0"><p className="break-words text-sm font-bold">{type.name}</p><p className="text-xs text-[#64748B]">{type.default_duration_minutes} min · {type.is_teaching ? "Teaching" : "Non-teaching"}</p></div><button type="button" aria-label={`Edit ${type.name}`} className={button} onClick={() => setTypeEdit({ ...type })}>Edit</button></li>)}</ul>
          <button type="button" className={button} disabled={typeDrafts.length >= 100} onClick={() => setTypeEdit({ id: crypto.randomUUID(), name: "", default_duration_minutes: 40, is_teaching: false })}><Plus className="h-4 w-4" /> Add period type</button>
          <p className="text-xs text-[#64748B]">Changes are saved with the school day when you click Save periods.</p>
        </>}
      </div>
    </Modal>
  </fieldset>;
}
