"use client";
import { RecordTable } from "@/components/ui/record-table";
import { useState } from "react";
import { BookCheck, Search } from "lucide-react";
import { toast } from "sonner";
import { Panel, StatusChip, Tone } from "./shared";
import { useSchoolQuery } from "@/lib/data/school-hooks";
import { returnBookFromStudent } from "./api-client";

type ReturnRecord = {
  id: string;
  student_name: string;
  admission_no: string;
  book_title: string;
  isbn: string;
  issue_date: string;
  due_date: string;
  return_date: string | null;
  condition: string;
  status: string;
};

type ReturnBookData = {
  metrics: {
    returned_today: number;
    pending_returns: number;
    overdue_returns: number;
  };
  returns: ReturnRecord[];
};

export function ReturnBookWorkspace() {
  const { data, isLoading, refetch } = useSchoolQuery<ReturnBookData>('/admin-command/librarian/return-book');
  const [searchTerm, setSearchTerm] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({ student_admission_no: "", book_isbn: "", condition: "Good" });

  const returns = data?.returns || [];
  const filtered = returns.filter((r) =>
    r.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.book_title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.admission_no.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusTone = (st: string): Tone => {
    if (st === "Returned") return "success";
    if (st === "Returned Late") return "warning";
    if (st === "Pending") return "info";
    if (st === "Damaged") return "danger";
    return "neutral";
  };

  const handleReturn = async () => {
    if (!form.student_admission_no || !form.book_isbn) {
      toast.error("Student admission number and book ISBN/ID are required.");
      return;
    }
    setIsSubmitting(true);
    try {
      await returnBookFromStudent(form);
      toast.success("Book returned successfully.");
      setForm({ student_admission_no: "", book_isbn: "", condition: "Good" });
      setShowForm(false);
      refetch();
    } catch {
      toast.error("Failed to process return. Verify the student and book details.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Panel
      title="Return Book"
      description="Process book returns and record condition on return."
      icon={BookCheck}
      actions={
        <button
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-black text-white hover:bg-blue-900 transition"
        >
          <BookCheck className="w-4 h-4" /> Process Return
        </button>
      }
    >
      {/* Metrics */}
      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <div className="rounded-xl border border-success-border bg-success-soft p-4">
          <div className="text-sm font-semibold text-success">Returned Today</div>
          <div className="mt-1 text-2xl font-black text-success">{isLoading ? "..." : data?.metrics?.returned_today ?? 0}</div>
        </div>
        <div className="rounded-xl border border-border bg-surface-muted p-4">
          <div className="text-sm font-semibold text-muted">Pending Returns</div>
          <div className="mt-1 text-2xl font-black text-foreground">{isLoading ? "..." : data?.metrics?.pending_returns ?? 0}</div>
        </div>
        <div className="rounded-xl border border-danger-border bg-danger-soft p-4">
          <div className="text-sm font-semibold text-danger">Overdue Returns</div>
          <div className="mt-1 text-2xl font-black text-danger">{isLoading ? "..." : data?.metrics?.overdue_returns ?? 0}</div>
        </div>
      </div>

      {/* Return form */}
      {showForm && (
        <div className="mb-6 rounded-xl border border-success-border bg-success-soft p-5">
          <h3 className="text-sm font-bold text-foreground mb-3">Process a Book Return</h3>
          <div className="grid gap-3 md:grid-cols-3">
            <input className="rounded-lg border border-border px-3 py-2 text-sm" placeholder="Student Admission No. *" value={form.student_admission_no} onChange={(e) => setForm({ ...form, student_admission_no: e.target.value })} />
            <input className="rounded-lg border border-border px-3 py-2 text-sm" placeholder="Book ISBN / Title *" value={form.book_isbn} onChange={(e) => setForm({ ...form, book_isbn: e.target.value })} />
            <select className="rounded-lg border border-border px-3 py-2 text-sm" value={form.condition} onChange={(e) => setForm({ ...form, condition: e.target.value })}>
              <option value="Good">Good Condition</option>
              <option value="Fair">Fair Condition</option>
              <option value="Damaged">Damaged</option>
              <option value="Lost">Lost (Replacement Fee)</option>
            </select>
          </div>
          <div className="mt-3 flex gap-2">
            <button disabled={isSubmitting} onClick={handleReturn} className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white hover:bg-blue-900 disabled:opacity-50">{isSubmitting ? "Processing..." : "Confirm Return"}</button>
            <button onClick={() => setShowForm(false)} className="rounded-lg border border-border px-4 py-2 text-sm font-bold text-muted hover:bg-slate-50">Cancel</button>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="mb-4 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
        <input className="w-full rounded-lg border border-border py-2 pl-10 pr-4 text-sm placeholder:text-muted" placeholder="Search returns by student or book..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-border">
        <RecordTable className="w-full text-sm text-left whitespace-nowrap">
          <thead className="bg-surface-muted text-foreground">
            <tr>
              <th className="px-4 py-3 font-bold border-b border-border">Student</th>
              <th className="px-4 py-3 font-bold border-b border-border">Adm No.</th>
              <th className="px-4 py-3 font-bold border-b border-border">Book</th>
              <th className="px-4 py-3 font-bold border-b border-border">Issue Date</th>
              <th className="px-4 py-3 font-bold border-b border-border">Due Date</th>
              <th className="px-4 py-3 font-bold border-b border-border">Return Date</th>
              <th className="px-4 py-3 font-bold border-b border-border">Condition</th>
              <th className="px-4 py-3 font-bold border-b border-border">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-muted">Loading return records...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-muted">{searchTerm ? "No return records match your search." : "No book returns processed yet. Click \"Process Return\" to return a book."}</td></tr>
            ) : (
              filtered.map((r) => (
                <tr key={r.id} className="hover:bg-surface-muted">
                  <td className="px-4 py-3 font-semibold text-foreground">{r.student_name}</td>
                  <td className="px-4 py-3 text-muted font-mono text-xs">{r.admission_no}</td>
                  <td className="px-4 py-3 text-muted">{r.book_title}</td>
                  <td className="px-4 py-3 text-muted">{r.issue_date}</td>
                  <td className="px-4 py-3 text-muted">{r.due_date}</td>
                  <td className="px-4 py-3 text-muted">{r.return_date || "—"}</td>
                  <td className="px-4 py-3 text-muted">{r.condition}</td>
                  <td className="px-4 py-3"><StatusChip label={r.status} tone={getStatusTone(r.status)} /></td>
                </tr>
              ))
            )}
          </tbody>
        </RecordTable>
      </div>
    </Panel>
  );
}
