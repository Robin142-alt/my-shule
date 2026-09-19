"use client";

import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AlertCircle, CheckCircle2, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { usePermissions } from "@/components/providers/permission-context";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { isSchoolQueryForPath, useSchoolQuery } from "@/lib/data/school-hooks";
import { useOptionalSchoolTenantId } from "@/lib/data/school-tenant-scope";
import { ExamWorkflowTracker } from "../exam-workflow-tracker";
import { useVerifiedPrincipalDashboardApi } from "./verified-tenant-api";

type AcademicYear = {
  id: string;
  name: string;
  starts_on: string;
  ends_on: string;
  is_current?: boolean;
};

type AcademicTerm = {
  id: string;
  academic_year_id: string;
  name: string;
  starts_on: string;
  ends_on: string;
  is_current?: boolean;
};

type ExamSeriesResult = {
  id: string;
  exam_id: string;
  title: string;
  status: string;
  startsOn: string;
  endsOn: string;
  totalReportCards: number;
  approvedReportCards: number;
  publishedReportCards: number;
  blockedReportCards: number;
  canPublish: boolean;
};

type PrincipalExamsData = {
  status: "active" | "degraded" | "setup_required";
  activeExams: number;
  reportsPending: number;
  missingMarksAlerts: number;
  averageScore: number;
  performanceTrend: Array<{ label: string; value: number }>;
  recentResults: ExamSeriesResult[];
  releaseQueue?: ExamSeriesResult[];
};

function toDateLabel(value: string) {
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
}

