"use client";
import { useState } from "react";
import { ClipboardCheck, CheckCircle, Printer, UserX } from "lucide-react";
import { toast } from "sonner";
import { Panel, StatusChip, Tone } from "./shared";
import { useSchoolQuery } from "@/lib/data/school-hooks";
import {  completeClearance, printClearanceForm } from "./api-client";

type ClearanceRecord = {
  id: string;
  student_name: string;
  admission_number: string;
  class: string;
  reason: string;
  initiated_by: string;
  initiated_date: string;
  status: string;
  steps_completed: number;
  total_steps: number;
  pending_departments: string[];
};

type ClearanceData = {
  metrics: {
    active_clearances: number;
    completed: number;
    pending_approval: number;
    blocked: number;
  };
  clearances: ClearanceRecord[];
};

export function StudentClearanceWorkspace() {
  const { data, isLoading, refetch } = useSchoolQuery<ClearanceData>('/admin-command/secretary/student-clearance');
  const [actionId, setActionId] = useState<string | null>(null);

  const clearances = data?.clearances || [];
  const metrics = data?.metrics;

  const getStatusTone = (status: string): Tone => {
    switch (status) {
      case "Completed": return "success";
      case "In Progress": return "info";
      case "Pending": return "warning";
      case "Blocked": return "danger";
      default: return "neutral";
    }
  };

  const handleComplete = async (id: string) => {
    setActionId(id);
    try {
      await completeClearance(id);
      toast.success("Clearance completed successfully.");
      refetch();
    } catch {
      toast.error("Failed to complete clearance.");
    } finally {
      setActionId(null);
    }
  };

  const handlePrint = async (id: string) => {
    setActionId(id);
    try {
      await printClearanceForm(id);
      toast.success("Clearance form sent to printer.");
    } catch {
      toast.error("Failed to print clearance form.");
    } finally {
      setActionId(null);
    }
  };

  return (
    <Panel title="Student Clearance" description="Process student clearance for transfers, graduation, and departures." icon={ClipboardCheck}>
      {/* Metrics */}
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
          <div className="text-sm font-semibold text-blue-700">Active Clearances</div>
          <div className="mt-1 text-2xl font-black text-blue-700">{isLoading ? "..." : metrics?.active_clearances || 0}</div>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <div className="text-sm font-semibold text-emerald-700">Completed</div>
          <div className="mt-1 text-2xl font-black text-emerald-700">{isLoading ? "..." : metrics?.completed || 0}</div>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <div className="text-sm font-semibold text-amber-700">Pending Approval</div>
          <div className="mt-1 text-2xl font-black text-amber-700">{isLoading ? "..." : metrics?.pending_approval || 0}</div>
        </div>
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-rose-700"><UserX className="w-4 h-4" /> Blocked</div>
          <div className="mt-1 text-2xl font-black text-rose-700">{isLoading ? "..." : metrics?.blocked || 0}</div>
        </div>
      </div>

      {/* Clearance Table */}
      <div className="overflow-x-auto rounded-xl border border-[#D8E0EC]">
        <table className="w-full text-sm text-left whitespace-nowrap">
          <thead className="bg-[#F8FAFC] text-[#071D49]">
            <tr>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Student</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Adm No.</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Class</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Reason</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Initiated</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Progress</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Pending Depts</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Status</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC] text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D8E0EC]">
            {isLoading ? (
              <tr><td colSpan={9} className="px-4 py-8 text-center text-[#64748B]">Loading clearance records...</td></tr>
            ) : clearances.length === 0 ? (
              <tr><td colSpan={9} className="px-4 py-8 text-center text-[#64748B]">No active clearance requests. Initiate a clearance when a student is transferring, graduating, or departing.</td></tr>
            ) : (
              clearances.map((c) => (
                <tr key={c.id} className="hover:bg-[#F8FAFC]">
                  <td className="px-4 py-3 font-medium text-[#071D49]">{c.student_name}</td>
                  <td className="px-4 py-3 font-mono text-[#64748B]">{c.admission_number}</td>
                  <td className="px-4 py-3 text-[#64748B]">{c.class}</td>
                  <td className="px-4 py-3 text-[#64748B]">{c.reason}</td>
                  <td className="px-4 py-3 text-[#64748B]">{c.initiated_date}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-20 rounded-full bg-slate-200 overflow-hidden">
                        <div className="h-full rounded-full bg-blue-500" style={{ width: `${c.total_steps > 0 ? (c.steps_completed / c.total_steps) * 100 : 0}%` }} />
                      </div>
                      <span className="text-xs font-bold text-[#64748B]">{c.steps_completed}/{c.total_steps}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[#64748B] text-xs">{c.pending_departments.length > 0 ? c.pending_departments.join(", ") : "—"}</td>
                  <td className="px-4 py-3"><StatusChip label={c.status} tone={getStatusTone(c.status)} /></td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {c.status === "In Progress" && c.steps_completed === c.total_steps && (
                        <button disabled={actionId === c.id} onClick={() => handleComplete(c.id)} className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50">
                          <CheckCircle className="w-3 h-3" /> Complete
                        </button>
                      )}
                      <button disabled={actionId === c.id} onClick={() => handlePrint(c.id)} className="inline-flex items-center gap-1 rounded-lg border border-[#D8E0EC] bg-white px-3 py-1.5 text-xs font-bold text-[#071D49] hover:bg-[#F8FAFC] disabled:opacity-50">
                        <Printer className="w-3 h-3" /> Print
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
