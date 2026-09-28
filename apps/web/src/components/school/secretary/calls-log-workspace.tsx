"use client";
import { RecordTable } from "@/components/ui/record-table";
import { useState } from "react";
import { Phone, PhoneIncoming, PhoneOutgoing, PhoneMissed, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { Panel, StatusChip, Tone } from "./shared";
import { useSchoolQuery } from "@/lib/data/school-hooks";
import { markCallFollowedUp } from "./api-client";

type CallRecord = {
  id: string;
  caller_name: string;
  phone_number: string;
  direction: string;
  purpose: string;
  person_called: string;
  date: string;
  time: string;
  duration_minutes: number;
  follow_up_required: boolean;
  follow_up_done: boolean;
  notes: string;
};

type CallsData = {
  metrics: {
    total_today: number;
    incoming: number;
    outgoing: number;
    missed: number;
    pending_follow_up: number;
  };
  calls: CallRecord[];
};

export function CallsLogWorkspace() {
  const { data, isLoading, refetch } = useSchoolQuery<CallsData>('/admin-command/secretary/calls-log');
  const [actionId, setActionId] = useState<string | null>(null);

  const calls = data?.calls || [];
  const metrics = data?.metrics;

  const getDirectionTone = (dir: string): Tone => {
    switch (dir) {
      case "Incoming": return "info";
      case "Outgoing": return "success";
      case "Missed": return "danger";
      default: return "neutral";
    }
  };

  const handleFollowUp = async (id: string) => {
    setActionId(id);
    try {
      await markCallFollowedUp(id);
      toast.success("Call marked as followed up.");
      refetch();
    } catch {
      toast.error("Failed to update call follow-up status.");
    } finally {
      setActionId(null);
    }
  };

  return (
    <Panel title="Calls Log" description="Log and track all incoming, outgoing, and missed calls." icon={Phone}>
      {/* Metrics */}
      <div className="grid gap-4 md:grid-cols-5 mb-6">
        <div className="rounded-xl border border-border bg-surface-muted p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-muted"><Phone className="w-4 h-4" /> Total Today</div>
          <div className="mt-1 text-2xl font-black text-foreground">{isLoading ? "..." : metrics?.total_today || 0}</div>
        </div>
        <div className="rounded-xl border border-info-border bg-info-soft p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-info"><PhoneIncoming className="w-4 h-4" /> Incoming</div>
          <div className="mt-1 text-2xl font-black text-info">{isLoading ? "..." : metrics?.incoming || 0}</div>
        </div>
        <div className="rounded-xl border border-success-border bg-success-soft p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-success"><PhoneOutgoing className="w-4 h-4" /> Outgoing</div>
          <div className="mt-1 text-2xl font-black text-success">{isLoading ? "..." : metrics?.outgoing || 0}</div>
        </div>
        <div className="rounded-xl border border-danger-border bg-danger-soft p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-danger"><PhoneMissed className="w-4 h-4" /> Missed</div>
          <div className="mt-1 text-2xl font-black text-danger">{isLoading ? "..." : metrics?.missed || 0}</div>
        </div>
        <div className="rounded-xl border border-warning-border bg-warning-soft p-4">
          <div className="text-sm font-semibold text-warning">Pending Follow-Up</div>
          <div className="mt-1 text-2xl font-black text-warning">{isLoading ? "..." : metrics?.pending_follow_up || 0}</div>
        </div>
      </div>

      {/* Calls Table */}
      <div className="overflow-x-auto rounded-xl border border-border">
        <RecordTable className="w-full text-sm text-left whitespace-nowrap">
          <thead className="bg-surface-muted text-foreground">
            <tr>
              <th className="px-4 py-3 font-bold border-b border-border">Direction</th>
              <th className="px-4 py-3 font-bold border-b border-border">Caller</th>
              <th className="px-4 py-3 font-bold border-b border-border">Phone</th>
              <th className="px-4 py-3 font-bold border-b border-border">Purpose</th>
              <th className="px-4 py-3 font-bold border-b border-border">Person Called</th>
              <th className="px-4 py-3 font-bold border-b border-border">Date</th>
              <th className="px-4 py-3 font-bold border-b border-border">Time</th>
              <th className="px-4 py-3 font-bold border-b border-border">Duration</th>
              <th className="px-4 py-3 font-bold border-b border-border">Follow-Up</th>
              <th className="px-4 py-3 font-bold border-b border-border text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              <tr><td colSpan={10} className="px-4 py-8 text-center text-muted">Loading calls log...</td></tr>
            ) : calls.length === 0 ? (
              <tr><td colSpan={10} className="px-4 py-8 text-center text-muted">No calls logged yet. Log incoming and outgoing calls to keep a communication record.</td></tr>
            ) : (
              calls.map((call) => (
                <tr key={call.id} className="hover:bg-surface-muted">
                  <td className="px-4 py-3"><StatusChip label={call.direction} tone={getDirectionTone(call.direction)} /></td>
                  <td className="px-4 py-3 font-medium text-foreground">{call.caller_name}</td>
                  <td className="px-4 py-3 text-muted">{call.phone_number}</td>
                  <td className="px-4 py-3 text-muted max-w-[200px] truncate">{call.purpose}</td>
                  <td className="px-4 py-3 text-muted">{call.person_called}</td>
                  <td className="px-4 py-3 text-muted">{call.date}</td>
                  <td className="px-4 py-3 text-muted">{call.time}</td>
                  <td className="px-4 py-3 text-muted">{call.duration_minutes} min</td>
                  <td className="px-4 py-3">
                    {call.follow_up_required ? (
                      <StatusChip label={call.follow_up_done ? "Done" : "Pending"} tone={call.follow_up_done ? "success" : "warning"} />
                    ) : (
                      <span className="text-xs text-muted">N/A</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {call.follow_up_required && !call.follow_up_done && (
                      <button disabled={actionId === call.id} onClick={() => handleFollowUp(call.id)} className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50">
                        <CheckCircle className="w-3 h-3" /> Done
                      </button>
                    )}
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
