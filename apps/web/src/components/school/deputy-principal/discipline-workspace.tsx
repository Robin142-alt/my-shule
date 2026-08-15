"use client";
import { useState } from "react";
import { ShieldAlert, Search, PlusCircle } from "lucide-react";
import { Panel, StatusChip, Tone, openDeputyRecord } from "./shared";
import { Modal } from "@/components/ui/modal";
import { useSchoolQuery } from "@/lib/data/school-hooks";
import { toast } from "sonner";
import { createDisciplineIncident, escalateDisciplineIncident } from "./api-client";

export type DisciplineIncident = {
  id: string;
  caseNo: string;
  studentName: string;
  incidentType: string;
  severity: "High" | "Critical" | "Low" | "Medium";
  status: "New" | "In Review" | "Escalated" | "Resolved";
};

type DisciplineIncidentDraft = {
  studentName: string;
  incidentType: string;
  severity: DisciplineIncident["severity"];
};

type DisciplineResponse =
  | DisciplineIncident[]
  | {
      incidents?: DisciplineIncident[];
      data?: DisciplineIncident[];
    };

function normalizeIncidents(payload: DisciplineResponse | null | undefined): DisciplineIncident[] {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload?.incidents)) {
    return payload.incidents;
  }

  if (Array.isArray(payload?.data)) {
    return payload.data;
  }

  return [];
}

export function DeputyDisciplineWorkspace() {
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState<DisciplineIncidentDraft>({ studentName: "", incidentType: "", severity: "High" });
  const [isSubmittingCreate, setIsSubmittingCreate] = useState(false);

  const { data: incidentPayload, refetch } = useSchoolQuery<DisciplineResponse>('/admin-command/deputy/discipline');
  const incidents = normalizeIncidents(incidentPayload);
  
  const handleCreate = async () => {
    setIsSubmittingCreate(true);
    try {
      await createDisciplineIncident({
        studentName: formData.studentName,
        incidentType: formData.incidentType,
        severity: formData.severity,
      });
      setShowModal(false);
      setFormData({ studentName: "", incidentType: "", severity: "High" });
      await refetch();
      toast.success("Incident logged successfully.");
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to log incident.");
    } finally {
      setIsSubmittingCreate(false);
    }
  };

  const handleEscalate = async (id: string, caseNo: string) => {
    try {
      await escalateDisciplineIncident(id);
      await refetch();
      toast.success(`Case ${caseNo} escalated to Principal.`);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to escalate case.");
    }
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
      <button type="button" onClick={() => setShowModal(true)} className="flex items-center gap-2 rounded-lg bg-[#071D49] px-4 py-2 text-sm font-black text-white hover:bg-blue-900 transition">
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
            {incidents.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-[#64748B]">No recent discipline cases found.</td>
              </tr>
            ) : (
              incidents.map((inc) => (
                <tr key={inc.id} className="hover:bg-[#F8FAFC]">
                  <td className="px-4 py-3 font-semibold text-[#071D49]">{inc.caseNo}</td>
                  <td className="px-4 py-3 text-[#64748B]">{inc.studentName}</td>
                  <td className="px-4 py-3 text-[#64748B]">{inc.incidentType}</td>
                  <td className="px-4 py-3"><StatusChip label={inc.severity} tone={getTone(inc.severity)} /></td>
                  <td className="px-4 py-3"><StatusChip label={inc.status} tone={getStatusTone(inc.status)} /></td>
                  <td className="px-4 py-3 text-right">
                    {inc.status !== "Escalated" && (
                      <button type="button" onClick={() => handleEscalate(inc.id, inc.caseNo)} className="text-blue-600 hover:underline font-semibold text-xs mr-3">Escalate</button>
                    )}
                    <button type="button" className="text-blue-600 hover:underline font-semibold text-xs" onClick={() => openDeputyRecord("Discipline case", [["Case No.", inc.caseNo], ["Student", inc.studentName], ["Incident", inc.incidentType], ["Severity", inc.severity], ["Status", inc.status]])}>Open Case</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Log New Incident" footer={
        <>
          <button disabled={isSubmittingCreate} onClick={() => setShowModal(false)} className="rounded-lg px-4 py-2 text-sm font-bold text-[#64748B] hover:bg-slate-100">Cancel</button>
          <button disabled={isSubmittingCreate || !formData.studentName} onClick={handleCreate} className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-black text-white hover:bg-rose-700 disabled:opacity-50">
            {isSubmittingCreate ? "Saving..." : "Save Incident"}
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
            <select value={formData.severity} onChange={(e) => setFormData({...formData, severity: e.target.value as DisciplineIncident["severity"]})} className="mt-1 w-full rounded-xl border border-[#D8E0EC] p-2 text-sm focus:border-blue-500 focus:outline-none">
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
