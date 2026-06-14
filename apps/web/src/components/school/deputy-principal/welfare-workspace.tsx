"use client";
import { useState, useEffect } from "react";
import { Stethoscope } from "lucide-react";
import { Panel, StatusChip, Tone } from "./shared";
import { Modal } from "@/components/ui/modal";
import { readSchoolData, subscribeToSchoolDataUpdates, addSchoolRecord, updateSchoolRecord, createNotification } from "@/lib/school/school-operational-store";

export type WelfareCase = {
  id: string;
  studentName: string;
  concern: string;
  assignedTo: string;
  status: "Referred" | "In Progress" | "Resolved";
};

export function DeputyWelfareWorkspace() {
  const [cases, setCases] = useState<WelfareCase[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ studentName: "", concern: "", assignedTo: "School Counsellor" });

  const loadData = () => {
    const data = readSchoolData<WelfareCase>("deputyWelfare");
    setCases(data.length > 0 ? data : [
      { id: "1", studentName: "Jane Njeri", concern: "Repeated absenteeism", assignedTo: "School Counsellor", status: "Referred" }
    ]);
  };

  useEffect(() => {
    loadData();
    const unsub = subscribeToSchoolDataUpdates(({ moduleName }) => {
      if (moduleName === "deputyWelfare") loadData();
    });
    return unsub;
  }, []);

  const handleCreate = () => {
    const newCase: WelfareCase = {
      id: Math.random().toString(36).slice(2, 9),
      studentName: formData.studentName,
      concern: formData.concern,
      assignedTo: formData.assignedTo,
      status: "Referred"
    };
    addSchoolRecord("deputyWelfare", newCase);
    
    createNotification({
      audienceRoles: ["school_counsellor", "deputy_principal", "school_nurse"],
      sourceModule: "welfare",
      title: "New Welfare Referral",
      body: `Welfare case created for ${formData.studentName} concerning ${formData.concern}. Assigned to ${formData.assignedTo}.`,
      severity: "info",
    });
    
    setShowModal(false);
    setFormData({ studentName: "", concern: "", assignedTo: "School Counsellor" });
    alert("Welfare case created and referred successfully.");
  };

  const handleOpenCase = (id: string, studentName: string) => {
    updateSchoolRecord("deputyWelfare", id, { status: "In Progress" });
    alert(`Case for ${studentName} opened. Status updated to In Progress.`);
  };

  const getStatusTone = (st: string): Tone => {
    if (st === "Referred") return "info";
    if (st === "In Progress") return "warning";
    return "success";
  };

  return (
    <Panel title="Student Welfare" description="Non-punitive student support, counselling, and general welfare." icon={Stethoscope} actions={
      <button onClick={() => setShowModal(true)} className="rounded-lg bg-[#071D49] px-4 py-2 text-sm font-black text-white hover:bg-blue-900 transition">Create Welfare Case</button>
    }>
      <div className="overflow-x-auto rounded-xl border border-[#D8E0EC]">
        <table className="w-full text-sm text-left whitespace-nowrap">
          <thead className="bg-[#F8FAFC] text-[#071D49]">
            <tr>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Student</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Concern</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Assigned To</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Status</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC] text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D8E0EC]">
            {cases.map((wc) => (
              <tr key={wc.id} className="hover:bg-[#F8FAFC]">
                <td className="px-4 py-3 font-semibold text-[#071D49]">{wc.studentName}</td>
                <td className="px-4 py-3 text-[#64748B]">{wc.concern}</td>
                <td className="px-4 py-3 text-[#64748B]">{wc.assignedTo}</td>
                <td className="px-4 py-3"><StatusChip label={wc.status} tone={getStatusTone(wc.status)} /></td>
                <td className="px-4 py-3 text-right">
                  {wc.status === "Referred" && (
                    <button onClick={() => handleOpenCase(wc.id, wc.studentName)} className="text-blue-600 hover:underline font-semibold text-xs">Open Case</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Log New Welfare Case" footer={
        <>
          <button onClick={() => setShowModal(false)} className="rounded-lg px-4 py-2 text-sm font-bold text-[#64748B] hover:bg-slate-100">Cancel</button>
          <button disabled={!formData.studentName} onClick={handleCreate} className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-black text-white hover:bg-rose-700 disabled:opacity-50">Save Case</button>
        </>
      }>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-bold text-[#334155]">Student Name</label>
            <input value={formData.studentName} onChange={(e) => setFormData({...formData, studentName: e.target.value})} type="text" className="mt-1 w-full rounded-xl border border-[#D8E0EC] p-2 text-sm focus:border-blue-500 focus:outline-none" />
          </div>
          <div>
            <label className="text-sm font-bold text-[#334155]">Welfare Concern</label>
            <input value={formData.concern} onChange={(e) => setFormData({...formData, concern: e.target.value})} type="text" className="mt-1 w-full rounded-xl border border-[#D8E0EC] p-2 text-sm focus:border-blue-500 focus:outline-none" />
          </div>
          <div>
            <label className="text-sm font-bold text-[#334155]">Assign To</label>
            <select value={formData.assignedTo} onChange={(e) => setFormData({...formData, assignedTo: e.target.value})} className="mt-1 w-full rounded-xl border border-[#D8E0EC] p-2 text-sm focus:border-blue-500 focus:outline-none">
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