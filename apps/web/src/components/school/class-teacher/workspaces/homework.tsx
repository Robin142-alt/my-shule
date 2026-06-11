import { BookOpenCheck } from "lucide-react";
import { Panel } from "../shared";
import { useClassTeacherHomework } from "@/lib/data/class-teacher-hooks";

export function HomeworkWorkspace() {
  const streamId = "stream_123";
  const { data, isLoading, error } = useClassTeacherHomework(streamId);

  if (isLoading) {
    return (
      <Panel title="Assignments & Homework" description="Track homework assigned to the class across subjects." icon={BookOpenCheck}>
        <div className="flex justify-center p-12"><div className="h-8 w-8 animate-spin rounded-full border-4 border-[#1D4ED8] border-t-transparent"></div></div>
      </Panel>
    );
  }

  if (error || !data) {
    return (
      <Panel title="Assignments & Homework" description="Track homework assigned to the class across subjects." icon={BookOpenCheck}>
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-700 font-bold">Failed to load homework.</div>
      </Panel>
    );
  }

  return (
    <Panel title="Assignments & Homework" description="Track homework assigned to the class across subjects." icon={BookOpenCheck}>
      <div className="overflow-hidden rounded-xl border border-[#D8E0EC]">
        <table className="w-full text-left text-sm text-[#071D49]">
          <thead className="bg-[#F8FAFC]">
            <tr>
              <th className="p-3 font-semibold">Subject</th>
              <th className="p-3 font-semibold">Assignment Title</th>
              <th className="p-3 font-semibold">Due Date</th>
              <th className="p-3 font-semibold text-right">Completion Rate</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D8E0EC]">
            {data.map((row: any) => (
              <tr key={row.id}>
                <td className="p-3 font-bold">{row.subject}</td>
                <td className="p-3">{row.title}</td>
                <td className="p-3">{row.dueDate}</td>
                <td className="p-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <span>{row.completionRate}</span>
                    <div className="h-2 w-16 overflow-hidden rounded bg-[#D8E0EC]">
                      <div className="h-full bg-emerald-500" style={{ width: row.completionRate }}></div>
                    </div>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
