"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table } from "@/components/ui/table";
import { Send, History } from "lucide-react";

export function AdmissionsCommunicationWorkspace({ dataset }: { dataset?: any }) {
  const [messages, setMessages] = useState<{ id: string; date: string; audience: string; content: string }[]>([]);
  
  const handleSend = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newMessage = {
      id: Math.random().toString(36).substr(2, 9),
      date: new Date().toLocaleDateString(),
      audience: formData.get("audience") as string,
      content: formData.get("content") as string,
    };
    setMessages([newMessage, ...messages]);
    e.currentTarget.reset();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white">Communication Hub</h2>
          <p className="text-white/60 text-sm">Bulk SMS and email center for admission updates</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <Card className="border border-white/10 bg-white/5 p-6">
            <h3 className="text-lg font-bold text-white mb-4">New Broadcast</h3>
            <form onSubmit={handleSend} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-white/80">Target Audience</label>
                <select name="audience" required className="w-full bg-slate-900 border border-white/10 rounded p-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500">
                  <option value="All Applicants">All Applicants</option>
                  <option value="Interview Pending">Interview Pending</option>
                  <option value="Accepted">Accepted Candidates</option>
                  <option value="Waitlisted">Waitlisted Candidates</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-white/80">Message Content</label>
                <textarea name="content" required rows={4} className="w-full bg-slate-900 border border-white/10 rounded p-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder:text-white/30" placeholder="Type your message here..."></textarea>
              </div>
              <Button type="submit" className="w-full gap-2">
                <Send className="h-4 w-4" />
                Send Broadcast
              </Button>
            </form>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Card className="border border-white/10 bg-white/5 p-6 h-full">
            <div className="flex items-center gap-2 mb-4">
              <History className="h-5 w-5 text-white/50" />
              <h3 className="text-lg font-bold text-white">Broadcast History</h3>
            </div>
            <Table
              columns={["Date", "Audience", "Message Snippet", "Status"]}
              data={messages}
              renderRow={(msg) => (
                <tr key={msg.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                  <td className="p-3 text-sm text-white/70">{msg.date}</td>
                  <td className="p-3 text-sm text-white font-medium">{msg.audience}</td>
                  <td className="p-3 text-sm text-white/70 truncate max-w-[200px]">{msg.content}</td>
                  <td className="p-3 text-sm text-green-400 font-medium">Sent</td>
                </tr>
              )}
              emptyState={
                <div className="py-12 text-center text-white/50">
                  No broadcasts sent yet.
                </div>
              }
            />
          </Card>
        </div>
      </div>
    </div>
  );
}
