"use client";
import { RecordTable } from "@/components/ui/record-table";
import { useState } from "react";
import { GraduationCap, ArrowRight } from "lucide-react";
import Link from "next/link";
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
  const { data, isLoading, isError, refetch } = useSchoolQuery<ClassPlacementData>('/admin-command/admissions/class-placement');
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
      {isError ? <p role="alert" className="mb-3 rounded-xl bg-danger-soft p-3">Placements could not be loaded. <button className="underline" onClick={() => void refetch()}>Retry</button></p> : null}
      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <div className="rounded-xl border border-border bg-surface-muted p-4">
          <div className="text-sm font-semibold text-muted">To Place</div>
          <div className="mt-1 text-2xl font-black text-foreground">{isLoading ? "..." : data?.metrics?.total_to_place ?? 0}</div>
        </div>
        <div className="rounded-xl border border-success-border bg-success-soft p-4">
          <div className="text-sm font-semibold text-success">Placed</div>
          <div className="mt-1 text-2xl font-black text-success">{isLoading ? "..." : data?.metrics?.placed ?? 0}</div>
        </div>
        <div className="rounded-xl border border-warning-border bg-warning-soft p-4">
          <div className="text-sm font-semibold text-warning">Unplaced</div>
          <div className="mt-1 text-2xl font-black text-warning">{isLoading ? "..." : data?.metrics?.unplaced ?? 0}</div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <RecordTable className="w-full text-sm text-left whitespace-nowrap">
          <thead className="bg-surface-muted text-foreground">
            <tr>
              <th className="px-4 py-3 font-bold border-b border-border">Student</th>
              <th className="px-4 py-3 font-bold border-b border-border">Grade Applied</th>
              <th className="px-4 py-3 font-bold border-b border-border">Assigned Class</th>
              <th className="px-4 py-3 font-bold border-b border-border">Stream</th>
              <th className="px-4 py-3 font-bold border-b border-border">Status</th>
              <th className="px-4 py-3 font-bold border-b border-border text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-muted">Loading placements...</td></tr>
            ) : placements.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted">
                  <div className="mx-auto flex max-w-xl flex-col items-center gap-3">
                    <p>No students pending placement. Select a class when admitting the learner; placement is applied automatically.</p>
                    <Link href="/school/admissions/applications?action=start-admission" className="rounded-lg bg-primary px-4 py-2 text-xs font-black text-white">
                      Start student admission
                    </Link>
                  </div>
                </td>
              </tr>
            ) : (
              placements.map((p) => (
                <tr key={p.id} className="hover:bg-surface-muted">
                  <td className="px-4 py-3 font-semibold text-foreground">{p.student_name}</td>
                  <td className="px-4 py-3 text-muted">{p.grade_applied}</td>
                  <td className="px-4 py-3 text-muted">{p.assigned_class || "—"}</td>
                  <td className="px-4 py-3 text-muted">{p.assigned_stream || "—"}</td>
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
        </RecordTable>
      </div>
    </Panel>
  );
}
