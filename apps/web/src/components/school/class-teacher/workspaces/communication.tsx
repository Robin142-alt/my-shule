import { MessageCircle } from "lucide-react";
import { useState } from "react";
import { Panel, StatusChip } from "../shared";
import { useClassTeacherCommunication } from "@/lib/data/class-teacher-hooks";
import { usePermissions } from "@/components/providers/permission-context";
import { Modal } from "@/components/ui/modal";
import { requestDashboardApi } from "@/lib/dashboard/api-client";
import { toast } from "sonner";

function CreateAnnouncementModal({ onClose }: { onClose: () => void }) {
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const formData = new FormData(e.target as HTMLFormElement);
    try {
      await requestDashboardApi("/api/academic/communications", {
        method: "POST",
        body: JSON.stringify({
          message: formData.get("message"),
          sendSms: formData.get("sendSms") === "on",
        }),
      });
      toast.success("Announcement published successfully.");
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to publish announcement.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal title="Add Class Announcement" open={true} onClose={onClose} size="md">
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        <div>
          <label className="block text-sm font-bold text-[#071D49] mb-1">Message</label>
          <textarea name="message" required rows={4} className="w-full rounded-xl border border-[#D8E0EC] p-3 text-sm outline-none focus:border-[#071D49]" placeholder="Write your announcement here..."></textarea>
        </div>
        <div className="flex items-center gap-2">
          <input name="sendSms" type="checkbox" id="sms" className="h-4 w-4 rounded border-[#D8E0EC]" />
          <label htmlFor="sms" className="text-sm font-bold text-[#071D49]">Also send as SMS to Parents</label>
        </div>
        <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-[#D8E0EC]">
          <button type="button" onClick={onClose} className="rounded-xl px-4 py-2 text-sm font-bold text-[#64748B]">Cancel</button>
          <button disabled={submitting} type="submit" className="rounded-xl bg-[#071D49] px-6 py-2 text-sm font-black text-white">
            {submitting ? "Publishing..." : "Publish Announcement"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export function CommunicationWorkspace() {
  const streamId = "stream_123";
  const { hasPermission } = usePermissions();
  const [isModalOpen, setIsModalOpen] = useState(false);
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
           <button onClick={() => setIsModalOpen(true)} className="rounded-lg bg-[#071D49] px-4 py-2 text-sm font-black text-white">Add Class Announcement</button>
         )}
         <button className="rounded-lg bg-[#1D4ED8] px-4 py-2 text-sm font-black text-white">Send Individual Message</button>
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
      {isModalOpen && <CreateAnnouncementModal onClose={() => setIsModalOpen(false)} />}
    </Panel>
  );
}
