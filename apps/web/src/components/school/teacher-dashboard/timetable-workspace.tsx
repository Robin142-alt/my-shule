import { useMemo, useState } from "react";
import { CalendarDays, Clock3, Download, FileText, Loader2, MapPin, RefreshCw } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Panel, RecordTable } from "./shared-components";
import { useLiveTenantSession } from "@/hooks/use-live-tenant-session";
import { fetchTimetableLive } from "@/lib/modules/teacher-live";
import { downloadCsvFile, openPrintDocument } from "@/lib/dashboard/export";

export function TimetableWorkspace() {
  const liveSession = useLiveTenantSession("school");
  const dayNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const jsDay = new Date().getDay();
  const todayName = dayNames[(jsDay === 0 ? 7 : jsDay) - 1];
  const [selectedDay, setSelectedDay] = useState(todayName);
  
  const { data, isLoading, isError, isFetching, refetch } = useQuery({
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
  const selectedSlots = (data ?? []).filter((slot) => slot.dayName === selectedDay);
  const todaySlots = (data ?? []).filter((slot) => slot.dayName === todayName);
  const { currentLesson, nextLesson } = useMemo(() => {
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const toMinutes = (value: string) => {
      const [hours, minutes] = value.slice(0, 5).split(":").map(Number);
      return hours * 60 + minutes;
    };
    const ordered = [...todaySlots].sort((left, right) => left.startTime.localeCompare(right.startTime));
    return {
      currentLesson: ordered.find((slot) => toMinutes(slot.startTime) <= currentMinutes && toMinutes(slot.endTime) > currentMinutes),
      nextLesson: ordered.find((slot) => toMinutes(slot.startTime) > currentMinutes),
    };
  }, [todaySlots]);

  const downloadTimetable = () => {
    downloadCsvFile({
      filename: "teacher-timetable.csv",
      headers: ["Day", "Time", "Class", "Subject", "Room"],
      rows: rows.map((row) => row.map(String)),
    });
  };

  const printTimetable = () => {
    openPrintDocument({
      eyebrow: "Teacher timetable",
      title: "Weekly Teaching Timetable",
      subtitle: "Live school-scoped timetable preview",
      rows: rows.length
        ? rows.map((row) => ({
            label: `${row[0]} ${row[1]}`,
            value: `${row[2]} | ${row[3]} | ${row[4]}`,
          }))
        : [{ label: "Timetable", value: "No published slots are assigned to this teacher yet." }],
      footer: "Printed timetable slots are generated from published timetable records for the current school.",
    });
  };

  const reportIssue = () => {
    openPrintDocument({
      eyebrow: "Teacher timetable",
      title: "Timetable Issue Report",
      subtitle: "Review before sending to administration",
      rows: [
        { label: "Teacher", value: liveSession.session?.user.user_id ?? "current teacher" },
        { label: "Timetable slots", value: String(rows.length) },
        { label: "Required detail", value: "Affected slot, conflict, proposed correction" },
      ],
      footer: "Timetable issues must be resolved within the current school tenant.",
    });
  };

  return (
    <Panel title="My Timetable" description="Personal teaching schedule, duties, and clubs." icon={CalendarDays}>
      <div className="mb-4 flex flex-wrap gap-2">
        <button type="button" onClick={() => refetch()} disabled={isFetching} className="inline-flex items-center gap-2 rounded-xl bg-[#071D49] px-4 py-2 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-60">
          {isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Refresh timetable
        </button>
        <button type="button" onClick={downloadTimetable} className="inline-flex items-center gap-2 rounded-xl border border-[#D8E0EC] px-4 py-2 text-sm font-black text-[#071D49] bg-white">
          <Download className="h-4 w-4" />
          Download CSV
        </button>
        <button type="button" onClick={printTimetable} className="inline-flex items-center gap-2 rounded-xl border border-[#D8E0EC] px-4 py-2 text-sm font-black text-[#071D49] bg-white">
          <FileText className="h-4 w-4" />
          Print timetable
        </button>
        <button type="button" onClick={reportIssue} className="rounded-xl border border-[#D8E0EC] px-4 py-2 text-sm font-black text-[#071D49] bg-white">Report Issue</button>
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
          <p className="text-xs font-black uppercase tracking-wide text-blue-700">Happening now</p>
          <p className="mt-2 font-black text-[#071D49]">{currentLesson?.subjectName ?? "No lesson in progress"}</p>
          {currentLesson ? <p className="mt-1 text-sm text-blue-800">{currentLesson.className} · {currentLesson.startTime}–{currentLesson.endTime}</p> : null}
        </div>
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
          <p className="text-xs font-black uppercase tracking-wide text-[#64748B]">Coming next</p>
          <p className="mt-2 font-black text-[#071D49]">{nextLesson?.subjectName ?? "No later lesson today"}</p>
          {nextLesson ? <p className="mt-1 text-sm text-[#64748B]">{nextLesson.className} · {nextLesson.startTime}–{nextLesson.endTime}</p> : null}
        </div>
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
        <div className="flex min-h-64 flex-col items-center justify-center rounded-xl border border-dashed border-[#D8E0EC] bg-[#F8FAFC] p-6 text-center">
          <p className="text-sm font-black text-[#071D49]">No timetable loaded for this term.</p>
          <p className="mt-2 max-w-xl text-sm font-semibold leading-6 text-[#64748B]">
            Deputy Principal or Timetable Admin must publish timetable slots for this teacher. Use Report Issue if a published slot is missing from this workspace.
          </p>
        </div>
      ) : (
        <>
          <div className="mb-3 flex items-center justify-between gap-3 md:hidden">
            <label className="text-sm font-black text-[#071D49]">Schedule day
              <select value={selectedDay} onChange={(event) => setSelectedDay(event.target.value)} className="ml-2 h-10 rounded-lg border border-[#C8D5EA] bg-white px-3">
                {dayNames.map((day) => <option key={day} value={day}>{day}</option>)}
              </select>
            </label>
          </div>
          <div className="space-y-3 md:hidden">
            {selectedSlots.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[#D8E0EC] bg-[#F8FAFC] p-6 text-center text-sm text-[#64748B]">No published lessons for {selectedDay}.</div>
            ) : selectedSlots.map((slot) => (
              <article key={slot.id} className="rounded-xl border border-[#D8E0EC] bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div><p className="font-black text-[#071D49]">{slot.subjectName}</p><p className="mt-1 text-sm text-[#64748B]">{slot.className}</p></div>
                  <span className="rounded-full bg-[#EEF4FF] px-2.5 py-1 text-xs font-black text-[#174EA6]">{slot.startTime}–{slot.endTime}</span>
                </div>
                <div className="mt-3 flex flex-wrap gap-3 text-xs font-semibold text-[#64748B]">
                  <span className="inline-flex items-center gap-1"><Clock3 className="h-3.5 w-3.5" /> Published</span>
                  <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {slot.roomName}</span>
                </div>
              </article>
            ))}
          </div>
          <div className="hidden md:block">
            <RecordTable
              columns={["Day", "Time", "Class", "Subject", "Room"]}
              rows={rows}
              emptyState="No timetable rows are available. Refresh or report the missing published slot to timetable administration."
            />
          </div>
        </>
      )}
    </Panel>
  );
}
