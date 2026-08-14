"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, CalendarDays, CheckCircle2, RefreshCw, UserRoundSearch } from "lucide-react";
import { toast } from "sonner";

import { Modal } from "@/components/ui/modal";
import { useSchoolMutation, useSchoolQuery } from "@/lib/data/school-hooks";
import {
  type OfflineAware,
  type Teacher,
  type TimetableSlot,
  dayLabel,
  isOfflineQueued,
  rowsFrom,
  teacherId,
  teacherLabel,
  timeLabel,
} from "./timetable-types";

type ReliefLesson = Omit<TimetableSlot, "id" | "teacher_id" | "teacher_name" | "row_version"> & {
  slot_id: string;
  absent_teacher_id: string;
  relief_status?: "needed" | "assigned" | "covered" | string;
  relief_id?: string | null;
  relief_row_version?: number | null;
  substitute_teacher_id?: string | null;
  substitute_teacher_name?: string | null;
};

type AffectedResponse = {
  date: string;
  absent_teacher?: { teacher_id: string; teacher_name: string } | null;
  lessons: ReliefLesson[];
};

type ReliefCandidate = {
  teacher_id: string;
  teacher_name: string;
  score: number;
  reasons: string[];
  daily_load: number;
  weekly_load: number;
  subject_qualified: boolean;
};

type CandidateResponse = { items: ReliefCandidate[] };
type ReliefAssignmentResponse = {
  assignment: {
    id: string;
    slot_id: string;
    relief_date: string;
    absent_teacher_id: string;
    substitute_teacher_id: string;
    status: "assigned" | string;
  };
  notification?: { status?: string; message?: string } | null;
};

function todayForSchool() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

