import { Users } from "lucide-react";
import { Panel, StatusChip } from "../shared";
import { useClassTeacherRegister, useResolvedClassTeacherStreamId } from "@/lib/data/class-teacher-hooks";

export function ClassRegisterWorkspace({ onSelectLearner }: { onSelectLearner?: (id: string) => void }) {
  const { streamId } = useResolvedClassTeacherStreamId();
  const { data, isLoading, error } = useClassTeacherRegister(streamId);

  if (isLoading) {
    return (
      <Panel title="My Class Register" description="Shows all learners officially assigned to the class/stream." icon={Users}>
        <div className="flex justify-center p-12"><div className="h-8 w-8 animate-spin rounded-full border-4 border-[#1D4ED8] border-t-transparent"></div></div>
      </Panel>
    );
  }

  if (error || !data) {
    return (
      <Panel title="My Class Register" description="Shows all learners officially assigned to the class/stream." icon={Users}>
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-700 font-bold">Failed to load register.</div>
      </Panel>
    );
  }

  return (
    <Panel title="My Class Register" description="Shows all learners officially assigned to the class/stream." icon={Users}>
      <div className="overflow-hidden rounded-xl border border-[#D8E0EC]">
        <table className="w-full text-left text-sm text-[#071D49]">
          <thead className="bg-[#F8FAFC]">
            <tr>
              <th className="p-3 font-semibold">Adm No.</th>
              <th className="p-3 font-semibold">Name</th>
              <th className="p-3 font-semibold">Gender</th>
              <th className="p-3 font-semibold">Parent Phone</th>
              <th className="p-3 font-semibold">Status</th>
              <th className="p-3 font-semibold text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D8E0EC]">
            {(Array.isArray(data) ? data : []).map((learner: any) => (
              <tr key={learner.id}>
                <td className="p-3">{learner.admissionNo}</td>
                <td className="p-3 font-bold">{learner.name}</td>
                <td className="p-3">{learner.gender}</td>
                <td className="p-3">{learner.parentPhone}</td>
                <td className="p-3"><StatusChip label={learner.status} tone="success"/></td>
                <td className="p-3 text-right">
                   <button onClick={() => onSelectLearner?.(String(learner.id))} className="rounded bg-[#EEF5FF] px-2 py-1 text-xs font-bold text-[#1D4ED8]">View Profile</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
