"use client";

import { useState } from "react";
import { ShieldAlert, Plus } from "lucide-react";
import { toast } from "sonner";
import { Panel, StatusChip, Tone } from "./shared";
import { useSchoolQuery } from "@/lib/data/school-hooks";
import { reportDamagedItem, writeOffItem } from "./api-client";

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

export function DamagedMissingWorkspace() {
  const { data, isLoading, refetch } = useSchoolQuery<DamagedMissingData>('/admin-command/storekeeper/damaged-missing');
  const [isReporting, setIsReporting] = useState(false);
  const [writingOff, setWritingOff] = useState<string | null>(null);

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

  const handleReport = async () => {
    setIsReporting(true);
    try {
      const itemName = prompt("Item name?");
      if (!itemName) { setIsReporting(false); return; }
      const type = prompt("Type: Damaged, Missing, or Expired?");
      if (!type) { setIsReporting(false); return; }
      const quantity = prompt("Quantity affected?");
      if (!quantity) { setIsReporting(false); return; }
      const reason = prompt("Reason / description of incident?");
      if (!reason) { setIsReporting(false); return; }

      await reportDamagedItem({ item_name: itemName, type, quantity: Number(quantity), reason });
      toast.success("Incident reported successfully.");
      refetch();
    } catch {
      toast.error("Failed to report incident.");
    } finally {
      setIsReporting(false);
    }
  };

  const handleWriteOff = async (record: DamagedRecord) => {
    const notes = prompt(`Confirm write-off of ${record.quantity} ${record.unit}(s) of "${record.item_name}"? Enter notes:`);
    if (!notes) return;
    setWritingOff(record.id);
    try {
      await writeOffItem(record.id, { notes });
      toast.success(`Write-off submitted for approval.`);
      refetch();
    } catch {
      toast.error("Failed to submit write-off.");
    } finally {
      setWritingOff(null);
    }
  };

  return (
    <Panel
      title="Damaged & Missing Items"
      description="Track, report, and write off damaged, missing, or expired stock."
      icon={ShieldAlert}
      actions={
        <button
          disabled={isReporting}
          onClick={handleReport}
          className="inline-flex items-center gap-2 rounded-lg bg-[#071D49] px-4 py-2 text-sm font-black text-white hover:bg-blue-900 transition disabled:opacity-50"
        >
          <Plus className="h-4 w-4" /> {isReporting ? "Reporting..." : "Report Incident"}
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
                        onClick={() => handleWriteOff(r)}
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
    </Panel>
  );
}
