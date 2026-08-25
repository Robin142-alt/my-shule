"use client";
import { useState } from "react";
import { Bell, PlusCircle, Search, RefreshCw } from "lucide-react";
import { Panel, StatusChip, Tone } from "./shared";
import { useSchoolQuery } from "@/lib/data/school-hooks";
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
  queued_at: string;
};

type GuardianRecipient = {
  student_id: string;
  student_name: string;
  guardian_id: string;
  guardian_name: string;
  relationship: string;
  sms_available: boolean;
};

type NotificationsData = {
  metrics: { queued_today: number; pending: number; failed: number };
  notifications: NotificationRecord[];
  recipients: GuardianRecipient[];
};

export function ParentNotificationsWorkspace() {
  const { data, isLoading, error, refetch } = useSchoolQuery<NotificationsData>('/admin-command/nurse/parent-notifications');
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({ student_id: "", guardian_id: "", message: "", channel: "in-app" });

  const notifications = (data?.notifications || []).filter(n =>
    String(n.student_name || "").toLowerCase().includes(search.toLowerCase()) ||
    String(n.parent_name || "").toLowerCase().includes(search.toLowerCase())
  );
  const recipients = data?.recipients || [];
  const studentOptions = Array.from(
    new Map(recipients.map((recipient) => [recipient.student_id, {
      student_id: recipient.student_id,
      student_name: recipient.student_name,
    }])).values(),
  );
  const selectedGuardians = recipients.filter((recipient) => recipient.student_id === form.student_id);

  const getStatusTone = (st: string): Tone => {
    if (st === "Sent" || st === "Delivered") return "success";
    if (st === "Pending" || st === "Queued") return "warning";
    if (st === "Failed") return "danger";
    return "neutral";
  };

  const handleSend = async () => {
    if (!form.student_id || !form.message.trim()) { toast.error("Student and message are required."); return; }
    const selectedRecipients = form.guardian_id
      ? selectedGuardians.filter((guardian) => guardian.guardian_id === form.guardian_id)
      : selectedGuardians;
    if (selectedRecipients.length === 0) {
      toast.error("Select an active linked guardian account.");
      return;
    }
    if (form.channel === "sms" && selectedRecipients.some((guardian) => !guardian.sms_available)) {
      toast.error("SMS is unavailable for one or more selected guardians. Choose an SMS-enabled guardian or use in-app delivery.");
      return;
    }
    setIsSubmitting(true);
    try {
      const result = await sendParentNotification(form) as { message?: string };
      await refetch();
      toast.success(result.message || "Parent notification queued for exact linked guardians.");
      setShowForm(false);
      setForm({ student_id: "", guardian_id: "", message: "", channel: "in-app" });
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to send notification.");
    }
    finally { setIsSubmitting(false); }
  };

  const handleResend = async (id: string) => {
    try {
      const result = await resendParentNotification(id) as { message?: string };
      await refetch();
      toast.success(result.message || "Notification requeued for the exact guardian.");
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to resend.");
    }
  };

  return (
    <Panel title="Parent Health Notifications" description="Alert parents about their child's health visits and conditions." icon={Bell} actions={
      <button onClick={() => setShowForm(true)} className="flex items-center gap-2 rounded-lg bg-[#071D49] px-4 py-2 text-sm font-black text-white hover:bg-blue-900 transition">
        <PlusCircle className="w-4 h-4" /> Send Alert
      </button>
    }>
      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <div className="text-sm font-semibold text-emerald-700">Queued Today</div>
          <div className="mt-1 text-lg font-black text-emerald-700">{isLoading ? "..." : data?.metrics?.queued_today ?? 0}</div>
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

      {error ? (
        <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-800">
          Guardian recipients and prior health alerts could not be loaded. Retry before queueing a notification.
        </div>
      ) : null}

      <div className="relative mb-4">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#64748B]" />
        <input type="text" placeholder="Search by student or parent..." value={search} onChange={e => setSearch(e.target.value)} className="w-full rounded-xl border border-[#D8E0EC] py-2 pl-9 pr-3 text-sm focus:border-[#071D49] focus:outline-none" />
      </div>

      {showForm && (
        <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50 p-4">
          <h3 className="text-sm font-bold text-[#071D49] mb-3">Send Parent Alert</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="nurse-alert-student" className="text-xs font-bold text-[#334155]">Student *</label>
              <select
                id="nurse-alert-student"
                value={form.student_id}
                onChange={e => setForm({...form, student_id: e.target.value, guardian_id: ""})}
                className="mt-1 w-full rounded-lg border border-[#D8E0EC] bg-white p-2 text-sm focus:border-blue-500 focus:outline-none"
              >
                <option value="">Select an active learner</option>
                {studentOptions.map((student) => (
                  <option key={student.student_id} value={student.student_id}>{student.student_name}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="nurse-alert-guardian" className="text-xs font-bold text-[#334155]">Guardian</label>
              <select
                id="nurse-alert-guardian"
                value={form.guardian_id}
                disabled={!form.student_id}
                onChange={e => setForm({...form, guardian_id: e.target.value})}
                className="mt-1 w-full rounded-lg border border-[#D8E0EC] bg-white p-2 text-sm focus:border-blue-500 focus:outline-none disabled:bg-slate-100"
              >
                <option value="">All active linked guardians</option>
                {selectedGuardians.map((guardian) => (
                  <option key={guardian.guardian_id} value={guardian.guardian_id}>
                    {guardian.guardian_name} ({guardian.relationship}){guardian.sms_available ? "" : " — in-app only"}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="nurse-alert-channel" className="text-xs font-bold text-[#334155]">Channel</label>
              <select id="nurse-alert-channel" value={form.channel} onChange={e => setForm({...form, channel: e.target.value})} className="mt-1 w-full rounded-lg border border-[#D8E0EC] p-2 text-sm focus:border-blue-500 focus:outline-none">
                <option value="in-app">In-App</option><option value="sms">SMS + In-App</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="nurse-alert-message" className="text-xs font-bold text-[#334155]">Message *</label>
              <textarea id="nurse-alert-message" value={form.message} onChange={e => setForm({...form, message: e.target.value})} rows={2} className="mt-1 w-full rounded-lg border border-[#D8E0EC] p-2 text-sm focus:border-blue-500 focus:outline-none" />
            </div>
          </div>
          <div className="mt-3 flex gap-2 justify-end">
            <button onClick={() => setShowForm(false)} className="rounded-lg px-4 py-2 text-sm font-bold text-[#64748B] hover:bg-slate-100">Cancel</button>
            <button disabled={isSubmitting || isLoading || recipients.length === 0} onClick={handleSend} className="rounded-lg bg-[#071D49] px-4 py-2 text-sm font-black text-white hover:bg-blue-900 disabled:opacity-50">
              {isSubmitting ? "Queueing..." : "Queue Alert"}
            </button>
          </div>
          {!isLoading && !error && recipients.length === 0 ? (
            <p className="mt-3 text-sm font-semibold text-amber-700">
              No active learner has an active linked guardian account. Complete guardian linking before sending an alert.
            </p>
          ) : null}
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
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Queued At</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Status</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC] text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D8E0EC]">
            {isLoading ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-[#64748B]">Loading notifications...</td></tr>
            ) : notifications.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-[#64748B]">No parent health notifications queued yet. Use &quot;Send Alert&quot; to notify parents about health visits.</td></tr>
            ) : (
              notifications.map(n => (
                <tr key={n.id} className="hover:bg-[#F8FAFC]">
                  <td className="px-4 py-3 font-semibold text-[#071D49]">{n.student_name}</td>
                  <td className="px-4 py-3 text-[#64748B]">{n.parent_name}</td>
                  <td className="px-4 py-3 text-[#64748B] uppercase text-xs font-bold">{n.channel}</td>
                  <td className="px-4 py-3 text-[#64748B] max-w-[200px] truncate">{n.message}</td>
                  <td className="px-4 py-3 text-[#64748B]">{n.queued_at}</td>
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
