"use client";
import { RecordTable } from "@/components/ui/record-table";
import { useState } from "react";
import { AlertTriangle, Search, Check, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Panel, StatusChip, Tone } from "./shared";
import { useSchoolQuery } from "@/lib/data/school-hooks";
import { createFine, waiveFine, markFinePaid } from "./api-client";

type FineRecord = {
  id: string;
  student_name: string;
  admission_no: string;
  class_name: string;
  book_title: string;
  fine_type: string;
  amount: number;
  date_created: string;
  status: string;
  notes: string;
};

type FinesData = {
  metrics: {
    total_fines: number;
    pending_amount: number;
    collected_amount: number;
    waived_amount: number;
  };
  fines: FineRecord[];
};

export function FinesLostDamagedWorkspace() {
  const { data, isLoading, refetch } = useSchoolQuery<FinesData>('/admin-command/librarian/fines-lost-damaged');
  const [searchTerm, setSearchTerm] = useState("");
  const [actionId, setActionId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [form, setForm] = useState({ student_admission_no: "", book_isbn: "", fine_type: "Lost", amount: 0, notes: "" });

  const fines = data?.fines || [];
  const filtered = fines.filter((f) =>
    f.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    f.book_title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    f.admission_no.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusTone = (st: string): Tone => {
    if (st === "Paid") return "success";
    if (st === "Pending") return "danger";
    if (st === "Waived") return "info";
    return "neutral";
  };

  const getTypeTone = (t: string): Tone => {
    if (t === "Lost") return "danger";
    if (t === "Damaged") return "warning";
    if (t === "Overdue Fine") return "info";
    return "neutral";
  };

  const handleCreateFine = async () => {
    if (!form.student_admission_no || !form.book_isbn || form.amount <= 0) {
      toast.error("Student, book, and a valid amount are required.");
      return;
    }
    setIsCreating(true);
    try {
      await createFine(form);
      toast.success("Fine created successfully.");
      setForm({ student_admission_no: "", book_isbn: "", fine_type: "Lost", amount: 0, notes: "" });
      setShowForm(false);
      refetch();
    } catch {
      toast.error("Failed to create fine.");
    } finally {
      setIsCreating(false);
    }
  };

  const handleMarkPaid = async (fine: FineRecord) => {
    setActionId(fine.id);
    try {
      await markFinePaid(fine.id);
      toast.success(`Fine for "${fine.book_title}" marked as paid.`);
      refetch();
    } catch {
      toast.error("Failed to mark fine as paid.");
    } finally {
      setActionId(null);
    }
  };

  const handleWaive = async (fine: FineRecord) => {
    if (!confirm(`Waive fine of KES ${fine.amount} for "${fine.book_title}"?`)) return;
    setActionId(fine.id);
    try {
      await waiveFine(fine.id);
      toast.success(`Fine for "${fine.book_title}" waived.`);
      refetch();
    } catch {
      toast.error("Failed to waive fine.");
    } finally {
      setActionId(null);
    }
  };

  return (
    <Panel
      title="Fines & Lost/Damaged"
      description="Manage fines for lost, damaged, and overdue library books."
      icon={AlertTriangle}
      actions={
        <button onClick={() => setShowForm(!showForm)} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-black text-white hover:bg-blue-900 transition">
          <AlertTriangle className="w-4 h-4" /> Record Fine
        </button>
      }
    >
      {/* Metrics */}
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <div className="rounded-xl border border-border bg-surface-muted p-4">
          <div className="text-sm font-semibold text-muted">Total Fines</div>
          <div className="mt-1 text-2xl font-black text-foreground">{isLoading ? "..." : data?.metrics?.total_fines ?? 0}</div>
        </div>
        <div className="rounded-xl border border-danger-border bg-danger-soft p-4">
          <div className="text-sm font-semibold text-danger">Pending (KES)</div>
          <div className="mt-1 text-2xl font-black text-danger">{isLoading ? "..." : (data?.metrics?.pending_amount ?? 0).toLocaleString()}</div>
        </div>
        <div className="rounded-xl border border-success-border bg-success-soft p-4">
          <div className="text-sm font-semibold text-success">Collected (KES)</div>
          <div className="mt-1 text-2xl font-black text-success">{isLoading ? "..." : (data?.metrics?.collected_amount ?? 0).toLocaleString()}</div>
        </div>
        <div className="rounded-xl border border-info-border bg-info-soft p-4">
          <div className="text-sm font-semibold text-info">Waived (KES)</div>
          <div className="mt-1 text-2xl font-black text-info">{isLoading ? "..." : (data?.metrics?.waived_amount ?? 0).toLocaleString()}</div>
        </div>
      </div>

      {/* Create fine form */}
      {showForm && (
        <div className="mb-6 rounded-xl border border-warning-border bg-warning-soft p-5">
          <h3 className="text-sm font-bold text-foreground mb-3">Record a Fine</h3>
          <div className="grid gap-3 md:grid-cols-3">
            <input className="rounded-lg border border-border px-3 py-2 text-sm" placeholder="Student Admission No. *" value={form.student_admission_no} onChange={(e) => setForm({ ...form, student_admission_no: e.target.value })} />
            <input className="rounded-lg border border-border px-3 py-2 text-sm" placeholder="Book ISBN / Title *" value={form.book_isbn} onChange={(e) => setForm({ ...form, book_isbn: e.target.value })} />
            <select className="rounded-lg border border-border px-3 py-2 text-sm" value={form.fine_type} onChange={(e) => setForm({ ...form, fine_type: e.target.value })}>
              <option value="Lost">Lost Book</option>
              <option value="Damaged">Damaged Book</option>
              <option value="Overdue Fine">Overdue Fine</option>
            </select>
            <input className="rounded-lg border border-border px-3 py-2 text-sm" type="number" min={0} placeholder="Amount (KES) *" value={form.amount || ""} onChange={(e) => setForm({ ...form, amount: parseFloat(e.target.value) || 0 })} />
            <input className="rounded-lg border border-border px-3 py-2 text-sm md:col-span-2" placeholder="Notes (optional)" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
          <div className="mt-3 flex gap-2">
            <button disabled={isCreating} onClick={handleCreateFine} className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white hover:bg-blue-900 disabled:opacity-50">{isCreating ? "Creating..." : "Save Fine"}</button>
            <button onClick={() => setShowForm(false)} className="rounded-lg border border-border px-4 py-2 text-sm font-bold text-muted hover:bg-slate-50">Cancel</button>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="mb-4 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
        <input className="w-full rounded-lg border border-border py-2 pl-10 pr-4 text-sm placeholder:text-muted" placeholder="Search fines by student or book..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-border">
        <RecordTable className="w-full text-sm text-left whitespace-nowrap">
          <thead className="bg-surface-muted text-foreground">
            <tr>
              <th className="px-4 py-3 font-bold border-b border-border">Student</th>
              <th className="px-4 py-3 font-bold border-b border-border">Adm No.</th>
              <th className="px-4 py-3 font-bold border-b border-border">Book</th>
              <th className="px-4 py-3 font-bold border-b border-border">Type</th>
              <th className="px-4 py-3 font-bold border-b border-border">Amount (KES)</th>
              <th className="px-4 py-3 font-bold border-b border-border">Date</th>
              <th className="px-4 py-3 font-bold border-b border-border">Status</th>
              <th className="px-4 py-3 font-bold border-b border-border text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-muted">Loading fines...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-muted">{searchTerm ? "No fines match your search." : "No fines recorded. Click \"Record Fine\" to create a fine for a lost or damaged book."}</td></tr>
            ) : (
              filtered.map((f) => (
                <tr key={f.id} className="hover:bg-surface-muted">
                  <td className="px-4 py-3 font-semibold text-foreground">{f.student_name}</td>
                  <td className="px-4 py-3 text-muted font-mono text-xs">{f.admission_no}</td>
                  <td className="px-4 py-3 text-muted">{f.book_title}</td>
                  <td className="px-4 py-3"><StatusChip label={f.fine_type} tone={getTypeTone(f.fine_type)} /></td>
                  <td className="px-4 py-3 font-semibold text-foreground">{f.amount.toLocaleString()}</td>
                  <td className="px-4 py-3 text-muted">{f.date_created}</td>
                  <td className="px-4 py-3"><StatusChip label={f.status} tone={getStatusTone(f.status)} /></td>
                  <td className="px-4 py-3 text-right">
                    {f.status === "Pending" && (
                      <div className="inline-flex gap-2">
                        <button disabled={actionId === f.id} onClick={() => handleMarkPaid(f)} className="inline-flex items-center gap-1 text-emerald-600 hover:text-success font-semibold text-xs disabled:opacity-50">
                          <Check className="w-3 h-3" /> Paid
                        </button>
                        <button disabled={actionId === f.id} onClick={() => handleWaive(f)} className="inline-flex items-center gap-1 text-blue-600 hover:text-info font-semibold text-xs disabled:opacity-50">
                          <XCircle className="w-3 h-3" /> Waive
                        </button>
                      </div>
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
