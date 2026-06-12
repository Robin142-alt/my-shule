import { FileSpreadsheet } from "lucide-react";
import { Panel, StatusChip } from "../shared";
import { useClassTeacherReports } from "@/lib/data/class-teacher-hooks";

export function ReportsWorkspace() {
  const streamId = "stream_123";
  const { data, isLoading, error } = useClassTeacherReports(streamId);

  if (isLoading) {
    return (
      <Panel title="Class Reports" description="Generate and view end-of-term academic reports." icon={FileSpreadsheet}>
        <div className="flex justify-center p-12"><div className="h-8 w-8 animate-spin rounded-full border-4 border-[#1D4ED8] border-t-transparent"></div></div>
      </Panel>
    );
  }

  if (error || !data) {
    return (
      <Panel title="Class Reports" description="Generate and view end-of-term academic reports." icon={FileSpreadsheet}>
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-700 font-bold">Failed to load reports.</div>
      </Panel>
    );
  }

  return (
    <Panel title="Class Reports" description="Generate and view end-of-term academic reports." icon={FileSpreadsheet}>
      <div className="mb-4 flex justify-end">
         <button className="rounded-lg bg-[#1D4ED8] px-4 py-2 text-sm font-black text-white">Generate Reports</button>
      </div>
      <div className="overflow-hidden rounded-xl border border-[#D8E0EC]">
        <table className="w-full text-left text-sm text-[#071D49]">
          <thead className="bg-[#F8FAFC]">
            <tr>
              <th className="p-3 font-semibold">Term</th>
              <th className="p-3 font-semibold">Year</th>
              <th className="p-3 font-semibold">Generated At</th>
              <th className="p-3 font-semibold">Status</th>
              <th className="p-3 font-semibold text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D8E0EC]">
            {(Array.isArray(data) ? data : []).map((row: any) => (
              <tr key={row.id}>
                <td className="p-3 font-bold">{row.term}</td>
                <td className="p-3">{row.year}</td>
                <td className="p-3">{row.generatedAt}</td>
                <td className="p-3"><StatusChip label={row.status} tone="success"/></td>
                <td className="p-3 text-right">
                  <button className="rounded bg-[#EEF5FF] px-2 py-1 text-xs font-bold text-[#1D4ED8]">View</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
