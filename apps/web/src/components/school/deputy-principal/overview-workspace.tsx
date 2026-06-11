"use client";
import { useState, useEffect } from "react";
import { LayoutDashboard, Users, UserX, UserCheck, AlertTriangle, ShieldAlert } from "lucide-react";
import { Panel, StatusChip, Tone } from "./shared";
import { readSchoolData, subscribeToSchoolDataUpdates, updateSchoolRecord, createNotification } from "@/lib/school/school-operational-store";

import { useSchoolQuery } from "@/lib/data/school-hooks";

type DeputyOverviewData = {
  incident_summary: {
    reported_incidents: number;
    escalated_incidents: number;
  };
};

export function DeputyOverviewWorkspace() {
  const { data, isLoading } = useSchoolQuery<DeputyOverviewData>('/admin-command/deputy/dashboard');

  const reportedIncidents = data?.incident_summary?.reported_incidents || 0;
  const escalatedIncidents = data?.incident_summary?.escalated_incidents || 0;

  return (
    <Panel title="Overview" description="Today's Priority Queue and school state." icon={LayoutDashboard} actions={
      <button onClick={() => alert("Starting Morning Review Workflow...")} className="rounded-lg bg-[#071D49] px-4 py-2 text-sm font-black text-white hover:bg-blue-900 transition">Start Morning Review</button>
    }>
      <div className="grid gap-4 md:grid-cols-4 lg:grid-cols-4 mb-6">
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4 flex flex-col justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold text-[#64748B]"><UserCheck className="w-4 h-4"/> Present Today</div>
          <div className="mt-2 text-3xl font-black text-emerald-600">--</div>
        </div>
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 flex flex-col justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold text-rose-700"><UserX className="w-4 h-4"/> Absent Today</div>
          <div className="mt-2 text-3xl font-black text-rose-700">--</div>
        </div>
        <div className="rounded-xl border border-orange-200 bg-orange-50 p-4 flex flex-col justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold text-orange-700"><ShieldAlert className="w-4 h-4"/> Open Incidents</div>
          <div className="mt-2 text-3xl font-black text-orange-700">{isLoading ? "..." : reportedIncidents}</div>
        </div>
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4 flex flex-col justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold text-[#64748B]"><AlertTriangle className="w-4 h-4"/> Escalations</div>
          <div className="mt-2 text-3xl font-black text-[#071D49]">{isLoading ? "..." : escalatedIncidents}</div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-[#D8E0EC]">
        <table className="w-full text-sm text-left whitespace-nowrap">
          <thead className="bg-[#F8FAFC] text-[#071D49]">
            <tr>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Priority</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Type</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Student/Staff</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Class/Dept</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Status</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC] text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D8E0EC]">
             <tr className="hover:bg-[#F8FAFC]">
               <td className="px-4 py-3"><StatusChip label="Critical" tone="danger" /></td>
               <td className="px-4 py-3 font-semibold text-[#071D49]">Discipline</td>
               <td className="px-4 py-3 text-[#64748B]">Brian Otieno</td>
               <td className="px-4 py-3 text-[#64748B]">Form 2 East</td>
               <td className="px-4 py-3 text-[#64748B]">New</td>
               <td className="px-4 py-3 text-right">
                 <button className="text-blue-600 hover:underline font-semibold text-xs">Open Task</button>
               </td>
             </tr>
          </tbody>
        </table>
      </div>
    </Panel>
  );
}