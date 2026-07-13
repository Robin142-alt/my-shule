"use client";
import { useState, type FormEvent } from "react";
import { FileText } from "lucide-react";
import { toast } from "sonner";

import { requestDashboardApi } from "@/lib/dashboard/api-client";
import { useSchoolQuery } from "@/lib/data/school-hooks";
import { fieldValue, listFromData, metricFromData, Panel, StatusChip, Tone } from "./shared";

type ReportsRecord = {
  id?: string;
  title?: string;
  generated_at?: string;
  created_at?: string;
  type?: string;
  format?: string;
  status?: string;
  [key: string]: unknown;
};

type ReportsData = {
  metrics: {
    reports_generated: number;
  };
  reportsList: ReportsRecord[];
};

export function ReportsWorkspace() {
  const { data, isLoading, refetch } = useSchoolQuery<ReportsData | ReportsRecord[]>('/admin-command/hod/reports');
  const items = listFromData<ReportsRecord>(data, "reportsList");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoggingMeeting, setIsLoggingMeeting] = useState(false);

  const getStatusTone = (st: string): Tone => {
    if (st === "Active" || st === "Available" || st === "Approved" || st === "Completed" || st === "Resolved" || st === "Present" || st === "Functional" || st === "On Track" || st === "Cleared") return "success";
    if (st === "Pending" || st === "In Progress" || st === "Pending Approval" || st === "Scheduled" || st === "On Loan" || st === "Behind" || st === "Departed" || st === "Warning" || st === "Pending Review") return "warning";
    if (st === "Overdue" || st === "Critical" || st === "Rejected" || st === "Escalated" || st === "Expired" || st === "Damaged" || st === "Flagged" || st === "Absent" || st === "Blacklisted" || st === "Disposed" || st === "Unauthorized") return "danger";
    if (st === "Issued" || st === "Checked In" || st === "Submitted" || st === "Booked" || st === "Sent" || st === "On Leave") return "info";
    return "neutral";
  };

  async function handleGenerateReport() {
    if (isGenerating) return;

    setIsGenerating(true);
    try {
      await requestDashboardApi("/admin-command/hod/reports/generate", {
        method: "POST",
        body: { title: "HOD department operations report", format: "pdf" },
      });

      toast.success("Department report request submitted for generation and review.");
      await refetch();
    } catch (err: any) {
      toast.error(err.message || "Department report could not be generated.");
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleLogDepartmentMeeting(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isLoggingMeeting) return;

    const meetingPayload = Object.fromEntries(new FormData(event.currentTarget).entries());
    const meetingTitle = String(meetingPayload.meetingTitle || "").trim();
    const scheduledAt = String(meetingPayload.scheduledAt || "").trim();
    const summary = String(meetingPayload.summary || "").trim();

    if (!meetingTitle || !scheduledAt || !summary) {
      toast.error("Meeting title, schedule, and summary are required.");
      return;
    }

    setIsLoggingMeeting(true);
    try {
      await requestDashboardApi("/admin-command/hod/department-meetings", {
        method: "POST",
        body: {
          action: "log_meeting",
          meetingTitle,
          scheduledAt,
          summary,
          attendees: String(meetingPayload.attendees || "").trim() || undefined,
        },
      });

      toast.success("Meeting logged and routed to the department workflow.");
      event.currentTarget.reset();
    } catch (err: any) {
      toast.error(err.message || "Department meeting could not be logged.");
    } finally {
      setIsLoggingMeeting(false);
    }
  }

  return (
    <Panel
      title="Department Reports"
      description="Generate and download department reports."
      icon={FileText}
      actions={
        <button type="button" onClick={handleGenerateReport} disabled={isGenerating} className="rounded-xl bg-[#071D49] px-4 py-2 text-sm font-black text-white disabled:opacity-50">
          {isGenerating ? "Generating..." : "Generate report"}
        </button>
      }
    >
      <form onSubmit={handleLogDepartmentMeeting} className="mb-6 grid gap-3 rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4 md:grid-cols-2">
        <label className="text-sm font-bold text-[#071D49]">
          Meeting title
          <input name="meetingTitle" required className="mt-1 w-full rounded-xl border border-[#C7D4E6] bg-white px-3 py-2 font-semibold outline-none focus:border-[#0B63CE]" placeholder="Department moderation meeting" />
        </label>
        <label className="text-sm font-bold text-[#071D49]">
          Scheduled at
          <input name="scheduledAt" required type="datetime-local" className="mt-1 w-full rounded-xl border border-[#C7D4E6] bg-white px-3 py-2 font-semibold outline-none focus:border-[#0B63CE]" />
        </label>
        <label className="text-sm font-bold text-[#071D49] md:col-span-2">
          Summary
          <textarea name="summary" required rows={3} className="mt-1 w-full rounded-xl border border-[#C7D4E6] bg-white px-3 py-2 font-semibold outline-none focus:border-[#0B63CE]" placeholder="Agenda, decisions, and follow-up actions" />
        </label>
        <label className="text-sm font-bold text-[#071D49]">
          Attendees
          <input name="attendees" className="mt-1 w-full rounded-xl border border-[#C7D4E6] bg-white px-3 py-2 font-semibold outline-none focus:border-[#0B63CE]" placeholder="Teacher names or staff IDs" />
        </label>
        <div className="flex items-end">
          <button type="submit" disabled={isLoggingMeeting} className="w-full rounded-xl border border-[#0B63CE] bg-[#EEF5FF] px-4 py-2.5 text-sm font-black text-[#0B63CE] disabled:opacity-50">
            {isLoggingMeeting ? "Logging..." : "Log department meeting"}
          </button>
        </div>
      </form>
      <div className="grid gap-4 md:grid-cols-1 mb-6">
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
          <div className="text-sm font-semibold text-[#64748B]">Reports Generated</div>
          <div className="mt-1 text-lg font-black text-[#071D49]">{isLoading ? "..." : metricFromData(data, "reports_generated", items.length)}</div>
        </div>
      </div>
      <div className="overflow-x-auto rounded-xl border border-[#D8E0EC]">
        <table className="w-full text-sm text-left whitespace-nowrap">
          <thead className="bg-[#F8FAFC] text-[#071D49]">
            <tr>
              <th className="px-4 py-3 font-bold">Title</th>
              <th className="px-4 py-3 font-bold">Generated At</th>
              <th className="px-4 py-3 font-bold">Type</th>
              <th className="px-4 py-3 font-bold">Status</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-[#64748B]">Loading...</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-[#64748B]">No records found. Create the first entry to get started.</td></tr>
            ) : (
              items.map(row => (
                <tr key={row.id} className="border-t border-[#D8E0EC] hover:bg-[#F8FAFC]">
                  <td className="px-4 py-3 text-[#64748B]">{fieldValue(row, ["title", "name"])}</td>
                  <td className="px-4 py-3 text-[#64748B]">{fieldValue(row, ["generated_at", "created_at"])}</td>
                  <td className="px-4 py-3 text-[#64748B]">{fieldValue(row, ["type", "format"], "pdf")}</td>
                  <td className="px-4 py-3"><StatusChip label={fieldValue(row, ["status"], "Generated")} tone={getStatusTone(fieldValue(row, ["status"], "Generated"))} /></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
