"use client";
import { Forward } from "lucide-react";
import { Panel, StatusChip, Tone } from "./shared";
import { useSchoolQuery } from "@/lib/data/school-hooks";

type ReferralsRecord = {
  id: string;
  student_name: string;
  class: string;
  referred_by: string;
  reason: string;
  date: string;
  status: string;
};

type ReferralsData = {
  metrics: {
    pending_referrals: number;
    accepted: number;
    external: number;
  };
  referralsList: ReferralsRecord[];
};

export function ReferralsWorkspace() {
  const { data, isLoading } = useSchoolQuery<ReferralsData>('/admin-command/guidance-counselling/referrals');
  const items = data?.referralsList || [];

  const getStatusTone = (st: string): Tone => {
    if (st === "Active" || st === "Available" || st === "Approved" || st === "Completed" || st === "Resolved" || st === "Present" || st === "Functional" || st === "On Track" || st === "Cleared") return "success";
    if (st === "Pending" || st === "In Progress" || st === "Pending Approval" || st === "Scheduled" || st === "On Loan" || st === "Behind" || st === "Departed" || st === "Warning" || st === "Pending Review") return "warning";
    if (st === "Overdue" || st === "Critical" || st === "Rejected" || st === "Escalated" || st === "Expired" || st === "Damaged" || st === "Flagged" || st === "Absent" || st === "Blacklisted" || st === "Disposed" || st === "Unauthorized") return "danger";
    if (st === "Issued" || st === "Checked In" || st === "Submitted" || st === "Booked" || st === "Sent" || st === "On Leave") return "info";
    return "neutral";
  };

  return (
    <Panel title="Referrals" description="Manage counselling referrals." icon={Forward}>
      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
          <div className="text-sm font-semibold text-[#64748B]">Pending Referrals</div>
          <div className="mt-1 text-lg font-black text-[#071D49]">{isLoading ? "..." : data?.metrics?.pending_referrals ?? 0}</div>
        </div>
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
          <div className="text-sm font-semibold text-[#64748B]">Accepted</div>
          <div className="mt-1 text-lg font-black text-[#071D49]">{isLoading ? "..." : data?.metrics?.accepted ?? 0}</div>
        </div>
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
          <div className="text-sm font-semibold text-[#64748B]">External</div>
          <div className="mt-1 text-lg font-black text-[#071D49]">{isLoading ? "..." : data?.metrics?.external ?? 0}</div>
        </div>
      </div>
      <div className="overflow-x-auto rounded-xl border border-[#D8E0EC]">
        <table className="w-full text-sm text-left whitespace-nowrap">
          <thead className="bg-[#F8FAFC] text-[#071D49]">
            <tr>
              <th className="px-4 py-3 font-bold">Student Name</th>
              <th className="px-4 py-3 font-bold">Class</th>
              <th className="px-4 py-3 font-bold">Referred By</th>
              <th className="px-4 py-3 font-bold">Reason</th>
              <th className="px-4 py-3 font-bold">Date</th>
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
                  <td className="px-4 py-3 text-[#64748B]">{row.student_name}</td>
                  <td className="px-4 py-3 text-[#64748B]">{row.class}</td>
                  <td className="px-4 py-3 text-[#64748B]">{row.referred_by}</td>
                  <td className="px-4 py-3 text-[#64748B]">{row.reason}</td>
                  <td className="px-4 py-3 text-[#64748B]">{row.date}</td>
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
