"use client";
import { useState } from "react";
import { BookPlus, Search } from "lucide-react";
import { toast } from "sonner";
import { Panel, StatusChip, Tone } from "./shared";
import { useSchoolQuery } from "@/lib/data/school-hooks";
import { issueBookToStudent } from "./api-client";

type IssuedRecord = {
  id: string;
  student_name: string;
  admission_no: string;
  class_name: string;
  book_title: string;
  isbn: string;
  issue_date: string;
  due_date: string;
  status: string;
};

type IssueBookData = {
  metrics: {
    issued_today: number;
    total_active_issues: number;
    due_this_week: number;
  };
  recent_issues: IssuedRecord[];
};

export function IssueBookWorkspace() {
  const { data, isLoading, refetch } = useSchoolQuery<IssueBookData>('/admin-command/librarian/issue-book');
  const [searchTerm, setSearchTerm] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({ student_admission_no: "", book_isbn: "", due_date: "" });

  const issues = data?.recent_issues || [];
  const filtered = issues.filter((i) =>
    i.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    i.book_title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    i.admission_no.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusTone = (st: string): Tone => {
    if (st === "Active") return "info";
    if (st === "Returned") return "success";
    if (st === "Overdue") return "danger";
    return "neutral";
  };

  const handleIssue = async () => {
    if (!form.student_admission_no || !form.book_isbn) {
      toast.error("Student admission number and book ISBN/ID are required.");
      return;
    }
    setIsSubmitting(true);
    try {
      await issueBookToStudent(form);
      toast.success("Book issued successfully.");
      setForm({ student_admission_no: "", book_isbn: "", due_date: "" });
      setShowForm(false);
      refetch();
    } catch {
      toast.error("Failed to issue book. Check availability and student details.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Panel
      title="Issue Book"
      description="Issue books to students and track active book loans."
      icon={BookPlus}
      actions={
        <button
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center gap-2 rounded-lg bg-[#071D49] px-4 py-2 text-sm font-black text-white hover:bg-blue-900 transition"
        >
          <BookPlus className="w-4 h-4" /> Issue Book
        </button>
      }
    >
      {/* Metrics */}
      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
          <div className="text-sm font-semibold text-blue-700">Issued Today</div>
          <div className="mt-1 text-2xl font-black text-blue-700">{isLoading ? "..." : data?.metrics?.issued_today ?? 0}</div>
        </div>
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
          <div className="text-sm font-semibold text-[#64748B]">Active Issues</div>
          <div className="mt-1 text-2xl font-black text-[#071D49]">{isLoading ? "..." : data?.metrics?.total_active_issues ?? 0}</div>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <div className="text-sm font-semibold text-amber-700">Due This Week</div>
          <div className="mt-1 text-2xl font-black text-amber-700">{isLoading ? "..." : data?.metrics?.due_this_week ?? 0}</div>
        </div>
      </div>

      {/* Issue form */}
      {showForm && (
        <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50 p-5">
          <h3 className="text-sm font-bold text-[#071D49] mb-3">Issue a Book</h3>
          <div className="grid gap-3 md:grid-cols-3">
            <input className="rounded-lg border border-[#D8E0EC] px-3 py-2 text-sm" placeholder="Student Admission No. *" value={form.student_admission_no} onChange={(e) => setForm({ ...form, student_admission_no: e.target.value })} />
            <input className="rounded-lg border border-[#D8E0EC] px-3 py-2 text-sm" placeholder="Book ISBN / Title *" value={form.book_isbn} onChange={(e) => setForm({ ...form, book_isbn: e.target.value })} />
            <input className="rounded-lg border border-[#D8E0EC] px-3 py-2 text-sm" type="date" placeholder="Due Date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
          </div>
          <div className="mt-3 flex gap-2">
            <button disabled={isSubmitting} onClick={handleIssue} className="rounded-lg bg-[#071D49] px-4 py-2 text-sm font-bold text-white hover:bg-blue-900 disabled:opacity-50">{isSubmitting ? "Issuing..." : "Confirm Issue"}</button>
            <button onClick={() => setShowForm(false)} className="rounded-lg border border-[#D8E0EC] px-4 py-2 text-sm font-bold text-[#64748B] hover:bg-slate-50">Cancel</button>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="mb-4 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748B]" />
        <input className="w-full rounded-lg border border-[#D8E0EC] py-2 pl-10 pr-4 text-sm placeholder:text-[#94A3B8]" placeholder="Search recent issues by student or book..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-[#D8E0EC]">
        <table className="w-full text-sm text-left whitespace-nowrap">
          <thead className="bg-[#F8FAFC] text-[#071D49]">
            <tr>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Student</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Adm No.</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Class</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Book</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Issue Date</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Due Date</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D8E0EC]">
            {isLoading ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-[#64748B]">Loading issued books...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-[#64748B]">{searchTerm ? "No issues match your search." : "No books have been issued yet. Click \"Issue Book\" to issue a book to a student."}</td></tr>
            ) : (
              filtered.map((issue) => (
                <tr key={issue.id} className="hover:bg-[#F8FAFC]">
                  <td className="px-4 py-3 font-semibold text-[#071D49]">{issue.student_name}</td>
                  <td className="px-4 py-3 text-[#64748B] font-mono text-xs">{issue.admission_no}</td>
                  <td className="px-4 py-3 text-[#64748B]">{issue.class_name}</td>
                  <td className="px-4 py-3 text-[#64748B]">{issue.book_title}</td>
                  <td className="px-4 py-3 text-[#64748B]">{issue.issue_date}</td>
                  <td className="px-4 py-3 text-[#64748B]">{issue.due_date}</td>
                  <td className="px-4 py-3"><StatusChip label={issue.status} tone={getStatusTone(issue.status)} /></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
