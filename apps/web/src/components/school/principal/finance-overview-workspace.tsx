"use client";
import { DollarSign } from "lucide-react";
import { Panel, StatusChip, Tone } from "./shared";
import { useSchoolQuery } from "@/lib/data/school-hooks";

type FinanceOverviewRecord = {
  id: string;
  category: string;
  amount: string;
  trend: string;
  status: string;
};

type FinanceOverviewData = {
  metrics: {
    total_invoiced: number;
    total_collected: number;
    outstanding: number;
    collection_rate: number;
  };
  financeoverviewList: FinanceOverviewRecord[];
};

export function FinanceOverviewWorkspace() {
  const { data, isLoading } = useSchoolQuery<FinanceOverviewData>('/admin-command/principal/finance-overview');
  const items = data?.financeoverviewList || [];

  const getStatusTone = (st: string): Tone => {
    if (st === "Active" || st === "Available" || st === "Approved" || st === "Completed" || st === "Resolved" || st === "Present" || st === "Functional" || st === "On Track" || st === "Cleared" || st === "Published" || st === "Admitted" || st === "Generated") return "success";
    if (st === "Pending" || st === "In Progress" || st === "Pending Approval" || st === "Scheduled" || st === "Draft" || st === "Behind" || st === "Warning" || st === "Pending Review" || st === "Not Started") return "warning";
    if (st === "Overdue" || st === "Critical" || st === "Rejected" || st === "Escalated" || st === "Expired" || st === "Damaged" || st === "Flagged" || st === "Absent" || st === "Suspended") return "danger";
    if (st === "Issued" || st === "Submitted" || st === "On Leave" || st === "Graduated" || st === "Downloaded") return "info";
    return "neutral";
  };

  return (
    <Panel title="Finance Overview" description="High-level financial summary for the principal." icon={DollarSign}>
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
          <div className="text-sm font-semibold text-[#64748B]">Total Invoiced</div>
          <div className="mt-1 text-lg font-black text-[#071D49]">{isLoading ? "..." : data?.metrics?.total_invoiced ?? 0}</div>
        </div>
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
          <div className="text-sm font-semibold text-[#64748B]">Total Collected</div>
          <div className="mt-1 text-lg font-black text-[#071D49]">{isLoading ? "..." : data?.metrics?.total_collected ?? 0}</div>
        </div>
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
          <div className="text-sm font-semibold text-[#64748B]">Outstanding</div>
          <div className="mt-1 text-lg font-black text-[#071D49]">{isLoading ? "..." : data?.metrics?.outstanding ?? 0}</div>
        </div>
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
          <div className="text-sm font-semibold text-[#64748B]">Collection Rate</div>
          <div className="mt-1 text-lg font-black text-[#071D49]">{isLoading ? "..." : data?.metrics?.collection_rate ?? 0}</div>
        </div>
      </div>
      <div className="overflow-x-auto rounded-xl border border-[#D8E0EC]">
        <table className="w-full text-sm text-left whitespace-nowrap">
          <thead className="bg-[#F8FAFC] text-[#071D49]">
            <tr>
              <th className="px-4 py-3 font-bold">Category</th>
              <th className="px-4 py-3 font-bold">Amount</th>
              <th className="px-4 py-3 font-bold">Trend</th>
              <th className="px-4 py-3 font-bold">Status</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-[#64748B]">Loading...</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-[#64748B]">No records found. Create the first entry to get started.</td></tr>
            ) : (
              items.map(row => (
                <tr key={row.id} className="border-t border-[#D8E0EC] hover:bg-[#F8FAFC]">
                  <td className="px-4 py-3 text-[#64748B]">{row.category}</td>
                  <td className="px-4 py-3 text-[#64748B]">{row.amount}</td>
                  <td className="px-4 py-3 text-[#64748B]">{row.trend}</td>
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
