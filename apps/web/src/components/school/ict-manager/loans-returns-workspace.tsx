"use client";
import { ArrowLeftRight } from "lucide-react";
import { Panel, StatusChip, Tone } from "./shared";
import { useSchoolQuery } from "@/lib/data/school-hooks";

type LoansReturnsRecord = {
  id: string;
  asset_name: string;
  loaned_to: string;
  loan_date: string;
  due_date: string;
  return_date: string;
  status: string;
};

type LoansReturnsData = {
  metrics: {
    on_loan: number;
    returned_today: number;
    overdue: number;
  };
  loansreturnsList: LoansReturnsRecord[];
};

export function LoansReturnsWorkspace() {
  const { data, isLoading } = useSchoolQuery<LoansReturnsData>('/admin-command/ict-manager/loans-returns');
  const items = data?.loansreturnsList || [];

  const getStatusTone = (st: string): Tone => {
    if (st === "Active" || st === "Available" || st === "Approved" || st === "Completed" || st === "Resolved" || st === "Present" || st === "Functional" || st === "On Track" || st === "Cleared") return "success";
    if (st === "Pending" || st === "In Progress" || st === "Pending Approval" || st === "Scheduled" || st === "On Loan" || st === "Behind" || st === "Departed" || st === "Warning" || st === "Pending Review") return "warning";
    if (st === "Overdue" || st === "Critical" || st === "Rejected" || st === "Escalated" || st === "Expired" || st === "Damaged" || st === "Flagged" || st === "Absent" || st === "Blacklisted" || st === "Disposed" || st === "Unauthorized") return "danger";
    if (st === "Issued" || st === "Checked In" || st === "Submitted" || st === "Booked" || st === "Sent" || st === "On Leave") return "info";
    return "neutral";
  };

  return (
    <Panel title="Loans & Returns" description="Manage ICT equipment loans and returns." icon={ArrowLeftRight}>
      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
          <div className="text-sm font-semibold text-[#64748B]">On Loan</div>
          <div className="mt-1 text-lg font-black text-[#071D49]">{isLoading ? "..." : data?.metrics?.on_loan ?? 0}</div>
        </div>
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
          <div className="text-sm font-semibold text-[#64748B]">Returned Today</div>
          <div className="mt-1 text-lg font-black text-[#071D49]">{isLoading ? "..." : data?.metrics?.returned_today ?? 0}</div>
        </div>
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
          <div className="text-sm font-semibold text-[#64748B]">Overdue</div>
          <div className="mt-1 text-lg font-black text-[#071D49]">{isLoading ? "..." : data?.metrics?.overdue ?? 0}</div>
        </div>
      </div>
      <div className="overflow-x-auto rounded-xl border border-[#D8E0EC]">
        <table className="w-full text-sm text-left whitespace-nowrap">
          <thead className="bg-[#F8FAFC] text-[#071D49]">
            <tr>
              <th className="px-4 py-3 font-bold">Asset Name</th>
              <th className="px-4 py-3 font-bold">Loaned To</th>
              <th className="px-4 py-3 font-bold">Loan Date</th>
              <th className="px-4 py-3 font-bold">Due Date</th>
              <th className="px-4 py-3 font-bold">Return Date</th>
              <th className="px-4 py-3 font-bold">Status</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-[#64748B]">Loading...</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-[#64748B]">No records found. Create the first entry to get started.</td></tr>
            ) : (
              items.map(row => (
                <tr key={row.id} className="border-t border-[#D8E0EC] hover:bg-[#F8FAFC]">
                  <td className="px-4 py-3 text-[#64748B]">{row.asset_name}</td>
                  <td className="px-4 py-3 text-[#64748B]">{row.loaned_to}</td>
                  <td className="px-4 py-3 text-[#64748B]">{row.loan_date}</td>
                  <td className="px-4 py-3 text-[#64748B]">{row.due_date}</td>
                  <td className="px-4 py-3 text-[#64748B]">{row.return_date}</td>
                  <td className="px-4 py-3"><StatusChip label={row.status} tone={getStatusTone(row.status)} /></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
