import { MessageCircle } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Panel, StatusChip, sendClassTeacherCommunication } from "../shared";
import { useClassTeacherCommunication, useResolvedClassTeacherStreamId } from "@/lib/data/class-teacher-hooks";
import { usePermissions } from "@/components/providers/permission-context";
import { Modal } from "@/components/ui/modal";

type ComposerMode = "class_announcement" | "individual_parent";

function CreateAnnouncementModal({ mode, onClose }: { mode: ComposerMode; onClose: () => void }) {
  const [submitting, setSubmitting] = useState(false);
  const isIndividual = mode === "individual_parent";

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
            <label className="block text-sm font-bold text-[#071D49] mb-1">Learner or guardian reference</label>
            <input name="learnerId" required className="w-full rounded-xl border border-[#D8E0EC] p-3 text-sm outline-none focus:border-[#071D49]" placeholder="Learner admission number, guardian name, or portal reference" />
          </div>
        ) : null}
        <div>
          <label className="block text-sm font-bold text-[#071D49] mb-1">Subject</label>
          <input name="subject" required className="w-full rounded-xl border border-[#D8E0EC] p-3 text-sm outline-none focus:border-[#071D49]" placeholder={isIndividual ? "Parent follow-up" : "Class announcement"} />
        </div>
        <div>
          <label className="block text-sm font-bold text-[#071D49] mb-1">Message</label>
          <textarea name="message" required rows={4} className="w-full rounded-xl border border-[#D8E0EC] p-3 text-sm outline-none focus:border-[#071D49]" placeholder={isIndividual ? "Write the parent message..." : "Write your announcement here..."}></textarea>
        </div>
        <div className="flex items-center gap-2">
          <input name="sendSms" type="checkbox" id="sms" className="h-4 w-4 rounded border-[#D8E0EC]" />
          <label htmlFor="sms" className="text-sm font-bold text-[#071D49]">Also send as SMS to Parents</label>
        </div>
        <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-[#D8E0EC]">
          <button type="button" onClick={onClose} className="rounded-xl px-4 py-2 text-sm font-bold text-[#64748B]">Cancel</button>
          <button disabled={submitting} type="submit" className="rounded-xl bg-[#071D49] px-6 py-2 text-sm font-black text-white">
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
  const [composerMode, setComposerMode] = useState<ComposerMode | null>(null);
  const { data, isLoading, error } = useClassTeacherCommunication(streamId);

  if (isLoading) {
    return (
      <Panel title="Parent Communication" description="Message history with parents of learners in your class." icon={MessageCircle}>
        <div className="flex justify-center p-12"><div className="h-8 w-8 animate-spin rounded-full border-4 border-[#1D4ED8] border-t-transparent"></div></div>
      </Panel>
    );
  }

  if (error || !data) {
    return (
      <Panel title="Parent Communication" description="Message history with parents of learners in your class." icon={MessageCircle}>
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-700 font-bold">Failed to load communication records.</div>
      </Panel>
    );
  }

  return (
    <Panel title="Parent Communication" description="Message history with parents of learners in your class." icon={MessageCircle}>
      <div className="mb-4 flex gap-2 justify-end">
         {hasPermission('school_communication:write') && (
           <button type="button" onClick={() => setComposerMode("class_announcement")} className="rounded-lg bg-[#071D49] px-4 py-2 text-sm font-black text-white">Add Class Announcement</button>
         )}
         <button type="button" className="rounded-lg bg-[#1D4ED8] px-4 py-2 text-sm font-black text-white" onClick={() => setComposerMode("individual_parent")}>Send Individual Message</button>
      </div>
      <div className="overflow-hidden rounded-xl border border-[#D8E0EC]">
        <table className="w-full text-left text-sm text-[#071D49]">
          <thead className="bg-[#F8FAFC]">
            <tr>
              <th className="p-3 font-semibold">Date</th>
              <th className="p-3 font-semibold">Recipient</th>
              <th className="p-3 font-semibold">Type</th>
              <th className="p-3 font-semibold">Message</th>
              <th className="p-3 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D8E0EC]">
            {(Array.isArray(data) ? data : []).map((row: any) => (
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
      {composerMode && <CreateAnnouncementModal mode={composerMode} onClose={() => setComposerMode(null)} />}
    </Panel>
  );
}
