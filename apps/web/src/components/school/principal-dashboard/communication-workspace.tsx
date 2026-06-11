"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { AlertCircle, MessageSquare, Send, Plus, Loader2 } from "lucide-react";
import { useSchoolQuery } from "@/lib/data/school-hooks";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { requestDashboardApi } from "@/lib/dashboard/api-client";

type PrincipalCommunicationData = {
  status: "active" | "degraded" | "setup_required";
  smsBalance: number;
  messagesSentToday: number;
  failedDeliveries: number;
  pendingMessages: number;
  communicationTrend: Array<{ label: string; value: number }>;
  recentBroadcasts: Array<any>;
};

export function PrincipalCommunicationWorkspace() {
  const { data, isLoading, error, refetch } = useSchoolQuery<PrincipalCommunicationData>('/admin-command/principal/communication');
  const { data: templatesData } = useSchoolQuery<any[]>('/admin-command/communication-templates');

  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const handleCreateTemplate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError("");
    const formData = new FormData(e.currentTarget);
    try {
      await requestDashboardApi('/admin-command/communication-templates', {
        method: "POST",
        body: {
          name: formData.get("name"),
          type: formData.get("type"),
          content: formData.get("content"),
        }
      });
      setIsTemplateModalOpen(false);
      refetch();
    } catch (err: any) {
      setFormError(err.message || "Failed to create template");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleArchiveTemplate = async (id: string) => {
    if (!confirm("Are you sure you want to archive this template?")) return;
    try {
      await requestDashboardApi(`/admin-command/communication-templates/${id}`, { method: "DELETE" });
      refetch();
    } catch (err: any) {
      alert(err.message || "Failed to archive template");
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-24 bg-white/5 rounded-xl border border-white/10" />
          <div className="h-64 bg-white/5 rounded-xl border border-white/10" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <Card className="border border-red-500/20 bg-red-500/10 p-6">
        <div className="flex items-center gap-3">
          <AlertCircle className="h-6 w-6 text-red-500" />
          <h2 className="text-xl font-bold text-red-500">Failed to load Communication Overview</h2>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border border-white/10 bg-white/5 p-5">
          <div className="text-sm font-semibold text-white/70">Messages Sent Today</div>
          <div className="mt-2 text-2xl font-black text-white">{data.messagesSentToday}</div>
        </Card>
        <Card className="border border-white/10 bg-white/5 p-5">
          <div className="text-sm font-semibold text-white/70">Failed Deliveries</div>
          <div className="mt-2 text-2xl font-black text-red-500">{data.failedDeliveries}</div>
        </Card>
        <Card className="border border-white/10 bg-white/5 p-5">
          <div className="text-sm font-semibold text-white/70">Pending Outbox</div>
          <div className="mt-2 text-2xl font-black text-yellow-500">{data.pendingMessages}</div>
        </Card>
        <Card className="border border-white/10 bg-white/5 p-5">
          <div className="text-sm font-semibold text-white/70">SMS Balance</div>
          <div className="mt-2 text-2xl font-black text-green-500">{data.smsBalance}</div>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border border-white/10 bg-white/5 p-6 flex flex-col h-full">
          <h2 className="text-xl font-bold text-white mb-6">Weekly Broadcast Volume</h2>
          <div className="flex-1 flex items-end gap-2 mt-4 min-h-[200px]">
            {data.communicationTrend?.map((item) => (
              <div key={item.label} className="flex-1 flex flex-col items-center gap-2 group">
                <div className="w-full relative bg-white/5 rounded-t-sm" style={{ height: "150px" }}>
                  <div 
                    className="absolute bottom-0 w-full bg-cyan-500/50 rounded-t-sm transition-all duration-500 group-hover:bg-cyan-400/60"
                    style={{ height: `${Math.min(item.value, 150)}%` }} // Max height cap for chart aesthetics
                  >
                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-medium text-white opacity-0 group-hover:opacity-100 transition-opacity">
                      {item.value}
                    </div>
                  </div>
                </div>
                <span className="text-xs text-white/50">{item.label}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="border border-white/10 bg-white/5 p-6 flex flex-col h-full">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white">Recent Broadcasts</h2>
            <button className="text-xs bg-white/10 text-white px-3 py-1.5 rounded hover:bg-white/20 transition-colors flex items-center gap-1">
              <Send className="h-3 w-3" />
              New Message
            </button>
          </div>
          
          {(!data.recentBroadcasts || data.recentBroadcasts.length === 0) ? (
            <div className="flex flex-col items-center justify-center flex-1 py-8 text-center bg-white/5 rounded-lg border border-white/5">
              <MessageSquare className="h-10 w-10 text-white/20 mb-3" />
              <p className="text-white/60">No recent broadcasts sent</p>
            </div>
          ) : (
            <div className="space-y-3 flex-1 overflow-y-auto pr-2">
              <div className="text-white/60 text-sm py-4">Broadcasts will appear here.</div>
            </div>
          )}
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border border-white/10 bg-white/5 p-6 flex flex-col h-full mt-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white">Communication Templates</h2>
            <Button size="sm" variant="outline" onClick={() => setIsTemplateModalOpen(true)}>
              <Plus className="h-4 w-4 mr-1" /> Add Template
            </Button>
          </div>
          {!templatesData || templatesData.length === 0 ? (
            <div className="text-white/60 text-sm py-4 text-center">No communication templates configured yet.</div>
          ) : (
            <div className="space-y-2">
              {templatesData.map((template: any) => (
                <div key={template.id} className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10">
                  <div>
                    <div className="font-medium text-white">{template.name}</div>
                    <div className="text-xs text-white/50">{template.type}</div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="text-red-400 border-red-500/20 hover:bg-red-500/20" onClick={() => handleArchiveTemplate(template.id)}>
                      Archive
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Modal open={isTemplateModalOpen} onClose={() => setIsTemplateModalOpen(false)} title="Create Template">
        <form onSubmit={handleCreateTemplate} className="space-y-4">
          {formError && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded text-sm">
              {formError}
            </div>
          )}
          <div className="space-y-2">
            <label className="text-sm font-medium">Name</label>
            <input name="name" required className="w-full border rounded p-2 text-sm" placeholder="e.g. Fee Reminder" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Type</label>
            <select name="type" required className="w-full border rounded p-2 text-sm bg-white text-black">
              <option value="SMS">SMS</option>
              <option value="EMAIL">Email</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Content</label>
            <textarea name="content" required className="w-full border rounded p-2 text-sm" placeholder="Message content... Use {{student_name}} for variables." />
          </div>
          <div className="pt-4 flex justify-end">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Template
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
