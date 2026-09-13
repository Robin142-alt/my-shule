import { AlertTriangle, ArrowLeft, BookOpenCheck, Download, FileText, Loader2, RefreshCw, Save, Search, Send } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { cn } from "./shared-components";
import { TeacherAction, TeacherView } from "./types";
import { useLiveTenantSession } from "@/hooks/use-live-tenant-session";
import {
  fetchPendingMarksLive, fetchTeacherMarkSheetLive, saveExamMarksLive,
  type ExamScoreStatus, type PendingMarksWindow, type TeacherMarkSheetRow,
} from "@/lib/modules/teacher-live";
import { downloadCsvFile, openPrintDocument } from "@/lib/dashboard/export";

type MarkDraft = { score: string; scoreStatus: ExamScoreStatus | ""; remarks: string };
type DraftsByStudent = Record<string, MarkDraft>;
type MissingMarkReason = Exclude<ExamScoreStatus, "entered">;
const REASONS: Array<{ value: MissingMarkReason; label: string }> = [
  { value: "absent", label: "Absent" },
  { value: "exempt", label: "Exempt" },
  { value: "not_assessed", label: "Not assessed" },
  { value: "incomplete", label: "Incomplete" },
  { value: "withheld", label: "Withheld" },
  { value: "medical_exception", label: "Medical exception" },
  { value: "transfer_student", label: "Transfer student" },
];
const EMPTY_WINDOWS: PendingMarksWindow[] = [];
const EMPTY_ROWS: TeacherMarkSheetRow[] = [];
const buttonClass = "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-50";
const primaryClass = "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#071D49] px-4 py-2 text-sm font-semibold text-white hover:bg-[#123A7A] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-50";

function entryUnavailableReason(windowTask: PendingMarksWindow) {
  switch (windowTask.entryState) {
    case "Draft": return "The Exams Manager must select Open for marks in Exam Setup before you can enter scores.";
    case "Scheduled": return `Marks entry starts ${windowTask.opensAt ? new Date(windowTask.opensAt).toLocaleString() : "on the scheduled date"}. The Exams Manager can open it earlier from Exam Setup.`;
    case "Deadline passed": return "The deadline has passed. Ask the Exams Manager to extend the end date and open entry again.";
    case "Locked": return "This exam is locked or published. Ask the Exams Manager to use the governed correction workflow for changes.";
    default: return "Marks entry is closed. Ask the Exams Manager to open this exam for marks.";
  }
}
function draftFromRow(row: TeacherMarkSheetRow): MarkDraft {
  return { score: row.score === null ? "" : String(row.score), scoreStatus: row.id ? row.score_status : "", remarks: row.remarks ?? "" };
}
function scoreError(draft: MarkDraft, outOf: number) {
  if (!draft.score.trim()) return "";
  const score = Number(draft.score);
  return !Number.isFinite(score) || score < 0 || score > outOf ? `Enter 0 to ${outOf}.` : "";
}
function scoreStatus(draft: MarkDraft): ExamScoreStatus | "" {
  return draft.score.trim() ? "entered" : draft.scoreStatus === "entered" ? "" : draft.scoreStatus;
}
function reasonLabel(draft: MarkDraft) {
  return REASONS.find(reason => reason.value === scoreStatus(draft))?.label ?? "Not entered";
}

