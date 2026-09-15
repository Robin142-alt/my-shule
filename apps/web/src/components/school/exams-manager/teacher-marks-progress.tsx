"use client";

import { useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, Lock, RefreshCw, Search } from "lucide-react";
import { toast } from "sonner";
import { useSchoolQuery } from "@/lib/data/school-hooks";
import { lockMarksEntry } from "./api-client";
import { StatusChip, type Tone } from "./shared";
import { OpenMarkEntryPanel } from "./open-mark-entry-panel";

export type TeacherMarkSheet = {
  id: string; window_id: string; exam_id: string; exam_name: string;
  class_section_id?: string;
  teacher_id: string | null; teacher: string; subject: string; paper: string;
  class_name: string; stream: string | null; total_students: number;
  entered: number; recorded: number; submitted: number; missing: number;
  status: string; overdue: boolean; deadline: string;
  window_closed: boolean; last_activity: string | null;
};
type ProgressData = { entries: TeacherMarkSheet[] };
type Filter = "outstanding" | "all" | "unassigned";
const PAGE_SIZE = 8;
const control = "inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50";

export function isOutstandingSheet(sheet: TeacherMarkSheet) {
  return sheet.total_students > sheet.submitted && !["Draft", "Scheduled", "No students"].includes(sheet.status);
}

function dateLabel(value: string | null, time = false) {
  if (!value || Number.isNaN(new Date(value).getTime())) return "Not available";
  return new Intl.DateTimeFormat("en-KE", {
    timeZone: "Africa/Nairobi", day: "numeric", month: "short", year: "numeric",
    ...(time ? { hour: "2-digit", minute: "2-digit" } as const : {}),
  }).format(new Date(value));
}

function tone(sheet: TeacherMarkSheet): Tone {
  if (sheet.overdue) return "danger";
  if (sheet.status === "Completed") return "success";
  if (["Awaiting submission", "Unassigned"].includes(sheet.status)) return "warning";
  return sheet.status === "In progress" ? "info" : "neutral";
}

