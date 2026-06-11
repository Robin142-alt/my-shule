"use client";

import { List, Search, Filter } from "lucide-react";
import { Panel, StatusChip } from "./shared";

const MOCK_INCIDENTS = [
  { id: "DM-2026-0001", date: "2026-06-11", student: "Brian Otieno", class: "Form 2 Blue", category: "Bullying", status: "Under Review" },
  { id: "DM-2026-0002", date: "2026-06-10", student: "Sarah Njoroge", class: "Form 3 Red", category: "Substance Abuse", status: "New" },
  { id: "DM-2026-0003", date: "2026-06-08", student: "Kevin Kimani", class: "Form 1 Green", category: "Noise Making", status: "Action Taken" },
  { id: "DM-2026-0004", date: "2026-06-05", student: "Mary Wambui", class: "Form 4 Yellow", category: "Truancy", status: "Closed" },
];

export function IncidentRegisterWorkspace() {
  return (
    <Panel title="Incident Register" description="Full database of all logged discipline incidents." icon={List}>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#64748B]" />
          <input
            type="text"
            placeholder="Search by student, ID, or category..."
            className="w-full rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] py-2.5 pl-10 pr-4 text-sm focus:border-[#38BDF8] focus:outline-none focus:ring-2 focus:ring-[#38BDF8]/20"
          />
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-2 rounded-xl border border-[#D8E0EC] bg-white px-4 py-2.5 text-sm font-bold text-[#071D49] hover:bg-[#F8FAFC]">
            <Filter className="h-4 w-4" /> Filter Status
          </button>
          <button className="rounded-xl border border-[#D8E0EC] bg-white px-4 py-2.5 text-sm font-bold text-[#071D49] hover:bg-[#F8FAFC]">
            Export Excel
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-[#D8E0EC]">
        <table className="w-full text-left text-sm text-[#071D49]">
          <thead className="bg-[#F8FAFC] text-xs font-black uppercase text-[#64748B]">
            <tr>
              <th className="px-4 py-3">Case ID</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Student</th>
              <th className="px-4 py-3">Class</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D8E0EC]">
            {MOCK_INCIDENTS.map((row) => (
              <tr key={row.id} className="hover:bg-[#F8FAFC]">
                <td className="px-4 py-3 font-semibold text-[#1D4ED8] hover:underline cursor-pointer">{row.id}</td>
                <td className="px-4 py-3 text-xs">{row.date}</td>
                <td className="px-4 py-3 font-bold">{row.student}</td>
                <td className="px-4 py-3 text-[#64748B]">{row.class}</td>
                <td className="px-4 py-3">{row.category}</td>
                <td className="px-4 py-3">
                  <StatusChip 
                    label={row.status} 
                    tone={
                      row.status === 'Closed' ? 'success' :
                      row.status === 'New' ? 'info' :
                      row.status === 'Action Taken' ? 'neutral' : 'warning'
                    } 
                  />
                </td>
                <td className="px-4 py-3 text-right">
                  <button className="text-xs font-bold text-[#1D4ED8] hover:underline">Manage</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
