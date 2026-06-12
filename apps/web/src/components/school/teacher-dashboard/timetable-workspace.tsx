import { CalendarDays, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Panel, RecordTable } from "./shared-components";
import { useLiveTenantSession } from "@/hooks/use-live-tenant-session";
import { fetchTimetableLive } from "@/lib/modules/teacher-live";

export function TimetableWorkspace() {
  const liveSession = useLiveTenantSession("school");
  
  const { data, isLoading, isError } = useQuery({
    queryKey: ["teacher-timetable", liveSession.session?.tenantId, liveSession.session?.user.user_id],
    queryFn: () => fetchTimetableLive(liveSession.session!),
    enabled: !!liveSession.session,
  });

  const rows = data?.map(slot => [
    slot.dayName,
    `${slot.startTime} - ${slot.endTime}`,
    slot.className,
    slot.subjectName,
    slot.roomName,
  ]) || [];

  return (
    <Panel title="My Timetable" description="Personal teaching schedule, duties, and clubs." icon={CalendarDays}>
      <div className="mb-4 flex flex-wrap gap-2">
        <button type="button" className="rounded-xl bg-[#071D49] px-4 py-2 text-sm font-black text-white">This Week</button>
        <button type="button" className="rounded-xl border border-[#D8E0EC] px-4 py-2 text-sm font-black text-[#071D49] bg-white">Download PDF</button>
        <button type="button" className="rounded-xl border border-[#D8E0EC] px-4 py-2 text-sm font-black text-[#071D49] bg-white">Report Issue</button>
      </div>
      
      {isError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-800">
          Failed to load timetable. Please retry.
        </div>
      ) : isLoading ? (
        <div className="flex h-64 flex-col items-center justify-center rounded-xl border border-[#D8E0EC] bg-[#F8FAFC]">
          <Loader2 className="h-8 w-8 animate-spin text-[#64748B]" />
        </div>
      ) : rows.length === 0 ? (
        <div className="flex h-64 flex-col items-center justify-center rounded-xl border border-dashed border-[#D8E0EC] bg-[#F8FAFC]">
          <p className="text-sm font-semibold text-[#64748B]">No timetable loaded for this term.</p>
        </div>
      ) : (
        <RecordTable
          columns={["Day", "Time", "Class", "Subject", "Room"]}
          rows={rows}
          emptyState=""
        />
      )}
    </Panel>
  );
}
