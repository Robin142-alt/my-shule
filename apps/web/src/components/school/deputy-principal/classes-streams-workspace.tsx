"use client";
import { School } from "lucide-react";
import { Panel, StatusChip, Tone } from "./shared";
import { useSchoolQuery } from "@/lib/data/school-hooks";

export type ClassRecord = {
  id: string;
  name: string;
  classTeacher: string;
  studentCount: number;
  status: "Active" | "Merged" | "Inactive";
};

type ClassesData = {
  metrics: {
    active_classes: number;
  };
  classesList: ClassRecord[];
};

export function DeputyClassesStreamsWorkspace() {
  const { data, isLoading } = useSchoolQuery<ClassesData>('/admin-command/deputy/classes');
  
  const classes = data?.classesList || [];

  const getTone = (st: string): Tone => {
    if (st === "Active") return "success";
    if (st === "Merged") return "warning";
    return "danger";
  };

  return (
    <Panel title="Classes & Streams" description="View and manage class configurations and stream sizes." icon={School} actions={
      <button onClick={() => alert("Launching Class Configuration...")} className="rounded-lg bg-[#071D49] px-4 py-2 text-sm font-black text-white hover:bg-blue-900 transition">Manage Streams</button>
    }>
      <div className="grid gap-4 md:grid-cols-2 mb-6">
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
          <div className="text-sm font-semibold text-[#64748B]">Active Classes</div>
          <div className="mt-1 text-lg font-black text-[#071D49]">{isLoading ? "..." : data?.metrics?.active_classes || 0}</div>
        </div>
      </div>
      <div className="overflow-x-auto rounded-xl border border-[#D8E0EC]">
        <table className="w-full text-sm text-left whitespace-nowrap">
          <thead className="bg-[#F8FAFC] text-[#071D49]">
            <tr>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Class Name</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Class Teacher</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Students</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Status</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC] text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D8E0EC]">
            {classes.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-[#64748B]">No active classes found.</td>
              </tr>
            ) : (
              classes.map((cls) => (
                <tr key={cls.id} className="hover:bg-[#F8FAFC]">
                  <td className="px-4 py-3 font-semibold text-[#071D49]">{cls.name}</td>
                  <td className="px-4 py-3 text-[#64748B]">{cls.classTeacher}</td>
                  <td className="px-4 py-3 text-[#64748B]">{cls.studentCount}</td>
                  <td className="px-4 py-3"><StatusChip label={cls.status} tone={getTone(cls.status)} /></td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => alert(`Opening overview for ${cls.name}`)} className="text-blue-600 hover:underline font-semibold text-xs">View Register</button>
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