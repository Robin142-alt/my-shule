"use client";

import { CheckSquare } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import {
  ExamWorkflowTracker,
  type ExamModerationBatch,
  type ExamWorkflowData,
} from "../exam-workflow-tracker";
import { Panel } from "./shared";
import { useSchoolQuery } from "@/lib/data/school-hooks";
import { requestDashboardApi } from "@/lib/dashboard/api-client";

const endpoint = "/admin-command/hod/marks-moderation";

export function MarksModerationWorkspace() {
  const { data, error, isLoading, refetch } = useSchoolQuery<ExamWorkflowData>(endpoint);
  const [busyId, setBusyId] = useState("");
  const [returningId, setReturningId] = useState("");
  const [reason, setReason] = useState("");
  const items = data?.moderation_batches ?? [];

  async function moderate(batch: ExamModerationBatch, action: "approve" | "return_for_correction") {
    const trimmedReason = reason.trim();
    if (action === "return_for_correction" && !trimmedReason) {
      toast.error("Enter the required correction reason.");
      return;
    }
    if (batch.mark_ids.length === 0) {
      toast.error("No submitted marks are attached to this moderation batch.");
      return;
    }

    const actionKey = `${batch.id}:${action}`;
    setBusyId(actionKey);
    try {
      await requestDashboardApi("/exams/marks/moderate", {
        method: "POST",
        body: {
          action,
          mark_ids: batch.mark_ids,
          ...(action === "return_for_correction" ? { reason: trimmedReason } : {}),
        },
      });
      toast.success(
        action === "approve"
          ? `${batch.mark_ids.length} marks approved and sent to the Dean lock queue.`
          : "Marks returned to the teacher with the correction reason.",
      );
      setReturningId("");
      setReason("");
      await refetch();
    } catch (requestError) {
      toast.error(requestError instanceof Error ? requestError.message : "Moderation action failed.");
    } finally {
      setBusyId("");
    }
  }

  return (
    <div className="space-y-5">
      <ExamWorkflowTracker endpoint={endpoint} heading="Department exam workflow" />
      <Panel
        title="Marks Moderation Queue"
        description="Approve submitted department marks or return them to the teacher with a required correction reason."
        icon={CheckSquare}
      >
        {error ? (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800">
            Moderation queue could not be loaded: {error.message}
          </div>
        ) : null}
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <div className="text-xs font-black uppercase text-amber-700">Submitted marks</div>
            <div className="mt-1 text-2xl font-black text-amber-800">
              {isLoading ? "..." : data?.metrics.marks_awaiting_moderation ?? 0}
            </div>
          </div>
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
            <div className="text-xs font-black uppercase text-blue-700">Batches</div>
            <div className="mt-1 text-2xl font-black text-blue-800">{isLoading ? "..." : items.length}</div>
          </div>
          <div className="col-span-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 sm:col-span-1">
            <div className="text-xs font-black uppercase text-emerald-700">Sent to Dean</div>
            <div className="mt-1 text-2xl font-black text-emerald-800">
              {isLoading ? "..." : data?.metrics.marks_awaiting_lock ?? 0}
            </div>
          </div>
        </div>

        <div className="space-y-3">
          {!isLoading && items.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[#C8D5EA] bg-[#F8FAFC] px-4 py-8 text-center">
              <p className="font-black text-[#071D49]">No marks await HOD moderation.</p>
              <p className="mt-1 text-sm font-semibold text-[#64748B]">Teacher submissions for subjects in your assigned department appear here automatically.</p>
            </div>
          ) : null}
          {items.map((batch) => {
            const returning = returningId === batch.id;
            return (
              <article key={batch.id} className="rounded-xl border border-[#D8E0EC] p-4">
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[1.2fr_1fr_1fr_1fr_auto] xl:items-center">
                  <div>
                    <p className="font-black text-[#071D49]">{batch.exam_name}</p>
                    <p className="text-sm font-semibold text-[#64748B]">{batch.subject_name} - {batch.class_name}</p>
                  </div>
                  <p className="text-sm"><span className="font-black">Teacher:</span> {batch.teacher_name}</p>
                  <p className="text-sm"><span className="font-black">Marks:</span> {batch.mark_count}</p>
                  <p className="text-sm"><span className="font-black">Mean:</span> {batch.mean_score ?? "No numeric scores"}</p>
                  {!returning ? (
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => void moderate(batch, "approve")}
                        disabled={Boolean(busyId) || batch.submitted_count === 0}
                        className="rounded-lg bg-[#071D49] px-3 py-2 text-xs font-black text-white disabled:opacity-50"
                      >
                        {busyId === `${batch.id}:approve` ? "Approving..." : "Approve"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setReturningId(batch.id);
                          setReason("");
                        }}
                        disabled={Boolean(busyId) || batch.submitted_count === 0}
                        className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-black text-amber-800 disabled:opacity-50"
                      >
                        Return
                      </button>
                    </div>
                  ) : null}
                </div>
                {returning ? (
                  <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3">
                    <label htmlFor={`return-reason-${batch.id}`} className="text-xs font-black text-amber-900">
                      Required correction reason
                    </label>
                    <textarea
                      id={`return-reason-${batch.id}`}
                      value={reason}
                      onChange={(event) => setReason(event.target.value)}
                      rows={2}
                      className="mt-2 w-full rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm"
                    />
                    <div className="mt-2 flex justify-end gap-2">
                      <button type="button" onClick={() => setReturningId("")} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-black">Cancel</button>
                      <button
                        type="button"
                        onClick={() => void moderate(batch, "return_for_correction")}
                        disabled={Boolean(busyId) || !reason.trim()}
                        className="rounded-lg bg-amber-700 px-3 py-2 text-xs font-black text-white disabled:opacity-50"
                      >
                        {busyId === `${batch.id}:return_for_correction` ? "Returning..." : "Return to teacher"}
                      </button>
                    </div>
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      </Panel>
    </div>
  );
}
