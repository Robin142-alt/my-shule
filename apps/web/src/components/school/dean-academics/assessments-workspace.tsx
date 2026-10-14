"use client";
import { useState } from "react";
import { ClipboardList, RefreshCw, Search } from "lucide-react";
import { toast } from "sonner";

import { requestDashboardApi } from "@/lib/dashboard/api-client";
import { useSchoolQuery } from "@/lib/data/school-hooks";
import { LiveReportCardsWorkspace } from "../live-report-cards-workspace";
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
  student_count?: number | string;
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
  const { refetch: refetchWorkflow } = useSchoolQuery("/exams/workflow");
  const items = listFromData<AssessmentsRecord>(data, "assessmentsList");
  const [isLocking, setIsLocking] = useState(false);
  const [submittingActionId, setSubmittingActionId] = useState<string | null>(
    null,
  );
  const [returningAssessmentId, setReturningAssessmentId] = useState<
    string | null
  >(null);
  const [assessmentReturnReason, setAssessmentReturnReason] = useState("");
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
      await Promise.all([refetch(), refetchWorkflow()]);
    } catch (err: unknown) {
      const message = `${lockedCount ? `${lockedCount} marks were locked before the request failed. ` : ""}${err instanceof Error ? err.message : "Assessment batch could not be locked."}`;
      setActionError(message);
      toast.error(message);
      setConfirmLock(false);
      await Promise.all([refetch(), refetchWorkflow()]);
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
      await Promise.all([refetch(), refetchWorkflow()]);
    } catch (err: unknown) {
      const message = `${updatedCount ? `${updatedCount} marks changed before this request failed. ` : ""}${err instanceof Error ? err.message : "Dean assessment action could not be saved."}`;
      setActionError(message);
      toast.error(message);
      await Promise.all([refetch(), refetchWorkflow()]);
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
          onClick={() => void Promise.all([refetch(), refetchWorkflow()])}
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
          { id: "reports", label: "Report cards", count: null },
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
          className="rounded-md border border-danger-border bg-danger-soft p-3 text-sm text-danger"
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
                : "Report cards"
            }
            description={
              activeQueue === "marks"
                ? "Approve submitted marks, or return them with a correction reason. Lock reviewed marks when ready."
                : "Preview generated report cards. The Principal releases them directly."
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
                <div className="overflow-x-auto rounded-xl border border-border">
                  <table className={`w-full text-sm text-left ${styles.table}`}>
                    <thead className="bg-surface-muted text-foreground">
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
                            className="px-4 py-8 text-center text-muted"
                          >
                            Loading submissions…
                          </td>
                        </tr>
                      ) : items.length === 0 ? (
                        <tr>
                          <td
                            colSpan={5}
                            className="px-4 py-8 text-center text-muted"
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
                              className="font-medium text-info underline"
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
                              className="border-t border-border hover:bg-surface-muted"
                            >
                              <td
                                data-label="Exam / subject"
                                className="px-4 py-3 text-muted"
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
                                className="px-4 py-3 text-muted"
                              >
                                {fieldValue(row, [
                                  "class",
                                  "class_name",
                                  "classStream",
                                ])}
                              </td>
                              <td
                                data-label="Marks"
                                className="px-4 py-3 text-muted"
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
                                    ["student_count"],
                                    "—",
                                  )}{" "}students
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
                                      className="rounded-lg border border-info-border bg-info-soft px-3 py-1.5 text-xs font-black text-info disabled:opacity-50"
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
                                      className="rounded-lg border border-warning-border bg-warning-soft px-3 py-1.5 text-xs font-black text-warning disabled:opacity-50"
                                    >
                                      Return
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex min-w-0 flex-col gap-2 sm:min-w-56">
                                    <label
                                      htmlFor={`assessment-return-${rowId}`}
                                      className="text-xs font-bold text-muted-strong"
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
                                      className="rounded-lg border border-border-strong bg-white px-3 py-2 text-sm text-foreground"
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
                                        className="rounded-lg border border-border-strong bg-white px-3 py-2 text-xs font-black text-muted-strong"
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
            {activeQueue === "reports" ? <LiveReportCardsWorkspace audience="dean" /> : null}
          </Panel>
        </div>
      ) : null}
      <Modal
        open={confirmLock}
        title="Lock reviewed marks?"
        description="Locked marks are ready for report-card generation. The Exams Manager can reopen selected marks for corrections."
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
