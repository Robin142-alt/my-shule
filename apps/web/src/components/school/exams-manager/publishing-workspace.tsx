"use client";
import { useState } from "react";
import { Send } from "lucide-react";
import { toast } from "sonner";

import { Panel, StatusChip, Tone } from "./shared";
import { useSchoolQuery } from "@/lib/data/school-hooks";
import { publishResults, unpublishResults } from "./api-client";

type PublishingRecord = {
  id: string;
  exam_name: string;
  class: string;
  term: string;
  students: number;
  published_at: string;
  status: string;
};

type PublishingData = {
  metrics: {
    pending_publish: number;
    published: number;
    draft: number;
  };
  publishingList: PublishingRecord[];
};

export function PublishingWorkspace() {
  const { data, isLoading, refetch } = useSchoolQuery<PublishingData>('/admin-command/exams-manager/publishing');
  const [busyId, setBusyId] = useState<string | null>(null);
  const items = data?.publishingList || [];

  const getStatusTone = (st: string): Tone => {
    if (st === "Active" || st === "Available" || st === "Approved" || st === "Completed" || st === "Resolved" || st === "Present" || st === "Functional" || st === "On Track" || st === "Cleared" || st === "Published" || st === "Admitted" || st === "Generated") return "success";
    if (st === "Pending" || st === "In Progress" || st === "Pending Approval" || st === "Scheduled" || st === "Draft" || st === "Behind" || st === "Warning" || st === "Pending Review" || st === "Not Started") return "warning";
    if (st === "Overdue" || st === "Critical" || st === "Rejected" || st === "Escalated" || st === "Expired" || st === "Damaged" || st === "Flagged" || st === "Absent" || st === "Suspended") return "danger";
    if (st === "Issued" || st === "Submitted" || st === "On Leave" || st === "Graduated" || st === "Downloaded") return "info";
    return "neutral";
  };

  const changePublication = async (row: PublishingRecord) => {
    const published = row.status?.toLowerCase() === "published";
    setBusyId(row.id);
    try {
      if (published) {
        await unpublishResults(row.id);
        toast.success(`${row.exam_name} is no longer visible to parents.`);
      } else {
        await publishResults(row.id);
        toast.success(`${row.exam_name} is now visible to parents.`);
      }
      await refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update result visibility.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Panel
      title="Results Publishing"
      description="Publish moderated report-card batches to parent visibility only after approval. Fresh schools show no batches until real marks, moderation, and report-card generation are complete."
      icon={Send}
    >
      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
          <div className="text-sm font-semibold text-[#64748B]">Pending Publish</div>
          <div className="mt-1 text-lg font-black text-[#071D49]">{isLoading ? "..." : data?.metrics?.pending_publish ?? 0}</div>
        </div>
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
          <div className="text-sm font-semibold text-[#64748B]">Published</div>
          <div className="mt-1 text-lg font-black text-[#071D49]">{isLoading ? "..." : data?.metrics?.published ?? 0}</div>
        </div>
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
          <div className="text-sm font-semibold text-[#64748B]">Draft</div>
          <div className="mt-1 text-lg font-black text-[#071D49]">{isLoading ? "..." : data?.metrics?.draft ?? 0}</div>
        </div>
      </div>
      <div className="overflow-x-auto rounded-xl border border-[#D8E0EC]">
        <table className="w-full text-sm text-left whitespace-nowrap">
          <thead className="bg-[#F8FAFC] text-[#071D49]">
            <tr>
              <th className="px-4 py-3 font-bold">Exam Name</th>
              <th className="px-4 py-3 font-bold">Class</th>
              <th className="px-4 py-3 font-bold">Term</th>
              <th className="px-4 py-3 font-bold">Students</th>
              <th className="px-4 py-3 font-bold">Published At</th>
              <th className="px-4 py-3 font-bold">Status</th>
              <th className="px-4 py-3 text-right font-bold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-[#64748B]">Loading publishing queue...</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-[#64748B]">No result batch is ready to publish to parents. Publishable batches appear here only after moderation and report-card readiness checks pass.</td></tr>
            ) : (
              items.map(row => (
                <tr key={row.id} className="border-t border-[#D8E0EC] hover:bg-[#F8FAFC]">
                  <td className="px-4 py-3 text-[#64748B]">{row.exam_name}</td>
                  <td className="px-4 py-3 text-[#64748B]">{row.class}</td>
                  <td className="px-4 py-3 text-[#64748B]">{row.term}</td>
                  <td className="px-4 py-3 text-[#64748B]">{row.students}</td>
                  <td className="px-4 py-3 text-[#64748B]">{row.published_at}</td>
                  <td className="px-4 py-3"><StatusChip label={row.status} tone={getStatusTone(row.status)} /></td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => changePublication(row)}
                      disabled={busyId === row.id}
                      className="inline-flex items-center justify-center rounded-lg border border-[#D8E0EC] bg-white px-3 py-2 text-xs font-black text-[#071D49] hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {busyId === row.id
                        ? "Updating..."
                        : row.status?.toLowerCase() === "published"
                          ? "Unpublish from parents"
                          : "Publish to parents"}
                    </button>
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
