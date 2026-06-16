"use client";

import { useState } from "react";
import { Mail, Send, Search, User } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { requestDashboardApi } from "@/lib/dashboard/api-client";
import { toast } from "sonner";

export function MessagesWorkspace() {
  const [activeThread, setActiveThread] = useState<number | null>(1);
  const [replyText, setReplyText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const threads = [
    { id: 1, sender: "Mr. J. Kamau (Math)", subject: "Algebra Worksheet", preview: "Please remember that the worksheet is due...", time: "Yesterday", unread: false },
    { id: 2, sender: "School Administration", subject: "Sports Day Sign-ups", preview: "Sign-ups for the annual sports day are now open...", time: "Mon", unread: false },
  ];

  const handleReply = async (threadId: number) => {
    if (!replyText.trim()) return;
    try {
      setIsSubmitting(true);
      const res = await requestDashboardApi("/api/student-portal/messages/reply", {
        method: "POST",
        body: JSON.stringify({ threadId, message: replyText })
      });
      if (res.success) {
        toast.success("Message sent!");
        setReplyText("");
      } else {
        toast.error(res.error || "Failed to send message");
      }
    } catch (err: any) {
      toast.error(err.message || "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 h-[calc(100vh-140px)] flex flex-col">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900 tracking-tight">Messages</h2>
          <p className="text-sm text-slate-500 mt-1">Communicate with your teachers.</p>
        </div>
        <Button className="gap-2">
          <Mail className="w-4 h-4" /> New Message
        </Button>
      </div>

      <Card className="flex-1 border border-slate-200 overflow-hidden flex flex-col md:flex-row min-h-0">
        <div className="w-full md:w-1/3 border-r border-slate-200 flex flex-col bg-white">
          <div className="p-4 border-b border-slate-100">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input type="text" placeholder="Search messages..." className="w-full h-10 pl-9 pr-3 rounded-md bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {threads.map(thread => (
              <div 
                key={thread.id} 
                className={`p-4 border-b border-slate-100 cursor-pointer transition-colors ${activeThread === thread.id ? 'bg-blue-50/50' : 'hover:bg-slate-50'}`}
                onClick={() => setActiveThread(thread.id)}
              >
                <div className="flex justify-between items-baseline mb-1">
                  <h4 className={`text-sm ${thread.unread ? 'font-semibold text-slate-900' : 'font-medium text-slate-700'}`}>{thread.sender}</h4>
                  <span className={`text-xs ${thread.unread ? 'text-blue-600 font-medium' : 'text-slate-400'}`}>{thread.time}</span>
                </div>
                <h5 className="text-xs font-medium text-slate-800 mb-1 truncate">{thread.subject}</h5>
                <p className="text-xs text-slate-500 truncate">{thread.preview}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="flex-1 flex flex-col bg-slate-50/30">
          {activeThread ? (
            <>
              <div className="p-6 border-b border-slate-200 bg-white">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">{threads.find(t => t.id === activeThread)?.subject}</h3>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-500">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-slate-900">{threads.find(t => t.id === activeThread)?.sender}</div>
                    <div className="text-xs text-slate-500">To: You</div>
                  </div>
                </div>
              </div>
              <div className="flex-1 p-6 overflow-y-auto">
                <div className="prose prose-sm max-w-none text-slate-700">
                  <p>Hello Class,</p>
                  <p>Please remember that the Algebra worksheet is due tomorrow at 8:00 AM. I have attached the reference material to the assignment portal if you need a refresher on quadratic equations.</p>
                  <p>Best,<br/>Mr. Kamau</p>
                </div>
              </div>
              <div className="p-4 border-t border-slate-200 bg-white">
                <div className="relative">
                  <textarea 
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Type your reply to Mr. Kamau..." 
                    className="w-full min-h-[100px] p-3 pr-12 rounded-md border border-slate-200 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                    disabled={isSubmitting}
                  />
                  <Button 
                    size="sm" 
                    className="absolute bottom-3 right-3 gap-2"
                    onClick={() => activeThread && handleReply(activeThread)}
                    disabled={isSubmitting || !replyText.trim() || !activeThread}
                  >
                    <Send className="w-3 h-3" /> {isSubmitting ? "Sending..." : "Reply"}
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-400">
              Select a message thread to view it here.
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
