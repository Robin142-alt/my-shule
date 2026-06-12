import { ShieldAlert, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Panel, RecordTable } from "./shared-components";
import { TeacherAction, TeacherView } from "./types";
import { useLiveTenantSession } from "@/hooks/use-live-tenant-session";
import { fetchDisciplineConcernsLive } from "@/lib/modules/teacher-live";

export function DisciplineWelfareWorkspace({
  onStartAction,
}: {
  onStartAction: (action: TeacherAction, view: TeacherView, message: string) => void;
}) {
  const liveSession = useLiveTenantSession("school");
  
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
        <button type="button" onClick={() => onStartAction("concern", "discipline-welfare", "Concern form ready.")} className="rounded-xl bg-[#071D49] px-4 py-2 text-sm font-black text-white">Raise Concern</button>
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
    </Panel>
  );
}
