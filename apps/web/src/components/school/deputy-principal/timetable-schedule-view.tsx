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
      className={`rounded-xl border p-3 shadow-sm ${slot.locked ? "border-amber-300 bg-amber-50" : "border-[#C8D5EA] bg-white"}`}
      data-slot-id={slot.id}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-black text-[#071D49]">{slotDisplayName(slot, view)}</p>
          <p className="mt-1 text-xs font-bold text-[#47658F]">{timeLabel(slot.starts_at)}-{timeLabel(slot.ends_at)}{(slot.duration_periods ?? 1) > 1 ? ` - ${slot.duration_periods} periods` : ""}</p>
        </div>
        {draggable && editable && !slot.locked ? <GripVertical aria-hidden="true" className="h-5 w-5 shrink-0 text-[#8FA7C8]" /> : null}
      </div>
      <div className="mt-2 space-y-1 text-xs text-[#475569]">
        {view !== "teacher" ? <p>{slot.teacher_name}</p> : null}
        {view !== "class" ? <p>{slot.class_name}{slot.stream_name ? ` - ${slot.stream_name}` : ""}</p> : null}
        {view !== "resource" && (slot.resource_name || slot.room_id) ? <p>{slot.resource_name || slot.room_id}</p> : null}
        {slot.parallel_key ? <p>Parallel group: {slot.parallel_key}</p> : null}
      </div>
      {slot.locked ? <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-amber-200 px-2 py-1 text-[11px] font-black uppercase text-amber-950"><Lock className="h-3 w-3" /> Locked</span> : null}
      {editable ? (
        <div className="mt-3 grid grid-cols-4 gap-2 border-t border-[#E2E8F0] pt-3">
          <button type="button" onClick={() => onMove(slot)} disabled={slot.locked} className="grid min-h-11 place-items-center rounded-lg border border-[#C8D5EA] text-[#174EA6] disabled:opacity-40" aria-label={`Move ${slot.subject_name}`}><Move className="h-4 w-4" /></button>
          <button type="button" onClick={() => onEdit(slot)} disabled={slot.locked} className="grid min-h-11 place-items-center rounded-lg border border-[#C8D5EA] text-[#174EA6] disabled:opacity-40" aria-label={`Edit ${slot.subject_name}`}><Pencil className="h-4 w-4" /></button>
          <button type="button" onClick={() => onLock(slot)} className="grid min-h-11 place-items-center rounded-lg border border-[#C8D5EA] text-[#174EA6]" aria-label={`${slot.locked ? "Unlock" : "Lock"} ${slot.subject_name}`}>{slot.locked ? <LockOpen className="h-4 w-4" /> : <Lock className="h-4 w-4" />}</button>
          <button type="button" onClick={() => onRemove(slot)} disabled={slot.locked} className="grid min-h-11 place-items-center rounded-lg border border-rose-200 text-rose-700 disabled:opacity-40" aria-label={`Remove ${slot.subject_name}`}><Trash2 className="h-4 w-4" /></button>
        </div>
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

  const changeDay = (direction: -1 | 1) => onSelectedDayChange(nextConfiguredDay(activeDay, direction, effectiveDays));

  return (
    <div aria-label={`${view} timetable view`}>
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
        {mobileRows.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[#C8D5EA] bg-[#F8FAFC] p-8 text-center">
            <p className="font-black text-[#071D49]">No lessons on {dayLabel(activeDay)}</p>
            <p className="mt-1 text-sm text-[#64748B]">Choose another day or place an unscheduled requirement.</p>
          </div>
        ) : <div className="space-y-3">{mobileRows.map((slot) => <LessonCard key={slot.id} slot={slot} view={view} editable={editable} onMove={onMove} onEdit={onEdit} onLock={onLock} onRemove={onRemove} />)}</div>}
      </div>

      <div className="hidden overflow-x-auto rounded-xl border border-[#D8E0EC] lg:block">
        {configuredDays.length === 0 ? (
          <div className="p-8 text-center text-sm font-bold text-amber-800">Configure school days and periods to display the weekly grid.</div>
        ) : (
          <table className="w-full min-w-[980px] border-collapse text-left text-sm">
            <thead className="bg-[#071D49] text-white">
              <tr><th className="w-36 px-3 py-3">Period</th>{configuredDays.map((day) => <th key={day.day_of_week} className="min-w-44 border-l border-white/20 px-3 py-3">{day.name || dayLabel(day.day_of_week)}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-[#D8E0EC] bg-[#F8FAFC]">
              {Array.from({ length: maxPeriods }, (_, periodIndex) => (
                <tr key={periodIndex}>
                  <th className="align-top px-3 py-3 text-xs font-black text-[#47658F]">Period {periodIndex + 1}</th>
                  {configuredDays.map((day) => {
                    const period = [...day.periods].sort((a, b) => a.order_index - b.order_index)[periodIndex];
                    const cellRows = period ? rows.filter((slot) => Number(slot.day_of_week) === day.day_of_week && (slot.period_id === period.id || (!slot.period_id && slot.starts_at.slice(0, 5) === period.starts_at.slice(0, 5)))) : [];
                    return (
                      <td
                        key={`${day.day_of_week}-${period?.id ?? periodIndex}`}
                        onDragOver={(event) => { if (editable && period?.is_teaching) event.preventDefault(); }}
                        onDrop={(event) => {
                          event.preventDefault();
                          const slot = rows.find((candidate) => candidate.id === event.dataTransfer.getData("application/x-myshule-timetable-slot"));
                          if (slot && period?.is_teaching && !slot.locked) onMoveTo(slot, { day_of_week: day.day_of_week, period_id: period.id, state: "VALID", reasons: [] });
                        }}
                        className={`border-l border-[#D8E0EC] p-2 align-top ${period?.is_teaching ? "bg-white" : "bg-slate-100"}`}
                      >
                        {!period ? null : !period.is_teaching ? (
                          <div className="rounded-lg border border-dashed border-[#C8D5EA] p-3 text-center text-xs font-black uppercase text-[#64748B]">{period.name}<br /><span className="font-medium normal-case">{timeLabel(period.starts_at)}-{timeLabel(period.ends_at)}</span></div>
                        ) : cellRows.length === 0 ? (
                          <div className="min-h-20 rounded-lg border border-dashed border-[#D8E0EC] p-2 text-xs text-[#94A3B8]">{period.name}<br />{timeLabel(period.starts_at)}</div>
                        ) : <div className="space-y-2">{cellRows.map((slot) => <LessonCard key={slot.id} slot={slot} view={view} editable={editable} draggable onMove={onMove} onEdit={onEdit} onLock={onLock} onRemove={onRemove} />)}</div>}
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
