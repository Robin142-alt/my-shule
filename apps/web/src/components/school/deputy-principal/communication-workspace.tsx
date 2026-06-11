"use client";
import { useState, useEffect } from "react";
import { MessageSquareText } from "lucide-react";
import { Panel, StatusChip, Tone } from "./shared";
import { readSchoolData, addSchoolRecord, subscribeToSchoolDataUpdates, simulateSms } from "@/lib/school/school-operational-store";

export type CommMessage = {
  id: string;
  date: string;
  recipient: string;
  type: string;
  status: "Sent" | "Failed";
};

export function DeputyCommunicationWorkspace() {
  const [messages, setMessages] = useState<CommMessage[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ recipient: "All Staff", message: "" });

  const loadData = () => {
    const data = readSchoolData<CommMessage>("deputyCommunication");
    setMessages(data.length > 0 ? data : [
      { id: "1", date: "Today 10:00", recipient: "All Staff", type: "Staff Notice", status: "Sent" }
    ]);
  };

  useEffect(() => {
    loadData();
    const unsub = subscribeToSchoolDataUpdates(({ moduleName }) => {
      if (moduleName === "deputyCommunication") loadData();
    });
    return unsub;
  }, []);

  const handleSend = () => {
    const newMessage: CommMessage = {
      id: Math.random().toString(36).slice(2, 9),
      date: "Just Now",
      recipient: formData.recipient,
      type: "Notice",
      status: "Sent"
    };
    addSchoolRecord("deputyCommunication", newMessage);
    
    // Simulate SMS dispatch
    simulateSms({
      recipient: formData.recipient,
      message: formData.message,
      sourceModule: "communication"
    });
    
    setShowModal(false);
    setFormData({ recipient: "All Staff", message: "" });
    alert("Message queued for sending.");
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
                <td className="px-4 py-3 text-[#64748B]">{msg.date}</td>
                <td className="px-4 py-3 font-semibold text-[#071D49]">{msg.recipient}</td>
                <td className="px-4 py-3 text-[#64748B]">{msg.type}</td>
                <td className="px-4 py-3"><StatusChip label={msg.status} tone={msg.status === "Sent" ? "success" : "danger"} /></td>
                <td className="px-4 py-3 text-right">
                  <button className="text-blue-600 hover:underline font-semibold text-xs">View</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#071D49]/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-[#D8E0EC] bg-white p-6 shadow-2xl">
            <h2 className="text-xl font-bold text-[#071D49] mb-4">Compose Message</h2>
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
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setShowModal(false)} className="rounded-lg px-4 py-2 text-sm font-bold text-[#64748B] hover:bg-slate-100">Cancel</button>
              <button disabled={!formData.message} onClick={handleSend} className="rounded-lg bg-[#071D49] px-4 py-2 text-sm font-black text-white hover:bg-blue-900 disabled:opacity-50">Send Message</button>
            </div>
          </div>
        </div>
      )}
    </Panel>
  );
}