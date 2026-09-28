"use client";
import { RecordTable } from "@/components/ui/record-table";
import { useState } from "react";
import { Users, Search } from "lucide-react";
import { Panel, StatusChip, Tone } from "./shared";
import { useSchoolQuery } from "@/lib/data/school-hooks";

type BorrowerRecord = {
  id: string;
  student_name: string;
  admission_no: string;
  class_name: string;
  books_borrowed: number;
  books_overdue: number;
  total_fines: number;
  last_borrowed_date: string;
  status: string;
};

type BorrowersData = {
  metrics: {
    total_borrowers: number;
    active_borrowers: number;
    with_overdue: number;
    with_fines: number;
  };
  borrowers: BorrowerRecord[];
};

export function BorrowersWorkspace() {
  const { data, isLoading } = useSchoolQuery<BorrowersData>('/admin-command/librarian/borrowers');
  const [searchTerm, setSearchTerm] = useState("");

  const borrowers = data?.borrowers || [];
  const filtered = borrowers.filter((b) =>
    b.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.admission_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.class_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusTone = (st: string): Tone => {
    if (st === "Active") return "success";
    if (st === "Overdue") return "danger";
    if (st === "Has Fines") return "warning";
    if (st === "Cleared") return "info";
    return "neutral";
  };

  return (
    <Panel title="Borrowers" description="Track registered library borrowers and their borrowing history." icon={Users}>
      {/* Metrics */}
      <div className="app-metric-grid grid gap-4 md:grid-cols-4 mb-6">
        <div className="rounded-xl border border-border bg-surface-muted p-4">
          <div className="text-sm font-semibold text-muted">Total Borrowers</div>
          <div className="mt-1 text-2xl font-black text-foreground">{isLoading ? "..." : data?.metrics?.total_borrowers ?? 0}</div>
        </div>
        <div className="rounded-xl border border-success-border bg-success-soft p-4">
          <div className="text-sm font-semibold text-success">Active Borrowers</div>
          <div className="mt-1 text-2xl font-black text-success">{isLoading ? "..." : data?.metrics?.active_borrowers ?? 0}</div>
        </div>
        <div className="rounded-xl border border-danger-border bg-danger-soft p-4">
          <div className="text-sm font-semibold text-danger">With Overdue</div>
          <div className="mt-1 text-2xl font-black text-danger">{isLoading ? "..." : data?.metrics?.with_overdue ?? 0}</div>
        </div>
        <div className="rounded-xl border border-warning-border bg-warning-soft p-4">
          <div className="text-sm font-semibold text-warning">With Fines</div>
          <div className="mt-1 text-2xl font-black text-warning">{isLoading ? "..." : data?.metrics?.with_fines ?? 0}</div>
        </div>
      </div>

      {/* Search */}
      <div className="mb-4 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
        <input
          className="w-full rounded-lg border border-border py-2 pl-10 pr-4 text-sm placeholder:text-muted"
          placeholder="Search by student name, admission number, or class..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-border">
        <RecordTable className="w-full text-sm text-left whitespace-nowrap">
          <thead className="bg-surface-muted text-foreground">
            <tr>
              <th className="px-4 py-3 font-bold border-b border-border">Student Name</th>
              <th className="px-4 py-3 font-bold border-b border-border">Adm No.</th>
              <th className="px-4 py-3 font-bold border-b border-border">Class</th>
              <th className="px-4 py-3 font-bold border-b border-border">Books Out</th>
              <th className="px-4 py-3 font-bold border-b border-border">Overdue</th>
              <th className="px-4 py-3 font-bold border-b border-border">Fines (KES)</th>
              <th className="px-4 py-3 font-bold border-b border-border">Last Borrowed</th>
              <th className="px-4 py-3 font-bold border-b border-border">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-muted">Loading borrowers...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-muted">{searchTerm ? "No borrowers match your search." : "No borrowers registered yet. Issue a book to a student to create a borrower record."}</td></tr>
            ) : (
              filtered.map((b) => (
                <tr key={b.id} className="hover:bg-surface-muted">
                  <td className="px-4 py-3 font-semibold text-foreground">{b.student_name}</td>
                  <td className="px-4 py-3 text-muted font-mono text-xs">{b.admission_no}</td>
                  <td className="px-4 py-3 text-muted">{b.class_name}</td>
                  <td className="px-4 py-3 text-foreground font-semibold">{b.books_borrowed}</td>
                  <td className="px-4 py-3 font-semibold text-rose-600">{b.books_overdue > 0 ? b.books_overdue : "—"}</td>
                  <td className="px-4 py-3 text-muted">{b.total_fines > 0 ? b.total_fines.toLocaleString() : "—"}</td>
                  <td className="px-4 py-3 text-muted">{b.last_borrowed_date || "—"}</td>
                  <td className="px-4 py-3"><StatusChip label={b.status} tone={getStatusTone(b.status)} /></td>
                </tr>
              ))
            )}
          </tbody>
        </RecordTable>
      </div>
    </Panel>
  );
}
