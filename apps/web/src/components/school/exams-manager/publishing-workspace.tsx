"use client";

import { useState } from "react";
import { Send } from "lucide-react";
import { toast } from "sonner";

import type { LiveExamReportCard } from "@/lib/modules/exams-client";
import { useSchoolQuery } from "@/lib/data/school-hooks";
import { transitionReportCard } from "./api-client";
import { Panel, StatusChip, type Tone } from "./shared";

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

export function PublishingWorkspace() {
  const {
    data,
    error,
    isLoading,
    refetch,
  } = useSchoolQuery<LiveExamReportCard[]>("/exams/report-cards?limit=50");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [recallId, setRecallId] = useState<string | null>(null);
  const [recallReason, setRecallReason] = useState("");
  const items = data ?? [];

  const submitCount = items.filter((item) => SUBMITTABLE_STATUSES.has(item.status)).length;
  const deanReviewCount = items.filter((item) => item.status === "under_review").length;
  const approvedCount = items.filter((item) => item.status === "approved").length;

  async function submitForDeanReview(row: LiveExamReportCard) {
    setBusyId(row.id);
    try {
      await transitionReportCard(row.id, "submit");
      toast.success("Report card submitted to the Dean of Academics for approval.");
      await refetch();
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
      await refetch();
    } catch (actionError) {
      toast.error(actionError instanceof Error ? actionError.message : "Report card could not be recalled.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Panel
      title="Report Card Handoff"
      description="Submit generated report cards to the Dean of Academics. The Exams Manager can recall a card while it is under review, but only the Principal can publish approved results."
      icon={Send}
    >
      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
          <div className="text-sm font-semibold text-[#64748B]">Ready to submit</div>
          <div className="mt-1 text-lg font-black text-[#071D49]">{isLoading ? "..." : submitCount}</div>
        </div>
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
          <div className="text-sm font-semibold text-[#64748B]">Awaiting Dean review</div>
          <div className="mt-1 text-lg font-black text-[#071D49]">{isLoading ? "..." : deanReviewCount}</div>
        </div>
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
          <div className="text-sm font-semibold text-[#64748B]">Dean approved</div>
          <div className="mt-1 text-lg font-black text-[#071D49]">{isLoading ? "..." : approvedCount}</div>
        </div>
      </div>

      {error ? (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
          Report-card handoff could not be loaded: {error.message}
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-xl border border-[#D8E0EC]">
        <table className="w-full text-left text-sm">
          <thead className="bg-[#F8FAFC] text-[#071D49]">
            <tr>
              <th className="px-4 py-3 font-bold">Learner</th>
              <th className="px-4 py-3 font-bold">Exam</th>
              <th className="px-4 py-3 font-bold">Term</th>
              <th className="px-4 py-3 font-bold">Revision</th>
              <th className="px-4 py-3 font-bold">Status</th>
              <th className="px-4 py-3 text-right font-bold">Next action</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-[#64748B]">
                  Loading report-card handoff queue...
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-[#64748B]">
                  No report cards have been generated. Generate report cards from moderated, locked marks before submitting them for approval.
                </td>
              </tr>
            ) : (
              items.map((row) => {
                const canSubmit = SUBMITTABLE_STATUSES.has(row.status);
                const canRecall = row.status === "under_review";
                const recalling = recallId === row.id;

                return (
                  <tr key={row.id} className="border-t border-[#D8E0EC] align-top hover:bg-[#F8FAFC]">
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
