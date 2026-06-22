"use client";

import { useState } from "react";
import { Inbox, CheckCircle, XCircle, Truck } from "lucide-react";
import { toast } from "sonner";
import { Panel, StatusChip, Tone } from "./shared";
import { useSchoolQuery } from "@/lib/data/school-hooks";
import { approveRequest, rejectRequest, fulfillRequest } from "./api-client";
import { Modal } from "@/components/ui/modal";
import { useForm } from "react-hook-form";

type StoreRequest = {
  id: string;
  requester_name: string;
  department: string;
  item_name: string;
  quantity_requested: number;
  unit: string;
  reason: string;
  priority: string;
  requested_date: string;
  status: string;
};

type RequestsData = {
  metrics: {
    total_requests: number;
    pending: number;
    approved: number;
    fulfilled: number;
    rejected: number;
  };
  requests: StoreRequest[];
};

type RejectFormData = {
  reason: string;
};

export function RequestsWorkspace() {
  const { data, isLoading, refetch } = useSchoolQuery<RequestsData>('/admin-command/storekeeper/requests');
  const [processing, setProcessing] = useState<string | null>(null);

  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [selectedRequestForReject, setSelectedRequestForReject] = useState<StoreRequest | null>(null);

  const rejectForm = useForm<RejectFormData>({
    defaultValues: {
      reason: "",
    }
  });

  const requests = data?.requests || [];

  const getStatusTone = (status: string): Tone => {
    if (status === "Pending") return "warning";
    if (status === "Approved") return "info";
    if (status === "Fulfilled") return "success";
    if (status === "Rejected") return "danger";
    if (status === "Partially Fulfilled") return "info";
    return "neutral";
  };

  const getPriorityTone = (priority: string): Tone => {
    if (priority === "Urgent") return "danger";
    if (priority === "High") return "warning";
    if (priority === "Normal") return "info";
    return "neutral";
  };

  const handleApprove = async (req: StoreRequest) => {
    setProcessing(req.id);
    try {
      await approveRequest(req.id);
      toast.success(`Request from ${req.requester_name} approved.`);
      refetch();
    } catch {
      toast.error("Failed to approve request.");
    } finally {
      setProcessing(null);
    }
  };

  const onSubmitReject = async (formData: RejectFormData) => {
    if (!selectedRequestForReject) return;
    setProcessing(selectedRequestForReject.id);
    try {
      await rejectRequest(selectedRequestForReject.id, formData.reason);
      toast.success(`Request rejected.`);
      setIsRejectOpen(false);
      rejectForm.reset();
      refetch();
    } catch {
      toast.error("Failed to reject request.");
    } finally {
      setProcessing(null);
      setSelectedRequestForReject(null);
    }
  };

  const handleFulfill = async (req: StoreRequest) => {
    if (!confirm(`Mark request for ${req.quantity_requested} ${req.unit}(s) of "${req.item_name}" as fulfilled?`)) return;
    setProcessing(req.id);
    try {
      await fulfillRequest(req.id);
      toast.success(`Request fulfilled. Stock deducted.`);
      refetch();
    } catch {
      toast.error("Failed to fulfill request.");
    } finally {
      setProcessing(null);
    }
  };

  return (
    <Panel
      title="Departmental Requests"
      description="Review and process item requests from departments and staff."
      icon={Inbox}
    >
      {/* Metrics */}
      <div className="grid gap-4 md:grid-cols-5 mb-6">
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
          <div className="text-sm font-semibold text-[#64748B]">Total Requests</div>
          <div className="mt-1 text-2xl font-black text-[#071D49]">{isLoading ? "..." : data?.metrics?.total_requests || 0}</div>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <div className="text-sm font-semibold text-amber-700">Pending</div>
          <div className="mt-1 text-2xl font-black text-amber-700">{isLoading ? "..." : data?.metrics?.pending || 0}</div>
        </div>
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
          <div className="text-sm font-semibold text-blue-700">Approved</div>
          <div className="mt-1 text-2xl font-black text-blue-700">{isLoading ? "..." : data?.metrics?.approved || 0}</div>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <div className="text-sm font-semibold text-emerald-700">Fulfilled</div>
          <div className="mt-1 text-2xl font-black text-emerald-700">{isLoading ? "..." : data?.metrics?.fulfilled || 0}</div>
        </div>
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
          <div className="text-sm font-semibold text-rose-700">Rejected</div>
          <div className="mt-1 text-2xl font-black text-rose-700">{isLoading ? "..." : data?.metrics?.rejected || 0}</div>
        </div>
      </div>

      {/* Requests Table */}
      <div className="overflow-x-auto rounded-xl border border-[#D8E0EC]">
        <table className="w-full text-sm text-left whitespace-nowrap">
          <thead className="bg-[#F8FAFC] text-[#071D49]">
            <tr>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Priority</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Requester</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Department</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Item</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Qty</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Reason</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Date</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Status</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC] text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D8E0EC]">
            {isLoading ? (
              <tr><td colSpan={9} className="px-4 py-8 text-center text-[#64748B]">Loading requests...</td></tr>
            ) : requests.length === 0 ? (
              <tr><td colSpan={9} className="px-4 py-8 text-center text-[#64748B]">No departmental requests. Requests from staff and departments will appear here for processing.</td></tr>
            ) : (
              requests.map((req) => (
                <tr key={req.id} className="hover:bg-[#F8FAFC]">
                  <td className="px-4 py-3"><StatusChip label={req.priority} tone={getPriorityTone(req.priority)} /></td>
                  <td className="px-4 py-3 font-semibold text-[#071D49]">{req.requester_name}</td>
                  <td className="px-4 py-3 text-[#64748B]">{req.department}</td>
                  <td className="px-4 py-3 text-[#071D49]">{req.item_name}</td>
                  <td className="px-4 py-3 text-[#071D49]">{req.quantity_requested} {req.unit}</td>
                  <td className="px-4 py-3 text-[#64748B] max-w-[180px] truncate">{req.reason}</td>
                  <td className="px-4 py-3 text-[#64748B]">{req.requested_date}</td>
                  <td className="px-4 py-3"><StatusChip label={req.status} tone={getStatusTone(req.status)} /></td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex gap-2">
                      {req.status === "Pending" && (
                        <>
                          <button disabled={processing === req.id} onClick={() => handleApprove(req)} className="inline-flex items-center gap-1 text-emerald-600 hover:underline font-semibold text-xs disabled:opacity-50">
                            <CheckCircle className="h-3 w-3" /> Approve
                          </button>
                          <button
                            disabled={processing === req.id}
                            onClick={() => {
                              setSelectedRequestForReject(req);
                              rejectForm.reset({ reason: "" });
                              setIsRejectOpen(true);
                            }}
                            className="inline-flex items-center gap-1 text-rose-600 hover:underline font-semibold text-xs disabled:opacity-50"
                          >
                            <XCircle className="h-3 w-3" /> Reject
                          </button>
                        </>
                      )}
                      {req.status === "Approved" && (
                        <button disabled={processing === req.id} onClick={() => handleFulfill(req)} className="inline-flex items-center gap-1 text-blue-600 hover:underline font-semibold text-xs disabled:opacity-50">
                          <Truck className="h-3 w-3" /> {processing === req.id ? "Fulfilling..." : "Fulfill"}
                        </button>
                      )}
                      {(req.status === "Fulfilled" || req.status === "Rejected") && (
                        <span className="text-xs text-[#64748B]">Closed</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Reject Request Modal */}
      <Modal
        open={isRejectOpen}
        onClose={() => {
          setIsRejectOpen(false);
          setSelectedRequestForReject(null);
        }}
        title={`Reject Request: ${selectedRequestForReject?.item_name || ""}`}
      >
        <form onSubmit={rejectForm.handleSubmit(onSubmitReject)} className="space-y-4 py-4">
          <p className="text-sm text-[#64748B]">
            Reason for rejecting {selectedRequestForReject?.requester_name}&apos;s request for &quot;{selectedRequestForReject?.item_name}&quot;:
          </p>

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
                setSelectedRequestForReject(null);
              }}
              className="px-4 py-2 border rounded text-sm font-medium hover:bg-slate-50 text-[#071D49]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-rose-600 text-white rounded text-sm font-medium hover:bg-rose-700"
            >
              Reject Request
            </button>
          </div>
        </form>
      </Modal>
    </Panel>
  );
}
