"use client";

import { Activity, Clock, AlertCircle } from "lucide-react";
import { Panel, StatusChip, EmptyState } from "./shared";

const MOCK_TRIAGE = [
  { id: "DM-2026-0005", date: "2026-06-11", student: "John Doe", severity: "High", waitTime: "2 hours", status: "Awaiting Action" },
  { id: "DM-2026-0006", date: "2026-06-11", student: "Jane Smith", severity: "Critical", waitTime: "30 mins", status: "Escalated" },
];

export function TriageQueueWorkspace() {
  return (
    <Panel title="Triage Queue" description="Prioritize and assign urgent discipline cases." icon={Activity}>
      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4 cursor-pointer hover:border-[#38BDF8]">
          <span className="block text-xs font-black uppercase text-[#64748B]">Awaiting Triage</span>
          <span className="mt-1 block text-2xl font-black text-[#071D49]">5</span>
        </div>
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 cursor-pointer hover:border-rose-300">
          <span className="block text-xs font-black uppercase text-rose-700">Critical Priority</span>
          <span className="mt-1 block text-2xl font-black text-rose-700">1</span>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 cursor-pointer hover:border-amber-300">
          <span className="block text-xs font-black uppercase text-amber-700">High Priority</span>
          <span className="mt-1 block text-2xl font-black text-amber-700">3</span>
        </div>
      </div>

      <div>
        {MOCK_TRIAGE.length > 0 ? (
          <div className="overflow-x-auto rounded-xl border border-[#D8E0EC]">
            <table className="w-full text-left text-sm text-[#071D49]">
              <thead className="bg-[#F8FAFC] text-xs font-black uppercase text-[#64748B]">
                <tr>
                  <th className="px-4 py-3">Case ID</th>
                  <th className="px-4 py-3">Student</th>
                  <th className="px-4 py-3">Severity</th>
                  <th className="px-4 py-3">Wait Time</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D8E0EC]">
                {MOCK_TRIAGE.map((row) => (
                  <tr key={row.id} className="hover:bg-[#F8FAFC]">
                    <td className="px-4 py-3 font-semibold text-[#1D4ED8] hover:underline cursor-pointer">{row.id}</td>
                    <td className="px-4 py-3 font-bold">{row.student}</td>
                    <td className="px-4 py-3">
                      <StatusChip label={row.severity} tone={row.severity === 'Critical' ? 'danger' : 'warning'} />
                    </td>
                    <td className="px-4 py-3 flex items-center gap-1"><Clock className="h-4 w-4 text-[#64748B]" /> {row.waitTime}</td>
                    <td className="px-4 py-3">
                      <StatusChip label={row.status} tone={row.status === 'Escalated' ? 'danger' : 'info'} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button className="rounded-lg bg-[#071D49] px-3 py-1.5 text-xs font-black text-white hover:bg-[#0A2661]">Assign</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState 
            message="No urgent cases in the triage queue." 
            icon={AlertCircle} 
          />
        )}
      </div>
    </Panel>
  );
}
