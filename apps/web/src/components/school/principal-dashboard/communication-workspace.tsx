"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { AlertCircle, MessageSquare, Send, Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useSchoolQuery } from "@/lib/data/school-hooks";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { useVerifiedPrincipalDashboardApi } from "./verified-tenant-api";
import { usePermissions } from "@/components/providers/permission-context";

type PrincipalCommunicationData = {
  status: "active" | "degraded" | "setup_required";
  smsBalance: number | null;
  providerAcceptedToday: number;
  failedDeliveries: number;
  pendingMessages: number;
  deliveryUnknown: number;
  communicationTrend: Array<{ label: string; value: number }>;
  recentBroadcasts: Array<{
    id: string;
    title: string;
    body: string;
    status: string;
    audience?: string | null;
    channels?: string[] | null;
    time: string;
  }>;
};

export function PrincipalCommunicationWorkspace() {
  const { data, isLoading, error, refetch } = useSchoolQuery<PrincipalCommunicationData>('/admin-command/principal/communication');
  const requestPrincipalApi = useVerifiedPrincipalDashboardApi();
  const { data: templatesData } = useSchoolQuery<any[]>('/admin-command/communication-templates');
  const { hasPermission } = usePermissions();

  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const [isBroadcastModalOpen, setIsBroadcastModalOpen] = useState(false);
  const [isSubmittingBroadcast, setIsSubmittingBroadcast] = useState(false);
  const [broadcastFormError, setBroadcastFormError] = useState("");
  const [broadcastAudience, setBroadcastAudience] = useState("parents");

  const handleCreateTemplate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError("");
    const formData = new FormData(e.currentTarget);
    try {
      await requestPrincipalApi('/admin-command/communication-templates', {
        method: "POST",
        body: {
          name: formData.get("name"),
          type: formData.get("type"),
          body: formData.get("content"),
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

  const handleCreateBroadcast = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmittingBroadcast(true);
    setBroadcastFormError("");
    const formData = new FormData(e.currentTarget);
    const channels = [];
    if (formData.get("channel_sms") === "on") channels.push("SMS");
    if (formData.get("channel_in_app") === "on") channels.push("IN_APP");

    if (channels.length === 0) {
      setBroadcastFormError("Please select at least one channel");
      setIsSubmittingBroadcast(false);
      return;
    }

    try {
      await requestPrincipalApi('/admin-command/communication-broadcasts', {
        method: "POST",
        body: {
          audience: formData.get("audience"),
          targetClass: formData.get("targetClass"),
          message: formData.get("message"),
          channels: channels,
        }
      });
      setIsBroadcastModalOpen(false);
      refetch();
    } catch (err: any) {
      setBroadcastFormError(err.message || "Failed to send broadcast");
    } finally {
      setIsSubmittingBroadcast(false);
    }
  };

  const handleArchiveTemplate = async (id: string) => {
    if (!confirm("Are you sure you want to archive this template?")) return;
    try {
      await requestPrincipalApi(`/admin-command/communication-templates/${id}`, { method: "DELETE" });
      refetch();
    } catch (err: any) {
      toast.error(err.message || "Failed to archive template");
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

  const maximumBroadcastVolume = Math.max(
    0,
    ...(data.communicationTrend ?? []).map((item) => Number(item.value) || 0),
  );

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Card className="border border-white/10 bg-white/5 p-5">
          <div className="text-sm font-semibold text-white/70">Provider accepted today</div>
          <div className="mt-2 text-2xl font-black text-white">{data.providerAcceptedToday}</div>
        </Card>
        <Card className="border border-white/10 bg-white/5 p-5">
          <div className="text-sm font-semibold text-white/70">Needs delivery review</div>
          <div className="mt-2 text-2xl font-black text-orange-400">{data.deliveryUnknown}</div>
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
          <div className="mt-2 text-2xl font-black text-green-500">
            {data.smsBalance === null ? "Not available" : data.smsBalance}
          </div>
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
                    style={{ height: `${maximumBroadcastVolume > 0 ? Math.round((item.value / maximumBroadcastVolume) * 100) : 0}%` }}
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
            {hasPermission('communication:write') && (
              <Button size="sm" variant="outline" className="text-xs bg-white/10 text-white px-3 py-1.5 rounded hover:bg-white/20 transition-colors flex items-center gap-1" onClick={() => setIsBroadcastModalOpen(true)}>
                <Send className="h-3 w-3 mr-1" />
                New Message
              </Button>
            )}
          </div>
          
          {(!data.recentBroadcasts || data.recentBroadcasts.length === 0) ? (
            <div className="flex flex-col items-center justify-center flex-1 py-8 text-center bg-white/5 rounded-lg border border-white/5">
              <MessageSquare className="h-10 w-10 text-white/20 mb-3" />
              <p className="text-white/60 mb-4">No recent broadcasts sent</p>
              {hasPermission('communication:write') && (
                <Button size="sm" variant="outline" onClick={() => setIsBroadcastModalOpen(true)}>
                  <Send className="h-4 w-4 mr-2" /> Send Broadcast
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-3 flex-1 overflow-y-auto pr-2">
              {data.recentBroadcasts.map((broadcast) => (
                <div key={broadcast.id} className="rounded-lg border border-white/10 bg-white/5 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-white">{broadcast.title}</p>
                      <p className="mt-1 text-sm text-white/70">{broadcast.body}</p>
                      <p className="mt-2 text-xs text-white/45">
                        {broadcast.audience ? `Audience: ${broadcast.audience} - ` : ""}{broadcast.time}
                      </p>
                    </div>
                    <span className="rounded-full bg-cyan-500/15 px-2 py-1 text-xs font-semibold capitalize text-cyan-200">
                      {broadcast.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border border-white/10 bg-white/5 p-6 flex flex-col h-full mt-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white">Communication Templates</h2>
            {hasPermission('communication:write') && (
              <Button size="sm" variant="outline" onClick={() => setIsTemplateModalOpen(true)}>
                <Plus className="h-4 w-4 mr-1" /> Add Template
              </Button>
            )}
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
                    {hasPermission('communication:write') && (
                      <Button size="sm" variant="outline" className="text-red-400 border-red-500/20 hover:bg-red-500/20" onClick={() => handleArchiveTemplate(template.id)}>
                        Archive
                      </Button>
                    )}
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
              <option value="sms">SMS</option>
              <option value="email">Email</option>
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

      <Modal open={isBroadcastModalOpen} onClose={() => setIsBroadcastModalOpen(false)} title="Send Broadcast">
        <form onSubmit={handleCreateBroadcast} className="space-y-4">
          {broadcastFormError && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded text-sm">
              {broadcastFormError}
            </div>
          )}
          <div className="space-y-2">
            <label className="text-sm font-medium">Audience</label>
            <select 
              name="audience" 
              required 
              value={broadcastAudience}
              onChange={e => setBroadcastAudience(e.target.value)}
              className="w-full border border-slate-200 rounded p-2 text-sm bg-white text-black focus:outline-none focus:ring-1 focus:ring-slate-950"
            >
              <option value="parents">All Parents</option>
              <option value="staff">All Staff</option>
              <option value="class">Specific Class</option>
            </select>
          </div>
          {broadcastAudience === "class" && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Class / Grade Name</label>
              <input type="text" name="targetClass" placeholder="e.g. Form 1A" required className="w-full border border-slate-200 rounded p-2 text-sm bg-white text-black focus:outline-none focus:ring-1 focus:ring-slate-950" />
            </div>
          )}
          <div className="space-y-2">
            <label className="text-sm font-medium">Channels</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2">
                <input type="checkbox" name="channel_sms" defaultChecked disabled={broadcastAudience === "staff"} className="rounded disabled:opacity-50" />
                <span className="text-sm">SMS</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" name="channel_in_app" defaultChecked className="rounded" />
                <span className="text-sm">In-app</span>
              </label>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Message</label>
            <textarea name="message" required rows={4} className="w-full border rounded p-2 text-sm" placeholder="Write your broadcast message..." />
            <p className="text-xs text-gray-500">Variables like {"{{student_name}}"} will be replaced automatically.</p>
          </div>
          <div className="pt-4 flex justify-end">
            <Button type="submit" disabled={isSubmittingBroadcast}>
              {isSubmittingBroadcast && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Send Broadcast
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
