// @ts-nocheck
"use client";

import { useState } from "react";
import { MessageSquare, Settings, FileText, Send, CheckCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useSchoolMutation } from "@/lib/data/school-hooks";

export function UtilitiesWorkspace() {
  const [activeTab, setActiveTab] = useState("broadcast");
  const [message, setMessage] = useState("");
  const [recipient, setRecipient] = useState("all-parents");
  const [phone, setPhone] = useState("");

  const sendSmsMutation = useSchoolMutation({
    endpoint: '/api/communication/sms',
    method: 'POST',
    onSuccess: () => {
      alert("Message sent successfully!");
      setMessage("");
      setPhone("");
    }
  });

  const handleSendBroadcast = () => {
    if (!message) return;
    
    // In a real scenario we'd resolve the target group to actual phone numbers.
    // For this demonstration, we just fire the mutation with the provided phone or a dummy.
    sendSmsMutation.mutate({
      recipientPhone: phone || "+254700000000",
      message: message
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900 tracking-tight">Utilities & Settings</h2>
          <p className="text-sm text-slate-500 mt-1">Manage broadcasts, report templates, and class settings.</p>
        </div>
      </div>

      <div className="flex gap-2 border-b border-slate-200">
        <button 
          className={`pb-2 px-1 text-sm font-medium transition-colors ${activeTab === 'broadcast' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
          onClick={() => setActiveTab('broadcast')}
        >
          SMS Broadcasts
        </button>
        <button 
          className={`pb-2 px-1 text-sm font-medium transition-colors ${activeTab === 'reports' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
          onClick={() => setActiveTab('reports')}
        >
          Report Templates
        </button>
        <button 
          className={`pb-2 px-1 text-sm font-medium transition-colors ${activeTab === 'settings' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
          onClick={() => setActiveTab('settings')}
        >
          Class Settings
        </button>
      </div>

      {activeTab === 'broadcast' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-6 border border-slate-200">
            <h3 className="font-medium text-slate-900 flex items-center gap-2 mb-4">
              <MessageSquare className="w-5 h-5 text-blue-500" /> New Broadcast
            </h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-500">Recipient Group</label>
                <select 
                  className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-sm mt-1"
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                >
                  <option value="all-parents">All Parents in Form 1 East</option>
                  <option value="specific">Specific Number</option>
                </select>
              </div>
              
              {recipient === 'specific' && (
                <div>
                  <label className="text-xs font-medium text-slate-500">Phone Number</label>
                  <input 
                    type="tel"
                    className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-sm mt-1"
                    placeholder="e.g. +254700000000"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
              )}

              <div>
                <label className="text-xs font-medium text-slate-500 flex justify-between">
                  <span>Message Body</span>
                  <span className={message.length > 160 ? "text-amber-500" : ""}>{message.length}/160 chars</span>
                </label>
                <textarea 
                  className="flex w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm mt-1 min-h-[100px]"
                  placeholder="Type your message here..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
              </div>
              <Button 
                className="w-full gap-2 bg-blue-600 hover:bg-blue-700" 
                onClick={handleSendBroadcast}
                disabled={!message || sendSmsMutation.isPending}
              >
                <Send className="w-4 h-4" /> {sendSmsMutation.isPending ? 'Sending...' : 'Send SMS'}
              </Button>
            </div>
          </Card>

          <Card className="p-6 border border-slate-200 bg-slate-50/50">
            <h3 className="font-medium text-slate-900 mb-4">Recent Broadcasts</h3>
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="p-3 bg-white rounded-lg border border-slate-200">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded">Form 1 East Parents</span>
                    <span className="text-xs text-slate-400">Yesterday, 4:30 PM</span>
                  </div>
                  <p className="text-sm text-slate-600 line-clamp-2">
                    Reminder: Tomorrow is sports day. Please ensure students come in full sports attire.
                  </p>
                  <div className="flex items-center gap-1 mt-2 text-xs text-emerald-600 font-medium">
                    <CheckCircle className="w-3 h-3" /> Delivered to 45 recipients
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'reports' && (
        <Card className="p-8 border border-slate-200 text-center border-dashed">
          <FileText className="w-8 h-8 text-slate-300 mx-auto mb-3" />
          <h3 className="font-medium text-slate-900">Report Templates</h3>
          <p className="text-sm text-slate-500 mt-1 mb-4">Customize the layout and comments section for report cards.</p>
          <Button variant="outline">Manage Templates</Button>
        </Card>
      )}

      {activeTab === 'settings' && (
        <Card className="p-8 border border-slate-200 text-center border-dashed">
          <Settings className="w-8 h-8 text-slate-300 mx-auto mb-3" />
          <h3 className="font-medium text-slate-900">Class Settings</h3>
          <p className="text-sm text-slate-500 mt-1 mb-4">Configure default behaviors, notification preferences, and display options.</p>
          <Button variant="outline">Edit Settings</Button>
        </Card>
      )}
    </div>
  );
}

