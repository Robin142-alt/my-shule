import { Users } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Panel, RecordTable } from "./shared-components";
import { useLiveTenantSession } from "@/hooks/use-live-tenant-session";
import { fetchTeacherClassesLive } from "@/lib/modules/teacher-live";

export function ClassesWorkspace() {
  const liveSession = useLiveTenantSession("school");
  
  const { data, isLoading, isError } = useQuery({
    queryKey: ["teacher-classes", liveSession.session?.tenantId, liveSession.session?.user.user_id],
    queryFn: () => fetchTeacherClassesLive(liveSession.session!),
    enabled: !!liveSession.session,
  });

  const stats = data?.stats || { assignedClasses: 0, totalLearnersTaught: 0, averageAttendance: "0%" };
  const rows = data?.classes.map(c => [
    c.className,
    c.subjectName,
    c.learnersCount.toString(),
    c.attendanceStatus,
    c.catAverage,
    "Actions"
  ]) || [];

  return (
    <Panel title="My Classes" description="All classes, streams, and subjects assigned to you." icon={Users}>
      <div className="grid gap-3 sm:grid-cols-3 mb-4">
        <article className="app-metric-card rounded-xl border border-border bg-white p-3">
          <p className="text-xs font-bold uppercase text-muted">Assigned Classes</p>
          <p className="text-2xl font-black text-foreground">
            {isLoading ? "..." : stats.assignedClasses}
          </p>
        </article>
        <article className="app-metric-card rounded-xl border border-border bg-white p-3">
          <p className="text-xs font-bold uppercase text-muted">Total Learners Taught</p>
          <p className="text-2xl font-black text-foreground">
            {isLoading ? "..." : stats.totalLearnersTaught}
          </p>
        </article>
        <article className="app-metric-card rounded-xl border border-border bg-white p-3">
          <p className="text-xs font-bold uppercase text-muted">Average Attendance</p>
          <p className="text-2xl font-black text-foreground">
            {isLoading ? "..." : stats.averageAttendance}
          </p>
        </article>
      </div>
      {isError ? (
        <div className="rounded-xl border border-danger-border bg-danger-soft p-4 text-danger">
          Failed to load classes. Please retry.
        </div>
      ) : (
        <RecordTable
          columns={["Class", "Subject", "Learners", "Attendance Status", "CAT Average", "Actions"]}
          rows={rows}
          emptyState={isLoading ? "Loading your classes..." : "No assigned classes yet. HOD or deputy allocations must link this teacher to a class and subject before class workspaces open."}
        />
      )}
    </Panel>
  );
}
