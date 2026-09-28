"use client";
import { useState } from "react";
import { ShieldCheck, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Panel, StatusChip, Tone } from "./shared";
import { useSchoolQuery } from "@/lib/data/school-hooks";
import { approveModeration, rejectModeration } from "./api-client";
import { Modal } from "@/components/ui/modal";
import { useForm } from "react-hook-form";

type ModerationRecord = {
  id: string;
  exam_name: string;
  subject: string;
  class_name: string;
  teacher: string;
  original_mean: number;
  moderated_mean: number;
  variance: number;
  students_affected: number;
  status: string;
  submitted_at: string;
};

type ModerationData = {
  metrics: {
    total_submissions: number;
    pending_review: number;
    approved: number;
    rejected: number;
  };
  submissions: ModerationRecord[];
};

type RejectModerationFormData = {
  reason: string;
};

export function ModerationWorkspace() {
  const { data, isLoading, refetch } = useSchoolQuery<ModerationData>('/admin-command/exams-manager/moderation');
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
    } catch {
      toast.error("Failed to approve marks.");
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
    } catch {
      toast.error("Failed to reject marks.");
    } finally {
      setActionId(null);
      setSelectedSubId(null);
    }
  };

  return (
    <Panel title="Marks Moderation" description="Review and moderate submitted marks before publishing results." icon={ShieldCheck}>
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <div className="rounded-xl border border-border bg-surface-muted p-4">
          <div className="text-sm font-semibold text-muted">Total Submissions</div>
          <div className="mt-1 text-2xl font-black text-foreground">{isLoading ? "..." : data?.metrics?.total_submissions ?? 0}</div>
        </div>
        <div className="rounded-xl border border-warning-border bg-warning-soft p-4">
          <div className="text-sm font-semibold text-warning">Pending Review</div>
          <div className="mt-1 text-2xl font-black text-warning">{isLoading ? "..." : data?.metrics?.pending_review ?? 0}</div>
        </div>
        <div className="rounded-xl border border-success-border bg-success-soft p-4">
          <div className="text-sm font-semibold text-success">Approved</div>
          <div className="mt-1 text-2xl font-black text-success">{isLoading ? "..." : data?.metrics?.approved ?? 0}</div>
        </div>
        <div className="rounded-xl border border-danger-border bg-danger-soft p-4">
          <div className="text-sm font-semibold text-danger">Rejected</div>
          <div className="mt-1 text-2xl font-black text-danger">{isLoading ? "..." : data?.metrics?.rejected ?? 0}</div>
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
              <th className="px-4 py-3 font-bold border-b border-border">Original Mean</th>
              <th className="px-4 py-3 font-bold border-b border-border">Moderated Mean</th>
              <th className="px-4 py-3 font-bold border-b border-border">Variance</th>
              <th className="px-4 py-3 font-bold border-b border-border">Students</th>
              <th className="px-4 py-3 font-bold border-b border-border">Status</th>
              <th className="px-4 py-3 font-bold border-b border-border text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              <tr><td colSpan={10} className="px-4 py-8 text-center text-muted">Loading moderation queue...</td></tr>
            ) : submissions.length === 0 ? (
              <tr><td colSpan={10} className="px-4 py-8 text-center text-muted">No marks submissions pending moderation. Marks will appear here after teachers submit them.</td></tr>
            ) : (
              submissions.map((sub) => (
                <tr key={sub.id} className="hover:bg-surface-muted">
                  <td className="px-4 py-3 font-semibold text-foreground">{sub.exam_name}</td>
                  <td className="px-4 py-3 text-muted">{sub.subject}</td>
                  <td className="px-4 py-3 text-muted">{sub.class_name}</td>
                  <td className="px-4 py-3 text-muted">{sub.teacher}</td>
                  <td className="px-4 py-3 text-muted">{sub.original_mean?.toFixed(1)}</td>
                  <td className="px-4 py-3 text-muted">{sub.moderated_mean?.toFixed(1)}</td>
                  <td className="px-4 py-3 font-bold text-amber-600">{sub.variance?.toFixed(1)}%</td>
                  <td className="px-4 py-3 text-muted">{sub.students_affected}</td>
                  <td className="px-4 py-3"><StatusChip label={sub.status} tone={getStatusTone(sub.status)} /></td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => handleApprove(sub.id)} disabled={actionId === sub.id} className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:underline disabled:opacity-50">
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
