import { CalendarDays } from "lucide-react";
import { Panel } from "./shared-components";

export function TimetableWorkspace() {
  return (
    <Panel title="My Timetable" description="Personal teaching schedule, duties, and clubs." icon={CalendarDays}>
      <div className="mb-4 flex flex-wrap gap-2">
        <button type="button" className="rounded-xl bg-[#071D49] px-4 py-2 text-sm font-black text-white">This Week</button>
        <button type="button" className="rounded-xl border border-[#D8E0EC] px-4 py-2 text-sm font-black text-[#071D49] bg-white">Download PDF</button>
        <button type="button" className="rounded-xl border border-[#D8E0EC] px-4 py-2 text-sm font-black text-[#071D49] bg-white">Report Issue</button>
      </div>
      <div className="flex h-64 flex-col items-center justify-center rounded-xl border border-dashed border-[#D8E0EC] bg-[#F8FAFC]">
        <p className="text-sm font-semibold text-[#64748B]">No timetable loaded for this term.</p>
      </div>
    </Panel>
  );
}
