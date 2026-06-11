"use client";

import { FileSearch, Paperclip, MessageSquare } from "lucide-react";
import { Panel, StatusChip, EmptyState } from "./shared";

const MOCK_INVESTIGATIONS = [
  { id: "INV-001", caseId: "DM-2026-0001", student: "Brian Otieno", investigator: "Discipline Master", dueDate: "2026-06-12", status: "In Progress" },
];

export function InvestigationsWorkspace() {
  return (
    <Panel title="Investigations" description="Record statements, collect evidence, and track investigation progress." icon={FileSearch}>
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-black text-[#071D49]">Active Investigations</h3>
        <button className="rounded-xl border border-[#D8E0EC] bg-white px-4 py-2 text-sm font-bold text-[#071D49] hover:bg-[#F8FAFC]">
          Filter Active
        </button>
      </div>

      <div className="mb-8">
        {MOCK_INVESTIGATIONS.length > 0 ? (
          <div className="overflow-x-auto rounded-xl border border-[#D8E0EC]">
            <table className="w-full text-left text-sm text-[#071D49]">
              <thead className="bg-[#F8FAFC] text-xs font-black uppercase text-[#64748B]">
                <tr>
                  <th className="px-4 py-3">Inv ID</th>
                  <th className="px-4 py-3">Case ID</th>
                  <th className="px-4 py-3">Student</th>
                  <th className="px-4 py-3">Investigator</th>
                  <th className="px-4 py-3">Due Date</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D8E0EC]">
                {MOCK_INVESTIGATIONS.map((row) => (
                  <tr key={row.id} className="hover:bg-[#F8FAFC]">
                    <td className="px-4 py-3 font-semibold">{row.id}</td>
                    <td className="px-4 py-3 text-[#1D4ED8] hover:underline cursor-pointer">{row.caseId}</td>
                    <td className="px-4 py-3 font-bold">{row.student}</td>
                    <td className="px-4 py-3 text-[#64748B]">{row.investigator}</td>
                    <td className="px-4 py-3">{row.dueDate}</td>
                    <td className="px-4 py-3">
                      <StatusChip label={row.status} tone="info" />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button className="text-[#64748B] hover:text-[#071D49]"><Paperclip className="h-4 w-4" /></button>
                        <button className="text-[#64748B] hover:text-[#071D49]"><MessageSquare className="h-4 w-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState 
            message="No active investigations." 
            icon={FileSearch} 
          />
        )}
      </div>
    </Panel>
  );
}
