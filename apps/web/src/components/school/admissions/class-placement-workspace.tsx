"use client";
import { useState } from "react";
import { GraduationCap, ArrowRight } from "lucide-react";
import { Panel, StatusChip, Tone } from "./shared";
import { useSchoolQuery } from "@/lib/data/school-hooks";
import { toast } from "sonner";
import { assignClassPlacement } from "./api-client";

type PlacementRecord = {
  id: string;
  student_name: string;
  grade_applied: string;
  assigned_class: string;
  assigned_stream: string;
  status: string;
};

type ClassPlacementData = {
  metrics: { total_to_place: number; placed: number; unplaced: number };
  placementsList: PlacementRecord[];
};

export function ClassPlacementWorkspace() {
  const { data, isLoading, refetch } = useSchoolQuery<ClassPlacementData>('/admin-command/admissions/class-placement');
  const [placingId, setPlacingId] = useState<string | null>(null);

  const placements = data?.placementsList || [];

  const getStatusTone = (s: string): Tone => {
    switch (s?.toLowerCase()) {
      case "placed": return "success";
      case "unplaced": case "pending": return "warning";
      default: return "neutral";
    }
  };

  const handleAutoPlace = async (id: string) => {
    setPlacingId(id);
    try {
      await assignClassPlacement({ student_id: id, auto: true });
      toast.success("Student placed successfully.");
      refetch();
    } catch {
      toast.error("Failed to place student. Check class capacity.");
    } finally {
      setPlacingId(null);
    }
  };

  return (
    <Panel title="Class Placement" description="Assign admitted students to classes and streams." icon={GraduationCap}>
      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
          <div className="text-sm font-semibold text-[#64748B]">To Place</div>
          <div className="mt-1 text-2xl font-black text-[#071D49]">{isLoading ? "..." : data?.metrics?.total_to_place ?? 0}</div>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <div className="text-sm font-semibold text-emerald-700">Placed</div>
          <div className="mt-1 text-2xl font-black text-emerald-700">{isLoading ? "..." : data?.metrics?.placed ?? 0}</div>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <div className="text-sm font-semibold text-amber-700">Unplaced</div>
          <div className="mt-1 text-2xl font-black text-amber-700">{isLoading ? "..." : data?.metrics?.unplaced ?? 0}</div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-[#D8E0EC]">
        <table className="w-full text-sm text-left whitespace-nowrap">
          <thead className="bg-[#F8FAFC] text-[#071D49]">
            <tr>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Student</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Grade Applied</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Assigned Class</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Stream</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Status</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC] text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D8E0EC]">
            {isLoading ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-[#64748B]">Loading placements...</td></tr>
            ) : placements.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-[#64748B]">No students pending placement. Admit students first, then assign them to classes here.</td></tr>
            ) : (
              placements.map((p) => (
                <tr key={p.id} className="hover:bg-[#F8FAFC]">
                  <td className="px-4 py-3 font-semibold text-[#071D49]">{p.student_name}</td>
                  <td className="px-4 py-3 text-[#64748B]">{p.grade_applied}</td>
                  <td className="px-4 py-3 text-[#64748B]">{p.assigned_class || "—"}</td>
                  <td className="px-4 py-3 text-[#64748B]">{p.assigned_stream || "—"}</td>
                  <td className="px-4 py-3"><StatusChip label={p.status} tone={getStatusTone(p.status)} /></td>
                  <td className="px-4 py-3 text-right">
                    {p.status?.toLowerCase() !== "placed" && (
                      <button disabled={placingId === p.id} onClick={() => handleAutoPlace(p.id)}
                        className="text-blue-600 hover:underline text-xs font-semibold inline-flex items-center gap-1 disabled:opacity-50"><ArrowRight className="w-3 h-3" /> Assign Class</button>
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
