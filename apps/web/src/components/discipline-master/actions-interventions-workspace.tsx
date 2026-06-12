"use client";

import { ShieldAlert, CheckSquare } from "lucide-react";
import { Panel, StatusChip, EmptyState } from "./shared";
import { useSchoolQuery } from "@/lib/data/school-hooks";

export function ActionsInterventionsWorkspace() {
  const { data: actions = [], isLoading } = useSchoolQuery<any[]>("/api/discipline/actions");

  return (
    <Panel title="Actions & Interventions" description="Track discipline actions assigned to staff and students." icon={ShieldAlert}>
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4 cursor-pointer hover:border-[#38BDF8]">
          <span className="block text-xs font-black uppercase text-[#64748B]">Pending Actions</span>
          <span className="mt-1 block text-2xl font-black text-[#071D49]">{actions.filter(a => a.status === 'Pending Completion').length}</span>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 cursor-pointer hover:border-emerald-300">
          <span className="block text-xs font-black uppercase text-emerald-700">Completed This Week</span>
          <span className="mt-1 block text-2xl font-black text-emerald-700">{actions.filter(a => a.status === 'Completed').length}</span>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-black text-[#071D49] mb-4">Assigned Disciplinary Actions</h3>
        {actions.length > 0 ? (
          <div className="overflow-x-auto rounded-xl border border-[#D8E0EC]">
            <table className="w-full text-left text-sm text-[#071D49]">
              <thead className="bg-[#F8FAFC] text-xs font-black uppercase text-[#64748B]">
                <tr>
                  <th className="px-4 py-3">Action ID</th>
                  <th className="px-4 py-3">Student</th>
                  <th className="px-4 py-3">Action Required</th>
                  <th className="px-4 py-3">Assigned To</th>
                  <th className="px-4 py-3">Due Date</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D8E0EC]">
                {actions.map((row) => (
                  <tr key={row.id} className="hover:bg-[#F8FAFC]">
                    <td className="px-4 py-3 font-semibold">{row.id}</td>
                    <td className="px-4 py-3 font-bold">{row.student}</td>
                    <td className="px-4 py-3 text-[#64748B]">{row.action}</td>
                    <td className="px-4 py-3">{row.assignedTo}</td>
                    <td className="px-4 py-3">{row.dueDate}</td>
                    <td className="px-4 py-3">
                      <StatusChip label={row.status} tone={row.status === 'Completed' ? 'success' : 'warning'} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      {row.status === 'Pending Completion' && (
                         <button className="text-[#1D4ED8] hover:text-[#071D49]"><CheckSquare className="h-4 w-4" /></button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState 
            message={isLoading ? "Loading actions..." : "No active interventions."} 
            icon={CheckSquare} 
          />
        )}
      </div>
    </Panel>
  );
}
