"use client";

import { useCallback, useMemo, useState } from "react";
import {
  ChevronRight,
  Download,
  Printer,
  RefreshCw,
  RotateCcw,
  Search,
  Send,
} from "lucide-react";
import { toast } from "sonner";

import type {
  BulkTransitionResult,
  LiveExamReportCard,
  ReportCardScopeHierarchyNode,
  ReportCardScopeSummary,
} from "@/lib/modules/exams-client";
import { Button } from "@/components/ui/button";
import { useSchoolCommandIdentity } from "@/components/school/integrated-school-command-header";
import { useSchoolQuery } from "@/lib/data/school-hooks";
import { requestSchoolApiProxy } from "@/lib/dashboard/school-api-proxy-client";
import { transitionReportCard } from "./api-client";
import { Panel, StatusChip, type Tone } from "./shared";

// ── Scope types ──

interface ActiveScope {
  type: "school" | "class" | "stream";
  examSeriesId?: string;
  classSectionId?: string;
  classLabel?: string;
  streamId?: string;
  streamLabel?: string;
}

const SUBMITTABLE_STATUSES = new Set([
  "draft",
  "draft_generated",
  "regeneration_required",
]);

function statusLabel(status: string) {
  return status
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function statusTone(status: string): Tone {
  if (status === "approved" || status === "published") return "success";
  if (status === "under_review" || SUBMITTABLE_STATUSES.has(status)) return "warning";
  if (status === "withdrawn") return "danger";
  return "neutral";
}

function scopeBreadcrumbLabel(scope: ActiveScope, schoolName: string) {
  const parts = [schoolName];
  if (scope.classLabel) parts.push(scope.classLabel);
  if (scope.streamLabel) parts.push(scope.streamLabel);
  return parts.join(" / ");
}

export function PublishingWorkspace() {
  const identity = useSchoolCommandIdentity();
  const [scope, setScope] = useState<ActiveScope>({ type: "school" });
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [busyId, setBusyId] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState("");
  const [recallId, setRecallId] = useState<string | null>(null);
  const [recallReason, setRecallReason] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [bulkResult, setBulkResult] = useState<BulkTransitionResult | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ action: string; label: string } | null>(null);

  // ── Build scope query params ──
  const scopeParams = useMemo(() => {
    const p = new URLSearchParams();
    if (scope.examSeriesId) p.set("exam_series_id", scope.examSeriesId);
    if (scope.classSectionId) p.set("class_section_id", scope.classSectionId);
    if (scope.streamId) p.set("stream_id", scope.streamId);
    return p.toString();
  }, [scope]);

  const reportQuery = useSchoolQuery<LiveExamReportCard[]>(
    `/exams/report-cards/scoped?${scopeParams}&limit=200`
  );

  const summaryQuery = useSchoolQuery<ReportCardScopeSummary>(
    `/exams/report-cards/scope-summary?${scopeParams}&target_action=submit`
  );

  const hierarchyQuery = useSchoolQuery<ReportCardScopeHierarchyNode[]>(
    `/exams/report-cards/scope-hierarchy?${scopeParams}`
  );

  const items = reportQuery.data ?? [];
  const summary = summaryQuery.data ?? { total_cards: 0, eligible_cards: 0, ineligible_cards: 0, status_counts: {} };
  const hierarchy = hierarchyQuery.data ?? [];

  const counts = useMemo(() => {
    const submitCount = items.filter((c) => SUBMITTABLE_STATUSES.has(c.status)).length;
    const reviewCount = items.filter((c) => c.status === "under_review").length;
    const approvedCount = items.filter((c) => c.status === "approved").length;
    const publishedCount = items.filter((c) => c.status === "published").length;
    return {
      total: items.length,
      submittable: submitCount,
      review: reviewCount,
      approved: approvedCount,
      published: publishedCount,
      eligible: summary.eligible_cards || submitCount,
    };
  }, [items, summary]);

  // ── Filter logic ──
  const filtered = useMemo(() => {
    let list = items;
    if (statusFilter !== "all") {
      list = list.filter((c) => c.status === statusFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (c) =>
          (c.student_name ?? "").toLowerCase().includes(q) ||
          (c.admission_number ?? "").toLowerCase().includes(q) ||
          (c.exam_series_name ?? "").toLowerCase().includes(q) ||
          (c.verification_code ?? "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [items, statusFilter, search]);

  const allFilteredSelected = filtered.length > 0 && filtered.every((c) => selectedIds.has(c.id));

  function toggleSelectAll() {
    if (allFilteredSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((c) => c.id)));
    }
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // ── Scope navigation ──
  function navigateScope(next: ActiveScope) {
    setScope(next);
    setSelectedIds(new Set());
    setBulkResult(null);
    setConfirmAction(null);
    setSearch("");
    setStatusFilter("all");
  }

  function drillToClass(node: ReportCardScopeHierarchyNode) {
    navigateScope({
      type: "class",
      examSeriesId: scope.examSeriesId,
      classSectionId: node.class_section_id,
      classLabel: node.class_name,
    });
  }

  function drillToStream(stream: { stream_id: string; stream_name: string }) {
    navigateScope({
      type: "stream",
      examSeriesId: scope.examSeriesId,
      classSectionId: scope.classSectionId,
      classLabel: scope.classLabel,
      streamId: stream.stream_id,
      streamLabel: stream.stream_name,
    });
  }

  function goBackToSchool() {
    navigateScope({ type: "school", examSeriesId: scope.examSeriesId });
  }

  function goBackToClass() {
    navigateScope({
      type: "class",
      examSeriesId: scope.examSeriesId,
      classSectionId: scope.classSectionId,
      classLabel: scope.classLabel,
    });
  }

  // ── Refresh ──
  const refreshAll = useCallback(() => {
    return Promise.all([
      reportQuery.refetch(),
      summaryQuery.refetch(),
      hierarchyQuery.refetch(),
    ]);
  }, [reportQuery, summaryQuery, hierarchyQuery]);

  // ── Individual actions ──
  async function submitForDeanReview(row: LiveExamReportCard) {
    setBusyId(row.id);
    try {
      await transitionReportCard(row.id, "submit");
      toast.success("Report card submitted to the Dean of Academics for approval.");
      await refreshAll();
    } catch (actionError) {
      toast.error(actionError instanceof Error ? actionError.message : "Report card could not be submitted.");
    } finally {
      setBusyId(null);
    }
  }

  async function recallFromDean(row: LiveExamReportCard) {
    const reason = recallReason.trim();
    if (!reason) {
      toast.error("Enter the correction reason before recalling this report card.");
      return;
    }
    setBusyId(row.id);
    try {
      await transitionReportCard(row.id, "recall", reason);
      toast.success("Report card recalled to the Exams Manager draft queue.");
      setRecallId(null);
      setRecallReason("");
      await refreshAll();
    } catch (actionError) {
      toast.error(actionError instanceof Error ? actionError.message : "Report card could not be recalled.");
    } finally {
      setBusyId(null);
    }
  }

  // ── Bulk transition ──
  async function runBulkTransition(action: "submit" | "recall") {
    setBusyAction(`bulk:${action}`);
    setBulkResult(null);
    try {
      const body: Record<string, unknown> = {
        action,
      };
      if (scope.examSeriesId) body.exam_series_id = scope.examSeriesId;
      if (scope.classSectionId) body.class_section_id = scope.classSectionId;
      if (scope.streamId) body.stream_id = scope.streamId;
      if (selectedIds.size > 0) {
        body.report_card_ids = [...selectedIds];
      }
      if (action === "recall" && recallReason.trim()) {
        body.reason = recallReason.trim();
      }
      const result = await requestSchoolApiProxy<BulkTransitionResult>(
        "/exams/report-cards/bulk-transition",
        { method: "POST", body }
      );
      setBulkResult(result);
      toast.success(`${action === "submit" ? "Submitted" : "Recalled"} ${result.transitioned} report card(s).`);
      await refreshAll();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : `Bulk ${action} failed.`);
    } finally {
      setBusyAction("");
    }
  }

  // ── Bulk PDF helpers ──
  function buildBulkPdfParams(): URLSearchParams {
    const params = new URLSearchParams();
    if (scope.examSeriesId) params.set("exam_series_id", scope.examSeriesId);
    if (scope.classSectionId) params.set("class_section_id", scope.classSectionId);
    if (scope.streamId) params.set("stream_id", scope.streamId);
    if (selectedIds.size > 0) {
      params.set("report_card_ids", [...selectedIds].join(","));
    }
    return params;
  }

  async function reportCardDownloadError(response: Response) {
    try {
      const body = await response.json();
      return body?.message ?? `Download failed (${response.status})`;
    } catch {
      return `Download failed (${response.status})`;
    }
  }

  async function bulkDownload() {
    setBusyAction("bulk:download");
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
      link.download = `report-cards-handoff-${scope.type}-${Date.now()}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(objectUrl);
      toast.success("Bulk report-card PDF downloaded.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Bulk download failed.");
    } finally {
      setBusyAction("");
    }
  }

  async function bulkPrint() {
    setBusyAction("bulk:print");
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
      toast.success(selectedIds.size > 0 ? `${selectedIds.size} report-card PDF(s) opened for printing.` : "Report-card PDF opened for printing.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Print preparation failed.");
    } finally {
      setBusyAction("");
    }
  }

  // ── Confirmation dialog helpers ──
  function requestBulkAction(action: string, label: string) {
    setConfirmAction({ action, label });
  }

  function confirmAndRunBulkAction() {
    if (!confirmAction) return;
    setConfirmAction(null);
    void runBulkTransition(confirmAction.action as "submit" | "recall");
  }

  const statuses = useMemo(() => {
    const set = new Set(items.map((c) => c.status));
    return [...set].sort();
  }, [items]);

  return (
    <Panel
      title="Report Card Handoff"
      description="Submit generated report cards to the Dean of Academics. The Exams Manager can recall a card while it is under review, but only the Principal can publish approved results."
      icon={Send}
      actions={
        <Button variant="secondary" size="sm" onClick={() => void refreshAll()} disabled={Boolean(busyAction)}>
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      }
    >
      {/* Breadcrumb navigation */}
      {scope.type !== "school" ? (
        <div className="mb-4 flex items-center gap-1 text-sm">
          <button className="font-semibold text-[#1D4ED8] hover:underline" onClick={goBackToSchool}>
            {identity.schoolName}
          </button>
          {scope.classLabel ? (
            <>
              <ChevronRight className="h-3 w-3 text-[#94A3B8]" />
              {scope.type === "class" ? (
                <span className="font-black text-[#071D49]">{scope.classLabel}</span>
              ) : (
                <button className="font-semibold text-[#1D4ED8] hover:underline" onClick={goBackToClass}>
                  {scope.classLabel}
                </button>
              )}
            </>
          ) : null}
          {scope.streamLabel ? (
            <>
              <ChevronRight className="h-3 w-3 text-[#94A3B8]" />
              <span className="font-black text-[#071D49]">{scope.streamLabel}</span>
            </>
          ) : null}
        </div>
      ) : null}

      {/* Stats */}
      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {([
          ["Ready to submit", counts.submittable],
          ["Awaiting Dean", counts.review],
          ["Dean approved", counts.approved],
          ["Published", counts.published],
        ] as const).map(([label, value]) => (
          <div key={label} className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
            <div className="text-sm font-semibold text-[#64748B]">{label}</div>
            <div className="mt-1 text-lg font-black text-[#071D49]">{reportQuery.isLoading ? "..." : value}</div>
          </div>
        ))}
      </div>

      {/* Scope action bar */}
      <div className="mb-4 rounded-xl border border-[#C8D5EA] bg-white p-4 text-[#071D49]">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
          <span className="font-black">{counts.total} report cards</span>
          {counts.submittable > 0 ? (
            <span className="text-emerald-700 font-semibold">{counts.submittable} ready to submit</span>
          ) : null}
          {counts.review > 0 ? (
            <span className="text-amber-700 font-semibold">{counts.review} recallable</span>
          ) : null}
        </div>

        {selectedIds.size > 0 ? (
          <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-[#1D4ED8]/20 bg-[#EEF2F7] px-3 py-2">
            <span className="text-sm font-black text-[#1D4ED8]">{selectedIds.size} selected</span>
            {counts.submittable > 0 ? (
              <Button
                size="sm"
                onClick={() => requestBulkAction("submit", `Submit ${selectedIds.size} selected`)}
                disabled={Boolean(busyAction)}
              >
                <Send className="h-4 w-4" />
                {busyAction === "bulk:submit" ? "Processing..." : "Submit Selected"}
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
          {counts.submittable > 0 ? (
            <Button
              size="sm"
              onClick={() => requestBulkAction("submit", `Submit all ${counts.submittable} eligible`)}
              disabled={Boolean(busyAction)}
            >
              <Send className="h-4 w-4" />
              {busyAction === "bulk:submit" ? "Processing..." : `Submit all ${counts.submittable} eligible`}
            </Button>
          ) : null}
          {counts.review > 0 ? (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => requestBulkAction("recall", `Recall all ${counts.review} under review`)}
              disabled={Boolean(busyAction)}
            >
              <RotateCcw className="h-4 w-4" />
              {busyAction === "bulk:recall" ? "Processing..." : `Recall all ${counts.review}`}
            </Button>
          ) : null}
          <Button variant="secondary" size="sm" onClick={() => void bulkPrint()} disabled={Boolean(busyAction) || counts.total === 0}>
            <Printer className="h-4 w-4" />
            {busyAction === "bulk:print" ? "Preparing..." : `Print all ${counts.total}`}
          </Button>
          <Button variant="secondary" size="sm" onClick={() => void bulkDownload()} disabled={Boolean(busyAction) || counts.total === 0}>
            <Download className="h-4 w-4" />
            {busyAction === "bulk:download" ? "Downloading..." : `Download all ${counts.total}`}
          </Button>
          <input
            value={recallReason}
            onChange={(e) => setRecallReason(e.target.value)}
            placeholder="Reason (for recall)"
            className="h-9 max-w-xs rounded-lg border border-[#C8D5EA] px-3 text-xs outline-none focus:border-[#1D4ED8]"
          />
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
                  <p className="text-xl font-black text-emerald-800">
                    {selectedIds.size > 0 ? selectedIds.size : confirmAction.action === "recall" ? counts.review : counts.submittable}
                  </p>
                </div>
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-center">
                  <p className="text-xs font-bold text-amber-700">Not eligible</p>
                  <p className="text-xl font-black text-amber-800">
                    {selectedIds.size > 0 ? 0 : counts.total - (confirmAction.action === "recall" ? counts.review : counts.submittable)}
                  </p>
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

      {/* Bulk result summary */}
      {bulkResult ? (
        <div className="mb-4 rounded-xl border border-[#C8D5EA] bg-white p-4 text-sm">
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
                    <span className="text-[#64748B]"> {statusLabel(card.previous_status)} &rarr; {statusLabel(card.new_status)}</span>
                  </li>
                ))}
              </ul>
            </details>
          ) : null}
          <button className="mt-3 text-xs font-semibold text-[#64748B] underline" onClick={() => setBulkResult(null)}>
            Dismiss
          </button>
        </div>
      ) : null}

      {reportQuery.error ? (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
          Report-card handoff could not be loaded: {reportQuery.error.message}
        </div>
      ) : null}

      {/* Class/stream hierarchy navigation */}
      {scope.type === "school" && hierarchy.length > 0 ? (
        <div className="mb-4 rounded-xl border border-[#C8D5EA] bg-white p-4 text-[#071D49]">
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
          <div className="mb-4 rounded-xl border border-[#C8D5EA] bg-white p-4 text-[#071D49]">
            <p className="text-sm font-black">Drill down by stream</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {classNode.streams.map((stream) => (
                <button
                  key={stream.stream_id}
                  className="flex items-center justify-between rounded-lg border border-[#D8E0EC] px-4 py-3 text-left hover:border-[#1D4ED8] hover:bg-[#F8FAFC]"
                  onClick={() => drillToStream(stream)}
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

      {/* Search and filter */}
      <div className="mb-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_200px]">
        <label className="relative">
          <span className="sr-only">Search report cards</span>
          <Search className="pointer-events-none absolute left-3 top-3 h-5 w-5 text-[#64748B]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search learner, admission number, or verification code"
            className="h-11 w-full rounded-lg border border-[#C8D5EA] pl-10 pr-3 text-sm outline-none focus:border-[#1D4ED8]"
          />
        </label>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-11 w-full rounded-lg border border-[#C8D5EA] bg-white px-3 text-sm font-semibold outline-none focus:border-[#1D4ED8]"
        >
          <option value="all">All statuses</option>
          {statuses.map((s) => (
            <option key={s} value={s}>{statusLabel(s)}</option>
          ))}
        </select>
      </div>

      {/* Report cards table */}
      <div className="overflow-x-auto rounded-xl border border-[#D8E0EC]">
        <table className="w-full text-left text-sm">
          <thead className="bg-[#F8FAFC] text-[#071D49]">
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
              <th className="px-4 py-3 font-bold">Learner</th>
              <th className="px-4 py-3 font-bold">Exam</th>
              <th className="px-4 py-3 font-bold">Term</th>
              <th className="px-4 py-3 font-bold">Revision</th>
              <th className="px-4 py-3 font-bold">Status</th>
              <th className="px-4 py-3 text-right font-bold">Next action</th>
            </tr>
          </thead>
          <tbody>
            {reportQuery.isLoading ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-[#64748B]">
                  Loading report-card handoff queue for {scopeBreadcrumbLabel(scope, identity.schoolName)}...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-[#64748B]">
                  {items.length === 0
                    ? "No report cards have been generated in this scope. Generate report cards from moderated, locked marks before submitting them for approval."
                    : "No report cards match the current filter."}
                </td>
              </tr>
            ) : (
              filtered.map((row) => {
                const canSubmit = SUBMITTABLE_STATUSES.has(row.status);
                const canRecall = row.status === "under_review";
                const recalling = recallId === row.id;

                return (
                  <tr key={row.id} className="border-t border-[#D8E0EC] align-top hover:bg-[#F8FAFC]">
                    <td className="px-3 py-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(row.id)}
                        onChange={() => toggleSelect(row.id)}
                        className="h-4 w-4 rounded border-[#C8D5EA]"
                      />
                    </td>
                    <td className="px-4 py-3 text-[#64748B]">
                      <div className="font-bold text-[#071D49]">{row.student_name || "Learner"}</div>
                      <div>{row.admission_number || row.student_id}</div>
                    </td>
                    <td className="px-4 py-3 text-[#64748B]">{row.exam_series_name || row.exam_series_id || "Exam series"}</td>
                    <td className="px-4 py-3 text-[#64748B]">
                      {[row.term, row.academic_year].filter(Boolean).join(" - ") || "Not assigned"}
                    </td>
                    <td className="px-4 py-3 text-[#64748B]">{row.revision_number ?? 1}</td>
                    <td className="px-4 py-3">
                      <StatusChip label={statusLabel(row.status)} tone={statusTone(row.status)} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      {canSubmit ? (
                        <button
                          type="button"
                          onClick={() => submitForDeanReview(row)}
                          disabled={busyId === row.id}
                          className="rounded-lg bg-[#071D49] px-3 py-2 text-xs font-black text-white disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {busyId === row.id ? "Submitting..." : "Submit to Dean"}
                        </button>
                      ) : canRecall && !recalling ? (
                        <button
                          type="button"
                          onClick={() => {
                            setRecallId(row.id);
                            setRecallReason("");
                          }}
                          disabled={Boolean(busyId)}
                          className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-black text-amber-700 disabled:opacity-60"
                        >
                          Recall for correction
                        </button>
                      ) : recalling ? (
                        <div className="ml-auto flex max-w-sm flex-col gap-2">
                          <label htmlFor={`recall-${row.id}`} className="text-left text-xs font-bold text-[#475569]">
                            Correction reason
                          </label>
                          <textarea
                            id={`recall-${row.id}`}
                            value={recallReason}
                            onChange={(event) => setRecallReason(event.target.value)}
                            rows={2}
                            className="rounded-lg border border-[#CBD5E1] bg-white px-3 py-2 text-sm text-[#071D49]"
                          />
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setRecallId(null);
                                setRecallReason("");
                              }}
                              disabled={busyId === row.id}
                              className="rounded-lg border border-[#CBD5E1] bg-white px-3 py-2 text-xs font-black text-[#475569]"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={() => recallFromDean(row)}
                              disabled={busyId === row.id || !recallReason.trim()}
                              className="rounded-lg bg-amber-600 px-3 py-2 text-xs font-black text-white disabled:opacity-60"
                            >
                              {busyId === row.id ? "Recalling..." : "Confirm recall"}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs font-semibold text-[#64748B]">
                          {row.status === "approved"
                            ? "Waiting for Principal release"
                            : row.status === "published"
                              ? "Released by Principal"
                              : row.status === "withdrawn"
                                ? "Withdrawn by Principal"
                                : "No action available"}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
