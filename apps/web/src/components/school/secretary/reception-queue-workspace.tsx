"use client";
import { RecordTable } from "@/components/ui/record-table";
import { useState } from "react";
import { ListOrdered, Plus, UserCheck, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { Panel, StatusChip, Tone } from "./shared";
import { useSchoolQuery } from "@/lib/data/school-hooks";
import { callNextInQueue, completeQueueEntry, createQueueEntry } from "./api-client";
import { Modal } from "@/components/ui/modal";
import { usePermissions } from "@/components/providers/permission-context";

type QueueEntry = {
  id: string;
  ticket_number: string;
  visitor_name: string;
  role_relationship: string;
  purpose: string;
  person_to_see: string;
  arrival_time: string;
  status: string;
  wait_time_minutes: number;
};

type QueueData = {
  metrics: {
    total_in_queue: number;
    being_served: number;
    completed_today: number;
    avg_wait_minutes: number;
  };
  queue: QueueEntry[];
};

export function ReceptionQueueWorkspace() {
  const { data, isLoading, error, refetch } = useSchoolQuery<QueueData>('/admin-command/secretary/reception-queue', { refetchInterval: 15_000 });
  const [actionId, setActionId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const { hasPermission } = usePermissions();
  const canWrite = hasPermission('secretary:write');

  const queue = data?.queue || [];
  const metrics = data?.metrics;
  const metricValue = (value?: number) => isLoading ? '…' : error || value == null ? '—' : value;

  const getStatusTone = (status: string): Tone => {
    switch (status) {
      case "Waiting": return "warning";
      case "Being Served": return "info";
      case "Completed": return "success";
      case "No Show": return "danger";
      default: return "neutral";
    }
  };

  const handleCallNext = async (id: string) => {
    setActionId(id);
    try {
      await callNextInQueue(id);
      toast.success("Visitor called. They are now being served.");
      refetch();
    } catch {
      toast.error("Failed to call visitor.");
    } finally {
      setActionId(null);
    }
  };

  const handleComplete = async (id: string) => {
    setActionId(id);
    try {
      await completeQueueEntry(id);
      toast.success(`Queue ticket ${id} closed and reception metrics refreshed.`);
      refetch();
    } catch {
      toast.error("Failed to complete visit.");
    } finally {
      setActionId(null);
    }
  };

  return (
    <Panel title="Reception Queue" description="Manage walk-in visitors and waiting queue." icon={ListOrdered}>
      <div className="mb-4 flex flex-wrap justify-end gap-2">
        <button type="button" className="min-h-11 rounded-lg border border-border px-4 text-sm font-semibold" onClick={() => void refetch()}>Refresh queue</button>
        <button type="button" disabled={!canWrite} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white disabled:opacity-50" onClick={() => { setSaveError(''); setCreating(true); }}><Plus className="h-4 w-4" aria-hidden="true" />Add visitor to queue</button>
      </div>
      {error && <p role="alert" className="mb-4 text-danger">The reception queue could not be loaded. Refresh the queue to retry.</p>}
      {/* Metrics */}
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <div className="rounded-xl border border-warning-border bg-warning-soft p-4">
          <div className="text-sm font-semibold text-warning">In Queue</div>
          <div className="mt-1 text-2xl font-black text-warning">{metricValue(metrics?.total_in_queue)}</div>
        </div>
        <div className="rounded-xl border border-info-border bg-info-soft p-4">
          <div className="text-sm font-semibold text-info">Being Served</div>
          <div className="mt-1 text-2xl font-black text-info">{metricValue(metrics?.being_served)}</div>
        </div>
        <div className="rounded-xl border border-success-border bg-success-soft p-4">
          <div className="text-sm font-semibold text-success">Completed Today</div>
          <div className="mt-1 text-2xl font-black text-success">{metricValue(metrics?.completed_today)}</div>
        </div>
        <div className="rounded-xl border border-border bg-surface-muted p-4">
          <div className="text-sm font-semibold text-muted">Avg Wait (min)</div>
          <div className="mt-1 text-2xl font-black text-foreground">{metricValue(metrics?.avg_wait_minutes)}</div>
        </div>
      </div>

      {/* Queue Table */}
      <div className="overflow-x-auto rounded-xl border border-border">
        <RecordTable className="w-full text-sm text-left whitespace-nowrap">
          <thead className="bg-surface-muted text-foreground">
            <tr>
              <th className="px-4 py-3 font-bold border-b border-border">Ticket</th>
              <th className="px-4 py-3 font-bold border-b border-border">Visitor Name</th>
              <th className="px-4 py-3 font-bold border-b border-border">Role / Relationship</th>
              <th className="px-4 py-3 font-bold border-b border-border">Purpose</th>
              <th className="px-4 py-3 font-bold border-b border-border">Person to See</th>
              <th className="px-4 py-3 font-bold border-b border-border">Arrival</th>
              <th className="px-4 py-3 font-bold border-b border-border">Wait (min)</th>
              <th className="px-4 py-3 font-bold border-b border-border">Status</th>
              <th className="px-4 py-3 font-bold border-b border-border text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              <tr><td colSpan={9} className="px-4 py-8 text-center text-muted">Loading queue...</td></tr>
            ) : queue.length === 0 ? (
              <tr><td colSpan={9} className="px-4 py-8 text-center text-muted">{error ? 'Queue unavailable.' : 'No visitors in the queue. Add a visitor when they arrive at reception.'}</td></tr>
            ) : (
              queue.map((entry) => (
                <tr key={entry.id} className="hover:bg-surface-muted">
                  <td className="px-4 py-3 font-mono font-bold text-foreground">{entry.ticket_number}</td>
                  <td className="px-4 py-3 font-medium text-foreground">{entry.visitor_name}</td>
                  <td className="px-4 py-3 text-muted">{entry.role_relationship || 'Not recorded'}</td>
                  <td className="px-4 py-3 text-muted">{entry.purpose}</td>
                  <td className="px-4 py-3 text-muted">{entry.person_to_see}</td>
                  <td className="px-4 py-3 text-muted">{new Date(entry.arrival_time).toLocaleTimeString('en-KE', { timeZone: 'Africa/Nairobi', hour: '2-digit', minute: '2-digit' })}</td>
                  <td className="px-4 py-3 text-muted">{entry.wait_time_minutes}</td>
                  <td className="px-4 py-3"><StatusChip label={entry.status} tone={getStatusTone(entry.status)} /></td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {canWrite && entry.status === "Waiting" && (
                        <button disabled={actionId === entry.id} onClick={() => handleCallNext(entry.id)} className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50">
                          <UserCheck className="w-3 h-3" /> Call
                        </button>
                      )}
                      {canWrite && entry.status === "Being Served" && (
                        <button disabled={actionId === entry.id} onClick={() => handleComplete(entry.id)} className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50">
                          <CheckCircle className="w-3 h-3" /> Complete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </RecordTable>
      </div>
      <Modal open={creating} title="Add visitor to queue" onClose={() => { if (!saving) setCreating(false); }}>
        <form className="space-y-4" onSubmit={async event => {
          event.preventDefault(); if (saving || !canWrite) return;
          const form = new FormData(event.currentTarget); setSaving(true); setSaveError('');
          try { await createQueueEntry(Object.fromEntries(form)); setCreating(false); toast.success('Visitor added to the reception queue.'); await refetch(); }
          catch (failure) { setSaveError(failure instanceof Error ? failure.message : 'The visitor could not be added. Please retry.'); }
          finally { setSaving(false); }
        }}>
          <label className="block text-sm font-semibold">Visitor name<input name="visitor_name" required maxLength={160} className="mt-1 w-full rounded-lg border border-border p-3" /></label>
          <label className="block text-sm font-semibold">Role / Relationship<input name="role_relationship" required maxLength={160} className="mt-1 w-full rounded-lg border border-border p-3" placeholder="Parent, teacher, supplier…" /></label>
          <label className="block text-sm font-semibold">Person to see<select name="person_to_see" required className="mt-1 w-full rounded-lg border border-border bg-white p-3"><option>Principal</option><option>Deputy Principal</option><option>Accountant</option><option>Secretary</option></select></label>
          <label className="block text-sm font-semibold">Purpose of visit<textarea name="purpose" required maxLength={2000} rows={3} className="mt-1 w-full rounded-lg border border-border p-3" /></label>
          {saveError && <p role="alert" className="text-sm text-danger">{saveError}</p>}
          <button type="submit" disabled={saving || !canWrite} className="min-h-11 rounded-lg bg-blue-600 px-4 text-sm font-bold text-white disabled:opacity-50">{saving ? 'Adding visitor…' : 'Check in visitor'}</button>
        </form>
      </Modal>
    </Panel>
  );
}
