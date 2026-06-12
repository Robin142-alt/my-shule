"use client";

import { List, Search, Filter } from "lucide-react";
import { Panel, StatusChip } from "./shared";
import { useAllDisciplineCases } from "@/hooks/useDiscipline";

export function IncidentRegisterWorkspace() {
  const { data: incidents = [], isLoading } = useAllDisciplineCases();

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
            {isLoading ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-sm font-bold text-slate-500">Loading incidents...</td></tr>
            ) : incidents.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-sm font-bold text-slate-500">No incidents found.</td></tr>
            ) : incidents.map((row: any) => (
              <tr key={row.id} className="hover:bg-[#F8FAFC]">
                <td className="px-4 py-3 font-semibold text-[#1D4ED8] hover:underline cursor-pointer">{row.incident_number || row.id.substring(0,8)}</td>
                <td className="px-4 py-3 text-xs">{new Date(row.created_at || row.date).toLocaleDateString()}</td>
                <td className="px-4 py-3 font-bold">{row.student_id ? row.student_id.substring(0,8) : row.student}</td>
                <td className="px-4 py-3 text-[#64748B]">{row.class || "-"}</td>
                <td className="px-4 py-3">{row.category_id || row.category || "-"}</td>
                <td className="px-4 py-3">
                  <StatusChip 
                    label={row.status} 
                    tone={
                      row.status === 'closed' ? 'success' :
                      row.status === 'new' ? 'info' :
                      row.status === 'action_taken' ? 'neutral' : 'warning'
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
