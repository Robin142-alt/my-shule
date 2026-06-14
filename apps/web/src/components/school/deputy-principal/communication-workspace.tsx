"use client";
import { useState, useEffect } from "react";
import { MessageSquareText } from "lucide-react";
import { Panel, StatusChip, Tone } from "./shared";
import { Modal } from "@/components/ui/modal";
import { useSchoolQuery, useSchoolMutation } from "@/lib/data/school-hooks";

export type CommMessage = {
  id: string;
  date: string;
  recipient: string;
  type: string;
  status: "Sent" | "Failed";
};

export function DeputyCommunicationWorkspace() {
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ recipient: "All Staff", message: "" });
  const { data: smsData, isLoading, refetch } = useSchoolQuery<{ data: any[] }>('/api/communication/sms');
  const messages = smsData?.data || [];
  
  const sendMutation = useSchoolMutation(
    '/api/communication/sms',
    'POST',
    {
      onSuccess: () => {
        refetch();
        alert('Message queued for sending.');
        setShowModal(false);
        setFormData({ recipient: "All Staff", message: "" });
      }
    }
  );

  const handleSend = () => {
    sendMutation.mutate({
      recipientPhone: formData.recipient,
      message: formData.message
    });
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
            {messages.map((msg) => (
              <tr key={msg.id} className="hover:bg-[#F8FAFC]">
                <td className="px-4 py-3 text-[#64748B]">{new Date(msg.created_at).toLocaleString()}</td>
                <td className="px-4 py-3 font-semibold text-[#071D49]">{msg.recipient_phone}</td>
                <td className="px-4 py-3 text-[#64748B]">Notice</td>
                <td className="px-4 py-3"><StatusChip label={msg.status} tone={msg.status === "Sent" ? "success" : "neutral"} /></td>
                <td className="px-4 py-3 text-right">
                  <button className="text-blue-600 hover:underline font-semibold text-xs">View</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Compose Message" footer={
        <>
          <button onClick={() => setShowModal(false)} className="rounded-lg px-4 py-2 text-sm font-bold text-[#64748B] hover:bg-slate-100">Cancel</button>
          <button disabled={!formData.message} onClick={handleSend} className="rounded-lg bg-[#071D49] px-4 py-2 text-sm font-black text-white hover:bg-blue-900 disabled:opacity-50">Send Message</button>
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
    </Panel>
  );
}