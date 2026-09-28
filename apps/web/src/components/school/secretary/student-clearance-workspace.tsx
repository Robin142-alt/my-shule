"use client";
import { RecordTable } from "@/components/ui/record-table";
import { useState } from "react";
import { ClipboardCheck, CheckCircle, Printer, UserX } from "lucide-react";
import { toast } from "sonner";
import { Panel, StatusChip, Tone } from "./shared";
import { useSchoolQuery } from "@/lib/data/school-hooks";
import { approveClearanceStep, completeClearance, printClearanceForm } from "./api-client";

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
      toast.success(`Clearance ${id} marked complete and department checklist refreshed.`);
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
        <div className="rounded-xl border border-info-border bg-info-soft p-4">
          <div className="text-sm font-semibold text-info">Active Clearances</div>
          <div className="mt-1 text-2xl font-black text-info">{isLoading ? "..." : metrics?.active_clearances || 0}</div>
        </div>
        <div className="rounded-xl border border-success-border bg-success-soft p-4">
          <div className="text-sm font-semibold text-success">Completed</div>
          <div className="mt-1 text-2xl font-black text-success">{isLoading ? "..." : metrics?.completed || 0}</div>
        </div>
        <div className="rounded-xl border border-warning-border bg-warning-soft p-4">
          <div className="text-sm font-semibold text-warning">Pending Approval</div>
          <div className="mt-1 text-2xl font-black text-warning">{isLoading ? "..." : metrics?.pending_approval || 0}</div>
        </div>
        <div className="rounded-xl border border-danger-border bg-danger-soft p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-danger"><UserX className="w-4 h-4" /> Blocked</div>
          <div className="mt-1 text-2xl font-black text-danger">{isLoading ? "..." : metrics?.blocked || 0}</div>
        </div>
      </div>

      {/* Clearance Table */}
      <div className="overflow-x-auto rounded-xl border border-border">
        <RecordTable className="w-full text-sm text-left whitespace-nowrap">
          <thead className="bg-surface-muted text-foreground">
            <tr>
              <th className="px-4 py-3 font-bold border-b border-border">Student</th>
              <th className="px-4 py-3 font-bold border-b border-border">Adm No.</th>
              <th className="px-4 py-3 font-bold border-b border-border">Class</th>
              <th className="px-4 py-3 font-bold border-b border-border">Reason</th>
              <th className="px-4 py-3 font-bold border-b border-border">Initiated</th>
              <th className="px-4 py-3 font-bold border-b border-border">Progress</th>
              <th className="px-4 py-3 font-bold border-b border-border">Pending Depts</th>
              <th className="px-4 py-3 font-bold border-b border-border">Status</th>
              <th className="px-4 py-3 font-bold border-b border-border text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              <tr><td colSpan={9} className="px-4 py-8 text-center text-muted">Loading clearance records...</td></tr>
            ) : clearances.length === 0 ? (
              <tr><td colSpan={9} className="px-4 py-8 text-center text-muted">No active clearance requests. Initiate a clearance when a student is transferring, graduating, or departing.</td></tr>
            ) : (
              clearances.map((c) => (
                <tr key={c.id} className="hover:bg-surface-muted">
                  <td className="px-4 py-3 font-medium text-foreground">{c.student_name}</td>
                  <td className="px-4 py-3 font-mono text-muted">{c.admission_number}</td>
                  <td className="px-4 py-3 text-muted">{c.class}</td>
                  <td className="px-4 py-3 text-muted">{c.reason}</td>
                  <td className="px-4 py-3 text-muted">{c.initiated_date}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-20 rounded-full bg-slate-200 overflow-hidden">
                        <div className="h-full rounded-full bg-blue-500" style={{ width: `${c.total_steps > 0 ? (c.steps_completed / c.total_steps) * 100 : 0}%` }} />
                      </div>
                      <span className="text-xs font-bold text-muted">{c.steps_completed}/{c.total_steps}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted text-xs">{c.pending_departments.length > 0 ? c.pending_departments.join(", ") : "—"}</td>
                  <td className="px-4 py-3"><StatusChip label={c.status} tone={getStatusTone(c.status)} /></td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {c.status === "In Progress" && c.steps_completed === c.total_steps && (
                        <button disabled={actionId === c.id} onClick={() => handleComplete(c.id)} className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50">
                          <CheckCircle className="w-3 h-3" /> Complete
                        </button>
                      )}
                      <button disabled={actionId === c.id} onClick={() => handlePrint(c.id)} className="inline-flex items-center gap-1 rounded-lg border border-border bg-white px-3 py-1.5 text-xs font-bold text-foreground hover:bg-surface-muted disabled:opacity-50">
                        <Printer className="w-3 h-3" /> Print
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </RecordTable>
      </div>
    </Panel>
  );
}
