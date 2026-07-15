"use client";
import { BookMarked } from "lucide-react";
import { fieldValue, listFromData, Panel, StatusChip, Tone } from "./shared";
import { useSchoolQuery } from "@/lib/data/school-hooks";

type LessonPlansRecord = {
  id?: string;
  teacher?: string;
  subject?: string;
  class?: string;
  term?: string;
  week?: string;
  topic?: string;
  status?: string;
  [key: string]: unknown;
};

type LessonPlansData = {
  metrics: {
    submitted: number;
    pending_review: number;
    approved: number;
  };
  lessonplansList: LessonPlansRecord[];
};

export function LessonPlansWorkspace() {
  const { data, isLoading } = useSchoolQuery<LessonPlansData>('/admin-command/hod/lesson-plans');
  const items = listFromData<LessonPlansRecord>(data, "lessonplansList");

  const getStatusTone = (st: string): Tone => {
    if (st === "Active" || st === "Available" || st === "Approved" || st === "Completed" || st === "Resolved" || st === "Present" || st === "Functional" || st === "On Track" || st === "Cleared") return "success";
    if (st === "Pending" || st === "In Progress" || st === "Pending Approval" || st === "Scheduled" || st === "On Loan" || st === "Behind" || st === "Departed" || st === "Warning" || st === "Pending Review") return "warning";
    if (st === "Overdue" || st === "Critical" || st === "Rejected" || st === "Escalated" || st === "Expired" || st === "Damaged" || st === "Flagged" || st === "Absent" || st === "Blacklisted" || st === "Disposed" || st === "Unauthorized") return "danger";
    if (st === "Issued" || st === "Checked In" || st === "Submitted" || st === "Booked" || st === "Sent" || st === "On Leave") return "info";
    return "neutral";
  };

  return (
    <Panel title="Lesson Plans Review" description="Review and approve lesson plans from department teachers." icon={BookMarked}>
      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
          <div className="text-sm font-semibold text-[#64748B]">Submitted</div>
          <div className="mt-1 text-lg font-black text-[#071D49]">{isLoading ? "..." : data?.metrics?.submitted ?? 0}</div>
        </div>
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
          <div className="text-sm font-semibold text-[#64748B]">Pending Review</div>
          <div className="mt-1 text-lg font-black text-[#071D49]">{isLoading ? "..." : data?.metrics?.pending_review ?? 0}</div>
        </div>
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
          <div className="text-sm font-semibold text-[#64748B]">Approved</div>
          <div className="mt-1 text-lg font-black text-[#071D49]">{isLoading ? "..." : data?.metrics?.approved ?? 0}</div>
        </div>
      </div>
      <div className="overflow-x-auto rounded-xl border border-[#D8E0EC]">
        <table className="w-full text-sm text-left whitespace-nowrap">
          <thead className="bg-[#F8FAFC] text-[#071D49]">
            <tr>
              <th className="px-4 py-3 font-bold">Teacher</th>
              <th className="px-4 py-3 font-bold">Subject</th>
              <th className="px-4 py-3 font-bold">Class</th>
              <th className="px-4 py-3 font-bold">Term</th>
              <th className="px-4 py-3 font-bold">Week</th>
              <th className="px-4 py-3 font-bold">Topic</th>
              <th className="px-4 py-3 font-bold">Status</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-[#64748B]">Loading...</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-[#64748B]">No lesson plans yet. Ask department teachers to submit plans before review.</td></tr>
            ) : (
              items.map((row, index) => (
                <tr key={row.id ?? `${fieldValue(row, ["teacher", "teacher_name"])}-${fieldValue(row, ["topic", "title"])}-${index}`} className="border-t border-[#D8E0EC] hover:bg-[#F8FAFC]">
                  <td className="px-4 py-3 text-[#64748B]">{fieldValue(row, ["teacher", "teacher_name"])}</td>
                  <td className="px-4 py-3 text-[#64748B]">{fieldValue(row, ["subject", "subject_name"])}</td>
                  <td className="px-4 py-3 text-[#64748B]">{fieldValue(row, ["class", "class_name"])}</td>
                  <td className="px-4 py-3 text-[#64748B]">{fieldValue(row, ["term", "academic_term"])}</td>
                  <td className="px-4 py-3 text-[#64748B]">{fieldValue(row, ["week", "week_number"])}</td>
                  <td className="px-4 py-3 text-[#64748B]">{fieldValue(row, ["topic", "title"])}</td>
                  <td className="px-4 py-3"><StatusChip label={fieldValue(row, ["status"], "Pending Review")} tone={getStatusTone(fieldValue(row, ["status"], "Pending Review"))} /></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
