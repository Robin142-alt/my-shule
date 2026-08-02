import { User, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Panel, RecordTable } from "./shared-components";
import { useLiveTenantSession } from "@/hooks/use-live-tenant-session";
import { fetchClassRegisterOverviewLive } from "@/lib/modules/teacher-live";
import { openPrintDocument } from "@/lib/dashboard/export";

export function ClassTeacherWorkspace() {
  const liveSession = useLiveTenantSession("school");
  
  const { data, isLoading, isError } = useQuery({
    queryKey: ["class-register-overview", liveSession.session?.tenantId, liveSession.session?.user.user_id],
    queryFn: () => fetchClassRegisterOverviewLive(liveSession.session!),
    enabled: !!liveSession.session,
  });

  const stats = data?.stats || { totalLearners: 0, absentToday: 0 };

  const openLearnerProfile = (student: NonNullable<typeof data>["students"][number]) => {
    openPrintDocument({
      eyebrow: "Class teacher",
      title: "Learner Profile",
      subtitle: `${student.name} | ${student.admissionNo}`,
      rows: [
        { label: "Admission number", value: student.admissionNo || "-" },
        { label: "Learner", value: student.name || "-" },
        { label: "Attendance", value: `${student.attendancePercent ?? "-"}%` },
        { label: "Academic", value: student.academic || "-" },
        { label: "Discipline", value: student.discipline || "-" },
      ],
      footer: "Learner profile visibility is limited to the assigned class teacher and school roles with permission.",
    });
  };

  const openClassAttendance = () => {
    openPrintDocument({
      eyebrow: "Class teacher",
      title: "Class Attendance Register",
      subtitle: `Learners: ${stats.totalLearners} | Absent today: ${stats.absentToday}`,
      rows: (data?.students ?? []).map((student) => ({
        label: student.admissionNo || student.name,
        value: `${student.name} | attendance ${student.attendancePercent ?? "-"}%`,
      })),
      footer: "Use this register to verify attendance before submission.",
    });
  };

  const openParentMessageQueue = () => {
    openPrintDocument({
      eyebrow: "Class teacher",
      title: "Class Parent Message Queue",
      subtitle: "Prepare a tenant-scoped parent communication",
      rows: [
        { label: "Recipients", value: `${stats.totalLearners} linked learner households` },
        { label: "Channel", value: "In-app / SMS where configured" },
        { label: "Required review", value: "Message content and recipient list before sending" },
      ],
      footer: "Parent messages must only go to guardians linked to learners in this class.",
    });
  };
  
  const rows = data?.students.map(s => [
    s.admissionNo,
    s.name,
    s.attendancePercent,
    s.academic,
    s.discipline,
    <button key={s.id + 'btn'} type="button" onClick={() => openLearnerProfile(s)} className="text-[#1D4ED8] hover:underline font-bold">View Profile</button>
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
        <button type="button" onClick={openClassAttendance} className="rounded-xl bg-[#071D49] px-4 py-2 text-sm font-black text-white">Mark Class Attendance</button>
        <button type="button" onClick={openParentMessageQueue} className="rounded-xl border border-[#D8E0EC] px-4 py-2 text-sm font-black text-[#071D49] bg-white">Message Class Parents</button>
      </div>
      {isError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-800">
          Failed to load class register. Please retry.
        </div>
      ) : isLoading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-[#64748B]" /></div>
      ) : (
        <RecordTable
          columns={["Adm No.", "Learner", "Attendance %", "Academic", "Discipline", "Actions"]}
          rows={rows}
          emptyState="No learners are linked to your class yet. Admissions or the deputy class setup must assign learners before class-teacher review can start."
        />
      )}
    </Panel>
  );
}
