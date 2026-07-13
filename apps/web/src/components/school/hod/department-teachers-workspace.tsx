"use client";
import { useState } from "react";
import { Users } from "lucide-react";
import { toast } from "sonner";

import { requestDashboardApi } from "@/lib/dashboard/api-client";
import { useSchoolQuery } from "@/lib/data/school-hooks";
import { fieldValue, listFromData, Panel, StatusChip, Tone } from "./shared";

type DepartmentTeachersRecord = {
  id?: string;
  teacher_name?: string;
  subjects?: string;
  subject?: string;
  subject_id?: string;
  class?: string;
  classes?: string;
  class_section_id?: string;
  lessons_per_week?: number | string;
  status?: string;
  [key: string]: unknown;
};

type DepartmentTeachersData = {
  metrics: {
    total_teachers: number;
    active: number;
    on_leave: number;
  };
  departmentteachersList: DepartmentTeachersRecord[];
};

export function DepartmentTeachersWorkspace() {
  const { data, isLoading } = useSchoolQuery<DepartmentTeachersData>('/admin-command/hod/department-teachers');
  const items = listFromData<DepartmentTeachersRecord>(data, "departmentteachersList");
  const [reviewingRosterId, setReviewingRosterId] = useState<string | null>(null);

  const getStatusTone = (st: string): Tone => {
    if (st === "Active" || st === "Available" || st === "Approved" || st === "Completed" || st === "Resolved" || st === "Present" || st === "Functional" || st === "On Track" || st === "Cleared") return "success";
    if (st === "Pending" || st === "In Progress" || st === "Pending Approval" || st === "Scheduled" || st === "On Loan" || st === "Behind" || st === "Departed" || st === "Warning" || st === "Pending Review") return "warning";
    if (st === "Overdue" || st === "Critical" || st === "Rejected" || st === "Escalated" || st === "Expired" || st === "Damaged" || st === "Flagged" || st === "Absent" || st === "Blacklisted" || st === "Disposed" || st === "Unauthorized") return "danger";
    if (st === "Issued" || st === "Checked In" || st === "Submitted" || st === "Booked" || st === "Sent" || st === "On Leave") return "info";
    return "neutral";
  };

  async function handleRecordRosterReview(teacher: DepartmentTeachersRecord, index: number) {
    const teacherKey = String(teacher.id ?? `${fieldValue(teacher, ["teacher_name", "name"], "teacher")}-${index}`);

    if (reviewingRosterId) return;

    setReviewingRosterId(teacherKey);
    try {
      await requestDashboardApi("/admin-command/hod/roster-review", {
        method: "POST",
        body: {
          assignment_id: teacher.id ?? null,
          subject_id: teacher.subject_id ?? null,
          subject_name: fieldValue(teacher, ["subject", "subjects"], "Department subject"),
          class_section_id: teacher.class_section_id ?? null,
          class_name: fieldValue(teacher, ["class", "classes"], "Assigned classes"),
          title: "Class roster review requested",
          sourceWorkspace: "department-teachers",
        },
      });

      toast.success("Roster review request routed to department workflow.");
    } catch (err: any) {
      toast.error(err.message || "Roster review request could not be routed.");
    } finally {
      setReviewingRosterId(null);
    }
  }

  return (
    <Panel title="Department Teachers" description="View and manage teachers in the department." icon={Users}>
      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
          <div className="text-sm font-semibold text-[#64748B]">Total Teachers</div>
          <div className="mt-1 text-lg font-black text-[#071D49]">{isLoading ? "..." : data?.metrics?.total_teachers ?? 0}</div>
        </div>
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
          <div className="text-sm font-semibold text-[#64748B]">Active</div>
          <div className="mt-1 text-lg font-black text-[#071D49]">{isLoading ? "..." : data?.metrics?.active ?? 0}</div>
        </div>
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
          <div className="text-sm font-semibold text-[#64748B]">On Leave</div>
          <div className="mt-1 text-lg font-black text-[#071D49]">{isLoading ? "..." : data?.metrics?.on_leave ?? 0}</div>
        </div>
      </div>
      <div className="overflow-x-auto rounded-xl border border-[#D8E0EC]">
        <table className="w-full text-sm text-left whitespace-nowrap">
          <thead className="bg-[#F8FAFC] text-[#071D49]">
            <tr>
              <th className="px-4 py-3 font-bold">Teacher Name</th>
              <th className="px-4 py-3 font-bold">Subjects</th>
              <th className="px-4 py-3 font-bold">Classes</th>
              <th className="px-4 py-3 font-bold">Lessons Per Week</th>
              <th className="px-4 py-3 font-bold">Status</th>
              <th className="px-4 py-3 font-bold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-[#64748B]">Loading...</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-[#64748B]">No department teachers found yet. Add staff or assign teachers before requesting roster reviews.</td></tr>
            ) : (
              items.map((row, index) => (
                <tr key={row.id ?? `${fieldValue(row, ["teacher_name", "name"])}-${index}`} className="border-t border-[#D8E0EC] hover:bg-[#F8FAFC]">
                  <td className="px-4 py-3 text-[#64748B]">{fieldValue(row, ["teacher_name", "name", "full_name"])}</td>
                  <td className="px-4 py-3 text-[#64748B]">{fieldValue(row, ["subjects", "subject", "subject_name"])}</td>
                  <td className="px-4 py-3 text-[#64748B]">{fieldValue(row, ["classes", "class", "class_name"])}</td>
                  <td className="px-4 py-3 text-[#64748B]">{fieldValue(row, ["lessons_per_week", "weekly_lessons"], "0")}</td>
                  <td className="px-4 py-3"><StatusChip label={fieldValue(row, ["status"], "Active")} tone={getStatusTone(fieldValue(row, ["status"], "Active"))} /></td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => handleRecordRosterReview(row, index)}
                      disabled={!!reviewingRosterId}
                      className="rounded-lg border border-[#BFDBFE] bg-[#EEF5FF] px-3 py-1.5 text-xs font-black text-[#0B63CE] disabled:opacity-50"
                    >
                      {reviewingRosterId === String(row.id ?? `${fieldValue(row, ["teacher_name", "name"], "teacher")}-${index}`) ? "Routing..." : "Request roster review"}
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
