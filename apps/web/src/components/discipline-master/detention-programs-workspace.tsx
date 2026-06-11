"use client";

import { Calendar, Users } from "lucide-react";
import { Panel, StatusChip, EmptyState } from "./shared";

const MOCK_PROGRAMS = [
  { id: "PRG-001", date: "2026-06-12", title: "Friday Detention", assignedTeacher: "Tr. Njoroge", studentsCount: 4, status: "Scheduled" },
];

export function DetentionProgramsWorkspace() {
  return (
    <Panel title="Detention / Corrective Programs" description="Manage group detentions and corrective manual work sessions." icon={Calendar}>
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-black text-[#071D49]">Upcoming Sessions</h3>
        <button className="rounded-xl bg-[#071D49] px-4 py-2 text-sm font-black text-white hover:bg-[#0A2661]">
          + Schedule Session
        </button>
      </div>

      <div className="mb-8">
        {MOCK_PROGRAMS.length > 0 ? (
          <div className="overflow-x-auto rounded-xl border border-[#D8E0EC]">
            <table className="w-full text-left text-sm text-[#071D49]">
              <thead className="bg-[#F8FAFC] text-xs font-black uppercase text-[#64748B]">
                <tr>
                  <th className="px-4 py-3">Session ID</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Title</th>
                  <th className="px-4 py-3">Assigned Teacher</th>
                  <th className="px-4 py-3">Students</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D8E0EC]">
                {MOCK_PROGRAMS.map((row) => (
                  <tr key={row.id} className="hover:bg-[#F8FAFC]">
                    <td className="px-4 py-3 font-semibold">{row.id}</td>
                    <td className="px-4 py-3">{row.date}</td>
                    <td className="px-4 py-3 font-bold">{row.title}</td>
                    <td className="px-4 py-3 text-[#64748B]">{row.assignedTeacher}</td>
                    <td className="px-4 py-3 font-bold text-[#1D4ED8]">{row.studentsCount} Students</td>
                    <td className="px-4 py-3">
                      <StatusChip label={row.status} tone={row.status === 'Scheduled' ? 'info' : 'success'} />
                    </td>
                    <td className="px-4 py-3 text-right">
                       <button className="text-[#1D4ED8] hover:text-[#071D49]"><Users className="h-4 w-4" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState 
            message="No upcoming detention or corrective programs." 
            icon={Calendar} 
          />
        )}
      </div>
    </Panel>
  );
}
