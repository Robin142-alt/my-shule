import { MessageCircle, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Panel, RecordTable } from "./shared-components";
import { TeacherAction, TeacherView } from "./types";
import { useLiveTenantSession } from "@/hooks/use-live-tenant-session";
import { fetchSentMessagesLive } from "@/lib/modules/teacher-live";

export function ParentCommunicationWorkspace({
  onStartAction,
}: {
  onStartAction: (action: TeacherAction, view: TeacherView, message: string) => void;
}) {
  const liveSession = useLiveTenantSession();
  
  const { data, isLoading, isError } = useQuery({
    queryKey: ["sent-messages", liveSession.session?.tenant_id, liveSession.session?.user.id],
    queryFn: () => fetchSentMessagesLive(liveSession.session!),
    enabled: !!liveSession.session,
  });

  const rows = data?.map(msg => [
    msg.date,
    msg.recipient,
    msg.message,
    <span key={msg.id} className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
      {msg.status}
    </span>,
  ]) || [];

  return (
    <Panel title="Parent Communication" description="Controlled communication with parents of learners you teach." icon={MessageCircle}>
      <div className="mb-4 flex flex-wrap gap-2">
        <button type="button" onClick={() => onStartAction("sms", "parent-communication", "New message form ready.")} className="rounded-xl bg-[#071D49] px-4 py-2 text-sm font-black text-white">New Message</button>
        <button type="button" className="rounded-xl border border-[#D8E0EC] px-4 py-2 text-sm font-black text-[#071D49] bg-white">Message Class Parents</button>
      </div>
      {isError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-800">
          Failed to load sent messages. Please retry.
        </div>
      ) : isLoading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-[#64748B]" /></div>
      ) : (
        <RecordTable
          columns={["Date", "Recipient", "Message", "Status"]}
          rows={rows}
          emptyState="No messages sent recently."
        />
      )}
    </Panel>
  );
}
