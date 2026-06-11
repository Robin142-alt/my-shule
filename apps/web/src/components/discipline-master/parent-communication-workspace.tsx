"use client";

import { MessageSquare, Phone, Send } from "lucide-react";
import { Panel, StatusChip, EmptyState } from "./shared";

const MOCK_MESSAGES = [
  { id: "MSG-001", caseId: "DM-2026-0001", student: "Brian Otieno", type: "SMS", date: "2026-06-11", status: "Sent" },
  { id: "MSG-002", caseId: "DM-2026-0005", student: "John Doe", type: "Email", date: "2026-06-11", status: "Pending" },
];

export function ParentCommunicationWorkspace() {
  return (
    <Panel title="Parent Communication" description="Notify parents about discipline issues and track acknowledgements." icon={MessageSquare}>
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4 cursor-pointer hover:border-[#38BDF8]">
          <span className="block text-xs font-black uppercase text-[#64748B]">Pending Notifications</span>
          <span className="mt-1 block text-2xl font-black text-[#071D49]">3</span>
        </div>
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4 cursor-pointer hover:border-[#38BDF8]">
          <span className="block text-xs font-black uppercase text-[#64748B]">Sent Today</span>
          <span className="mt-1 block text-2xl font-black text-[#071D49]">12</span>
        </div>
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4 cursor-pointer hover:border-[#38BDF8]">
          <span className="block text-xs font-black uppercase text-[#64748B]">Unacknowledged</span>
          <span className="mt-1 block text-2xl font-black text-[#071D49]">5</span>
        </div>
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 cursor-pointer hover:border-rose-300">
          <span className="block text-xs font-black uppercase text-rose-700">Failed Delivery</span>
          <span className="mt-1 block text-2xl font-black text-rose-700">1</span>
        </div>
      </div>

      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-black text-[#071D49]">Communication History</h3>
        <button className="flex items-center gap-2 rounded-xl bg-[#071D49] px-4 py-2 text-sm font-black text-white hover:bg-[#0A2661]">
          <Send className="h-4 w-4" /> Send Bulk Notices
        </button>
      </div>

      <div>
        {MOCK_MESSAGES.length > 0 ? (
          <div className="overflow-x-auto rounded-xl border border-[#D8E0EC]">
            <table className="w-full text-left text-sm text-[#071D49]">
              <thead className="bg-[#F8FAFC] text-xs font-black uppercase text-[#64748B]">
                <tr>
                  <th className="px-4 py-3">Message ID</th>
                  <th className="px-4 py-3">Case ID</th>
                  <th className="px-4 py-3">Student</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Date Sent</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D8E0EC]">
                {MOCK_MESSAGES.map((row) => (
                  <tr key={row.id} className="hover:bg-[#F8FAFC]">
                    <td className="px-4 py-3 font-semibold">{row.id}</td>
                    <td className="px-4 py-3 text-[#1D4ED8] hover:underline cursor-pointer">{row.caseId}</td>
                    <td className="px-4 py-3 font-bold">{row.student}</td>
                    <td className="px-4 py-3">{row.type}</td>
                    <td className="px-4 py-3">{row.date}</td>
                    <td className="px-4 py-3">
                      <StatusChip label={row.status} tone={row.status === 'Sent' ? 'success' : 'warning'} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                         <button className="text-[#64748B] hover:text-[#071D49]"><Phone className="h-4 w-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState 
            message="No parent communication records found." 
            icon={MessageSquare} 
          />
        )}
      </div>
    </Panel>
  );
}
