"use client";
import { useState } from "react";
import { Activity } from "lucide-react";
import { toast } from "sonner";
import { Panel, StatusChip, Tone } from "./shared";
import { Modal } from "@/components/ui/modal";
import { useSchoolQuery } from "@/lib/data/school-hooks";
import { createDailyOperationNote } from "./api-client";

export type OperationNote = {
  id: string;
  time: string;
  area: string;
  issue: string;
  status: "Active" | "Resolved";
};

type DailyOperationsData = {
  metrics: {
    morning_parade_status: string;
    staff_on_duty_present: number;
    staff_on_duty_total: number;
    gate_security_status: string;
    classes_not_started: number;
  };
  notes: OperationNote[];
};

export function DeputyDailyOperationsWorkspace() {
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ area: "", issue: "" });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { data, isLoading, refetch } = useSchoolQuery<DailyOperationsData>('/admin-command/deputy/daily-operations');

  const notes = data?.notes || [];
  const metrics = data?.metrics || {
    morning_parade_status: "Pending",
    staff_on_duty_present: 0,
    staff_on_duty_total: 0,
    gate_security_status: "No Report",
    classes_not_started: 0,
  };

  const handleCreate = async () => {
    setIsSubmitting(true);
    try {
      await createDailyOperationNote({
        area: formData.area,
        issue: formData.issue
      });
      toast.success("Operation Note created successfully.");
      setShowModal(false);
      setFormData({ area: "", issue: "" });
      refetch();
    } catch (error) {
      toast.error("Failed to create Operation Note.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusTone = (st: string): Tone => {
    if (st === "Resolved") return "success";
    return "warning";
  };

  return (
    <Panel title="Daily Operations" description="Manage the school day from morning to evening." icon={Activity} actions={
      <button onClick={() => setShowModal(true)} className="rounded-lg bg-[#071D49] px-4 py-2 text-sm font-black text-white hover:bg-blue-900">Create Operation Note</button>
    }>
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
          <div className="text-sm font-semibold text-[#64748B]">Morning Parade</div>
          <div className="mt-1 text-lg font-black text-emerald-600">{isLoading ? "..." : metrics.morning_parade_status}</div>
        </div>
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
          <div className="text-sm font-semibold text-[#64748B]">Staff on Duty</div>
          <div className="mt-1 text-lg font-black text-[#071D49]">{isLoading ? "..." : `${metrics.staff_on_duty_present} / ${metrics.staff_on_duty_total} Present`}</div>
        </div>
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
          <div className="text-sm font-semibold text-[#64748B]">Gate Security</div>
          <div className="mt-1 text-lg font-black text-[#071D49]">{isLoading ? "..." : metrics.gate_security_status}</div>
        </div>
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
          <div className="text-sm font-semibold text-rose-700">Classes Not Started</div>
          <div className="mt-1 text-lg font-black text-rose-700">{isLoading ? "..." : metrics.classes_not_started}</div>
        </div>
      </div>
      <div className="overflow-x-auto rounded-xl border border-[#D8E0EC]">
        <table className="w-full text-sm text-left whitespace-nowrap">
          <thead className="bg-[#F8FAFC] text-[#071D49]">
            <tr>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Time</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Area</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Issue</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Status</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC] text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D8E0EC]">
            {notes.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-[#64748B]">No operational notes logged today.</td>
              </tr>
            ) : (
              notes.map((note) => (
                <tr key={note.id} className="hover:bg-[#F8FAFC]">
                  <td className="px-4 py-3 text-[#64748B]">{note.time}</td>
                  <td className="px-4 py-3 font-semibold text-[#071D49]">{note.area}</td>
                  <td className="px-4 py-3 text-[#64748B]">{note.issue}</td>
                  <td className="px-4 py-3"><StatusChip label={note.status} tone={getStatusTone(note.status)} /></td>
                  <td className="px-4 py-3 text-right">
                    <button className="text-blue-600 hover:underline font-semibold text-xs">View Note</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Log Daily Operation Note" footer={
        <>
          <button onClick={() => setShowModal(false)} className="rounded-lg px-4 py-2 text-sm font-bold text-[#64748B] hover:bg-slate-100">Cancel</button>
          <button disabled={!formData.area || !formData.issue || isSubmitting} onClick={handleCreate} className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-black text-white hover:bg-rose-700 disabled:opacity-50">
            {isSubmitting ? "Saving..." : "Save Note"}
          </button>
        </>
      }>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-bold text-[#334155]">Area</label>
            <input value={formData.area} onChange={(e) => setFormData({...formData, area: e.target.value})} type="text" className="mt-1 w-full rounded-xl border border-[#D8E0EC] p-2 text-sm focus:border-blue-500 focus:outline-none" />
          </div>
          <div>
            <label className="text-sm font-bold text-[#334155]">Issue Details</label>
            <input value={formData.issue} onChange={(e) => setFormData({...formData, issue: e.target.value})} type="text" className="mt-1 w-full rounded-xl border border-[#D8E0EC] p-2 text-sm focus:border-blue-500 focus:outline-none" />
          </div>
        </div>
      </Modal>
    </Panel>
  );
}