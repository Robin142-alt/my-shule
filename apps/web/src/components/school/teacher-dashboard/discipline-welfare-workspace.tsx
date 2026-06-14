import { ShieldAlert, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Panel, RecordTable } from "./shared-components";
import { TeacherAction, TeacherView } from "./types";
import { useLiveTenantSession } from "@/hooks/use-live-tenant-session";
import { fetchDisciplineConcernsLive } from "@/lib/modules/teacher-live";
import { usePermissions } from "@/components/providers/permission-context";
import { Modal } from "@/components/ui/modal";

function RaiseConcernModal({ onClose }: { onClose: () => void }) {
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      onClose();
    }, 1000);
  };

  return (
    <Modal title="Raise Concern / Infraction" open={true} onClose={onClose} size="md">
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        <div>
          <label className="block text-sm font-bold text-[#071D49] mb-1">Learner</label>
          <select required className="w-full rounded-xl border border-[#D8E0EC] p-3 text-sm outline-none focus:border-[#071D49]">
            <option value="">Select learner...</option>
            <option value="stu1">Brian Otieno (Form 2 Blue)</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-bold text-[#071D49] mb-1">Concern Type</label>
          <select required className="w-full rounded-xl border border-[#D8E0EC] p-3 text-sm outline-none focus:border-[#071D49]">
            <option value="">Select type...</option>
            <option value="attendance">Attendance Issue</option>
            <option value="academic">Academic Decline</option>
            <option value="behavior">Behavior / Minor Infraction</option>
            <option value="welfare">Welfare / Counseling Need</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-bold text-[#071D49] mb-1">Description</label>
          <textarea required rows={4} className="w-full rounded-xl border border-[#D8E0EC] p-3 text-sm outline-none focus:border-[#071D49]" placeholder="Describe the incident or concern..."></textarea>
        </div>
        <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-[#D8E0EC]">
          <button type="button" onClick={onClose} className="rounded-xl px-4 py-2 text-sm font-bold text-[#64748B]">Cancel</button>
          <button disabled={submitting} type="submit" className="rounded-xl bg-[#071D49] px-6 py-2 text-sm font-black text-white">
            {submitting ? "Submitting..." : "Submit Concern"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export function DisciplineWelfareWorkspace({
  onStartAction,
}: {
  onStartAction: (action: TeacherAction, view: TeacherView, message: string) => void;
}) {
  const liveSession = useLiveTenantSession("school");
  const { hasPermission } = usePermissions();
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const { data, isLoading, isError } = useQuery({
    queryKey: ["discipline-concerns", liveSession.session?.tenantId, liveSession.session?.user.user_id],
    queryFn: () => fetchDisciplineConcernsLive(liveSession.session!),
    enabled: !!liveSession.session,
  });

  const rows = data?.map(concern => [
    concern.date,
    concern.learner,
    concern.className,
    concern.type,
    concern.severity === 'high' ? (
      <span key={concern.id + 'sev'} className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800">High</span>
    ) : concern.severity === 'medium' ? (
      <span key={concern.id + 'sev'} className="inline-flex items-center rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-medium text-orange-800">Medium</span>
    ) : (
      <span key={concern.id + 'sev'} className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">{concern.severity}</span>
    ),
    concern.sentTo,
    <span key={concern.id + 'status'} className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800">{concern.status}</span>,
    <button key={concern.id + 'btn'} className="text-[#1D4ED8] hover:underline font-bold">View Status</button>
  ]) || [];

  return (
    <Panel title="Discipline & Welfare" description="Raise incidents and concerns to the relevant authorities." icon={ShieldAlert}>
      <div className="mb-4">
        {hasPermission('school_discipline:write') && (
          <button type="button" onClick={() => setIsModalOpen(true)} className="rounded-xl bg-[#071D49] px-4 py-2 text-sm font-black text-white">Raise Concern</button>
        )}
      </div>
      {isError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-800">
          Failed to load concerns. Please retry.
        </div>
      ) : isLoading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-[#64748B]" /></div>
      ) : (
        <RecordTable
          columns={["Date", "Learner", "Class", "Concern Type", "Severity", "Sent To", "Status", "Actions"]}
          rows={rows}
          emptyState="No active concerns raised by you."
        />
      )}
      {isModalOpen && <RaiseConcernModal onClose={() => setIsModalOpen(false)} />}
    </Panel>
  );
}
