"use client";
import { useState } from "react";
import { ClipboardList } from "lucide-react";
import { toast } from "sonner";

import { requestDashboardApi } from "@/lib/dashboard/api-client";
import { useSchoolQuery } from "@/lib/data/school-hooks";
import { fieldValue, listFromData, metricFromData, Panel, StatusChip, Tone } from "./shared";

type AssessmentsRecord = {
  id?: string;
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

export function AssessmentsWorkspace() {
  const { data, isLoading, refetch } = useSchoolQuery<AssessmentsData | AssessmentsRecord[]>('/admin-command/dean-academics/assessments');
  const items = listFromData<AssessmentsRecord>(data, "assessmentsList");
  const [isLocking, setIsLocking] = useState(false);
  const [submittingActionId, setSubmittingActionId] = useState<string | null>(null);

  const getStatusTone = (st: string): Tone => {
    if (st === "Active" || st === "Available" || st === "Approved" || st === "Completed" || st === "Resolved" || st === "Present" || st === "Functional" || st === "On Track" || st === "Cleared") return "success";
    if (st === "Pending" || st === "In Progress" || st === "Pending Approval" || st === "Scheduled" || st === "On Loan" || st === "Behind" || st === "Departed" || st === "Warning" || st === "Pending Review") return "warning";
    if (st === "Overdue" || st === "Critical" || st === "Rejected" || st === "Escalated" || st === "Expired" || st === "Damaged" || st === "Flagged" || st === "Absent" || st === "Blacklisted" || st === "Disposed" || st === "Unauthorized") return "danger";
    if (st === "Issued" || st === "Checked In" || st === "Submitted" || st === "Booked" || st === "Sent" || st === "On Leave") return "info";
    return "neutral";
  };

  const lockableItems = items.filter((item) => {
    const status = fieldValue(item, ["status"], "").toLowerCase();
    return status.includes("review") || status.includes("moderation") || status.includes("pending");
  });

  async function handleLockBatch() {
    if (isLocking || lockableItems.length === 0) return;

    setIsLocking(true);
    try {
      await requestDashboardApi("/admin-command/dean-academics/lock-batch", {
        method: "POST",
        body: {
          markIds: lockableItems.map((item) => item.id).filter(Boolean),
          title: "Dean assessment batch locked",
          message: "Dean of Academics locked reviewed assessment marks for the academic review chain.",
          sourceWorkspace: "assessments",
        },
      });

      toast.success("Dean academic workflow saved. Assessment batch was locked for review.");
      await refetch();
    } catch (err: any) {
      toast.error(err.message || "Assessment batch could not be locked.");
    } finally {
      setIsLocking(false);
    }
  }

  async function recordDeanAssessmentAction(item: AssessmentsRecord, action: "return_for_correction" | "request_moderation") {
    const actionKey = `${item.id ?? "assessment"}-${action}`;
    if (submittingActionId) return;

    setSubmittingActionId(actionKey);
    try {
      await requestDashboardApi("/admin-command/dean-academics/action", {
        method: "POST",
        body: {
          action,
          id: item.id ?? null,
          title: action === "return_for_correction" ? "Assessment returned for correction" : "Assessment moderation requested",
          message: `${fieldValue(item, ["title", "exam"], "Assessment")} was routed by Dean of Academics.`,
          workspace: "assessments",
          subject: fieldValue(item, ["subject", "subject_name"]),
          classStream: fieldValue(item, ["class", "class_name"]),
        },
      });

      toast.success("Dean academic workflow saved.");
      await refetch();
    } catch (err: any) {
      toast.error(err.message || "Dean assessment action could not be saved.");
    } finally {
      setSubmittingActionId(null);
    }
  }

  return (
    <Panel
      title="Assessments"
      description="Manage and monitor school-wide assessments."
      icon={ClipboardList}
      actions={
        <button type="button" onClick={handleLockBatch} disabled={isLocking || lockableItems.length === 0} className="rounded-xl bg-[#071D49] px-4 py-2 text-sm font-black text-white disabled:opacity-50">
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
          <div className="text-sm font-semibold text-[#64748B]">Pending Marking</div>
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
              items.map(row => (
                <tr key={row.id ?? fieldValue(row, ["title", "exam"])} className="border-t border-[#D8E0EC] hover:bg-[#F8FAFC]">
                  <td className="px-4 py-3 text-[#64748B]">{fieldValue(row, ["title", "exam", "assessment_name"])}</td>
                  <td className="px-4 py-3 text-[#64748B]">{fieldValue(row, ["subject", "subject_name"])}</td>
                  <td className="px-4 py-3 text-[#64748B]">{fieldValue(row, ["class", "class_name", "classStream"])}</td>
                  <td className="px-4 py-3 text-[#64748B]">{fieldValue(row, ["date", "created_at"])}</td>
                  <td className="px-4 py-3 text-[#64748B]">{fieldValue(row, ["total_marks", "max_score"], "0")}</td>
                  <td className="px-4 py-3 text-[#64748B]">{fieldValue(row, ["submissions", "submission_count"], "0")}</td>
                  <td className="px-4 py-3"><StatusChip label={fieldValue(row, ["status"], "Pending Review")} tone={getStatusTone(fieldValue(row, ["status"], "Pending Review"))} /></td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => recordDeanAssessmentAction(row, "request_moderation")}
                        disabled={!!submittingActionId}
                        className="rounded-lg border border-[#BFDBFE] bg-[#EEF5FF] px-3 py-1.5 text-xs font-black text-[#0B63CE] disabled:opacity-50"
                      >
                        Moderate
                      </button>
                      <button
                        type="button"
                        onClick={() => recordDeanAssessmentAction(row, "return_for_correction")}
                        disabled={!!submittingActionId}
                        className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-black text-amber-700 disabled:opacity-50"
                      >
                        Return
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
