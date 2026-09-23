"use client";
import { RecordTable } from "@/components/ui/record-table";
import { useState, type FormEvent } from "react";
import { LogOut } from "lucide-react";
import { Panel, StatusChip, Tone } from "./shared";
import { useSchoolQuery } from "@/lib/data/school-hooks";
import { approveLeaveRequest, checkoutLeaveRequest, createLeaveRequest, rejectLeaveRequest } from "./api-client";
import type { BoardingReferenceData } from "./api-client";
import { toast } from "sonner";

type LeaveExitRecord = {
  id: string;
  student_name: string;
  hostel: string;
  leave_type: string;
  from_date: string;
  to_date: string;
  approved_by: string;
  guardian_name?: string;
  reason?: string;
  status: string;
};

type LeaveExitData = {
  metrics: {
    pending_requests: number;
    approved: number;
    on_leave_now: number;
  };
  leaveexitList: LeaveExitRecord[];
};

export function LeaveExitWorkspace() {
  const { data, error, isLoading, refetch } = useSchoolQuery<LeaveExitData>('/admin-command/boarding-master/leave-exit');
  const {
    data: references,
    error: referencesError,
    isLoading: referencesLoading,
  } = useSchoolQuery<BoardingReferenceData>('/admin-command/boarding-master/references');
  const [isCreating, setIsCreating] = useState(false);
  const [pendingActionId, setPendingActionId] = useState<string | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const items = data?.leaveexitList || [];
  const students = Array.isArray(references?.students) ? references.students : [];
  const guardians = Array.isArray(references?.guardians) ? references.guardians : [];
  const referencesIncomplete = references != null
    && (!Array.isArray(references.students) || !Array.isArray(references.guardians));
  const selectedStudent = students.find((student) => student.id === selectedStudentId);
  const linkedGuardians = guardians.filter((guardian) => guardian.student_id === selectedStudentId);

  const getStatusTone = (st: string): Tone => {
    if (st === "Active" || st === "Available" || st === "Approved" || st === "Completed" || st === "Resolved" || st === "Present" || st === "Functional" || st === "On Track" || st === "Cleared") return "success";
    if (st === "Pending" || st === "In Progress" || st === "Pending Approval" || st === "Scheduled" || st === "On Loan" || st === "Behind" || st === "Departed" || st === "Warning" || st === "Pending Review") return "warning";
    if (st === "Overdue" || st === "Critical" || st === "Rejected" || st === "Escalated" || st === "Expired" || st === "Damaged" || st === "Flagged" || st === "Absent" || st === "Blacklisted" || st === "Disposed" || st === "Unauthorized") return "danger";
    if (st === "Issued" || st === "Checked In" || st === "Submitted" || st === "Booked" || st === "Sent" || st === "On Leave") return "info";
    return "neutral";
  };

  async function handleCreateLeaveRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const payload = {
      student_id: String(form.get("student_id") || "").trim(),
      guardian_id: String(form.get("guardian_id") || "").trim(),
      leave_type: String(form.get("leave_type") || "").trim(),
      from_date: String(form.get("from_date") || "").trim(),
      to_date: String(form.get("to_date") || "").trim(),
      reason: String(form.get("reason") || "").trim(),
    };

    if (!payload.student_id || !payload.guardian_id || !payload.leave_type || !payload.from_date || !payload.to_date || !payload.reason) {
      toast.error("Select an active boarder and linked guardian, then complete the leave details.");
      return;
    }
    if (payload.to_date < payload.from_date) {
      toast.error("The return date cannot be before the departure date.");
      return;
    }

    setIsCreating(true);
    try {
      await createLeaveRequest(payload);
      toast.success("Leave request created");
      event.currentTarget.reset();
      setSelectedStudentId("");
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Leave request could not be created");
    } finally {
      setIsCreating(false);
    }
  }

  async function runLeaveAction(record: LeaveExitRecord, action: "approve" | "reject" | "checkout") {
    const reason = action === "reject" ? window.prompt(`Reason for rejecting ${record.student_name}'s leave request`) : null;
    if (action === "reject" && !reason?.trim()) return;

    setPendingActionId(`${action}:${record.id}`);
    try {
      if (action === "approve") await approveLeaveRequest(record.id);
      if (action === "reject") await rejectLeaveRequest(record.id, reason || "");
      if (action === "checkout") await checkoutLeaveRequest(record.id);
      toast.success(action === "checkout" ? "Boarder checked out" : `Leave request ${action}d`);
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Leave action could not be completed");
    } finally {
      setPendingActionId(null);
    }
  }

  return (
    <Panel title="Leave & Exeat" description="Manage student leave and exeat requests." icon={LogOut}>
      {referencesError ? (
        <div role="alert" className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          Boarder and guardian references could not be loaded: {referencesError.message}
        </div>
      ) : null}
      {!referencesLoading && !referencesError && referencesIncomplete ? (
        <div role="alert" className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Boarder and guardian references are incomplete. Refresh this workspace before creating a leave request.
        </div>
      ) : null}
      {!referencesLoading && !referencesError && !referencesIncomplete && students.length === 0 ? (
        <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
          No active boarders are available. Allocate a learner to boarding before creating a leave request.
        </div>
      ) : null}
      {!referencesLoading && !referencesError && !referencesIncomplete && students.length > 0 && guardians.length === 0 ? (
        <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
          No active guardian links are available for these boarders. Link a guardian before creating a leave request.
        </div>
      ) : null}
      <form onSubmit={handleCreateLeaveRequest} className="mb-6 grid gap-3 rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4 md:grid-cols-2 xl:grid-cols-4">
        <label className="text-xs font-bold text-[#334155]">
          Active boarder
          <select
            name="student_id"
            required
            disabled={referencesLoading || Boolean(referencesError) || referencesIncomplete || students.length === 0}
            value={selectedStudentId}
            onChange={(event) => setSelectedStudentId(event.target.value)}
            className="mt-1 w-full rounded-lg border border-[#D8E0EC] bg-white px-3 py-2 text-sm"
          >
            <option value="">Select a boarder</option>
            {students.map((student) => (
              <option key={student.id} value={student.id}>{student.student_name} · {student.admission_number}</option>
            ))}
          </select>
        </label>
        <label className="text-xs font-bold text-[#334155]">
          Linked guardian
          <select name="guardian_id" required disabled={!selectedStudentId || linkedGuardians.length === 0} className="mt-1 w-full rounded-lg border border-[#D8E0EC] bg-white px-3 py-2 text-sm disabled:bg-slate-100">
            <option value="">Select a guardian</option>
            {linkedGuardians.map((guardian) => (
              <option key={guardian.id} value={guardian.id}>{guardian.display_name}{guardian.phone ? ` · ${guardian.phone}` : ""}</option>
            ))}
          </select>
          {selectedStudentId && linkedGuardians.length === 0 ? (
            <span className="mt-1 block text-[11px] font-semibold text-rose-700">This boarder has no active linked guardian.</span>
          ) : null}
        </label>
        <input name="leave_type" required className="rounded-lg border border-[#D8E0EC] bg-white px-3 py-2 text-sm" placeholder="Leave type" />
        <div className="rounded-lg border border-[#D8E0EC] bg-white px-3 py-2 text-sm text-[#64748B]">
          <span className="block text-[11px] font-bold uppercase tracking-wide">Assigned hostel</span>
          {selectedStudent?.hostel_name || "Select a boarder"}
        </div>
        <input name="from_date" required type="date" className="rounded-lg border border-[#D8E0EC] bg-white px-3 py-2 text-sm" aria-label="From date" />
        <input name="to_date" required type="date" className="rounded-lg border border-[#D8E0EC] bg-white px-3 py-2 text-sm" aria-label="To date" />
        <textarea name="reason" required rows={2} className="rounded-lg border border-[#D8E0EC] bg-white px-3 py-2 text-sm md:col-span-2 xl:col-span-3" placeholder="Reason and handover notes" />
        <button
          type="submit"
          disabled={isCreating || referencesLoading || Boolean(referencesError) || referencesIncomplete || !selectedStudentId || linkedGuardians.length === 0}
          className="rounded-lg bg-[#071D49] px-4 py-2 text-sm font-black text-white disabled:opacity-50"
        >
          {isCreating ? "Creating..." : referencesLoading ? "Loading boarders..." : "Create Leave Request"}
        </button>
      </form>
      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
          <div className="text-sm font-semibold text-[#64748B]">Pending Requests</div>
          <div className="mt-1 text-lg font-black text-[#071D49]">{isLoading ? "..." : data?.metrics?.pending_requests ?? 0}</div>
        </div>
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
          <div className="text-sm font-semibold text-[#64748B]">Approved</div>
          <div className="mt-1 text-lg font-black text-[#071D49]">{isLoading ? "..." : data?.metrics?.approved ?? 0}</div>
        </div>
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
          <div className="text-sm font-semibold text-[#64748B]">On Leave Now</div>
          <div className="mt-1 text-lg font-black text-[#071D49]">{isLoading ? "..." : data?.metrics?.on_leave_now ?? 0}</div>
        </div>
      </div>
      <div className="overflow-x-auto rounded-xl border border-[#D8E0EC]">
        <RecordTable className="w-full text-sm text-left whitespace-nowrap">
          <thead className="bg-[#F8FAFC] text-[#071D49]">
            <tr>
              <th className="px-4 py-3 font-bold">Student Name</th>
              <th className="px-4 py-3 font-bold">Hostel</th>
              <th className="px-4 py-3 font-bold">Leave Type</th>
              <th className="px-4 py-3 font-bold">From Date</th>
              <th className="px-4 py-3 font-bold">To Date</th>
              <th className="px-4 py-3 font-bold">Approved By</th>
              <th className="px-4 py-3 font-bold">Status</th>
              <th className="px-4 py-3 font-bold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-[#64748B]">Loading...</td></tr>
            ) : error ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-rose-700">Leave requests could not be loaded: {error.message}</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-[#64748B]">No leave requests yet. Create the first request before a student leaves boarding.</td></tr>
            ) : (
              items.map(row => (
                <tr key={row.id} className="border-t border-[#D8E0EC] hover:bg-[#F8FAFC]">
                  <td className="px-4 py-3 text-[#64748B]">{row.student_name}</td>
                  <td className="px-4 py-3 text-[#64748B]">{row.hostel}</td>
                  <td className="px-4 py-3 text-[#64748B]">{row.leave_type}</td>
                  <td className="px-4 py-3 text-[#64748B]">{row.from_date}</td>
                  <td className="px-4 py-3 text-[#64748B]">{row.to_date}</td>
                  <td className="px-4 py-3 text-[#64748B]">{row.approved_by}</td>
                  <td className="px-4 py-3"><StatusChip label={row.status} tone={getStatusTone(row.status)} /></td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      {row.status === "Pending" ? (
                        <>
                          <button type="button" disabled={pendingActionId !== null} onClick={() => runLeaveAction(row, "approve")} className="text-xs font-bold text-emerald-700 disabled:opacity-50">
                            {pendingActionId === `approve:${row.id}` ? "Approving..." : "Approve"}
                          </button>
                          <button type="button" disabled={pendingActionId !== null} onClick={() => runLeaveAction(row, "reject")} className="text-xs font-bold text-rose-700 disabled:opacity-50">
                            {pendingActionId === `reject:${row.id}` ? "Rejecting..." : "Reject"}
                          </button>
                        </>
                      ) : null}
                      {row.status === "Approved" ? (
                        <button type="button" disabled={pendingActionId !== null} onClick={() => runLeaveAction(row, "checkout")} className="text-xs font-bold text-[#1D4ED8] disabled:opacity-50">
                          {pendingActionId === `checkout:${row.id}` ? "Checking out..." : "Check Out"}
                        </button>
                      ) : null}
                      {row.status !== "Pending" && row.status !== "Approved" ? <span className="text-xs font-semibold text-[#64748B]">No action</span> : null}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </RecordTable>
      </div>
    </Panel>
  );
}
