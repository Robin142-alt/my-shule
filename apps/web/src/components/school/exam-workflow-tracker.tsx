"use client";

import { AlertTriangle, CheckCircle2, RefreshCw, Route } from "lucide-react";

import { useSchoolQuery } from "@/lib/data/school-hooks";

type WorkflowStage =
  | "setup"
  | "mark_entry"
  | "hod_moderation"
  | "dean_lock"
  | "report_card_generation"
  | "report_card_handoff"
  | "dean_approval"
  | "principal_release"
  | "released";

type WorkflowSeries = {
  id: string;
  name: string;
  status: string;
  term_name: string;
  academic_year_name?: string | null;
  stage: WorkflowStage;
  next_owner: string;
  blockers: string[];
  counts: {
    subjects: number;
    classes: number;
    learners: number;
    marks: number;
    submitted_marks: number;
    reviewed_marks: number;
    locked_marks: number;
    published_marks: number;
    report_cards: number;
    review_report_cards: number;
    approved_report_cards: number;
    published_report_cards: number;
  };
};

export type ExamModerationBatch = {
  id: string;
  exam_name: string;
  subject_name: string;
  class_name: string;
  teacher_name: string;
  mark_ids: string[];
  mark_count: number;
  submitted_count: number;
  reviewed_count: number;
  mean_score?: number | null;
  highest_score?: number | null;
  lowest_score?: number | null;
  status: string;
};

export type ExamWorkflowData = {
  scope: { level: "school" | "department"; role: string; department_ids: string[] };
  metrics: {
    exam_series: number;
    active_series: number;
    marks_awaiting_moderation: number;
    marks_awaiting_lock: number;
    report_cards_to_generate: number;
    report_cards_awaiting_dean: number;
    report_cards_awaiting_principal: number;
    report_cards_released: number;
  };
  series: WorkflowSeries[];
  moderation_batches: ExamModerationBatch[];
};

const stages: Array<{ key: WorkflowStage; short: string; owner: string }> = [
  { key: "setup", short: "Setup", owner: "Exams Manager" },
  { key: "mark_entry", short: "Mark entry", owner: "Teachers" },
  { key: "hod_moderation", short: "Moderate", owner: "HOD" },
  { key: "dean_lock", short: "Lock marks", owner: "Dean" },
  { key: "report_card_generation", short: "Generate cards", owner: "Exams Manager" },
  { key: "report_card_handoff", short: "Submit cards", owner: "Exams Manager" },
  { key: "dean_approval", short: "Approve cards", owner: "Dean" },
  { key: "principal_release", short: "Release", owner: "Principal" },
  { key: "released", short: "Published", owner: "Complete" },
];

function stageIndex(stage: WorkflowStage) {
  return Math.max(0, stages.findIndex((item) => item.key === stage));
}