export function DeputyTimetableReliefWorkspace({ academicYear, termName }: { academicYear?: string; termName?: string }) {
  const [date, setDate] = useState(todayForSchool);
  const [absentTeacherId, setAbsentTeacherId] = useState("");
  const [selectedLesson, setSelectedLesson] = useState<ReliefLesson | null>(null);
  const [substituteTeacherId, setSubstituteTeacherId] = useState("");
  const [reason, setReason] = useState("");

  const teachersQuery = useSchoolQuery<Teacher[]>("/api/academics/teachers");
  const teachers = rowsFrom(teachersQuery.data);
  useEffect(() => {
    if (!absentTeacherId && teachers[0]) setAbsentTeacherId(teacherId(teachers[0]));
  }, [absentTeacherId, teachers]);

  const affectedPath = absentTeacherId && date
    ? `/api/timetable/relief/affected?absent_teacher_id=${encodeURIComponent(absentTeacherId)}&date=${encodeURIComponent(date)}`
    : null;
  const affectedQuery = useSchoolQuery<AffectedResponse>(affectedPath);
  const candidatesPath = selectedLesson
    ? `/api/timetable/relief/candidates?slot_id=${encodeURIComponent(selectedLesson.slot_id)}&date=${encodeURIComponent(date)}`
    : null;
  const candidatesQuery = useSchoolQuery<CandidateResponse>(candidatesPath);
  const candidates = candidatesQuery.data?.items ?? [];

  useEffect(() => {
    setSubstituteTeacherId(candidates[0]?.teacher_id ?? "");
  }, [selectedLesson?.slot_id, candidates]);

  const assignMutation = useSchoolMutation<
    OfflineAware<ReliefAssignmentResponse>,
    { slot_id: string; relief_date: string; substitute_teacher_id: string; reason?: string; notify_teacher: boolean; idempotency_key: string }
  >("/api/timetable/relief/assign", "POST");

  const openAssignment = (lesson: ReliefLesson) => {
    setSelectedLesson(lesson);
    setSubstituteTeacherId("");
    setReason("");
  };

  const assign = async () => {
    if (!selectedLesson || !substituteTeacherId) {
      toast.error("Choose one of the available substitute teachers.");
      return;
    }
    try {
      const result = await assignMutation.mutateAsync({
        slot_id: selectedLesson.slot_id,
        relief_date: date,
        substitute_teacher_id: substituteTeacherId,
        reason: reason.trim() || undefined,
        notify_teacher: true,
        idempotency_key: `${selectedLesson.slot_id}:${date}:${substituteTeacherId}`,
      });
      if (isOfflineQueued(result)) {
        toast.warning("Relief assignment is saved on this device and queued for sync. Coverage is not confirmed yet.");
        return;
      }
      const candidate = candidates.find((row) => row.teacher_id === substituteTeacherId);
      toast.success(`${candidate?.teacher_name ?? "The substitute teacher"} is assigned. ${result.notification?.message ?? "The relief notification was created."}`);
      setSelectedLesson(null);
      await affectedQuery.refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Relief teacher could not be assigned.");
    }
  };

  const lessons = affectedQuery.data?.lessons ?? [];
  const needed = lessons.filter((lesson) => !lesson.relief_status || lesson.relief_status === "needed").length;

  return (
    <section className="space-y-4 rounded-xl border border-[#D8E0EC] bg-white p-4 text-[#071D49] sm:p-5" data-testid="deputy-timetable-relief-workspace">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.14em] text-[#47658F]">Daily operations</p>
          <h3 className="mt-1 text-xl font-black">Relief lessons</h3>
          <p className="mt-1 text-sm text-[#64748B]">Select an absent teacher and date, review their published lessons, then explicitly assign a ranked available substitute. The permanent timetable is never rewritten.</p>
        </div>
        <button type="button" onClick={() => affectedQuery.refetch()} disabled={!affectedPath || affectedQuery.isFetching} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-[#C8D5EA] bg-white px-4 text-sm font-black disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${affectedQuery.isFetching ? "animate-spin" : ""}`} /> Refresh</button>
      </div>

      <div className="grid gap-3 rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_auto] lg:items-end">
        <label className="text-sm font-black">Absent teacher
          <select aria-label="Absent teacher" value={absentTeacherId} onChange={(event) => { setAbsentTeacherId(event.target.value); setSelectedLesson(null); }} className="mt-1 h-11 w-full rounded-lg border border-[#C8D5EA] bg-white px-3">
            {teachers.length === 0 ? <option value="">No teachers available</option> : teachers.map((teacher) => <option key={teacherId(teacher)} value={teacherId(teacher)}>{teacherLabel(teacher)}</option>)}
          </select>
        </label>
        <label className="text-sm font-black">Absence date
          <input aria-label="Absence date" type="date" value={date} onChange={(event) => { setDate(event.target.value); setSelectedLesson(null); }} className="mt-1 h-11 w-full rounded-lg border border-[#C8D5EA] bg-white px-3" />
        </label>
        <div className="rounded-lg bg-white px-4 py-2 text-sm"><span className="font-black">{needed}</span> lesson{needed === 1 ? "" : "s"} need coverage</div>
      </div>

      {(teachersQuery.error || affectedQuery.error) ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-800">
          <p>Relief requirements could not be loaded. No coverage has been changed.</p>
          <button type="button" onClick={() => { teachersQuery.refetch(); affectedQuery.refetch(); }} className="mt-3 min-h-11 rounded-lg border border-rose-300 bg-white px-4">Retry</button>
        </div>
      ) : affectedQuery.isLoading || teachersQuery.isLoading ? (
        <div className="rounded-xl border border-[#D8E0EC] p-8 text-center text-sm font-bold text-[#64748B]">Loading the absent teacher&apos;s published lessons...</div>
      ) : !absentTeacherId ? (
        <div className="rounded-xl border border-dashed border-amber-300 bg-amber-50 p-8 text-center text-sm font-bold text-amber-900">No active teacher is available to select. Add staff and teaching allocations first.</div>
      ) : lessons.length === 0 ? (
        <div className="rounded-xl border border-dashed border-emerald-300 bg-emerald-50 p-8 text-center">
          <CheckCircle2 className="mx-auto h-7 w-7 text-emerald-700" />
          <p className="mt-2 font-black text-emerald-950">No affected published lessons</p>
          <p className="mt-1 text-sm text-emerald-800">This teacher has no published lessons on {date}. Try another date if the absence spans multiple days.</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {lessons.map((lesson) => {
            const assigned = lesson.relief_status === "assigned" || lesson.relief_status === "covered";
            return (
              <article key={lesson.slot_id} className="rounded-xl border border-[#D8E0EC] bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <div><p className="font-black">{lesson.subject_name}</p><p className="mt-1 text-sm text-[#64748B]">{lesson.class_name}{lesson.stream_name ? ` - ${lesson.stream_name}` : ""}</p></div>
                  <span className={`rounded-full px-2 py-1 text-[11px] font-black uppercase ${assigned ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"}`}>{assigned ? lesson.relief_status : "Needs relief"}</span>
                </div>
                <p className="mt-3 text-sm font-bold text-[#47658F]"><CalendarDays className="mr-1 inline h-4 w-4" /> {dayLabel(lesson.day_of_week)} - {timeLabel(lesson.starts_at)}-{timeLabel(lesson.ends_at)}</p>
                {assigned ? <p className="mt-3 rounded-lg bg-emerald-50 p-3 text-sm font-bold text-emerald-900">Assigned to {lesson.substitute_teacher_name || "a substitute teacher"}</p> : (
                  <button type="button" onClick={() => openAssignment(lesson)} className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#174EA6] px-4 text-sm font-black text-white"><UserRoundSearch className="h-4 w-4" /> View candidates & assign</button>
                )}
              </article>
            );
          })}
        </div>
      )}

      {academicYear && termName ? <p className="text-xs text-[#64748B]">Published schedule context: {academicYear} - {termName}</p> : null}

      <Modal open={Boolean(selectedLesson)} onClose={() => setSelectedLesson(null)} title="Assign relief teacher">
        <div className="space-y-4 py-3 text-[#071D49]">
          <p className="text-sm text-[#64748B]">Choose a ranked candidate for <strong>{selectedLesson?.subject_name}</strong>, {selectedLesson?.class_name}, {timeLabel(selectedLesson?.starts_at)}-{timeLabel(selectedLesson?.ends_at)}. Assignment is explicit; no teacher is auto-assigned.</p>
          {candidatesQuery.isLoading ? <div className="rounded-xl bg-[#F8FAFC] p-6 text-center text-sm font-bold text-[#64748B]">Checking availability, clashes, workload, and subject fit...</div> : null}
          {candidatesQuery.error ? <div className="flex gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-800"><AlertTriangle className="h-5 w-5 shrink-0" /><div><p>Candidate suggestions could not be loaded.</p><button type="button" onClick={() => candidatesQuery.refetch()} className="mt-2 rounded-lg border border-rose-300 bg-white px-3 py-2">Retry</button></div></div> : null}
          {!candidatesQuery.isLoading && !candidatesQuery.error && candidates.length === 0 ? <div className="rounded-xl border border-dashed border-amber-300 bg-amber-50 p-5 text-sm font-bold text-amber-900">No valid substitute is available for this lesson. Keep it visible and resolve the staffing conflict; the system will not invent an assignment.</div> : null}
          <div className="max-h-[45vh] space-y-2 overflow-y-auto">
            {candidates.map((candidate) => (
              <label key={candidate.teacher_id} className={`block cursor-pointer rounded-xl border p-3 ${substituteTeacherId === candidate.teacher_id ? "border-[#174EA6] bg-blue-50" : "border-[#D8E0EC] bg-white"}`}>
                <div className="flex items-start gap-3">
                  <input type="radio" name="substitute_teacher" value={candidate.teacher_id} checked={substituteTeacherId === candidate.teacher_id} onChange={() => setSubstituteTeacherId(candidate.teacher_id)} className="mt-1" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2"><span className="font-black">{candidate.teacher_name}</span><span className="rounded-full bg-[#071D49] px-2 py-1 text-xs font-black text-white">Score {candidate.score}</span></div>
                    <p className="mt-1 text-xs text-[#64748B]">Today: {candidate.daily_load} lessons - Week: {candidate.weekly_load} - {candidate.subject_qualified ? "Subject qualified" : "General cover"}</p>
                    {candidate.reasons.length > 0 ? <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-[#475569]">{candidate.reasons.map((candidateReason) => <li key={candidateReason}>{candidateReason}</li>)}</ul> : null}
                  </div>
                </div>
              </label>
            ))}
          </div>
          <label className="block text-sm font-black">Assignment note (optional)
            <textarea value={reason} onChange={(event) => setReason(event.target.value)} rows={2} maxLength={500} placeholder="Reason for absence or handover note" className="mt-1 w-full rounded-lg border border-[#C8D5EA] p-3" />
          </label>
          <div className="flex flex-col-reverse gap-2 border-t border-[#E2E8F0] pt-4 sm:flex-row sm:justify-end">
            <button type="button" onClick={() => setSelectedLesson(null)} className="min-h-11 rounded-lg border border-[#C8D5EA] px-4 font-bold">Cancel</button>
            <button type="button" onClick={assign} disabled={!substituteTeacherId || assignMutation.isPending} className="min-h-11 rounded-lg bg-[#174EA6] px-4 font-black text-white disabled:opacity-50">{assignMutation.isPending ? "Assigning..." : "Confirm relief assignment"}</button>
          </div>
        </div>
      </Modal>
    </section>
  );
}
