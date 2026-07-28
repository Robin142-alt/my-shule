"use client";

import {
  AlertTriangle,
  BarChart3,
  BookOpenCheck,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  RefreshCw,
  TrendingUp,
  Users,
} from "lucide-react";

import { AnalyticsDashboard } from "@/components/modules/exams/AnalyticsDashboard";
import { useSchoolQuery } from "@/lib/data/school-hooks";
import type { LiveExamsAnalyticsResponse } from "@/lib/modules/exams-client";

export type AcademicIntelligenceAudience =
  | "principal"
  | "deputy"
  | "dean"
  | "exams-manager"
  | "hod"
  | "teacher"
  | "class-teacher";

interface AcademicIntelligenceWorkspaceProps {
  audience: AcademicIntelligenceAudience;
  onOpenMarks?: () => void;
  onOpenInterventions?: () => void;
  onOpenReportCards?: () => void;
}

const AUDIENCE_COPY: Record<
  AcademicIntelligenceAudience,
  { eyebrow: string; title: string; description: string }
> = {
  principal: {
    eyebrow: "Whole-school outcomes",
    title: "Academic Intelligence",
    description:
      "Review approved school performance, publication readiness, data quality, and learners who need coordinated support.",
  },
  deputy: {
    eyebrow: "School academic oversight",
    title: "Academic Intelligence",
    description:
      "Track approved class and subject outcomes, missing evidence, improvement, and learners requiring operational follow-up.",
  },
  dean: {
    eyebrow: "Academic quality assurance",
    title: "Academic Intelligence",
    description:
      "Compare approved outcomes, identify quality gaps, and move evidence-based learner interventions through follow-up.",
  },
  "exams-manager": {
    eyebrow: "Examination intelligence",
    title: "Results Analysis",
    description:
      "Validate final result coverage, compare exam cycles and subjects, and prepare accurate report-card production.",
  },
  hod: {
    eyebrow: "Department-scoped outcomes",
    title: "Department Academic Intelligence",
    description:
      "Review only subjects in your active department appointment, then follow up weak outcomes and missing evidence.",
  },
  teacher: {
    eyebrow: "Assigned teaching outcomes",
    title: "My Academic Intelligence",
    description:
      "Review approved results only for your active subject or class-teacher assignments and act on learner needs.",
  },
  "class-teacher": {
    eyebrow: "Assigned class outcomes",
    title: "Class Academic Intelligence",
    description:
      "Track the approved performance and progress of learners in classes assigned to you and coordinate support.",
  },
};

function formatPercent(value: number | null | undefined) {
  return value === null || value === undefined || Number.isNaN(value)
    ? "Not available"
    : `${value.toFixed(1)}%`;
}

function scopeLabel(level: LiveExamsAnalyticsResponse["scope"]["level"] | undefined) {
  if (level === "department") return "Department scoped";
  if (level === "assignment") return "Assignment scoped";
  return "Whole school";
}

function Metric({
  label,
  value,
  helper,
  tone = "neutral",
}: {
  label: string;
  value: string;
  helper: string;
  tone?: "neutral" | "warning" | "success";
}) {
  const toneClass =
    tone === "warning"
      ? "border-[#FED7AA] bg-[#FFF7ED]"
      : tone === "success"
        ? "border-[#A7F3D0] bg-[#ECFDF5]"
        : "border-[#D8E0EC] bg-white";

  return (
    <div className={`rounded-lg border p-4 ${toneClass}`}>
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#64748B]">
        {label}
      </p>
      <p className="mt-2 text-2xl font-black text-[#071D49]">{value}</p>
      <p className="mt-1 text-xs font-medium leading-5 text-[#64748B]">{helper}</p>
    </div>
  );
}

