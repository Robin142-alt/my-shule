import { Users } from "lucide-react";
import { Panel, StatusChip } from "../shared";
import { useClassTeacherMeetings } from "@/lib/data/class-teacher-hooks";

export function MeetingsWorkspace() {
  const streamId = "stream_123";
  const { data, isLoading, error } = useClassTeacherMeetings(streamId);

  if (isLoading) {
    return (
      <Panel title="Parent Meetings" description="Scheduled meetings with parents of your learners." icon={Users}>
        <div className="flex justify-center p-12"><div className="h-8 w-8 animate-spin rounded-full border-4 border-[#1D4ED8] border-t-transparent"></div></div>
      </Panel>
    );
  }

  if (error || !data) {
    return (
      <Panel title="Parent Meetings" description="Scheduled meetings with parents of your learners." icon={Users}>
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-700 font-bold">Failed to load meetings.</div>
      </Panel>
    );
  }

  return (
    <Panel title="Parent Meetings" description="Scheduled meetings with parents of your learners." icon={Users}>
      <div className="mb-4 flex justify-end">
         <button className="rounded-lg bg-[#1D4ED8] px-4 py-2 text-sm font-black text-white">Schedule Meeting</button>
      </div>
      <div className="overflow-hidden rounded-xl border border-[#D8E0EC]">
        <table className="w-full text-left text-sm text-[#071D49]">
          <thead className="bg-[#F8FAFC]">
            <tr>
              <th className="p-3 font-semibold">Date</th>
              <th className="p-3 font-semibold">Time</th>
              <th className="p-3 font-semibold">Parent</th>
              <th className="p-3 font-semibold">Agenda</th>
              <th className="p-3 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D8E0EC]">
            {(Array.isArray(data) ? data : []).map((row: any) => (
              <tr key={row.id}>
                <td className="p-3">{row.date}</td>
                <td className="p-3">{row.time}</td>
                <td className="p-3 font-bold">{row.parent}</td>
                <td className="p-3">{row.agenda}</td>
                <td className="p-3"><StatusChip label={row.status} tone={row.status === 'Scheduled' ? 'neutral' : 'success'}/></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
