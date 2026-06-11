"use client";
import { useState, useEffect } from "react";
import { GraduationCap } from "lucide-react";
import { Panel, StatusChip, Tone } from "./shared";
import { readSchoolData, updateSchoolRecord, subscribeToSchoolDataUpdates, createNotification } from "@/lib/school/school-operational-store";

export type AcademicIntervention = {
  id: string;
  className: string;
  subject: string;
  teacher: string;
  coverage: string;
  concern: "Behind Schedule" | "Low Average" | "Missed Lessons";
  actionTaken?: string;
};

export function DeputyAcademicsMonitoringWorkspace() {
  const [interventions, setInterventions] = useState<AcademicIntervention[]>([]);

  const loadData = () => {
    const data = readSchoolData<AcademicIntervention>("deputyAcademics");
    setInterventions(data.length > 0 ? data : [
      { id: "1", className: "Form 4 West", subject: "Physics", teacher: "Mr. Kipchoge", coverage: "45%", concern: "Behind Schedule" }
    ]);
  };

  useEffect(() => {
    loadData();
    const unsub = subscribeToSchoolDataUpdates(({ moduleName }) => {
      if (moduleName === "deputyAcademics") loadData();
    });
    return unsub;
  }, []);

  const handleMessageHOD = (id: string, subject: string, teacher: string) => {
    updateSchoolRecord("deputyAcademics", id, { actionTaken: "HOD Messaged" });
    
    createNotification({
      audienceRoles: ["head_of_department"],
      sourceModule: "academics",
      title: "Academic Intervention Required",
      body: `Please review syllabus coverage for ${subject} taught by ${teacher}.`,
      severity: "warning",
    });
    alert(`Message sent to ${subject} HOD regarding ${teacher}.`);
  };

  const getConcernTone = (st: string): Tone => {
    return "warning";
  };

  return (
    <Panel title="Academics Monitoring" description="Syllabus progress, weak classes, and academic interventions." icon={GraduationCap} actions={
      <button onClick={() => alert("Intervention creation logic would launch here.")} className="rounded-lg bg-[#071D49] px-4 py-2 text-sm font-black text-white hover:bg-blue-900 transition">Create Intervention</button>
    }>
      <div className="overflow-x-auto rounded-xl border border-[#D8E0EC]">
        <table className="w-full text-sm text-left whitespace-nowrap">
          <thead className="bg-[#F8FAFC] text-[#071D49]">
            <tr>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Class</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Subject</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Teacher</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Coverage %</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Concern</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Status</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC] text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D8E0EC]">
            {interventions.map((inv) => (
              <tr key={inv.id} className="hover:bg-[#F8FAFC]">
                <td className="px-4 py-3 font-semibold text-[#071D49]">{inv.className}</td>
                <td className="px-4 py-3 text-[#64748B]">{inv.subject}</td>
                <td className="px-4 py-3 text-[#64748B]">{inv.teacher}</td>
                <td className="px-4 py-3 font-bold">{inv.coverage}</td>
                <td className="px-4 py-3"><StatusChip label={inv.concern} tone={getConcernTone(inv.concern)} /></td>
                <td className="px-4 py-3"><StatusChip label={inv.actionTaken || "Pending Action"} tone={inv.actionTaken ? "info" : "danger"} /></td>
                <td className="px-4 py-3 text-right">
                  {!inv.actionTaken && (
                    <button onClick={() => handleMessageHOD(inv.id, inv.subject, inv.teacher)} className="text-blue-600 hover:underline font-semibold text-xs mr-3">Message HOD</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}