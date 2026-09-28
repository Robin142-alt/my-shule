"use client";
import { RecordTable } from "@/components/ui/record-table";
import { useState } from "react";
import { ListOrdered, Plus, UserCheck, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { Panel, StatusChip, Tone } from "./shared";
import { useSchoolQuery } from "@/lib/data/school-hooks";
import { callNextInQueue, completeQueueEntry } from "./api-client";

type QueueEntry = {
  id: string;
  ticket_number: string;
  visitor_name: string;
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
  const { data, isLoading, refetch } = useSchoolQuery<QueueData>('/admin-command/secretary/reception-queue');
  const [actionId, setActionId] = useState<string | null>(null);

  const queue = data?.queue || [];
  const metrics = data?.metrics;

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
      {/* Metrics */}
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <div className="rounded-xl border border-warning-border bg-warning-soft p-4">
          <div className="text-sm font-semibold text-warning">In Queue</div>
          <div className="mt-1 text-2xl font-black text-warning">{isLoading ? "..." : metrics?.total_in_queue || 0}</div>
        </div>
        <div className="rounded-xl border border-info-border bg-info-soft p-4">
          <div className="text-sm font-semibold text-info">Being Served</div>
          <div className="mt-1 text-2xl font-black text-info">{isLoading ? "..." : metrics?.being_served || 0}</div>
        </div>
        <div className="rounded-xl border border-success-border bg-success-soft p-4">
          <div className="text-sm font-semibold text-success">Completed Today</div>
          <div className="mt-1 text-2xl font-black text-success">{isLoading ? "..." : metrics?.completed_today || 0}</div>
        </div>
        <div className="rounded-xl border border-border bg-surface-muted p-4">
          <div className="text-sm font-semibold text-muted">Avg Wait (min)</div>
          <div className="mt-1 text-2xl font-black text-foreground">{isLoading ? "..." : metrics?.avg_wait_minutes || 0}</div>
        </div>
      </div>

      {/* Queue Table */}
      <div className="overflow-x-auto rounded-xl border border-border">
        <RecordTable className="w-full text-sm text-left whitespace-nowrap">
          <thead className="bg-surface-muted text-foreground">
            <tr>
              <th className="px-4 py-3 font-bold border-b border-border">Ticket</th>
              <th className="px-4 py-3 font-bold border-b border-border">Visitor Name</th>
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
              <tr><td colSpan={8} className="px-4 py-8 text-center text-muted">Loading queue...</td></tr>
            ) : queue.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-muted">No visitors in the queue. New walk-in visitors will appear here when checked in at reception.</td></tr>
            ) : (
              queue.map((entry) => (
                <tr key={entry.id} className="hover:bg-surface-muted">
                  <td className="px-4 py-3 font-mono font-bold text-foreground">{entry.ticket_number}</td>
                  <td className="px-4 py-3 font-medium text-foreground">{entry.visitor_name}</td>
                  <td className="px-4 py-3 text-muted">{entry.purpose}</td>
                  <td className="px-4 py-3 text-muted">{entry.person_to_see}</td>
                  <td className="px-4 py-3 text-muted">{entry.arrival_time}</td>
                  <td className="px-4 py-3 text-muted">{entry.wait_time_minutes}</td>
                  <td className="px-4 py-3"><StatusChip label={entry.status} tone={getStatusTone(entry.status)} /></td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {entry.status === "Waiting" && (
                        <button disabled={actionId === entry.id} onClick={() => handleCallNext(entry.id)} className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50">
                          <UserCheck className="w-3 h-3" /> Call
                        </button>
                      )}
                      {entry.status === "Being Served" && (
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
    </Panel>
  );
}
