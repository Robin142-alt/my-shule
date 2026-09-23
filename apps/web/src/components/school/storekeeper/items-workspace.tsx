"use client";

import { RecordTable } from "@/components/ui/record-table";
import { useState } from "react";
import { Package, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { Panel, StatusChip, Tone } from "./shared";
import { useSchoolQuery } from "@/lib/data/school-hooks";
import { createItem, receiveStock, issueStock } from "./api-client";
import { Modal } from "@/components/ui/modal";
import { useForm } from "react-hook-form";

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

type IssueFormData = {
  quantity: number;
  issuedTo: string;
};

type ReceiveFormData = {
  quantity: number;
  supplier: string;
};

type AddItemFormData = {
  name: string;
  category: string;
  unit: string;
  reorderLevel: number;
  unitCost: number;
};

export function ItemsWorkspace() {
  const { data, isLoading, refetch } = useSchoolQuery<ItemsData>('/admin-command/storekeeper/items');
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [isAdding, setIsAdding] = useState(false);

  const [isAddItemOpen, setIsAddItemOpen] = useState(false);
  const [isIssueOpen, setIsIssueOpen] = useState(false);
  const [isReceiveOpen, setIsReceiveOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<StockItem | null>(null);

  const addItemForm = useForm<AddItemFormData>({
    defaultValues: {
      name: "",
      category: "",
      unit: "",
      reorderLevel: 10,
      unitCost: 0,
    }
  });

  const issueForm = useForm<IssueFormData>({
    defaultValues: {
      quantity: 1,
      issuedTo: "",
    }
  });

  const receiveForm = useForm<ReceiveFormData>({
    defaultValues: {
      quantity: 1,
      supplier: "",
    }
  });

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

  const onSubmitAddItem = async (formData: AddItemFormData) => {
    setIsAdding(true);
    try {
      await createItem({
        name: formData.name,
        category: formData.category,
        unit: formData.unit,
        reorder_level: Number(formData.reorderLevel) || 10,
        unit_cost: Number(formData.unitCost) || 0,
      });
      toast.success(`Item "${formData.name}" added to catalogue.`);
      setIsAddItemOpen(false);
      addItemForm.reset();
      refetch();
    } catch {
      toast.error("Failed to add item.");
    } finally {
      setIsAdding(false);
    }
  };

  const onSubmitIssue = async (formData: IssueFormData) => {
    if (!selectedItem) return;
    try {
      await issueStock({
        item_id: selectedItem.id,
        quantity: Number(formData.quantity),
        issued_to: formData.issuedTo
      });
      toast.success(`Issued ${formData.quantity} ${selectedItem.unit}(s) of ${selectedItem.name}.`);
      setIsIssueOpen(false);
      issueForm.reset();
      refetch();
    } catch {
      toast.error("Failed to issue stock.");
    } finally {
      setSelectedItem(null);
    }
  };

  const onSubmitReceive = async (formData: ReceiveFormData) => {
    if (!selectedItem) return;
    try {
      await receiveStock({
        item_id: selectedItem.id,
        quantity: Number(formData.quantity),
        supplier: formData.supplier
      });
      toast.success(`Received ${formData.quantity} ${selectedItem.unit}(s) of ${selectedItem.name}.`);
      setIsReceiveOpen(false);
      receiveForm.reset();
      refetch();
    } catch {
      toast.error("Failed to receive stock.");
    } finally {
      setSelectedItem(null);
    }
  };

  return (
    <Panel
      title="Inventory Items"
      description="Full catalogue of store items with stock levels."
      icon={Package}
      actions={
        <button
          onClick={() => {
            addItemForm.reset();
            setIsAddItemOpen(true);
          }}
          className="inline-flex items-center gap-2 rounded-lg bg-[#071D49] px-4 py-2 text-sm font-black text-white hover:bg-blue-900 transition disabled:opacity-50"
        >
          <Plus className="h-4 w-4" /> Add Item
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
          className="rounded-xl border border-[#D8E0EC] py-2 px-3 text-sm outline-none focus:border-[#071D49] text-[#071D49]"
        >
          <option value="All">All Categories</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      {/* Items Table */}
      <div className="overflow-x-auto rounded-xl border border-[#D8E0EC]">
        <RecordTable className="w-full text-sm text-left whitespace-nowrap">
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
                      <button
                        onClick={() => {
                          setSelectedItem(item);
                          receiveForm.reset({ quantity: 1, supplier: "" });
                          setIsReceiveOpen(true);
                        }}
                        className="text-emerald-600 hover:underline font-semibold text-xs"
                      >
                        Receive
                      </button>
                      <button
                        onClick={() => {
                          setSelectedItem(item);
                          issueForm.reset({ quantity: 1, issuedTo: "" });
                          setIsIssueOpen(true);
                        }}
                        className="text-blue-600 hover:underline font-semibold text-xs"
                      >
                        Issue
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </RecordTable>
      </div>

      {/* Add Item Modal */}
      <Modal
        open={isAddItemOpen}
        onClose={() => setIsAddItemOpen(false)}
        title="Add Item"
      >
        <form onSubmit={addItemForm.handleSubmit(onSubmitAddItem)} className="space-y-4 py-4">
          <div className="space-y-1">
            <label className="text-sm font-medium">Item Name</label>
            <input
              type="text"
              {...addItemForm.register("name", { required: "Item name is required" })}
              className="w-full rounded border border-slate-300 p-2 text-sm text-[#071D49]"
              placeholder="e.g. Science Beakers"
            />
            {addItemForm.formState.errors.name && (
              <span className="text-xs text-red-500">{addItemForm.formState.errors.name.message}</span>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Category</label>
            <input
              type="text"
              {...addItemForm.register("category", { required: "Category is required" })}
              className="w-full rounded border border-slate-300 p-2 text-sm text-[#071D49]"
              placeholder="e.g. Lab Supplies"
            />
            {addItemForm.formState.errors.category && (
              <span className="text-xs text-red-500">{addItemForm.formState.errors.category.message}</span>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Unit of Measure</label>
            <input
              type="text"
              {...addItemForm.register("unit", { required: "Unit is required" })}
              className="w-full rounded border border-slate-300 p-2 text-sm text-[#071D49]"
              placeholder="e.g. pieces"
            />
            {addItemForm.formState.errors.unit && (
              <span className="text-xs text-red-500">{addItemForm.formState.errors.unit.message}</span>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Reorder Level</label>
            <input
              type="number"
              {...addItemForm.register("reorderLevel", {
                required: "Reorder level is required",
                min: { value: 0, message: "Cannot be negative" },
                valueAsNumber: true,
              })}
              className="w-full rounded border border-slate-300 p-2 text-sm text-[#071D49]"
              placeholder="10"
            />
            {addItemForm.formState.errors.reorderLevel && (
              <span className="text-xs text-red-500">{addItemForm.formState.errors.reorderLevel.message}</span>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Unit Cost (KES)</label>
            <input
              type="number"
              {...addItemForm.register("unitCost", {
                required: "Unit cost is required",
                min: { value: 0, message: "Cannot be negative" },
                valueAsNumber: true,
              })}
              className="w-full rounded border border-slate-300 p-2 text-sm text-[#071D49]"
              placeholder="0"
            />
            {addItemForm.formState.errors.unitCost && (
              <span className="text-xs text-red-500">{addItemForm.formState.errors.unitCost.message}</span>
            )}
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsAddItemOpen(false)}
              className="px-4 py-2 border rounded text-sm font-medium hover:bg-slate-50 text-[#071D49]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isAdding}
              className="px-4 py-2 bg-[#071D49] text-white rounded text-sm font-medium hover:bg-blue-900 disabled:opacity-50"
            >
              {isAdding ? "Adding..." : "Add Item"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Receive Stock Modal */}
      <Modal
        open={isReceiveOpen}
        onClose={() => {
          setIsReceiveOpen(false);
          setSelectedItem(null);
        }}
        title={`Receive Stock: ${selectedItem?.name || ""}`}
      >
        <form onSubmit={receiveForm.handleSubmit(onSubmitReceive)} className="space-y-4 py-4">
          <div className="space-y-1">
            <label className="text-sm font-medium">Quantity to Receive ({selectedItem?.unit})</label>
            <input
              type="number"
              {...receiveForm.register("quantity", {
                required: "Quantity is required",
                min: { value: 1, message: "Must be at least 1" },
                valueAsNumber: true,
              })}
              className="w-full rounded border border-slate-300 p-2 text-sm text-[#071D49]"
              placeholder="1"
            />
            {receiveForm.formState.errors.quantity && (
              <span className="text-xs text-red-500">{receiveForm.formState.errors.quantity.message}</span>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Supplier Name</label>
            <input
              type="text"
              {...receiveForm.register("supplier", { required: "Supplier name is required" })}
              className="w-full rounded border border-slate-300 p-2 text-sm text-[#071D49]"
              placeholder="Enter supplier name"
            />
            {receiveForm.formState.errors.supplier && (
              <span className="text-xs text-red-500">{receiveForm.formState.errors.supplier.message}</span>
            )}
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => {
                setIsReceiveOpen(false);
                setSelectedItem(null);
              }}
              className="px-4 py-2 border rounded text-sm font-medium hover:bg-slate-50 text-[#071D49]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-emerald-600 text-white rounded text-sm font-medium hover:bg-emerald-700"
            >
              Receive Stock
            </button>
          </div>
        </form>
      </Modal>

      {/* Issue Stock Modal */}
      <Modal
        open={isIssueOpen}
        onClose={() => {
          setIsIssueOpen(false);
          setSelectedItem(null);
        }}
        title={`Issue Stock: ${selectedItem?.name || ""}`}
      >
        <form onSubmit={issueForm.handleSubmit(onSubmitIssue)} className="space-y-4 py-4">
          <div className="space-y-1">
            <label className="text-sm font-medium">Quantity to Issue ({selectedItem?.unit})</label>
            <input
              type="number"
              {...issueForm.register("quantity", {
                required: "Quantity is required",
                min: { value: 1, message: "Must be at least 1" },
                max: selectedItem ? { value: selectedItem.quantity_in_stock, message: `Only ${selectedItem.quantity_in_stock} available` } : undefined,
                valueAsNumber: true,
              })}
              className="w-full rounded border border-slate-300 p-2 text-sm text-[#071D49]"
              placeholder="1"
            />
            {issueForm.formState.errors.quantity && (
              <span className="text-xs text-red-500">{issueForm.formState.errors.quantity.message}</span>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Issue to (Department/Person)</label>
            <input
              type="text"
              {...issueForm.register("issuedTo", { required: "Recipient is required" })}
              className="w-full rounded border border-slate-300 p-2 text-sm text-[#071D49]"
              placeholder="e.g. Science Department"
            />
            {issueForm.formState.errors.issuedTo && (
              <span className="text-xs text-red-500">{issueForm.formState.errors.issuedTo.message}</span>
            )}
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => {
                setIsIssueOpen(false);
                setSelectedItem(null);
              }}
              className="px-4 py-2 border rounded text-sm font-medium hover:bg-slate-50 text-[#071D49]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700"
            >
              Issue Stock
            </button>
          </div>
        </form>
      </Modal>
    </Panel>
  );
}
