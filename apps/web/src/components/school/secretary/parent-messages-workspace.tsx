"use client";
import { useState } from "react";
import { MessageSquare, Mail, Reply, Eye } from "lucide-react";
import { toast } from "sonner";
import { Panel, StatusChip, Tone } from "./shared";
import { useSchoolQuery } from "@/lib/data/school-hooks";
import { markMessageRead, replyToMessage } from "./api-client";

type MessageRecord = {
  id: string;
  parent_name: string;
  student_name: string;
  class: string;
  subject: string;
  message_preview: string;
  channel: string;
  received_at: string;
  is_read: boolean;
  is_replied: boolean;
  priority: string;
};

type MessagesData = {
  metrics: {
    total_messages: number;
    unread: number;
    replied: number;
    high_priority: number;
  };
  messages: MessageRecord[];
};

export function ParentMessagesWorkspace() {
  const { data, isLoading, refetch } = useSchoolQuery<MessagesData>('/admin-command/secretary/parent-messages');
  const [actionId, setActionId] = useState<string | null>(null);

  const messages = data?.messages || [];
  const metrics = data?.metrics;

  const getPriorityTone = (priority: string): Tone => {
    switch (priority) {
      case "High": return "danger";
      case "Medium": return "warning";
      case "Normal": return "info";
      default: return "neutral";
    }
  };

  const handleMarkRead = async (id: string) => {
    setActionId(id);
    try {
      await markMessageRead(id);
      toast.success("Message marked as read.");
      refetch();
    } catch {
      toast.error("Failed to mark message as read.");
    } finally {
      setActionId(null);
    }
  };

  const handleReply = async (id: string) => {
    const reply = window.prompt("Write the reply that should be delivered to this student's linked guardian:");
    if (reply === null) return;
    if (!reply.trim()) {
      toast.error("Reply message is required.");
      return;
    }
    setActionId(id);
    try {
      await replyToMessage(id, { reply: reply.trim() });
      toast.success("Reply delivered to the linked guardian.");
      refetch();
    } catch {
      toast.error("Failed to send reply.");
    } finally {
      setActionId(null);
    }
  };

  return (
    <Panel title="Parent Messages" description="View and respond to messages from parents and guardians." icon={MessageSquare}>
      {/* Metrics */}
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-[#64748B]"><Mail className="w-4 h-4" /> Total Messages</div>
          <div className="mt-1 text-2xl font-black text-[#071D49]">{isLoading ? "..." : metrics?.total_messages || 0}</div>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <div className="text-sm font-semibold text-amber-700">Unread</div>
          <div className="mt-1 text-2xl font-black text-amber-700">{isLoading ? "..." : metrics?.unread || 0}</div>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <div className="text-sm font-semibold text-emerald-700">Replied</div>
          <div className="mt-1 text-2xl font-black text-emerald-700">{isLoading ? "..." : metrics?.replied || 0}</div>
        </div>
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
          <div className="text-sm font-semibold text-rose-700">High Priority</div>
          <div className="mt-1 text-2xl font-black text-rose-700">{isLoading ? "..." : metrics?.high_priority || 0}</div>
        </div>
      </div>

      {/* Messages Table */}
      <div className="overflow-x-auto rounded-xl border border-[#D8E0EC]">
        <table className="w-full text-sm text-left whitespace-nowrap">
          <thead className="bg-[#F8FAFC] text-[#071D49]">
            <tr>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Priority</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Parent</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Student</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Class</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Subject</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Channel</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Received</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Status</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC] text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D8E0EC]">
            {isLoading ? (
              <tr><td colSpan={9} className="px-4 py-8 text-center text-[#64748B]">Loading messages...</td></tr>
            ) : messages.length === 0 ? (
              <tr><td colSpan={9} className="px-4 py-8 text-center text-[#64748B]">No parent messages received. Messages from parents via SMS, email, or the portal will appear here.</td></tr>
            ) : (
              messages.map((msg) => (
                <tr key={msg.id} className={`hover:bg-[#F8FAFC] ${!msg.is_read ? "bg-blue-50/30" : ""}`}>
                  <td className="px-4 py-3"><StatusChip label={msg.priority} tone={getPriorityTone(msg.priority)} /></td>
                  <td className="px-4 py-3 font-medium text-[#071D49]">{msg.parent_name}</td>
                  <td className="px-4 py-3 text-[#64748B]">{msg.student_name}</td>
                  <td className="px-4 py-3 text-[#64748B]">{msg.class}</td>
                  <td className="px-4 py-3 text-[#64748B] max-w-[200px] truncate">{msg.subject}</td>
                  <td className="px-4 py-3 text-[#64748B]">{msg.channel}</td>
                  <td className="px-4 py-3 text-[#64748B]">{msg.received_at}</td>
                  <td className="px-4 py-3">
                    <StatusChip
                      label={msg.is_replied ? "Replied" : msg.is_read ? "Read" : "Unread"}
                      tone={msg.is_replied ? "success" : msg.is_read ? "info" : "warning"}
                    />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {!msg.is_read && (
                        <button disabled={actionId === msg.id} onClick={() => handleMarkRead(msg.id)} className="inline-flex items-center gap-1 rounded-lg border border-[#D8E0EC] bg-white px-3 py-1.5 text-xs font-bold text-[#071D49] hover:bg-[#F8FAFC] disabled:opacity-50">
                          <Eye className="w-3 h-3" /> Read
                        </button>
                      )}
                      {!msg.is_replied && (
                        <button disabled={actionId === msg.id} onClick={() => handleReply(msg.id)} className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50">
                          <Reply className="w-3 h-3" /> Reply
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
