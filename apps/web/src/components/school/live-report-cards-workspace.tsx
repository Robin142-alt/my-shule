"use client";

import {
  CheckCircle2,
  ChevronRight,
  Download,
  Eye,
  FileCheck2,
  Printer,
  RefreshCw,
  RotateCcw,
  Search,
  Send,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
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
  ReportCardScopeSummary,
  ReportCardScopeHierarchyNode,
  BulkTransitionResult,
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

type ScopeType = "school" | "class" | "stream";

interface ActiveScope {
  type: ScopeType;
  examSeriesId?: string;
  classSectionId?: string;
  classLabel?: string;
  streamId?: string;
  streamLabel?: string;
}

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
  if (value === "automated_performance_v1") return "Personalized from this learner's locked performance data";
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

function buildScopeQueryString(scope: ActiveScope, examSeriesId?: string): string {
  const parts: string[] = [];
  const eid = scope.examSeriesId || examSeriesId;
  if (eid) parts.push(`exam_series_id=${encodeURIComponent(eid)}`);
  if (scope.classSectionId) parts.push(`class_section_id=${encodeURIComponent(scope.classSectionId)}`);
  if (scope.streamId) parts.push(`stream_id=${encodeURIComponent(scope.streamId)}`);
  return parts.join("&");
}

function scopeBreadcrumbLabel(scope: ActiveScope, schoolName: string): string {
  if (scope.type === "stream" && scope.streamLabel) return scope.streamLabel;
  if (scope.type === "class" && scope.classLabel) return scope.classLabel;
  return schoolName;
}

function bulkActionForAudience(audience: ReportCardAudience): "submit" | "approve" | "publish" | null {
  if (audience === "exams-manager") return "submit";
  if (audience === "dean") return "approve";
  if (audience === "principal") return "publish";
  return null;
}

function bulkActionLabel(action: string): string {
  const labels: Record<string, string> = {
    submit: "Submit All Eligible",
    approve: "Approve All Eligible",
    publish: "Publish All Eligible",
  };
  return labels[action] ?? action;
}

export function LiveReportCardsWorkspace({ audience }: { audience: ReportCardAudience }) {
  const identity = useSchoolCommandIdentity();
  const copy = audienceCopy[audience];

  // --- Scope state ---
  const [scope, setScope] = useState<ActiveScope>({ type: "school" });
  const [examSeriesFilter, setExamSeriesFilter] = useState("");
  const scopeQs = buildScopeQueryString(scope, examSeriesFilter);
  const reportPath = `/exams/report-cards/scoped?limit=200${scopeQs ? `&${scopeQs}` : ""}`;
  const summaryPath = `/exams/report-cards/scope-summary?action=${bulkActionForAudience(audience) ?? "submit"}${scopeQs ? `&${scopeQs}` : ""}`;
  const hierarchyPath = `/exams/report-cards/scope-hierarchy?${scopeQs}`;

  // --- Data queries ---
  const reportQuery = useSchoolQuery<LiveExamReportCard[]>(reportPath);
  const summaryQuery = useSchoolQuery<ReportCardScopeSummary>(summaryPath);
  const hierarchyQuery = useSchoolQuery<ReportCardScopeHierarchyNode[]>(hierarchyPath);
  const generationQuery = useSchoolQuery<LiveReportCardGenerationScope[]>(
    audience === "exams-manager" ? "/exams/report-cards/generation-scopes" : null,
    { refetchInterval: 60_000 },
  );

  const reports = useMemo(() => reportQuery.data ?? [], [reportQuery.data]);
  const scopeSummary = summaryQuery.data ?? null;
  const hierarchy = useMemo(() => hierarchyQuery.data ?? [], [hierarchyQuery.data]);
  const generationScopes = useMemo(() => buildGenerationScopes(generationQuery.data ?? []), [generationQuery.data]);

  // --- Selection state ---
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
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
  const [bulkResult, setBulkResult] = useState<BulkTransitionResult | null>(null);
  const [bulkReason, setBulkReason] = useState("");
  const [confirmAction, setConfirmAction] = useState<{ action: string; label: string } | null>(null);
  const selectedScope = generationScopes.find((s) => s.key === selectedScopeKey);

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
    total: scopeSummary?.total_cards ?? reports.length,
    review: scopeSummary?.status_counts?.under_review ?? reports.filter((r) => r.status === "under_review").length,
    approved: scopeSummary?.status_counts?.approved ?? reports.filter((r) => r.status === "approved").length,
    published: scopeSummary?.status_counts?.published ?? reports.filter((r) => r.status === "published").length,
    eligible: scopeSummary?.eligible_cards ?? 0,
  }), [reports, scopeSummary]);

  const examSeriesOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const report of reports) {
      if (report.exam_series_id && report.exam_series_name) {
        seen.set(report.exam_series_id, report.exam_series_name);
      }
    }
    return [...seen.entries()].map(([id, name]) => ({ id, name }));
  }, [reports]);

  const allFilteredSelected = filteredReports.length > 0 && filteredReports.every((r) => selectedIds.has(r.id));

  const toggleSelectAll = useCallback(() => {
    if (allFilteredSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredReports.map((r) => r.id)));
    }
  }, [allFilteredSelected, filteredReports]);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // --- Scope navigation ---
  function navigateScope(next: ActiveScope) {
    setScope(next);
    setSelectedIds(new Set());
    setFeedback(null);
    setBulkResult(null);
    setConfirmAction(null);
    setSearch("");
    setStatusFilter("all");
  }

  function drillToClass(node: ReportCardScopeHierarchyNode) {
    navigateScope({
      type: "class",
      examSeriesId: scope.examSeriesId || examSeriesFilter || undefined,
      classSectionId: node.class_section_id,
      classLabel: node.class_name,
    });
  }

  function drillToStream(classNode: ReportCardScopeHierarchyNode, stream: { stream_id: string; stream_name: string }) {
    navigateScope({
      type: "stream",
      examSeriesId: scope.examSeriesId || examSeriesFilter || undefined,
      classSectionId: classNode.class_section_id,
      classLabel: classNode.class_name,
      streamId: stream.stream_id,
      streamLabel: stream.stream_name,
    });
  }

  function navigateUp(target: ScopeType) {
    if (target === "school") {
      navigateScope({ type: "school", examSeriesId: scope.examSeriesId });
    } else if (target === "class") {
      navigateScope({
        type: "class",
        examSeriesId: scope.examSeriesId,
        classSectionId: scope.classSectionId,
        classLabel: scope.classLabel,
      });
    }
  }

  // --- Preview ---
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

  // --- Refresh ---
  async function refreshAll() {
    await Promise.allSettled([
      reportQuery.refetch(),
      summaryQuery.refetch(),
      hierarchyQuery.refetch(),
    ]);
  }

  // --- Individual transitions ---
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
      await refreshAll();
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

  // --- Bulk transition ---
  async function runBulkTransition(action: "submit" | "approve" | "recall" | "publish" | "unpublish") {
    const reason = bulkReason.trim();
    if ((action === "recall" || action === "unpublish") && !reason) {
      setFeedback({ tone: "critical", message: `Enter a reason before bulk ${action}.` });
      return;
    }

    setBusyAction(`bulk:${action}`);
    setFeedback(null);
    setBulkResult(null);
    try {
      const body: Record<string, unknown> = { action };
      if (reason) body.reason = reason;
      if (scope.examSeriesId || examSeriesFilter) body.exam_series_id = scope.examSeriesId || examSeriesFilter;
      if (scope.classSectionId) body.class_section_id = scope.classSectionId;
      if (scope.streamId) body.stream_id = scope.streamId;

      if (selectedIds.size > 0) {
        body.report_card_ids = [...selectedIds];
      }

      const result = await requestSchoolApiProxy<BulkTransitionResult>(
        "/exams/report-cards/bulk-transition",
        { method: "POST", body },
      );
      setBulkResult(result);
      setFeedback({
        tone: result.transitioned > 0 ? "ok" : "critical",
        message: `${result.transitioned} of ${result.total_in_scope} report cards ${action === "submit" ? "submitted" : action === "approve" ? "approved" : action === "publish" ? "published" : action + "ed"}. ${result.skipped} skipped (ineligible status).`,
      });
      setSelectedIds(new Set());
      setBulkReason("");
      await refreshAll();
    } catch (error) {
      setFeedback({
        tone: "critical",
        message: error instanceof Error ? error.message : `Bulk ${action} failed.`,
      });
    } finally {
      setBusyAction("");
    }
  }

  // --- Regenerate ---
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
      await refreshAll();
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

  // --- Batch generation ---
  async function generateBatch() {
    const batchScope = generationScopes.find((candidate) => candidate.key === selectedScopeKey);
    if (busyAction || generationQuery.error || generationQuery.isFetching || !batchScope?.ready) {
      setFeedback({
        tone: "critical",
        message: batchScope?.guidance ?? "Select a class whose marks have been moderated and locked.",
      });
      return;
    }

    setBusyAction("generate-batch");
    setFeedback(null);
    setBatchStatus(null);
    let progress: LiveReportCardBatchStatus = {
      id: "", status: "draft_requested", queue_status: "running",
      total_students: batchScope.learner_count, completed_students: 0, failed_students: 0,
      reused_students: 0, failures: [], duration_ms: 0,
    };
    try {
      setBatchStatus(progress);
      let offset = 0;
      while (offset < batchScope.learner_count) {
        const result = await requestSchoolApiProxy<LiveReportCardBatchStatus>("/exams/report-cards/batches", {
          method: "POST",
          body: {
            exam_series_id: batchScope.exam_series_id,
            class_section_id: batchScope.class_section_id,
            batch_size: 25,
            offset,
          },
        });
        if (result.total_students <= 0) throw new Error("No learners were processed. Refresh class readiness before retrying.");
        progress = {
          ...progress, id: result.id,
          completed_students: progress.completed_students + result.completed_students,
          failed_students: (progress.failed_students ?? 0) + (result.failed_students ?? 0),
          reused_students: (progress.reused_students ?? 0) + (result.reused_students ?? 0),
          duration_ms: (progress.duration_ms ?? 0) + (result.duration_ms ?? 0),
          failures: [...(progress.failures ?? []), ...(result.failures ?? [])],
        };
        offset += result.total_students;
        setBatchStatus(progress);
        if (result.failures?.some(failure => failure.code === "REPORT_SCHEMA_MISMATCH")) break;
      }
      const pending = Math.max(0, progress.total_students - progress.completed_students - (progress.failed_students ?? 0));
      progress = { ...progress, queue_status: progress.failed_students || pending ? "failed" : "completed" };
      setBatchStatus(progress);
      setFeedback({
        tone: progress.failed_students || pending ? "critical" : "ok",
        message: progress.failed_students || pending
          ? `${progress.completed_students} cards ready, ${progress.failed_students ?? 0} failed and ${pending} not yet processed. ${progress.failures?.[0]?.message ?? "Retry generation to finish the class; completed cards will be reused."}`
          : `${progress.completed_students} report-card snapshots generated for ${batchScope.label}.${progress.reused_students ? ` ${progress.reused_students} unchanged cards reused.` : ""}`,
      });
    } catch (error) {
      setBatchStatus({ ...progress, queue_status: "failed" });
      setFeedback({
        tone: "critical",
        message: `${error instanceof Error ? error.message : "Report-card batch generation failed."}${progress.completed_students ? ` ${progress.completed_students} completed cards are saved. Retry generation to continue safely.` : ""}`,
      });
    } finally {
      await Promise.allSettled([refreshAll(), generationQuery.refetch()]);
      setBusyAction("");
    }
  }

  // --- Comments ---
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
      await refreshAll();
    } catch (error) {
      setFeedback({
        tone: "critical",
        message: error instanceof Error ? error.message : "Report-card comments could not be saved.",
      });
    } finally {
      setBusyAction("");
    }
  }

  // --- Individual download ---
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

  // --- Bulk PDF params ---
  function buildBulkPdfParams(): URLSearchParams {
    const params = new URLSearchParams();
    const eid = scope.examSeriesId || examSeriesFilter;
    if (eid) params.set("exam_series_id", eid);
    if (scope.classSectionId) params.set("class_section_id", scope.classSectionId);
    if (scope.streamId) params.set("stream_id", scope.streamId);
    if (selectedIds.size > 0) {
      params.set("report_card_ids", [...selectedIds].join(","));
    }
    return params;
  }

  // --- Bulk download ---
  async function bulkDownload() {
    setBusyAction("bulk:download");
    setFeedback(null);
    try {
      const params = buildBulkPdfParams();
      const response = await fetch(`/api/exams/report-cards/bulk-download-pdf?${params.toString()}`, {
        method: "GET",
        headers: { Accept: "application/pdf" },
        credentials: "same-origin",
        cache: "no-store",
      });
      if (!response.ok) throw new Error(await reportCardDownloadError(response));
      const blob = await response.blob();
      if (!blob.size) throw new Error("The bulk PDF download was empty.");
      const objectUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = `report-cards-${scope.type}-${Date.now()}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(objectUrl);
      setFeedback({ tone: "ok", message: "Bulk report-card PDF downloaded." });
    } catch (error) {
      setFeedback({
        tone: "critical",
        message: error instanceof Error ? error.message : "Bulk download failed.",
      });
    } finally {
      setBusyAction("");
    }
  }

  // --- Bulk print ---
  async function bulkPrint() {
    setBusyAction("bulk:print");
    setFeedback(null);
    try {
      const params = buildBulkPdfParams();
      const response = await fetch(`/api/exams/report-cards/bulk-download-pdf?${params.toString()}`, {
        method: "GET",
        headers: { Accept: "application/pdf" },
        credentials: "same-origin",
        cache: "no-store",
      });
      if (!response.ok) throw new Error(await reportCardDownloadError(response));
      const blob = await response.blob();
      if (!blob.size) throw new Error("The bulk PDF was empty.");
      const objectUrl = window.URL.createObjectURL(blob);
      const printWindow = window.open(objectUrl, "_blank");
      if (printWindow) {
        printWindow.addEventListener("load", () => { printWindow.print(); });
      } else {
        const link = document.createElement("a");
        link.href = objectUrl;
        link.download = `report-cards-print-${Date.now()}.pdf`;
        document.body.appendChild(link);
        link.click();
        link.remove();
      }
      setTimeout(() => window.URL.revokeObjectURL(objectUrl), 60_000);
      setFeedback({ tone: "ok", message: selectedIds.size > 0 ? `${selectedIds.size} report-card PDF(s) opened for printing.` : "Report-card PDF opened for printing." });
    } catch (error) {
      setFeedback({
        tone: "critical",
        message: error instanceof Error ? error.message : "Print preparation failed.",
      });
    } finally {
      setBusyAction("");
    }
  }

  // --- Confirmation dialog helpers ---
  function requestBulkAction(action: string, label: string) {
    setConfirmAction({ action, label });
  }

  function confirmAndRunBulkAction() {
    if (!confirmAction) return;
    setConfirmAction(null);
    void runBulkTransition(confirmAction.action as "submit" | "approve" | "recall" | "publish" | "unpublish");
  }

  const queryError = reportQuery.error ?? generationQuery.error;
  const isLoading = reportQuery.isLoading || (audience === "exams-manager" && generationQuery.isLoading);
  const primaryAction = bulkActionForAudience(audience);

  return (
    <section className="space-y-5" aria-label={`${copy.title} workspace`}>
      {/* Header */}
      <div className="rounded-2xl border border-[#C8D5EA] bg-white p-5 text-[#071D49] shadow-[0_14px_40px_rgba(7,29,73,0.09)]">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-[#1D4ED8]">{copy.eyebrow}</p>
        <div className="mt-2 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <h2 className="text-2xl font-black">{copy.title}</h2>
            <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-[#64748B]">{copy.summary}</p>
          </div>
          <StatusPill label={`${scopeBreadcrumbLabel(scope, identity.schoolName)} - ${scope.type} scoped`} tone="ok" />
        </div>
      </div>

      {/* Scope breadcrumb navigation */}
      <nav className="flex items-center gap-1 text-sm font-semibold text-[#071D49]" aria-label="Report card scope">
        <button
          className={`rounded px-2 py-1 hover:bg-[#EEF2F7] ${scope.type === "school" ? "font-black text-[#1D4ED8]" : ""}`}
          onClick={() => navigateUp("school")}
        >
          {identity.schoolName}
        </button>
        {scope.type !== "school" && scope.classLabel ? (
          <>
            <ChevronRight className="h-4 w-4 text-[#94A3B8]" />
            <button
              className={`rounded px-2 py-1 hover:bg-[#EEF2F7] ${scope.type === "class" ? "font-black text-[#1D4ED8]" : ""}`}
              onClick={() => navigateUp("class")}
            >
              {scope.classLabel}
            </button>
          </>
        ) : null}
        {scope.type === "stream" && scope.streamLabel ? (
          <>
            <ChevronRight className="h-4 w-4 text-[#94A3B8]" />
            <span className="font-black text-[#1D4ED8]">{scope.streamLabel}</span>
          </>
        ) : null}
      </nav>

      {/* Exam series filter */}
      {scope.type === "school" && examSeriesOptions.length > 1 ? (
        <div className="rounded-2xl border border-[#C8D5EA] bg-white p-4">
          <label className="text-sm font-black text-[#071D49]">
            Filter by exam
            <select
              value={examSeriesFilter}
              onChange={(event) => {
                setExamSeriesFilter(event.target.value);
                setSelectedIds(new Set());
                setBulkResult(null);
              }}
              className="ml-3 h-10 rounded-lg border border-[#C8D5EA] bg-white px-3 text-sm font-semibold outline-none focus:border-[#1D4ED8]"
            >
              <option value="">All exams</option>
              {examSeriesOptions.map((opt) => (
                <option key={opt.id} value={opt.id}>{opt.name}</option>
              ))}
            </select>
          </label>
        </div>
      ) : null}

      {/* Feedback banner */}
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

      {/* Bulk result summary */}
      {bulkResult ? (
        <div className="rounded-xl border border-[#C8D5EA] bg-white p-4 text-sm">
          <p className="font-black text-[#071D49]">Bulk {bulkResult.action} result</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-[#D8E0EC] bg-[#F8FAFC] px-4 py-3">
              <p className="text-xs font-bold uppercase text-[#64748B]">Total in scope</p>
              <p className="mt-1 text-xl font-black">{bulkResult.total_in_scope}</p>
            </div>
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
              <p className="text-xs font-bold uppercase text-emerald-700">Transitioned</p>
              <p className="mt-1 text-xl font-black text-emerald-800">{bulkResult.transitioned}</p>
            </div>
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
              <p className="text-xs font-bold uppercase text-amber-700">Skipped</p>
              <p className="mt-1 text-xl font-black text-amber-800">{bulkResult.skipped}</p>
            </div>
          </div>
          {bulkResult.cards.length > 0 ? (
            <details className="mt-3">
              <summary className="cursor-pointer font-semibold text-[#1D4ED8]">
                View {bulkResult.cards.length} transitioned cards
              </summary>
              <ul className="mt-2 max-h-48 space-y-1 overflow-y-auto pl-4 text-xs">
                {bulkResult.cards.map((card) => (
                  <li key={card.id}>
                    <span className="font-semibold">{card.student_name}</span>
                    <span className="text-[#64748B]"> {statusLabel(card.previous_status)} → {statusLabel(card.new_status)}</span>
                  </li>
                ))}
              </ul>
            </details>
          ) : null}
          <button
            className="mt-3 text-xs font-semibold text-[#64748B] underline"
            onClick={() => setBulkResult(null)}
          >
            Dismiss
          </button>
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
              void refreshAll();
              if (audience === "exams-manager") void generationQuery.refetch();
            }}
          >
            <RefreshCw className="h-4 w-4" />
            Retry
          </Button>
        </div>
      ) : null}

      {/* Class/stream hierarchy navigation */}
      {scope.type === "school" && hierarchy.length > 0 ? (
        <div className="rounded-2xl border border-[#C8D5EA] bg-white p-4 text-[#071D49]">
          <p className="text-sm font-black">Drill down by class</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {hierarchy.map((node) => (
              <button
                key={node.class_section_id}
                className="flex items-center justify-between rounded-lg border border-[#D8E0EC] px-4 py-3 text-left hover:border-[#1D4ED8] hover:bg-[#F8FAFC]"
                onClick={() => drillToClass(node)}
              >
                <div>
                  <p className="font-black">{node.class_name}</p>
                  <p className="mt-1 text-xs text-[#64748B]">
                    {node.card_count} cards
                    {node.streams.length > 0 ? ` · ${node.streams.length} streams` : ""}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-[#94A3B8]" />
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {scope.type === "class" && hierarchy.length > 0 ? (() => {
        const classNode = hierarchy.find((n) => n.class_section_id === scope.classSectionId);
        if (!classNode?.streams.length) return null;
        return (
          <div className="rounded-2xl border border-[#C8D5EA] bg-white p-4 text-[#071D49]">
            <p className="text-sm font-black">Drill down by stream</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {classNode.streams.map((stream) => (
                <button
                  key={stream.stream_id}
                  className="flex items-center justify-between rounded-lg border border-[#D8E0EC] px-4 py-3 text-left hover:border-[#1D4ED8] hover:bg-[#F8FAFC]"
                  onClick={() => drillToStream(classNode, stream)}
                >
                  <div>
                    <p className="font-black">{stream.stream_name}</p>
                    <p className="mt-1 text-xs text-[#64748B]">{stream.card_count} cards</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-[#94A3B8]" />
                </button>
              ))}
            </div>
          </div>
        );
      })() : null}

      {/* Generation panel (exams-manager only) */}
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
                {generationScopes.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.label} - {generationQuery.error ? "Readiness unavailable" : s.ready ? "Ready" : s.guidance}
                  </option>
                ))}
              </select>
              {generationQuery.isLoading ? <p className="mt-2 text-sm">Checking exam readiness...</p> : null}
              {!generationQuery.isLoading && !generationQuery.error && generationScopes.length === 0 ? (
                <p className="mt-2 text-sm font-semibold text-amber-700">
                  No mark sheets are available. Create the exam, assign subjects, enter marks, and lock the mark sheets first.
                </p>
              ) : null}
              {!generationQuery.isLoading && generationScopes.length > 0 && !generationScopes.some((s) => s.ready) ? (
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
                      </li>
                    ))}
                  </ul>
                  <p className="mt-3">Open Marks Entry Hub to identify the learners and assigned teachers. After submission, the Dean reviews and locks the marks.</p>
                  <Link className="mt-3 inline-flex min-h-11 items-center font-bold underline" href="/school/exams-manager/marks-entry">Open Marks Entry Hub</Link>
                </div>
              ) : selectedScope.expected_mark_count === 0 ? (
                <p className="text-sm text-amber-800">Check this class's learner enrollments and exam subjects in Academic Setup and Exam Setup before generating report cards.</p>
              ) : null}
            </div>
          ) : null}
          {batchStatus ? (
            <div className="mt-4 space-y-3">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {[
                  ["Learners", batchStatus.total_students],
                  ["Generated", batchStatus.completed_students],
                  ["Failed", batchStatus.failed_students ?? 0],
                  ["Not yet processed", Math.max(0, batchStatus.total_students - batchStatus.completed_students - (batchStatus.failed_students ?? 0))],
                ].map(([label, value]) => (
                  <div key={String(label)} className="rounded-lg border border-[#D8E0EC] bg-[#F8FAFC] px-4 py-3">
                    <p className="text-xs font-bold uppercase text-[#64748B]">{label}</p>
                    <p className="mt-1 text-xl font-black">{value}</p>
                  </div>
                ))}
              </div>
              <p className="break-all text-xs text-[#64748B]" role="status" aria-live="polite">
                {batchStatus.queue_status === "running" ? "Generating report cards… " : ""}
                {batchStatus.id ? `Batch reference: ${batchStatus.id}. ` : ""}
                {batchStatus.reused_students ? `${batchStatus.reused_students} unchanged cards reused. ` : ""}
                {batchStatus.duration_ms ? `Processing time: ${(batchStatus.duration_ms / 1000).toFixed(1)} seconds.` : ""}
              </p>
              {batchStatus.failures?.length ? (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">
                  <p className="font-black">Generation issues</p>
                  <ul className="mt-1 list-disc space-y-1 pl-5">
                    {batchStatus.failures.map((failure) => (
                      <li key={`${failure.student_id}:${failure.message}`}>
                        <span className="font-black">{failure.student_name || `Learner ${failure.student_id}`}:</span> {failure.message}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Stats cards */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {[
          ["All cards", counts.total],
          ["Under review", counts.review],
          ["Approved", counts.approved],
          ["Published", counts.published],
          ["Eligible", counts.eligible],
        ].map(([label, value]) => (
          <div key={String(label)} className="rounded-xl border border-[#D8E0EC] bg-white p-4 text-[#071D49]">
            <p className="text-xs font-black uppercase tracking-[0.08em] text-[#64748B]">{label}</p>
            <p className="mt-2 text-2xl font-black">{value}</p>
          </div>
        ))}
      </div>

      {/* Scope summary and action bar */}
      <div className="rounded-2xl border border-[#C8D5EA] bg-white p-4 text-[#071D49]">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
          <span className="font-black">{counts.total} report cards</span>
          {primaryAction && counts.eligible > 0 ? (
            <span className="text-emerald-700 font-semibold">{counts.eligible} eligible for {primaryAction}</span>
          ) : null}
          {counts.total > 0 && counts.eligible < counts.total ? (
            <span className="text-[#64748B] font-semibold">{counts.total - counts.eligible} not eligible</span>
          ) : null}
        </div>

        {selectedIds.size > 0 ? (
          <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-[#1D4ED8]/20 bg-[#EEF2F7] px-3 py-2">
            <span className="text-sm font-black text-[#1D4ED8]">{selectedIds.size} selected</span>
            {primaryAction ? (
              <Button
                size="sm"
                onClick={() => requestBulkAction(primaryAction, `${primaryAction.charAt(0).toUpperCase()}${primaryAction.slice(1)} ${selectedIds.size} selected`)}
                disabled={Boolean(busyAction)}
              >
                <Send className="h-4 w-4" />
                {busyAction === `bulk:${primaryAction}` ? "Processing..." : `${primaryAction.charAt(0).toUpperCase()}${primaryAction.slice(1)} Selected`}
              </Button>
            ) : null}
            <Button variant="secondary" size="sm" onClick={() => void bulkPrint()} disabled={Boolean(busyAction)}>
              <Printer className="h-4 w-4" />
              {busyAction === "bulk:print" ? "Preparing..." : "Print Selected"}
            </Button>
            <Button variant="secondary" size="sm" onClick={() => void bulkDownload()} disabled={Boolean(busyAction)}>
              <Download className="h-4 w-4" />
              {busyAction === "bulk:download" ? "Downloading..." : "Download Selected"}
            </Button>
            <button className="ml-auto text-xs font-semibold text-[#64748B] underline" onClick={() => setSelectedIds(new Set())}>
              Clear selection
            </button>
          </div>
        ) : null}

        <div className="mt-3 flex flex-wrap items-center gap-2">
          {primaryAction && counts.eligible > 0 ? (
            <Button
              size="sm"
              onClick={() => requestBulkAction(primaryAction, bulkActionLabel(primaryAction))}
              disabled={Boolean(busyAction) || counts.eligible === 0}
            >
              <Send className="h-4 w-4" />
              {busyAction === `bulk:${primaryAction}` ? "Processing..." : `${primaryAction.charAt(0).toUpperCase()}${primaryAction.slice(1)} all ${counts.eligible} eligible`}
            </Button>
          ) : null}
          <Button
            variant="secondary"
            size="sm"
            onClick={() => void bulkPrint()}
            disabled={Boolean(busyAction) || counts.total === 0}
          >
            <Printer className="h-4 w-4" />
            {busyAction === "bulk:print" ? "Preparing..." : `Print all ${counts.total}`}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => void bulkDownload()}
            disabled={Boolean(busyAction) || counts.total === 0}
          >
            <Download className="h-4 w-4" />
            {busyAction === "bulk:download" ? "Downloading..." : `Download all ${counts.total}`}
          </Button>
          {(audience === "exams-manager" || audience === "dean") ? (
            <input
              value={bulkReason}
              onChange={(e) => setBulkReason(e.target.value)}
              placeholder="Reason (for recall/unpublish)"
              className="h-9 max-w-xs rounded-lg border border-[#C8D5EA] px-3 text-xs outline-none focus:border-[#1D4ED8]"
            />
          ) : null}
          <Button
            variant="secondary"
            size="sm"
            onClick={() => void refreshAll()}
            disabled={Boolean(busyAction)}
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Confirmation dialog */}
      {confirmAction ? (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-[#071D49]/60 backdrop-blur-sm" onClick={() => setConfirmAction(null)}>
          <div className="mx-4 w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl text-[#071D49]" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-black">{confirmAction.label}?</h3>
            <div className="mt-4 space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-[#64748B]">Scope:</span>
                <span className="font-black">
                  {identity.schoolName}
                  {scope.classLabel ? ` / ${scope.classLabel}` : ""}
                  {scope.streamLabel ? ` / ${scope.streamLabel}` : ""}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-3 mt-3">
                <div className="rounded-lg border border-[#D8E0EC] bg-[#F8FAFC] px-3 py-2 text-center">
                  <p className="text-xs font-bold text-[#64748B]">Total</p>
                  <p className="text-xl font-black">{selectedIds.size > 0 ? selectedIds.size : counts.total}</p>
                </div>
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-center">
                  <p className="text-xs font-bold text-emerald-700">Eligible</p>
                  <p className="text-xl font-black text-emerald-800">{selectedIds.size > 0 ? selectedIds.size : counts.eligible}</p>
                </div>
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-center">
                  <p className="text-xs font-bold text-amber-700">Not eligible</p>
                  <p className="text-xl font-black text-amber-800">{selectedIds.size > 0 ? 0 : counts.total - counts.eligible}</p>
                </div>
              </div>
            </div>
            <div className="mt-5 flex items-center gap-3">
              <Button variant="secondary" onClick={() => setConfirmAction(null)}>Cancel</Button>
              <Button onClick={confirmAndRunBulkAction}>
                <Send className="h-4 w-4" />
                {confirmAction.label}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Search and filter */}
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
          <table className="w-full min-w-[1040px] border-collapse text-left text-sm">
            <thead className="bg-[#F1F5F9] text-xs uppercase tracking-[0.06em] text-[#475569]">
              <tr>
                <th className="w-10 px-3 py-3">
                  <input
                    type="checkbox"
                    checked={allFilteredSelected}
                    onChange={toggleSelectAll}
                    className="h-4 w-4 rounded border-[#C8D5EA]"
                    aria-label="Select all visible report cards"
                  />
                </th>
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
                  <td colSpan={7} className="px-4 py-10 text-center font-semibold text-[#64748B]">
                    Loading report cards for {scopeBreadcrumbLabel(scope, identity.schoolName)}...
                  </td>
                </tr>
              ) : filteredReports.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center">
                    <p className="font-black text-[#071D49]">No report cards match this view.</p>
                    <p className="mt-1 text-sm font-semibold text-[#64748B]">
                      {reports.length ? "Clear the filters to see other report cards in this scope." : copy.empty}
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
                    <td className="px-3 py-4">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(report.id)}
                        onChange={() => toggleSelect(report.id)}
                        className="h-4 w-4 rounded border-[#C8D5EA]"
                        aria-label={`Select ${report.student_name}`}
                      />
                    </td>
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

      {/* Preview modal */}
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
