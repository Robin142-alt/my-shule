"use client";

import { ChevronLeft, ChevronRight, GripVertical, Lock, LockOpen, Move, Pencil, Trash2 } from "lucide-react";

import {
  type CandidateSlot,
  type TimetableConfiguration,
  type TimetableSlot,
  type TimetableView,
  currentSchoolDay,
  dayLabel,
  nextConfiguredDay,
  slotDisplayName,
  timeLabel,
} from "./timetable-types";

type TimetableScheduleViewProps = {
  rows: TimetableSlot[];
  view: TimetableView;
  configuration?: TimetableConfiguration | null;
  selectedDay: number;
  onSelectedDayChange: (day: number) => void;
  editable: boolean;
  onMove: (slot: TimetableSlot) => void;
  onMoveTo: (slot: TimetableSlot, destination: CandidateSlot) => void;
  onEdit: (slot: TimetableSlot) => void;
  onLock: (slot: TimetableSlot) => void;
  onRemove: (slot: TimetableSlot) => void;
};

function LessonCard({
  slot,
  view,
  editable,
  onMove,
  onEdit,
  onLock,
  onRemove,
  draggable = false,
}: {
  slot: TimetableSlot;
  view: TimetableView;
  editable: boolean;
  onMove: (slot: TimetableSlot) => void;
  onEdit: (slot: TimetableSlot) => void;
  onLock: (slot: TimetableSlot) => void;
  onRemove: (slot: TimetableSlot) => void;
  draggable?: boolean;
}) {
  return (
    <article
      draggable={draggable && editable && !slot.locked}
      onDragStart={(event) => event.dataTransfer.setData("application/x-myshule-timetable-slot", slot.id)}
      className={`min-w-0 rounded-xl border border-l-4 p-3 ${slot.locked ? "border-amber-300 bg-amber-50" : "border-[#C8D5EA] border-l-[#174EA6] bg-white"}`}
      data-slot-id={slot.id}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="break-words text-base font-bold leading-snug text-[#071D49] lg:text-sm">{slotDisplayName(slot, view)}</p>
          <p className="mt-1 text-xs font-bold text-[#47658F]">{timeLabel(slot.starts_at)}-{timeLabel(slot.ends_at)}{(slot.duration_periods ?? 1) > 1 ? ` - ${slot.duration_periods} periods` : ""}</p>
        </div>
        {draggable && editable && !slot.locked ? <GripVertical aria-hidden="true" className="h-5 w-5 shrink-0 text-[#8FA7C8]" /> : null}
      </div>
      <div className="mt-2 space-y-1 break-words text-sm leading-snug text-[#475569] lg:text-xs">
        {view !== "teacher" ? <p>{slot.teacher_name}</p> : null}
        {view !== "class" ? <p>{slot.class_name}{slot.stream_name ? ` - ${slot.stream_name}` : ""}</p> : null}
        {view === "class" && slot.stream_name ? <p>{slot.stream_name}</p> : null}
        {view !== "resource" && (slot.resource_name || slot.room_id) ? <p>{slot.resource_name || slot.room_id}</p> : null}
        {slot.parallel_key ? <p>Parallel group: {slot.parallel_key}</p> : null}
      </div>
      {slot.locked ? <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-amber-200 px-2 py-1 text-[11px] font-black uppercase text-amber-950"><Lock className="h-3 w-3" /> Locked</span> : null}
      {editable ? (
        <details className="mt-2 border-t border-[#E2E8F0] pt-1">
          <summary className="min-h-11 cursor-pointer content-center text-sm font-semibold text-[#174EA6]" aria-label={`Lesson actions for ${slot.subject_name}`}>Lesson actions</summary>
          <div className="grid grid-cols-2 gap-2 text-xs font-semibold">
            <button type="button" onClick={() => onMove(slot)} disabled={slot.locked} className="flex min-h-11 items-center justify-center gap-2 rounded-lg bg-blue-50 text-[#174EA6] disabled:opacity-40" aria-label={`Move ${slot.subject_name}`}><Move className="h-4 w-4" />Move</button>
            <button type="button" onClick={() => onEdit(slot)} disabled={slot.locked} className="flex min-h-11 items-center justify-center gap-2 rounded-lg bg-blue-50 text-[#174EA6] disabled:opacity-40" aria-label={`Edit ${slot.subject_name}`}><Pencil className="h-4 w-4" />Edit</button>
            <button type="button" onClick={() => onLock(slot)} className="flex min-h-11 items-center justify-center gap-2 rounded-lg border border-[#C8D5EA] text-[#174EA6]" aria-label={`${slot.locked ? "Unlock" : "Lock"} ${slot.subject_name}`}>{slot.locked ? <LockOpen className="h-4 w-4" /> : <Lock className="h-4 w-4" />}{slot.locked ? "Unlock" : "Lock"}</button>
            <button type="button" onClick={() => onRemove(slot)} disabled={slot.locked} className="flex min-h-11 items-center justify-center gap-2 rounded-lg border border-rose-200 text-rose-700 disabled:opacity-40" aria-label={`Remove ${slot.subject_name}`}><Trash2 className="h-4 w-4" />Remove</button>
          </div>
        </details>
      ) : null}
    </article>
  );
}

export function TimetableScheduleView({
  rows,
  view,
  configuration,
  selectedDay,
  onSelectedDayChange,
  editable,
  onMove,
  onMoveTo,
  onEdit,
  onLock,
  onRemove,
}: TimetableScheduleViewProps) {
  const configuredDays = (configuration?.days ?? [])
    .filter((day) => day.is_teaching_day)
    .sort((a, b) => a.day_of_week - b.day_of_week);
  const dayNumbers = configuredDays.length > 0
    ? configuredDays.map((day) => day.day_of_week)
    : [...new Set(rows.map((slot) => Number(slot.day_of_week)))].sort((a, b) => a - b);
  const effectiveDays = dayNumbers.length > 0 ? dayNumbers : [currentSchoolDay()];
  const activeDay = effectiveDays.includes(selectedDay) ? selectedDay : effectiveDays[0];
  const mobileRows = rows
    .filter((slot) => Number(slot.day_of_week) === activeDay)
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  const maxPeriods = Math.max(0, ...configuredDays.map((day) => day.periods.length));
  const activePeriods = [...(configuredDays.find((day) => day.day_of_week === activeDay)?.periods ?? [])].sort((a, b) => a.order_index - b.order_index);
  const unmatchedRows = activePeriods.length ? mobileRows.filter((slot) => !activePeriods.some((period) => timeLabel(slot.starts_at) === timeLabel(period.starts_at))) : [];
  const covering = (day: number, start: string, end: string) => rows.filter((slot) => Number(slot.day_of_week) === day && timeLabel(slot.starts_at) <= timeLabel(start) && timeLabel(slot.ends_at) >= timeLabel(end));
  const reservedBlock = (day: number, periodId: string) => (configuration?.common_blocks ?? []).find((block) => {
    if (block.day_of_week !== day) return false;
    const group = rows[0];
    const applies = block.target_scope === "school" || (group && (block.target_scope === "stream" ? block.target_ids.includes(group.stream_id ?? "") : block.target_ids.includes(group.class_section_id)));
    const periods = [...(configuredDays.find((item) => item.day_of_week === day)?.periods ?? [])].sort((a, b) => a.order_index - b.order_index);
    const start = periods.findIndex((period) => period.id === block.period_id);
    return applies && start >= 0 && periods.slice(start, start + block.duration_periods).some((period) => period.id === periodId);
  });

  const changeDay = (direction: -1 | 1) => onSelectedDayChange(nextConfiguredDay(activeDay, direction, effectiveDays));

  return (
    <div className="min-w-0" aria-label={`${view} timetable view`}>
      <div className="lg:hidden">
        <div className="mb-3 grid grid-cols-[44px_1fr_44px] items-center gap-2 rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-2">
          <button type="button" onClick={() => changeDay(-1)} className="grid min-h-11 place-items-center rounded-lg bg-white text-[#174EA6]" aria-label="Previous day"><ChevronLeft className="h-5 w-5" /></button>
          <label className="text-center text-xs font-black uppercase tracking-wide text-[#47658F]">
            Timetable day
            <select value={activeDay} onChange={(event) => onSelectedDayChange(Number(event.target.value))} className="mt-1 h-11 w-full rounded-lg border border-[#C8D5EA] bg-white px-3 text-center text-sm font-black normal-case tracking-normal text-[#071D49]">
              {effectiveDays.map((day) => <option key={day} value={day}>{dayLabel(day)}</option>)}
            </select>
          </label>
          <button type="button" onClick={() => changeDay(1)} className="grid min-h-11 place-items-center rounded-lg bg-white text-[#174EA6]" aria-label="Next day"><ChevronRight className="h-5 w-5" /></button>
        </div>
        <div className="mb-4 grid grid-flow-col auto-cols-fr gap-1" aria-label="Choose timetable day">{effectiveDays.map((day) => <button key={day} type="button" aria-pressed={day === activeDay} onClick={() => onSelectedDayChange(day)} className={`min-h-11 rounded-lg text-sm font-semibold ${day === activeDay ? "bg-[#071D49] text-white" : "bg-slate-100 text-slate-600"}`}>{dayLabel(day).slice(0, 3)}</button>)}</div>
        {activePeriods.length ? <ol className="space-y-3" aria-label={`${dayLabel(activeDay)} lesson timeline`}>{activePeriods.map((period) => {
          const lessons = covering(activeDay, period.starts_at, period.ends_at);
          const starting = lessons.filter((slot) => timeLabel(slot.starts_at) === timeLabel(period.starts_at));
          const block = reservedBlock(activeDay, period.id);
          if (lessons.length && !starting.length) return null;
          return <li key={period.id} className="min-w-0">
            <div className="mb-1.5 flex items-center justify-between gap-2 text-xs font-semibold text-slate-500"><span>{period.name}</span><span>{timeLabel(period.starts_at)}–{timeLabel(period.ends_at)}</span></div>
            {starting.length ? <div className="space-y-2">{starting.map((slot) => <LessonCard key={slot.id} slot={slot} view={view} editable={editable} onMove={onMove} onEdit={onEdit} onLock={onLock} onRemove={onRemove} />)}</div>
              : !period.is_teaching || block ? <div className="rounded-xl bg-slate-100 px-4 py-3 text-sm font-medium text-slate-600">{block?.name ?? period.name}</div>
                : <div className={`rounded-xl border border-dashed p-4 text-sm ${view === "class" ? "border-amber-300 bg-amber-50 text-amber-900" : "border-slate-200 text-slate-500"}`}>{view === "class" ? "Needs a lesson — regenerate to fill the week." : "No lesson in this period"}</div>}
          </li>;
        })}</ol> : mobileRows.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[#C8D5EA] bg-[#F8FAFC] p-8 text-center">
            <p className="font-black text-[#071D49]">No lessons on {dayLabel(activeDay)}</p>
            <p className="mt-1 text-sm text-[#64748B]">Choose another day or place an unscheduled requirement.</p>
          </div>
        ) : <div className="space-y-3">{mobileRows.map((slot) => <LessonCard key={slot.id} slot={slot} view={view} editable={editable} onMove={onMove} onEdit={onEdit} onLock={onLock} onRemove={onRemove} />)}</div>}
        {unmatchedRows.length ? <section className="mt-4 space-y-3 rounded-xl border border-amber-300 p-3"><p className="text-sm font-semibold text-amber-900">These saved lessons use earlier school times. Review or regenerate them.</p>{unmatchedRows.map((slot) => <LessonCard key={slot.id} slot={slot} view={view} editable={editable} onMove={onMove} onEdit={onEdit} onLock={onLock} onRemove={onRemove} />)}</section> : null}
      </div>

      <div className="hidden overflow-x-auto rounded-xl border border-[#D8E0EC] lg:block">
        {configuredDays.length === 0 ? (
          <div className="p-8 text-center text-sm font-bold text-amber-800">Configure school days and periods to display the weekly grid.</div>
        ) : (
          <table className="w-full min-w-[980px] table-fixed border-collapse text-left text-sm">
            <thead className="bg-[#071D49] text-white">
              <tr><th className="w-24 px-3 py-3">Period</th>{configuredDays.map((day) => <th key={day.day_of_week} className="border-l border-white/20 px-3 py-3">{day.name || dayLabel(day.day_of_week)}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-[#D8E0EC] bg-[#F8FAFC]">
              {Array.from({ length: maxPeriods }, (_, periodIndex) => (
                <tr key={periodIndex}>
                  <th className="align-top px-3 py-3 text-xs font-black text-[#47658F]">Period {periodIndex + 1}</th>
                  {configuredDays.map((day) => {
                    const period = [...day.periods].sort((a, b) => a.order_index - b.order_index)[periodIndex];
                    const cellRows = period ? rows.filter((slot) => Number(slot.day_of_week) === day.day_of_week && (slot.period_id === period.id || (!slot.period_id && slot.starts_at.slice(0, 5) === period.starts_at.slice(0, 5)))) : [];
                    const continuation = period ? covering(day.day_of_week, period.starts_at, period.ends_at).filter((slot) => !cellRows.includes(slot)) : [];
                    const block = period ? reservedBlock(day.day_of_week, period.id) : undefined;
                    return (
                      <td
                        key={`${day.day_of_week}-${period?.id ?? periodIndex}`}
                        onDragOver={(event) => { if (editable && period?.is_teaching) event.preventDefault(); }}
                        onDrop={(event) => {
                          event.preventDefault();
                          const slot = rows.find((candidate) => candidate.id === event.dataTransfer.getData("application/x-myshule-timetable-slot"));
                          if (slot && period?.is_teaching && !slot.locked) {
                            const target = cellRows.find((other) => other.id !== slot.id && !other.locked && !other.parallel_key && !slot.parallel_key
                              && other.class_section_id === slot.class_section_id && (other.stream_id ?? null) === (slot.stream_id ?? null)
                              && (other.duration_periods ?? 1) === (slot.duration_periods ?? 1));
                            onMoveTo(slot, { day_of_week: day.day_of_week, period_id: period.id, swap_slot_id: target?.id, state: "VALID", reasons: [] });
                          }
                        }}
                        className={`border-l border-[#D8E0EC] p-2 align-top ${period?.is_teaching ? "bg-white" : "bg-slate-100"}`}
                      >
                        {!period ? null : !period.is_teaching || block ? (
                          <div className="rounded-lg border border-dashed border-[#C8D5EA] p-3 text-center text-xs font-black uppercase text-[#64748B]">{block?.name ?? period.name}<br /><span className="font-medium normal-case">{timeLabel(period.starts_at)}-{timeLabel(period.ends_at)}</span></div>
                        ) : <div className="space-y-2">{continuation.length ? <div className="rounded-lg border-l-4 border-blue-300 bg-blue-50 p-3 text-xs text-blue-900">{continuation.map((slot) => <p key={slot.id}>{slot.subject_name} · continues until {timeLabel(slot.ends_at)}</p>)}</div> : null}{cellRows.length === 0 && continuation.length === 0 ? (
                          <div className="rounded-lg border border-dashed border-amber-200 p-3 text-xs text-amber-800">{period.name}<br />{timeLabel(period.starts_at)} · {view === "class" ? "Needs a lesson" : "No lesson"}</div>
                        ) : null}{cellRows.map((slot) => <LessonCard key={slot.id} slot={slot} view={view} editable={editable} draggable onMove={onMove} onEdit={onEdit} onLock={onLock} onRemove={onRemove} />)}</div>}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
