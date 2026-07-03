import { BookOpen } from "lucide-react";
import { Panel } from "../shared";
import { useClassTeacherSubjects, useResolvedClassTeacherStreamId } from "@/lib/data/class-teacher-hooks";

export function ClassSubjectsWorkspace() {
  const { streamId } = useResolvedClassTeacherStreamId();
  const { data, isLoading, error } = useClassTeacherSubjects(streamId);

  if (isLoading) {
    return (
      <Panel title="Class Subjects" description="List of subjects taught in this class and the assigned teachers." icon={BookOpen}>
        <div className="flex justify-center p-12"><div className="h-8 w-8 animate-spin rounded-full border-4 border-[#1D4ED8] border-t-transparent"></div></div>
      </Panel>
    );
  }

  if (error || !data) {
    return (
      <Panel title="Class Subjects" description="List of subjects taught in this class and the assigned teachers." icon={BookOpen}>
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-700 font-bold">Failed to load subjects.</div>
      </Panel>
    );
  }

  return (
    <Panel title="Class Subjects" description="List of subjects taught in this class and the assigned teachers." icon={BookOpen}>
      <div className="overflow-hidden rounded-xl border border-[#D8E0EC]">
        <table className="w-full text-left text-sm text-[#071D49]">
          <thead className="bg-[#F8FAFC]">
            <tr>
              <th className="p-3 font-semibold">Subject</th>
              <th className="p-3 font-semibold">Teacher</th>
              <th className="p-3 font-semibold text-right">Lessons / Week</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D8E0EC]">
            {(Array.isArray(data) ? data : []).map((row: any) => (
              <tr key={row.id}>
                <td className="p-3 font-bold">{row.subject}</td>
                <td className="p-3">{row.teacher}</td>
                <td className="p-3 text-right">{row.lessonsPerWeek}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
