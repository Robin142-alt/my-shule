"use client";

import { useState } from "react";
import { CalendarDays, MapPin, RefreshCw } from "lucide-react";

import { Panel } from "../shared";
import { useClassTeacherTimetable, useResolvedClassTeacherStreamId } from "@/lib/data/class-teacher-hooks";

type CanonicalSlot = {
  id?: string;
  slot_id?: string;
  day_of_week?: number;
  dayName?: string;
  starts_at?: string;
  ends_at?: string;
  time?: string;
  subject_name?: string;
  subject?: string;
  teacher_name?: string;
  teacher?: string;
  room_name?: string;
  resource_name?: string;
  room_id?: string;
  room?: string;
};

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export function TimetableWorkspace() {
  const jsDay = new Date().getDay();
  const [selectedDay, setSelectedDay] = useState(DAYS[(jsDay === 0 ? 7 : jsDay) - 1]);
  const { streamId } = useResolvedClassTeacherStreamId();
  const { data, isLoading, error, refetch, isFetching } = useClassTeacherTimetable(streamId);
  const slots = (Array.isArray(data) ? data : []) as CanonicalSlot[];
  const rows = slots.map((slot, index) => {
    const day = slot.dayName || DAYS[Number(slot.day_of_week ?? 0) - 1] || "Day not recorded";
    return {
      id: slot.id || slot.slot_id || `${day}-${slot.starts_at || index}`,
      day,
      time: slot.time || `${slot.starts_at?.slice(0, 5) || "--:--"}–${slot.ends_at?.slice(0, 5) || "--:--"}`,
      subject: slot.subject_name || slot.subject || "School activity",
      teacher: slot.teacher_name || slot.teacher || "Teacher not recorded",
      room: slot.resource_name || slot.room_name || slot.room_id || slot.room || "General classroom",
    };
  });
  const dayRows = rows.filter((row) => row.day === selectedDay);

  return (
    <Panel title="Class Timetable" description="The published daily schedule for your assigned class." icon={CalendarDays}>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <label className="text-sm font-bold text-[#071D49]">
          Day
          <select value={selectedDay} onChange={(event) => setSelectedDay(event.target.value)} className="mt-1 block h-11 rounded-lg border border-[#D8E0EC] bg-white px-3">
            {DAYS.map((day) => <option key={day}>{day}</option>)}
          </select>
        </label>
        <button type="button" onClick={() => refetch()} disabled={isFetching} className="inline-flex h-11 items-center gap-2 rounded-lg border border-[#D8E0EC] bg-white px-4 text-sm font-bold text-[#071D49] disabled:opacity-50">
          <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-3 py-4" aria-label="Loading class timetable">
          {[0, 1, 2].map((item) => <div key={item} className="h-20 animate-pulse rounded-xl bg-[#F8FAFC]" />)}
        </div>
      ) : error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-700">
          <p className="font-bold">The class timetable could not be loaded.</p>
          <button type="button" onClick={() => refetch()} className="mt-2 text-sm font-bold underline">Retry</button>
        </div>
      ) : dayRows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[#D8E0EC] bg-[#F8FAFC] p-8 text-center">
          <p className="font-bold text-[#071D49]">No published lessons for {selectedDay}</p>
          <p className="mt-1 text-sm text-[#64748B]">The timetable office must publish this class schedule before it appears here.</p>
        </div>
      ) : (
        <>
          <div className="space-y-3 md:hidden">
            {dayRows.map((row) => (
              <article key={row.id} className="rounded-xl border border-[#D8E0EC] bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div><p className="font-black text-[#071D49]">{row.subject}</p><p className="mt-1 text-sm text-[#64748B]">{row.teacher}</p></div>
                  <span className="rounded-full bg-[#EEF4FF] px-2.5 py-1 text-xs font-black text-[#174EA6]">{row.time}</span>
                </div>
                <p className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-[#64748B]"><MapPin className="h-3.5 w-3.5" /> {row.room}</p>
              </article>
            ))}
          </div>
          <div className="hidden overflow-hidden rounded-xl border border-[#D8E0EC] md:block">
            <table className="w-full text-left text-sm text-[#071D49]">
              <thead className="bg-[#F8FAFC]"><tr><th className="p-3 font-semibold">Time</th><th className="p-3 font-semibold">Subject</th><th className="p-3 font-semibold">Teacher</th><th className="p-3 font-semibold">Room</th></tr></thead>
              <tbody className="divide-y divide-[#D8E0EC]">
                {dayRows.map((row) => <tr key={row.id}><td className="p-3">{row.time}</td><td className="p-3 font-bold">{row.subject}</td><td className="p-3">{row.teacher}</td><td className="p-3">{row.room}</td></tr>)}
              </tbody>
            </table>
          </div>
        </>
      )}
    </Panel>
  );
}
