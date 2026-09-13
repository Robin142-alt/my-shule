"use client";
import { useState } from "react";
import { ClipboardList } from "lucide-react";
import { toast } from "sonner";

import { requestDashboardApi } from "@/lib/dashboard/api-client";
import { useSchoolQuery } from "@/lib/data/school-hooks";
import type { LiveExamReportCard } from "@/lib/modules/exams-client";
import { ExamWorkflowTracker } from "../exam-workflow-tracker";
import { fieldValue, listFromData, metricFromData, Panel, StatusChip, Tone } from "./shared";

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
    ? item.mark_ids.filter((id): id is string => typeof id === "string" && Boolean(id.trim()))
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
  return Number.isNaN(parsed.getTime()) ? value || "Not recorded" : parsed.toLocaleString();
}

export function AssessmentsWorkspace() {
  const { data, isLoading, refetch } = useSchoolQuery<AssessmentsData | AssessmentsRecord[]>('/admin-command/dean-academics/assessments');
  const {
    data: reportCards,
    error: reportCardsError,
    isLoading: reportCardsLoading,
    refetch: refetchReportCards,
  } = useSchoolQuery<LiveExamReportCard[]>('/exams/report-cards?status=under_review&limit=50');
  const items = listFromData<AssessmentsRecord>(data, "assessmentsList");
  const [isLocking, setIsLocking] = useState(false);
  const [submittingActionId, setSubmittingActionId] = useState<string | null>(null);
  const [returningAssessmentId, setReturningAssessmentId] = useState<string | null>(null);
  const [assessmentReturnReason, setAssessmentReturnReason] = useState("");
  const [recallId, setRecallId] = useState<string | null>(null);
  const [recallReason, setRecallReason] = useState("");

  const getStatusTone = (st: string): Tone => {
    if (st === "Active" || st === "Available" || st === "Approved" || st === "Reviewed" || st === "Completed" || st === "Resolved" || st === "Present" || st === "Functional" || st === "On Track" || st === "Cleared") return "success";
    if (st === "Pending" || st === "In Progress" || st === "Pending Approval" || st === "Scheduled" || st === "On Loan" || st === "Behind" || st === "Departed" || st === "Warning" || st === "Pending Review") return "warning";
    if (st === "Overdue" || st === "Critical" || st === "Rejected" || st === "Escalated" || st === "Expired" || st === "Damaged" || st === "Flagged" || st === "Absent" || st === "Blacklisted" || st === "Disposed" || st === "Unauthorized") return "danger";
    if (st === "Issued" || st === "Checked In" || st === "Submitted" || st === "Booked" || st === "Sent" || st === "On Leave") return "info";
    return "neutral";
  };

  const lockableItems = items.filter((item) => {
    const status = fieldValue(item, ["status"], "").toLowerCase();
    return status.includes("review") || status.includes("moderation") || status.includes("pending");
  });
  const lockableMarkIds = [...new Set(lockableItems.flatMap(assessmentMarkIds))];

  async function handleLockBatch() {
    if (isLocking || lockableMarkIds.length === 0) return;

    setIsLocking(true);
    try {
      for (let index = 0; index < lockableMarkIds.length; index += 500) {
        await requestDashboardApi("/admin-command/dean-academics/lock-batch", {
          method: "POST",
          body: { markIds: lockableMarkIds.slice(index, index + 500) },
        });
      }

      toast.success("Dean academic workflow saved. Assessment batch was locked for review.");
      await refetch();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Assessment batch could not be locked.");
    } finally {
      setIsLocking(false);
    }
  }

  async function recordDeanAssessmentAction(item: AssessmentsRecord, action: "approve" | "return_for_correction") {
    const actionKey = `${item.id ?? "assessment"}-${action}`;
    const markIds = assessmentMarkIds(item);
    const reason = assessmentReturnReason.trim();
    if (submittingActionId) return;
    if (markIds.length === 0) {
      toast.error("This assessment row has no marks available for moderation. Refresh and try again.");
      return;
    }
    if (action === "return_for_correction" && !reason) {
      toast.error("Enter the correction reason before returning these marks.");
      return;
    }

    setSubmittingActionId(actionKey);
    try {
      await requestDashboardApi("/exams/marks/moderate", {
        method: "POST",
        body: {
          action,
          mark_ids: markIds,
          ...(action === "return_for_correction" ? { reason } : {}),
        },
      });

      toast.success(
        action === "approve"
          ? `${markIds.length} mark${markIds.length === 1 ? "" : "s"} approved in moderation.`
          : `${markIds.length} mark${markIds.length === 1 ? "" : "s"} returned with the correction reason.`,
      );
      setReturningAssessmentId(null);
      setAssessmentReturnReason("");
      await refetch();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Dean assessment action could not be saved.");
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
    if (action === "recall" && !reason) {
      toast.error("Enter the correction reason before returning this report card.");
      return;
    }

    setSubmittingActionId(actionKey);
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
      toast.error(err instanceof Error ? err.message : "Report-card review could not be saved.");
    } finally {
      setSubmittingActionId(null);
    }
  }

  return (
    <div className="space-y-5">
      <ExamWorkflowTracker heading="Academic exam and report-card workflow" />
      <Panel
      title="Assessments"
      description="Review teacher submissions, return corrections, and lock reviewed marks for the Exams Manager."
      icon={ClipboardList}
      actions={
        <button type="button" onClick={handleLockBatch} disabled={isLocking || lockableMarkIds.length === 0} className="rounded-xl bg-[#071D49] px-4 py-2 text-sm font-black text-white disabled:opacity-50">
          {isLocking ? "Locking..." : "Lock reviewed batch"}
        </button>
      }
    >
      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
          <div className="text-sm font-semibold text-[#64748B]">Active Assessments</div>
          <div className="mt-1 text-lg font-black text-[#071D49]">{isLoading ? "..." : metricFromData(data, "active_assessments", items.length)}</div>
        </div>
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
          <div className="text-sm font-semibold text-[#64748B]">Awaiting Dean Review</div>
          <div className="mt-1 text-lg font-black text-[#071D49]">{isLoading ? "..." : metricFromData(data, "pending_marking", lockableItems.length)}</div>
        </div>
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
          <div className="text-sm font-semibold text-[#64748B]">Completed</div>
          <div className="mt-1 text-lg font-black text-[#071D49]">{isLoading ? "..." : metricFromData(data, "completed")}</div>
        </div>
      </div>
      <div className="overflow-x-auto rounded-xl border border-[#D8E0EC]">
        <table className="w-full text-sm text-left whitespace-nowrap">
          <thead className="bg-[#F8FAFC] text-[#071D49]">
            <tr>
              <th className="px-4 py-3 font-bold">Title</th>
              <th className="px-4 py-3 font-bold">Subject</th>
              <th className="px-4 py-3 font-bold">Class</th>
              <th className="px-4 py-3 font-bold">Date</th>
              <th className="px-4 py-3 font-bold">Total Marks</th>
              <th className="px-4 py-3 font-bold">Submissions</th>
              <th className="px-4 py-3 font-bold">Status</th>
              <th className="px-4 py-3 font-bold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-[#64748B]">Loading...</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-[#64748B]">No assessment records found yet. Create exams and submit marks before Dean moderation.</td></tr>
            ) : (
              items.map(row => {
                const rowId = row.id ?? fieldValue(row, ["title", "exam"]);
                const normalizedStatus = fieldValue(row, ["status"], "").toLowerCase();
                const returning = returningAssessmentId === rowId;
                const approveActionId = `${rowId}-approve`;
                const returnActionId = `${rowId}-return_for_correction`;

                return (
                <tr key={rowId} className="border-t border-[#D8E0EC] hover:bg-[#F8FAFC]">
                  <td className="px-4 py-3 text-[#64748B]">{fieldValue(row, ["title", "exam", "assessment_name"])}</td>
                  <td className="px-4 py-3 text-[#64748B]">{fieldValue(row, ["subject", "subject_name"])}</td>
                  <td className="px-4 py-3 text-[#64748B]">{fieldValue(row, ["class", "class_name", "classStream"])}</td>
                  <td className="px-4 py-3 text-[#64748B]">{displayDate(fieldValue(row, ["date", "created_at"], ""))}</td>
                  <td className="px-4 py-3 text-[#64748B]">{fieldValue(row, ["total_marks", "max_score"], "0")}</td>
                  <td className="px-4 py-3 text-[#64748B]">{fieldValue(row, ["submissions", "submission_count"], "0")}</td>
                  <td className="px-4 py-3"><StatusChip label={displayStatus(fieldValue(row, ["status"], "Pending Review"))} tone={getStatusTone(displayStatus(fieldValue(row, ["status"], "Pending Review")))} /></td>
                  <td className="px-4 py-3">
                    {!returning ? <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => recordDeanAssessmentAction(row, "approve")}
                        disabled={Boolean(submittingActionId) || normalizedStatus !== "submitted"}
                        className="rounded-lg border border-[#BFDBFE] bg-[#EEF5FF] px-3 py-1.5 text-xs font-black text-[#0B63CE] disabled:opacity-50"
                      >
                        {submittingActionId === approveActionId ? "Approving..." : "Moderate & approve"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setReturningAssessmentId(rowId);
                          setAssessmentReturnReason("");
                        }}
                        disabled={Boolean(submittingActionId) || !["submitted", "reviewed"].includes(normalizedStatus)}
                        className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-black text-amber-700 disabled:opacity-50"
                      >
                        Return
                      </button>
                    </div> : (
                      <div className="flex min-w-72 flex-col gap-2">
                        <label htmlFor={`assessment-return-${rowId}`} className="text-xs font-bold text-[#475569]">Required correction reason</label>
                        <textarea
                          id={`assessment-return-${rowId}`}
                          value={assessmentReturnReason}
                          onChange={(event) => setAssessmentReturnReason(event.target.value)}
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
                            disabled={submittingActionId === returnActionId}
                            className="rounded-lg border border-[#CBD5E1] bg-white px-3 py-2 text-xs font-black text-[#475569]"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => recordDeanAssessmentAction(row, "return_for_correction")}
                            disabled={Boolean(submittingActionId) || !assessmentReturnReason.trim()}
                            className="rounded-lg bg-amber-600 px-3 py-2 text-xs font-black text-white disabled:opacity-50"
                          >
                            {submittingActionId === returnActionId ? "Returning..." : "Confirm return"}
                          </button>
                        </div>
                      </div>
                    )}
                  </td>
                </tr>
              );})
            )}
          </tbody>
        </table>
      </div>

      <section className="mt-8 border-t border-[#D8E0EC] pt-6" aria-labelledby="report-card-approval-heading">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 id="report-card-approval-heading" className="text-xl font-black text-[#071D49]">
              Report Card Approval Queue
            </h3>
            <p className="mt-1 text-sm text-[#64748B]">
              Approve complete report cards for Principal release, or return them to the Exams Manager with a correction reason.
            </p>
          </div>
          <StatusChip
            label={`${reportCards?.length ?? 0} awaiting review`}
            tone={reportCards?.length ? "warning" : "neutral"}
          />
        </div>

        {reportCardsError ? (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
            <span>Report-card approvals could not be loaded: {reportCardsError.message}</span>
            <button type="button" onClick={() => void refetchReportCards()} className="rounded-lg border border-red-300 bg-white px-3 py-2 text-xs font-black text-red-700">
              Retry queue
            </button>
          </div>
        ) : null}

        <div className="overflow-x-auto rounded-xl border border-[#D8E0EC]">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#F8FAFC] text-[#071D49]">
              <tr>
                <th className="px-4 py-3 font-bold">Learner</th>
                <th className="px-4 py-3 font-bold">Exam</th>
                <th className="px-4 py-3 font-bold">Term</th>
                <th className="px-4 py-3 font-bold">Submitted</th>
                <th className="px-4 py-3 text-right font-bold">Decision</th>
              </tr>
            </thead>
            <tbody>
              {reportCardsError ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-[#64748B]">
                    The approval queue is temporarily unavailable. Retry above after the connection recovers.
                  </td>
                </tr>
              ) : reportCardsLoading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-[#64748B]">
                    Loading report-card approval queue...
                  </td>
                </tr>
              ) : !reportCards?.length ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-[#64748B]">
                    No report cards are awaiting Dean approval. Cards appear after the Exams Manager submits generated drafts.
                  </td>
                </tr>
              ) : (
                reportCards.map((reportCard) => {
                  const recalling = recallId === reportCard.id;
                  const approveActionId = `${reportCard.id}-approve`;
                  const recallActionId = `${reportCard.id}-recall`;

                  return (
                    <tr key={reportCard.id} className="border-t border-[#D8E0EC] align-top hover:bg-[#F8FAFC]">
                      <td className="px-4 py-3 text-[#64748B]">
                        <div className="font-bold text-[#071D49]">{reportCard.student_name || "Learner"}</div>
                        <div>{reportCard.admission_number || reportCard.student_id}</div>
                      </td>
                      <td className="px-4 py-3 text-[#64748B]">
                        {reportCard.exam_series_name || reportCard.exam_series_id || "Exam series"}
                      </td>
                      <td className="px-4 py-3 text-[#64748B]">
                        {[reportCard.term, reportCard.academic_year].filter(Boolean).join(" - ") || "Not assigned"}
                      </td>
                      <td className="px-4 py-3 text-[#64748B]">
                        {reportCard.submitted_at
                          ? new Date(reportCard.submitted_at).toLocaleString()
                          : "Submission recorded"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {!recalling ? (
                          <div className="flex flex-wrap justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => transitionReportCard(reportCard, "approve")}
                              disabled={Boolean(submittingActionId)}
                              className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-black text-white disabled:opacity-50"
                            >
                              {submittingActionId === approveActionId ? "Approving..." : "Approve for Principal"}
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
                            <label htmlFor={`dean-recall-${reportCard.id}`} className="text-left text-xs font-bold text-[#475569]">
                              Required correction reason
                            </label>
                            <textarea
                              id={`dean-recall-${reportCard.id}`}
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
                                disabled={submittingActionId === recallActionId}
                                className="rounded-lg border border-[#CBD5E1] bg-white px-3 py-2 text-xs font-black text-[#475569]"
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                onClick={() => transitionReportCard(reportCard, "recall")}
                                disabled={Boolean(submittingActionId) || !recallReason.trim()}
                                className="rounded-lg bg-amber-600 px-3 py-2 text-xs font-black text-white disabled:opacity-50"
                              >
                                {submittingActionId === recallActionId ? "Returning..." : "Confirm return"}
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
      </Panel>
    </div>
  );
}
