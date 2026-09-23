"use client";
import { RecordTable } from "@/components/ui/record-table";
import { useState } from "react";
import { Pill, PlusCircle, Search, AlertTriangle } from "lucide-react";
import { Panel, StatusChip, Tone } from "./shared";
import { useSchoolQuery } from "@/lib/data/school-hooks";
import { toast } from "sonner";
import { addMedicineStock, adjustMedicineStock } from "./api-client";
import { Modal } from "@/components/ui/modal";
import { useForm } from "react-hook-form";

type MedicineItem = {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  reorder_level: number;
  expiry_date: string;
  status: string;
};

type MedicineData = {
  metrics: { total_items: number; low_stock: number; expired: number };
  medicines: MedicineItem[];
};

type AdjustStockFormData = {
  adjustment: number;
  reason: string;
};

export function MedicineInventoryWorkspace() {
  const { data, isLoading, refetch } = useSchoolQuery<MedicineData>('/admin-command/nurse/medicine-inventory');
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({ name: "", category: "", quantity: "", unit: "tablets", reorder_level: "", expiry_date: "" });

  const [isAdjustOpen, setIsAdjustOpen] = useState(false);
  const [selectedMed, setSelectedMed] = useState<{ id: string; name: string } | null>(null);

  const adjustForm = useForm<AdjustStockFormData>({
    defaultValues: { adjustment: 0, reason: "Manual adjustment" },
  });

  const medicines = (data?.medicines || []).filter(m =>
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    m.category.toLowerCase().includes(search.toLowerCase())
  );

  const getStatusTone = (st: string): Tone => {
    if (st === "In Stock") return "success";
    if (st === "Low Stock") return "warning";
    if (st === "Out of Stock") return "danger";
    if (st === "Expired") return "danger";
    return "neutral";
  };

  const handleAdd = async () => {
    if (!form.name || !form.quantity) { toast.error("Medicine name and quantity are required."); return; }
    setIsSubmitting(true);
    try {
      await addMedicineStock({ ...form, quantity: Number(form.quantity), reorder_level: Number(form.reorder_level) || 10 });
      await refetch();
      toast.success("Medicine added to inventory.");
      setShowForm(false);
      setForm({ name: "", category: "", quantity: "", unit: "tablets", reorder_level: "", expiry_date: "" });
    } catch (e: any) { toast.error(e.message || "Failed to add medicine."); }
    finally { setIsSubmitting(false); }
  };

  const handleAdjustClick = (id: string, name: string) => {
    setSelectedMed({ id, name });
    adjustForm.reset({ adjustment: 0, reason: "Manual adjustment" });
    setIsAdjustOpen(true);
  };

  const onSubmitAdjust = async (formData: AdjustStockFormData) => {
    if (!selectedMed) return;
    try {
      await adjustMedicineStock(selectedMed.id, {
        adjustment: Number(formData.adjustment),
        reason: formData.reason
      });
      await refetch();
      toast.success(`Stock adjusted for ${selectedMed.name}.`);
      setIsAdjustOpen(false);
      adjustForm.reset();
    } catch (e: any) {
      toast.error(e.message || "Failed to adjust stock.");
    } finally {
      setSelectedMed(null);
    }
  };

  return (
    <Panel title="Medicine Inventory" description="Track medicine stock levels, expiry dates, and reorder alerts." icon={Pill} actions={
      <button onClick={() => setShowForm(true)} className="flex items-center gap-2 rounded-lg bg-[#071D49] px-4 py-2 text-sm font-black text-white hover:bg-blue-900 transition">
        <PlusCircle className="w-4 h-4" /> Add Medicine
      </button>
    }>
      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
          <div className="text-sm font-semibold text-[#64748B]">Total Items</div>
          <div className="mt-1 text-lg font-black text-[#071D49]">{isLoading ? "..." : data?.metrics?.total_items ?? 0}</div>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-center gap-1 text-sm font-semibold text-amber-700"><AlertTriangle className="w-3 h-3" /> Low Stock</div>
          <div className="mt-1 text-lg font-black text-amber-700">{isLoading ? "..." : data?.metrics?.low_stock ?? 0}</div>
        </div>
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
          <div className="text-sm font-semibold text-rose-700">Expired</div>
          <div className="mt-1 text-lg font-black text-rose-700">{isLoading ? "..." : data?.metrics?.expired ?? 0}</div>
        </div>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#64748B]" />
        <input type="text" placeholder="Search medicine name or category..." value={search} onChange={e => setSearch(e.target.value)} className="w-full rounded-xl border border-[#D8E0EC] py-2 pl-9 pr-3 text-sm focus:border-[#071D49] focus:outline-none" />
      </div>

      {showForm && (
        <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50 p-4">
          <h3 className="text-sm font-bold text-[#071D49] mb-3">Add New Medicine</h3>
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="text-xs font-bold text-[#334155]">Name *</label>
              <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="mt-1 w-full rounded-lg border border-[#D8E0EC] p-2 text-sm focus:border-blue-500 focus:outline-none" />
            </div>
            <div>
              <label className="text-xs font-bold text-[#334155]">Category</label>
              <input value={form.category} onChange={e => setForm({...form, category: e.target.value})} placeholder="e.g. Analgesic" className="mt-1 w-full rounded-lg border border-[#D8E0EC] p-2 text-sm focus:border-blue-500 focus:outline-none" />
            </div>
            <div>
              <label className="text-xs font-bold text-[#334155]">Quantity *</label>
              <input type="number" value={form.quantity} onChange={e => setForm({...form, quantity: e.target.value})} className="mt-1 w-full rounded-lg border border-[#D8E0EC] p-2 text-sm focus:border-blue-500 focus:outline-none" />
            </div>
            <div>
              <label className="text-xs font-bold text-[#334155]">Unit</label>
              <select value={form.unit} onChange={e => setForm({...form, unit: e.target.value})} className="mt-1 w-full rounded-lg border border-[#D8E0EC] p-2 text-sm focus:border-blue-500 focus:outline-none">
                <option>tablets</option><option>capsules</option><option>ml</option><option>sachets</option><option>bottles</option><option>tubes</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-[#334155]">Reorder Level</label>
              <input type="number" value={form.reorder_level} onChange={e => setForm({...form, reorder_level: e.target.value})} placeholder="10" className="mt-1 w-full rounded-lg border border-[#D8E0EC] p-2 text-sm focus:border-blue-500 focus:outline-none" />
            </div>
            <div>
              <label className="text-xs font-bold text-[#334155]">Expiry Date</label>
              <input type="date" value={form.expiry_date} onChange={e => setForm({...form, expiry_date: e.target.value})} className="mt-1 w-full rounded-lg border border-[#D8E0EC] p-2 text-sm focus:border-blue-500 focus:outline-none" />
            </div>
          </div>
          <div className="mt-3 flex gap-2 justify-end">
            <button onClick={() => setShowForm(false)} className="rounded-lg px-4 py-2 text-sm font-bold text-[#64748B] hover:bg-slate-100">Cancel</button>
            <button disabled={isSubmitting} onClick={handleAdd} className="rounded-lg bg-[#071D49] px-4 py-2 text-sm font-black text-white hover:bg-blue-900 disabled:opacity-50">
              {isSubmitting ? "Adding..." : "Add Medicine"}
            </button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-[#D8E0EC]">
        <RecordTable className="w-full text-sm text-left whitespace-nowrap">
          <thead className="bg-[#F8FAFC] text-[#071D49]">
            <tr>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Medicine</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Category</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Qty</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Unit</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Reorder Level</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Expiry</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Status</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC] text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D8E0EC]">
            {isLoading ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-[#64748B]">Loading inventory...</td></tr>
            ) : medicines.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-[#64748B]">No medicine in stock. Click &quot;Add Medicine&quot; to start tracking your inventory.</td></tr>
            ) : (
              medicines.map(m => (
                <tr key={m.id} className="hover:bg-[#F8FAFC]">
                  <td className="px-4 py-3 font-semibold text-[#071D49]">{m.name}</td>
                  <td className="px-4 py-3 text-[#64748B]">{m.category || "—"}</td>
                  <td className="px-4 py-3 font-bold text-[#071D49]">{m.quantity}</td>
                  <td className="px-4 py-3 text-[#64748B]">{m.unit}</td>
                  <td className="px-4 py-3 text-[#64748B]">{m.reorder_level}</td>
                  <td className="px-4 py-3 text-[#64748B]">{m.expiry_date || "—"}</td>
                  <td className="px-4 py-3"><StatusChip label={m.status} tone={getStatusTone(m.status)} /></td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => handleAdjustClick(m.id, m.name)} className="text-blue-600 hover:underline font-semibold text-xs">Adjust Stock</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </RecordTable>
      </div>

      <Modal
        open={isAdjustOpen}
        onClose={() => {
          setIsAdjustOpen(false);
          setSelectedMed(null);
        }}
        title={`Adjust Medicine Stock: ${selectedMed?.name || ""}`}
      >
        <form onSubmit={adjustForm.handleSubmit(onSubmitAdjust)} className="space-y-4 py-4">
          <div className="space-y-1">
            <label className="text-sm font-medium">Stock Adjustment Quantity</label>
            <input
              type="number"
              {...adjustForm.register("adjustment", {
                required: "Adjustment quantity is required",
                validate: value => value !== 0 || "Adjustment cannot be zero",
                valueAsNumber: true,
              })}
              className="w-full rounded border border-slate-300 p-2 text-sm text-[#071D49]"
              placeholder="e.g. 50 or -20"
            />
            {adjustForm.formState.errors.adjustment && (
              <span className="text-xs text-red-500">{adjustForm.formState.errors.adjustment.message}</span>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Adjustment Reason</label>
            <input
              type="text"
              {...adjustForm.register("reason", { required: "Reason is required" })}
              className="w-full rounded border border-slate-300 p-2 text-sm text-[#071D49]"
              placeholder="e.g. Manual count reconciliation"
            />
            {adjustForm.formState.errors.reason && (
              <span className="text-xs text-red-500">{adjustForm.formState.errors.reason.message}</span>
            )}
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => {
                setIsAdjustOpen(false);
                setSelectedMed(null);
              }}
              className="px-4 py-2 border rounded text-sm font-medium hover:bg-slate-50 text-[#071D49]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-[#071D49] text-white rounded text-sm font-medium hover:bg-blue-900"
            >
              Adjust Stock
            </button>
          </div>
        </form>
      </Modal>
    </Panel>
  );
}
