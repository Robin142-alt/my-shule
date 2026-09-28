"use client";
import { BookOpen } from "lucide-react";
import { fieldValue, listFromData, Panel, StatusChip, Tone } from "./shared";
import { useSchoolQuery } from "@/lib/data/school-hooks";

type CoverageReviewRecord = {
  id?: string;
  subject?: string;
  class?: string;
  teacher?: string;
  coverage_percent?: number | string;
  target_percent?: number | string;
  status?: string;
  [key: string]: unknown;
};

type CoverageReviewData = {
  metrics: {
    on_track: number;
    behind_schedule: number;
    completed: number;
  };
  coveragereviewList: CoverageReviewRecord[];
};

export function CoverageReviewWorkspace() {
  const { data, isLoading } = useSchoolQuery<CoverageReviewData>('/admin-command/hod/coverage-review');
  const items = listFromData<CoverageReviewRecord>(data, "coveragereviewList");

  const getStatusTone = (st: string): Tone => {
    if (st === "Active" || st === "Available" || st === "Approved" || st === "Completed" || st === "Resolved" || st === "Present" || st === "Functional" || st === "On Track" || st === "Cleared") return "success";
    if (st === "Pending" || st === "In Progress" || st === "Pending Approval" || st === "Scheduled" || st === "On Loan" || st === "Behind" || st === "Departed" || st === "Warning" || st === "Pending Review") return "warning";
    if (st === "Overdue" || st === "Critical" || st === "Rejected" || st === "Escalated" || st === "Expired" || st === "Damaged" || st === "Flagged" || st === "Absent" || st === "Blacklisted" || st === "Disposed" || st === "Unauthorized") return "danger";
    if (st === "Issued" || st === "Checked In" || st === "Submitted" || st === "Booked" || st === "Sent" || st === "On Leave") return "info";
    return "neutral";
  };

  return (
    <Panel title="Coverage Review" description="Review syllabus coverage for the department." icon={BookOpen}>
      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <div className="rounded-xl border border-border bg-surface-muted p-4">
          <div className="text-sm font-semibold text-muted">On Track</div>
          <div className="mt-1 text-lg font-black text-foreground">{isLoading ? "..." : data?.metrics?.on_track ?? 0}</div>
        </div>
        <div className="rounded-xl border border-border bg-surface-muted p-4">
          <div className="text-sm font-semibold text-muted">Behind Schedule</div>
          <div className="mt-1 text-lg font-black text-foreground">{isLoading ? "..." : data?.metrics?.behind_schedule ?? 0}</div>
        </div>
        <div className="rounded-xl border border-border bg-surface-muted p-4">
          <div className="text-sm font-semibold text-muted">Completed</div>
          <div className="mt-1 text-lg font-black text-foreground">{isLoading ? "..." : data?.metrics?.completed ?? 0}</div>
        </div>
      </div>
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm text-left whitespace-nowrap">
          <thead className="bg-surface-muted text-foreground">
            <tr>
              <th className="px-4 py-3 font-bold">Subject</th>
              <th className="px-4 py-3 font-bold">Class</th>
              <th className="px-4 py-3 font-bold">Teacher</th>
              <th className="px-4 py-3 font-bold">Coverage Percent</th>
              <th className="px-4 py-3 font-bold">Target Percent</th>
              <th className="px-4 py-3 font-bold">Status</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-muted">Loading...</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-muted">No coverage submissions yet. Teacher lesson logs for this department will appear here for review.</td></tr>
            ) : (
              items.map((row, index) => (
                <tr key={row.id ?? `${fieldValue(row, ["subject", "subject_name"])}-${fieldValue(row, ["class", "class_name"])}-${index}`} className="border-t border-border hover:bg-surface-muted">
                  <td className="px-4 py-3 text-muted">{fieldValue(row, ["subject", "subject_name"])}</td>
                  <td className="px-4 py-3 text-muted">{fieldValue(row, ["class", "class_name"])}</td>
                  <td className="px-4 py-3 text-muted">{fieldValue(row, ["teacher", "teacher_name"])}</td>
                  <td className="px-4 py-3 text-muted">{fieldValue(row, ["coverage_percent", "coverage"], "0")}</td>
                  <td className="px-4 py-3 text-muted">{fieldValue(row, ["target_percent", "target"], "0")}</td>
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
