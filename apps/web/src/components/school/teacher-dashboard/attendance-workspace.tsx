import { CheckSquare, Wifi, WifiOff, Loader2 } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Panel, RecordTable } from "./shared-components";
import { Modal } from "@/components/ui/modal";
import { usePermissions } from "@/components/providers/permission-context";
import { useLiveTenantSession } from "@/hooks/use-live-tenant-session";
import { fetchPendingAttendanceLive, fetchClassRegisterLive, type PendingAttendanceTask } from "@/lib/modules/teacher-live";
import { useOfflineAttendanceSync, type OfflineAttendanceRecord } from "@/lib/modules/attendance-offline";

function AttendanceModal({
  task,
  onClose,
}: {
  task: PendingAttendanceTask;
  onClose: () => void;
}) {
  const liveSession = useLiveTenantSession("school");
  const queryClient = useQueryClient();
  const { saveLocallyAndQueue } = useOfflineAttendanceSync(liveSession.session);
  const [submitting, setSubmitting] = useState(false);

  const { data: students, isLoading } = useQuery({
    queryKey: ["class-register", liveSession.session?.tenantId, task.classSectionId],
    queryFn: () => fetchClassRegisterLive(liveSession.session!, task.classSectionId),
    enabled: !!liveSession.session,
  });

  const [statuses, setStatuses] = useState<Record<string, "present" | "absent" | "late" | "excused">>({});

  const handleStatusChange = (studentId: string, status: "present" | "absent" | "late" | "excused") => {
    setStatuses(prev => ({ ...prev, [studentId]: status }));
  };

  const markAll = (status: "present" | "absent" | "late" | "excused") => {
    if (!students) return;
    const newStatuses: Record<string, "present" | "absent" | "late" | "excused"> = {};
    students.forEach(s => newStatuses[s.id] = status);
    setStatuses(newStatuses);
  };

  const handleSubmit = async () => {
    if (!students) return;
    setSubmitting(true);
    
    // Default any unmarked students to present
    const records: OfflineAttendanceRecord[] = students.map(s => ({
      studentId: s.id,
      status: statuses[s.id] || "present",
    }));

    saveLocallyAndQueue(task.classSectionId, records);
    
    // Optimistically update the UI to show this task as completed
    queryClient.setQueryData(
      ["pending-attendance", liveSession.session?.tenantId, liveSession.session?.user.user_id],
      (oldData: any) => {
        if (!oldData) return oldData;
        return {
          stats: {
            ...oldData.stats,
            pendingTasks: Math.max(0, oldData.stats.pendingTasks - 1),
          },
          tasks: oldData.tasks.map((t: PendingAttendanceTask) => 
            t.id === task.id ? { ...t, status: "Completed" } : t
          ),
        };
      }
    );

    setSubmitting(false);
    onClose();
  };

  return (
    <Modal title={`Mark Register: ${task.className}`} open={true} onClose={onClose} size="xl">
      <div className="p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-black text-[#071D49]">{task.subjectName}</h3>
            <p className="text-sm text-[#64748B]">{task.date} • {task.expected} learners expected</p>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => markAll("present")} className="rounded-lg bg-[#EFF6FF] px-3 py-1.5 text-xs font-bold text-[#1D4ED8]">All Present</button>
            <button type="button" onClick={() => markAll("absent")} className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-bold text-red-600">All Absent</button>
          </div>
        </div>

        <div className="max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
          {isLoading ? (
            <p className="py-8 text-center text-sm font-semibold text-[#64748B]">Loading class list...</p>
          ) : students?.length === 0 ? (
            <p className="py-8 text-center text-sm font-semibold text-[#64748B]">No active learners assigned to this class.</p>
          ) : (
            <div className="divide-y divide-[#F1F5F9] border-t border-[#F1F5F9]">
              {students?.map(student => {
                const currentStatus = statuses[student.id] || "present"; // Default
                return (
                  <div key={student.id} className="flex items-center justify-between py-3">
                    <div>
                      <p className="text-sm font-bold text-[#071D49]">{student.name}</p>
                      <p className="text-xs text-[#64748B]">{student.admissionNo}</p>
                    </div>
                    <div className="flex rounded-lg border border-[#D8E0EC] p-1">
                      {(["present", "absent", "late", "excused"] as const).map(s => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => handleStatusChange(student.id, s)}
                          className={`rounded-md px-3 py-1.5 text-xs font-bold capitalize transition-colors ${
                            currentStatus === s 
                              ? s === "present" ? "bg-green-100 text-green-800" 
                                : s === "absent" ? "bg-red-100 text-red-800"
                                : s === "late" ? "bg-yellow-100 text-yellow-800"
                                : "bg-purple-100 text-purple-800"
                              : "text-[#64748B] hover:bg-[#F8FAFC]"
                          }`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-end gap-3 border-t border-[#F1F5F9] pt-6">
          <button type="button" onClick={onClose} className="rounded-xl px-4 py-2 text-sm font-bold text-[#64748B]">Cancel</button>
          <button 
            type="button" 
            onClick={handleSubmit} 
            disabled={submitting || isLoading}
            className="rounded-xl bg-[#071D49] px-6 py-2 text-sm font-black text-white"
          >
            {submitting ? "Saving..." : "Save Register"}
          </button>
        </div>
      </div>
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0, 0, 0, 0.1); border-radius: 4px; }
      `}} />
    </Modal>
  );
}

export function AttendanceWorkspace() {
  const liveSession = useLiveTenantSession("school");
  const { hasPermission } = usePermissions();
  const { isOnline, syncing, queueCount } = useOfflineAttendanceSync(liveSession.session);
  const [activeTask, setActiveTask] = useState<PendingAttendanceTask | null>(null);
  
  const { data, isLoading, isError } = useQuery({
    queryKey: ["pending-attendance", liveSession.session?.tenantId, liveSession.session?.user.user_id],
    queryFn: () => fetchPendingAttendanceLive(liveSession.session!),
    enabled: !!liveSession.session,
  });

  const stats = data?.stats || { totalTasks: 0, pendingTasks: 0 };
  const rows = data?.tasks.map(t => [
    t.date,
    t.time,
    t.className,
    t.subjectName,
    t.expected.toString(),
    <span key={t.id + 'status'} className={`font-bold ${t.status === 'Completed' ? 'text-green-600' : 'text-orange-500'}`}>
      {t.status}
    </span>,
    hasPermission('school_attendance:write') ? (
      <button 
        key={t.id + 'btn'} 
        onClick={() => setActiveTask(t)}
        className="text-[#1D4ED8] hover:underline font-bold"
      >
        {t.status === 'Completed' ? 'Edit Register' : 'Mark Register'}
      </button>
    ) : (
      <span key={t.id + 'btn'} className="text-[#64748B] text-xs">Restricted</span>
    )
  ]) || [];

  return (
    <Panel 
      title="Attendance" 
      description="Mark lesson or class attendance for assigned classes." 
      icon={CheckSquare}
      headerEnd={
        <div className="flex items-center gap-3">
          {queueCount > 0 && (
            <div className="flex items-center gap-2 rounded-lg bg-orange-50 px-3 py-1.5 text-xs font-bold text-orange-700">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-orange-400 opacity-75"></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-orange-500"></span>
              </span>
              {queueCount} records queued
            </div>
          )}
          <div className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-bold ${
            isOnline ? "border-green-200 bg-green-50 text-green-700" : "border-red-200 bg-red-50 text-red-700"
          }`}>
            {syncing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : isOnline ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
            {syncing ? "Syncing..." : isOnline ? "Online" : "Offline Mode"}
          </div>
        </div>
      }
    >
      <div className="grid gap-3 sm:grid-cols-4 mb-4">
        <article className="rounded-xl border border-[#D8E0EC] bg-white p-3">
          <p className="text-xs font-bold uppercase text-[#64748B]">Today's Tasks</p>
          <p className="text-2xl font-black text-[#071D49]">
            {isLoading ? "..." : stats.totalTasks}
          </p>
        </article>
        <article className="rounded-xl border border-[#D8E0EC] bg-white p-3">
          <p className="text-xs font-bold uppercase text-[#64748B]">Pending Classes</p>
          <p className="text-2xl font-black text-[#071D49]">
            {isLoading ? "..." : stats.pendingTasks}
          </p>
        </article>
      </div>
      <div className="mb-4">
        {hasPermission('school_attendance:write') && (
          <button type="button" onClick={() => setActiveTask(data?.tasks?.[0] ?? null)} className="rounded-xl bg-[#071D49] px-4 py-2 text-sm font-black text-white">Mark All Present</button>
        )}
      </div>
      {isError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-800">
          Failed to load attendance tasks. Please retry.
        </div>
      ) : (
        <RecordTable
          columns={["Date", "Time", "Class", "Subject", "Expected", "Status", "Actions"]}
          rows={rows}
          emptyState={isLoading ? "Loading pending attendance..." : "No attendance tasks pending for today."}
        />
      )}
      {activeTask && (
        <AttendanceModal task={activeTask} onClose={() => setActiveTask(null)} />
      )}
    </Panel>
  );
}
