"use client";
import { UserPlus } from "lucide-react";
import { Panel, StatusChip, Tone } from "./shared";
import { useSchoolQuery } from "@/lib/data/school-hooks";

type AdmissionsRecord = {
  id: string;
  student_name: string;
  application_date: string;
  class_applied: string;
  parent_name: string;
  phone: string;
  status: string;
};

type AdmissionsData = {
  metrics: {
    total_applicants: number;
    admitted: number;
    pending: number;
    rejected: number;
  };
  admissionsList: AdmissionsRecord[];
};

export function AdmissionsWorkspace() {
  const { data, isLoading } = useSchoolQuery<AdmissionsData>('/admin-command/admissions/admissions');
  const items = data?.admissionsList || [];

  const getStatusTone = (st: string): Tone => {
    if (st === "Active" || st === "Available" || st === "Approved" || st === "Completed" || st === "Resolved" || st === "Present" || st === "Functional" || st === "On Track" || st === "Cleared" || st === "Published" || st === "Admitted" || st === "Generated") return "success";
    if (st === "Pending" || st === "In Progress" || st === "Pending Approval" || st === "Scheduled" || st === "Draft" || st === "Behind" || st === "Warning" || st === "Pending Review" || st === "Not Started") return "warning";
    if (st === "Overdue" || st === "Critical" || st === "Rejected" || st === "Escalated" || st === "Expired" || st === "Damaged" || st === "Flagged" || st === "Absent" || st === "Suspended") return "danger";
    if (st === "Issued" || st === "Submitted" || st === "On Leave" || st === "Graduated" || st === "Downloaded") return "info";
    return "neutral";
  };

  return (
    <Panel title="Admissions Management" description="Manage the full student admissions lifecycle." icon={UserPlus}>
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
          <div className="text-sm font-semibold text-[#64748B]">Total Applicants</div>
          <div className="mt-1 text-lg font-black text-[#071D49]">{isLoading ? "..." : data?.metrics?.total_applicants ?? 0}</div>
        </div>
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
          <div className="text-sm font-semibold text-[#64748B]">Admitted</div>
          <div className="mt-1 text-lg font-black text-[#071D49]">{isLoading ? "..." : data?.metrics?.admitted ?? 0}</div>
        </div>
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
          <div className="text-sm font-semibold text-[#64748B]">Pending</div>
          <div className="mt-1 text-lg font-black text-[#071D49]">{isLoading ? "..." : data?.metrics?.pending ?? 0}</div>
        </div>
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
          <div className="text-sm font-semibold text-[#64748B]">Rejected</div>
          <div className="mt-1 text-lg font-black text-[#071D49]">{isLoading ? "..." : data?.metrics?.rejected ?? 0}</div>
        </div>
      </div>
      <div className="overflow-x-auto rounded-xl border border-[#D8E0EC]">
        <table className="w-full text-sm text-left whitespace-nowrap">
          <thead className="bg-[#F8FAFC] text-[#071D49]">
            <tr>
              <th className="px-4 py-3 font-bold">Student Name</th>
              <th className="px-4 py-3 font-bold">Application Date</th>
              <th className="px-4 py-3 font-bold">Class Applied</th>
              <th className="px-4 py-3 font-bold">Parent Name</th>
              <th className="px-4 py-3 font-bold">Phone</th>
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
                  <td className="px-4 py-3 text-[#64748B]">{row.application_date}</td>
                  <td className="px-4 py-3 text-[#64748B]">{row.class_applied}</td>
                  <td className="px-4 py-3 text-[#64748B]">{row.parent_name}</td>
                  <td className="px-4 py-3 text-[#64748B]">{row.phone}</td>
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
