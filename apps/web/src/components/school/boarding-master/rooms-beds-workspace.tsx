"use client";
import { BedDouble } from "lucide-react";
import { Panel, StatusChip, Tone } from "./shared";
import { useSchoolQuery } from "@/lib/data/school-hooks";

type RoomsBedsRecord = {
  id: string;
  hostel: string;
  room_number: string;
  capacity: number;
  occupied: number;
  status: string;
};

type RoomsBedsData = {
  metrics: {
    total_rooms: number;
    total_beds: number;
    available_beds: number;
  };
  roomsbedsList: RoomsBedsRecord[];
};

export function RoomsBedsWorkspace() {
  const { data, error, isLoading, refetch } = useSchoolQuery<RoomsBedsData>('/admin-command/boarding-master/rooms-beds');
  const items = data?.roomsbedsList || [];

  const getStatusTone = (st: string): Tone => {
    if (st === "Active" || st === "Available" || st === "Approved" || st === "Completed" || st === "Resolved" || st === "Present" || st === "Functional" || st === "On Track" || st === "Cleared") return "success";
    if (st === "Pending" || st === "In Progress" || st === "Pending Approval" || st === "Scheduled" || st === "On Loan" || st === "Behind" || st === "Departed" || st === "Warning" || st === "Pending Review") return "warning";
    if (st === "Overdue" || st === "Critical" || st === "Rejected" || st === "Escalated" || st === "Expired" || st === "Damaged" || st === "Flagged" || st === "Absent" || st === "Blacklisted" || st === "Disposed" || st === "Unauthorized") return "danger";
    if (st === "Issued" || st === "Checked In" || st === "Submitted" || st === "Booked" || st === "Sent" || st === "On Leave") return "info";
    return "neutral";
  };

  if (error) {
    return (
      <Panel title="Rooms & Beds" description="Manage rooms and bed assignments." icon={BedDouble}>
        <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          <p className="font-black">Rooms and beds could not be loaded.</p>
          <p className="mt-1">{error.message}</p>
          <button type="button" onClick={() => void refetch()} className="mt-3 font-black underline">Retry</button>
        </div>
      </Panel>
    );
  }

  return (
    <Panel title="Rooms & Beds" description="Manage rooms and bed assignments." icon={BedDouble}>
      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
          <div className="text-sm font-semibold text-[#64748B]">Total Rooms</div>
          <div className="mt-1 text-lg font-black text-[#071D49]">{isLoading ? "..." : data?.metrics?.total_rooms ?? 0}</div>
        </div>
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
          <div className="text-sm font-semibold text-[#64748B]">Total Beds</div>
          <div className="mt-1 text-lg font-black text-[#071D49]">{isLoading ? "..." : data?.metrics?.total_beds ?? 0}</div>
        </div>
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
          <div className="text-sm font-semibold text-[#64748B]">Available Beds</div>
          <div className="mt-1 text-lg font-black text-[#071D49]">{isLoading ? "..." : data?.metrics?.available_beds ?? 0}</div>
        </div>
      </div>
      <div className="overflow-x-auto rounded-xl border border-[#D8E0EC]">
        <table className="w-full text-sm text-left whitespace-nowrap">
          <thead className="bg-[#F8FAFC] text-[#071D49]">
            <tr>
              <th className="px-4 py-3 font-bold">Hostel</th>
              <th className="px-4 py-3 font-bold">Room Number</th>
              <th className="px-4 py-3 font-bold">Capacity</th>
              <th className="px-4 py-3 font-bold">Occupied</th>
              <th className="px-4 py-3 font-bold">Status</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-[#64748B]">Loading...</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-[#64748B]">No school-scoped records are loaded for this workspace yet. Use the primary action, import, or connected setup workflow to create the first record.</td></tr>
            ) : (
              items.map(row => (
                <tr key={row.id} className="border-t border-[#D8E0EC] hover:bg-[#F8FAFC]">
                  <td className="px-4 py-3 text-[#64748B]">{row.hostel}</td>
                  <td className="px-4 py-3 text-[#64748B]">{row.room_number}</td>
                  <td className="px-4 py-3 text-[#64748B]">{row.capacity}</td>
                  <td className="px-4 py-3 text-[#64748B]">{row.occupied}</td>
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
