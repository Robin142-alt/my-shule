import { MessageCircle } from "lucide-react";
import { Panel, StatusChip } from "../shared";
import { useClassTeacherCommunication } from "@/lib/data/class-teacher-hooks";

export function CommunicationWorkspace() {
  const streamId = "stream_123";
  const { data, isLoading, error } = useClassTeacherCommunication(streamId);

  if (isLoading) {
    return (
      <Panel title="Parent Communication" description="Message history with parents of learners in your class." icon={MessageCircle}>
        <div className="flex justify-center p-12"><div className="h-8 w-8 animate-spin rounded-full border-4 border-[#1D4ED8] border-t-transparent"></div></div>
      </Panel>
    );
  }

  if (error || !data) {
    return (
      <Panel title="Parent Communication" description="Message history with parents of learners in your class." icon={MessageCircle}>
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-700 font-bold">Failed to load communication records.</div>
      </Panel>
    );
  }

  return (
    <Panel title="Parent Communication" description="Message history with parents of learners in your class." icon={MessageCircle}>
      <div className="mb-4 flex gap-2 justify-end">
         <button className="rounded-lg bg-[#071D49] px-4 py-2 text-sm font-black text-white">Send SMS to All Parents</button>
         <button className="rounded-lg bg-[#1D4ED8] px-4 py-2 text-sm font-black text-white">Send Individual Message</button>
      </div>
      <div className="overflow-hidden rounded-xl border border-[#D8E0EC]">
        <table className="w-full text-left text-sm text-[#071D49]">
          <thead className="bg-[#F8FAFC]">
            <tr>
              <th className="p-3 font-semibold">Date</th>
              <th className="p-3 font-semibold">Recipient</th>
              <th className="p-3 font-semibold">Type</th>
              <th className="p-3 font-semibold">Message</th>
              <th className="p-3 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D8E0EC]">
            {data.map((row: any) => (
              <tr key={row.id}>
                <td className="p-3">{row.date}</td>
                <td className="p-3 font-bold">{row.recipient}</td>
                <td className="p-3">{row.type}</td>
                <td className="p-3 max-w-xs truncate">{row.message}</td>
                <td className="p-3"><StatusChip label={row.status} tone={row.status === 'Delivered' ? 'success' : 'neutral'}/></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
