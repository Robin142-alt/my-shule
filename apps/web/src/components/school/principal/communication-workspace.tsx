"use client";
import { useState } from "react";
import { MessageSquare, Send, Users, Bell, Mail } from "lucide-react";
import { toast } from "sonner";
import { Panel, StatusChip, MetricCard, Tone } from "./shared";
import { useSchoolQuery } from "@/lib/data/school-hooks";
import { sendAnnouncement } from "./api-client";

type MessageRecord = {
  id: string;
  subject: string;
  recipient_group: string;
  channel: string;
  sent_by: string;
  sent_at: string;
  status: string;
  recipients_count: number;
};

type CommunicationData = {
  metrics: {
    total_sent_this_month: number;
    sms_sent: number;
    emails_sent: number;
    announcements: number;
  };
  messages: MessageRecord[];
};

export function CommunicationWorkspace() {
  const { data, isLoading, refetch } = useSchoolQuery<CommunicationData>('/admin-command/principal/communication');
  const [isSending, setIsSending] = useState(false);

  const messages = data?.messages || [];

  const getChannelTone = (ch: string): Tone => {
    switch (ch?.toLowerCase()) {
      case "sms": return "info";
      case "email": return "success";
      case "in-app": return "neutral";
      case "push": return "warning";
      default: return "neutral";
    }
  };

  const getStatusTone = (s: string): Tone => {
    switch (s?.toLowerCase()) {
      case "sent": case "delivered": return "success";
      case "pending": case "queued": return "warning";
      case "failed": return "danger";
      default: return "neutral";
    }
  };

  const handleSendAnnouncement = async () => {
    setIsSending(true);
    try {
      await sendAnnouncement({ subject: "General Announcement", body: "", recipients: "all" });
      await refetch();
      toast.success("Announcement sent successfully.");
    } catch {
      toast.error("Failed to send announcement.");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Panel
      title="Communication"
      description="Send announcements, messages, and track communication history."
      icon={MessageSquare}
      actions={
        <button disabled={isSending} onClick={handleSendAnnouncement} className="inline-flex items-center gap-2 rounded-lg bg-[#071D49] px-4 py-2 text-sm font-black text-white hover:bg-blue-900 transition disabled:opacity-50">
          <Send className="h-4 w-4" />
          {isSending ? "Sending…" : "New Announcement"}
        </button>
      }
    >
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <MetricCard label="Sent This Month" value={isLoading ? "…" : data?.metrics?.total_sent_this_month ?? 0} icon={MessageSquare} />
        <MetricCard label="SMS Sent" value={isLoading ? "…" : data?.metrics?.sms_sent ?? 0} icon={Bell} tone="info" />
        <MetricCard label="Emails Sent" value={isLoading ? "…" : data?.metrics?.emails_sent ?? 0} icon={Mail} tone="success" />
        <MetricCard label="Announcements" value={isLoading ? "…" : data?.metrics?.announcements ?? 0} icon={Users} />
      </div>

      <div className="overflow-x-auto rounded-xl border border-[#D8E0EC]">
        <table className="w-full text-sm text-left whitespace-nowrap">
          <thead className="bg-[#F8FAFC] text-[#071D49]">
            <tr>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Subject</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Recipients</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Channel</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Count</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Sent By</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Date</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D8E0EC]">
            {isLoading ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-[#64748B]">Loading communication history…</td></tr>
            ) : messages.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-[#64748B]">No messages sent yet. Use the New Announcement button to communicate with staff, parents, or students.</td></tr>
            ) : (
              messages.map((msg) => (
                <tr key={msg.id} className="hover:bg-[#F8FAFC]">
                  <td className="px-4 py-3 font-semibold text-[#071D49]">{msg.subject}</td>
                  <td className="px-4 py-3 text-[#64748B]">{msg.recipient_group}</td>
                  <td className="px-4 py-3"><StatusChip label={msg.channel} tone={getChannelTone(msg.channel)} /></td>
                  <td className="px-4 py-3 text-[#64748B]">{msg.recipients_count}</td>
                  <td className="px-4 py-3 text-[#64748B]">{msg.sent_by}</td>
                  <td className="px-4 py-3 text-[#64748B]">{msg.sent_at}</td>
                  <td className="px-4 py-3"><StatusChip label={msg.status} tone={getStatusTone(msg.status)} /></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
