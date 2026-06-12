"use client";

import { AlertTriangle, CheckSquare } from "lucide-react";
import { Panel, StatusChip, EmptyState } from "./shared";
import { useSchoolQuery } from "@/lib/data/school-hooks";

export function SeriousCasesApprovalsWorkspace() {
  const { data: approvals = [], isLoading } = useSchoolQuery<any[]>("/api/discipline/approvals");
  return (
    <Panel title="Serious Cases & Approvals" description="Track cases escalated to the Deputy or Principal for final decision." icon={AlertTriangle}>
      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4 cursor-pointer hover:border-[#38BDF8]">
          <span className="block text-xs font-black uppercase text-[#64748B]">Pending Approvals</span>
          <span className="mt-1 block text-2xl font-black text-[#071D49]">1</span>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 cursor-pointer hover:border-emerald-300">
          <span className="block text-xs font-black uppercase text-emerald-700">Approved</span>
          <span className="mt-1 block text-2xl font-black text-emerald-700">2</span>
        </div>
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 cursor-pointer hover:border-rose-300">
          <span className="block text-xs font-black uppercase text-rose-700">Rejected / Modified</span>
          <span className="mt-1 block text-2xl font-black text-rose-700">0</span>
        </div>
      </div>

      <div className="mb-8">
        {approvals.length > 0 ? (
          <div className="overflow-x-auto rounded-xl border border-[#D8E0EC]">
            <table className="w-full text-left text-sm text-[#071D49]">
              <thead className="bg-[#F8FAFC] text-xs font-black uppercase text-[#64748B]">
                <tr>
                  <th className="px-4 py-3">Req ID</th>
                  <th className="px-4 py-3">Student</th>
                  <th className="px-4 py-3">Requested Action</th>
                  <th className="px-4 py-3">Approver</th>
                  <th className="px-4 py-3">Requested On</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D8E0EC]">
                {approvals.map((row) => (
                  <tr key={row.id} className="hover:bg-[#F8FAFC]">
                    <td className="px-4 py-3 font-semibold">{row.id}</td>
                    <td className="px-4 py-3 font-bold">{row.student}</td>
                    <td className="px-4 py-3 text-rose-600 font-bold">{row.requestedAction}</td>
                    <td className="px-4 py-3 text-[#64748B]">{row.approver}</td>
                    <td className="px-4 py-3">{row.requestedOn}</td>
                    <td className="px-4 py-3">
                      <StatusChip label={row.status} tone={row.status === 'Pending' ? 'warning' : 'success'} />
                    </td>
                    <td className="px-4 py-3 text-right">
                       <button className="text-[#1D4ED8] hover:underline text-xs font-bold">Review</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState 
            message={isLoading ? "Loading approvals..." : "No cases pending approval."} 
            icon={CheckSquare} 
          />
        )}
      </div>
    </Panel>
  );
}
