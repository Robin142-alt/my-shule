"use client";
import { useState } from "react";
import { Calendar, Plus } from "lucide-react";
import { toast } from "sonner";
import { Panel, StatusChip, MetricCard, Tone } from "./shared";
import { useSchoolQuery } from "@/lib/data/school-hooks";
import { createAcademicYear } from "./api-client";

type TermRecord = { id: string; name: string; start_date: string; end_date: string; status: string };
type AcademicYearRecord = { id: string; year: string; status: string; terms: TermRecord[] };

type AcademicSetupData = {
  metrics: { total_years: number; active_year: string; current_term: string; };
  years: AcademicYearRecord[];
};

export function AcademicSetupWorkspace() {
  const { data, isLoading, refetch } = useSchoolQuery<AcademicSetupData>('/admin-command/principal/academic-setup');
  const [isCreating, setIsCreating] = useState(false);

  const years = data?.years || [];

  const getStatusTone = (s: string): Tone => {
    if (s === "Active" || s === "active") return "success";
    if (s === "Upcoming" || s === "upcoming") return "info";
    if (s === "Completed" || s === "completed") return "neutral";
    return "neutral";
  };

  const handleCreateYear = async () => {
    setIsCreating(true);
    try {
      await createAcademicYear({ year: new Date().getFullYear().toString() });
      await refetch();
      toast.success("Academic year created.");
    } catch {
      toast.error("Failed to create academic year.");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Panel
      title="Academic Setup"
      description="Manage academic years, terms, and the school calendar."
      icon={Calendar}
      actions={
        <button disabled={isCreating} onClick={handleCreateYear} className="inline-flex items-center gap-2 rounded-lg bg-[#071D49] px-4 py-2 text-sm font-black text-white hover:bg-blue-900 transition disabled:opacity-50">
          <Plus className="h-4 w-4" />
          {isCreating ? "Creating…" : "Add Academic Year"}
        </button>
      }
    >
      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <MetricCard label="Total Academic Years" value={isLoading ? "…" : data?.metrics?.total_years ?? 0} icon={Calendar} />
        <MetricCard label="Active Year" value={isLoading ? "…" : data?.metrics?.active_year ?? "None"} icon={Calendar} tone="success" />
        <MetricCard label="Current Term" value={isLoading ? "…" : data?.metrics?.current_term ?? "None"} icon={Calendar} tone="info" />
      </div>

      <div className="overflow-x-auto rounded-xl border border-[#D8E0EC]">
        <table className="w-full text-sm text-left whitespace-nowrap">
          <thead className="bg-[#F8FAFC] text-[#071D49]">
            <tr>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Academic Year</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Status</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Terms</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC] text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D8E0EC]">
            {isLoading ? (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-[#64748B]">Loading academic setup…</td></tr>
            ) : years.length === 0 ? (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-[#64748B]">No academic years configured. Add the first academic year to begin setting up your school calendar.</td></tr>
            ) : (
              years.map((yr) => (
                <tr key={yr.id} className="hover:bg-[#F8FAFC]">
                  <td className="px-4 py-3 font-semibold text-[#071D49]">{yr.year}</td>
                  <td className="px-4 py-3"><StatusChip label={yr.status} tone={getStatusTone(yr.status)} /></td>
                  <td className="px-4 py-3 text-[#64748B]">
                    {yr.terms.length === 0 ? "No terms" : yr.terms.map(t => t.name).join(", ")}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button className="text-blue-600 hover:underline font-semibold text-xs">Manage Terms</button>
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
