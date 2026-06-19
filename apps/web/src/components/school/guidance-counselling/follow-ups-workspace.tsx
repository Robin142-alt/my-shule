"use client";
import { RefreshCw } from "lucide-react";
import { Panel, StatusChip, Tone } from "./shared";
import { useSchoolQuery } from "@/lib/data/school-hooks";

type FollowUpsRecord = {
  id: string;
  student_name: string;
  class: string;
  session_date: string;
  follow_up_date: string;
  counsellor: string;
  status: string;
};

type FollowUpsData = {
  metrics: {
    pending_followups: number;
    completed: number;
    overdue: number;
  };
  followupsList: FollowUpsRecord[];
};

export function FollowUpsWorkspace() {
  const { data, isLoading } = useSchoolQuery<FollowUpsData>('/admin-command/guidance-counselling/follow-ups');
  const items = data?.followupsList || [];

  const getStatusTone = (st: string): Tone => {
    if (st === "Active" || st === "Available" || st === "Approved" || st === "Completed" || st === "Resolved" || st === "Present" || st === "Functional" || st === "On Track" || st === "Cleared") return "success";
    if (st === "Pending" || st === "In Progress" || st === "Pending Approval" || st === "Scheduled" || st === "On Loan" || st === "Behind" || st === "Departed" || st === "Warning" || st === "Pending Review") return "warning";
    if (st === "Overdue" || st === "Critical" || st === "Rejected" || st === "Escalated" || st === "Expired" || st === "Damaged" || st === "Flagged" || st === "Absent" || st === "Blacklisted" || st === "Disposed" || st === "Unauthorized") return "danger";
    if (st === "Issued" || st === "Checked In" || st === "Submitted" || st === "Booked" || st === "Sent" || st === "On Leave") return "info";
    return "neutral";
  };

  return (
    <Panel title="Follow-ups" description="Track counselling follow-up actions." icon={RefreshCw}>
      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
          <div className="text-sm font-semibold text-[#64748B]">Pending Followups</div>
          <div className="mt-1 text-lg font-black text-[#071D49]">{isLoading ? "..." : data?.metrics?.pending_followups ?? 0}</div>
        </div>
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
          <div className="text-sm font-semibold text-[#64748B]">Completed</div>
          <div className="mt-1 text-lg font-black text-[#071D49]">{isLoading ? "..." : data?.metrics?.completed ?? 0}</div>
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
              <th className="px-4 py-3 font-bold">Student Name</th>
              <th className="px-4 py-3 font-bold">Class</th>
              <th className="px-4 py-3 font-bold">Session Date</th>
              <th className="px-4 py-3 font-bold">Follow Up Date</th>
              <th className="px-4 py-3 font-bold">Counsellor</th>
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
                  <td className="px-4 py-3 text-[#64748B]">{row.session_date}</td>
                  <td className="px-4 py-3 text-[#64748B]">{row.follow_up_date}</td>
                  <td className="px-4 py-3 text-[#64748B]">{row.counsellor}</td>
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
