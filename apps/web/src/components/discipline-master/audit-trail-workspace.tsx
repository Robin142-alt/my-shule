"use client";

import { History, ShieldCheck } from "lucide-react";
import { Panel, StatusChip, EmptyState } from "./shared";

const MOCK_AUDIT = [
  { id: "AUD-001", date: "2026-06-11 10:30 AM", user: "Discipline Master", action: "Case DM-2026-0001 status changed to 'Under Review'" },
  { id: "AUD-002", date: "2026-06-11 09:15 AM", user: "Tr. Wanjiku", action: "Submitted Report REP-001" },
];

export function AuditTrailWorkspace() {
  return (
    <Panel title="Audit Trail" description="Immutable log of all actions taken in the discipline system." icon={History}>
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-black text-[#071D49]">System Audit Logs</h3>
        <button className="rounded-xl border border-[#D8E0EC] bg-white px-4 py-2 text-sm font-bold text-[#071D49] hover:bg-[#F8FAFC]">
          Export Logs
        </button>
      </div>

      <div className="mb-8">
        {MOCK_AUDIT.length > 0 ? (
          <div className="overflow-x-auto rounded-xl border border-[#D8E0EC]">
            <table className="w-full text-left text-sm text-[#071D49]">
              <thead className="bg-[#F8FAFC] text-xs font-black uppercase text-[#64748B]">
                <tr>
                  <th className="px-4 py-3">Timestamp</th>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Action Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D8E0EC]">
                {MOCK_AUDIT.map((row) => (
                  <tr key={row.id} className="hover:bg-[#F8FAFC]">
                    <td className="px-4 py-3 text-xs">{row.date}</td>
                    <td className="px-4 py-3 font-bold">{row.user}</td>
                    <td className="px-4 py-3 text-[#64748B]">{row.action}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState 
            message="No audit logs available." 
            icon={ShieldCheck} 
          />
        )}
      </div>
    </Panel>
  );
}
