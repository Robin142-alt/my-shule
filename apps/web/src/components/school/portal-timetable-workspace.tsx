"use client";

import { useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, Clock3, MapPin, RefreshCw } from "lucide-react";

import { Card } from "@/components/ui/card";
import { useSchoolQuery } from "@/lib/data/school-hooks";

type PortalLearner = {
  id: string;
  name: string;
  class_name?: string | null;
  stream_name?: string | null;
};

type PortalTimetableSlot = {
  id?: string;
  slot_id?: string;
  day_of_week: number;
  starts_at: string;
  ends_at: string;
  subject_name?: string | null;
  subject?: string | null;
  teacher_name?: string | null;
  teacher?: string | null;
  class_name?: string | null;
  room_name?: string | null;
  resource_name?: string | null;
  room_id?: string | null;
  status?: "completed" | "current" | "next" | "upcoming" | string;
};

type PortalTimetableResponse = {
  active_student?: PortalLearner | null;
  students?: PortalLearner[];
  today?: PortalTimetableSlot[];
  tomorrow?: PortalTimetableSlot[];
  items?: PortalTimetableSlot[];
  slots?: PortalTimetableSlot[];
  current?: PortalTimetableSlot | null;
  next?: PortalTimetableSlot | null;
  current_lesson?: PortalTimetableSlot | null;
  next_lesson?: PortalTimetableSlot | null;
};

const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

function hhmm(value?: string | null) {
  return value?.slice(0, 5) || "Time not recorded";
}

function localIsoDay() {
  const jsDay = new Date().getDay();
  return jsDay === 0 ? 7 : jsDay;
}

function inferCurrentAndNext(rows: PortalTimetableSlot[]) {
  const now = new Date();
  const minutes = now.getHours() * 60 + now.getMinutes();
  const toMinutes = (value: string) => {
    const [hours, mins] = value.slice(0, 5).split(":").map(Number);
    return hours * 60 + mins;
  };
  const ordered = [...rows].sort((left, right) => left.starts_at.localeCompare(right.starts_at));
  return {
    current: ordered.find((slot) => toMinutes(slot.starts_at) <= minutes && toMinutes(slot.ends_at) > minutes) ?? null,
    next: ordered.find((slot) => toMinutes(slot.starts_at) > minutes) ?? null,
  };
}

