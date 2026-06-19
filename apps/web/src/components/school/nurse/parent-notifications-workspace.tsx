"use client";
import { useState } from "react";
import { Bell, PlusCircle, Search, RefreshCw } from "lucide-react";
import { Panel, StatusChip, Tone } from "./shared";
import { useSchoolQuery } from "@/lib/data/school-hooks";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { sendParentNotification, resendParentNotification } from "./api-client";

type NotificationRecord = {
  id: string;
  student_name: string;
  parent_name: string;
  parent_phone: string;
  message: string;
  channel: string;
  status: string;
  sent_at: string;
};

type NotificationsData = {
  metrics: { sent_today: number; pending: number; failed: number };
  notifications: NotificationRecord[];
};

export function ParentNotificationsWorkspace() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useSchoolQuery<NotificationsData>('/admin-command/nurse/parent-notifications');
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({ student_name: "", parent_name: "", parent_phone: "", message: "", channel: "sms" });

  const notifications = (data?.notifications || []).filter(n =>
    n.student_name.toLowerCase().includes(search.toLowerCase()) ||
    n.parent_name.toLowerCase().includes(search.toLowerCase())
  );

  const getStatusTone = (st: string): Tone => {
    if (st === "Sent" || st === "Delivered") return "success";
    if (st === "Pending") return "warning";
    if (st === "Failed") return "danger";
    return "neutral";
  };

  const handleSend = async () => {
    if (!form.student_name || !form.message) { toast.error("Student and message are required."); return; }
    setIsSubmitting(true);
    try {
      await sendParentNotification(form);
      queryClient.invalidateQueries({ queryKey: ["school", "session", "/admin-command/nurse/parent-notifications"] });
      toast.success("Parent notification sent.");
      setShowForm(false);
      setForm({ student_name: "", parent_name: "", parent_phone: "", message: "", channel: "sms" });
    } catch (e: any) { toast.error(e.message || "Failed to send notification."); }
    finally { setIsSubmitting(false); }
  };

  const handleResend = async (id: string) => {
    try {
      await resendParentNotification(id);
      queryClient.invalidateQueries({ queryKey: ["school", "session", "/admin-command/nurse/parent-notifications"] });
      toast.success("Notification resent.");
    } catch (e: any) { toast.error(e.message || "Failed to resend."); }
  };

  return (
    <Panel title="Parent Health Notifications" description="Alert parents about their child's health visits and conditions." icon={Bell} actions={
      <button onClick={() => setShowForm(true)} className="flex items-center gap-2 rounded-lg bg-[#071D49] px-4 py-2 text-sm font-black text-white hover:bg-blue-900 transition">
        <PlusCircle className="w-4 h-4" /> Send Alert
      </button>
    }>
      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <div className="text-sm font-semibold text-emerald-700">Sent Today</div>
          <div className="mt-1 text-lg font-black text-emerald-700">{isLoading ? "..." : data?.metrics?.sent_today ?? 0}</div>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <div className="text-sm font-semibold text-amber-700">Pending</div>
          <div className="mt-1 text-lg font-black text-amber-700">{isLoading ? "..." : data?.metrics?.pending ?? 0}</div>
        </div>
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
          <div className="text-sm font-semibold text-rose-700">Failed</div>
          <div className="mt-1 text-lg font-black text-rose-700">{isLoading ? "..." : data?.metrics?.failed ?? 0}</div>
        </div>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#64748B]" />
        <input type="text" placeholder="Search by student or parent..." value={search} onChange={e => setSearch(e.target.value)} className="w-full rounded-xl border border-[#D8E0EC] py-2 pl-9 pr-3 text-sm focus:border-[#071D49] focus:outline-none" />
      </div>

      {showForm && (
        <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50 p-4">
          <h3 className="text-sm font-bold text-[#071D49] mb-3">Send Parent Alert</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs font-bold text-[#334155]">Student Name *</label>
              <input value={form.student_name} onChange={e => setForm({...form, student_name: e.target.value})} className="mt-1 w-full rounded-lg border border-[#D8E0EC] p-2 text-sm focus:border-blue-500 focus:outline-none" />
            </div>
            <div>
              <label className="text-xs font-bold text-[#334155]">Parent Name</label>
              <input value={form.parent_name} onChange={e => setForm({...form, parent_name: e.target.value})} className="mt-1 w-full rounded-lg border border-[#D8E0EC] p-2 text-sm focus:border-blue-500 focus:outline-none" />
            </div>
            <div>
              <label className="text-xs font-bold text-[#334155]">Parent Phone</label>
              <input value={form.parent_phone} onChange={e => setForm({...form, parent_phone: e.target.value})} placeholder="+254..." className="mt-1 w-full rounded-lg border border-[#D8E0EC] p-2 text-sm focus:border-blue-500 focus:outline-none" />
            </div>
            <div>
              <label className="text-xs font-bold text-[#334155]">Channel</label>
              <select value={form.channel} onChange={e => setForm({...form, channel: e.target.value})} className="mt-1 w-full rounded-lg border border-[#D8E0EC] p-2 text-sm focus:border-blue-500 focus:outline-none">
                <option value="sms">SMS</option><option value="in-app">In-App</option><option value="email">Email</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-bold text-[#334155]">Message *</label>
              <textarea value={form.message} onChange={e => setForm({...form, message: e.target.value})} rows={2} className="mt-1 w-full rounded-lg border border-[#D8E0EC] p-2 text-sm focus:border-blue-500 focus:outline-none" />
            </div>
          </div>
          <div className="mt-3 flex gap-2 justify-end">
            <button onClick={() => setShowForm(false)} className="rounded-lg px-4 py-2 text-sm font-bold text-[#64748B] hover:bg-slate-100">Cancel</button>
            <button disabled={isSubmitting} onClick={handleSend} className="rounded-lg bg-[#071D49] px-4 py-2 text-sm font-black text-white hover:bg-blue-900 disabled:opacity-50">
              {isSubmitting ? "Sending..." : "Send Alert"}
            </button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-[#D8E0EC]">
        <table className="w-full text-sm text-left whitespace-nowrap">
          <thead className="bg-[#F8FAFC] text-[#071D49]">
            <tr>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Student</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Parent</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Channel</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Message</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Sent At</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Status</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC] text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D8E0EC]">
            {isLoading ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-[#64748B]">Loading notifications...</td></tr>
            ) : notifications.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-[#64748B]">No parent health notifications sent yet. Use &quot;Send Alert&quot; to notify parents about health visits.</td></tr>
            ) : (
              notifications.map(n => (
                <tr key={n.id} className="hover:bg-[#F8FAFC]">
                  <td className="px-4 py-3 font-semibold text-[#071D49]">{n.student_name}</td>
                  <td className="px-4 py-3 text-[#64748B]">{n.parent_name}</td>
                  <td className="px-4 py-3 text-[#64748B] uppercase text-xs font-bold">{n.channel}</td>
                  <td className="px-4 py-3 text-[#64748B] max-w-[200px] truncate">{n.message}</td>
                  <td className="px-4 py-3 text-[#64748B]">{n.sent_at}</td>
                  <td className="px-4 py-3"><StatusChip label={n.status} tone={getStatusTone(n.status)} /></td>
                  <td className="px-4 py-3 text-right">
                    {n.status === "Failed" && (
                      <button onClick={() => handleResend(n.id)} className="inline-flex items-center gap-1 text-blue-600 hover:underline font-semibold text-xs">
                        <RefreshCw className="w-3 h-3" /> Resend
                      </button>
                    )}
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
