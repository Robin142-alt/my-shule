"use client";

import { FilePlus } from "lucide-react";
import { Panel } from "./shared";

export function LogIncidentWorkspace() {
  return (
    <Panel title="Log Incident" description="Quickly log a new discipline case." icon={FilePlus}>
      <form className="max-w-3xl space-y-6">
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-bold text-[#071D49]">Student</label>
            <input type="text" placeholder="Search by name or admission..." className="w-full rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] px-4 py-2 text-sm focus:border-[#38BDF8] focus:outline-none focus:ring-2 focus:ring-[#38BDF8]/20" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-[#071D49]">Incident Date & Time</label>
            <input type="datetime-local" className="w-full rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] px-4 py-2 text-sm focus:border-[#38BDF8] focus:outline-none focus:ring-2 focus:ring-[#38BDF8]/20" />
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-bold text-[#071D49]">Category</label>
            <select className="w-full rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] px-4 py-2 text-sm focus:border-[#38BDF8] focus:outline-none focus:ring-2 focus:ring-[#38BDF8]/20">
              <option value="">Select Category...</option>
              <option value="bullying">Bullying</option>
              <option value="truancy">Truancy</option>
              <option value="substance_abuse">Substance Abuse</option>
              <option value="noise">Noise Making</option>
              <option value="fighting">Fighting</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-[#071D49]">Severity</label>
            <select className="w-full rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] px-4 py-2 text-sm focus:border-[#38BDF8] focus:outline-none focus:ring-2 focus:ring-[#38BDF8]/20">
              <option value="low">Low - Warning/Points</option>
              <option value="medium">Medium - Detention/Manual Work</option>
              <option value="high">High - Parent Meeting/Suspension</option>
              <option value="critical">Critical - Immediate Escalation</option>
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-bold text-[#071D49]">Incident Description</label>
          <textarea rows={4} placeholder="Describe exactly what happened..." className="w-full rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] px-4 py-2 text-sm focus:border-[#38BDF8] focus:outline-none focus:ring-2 focus:ring-[#38BDF8]/20"></textarea>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-bold text-[#071D49]">Witnesses (Optional)</label>
          <input type="text" placeholder="e.g. Tr. Kamau, Student John Doe" className="w-full rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] px-4 py-2 text-sm focus:border-[#38BDF8] focus:outline-none focus:ring-2 focus:ring-[#38BDF8]/20" />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-[#D8E0EC]">
          <button type="button" className="rounded-xl border border-[#D8E0EC] bg-white px-5 py-2.5 text-sm font-bold text-[#64748B] hover:bg-[#F8FAFC]">Cancel</button>
          <button type="submit" className="rounded-xl bg-[#071D49] px-5 py-2.5 text-sm font-black text-white hover:bg-[#0A2661]">Save & Triage</button>
        </div>
      </form>
    </Panel>
  );
}
