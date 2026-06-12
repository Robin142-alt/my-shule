import { Banknote } from "lucide-react";
import { Panel, StatusChip } from "../shared";
import { useClassTeacherFees } from "@/lib/data/class-teacher-hooks";

export function FeesWorkspace() {
  const streamId = "stream_123";
  const { data, isLoading, error } = useClassTeacherFees(streamId);

  if (isLoading) {
    return (
      <Panel title="Fee Arrears" description="Monitor learners with outstanding fee balances." icon={Banknote}>
        <div className="flex justify-center p-12"><div className="h-8 w-8 animate-spin rounded-full border-4 border-[#1D4ED8] border-t-transparent"></div></div>
      </Panel>
    );
  }

  if (error || !data) {
    return (
      <Panel title="Fee Arrears" description="Monitor learners with outstanding fee balances." icon={Banknote}>
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-700 font-bold">Failed to load fee arrears.</div>
      </Panel>
    );
  }

  return (
    <Panel title="Fee Arrears" description="Monitor learners with outstanding fee balances." icon={Banknote}>
      <div className="overflow-hidden rounded-xl border border-[#D8E0EC]">
        <table className="w-full text-left text-sm text-[#071D49]">
          <thead className="bg-[#F8FAFC]">
            <tr>
              <th className="p-3 font-semibold">Learner</th>
              <th className="p-3 font-semibold">Balance</th>
              <th className="p-3 font-semibold">Last Payment</th>
              <th className="p-3 font-semibold">Status</th>
              <th className="p-3 font-semibold">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D8E0EC]">
            {(Array.isArray(data) ? data : []).map((row: any) => (
              <tr key={row.id}>
                <td className="p-3 font-bold">{row.learner}</td>
                <td className="p-3">{row.balance}</td>
                <td className="p-3">{row.lastPayment}</td>
                <td className="p-3"><StatusChip label={row.status} tone={row.status === 'Overdue' ? 'danger' : 'neutral'}/></td>
                <td className="p-3">
                  <button className="rounded bg-[#EEF5FF] px-2 py-1 text-xs font-bold text-[#1D4ED8]">Send Reminder</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
