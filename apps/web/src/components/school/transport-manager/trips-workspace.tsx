"use client";
import { Navigation } from "lucide-react";
import { Panel, StatusChip, Tone } from "./shared";
import { useSchoolQuery } from "@/lib/data/school-hooks";

type TripsRecord = {
  id: string;
  route: string;
  driver: string;
  vehicle: string;
  departure_time: string;
  arrival_time: string;
  students: number;
  status: string;
};

type TripsData = {
  metrics: {
    trips_today: number;
    completed: number;
    in_progress: number;
  };
  tripsList: TripsRecord[];
};

export function TripsWorkspace() {
  const { data, error, isLoading, refetch } = useSchoolQuery<TripsData>('/admin-command/transport-manager/trips');
  const items = data?.tripsList || [];

  const getStatusTone = (st: string): Tone => {
    if (st === "Active" || st === "Available" || st === "Approved" || st === "Completed" || st === "Resolved" || st === "Present" || st === "Functional" || st === "On Track" || st === "Cleared") return "success";
    if (st === "Pending" || st === "In Progress" || st === "Pending Approval" || st === "Scheduled" || st === "On Loan" || st === "Behind" || st === "Departed" || st === "Warning" || st === "Pending Review") return "warning";
    if (st === "Overdue" || st === "Critical" || st === "Rejected" || st === "Escalated" || st === "Expired" || st === "Damaged" || st === "Flagged" || st === "Absent" || st === "Blacklisted" || st === "Disposed" || st === "Unauthorized") return "danger";
    if (st === "Issued" || st === "Checked In" || st === "Submitted" || st === "Booked" || st === "Sent" || st === "On Leave") return "info";
    return "neutral";
  };

  if (error) {
    return (
      <Panel title="Trips" description="Track scheduled and completed transport trips." icon={Navigation}>
        <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          <p className="font-black">Trips could not be loaded.</p>
          <p className="mt-1">{error.message}</p>
          <button type="button" onClick={() => void refetch()} className="mt-3 font-black underline">Retry</button>
        </div>
      </Panel>
    );
  }

  return (
    <Panel title="Trip Log" description="Log and track daily transport trips." icon={Navigation}>
      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
          <div className="text-sm font-semibold text-[#64748B]">Trips Today</div>
          <div className="mt-1 text-lg font-black text-[#071D49]">{isLoading ? "..." : data?.metrics?.trips_today ?? 0}</div>
        </div>
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
          <div className="text-sm font-semibold text-[#64748B]">Completed</div>
          <div className="mt-1 text-lg font-black text-[#071D49]">{isLoading ? "..." : data?.metrics?.completed ?? 0}</div>
        </div>
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
          <div className="text-sm font-semibold text-[#64748B]">In Progress</div>
          <div className="mt-1 text-lg font-black text-[#071D49]">{isLoading ? "..." : data?.metrics?.in_progress ?? 0}</div>
        </div>
      </div>
      <div className="overflow-x-auto rounded-xl border border-[#D8E0EC]">
        <table className="w-full text-sm text-left whitespace-nowrap">
          <thead className="bg-[#F8FAFC] text-[#071D49]">
            <tr>
              <th className="px-4 py-3 font-bold">Route</th>
              <th className="px-4 py-3 font-bold">Driver</th>
              <th className="px-4 py-3 font-bold">Vehicle</th>
              <th className="px-4 py-3 font-bold">Departure Time</th>
              <th className="px-4 py-3 font-bold">Arrival Time</th>
              <th className="px-4 py-3 font-bold">Students</th>
              <th className="px-4 py-3 font-bold">Status</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-[#64748B]">Loading...</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-[#64748B]">No school-scoped records are loaded for this workspace yet. Use the primary action, import, or connected setup workflow to create the first record.</td></tr>
            ) : (
              items.map(row => (
                <tr key={row.id} className="border-t border-[#D8E0EC] hover:bg-[#F8FAFC]">
                  <td className="px-4 py-3 text-[#64748B]">{row.route}</td>
                  <td className="px-4 py-3 text-[#64748B]">{row.driver}</td>
                  <td className="px-4 py-3 text-[#64748B]">{row.vehicle}</td>
                  <td className="px-4 py-3 text-[#64748B]">{row.departure_time}</td>
                  <td className="px-4 py-3 text-[#64748B]">{row.arrival_time}</td>
                  <td className="px-4 py-3 text-[#64748B]">{row.students}</td>
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
