import { WorkspaceRetry } from "@/components/school/workspace-retry";
import { useState } from "react";
import { ShieldAlert } from "lucide-react";
import { Panel, StatusChip } from "../shared";
import { useClassTeacherDiscipline, useClassTeacherRegister, useReportDisciplineIncident, useResolvedClassTeacherStreamId } from "@/lib/data/class-teacher-hooks";

export function DisciplineWorkspace() {
  const { streamId } = useResolvedClassTeacherStreamId();
  const { data, isLoading, error, refetch } = useClassTeacherDiscipline(streamId);
  const { data: registerData, isLoading: isRegisterLoading } = useClassTeacherRegister(streamId);
  const reportMutation = useReportDisciplineIncident();
  
  const [showForm, setShowForm] = useState(false);
  const [selectedLearnerId, setSelectedLearnerId] = useState("");
  const [issue, setIssue] = useState("");
  const [severity, setSeverity] = useState("low");
  const learners = Array.isArray(registerData) ? registerData : [];

  if (isLoading) {
    return (
      <Panel title="Discipline & Behaviour" description="Track discipline issues originating from your class." icon={ShieldAlert}>
        <div className="flex justify-center p-12"><div className="h-8 w-8 animate-spin rounded-full border-4 border-info border-t-transparent"></div></div>
      </Panel>
    );
  }

  if (error || !data) {
    return (
      <Panel title="Discipline & Behaviour" description="Track discipline issues originating from your class." icon={ShieldAlert}>
        <div className="rounded-xl border border-danger-border bg-danger-soft p-4 text-danger font-bold">Failed to load discipline records.</div>
        <WorkspaceRetry onRetry={() => refetch()} />
      </Panel>
    );
  }

  const handleReport = () => {
    if (!selectedLearnerId || !issue.trim()) return;

    reportMutation.mutate({
      streamId,
      payload: {
        studentId: selectedLearnerId,
        description: issue.trim(),
        severity
      }
    }, {
      onSuccess: () => {
        setShowForm(false);
        setSelectedLearnerId("");
        setIssue("");
        setSeverity("low");
      }
    });
  };

  return (
    <Panel title="Discipline & Behaviour" description="Track discipline issues originating from your class." icon={ShieldAlert}>
      <div className="mb-4 flex justify-end">
         <button onClick={() => setShowForm(!showForm)} className="rounded-lg bg-info px-4 py-2 text-sm font-black text-white">
           {showForm ? "Cancel" : "Log New Incident"}
         </button>
      </div>

      {reportMutation.isSuccess && <div className="mb-4 rounded border border-success-border bg-success-soft p-2 text-sm text-success font-bold">Discipline incident reported successfully!</div>}

      {showForm && (
        <div className="mb-6 rounded-xl border border-border bg-surface-muted p-4">
          <h3 className="mb-4 font-bold text-foreground">New Discipline Incident</h3>
          <div className="flex flex-col gap-4">
            <label className="flex flex-col gap-1 text-xs font-black uppercase tracking-wide text-[#4B5563]">
              Learner
              <select className="rounded border border-border bg-white p-2 text-sm normal-case text-foreground" value={selectedLearnerId} onChange={e => setSelectedLearnerId(e.target.value)}>
                <option value="">{isRegisterLoading ? "Loading learners..." : "Select learner"}</option>
                {learners.map((learner: any) => (
                  <option key={learner.id} value={String(learner.id)}>
                    {learner.name || learner.admissionNo || learner.id}
                  </option>
                ))}
              </select>
            </label>
            <textarea className="rounded border border-border p-2 text-sm" placeholder="Incident description" value={issue} onChange={e => setIssue(e.target.value)} />
            <select className="rounded border border-border p-2 text-sm bg-white" value={severity} onChange={e => setSeverity(e.target.value)}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
            <button onClick={handleReport} disabled={reportMutation.isPending || !selectedLearnerId || !issue.trim()} className="self-end rounded-lg bg-primary px-4 py-2 text-sm font-black text-white disabled:opacity-50">
              {reportMutation.isPending ? "Submitting..." : "Submit Report"}
            </button>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-border">
        <table className="w-full text-left text-sm text-foreground">
          <thead className="bg-surface-muted">
            <tr>
              <th className="p-3 font-semibold">Date</th>
              <th className="p-3 font-semibold">Learner</th>
              <th className="p-3 font-semibold">Issue</th>
              <th className="p-3 font-semibold">Severity</th>
              <th className="p-3 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {(Array.isArray(data) ? data : []).map((row: any) => (
              <tr key={row.id}>
                <td className="p-3">{row.date}</td>
                <td className="p-3 font-bold">{row.learner}</td>
                <td className="p-3">{row.issue}</td>
                <td className="p-3">
                  <span className={`rounded px-2 py-1 text-xs font-bold ${row.severity === 'Minor' ? 'bg-amber-100 text-warning' : 'bg-rose-100 text-danger'}`}>
                    {row.severity}
                  </span>
                </td>
                <td className="p-3"><StatusChip label={row.status} tone={row.status === 'Open' ? 'warning' : 'neutral'}/></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
