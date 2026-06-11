"use client";

import { Home, FileText, AlertTriangle, Users, ClipboardList } from "lucide-react";
import { Panel, StatusChip, EmptyState } from "./shared";

const MOCK_URGENT_CASES = [
  { id: "DM-2026-0001", student: "Brian Otieno", class: "Form 2 Blue", category: "Bullying", severity: "High", reportedBy: "Tr. Wanjiku", date: "2026-06-11 08:30", status: "Under Review" },
  { id: "DM-2026-0002", student: "Sarah Njoroge", class: "Form 3 Red", category: "Substance Abuse", severity: "Critical", reportedBy: "Security", date: "2026-06-10 19:15", status: "New" },
];

export function OverviewWorkspace() {
  return (
    <Panel title="Overview" description="Daily command center for discipline operations." icon={Home} actions={
      <div className="flex gap-2">
        <button className="rounded-lg bg-[#071D49] px-4 py-2 text-sm font-black text-white">+ Log Incident</button>
        <button className="rounded-lg border border-[#D8E0EC] px-4 py-2 text-sm font-black text-[#071D49]">Review Teacher Reports</button>
      </div>
    }>
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4 cursor-pointer hover:border-[#38BDF8]">
          <span className="block text-xs font-black uppercase text-[#64748B]">Open Cases</span>
          <span className="mt-1 block text-2xl font-black text-[#071D49]">14</span>
        </div>
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4 cursor-pointer hover:border-[#38BDF8]">
          <span className="block text-xs font-black uppercase text-[#64748B]">New Reports Today</span>
          <span className="mt-1 block text-2xl font-black text-[#071D49]">3</span>
        </div>
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 cursor-pointer hover:border-rose-300">
          <span className="block text-xs font-black uppercase text-rose-700">Pending Parent Contact</span>
          <span className="mt-1 block text-2xl font-black text-rose-700">5</span>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 cursor-pointer hover:border-amber-300">
          <span className="block text-xs font-black uppercase text-amber-700">Pending Approval</span>
          <span className="mt-1 block text-2xl font-black text-amber-700">2</span>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4 mb-8">
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4 cursor-pointer hover:border-[#38BDF8]">
          <span className="block text-xs font-black uppercase text-[#64748B]">Counselling Referrals</span>
          <span className="mt-1 block text-2xl font-black text-[#071D49]">8</span>
        </div>
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4 cursor-pointer hover:border-[#38BDF8]">
          <span className="block text-xs font-black uppercase text-[#64748B]">Repeat Concerns</span>
          <span className="mt-1 block text-2xl font-black text-[#071D49]">12</span>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 cursor-pointer hover:border-emerald-300">
          <span className="block text-xs font-black uppercase text-emerald-700">Closed This Week</span>
          <span className="mt-1 block text-2xl font-black text-emerald-700">18</span>
        </div>
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 cursor-pointer hover:border-rose-300">
          <span className="block text-xs font-black uppercase text-rose-700">High Priority Cases</span>
          <span className="mt-1 block text-2xl font-black text-rose-700">4</span>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-black text-[#071D49] mb-4">Urgent Discipline Queue</h3>
        {MOCK_URGENT_CASES.length > 0 ? (
          <div className="overflow-x-auto rounded-xl border border-[#D8E0EC]">
            <table className="w-full text-left text-sm text-[#071D49]">
              <thead className="bg-[#F8FAFC] text-xs font-black uppercase text-[#64748B]">
                <tr>
                  <th className="px-4 py-3">Case No.</th>
                  <th className="px-4 py-3">Student & Class</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Severity</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D8E0EC]">
                {MOCK_URGENT_CASES.map((row) => (
                  <tr key={row.id} className="hover:bg-[#F8FAFC]">
                    <td className="px-4 py-3 font-semibold">{row.id}</td>
                    <td className="px-4 py-3">
                      <div className="font-bold">{row.student}</div>
                      <div className="text-xs text-[#64748B]">{row.class}</div>
                    </td>
                    <td className="px-4 py-3">{row.category}</td>
                    <td className="px-4 py-3">
                      <StatusChip label={row.severity} tone={row.severity === 'Critical' ? 'danger' : 'warning'} />
                    </td>
                    <td className="px-4 py-3">
                      <StatusChip label={row.status} tone={row.status === 'New' ? 'info' : 'warning'} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button className="text-xs font-bold text-[#1D4ED8] hover:underline">View</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState 
            message="No active discipline cases today. New teacher reports, student incidents, or parent follow-ups will appear here." 
            icon={ClipboardList} 
          />
        )}
      </div>
    </Panel>
  );
}
