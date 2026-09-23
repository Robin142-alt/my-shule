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
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-[#64748B]"><Phone className="w-4 h-4" /> Total Today</div>
          <div className="mt-1 text-2xl font-black text-[#071D49]">{isLoading ? "..." : metrics?.total_today || 0}</div>
        </div>
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-blue-700"><PhoneIncoming className="w-4 h-4" /> Incoming</div>
          <div className="mt-1 text-2xl font-black text-blue-700">{isLoading ? "..." : metrics?.incoming || 0}</div>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-emerald-700"><PhoneOutgoing className="w-4 h-4" /> Outgoing</div>
          <div className="mt-1 text-2xl font-black text-emerald-700">{isLoading ? "..." : metrics?.outgoing || 0}</div>
        </div>
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-rose-700"><PhoneMissed className="w-4 h-4" /> Missed</div>
          <div className="mt-1 text-2xl font-black text-rose-700">{isLoading ? "..." : metrics?.missed || 0}</div>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <div className="text-sm font-semibold text-amber-700">Pending Follow-Up</div>
          <div className="mt-1 text-2xl font-black text-amber-700">{isLoading ? "..." : metrics?.pending_follow_up || 0}</div>
        </div>
      </div>

      {/* Calls Table */}
      <div className="overflow-x-auto rounded-xl border border-[#D8E0EC]">
        <RecordTable className="w-full text-sm text-left whitespace-nowrap">
          <thead className="bg-[#F8FAFC] text-[#071D49]">
            <tr>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Direction</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Caller</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Phone</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Purpose</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Person Called</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Date</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Time</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Duration</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Follow-Up</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC] text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D8E0EC]">
            {isLoading ? (
              <tr><td colSpan={10} className="px-4 py-8 text-center text-[#64748B]">Loading calls log...</td></tr>
            ) : calls.length === 0 ? (
              <tr><td colSpan={10} className="px-4 py-8 text-center text-[#64748B]">No calls logged yet. Log incoming and outgoing calls to keep a communication record.</td></tr>
            ) : (
              calls.map((call) => (
                <tr key={call.id} className="hover:bg-[#F8FAFC]">
                  <td className="px-4 py-3"><StatusChip label={call.direction} tone={getDirectionTone(call.direction)} /></td>
                  <td className="px-4 py-3 font-medium text-[#071D49]">{call.caller_name}</td>
                  <td className="px-4 py-3 text-[#64748B]">{call.phone_number}</td>
                  <td className="px-4 py-3 text-[#64748B] max-w-[200px] truncate">{call.purpose}</td>
                  <td className="px-4 py-3 text-[#64748B]">{call.person_called}</td>
                  <td className="px-4 py-3 text-[#64748B]">{call.date}</td>
                  <td className="px-4 py-3 text-[#64748B]">{call.time}</td>
                  <td className="px-4 py-3 text-[#64748B]">{call.duration_minutes} min</td>
                  <td className="px-4 py-3">
                    {call.follow_up_required ? (
                      <StatusChip label={call.follow_up_done ? "Done" : "Pending"} tone={call.follow_up_done ? "success" : "warning"} />
                    ) : (
                      <span className="text-xs text-[#94A3B8]">N/A</span>
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
