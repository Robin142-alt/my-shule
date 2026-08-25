import { MessageCircle, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Panel, RecordTable } from "./shared-components";
import { TeacherAction, TeacherView } from "./types";
import { useLiveTenantSession } from "@/hooks/use-live-tenant-session";
import { requestDashboardApi } from "@/lib/dashboard/api-client";
import { toast } from "sonner";

type ParentMessageRecipientOptions = {
  classes: Array<{
    class_section_id: string;
    class_name: string;
    sms_available: boolean;
  }>;
  guardians: Array<{
    guardian_id: string;
    guardian_name: string;
    student_name: string;
    class_name: string;
    sms_available: boolean;
  }>;
};

type SentParentMessage = {
  id: string;
  date: string;
  recipient: string;
  message: string;
  status: string;
};

export function ParentCommunicationWorkspace({
  onStartAction,
}: {
  onStartAction: (action: TeacherAction, view: TeacherView, message: string) => void;
}) {
  const liveSession = useLiveTenantSession("school");
  const [composerAudience, setComposerAudience] = useState<"individual_parent" | "class_parents" | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["sent-messages", liveSession.session?.tenantId, liveSession.session?.user.user_id],
    queryFn: () => requestDashboardApi<{ items: SentParentMessage[] }>("/admin-command/teacher/messages"),
    enabled: !!liveSession.session,
  });
  const recipientOptions = useQuery({
    queryKey: ["teacher-parent-message-recipients", liveSession.session?.tenantId, liveSession.session?.user.user_id],
    queryFn: () => requestDashboardApi<ParentMessageRecipientOptions>("/admin-command/teacher/message-recipients"),
    enabled: !!liveSession.session,
  });

  const rows = (data?.items || []).map(msg => [
    msg.date,
    msg.recipient,
    msg.message,
    <span key={msg.id} className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
      {msg.status}
    </span>,
  ]);

  const openComposer = (audience: "individual_parent" | "class_parents") => {
    setComposerAudience(audience);
    onStartAction("sms", "parent-communication", audience === "class_parents"
      ? "Compose a message for linked class parents."
      : "Compose a parent message for a linked learner.");
  };

  const closeComposer = () => {
    if (!isSubmitting) setComposerAudience(null);
  };

  const submitMessage = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!composerAudience || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const payload = Object.fromEntries(new FormData(event.currentTarget).entries());
      const result = await requestDashboardApi<{ message?: string }>("/admin-command/teacher/messages", {
        method: "POST",
        body: {
          audience: String(payload.audience || composerAudience),
          recipient: String(payload.recipient || "").trim(),
          subject: String(payload.subject || "").trim() || "Teacher parent communication",
          message: String(payload.message || "").trim(),
        },
      });
      toast.success(result.message || "Parent message queued for exact linked guardians.");
      setComposerAudience(null);
      refetch();
    } catch (error) {
      toast.error("Parent message was not queued", {
        description: error instanceof Error ? error.message : "The teacher communication command could not be saved.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Panel title="Parent Communication" description="Controlled communication with parents of learners you teach." icon={MessageCircle}>
      <div className="mb-4 flex flex-wrap gap-2">
        <button type="button" onClick={() => openComposer("individual_parent")} className="rounded-xl bg-[#071D49] px-4 py-2 text-sm font-black text-white">New Message</button>
        <button type="button" onClick={() => openComposer("class_parents")} className="rounded-xl border border-[#D8E0EC] px-4 py-2 text-sm font-black text-[#071D49] bg-white">Message Class Parents</button>
      </div>
      {composerAudience ? (
        <form onSubmit={submitMessage} className="mb-5 rounded-2xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
          <input type="hidden" name="audience" value={composerAudience} />
          <div className="grid gap-3 md:grid-cols-2">
            <label className="text-sm font-bold text-[#071D49]">
              Recipient
              <select name="recipient" required className="mt-1 w-full rounded-xl border border-[#D8E0EC] bg-white p-3 text-sm outline-none focus:border-[#071D49]" defaultValue="">
                <option value="" disabled>
                  {recipientOptions.isLoading
                    ? "Loading assigned recipients..."
                    : composerAudience === "class_parents"
                      ? "Select an assigned class"
                      : "Select a linked guardian"}
                </option>
                {composerAudience === "class_parents"
                  ? (recipientOptions.data?.classes || []).map((item) => (
                      <option key={item.class_section_id} value={item.class_section_id}>
                        {item.class_name}
                      </option>
                    ))
                  : (recipientOptions.data?.guardians || []).map((item) => (
                      <option key={item.guardian_id} value={item.guardian_id}>
                        {item.guardian_name} — {item.student_name} ({item.class_name})
                      </option>
                    ))}
              </select>
            </label>
            <label className="text-sm font-bold text-[#071D49]">
              Subject
              <input name="subject" className="mt-1 w-full rounded-xl border border-[#D8E0EC] bg-white p-3 text-sm outline-none focus:border-[#071D49]" placeholder="e.g. Homework follow-up" />
            </label>
          </div>
          {recipientOptions.isError ? (
            <p className="mt-3 text-sm font-semibold text-red-700">
              Assigned guardian recipients could not be loaded. Retry before sending.
            </p>
          ) : null}
          {!recipientOptions.isLoading && !recipientOptions.isError && (
            composerAudience === "class_parents"
              ? (recipientOptions.data?.classes.length ?? 0) === 0
              : (recipientOptions.data?.guardians.length ?? 0) === 0
          ) ? (
            <p className="mt-3 text-sm font-semibold text-amber-700">
              No active guardian accounts are linked to learners in your current teaching assignments.
            </p>
          ) : null}
          <label className="mt-3 block text-sm font-bold text-[#071D49]">
            Message
            <textarea name="message" required rows={4} className="mt-1 w-full rounded-xl border border-[#D8E0EC] bg-white p-3 text-sm outline-none focus:border-[#071D49]" placeholder="Write a clear parent message linked to the learner or class context." />
          </label>
          <div className="mt-4 flex justify-end gap-2">
            <button type="button" onClick={closeComposer} className="rounded-xl border border-[#D8E0EC] bg-white px-4 py-2 text-sm font-black text-[#071D49]">Cancel</button>
            <button type="submit" disabled={isSubmitting || recipientOptions.isLoading || recipientOptions.isError} className="rounded-xl bg-[#071D49] px-4 py-2 text-sm font-black text-white disabled:opacity-50">
              {isSubmitting ? "Queueing..." : "Queue Message"}
            </button>
          </div>
        </form>
      ) : null}
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
          emptyState="No messages sent yet. Use the composer above to send a class or individual parent update."
        />
      )}
    </Panel>
  );
}
