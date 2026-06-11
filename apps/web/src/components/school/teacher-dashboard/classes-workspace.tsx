import { Users } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Panel, RecordTable } from "./shared-components";
import { useLiveTenantSession } from "@/hooks/use-live-tenant-session";
import { fetchTeacherClassesLive } from "@/lib/modules/teacher-live";

export function ClassesWorkspace() {
  const liveSession = useLiveTenantSession();
  
  const { data, isLoading, isError } = useQuery({
    queryKey: ["teacher-classes", liveSession.session?.tenant_id, liveSession.session?.user.id],
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
        <article className="rounded-xl border border-[#D8E0EC] bg-white p-3">
          <p className="text-xs font-bold uppercase text-[#64748B]">Assigned Classes</p>
          <p className="text-2xl font-black text-[#071D49]">
            {isLoading ? "..." : stats.assignedClasses}
          </p>
        </article>
        <article className="rounded-xl border border-[#D8E0EC] bg-white p-3">
          <p className="text-xs font-bold uppercase text-[#64748B]">Total Learners Taught</p>
          <p className="text-2xl font-black text-[#071D49]">
            {isLoading ? "..." : stats.totalLearnersTaught}
          </p>
        </article>
        <article className="rounded-xl border border-[#D8E0EC] bg-white p-3">
          <p className="text-xs font-bold uppercase text-[#64748B]">Average Attendance</p>
          <p className="text-2xl font-black text-[#071D49]">
            {isLoading ? "..." : stats.averageAttendance}
          </p>
        </article>
      </div>
      {isError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-800">
          Failed to load classes. Please retry.
        </div>
      ) : (
        <RecordTable
          columns={["Class", "Subject", "Learners", "Attendance Status", "CAT Average", "Actions"]}
          rows={rows}
          emptyState={isLoading ? "Loading your classes..." : "No assigned classes found."}
        />
      )}
    </Panel>
  );
}