function EmptyResults({
  onOpenMarks,
  onOpenReportCards,
}: Pick<
  AcademicIntelligenceWorkspaceProps,
  "onOpenMarks" | "onOpenReportCards"
>) {
  return (
    <div className="rounded-lg border border-dashed border-[#AAB8CC] bg-[#F8FAFC] px-6 py-10 text-center">
      <BarChart3 className="mx-auto h-9 w-9 text-[#49678F]" aria-hidden="true" />
      <h3 className="mt-3 text-lg font-black text-[#071D49]">
        No approved academic results yet
      </h3>
      <p className="mx-auto mt-2 max-w-2xl text-sm font-medium leading-6 text-[#64748B]">
        Analytics is built only from locked or published marks attached to an
        approved or published report card. Complete mark entry, moderation, and
        report-card approval to create the first truthful result set.
      </p>
      {(onOpenMarks || onOpenReportCards) && (
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          {onOpenMarks && (
            <button
              type="button"
              onClick={onOpenMarks}
              className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#071D49] px-4 py-2 text-sm font-bold text-white hover:bg-[#0B2A68]"
            >
              <ClipboardCheck className="h-4 w-4" aria-hidden="true" />
              Open marks workflow
            </button>
          )}
          {onOpenReportCards && (
            <button
              type="button"
              onClick={onOpenReportCards}
              className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[#9CB2D2] bg-white px-4 py-2 text-sm font-bold text-[#071D49] hover:bg-[#F2F6FC]"
            >
              <FileText className="h-4 w-4" aria-hidden="true" />
              Open report cards
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function AcademicIntelligenceWorkspace({
  audience,
  onOpenMarks,
  onOpenInterventions,
  onOpenReportCards,
}: AcademicIntelligenceWorkspaceProps) {
  const copy = AUDIENCE_COPY[audience];
  const {
    data,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useSchoolQuery<LiveExamsAnalyticsResponse>("/exams/analytics", {
    staleTime: 30_000,
  });

  const dataQuality = data?.data_quality ?? {
    final_mark_count: 0,
    explicit_evidence_count: 0,
    missing_or_incomplete_count: 0,
  };
  const hasApprovedResults = Number(dataQuality.final_mark_count) > 0;
  const topSubject = [...(data?.subjectPerformance ?? [])].sort(
    (left, right) => right.mean_score - left.mean_score,
  )[0];

  return (
    <section className="space-y-5" aria-labelledby="academic-intelligence-title">
      <div className="rounded-lg border border-[#C8D5E7] bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#2870D5]">
              {copy.eyebrow}
            </p>
            <h2
              id="academic-intelligence-title"
              className="mt-1 text-2xl font-black text-[#071D49]"
            >
              {copy.title}
            </h2>
            <p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-[#64748B]">
              {copy.description}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex min-h-9 items-center gap-2 rounded-full border border-[#A7F3D0] bg-[#ECFDF5] px-3 text-xs font-bold text-[#047857]">
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              {scopeLabel(data?.scope?.level)}
            </span>
            <button
              type="button"
              onClick={() => void refetch()}
              disabled={isFetching}
              className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-[#C8D5E7] bg-white px-3 text-xs font-bold text-[#071D49] hover:bg-[#F2F6FC] disabled:cursor-wait disabled:opacity-60"
            >
              <RefreshCw
                className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`}
                aria-hidden="true"
              />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-[#FCA5A5] bg-[#FEF2F2] p-4"
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-[#B91C1C]" />
            <div>
              <h3 className="font-black text-[#991B1B]">
                Academic intelligence could not be loaded
              </h3>
              <p className="mt-1 text-sm font-medium text-[#7F1D1D]">
                {error.message || "The live exams service did not respond."}
              </p>
              <button
                type="button"
                onClick={() => void refetch()}
                className="mt-3 min-h-10 rounded-lg bg-[#991B1B] px-4 text-sm font-bold text-white hover:bg-[#7F1D1D]"
              >
                Retry live data
              </button>
            </div>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Loading academic intelligence">
          {[0, 1, 2, 3].map((item) => (
            <div
              key={item}
              className="h-32 animate-pulse rounded-lg border border-[#D8E0EC] bg-[#EEF2F7]"
            />
          ))}
        </div>
      ) : data ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Metric
              label={data.scope.level === "school" ? "School average" : "Scoped average"}
              value={formatPercent(data.kpis.school_average)}
              helper="Approved numeric evidence only; missing work is never treated as zero."
              tone={data.kpis.school_average !== null ? "success" : "neutral"}
            />
            <Metric
              label="Pending moderation"
              value={String(data.kpis.pending_reviews)}
              helper="Submitted marks still waiting for an authorized academic reviewer."
              tone={data.kpis.pending_reviews > 0 ? "warning" : "success"}
            />
            <Metric
              label="Missing evidence"
              value={String(data.kpis.missing_marks_alerts)}
              helper="Expected marks that are absent, incomplete, or explicitly not assessed."
              tone={data.kpis.missing_marks_alerts > 0 ? "warning" : "success"}
            />
            <Metric
              label="Active exam cycles"
              value={String(data.kpis.active_exams)}
              helper="Current draft, submitted, or reviewed exam cycles in this authorized scope."
            />
          </div>

          {!hasApprovedResults ? (
            <EmptyResults
              onOpenMarks={onOpenMarks}
              onOpenReportCards={onOpenReportCards}
            />
          ) : (
            <>
              <AnalyticsDashboard liveData={data} />

              <div className="grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(280px,0.7fr)]">
                <div className="overflow-hidden rounded-lg border border-[#D8E0EC] bg-white">
                  <div className="border-b border-[#D8E0EC] px-5 py-4">
                    <h3 className="font-black text-[#071D49]">Subject evidence</h3>
                    <p className="mt-1 text-xs font-medium text-[#64748B]">
                      Mean, pass rate, and competency distribution from finalized marks.
                    </p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-left text-sm">
                      <thead className="bg-[#F2F6FC] text-xs uppercase tracking-[0.08em] text-[#49678F]">
                        <tr>
                          <th className="px-4 py-3">Subject</th>
                          <th className="px-4 py-3">Mean</th>
                          <th className="px-4 py-3">Pass rate</th>
                          <th className="px-4 py-3">EE</th>
                          <th className="px-4 py-3">ME</th>
                          <th className="px-4 py-3">AE</th>
                          <th className="px-4 py-3">BE</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.subjectPerformance.map((subject) => (
                          <tr
                            key={subject.subject_id}
                            className="border-t border-[#E5EAF1] text-[#233A5E]"
                          >
                            <td className="px-4 py-3 font-bold text-[#071D49]">
                              {subject.subject_name}
                            </td>
                            <td className="px-4 py-3">{formatPercent(subject.mean_score)}</td>
                            <td className="px-4 py-3">{formatPercent(subject.pass_rate)}</td>
                            <td className="px-4 py-3">{subject.ee_count}</td>
                            <td className="px-4 py-3">{subject.me_count}</td>
                            <td className="px-4 py-3">{subject.ae_count}</td>
                            <td className="px-4 py-3">{subject.be_count}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="rounded-lg border border-[#D8E0EC] bg-white p-4">
                    <div className="flex items-center gap-2">
                      <BookOpenCheck className="h-5 w-5 text-[#2870D5]" />
                      <h3 className="font-black text-[#071D49]">Result evidence</h3>
                    </div>
                    <dl className="mt-4 space-y-3 text-sm">
                      <div className="flex justify-between gap-4">
                        <dt className="font-medium text-[#64748B]">Final numeric marks</dt>
                        <dd className="font-black text-[#071D49]">
                          {dataQuality.final_mark_count}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-4">
                        <dt className="font-medium text-[#64748B]">Explicit non-score evidence</dt>
                        <dd className="font-black text-[#071D49]">
                          {dataQuality.explicit_evidence_count}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-4">
                        <dt className="font-medium text-[#64748B]">Missing or incomplete</dt>
                        <dd className="font-black text-[#B45309]">
                          {dataQuality.missing_or_incomplete_count}
                        </dd>
                      </div>
                    </dl>
                  </div>
                  <div className="rounded-lg border border-[#D8E0EC] bg-white p-4">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-[#2870D5]" />
                      <h3 className="font-black text-[#071D49]">Strongest subject</h3>
                    </div>
                    <p className="mt-3 text-lg font-black text-[#071D49]">
                      {topSubject?.subject_name ?? "Not available"}
                    </p>
                    <p className="mt-1 text-sm font-medium text-[#64748B]">
                      {topSubject
                        ? `${formatPercent(topSubject.mean_score)} mean and ${formatPercent(topSubject.pass_rate)} pass rate`
                        : "Subject results will appear after approved marks exist."}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 xl:grid-cols-3">
                <ProgressList
                  icon={Users}
                  title="Top performers"
                  empty="No ranked performance evidence is available."
                  rows={data.studentProgress.topPerformers.map((student) => ({
                    id: student.student_id,
                    title: student.student_name,
                    detail: `${student.admission_number} / ${student.assessments_taken} assessments`,
                    value: formatPercent(student.average_percentage),
                  }))}
                />
                <ProgressList
                  icon={TrendingUp}
                  title="Top improvers"
                  empty="Two approved exam cycles are required to measure improvement."
                  rows={data.studentProgress.topImprovers.map((student) => ({
                    id: student.student_id,
                    title: student.student_name,
                    detail: `${student.previous_exam_series} to ${student.latest_exam_series}`,
                    value: `+${student.improvement.toFixed(1)}%`,
                  }))}
                />
                <ProgressList
                  icon={AlertTriangle}
                  title="Needs intervention"
                  empty="No learners currently fall below the configured 50% risk threshold."
                  rows={data.studentProgress.atRiskStudents.map((student) => ({
                    id: student.student_id,
                    title: student.student_name,
                    detail: `${student.admission_number} / ${student.assessments_taken} assessments`,
                    value: formatPercent(student.average_percentage),
                  }))}
                  action={
                    onOpenInterventions
                      ? {
                          label: "Open interventions",
                          onClick: onOpenInterventions,
                        }
                      : undefined
                  }
                />
              </div>
            </>
          )}
        </>
      ) : null}
    </section>
  );
}

function ProgressList({
  icon: Icon,
  title,
  empty,
  rows,
  action,
}: {
  icon: typeof Users;
  title: string;
  empty: string;
  rows: Array<{ id: string; title: string; detail: string; value: string }>;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <div className="rounded-lg border border-[#D8E0EC] bg-white">
      <div className="flex items-center justify-between gap-3 border-b border-[#D8E0EC] px-4 py-3">
        <div className="flex items-center gap-2">
          <Icon className="h-5 w-5 text-[#2870D5]" aria-hidden="true" />
          <h3 className="font-black text-[#071D49]">{title}</h3>
        </div>
        {action && (
          <button
            type="button"
            onClick={action.onClick}
            className="min-h-9 rounded-lg border border-[#9CB2D2] px-3 text-xs font-bold text-[#0B4A9E] hover:bg-[#F2F6FC]"
          >
            {action.label}
          </button>
        )}
      </div>
      {rows.length === 0 ? (
        <p className="px-4 py-6 text-sm font-medium leading-6 text-[#64748B]">
          {empty}
        </p>
      ) : (
        <ol className="divide-y divide-[#E5EAF1]">
          {rows.map((row, index) => (
            <li key={row.id} className="flex items-center gap-3 px-4 py-3">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#EAF2FD] text-xs font-black text-[#0B4A9E]">
                {index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-black text-[#071D49]">{row.title}</p>
                <p className="truncate text-xs font-medium text-[#64748B]">{row.detail}</p>
              </div>
              <span className="shrink-0 text-sm font-black text-[#071D49]">{row.value}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
