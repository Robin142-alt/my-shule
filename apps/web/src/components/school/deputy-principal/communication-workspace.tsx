"use client";
import { useState } from "react";
import { MessageSquareText } from "lucide-react";
import { Panel, StatusChip } from "./shared";
import { Modal } from "@/components/ui/modal";
import { useSchoolQuery } from "@/lib/data/school-hooks";
import { toast } from "sonner";
import { requestDashboardApi } from "@/lib/dashboard/api-client";

export type CommMessage = {
  id: string;
  created_at: string;
  recipient_phone: string;
  status: "Sent" | "Failed";
  content?: string;
};

export function DeputyCommunicationWorkspace() {
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ recipient: "All Staff", message: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { data: smsData, isLoading, refetch } = useSchoolQuery<{ data: CommMessage[] }>('/api/communication/sms');
  const messages = smsData?.data || [];

  const [viewingMessage, setViewingMessage] = useState<CommMessage | null>(null);

  const handleSend = async () => {
    try {
      setIsSubmitting(true);
      await requestDashboardApi('/api/communication/sms', {
        method: 'POST',
        body: {
          recipientPhone: formData.recipient,
          message: formData.message
        }
      });
      toast.success('Message queued for sending.');
      setShowModal(false);
      setFormData({ recipient: "All Staff", message: "" });
      refetch();
    } catch (e) {
      toast.error('Failed to send message.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Panel title="Communication" description="Send staff notices, parent messages, and announcements." icon={MessageSquareText} actions={
      <button onClick={() => setShowModal(true)} className="rounded-lg bg-[#071D49] px-4 py-2 text-sm font-black text-white hover:bg-blue-900 transition">Compose Message</button>
    }>
      <div className="overflow-x-auto rounded-xl border border-[#D8E0EC]">
        <table className="w-full text-sm text-left whitespace-nowrap">
          <thead className="bg-[#F8FAFC] text-[#071D49]">
            <tr>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Date</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Recipient</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Type</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Status</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC] text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D8E0EC]">
            {messages.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-[#64748B]">No messages sent yet.</td>
              </tr>
            ) : (
              messages.map((msg) => (
                <tr key={msg.id} className="hover:bg-[#F8FAFC]">
                  <td className="px-4 py-3 text-[#64748B]">{new Date(msg.created_at).toLocaleString()}</td>
                  <td className="px-4 py-3 font-semibold text-[#071D49]">{msg.recipient_phone}</td>
                  <td className="px-4 py-3 text-[#64748B]">Notice</td>
                  <td className="px-4 py-3"><StatusChip label={msg.status} tone={msg.status === "Sent" ? "success" : "neutral"} /></td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => setViewingMessage(msg)} className="text-blue-600 hover:underline font-semibold text-xs">View</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Compose Message" footer={
        <>
          <button onClick={() => setShowModal(false)} className="rounded-lg px-4 py-2 text-sm font-bold text-[#64748B] hover:bg-slate-100">Cancel</button>
          <button disabled={!formData.message || isSubmitting} onClick={handleSend} className="rounded-lg bg-[#071D49] px-4 py-2 text-sm font-black text-white hover:bg-blue-900 disabled:opacity-50">
            {isSubmitting ? "Sending..." : "Send Message"}
          </button>
        </>
      }>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-bold text-[#334155]">Recipient Group</label>
            <select value={formData.recipient} onChange={(e) => setFormData({...formData, recipient: e.target.value})} className="mt-1 w-full rounded-xl border border-[#D8E0EC] p-2 text-sm focus:border-blue-500 focus:outline-none">
              <option>All Staff</option>
              <option>Parents (All)</option>
              <option>Form 4 Parents</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-bold text-[#334155]">Message Body</label>
            <textarea value={formData.message} onChange={(e) => setFormData({...formData, message: e.target.value})} className="mt-1 h-24 w-full rounded-xl border border-[#D8E0EC] p-2 text-sm focus:border-blue-500 focus:outline-none"></textarea>
          </div>
        </div>
      </Modal>

      {viewingMessage && (
        <Modal open={true} onClose={() => setViewingMessage(null)} title="Message Details" footer={
          <button onClick={() => setViewingMessage(null)} className="rounded-lg bg-[#071D49] px-4 py-2 text-sm font-black text-white hover:bg-blue-900 transition">Close</button>
        }>
          <div className="space-y-4">
            <div>
              <span className="text-xs font-bold text-[#64748B] uppercase">Sent To</span>
              <div className="font-semibold text-[#071D49]">{viewingMessage.recipient_phone}</div>
            </div>
            <div>
              <span className="text-xs font-bold text-[#64748B] uppercase">Date & Time</span>
              <div className="text-[#334155]">{new Date(viewingMessage.created_at).toLocaleString()}</div>
            </div>
            <div>
              <span className="text-xs font-bold text-[#64748B] uppercase">Status</span>
              <div className="mt-1"><StatusChip label={viewingMessage.status} tone={viewingMessage.status === "Sent" ? "success" : "neutral"} /></div>
            </div>
            <div className="rounded-lg bg-slate-50 p-4 border border-slate-200">
              <p className="text-sm text-slate-800 whitespace-pre-wrap">{viewingMessage.content || "No content provided by gateway."}</p>
            </div>
          </div>
        </Modal>
      )}
    </Panel>
  );
}