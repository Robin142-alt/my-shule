"use client";
import { AlertTriangle } from "lucide-react";
import { Panel, StatusChip, Tone } from "./shared";
import { useSchoolQuery } from "@/lib/data/school-hooks";

type SafetyIncidentsRecord = {
  id: string;
  date: string;
  lab: string;
  description: string;
  students_involved: number;
  severity: string;
  status: string;
};

type SafetyIncidentsData = {
  metrics: {
    open_incidents: number;
    resolved: number;
    critical: number;
  };
  safetyincidentsList: SafetyIncidentsRecord[];
};

export function SafetyIncidentsWorkspace() {
  const { data, isLoading } = useSchoolQuery<SafetyIncidentsData>('/admin-command/laboratory-technician/safety-incidents');
  const items = data?.safetyincidentsList || [];

  const getStatusTone = (st: string): Tone => {
    if (st === "Active" || st === "Available" || st === "Approved" || st === "Completed" || st === "Resolved" || st === "Present" || st === "Functional" || st === "On Track" || st === "Cleared") return "success";
    if (st === "Pending" || st === "In Progress" || st === "Pending Approval" || st === "Scheduled" || st === "On Loan" || st === "Behind" || st === "Departed" || st === "Warning" || st === "Pending Review") return "warning";
    if (st === "Overdue" || st === "Critical" || st === "Rejected" || st === "Escalated" || st === "Expired" || st === "Damaged" || st === "Flagged" || st === "Absent" || st === "Blacklisted" || st === "Disposed" || st === "Unauthorized") return "danger";
    if (st === "Issued" || st === "Checked In" || st === "Submitted" || st === "Booked" || st === "Sent" || st === "On Leave") return "info";
    return "neutral";
  };

  return (
    <Panel title="Safety Incidents" description="Log and manage lab safety incidents." icon={AlertTriangle}>
      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
          <div className="text-sm font-semibold text-[#64748B]">Open Incidents</div>
          <div className="mt-1 text-lg font-black text-[#071D49]">{isLoading ? "..." : data?.metrics?.open_incidents ?? 0}</div>
        </div>
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
          <div className="text-sm font-semibold text-[#64748B]">Resolved</div>
          <div className="mt-1 text-lg font-black text-[#071D49]">{isLoading ? "..." : data?.metrics?.resolved ?? 0}</div>
        </div>
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
          <div className="text-sm font-semibold text-[#64748B]">Critical</div>
          <div className="mt-1 text-lg font-black text-[#071D49]">{isLoading ? "..." : data?.metrics?.critical ?? 0}</div>
        </div>
      </div>
      <div className="overflow-x-auto rounded-xl border border-[#D8E0EC]">
        <table className="w-full text-sm text-left whitespace-nowrap">
          <thead className="bg-[#F8FAFC] text-[#071D49]">
            <tr>
              <th className="px-4 py-3 font-bold">Date</th>
              <th className="px-4 py-3 font-bold">Lab</th>
              <th className="px-4 py-3 font-bold">Description</th>
              <th className="px-4 py-3 font-bold">Students Involved</th>
              <th className="px-4 py-3 font-bold">Severity</th>
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
                  <td className="px-4 py-3 text-[#64748B]">{row.date}</td>
                  <td className="px-4 py-3 text-[#64748B]">{row.lab}</td>
                  <td className="px-4 py-3 text-[#64748B]">{row.description}</td>
                  <td className="px-4 py-3 text-[#64748B]">{row.students_involved}</td>
                  <td className="px-4 py-3 text-[#64748B]">{row.severity}</td>
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
