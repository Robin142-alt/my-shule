"use client";
import { useState } from "react";
import { GraduationCap } from "lucide-react";
import { toast } from "sonner";
import { Panel, StatusChip, Tone } from "./shared";
import { useSchoolQuery } from "@/lib/data/school-hooks";
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

import { createIntervention, messageHOD } from "./api-client";

export function DeputyAcademicsMonitoringWorkspace() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useSchoolQuery<AcademicsData>('/admin-command/deputy/academics');
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({ className: '', subject: '', teacher: '', concern: 'Low Average' });

  const interventions = data?.interventions || [];

  const handleMessageHOD = async (id: string, subject: string, teacher: string) => {
    try {
      await messageHOD(id);
      queryClient.invalidateQueries({ queryKey: ["school", "session", '/admin-command/deputy/academics'] });
      toast.success(`Message sent to ${subject} HOD regarding ${teacher}.`);
    } catch (e) {
      toast.error("Failed to send message.");
    }
  };

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await createIntervention(formData);
      toast.success("Intervention created successfully");
      setShowModal(false);
      setFormData({ className: '', subject: '', teacher: '', concern: 'Low Average' });
      queryClient.invalidateQueries({ queryKey: ["school", "session", '/admin-command/deputy/academics'] });
    } catch (error) {
      toast.error("Failed to create intervention");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getConcernTone = (st: string): Tone => {
    return "warning";
  };

  return (
    <>
      <Panel title="Academics Monitoring" description="Syllabus progress, weak classes, and academic interventions." icon={GraduationCap} actions={
        <button onClick={() => setShowModal(true)} className="rounded-lg bg-[#071D49] px-4 py-2 text-sm font-black text-white hover:bg-blue-900 transition">Create Intervention</button>
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

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-xl font-bold text-[#071D49]">Create Academic Intervention</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-semibold text-[#64748B]">Class</label>
                <input required type="text" value={formData.className} onChange={e => setFormData({ ...formData, className: e.target.value })} className="w-full rounded-lg border border-[#D8E0EC] px-3 py-2 outline-none focus:border-[#071D49]" placeholder="e.g. Form 3 East" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-[#64748B]">Subject</label>
                <input required type="text" value={formData.subject} onChange={e => setFormData({ ...formData, subject: e.target.value })} className="w-full rounded-lg border border-[#D8E0EC] px-3 py-2 outline-none focus:border-[#071D49]" placeholder="e.g. Mathematics" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-[#64748B]">Teacher</label>
                <input required type="text" value={formData.teacher} onChange={e => setFormData({ ...formData, teacher: e.target.value })} className="w-full rounded-lg border border-[#D8E0EC] px-3 py-2 outline-none focus:border-[#071D49]" placeholder="e.g. Mr. Kamau" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-[#64748B]">Concern</label>
                <select value={formData.concern} onChange={e => setFormData({ ...formData, concern: e.target.value })} className="w-full rounded-lg border border-[#D8E0EC] px-3 py-2 outline-none focus:border-[#071D49]">
                  <option value="Low Average">Low Average</option>
                  <option value="Behind Schedule">Behind Schedule</option>
                  <option value="Missed Lessons">Missed Lessons</option>
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-[#D8E0EC]">
                <button type="button" onClick={() => setShowModal(false)} className="rounded-lg px-4 py-2 text-sm font-bold text-[#64748B] hover:bg-[#F8FAFC]">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="rounded-lg bg-[#071D49] px-4 py-2 text-sm font-bold text-white hover:bg-blue-900 disabled:opacity-50">
                  {isSubmitting ? "Saving..." : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
