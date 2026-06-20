"use client";

import { useState } from "react";
import { ClipboardList, Plus, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { Panel, StatusChip, Tone } from "./shared";
import { useSchoolQuery } from "@/lib/data/school-hooks";
import { startStocktake, finalizeStocktake } from "./api-client";

type StocktakeRecord = {
  id: string;
  title: string;
  category_scope: string;
  started_by: string;
  start_date: string;
  end_date: string | null;
  total_items_counted: number;
  total_items_expected: number;
  discrepancies: number;
  status: string;
};

type StocktakeData = {
  metrics: {
    total_stocktakes: number;
    in_progress: number;
    completed_this_term: number;
    total_discrepancies: number;
  };
  stocktakes: StocktakeRecord[];
};

export function StocktakeWorkspace() {
  const { data, isLoading, refetch } = useSchoolQuery<StocktakeData>('/admin-command/storekeeper/stocktake');
  const [isStarting, setIsStarting] = useState(false);
  const [finalizing, setFinalizing] = useState<string | null>(null);

  const stocktakes = data?.stocktakes || [];

  const getStatusTone = (status: string): Tone => {
    if (status === "Completed") return "success";
    if (status === "In Progress") return "info";
    if (status === "Pending Review") return "warning";
    if (status === "Discrepancies Found") return "danger";
    return "neutral";
  };

  const handleStartStocktake = async () => {
    setIsStarting(true);
    try {
      const title = prompt("Stocktake title (e.g. 'Term 2 Full Stocktake')?");
      if (!title) { setIsStarting(false); return; }
      const scope = prompt("Category scope (e.g. 'All', 'Stationery', 'Lab Supplies')?");
      if (!scope) { setIsStarting(false); return; }

      await startStocktake({ title, category_scope: scope });
      toast.success(`Stocktake "${title}" started.`);
      refetch();
    } catch {
      toast.error("Failed to start stocktake.");
    } finally {
      setIsStarting(false);
    }
  };

  const handleFinalize = async (st: StocktakeRecord) => {
    if (!confirm(`Finalize stocktake "${st.title}"? This will update inventory levels and log all discrepancies.`)) return;
    setFinalizing(st.id);
    try {
      await finalizeStocktake(st.id);
      toast.success(`Stocktake "${st.title}" finalized. Inventory updated.`);
      refetch();
    } catch {
      toast.error("Failed to finalize stocktake.");
    } finally {
      setFinalizing(null);
    }
  };

  return (
    <Panel
      title="Stocktake"
      description="Perform physical stock counts and reconcile with system records."
      icon={ClipboardList}
      actions={
        <button
          disabled={isStarting}
          onClick={handleStartStocktake}
          className="inline-flex items-center gap-2 rounded-lg bg-[#071D49] px-4 py-2 text-sm font-black text-white hover:bg-blue-900 transition disabled:opacity-50"
        >
          <Plus className="h-4 w-4" /> {isStarting ? "Starting..." : "New Stocktake"}
        </button>
      }
    >
      {/* Metrics */}
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
          <div className="text-sm font-semibold text-[#64748B]">Total Stocktakes</div>
          <div className="mt-1 text-2xl font-black text-[#071D49]">{isLoading ? "..." : data?.metrics?.total_stocktakes || 0}</div>
        </div>
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
          <div className="text-sm font-semibold text-blue-700">In Progress</div>
          <div className="mt-1 text-2xl font-black text-blue-700">{isLoading ? "..." : data?.metrics?.in_progress || 0}</div>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <div className="text-sm font-semibold text-emerald-700">Completed This Term</div>
          <div className="mt-1 text-2xl font-black text-emerald-700">{isLoading ? "..." : data?.metrics?.completed_this_term || 0}</div>
        </div>
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
          <div className="text-sm font-semibold text-rose-700">Discrepancies Found</div>
          <div className="mt-1 text-2xl font-black text-rose-700">{isLoading ? "..." : data?.metrics?.total_discrepancies || 0}</div>
        </div>
      </div>

      {/* Stocktakes Table */}
      <div className="overflow-x-auto rounded-xl border border-[#D8E0EC]">
        <table className="w-full text-sm text-left whitespace-nowrap">
          <thead className="bg-[#F8FAFC] text-[#071D49]">
            <tr>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Title</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Scope</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Started By</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Start Date</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Counted</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Discrepancies</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Status</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC] text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D8E0EC]">
            {isLoading ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-[#64748B]">Loading stocktakes...</td></tr>
            ) : stocktakes.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-[#64748B]">No stocktakes recorded. Start a new stocktake to reconcile physical and system stock levels.</td></tr>
            ) : (
              stocktakes.map((st) => (
                <tr key={st.id} className="hover:bg-[#F8FAFC]">
                  <td className="px-4 py-3 font-semibold text-[#071D49]">{st.title}</td>
                  <td className="px-4 py-3 text-[#64748B]">{st.category_scope}</td>
                  <td className="px-4 py-3 text-[#64748B]">{st.started_by}</td>
                  <td className="px-4 py-3 text-[#64748B]">{st.start_date}</td>
                  <td className="px-4 py-3 text-[#071D49]">{st.total_items_counted}/{st.total_items_expected}</td>
                  <td className="px-4 py-3">
                    {st.discrepancies > 0 ? (
                      <span className="font-bold text-rose-600">{st.discrepancies}</span>
                    ) : (
                      <span className="text-emerald-600 font-bold">0</span>
                    )}
                  </td>
                  <td className="px-4 py-3"><StatusChip label={st.status} tone={getStatusTone(st.status)} /></td>
                  <td className="px-4 py-3 text-right">
                    {st.status === "In Progress" || st.status === "Pending Review" ? (
                      <button
                        disabled={finalizing === st.id}
                        onClick={() => handleFinalize(st)}
                        className="inline-flex items-center gap-1 text-emerald-600 hover:underline font-semibold text-xs disabled:opacity-50"
                      >
                        <CheckCircle className="h-3 w-3" /> {finalizing === st.id ? "Finalizing..." : "Finalize"}
                      </button>
                    ) : (
                      <span className="text-xs text-[#64748B]">View Report</span>
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
