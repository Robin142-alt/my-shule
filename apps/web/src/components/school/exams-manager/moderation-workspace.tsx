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
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
          <div className="text-sm font-semibold text-[#64748B]">Total Submissions</div>
          <div className="mt-1 text-2xl font-black text-[#071D49]">{isLoading ? "..." : data?.metrics?.total_submissions ?? 0}</div>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <div className="text-sm font-semibold text-amber-700">Pending Review</div>
          <div className="mt-1 text-2xl font-black text-amber-700">{isLoading ? "..." : data?.metrics?.pending_review ?? 0}</div>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <div className="text-sm font-semibold text-emerald-700">Approved</div>
          <div className="mt-1 text-2xl font-black text-emerald-700">{isLoading ? "..." : data?.metrics?.approved ?? 0}</div>
        </div>
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
          <div className="text-sm font-semibold text-rose-700">Rejected</div>
          <div className="mt-1 text-2xl font-black text-rose-700">{isLoading ? "..." : data?.metrics?.rejected ?? 0}</div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-[#D8E0EC]">
        <table className="w-full text-sm text-left whitespace-nowrap">
          <thead className="bg-[#F8FAFC] text-[#071D49]">
            <tr>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Exam</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Subject</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Class</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Teacher</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Original Mean</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Moderated Mean</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Variance</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Students</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Status</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC] text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D8E0EC]">
            {isLoading ? (
              <tr><td colSpan={10} className="px-4 py-8 text-center text-[#64748B]">Loading moderation queue...</td></tr>
            ) : submissions.length === 0 ? (
              <tr><td colSpan={10} className="px-4 py-8 text-center text-[#64748B]">No marks submissions pending moderation. Marks will appear here after teachers submit them.</td></tr>
            ) : (
              submissions.map((sub) => (
                <tr key={sub.id} className="hover:bg-[#F8FAFC]">
                  <td className="px-4 py-3 font-semibold text-[#071D49]">{sub.exam_name}</td>
                  <td className="px-4 py-3 text-[#64748B]">{sub.subject}</td>
                  <td className="px-4 py-3 text-[#64748B]">{sub.class_name}</td>
                  <td className="px-4 py-3 text-[#64748B]">{sub.teacher}</td>
                  <td className="px-4 py-3 text-[#64748B]">{sub.original_mean?.toFixed(1)}</td>
                  <td className="px-4 py-3 text-[#64748B]">{sub.moderated_mean?.toFixed(1)}</td>
                  <td className="px-4 py-3 font-bold text-amber-600">{sub.variance?.toFixed(1)}%</td>
                  <td className="px-4 py-3 text-[#64748B]">{sub.students_affected}</td>
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
              className="w-full rounded border border-slate-300 p-2 text-sm text-[#071D49]"
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
              className="px-4 py-2 border rounded text-sm font-medium hover:bg-slate-50 text-[#071D49]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-[#071D49] text-white rounded text-sm font-medium hover:bg-blue-900"
            >
              Reject Submission
            </button>
          </div>
        </form>
      </Modal>
    </Panel>
  );
}
