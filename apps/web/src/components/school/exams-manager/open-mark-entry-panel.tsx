"use client";

import { useState } from "react";
import { Unlock } from "lucide-react";
import { openMarksEntry } from "./api-client";
import type { TeacherMarkSheet } from "./teacher-marks-progress";

const field = "min-h-11 w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 disabled:opacity-50";

export function OpenMarkEntryPanel({ entries, unavailable, onOpened }: {
  entries: TeacherMarkSheet[]; unavailable: boolean; onOpened: () => Promise<unknown>;
}) {
  const [examId, setExamId] = useState("");
  const [scope, setScope] = useState<"teacher" | "class" | "everyone">("teacher");
  const [target, setTarget] = useState("");
  const [deadline, setDeadline] = useState("");
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ error: boolean; text: string } | null>(null);
  const exams = [...new Map(entries.map(row => [row.exam_id, row.exam_name])).entries()];
  const selected = entries.filter(row => row.exam_id === examId);
  const teachers = [...new Map(selected.filter(row => row.teacher_id).map(row => [row.teacher_id!, row.teacher])).entries()];
  const classes = [...new Map(selected.filter(row => row.class_section_id).map(row => [row.class_section_id!, row.class_name])).entries()];
  const affected = selected.filter(row => scope === "everyone" || (scope === "teacher" ? row.teacher_id === target : row.class_section_id === target));
  const windowCount = new Set(affected.map(row => row.window_id)).size;
  const resetFeedback = () => setFeedback(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy || unavailable) return;
    const closesAt = new Date(`${deadline}:00+03:00`);
    if (!examId || (scope !== "everyone" && !target) || !windowCount || !Number.isFinite(closesAt.getTime()) || closesAt.getTime() <= Date.now()) {
      setFeedback({ error: true, text: "Choose an exam, teacher or class, and a future deadline in East Africa Time." }); return;
    }
    setBusy(true); setFeedback(null);
    try {
      const result = await openMarksEntry({ exam_series_id: examId, scope, closes_at: closesAt.toISOString(),
        ...(scope === "teacher" ? { teacher_user_id: target } : scope === "class" ? { class_section_id: target } : {}) });
      setFeedback({ error: false, text: result.message });
      await onOpened();
    } catch (error) {
      setFeedback({ error: true, text: error instanceof Error ? error.message : "Mark entry could not be opened. Try again." });
    } finally { setBusy(false); }
  }

  return <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5" aria-label="Open mark entry">
    <h2 className="text-lg font-semibold text-slate-900">Open mark entry</h2>
    <p className="mt-1 text-sm text-slate-600">Give a teacher, a class, or everyone access to enter outstanding marks in one exam.</p>
    <form onSubmit={event => void submit(event)} className="mt-4 space-y-4">
      <fieldset disabled={busy || unavailable} className="grid min-w-0 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <label className="min-w-0 space-y-1 text-sm font-medium">Exam
          <select aria-label="Exam to open" required className={field} value={examId} onChange={event => { setExamId(event.target.value); setTarget(""); resetFeedback(); }}>
            <option value="">Select exam</option>{exams.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
          </select>
        </label>
        <label className="min-w-0 space-y-1 text-sm font-medium">Open for
          <select aria-label="Open for" className={field} value={scope} onChange={event => { setScope(event.target.value as typeof scope); setTarget(""); resetFeedback(); }}>
            <option value="teacher">A particular teacher</option><option value="class">A particular class</option><option value="everyone">Everyone in this exam</option>
          </select>
        </label>
        {scope !== "everyone" ? <label className="min-w-0 space-y-1 text-sm font-medium">{scope === "teacher" ? "Teacher" : "Class"}
          <select aria-label={scope === "teacher" ? "Teacher to open" : "Class to open"} required className={field} value={target} disabled={!examId} onChange={event => { setTarget(event.target.value); resetFeedback(); }}>
            <option value="">Select {scope}</option>{(scope === "teacher" ? teachers : classes).map(([id, name]) => <option value={id} key={id}>{name}</option>)}
          </select>
        </label> : <p className="self-center text-sm text-slate-600">All assigned teachers and configured classes in the selected exam.</p>}
        <label className="min-w-0 space-y-1 text-sm font-medium">Deadline (East Africa Time)
          <input aria-label="Mark entry deadline" type="datetime-local" required className={field} value={deadline} onChange={event => { setDeadline(event.target.value); resetFeedback(); }} />
        </label>
      </fieldset>
      <p className="text-sm text-slate-600">{examId && (scope === "everyone" || target) ? `${windowCount} subject/class windows selected. ` : ""}Reviewed, locked and published results keep their existing protection. Opening for one teacher preserves everyone else’s access.</p>
      {unavailable ? <p className="text-sm text-amber-800">Load teacher progress below before choosing who can enter marks.</p> : null}
      {feedback ? <p role={feedback.error ? "alert" : "status"} className={`rounded-lg p-3 text-sm ${feedback.error ? "bg-rose-50 text-rose-800" : "bg-emerald-50 text-emerald-800"}`}>{feedback.text}</p> : null}
      <button type="submit" disabled={busy || unavailable || !windowCount || !deadline} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white disabled:opacity-50"><Unlock className="h-4 w-4" />{busy ? "Opening…" : "Open mark entry"}</button>
    </form>
  </section>;
}
