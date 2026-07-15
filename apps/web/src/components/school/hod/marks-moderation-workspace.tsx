"use client";
import { CheckSquare } from "lucide-react";
import { fieldValue, listFromData, Panel, StatusChip, Tone } from "./shared";
import { useSchoolQuery } from "@/lib/data/school-hooks";

type MarksModerationRecord = {
  id?: string;
  exam?: string;
  subject?: string;
  class?: string;
  teacher?: string;
  mean_score?: number | string;
  highest?: number | string;
  lowest?: number | string;
  status?: string;
  [key: string]: unknown;
};

type MarksModerationData = {
  metrics: {
    pending_moderation: number;
    moderated: number;
    flagged: number;
  };
  marksmoderationList: MarksModerationRecord[];
};

export function MarksModerationWorkspace() {
  const { data, isLoading } = useSchoolQuery<MarksModerationData>('/admin-command/hod/marks-moderation');
  const items = listFromData<MarksModerationRecord>(data, "marksmoderationList");

  const getStatusTone = (st: string): Tone => {
    if (st === "Active" || st === "Available" || st === "Approved" || st === "Completed" || st === "Resolved" || st === "Present" || st === "Functional" || st === "On Track" || st === "Cleared") return "success";
    if (st === "Pending" || st === "In Progress" || st === "Pending Approval" || st === "Scheduled" || st === "On Loan" || st === "Behind" || st === "Departed" || st === "Warning" || st === "Pending Review") return "warning";
    if (st === "Overdue" || st === "Critical" || st === "Rejected" || st === "Escalated" || st === "Expired" || st === "Damaged" || st === "Flagged" || st === "Absent" || st === "Blacklisted" || st === "Disposed" || st === "Unauthorized") return "danger";
    if (st === "Issued" || st === "Checked In" || st === "Submitted" || st === "Booked" || st === "Sent" || st === "On Leave") return "info";
    return "neutral";
  };

  return (
    <Panel title="Marks Moderation" description="Moderate and verify exam marks for the department." icon={CheckSquare}>
      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
          <div className="text-sm font-semibold text-[#64748B]">Pending Moderation</div>
          <div className="mt-1 text-lg font-black text-[#071D49]">{isLoading ? "..." : data?.metrics?.pending_moderation ?? 0}</div>
        </div>
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
          <div className="text-sm font-semibold text-[#64748B]">Moderated</div>
          <div className="mt-1 text-lg font-black text-[#071D49]">{isLoading ? "..." : data?.metrics?.moderated ?? 0}</div>
        </div>
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
          <div className="text-sm font-semibold text-[#64748B]">Flagged</div>
          <div className="mt-1 text-lg font-black text-[#071D49]">{isLoading ? "..." : data?.metrics?.flagged ?? 0}</div>
        </div>
      </div>
      <div className="overflow-x-auto rounded-xl border border-[#D8E0EC]">
        <table className="w-full text-sm text-left whitespace-nowrap">
          <thead className="bg-[#F8FAFC] text-[#071D49]">
            <tr>
              <th className="px-4 py-3 font-bold">Exam</th>
              <th className="px-4 py-3 font-bold">Subject</th>
              <th className="px-4 py-3 font-bold">Class</th>
              <th className="px-4 py-3 font-bold">Teacher</th>
              <th className="px-4 py-3 font-bold">Mean Score</th>
              <th className="px-4 py-3 font-bold">Highest</th>
              <th className="px-4 py-3 font-bold">Lowest</th>
              <th className="px-4 py-3 font-bold">Status</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-[#64748B]">Loading...</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-[#64748B]">No marks awaiting moderation yet. Teacher mark submissions for department subjects will appear here.</td></tr>
            ) : (
              items.map((row, index) => (
                <tr key={row.id ?? `${fieldValue(row, ["exam", "exam_name"])}-${fieldValue(row, ["subject", "subject_name"])}-${index}`} className="border-t border-[#D8E0EC] hover:bg-[#F8FAFC]">
                  <td className="px-4 py-3 text-[#64748B]">{fieldValue(row, ["exam", "exam_name", "assessment"])}</td>
                  <td className="px-4 py-3 text-[#64748B]">{fieldValue(row, ["subject", "subject_name"])}</td>
                  <td className="px-4 py-3 text-[#64748B]">{fieldValue(row, ["class", "class_name", "class_section"])}</td>
                  <td className="px-4 py-3 text-[#64748B]">{fieldValue(row, ["teacher", "teacher_name"])}</td>
                  <td className="px-4 py-3 text-[#64748B]">{fieldValue(row, ["mean_score", "average_score"], "0")}</td>
                  <td className="px-4 py-3 text-[#64748B]">{fieldValue(row, ["highest", "highest_score"], "0")}</td>
                  <td className="px-4 py-3 text-[#64748B]">{fieldValue(row, ["lowest", "lowest_score"], "0")}</td>
                  <td className="px-4 py-3"><StatusChip label={fieldValue(row, ["status"], "Pending Moderation")} tone={getStatusTone(fieldValue(row, ["status"], "Pending Moderation"))} /></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
