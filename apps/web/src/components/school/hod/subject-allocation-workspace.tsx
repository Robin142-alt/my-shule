"use client";
import { useState, type FormEvent } from "react";
import { LayoutGrid } from "lucide-react";
import { toast } from "sonner";

import { requestDashboardApi } from "@/lib/dashboard/api-client";
import { useSchoolQuery } from "@/lib/data/school-hooks";
import { fieldValue, listFromData, metricFromData, Panel, StatusChip, Tone } from "./shared";

type SubjectAllocationRecord = {
  id?: string;
  subject?: string;
  subject_id?: string;
  subjectId?: string;
  class?: string;
  class_section_id?: string;
  classSectionId?: string;
  teacher?: string;
  teacher_id?: string;
  teacherId?: string;
  staff_member_id?: string;
  lessons_per_week?: number | string;
  status?: string;
  [key: string]: unknown;
};

type SubjectAllocationData = {
  metrics: {
    allocated: number;
    unallocated: number;
    total_slots: number;
  };
  subjectallocationList: SubjectAllocationRecord[];
};

type SubjectAllocationOption = {
  id: string;
  label: string;
  user_id?: string | null;
  code?: string | null;
  grade_level?: string | null;
  stream?: string | null;
  status?: string | null;
};

type SubjectAllocationOptionsData = {
  teachers: SubjectAllocationOption[];
  subjects: SubjectAllocationOption[];
  classes: SubjectAllocationOption[];
  streams: Array<SubjectAllocationOption & {class_section_id: string}>;
};

