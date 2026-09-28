"use client";
import { RecordTable } from "@/components/ui/record-table";
import { useState } from "react";
import { BedDouble, PlusCircle, Search } from "lucide-react";
import { Panel, StatusChip, Tone } from "./shared";
import { useSchoolQuery } from "@/lib/data/school-hooks";
import { toast } from "sonner";
import { admitToSickBay, dischargeFromSickBay } from "./api-client";

type SickBayEntry = {
  id: string;
  student_name: string;
  class_name: string;
  complaint: string;
  admitted_at: string;
  status: string;
  notes: string;
};

type SickBayData = {
  metrics: { currently_admitted: number; discharged_today: number; avg_stay_hours: number };
  entries: SickBayEntry[];
};

export function SickBayQueueWorkspace() {
  const { data, isLoading, refetch } = useSchoolQuery<SickBayData>('/admin-command/nurse/sick-bay-queue');
  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({ student_name: "", class_name: "", complaint: "", notes: "" });
  const [search, setSearch] = useState("");

  const entries = (data?.entries || []).filter(e =>
    e.student_name.toLowerCase().includes(search.toLowerCase())
  );

  const getStatusTone = (st: string): Tone => {
    if (st === "Admitted") return "warning";
    if (st === "Discharged") return "success";
    if (st === "Critical") return "danger";
    return "neutral";
  };

  const handleAdmit = async () => {
    if (!form.student_name || !form.complaint) { toast.error("Student name and complaint are required."); return; }
    setIsSubmitting(true);
    try {
      await admitToSickBay(form);
      await refetch();
      toast.success("Student admitted to sick bay.");
      setShowForm(false);
      setForm({ student_name: "", class_name: "", complaint: "", notes: "" });
    } catch (e: any) { toast.error(e.message || "Failed to admit student."); }
    finally { setIsSubmitting(false); }
  };

  const handleDischarge = async (id: string, name: string) => {
    try {
      await dischargeFromSickBay(id);
      await refetch();
      toast.success(`${name} discharged from sick bay.`);
    } catch (e: any) { toast.error(e.message || "Failed to discharge student."); }
  };

  return (
    <Panel title="Sick Bay Queue" description="Students currently resting in the sick bay." icon={BedDouble} actions={
      <button onClick={() => setShowForm(true)} className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-black text-white hover:bg-blue-900 transition">
        <PlusCircle className="w-4 h-4" /> Admit Student
      </button>
    }>
      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <div className="rounded-xl border border-warning-border bg-warning-soft p-4">
          <div className="text-sm font-semibold text-warning">Currently Admitted</div>
          <div className="mt-1 text-lg font-black text-warning">{isLoading ? "..." : data?.metrics?.currently_admitted ?? 0}</div>
        </div>
        <div className="rounded-xl border border-success-border bg-success-soft p-4">
          <div className="text-sm font-semibold text-success">Discharged Today</div>
          <div className="mt-1 text-lg font-black text-success">{isLoading ? "..." : data?.metrics?.discharged_today ?? 0}</div>
        </div>
        <div className="rounded-xl border border-border bg-surface-muted p-4">
          <div className="text-sm font-semibold text-muted">Avg Stay (hrs)</div>
          <div className="mt-1 text-lg font-black text-foreground">{isLoading ? "..." : data?.metrics?.avg_stay_hours ?? "—"}</div>
        </div>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted" />
        <input type="text" placeholder="Search student..." value={search} onChange={e => setSearch(e.target.value)} className="w-full rounded-xl border border-border py-2 pl-9 pr-3 text-sm focus:border-primary focus:outline-none" />
      </div>

      {showForm && (
        <div className="mb-4 rounded-xl border border-warning-border bg-warning-soft p-4">
          <h3 className="text-sm font-bold text-foreground mb-3">Admit to Sick Bay</h3>
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
              <label className="text-xs font-bold text-foreground">Complaint *</label>
              <input value={form.complaint} onChange={e => setForm({...form, complaint: e.target.value})} className="mt-1 w-full rounded-lg border border-border p-2 text-sm focus:border-blue-500 focus:outline-none" />
            </div>
            <div>
              <label className="text-xs font-bold text-foreground">Notes</label>
              <input value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} className="mt-1 w-full rounded-lg border border-border p-2 text-sm focus:border-blue-500 focus:outline-none" />
            </div>
          </div>
          <div className="mt-3 flex gap-2 justify-end">
            <button onClick={() => setShowForm(false)} className="rounded-lg px-4 py-2 text-sm font-bold text-muted hover:bg-slate-100">Cancel</button>
            <button disabled={isSubmitting} onClick={handleAdmit} className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-black text-white hover:bg-amber-700 disabled:opacity-50">
              {isSubmitting ? "Admitting..." : "Admit"}
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
              <th className="px-4 py-3 font-bold border-b border-border">Complaint</th>
              <th className="px-4 py-3 font-bold border-b border-border">Admitted At</th>
              <th className="px-4 py-3 font-bold border-b border-border">Status</th>
              <th className="px-4 py-3 font-bold border-b border-border text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-muted">Loading sick bay...</td></tr>
            ) : entries.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-muted">Sick bay is empty. Click &quot;Admit Student&quot; when a student needs rest.</td></tr>
            ) : (
              entries.map(e => (
                <tr key={e.id} className="hover:bg-surface-muted">
                  <td className="px-4 py-3 font-semibold text-foreground">{e.student_name}</td>
                  <td className="px-4 py-3 text-muted">{e.class_name}</td>
                  <td className="px-4 py-3 text-muted">{e.complaint}</td>
                  <td className="px-4 py-3 text-muted">{e.admitted_at}</td>
                  <td className="px-4 py-3"><StatusChip label={e.status} tone={getStatusTone(e.status)} /></td>
                  <td className="px-4 py-3 text-right">
                    {e.status === "Admitted" && (
                      <button onClick={() => handleDischarge(e.id, e.student_name)} className="text-emerald-600 hover:underline font-semibold text-xs">Discharge</button>
                    )}
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
