"use client";
import { useState, useEffect } from "react";
import { ShieldAlert, Search, PlusCircle } from "lucide-react";
import { Panel, StatusChip, Tone } from "./shared";
import { Modal } from "@/components/ui/modal";
import { readSchoolData, addSchoolRecord, updateSchoolRecord, subscribeToSchoolDataUpdates, createNotification } from "@/lib/school/school-operational-store";

export type DisciplineIncident = {
  id: string;
  caseNo: string;
  studentName: string;
  incidentType: string;
  severity: "High" | "Critical" | "Low" | "Medium";
  status: "New" | "In Review" | "Escalated" | "Resolved";
};

export function DeputyDisciplineWorkspace() {
  const [incidents, setIncidents] = useState<DisciplineIncident[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ studentName: "", incidentType: "", severity: "High" });

  const loadData = () => {
    const data = readSchoolData<DisciplineIncident>("deputyDiscipline");
    setIncidents(data.length > 0 ? data : [
      { id: "1", caseNo: "CAS-089", studentName: "Brian Otieno", incidentType: "Fighting in dorm", severity: "Critical", status: "In Review" }
    ]);
  };

  useEffect(() => {
    loadData();
    const unsub = subscribeToSchoolDataUpdates(({ moduleName }) => {
      if (moduleName === "deputyDiscipline") loadData();
    });
    return unsub;
  }, []);

  const handleCreate = () => {
    setLoading(true);
    setTimeout(() => {
      const newIncident: DisciplineIncident = {
        id: Math.random().toString(36).slice(2, 9),
        caseNo: `CAS-${Math.floor(Math.random() * 900) + 100}`,
        studentName: formData.studentName,
        incidentType: formData.incidentType,
        severity: formData.severity as any,
        status: "New"
      };
      addSchoolRecord("deputyDiscipline", newIncident);
      createNotification({
        audienceRoles: ["principal", "deputy_principal"],
        sourceModule: "discipline",
        title: "New Discipline Case",
        body: `Case ${newIncident.caseNo} created for ${newIncident.studentName}`,
        severity: newIncident.severity === "Critical" ? "critical" : "warning",
      });
      setShowModal(false);
      setFormData({ studentName: "", incidentType: "", severity: "High" });
      setLoading(false);
      alert("Incident logged successfully.");
    }, 600);
  };

  const handleEscalate = (id: string, caseNo: string) => {
    updateSchoolRecord("deputyDiscipline", id, { status: "Escalated" });
    createNotification({
      audienceRoles: ["principal"],
      sourceModule: "discipline",
      title: "Case Escalated",
      body: `Case ${caseNo} was escalated by Deputy Principal`,
      severity: "critical",
    });
    alert(`Case ${caseNo} escalated to Principal.`);
  };

  const getTone = (sev: string): Tone => {
    if (sev === "Critical") return "danger";
    if (sev === "High") return "warning";
    return "info";
  };

  const getStatusTone = (st: string): Tone => {
    if (st === "New") return "danger";
    if (st === "In Review") return "warning";
    if (st === "Resolved") return "success";
    return "neutral";
  };

  return (
    <Panel title="Discipline & Behaviour" description="Student behaviour incidents, investigations, and escalations." icon={ShieldAlert} actions={
      <button onClick={() => setShowModal(true)} className="flex items-center gap-2 rounded-lg bg-[#071D49] px-4 py-2 text-sm font-black text-white hover:bg-blue-900 transition">
        <PlusCircle className="w-4 h-4" /> Log Incident
      </button>
    }>
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#64748B]" />
          <input type="text" placeholder="Search case no, student..." className="w-full rounded-xl border border-[#D8E0EC] py-2 pl-9 pr-3 text-sm focus:border-[#071D49] focus:outline-none" />
        </div>
      </div>
      <div className="overflow-x-auto rounded-xl border border-[#D8E0EC]">
        <table className="w-full text-sm text-left whitespace-nowrap">
          <thead className="bg-[#F8FAFC] text-[#071D49]">
            <tr>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Case No.</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Student</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Incident</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Severity</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Status</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC] text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D8E0EC]">
            {incidents.map((inc) => (
              <tr key={inc.id} className="hover:bg-[#F8FAFC]">
                <td className="px-4 py-3 font-semibold text-[#071D49]">{inc.caseNo}</td>
                <td className="px-4 py-3 text-[#64748B]">{inc.studentName}</td>
                <td className="px-4 py-3 text-[#64748B]">{inc.incidentType}</td>
                <td className="px-4 py-3"><StatusChip label={inc.severity} tone={getTone(inc.severity)} /></td>
                <td className="px-4 py-3"><StatusChip label={inc.status} tone={getStatusTone(inc.status)} /></td>
                <td className="px-4 py-3 text-right">
                  {inc.status !== "Escalated" && (
                    <button onClick={() => handleEscalate(inc.id, inc.caseNo)} className="text-blue-600 hover:underline font-semibold text-xs mr-3">Escalate</button>
                  )}
                  <button className="text-blue-600 hover:underline font-semibold text-xs">Open Case</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Log New Incident" footer={
        <>
          <button disabled={loading} onClick={() => setShowModal(false)} className="rounded-lg px-4 py-2 text-sm font-bold text-[#64748B] hover:bg-slate-100">Cancel</button>
          <button disabled={loading || !formData.studentName} onClick={handleCreate} className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-black text-white hover:bg-rose-700 disabled:opacity-50">
            {loading ? "Saving..." : "Save Incident"}
          </button>
        </>
      }>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-bold text-[#334155]">Student Name</label>
            <input value={formData.studentName} onChange={(e) => setFormData({...formData, studentName: e.target.value})} type="text" className="mt-1 w-full rounded-xl border border-[#D8E0EC] p-2 text-sm focus:border-blue-500 focus:outline-none" />
          </div>
          <div>
            <label className="text-sm font-bold text-[#334155]">Incident Details</label>
            <input value={formData.incidentType} onChange={(e) => setFormData({...formData, incidentType: e.target.value})} type="text" className="mt-1 w-full rounded-xl border border-[#D8E0EC] p-2 text-sm focus:border-blue-500 focus:outline-none" />
          </div>
          <div>
            <label className="text-sm font-bold text-[#334155]">Severity</label>
            <select value={formData.severity} onChange={(e) => setFormData({...formData, severity: e.target.value})} className="mt-1 w-full rounded-xl border border-[#D8E0EC] p-2 text-sm focus:border-blue-500 focus:outline-none">
              <option>Low</option>
              <option>Medium</option>
              <option>High</option>
              <option>Critical</option>
            </select>
          </div>
        </div>
      </Modal>
    </Panel>
  );
}