function roleLabel(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

export function ExamWorkflowTracker({
  endpoint = "/exams/workflow",
  heading = "Exam-to-report-card workflow",
}: {
  endpoint?: string;
  heading?: string;
}) {
  const { data, error, isLoading, refetch } = useSchoolQuery<ExamWorkflowData>(endpoint);
  const items = data?.series ?? [];

  return (
    <section className="space-y-4 rounded-2xl border border-[#C8D5EA] bg-white p-4 text-[#071D49] shadow-[0_12px_35px_rgba(7,29,73,0.08)] sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-[#1D4ED8]">
            <Route className="h-4 w-4" /> Live school workflow
          </p>
          <h2 className="mt-1 text-xl font-black sm:text-2xl">{heading}</h2>
          <p className="mt-1 max-w-3xl text-sm font-semibold leading-6 text-[#64748B]">
            One shared lifecycle for Exams Manager, teachers, HOD, Dean, Deputy, and Principal. Each cycle shows its current desk and what must happen next.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void refetch()}
          disabled={isLoading}
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-[#C8D5EA] bg-white px-3 text-sm font-black text-[#0B63CE] disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800" role="alert">
          Exam workflow could not be loaded: {error.message}
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          ["Active cycles", data?.metrics.active_series ?? 0],
          ["HOD moderation", data?.metrics.marks_awaiting_moderation ?? 0],
          ["Dean approval", data?.metrics.report_cards_awaiting_dean ?? 0],
          ["Principal release", data?.metrics.report_cards_awaiting_principal ?? 0],
        ].map(([label, value]) => (
          <div key={String(label)} className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-3 sm:p-4">
            <p className="text-xs font-black uppercase tracking-[0.06em] text-[#64748B]">{label}</p>
            <p className="mt-1 text-2xl font-black">{isLoading ? "..." : value}</p>
          </div>
        ))}
      </div>

      {!isLoading && !error && items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[#C8D5EA] bg-[#F8FAFC] px-4 py-8 text-center">
          <p className="font-black">No exam cycle is configured yet.</p>
          <p className="mt-1 text-sm font-semibold text-[#64748B]">The Exams Manager creates the cycle and opens mark-entry windows; it will then appear for every authorized role.</p>
        </div>
      ) : null}

      <div className="space-y-4">
        {items.map((series) => {
          const currentIndex = stageIndex(series.stage);
          const finalizedMarks = series.counts.locked_marks + series.counts.published_marks;
          return (
            <article key={series.id} className="rounded-xl border border-[#D8E0EC] p-4">
              <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                <div>
                  <h3 className="text-lg font-black">{series.name}</h3>
                  <p className="text-sm font-semibold text-[#64748B]">
                    {[series.term_name, series.academic_year_name].filter(Boolean).join(" - ")}
                  </p>
                </div>
                <div className="rounded-full bg-[#EEF5FF] px-3 py-1.5 text-xs font-black text-[#0B63CE]">
                  Next: {series.next_owner}
                </div>
              </div>

              <div className="mt-4 overflow-x-auto pb-2">
                <ol className="grid min-w-[880px] grid-cols-9 gap-2" aria-label={`${series.name} progress`}>
                  {stages.map((stage, index) => {
                    const complete = index < currentIndex || series.stage === "released";
                    const current = index === currentIndex && series.stage !== "released";
                    return (
                      <li
                        key={stage.key}
                        className={`rounded-lg border px-2 py-2 text-center ${
                          complete
                            ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                            : current
                              ? "border-blue-300 bg-blue-50 text-blue-800 ring-2 ring-blue-100"
                              : "border-slate-200 bg-slate-50 text-slate-500"
                        }`}
                      >
                        <div className="flex items-center justify-center gap-1 text-xs font-black">
                          {complete ? <CheckCircle2 className="h-3.5 w-3.5" /> : null}
                          {stage.short}
                        </div>
                        <p className="mt-1 text-[10px] font-bold">{stage.owner}</p>
                      </li>
                    );
                  })}
                </ol>
              </div>

              <div className="mt-2 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                <p className="rounded-lg bg-[#F8FAFC] px-3 py-2"><span className="font-black">Subjects:</span> {series.counts.subjects}</p>
                <p className="rounded-lg bg-[#F8FAFC] px-3 py-2"><span className="font-black">Learners:</span> {series.counts.learners}</p>
                <p className="rounded-lg bg-[#F8FAFC] px-3 py-2"><span className="font-black">Final marks:</span> {finalizedMarks}/{series.counts.marks}</p>
                <p className="rounded-lg bg-[#F8FAFC] px-3 py-2"><span className="font-black">Cards:</span> {series.counts.published_report_cards}/{series.counts.report_cards} released</p>
              </div>

              {series.blockers.length > 0 && series.stage !== "released" ? (
                <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <p>{series.blockers.join("; ")}</p>
                </div>
              ) : null}
            </article>
          );
        })}
      </div>

      {data?.scope ? (
        <p className="text-right text-xs font-bold text-[#64748B]">
          {data.scope.level === "department" ? "Department-scoped" : "School-scoped"} view for {roleLabel(data.scope.role)}
        </p>
      ) : null}
    </section>
  );
}
