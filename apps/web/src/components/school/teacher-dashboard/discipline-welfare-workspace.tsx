import { ShieldAlert, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Panel, RecordTable } from "./shared-components";
import { TeacherAction, TeacherView } from "./types";
import { useLiveTenantSession } from "@/hooks/use-live-tenant-session";
import { fetchDisciplineConcernsLive, raiseDisciplineConcernLive, fetchClassRegisterOverviewLive } from "@/lib/modules/teacher-live";
import { useQueryClient } from "@tanstack/react-query";
import { usePermissions } from "@/components/providers/permission-context";
import { Modal } from "@/components/ui/modal";
import { openPrintDocument } from "@/lib/dashboard/export";

function RaiseConcernModal({ onClose, liveSession }: { onClose: () => void, liveSession: any }) {
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [studentId, setStudentId] = useState("");
  const [concernType, setConcernType] = useState("");
  const [description, setDescription] = useState("");
  const queryClient = useQueryClient();

  const { data: registerData } = useQuery({
    queryKey: ["class-register-overview", liveSession.session?.tenantId, liveSession.session?.user.user_id],
    queryFn: () => fetchClassRegisterOverviewLive(liveSession.session!),
    enabled: !!liveSession.session,
  });

  const students = registerData?.students || [];

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError(null);
    try {
      await raiseDisciplineConcernLive(liveSession.session!, {
        studentId,
        concernType,
        description,
        severity: concernType === 'welfare' ? 'high' : 'medium'
      });
      queryClient.invalidateQueries({ queryKey: ["discipline-concerns"] });
      onClose();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "The concern could not be submitted.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal title="Raise Concern / Infraction" open={true} onClose={onClose} size="md">
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        {submitError ? (
          <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-800">
            {submitError}
          </div>
        ) : null}
        <div>
          <label className="block text-sm font-bold text-[#071D49] mb-1">Learner</label>
          <select required value={studentId} onChange={(e) => setStudentId(e.target.value)} className="w-full rounded-xl border border-[#D8E0EC] p-3 text-sm outline-none focus:border-[#071D49]">
            <option value="">Select learner...</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>{s.name} ({s.className})</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-bold text-[#071D49] mb-1">Concern Type</label>
          <select required value={concernType} onChange={(e) => setConcernType(e.target.value)} className="w-full rounded-xl border border-[#D8E0EC] p-3 text-sm outline-none focus:border-[#071D49]">
            <option value="">Select type...</option>
            <option value="attendance">Attendance Issue</option>
            <option value="academic">Academic Decline</option>
            <option value="behavior">Behavior / Minor Infraction</option>
            <option value="welfare">Welfare / Counseling Need</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-bold text-[#071D49] mb-1">Description</label>
          <textarea required value={description} onChange={(e) => setDescription(e.target.value)} rows={4} className="w-full rounded-xl border border-[#D8E0EC] p-3 text-sm outline-none focus:border-[#071D49]" placeholder="Describe the incident or concern..."></textarea>
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

  const openConcernStatus = (concern: NonNullable<typeof data>[number]) => {
    openPrintDocument({
      eyebrow: "Teacher welfare",
      title: "Concern Status",
      subtitle: `${concern.learner} | ${concern.className}`,
      rows: [
        { label: "Date", value: concern.date || "-" },
        { label: "Learner", value: concern.learner || "-" },
        { label: "Class", value: concern.className || "-" },
        { label: "Concern type", value: concern.type || "-" },
        { label: "Severity", value: concern.severity || "-" },
        { label: "Sent to", value: concern.sentTo || "-" },
        { label: "Status", value: concern.status || "-" },
      ],
      footer: "Concern follow-up must remain visible to the reporting teacher and the assigned school support roles.",
    });
  };

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
    <button key={concern.id + 'btn'} type="button" onClick={() => openConcernStatus(concern)} className="text-[#1D4ED8] hover:underline font-bold">View Status</button>
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
      {isModalOpen && <RaiseConcernModal onClose={() => setIsModalOpen(false)} liveSession={liveSession} />}
    </Panel>
  );
}