export function TeacherMarksProgress({ showWindowControls = false, onOpenSetup }: {
  showWindowControls?: boolean; onOpenSetup?: () => void;
}) {
  const { data, error, isLoading, isFetching, refetch } = useSchoolQuery<ProgressData>(
    "/admin-command/exams-manager/teacher-mark-progress", { refetchInterval: 60_000 },
  );
  const [filter, setFilter] = useState<Filter>("outstanding");
  const [examId, setExamId] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [lockingWindow, setLockingWindow] = useState<string | null>(null);
  const [confirmWindow, setConfirmWindow] = useState<string | null>(null);
  const entries = data?.entries ?? [];
  const exams = Array.from(new Map(entries.map(sheet => [sheet.exam_id, sheet.exam_name])).entries());
  const examSheets = entries.filter(sheet => !examId || sheet.exam_id === examId);
  const outstanding = examSheets.filter(isOutstandingSheet);
  const teacherCount = new Set(outstanding.map(sheet => sheet.teacher_id).filter(Boolean)).size;
  const query = search.trim().toLowerCase();
  const filtered = examSheets.filter(sheet => {
    if (filter === "outstanding" && !isOutstandingSheet(sheet)) return false;
    if (filter === "unassigned" && (sheet.teacher_id || sheet.total_students === 0)) return false;
    return !query || [sheet.teacher, sheet.class_name, sheet.stream, sheet.subject, sheet.paper, sheet.exam_name]
      .some(value => value?.toLowerCase().includes(query));
  });
  const currentPage = Math.min(page, Math.max(0, Math.ceil(filtered.length / PAGE_SIZE) - 1));
  const visible = filtered.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);

  async function handleLock(windowId: string) {
    if (lockingWindow) return;
    setLockingWindow(windowId);
    try {
      await lockMarksEntry(windowId);
      toast.success("Mark-entry window locked.");
      setConfirmWindow(null);
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not lock this mark-entry window. Try again.");
    } finally { setLockingWindow(null); }
  }

  return (
    <div className="min-w-0 space-y-4">
    {showWindowControls ? <OpenMarkEntryPanel entries={entries} unavailable={isLoading || Boolean(error) || !data} onOpened={refetch} /> : null}
    <section aria-label="Teacher mark entry progress" className="min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="flex flex-wrap items-start justify-between gap-3 p-4 sm:p-5">
        <div><h2 className="text-lg font-semibold tracking-tight text-slate-900">Teacher mark entry</h2><p className="mt-1 text-sm text-slate-500">See who still needs to enter marks or submit a completed sheet.</p></div>
        <button type="button" className={control} onClick={() => void refetch()} disabled={isFetching} aria-label="Refresh teacher mark entry"><RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} /> Refresh</button>
      </div>
      {error ? <div role="alert" className="mx-4 mb-4 rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">Teacher progress could not be loaded. {error.message} Use Refresh to try again.</div> : null}
      {!error && !isLoading && data ? (
        <div className="flex flex-wrap gap-x-6 gap-y-2 border-y border-slate-100 bg-slate-50/70 px-4 py-3 text-sm sm:px-5" aria-label="Mark entry summary">
          <span><strong className="font-semibold text-slate-900">{teacherCount}</strong> <span className="text-slate-500">teachers outstanding</span></span>
          <span><strong className="font-semibold text-slate-900">{outstanding.length}</strong> <span className="text-slate-500">sheets to finish</span></span>
          <span><strong className="font-semibold text-rose-700">{outstanding.filter(sheet => sheet.overdue).length}</strong> <span className="text-slate-500">overdue</span></span>
          <span><strong className="font-semibold text-slate-900">{outstanding.filter(sheet => !sheet.teacher_id).length}</strong> <span className="text-slate-500">unassigned sheets</span></span>
        </div>
      ) : null}
      <div className="flex flex-col gap-3 p-4 sm:px-5 lg:flex-row lg:items-center">
        <div className="flex flex-wrap gap-1" role="group" aria-label="Filter mark entry status">
          {([["outstanding", "Outstanding"], ["all", "All sheets"], ["unassigned", "Unassigned"]] as const).map(([value, label]) => (
            <button key={value} type="button" aria-pressed={filter === value} onClick={() => { setFilter(value); setPage(0); }} className={`min-h-10 rounded-lg px-3 text-sm font-medium ${filter === value ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"}`}>{label}</button>
          ))}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row lg:justify-end">
          <select aria-label="Filter by exam" value={examId} onChange={event => { setExamId(event.target.value); setPage(0); }} className="min-h-10 min-w-0 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 sm:max-w-56"><option value="">All exams</option>{exams.map(([id, name]) => <option value={id} key={id}>{name}</option>)}</select>
          <label className="flex min-h-10 min-w-0 items-center gap-2 rounded-lg border border-slate-200 px-3 sm:max-w-64"><Search className="h-4 w-4 shrink-0 text-slate-400" /><input aria-label="Search teachers, classes or subjects" placeholder="Teacher, class or subject" value={search} onChange={event => { setSearch(event.target.value); setPage(0); }} className="w-full min-w-0 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400" /></label>
        </div>
      </div>
      {isLoading ? <p role="status" className="px-5 py-10 text-center text-sm text-slate-500">Loading teacher mark entry…</p> : error ? null : !data ? (
        <p role="status" className="px-5 py-10 text-center text-sm text-slate-500">Waiting for your school context before loading teacher progress.</p>
      ) : filtered.length === 0 ? (
        <div className="border-t border-slate-100 px-5 py-10 text-center">
          <p className="font-medium text-slate-900">{!entries.length ? "No mark-entry sheets yet" : query ? "No matching teachers or sheets" : filter === "outstanding" ? "No outstanding mark-entry sheets" : filter === "unassigned" ? "No unassigned sheets" : "No sheets for this exam"}</p>
          <p className="mx-auto mt-1 max-w-lg text-sm leading-6 text-slate-500">{!entries.length ? "Create an exam with subjects and classes to start tracking teacher submissions." : query ? "Try a different teacher name, class or subject, or clear the search." : filter === "outstanding" ? "All open sheets are submitted. Draft and scheduled exams are available under All sheets." : "Adjust the filters to view other exam sheets."}</p>
          {!entries.length && onOpenSetup ? <button className={`${control} mt-4`} onClick={onOpenSetup}>Open exam setup</button> : entries.length > 0 ? <button className={`${control} mt-4`} onClick={() => { setFilter("all"); setSearch(""); setExamId(""); setPage(0); }}>View all sheets</button> : null}
        </div>
      ) : (
        <>
          <div className="hidden grid-cols-[1.35fr_1.3fr_1fr_1fr_auto] gap-4 border-y border-slate-100 bg-slate-50 px-5 py-2.5 text-xs font-medium uppercase tracking-wide text-slate-500 xl:grid" aria-hidden="true"><span>Teacher / class</span><span>Exam / subject</span><span>Entry progress</span><span>Status / deadline</span><span>Details</span></div>
          <ul className="divide-y divide-slate-100">
            {visible.map(sheet => (
              <li key={sheet.id} className="px-4 py-4 sm:px-5">
                <div className="grid min-w-0 grid-cols-2 items-start gap-3 xl:grid-cols-[1.35fr_1.3fr_1fr_1fr_auto] xl:items-center xl:gap-4">
                  <div className="min-w-0"><p className={`break-words text-sm font-semibold ${sheet.teacher_id ? "text-slate-900" : "text-amber-700"}`}>{sheet.teacher}</p><p className="mt-1 text-xs text-slate-500">{sheet.class_name}{sheet.stream ? ` · ${sheet.stream}` : ""}</p></div>
                  <div className="min-w-0"><p className="break-words text-sm font-medium text-slate-800">{sheet.subject} <span className="font-normal text-slate-500">· {sheet.paper}</span></p><p className="mt-1 text-xs text-slate-500">{sheet.exam_name}</p></div>
                  <div><p className="text-sm tabular-nums text-slate-700">{sheet.recorded}<span className="text-slate-400"> / {sheet.total_students}</span> recorded</p><p className={`mt-1 text-xs ${sheet.missing ? "font-medium text-rose-700" : "text-slate-500"}`}>{sheet.missing ? `${sheet.missing} missing` : `${sheet.submitted} submitted`}</p></div>
                  <div className="col-span-2 sm:col-span-1"><StatusChip label={sheet.status} tone={tone(sheet)} /><p className={`mt-1 text-xs ${sheet.overdue ? "font-medium text-rose-700" : "text-slate-500"}`}>{sheet.overdue ? "Overdue · " : "Due "}{dateLabel(sheet.deadline)}</p></div>
                  <button type="button" aria-label={`Details for ${sheet.teacher}, ${sheet.subject}, ${sheet.paper}, ${sheet.class_name}${sheet.stream ? ` ${sheet.stream}` : ""}`} aria-expanded={expandedId === sheet.id} onClick={() => { setExpandedId(expandedId === sheet.id ? null : sheet.id); setConfirmWindow(null); }} className={`${control} col-span-2 xl:col-span-1`}><span className="xl:sr-only">Details</span><ChevronDown className={`h-4 w-4 ${expandedId === sheet.id ? "rotate-180" : ""}`} /></button>
                </div>
                {expandedId === sheet.id ? (
                  <div className="mt-4 space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                    <p><strong className="font-medium text-slate-800">{sheet.total_students - sheet.submitted} awaiting submission.</strong> {sheet.entered} scores entered; {sheet.recorded - sheet.entered} absence or other recorded outcomes. Missing and incomplete entries still need attention.</p>
                    <p>Last activity: {dateLabel(sheet.last_activity, true)}. Deadline: {dateLabel(sheet.deadline, true)} (East Africa Time).</p>
                    {!sheet.teacher_id ? <p className="text-amber-800">Assign a subject teacher to this class or stream in Academic Setup. These students are not assigned to a teacher with mark-entry access.</p> : null}
                    {sheet.window_closed ? <p className="text-amber-800">This mark-entry window is locked. Outstanding work needs an authorized review before it can continue.</p> : null}
                    {showWindowControls ? confirmWindow === sheet.window_id ? (
                      <div className="space-y-3"><p className="font-medium text-amber-900">Lock all papers and teachers for {sheet.subject}, {sheet.class_name} in {sheet.exam_name}? This closes the whole class window, including any unfinished sheets.</p><div className="flex flex-wrap gap-2"><button className={control} disabled={Boolean(lockingWindow)} onClick={() => void handleLock(sheet.window_id)}>{lockingWindow ? "Locking…" : "Confirm lock"}</button><button className={control} disabled={Boolean(lockingWindow)} onClick={() => setConfirmWindow(null)}>Cancel</button></div></div>
                    ) : <button type="button" className={control} disabled={sheet.window_closed || Boolean(lockingWindow) || sheet.status === "Draft"} onClick={() => setConfirmWindow(sheet.window_id)}><Lock className="h-4 w-4" />{sheet.window_closed ? "Window locked" : "Lock class window"}</button> : null}
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 text-xs text-slate-500 sm:px-5"><span>Showing {currentPage * PAGE_SIZE + 1}–{Math.min((currentPage + 1) * PAGE_SIZE, filtered.length)} of {filtered.length} sheets</span><div className="flex gap-2"><button className={control} aria-label="Previous sheets" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}><ChevronLeft className="h-4 w-4" /></button><button className={control} aria-label="Next sheets" disabled={(currentPage + 1) * PAGE_SIZE >= filtered.length} onClick={() => setPage(currentPage + 1)}><ChevronRight className="h-4 w-4" /></button></div></div>
        </>
      )}
    </section>
    </div>
  );
}
