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
      <button onClick={() => setShowForm(true)} className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-black text-white hover:bg-blue-900 transition">
        <PlusCircle className="w-4 h-4" /> Add Medicine
      </button>
    }>
      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <div className="rounded-xl border border-border bg-surface-muted p-4">
          <div className="text-sm font-semibold text-muted">Total Items</div>
          <div className="mt-1 text-lg font-black text-foreground">{isLoading ? "..." : data?.metrics?.total_items ?? 0}</div>
        </div>
        <div className="rounded-xl border border-warning-border bg-warning-soft p-4">
          <div className="flex items-center gap-1 text-sm font-semibold text-warning"><AlertTriangle className="w-3 h-3" /> Low Stock</div>
          <div className="mt-1 text-lg font-black text-warning">{isLoading ? "..." : data?.metrics?.low_stock ?? 0}</div>
        </div>
        <div className="rounded-xl border border-danger-border bg-danger-soft p-4">
          <div className="text-sm font-semibold text-danger">Expired</div>
          <div className="mt-1 text-lg font-black text-danger">{isLoading ? "..." : data?.metrics?.expired ?? 0}</div>
        </div>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted" />
        <input type="text" placeholder="Search medicine name or category..." value={search} onChange={e => setSearch(e.target.value)} className="w-full rounded-xl border border-border py-2 pl-9 pr-3 text-sm focus:border-primary focus:outline-none" />
      </div>

      {showForm && (
        <div className="mb-4 rounded-xl border border-info-border bg-info-soft p-4">
          <h3 className="text-sm font-bold text-foreground mb-3">Add New Medicine</h3>
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="text-xs font-bold text-foreground">Name *</label>
              <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="mt-1 w-full rounded-lg border border-border p-2 text-sm focus:border-blue-500 focus:outline-none" />
            </div>
            <div>
              <label className="text-xs font-bold text-foreground">Category</label>
              <input value={form.category} onChange={e => setForm({...form, category: e.target.value})} placeholder="e.g. Analgesic" className="mt-1 w-full rounded-lg border border-border p-2 text-sm focus:border-blue-500 focus:outline-none" />
            </div>
            <div>
              <label className="text-xs font-bold text-foreground">Quantity *</label>
              <input type="number" value={form.quantity} onChange={e => setForm({...form, quantity: e.target.value})} className="mt-1 w-full rounded-lg border border-border p-2 text-sm focus:border-blue-500 focus:outline-none" />
            </div>
            <div>
              <label className="text-xs font-bold text-foreground">Unit</label>
              <select value={form.unit} onChange={e => setForm({...form, unit: e.target.value})} className="mt-1 w-full rounded-lg border border-border p-2 text-sm focus:border-blue-500 focus:outline-none">
                <option>tablets</option><option>capsules</option><option>ml</option><option>sachets</option><option>bottles</option><option>tubes</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-foreground">Reorder Level</label>
              <input type="number" value={form.reorder_level} onChange={e => setForm({...form, reorder_level: e.target.value})} placeholder="10" className="mt-1 w-full rounded-lg border border-border p-2 text-sm focus:border-blue-500 focus:outline-none" />
            </div>
            <div>
              <label className="text-xs font-bold text-foreground">Expiry Date</label>
              <input type="date" value={form.expiry_date} onChange={e => setForm({...form, expiry_date: e.target.value})} className="mt-1 w-full rounded-lg border border-border p-2 text-sm focus:border-blue-500 focus:outline-none" />
            </div>
          </div>
          <div className="mt-3 flex gap-2 justify-end">
            <button onClick={() => setShowForm(false)} className="rounded-lg px-4 py-2 text-sm font-bold text-muted hover:bg-slate-100">Cancel</button>
            <button disabled={isSubmitting} onClick={handleAdd} className="rounded-lg bg-primary px-4 py-2 text-sm font-black text-white hover:bg-blue-900 disabled:opacity-50">
              {isSubmitting ? "Adding..." : "Add Medicine"}
            </button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-border">
        <RecordTable className="w-full text-sm text-left whitespace-nowrap">
          <thead className="bg-surface-muted text-foreground">
            <tr>
              <th className="px-4 py-3 font-bold border-b border-border">Medicine</th>
              <th className="px-4 py-3 font-bold border-b border-border">Category</th>
              <th className="px-4 py-3 font-bold border-b border-border">Qty</th>
              <th className="px-4 py-3 font-bold border-b border-border">Unit</th>
              <th className="px-4 py-3 font-bold border-b border-border">Reorder Level</th>
              <th className="px-4 py-3 font-bold border-b border-border">Expiry</th>
              <th className="px-4 py-3 font-bold border-b border-border">Status</th>
              <th className="px-4 py-3 font-bold border-b border-border text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-muted">Loading inventory...</td></tr>
            ) : medicines.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-muted">No medicine in stock. Click &quot;Add Medicine&quot; to start tracking your inventory.</td></tr>
            ) : (
              medicines.map(m => (
                <tr key={m.id} className="hover:bg-surface-muted">
                  <td className="px-4 py-3 font-semibold text-foreground">{m.name}</td>
                  <td className="px-4 py-3 text-muted">{m.category || "—"}</td>
                  <td className="px-4 py-3 font-bold text-foreground">{m.quantity}</td>
                  <td className="px-4 py-3 text-muted">{m.unit}</td>
                  <td className="px-4 py-3 text-muted">{m.reorder_level}</td>
                  <td className="px-4 py-3 text-muted">{m.expiry_date || "—"}</td>
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
              className="w-full rounded border border-slate-300 p-2 text-sm text-foreground"
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
              className="w-full rounded border border-slate-300 p-2 text-sm text-foreground"
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
              className="px-4 py-2 border rounded text-sm font-medium hover:bg-slate-50 text-foreground"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-primary text-white rounded text-sm font-medium hover:bg-blue-900"
            >
              Adjust Stock
            </button>
          </div>
        </form>
      </Modal>
    </Panel>
  );
}