export function SubjectAllocationWorkspace() {
  const { data, isLoading, refetch } = useSchoolQuery<SubjectAllocationData | SubjectAllocationRecord[]>('/admin-command/hod/subject-allocation');
  const { data: optionsData, isLoading: optionsLoading } = useSchoolQuery<SubjectAllocationOptionsData>('/admin-command/hod/subject-allocation/options');
  const items = listFromData<SubjectAllocationRecord>(data, "subjectallocationList");
  const teachers = optionsData?.teachers ?? [];
  const subjects = optionsData?.subjects ?? [];
  const classes = optionsData?.classes ?? [];
  const [classId,setClassId] = useState("");
  const streams = (optionsData?.streams ?? []).filter(stream=>stream.class_section_id===classId);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const getStatusTone = (st: string): Tone => {
    if (st === "Active" || st === "Available" || st === "Approved" || st === "Completed" || st === "Resolved" || st === "Present" || st === "Functional" || st === "On Track" || st === "Cleared") return "success";
    if (st === "Pending" || st === "In Progress" || st === "Pending Approval" || st === "Scheduled" || st === "On Loan" || st === "Behind" || st === "Departed" || st === "Warning" || st === "Pending Review") return "warning";
    if (st === "Overdue" || st === "Critical" || st === "Rejected" || st === "Escalated" || st === "Expired" || st === "Damaged" || st === "Flagged" || st === "Absent" || st === "Blacklisted" || st === "Disposed" || st === "Unauthorized") return "danger";
    if (st === "Issued" || st === "Checked In" || st === "Submitted" || st === "Booked" || st === "Sent" || st === "On Leave") return "info";
    return "neutral";
  };

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    const form = event.currentTarget;
    const allocationPayload = Object.fromEntries(new FormData(form).entries());
    const teacherId = String(allocationPayload.teacher_id || "").trim();
    const subjectId = String(allocationPayload.subject_id || "").trim();
    const classSectionId = String(allocationPayload.class_section_id || "").trim();

    if (!subjectId || !classSectionId) {
      toast.error("Subject and class are required before assigning continuing teaching duties.");
      return;
    }

    setIsSubmitting(true);
    try {
      await requestDashboardApi("/admin-command/hod/subject-allocation", {
        method: "POST",
        body: {
          action: "allocate_subject",
          title: "Subject allocation updated",
          teacher_id: teacherId || undefined,
          subject_id: subjectId,
          class_section_id: classSectionId,
          stream_id: String(allocationPayload.stream_id || "").trim() || undefined,
          lessons_per_week: String(allocationPayload.lessons_per_week || "").trim() || undefined,
          notes: String(allocationPayload.notes || "").trim() || undefined,
        },
      });

      toast.success("Subject allocation saved and routed to the department workflow.");
      form.reset();
      setClassId("");
      await refetch();
    } catch (err: any) {
      toast.error(err.message || "Subject allocation could not be saved.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRevokeSubjectAllocation(assignment: SubjectAllocationRecord) {
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      await requestDashboardApi("/admin-command/hod/subject-allocation/revoke", {
        method: "POST",
        body: {
          title: "Subject allocation revoke requested",
          reason: "HOD requested subject allocation revocation for department review.",
          assignment_id: assignment.id ?? null,
          subject_id: assignment.subject_id ?? assignment.subjectId ?? null,
          teacher_id: assignment.teacher_id ?? assignment.teacherId ?? assignment.staff_member_id ?? null,
          class_section_id: assignment.class_section_id ?? assignment.classSectionId ?? null,
        },
      });

      toast.success("Subject allocation revoke request routed for academic review.");
      await refetch();
    } catch (err: any) {
      toast.error(err.message || "Subject allocation revoke request could not be sent.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Panel title="Subject Allocation" description="Allocate subjects and classes to department teachers." icon={LayoutGrid}>
      <form onSubmit={handleSubmit} className="mb-6 grid gap-3 rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4 md:grid-cols-2 xl:grid-cols-4">
        <label className="text-sm font-bold text-[#071D49]">
          Teacher
          <select name="teacher_id" disabled={optionsLoading} className="mt-1 w-full rounded-xl border border-[#C7D4E6] bg-white px-3 py-2 font-semibold outline-none focus:border-[#0B63CE] disabled:bg-white/70 disabled:text-[#94A3B8]">
            <option value="">{optionsLoading ? "Loading teachers..." : "Leave unassigned for now"}</option>
            {teachers.map((teacher) => (
              <option key={teacher.id} value={teacher.id}>
                {teacher.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-bold text-[#071D49]">
          Subject
          <select name="subject_id" required disabled={optionsLoading || subjects.length === 0} className="mt-1 w-full rounded-xl border border-[#C7D4E6] bg-white px-3 py-2 font-semibold outline-none focus:border-[#0B63CE] disabled:bg-white/70 disabled:text-[#94A3B8]">
            <option value="">{optionsLoading ? "Loading subjects..." : "Select subject"}</option>
            {subjects.map((subject) => (
              <option key={subject.id} value={subject.id}>
                {subject.code ? `${subject.label} (${subject.code})` : subject.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-bold text-[#071D49]">
          Class section
          <select name="class_section_id" required value={classId} onChange={event=>setClassId(event.target.value)} disabled={optionsLoading || classes.length === 0} className="mt-1 w-full rounded-xl border border-[#C7D4E6] bg-white px-3 py-2 font-semibold outline-none focus:border-[#0B63CE] disabled:bg-white/70 disabled:text-[#94A3B8]">
            <option value="">{optionsLoading ? "Loading classes..." : "Select class section"}</option>
            {classes.map((classSection) => (
              <option key={classSection.id} value={classSection.id}>
                {classSection.label}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm font-bold text-[#071D49]">
          Lessons per week
          <input name="lessons_per_week" type="number" min="1" className="mt-1 w-full rounded-xl border border-[#C7D4E6] bg-white px-3 py-2 font-semibold outline-none focus:border-[#0B63CE]" placeholder="5" />
        </label>
        <label className="text-sm font-bold text-[#071D49]">Stream
          <select key={classId} name="stream_id" className="mt-1 w-full rounded-xl border border-[#C7D4E6] bg-white px-3 py-2">
            <option value="">{streams.length ? "All current streams" : "No stream required"}</option>
            {streams.map(stream=><option key={stream.id} value={stream.id}>{stream.label}</option>)}
          </select>
        </label>
        <label className="text-sm font-bold text-[#071D49] xl:col-span-2">
          Notes
          <input name="notes" className="mt-1 w-full rounded-xl border border-[#C7D4E6] bg-white px-3 py-2 font-semibold outline-none focus:border-[#0B63CE]" placeholder="Allocation context or constraints" />
        </label>
        <div className="flex items-end">
          <button type="submit" disabled={isSubmitting} className="w-full rounded-xl bg-[#071D49] px-4 py-2.5 text-sm font-black text-white shadow-sm disabled:opacity-50">
            {isSubmitting ? "Saving..." : "Save allocation"}
          </button>
        </div>
        {!optionsLoading && (subjects.length === 0 || classes.length === 0) ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-bold text-amber-800 md:col-span-2 xl:col-span-4">
            Configure at least one active subject and class section before HOD subject allocation can be saved.
          </div>
        ) : null}
      </form>
      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
          <div className="text-sm font-semibold text-[#64748B]">Allocated</div>
          <div className="mt-1 text-lg font-black text-[#071D49]">{isLoading ? "..." : metricFromData(data, "allocated")}</div>
        </div>
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
          <div className="text-sm font-semibold text-[#64748B]">Unallocated</div>
          <div className="mt-1 text-lg font-black text-[#071D49]">{isLoading ? "..." : metricFromData(data, "unallocated")}</div>
        </div>
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
          <div className="text-sm font-semibold text-[#64748B]">Total Slots</div>
          <div className="mt-1 text-lg font-black text-[#071D49]">{isLoading ? "..." : metricFromData(data, "total_slots", items.length)}</div>
        </div>
      </div>
      <div className="overflow-x-auto rounded-xl border border-[#D8E0EC]">
        <table className="w-full text-sm text-left whitespace-nowrap">
          <thead className="bg-[#F8FAFC] text-[#071D49]">
            <tr>
              <th className="px-4 py-3 font-bold">Subject</th>
              <th className="px-4 py-3 font-bold">Class</th>
              <th className="px-4 py-3 font-bold">Teacher</th>
              <th className="px-4 py-3 font-bold">Lessons Per Week</th>
              <th className="px-4 py-3 font-bold">Status</th>
              <th className="px-4 py-3 font-bold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-[#64748B]">Loading...</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-[#64748B]">No subject allocations yet. Use the form above to assign a subject to a class and teacher.</td></tr>
            ) : (
              items.map(row => (
                <tr key={row.id ?? `${fieldValue(row, ["subject", "subject_id"])}-${fieldValue(row, ["class", "class_section_id"])}`} className="border-t border-[#D8E0EC] hover:bg-[#F8FAFC]">
                  <td className="px-4 py-3 text-[#64748B]">{fieldValue(row, ["subject", "subject_name", "subject_id"])}</td>
                  <td className="px-4 py-3 text-[#64748B]">{fieldValue(row, ["class", "class_name", "class_section", "class_section_id"])}</td>
                  <td className="px-4 py-3 text-[#64748B]">{fieldValue(row, ["teacher", "teacher_name", "staff_member", "teacher_id", "staff_member_id"])}</td>
                  <td className="px-4 py-3 text-[#64748B]">{fieldValue(row, ["lessons_per_week", "weekly_lessons"], "0")}</td>
                  <td className="px-4 py-3"><StatusChip label={fieldValue(row, ["status"], "Active")} tone={getStatusTone(fieldValue(row, ["status"], "Active"))} /></td>
                  <td className="px-4 py-3">
                    <button type="button" onClick={() => handleRevokeSubjectAllocation(row)} disabled={isSubmitting} className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-black text-rose-700 disabled:opacity-50">
                      Revoke
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