export function ExamsMarksWorkspace({ onStartAction }: {
  onStartAction: (action: TeacherAction, view: TeacherView, message: string) => void;
}) {
  const liveSession = useLiveTenantSession("school");
  const queryClient = useQueryClient();
  const [activeWindowId, setActiveWindowId] = useState<string | null>(null);
  const [draftMarks, setDraftMarks] = useState<Record<string, DraftsByStudent>>({});
  const [isSaving, setIsSaving] = useState(false);
  const savingRef = useRef(false);
  const [actionError, setActionError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [onlyBlank, setOnlyBlank] = useState(false);
  const [reviewWindowId, setReviewWindowId] = useState<string | null>(null);
  const reviewHeading = useRef<HTMLHeadingElement>(null);
  const scoreInputs = useRef<Record<string, HTMLInputElement | null>>({});
  const pendingKey = ["pending-marks", liveSession.session?.tenantId, liveSession.session?.user.user_id, "all"];
  const pendingMarksQuery = useQuery({
    queryKey: pendingKey,
    queryFn: () => fetchPendingMarksLive(liveSession.session!, true),
    enabled: !!liveSession.session, retry: false, refetchInterval: 30_000,
  });
  const windows = useMemo(() => (pendingMarksQuery.data?.windows ?? EMPTY_WINDOWS)
    .filter(windowTask => windowTask.status.toLowerCase() !== "completed"), [pendingMarksQuery.data]);
  const activeWindow = windows.find(windowTask => windowTask.id === activeWindowId)
    ?? windows.find(windowTask => windowTask.canEnter !== false) ?? windows[0] ?? null;
  const reviewing = !!activeWindow && reviewWindowId === activeWindow.id;
  useEffect(() => { if (reviewing) reviewHeading.current?.focus(); }, [reviewing]);

  const markSheetQuery = useQuery({
    queryKey: ["teacher-mark-sheet", liveSession.session?.tenantId, liveSession.session?.user.user_id,
      activeWindow?.examSeriesId, activeWindow?.classSectionId, activeWindow?.subjectId, activeWindow?.assessmentId],
    queryFn: () => fetchTeacherMarkSheetLive(liveSession.session!, {
      examSeriesId: activeWindow!.examSeriesId, classSectionId: activeWindow!.classSectionId,
      subjectId: activeWindow!.subjectId, assessmentId: activeWindow!.assessmentId,
    }),
    enabled: Boolean(liveSession.session && activeWindow?.examSeriesId && activeWindow.classSectionId
      && activeWindow.subjectId && activeWindow.assessmentId && activeWindow.canEnter !== false),
    retry: false,
  });
  const markRows = activeWindow?.canEnter === false ? EMPTY_ROWS : markSheetQuery.data ?? EMPTY_ROWS;
  const activeDrafts = useMemo(() => Object.fromEntries(markRows.map(row => [row.student_id,
    (activeWindow && draftMarks[activeWindow.id]?.[row.student_id]) || draftFromRow(row),
  ])) as DraftsByStudent, [activeWindow, draftMarks, markRows]);
  const blankRows = markRows.filter(row => !activeDrafts[row.student_id].score.trim());
  const invalidRows = markRows.filter(row => scoreError(activeDrafts[row.student_id], activeWindow?.outOf ?? 100));
  const enteredCount = markRows.length - blankRows.length;
  const readOnly = activeWindow?.canEnter === false || markRows.some(row => row.id && row.status !== "draft");
  const unavailable = !activeWindow || readOnly || !markRows.length || isSaving || pendingMarksQuery.isError
    || markSheetQuery.isError || markSheetQuery.isLoading;
  const visibleRows = markRows.filter(row => (!onlyBlank || !activeDrafts[row.student_id].score.trim())
    && `${row.student_name ?? ""} ${row.admission_number ?? ""}`.toLowerCase().includes(search.trim().toLowerCase()));

  function updateDraft(studentId: string, patch: Partial<MarkDraft>) {
    if (!activeWindow || isSaving || readOnly) return;
    setActionError(""); setNotice("");
    setDraftMarks(current => ({ ...current, [activeWindow.id]: {
      ...current[activeWindow.id], [studentId]: { ...activeDrafts[studentId], ...patch },
    } }));
  }
  function switchWindow(id: string) {
    setActiveWindowId(id); setReviewWindowId(null); setSearch(""); setOnlyBlank(false); setActionError(""); setNotice("");
  }
  function reportInvalidScores() {
    if (!invalidRows.length) return false;
    setActionError(`Check ${invalidRows.length === 1 ? "the highlighted score" : "the highlighted scores"}. Scores must be between 0 and ${activeWindow?.outOf}.`);
    setOnlyBlank(false); setSearch("");
    scoreInputs.current[invalidRows[0].student_id]?.focus();
    return true;
  }
  async function persistScores(action: "draft" | "submit") {
    if (savingRef.current || unavailable || !liveSession.session || !activeWindow) return;
    if (reportInvalidScores()) return;
    if (action === "submit" && blankRows.some(row => !scoreStatus(activeDrafts[row.student_id]))) {
      setActionError("Select a reason for every student without a score before submitting.");
      return;
    }
    const marks = Object.fromEntries(markRows.flatMap(row => {
      const draft = activeDrafts[row.student_id];
      const status = scoreStatus(draft);
      if (!status) return [];
      return [[row.student_id, { score: status === "entered" ? Number(draft.score) : null,
        score_status: status, ...(draft.remarks.trim() ? { remarks: draft.remarks.trim() } : {}),
      }]];
    }));
    if (!Object.keys(marks).length) { setActionError("Enter at least one score before saving a draft."); return; }
    savingRef.current = true; setIsSaving(true); setActionError(""); setNotice("");
    try {
      const result = await saveExamMarksLive(liveSession.session, {
        action, examId: activeWindow.id, classSectionId: activeWindow.classSectionId, marks,
      });
      if (!result.success) throw new Error("Marks were not saved. Please retry.");
      if (action === "submit") {
        // Remove the submitted sheet immediately, including its cached roster.
        queryClient.setQueryData(pendingKey, (current: typeof pendingMarksQuery.data) => current ? {
          ...current, windows: current.windows.filter(windowTask => windowTask.id !== activeWindow.id),
        } : current);
        queryClient.removeQueries({ queryKey: ["teacher-mark-sheet", liveSession.session.tenantId,
          liveSession.session.user.user_id, activeWindow.examSeriesId, activeWindow.classSectionId,
          activeWindow.subjectId, activeWindow.assessmentId], exact: true });
        setActiveWindowId(null); setReviewWindowId(null); setSearch(""); setOnlyBlank(false);
      }
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["pending-marks"] }),
        queryClient.invalidateQueries({ queryKey: ["teacher-mark-sheet"] }),
      ]);
      setDraftMarks(current => { const next = { ...current }; delete next[activeWindow.id]; return next; });
      const message = action === "submit" ? `${activeWindow.examName}: results submitted for moderation.` : "Draft saved.";
      setNotice(message); toast.success(message);
      onStartAction("marks", "exams-marks", message);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not save marks. Please retry.";
      setActionError(message); toast.error(message);
    } finally { savingRef.current = false; setIsSaving(false); }
  }
  function submitResults() {
    if (unavailable || reportInvalidScores()) return;
    setActionError("");
    if (blankRows.length) setReviewWindowId(activeWindow!.id);
    else void persistScores("submit");
  }
  function downloadMarkbook() {
    if (!activeWindow) return;
    downloadCsvFile({ filename: `teacher-markbook-${new Date().toISOString().slice(0, 10)}.csv`,
      headers: ["exam", "class", "subject", "paper", "admission_number", "student_name", "out_of", "score", "score_status"],
      rows: markRows.map(row => { const draft = activeDrafts[row.student_id]; return [activeWindow.examName,
        activeWindow.className, activeWindow.subjectName, activeWindow.paperName, row.admission_number ?? "",
        row.student_name ?? "", String(activeWindow.outOf), draft.score, scoreStatus(draft)]; }),
    });
  }
  function printSheet() {
    if (!activeWindow) return;
    openPrintDocument({ eyebrow: "Teacher markbook", title: activeWindow.examName,
      subtitle: `${activeWindow.className} | ${activeWindow.subjectName} | ${activeWindow.paperName}`,
      rows: markRows.map(row => ({ label: `${row.admission_number ?? "-"} - ${row.student_name ?? "Unnamed student"}`,
        value: activeDrafts[row.student_id].score.trim() ? `${activeDrafts[row.student_id].score} / ${activeWindow.outOf}` : reasonLabel(activeDrafts[row.student_id]),
      })), footer: "Draft markbook. Results are subject to moderation and publication.",
    });
  }

  return (
    <section className="min-w-0 rounded-xl border border-slate-200 bg-white text-slate-900">
      <header className="flex items-center justify-between gap-3 border-b border-slate-200 p-3 sm:p-4 sm:px-6">
        <div className="min-w-0">
          <h2 className="text-xl font-semibold text-[#071D49]">Exams & Marks</h2>
          <p className="mt-1 hidden text-sm text-slate-500 sm:block">Enter scores, save your draft, then submit results.</p>
        </div>
        <button type="button" aria-label="Refresh exams" title="Refresh exams" onClick={() => void pendingMarksQuery.refetch()} disabled={pendingMarksQuery.isFetching || isSaving} className={cn(buttonClass, "shrink-0")}>
          <RefreshCw className={cn("h-4 w-4", pendingMarksQuery.isFetching && "animate-spin")} /><span className="hidden sm:inline">Refresh exams</span>
        </button>
      </header>
      {notice && <p role="status" className="m-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}
      {pendingMarksQuery.isLoading || liveSession.isLoading ? (
        <p role="status" className="flex items-center justify-center gap-2 p-10 text-sm text-slate-500"><Loader2 className="h-5 w-5 animate-spin" /> Loading your assigned markbooks...</p>
      ) : pendingMarksQuery.isError || !liveSession.session ? (
        <div role="alert" className="m-4 rounded-lg border border-red-200 bg-red-50 p-4">
          <h3 className="font-semibold text-red-900">We couldn&apos;t load your assigned markbooks</h3>
          <p className="mt-1 break-words text-sm text-red-800">{pendingMarksQuery.error instanceof Error ? pendingMarksQuery.error.message : "Sign in with your school account to load your markbooks."}</p>
          <button type="button" onClick={() => void pendingMarksQuery.refetch()} disabled={pendingMarksQuery.isFetching} className={cn(buttonClass, "mt-3")} aria-label="Retry loading markbooks">Retry</button>
        </div>
      ) : !activeWindow ? (
        <div className="px-5 py-10 text-center">
          <BookOpenCheck className="mx-auto h-8 w-8 text-slate-400" />
          <h3 className="mt-3 font-semibold">No exams awaiting marks</h3>
          <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500">Submitted markbooks are removed from this list. If an exam is missing, ask the Exams Manager to check your active class and subject allocation and open it for marks.</p>
        </div>
      ) : (
        <div className="min-w-0">
          <div className="grid gap-2 border-b border-slate-200 bg-slate-50/70 p-3 sm:p-4 sm:px-6">
            <label className="grid min-w-0 gap-1.5 text-sm font-medium">
              Exam / class / subject
              <select aria-label="Exam / class / subject" value={activeWindow.id} onChange={event => switchWindow(event.target.value)} disabled={isSaving}
                className="min-h-12 w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 text-base font-normal focus:outline-blue-600 disabled:opacity-60">
                {windows.map(windowTask => <option key={windowTask.id} value={windowTask.id}>{windowTask.examName} · {windowTask.className} · {windowTask.subjectName} · {windowTask.paperName}{windowTask.canEnter === false ? ` (${windowTask.entryState})` : ""}</option>)}
              </select>
            </label>
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-slate-500">
              <div className="min-w-0 break-words">
                <p className="mb-1 font-medium text-slate-700 sm:hidden">{activeWindow.className} · {activeWindow.subjectName}</p>
                <p>{activeWindow.paperName} <span className="mx-1">·</span> Out of <strong className="font-semibold text-slate-700">{activeWindow.outOf}</strong>{activeWindow.deadline && <> <span className="mx-1">·</span> Due {activeWindow.deadline}</>}</p>
              </div>
              <div className="flex gap-2">
                <button type="button" aria-label="Download CSV" onClick={downloadMarkbook} disabled={unavailable} className={buttonClass}><Download className="h-4 w-4" /><span><span className="hidden sm:inline">Download </span>CSV</span></button>
                <button type="button" aria-label="Print sheet" onClick={printSheet} disabled={unavailable} className={buttonClass}><FileText className="h-4 w-4" /><span>Print<span className="hidden sm:inline"> sheet</span></span></button>
              </div>
            </div>
          </div>
          {actionError && <p role="alert" className="mx-4 mt-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />{actionError}</p>}
          {activeWindow.canEnter === false ? (
            <div role="status" className="m-4 rounded-lg border border-amber-200 bg-amber-50 p-4"><h3 className="font-semibold">{activeWindow.entryState || "Entry unavailable"}</h3><p className="mt-1 text-sm leading-6 text-slate-600">{entryUnavailableReason(activeWindow)}</p></div>
          ) : markSheetQuery.isLoading ? (
            <p role="status" className="flex items-center justify-center gap-2 p-10 text-sm text-slate-500"><Loader2 className="h-5 w-5 animate-spin" /> Loading students...</p>
          ) : markSheetQuery.isError ? (
            <div role="alert" className="m-4 rounded-lg border border-red-200 bg-red-50 p-4">
              <p className="break-words text-sm text-red-800">{markSheetQuery.error instanceof Error ? markSheetQuery.error.message : "Could not load this markbook. Please retry."}</p>
              <button type="button" onClick={() => void markSheetQuery.refetch()} disabled={markSheetQuery.isFetching} className={cn(buttonClass, "mt-3")}>Retry markbook</button>
            </div>
          ) : !markRows.length ? (
            <div className="p-6"><h3 className="font-semibold">No active subject-enrolled learners in this markbook.</h3><p className="mt-2 text-sm text-slate-500">Ask the Deputy Principal or HOD to check enrolment for {activeWindow.className}, {activeWindow.subjectName}, then refresh the exam list.</p></div>
          ) : reviewing ? (
            <section aria-labelledby="missing-scores-title" className="p-4 sm:px-6">
              <button type="button" onClick={() => { setReviewWindowId(null); setActionError(""); }} disabled={isSaving} className={buttonClass}><ArrowLeft className="h-4 w-4" /> Back to scores</button>
              <h3 ref={reviewHeading} tabIndex={-1} id="missing-scores-title" className="mt-5 text-lg font-semibold outline-none">Reasons for missing scores</h3>
              <p className="mt-1 text-sm leading-6 text-slate-500">{blankRows.length} {blankRows.length === 1 ? "student has" : "students have"} no score. Select a reason for each, or go back to enter their scores.</p>
              <div className="mt-4 divide-y divide-slate-200 rounded-lg border border-slate-200">
                {blankRows.map(row => <div key={row.student_id} className="grid gap-3 p-3 sm:grid-cols-2 sm:items-center sm:p-4">
                  <div className="min-w-0"><p className="break-words text-sm font-medium">{row.student_name ?? "Unnamed student"}</p><p className="mt-0.5 text-xs text-slate-500">{row.admission_number ?? "No admission number"}</p></div>
                  <label className="grid min-w-0 gap-1 text-sm text-slate-600">Reason / evidence
                    <select aria-label={`${row.student_name ?? "Student"} missing score reason`} value={scoreStatus(activeDrafts[row.student_id])} disabled={isSaving}
                      onChange={event => updateDraft(row.student_id, { scoreStatus: event.target.value as MissingMarkReason | "" })}
                      className="min-h-12 w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 text-base text-slate-900 focus:outline-blue-600">
                      <option value="">Select a reason</option>{REASONS.map(reason => <option key={reason.value} value={reason.value}>{reason.label}</option>)}
                    </select>
                  </label>
                </div>)}
              </div>
            </section>
          ) : (
            <>
              {readOnly && <p role="status" className="m-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">These results are in moderation. Refresh exams to update your list.</p>}
              <div className="flex flex-wrap items-center gap-2 p-3 sm:gap-3 sm:p-4 sm:px-6">
                <label className="relative min-w-0 flex-1 basis-48"><Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-400" /><input type="search" aria-label="Find student" placeholder="Name or admission number" value={search} onChange={event => setSearch(event.target.value)} className="min-h-11 w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-base focus:outline-blue-600" /></label>
                <button type="button" aria-label={`Blank scores (${blankRows.length})`} aria-pressed={onlyBlank} onClick={() => setOnlyBlank(value => !value)} className={cn(buttonClass, onlyBlank && "border-blue-600 bg-blue-50 text-blue-700")}>Blank ({blankRows.length})</button>
                <p className="text-sm text-slate-500" aria-live="polite">{enteredCount} / {markRows.length} entered</p>
              </div>
              <div role="table" aria-label="Student scores" className="w-full">
                <div role="row" className="grid grid-cols-[minmax(0,1fr)_6rem] gap-3 border-y border-slate-200 bg-slate-50 px-4 py-2 text-xs font-medium text-slate-500 sm:grid-cols-[minmax(0,1fr)_9rem_7rem] sm:px-6">
                  <span role="columnheader">Student</span><span role="columnheader" className="hidden sm:block">Admission no.</span><span role="columnheader" className="text-center">Score / {activeWindow.outOf}</span>
                </div>
                <div role="rowgroup" className="divide-y divide-slate-100">
                  {visibleRows.map(row => {
                    const draft = activeDrafts[row.student_id];
                    const error = scoreError(draft, activeWindow.outOf);
                    return <div role="row" key={row.student_id} className="grid grid-cols-[minmax(0,1fr)_6rem] items-center gap-x-3 gap-y-1 px-4 py-3 focus-within:bg-blue-50/50 sm:grid-cols-[minmax(0,1fr)_9rem_7rem] sm:px-6">
                      <div role="cell" className="min-w-0"><label htmlFor={`score-${row.student_id}`} className="block break-words text-sm font-medium leading-5">{row.student_name ?? "Unnamed student"}</label><p className="mt-1 text-xs text-slate-500 sm:hidden">{row.admission_number ?? "No admission number"}</p></div>
                      <span role="cell" className="hidden text-sm text-slate-500 sm:block">{row.admission_number ?? "-"}</span>
                      <div role="cell"><input id={`score-${row.student_id}`} ref={element => { scoreInputs.current[row.student_id] = element; }} aria-label={`${row.student_name ?? "Student"} score`}
                        type="text" inputMode="decimal" autoComplete="off" enterKeyHint="next" value={draft.score} disabled={readOnly || isSaving}
                        aria-invalid={!!error} aria-describedby={error ? `error-${row.student_id}` : undefined}
                        onChange={event => updateDraft(row.student_id, { score: event.target.value, scoreStatus: event.target.value.trim() ? "entered" : "" })}
                        onKeyDown={event => { if (event.key === "Enter") { event.preventDefault(); const next = visibleRows[visibleRows.indexOf(row) + 1]; if (next) scoreInputs.current[next.student_id]?.focus(); } }}
                        className={cn("min-h-12 w-full rounded-lg border bg-white px-2 text-center text-base tabular-nums focus:outline-2 focus:outline-blue-600 disabled:bg-slate-50", error ? "border-red-400 text-red-800" : "border-slate-300")} />
                      </div>
                      {error && <p id={`error-${row.student_id}`} className="col-span-full text-right text-xs text-red-700">{error}</p>}
                    </div>;
                  })}
                </div>
              </div>
              {!visibleRows.length && <div className="p-6 text-center"><p className="text-sm text-slate-500">No students match these filters.</p><button type="button" onClick={() => { setSearch(""); setOnlyBlank(false); }} className={cn(buttonClass, "mt-3")}>Clear filters</button></div>}
            </>
          )}
          <footer className="sticky bottom-0 z-10 grid grid-cols-2 items-center gap-2 rounded-b-xl border-t border-slate-200 bg-white p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:flex sm:flex-wrap sm:justify-end sm:px-6">
            <p className="col-span-2 text-xs text-slate-500 empty:hidden sm:mr-auto">{isSaving ? "Saving results..." : activeWindow && draftMarks[activeWindow.id] ? "Unsaved changes" : ""}</p>
            {!reviewing && <button type="button" onClick={() => void persistScores("draft")} disabled={unavailable} className={buttonClass}><Save className="h-4 w-4" /> Save draft</button>}
            <button type="button" onClick={() => reviewing ? void persistScores("submit") : submitResults()} disabled={unavailable} className={cn(primaryClass, reviewing && "col-span-2")}>
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="hidden h-4 w-4 sm:block" />}{reviewing ? "Confirm submission" : "Submit results"}
            </button>
          </footer>
        </div>
      )}
    </section>
  );
}
