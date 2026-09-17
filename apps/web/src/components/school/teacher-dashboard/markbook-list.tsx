import { useState } from "react";
import { ArrowRight, BookOpenCheck, Search } from "lucide-react";
import type { PendingMarksWindow } from "@/lib/modules/teacher-live";
import { cn } from "./shared-components";

export type MarkbookView = "active" | "drafts" | "submitted";
export const sheetKey = (sheet: PendingMarksWindow) => sheet.sheetId ?? `${sheet.id}:${sheet.assessmentId}`;
export const isSubmitted = (sheet: PendingMarksWindow) => ["submitted", "completed"].includes(sheet.status.toLowerCase());
export function markbookDate(value?: string | null) {
  return value && !Number.isNaN(new Date(value).getTime())
    ? new Intl.DateTimeFormat("en-KE", { timeZone: "Africa/Nairobi", day: "numeric", month: "short", year: "numeric" }).format(new Date(value))
    : "Not set";
}
const control = "min-h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 focus:outline-blue-600";

export function MarkbookList({ sheets, drafts, view, onView, onOpen }: {
  sheets: PendingMarksWindow[]; drafts: string[]; view: MarkbookView;
  onView: (view: MarkbookView) => void; onOpen: (key: string) => void;
}) {
  const [subject, setSubject] = useState("");
  const [exam, setExam] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const hasDraft = (sheet: PendingMarksWindow) => !isSubmitted(sheet)
    && (Number(sheet.savedCount) > 0 || drafts.includes(sheetKey(sheet)) || (sheet.canEnter !== false && sheet.status === "Draft"));
  const views = [
    { id: "active" as const, label: "To do", count: sheets.filter(sheet => !isSubmitted(sheet)).length },
    { id: "drafts" as const, label: "Saved drafts", count: sheets.filter(sheet => !isSubmitted(sheet) && Number(sheet.savedCount) > 0).length },
    { id: "submitted" as const, label: "Submitted", count: sheets.filter(isSubmitted).length },
  ];
  const filtered = sheets.filter(sheet => view === "submitted" ? isSubmitted(sheet)
    : !isSubmitted(sheet) && (view !== "drafts" || Number(sheet.savedCount) > 0))
    .filter(sheet => (!subject || sheet.subjectId === subject) && (!exam || sheet.examSeriesId === exam)
      && `${sheet.examName} ${sheet.subjectName} ${sheet.className} ${sheet.streamNames ?? ""} ${sheet.paperName}`.toLowerCase().includes(search.trim().toLowerCase()))
    .sort((a, b) => a.examName.localeCompare(b.examName) || a.subjectName.localeCompare(b.subjectName)
      || a.className.localeCompare(b.className) || a.paperName.localeCompare(b.paperName));
  const currentPage = Math.min(page, Math.max(0, Math.ceil(filtered.length / 8) - 1));
  return <div className="min-w-0">
    <div className="flex flex-wrap gap-2 border-b border-slate-200 p-3 sm:px-6" aria-label="Markbook views">
      {views.map(item => <button type="button" key={item.id} aria-pressed={view === item.id}
        onClick={() => { onView(item.id); setPage(0); }}
        className={cn("min-h-11 rounded-lg border px-3 text-sm font-medium focus:outline-blue-600",
          view === item.id ? "border-[#071D49] bg-[#071D49] text-white" : "border-slate-300 bg-white text-slate-700")}>{item.label} ({item.count})</button>)}
    </div>
    <div className="grid gap-2 bg-slate-50/70 p-3 sm:grid-cols-3 sm:px-6">
      <label className="relative min-w-0"><Search className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
        <input aria-label="Search markbooks" type="search" placeholder="Class, stream or paper" value={search}
          onChange={event => { setSearch(event.target.value); setPage(0); }} className={cn(control, "w-full pl-9")} /></label>
      <select aria-label="Filter by exam" value={exam} onChange={event => { setExam(event.target.value); setPage(0); }} className={cn(control, "min-w-0")}>
        <option value="">All exams</option>{Array.from(new Map(sheets.map(sheet => [sheet.examSeriesId, sheet.examName]))).map(([id, name]) => <option key={id} value={id}>{name}</option>)}
      </select>
      <select aria-label="Filter by subject" value={subject} onChange={event => { setSubject(event.target.value); setPage(0); }} className={cn(control, "min-w-0")}>
        <option value="">All subjects</option>{Array.from(new Map(sheets.map(sheet => [sheet.subjectId, sheet.subjectName]))).map(([id, name]) => <option key={id} value={id}>{name}</option>)}
      </select>
    </div>
    {!filtered.length ? <div className="px-5 py-10 text-center">
      <BookOpenCheck className="mx-auto h-8 w-8 text-slate-400" />
      <h3 className="mt-3 font-semibold">{subject || exam || search ? "No matching markbooks" : view === "submitted" ? "No submitted markbooks yet" : view === "drafts" ? "No saved drafts yet" : "No exams awaiting marks"}</h3>
      <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500">{subject || exam || search ? "Try another subject, exam or class." : view === "submitted" ? "Your submitted papers will appear here for reference. They leave your To do list after submission." : view === "drafts" ? "Open a markbook from To do, enter scores and save a draft. You can return to edit it before submitting." : "Submitted markbooks are in Submitted. If an exam is missing, ask the Exams Manager to check your active class and subject allocation and open it for marks."}</p>
      {(subject || exam || search) && <button type="button" className={cn(control, "mt-3")} onClick={() => { setSubject(""); setExam(""); setSearch(""); }}>Clear filters</button>}
      {view === "drafts" && <button type="button" className={cn(control, "mt-3")} onClick={() => onView("active")}>Go to To do</button>}
    </div> : <ul className="divide-y divide-slate-200" aria-label="Your markbooks">
      {filtered.slice(currentPage * 8, currentPage * 8 + 8).map(sheet => <li key={sheetKey(sheet)} className="flex flex-wrap items-center gap-3 p-4 sm:px-6">
        <div className="min-w-0 flex-1 basis-56">
          <p className="text-xs font-medium text-slate-500">{sheet.examName}</p>
          <h3 className="mt-1 break-words text-base font-semibold text-[#071D49]">{sheet.subjectName} <span className="font-normal text-slate-600">· {sheet.className}{sheet.streamNames ? ` · ${sheet.streamNames}` : ""}</span></h3>
          <p className="mt-1 text-sm text-slate-500">{sheet.paperName} · {sheet.totalStudents} students · Out of {sheet.outOf}</p>
        </div>
        <div className="min-w-0 text-sm">
          <p className={cn("font-medium", isSubmitted(sheet) ? "text-emerald-700" : "text-slate-700")}>
            {drafts.includes(sheetKey(sheet)) ? "Unsaved changes" : isSubmitted(sheet) ? "Submitted" : sheet.canEnter === false ? sheet.entryState : hasDraft(sheet) ? `${sheet.savedCount ?? sheet.enteredCount} saved · Editable draft` : "Not started"}
          </p>
          <p className="mt-1 text-xs text-slate-500">{isSubmitted(sheet) ? `Submitted ${markbookDate(sheet.submittedAt)}` : `Due ${markbookDate(sheet.deadline)}`}</p>
        </div>
        <button type="button" aria-label={`Open ${sheet.subjectName} ${sheet.className} ${sheet.paperName} ${sheet.examName}`} onClick={() => onOpen(sheetKey(sheet))}
          className={cn(control, "inline-flex w-full items-center justify-center gap-2 font-medium sm:w-auto")}>
          {isSubmitted(sheet) ? "View submission" : sheet.canEnter === false ? "View details" : hasDraft(sheet) ? "Continue editing" : "Enter marks"}<ArrowRight className="h-4 w-4" />
        </button>
      </li>)}
    </ul>}
    {filtered.length > 8 && <div className="flex items-center justify-between gap-2 border-t p-3 text-sm sm:px-6">
      <span>{currentPage * 8 + 1}–{Math.min(currentPage * 8 + 8, filtered.length)} of {filtered.length}</span>
      <div className="flex gap-2"><button type="button" className={control} disabled={!currentPage} onClick={() => setPage(currentPage - 1)}>Previous</button><button type="button" className={control} disabled={(currentPage + 1) * 8 >= filtered.length} onClick={() => setPage(currentPage + 1)}>Next</button></div>
    </div>}
  </div>;
}
