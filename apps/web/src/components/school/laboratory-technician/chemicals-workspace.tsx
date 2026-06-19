"use client";
import { Beaker } from "lucide-react";
import { Panel, StatusChip, Tone } from "./shared";
import { useSchoolQuery } from "@/lib/data/school-hooks";

type ChemicalsRecord = {
  id: string;
  chemical_name: string;
  formula: string;
  quantity: number;
  unit: string;
  expiry_date: string;
  hazard_level: string;
  status: string;
};

type ChemicalsData = {
  metrics: {
    total_chemicals: number;
    low_stock: number;
    expired: number;
  };
  chemicalsList: ChemicalsRecord[];
};

export function ChemicalsWorkspace() {
  const { data, isLoading } = useSchoolQuery<ChemicalsData>('/admin-command/laboratory-technician/chemicals');
  const items = data?.chemicalsList || [];

  const getStatusTone = (st: string): Tone => {
    if (st === "Active" || st === "Available" || st === "Approved" || st === "Completed" || st === "Resolved" || st === "Present" || st === "Functional" || st === "On Track" || st === "Cleared") return "success";
    if (st === "Pending" || st === "In Progress" || st === "Pending Approval" || st === "Scheduled" || st === "On Loan" || st === "Behind" || st === "Departed" || st === "Warning" || st === "Pending Review") return "warning";
    if (st === "Overdue" || st === "Critical" || st === "Rejected" || st === "Escalated" || st === "Expired" || st === "Damaged" || st === "Flagged" || st === "Absent" || st === "Blacklisted" || st === "Disposed" || st === "Unauthorized") return "danger";
    if (st === "Issued" || st === "Checked In" || st === "Submitted" || st === "Booked" || st === "Sent" || st === "On Leave") return "info";
    return "neutral";
  };

  return (
    <Panel title="Chemicals" description="Manage lab chemical inventory." icon={Beaker}>
      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
          <div className="text-sm font-semibold text-[#64748B]">Total Chemicals</div>
          <div className="mt-1 text-lg font-black text-[#071D49]">{isLoading ? "..." : data?.metrics?.total_chemicals ?? 0}</div>
        </div>
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
          <div className="text-sm font-semibold text-[#64748B]">Low Stock</div>
          <div className="mt-1 text-lg font-black text-[#071D49]">{isLoading ? "..." : data?.metrics?.low_stock ?? 0}</div>
        </div>
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
          <div className="text-sm font-semibold text-[#64748B]">Expired</div>
          <div className="mt-1 text-lg font-black text-[#071D49]">{isLoading ? "..." : data?.metrics?.expired ?? 0}</div>
        </div>
      </div>
      <div className="overflow-x-auto rounded-xl border border-[#D8E0EC]">
        <table className="w-full text-sm text-left whitespace-nowrap">
          <thead className="bg-[#F8FAFC] text-[#071D49]">
            <tr>
              <th className="px-4 py-3 font-bold">Chemical Name</th>
              <th className="px-4 py-3 font-bold">Formula</th>
              <th className="px-4 py-3 font-bold">Quantity</th>
              <th className="px-4 py-3 font-bold">Unit</th>
              <th className="px-4 py-3 font-bold">Expiry Date</th>
              <th className="px-4 py-3 font-bold">Hazard Level</th>
              <th className="px-4 py-3 font-bold">Status</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-[#64748B]">Loading...</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-[#64748B]">No records found. Create the first entry to get started.</td></tr>
            ) : (
              items.map(row => (
                <tr key={row.id} className="border-t border-[#D8E0EC] hover:bg-[#F8FAFC]">
                  <td className="px-4 py-3 text-[#64748B]">{row.chemical_name}</td>
                  <td className="px-4 py-3 text-[#64748B]">{row.formula}</td>
                  <td className="px-4 py-3 text-[#64748B]">{row.quantity}</td>
                  <td className="px-4 py-3 text-[#64748B]">{row.unit}</td>
                  <td className="px-4 py-3 text-[#64748B]">{row.expiry_date}</td>
                  <td className="px-4 py-3 text-[#64748B]">{row.hazard_level}</td>
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
