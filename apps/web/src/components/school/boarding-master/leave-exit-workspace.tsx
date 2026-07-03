"use client";
import { useState, type FormEvent } from "react";
import { LogOut } from "lucide-react";
import { Panel, StatusChip, Tone } from "./shared";
import { useSchoolQuery } from "@/lib/data/school-hooks";
import { approveLeaveRequest, checkoutLeaveRequest, createLeaveRequest, rejectLeaveRequest } from "./api-client";
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
  const [isCreating, setIsCreating] = useState(false);
  const [pendingActionId, setPendingActionId] = useState<string | null>(null);
  const items = data?.leaveexitList || [];

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
      student_name: String(form.get("student_name") || "").trim(),
      hostel: String(form.get("hostel") || "").trim(),
      leave_type: String(form.get("leave_type") || "").trim(),
      from_date: String(form.get("from_date") || "").trim(),
      to_date: String(form.get("to_date") || "").trim(),
      guardian_name: String(form.get("guardian_name") || "").trim(),
      guardian_phone: String(form.get("guardian_phone") || "").trim(),
      reason: String(form.get("reason") || "").trim(),
    };

    if (!payload.student_name || !payload.leave_type || !payload.from_date || !payload.to_date || !payload.reason) {
      toast.error("Student, leave type, dates, and reason are required.");
      return;
    }

    setIsCreating(true);
    try {
      await createLeaveRequest(payload);
      toast.success("Leave request created");
      event.currentTarget.reset();
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
      <form onSubmit={handleCreateLeaveRequest} className="mb-6 grid gap-3 rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4 md:grid-cols-2 xl:grid-cols-4">
        <input name="student_name" required className="rounded-lg border border-[#D8E0EC] bg-white px-3 py-2 text-sm" placeholder="Student name" />
        <input name="hostel" className="rounded-lg border border-[#D8E0EC] bg-white px-3 py-2 text-sm" placeholder="Hostel / dorm" />
        <input name="leave_type" required className="rounded-lg border border-[#D8E0EC] bg-white px-3 py-2 text-sm" placeholder="Leave type" />
        <input name="guardian_name" className="rounded-lg border border-[#D8E0EC] bg-white px-3 py-2 text-sm" placeholder="Guardian / parent" />
        <input name="guardian_phone" className="rounded-lg border border-[#D8E0EC] bg-white px-3 py-2 text-sm" placeholder="Guardian phone" />
        <input name="from_date" required type="date" className="rounded-lg border border-[#D8E0EC] bg-white px-3 py-2 text-sm" aria-label="From date" />
        <input name="to_date" required type="date" className="rounded-lg border border-[#D8E0EC] bg-white px-3 py-2 text-sm" aria-label="To date" />
        <textarea name="reason" required rows={2} className="rounded-lg border border-[#D8E0EC] bg-white px-3 py-2 text-sm md:col-span-2 xl:col-span-3" placeholder="Reason and handover notes" />
        <button type="submit" disabled={isCreating} className="rounded-lg bg-[#071D49] px-4 py-2 text-sm font-black text-white disabled:opacity-50">
          {isCreating ? "Creating..." : "Create Leave Request"}
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
        <table className="w-full text-sm text-left whitespace-nowrap">
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
        </table>
      </div>
    </Panel>
  );
}
