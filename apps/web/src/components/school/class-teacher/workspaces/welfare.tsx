import { useState } from "react";
import { Heart } from "lucide-react";
import { Panel, StatusChip } from "../shared";
import { useClassTeacherWelfare, useReferWelfareCase } from "@/lib/data/class-teacher-hooks";

export function WelfareWorkspace() {
  const streamId = "stream_123";
  const { data, isLoading, error } = useClassTeacherWelfare(streamId);
  const referMutation = useReferWelfareCase();
  
  const [showForm, setShowForm] = useState(false);
  const [learner, setLearner] = useState("");
  const [reason, setReason] = useState("");

  if (isLoading) {
    return (
      <Panel title="Welfare & Counselling" description="Track the well-being and welfare needs of your learners." icon={Heart}>
        <div className="flex justify-center p-12"><div className="h-8 w-8 animate-spin rounded-full border-4 border-[#1D4ED8] border-t-transparent"></div></div>
      </Panel>
    );
  }

  if (error || !data) {
    return (
      <Panel title="Welfare & Counselling" description="Track the well-being and welfare needs of your learners." icon={Heart}>
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-700 font-bold">Failed to load welfare records.</div>
      </Panel>
    );
  }

  const handleReferral = () => {
    referMutation.mutate({
      streamId,
      payload: {
        studentId: learner || "mock_student_id",
        reason
      }
    }, {
      onSuccess: () => {
        setShowForm(false);
        setLearner("");
        setReason("");
      }
    });
  };

  return (
    <Panel title="Welfare & Counselling" description="Track the well-being and welfare needs of your learners." icon={Heart}>
      <div className="mb-4 flex justify-end">
         <button onClick={() => setShowForm(!showForm)} className="rounded-lg bg-[#1D4ED8] px-4 py-2 text-sm font-black text-white">
           {showForm ? "Cancel" : "Log Welfare Concern"}
         </button>
      </div>

      {referMutation.isSuccess && <div className="mb-4 rounded border border-emerald-200 bg-emerald-50 p-2 text-sm text-emerald-700 font-bold">Welfare case referred successfully!</div>}

      {showForm && (
        <div className="mb-6 rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
          <h3 className="mb-4 font-bold text-[#071D49]">New Welfare Referral</h3>
          <div className="flex flex-col gap-4">
            <input className="rounded border border-[#D8E0EC] p-2 text-sm" placeholder="Learner Name or ID" value={learner} onChange={e => setLearner(e.target.value)} />
            <textarea className="rounded border border-[#D8E0EC] p-2 text-sm" placeholder="Reason for referral" value={reason} onChange={e => setReason(e.target.value)} />
            <button onClick={handleReferral} disabled={referMutation.isPending || !reason} className="self-end rounded-lg bg-[#071D49] px-4 py-2 text-sm font-black text-white disabled:opacity-50">
              {referMutation.isPending ? "Submitting..." : "Submit Referral"}
            </button>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-[#D8E0EC]">
        <table className="w-full text-left text-sm text-[#071D49]">
          <thead className="bg-[#F8FAFC]">
            <tr>
              <th className="p-3 font-semibold">Date</th>
              <th className="p-3 font-semibold">Learner</th>
              <th className="p-3 font-semibold">Concern</th>
              <th className="p-3 font-semibold">Priority</th>
              <th className="p-3 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D8E0EC]">
            {(Array.isArray(data) ? data : []).map((row: any) => (
              <tr key={row.id}>
                <td className="p-3">{row.date}</td>
                <td className="p-3 font-bold">{row.learner}</td>
                <td className="p-3">{row.concern}</td>
                <td className="p-3">
                  <span className={`rounded px-2 py-1 text-xs font-bold ${row.priority === 'High' ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'}`}>
                    {row.priority}
                  </span>
                </td>
                <td className="p-3"><StatusChip label={row.status} tone={row.status === 'Resolved' ? 'success' : 'warning'}/></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
