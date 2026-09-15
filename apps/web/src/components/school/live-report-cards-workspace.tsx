"use client";

import {
  CheckCircle2,
  Eye,
  FileCheck2,
  RefreshCw,
  RotateCcw,
  Search,
  Send,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import Link from "next/link";

import {
  ReportCardActionBar,
  ReportCardDocument,
  ReportCardVerificationStrip,
} from "@/components/report-cards/report-card-document";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import { useSchoolCommandIdentity } from "@/components/school/integrated-school-command-header";
import { useSchoolQuery } from "@/lib/data/school-hooks";
import { requestSchoolApiProxy } from "@/lib/dashboard/school-api-proxy-client";
import type {
  LiveReportCardGenerationScope,
  LiveExamReportCard,
  LiveReportCardBatchStatus,
} from "@/lib/modules/exams-client";
import {
  hasPersistedReportCardSnapshot,
  mapPersistedReportCardDocument,
  type ReportCardAudience,
} from "@/lib/report-cards/live-report-card";

const audienceCopy: Record<ReportCardAudience, {
  eyebrow: string;
  title: string;
  summary: string;
  empty: string;
}> = {
  "exams-manager": {
    eyebrow: "Exams publication desk",
    title: "Report Card Generation",
    summary: "Generate persisted working drafts from locked marks, complete comments, then submit to freeze each card for academic review.",
    empty: "No report cards have been generated. Select a marked class and generate the first working-draft batch.",
  },
  dean: {
    eyebrow: "Academic review desk",
    title: "Report Card Review",
    summary: "Review the exact persisted learner report, approve valid cards, or recall cards with a correction reason.",
    empty: "No report cards are available yet. Generated cards will appear here after the Exams Manager creates them.",
  },
  principal: {
    eyebrow: "School publication desk",
    title: "Report Card Publishing",
    summary: "Preview approved report snapshots, publish them to authorized portals, or withdraw a published card with a reason.",
    empty: "No report cards are available yet. Approved cards will appear here after academic review.",
  },
};

function statusLabel(value: string) {
  const labels: Record<string, string> = {
    draft: "Draft",
    draft_generated: "Draft generated",
    regeneration_required: "Correction required",
    under_review: "Under review",
    approved: "Approved",
    published: "Published",
    withdrawn: "Withdrawn",
  };
  return labels[value.toLowerCase()] ?? value.replace(/_/g, " ");
}

function statusTone(value: string): "ok" | "warning" | "critical" {
  const status = value.toLowerCase();
  if (status === "published" || status === "approved") return "ok";
  if (status === "withdrawn" || status === "regeneration_required") return "critical";
  return "warning";
}

function displayDate(value?: string | null) {
  if (!value) return "Not recorded";
  const parsed = new Date(value);
  return Number.isNaN(parsed.valueOf())
    ? value
    : parsed.toLocaleString("en-KE", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
}

function reportCardFilename(response: Response, report: LiveExamReportCard) {
  const disposition = response.headers.get("content-disposition") ?? "";
  const encodedMatch = disposition.match(/filename\*=UTF-8''([^;]+)/i);
  const plainMatch = disposition.match(/filename="?([^";]+)"?/i);
  const upstreamName = encodedMatch?.[1]
    ? decodeURIComponent(encodedMatch[1])
    : plainMatch?.[1]?.trim();
  if (upstreamName) return upstreamName;
  const learner = report.student_name?.trim().replace(/[^a-z0-9]+/gi, "_").replace(/^_+|_+$/g, "") || "Learner";
  return `Report_Card_${learner}.pdf`;
}

async function reportCardDownloadError(response: Response) {
  const payload = await response.json().catch(() => null) as { message?: unknown } | null;
  if (typeof payload?.message === "string" && payload.message.trim()) return payload.message.trim();
  return `Report-card download failed (${response.status}).`;
}

function commentSourceLabel(value?: string) {
  if (value === "automated_performance_v1") return "Personalized from this learner’s locked performance data";
  if (value === "class_teacher_submitted") return "Submitted by the assigned class teacher";
  if (value === "manual") return "Edited and saved for this report card";
  return "Editable official report-card comment";
}

function buildGenerationScopes(scopes: LiveReportCardGenerationScope[]) {
  return scopes.map((scope) => ({
      ...scope,
      key: `${scope.exam_series_id}:${scope.class_section_id}`,
      label: `${scope.exam_series_name} - ${scope.class_name}`,
      guidance: scope.expected_mark_count === 0
        ? "No enrolled learners for this exam"
        : scope.not_ready_mark_count > 0
          ? `${scope.not_ready_mark_count} learner-subject marks need attention`
          : `${scope.ready_mark_count} finalized marks ready`,
    }))
    .sort((left, right) => left.label.localeCompare(right.label));
}

function reportMatches(report: LiveExamReportCard, search: string, status: string) {
  if (status !== "all" && report.status !== status) return false;
  if (!search) return true;
  const haystack = [
    report.student_name,
    report.admission_number,
    report.exam_series_name,
    report.term,
    report.academic_year,
    report.verification_code,
  ].filter(Boolean).join(" ").toLowerCase();
  return haystack.includes(search.toLowerCase());
}

export function LiveReportCardsWorkspace({ audience }: { audience: ReportCardAudience }) {
  const identity = useSchoolCommandIdentity();
  const copy = audienceCopy[audience];
  const reportQuery = useSchoolQuery<LiveExamReportCard[]>("/exams/report-cards?limit=50");
  const generationQuery = useSchoolQuery<LiveReportCardGenerationScope[]>(
    audience === "exams-manager" ? "/exams/report-cards/generation-scopes" : null,
    { refetchInterval: 60_000 },
  );
  const reports = useMemo(() => reportQuery.data ?? [], [reportQuery.data]);
  const generationScopes = useMemo(() => buildGenerationScopes(generationQuery.data ?? []), [generationQuery.data]);
  const [selectedScopeKey, setSelectedScopeKey] = useState("");
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [reasonByReport, setReasonByReport] = useState<Record<string, string>>({});
  const [classTeacherComment, setClassTeacherComment] = useState("");
  const [principalComment, setPrincipalComment] = useState("");
  const [busyAction, setBusyAction] = useState("");
  const [feedback, setFeedback] = useState<{ tone: "ok" | "critical"; message: string } | null>(null);
  const [rowFeedback, setRowFeedback] = useState<Record<string, { tone: "ok" | "critical"; message: string }>>({});
  const [batchStatus, setBatchStatus] = useState<LiveReportCardBatchStatus | null>(null);
  const selectedScope = generationScopes.find((scope) => scope.key === selectedScopeKey);

  const selectedReport = reports.find((report) => report.id === selectedReportId) ?? null;
  const selectedDocument = selectedReport
    ? mapPersistedReportCardDocument(selectedReport, {
        schoolName: identity.schoolName,
        logoUrl: identity.logoUrl,
        audience,
      })
    : null;
  const filteredReports = useMemo(
    () => reports.filter((report) => reportMatches(report, search.trim(), statusFilter)),
    [reports, search, statusFilter],
  );
  const statuses = useMemo(
    () => [...new Set(reports.map((report) => report.status))].sort(),
    [reports],
  );
  const counts = useMemo(() => ({
    total: reports.length,
    review: reports.filter((report) => report.status === "under_review").length,
    approved: reports.filter((report) => report.status === "approved").length,
    published: reports.filter((report) => report.status === "published").length,
  }), [reports]);

  function openPreview(report: LiveExamReportCard) {
    const document = mapPersistedReportCardDocument(report, {
      schoolName: identity.schoolName,
      logoUrl: identity.logoUrl,
      audience,
    });
    setSelectedReportId(report.id);
    setClassTeacherComment(document.comments.classTeacher ?? "");
    setPrincipalComment(document.comments.principalDeputy ?? "");
    setFeedback(null);
  }

  async function refreshReports() {
    await reportQuery.refetch();
  }

  async function runTransition(
    report: LiveExamReportCard,
    action: "submit" | "approve" | "recall" | "publish" | "unpublish",
  ) {
    const reason = reasonByReport[report.id]?.trim() ?? "";
    if ((action === "recall" || action === "unpublish") && !reason) {
      setFeedback({
        tone: "critical",
        message: `Enter a ${action === "recall" ? "correction" : "withdrawal"} reason before continuing.`,
      });
      return;
    }

    const actionKey = `${report.id}:${action}`;
    setBusyAction(actionKey);
    setFeedback(null);
    setRowFeedback((current) => ({
      ...current,
      [report.id]: { tone: "ok", message: `${action === "submit" ? "Submitting" : `${action.charAt(0).toUpperCase()}${action.slice(1)}`} report card...` },
    }));
    try {
      const result = await requestSchoolApiProxy<{ message?: string }>(
        `/exams/report-cards/${encodeURIComponent(report.id)}/transition`,
        {
          method: "PATCH",
          body: {
            action,
            ...(reason ? { reason } : {}),
          },
        },
      );
      const successMessage = result?.message ?? `Report card ${action} completed and the school workflow has been refreshed.`;
      setFeedback({ tone: "ok", message: successMessage });
      setRowFeedback((current) => ({ ...current, [report.id]: { tone: "ok", message: successMessage } }));
      setReasonByReport((current) => ({ ...current, [report.id]: "" }));
      await refreshReports();
    } catch (error) {
      const expectedStatus: Record<typeof action, string> = {
        submit: "under_review",
        approve: "approved",
        recall: "draft_generated",
        publish: "published",
        unpublish: "withdrawn",
      };
      const refreshed = await reportQuery.refetch().catch(() => null);
      const persisted = refreshed?.data?.find((candidate) => candidate.id === report.id);
      if (persisted?.status === expectedStatus[action]) {
        const reconciledMessage = `Report card ${action} completed. Its latest persisted workflow state has been confirmed.`;
        setFeedback({ tone: "ok", message: reconciledMessage });
        setRowFeedback((current) => ({ ...current, [report.id]: { tone: "ok", message: reconciledMessage } }));
        setReasonByReport((current) => ({ ...current, [report.id]: "" }));
      } else {
        const message = error instanceof Error ? error.message : `Report card ${action} failed.`;
        setFeedback({ tone: "critical", message });
        setRowFeedback((current) => ({ ...current, [report.id]: { tone: "critical", message } }));
      }
    } finally {
      setBusyAction("");
    }
  }

  async function regenerateReport(report: LiveExamReportCard) {
    const actionKey = `${report.id}:regenerate`;
    setBusyAction(actionKey);
    setFeedback(null);
    setRowFeedback((current) => ({
      ...current,
      [report.id]: { tone: "ok", message: "Regenerating this report card from the latest locked marks..." },
    }));
    try {
      await requestSchoolApiProxy("/exams/report-cards/regenerate", {
        method: "POST",
        body: {
          exam_series_id: report.exam_series_id,
          student_id: report.student_id,
          reason: reasonByReport[report.id]?.trim() || "Manual correction regeneration",
        },
      });
      const message = "A new current report-card revision was generated from approved marks and personalized comments.";
      setFeedback({ tone: "ok", message });
      setRowFeedback((current) => ({ ...current, [report.id]: { tone: "ok", message } }));
      await refreshReports();
    } catch (error) {
      const refreshed = await reportQuery.refetch().catch(() => null);
      const persisted = refreshed?.data?.find((candidate) => candidate.id === report.id);
      const regenerated = persisted
        && (Number(persisted.revision_number ?? 0) > Number(report.revision_number ?? 0)
          || persisted.verification_code !== report.verification_code);
      if (regenerated) {
        const message = "A new report-card revision was persisted and has been refreshed.";
        setFeedback({ tone: "ok", message });
        setRowFeedback((current) => ({ ...current, [report.id]: { tone: "ok", message } }));
      } else {
        const message = error instanceof Error ? error.message : "Report-card regeneration failed.";
        setFeedback({ tone: "critical", message });
        setRowFeedback((current) => ({ ...current, [report.id]: { tone: "critical", message } }));
      }
    } finally {
      setBusyAction("");
    }
  }

  async function generateBatch() {
    const scope = generationScopes.find((candidate) => candidate.key === selectedScopeKey);
    if (busyAction || generationQuery.error || generationQuery.isFetching || !scope?.ready) {
      setFeedback({
        tone: "critical",
        message: scope?.guidance ?? "Select a class whose marks have been moderated and locked.",
      });
      return;
    }

    setBusyAction("generate-batch");
    setFeedback(null);
    setBatchStatus(null);
    try {
      const result = await requestSchoolApiProxy<LiveReportCardBatchStatus>("/exams/report-cards/batches", {
        method: "POST",
        body: {
          exam_series_id: scope.exam_series_id,
          class_section_id: scope.class_section_id,
          batch_size: 200,
          offset: 0,
        },
      });
      setBatchStatus(result);
      setFeedback({
        tone: result.failed_students ? "critical" : "ok",
        message: result.failed_students
          ? `${result.completed_students} cards generated and ${result.failed_students} failed.${result.failures?.[0]?.message ? ` ${result.failures[0].message}` : " Review locked marks and retry only the affected learners."}`
          : `${result.completed_students} report-card snapshots generated for ${scope.label}.`,
      });
      await refreshReports();
    } catch (error) {
      setFeedback({
        tone: "critical",
        message: error instanceof Error ? error.message : "Report-card batch generation failed.",
      });
    } finally {
      await generationQuery.refetch();
      setBusyAction("");
    }
  }

  async function saveComments() {
    if (!selectedReport) return;
    if (!classTeacherComment.trim() && !principalComment.trim()) {
      setFeedback({ tone: "critical", message: "Enter at least one official report-card comment." });
      return;
    }

    setBusyAction(`${selectedReport.id}:comments`);
    setFeedback(null);
    try {
      await requestSchoolApiProxy(
        `/exams/report-cards/${encodeURIComponent(selectedReport.id)}/comments`,
        {
          method: "PATCH",
          body: {
            class_teacher_comment: classTeacherComment,
            principal_comment: principalComment,
          },
        },
      );
      setFeedback({
        tone: "ok",
        message: "Official comments were saved into the working draft. Submitting it will freeze the snapshot for review.",
      });
      await refreshReports();
    } catch (error) {
      setFeedback({
        tone: "critical",
        message: error instanceof Error ? error.message : "Report-card comments could not be saved.",
      });
    } finally {
      setBusyAction("");
    }
  }

  async function downloadReport(report: LiveExamReportCard) {
    const actionKey = `${report.id}:download`;
    setBusyAction(actionKey);
    setFeedback(null);
    setRowFeedback((current) => ({ ...current, [report.id]: { tone: "ok", message: "Preparing the official PDF..." } }));
    try {
      const response = await fetch(`/api/exams/report-cards/${encodeURIComponent(report.id)}/download`, {
        method: "GET",
        headers: { Accept: "application/pdf" },
        credentials: "same-origin",
        cache: "no-store",
      });
      if (!response.ok) throw new Error(await reportCardDownloadError(response));
      const blob = await response.blob();
      if (!blob.size) throw new Error("The generated report-card PDF was empty. Regenerate it and retry.");
      const objectUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = reportCardFilename(response, report);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(objectUrl);
      const message = "Official report-card PDF downloaded.";
      setFeedback({ tone: "ok", message });
      setRowFeedback((current) => ({ ...current, [report.id]: { tone: "ok", message } }));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Report-card download failed.";
      setFeedback({ tone: "critical", message });
      setRowFeedback((current) => ({ ...current, [report.id]: { tone: "critical", message } }));
    } finally {
      setBusyAction("");
    }
  }

  const queryError = reportQuery.error ?? generationQuery.error;
  const isLoading = reportQuery.isLoading || (audience === "exams-manager" && generationQuery.isLoading);

  return (
    <section className="space-y-5" aria-label={`${copy.title} workspace`}>
      <div className="rounded-2xl border border-[#C8D5EA] bg-white p-5 text-[#071D49] shadow-[0_14px_40px_rgba(7,29,73,0.09)]">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-[#1D4ED8]">{copy.eyebrow}</p>
        <div className="mt-2 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <h2 className="text-2xl font-black">{copy.title}</h2>
            <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-[#64748B]">{copy.summary}</p>
          </div>
          <StatusPill label={`${identity.schoolName} - school scoped`} tone="ok" />
        </div>
      </div>

      {feedback ? (
        <div
          className={`rounded-xl border px-4 py-3 text-sm font-semibold ${
            feedback.tone === "ok"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-red-200 bg-red-50 text-red-800"
          }`}
          role="status"
        >
          {feedback.message}
        </div>
      ) : null}

      {queryError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800">
          <p>{queryError.message}</p>
          <Button
            variant="secondary"
            size="sm"
            className="mt-3"
            onClick={() => {
              void reportQuery.refetch();
              if (audience === "exams-manager") void generationQuery.refetch();
            }}
          >
            <RefreshCw className="h-4 w-4" />
            Retry
          </Button>
        </div>
      ) : null}

      {audience === "exams-manager" ? (
        <div className="rounded-2xl border border-[#C8D5EA] bg-white p-5 text-[#071D49]">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div className="min-w-0 flex-1">
              <label htmlFor="report-generation-scope" className="text-sm font-black">
                Class and exam cycle
              </label>
              <select
                id="report-generation-scope"
                value={selectedScopeKey}
                disabled={Boolean(busyAction) || generationQuery.isLoading}
                onChange={(event) => {
                  setSelectedScopeKey(event.target.value);
                  setFeedback(null);
                  setBatchStatus(null);
                }}
                className="mt-2 h-11 w-full rounded-lg border border-[#C8D5EA] bg-white px-3 text-sm font-semibold outline-none focus:border-[#1D4ED8] xl:max-w-xl"
              >
                <option value="">Select class generation scope</option>
                {generationScopes.map((scope) => (
                  <option key={scope.key} value={scope.key}>
                    {scope.label} - {generationQuery.error ? "Readiness unavailable" : scope.ready ? "Ready" : scope.guidance}
                  </option>
                ))}
              </select>
              {generationQuery.isLoading ? <p className="mt-2 text-sm">Checking exam readiness...</p> : null}
              {!generationQuery.isLoading && !generationQuery.error && generationScopes.length === 0 ? (
                <p className="mt-2 text-sm font-semibold text-amber-700">
                  No mark sheets are available. Create the exam, assign subjects, enter marks, and lock the mark sheets first.
                </p>
              ) : null}
              {!generationQuery.isLoading && generationScopes.length > 0 && !generationScopes.some((scope) => scope.ready) ? (
                <p className="mt-2 text-sm font-semibold text-amber-700">
                  Select an exam to see its outstanding subjects. Teachers submit marks, then the Dean reviews and locks them before report cards can be generated.
                </p>
              ) : null}
            </div>
            <Button variant="secondary" onClick={() => void generationQuery.refetch()} disabled={Boolean(busyAction) || generationQuery.isFetching}>
              <RefreshCw className="h-4 w-4" />
              {generationQuery.isFetching ? "Checking..." : "Refresh readiness"}
            </Button>
            <Button
              onClick={() => void generateBatch()}
              disabled={!selectedScope?.ready || Boolean(busyAction) || Boolean(generationQuery.error) || generationQuery.isFetching}
            >
              <FileCheck2 className="h-4 w-4" />
              {busyAction === "generate-batch" ? "Generating..." : "Generate class report cards"}
            </Button>
          </div>
          {selectedScope && !generationQuery.error ? (
            <div className="mt-4 space-y-3" aria-live="polite">
              <p className="text-sm font-semibold">
                {selectedScope.ready_mark_count} of {selectedScope.expected_mark_count} learner-subject marks finalized for {selectedScope.learner_count} learners.
              </p>
              {selectedScope.blockers.length > 0 ? (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
                  <p className="font-bold">Complete these subjects before generating this class:</p>
                  <ul className="mt-2 space-y-2">
                    {selectedScope.blockers.map((subject) => (
                      <li key={subject.subject_id}>
                        <strong>{subject.subject_name}:</strong> {[
                          subject.missing_mark_count > 0 && `${subject.missing_mark_count} missing`,
                          subject.draft_mark_count > 0 && `${subject.draft_mark_count} awaiting submission`,
                          subject.submitted_mark_count > 0 && `${subject.submitted_mark_count} awaiting Dean review`,
                          subject.reviewed_mark_count > 0 && `${subject.reviewed_mark_count} awaiting locking`,
                        ].filter(Boolean).join("; ")}.
                        {subject.other_exams?.map((exam) => <p key={exam.exam_series_id} className="mt-1 text-sm">{exam.learner_count} of these learners have finalized {subject.subject_name} results under <strong>{exam.exam_name}</strong>. Those belong to a different exam record.</p>)}
                      </li>
                    ))}
                  </ul>
                  <p className="mt-3">Open Marks Entry Hub to identify the learners and assigned teachers. After submission, the Dean reviews and locks the marks.</p>
                  <Link className="mt-3 inline-flex min-h-11 items-center font-bold underline" href="/school/exams-manager/marks-entry">Open Marks Entry Hub</Link>
                </div>
              ) : selectedScope.expected_mark_count === 0 ? (
                <p className="text-sm text-amber-800">Check this class’s learner enrollments and exam subjects in Academic Setup and Exam Setup before generating report cards.</p>
              ) : null}
            </div>
          ) : null}
          {batchStatus ? (
            <div className="mt-4 space-y-3">
              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  ["Learners", batchStatus.total_students],
                  ["Generated", batchStatus.completed_students],
                  ["Failed", batchStatus.failed_students ?? 0],
                ].map(([label, value]) => (
                  <div key={String(label)} className="rounded-lg border border-[#D8E0EC] bg-[#F8FAFC] px-4 py-3">
                    <p className="text-xs font-bold uppercase text-[#64748B]">{label}</p>
                    <p className="mt-1 text-xl font-black">{value}</p>
                  </div>
                ))}
              </div>
              {batchStatus.failures?.length ? (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">
                  <p className="font-black">Generation issues</p>
                  <ul className="mt-1 list-disc space-y-1 pl-5">
                    {batchStatus.failures.map((failure) => (
                      <li key={`${failure.student_id}:${failure.message}`}>{failure.message}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["All cards", counts.total],
          ["Under review", counts.review],
          ["Approved", counts.approved],
          ["Published", counts.published],
        ].map(([label, value]) => (
          <div key={String(label)} className="rounded-xl border border-[#D8E0EC] bg-white p-4 text-[#071D49]">
            <p className="text-xs font-black uppercase tracking-[0.08em] text-[#64748B]">{label}</p>
            <p className="mt-2 text-2xl font-black">{value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-[#C8D5EA] bg-white p-4 text-[#071D49]">
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
          <label className="relative">
            <span className="sr-only">Search report cards</span>
            <Search className="pointer-events-none absolute left-3 top-3 h-5 w-5 text-[#64748B]" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search learner, admission number, exam, or verification code"
              className="h-11 w-full rounded-lg border border-[#C8D5EA] pl-10 pr-3 text-sm outline-none focus:border-[#1D4ED8]"
            />
          </label>
          <label>
            <span className="sr-only">Filter report-card status</span>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="h-11 w-full rounded-lg border border-[#C8D5EA] bg-white px-3 text-sm font-semibold outline-none focus:border-[#1D4ED8]"
            >
              <option value="all">All statuses</option>
              {statuses.map((status) => (
                <option key={status} value={status}>{statusLabel(status)}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-4 overflow-x-auto rounded-xl border border-[#D8E0EC]">
          <table className="w-full min-w-[980px] border-collapse text-left text-sm">
            <thead className="bg-[#F1F5F9] text-xs uppercase tracking-[0.06em] text-[#475569]">
              <tr>
                <th className="px-4 py-3">Learner</th>
                <th className="px-4 py-3">Exam period</th>
                <th className="px-4 py-3">Revision</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Updated</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center font-semibold text-[#64748B]">
                    Loading school report cards...
                  </td>
                </tr>
              ) : filteredReports.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center">
                    <p className="font-black text-[#071D49]">No report cards match this view.</p>
                    <p className="mt-1 text-sm font-semibold text-[#64748B]">
                      {reports.length ? "Clear the filters to see other school report cards." : copy.empty}
                    </p>
                  </td>
                </tr>
              ) : filteredReports.map((report) => {
                const status = report.status.toLowerCase();
                const reportBusy = busyAction.startsWith(`${report.id}:`);
                const needsReason =
                  (audience === "exams-manager" && status === "under_review")
                  || (audience === "dean" && status === "under_review")
                  || (audience === "principal" && status === "published");
                return (
                  <tr key={report.id} className="border-t border-[#E2E8F0] align-top">
                    <td className="px-4 py-4">
                      <p className="font-black">{report.student_name?.trim() || "Learner name unavailable"}</p>
                      <p className="mt-1 text-xs font-semibold text-[#64748B]">
                        {report.admission_number?.trim() || "Admission number unavailable"}
                      </p>
                    </td>
                    <td className="px-4 py-4">
                      <p className="font-semibold">{report.exam_series_name?.trim() || "Exam series unavailable"}</p>
                      <p className="mt-1 text-xs text-[#64748B]">
                        {[report.term, report.academic_year].filter(Boolean).join(" - ") || "Academic period unavailable"}
                      </p>
                    </td>
                    <td className="px-4 py-4 font-semibold">
                      v{report.revision_number ?? 1}
                      <p className="mt-1 text-xs font-normal text-[#64748B]">
                        {report.verification_code || "Verification pending"}
                      </p>
                    </td>
                    <td className="px-4 py-4">
                      <StatusPill label={statusLabel(report.status)} tone={statusTone(report.status)} />
                    </td>
                    <td className="px-4 py-4 text-xs font-semibold text-[#64748B]">
                      {displayDate(report.updated_at ?? report.created_at)}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex max-w-[360px] flex-wrap gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => openPreview(report)}
                          disabled={reportBusy || !hasPersistedReportCardSnapshot(report)}
                          title={hasPersistedReportCardSnapshot(report) ? "Preview persisted report snapshot" : "Persisted report data is unavailable"}
                        >
                          <Eye className="h-4 w-4" />
                          Preview
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => void downloadReport(report)}
                          disabled={reportBusy || !hasPersistedReportCardSnapshot(report)}
                        >
                          {busyAction === `${report.id}:download` ? "Downloading..." : "Download"}
                        </Button>
                        {audience === "exams-manager" && ["draft", "draft_generated", "regeneration_required"].includes(status) ? (
                          <>
                            <Button
                              size="sm"
                              onClick={() => void runTransition(report, "submit")}
                              disabled={reportBusy}
                            >
                              <Send className="h-4 w-4" />
                              {busyAction === `${report.id}:submit` ? "Submitting..." : "Submit"}
                            </Button>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => void regenerateReport(report)}
                              disabled={reportBusy}
                            >
                              <RefreshCw className="h-4 w-4" />
                              {busyAction === `${report.id}:regenerate` ? "Regenerating..." : "Regenerate"}
                            </Button>
                          </>
                        ) : null}
                        {audience === "exams-manager" && status === "under_review" ? (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => void runTransition(report, "recall")}
                            disabled={reportBusy}
                          >
                            <RotateCcw className="h-4 w-4" />
                            {busyAction === `${report.id}:recall` ? "Recalling..." : "Recall"}
                          </Button>
                        ) : null}
                        {audience === "dean" && status === "under_review" ? (
                          <>
                            <Button
                              size="sm"
                              onClick={() => void runTransition(report, "approve")}
                              disabled={reportBusy}
                            >
                              <CheckCircle2 className="h-4 w-4" />
                              {busyAction === `${report.id}:approve` ? "Approving..." : "Approve"}
                            </Button>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => void runTransition(report, "recall")}
                              disabled={reportBusy}
                            >
                              <RotateCcw className="h-4 w-4" />
                              {busyAction === `${report.id}:recall` ? "Recalling..." : "Recall"}
                            </Button>
                          </>
                        ) : null}
                        {audience === "principal" && status === "approved" ? (
                          <Button
                            size="sm"
                            onClick={() => void runTransition(report, "publish")}
                            disabled={reportBusy}
                          >
                            <Send className="h-4 w-4" />
                            {busyAction === `${report.id}:publish` ? "Publishing..." : "Publish"}
                          </Button>
                        ) : null}
                        {audience === "principal" && status === "published" ? (
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => void runTransition(report, "unpublish")}
                            disabled={reportBusy}
                          >
                            <RotateCcw className="h-4 w-4" />
                            {busyAction === `${report.id}:unpublish` ? "Withdrawing..." : "Withdraw"}
                          </Button>
                        ) : null}
                      </div>
                      {needsReason ? (
                        <textarea
                          value={reasonByReport[report.id] ?? ""}
                          onChange={(event) => setReasonByReport((current) => ({
                            ...current,
                            [report.id]: event.target.value,
                          }))}
                          placeholder={audience === "principal" ? "Required withdrawal reason" : "Required correction reason"}
                          className="mt-2 min-h-16 w-full max-w-[360px] rounded-lg border border-[#C8D5EA] px-3 py-2 text-xs outline-none focus:border-[#1D4ED8]"
                          disabled={reportBusy}
                        />
                      ) : null}
                      {rowFeedback[report.id] ? (
                        <p
                          className={`mt-2 max-w-[360px] text-xs font-semibold ${rowFeedback[report.id]?.tone === "critical" ? "text-red-700" : "text-emerald-700"}`}
                          role="status"
                          aria-live="polite"
                        >
                          {rowFeedback[report.id]?.message}
                        </p>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {selectedReport && selectedDocument ? (
        <div className="fixed inset-0 z-[100] overflow-y-auto bg-[#071D49]/80 p-3 backdrop-blur-sm md:p-6">
          <div className="mx-auto max-w-5xl rounded-2xl bg-[#EEF2F7] p-3 shadow-2xl md:p-5">
            <div className="mb-3 flex items-center justify-between gap-3 print:hidden">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.12em] text-[#1D4ED8]">Persisted snapshot preview</p>
                <p className="mt-1 font-black text-[#071D49]">{selectedDocument.learner.fullName}</p>
              </div>
              <Button variant="secondary" size="icon" onClick={() => setSelectedReportId(null)} title="Close preview">
                <X className="h-5 w-5" />
              </Button>
            </div>
            <ReportCardVerificationStrip report={selectedDocument} />
            {audience === "exams-manager"
              && ["draft_requested", "draft_generated", "draft", "regeneration_required"].includes(
                selectedReport.status,
              ) ? (
              <div className="my-3 grid gap-3 rounded-xl border border-[#C8D5EA] bg-white p-4 print:hidden md:grid-cols-2">
                <label className="text-sm font-black text-[#071D49]">
                  Class teacher comment
                  <span className="mt-1 block text-xs font-semibold text-[#64748B]">
                    {commentSourceLabel(selectedDocument.comments.classTeacherSource)}
                  </span>
                  <textarea
                    value={classTeacherComment}
                    onChange={(event) => setClassTeacherComment(event.target.value)}
                    className="mt-2 min-h-24 w-full rounded-lg border border-[#C8D5EA] px-3 py-2 text-sm font-normal outline-none focus:border-[#1D4ED8]"
                    maxLength={2000}
                  />
                </label>
                <label className="text-sm font-black text-[#071D49]">
                  Principal comment
                  <span className="mt-1 block text-xs font-semibold text-[#64748B]">
                    {commentSourceLabel(selectedDocument.comments.principalDeputySource)}
                  </span>
                  <textarea
                    value={principalComment}
                    onChange={(event) => setPrincipalComment(event.target.value)}
                    className="mt-2 min-h-24 w-full rounded-lg border border-[#C8D5EA] px-3 py-2 text-sm font-normal outline-none focus:border-[#1D4ED8]"
                    maxLength={2000}
                  />
                </label>
                <div className="md:col-span-2">
                  <Button
                    onClick={() => void saveComments()}
                    disabled={busyAction === `${selectedReport.id}:comments`}
                  >
                    {busyAction === `${selectedReport.id}:comments` ? "Saving comments..." : "Save official comments"}
                  </Button>
                </div>
              </div>
            ) : null}
            <div className="my-3">
              <ReportCardActionBar
                report={selectedDocument}
                onPrint={() => window.print()}
                onDownloadPdf={() => void downloadReport(selectedReport)}
              />
            </div>
            <ReportCardDocument report={selectedDocument} />
          </div>
        </div>
      ) : null}
    </section>
  );
}
