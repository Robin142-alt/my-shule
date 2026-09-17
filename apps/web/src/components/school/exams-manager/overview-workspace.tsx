"use client";

import { ArrowRight, Plus, RefreshCw } from "lucide-react";
import { useSchoolQuery } from "@/lib/data/school-hooks";
import { ExamWorkflowTracker } from "../exam-workflow-tracker";
import { StatusChip } from "./shared";
import { TeacherMarksProgress } from "./teacher-marks-progress";

type OverviewData = {
  metrics: { active_exams: number; pending_moderation: number; published_results: number; total_report_cards: number };
  recent_exams: Array<{ id: string; name: string; term: string; status: string; start_date: string }>;
};

export function OverviewWorkspace({ onNavigate }: {
  onNavigate: (view: "exam-setup" | "moderation" | "report-cards" | "publishing") => void;
}) {
  const { data, error, isLoading, isFetching, refetch } = useSchoolQuery<OverviewData>("/admin-command/exams-manager/overview");
  const metrics = data?.metrics;
  const cards = [
    { label: "Exam cycles", value: metrics?.active_exams, view: "exam-setup" as const, hint: "Configure and schedule" },
    { label: "Awaiting moderation", value: metrics?.pending_moderation, view: "moderation" as const, hint: "Submitted marks to review" },
    { label: "Report cards", value: metrics?.total_report_cards, view: "report-cards" as const, hint: "Prepare student reports" },
    { label: "Published reports", value: metrics?.published_results, view: "publishing" as const, hint: "Released to families" },
  ];
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h2 className="text-xl font-semibold tracking-tight text-slate-900">Examination overview</h2><p className="mt-1 text-sm text-slate-500">Track submissions, resolve missing marks, and prepare results.</p></div>
        <button type="button" onClick={() => onNavigate?.("exam-setup")} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800"><Plus className="h-4 w-4" /> Set up exam</button>
      </div>
      {error ? <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"><span>Exam summary could not be loaded. {error.message}</span><button onClick={() => void refetch()} disabled={isFetching} className="inline-flex min-h-10 items-center gap-2 font-medium"><RefreshCw className="h-4 w-4" /> Retry summary</button></div> : null}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {cards.map(card => <button key={card.label} type="button" onClick={() => onNavigate?.(card.view)} className="rounded-xl border border-slate-200 bg-white p-4 text-left transition hover:border-slate-400"><span className="text-xs font-medium text-slate-500">{card.label}</span><span className="mt-2 block text-2xl font-semibold tabular-nums text-slate-900">{isLoading ? "…" : error || !metrics ? "—" : card.value ?? 0}</span><span className="mt-2 flex items-center justify-between gap-2 text-xs text-slate-500">{card.hint}<ArrowRight className="h-3.5 w-3.5 shrink-0" /></span></button>)}
      </div>
      <TeacherMarksProgress onOpenSetup={() => onNavigate?.("exam-setup")} />
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 p-4 sm:px-5"><h2 className="text-base font-semibold text-slate-900">Recent exam cycles</h2><button onClick={() => onNavigate?.("exam-setup")} className="min-h-10 text-sm font-medium text-blue-700">Manage exams</button></div>
        {isLoading ? <p className="p-5 text-sm text-slate-500">Loading exam cycles…</p> : error ? <p className="p-5 text-sm text-rose-700">Exam cycles are unavailable. Retry the summary above.</p> : !data?.recent_exams?.length ? <p className="p-5 text-sm text-slate-500">No exams yet. Select Set up exam to create your first cycle.</p> : <ul className="divide-y divide-slate-100">{data.recent_exams.slice(0, 5).map(exam => <li key={exam.id} className="flex flex-wrap items-center justify-between gap-3 p-4 sm:px-5"><div><p className="text-sm font-medium text-slate-900">{exam.name}</p><p className="mt-1 text-xs text-slate-500">{exam.term}</p></div><StatusChip label={exam.status.replaceAll("_", " ")} tone={exam.status === "published" ? "success" : "neutral"} /></li>)}</ul>}
      </section>
      <details className="rounded-xl border border-slate-200 bg-white p-4"><summary className="cursor-pointer text-sm font-medium text-slate-700">Exam approval workflow</summary><div className="mt-4"><ExamWorkflowTracker heading="Exam operations workflow" /></div></details>
    </div>
  );
}
