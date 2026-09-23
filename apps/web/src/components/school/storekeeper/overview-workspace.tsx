"use client";

import { RecordTable } from "@/components/ui/record-table";
import { useState } from "react";
import { LayoutDashboard, Package, AlertTriangle, ArrowDownToLine, ArrowUpFromLine, ClipboardCheck } from "lucide-react";
import { toast } from "sonner";
import { Panel, StatusChip, Tone } from "./shared";
import { useSchoolQuery } from "@/lib/data/school-hooks";

type RecentActivity = {
  id: string;
  type: string;
  item_name: string;
  quantity: number;
  performed_by: string;
  date: string;
  status: string;
};

type OverviewData = {
  metrics: {
    total_items: number;
    total_stock_value: number;
    low_stock_alerts: number;
    pending_requests: number;
    items_issued_today: number;
    items_received_today: number;
  };
  recent_activity: RecentActivity[];
};

export function OverviewWorkspace() {
  const { data, isLoading, refetch } = useSchoolQuery<OverviewData>('/admin-command/storekeeper/overview');
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refetch();
      toast.success("Dashboard refreshed.");
    } catch {
      toast.error("Failed to refresh dashboard.");
    } finally {
      setRefreshing(false);
    }
  };

  const metrics = data?.metrics;
  const activity = data?.recent_activity || [];

  const getActivityTone = (type: string): Tone => {
    if (type === "Stock In") return "success";
    if (type === "Stock Out") return "info";
    if (type === "Damaged") return "danger";
    if (type === "Write-Off") return "danger";
    if (type === "Stocktake") return "warning";
    return "neutral";
  };

  return (
    <Panel
      title="Store Overview"
      description="Daily store operations summary and recent activity."
      icon={LayoutDashboard}
      actions={
        <button
          disabled={refreshing}
          onClick={handleRefresh}
          className="rounded-lg bg-[#071D49] px-4 py-2 text-sm font-black text-white hover:bg-blue-900 transition disabled:opacity-50"
        >
          {refreshing ? "Refreshing..." : "Refresh"}
        </button>
      }
    >
      {/* Metrics Grid */}
      <div className="app-metric-grid grid gap-4 md:grid-cols-3 lg:grid-cols-6 mb-6">
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-[#64748B]"><Package className="w-4 h-4" /> Total Items</div>
          <div className="mt-2 text-2xl font-black text-[#071D49]">{isLoading ? "..." : metrics?.total_items || 0}</div>
        </div>
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-[#64748B]">Stock Value</div>
          <div className="mt-2 text-2xl font-black text-[#071D49]">{isLoading ? "..." : `KES ${(metrics?.total_stock_value || 0).toLocaleString()}`}</div>
        </div>
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-rose-700"><AlertTriangle className="w-4 h-4" /> Low Stock</div>
          <div className="mt-2 text-2xl font-black text-rose-700">{isLoading ? "..." : metrics?.low_stock_alerts || 0}</div>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-amber-700"><ClipboardCheck className="w-4 h-4" /> Pending Requests</div>
          <div className="mt-2 text-2xl font-black text-amber-700">{isLoading ? "..." : metrics?.pending_requests || 0}</div>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-emerald-700"><ArrowDownToLine className="w-4 h-4" /> Received Today</div>
          <div className="mt-2 text-2xl font-black text-emerald-700">{isLoading ? "..." : metrics?.items_received_today || 0}</div>
        </div>
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-blue-700"><ArrowUpFromLine className="w-4 h-4" /> Issued Today</div>
          <div className="mt-2 text-2xl font-black text-blue-700">{isLoading ? "..." : metrics?.items_issued_today || 0}</div>
        </div>
      </div>

      {/* Recent Activity Table */}
      <div className="overflow-x-auto rounded-xl border border-[#D8E0EC]">
        <RecordTable className="w-full text-sm text-left whitespace-nowrap">
          <thead className="bg-[#F8FAFC] text-[#071D49]">
            <tr>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Type</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Item</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Quantity</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Performed By</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Date</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D8E0EC]">
            {isLoading ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-[#64748B]">Loading store data...</td></tr>
            ) : activity.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-[#64748B]">No recent store activity. Receive stock or process requests to see activity here.</td></tr>
            ) : (
              activity.map((a) => (
                <tr key={a.id} className="hover:bg-[#F8FAFC]">
                  <td className="px-4 py-3"><StatusChip label={a.type} tone={getActivityTone(a.type)} /></td>
                  <td className="px-4 py-3 font-semibold text-[#071D49]">{a.item_name}</td>
                  <td className="px-4 py-3 text-[#071D49]">{a.quantity}</td>
                  <td className="px-4 py-3 text-[#64748B]">{a.performed_by}</td>
                  <td className="px-4 py-3 text-[#64748B]">{a.date}</td>
                  <td className="px-4 py-3"><StatusChip label={a.status} tone={a.status === "Completed" ? "success" : "info"} /></td>
                </tr>
              ))
            )}
          </tbody>
        </RecordTable>
      </div>
    </Panel>
  );
}
