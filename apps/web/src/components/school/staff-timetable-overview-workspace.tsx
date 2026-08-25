"use client";

import {
  CalendarDays,
  Clock3,
  Download,
  MapPin,
  Printer,
  RefreshCw,
  Search,
  UsersRound,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { useSchoolQuery } from "@/lib/data/school-hooks";
import { useOptionalSchoolTenantId } from "@/lib/data/school-tenant-scope";
import { getDashboardApiBaseUrl } from "@/lib/dashboard/api-client";
import { openPrintDocument } from "@/lib/dashboard/export";

type TimetableView = "master" | "class" | "teacher" | "resource";

type TimetableVersion = {
  id: string;
  status?: string;
  revision_number?: number;
  published_at?: string | null;
};

type TimetableSlot = {
  id: string;
  class_name?: string;
  stream_name?: string | null;
  subject_name?: string;
  teacher_name?: string;
  resource_name?: string | null;
  room_name?: string | null;
  room_id?: string | null;
  day_of_week: number;
  starts_at: string;
  ends_at: string;
  status?: string;
};

type TimetableViewResponse = {
  view?: TimetableView;
  version?: TimetableVersion | null;
  items?: TimetableSlot[];
  slots?: TimetableSlot[];
  metrics?: Record<string, number>;
};

const DAYS = [
  { value: 0, label: "All days" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
  { value: 7, label: "Sunday" },
] as const;

function currentSchoolDay() {
  const day = new Date().getDay();
  return day === 0 ? 7 : day;
}

function dayLabel(day: number) {
  return DAYS.find((candidate) => candidate.value === Number(day))?.label ?? `Day ${day}`;
}

function timeValue(value?: string | null) {
  const match = String(value ?? "").match(/(\d{1,2}):(\d{2})/);
  if (!match) return Number.POSITIVE_INFINITY;
  return Number(match[1]) * 60 + Number(match[2]);
}

function timeLabel(value?: string | null) {
  const match = String(value ?? "").match(/\d{1,2}:\d{2}/);
  return match?.[0] ?? "--:--";
}

function slotClass(slot: TimetableSlot) {
  return [slot.class_name, slot.stream_name].filter(Boolean).join(" ") || "Class not named";
}

function roomLabel(slot: TimetableSlot) {
  return slot.resource_name || slot.room_name || slot.room_id || "Usual classroom";
}

function extractFilename(header: string | null, fallback: string) {
  const match = header?.match(/filename\*?=(?:UTF-8''|\")?([^\";]+)/i);
  return match?.[1] ? decodeURIComponent(match[1].replace(/\"/g, "").trim()) : fallback;
}

export function StaffTimetableOverviewWorkspace({
  title = "School timetable",
  description = "Published lessons from the tenant-scoped timetable source of truth.",
  theme = "light",
}: {
  title?: string;
  description?: string;
  theme?: "light" | "dark";
}) {
  const tenantId = useOptionalSchoolTenantId();
  const [view, setView] = useState<TimetableView>("master");
  const [selectedDay, setSelectedDay] = useState(currentSchoolDay());
  const [search, setSearch] = useState("");
  const [exporting, setExporting] = useState(false);
  const query = new URLSearchParams({ view });
  if (selectedDay > 0) query.set("day_of_week", String(selectedDay));
  const path = `/api/timetable/views?${query.toString()}`;
  const timetable = useSchoolQuery<TimetableViewResponse | TimetableSlot[]>(path, {
    staleTime: 30_000,
  });

  const response = Array.isArray(timetable.data) ? null : timetable.data;
  const slots = useMemo(() => {
    const items = Array.isArray(timetable.data)
      ? timetable.data
      : response?.items ?? response?.slots ?? [];
    const needle = search.trim().toLowerCase();
    return [...items]
      .filter((slot) => selectedDay === 0 || Number(slot.day_of_week) === selectedDay)
      .filter((slot) => !needle || [
        slotClass(slot),
        slot.subject_name,
        slot.teacher_name,
        roomLabel(slot),
      ].some((value) => String(value ?? "").toLowerCase().includes(needle)))
      .sort((a, b) => Number(a.day_of_week) - Number(b.day_of_week) || timeValue(a.starts_at) - timeValue(b.starts_at));
  }, [response, search, selectedDay, timetable.data]);

  const todaySlots = useMemo(
    () => slots.filter((slot) => Number(slot.day_of_week) === currentSchoolDay()),
    [slots],
  );
  const now = new Date().getHours() * 60 + new Date().getMinutes();
  const currentLesson = todaySlots.find((slot) => timeValue(slot.starts_at) <= now && timeValue(slot.ends_at) > now);
  const nextLesson = todaySlots.find((slot) => timeValue(slot.starts_at) > now);
  const dark = theme === "dark";

  async function downloadCsv() {
    setExporting(true);
    try {
      if (!tenantId) {
        throw new Error("School context is unavailable. Sign in again before exporting the timetable.");
      }
      const exportQuery = new URLSearchParams({ view });
      if (selectedDay > 0) exportQuery.set("day_of_week", String(selectedDay));
      const response = await fetch(`${getDashboardApiBaseUrl(tenantId)}/timetable/export/csv?${exportQuery.toString()}`, {
        method: "GET",
        credentials: "include",
        cache: "no-store",
        headers: { "x-tenant-id": tenantId },
      });
      if (!response.ok) {
        throw new Error(`Timetable export failed (${response.status}).`);
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = extractFilename(
        response.headers.get("content-disposition"),
        `school-timetable-${new Date().toISOString().slice(0, 10)}.csv`,
      );
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      toast.success("Timetable CSV downloaded");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Timetable export failed.");
    } finally {
      setExporting(false);
    }
  }

  function printTimetable() {
    openPrintDocument({
      eyebrow: "Published timetable",
      title,
      subtitle: `${dayLabel(selectedDay)} · ${response?.version ? `Revision ${response.version.revision_number ?? 1}` : "Current published version"} · Generated ${new Date().toLocaleString("en-KE")}`,
      rows: slots.map((slot) => ({
        label: `${dayLabel(slot.day_of_week)} ${timeLabel(slot.starts_at)}–${timeLabel(slot.ends_at)} · ${slotClass(slot)}`,
        value: `${slot.subject_name || "Subject not named"} · ${slot.teacher_name || "Teacher not assigned"} · ${roomLabel(slot)}`,
      })),
      footer: "Generated from the current tenant-scoped published timetable. Use the print dialog to print or save as PDF.",
    });
  }

  const panel = dark ? "border-white/10 bg-white/5 text-white" : "border-slate-200 bg-white text-slate-950";
  const muted = dark ? "text-white/65" : "text-slate-600";
  const input = dark
    ? "border-white/15 bg-white/10 text-white placeholder:text-white/45"
    : "border-slate-200 bg-white text-slate-900 placeholder:text-slate-400";

  return (
    <section aria-label={`${title} workspace`} className="space-y-4">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <p className={dark ? "text-xs font-black uppercase tracking-[0.14em] text-cyan-200" : "text-xs font-black uppercase tracking-[0.14em] text-blue-700"}>
            Published timetable
          </p>
          <h2 className={dark ? "mt-1 text-2xl font-black text-white" : "mt-1 text-2xl font-black text-slate-950"}>{title}</h2>
          <p className={`mt-1 max-w-3xl text-sm font-semibold ${muted}`}>{description}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => timetable.refetch()} disabled={timetable.isFetching} className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-black ${panel} disabled:opacity-60`}>
            <RefreshCw className={`h-4 w-4 ${timetable.isFetching ? "animate-spin" : ""}`} /> Refresh
          </button>
          <button type="button" onClick={downloadCsv} disabled={exporting || slots.length === 0} className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-black ${panel} disabled:opacity-50`}>
            <Download className="h-4 w-4" /> {exporting ? "Preparing..." : "CSV"}
          </button>
          <button type="button" onClick={printTimetable} disabled={slots.length === 0} className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-black ${panel} disabled:opacity-50`}>
            <Printer className="h-4 w-4" /> Print / Save PDF
          </button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard dark={dark} label="Published lessons" value={String(response?.metrics?.total_slots ?? slots.length)} helper={response?.version ? `Revision ${response.version.revision_number ?? 1}` : "Current published view"} />
        <SummaryCard dark={dark} label="Today" value={String(todaySlots.length)} helper={dayLabel(currentSchoolDay())} />
        <SummaryCard dark={dark} label="Current lesson" value={currentLesson?.subject_name ?? "None now"} helper={currentLesson ? `${slotClass(currentLesson)} · ${timeLabel(currentLesson.ends_at)} end` : "No lesson is active"} />
        <SummaryCard dark={dark} label="Next lesson" value={nextLesson?.subject_name ?? "No later lesson"} helper={nextLesson ? `${slotClass(nextLesson)} · ${timeLabel(nextLesson.starts_at)}` : "Today is complete"} />
      </div>

      <div className={`rounded-2xl border p-3 ${panel}`}>
        <div className="grid gap-3 md:grid-cols-[160px_190px_minmax(0,1fr)]">
          <label className="space-y-1 text-xs font-black uppercase tracking-wide">
            View
            <select value={view} onChange={(event) => setView(event.target.value as TimetableView)} className={`block w-full rounded-xl border px-3 py-2 text-sm font-bold normal-case ${input}`}>
              <option value="master">Master view</option>
              <option value="class">Class view</option>
              <option value="teacher">Teacher view</option>
              <option value="resource">Room / resource view</option>
            </select>
          </label>
          <label className="space-y-1 text-xs font-black uppercase tracking-wide">
            Day
            <select value={selectedDay} onChange={(event) => setSelectedDay(Number(event.target.value))} className={`block w-full rounded-xl border px-3 py-2 text-sm font-bold normal-case ${input}`}>
              {DAYS.map((day) => <option key={day.value} value={day.value}>{day.label}</option>)}
            </select>
          </label>
          <label className="space-y-1 text-xs font-black uppercase tracking-wide">
            Search timetable
            <span className="relative block">
              <Search className={`absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 ${muted}`} />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Class, subject, teacher or room" className={`w-full rounded-xl border py-2 pl-9 pr-3 text-sm font-semibold normal-case ${input}`} />
            </span>
          </label>
        </div>
      </div>

      {timetable.isLoading ? (
        <div className={`rounded-2xl border p-8 text-center ${panel}`} role="status">
          <RefreshCw className="mx-auto h-6 w-6 animate-spin" />
          <p className="mt-3 font-black">Loading the published timetable...</p>
        </div>
      ) : timetable.isError ? (
        <div className={`rounded-2xl border p-6 ${dark ? "border-rose-300/30 bg-rose-300/10 text-rose-50" : "border-rose-200 bg-rose-50 text-rose-950"}`} role="alert">
          <p className="font-black">The timetable could not be loaded.</p>
          <p className="mt-1 text-sm font-semibold">{timetable.error.message}</p>
          <button type="button" onClick={() => timetable.refetch()} className="mt-3 rounded-xl border border-current px-3 py-2 text-sm font-black">Try again</button>
        </div>
      ) : slots.length === 0 ? (
        <div className={`rounded-2xl border p-8 text-center ${panel}`}>
          <CalendarDays className="mx-auto h-8 w-8" />
          <p className="mt-3 text-lg font-black">No published lessons match this view</p>
          <p className={`mx-auto mt-1 max-w-xl text-sm font-semibold ${muted}`}>
            Choose another day or clear the search. If the timetable has not been published, ask the Deputy Principal or Principal to complete readiness checks and publish the current term.
          </p>
        </div>
      ) : (
        <>
          <div className="grid gap-3 md:hidden">
            {slots.map((slot) => <SlotCard key={slot.id} slot={slot} dark={dark} />)}
          </div>
          <div className={`hidden overflow-x-auto rounded-2xl border md:block ${panel}`}>
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className={dark ? "bg-white/10 text-cyan-100" : "bg-slate-50 text-slate-700"}>
                <tr>
                  {['Day', 'Time', 'Class', 'Subject', 'Teacher', 'Room / resource'].map((heading) => <th key={heading} className="px-4 py-3 font-black">{heading}</th>)}
                </tr>
              </thead>
              <tbody>
                {slots.map((slot) => (
                  <tr key={slot.id} className={dark ? "border-t border-white/10" : "border-t border-slate-100"}>
                    <td className="px-4 py-3 font-bold">{dayLabel(slot.day_of_week)}</td>
                    <td className="whitespace-nowrap px-4 py-3">{timeLabel(slot.starts_at)}–{timeLabel(slot.ends_at)}</td>
                    <td className="px-4 py-3 font-bold">{slotClass(slot)}</td>
                    <td className="px-4 py-3">{slot.subject_name || "Subject not named"}</td>
                    <td className="px-4 py-3">{slot.teacher_name || "Teacher not assigned"}</td>
                    <td className="px-4 py-3">{roomLabel(slot)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}

function SummaryCard({ dark, label, value, helper }: { dark: boolean; label: string; value: string; helper: string }) {
  return (
    <div className={`rounded-2xl border p-4 ${dark ? "border-white/10 bg-white/5 text-white" : "border-slate-200 bg-white text-slate-950"}`}>
      <p className={dark ? "text-xs font-black uppercase tracking-wide text-cyan-100" : "text-xs font-black uppercase tracking-wide text-blue-700"}>{label}</p>
      <p className="mt-2 truncate text-xl font-black">{value}</p>
      <p className={dark ? "mt-1 truncate text-xs font-semibold text-white/60" : "mt-1 truncate text-xs font-semibold text-slate-500"}>{helper}</p>
    </div>
  );
}

function SlotCard({ slot, dark }: { slot: TimetableSlot; dark: boolean }) {
  return (
    <article className={`rounded-2xl border p-4 ${dark ? "border-white/10 bg-white/5 text-white" : "border-slate-200 bg-white text-slate-950"}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className={dark ? "text-xs font-black uppercase tracking-wide text-cyan-100" : "text-xs font-black uppercase tracking-wide text-blue-700"}>{dayLabel(slot.day_of_week)} · {timeLabel(slot.starts_at)}</p>
          <h3 className="mt-1 text-lg font-black">{slot.subject_name || "Subject not named"}</h3>
        </div>
        <span className={dark ? "rounded-full bg-white/10 px-2 py-1 text-xs font-black" : "rounded-full bg-blue-50 px-2 py-1 text-xs font-black text-blue-800"}>{slotClass(slot)}</span>
      </div>
      <div className={dark ? "mt-3 grid gap-2 text-sm font-semibold text-white/70" : "mt-3 grid gap-2 text-sm font-semibold text-slate-600"}>
        <p className="flex items-center gap-2"><Clock3 className="h-4 w-4" /> {timeLabel(slot.starts_at)}–{timeLabel(slot.ends_at)}</p>
        <p className="flex items-center gap-2"><UsersRound className="h-4 w-4" /> {slot.teacher_name || "Teacher not assigned"}</p>
        <p className="flex items-center gap-2"><MapPin className="h-4 w-4" /> {roomLabel(slot)}</p>
      </div>
    </article>
  );
}
