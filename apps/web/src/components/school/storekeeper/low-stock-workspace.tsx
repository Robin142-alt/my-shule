"use client";

import { RecordTable } from "@/components/ui/record-table";
import { useState } from "react";
import { AlertTriangle, ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import { Panel, StatusChip, Tone } from "./shared";
import { useSchoolQuery } from "@/lib/data/school-hooks";
import { reorderItem } from "./api-client";

type LowStockItem = {
  id: string;
  name: string;
  category: string;
  unit: string;
  quantity_in_stock: number;
  reorder_level: number;
  last_restocked: string;
  days_since_restock: number;
};

type LowStockData = {
  metrics: {
    total_low_stock: number;
    out_of_stock: number;
    critical_items: number;
  };
  items: LowStockItem[];
};

export function LowStockWorkspace() {
  const { data, isLoading, refetch } = useSchoolQuery<LowStockData>('/admin-command/storekeeper/low-stock');
  const [reordering, setReordering] = useState<string | null>(null);

  const items = data?.items || [];

  const getUrgencyTone = (item: LowStockItem): Tone => {
    if (item.quantity_in_stock === 0) return "danger";
    if (item.quantity_in_stock <= item.reorder_level * 0.5) return "danger";
    return "warning";
  };

  const getUrgencyLabel = (item: LowStockItem): string => {
    if (item.quantity_in_stock === 0) return "Out of Stock";
    if (item.quantity_in_stock <= item.reorder_level * 0.5) return "Critical";
    return "Low";
  };

  const handleReorder = async (item: LowStockItem) => {
    setReordering(item.id);
    try {
      await reorderItem(item.id);
      toast.success(`Reorder request raised for "${item.name}".`);
      refetch();
    } catch {
      toast.error("Failed to raise reorder request.");
    } finally {
      setReordering(null);
    }
  };

  return (
    <Panel
      title="Low Stock Alerts"
      description="Items below reorder level that need restocking."
      icon={AlertTriangle}
    >
      {/* Metrics */}
      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <div className="rounded-xl border border-warning-border bg-warning-soft p-4">
          <div className="text-sm font-semibold text-warning">Total Low Stock</div>
          <div className="mt-1 text-2xl font-black text-warning">{isLoading ? "..." : data?.metrics?.total_low_stock || 0}</div>
        </div>
        <div className="rounded-xl border border-danger-border bg-danger-soft p-4">
          <div className="text-sm font-semibold text-danger">Out of Stock</div>
          <div className="mt-1 text-2xl font-black text-danger">{isLoading ? "..." : data?.metrics?.out_of_stock || 0}</div>
        </div>
        <div className="rounded-xl border border-danger-border bg-danger-soft p-4">
          <div className="text-sm font-semibold text-danger">Critical Items</div>
          <div className="mt-1 text-2xl font-black text-danger">{isLoading ? "..." : data?.metrics?.critical_items || 0}</div>
        </div>
      </div>

      {/* Low Stock Table */}
      <div className="overflow-x-auto rounded-xl border border-border">
        <RecordTable className="w-full text-sm text-left whitespace-nowrap">
          <thead className="bg-surface-muted text-foreground">
            <tr>
              <th className="px-4 py-3 font-bold border-b border-border">Urgency</th>
              <th className="px-4 py-3 font-bold border-b border-border">Item Name</th>
              <th className="px-4 py-3 font-bold border-b border-border">Category</th>
              <th className="px-4 py-3 font-bold border-b border-border">Current Stock</th>
              <th className="px-4 py-3 font-bold border-b border-border">Reorder Level</th>
              <th className="px-4 py-3 font-bold border-b border-border">Last Restocked</th>
              <th className="px-4 py-3 font-bold border-b border-border text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-muted">Loading low stock items...</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-muted">All items are adequately stocked. No low-stock alerts at this time.</td></tr>
            ) : (
              items.map((item) => (
                <tr key={item.id} className="hover:bg-surface-muted">
                  <td className="px-4 py-3"><StatusChip label={getUrgencyLabel(item)} tone={getUrgencyTone(item)} /></td>
                  <td className="px-4 py-3 font-semibold text-foreground">{item.name}</td>
                  <td className="px-4 py-3 text-muted">{item.category}</td>
                  <td className="px-4 py-3 font-bold text-foreground">{item.quantity_in_stock} {item.unit}</td>
                  <td className="px-4 py-3 text-muted">{item.reorder_level} {item.unit}</td>
                  <td className="px-4 py-3 text-muted">{item.last_restocked || "Never"}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      disabled={reordering === item.id}
                      onClick={() => handleReorder(item)}
                      className="inline-flex items-center gap-1 text-blue-600 hover:underline font-semibold text-xs disabled:opacity-50"
                    >
                      <ShoppingCart className="h-3 w-3" /> {reordering === item.id ? "Raising..." : "Raise Reorder"}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </RecordTable>
      </div>
    </Panel>
  );
}
