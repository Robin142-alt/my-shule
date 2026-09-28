"use client";
import { RecordTable } from "@/components/ui/record-table";
import { useState } from "react";
import { ClipboardList, PlusCircle, Search } from "lucide-react";
import { Panel, StatusChip, Tone } from "./shared";
import { useSchoolQuery } from "@/lib/data/school-hooks";
import { toast } from "sonner";
import { dispenseMedicine } from "./api-client";

type DispenseRecord = {
  id: string;
  student_name: string;
  class_name: string;
  medicine_name: string;
  dosage: string;
  quantity_given: number;
  dispensed_by: string;
  dispensed_at: string;
};

type DispensingData = {
  metrics: { dispensed_today: number; total_this_term: number; unique_students: number };
  records: DispenseRecord[];
};

export function DispensingLogWorkspace() {
  const { data, isLoading, refetch } = useSchoolQuery<DispensingData>('/admin-command/nurse/dispensing-log');
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({ student_name: "", class_name: "", medicine_name: "", dosage: "", quantity_given: "" });

  const records = (data?.records || []).filter(r =>
    r.student_name.toLowerCase().includes(search.toLowerCase()) ||
    r.medicine_name.toLowerCase().includes(search.toLowerCase())
  );

  const handleDispense = async () => {
    if (!form.student_name || !form.medicine_name || !form.quantity_given) {
      toast.error("Student, medicine, and quantity are required.");
      return;
    }
    setIsSubmitting(true);
    try {
      await dispenseMedicine({ ...form, quantity_given: Number(form.quantity_given) });
      await refetch();
      toast.success("Medicine dispensed and logged.");
      setShowForm(false);
      setForm({ student_name: "", class_name: "", medicine_name: "", dosage: "", quantity_given: "" });
    } catch (e: any) { toast.error(e.message || "Failed to dispense medicine."); }
    finally { setIsSubmitting(false); }
  };

  return (
    <Panel title="Dispensing Log" description="Track all medicine dispensed to students." icon={ClipboardList} actions={
      <button onClick={() => setShowForm(true)} className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-black text-white hover:bg-blue-900 transition">
        <PlusCircle className="w-4 h-4" /> Dispense Medicine
      </button>
    }>
      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <div className="rounded-xl border border-border bg-surface-muted p-4">
          <div className="text-sm font-semibold text-muted">Dispensed Today</div>
          <div className="mt-1 text-lg font-black text-foreground">{isLoading ? "..." : data?.metrics?.dispensed_today ?? 0}</div>
        </div>
        <div className="rounded-xl border border-border bg-surface-muted p-4">
          <div className="text-sm font-semibold text-muted">Total This Term</div>
          <div className="mt-1 text-lg font-black text-foreground">{isLoading ? "..." : data?.metrics?.total_this_term ?? 0}</div>
        </div>
        <div className="rounded-xl border border-border bg-surface-muted p-4">
          <div className="text-sm font-semibold text-muted">Unique Students</div>
          <div className="mt-1 text-lg font-black text-foreground">{isLoading ? "..." : data?.metrics?.unique_students ?? 0}</div>
        </div>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted" />
        <input type="text" placeholder="Search by student or medicine..." value={search} onChange={e => setSearch(e.target.value)} className="w-full rounded-xl border border-border py-2 pl-9 pr-3 text-sm focus:border-primary focus:outline-none" />
      </div>

      {showForm && (
        <div className="mb-4 rounded-xl border border-info-border bg-info-soft p-4">
          <h3 className="text-sm font-bold text-foreground mb-3">Dispense Medicine</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs font-bold text-foreground">Student Name *</label>
              <input value={form.student_name} onChange={e => setForm({...form, student_name: e.target.value})} className="mt-1 w-full rounded-lg border border-border p-2 text-sm focus:border-blue-500 focus:outline-none" />
            </div>
            <div>
              <label className="text-xs font-bold text-foreground">Class</label>
              <input value={form.class_name} onChange={e => setForm({...form, class_name: e.target.value})} className="mt-1 w-full rounded-lg border border-border p-2 text-sm focus:border-blue-500 focus:outline-none" />
            </div>
            <div>
              <label className="text-xs font-bold text-foreground">Medicine *</label>
              <input value={form.medicine_name} onChange={e => setForm({...form, medicine_name: e.target.value})} className="mt-1 w-full rounded-lg border border-border p-2 text-sm focus:border-blue-500 focus:outline-none" />
            </div>
            <div>
              <label className="text-xs font-bold text-foreground">Dosage</label>
              <input value={form.dosage} onChange={e => setForm({...form, dosage: e.target.value})} placeholder="e.g. 500mg x 2" className="mt-1 w-full rounded-lg border border-border p-2 text-sm focus:border-blue-500 focus:outline-none" />
            </div>
            <div>
              <label className="text-xs font-bold text-foreground">Quantity *</label>
              <input type="number" value={form.quantity_given} onChange={e => setForm({...form, quantity_given: e.target.value})} className="mt-1 w-full rounded-lg border border-border p-2 text-sm focus:border-blue-500 focus:outline-none" />
            </div>
          </div>
          <div className="mt-3 flex gap-2 justify-end">
            <button onClick={() => setShowForm(false)} className="rounded-lg px-4 py-2 text-sm font-bold text-muted hover:bg-slate-100">Cancel</button>
            <button disabled={isSubmitting} onClick={handleDispense} className="rounded-lg bg-primary px-4 py-2 text-sm font-black text-white hover:bg-blue-900 disabled:opacity-50">
              {isSubmitting ? "Dispensing..." : "Dispense & Log"}
            </button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-border">
        <RecordTable className="w-full text-sm text-left whitespace-nowrap">
          <thead className="bg-surface-muted text-foreground">
            <tr>
              <th className="px-4 py-3 font-bold border-b border-border">Student</th>
              <th className="px-4 py-3 font-bold border-b border-border">Class</th>
              <th className="px-4 py-3 font-bold border-b border-border">Medicine</th>
              <th className="px-4 py-3 font-bold border-b border-border">Dosage</th>
              <th className="px-4 py-3 font-bold border-b border-border">Qty</th>
              <th className="px-4 py-3 font-bold border-b border-border">Dispensed By</th>
              <th className="px-4 py-3 font-bold border-b border-border">Date/Time</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-muted">Loading dispensing log...</td></tr>
            ) : records.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-muted">No dispensing records yet. Use &quot;Dispense Medicine&quot; to log medicine given to students.</td></tr>
            ) : (
              records.map(r => (
                <tr key={r.id} className="hover:bg-surface-muted">
                  <td className="px-4 py-3 font-semibold text-foreground">{r.student_name}</td>
                  <td className="px-4 py-3 text-muted">{r.class_name}</td>
                  <td className="px-4 py-3 text-muted">{r.medicine_name}</td>
                  <td className="px-4 py-3 text-muted">{r.dosage || "—"}</td>
                  <td className="px-4 py-3 font-bold text-foreground">{r.quantity_given}</td>
                  <td className="px-4 py-3 text-muted">{r.dispensed_by}</td>
                  <td className="px-4 py-3 text-muted">{r.dispensed_at}</td>
                </tr>
              ))
            )}
          </tbody>
        </RecordTable>
      </div>
    </Panel>
  );
}
