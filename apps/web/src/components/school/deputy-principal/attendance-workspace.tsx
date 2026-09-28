"use client";
import { useState } from "react";
import { UserRoundCheck, Search } from "lucide-react";
import { toast } from "sonner";
import { Panel, StatusChip, Tone, openDeputyRecord } from "./shared";
import { useSchoolQuery } from "@/lib/data/school-hooks";
import { notifyParentAttendance, createFollowUpList, remindUnmarkedAttendance } from "./api-client";

export type AttendanceRecord = {
  id: string;
  studentName: string;
  className: string;
  status: "Absent" | "Late" | "Present";
  reason: string;
  parentNotified: "Pending" | "Notified" | "Followed Up";
};

type AttendanceData = {
  metrics: {
    absent_students: number;
    late_students: number;
  };
  records: AttendanceRecord[];
};

export function DeputyAttendanceWorkspace() {
  const [isSubmittingId, setIsSubmittingId] = useState<string | null>(null);
  const { data, isLoading, refetch } = useSchoolQuery<AttendanceData>('/admin-command/deputy/attendance');
  const [showFollowUpModal, setShowFollowUpModal] = useState(false);
  const [isSubmittingFollowUp, setIsSubmittingFollowUp] = useState(false);
  const [isRemindingUnmarked, setIsRemindingUnmarked] = useState(false);
  const [followUpData, setFollowUpData] = useState({ listName: '', dateRange: 'This Week', assignedTo: '' });

  const records = data?.records || [];

  const handleNotifyParent = async (id: string, studentName: string) => {
    setIsSubmittingId(id);
    try {
      const result = await notifyParentAttendance(id) as { message?: string };
      toast.success(result.message || `Attendance notice queued for linked guardians of ${studentName}.`);
      await refetch();
    } catch (notificationError) {
      toast.error("No guardian notice was sent", {
        description: notificationError instanceof Error ? notificationError.message : "No active linked guardian account could be verified.",
      });
    } finally {
      setIsSubmittingId(null);
    }
  };

  const handleCreateFollowUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmittingFollowUp(true);
    try {
      await createFollowUpList(followUpData);
      toast.success("Follow-up list created successfully");
      setShowFollowUpModal(false);
      setFollowUpData({ listName: '', dateRange: 'This Week', assignedTo: '' });
      refetch();
    } catch {
      toast.error("Failed to create follow-up list");
    } finally {
      setIsSubmittingFollowUp(false);
    }
  };

  const handleRemindUnmarked = async () => {
    setIsRemindingUnmarked(true);
    try {
      await remindUnmarkedAttendance({
        attendanceDate: new Date().toISOString().slice(0, 10),
        message: "Please submit pending attendance registers for the current school day.",
      });
      toast.success("Class teacher attendance reminders were routed.");
      refetch();
    } catch {
      toast.error("Failed to route unmarked attendance reminders.");
    } finally {
      setIsRemindingUnmarked(false);
    }
  };

  const getStatusTone = (st: string): Tone => {
    if (st === "Absent") return "danger";
    if (st === "Late") return "warning";
    return "success";
  };

  const getNotifiedTone = (st: string): Tone => {
    if (st === "Pending") return "warning";
    if (st === "Notified") return "info";
    return "success";
  };

  return (
    <>
      <Panel title="Attendance & Punctuality" description="Follow up missing records, repeated absenteeism, and lateness." icon={UserRoundCheck} actions={
        <div className="flex gap-2">
          <button type="button" disabled={isRemindingUnmarked} className="rounded-lg border border-border px-4 py-2 text-sm font-bold text-foreground disabled:opacity-50" onClick={handleRemindUnmarked}>
            {isRemindingUnmarked ? "Routing..." : "Remind Unmarked"}
          </button>
          <button type="button" onClick={() => setShowFollowUpModal(true)} className="rounded-lg bg-primary px-4 py-2 text-sm font-black text-white hover:bg-blue-900 transition">Create Follow-Up</button>
        </div>
      }>
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted" />
            <input type="text" placeholder="Search student or admission no..." className="w-full rounded-xl border border-border py-2 pl-9 pr-3 text-sm focus:border-primary focus:outline-none" />
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 mb-6">
          <div className="rounded-xl border border-danger-border bg-danger-soft p-4">
            <div className="text-sm font-semibold text-danger">Absent Today</div>
            <div className="mt-1 text-lg font-black text-danger">{isLoading ? "..." : data?.metrics?.absent_students || 0}</div>
          </div>
          <div className="rounded-xl border border-orange-200 bg-orange-50 p-4">
            <div className="text-sm font-semibold text-orange-700">Late Today</div>
            <div className="mt-1 text-lg font-black text-orange-700">{isLoading ? "..." : data?.metrics?.late_students || 0}</div>
          </div>
        </div>
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm text-left whitespace-nowrap">
            <thead className="bg-surface-muted text-foreground">
              <tr>
                <th className="px-4 py-3 font-bold border-b border-border">Student</th>
                <th className="px-4 py-3 font-bold border-b border-border">Class</th>
                <th className="px-4 py-3 font-bold border-b border-border">Status</th>
                <th className="px-4 py-3 font-bold border-b border-border">Reason</th>
                <th className="px-4 py-3 font-bold border-b border-border">Parent Notified</th>
                <th className="px-4 py-3 font-bold border-b border-border text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {records.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted">No recent attendance records found.</td>
                </tr>
              ) : (
                records.map((rec) => (
                  <tr key={rec.id} className="hover:bg-surface-muted">
                    <td className="px-4 py-3 font-semibold text-foreground">{rec.studentName}</td>
                    <td className="px-4 py-3 text-muted">{rec.className}</td>
                    <td className="px-4 py-3"><StatusChip label={rec.status} tone={getStatusTone(rec.status)} /></td>
                    <td className="px-4 py-3 text-muted">{rec.reason}</td>
                    <td className="px-4 py-3"><StatusChip label={rec.parentNotified} tone={getNotifiedTone(rec.parentNotified)} /></td>
                    <td className="px-4 py-3 text-right">
                      {rec.parentNotified === "Pending" && (
                        <button type="button" disabled={isSubmittingId === rec.id} onClick={() => handleNotifyParent(rec.id, rec.studentName)} className="text-blue-600 hover:underline font-semibold text-xs mr-3 disabled:opacity-50 disabled:no-underline">
                          {isSubmittingId === rec.id ? "Notifying..." : "Contact Parent"}
                        </button>
                      )}
                      <button type="button" className="text-blue-600 hover:underline font-semibold text-xs" onClick={() => openDeputyRecord("Attendance follow-up", [["Student", rec.studentName], ["Class", rec.className], ["Status", rec.status], ["Reason", rec.reason], ["Parent Notified", rec.parentNotified]])}>Follow Up</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Panel>

      {showFollowUpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-xl font-bold text-foreground">Create Follow-Up List</h2>
            <form onSubmit={handleCreateFollowUp} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-semibold text-muted">List Name</label>
                <input required type="text" value={followUpData.listName} onChange={e => setFollowUpData({ ...followUpData, listName: e.target.value })} className="w-full rounded-lg border border-border px-3 py-2 outline-none focus:border-primary" placeholder="e.g. Chronic Absenteeism - Form 3" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-muted">Date Range</label>
                <select value={followUpData.dateRange} onChange={e => setFollowUpData({ ...followUpData, dateRange: e.target.value })} className="w-full rounded-lg border border-border px-3 py-2 outline-none focus:border-primary">
                  <option value="This Week">This Week</option>
                  <option value="Last Week">Last Week</option>
                  <option value="This Month">This Month</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-muted">Assigned To</label>
                <input required type="text" value={followUpData.assignedTo} onChange={e => setFollowUpData({ ...followUpData, assignedTo: e.target.value })} className="w-full rounded-lg border border-border px-3 py-2 outline-none focus:border-primary" placeholder="e.g. Guidance Counsellor" />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-border">
                <button type="button" onClick={() => setShowFollowUpModal(false)} className="rounded-lg px-4 py-2 text-sm font-bold text-muted hover:bg-surface-muted">Cancel</button>
                <button type="submit" disabled={isSubmittingFollowUp} className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white hover:bg-blue-900 disabled:opacity-50">
                  {isSubmittingFollowUp ? "Creating..." : "Create List"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
