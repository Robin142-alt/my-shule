"use client";

import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  ClipboardCheck,
  FileText,
  RefreshCw,
  Target,
  UsersRound,
} from "lucide-react";
import { useSchoolQuery } from "@/lib/data/school-hooks";
import type { DeanView } from "../dean-academics-command-center";
import type { ExamWorkflowData } from "../exam-workflow-tracker";
import { useSchoolCommandIdentity } from "../integrated-school-command-header";
import { deanButtonClass, Panel, QueryNotice } from "./shared";

type OverviewData = {
  metrics: { totalSubjects: number; totalTeachers: number };
};
export type CoverageRecord = {
  id: string;
  subject: string;
  class_name: string;
  planned_topics: number;
  covered_topics: number;
  coverage: number | string | null;
};

export function OverviewWorkspace({
  onNavigate,
}: {
  onNavigate: (view: DeanView) => void;
}) {
  const overview = useSchoolQuery<OverviewData>(
    "/admin-command/dean-academics/overview",
  );
  const workflow = useSchoolQuery<ExamWorkflowData>("/exams/workflow");
  const coverage = useSchoolQuery<CoverageRecord[]>(
    "/admin-command/dean-academics/curriculum-coverage",
  );
  const { userLabel } = useSchoolCommandIdentity();
  const rows = Array.isArray(coverage.data) ? coverage.data : [];
  const planned = rows.reduce(
    (sum, row) => sum + Number(row.planned_topics),
    0,
  );
  const covered = rows.reduce(
    (sum, row) => sum + Number(row.covered_topics),
    0,
  );
  const coverageValue =
    coverage.error || coverage.isLoading
      ? "—"
      : planned
        ? `${Math.round((covered / planned) * 100)}%`
        : "No plans";
  const metrics = workflow.data?.metrics;
  const metric = (value: number | undefined) =>
    workflow.error || workflow.isLoading || value === undefined
      ? "—"
      : value.toLocaleString();
  const queues = [
    {
      label: "Review submitted marks",
      count: metrics?.marks_awaiting_moderation,
      description: "Check teacher submissions and return any corrections.",
      view: "assessments" as const,
    },
    {
      label: "Lock reviewed marks",
      count: metrics?.marks_awaiting_lock,
      description: "Finalize reviewed marks for report-card generation.",
      view: "assessments" as const,
    },
    {
      label: "Approve report cards",
      count: metrics?.report_cards_awaiting_dean,
      description: "Send complete cards to the Principal for release.",
      view: "reports" as const,
    },
  ];
  const refreshing =
    overview.isFetching || workflow.isFetching || coverage.isFetching;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-slate-500">
            {userLabel === "School user"
              ? "Your academic office"
              : `Your academic office, ${userLabel}`}
          </p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
            Academic overview
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Review pending work and keep teaching on track.
          </p>
        </div>
        <button
          type="button"
          className={deanButtonClass}
          disabled={refreshing}
          onClick={() =>
            void Promise.all([
              overview.refetch(),
              workflow.refetch(),
              coverage.refetch(),
            ])
          }
        >
          <RefreshCw
            className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
          />
          {refreshing ? "Refreshing…" : "Refresh overview"}
        </button>
      </div>

      <div className="app-metric-grid grid grid-cols-2 gap-3 xl:grid-cols-4">
        {[
          {
            label: "Marks to review",
            value: metric(metrics?.marks_awaiting_moderation),
            detail: "Submitted by teachers",
            view: "assessments" as const,
            icon: ClipboardCheck,
          },
          {
            label: "Cards to approve",
            value: metric(metrics?.report_cards_awaiting_dean),
            detail: "Awaiting your decision",
            view: "reports" as const,
            icon: FileText,
          },
          {
            label: "Lesson-plan coverage",
            value: coverageValue,
            detail: planned
              ? `${covered} of ${planned} plans logged`
              : "Based on recorded lesson delivery",
            view: "curriculum-coverage" as const,
            icon: BookOpen,
          },
          {
            label: "Active staff",
            value:
              overview.error || overview.isLoading
                ? "—"
                : (overview.data?.metrics?.totalTeachers ?? "—"),
            detail: "Open teaching allocations",
            view: "teacher-workload" as const,
            icon: UsersRound,
          },
        ].map(({ label, value, detail, view, icon: Icon }) => (
          <button
            key={label}
            type="button"
            onClick={() => onNavigate(view)}
            className="group rounded-lg border border-slate-200 bg-white p-4 text-left transition hover:border-blue-300 focus-visible:outline-2 focus-visible:outline-blue-600"
          >
            <span className="flex items-center justify-between gap-2 text-xs font-medium text-slate-500">
              {label}
              <Icon className="h-4 w-4 shrink-0" />
            </span>
            <span className="mt-2 block text-2xl font-semibold tabular-nums text-slate-900">
              {value}
            </span>
            <span className="mt-1 flex items-center justify-between gap-2 text-xs leading-5 text-slate-500">
              {detail}
              <ArrowRight className="h-3.5 w-3.5 shrink-0 text-slate-400 group-hover:text-blue-600" />
            </span>
          </button>
        ))}
      </div>
      <QueryNotice
        error={overview.error}
        onRetry={() => void overview.refetch()}
      />

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <Panel
          title="Your review queue"
          description="The next decisions in the exam cycle."
        >
          <QueryNotice
            error={workflow.error}
            onRetry={() => void workflow.refetch()}
          />
          {workflow.isLoading ? (
            <p role="status" className="py-8 text-sm text-slate-500">
              Loading your review queue…
            </p>
          ) : (
            <div className="divide-y divide-slate-100">
              {queues.map((queue) => (
                <button
                  key={queue.label}
                  type="button"
                  onClick={() => onNavigate(queue.view)}
                  className="flex w-full items-center gap-3 py-4 text-left hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-blue-600"
                >
                  <span
                    className={`flex h-10 min-w-10 items-center justify-center rounded-md px-2 text-sm font-semibold tabular-nums ${!workflow.error && queue.count ? "bg-amber-50 text-amber-800" : "bg-slate-100 text-slate-600"}`}
                  >
                    {metric(queue.count)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-slate-800">
                      {queue.label}
                    </span>
                    <span className="mt-1 block text-xs leading-5 text-slate-500">
                      {queue.description}
                    </span>
                  </span>
                  <ArrowRight className="h-4 w-4 shrink-0 text-slate-400" />
                </button>
              ))}
            </div>
          )}
          {!workflow.error &&
          !workflow.isLoading &&
          queues.every((queue) => queue.count === 0) ? (
            <p className="mt-2 rounded-md bg-slate-50 p-3 text-xs leading-5 text-slate-600">
              No decisions are waiting. Open Assessments to check exam progress,
              or review teaching coverage below.
            </p>
          ) : null}
        </Panel>

        <Panel
          title="Academic desk"
          description="Daily work, one workspace away."
        >
          <div className="grid gap-2">
            {[
              {
                title: "Master timetable",
                detail: "Check classes, lessons and teaching allocations",
                view: "timetable" as const,
                icon: CalendarDays,
              },
              {
                title: "Department performance",
                detail: "Compare outcomes and identify support needs",
                view: "department-performance" as const,
                icon: UsersRound,
              },
              {
                title: "Academic interventions",
                detail: "Follow up learner support and progress",
                view: "academic-interventions" as const,
                icon: Target,
              },
              {
                title: "Academic reports",
                detail: "Preview, download and print report cards",
                view: "reports" as const,
                icon: FileText,
              },
            ].map(({ title, detail, view, icon: Icon }) => (
              <button
                key={view}
                type="button"
                onClick={() => onNavigate(view)}
                className="flex items-center gap-3 rounded-md p-2.5 text-left hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-blue-600"
              >
                <Icon className="h-4 w-4 shrink-0 text-slate-500" />
                <span className="flex-1">
                  <span className="block text-sm font-medium text-slate-800">
                    {title}
                  </span>
                  <span className="mt-0.5 block text-xs leading-5 text-slate-500">
                    {detail}
                  </span>
                </span>
                <ArrowRight className="h-4 w-4 shrink-0 text-slate-400" />
              </button>
            ))}
          </div>
        </Panel>
      </div>

      <Panel
        title="Teaching coverage"
        description="Recorded delivery against lesson plans, starting with the lowest coverage."
        actions={
          <button
            type="button"
            onClick={() => onNavigate("curriculum-coverage")}
            className={deanButtonClass}
          >
            View all coverage <ArrowRight className="h-4 w-4" />
          </button>
        }
      >
        <QueryNotice
          error={coverage.error}
          onRetry={() => void coverage.refetch()}
        />
        {coverage.isLoading ? (
          <p role="status" className="py-6 text-sm text-slate-500">
            Loading teaching coverage…
          </p>
        ) : !coverage.error && !rows.length ? (
          <p className="py-6 text-sm text-slate-500">
            No class-subject coverage records yet. Open Curriculum Coverage to
            check teaching setup and submitted plans.
          </p>
        ) : !coverage.error ? (
          <div className="divide-y divide-slate-100">
            {[...rows]
              .sort(
                (a, b) => Number(a.coverage ?? -1) - Number(b.coverage ?? -1),
              )
              .slice(0, 5)
              .map((row) => (
                <div
                  key={`${row.id}-${row.class_name}`}
                  className="grid items-center gap-2 py-3 sm:grid-cols-[1fr_1fr_200px]"
                >
                  <p className="text-sm font-medium text-slate-800">
                    {row.subject}
                    <span className="ml-2 text-xs font-normal text-slate-500">
                      {row.class_name}
                    </span>
                  </p>
                  <p className="text-xs text-slate-500">
                    {row.planned_topics
                      ? `${row.covered_topics} of ${row.planned_topics} plans logged`
                      : "Lesson plans needed"}
                  </p>
                  <div className="flex items-center gap-3">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-[#426B9E]"
                        style={{
                          width: `${Math.max(0, Math.min(100, Number(row.coverage ?? 0)))}%`,
                        }}
                      />
                    </div>
                    <span className="w-10 text-right text-xs tabular-nums text-slate-600">
                      {row.coverage === null ? "—" : `${Number(row.coverage)}%`}
                    </span>
                  </div>
                </div>
              ))}
          </div>
        ) : null}
      </Panel>
    </div>
  );
}
