"use client";
import { PackagePlus } from "lucide-react";
import { fieldValue, listFromData, Panel, StatusChip, Tone } from "./shared";
import { useSchoolQuery } from "@/lib/data/school-hooks";

type ResourceRequestsRecord = {
  id?: string;
  item?: string;
  quantity?: number | string;
  requested_by?: string;
  date?: string;
  priority?: string;
  status?: string;
  [key: string]: unknown;
};

type ResourceRequestsData = {
  metrics: {
    pending_requests: number;
    approved: number;
    fulfilled: number;
  };
  resourcerequestsList: ResourceRequestsRecord[];
};

export function ResourceRequestsWorkspace() {
  const { data, isLoading } = useSchoolQuery<ResourceRequestsData>('/admin-command/hod/resource-requests');
  const items = listFromData<ResourceRequestsRecord>(data, "resourcerequestsList");

  const getStatusTone = (st: string): Tone => {
    if (st === "Active" || st === "Available" || st === "Approved" || st === "Completed" || st === "Resolved" || st === "Present" || st === "Functional" || st === "On Track" || st === "Cleared") return "success";
    if (st === "Pending" || st === "In Progress" || st === "Pending Approval" || st === "Scheduled" || st === "On Loan" || st === "Behind" || st === "Departed" || st === "Warning" || st === "Pending Review") return "warning";
    if (st === "Overdue" || st === "Critical" || st === "Rejected" || st === "Escalated" || st === "Expired" || st === "Damaged" || st === "Flagged" || st === "Absent" || st === "Blacklisted" || st === "Disposed" || st === "Unauthorized") return "danger";
    if (st === "Issued" || st === "Checked In" || st === "Submitted" || st === "Booked" || st === "Sent" || st === "On Leave") return "info";
    return "neutral";
  };

  return (
    <Panel title="Resource Requests" description="Manage departmental resource and material requests." icon={PackagePlus}>
      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
          <div className="text-sm font-semibold text-[#64748B]">Pending Requests</div>
          <div className="mt-1 text-lg font-black text-[#071D49]">{isLoading ? "..." : data?.metrics?.pending_requests ?? 0}</div>
        </div>
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
          <div className="text-sm font-semibold text-[#64748B]">Approved</div>
          <div className="mt-1 text-lg font-black text-[#071D49]">{isLoading ? "..." : data?.metrics?.approved ?? 0}</div>
        </div>
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
          <div className="text-sm font-semibold text-[#64748B]">Fulfilled</div>
          <div className="mt-1 text-lg font-black text-[#071D49]">{isLoading ? "..." : data?.metrics?.fulfilled ?? 0}</div>
        </div>
      </div>
      <div className="overflow-x-auto rounded-xl border border-[#D8E0EC]">
        <table className="w-full text-sm text-left whitespace-nowrap">
          <thead className="bg-[#F8FAFC] text-[#071D49]">
            <tr>
              <th className="px-4 py-3 font-bold">Item</th>
              <th className="px-4 py-3 font-bold">Quantity</th>
              <th className="px-4 py-3 font-bold">Requested By</th>
              <th className="px-4 py-3 font-bold">Date</th>
              <th className="px-4 py-3 font-bold">Priority</th>
              <th className="px-4 py-3 font-bold">Status</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-[#64748B]">Loading...</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-[#64748B]">No resource requests yet. Department teachers can request resources from their teacher workspace.</td></tr>
            ) : (
              items.map((row, index) => (
                <tr key={row.id ?? `${fieldValue(row, ["item", "title"])}-${index}`} className="border-t border-[#D8E0EC] hover:bg-[#F8FAFC]">
                  <td className="px-4 py-3 text-[#64748B]">{fieldValue(row, ["item", "title", "name"])}</td>
                  <td className="px-4 py-3 text-[#64748B]">{fieldValue(row, ["quantity"], "0")}</td>
                  <td className="px-4 py-3 text-[#64748B]">{fieldValue(row, ["requested_by", "requester", "created_by"])}</td>
                  <td className="px-4 py-3 text-[#64748B]">{fieldValue(row, ["date", "created_at"])}</td>
                  <td className="px-4 py-3 text-[#64748B]">{fieldValue(row, ["priority"], "Normal")}</td>
                  <td className="px-4 py-3"><StatusChip label={fieldValue(row, ["status"], "Pending")} tone={getStatusTone(fieldValue(row, ["status"], "Pending"))} /></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
