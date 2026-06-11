import { MessageSquare } from "lucide-react";
import { Panel } from "../shared";
import { useClassTeacherComments } from "@/lib/data/class-teacher-hooks";

export function ReportCommentsWorkspace() {
  const streamId = "stream_123";
  const { data, isLoading, error } = useClassTeacherComments(streamId);

  if (isLoading) {
    return (
      <Panel title="Report Card Comments" description="Add your Class Teacher's remarks for end-of-term reports." icon={MessageSquare}>
        <div className="flex justify-center p-12"><div className="h-8 w-8 animate-spin rounded-full border-4 border-[#1D4ED8] border-t-transparent"></div></div>
      </Panel>
    );
  }

  if (error || !data) {
    return (
      <Panel title="Report Card Comments" description="Add your Class Teacher's remarks for end-of-term reports." icon={MessageSquare}>
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-700 font-bold">Failed to load comments.</div>
      </Panel>
    );
  }

  return (
    <Panel title="Report Card Comments" description="Add your Class Teacher's remarks for end-of-term reports." icon={MessageSquare}>
      <div className="mb-4">
         <select className="rounded border border-[#D8E0EC] p-2 text-sm">
           <option>End of Term 1 2026</option>
           <option>Mid Term 1 2026</option>
         </select>
      </div>
      <div className="overflow-hidden rounded-xl border border-[#D8E0EC]">
        <table className="w-full text-left text-sm text-[#071D49]">
          <thead className="bg-[#F8FAFC]">
            <tr>
              <th className="p-3 font-semibold">Learner</th>
              <th className="p-3 font-semibold">Mean</th>
              <th className="p-3 font-semibold">Grade</th>
              <th className="p-3 font-semibold">Position</th>
              <th className="p-3 font-semibold w-1/2">Comment</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D8E0EC]">
            {data.map((row: any) => (
              <tr key={row.id}>
                <td className="p-3 font-bold">{row.name}</td>
                <td className="p-3">{row.mean}</td>
                <td className="p-3">{row.grade}</td>
                <td className="p-3">{row.position}</td>
                <td className="p-3">
                  <textarea defaultValue={row.comment} className="w-full rounded border border-[#D8E0EC] p-1 text-sm h-12" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-4 flex justify-end">
         <button className="rounded-lg bg-[#1D4ED8] px-4 py-2 text-sm font-black text-white">Save All Comments</button>
      </div>
    </Panel>
  );
}
