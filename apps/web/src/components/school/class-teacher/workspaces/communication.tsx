import { WorkspaceRetry } from "@/components/school/workspace-retry";
import { MessageCircle } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Panel, StatusChip, sendClassTeacherCommunication } from "../shared";
import { useClassTeacherCommunication, useClassTeacherRegister, useResolvedClassTeacherStreamId } from "@/lib/data/class-teacher-hooks";
import { usePermissions } from "@/components/providers/permission-context";
import { Modal } from "@/components/ui/modal";

type ComposerMode = "class_announcement" | "individual_parent";

type AssignedLearner = { id: string; name?: string; admissionNo?: string };
type CommunicationRecord = {
  id: string;
  date: string;
  recipient: string;
  type: string;
  message: string;
  status: string;
};

function CreateAnnouncementModal({ mode, classSectionId, learners, onClose }: {
  mode: ComposerMode;
  classSectionId: string;
  learners: AssignedLearner[];
  onClose: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const isIndividual = mode === "individual_parent";
  const fieldPrefix = `class-teacher-${mode}`;

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const formData = new FormData(e.currentTarget);
      const sent = await sendClassTeacherCommunication({
        audience: mode,
        learnerId: String(formData.get("learnerId") || "").trim() || undefined,
        subject: String(formData.get("subject") || (isIndividual ? "Parent message" : "Class announcement")),
        message: String(formData.get("message") || ""),
        classSectionId: isIndividual ? undefined : classSectionId,
        sendSms: formData.get("sendSms") === "on",
        source: "class-teacher-communication-workspace",
      });
      if (sent) onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal title={isIndividual ? "Send Parent Message" : "Add Class Announcement"} open={true} onClose={onClose} size="md">
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        {isIndividual ? (
          <div>
            <label htmlFor={`${fieldPrefix}-learner`} className="block text-sm font-bold text-foreground mb-1">Learner</label>
            <select id={`${fieldPrefix}-learner`} name="learnerId" required className="w-full rounded-xl border border-border bg-white p-3 text-sm outline-none focus:border-primary">
              <option value="">Select a learner from your assigned class</option>
              {learners.map((learner) => (
                <option key={learner.id} value={learner.id}>{learner.name || learner.admissionNo || learner.id}</option>
              ))}
            </select>
          </div>
        ) : null}
        <div>
          <label htmlFor={`${fieldPrefix}-subject`} className="block text-sm font-bold text-foreground mb-1">Subject</label>
          <input id={`${fieldPrefix}-subject`} name="subject" required className="w-full rounded-xl border border-border p-3 text-sm outline-none focus:border-primary" placeholder={isIndividual ? "Parent follow-up" : "Class announcement"} />
        </div>
        <div>
          <label htmlFor={`${fieldPrefix}-message`} className="block text-sm font-bold text-foreground mb-1">Message</label>
          <textarea id={`${fieldPrefix}-message`} name="message" required rows={4} className="w-full rounded-xl border border-border p-3 text-sm outline-none focus:border-primary" placeholder={isIndividual ? "Write the parent message..." : "Write your announcement here..."}></textarea>
        </div>
        <div className="flex items-center gap-2">
          <input name="sendSms" type="checkbox" id={`${fieldPrefix}-sms`} className="h-4 w-4 rounded border-border" />
          <label htmlFor={`${fieldPrefix}-sms`} className="text-sm font-bold text-foreground">Also send as SMS to Parents</label>
        </div>
        <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-border">
          <button type="button" onClick={onClose} className="rounded-xl px-4 py-2 text-sm font-bold text-muted">Cancel</button>
          <button disabled={submitting} type="submit" className="rounded-xl bg-primary px-6 py-2 text-sm font-black text-white">
            {submitting ? "Sending..." : isIndividual ? "Send Message" : "Publish Announcement"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export function CommunicationWorkspace() {
  const { streamId } = useResolvedClassTeacherStreamId();
  const { hasPermission } = usePermissions();
  const canWrite = hasPermission('teacher:write');
  const [composerMode, setComposerMode] = useState<ComposerMode | null>(null);
  const { data, isLoading, error, refetch } = useClassTeacherCommunication(streamId);
  const { data: registerData, isLoading: isRegisterLoading } = useClassTeacherRegister(streamId);
  const learners = (Array.isArray(registerData) ? registerData : []) as AssignedLearner[];
  const records = (Array.isArray(data) ? data : []) as CommunicationRecord[];

  if (isLoading) {
    return (
      <Panel title="Parent Communication" description="Message history with parents of learners in your class." icon={MessageCircle}>
        <div className="flex justify-center p-12"><div className="h-8 w-8 animate-spin rounded-full border-4 border-info border-t-transparent"></div></div>
      </Panel>
    );
  }

  if (error || !data) {
    return (
      <Panel title="Parent Communication" description="Message history with parents of learners in your class." icon={MessageCircle}>
        <div className="rounded-xl border border-danger-border bg-danger-soft p-4 text-danger font-bold">Failed to load communication records.</div>
        <WorkspaceRetry onRetry={() => refetch()} />
      </Panel>
    );
  }

  return (
    <Panel title="Parent Communication" description="Message history with parents of learners in your class." icon={MessageCircle}>
      <div className="mb-4 flex gap-2 justify-end">
         {canWrite && (
           <button type="button" disabled={!streamId} onClick={() => setComposerMode("class_announcement")} className="rounded-lg bg-primary px-4 py-2 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-50">Add Class Announcement</button>
         )}
         {canWrite ? (
           <button type="button" disabled={isRegisterLoading || learners.length === 0} className="rounded-lg bg-info px-4 py-2 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-50" onClick={() => setComposerMode("individual_parent")}>Send Individual Message</button>
         ) : null}
      </div>
      <div className="overflow-hidden rounded-xl border border-border">
        <table className="w-full text-left text-sm text-foreground">
          <thead className="bg-surface-muted">
            <tr>
              <th className="p-3 font-semibold">Date</th>
              <th className="p-3 font-semibold">Recipient</th>
              <th className="p-3 font-semibold">Type</th>
              <th className="p-3 font-semibold">Message</th>
              <th className="p-3 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {records.length === 0 ? (
              <tr><td colSpan={5} className="p-6 text-center text-muted">No class-teacher communications have been recorded for this assigned class.</td></tr>
            ) : records.map((row) => (
              <tr key={row.id}>
                <td className="p-3">{row.date}</td>
                <td className="p-3 font-bold">{row.recipient}</td>
                <td className="p-3">{row.type}</td>
                <td className="p-3 max-w-xs truncate">{row.message}</td>
                <td className="p-3"><StatusChip label={row.status} tone={row.status === 'Delivered' ? 'success' : 'neutral'}/></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {composerMode && <CreateAnnouncementModal mode={composerMode} classSectionId={streamId} learners={learners} onClose={() => setComposerMode(null)} />}
    </Panel>
  );
}
