"use client";
import { useState } from "react";
import { ShieldCheck, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Panel, StatusChip, Tone } from "./shared";
import { useSchoolQuery } from "@/lib/data/school-hooks";
import { approveModeration, rejectModeration } from "./api-client";
import { Modal } from "@/components/ui/modal";
import { useForm } from "react-hook-form";
import { localReportDate } from "@/lib/report-cards/local-date";

type ModerationRecord = {
  id: string;
  exam_name: string;
  subject: string;
  class_name: string;
  teacher: string;
  original_mean: number | string | null;
  max_score?: number | string;
  score_status?: string;
  student_name?: string;
  validation_issues?: string[];
  students_affected: number;
  status: string;
  submitted_at: string;
};

type ModerationData = {
  metrics: {
    total_submissions: number;
    pending_review: number;
    ready_for_review: number;
    requires_correction: number;
  };
  total: number;
  submissions: ModerationRecord[];
};

type RejectModerationFormData = {
  reason: string;
};

export function ModerationWorkspace() {
  const [page, setPage] = useState(1);
  const { data, error, isLoading, refetch } = useSchoolQuery<ModerationData>(`/admin-command/exams-manager/moderation?page=${page}`);
  const [actionId, setActionId] = useState<string | null>(null);

  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [selectedSubId, setSelectedSubId] = useState<string | null>(null);

  const rejectForm = useForm<RejectModerationFormData>({
    defaultValues: { reason: "" },
  });

  const submissions = data?.submissions || [];

  const getStatusTone = (st: string): Tone => {
    switch (st?.toLowerCase()) {
      case "approved": return "success";
      case "pending": case "pending_review": return "warning";
      case "rejected": return "danger";
      default: return "neutral";
    }
  };

  const handleApprove = async (id: string) => {
    setActionId(id);
    try {
      await approveModeration(id);
      toast.success("Marks approved.");
      refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to approve marks.");
    } finally {
      setActionId(null);
    }
  };

  const handleRejectClick = (id: string) => {
    setSelectedSubId(id);
    rejectForm.reset({ reason: "" });
    setIsRejectOpen(true);
  };

  const onSubmitReject = async (formData: RejectModerationFormData) => {
    if (!selectedSubId) return;
    setActionId(selectedSubId);
    try {
      await rejectModeration(selectedSubId, formData.reason);
      toast.success("Marks rejected and sent back to teacher.");
      setIsRejectOpen(false);
      rejectForm.reset();
      refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to reject marks.");
    } finally {
      setActionId(null);
      setSelectedSubId(null);
    }
  };

  return (
    <Panel title="Data Validation" description="Review submitted learner marks. Resolve flagged entries before approval; locked and published marks remain protected." icon={ShieldCheck}>
      {error ? <div role="alert" className="mb-4 rounded-xl border border-danger-border bg-danger-soft p-4 text-sm text-danger">{error.message}<button type="button" onClick={() => void refetch()} className="ml-3 min-h-11 font-semibold underline">Retry validation</button></div> : null}
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <div className="rounded-xl border border-border bg-surface-muted p-4">
          <div className="text-sm font-semibold text-muted">Total Submissions</div>
          <div className="mt-1 text-2xl font-black text-foreground">{isLoading ? "..." : data?.metrics?.total_submissions ?? 0}</div>
        </div>
        <div className="rounded-xl border border-warning-border bg-warning-soft p-4">
          <div className="text-sm font-semibold text-warning">On this page</div>
          <div className="mt-1 text-2xl font-black text-warning">{isLoading ? "..." : data?.metrics?.pending_review ?? 0}</div>
        </div>
        <div className="rounded-xl border border-success-border bg-success-soft p-4">
          <div className="text-sm font-semibold text-success">Ready for review on this page</div>
          <div className="mt-1 text-2xl font-black text-success">{isLoading ? "..." : data?.metrics?.ready_for_review ?? 0}</div>
        </div>
        <div className="rounded-xl border border-danger-border bg-danger-soft p-4">
          <div className="text-sm font-semibold text-danger">Issues on this page</div>
          <div className="mt-1 text-2xl font-black text-danger">{isLoading ? "..." : data?.metrics?.requires_correction ?? 0}</div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm text-left whitespace-nowrap">
          <thead className="bg-surface-muted text-foreground">
            <tr>
              <th className="px-4 py-3 font-bold border-b border-border">Exam</th>
              <th className="px-4 py-3 font-bold border-b border-border">Subject</th>
              <th className="px-4 py-3 font-bold border-b border-border">Class</th>
              <th className="px-4 py-3 font-bold border-b border-border">Teacher</th>
              <th className="px-4 py-3 font-bold border-b border-border">Learner</th>
              <th className="px-4 py-3 font-bold border-b border-border">Mark</th>
              <th className="px-4 py-3 font-bold border-b border-border">Validation</th>
              <th className="px-4 py-3 font-bold border-b border-border">Submitted</th>
              <th className="px-4 py-3 font-bold border-b border-border">Status</th>
              <th className="px-4 py-3 font-bold border-b border-border text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              <tr><td colSpan={10} className="px-4 py-8 text-center text-muted">Loading moderation queue...</td></tr>
            ) : error ? null : submissions.length === 0 ? (
              <tr><td colSpan={10} className="px-4 py-8 text-center text-muted">No marks submissions pending moderation. Marks will appear here after teachers submit them.</td></tr>
            ) : (
              submissions.map((sub) => (
                <tr key={sub.id} className="hover:bg-surface-muted">
                  <td className="px-4 py-3 font-semibold text-foreground">{sub.exam_name}</td>
                  <td className="px-4 py-3 text-muted">{sub.subject}</td>
                  <td className="px-4 py-3 text-muted">{sub.class_name}</td>
                  <td className="px-4 py-3 text-muted">{sub.teacher}</td>
                  <td className="px-4 py-3 text-muted">{sub.student_name || "Learner record unavailable"}</td>
                  <td className="px-4 py-3 text-muted">{sub.original_mean !== null && Number.isFinite(Number(sub.original_mean)) ? Number(sub.original_mean).toFixed(1) : sub.score_status || "Missing"}{sub.max_score ? ` / ${Number(sub.max_score)}` : ""}</td>
                  <td className="max-w-sm whitespace-normal px-4 py-3 text-muted">{sub.validation_issues?.length ? sub.validation_issues.join(" · ") : "Ready for review"}</td>
                  <td className="px-4 py-3 text-muted">{localReportDate(sub.submitted_at)}</td>
                  <td className="px-4 py-3"><StatusChip label={sub.status} tone={getStatusTone(sub.status)} /></td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => handleApprove(sub.id)} disabled={Boolean(actionId) || Boolean(sub.validation_issues?.length)} className="inline-flex min-h-11 items-center gap-1 text-xs font-semibold text-emerald-600 hover:underline disabled:opacity-50">
                        <CheckCircle className="w-3 h-3" /> Approve
                      </button>
                      <button onClick={() => handleRejectClick(sub.id)} disabled={actionId === sub.id} className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600 hover:underline disabled:opacity-50">
                        <XCircle className="w-3 h-3" /> Reject
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex items-center justify-between text-sm">
        <button type="button" className="min-h-11 disabled:opacity-40" disabled={page === 1 || isLoading} onClick={() => setPage(value => value - 1)}>Previous</button>
        <span>Page {page} · {data?.total ?? 0} awaiting review</span>
        <button type="button" className="min-h-11 disabled:opacity-40" disabled={page * 50 >= (data?.total ?? 0) || isLoading} onClick={() => setPage(value => value + 1)}>Next</button>
      </div>

      {/* Reject Moderation Modal */}
      <Modal
        open={isRejectOpen}
        onClose={() => {
          setIsRejectOpen(false);
          setSelectedSubId(null);
        }}
        title="Reject Marks Submission"
      >
        <form onSubmit={rejectForm.handleSubmit(onSubmitReject)} className="space-y-4 py-4">
          <div className="space-y-1">
            <label className="text-sm font-medium">Rejection Reason</label>
            <textarea
              {...rejectForm.register("reason", { required: "Reason is required" })}
              className="w-full rounded border border-slate-300 p-2 text-sm text-foreground"
              placeholder="Provide a reason for rejection..."
              rows={3}
            />
            {rejectForm.formState.errors.reason && (
              <span className="text-xs text-red-500">{rejectForm.formState.errors.reason.message}</span>
            )}
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => {
                setIsRejectOpen(false);
                setSelectedSubId(null);
              }}
              className="px-4 py-2 border rounded text-sm font-medium hover:bg-slate-50 text-foreground"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-primary text-white rounded text-sm font-medium hover:bg-blue-900"
            >
              Reject Submission
            </button>
          </div>
        </form>
      </Modal>
    </Panel>
  );
}
