import { FolderOpen } from "lucide-react";
import { Panel } from "../shared";
import { useClassTeacherDocuments } from "@/lib/data/class-teacher-hooks";

export function DocumentsWorkspace() {
  const streamId = "stream_123";
  const { data, isLoading, error } = useClassTeacherDocuments(streamId);

  if (isLoading) {
    return (
      <Panel title="Class Documents" description="Shared files, syllabuses, and class resources." icon={FolderOpen}>
        <div className="flex justify-center p-12"><div className="h-8 w-8 animate-spin rounded-full border-4 border-[#1D4ED8] border-t-transparent"></div></div>
      </Panel>
    );
  }

  if (error || !data) {
    return (
      <Panel title="Class Documents" description="Shared files, syllabuses, and class resources." icon={FolderOpen}>
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-700 font-bold">Failed to load documents.</div>
      </Panel>
    );
  }

  return (
    <Panel title="Class Documents" description="Shared files, syllabuses, and class resources." icon={FolderOpen}>
      <div className="mb-4 flex justify-end">
         <button className="rounded-lg bg-[#1D4ED8] px-4 py-2 text-sm font-black text-white">Upload Document</button>
      </div>
      <div className="overflow-hidden rounded-xl border border-[#D8E0EC]">
        <table className="w-full text-left text-sm text-[#071D49]">
          <thead className="bg-[#F8FAFC]">
            <tr>
              <th className="p-3 font-semibold">Title</th>
              <th className="p-3 font-semibold">Type</th>
              <th className="p-3 font-semibold">Uploaded</th>
              <th className="p-3 font-semibold">Size</th>
              <th className="p-3 font-semibold text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D8E0EC]">
            {(Array.isArray(data) ? data : []).map((row: any) => (
              <tr key={row.id}>
                <td className="p-3 font-bold">{row.title}</td>
                <td className="p-3">{row.type}</td>
                <td className="p-3">{row.uploadedAt}</td>
                <td className="p-3">{row.size}</td>
                <td className="p-3 text-right">
                  <button className="rounded bg-[#EEF5FF] px-2 py-1 text-xs font-bold text-[#1D4ED8]">Download</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
