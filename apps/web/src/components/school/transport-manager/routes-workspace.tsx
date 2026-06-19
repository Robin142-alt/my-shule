"use client";
import { Map } from "lucide-react";
import { Panel, StatusChip, Tone } from "./shared";
import { useSchoolQuery } from "@/lib/data/school-hooks";

type RoutesRecord = {
  id: string;
  route_name: string;
  pickup_points: number;
  students_count: number;
  driver: string;
  vehicle: string;
  status: string;
};

type RoutesData = {
  metrics: {
    total_routes: number;
    active_routes: number;
  };
  routesList: RoutesRecord[];
};

export function RoutesWorkspace() {
  const { data, isLoading } = useSchoolQuery<RoutesData>('/admin-command/transport-manager/routes');
  const items = data?.routesList || [];

  const getStatusTone = (st: string): Tone => {
    if (st === "Active" || st === "Available" || st === "Approved" || st === "Completed" || st === "Resolved" || st === "Present" || st === "Functional" || st === "On Track" || st === "Cleared") return "success";
    if (st === "Pending" || st === "In Progress" || st === "Pending Approval" || st === "Scheduled" || st === "On Loan" || st === "Behind" || st === "Departed" || st === "Warning" || st === "Pending Review") return "warning";
    if (st === "Overdue" || st === "Critical" || st === "Rejected" || st === "Escalated" || st === "Expired" || st === "Damaged" || st === "Flagged" || st === "Absent" || st === "Blacklisted" || st === "Disposed" || st === "Unauthorized") return "danger";
    if (st === "Issued" || st === "Checked In" || st === "Submitted" || st === "Booked" || st === "Sent" || st === "On Leave") return "info";
    return "neutral";
  };

  return (
    <Panel title="Routes" description="Manage school transport routes." icon={Map}>
      <div className="grid gap-4 md:grid-cols-2 mb-6">
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
          <div className="text-sm font-semibold text-[#64748B]">Total Routes</div>
          <div className="mt-1 text-lg font-black text-[#071D49]">{isLoading ? "..." : data?.metrics?.total_routes ?? 0}</div>
        </div>
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
          <div className="text-sm font-semibold text-[#64748B]">Active Routes</div>
          <div className="mt-1 text-lg font-black text-[#071D49]">{isLoading ? "..." : data?.metrics?.active_routes ?? 0}</div>
        </div>
      </div>
      <div className="overflow-x-auto rounded-xl border border-[#D8E0EC]">
        <table className="w-full text-sm text-left whitespace-nowrap">
          <thead className="bg-[#F8FAFC] text-[#071D49]">
            <tr>
              <th className="px-4 py-3 font-bold">Route Name</th>
              <th className="px-4 py-3 font-bold">Pickup Points</th>
              <th className="px-4 py-3 font-bold">Students Count</th>
              <th className="px-4 py-3 font-bold">Driver</th>
              <th className="px-4 py-3 font-bold">Vehicle</th>
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
                  <td className="px-4 py-3 text-[#64748B]">{row.route_name}</td>
                  <td className="px-4 py-3 text-[#64748B]">{row.pickup_points}</td>
                  <td className="px-4 py-3 text-[#64748B]">{row.students_count}</td>
                  <td className="px-4 py-3 text-[#64748B]">{row.driver}</td>
                  <td className="px-4 py-3 text-[#64748B]">{row.vehicle}</td>
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
