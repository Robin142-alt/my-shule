"use client";

import { UserCircle, Search, FileText } from "lucide-react";
import { Panel, StatusChip, EmptyState } from "./shared";

export function StudentConductProfilesWorkspace() {
  return (
    <Panel title="Student Conduct Profiles" description="View discipline history and behavior scores for individual students." icon={UserCircle}>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative w-full sm:w-[400px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#64748B]" />
          <input
            type="text"
            placeholder="Search student by name or admission number..."
            className="w-full rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] py-3 pl-10 pr-4 text-sm focus:border-[#38BDF8] focus:outline-none focus:ring-2 focus:ring-[#38BDF8]/20"
          />
        </div>
        <button className="rounded-xl bg-[#071D49] px-6 py-3 text-sm font-black text-white hover:bg-[#0A2661]">
          Search Profile
        </button>
      </div>

      <div className="rounded-2xl border border-[#D8E0EC] p-6 bg-[#F8FAFC]">
        <EmptyState 
          message="Search for a student to view their complete discipline history, behavior points, interventions, and parent communication records." 
          icon={FileText} 
        />
      </div>
    </Panel>
  );
}
