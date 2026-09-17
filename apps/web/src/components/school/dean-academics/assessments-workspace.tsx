"use client";
import { useState } from "react";
import { ClipboardList, RefreshCw, Search } from "lucide-react";
import { toast } from "sonner";

import { requestDashboardApi } from "@/lib/dashboard/api-client";
import { useSchoolQuery } from "@/lib/data/school-hooks";
import type { LiveExamReportCard } from "@/lib/modules/exams-client";
import { ExamWorkflowTracker } from "../exam-workflow-tracker";
import { Modal } from "@/components/ui/modal";
import {
  deanButtonClass,
  fieldValue,
  listFromData,
  Panel,
  QueryNotice,
  StatusChip,
  Tone,
} from "./shared";
import styles from "./dean-workspace.module.css";

type AssessmentsRecord = {
  id?: string;
  mark_ids?: string[];
  title?: string;
  exam?: string;
  subject?: string;
  class?: string;
  class_name?: string;
  date?: string;
  created_at?: string;
  total_marks?: number | string;
  submissions?: number | string;
  status?: string;
  [key: string]: unknown;
};

type AssessmentsData = {
  metrics: {
    active_assessments: number;
    pending_marking: number;
    completed: number;
  };
  assessmentsList: AssessmentsRecord[];
};

function assessmentMarkIds(item: AssessmentsRecord): string[] {
  return Array.isArray(item.mark_ids)
    ? item.mark_ids.filter(
        (id): id is string => typeof id === "string" && Boolean(id.trim()),
      )
    : [];
}

