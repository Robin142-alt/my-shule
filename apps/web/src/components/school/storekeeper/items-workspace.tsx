"use client";

import { useState } from "react";
import { Package, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { Panel, StatusChip, Tone } from "./shared";
import { useSchoolQuery } from "@/lib/data/school-hooks";
import { createItem, receiveStock, issueStock } from "./api-client";

type StockItem = {
  id: string;
  name: string;
  category: string;
  unit: string;
  quantity_in_stock: number;
  reorder_level: number;
  unit_cost: number;
  last_restocked: string;
  status: string;
};

type ItemsData = {
  metrics: {
    total_items: number;
    total_categories: number;
    total_stock_value: number;
  };
  categories: string[];
  items: StockItem[];
};

export function ItemsWorkspace() {
  const { data, isLoading, refetch } = useSchoolQuery<ItemsData>('/admin-command/storekeeper/items');
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [isAdding, setIsAdding] = useState(false);

  const items = data?.items || [];
  const categories = data?.categories || [];

  const filtered = items.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === "All" || item.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const getStockTone = (item: StockItem): Tone => {
    if (item.quantity_in_stock === 0) return "danger";
    if (item.quantity_in_stock <= item.reorder_level) return "warning";
    return "success";
  };

  const getStockLabel = (item: StockItem): string => {
    if (item.quantity_in_stock === 0) return "Out of Stock";
    if (item.quantity_in_stock <= item.reorder_level) return "Low Stock";
    return "In Stock";
  };

  const handleQuickIssue = async (item: StockItem) => {
    const qty = prompt(`Issue how many ${item.unit}(s) of "${item.name}"?`);
    if (!qty || isNaN(Number(qty)) || Number(qty) <= 0) return;
    const recipient = prompt("Issue to (department/person)?");
    if (!recipient) return;
    try {
      await issueStock({ item_id: item.id, quantity: Number(qty), issued_to: recipient });
      toast.success(`Issued ${qty} ${item.unit}(s) of ${item.name}.`);
      refetch();
    } catch {
      toast.error("Failed to issue stock.");
    }
  };

  const handleQuickReceive = async (item: StockItem) => {
    const qty = prompt(`Receive how many ${item.unit}(s) of "${item.name}"?`);
    if (!qty || isNaN(Number(qty)) || Number(qty) <= 0) return;
    const supplier = prompt("Supplier name?");
    if (!supplier) return;
    try {
      await receiveStock({ item_id: item.id, quantity: Number(qty), supplier });
      toast.success(`Received ${qty} ${item.unit}(s) of ${item.name}.`);
      refetch();
    } catch {
      toast.error("Failed to receive stock.");
    }
  };

  const handleAddItem = async () => {
    setIsAdding(true);
    try {
      const name = prompt("Item name?");
      if (!name) { setIsAdding(false); return; }
      const category = prompt("Category (e.g. Stationery, Cleaning, Lab Supplies)?");
      if (!category) { setIsAdding(false); return; }
      const unit = prompt("Unit of measure (e.g. pieces, reams, kg, litres)?");
      if (!unit) { setIsAdding(false); return; }
      const reorderLevel = prompt("Reorder level (minimum stock)?");
      const unitCost = prompt("Unit cost (KES)?");

      await createItem({
        name,
        category,
        unit,
        reorder_level: Number(reorderLevel) || 10,
        unit_cost: Number(unitCost) || 0,
      });
      toast.success(`Item "${name}" added to catalogue.`);
      refetch();
    } catch {
      toast.error("Failed to add item.");
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <Panel
      title="Inventory Items"
      description="Full catalogue of store items with stock levels."
      icon={Package}
      actions={
        <button
          disabled={isAdding}
          onClick={handleAddItem}
          className="inline-flex items-center gap-2 rounded-lg bg-[#071D49] px-4 py-2 text-sm font-black text-white hover:bg-blue-900 transition disabled:opacity-50"
        >
          <Plus className="h-4 w-4" /> {isAdding ? "Adding..." : "Add Item"}
        </button>
      }
    >
      {/* Metrics */}
      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
          <div className="text-sm font-semibold text-[#64748B]">Total Items</div>
          <div className="mt-1 text-2xl font-black text-[#071D49]">{isLoading ? "..." : data?.metrics?.total_items || 0}</div>
        </div>
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
          <div className="text-sm font-semibold text-[#64748B]">Categories</div>
          <div className="mt-1 text-2xl font-black text-[#071D49]">{isLoading ? "..." : data?.metrics?.total_categories || 0}</div>
        </div>
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
          <div className="text-sm font-semibold text-[#64748B]">Total Stock Value</div>
          <div className="mt-1 text-2xl font-black text-[#071D49]">{isLoading ? "..." : `KES ${(data?.metrics?.total_stock_value || 0).toLocaleString()}`}</div>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#64748B]" />
          <input
            type="text"
            placeholder="Search items..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-[#D8E0EC] py-2 pl-10 pr-4 text-sm outline-none focus:border-[#071D49]"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="rounded-xl border border-[#D8E0EC] py-2 px-3 text-sm outline-none focus:border-[#071D49]"
        >
          <option value="All">All Categories</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      {/* Items Table */}
      <div className="overflow-x-auto rounded-xl border border-[#D8E0EC]">
        <table className="w-full text-sm text-left whitespace-nowrap">
          <thead className="bg-[#F8FAFC] text-[#071D49]">
            <tr>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Item Name</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Category</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">In Stock</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Unit</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Reorder Level</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Unit Cost</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Status</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC] text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D8E0EC]">
            {isLoading ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-[#64748B]">Loading inventory...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-[#64748B]">No items found. Add the first item to your store catalogue to get started.</td></tr>
            ) : (
              filtered.map((item) => (
                <tr key={item.id} className="hover:bg-[#F8FAFC]">
                  <td className="px-4 py-3 font-semibold text-[#071D49]">{item.name}</td>
                  <td className="px-4 py-3 text-[#64748B]">{item.category}</td>
                  <td className="px-4 py-3 font-bold text-[#071D49]">{item.quantity_in_stock}</td>
                  <td className="px-4 py-3 text-[#64748B]">{item.unit}</td>
                  <td className="px-4 py-3 text-[#64748B]">{item.reorder_level}</td>
                  <td className="px-4 py-3 text-[#64748B]">KES {item.unit_cost.toLocaleString()}</td>
                  <td className="px-4 py-3"><StatusChip label={getStockLabel(item)} tone={getStockTone(item)} /></td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex gap-2">
                      <button onClick={() => handleQuickReceive(item)} className="text-emerald-600 hover:underline font-semibold text-xs">Receive</button>
                      <button onClick={() => handleQuickIssue(item)} className="text-blue-600 hover:underline font-semibold text-xs">Issue</button>
                    </div>
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
