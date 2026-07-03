import { Stethoscope } from "lucide-react";
import { Panel } from "../shared";
import { useClassTeacherHealth, useResolvedClassTeacherStreamId } from "@/lib/data/class-teacher-hooks";

export function HealthNotesWorkspace() {
  const { streamId } = useResolvedClassTeacherStreamId();
  const { data, isLoading, error } = useClassTeacherHealth(streamId);

  if (isLoading) {
    return (
      <Panel title="Health Records" description="Important medical conditions and allergies for learners in your class." icon={Stethoscope}>
        <div className="flex justify-center p-12"><div className="h-8 w-8 animate-spin rounded-full border-4 border-[#1D4ED8] border-t-transparent"></div></div>
      </Panel>
    );
  }

  if (error || !data) {
    return (
      <Panel title="Health Records" description="Important medical conditions and allergies for learners in your class." icon={Stethoscope}>
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-700 font-bold">Failed to load health records.</div>
      </Panel>
    );
  }

  return (
    <Panel title="Health Records" description="Important medical conditions and allergies for learners in your class." icon={Stethoscope}>
      <div className="overflow-hidden rounded-xl border border-[#D8E0EC]">
        <table className="w-full text-left text-sm text-[#071D49]">
          <thead className="bg-[#F8FAFC]">
            <tr>
              <th className="p-3 font-semibold">Learner</th>
              <th className="p-3 font-semibold">Condition</th>
              <th className="p-3 font-semibold">Allergies</th>
              <th className="p-3 font-semibold">Notes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D8E0EC]">
            {(Array.isArray(data) ? data : []).map((row: any) => (
              <tr key={row.id}>
                <td className="p-3 font-bold">{row.learner}</td>
                <td className="p-3">{row.condition}</td>
                <td className="p-3 text-rose-600 font-bold">{row.allergies}</td>
                <td className="p-3 text-xs">{row.notes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
