"use client";

import { HeartHandshake, Eye } from "lucide-react";
import { Panel, StatusChip, EmptyState } from "./shared";
import { useSchoolQuery } from "@/lib/data/school-hooks";


export function CounsellingReferralsWorkspace() {
  const { data: referralsData, isLoading } = useSchoolQuery<any>("/api/counselling/referrals");
  const referrals = Array.isArray(referralsData) ? referralsData : [];

  return (
    <Panel title="Counselling Referrals" description="Track students referred to the guidance and counselling department." icon={HeartHandshake}>
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-black text-[#071D49]">Active Referrals</h3>
        <button className="rounded-xl bg-[#071D49] px-4 py-2 text-sm font-black text-white hover:bg-[#0A2661]">
          + New Referral
        </button>
      </div>

      <div className="mb-8">
        {isLoading ? (
          <div className="p-8 text-center text-slate-500">Loading referrals...</div>
        ) : referrals.length > 0 ? (
          <div className="overflow-x-auto rounded-xl border border-[#D8E0EC]">
            <table className="w-full text-left text-sm text-[#071D49]">
              <thead className="bg-[#F8FAFC] text-xs font-black uppercase text-[#64748B]">
                <tr>
                  <th className="px-4 py-3">Referral ID</th>
                  <th className="px-4 py-3">Student</th>
                  <th className="px-4 py-3">Reason Summary</th>
                  <th className="px-4 py-3">Referred On</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D8E0EC]">
                {referrals.map((row: any) => (
                  <tr key={row.id} className="hover:bg-[#F8FAFC]">
                    <td className="px-4 py-3 font-semibold">{row.id.substring(0,8)}</td>
                    <td className="px-4 py-3 font-bold">{row.student_name || row.student_id.substring(0,8)}</td>
                    <td className="px-4 py-3 text-[#64748B]">{row.reason}</td>
                    <td className="px-4 py-3">{new Date(row.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <StatusChip label={row.status} tone={row.status === 'accepted' ? 'success' : 'warning'} />
                    </td>
                    <td className="px-4 py-3 text-right">
                       <button className="text-[#1D4ED8] hover:text-[#071D49]"><Eye className="h-4 w-4" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState 
            message="No active counselling referrals." 
            icon={HeartHandshake} 
          />
        )}
      </div>
    </Panel>
  );
}
