"use client";
import { RecordTable } from "@/components/ui/record-table";
import { useState } from "react";
import { Clock, Search, Bell } from "lucide-react";
import { toast } from "sonner";
import { Panel, StatusChip, Tone } from "./shared";
import { useSchoolQuery } from "@/lib/data/school-hooks";
import { sendOverdueReminder } from "./api-client";

type OverdueRecord = {
  id: string;
  student_name: string;
  admission_no: string;
  class_name: string;
  book_title: string;
  isbn: string;
  issue_date: string;
  due_date: string;
  days_overdue: number;
  fine_accrued: number;
  reminder_sent: boolean;
};

type OverdueBooksData = {
  metrics: {
    total_overdue: number;
    over_7_days: number;
    over_30_days: number;
    total_fines_accrued: number;
  };
  overdue_books: OverdueRecord[];
};

export function OverdueBooksWorkspace() {
  const { data, isLoading, refetch } = useSchoolQuery<OverdueBooksData>('/admin-command/librarian/overdue-books');
  const [searchTerm, setSearchTerm] = useState("");
  const [sendingId, setSendingId] = useState<string | null>(null);

  const overdue = data?.overdue_books || [];
  const filtered = overdue.filter((o) =>
    o.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    o.book_title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    o.admission_no.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getOverdueTone = (days: number): Tone => {
    if (days > 30) return "danger";
    if (days > 7) return "warning";
    return "info";
  };

  const handleSendReminder = async (record: OverdueRecord) => {
    setSendingId(record.id);
    try {
      await sendOverdueReminder(record.id);
      toast.success(`Overdue reminder sent for "${record.book_title}" to ${record.student_name}.`);
      refetch();
    } catch {
      toast.error("Failed to send reminder.");
    } finally {
      setSendingId(null);
    }
  };

  return (
    <Panel title="Overdue Books" description="Track overdue book loans and send reminders to borrowers." icon={Clock}>
      {/* Metrics */}
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
          <div className="text-sm font-semibold text-rose-700">Total Overdue</div>
          <div className="mt-1 text-2xl font-black text-rose-700">{isLoading ? "..." : data?.metrics?.total_overdue ?? 0}</div>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <div className="text-sm font-semibold text-amber-700">Over 7 Days</div>
          <div className="mt-1 text-2xl font-black text-amber-700">{isLoading ? "..." : data?.metrics?.over_7_days ?? 0}</div>
        </div>
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
          <div className="text-sm font-semibold text-rose-700">Over 30 Days</div>
          <div className="mt-1 text-2xl font-black text-rose-700">{isLoading ? "..." : data?.metrics?.over_30_days ?? 0}</div>
        </div>
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
          <div className="text-sm font-semibold text-[#64748B]">Fines Accrued (KES)</div>
          <div className="mt-1 text-2xl font-black text-[#071D49]">{isLoading ? "..." : (data?.metrics?.total_fines_accrued ?? 0).toLocaleString()}</div>
        </div>
      </div>

      {/* Search */}
      <div className="mb-4 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748B]" />
        <input className="w-full rounded-lg border border-[#D8E0EC] py-2 pl-10 pr-4 text-sm placeholder:text-[#94A3B8]" placeholder="Search overdue books by student or book..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-[#D8E0EC]">
        <RecordTable className="w-full text-sm text-left whitespace-nowrap">
          <thead className="bg-[#F8FAFC] text-[#071D49]">
            <tr>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Student</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Adm No.</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Class</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Book</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Due Date</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Days Overdue</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Fine (KES)</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC] text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D8E0EC]">
            {isLoading ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-[#64748B]">Loading overdue books...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-[#64748B]">{searchTerm ? "No overdue books match your search." : "No overdue books. All borrowed books are within their due dates."}</td></tr>
            ) : (
              filtered.map((o) => (
                <tr key={o.id} className="hover:bg-[#F8FAFC]">
                  <td className="px-4 py-3 font-semibold text-[#071D49]">{o.student_name}</td>
                  <td className="px-4 py-3 text-[#64748B] font-mono text-xs">{o.admission_no}</td>
                  <td className="px-4 py-3 text-[#64748B]">{o.class_name}</td>
                  <td className="px-4 py-3 text-[#64748B]">{o.book_title}</td>
                  <td className="px-4 py-3 text-[#64748B]">{o.due_date}</td>
                  <td className="px-4 py-3"><StatusChip label={`${o.days_overdue} days`} tone={getOverdueTone(o.days_overdue)} /></td>
                  <td className="px-4 py-3 font-semibold text-amber-700">{o.fine_accrued > 0 ? o.fine_accrued.toLocaleString() : "—"}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      disabled={sendingId === o.id}
                      onClick={() => handleSendReminder(o)}
                      className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 font-semibold text-xs disabled:opacity-50"
                    >
                      <Bell className="w-3 h-3" />
                      {sendingId === o.id ? "Sending..." : o.reminder_sent ? "Resend" : "Remind"}
                    </button>
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
