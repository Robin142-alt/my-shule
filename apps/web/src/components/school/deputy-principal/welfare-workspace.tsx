"use client";
import { useState } from "react";
import { Stethoscope } from "lucide-react";
import { Panel, StatusChip, Tone } from "./shared";
import { Modal } from "@/components/ui/modal";
import { useSchoolQuery, useSchoolMutation } from "@/lib/data/school-hooks";
import { toast } from "sonner";
import { createWelfareCase, openWelfareCase } from "./api-client";

export type WelfareCase = {
  id: string;
  studentName: string;
  concern: string;
  assignedTo: string;
  status: "Referred" | "In Progress" | "Resolved";
};

type WelfareData = {
  metrics: {
    clinic_visits_today: number;
  };
  cases: WelfareCase[];
};

export function DeputyWelfareWorkspace() {
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ studentName: "", concern: "", assignedTo: "School Counsellor" });

  const { data, isLoading, refetch } = useSchoolQuery<WelfareData>('/admin-command/deputy/welfare');

  const createMutation = useSchoolMutation('/admin-command/deputy/welfare', 'POST', {
    onSuccess: () => refetch()
  });

  const cases = data?.cases || [];

  const handleCreate = async () => {
    try {
      await createWelfareCase({
        studentName: formData.studentName,
        concern: formData.concern,
        assignedTo: formData.assignedTo,
      });
      setShowModal(false);
      setFormData({ studentName: "", concern: "", assignedTo: "School Counsellor" });
      await refetch();
      toast.success("Welfare case created and referred successfully.");
    } catch (e: any) {
      toast.error(e.message || "Failed to create welfare case");
    }
  };

  const handleOpenCase = async (id: string, studentName: string) => {
    try {
      await openWelfareCase(id);
      await refetch();
      toast.success(`Case for ${studentName} opened. Status updated to In Progress.`);
    } catch (e: any) {
      toast.error(e.message || "Failed to open case.");
    }
  };

  const getStatusTone = (st: string): Tone => {
    if (st === "Referred") return "info";
    if (st === "In Progress") return "warning";
    return "success";
  };

  return (
    <Panel title="Student Welfare" description="Non-punitive student support, counselling, and general welfare." icon={Stethoscope} actions={
      <button onClick={() => setShowModal(true)} className="rounded-lg bg-primary px-4 py-2 text-sm font-black text-white hover:bg-blue-900 transition">Create Welfare Case</button>
    }>
      <div className="grid gap-4 md:grid-cols-2 mb-6">
        <div className="rounded-xl border border-border bg-surface-muted p-4">
          <div className="text-sm font-semibold text-muted">Clinic Visits Today</div>
          <div className="mt-1 text-lg font-black text-foreground">{isLoading ? "..." : data?.metrics?.clinic_visits_today || 0}</div>
        </div>
      </div>
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm text-left whitespace-nowrap">
          <thead className="bg-surface-muted text-foreground">
            <tr>
              <th className="px-4 py-3 font-bold border-b border-border">Student</th>
              <th className="px-4 py-3 font-bold border-b border-border">Concern</th>
              <th className="px-4 py-3 font-bold border-b border-border">Assigned To</th>
              <th className="px-4 py-3 font-bold border-b border-border">Status</th>
              <th className="px-4 py-3 font-bold border-b border-border text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {cases.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted">No recent welfare cases found.</td>
              </tr>
            ) : (
              cases.map((wc) => (
                <tr key={wc.id} className="hover:bg-surface-muted">
                  <td className="px-4 py-3 font-semibold text-foreground">{wc.studentName}</td>
                  <td className="px-4 py-3 text-muted">{wc.concern}</td>
                  <td className="px-4 py-3 text-muted">{wc.assignedTo}</td>
                  <td className="px-4 py-3"><StatusChip label={wc.status} tone={getStatusTone(wc.status)} /></td>
                  <td className="px-4 py-3 text-right">
                    {wc.status === "Referred" && (
                      <button onClick={() => handleOpenCase(wc.id, wc.studentName)} className="text-blue-600 hover:underline font-semibold text-xs">Open Case</button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Log New Welfare Case" footer={
        <>
          <button onClick={() => setShowModal(false)} className="rounded-lg px-4 py-2 text-sm font-bold text-muted hover:bg-slate-100">Cancel</button>
          <button disabled={!formData.studentName || createMutation.isPending} onClick={handleCreate} className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-black text-white hover:bg-rose-700 disabled:opacity-50">
            {createMutation.isPending ? "Saving..." : "Save Case"}
          </button>
        </>
      }>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-bold text-foreground">Student Name</label>
            <input value={formData.studentName} onChange={(e) => setFormData({...formData, studentName: e.target.value})} type="text" className="mt-1 w-full rounded-xl border border-border p-2 text-sm focus:border-blue-500 focus:outline-none" />
          </div>
          <div>
            <label className="text-sm font-bold text-foreground">Welfare Concern</label>
            <input value={formData.concern} onChange={(e) => setFormData({...formData, concern: e.target.value})} type="text" className="mt-1 w-full rounded-xl border border-border p-2 text-sm focus:border-blue-500 focus:outline-none" />
          </div>
          <div>
            <label className="text-sm font-bold text-foreground">Assign To</label>
            <select value={formData.assignedTo} onChange={(e) => setFormData({...formData, assignedTo: e.target.value})} className="mt-1 w-full rounded-xl border border-border p-2 text-sm focus:border-blue-500 focus:outline-none">
              <option>School Counsellor</option>
              <option>Class Teacher</option>
              <option>Nurse</option>
            </select>
          </div>
        </div>
      </Modal>
    </Panel>
  );
}
