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
          className="rounded-lg bg-primary px-4 py-2 text-sm font-black text-white hover:bg-blue-900 transition disabled:opacity-50"
        >
          {refreshing ? "Refreshing..." : "Refresh"}
        </button>
      }
    >
      {/* Metrics Grid */}
      <div className="app-metric-grid grid gap-4 md:grid-cols-3 lg:grid-cols-6 mb-6">
        <div className="rounded-xl border border-border bg-surface-muted p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-muted"><Package className="w-4 h-4" /> Total Items</div>
          <div className="mt-2 text-2xl font-black text-foreground">{isLoading ? "..." : metrics?.total_items || 0}</div>
        </div>
        <div className="rounded-xl border border-border bg-surface-muted p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-muted">Stock Value</div>
          <div className="mt-2 text-2xl font-black text-foreground">{isLoading ? "..." : `KES ${(metrics?.total_stock_value || 0).toLocaleString()}`}</div>
        </div>
        <div className="rounded-xl border border-danger-border bg-danger-soft p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-danger"><AlertTriangle className="w-4 h-4" /> Low Stock</div>
          <div className="mt-2 text-2xl font-black text-danger">{isLoading ? "..." : metrics?.low_stock_alerts || 0}</div>
        </div>
        <div className="rounded-xl border border-warning-border bg-warning-soft p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-warning"><ClipboardCheck className="w-4 h-4" /> Pending Requests</div>
          <div className="mt-2 text-2xl font-black text-warning">{isLoading ? "..." : metrics?.pending_requests || 0}</div>
        </div>
        <div className="rounded-xl border border-success-border bg-success-soft p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-success"><ArrowDownToLine className="w-4 h-4" /> Received Today</div>
          <div className="mt-2 text-2xl font-black text-success">{isLoading ? "..." : metrics?.items_received_today || 0}</div>
        </div>
        <div className="rounded-xl border border-info-border bg-info-soft p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-info"><ArrowUpFromLine className="w-4 h-4" /> Issued Today</div>
          <div className="mt-2 text-2xl font-black text-info">{isLoading ? "..." : metrics?.items_issued_today || 0}</div>
        </div>
      </div>

      {/* Recent Activity Table */}
      <div className="overflow-x-auto rounded-xl border border-border">
        <RecordTable className="w-full text-sm text-left whitespace-nowrap">
          <thead className="bg-surface-muted text-foreground">
            <tr>
              <th className="px-4 py-3 font-bold border-b border-border">Type</th>
              <th className="px-4 py-3 font-bold border-b border-border">Item</th>
              <th className="px-4 py-3 font-bold border-b border-border">Quantity</th>
              <th className="px-4 py-3 font-bold border-b border-border">Performed By</th>
              <th className="px-4 py-3 font-bold border-b border-border">Date</th>
              <th className="px-4 py-3 font-bold border-b border-border">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-muted">Loading store data...</td></tr>
            ) : activity.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-muted">No recent store activity. Receive stock or process requests to see activity here.</td></tr>
            ) : (
              activity.map((a) => (
                <tr key={a.id} className="hover:bg-surface-muted">
                  <td className="px-4 py-3"><StatusChip label={a.type} tone={getActivityTone(a.type)} /></td>
                  <td className="px-4 py-3 font-semibold text-foreground">{a.item_name}</td>
                  <td className="px-4 py-3 text-foreground">{a.quantity}</td>
                  <td className="px-4 py-3 text-muted">{a.performed_by}</td>
                  <td className="px-4 py-3 text-muted">{a.date}</td>
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
