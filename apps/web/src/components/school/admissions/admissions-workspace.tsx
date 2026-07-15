"use client";
import { useState } from "react";
import { FileText, UserPlus } from "lucide-react";
import { Panel, StatusChip, Tone } from "./shared";
import { useSchoolQuery } from "@/lib/data/school-hooks";
import { toast } from "sonner";
import { admitStudent, generateAdmissionLetter } from "./api-client";

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
  const { data, isLoading, refetch } = useSchoolQuery<AdmissionsData>('/admin-command/admissions/admissions');
  const [actioningId, setActioningId] = useState<string | null>(null);
  const items = data?.admissionsList || [];

  const getStatusTone = (st: string): Tone => {
    if (st === "Active" || st === "Available" || st === "Approved" || st === "Completed" || st === "Resolved" || st === "Present" || st === "Functional" || st === "On Track" || st === "Cleared" || st === "Published" || st === "Admitted" || st === "Generated") return "success";
    if (st === "Pending" || st === "In Progress" || st === "Pending Approval" || st === "Scheduled" || st === "Draft" || st === "Behind" || st === "Warning" || st === "Pending Review" || st === "Not Started") return "warning";
    if (st === "Overdue" || st === "Critical" || st === "Rejected" || st === "Escalated" || st === "Expired" || st === "Damaged" || st === "Flagged" || st === "Absent" || st === "Suspended") return "danger";
    if (st === "Issued" || st === "Submitted" || st === "On Leave" || st === "Graduated" || st === "Downloaded") return "info";
    return "neutral";
  };

  const handleAdmit = async (id: string) => {
    setActioningId(id);
    try {
      await admitStudent(id);
      toast.success("Applicant admitted successfully.");
      refetch();
    } catch {
      toast.error("Failed to admit applicant.");
    } finally {
      setActioningId(null);
    }
  };

  const handleGenerateLetter = async (id: string) => {
    setActioningId(id);
    try {
      await generateAdmissionLetter(id);
      toast.success("Admission letter generated.");
      refetch();
    } catch {
      toast.error("Failed to generate admission letter.");
    } finally {
      setActioningId(null);
    }
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
              <th className="px-4 py-3 font-bold text-right">Actions</th>
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
                  <td className="px-4 py-3 text-[#64748B]">{row.student_name}</td>
                  <td className="px-4 py-3 text-[#64748B]">{row.application_date}</td>
                  <td className="px-4 py-3 text-[#64748B]">{row.class_applied}</td>
                  <td className="px-4 py-3 text-[#64748B]">{row.parent_name}</td>
                  <td className="px-4 py-3 text-[#64748B]">{row.phone}</td>
                  <td className="px-4 py-3"><StatusChip label={row.status} tone={getStatusTone(row.status)} /></td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {row.status?.toLowerCase() === "approved" && (
                        <button disabled={actioningId === row.id} onClick={() => handleAdmit(row.id)}
                          className="text-emerald-600 hover:underline text-xs font-semibold inline-flex items-center gap-1 disabled:opacity-50"><UserPlus className="w-3 h-3" /> Admit</button>
                      )}
                      {["approved", "admitted", "registered"].includes(row.status?.toLowerCase()) && (
                        <button disabled={actioningId === row.id} onClick={() => handleGenerateLetter(row.id)}
                          className="text-blue-600 hover:underline text-xs font-semibold inline-flex items-center gap-1 disabled:opacity-50"><FileText className="w-3 h-3" /> Letter</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
