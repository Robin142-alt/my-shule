"use client";
import { useState } from "react";
import { GraduationCap } from "lucide-react";
import { Panel, StatusChip, Tone } from "./shared";
import { useSchoolQuery, useSchoolMutation } from "@/lib/data/school-hooks";
import { useQueryClient } from "@tanstack/react-query";

export type AcademicIntervention = {
  id: string;
  className: string;
  subject: string;
  teacher: string;
  coverage: string;
  concern: "Behind Schedule" | "Low Average" | "Missed Lessons";
  actionTaken?: string;
};

type AcademicsData = {
  metrics: {
    active_subjects: number;
  };
  interventions: AcademicIntervention[];
};

export function DeputyAcademicsMonitoringWorkspace() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useSchoolQuery<AcademicsData>('/admin-command/deputy/academics');

  const messageMutation = useSchoolMutation<{ id: string }>('/admin-command/deputy/academics/:id/message-hod', 'POST', {
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["school", "session", '/admin-command/deputy/academics'] })
  });

  const interventions = data?.interventions || [];

  const handleMessageHOD = async (id: string, subject: string, teacher: string) => {
    try {
      await fetch(`/api/v1/admin-command/deputy/academics/${id}/message-hod`, { method: 'POST', headers: { 'Content-Type': 'application/json' } });
      queryClient.invalidateQueries({ queryKey: ["school", "session", '/admin-command/deputy/academics'] });
      alert(`Message sent to ${subject} HOD regarding ${teacher}.`);
    } catch (e) {
      alert("Failed to send message.");
    }
  };

  const getConcernTone = (st: string): Tone => {
    return "warning";
  };

  return (
    <Panel title="Academics Monitoring" description="Syllabus progress, weak classes, and academic interventions." icon={GraduationCap} actions={
      <button onClick={() => alert("Intervention creation logic would launch here.")} className="rounded-lg bg-[#071D49] px-4 py-2 text-sm font-black text-white hover:bg-blue-900 transition">Create Intervention</button>
    }>
      <div className="grid gap-4 md:grid-cols-2 mb-6">
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
          <div className="text-sm font-semibold text-[#64748B]">Active Subjects</div>
          <div className="mt-1 text-lg font-black text-[#071D49]">{isLoading ? "..." : data?.metrics?.active_subjects || 0}</div>
        </div>
      </div>
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
            {interventions.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-[#64748B]">No current academic interventions.</td>
              </tr>
            ) : (
              interventions.map((inv) => (
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
              ))
            )}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}