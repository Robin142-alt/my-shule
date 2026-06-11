import { CalendarDays } from "lucide-react";
import { Panel } from "../shared";
import { useClassTeacherTimetable } from "@/lib/data/class-teacher-hooks";

export function TimetableWorkspace() {
  const streamId = "stream_123";
  const { data, isLoading, error } = useClassTeacherTimetable(streamId);

  if (isLoading) {
    return (
      <Panel title="My Timetable" description="The daily schedule for your assigned class." icon={CalendarDays}>
        <div className="flex justify-center p-12"><div className="h-8 w-8 animate-spin rounded-full border-4 border-[#1D4ED8] border-t-transparent"></div></div>
      </Panel>
    );
  }

  if (error || !data) {
    return (
      <Panel title="My Timetable" description="The daily schedule for your assigned class." icon={CalendarDays}>
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-700 font-bold">Failed to load timetable.</div>
      </Panel>
    );
  }

  return (
    <Panel title="My Timetable" description="The daily schedule for your assigned class." icon={CalendarDays}>
      <div className="mb-4">
         <select className="rounded border border-[#D8E0EC] p-2 text-sm">
           <option>Monday</option>
           <option>Tuesday</option>
           <option>Wednesday</option>
           <option>Thursday</option>
           <option>Friday</option>
         </select>
      </div>
      <div className="overflow-hidden rounded-xl border border-[#D8E0EC]">
        <table className="w-full text-left text-sm text-[#071D49]">
          <thead className="bg-[#F8FAFC]">
            <tr>
              <th className="p-3 font-semibold">Time</th>
              <th className="p-3 font-semibold">Subject</th>
              <th className="p-3 font-semibold">Teacher</th>
              <th className="p-3 font-semibold">Room</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D8E0EC]">
            {data.map((row: any) => (
              <tr key={row.id}>
                <td className="p-3">{row.time}</td>
                <td className="p-3 font-bold">{row.subject}</td>
                <td className="p-3">{row.teacher}</td>
                <td className="p-3">{row.room}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
