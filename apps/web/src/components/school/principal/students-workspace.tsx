"use client";
import { GraduationCap } from "lucide-react";
import { Panel, StatusChip, Tone } from "./shared";
import { useSchoolQuery } from "@/lib/data/school-hooks";

type StudentsRecord = {
  id: string;
  admission_no: string;
  student_name: string;
  class: string;
  stream: string;
  guardian: string;
  phone: string;
  status: string;
};

type StudentsData = {
  metrics: {
    total_students: number;
    active: number;
    suspended: number;
    graduated: number;
  };
  studentsList: StudentsRecord[];
};

export function StudentsWorkspace() {
  const { data, isLoading } = useSchoolQuery<StudentsData>('/admin-command/principal/students');
  const items = data?.studentsList || [];

  const getStatusTone = (st: string): Tone => {
    if (st === "Active" || st === "Available" || st === "Approved" || st === "Completed" || st === "Resolved" || st === "Present" || st === "Functional" || st === "On Track" || st === "Cleared" || st === "Published" || st === "Admitted" || st === "Generated") return "success";
    if (st === "Pending" || st === "In Progress" || st === "Pending Approval" || st === "Scheduled" || st === "Draft" || st === "Behind" || st === "Warning" || st === "Pending Review" || st === "Not Started") return "warning";
    if (st === "Overdue" || st === "Critical" || st === "Rejected" || st === "Escalated" || st === "Expired" || st === "Damaged" || st === "Flagged" || st === "Absent" || st === "Suspended") return "danger";
    if (st === "Issued" || st === "Submitted" || st === "On Leave" || st === "Graduated" || st === "Downloaded") return "info";
    return "neutral";
  };

  return (
    <Panel title="Students" description="View and manage all students in the school." icon={GraduationCap}>
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
          <div className="text-sm font-semibold text-[#64748B]">Total Students</div>
          <div className="mt-1 text-lg font-black text-[#071D49]">{isLoading ? "..." : data?.metrics?.total_students ?? 0}</div>
        </div>
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
          <div className="text-sm font-semibold text-[#64748B]">Active</div>
          <div className="mt-1 text-lg font-black text-[#071D49]">{isLoading ? "..." : data?.metrics?.active ?? 0}</div>
        </div>
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
          <div className="text-sm font-semibold text-[#64748B]">Suspended</div>
          <div className="mt-1 text-lg font-black text-[#071D49]">{isLoading ? "..." : data?.metrics?.suspended ?? 0}</div>
        </div>
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
          <div className="text-sm font-semibold text-[#64748B]">Graduated</div>
          <div className="mt-1 text-lg font-black text-[#071D49]">{isLoading ? "..." : data?.metrics?.graduated ?? 0}</div>
        </div>
      </div>
      <div className="overflow-x-auto rounded-xl border border-[#D8E0EC]">
        <table className="w-full text-sm text-left whitespace-nowrap">
          <thead className="bg-[#F8FAFC] text-[#071D49]">
            <tr>
              <th className="px-4 py-3 font-bold">Admission No</th>
              <th className="px-4 py-3 font-bold">Student Name</th>
              <th className="px-4 py-3 font-bold">Class</th>
              <th className="px-4 py-3 font-bold">Stream</th>
              <th className="px-4 py-3 font-bold">Guardian</th>
              <th className="px-4 py-3 font-bold">Phone</th>
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
                  <td className="px-4 py-3 text-[#64748B]">{row.admission_no}</td>
                  <td className="px-4 py-3 text-[#64748B]">{row.student_name}</td>
                  <td className="px-4 py-3 text-[#64748B]">{row.class}</td>
                  <td className="px-4 py-3 text-[#64748B]">{row.stream}</td>
                  <td className="px-4 py-3 text-[#64748B]">{row.guardian}</td>
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