function displayStatus(value: string): string {
  return value
    .trim()
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function displayDate(value: string): string {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? value || "Not recorded"
    : parsed.toLocaleDateString("en-KE", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
}

export function AssessmentsWorkspace({
  onOpenReports,
}: {
  onOpenReports?: () => void;
}) {
  const { data, error, isLoading, isFetching, refetch } = useSchoolQuery<
    AssessmentsData | AssessmentsRecord[]
  >("/admin-command/dean-academics/assessments");
  const {
    data: reportCards,
    error: reportCardsError,
    isLoading: reportCardsLoading,
    refetch: refetchReportCards,
  } = useSchoolQuery<LiveExamReportCard[]>(
    "/exams/report-cards?status=under_review&limit=50",
  );
  const items = listFromData<AssessmentsRecord>(data, "assessmentsList");
  const [isLocking, setIsLocking] = useState(false);
  const [submittingActionId, setSubmittingActionId] = useState<string | null>(
    null,
  );
  const [returningAssessmentId, setReturningAssessmentId] = useState<
    string | null
  >(null);
  const [assessmentReturnReason, setAssessmentReturnReason] = useState("");
  const [recallId, setRecallId] = useState<string | null>(null);
  const [recallReason, setRecallReason] = useState("");
  const [activeQueue, setActiveQueue] = useState("marks");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [confirmLock, setConfirmLock] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const filteredItems = items.filter(
    (row) =>
      (statusFilter === "all" || row.status === statusFilter) &&
      [row.title, row.exam, row.subject, row.class, row.class_name]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(search.trim().toLowerCase()),
  );

  const getStatusTone = (st: string): Tone => {
    if (
      st === "Active" ||
      st === "Available" ||
      st === "Approved" ||
      st === "Reviewed" ||
      st === "Completed" ||
      st === "Resolved" ||
      st === "Present" ||
      st === "Functional" ||
      st === "On Track" ||
      st === "Cleared"
    )
      return "success";
    if (
      st === "Pending" ||
      st === "In Progress" ||
      st === "Pending Approval" ||
      st === "Scheduled" ||
      st === "On Loan" ||
      st === "Behind" ||
      st === "Departed" ||
      st === "Warning" ||
      st === "Pending Review"
    )
      return "warning";
    if (
      st === "Overdue" ||
      st === "Critical" ||
      st === "Rejected" ||
      st === "Escalated" ||
      st === "Expired" ||
      st === "Damaged" ||
      st === "Flagged" ||
      st === "Absent" ||
      st === "Blacklisted" ||
      st === "Disposed" ||
      st === "Unauthorized"
    )
      return "danger";
    if (
      st === "Issued" ||
      st === "Checked In" ||
      st === "Submitted" ||
      st === "Booked" ||
      st === "Sent" ||
      st === "On Leave"
    )
      return "info";
    return "neutral";
  };

  const lockableItems = filteredItems.filter((item) => {
    const status = fieldValue(item, ["status"], "").toLowerCase();
    return status === "reviewed";
  });
  const lockableMarkIds = [
    ...new Set(lockableItems.flatMap(assessmentMarkIds)),
  ];

  async function handleLockBatch() {
    if (
      isLocking ||
      submittingActionId ||
      error ||
      lockableMarkIds.length === 0
    )
      return;

    setIsLocking(true);
    setActionError(null);
    let lockedCount = 0;
    try {
      for (let index = 0; index < lockableMarkIds.length; index += 500) {
        const result = await requestDashboardApi<{ locked_count: number }>(
          "/admin-command/dean-academics/lock-batch",
          {
            method: "POST",
            body: { markIds: lockableMarkIds.slice(index, index + 500) },
          },
        );
        if (!result.locked_count)
          throw new Error(
            "No marks were confirmed locked. Refresh the queue before retrying.",
          );
        lockedCount += result.locked_count;
      }

      toast.success(
        `${lockedCount} reviewed marks locked for report-card generation.`,
      );
      setConfirmLock(false);
      await refetch();
    } catch (err: unknown) {
      const message = `${lockedCount ? `${lockedCount} marks were locked before the request failed. ` : ""}${err instanceof Error ? err.message : "Assessment batch could not be locked."}`;
      setActionError(message);
      toast.error(message);
      setConfirmLock(false);
      await refetch();
    } finally {
      setIsLocking(false);
    }
  }

  async function recordDeanAssessmentAction(
    item: AssessmentsRecord,
    action: "approve" | "return_for_correction",
  ) {
    const actionKey = `${item.id ?? "assessment"}-${action}`;
    const markIds = assessmentMarkIds(item);
    const reason = assessmentReturnReason.trim();
    if (submittingActionId || isLocking || error) return;
    if (markIds.length === 0) {
      toast.error(
        "This assessment row has no marks available for moderation. Refresh and try again.",
      );
      return;
    }
    if (action === "return_for_correction" && !reason) {
      toast.error("Enter the correction reason before returning these marks.");
      return;
    }

    setSubmittingActionId(actionKey);
    setActionError(null);
    let updatedCount = 0;
    try {
      for (let index = 0; index < markIds.length; index += 500) {
        const result = await requestDashboardApi<{ updated_count: number }>(
          "/exams/marks/moderate",
          {
            method: "POST",
            body: {
              action,
              mark_ids: markIds.slice(index, index + 500),
              ...(action === "return_for_correction" ? { reason } : {}),
            },
          },
        );
        if (!result.updated_count)
          throw new Error(
            "No mark changes were confirmed. Refresh the queue before retrying.",
          );
        updatedCount += result.updated_count;
      }

      toast.success(
        action === "approve"
          ? `${updatedCount} mark${updatedCount === 1 ? "" : "s"} approved in moderation.`
          : `${updatedCount} mark${updatedCount === 1 ? "" : "s"} returned with the correction reason.`,
      );
      setReturningAssessmentId(null);
      setAssessmentReturnReason("");
      await refetch();
    } catch (err: unknown) {
      const message = `${updatedCount ? `${updatedCount} marks changed before this request failed. ` : ""}${err instanceof Error ? err.message : "Dean assessment action could not be saved."}`;
      setActionError(message);
      toast.error(message);
      await refetch();
    } finally {
      setSubmittingActionId(null);
    }
  }

  async function transitionReportCard(
    reportCard: LiveExamReportCard,
    action: "approve" | "recall",
  ) {
    const actionKey = `${reportCard.id}-${action}`;
    const reason = recallReason.trim();
    if (submittingActionId || isLocking || reportCardsError) return;
    if (action === "recall" && !reason) {
      toast.error(
        "Enter the correction reason before returning this report card.",
      );
      return;
    }

    setSubmittingActionId(actionKey);
    setActionError(null);
    try {
      await requestDashboardApi(
        `/exams/report-cards/${encodeURIComponent(reportCard.id)}/transition`,
        {
          method: "PATCH",
          body: {
            action,
            ...(action === "recall" ? { reason } : {}),
          },
        },
      );

      toast.success(
        action === "approve"
          ? "Report card approved and sent to the Principal release queue."
          : "Report card returned to the Exams Manager with the correction reason.",
      );
      setRecallId(null);
      setRecallReason("");
      await Promise.all([refetchReportCards(), refetch()]);
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "Report-card review could not be saved.";
      setActionError(message);
      toast.error(message);
    } finally {
      setSubmittingActionId(null);
    }
  }

  return (
    <div className={`space-y-4 ${styles.workspace}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
            Assessments
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Review marks, resolve corrections and move reports forward.
          </p>
        </div>
        <button
          type="button"
          aria-label="Refresh queues"
          onClick={() => void Promise.all([refetch(), refetchReportCards()])}
          disabled={
            isFetching || isLoading || isLocking || Boolean(submittingActionId)
          }
          className={deanButtonClass}
        >
          <RefreshCw
            className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`}
          />
          <span className="hidden sm:inline">Refresh queues</span>
        </button>
      </div>
      <nav
        aria-label="Assessment queues"
        className="flex flex-wrap gap-1 border-b border-slate-200"
      >
        {[
          {
            id: "marks",
            label: "Mark review",
            count: error || isLoading ? "—" : items.length,
          },
          {
            id: "reports",
            label: "Report approval",
            count:
              reportCardsError || reportCardsLoading
                ? "—"
                : (reportCards?.length ?? 0),
          },
          { id: "progress", label: "Exam progress", count: null },
        ].map((queue) => (
          <button
            key={queue.id}
            type="button"
            aria-pressed={activeQueue === queue.id}
            onClick={() => setActiveQueue(queue.id)}
            className={`inline-flex min-h-11 items-center gap-2 border-b-2 px-2 py-2 text-xs font-medium sm:px-3 sm:text-sm ${activeQueue === queue.id ? "border-[#245994] text-[#245994]" : "border-transparent text-slate-500 hover:text-slate-900"}`}
          >
            {queue.label}
            {queue.count !== null ? (
              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs tabular-nums">
                {queue.count}
              </span>
            ) : null}
          </button>
        ))}
      </nav>
      {actionError ? (
        <div
          role="alert"
          className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800"
        >
          {actionError} Review the queue and retry the action.
        </div>
      ) : null}
      {activeQueue === "progress" ? (
        <ExamWorkflowTracker heading="Exam cycle progress" compact />
      ) : null}
      {activeQueue !== "progress" ? (
        <div>
          <Panel
            title={
              activeQueue === "marks"
                ? "Teacher submissions"
                : "Report card approvals"
            }
            description={
              activeQueue === "marks"
                ? "Approve submitted marks, or return them with a correction reason. Lock reviewed marks when ready."
                : "Review report cards before sending them to the Principal for release."
            }
            icon={ClipboardList}
            actions={
              activeQueue === "marks" ? (
                <button
                  type="button"
                  onClick={() => setConfirmLock(true)}
                  disabled={
                    isLocking ||
                    Boolean(submittingActionId) ||
                    Boolean(error) ||
                    lockableMarkIds.length === 0
                  }
                  className="min-h-10 rounded-md bg-[#245994] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                  title={`${lockableMarkIds.length} reviewed marks in the current filter`}
                >
                  {isLocking ? "Locking..." : "Lock reviewed batch"}
                </button>
              ) : onOpenReports ? (
                <button
                  type="button"
                  className={deanButtonClass}
                  onClick={onOpenReports}
                >
                  Preview report cards
                </button>
              ) : null
            }
          >
            {activeQueue === "marks" ? (
              <>
                <QueryNotice error={error} onRetry={() => void refetch()} />
                <div className="mb-4 flex flex-wrap items-center gap-3">
                  <label className="flex min-h-10 min-w-0 flex-1 basis-full items-center gap-2 rounded-md border border-slate-200 px-3 text-sm text-slate-500 sm:basis-auto">
                    <Search className="h-4 w-4 shrink-0" />
                    <span className="sr-only">Search submissions</span>
                    <input
                      className="w-full min-w-0 bg-transparent py-2 outline-none"
                      placeholder="Search exam, subject or class…"
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                    />
                  </label>
                  <label className="flex items-center gap-2 text-sm text-slate-600">
                    <span>Status</span>
                    <select
                      value={statusFilter}
                      onChange={(event) => setStatusFilter(event.target.value)}
                      className="min-h-10 rounded-md border border-slate-200 bg-white px-3"
                    >
                      <option value="all">All submissions</option>
                      <option value="submitted">Needs review</option>
                      <option value="reviewed">Ready to lock</option>
                    </select>
                  </label>
                </div>
                {!error && !isLoading ? (
                  <p role="status" className="mb-3 text-xs text-slate-500">
                    {filteredItems.length} of {items.length} groups ·{" "}
                    {lockableMarkIds.length} reviewed marks ready to lock
                    {items.length === 100
                      ? " · Latest 100 groups; refresh after processing to load more."
                      : ""}
                  </p>
                ) : null}
                <div className="overflow-x-auto rounded-xl border border-[#D8E0EC]">
                  <table className={`w-full text-sm text-left ${styles.table}`}>
                    <thead className="bg-[#F8FAFC] text-[#071D49]">
                      <tr>
                        <th className="px-4 py-3 font-bold">Exam / subject</th>
                        <th className="px-4 py-3 font-bold">Class</th>
                        <th className="px-4 py-3 font-bold">Marks</th>
                        <th className="px-4 py-3 font-bold">Status</th>
                        <th className="px-4 py-3 font-bold">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {error ? (
                        <tr>
                          <td
                            colSpan={5}
                            className="px-4 py-8 text-sm text-slate-500"
                          >
                            Submissions are unavailable. Retry above to reload
                            the queue.
                          </td>
                        </tr>
                      ) : isLoading ? (
                        <tr>
                          <td
                            colSpan={5}
                            className="px-4 py-8 text-center text-[#64748B]"
                          >
                            Loading submissions…
                          </td>
                        </tr>
                      ) : items.length === 0 ? (
                        <tr>
                          <td
                            colSpan={5}
                            className="px-4 py-8 text-center text-[#64748B]"
                          >
                            No assessment records found yet. Teacher submissions
                            appear here when marks are ready for Dean review.
                            Open Exam progress to check the current cycle.
                          </td>
                        </tr>
                      ) : !filteredItems.length ? (
                        <tr>
                          <td
                            colSpan={5}
                            className="px-4 py-8 text-center text-slate-500"
                          >
                            No submissions match these filters.{" "}
                            <button
                              type="button"
                              className="font-medium text-blue-700 underline"
                              onClick={() => {
                                setSearch("");
                                setStatusFilter("all");
                              }}
                            >
                              Clear filters
                            </button>
                          </td>
                        </tr>
                      ) : (
                        filteredItems.map((row) => {
                          const rowId =
                            row.id ?? fieldValue(row, ["title", "exam"]);
                          const normalizedStatus = fieldValue(
                            row,
                            ["status"],
                            "",
                          ).toLowerCase();
                          const returning = returningAssessmentId === rowId;
                          const approveActionId = `${rowId}-approve`;
                          const returnActionId = `${rowId}-return_for_correction`;

                          return (
                            <tr
                              key={rowId}
                              className="border-t border-[#D8E0EC] hover:bg-[#F8FAFC]"
                            >
                              <td
                                data-label="Exam / subject"
                                className="px-4 py-3 text-[#64748B]"
                              >
                                <div className="font-semibold text-slate-800">
                                  {fieldValue(row, ["subject", "subject_name"])}
                                </div>
                                <div className="mt-1 text-xs">
                                  {fieldValue(row, [
                                    "title",
                                    "exam",
                                    "assessment_name",
                                  ])}
                                </div>
                                <div className="mt-1 text-xs text-slate-400">
                                  {displayDate(
                                    fieldValue(row, ["date", "created_at"], ""),
                                  )}
                                </div>
                              </td>
                              <td
                                data-label="Class"
                                className="px-4 py-3 text-[#64748B]"
                              >
                                {fieldValue(row, [
                                  "class",
                                  "class_name",
                                  "classStream",
                                ])}
                              </td>
                              <td
                                data-label="Marks"
                                className="px-4 py-3 text-[#64748B]"
                              >
                                <div>
                                  {fieldValue(
                                    row,
                                    ["submissions", "submission_count"],
                                    "0",
                                  )}{" "}
                                  submitted
                                </div>
                                <div className="mt-1 text-xs">
                                  Out of{" "}
                                  {fieldValue(
                                    row,
                                    ["total_marks", "max_score"],
                                    "—",
                                  )}
                                </div>
                              </td>
                              <td data-label="Status" className="px-4 py-3">
                                <StatusChip
                                  label={
                                    normalizedStatus === "reviewed"
                                      ? "Ready to lock"
                                      : normalizedStatus === "submitted"
                                        ? "Needs review"
                                        : displayStatus(normalizedStatus)
                                  }
                                  tone={getStatusTone(
                                    displayStatus(normalizedStatus),
                                  )}
                                />
                              </td>
                              <td data-label="Actions" className="px-4 py-3">
                                {!returning ? (
                                  <div className="flex flex-wrap gap-2">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        recordDeanAssessmentAction(
                                          row,
                                          "approve",
                                        )
                                      }
                                      disabled={
                                        isLocking ||
                                        Boolean(submittingActionId) ||
                                        normalizedStatus !== "submitted"
                                      }
                                      className="rounded-lg border border-[#BFDBFE] bg-[#EEF5FF] px-3 py-1.5 text-xs font-black text-[#0B63CE] disabled:opacity-50"
                                    >
                                      {submittingActionId === approveActionId
                                        ? "Approving..."
                                        : "Moderate & approve"}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setReturningAssessmentId(rowId);
                                        setAssessmentReturnReason("");
                                      }}
                                      disabled={
                                        isLocking ||
                                        Boolean(submittingActionId) ||
                                        !["submitted", "reviewed"].includes(
                                          normalizedStatus,
                                        )
                                      }
                                      className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-black text-amber-700 disabled:opacity-50"
                                    >
                                      Return
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex min-w-0 flex-col gap-2 sm:min-w-56">
                                    <label
                                      htmlFor={`assessment-return-${rowId}`}
                                      className="text-xs font-bold text-[#475569]"
                                    >
                                      Required correction reason
                                    </label>
                                    <textarea
                                      id={`assessment-return-${rowId}`}
                                      value={assessmentReturnReason}
                                      onChange={(event) =>
                                        setAssessmentReturnReason(
                                          event.target.value,
                                        )
                                      }
                                      rows={2}
                                      className="rounded-lg border border-[#CBD5E1] bg-white px-3 py-2 text-sm text-[#071D49]"
                                    />
                                    <div className="flex justify-end gap-2">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setReturningAssessmentId(null);
                                          setAssessmentReturnReason("");
                                        }}
                                        disabled={
                                          submittingActionId === returnActionId
                                        }
                                        className="rounded-lg border border-[#CBD5E1] bg-white px-3 py-2 text-xs font-black text-[#475569]"
                                      >
                                        Cancel
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          recordDeanAssessmentAction(
                                            row,
                                            "return_for_correction",
                                          )
                                        }
                                        disabled={
                                          Boolean(submittingActionId) ||
                                          !assessmentReturnReason.trim()
                                        }
                                        className="rounded-lg bg-amber-600 px-3 py-2 text-xs font-black text-white disabled:opacity-50"
                                      >
                                        {submittingActionId === returnActionId
                                          ? "Returning..."
                                          : "Confirm return"}
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            ) : null}
            {activeQueue === "reports" ? (
              <section aria-labelledby="report-card-approval-heading">
                <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 id="report-card-approval-heading" className="sr-only">
                      Report Card Approval Queue
                    </h3>
                    <p className="mt-1 text-sm text-[#64748B]">
                      Approve complete report cards for Principal release, or
                      return them to the Exams Manager with a correction reason.
                    </p>
                  </div>
                  <StatusChip
                    label={
                      reportCardsError
                        ? "Queue unavailable"
                        : reportCardsLoading
                          ? "Loading…"
                          : `${reportCards?.length ?? 0} awaiting review${reportCards?.length === 50 ? " · first 50" : ""}`
                    }
                    tone={reportCards?.length ? "warning" : "neutral"}
                  />
                </div>

                {reportCardsError ? (
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
                    <span>
                      Report-card approvals could not be loaded:{" "}
                      {reportCardsError.message}
                    </span>
                    <button
                      type="button"
                      onClick={() => void refetchReportCards()}
                      className="rounded-lg border border-red-300 bg-white px-3 py-2 text-xs font-black text-red-700"
                    >
                      Retry queue
                    </button>
                  </div>
                ) : null}

                <div className="overflow-x-auto rounded-xl border border-[#D8E0EC]">
                  <table className={`w-full text-left text-sm ${styles.table}`}>
                    <thead className="bg-[#F8FAFC] text-[#071D49]">
                      <tr>
                        <th className="px-4 py-3 font-bold">Learner</th>
                        <th className="px-4 py-3 font-bold">Exam</th>
                        <th className="px-4 py-3 font-bold">Term</th>
                        <th className="px-4 py-3 font-bold">Submitted</th>
                        <th className="px-4 py-3 text-right font-bold">
                          Decision
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportCardsError ? (
                        <tr>
                          <td
                            colSpan={5}
                            className="px-4 py-8 text-center text-[#64748B]"
                          >
                            The approval queue is temporarily unavailable. Retry
                            above after the connection recovers.
                          </td>
                        </tr>
                      ) : reportCardsLoading ? (
                        <tr>
                          <td
                            colSpan={5}
                            className="px-4 py-8 text-center text-[#64748B]"
                          >
                            Loading report-card approval queue...
                          </td>
                        </tr>
                      ) : !reportCards?.length ? (
                        <tr>
                          <td
                            colSpan={5}
                            className="px-4 py-8 text-center text-[#64748B]"
                          >
                            No report cards are awaiting Dean approval. Cards
                            appear after the Exams Manager submits generated
                            drafts.
                          </td>
                        </tr>
                      ) : (
                        reportCards.map((reportCard) => {
                          const recalling = recallId === reportCard.id;
                          const approveActionId = `${reportCard.id}-approve`;
                          const recallActionId = `${reportCard.id}-recall`;

                          return (
                            <tr
                              key={reportCard.id}
                              className="border-t border-[#D8E0EC] align-top hover:bg-[#F8FAFC]"
                            >
                              <td
                                data-label="Learner"
                                className="px-4 py-3 text-[#64748B]"
                              >
                                <div className="font-bold text-[#071D49]">
                                  {reportCard.student_name || "Learner"}
                                </div>
                                <div>
                                  {reportCard.admission_number ||
                                    reportCard.student_id}
                                </div>
                              </td>
                              <td
                                data-label="Exam"
                                className="px-4 py-3 text-[#64748B]"
                              >
                                {reportCard.exam_series_name ||
                                  reportCard.exam_series_id ||
                                  "Exam series"}
                              </td>
                              <td
                                data-label="Term"
                                className="px-4 py-3 text-[#64748B]"
                              >
                                {[reportCard.term, reportCard.academic_year]
                                  .filter(Boolean)
                                  .join(" - ") || "Not assigned"}
                              </td>
                              <td
                                data-label="Submitted"
                                className="px-4 py-3 text-[#64748B]"
                              >
                                {reportCard.submitted_at
                                  ? displayDate(reportCard.submitted_at)
                                  : "Submission recorded"}
                              </td>
                              <td
                                data-label="Decision"
                                className="px-4 py-3 text-right"
                              >
                                {!recalling ? (
                                  <div className="flex flex-wrap justify-end gap-2">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        transitionReportCard(
                                          reportCard,
                                          "approve",
                                        )
                                      }
                                      disabled={Boolean(submittingActionId)}
                                      className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-black text-white disabled:opacity-50"
                                    >
                                      {submittingActionId === approveActionId
                                        ? "Approving..."
                                        : "Approve for Principal"}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setRecallId(reportCard.id);
                                        setRecallReason("");
                                      }}
                                      disabled={Boolean(submittingActionId)}
                                      className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-black text-amber-700 disabled:opacity-50"
                                    >
                                      Return for correction
                                    </button>
                                  </div>
                                ) : (
                                  <div className="ml-auto flex max-w-sm flex-col gap-2">
                                    <label
                                      htmlFor={`dean-recall-${reportCard.id}`}
                                      className="text-left text-xs font-bold text-[#475569]"
                                    >
                                      Required correction reason
                                    </label>
                                    <textarea
                                      id={`dean-recall-${reportCard.id}`}
                                      value={recallReason}
                                      onChange={(event) =>
                                        setRecallReason(event.target.value)
                                      }
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
                                        disabled={
                                          submittingActionId === recallActionId
                                        }
                                        className="rounded-lg border border-[#CBD5E1] bg-white px-3 py-2 text-xs font-black text-[#475569]"
                                      >
                                        Cancel
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          transitionReportCard(
                                            reportCard,
                                            "recall",
                                          )
                                        }
                                        disabled={
                                          Boolean(submittingActionId) ||
                                          !recallReason.trim()
                                        }
                                        className="rounded-lg bg-amber-600 px-3 py-2 text-xs font-black text-white disabled:opacity-50"
                                      >
                                        {submittingActionId === recallActionId
                                          ? "Returning..."
                                          : "Confirm return"}
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            ) : null}
          </Panel>
        </div>
      ) : null}
      <Modal
        open={confirmLock}
        title="Lock reviewed marks?"
        description="Locked marks are ready for report-card generation. Later changes require the approved correction workflow."
        onClose={() => {
          if (!isLocking) setConfirmLock(false);
        }}
        size="sm"
      >
        <p className="text-sm text-slate-700">
          Lock <strong>{lockableMarkIds.length} reviewed marks</strong> in{" "}
          {lockableItems.length} submission groups matching the current search
          and status filters.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            className={deanButtonClass}
            disabled={isLocking}
            onClick={() => setConfirmLock(false)}
          >
            Cancel
          </button>
          <button
            type="button"
            className={deanButtonClass}
            disabled={isLocking || !lockableMarkIds.length}
            onClick={() => void handleLockBatch()}
          >
            {isLocking ? "Locking…" : "Confirm lock"}
          </button>
        </div>
      </Modal>
    </div>
  );
}