export function PortalTimetableWorkspace() {
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [dayOffset, setDayOffset] = useState<0 | 1>(0);
  const path = `/api/timetable/portal${selectedStudentId ? `?student_id=${encodeURIComponent(selectedStudentId)}` : ""}`;
  const timetableQuery = useSchoolQuery<PortalTimetableResponse>(path, { retry: 1 });
  const data = timetableQuery.data;
  const todayIsoDay = localIsoDay();
  const allSlots = data?.items ?? data?.slots ?? [];
  const today = data?.today ?? allSlots.filter((slot) => Number(slot.day_of_week) === todayIsoDay);
  const tomorrowIsoDay = todayIsoDay === 7 ? 1 : todayIsoDay + 1;
  const tomorrow = data?.tomorrow ?? allSlots.filter((slot) => Number(slot.day_of_week) === tomorrowIsoDay);
  const inferred = useMemo(() => inferCurrentAndNext(today), [today]);
  const currentLesson = data?.current_lesson ?? data?.current ?? inferred.current;
  const nextLesson = data?.next_lesson ?? data?.next ?? inferred.next;
  const shownRows = dayOffset === 0 ? today : tomorrow;
  const shownDay = DAY_NAMES[(dayOffset === 0 ? todayIsoDay : tomorrowIsoDay) - 1];
  const activeStudentId = selectedStudentId || data?.active_student?.id || "";

  return (
    <div className="space-y-5" data-testid="portal-timetable-workspace">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900">Class Timetable</h2>
          <p className="mt-1 text-sm text-slate-500">
            Published lessons for {data?.active_student?.name || "the signed-in learner"}. Temporary relief cover is shown without changing the school timetable.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          {(data?.students?.length ?? 0) > 1 ? (
            <label className="text-sm font-semibold text-slate-700">
              Learner
              <select
                aria-label="Timetable learner"
                value={activeStudentId}
                onChange={(event) => setSelectedStudentId(event.target.value)}
                className="mt-1 block h-11 rounded-lg border border-slate-300 bg-white px-3"
              >
                {data?.students?.map((student) => (
                  <option key={student.id} value={student.id}>{student.name}</option>
                ))}
              </select>
            </label>
          ) : null}
          <button
            type="button"
            onClick={() => timetableQuery.refetch()}
            disabled={timetableQuery.isFetching}
            className="inline-flex h-11 items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-bold text-slate-800 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${timetableQuery.isFetching ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {timetableQuery.error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-800">
          The published timetable could not be loaded. No cached schedule is being shown. Check the connection and retry.
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <LessonSummary title="Happening now" slot={currentLesson} empty="No lesson is in progress." />
        <LessonSummary title="Coming next" slot={nextLesson} empty="No later lesson is scheduled today." />
      </div>

      <Card className="overflow-hidden border border-slate-200">
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 p-3">
          <button
            type="button"
            onClick={() => setDayOffset(0)}
            disabled={dayOffset === 0}
            className="inline-flex h-10 items-center gap-1 rounded-lg px-3 text-sm font-bold text-slate-700 disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" /> Today
          </button>
          <div className="text-center">
            <p className="font-bold text-slate-900">{shownDay}</p>
            <p className="text-xs text-slate-500">{dayOffset === 0 ? "Today" : "Tomorrow"}</p>
          </div>
          <button
            type="button"
            onClick={() => setDayOffset(1)}
            disabled={dayOffset === 1}
            className="inline-flex h-10 items-center gap-1 rounded-lg px-3 text-sm font-bold text-slate-700 disabled:opacity-40"
          >
            Tomorrow <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3 p-3 sm:p-4">
          {timetableQuery.isLoading ? (
            <div className="space-y-3" aria-label="Loading published timetable">
              {[0, 1, 2].map((item) => <div key={item} className="h-24 animate-pulse rounded-xl bg-slate-100" />)}
            </div>
          ) : shownRows.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center">
              <CalendarDays className="mx-auto h-8 w-8 text-slate-400" />
              <p className="mt-3 font-semibold text-slate-900">No published lessons for {shownDay}</p>
              <p className="mt-1 text-sm text-slate-500">The timetable office must publish the class schedule before lessons appear here.</p>
            </div>
          ) : shownRows.map((slot, index) => (
            <article key={slot.id ?? slot.slot_id ?? `${slot.day_of_week}-${slot.starts_at}-${index}`} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-bold text-slate-900">{slot.subject_name || slot.subject || "School activity"}</p>
                  <p className="mt-1 text-sm text-slate-600">{slot.teacher_name || slot.teacher || "Teacher not recorded"}</p>
                  {slot.class_name ? <p className="mt-1 text-xs text-slate-500">{slot.class_name}</p> : null}
                </div>
                <span className="shrink-0 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700">
                  {hhmm(slot.starts_at)}–{hhmm(slot.ends_at)}
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-3 text-xs font-medium text-slate-500">
                <span className="inline-flex items-center gap-1"><Clock3 className="h-3.5 w-3.5" /> Published lesson</span>
                <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {slot.resource_name || slot.room_name || slot.room_id || "General classroom"}</span>
              </div>
            </article>
          ))}
        </div>
      </Card>
    </div>
  );
}

function LessonSummary({ title, slot, empty }: { title: string; slot?: PortalTimetableSlot | null; empty: string }) {
  return (
    <Card className="border border-slate-200 p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{title}</p>
      {slot ? (
        <div className="mt-2">
          <p className="font-bold text-slate-900">{slot.subject_name || slot.subject || "School activity"}</p>
          <p className="mt-1 text-sm text-slate-600">{hhmm(slot.starts_at)}–{hhmm(slot.ends_at)} · {slot.teacher_name || slot.teacher || "Teacher not recorded"}</p>
        </div>
      ) : <p className="mt-2 text-sm text-slate-500">{empty}</p>}
    </Card>
  );
}
