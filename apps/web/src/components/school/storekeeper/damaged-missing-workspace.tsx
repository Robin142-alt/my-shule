"use client";

import { useState } from "react";
import { ShieldAlert, Plus } from "lucide-react";
import { toast } from "sonner";
import { Panel, StatusChip, Tone } from "./shared";
import { useSchoolQuery } from "@/lib/data/school-hooks";
import { reportDamagedItem, writeOffItem } from "./api-client";
import { Modal } from "@/components/ui/modal";
import { useForm } from "react-hook-form";

type DamagedRecord = {
  id: string;
  item_name: string;
  category: string;
  quantity: number;
  unit: string;
  type: string;
  reason: string;
  reported_by: string;
  reported_date: string;
  estimated_loss: number;
  status: string;
};

type DamagedMissingData = {
  metrics: {
    total_incidents: number;
    pending_writeoff: number;
    total_loss_value: number;
    written_off: number;
  };
  records: DamagedRecord[];
};

type ReportFormData = {
  itemName: string;
  type: string;
  quantity: number;
  reason: string;
};

type WriteOffFormData = {
  notes: string;
};

export function DamagedMissingWorkspace() {
  const { data, isLoading, refetch } = useSchoolQuery<DamagedMissingData>('/admin-command/storekeeper/damaged-missing');
  const [isReporting, setIsReporting] = useState(false);
  const [writingOff, setWritingOff] = useState<string | null>(null);

  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isWriteOffOpen, setIsWriteOffOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<DamagedRecord | null>(null);

  const reportForm = useForm<ReportFormData>({
    defaultValues: {
      itemName: "",
      type: "Damaged",
      quantity: 1,
      reason: "",
    }
  });

  const writeOffForm = useForm<WriteOffFormData>({
    defaultValues: {
      notes: "",
    }
  });

  const records = data?.records || [];

  const getTypeTone = (type: string): Tone => {
    if (type === "Damaged") return "warning";
    if (type === "Missing") return "danger";
    if (type === "Expired") return "danger";
    return "neutral";
  };

  const getStatusTone = (status: string): Tone => {
    if (status === "Reported") return "info";
    if (status === "Under Investigation") return "warning";
    if (status === "Written Off") return "neutral";
    if (status === "Recovered") return "success";
    if (status === "Pending Write-Off") return "warning";
    return "neutral";
  };

  const onSubmitReport = async (formData: ReportFormData) => {
    setIsReporting(true);
    try {
      await reportDamagedItem({
        item_name: formData.itemName,
        type: formData.type,
        quantity: Number(formData.quantity),
        reason: formData.reason
      });
      toast.success("Incident reported successfully.");
      setIsReportOpen(false);
      reportForm.reset();
      refetch();
    } catch {
      toast.error("Failed to report incident.");
    } finally {
      setIsReporting(false);
    }
  };

  const onSubmitWriteOff = async (formData: WriteOffFormData) => {
    if (!selectedRecord) return;
    setWritingOff(selectedRecord.id);
    try {
      await writeOffItem(selectedRecord.id, { notes: formData.notes });
      toast.success(`Write-off submitted for approval.`);
      setIsWriteOffOpen(false);
      writeOffForm.reset();
      refetch();
    } catch {
      toast.error("Failed to submit write-off.");
    } finally {
      setWritingOff(null);
      setSelectedRecord(null);
    }
  };

  return (
    <Panel
      title="Damaged & Missing Items"
      description="Track, report, and write off damaged, missing, or expired stock."
      icon={ShieldAlert}
      actions={
        <button
          onClick={() => {
            reportForm.reset();
            setIsReportOpen(true);
          }}
          className="inline-flex items-center gap-2 rounded-lg bg-[#071D49] px-4 py-2 text-sm font-black text-white hover:bg-blue-900 transition disabled:opacity-50"
        >
          <Plus className="h-4 w-4" /> Report Incident
        </button>
      }
    >
      {/* Metrics */}
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
          <div className="text-sm font-semibold text-[#64748B]">Total Incidents</div>
          <div className="mt-1 text-2xl font-black text-[#071D49]">{isLoading ? "..." : data?.metrics?.total_incidents || 0}</div>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <div className="text-sm font-semibold text-amber-700">Pending Write-Off</div>
          <div className="mt-1 text-2xl font-black text-amber-700">{isLoading ? "..." : data?.metrics?.pending_writeoff || 0}</div>
        </div>
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
          <div className="text-sm font-semibold text-rose-700">Total Loss Value</div>
          <div className="mt-1 text-2xl font-black text-rose-700">{isLoading ? "..." : `KES ${(data?.metrics?.total_loss_value || 0).toLocaleString()}`}</div>
        </div>
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
          <div className="text-sm font-semibold text-[#64748B]">Written Off</div>
          <div className="mt-1 text-2xl font-black text-[#071D49]">{isLoading ? "..." : data?.metrics?.written_off || 0}</div>
        </div>
      </div>

      {/* Records Table */}
      <div className="overflow-x-auto rounded-xl border border-[#D8E0EC]">
        <table className="w-full text-sm text-left whitespace-nowrap">
          <thead className="bg-[#F8FAFC] text-[#071D49]">
            <tr>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Type</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Item</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Qty</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Reason</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Reported By</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Date</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Est. Loss</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Status</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC] text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D8E0EC]">
            {isLoading ? (
              <tr><td colSpan={9} className="px-4 py-8 text-center text-[#64748B]">Loading records...</td></tr>
            ) : records.length === 0 ? (
              <tr><td colSpan={9} className="px-4 py-8 text-center text-[#64748B]">No damaged or missing items reported. Use &quot;Report Incident&quot; to log any losses.</td></tr>
            ) : (
              records.map((r) => (
                <tr key={r.id} className="hover:bg-[#F8FAFC]">
                  <td className="px-4 py-3"><StatusChip label={r.type} tone={getTypeTone(r.type)} /></td>
                  <td className="px-4 py-3 font-semibold text-[#071D49]">{r.item_name}</td>
                  <td className="px-4 py-3 text-[#071D49]">{r.quantity} {r.unit}</td>
                  <td className="px-4 py-3 text-[#64748B] max-w-[200px] truncate">{r.reason}</td>
                  <td className="px-4 py-3 text-[#64748B]">{r.reported_by}</td>
                  <td className="px-4 py-3 text-[#64748B]">{r.reported_date}</td>
                  <td className="px-4 py-3 text-rose-600 font-bold">KES {r.estimated_loss.toLocaleString()}</td>
                  <td className="px-4 py-3"><StatusChip label={r.status} tone={getStatusTone(r.status)} /></td>
                  <td className="px-4 py-3 text-right">
                    {r.status !== "Written Off" && r.status !== "Recovered" ? (
                      <button
                        disabled={writingOff === r.id}
                        onClick={() => {
                          setSelectedRecord(r);
                          writeOffForm.reset({ notes: "" });
                          setIsWriteOffOpen(true);
                        }}
                        className="text-rose-600 hover:underline font-semibold text-xs disabled:opacity-50"
                      >
                        {writingOff === r.id ? "Submitting..." : "Write Off"}
                      </button>
                    ) : (
                      <span className="text-xs text-[#64748B]">Closed</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Report Incident Modal */}
      <Modal
        open={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        title="Report Incident"
      >
        <form onSubmit={reportForm.handleSubmit(onSubmitReport)} className="space-y-4 py-4">
          <div className="space-y-1">
            <label className="text-sm font-medium">Item Name</label>
            <input
              type="text"
              {...reportForm.register("itemName", { required: "Item name is required" })}
              className="w-full rounded border border-slate-300 p-2 text-sm text-[#071D49]"
              placeholder="e.g. Science Beakers"
            />
            {reportForm.formState.errors.itemName && (
              <span className="text-xs text-red-500">{reportForm.formState.errors.itemName.message}</span>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Type</label>
            <select
              {...reportForm.register("type", { required: "Type is required" })}
              className="w-full rounded border border-slate-300 p-2 text-sm text-[#071D49]"
            >
              <option value="Damaged">Damaged</option>
              <option value="Missing">Missing</option>
              <option value="Expired">Expired</option>
            </select>
            {reportForm.formState.errors.type && (
              <span className="text-xs text-red-500">{reportForm.formState.errors.type.message}</span>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Quantity Affected</label>
            <input
              type="number"
              {...reportForm.register("quantity", {
                required: "Quantity is required",
                min: { value: 1, message: "Quantity must be at least 1" },
                valueAsNumber: true,
              })}
              className="w-full rounded border border-slate-300 p-2 text-sm text-[#071D49]"
              placeholder="1"
            />
            {reportForm.formState.errors.quantity && (
              <span className="text-xs text-red-500">{reportForm.formState.errors.quantity.message}</span>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Reason / Description</label>
            <textarea
              {...reportForm.register("reason", { required: "Reason is required" })}
              className="w-full rounded border border-slate-300 p-2 text-sm text-[#071D49]"
              placeholder="Describe the incident"
              rows={3}
            />
            {reportForm.formState.errors.reason && (
              <span className="text-xs text-red-500">{reportForm.formState.errors.reason.message}</span>
            )}
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsReportOpen(false)}
              className="px-4 py-2 border rounded text-sm font-medium hover:bg-slate-50 text-[#071D49]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isReporting}
              className="px-4 py-2 bg-[#071D49] text-white rounded text-sm font-medium hover:bg-blue-900 disabled:opacity-50"
            >
              {isReporting ? "Reporting..." : "Report Incident"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Write Off Modal */}
      <Modal
        open={isWriteOffOpen}
        onClose={() => {
          setIsWriteOffOpen(false);
          setSelectedRecord(null);
        }}
        title={`Write Off: ${selectedRecord?.item_name || ""}`}
      >
        <form onSubmit={writeOffForm.handleSubmit(onSubmitWriteOff)} className="space-y-4 py-4">
          <p className="text-sm text-[#64748B]">
            Confirm write-off of {selectedRecord?.quantity} {selectedRecord?.unit}(s) of &quot;{selectedRecord?.item_name}&quot;?
          </p>

          <div className="space-y-1">
            <label className="text-sm font-medium">Notes / Justification</label>
            <textarea
              {...writeOffForm.register("notes", { required: "Notes are required" })}
              className="w-full rounded border border-slate-300 p-2 text-sm text-[#071D49]"
              placeholder="Enter reasons for write-off"
              rows={3}
            />
            {writeOffForm.formState.errors.notes && (
              <span className="text-xs text-red-500">{writeOffForm.formState.errors.notes.message}</span>
            )}
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => {
                setIsWriteOffOpen(false);
                setSelectedRecord(null);
              }}
              className="px-4 py-2 border rounded text-sm font-medium hover:bg-slate-50 text-[#071D49]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!!writingOff}
              className="px-4 py-2 bg-rose-600 text-white rounded text-sm font-medium hover:bg-rose-700 disabled:opacity-50"
            >
              {writingOff ? "Submitting..." : "Confirm Write Off"}
            </button>
          </div>
        </form>
      </Modal>
    </Panel>
  );
}
