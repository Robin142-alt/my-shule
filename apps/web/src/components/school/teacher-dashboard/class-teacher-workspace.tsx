import { User, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Panel, RecordTable } from "./shared-components";
import { useLiveTenantSession } from "@/hooks/use-live-tenant-session";
import { fetchClassRegisterOverviewLive } from "@/lib/modules/teacher-live";

export function ClassTeacherWorkspace() {
  const liveSession = useLiveTenantSession();
  
  const { data, isLoading, isError } = useQuery({
    queryKey: ["class-register-overview", liveSession.session?.tenant_id, liveSession.session?.user.id],
    queryFn: () => fetchClassRegisterOverviewLive(liveSession.session!),
    enabled: !!liveSession.session,
  });

  const stats = data?.stats || { totalLearners: 0, absentToday: 0 };
  
  const rows = data?.students.map(s => [
    s.admissionNo,
    s.name,
    s.attendancePercent,
    s.feeStatus === 'Cleared' ? (
      <span key={s.id + 'fee'} className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">Cleared</span>
    ) : (
      <span key={s.id + 'fee'} className="inline-flex items-center rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-medium text-orange-800">{s.feeStatus}</span>
    ),
    s.academic,
    s.discipline,
    <button key={s.id + 'btn'} className="text-[#1D4ED8] hover:underline font-bold">View Profile</button>
  ]) || [];

  return (
    <Panel title="My Class" description="Class teacher management for your assigned class." icon={User}>
      <div className="grid gap-3 sm:grid-cols-4 mb-4">
        <article className="rounded-xl border border-[#D8E0EC] bg-white p-3">
          <p className="text-xs font-bold uppercase text-[#64748B]">Class Learners</p>
          <p className="text-2xl font-black text-[#071D49]">
            {isLoading ? "..." : stats.totalLearners}
          </p>
        </article>
        <article className="rounded-xl border border-[#D8E0EC] bg-white p-3">
          <p className="text-xs font-bold uppercase text-[#64748B]">Absent Today</p>
          <p className="text-2xl font-black text-red-600">
            {isLoading ? "..." : stats.absentToday}
          </p>
        </article>
      </div>
      <div className="mb-4 flex flex-wrap gap-2">
        <button type="button" className="rounded-xl bg-[#071D49] px-4 py-2 text-sm font-black text-white">Mark Class Attendance</button>
        <button type="button" className="rounded-xl border border-[#D8E0EC] px-4 py-2 text-sm font-black text-[#071D49] bg-white">Message Class Parents</button>
      </div>
      {isError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-800">
          Failed to load class register. Please retry.
        </div>
      ) : isLoading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-[#64748B]" /></div>
      ) : (
        <RecordTable
          columns={["Adm No.", "Learner", "Attendance %", "Fee Status", "Academic", "Discipline", "Actions"]}
          rows={rows}
          emptyState="No learners found in your class."
        />
      )}
    </Panel>
  );
}
