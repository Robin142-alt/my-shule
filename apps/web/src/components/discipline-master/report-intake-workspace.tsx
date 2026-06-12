"use client";

import { FileText, Inbox, CheckCircle, XCircle } from "lucide-react";
import { Panel, StatusChip, EmptyState } from "./shared";
import { useSchoolQuery } from "@/lib/data/school-hooks";

export function ReportIntakeWorkspace() {
  const { data: reports = [], isLoading } = useSchoolQuery<any[]>("/api/discipline/reports");

  return (
    <Panel title="Report Intake" description="Review discipline reports submitted by other staff." icon={Inbox}>
      <div className="grid gap-4 md:grid-cols-5 mb-8">
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4 cursor-pointer hover:border-[#38BDF8]">
          <span className="block text-xs font-black uppercase text-[#64748B]">New Reports</span>
          <span className="mt-1 block text-2xl font-black text-[#071D49]">3</span>
        </div>
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4 cursor-pointer hover:border-[#38BDF8]">
          <span className="block text-xs font-black uppercase text-[#64748B]">Needs Info</span>
          <span className="mt-1 block text-2xl font-black text-[#071D49]">1</span>
        </div>
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4 cursor-pointer hover:border-[#38BDF8]">
          <span className="block text-xs font-black uppercase text-[#64748B]">Converted</span>
          <span className="mt-1 block text-2xl font-black text-[#071D49]">12</span>
        </div>
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4 cursor-pointer hover:border-[#38BDF8]">
          <span className="block text-xs font-black uppercase text-[#64748B]">Dismissed</span>
          <span className="mt-1 block text-2xl font-black text-[#071D49]">4</span>
        </div>
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 cursor-pointer hover:border-blue-300">
          <span className="block text-xs font-black uppercase text-blue-700">This Week</span>
          <span className="mt-1 block text-2xl font-black text-blue-700">20</span>
        </div>
      </div>

      <div>
        {reports.length > 0 ? (
          <div className="overflow-x-auto rounded-xl border border-[#D8E0EC]">
            <table className="w-full text-left text-sm text-[#071D49]">
              <thead className="bg-[#F8FAFC] text-xs font-black uppercase text-[#64748B]">
                <tr>
                  <th className="px-4 py-3">Report ID</th>
                  <th className="px-4 py-3">Staff / Role</th>
                  <th className="px-4 py-3">Student & Class</th>
                  <th className="px-4 py-3">Type & Preview</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D8E0EC]">
                {reports.map((row) => (
                  <tr key={row.id} className="hover:bg-[#F8FAFC]">
                    <td className="px-4 py-3 font-semibold">{row.id}</td>
                    <td className="px-4 py-3">
                      <div className="font-bold">{row.reportedBy}</div>
                      <div className="text-xs text-[#64748B]">{row.role}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-bold">{row.student}</div>
                      <div className="text-xs text-[#64748B]">{row.class}</div>
                    </td>
                    <td className="px-4 py-3 max-w-[200px] truncate">
                      <div className="font-bold">{row.type}</div>
                      <div className="text-xs text-[#64748B] truncate">{row.preview}</div>
                    </td>
                    <td className="px-4 py-3 text-xs">{row.date}</td>
                    <td className="px-4 py-3">
                      <StatusChip label={row.status} tone={row.status === 'New' ? 'info' : 'warning'} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button className="text-[#1D4ED8] hover:text-[#071D49]"><CheckCircle className="h-4 w-4" /></button>
                        <button className="text-rose-500 hover:text-rose-700"><XCircle className="h-4 w-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState 
            message="No pending discipline reports from staff." 
            icon={FileText} 
          />
        )}
      </div>
    </Panel>
  );
}