export function PrincipalExamsReportsWorkspace() {
  const queryClient = useQueryClient();
  const tenantId = useOptionalSchoolTenantId();
  const { data, isLoading, error, refetch } = useSchoolQuery<PrincipalExamsData>("/admin-command/principal/exams");
  const {
    data: academicYears,
    isLoading: yearsLoading,
    error: yearsError,
    refetch: refetchYears,
  } = useSchoolQuery<AcademicYear[]>("/academics/academic-years");
  const {
    data: academicTerms,
    isLoading: termsLoading,
    error: termsError,
    refetch: refetchTerms,
  } = useSchoolQuery<AcademicTerm[]>("/academics/academic-terms");
  const requestPrincipalApi = useVerifiedPrincipalDashboardApi();
  const { hasPermission } = usePermissions();

  const [isExamModalOpen, setIsExamModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [publishingSeriesId, setPublishingSeriesId] = useState<string | null>(null);
  const [formError, setFormError] = useState("");
  const [examName, setExamName] = useState("");
  const [selectedYearId, setSelectedYearId] = useState("");
  const [selectedTermId, setSelectedTermId] = useState("");
  const [startsOn, setStartsOn] = useState("");
  const [endsOn, setEndsOn] = useState("");

  const years = Array.isArray(academicYears) ? academicYears : [];
  const terms = useMemo(
    () => Array.isArray(academicTerms) ? academicTerms : [],
    [academicTerms],
  );
  const results = Array.isArray(data?.recentResults) ? data.recentResults : [];
  const trend = Array.isArray(data?.performanceTrend) ? data.performanceTrend : [];
  const releaseQueue = Array.isArray(data?.releaseQueue)
    ? data.releaseQueue
    : results.filter((series) => series.canPublish);
  const canReleaseReportCards = hasPermission("principal:write") && hasPermission("exams:publish");
  const filteredTerms = useMemo(
    () => terms.filter((term) => term.academic_year_id === selectedYearId),
    [selectedYearId, terms],
  );

  const applyTerm = (termId: string) => {
    setSelectedTermId(termId);
    const term = terms.find((candidate) => candidate.id === termId);
    setStartsOn(term?.starts_on?.slice(0, 10) ?? "");
    setEndsOn(term?.ends_on?.slice(0, 10) ?? "");
  };

  const applyYear = (yearId: string) => {
    setSelectedYearId(yearId);
    const yearTerms = terms.filter((term) => term.academic_year_id === yearId);
    const term = yearTerms.find((candidate) => candidate.is_current) ?? yearTerms[0];
    applyTerm(term?.id ?? "");
  };

  const openExamModal = () => {
    const year = years.find((candidate) => candidate.is_current) ?? years[0];
    setExamName("");
    setFormError("");
    setIsExamModalOpen(true);
    applyYear(year?.id ?? "");
  };

  const handleCreateExam = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const term = terms.find((candidate) => candidate.id === selectedTermId);
    if (!term) {
      setFormError("Select an active academic term before creating the exam series.");
      return;
    }
    const termStart = term.starts_on.slice(0, 10);
    const termEnd = term.ends_on.slice(0, 10);
    if (!startsOn || !endsOn || startsOn > endsOn || startsOn < termStart || endsOn > termEnd) {
      setFormError(`Exam dates must fall within ${term.name} (${toDateLabel(termStart)} - ${toDateLabel(termEnd)}).`);
      return;
    }

    setIsSubmitting(true);
    setFormError("");
    try {
      await requestPrincipalApi("/admin-command/exams/cycles", {
        method: "POST",
        body: {
          name: examName.trim(),
          academic_term_id: term.id,
          starts_on: startsOn,
          ends_on: endsOn,
        },
      });
      toast.success("Exam series created.");
      setIsExamModalOpen(false);
      await refetch();
    } catch (submissionError) {
      setFormError(submissionError instanceof Error ? submissionError.message : "The exam series could not be created.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const publishSeries = async (series: ExamSeriesResult) => {
    if (!series.canPublish) return;
    setPublishingSeriesId(series.id);
    setFormError("");
    try {
      await requestPrincipalApi(`/admin-command/principal/exams-report-cards/${series.id}/publish`, { method: "POST" });
      toast.success(`${series.title} report cards published.`);
      await Promise.all([
        refetch(),
        queryClient.invalidateQueries({
          predicate: (query) => isSchoolQueryForPath(query.queryKey, tenantId, "/exams/workflow"),
        }),
      ]);
    } catch (publishError) {
      toast.error(publishError instanceof Error ? publishError.message : "The report cards could not be published.");
    } finally {
      setPublishingSeriesId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-24 rounded-xl border border-white/10 bg-white/5" />
          <div className="h-64 rounded-xl border border-white/10 bg-white/5" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <Card className="border border-red-500/20 bg-red-500/10 p-6">
        <div className="flex flex-wrap items-center gap-3">
          <AlertCircle className="h-6 w-6 text-red-500" />
          <h2 className="text-xl font-bold text-red-500">Failed to load Exams Overview</h2>
          <Button type="button" size="sm" variant="outline" onClick={() => refetch()}>Retry</Button>
        </div>
      </Card>
    );
  }

  const setupLoading = yearsLoading || termsLoading;
  const setupUnavailable = setupLoading || Boolean(yearsError || termsError) || years.length === 0 || terms.length === 0;

  return (
    <div className="space-y-6">
      <ExamWorkflowTracker heading="Exam and report-card release workflow" />
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border border-white/10 bg-white/5 p-5">
          <div className="text-sm font-semibold text-white/70">Reports Ready to Publish</div>
          <div className="mt-2 text-2xl font-black text-yellow-500">{data.reportsPending}</div>
        </Card>
        <Card className="border border-white/10 bg-white/5 p-5">
          <div className="text-sm font-semibold text-white/70">Missing Marks Alerts</div>
          <div className="mt-2 text-2xl font-black text-red-500">{data.missingMarksAlerts}</div>
        </Card>
        <Card className="border border-white/10 bg-white/5 p-5">
          <div className="text-sm font-semibold text-white/70">School Average Score</div>
          <div className="mt-2 text-2xl font-black text-white">{data.averageScore}%</div>
        </Card>
        <Card className="border border-white/10 bg-white/5 p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-white/70">Active Exams</div>
              <div className="mt-2 text-2xl font-black text-white">{data.activeExams}</div>
            </div>
            {hasPermission("exams:write") ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="bg-white/10 text-xs text-white"
                onClick={openExamModal}
                disabled={setupUnavailable}
                title={setupUnavailable ? "Configure an academic year and term before creating an exam series" : undefined}
              >
                + New Exam
              </Button>
            ) : null}
          </div>
        </Card>
      </div>

      {releaseQueue.length > 0 ? (
        <Card className="border border-emerald-500/35 bg-emerald-500/10 p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-emerald-300" />
                <h2 className="text-xl font-black text-white">Final Principal release required</h2>
              </div>
              <p className="mt-1 text-sm text-white/70">
                {releaseQueue.length} approved exam series {releaseQueue.length === 1 ? "is" : "are"} ready. Release publishes the approved report cards to authorized parent and student portals.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {releaseQueue.map((series) => (
                canReleaseReportCards ? (
                  <Button
                    key={series.id}
                    type="button"
                    disabled={Boolean(publishingSeriesId)}
                    onClick={() => publishSeries(series)}
                  >
                    {publishingSeriesId === series.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    {publishingSeriesId === series.id ? "Releasing…" : `Release ${series.title}`}
                  </Button>
                ) : (
                  <span key={series.id} className="rounded-lg border border-amber-300/20 bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-100">
                    Principal release permission is required for {series.title}.
                  </span>
                )
              ))}
            </div>
          </div>
        </Card>
      ) : null}

      {(yearsError || termsError) ? (
        <Card className="border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span>Academic setup could not be loaded, so new exam creation is temporarily unavailable.</span>
            <Button type="button" size="sm" variant="outline" onClick={() => Promise.all([refetchYears(), refetchTerms()])}>Retry setup</Button>
          </div>
        </Card>
      ) : (!setupLoading && (years.length === 0 || terms.length === 0)) ? (
        <Card className="border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100">
          Create an active academic year and term in Academic Setup before opening an exam series.
        </Card>
      ) : null}

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="flex h-full flex-col border border-white/10 bg-white/5 p-6">
          <h2 className="mb-6 text-xl font-bold text-white">Exam Performance Trend</h2>
          {trend.length === 0 ? (
            <div className="flex min-h-[200px] flex-1 flex-col items-center justify-center rounded-lg border border-white/5 bg-white/5 px-4 text-center">
              <FileText className="mb-3 h-10 w-10 text-white/20" />
              <p className="text-white/60">No reviewed marks are available for a performance trend yet.</p>
            </div>
          ) : (
            <div className="mt-4 flex min-h-[200px] flex-1 items-end gap-2">
              {trend.map((item) => (
                <div key={item.label} className="group flex flex-1 flex-col items-center gap-2">
                  <div className="relative h-[150px] w-full rounded-t-sm bg-white/5">
                    <div
                      className="absolute bottom-0 w-full rounded-t-sm bg-purple-500/50 transition-all duration-500 group-hover:bg-purple-400/60"
                      style={{ height: `${Math.max(0, Math.min(100, item.value))}%` }}
                    >
                      <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-medium text-white opacity-0 transition-opacity group-hover:opacity-100">
                        {item.value}%
                      </div>
                    </div>
                  </div>
                  <span className="text-xs text-white/50">{item.label}</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="flex h-full flex-col border border-white/10 bg-white/5 p-6">
          <div className="mb-4 border-b border-white/10 pb-4">
            <h2 className="text-xl font-bold text-white">Report-card publication</h2>
            <p className="mt-1 text-sm text-white/60">Dean and Exams Manager review remains separate. Principal publication is enabled only when the persisted report-card batch is approved and unblocked.</p>
          </div>

          {results.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center rounded-lg border border-white/5 bg-white/5 px-4 py-8 text-center">
              <FileText className="mb-3 h-10 w-10 text-white/20" />
              <p className="text-white/60">No exam series or report-card batches are available yet.</p>
            </div>
          ) : (
            <div className="space-y-3 overflow-y-auto pr-1">
              {results.map((series) => {
                const isPublished = series.status.toLowerCase() === "published" || series.publishedReportCards === series.totalReportCards && series.totalReportCards > 0;
                const guidance = series.totalReportCards === 0
                  ? "Generate report cards in the Exams Manager workspace."
                  : series.blockedReportCards > 0
                    ? `${series.blockedReportCards} report card${series.blockedReportCards === 1 ? " is" : "s are"} awaiting review or approval.`
                    : series.approvedReportCards === 0 && !isPublished
                      ? "No approved report cards are ready for publication."
                      : `${series.publishedReportCards} of ${series.totalReportCards} report cards published.`;
                return (
                  <div key={series.id} className="rounded-lg border border-white/10 bg-white/5 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-white">{series.title}</p>
                        <p className="mt-1 text-xs text-white/50">{toDateLabel(series.startsOn)} - {toDateLabel(series.endsOn)}</p>
                        <p className="mt-2 text-sm text-white/60">{guidance}</p>
                      </div>
                      {isPublished ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-300">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Published
                        </span>
                      ) : series.canPublish && canReleaseReportCards ? (
                        <Button type="button" size="sm" disabled={publishingSeriesId === series.id} onClick={() => publishSeries(series)}>
                          {publishingSeriesId === series.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                          Publish approved cards
                        </Button>
                      ) : (
                        <span className="rounded-full bg-amber-500/15 px-3 py-1 text-xs font-semibold text-amber-200">Not ready</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      <Modal open={isExamModalOpen} onClose={() => !isSubmitting && setIsExamModalOpen(false)} title="Create Exam Series">
        <form onSubmit={handleCreateExam} className="space-y-4">
          {formError ? (
            <div role="alert" className="rounded border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-600">{formError}</div>
          ) : null}
          <label className="block space-y-2 text-sm font-medium">
            Exam name
            <input value={examName} onChange={(event) => setExamName(event.target.value)} required className="w-full rounded border p-2 text-sm" placeholder="e.g. Term 1 Midterm" />
          </label>
          <label className="block space-y-2 text-sm font-medium">
            Academic year
            <select value={selectedYearId} onChange={(event) => applyYear(event.target.value)} required className="w-full rounded border bg-white p-2 text-sm text-black">
              <option value="">Select academic year</option>
              {years.map((year) => <option key={year.id} value={year.id}>{year.name}</option>)}
            </select>
          </label>
          <label className="block space-y-2 text-sm font-medium">
            Term / semester
            <select value={selectedTermId} onChange={(event) => applyTerm(event.target.value)} required className="w-full rounded border bg-white p-2 text-sm text-black">
              <option value="">Select term</option>
              {filteredTerms.map((term) => <option key={term.id} value={term.id}>{term.name}</option>)}
            </select>
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block space-y-2 text-sm font-medium">
              Starts on
              <input type="date" value={startsOn} onChange={(event) => setStartsOn(event.target.value)} required className="w-full rounded border p-2 text-sm" />
            </label>
            <label className="block space-y-2 text-sm font-medium">
              Ends on
              <input type="date" value={endsOn} onChange={(event) => setEndsOn(event.target.value)} required className="w-full rounded border p-2 text-sm" />
            </label>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" disabled={isSubmitting} onClick={() => setIsExamModalOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting || !selectedTermId || !examName.trim()}>
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Create Exam Series
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
