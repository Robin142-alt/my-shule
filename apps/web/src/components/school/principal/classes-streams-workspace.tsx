"use client";
import { useState } from "react";
import { Layers, Plus, Users } from "lucide-react";
import { toast } from "sonner";
import { Panel, StatusChip, MetricCard } from "./shared";
import { useSchoolQuery } from "@/lib/data/school-hooks";
import { createClass } from "./api-client";

type StreamRecord = { id: string; name: string; students_count: number };
type ClassRecord = {
  id: string;
  name: string;
  level: string;
  class_teacher: string;
  total_students: number;
  streams: StreamRecord[];
  status: string;
};

type ClassesStreamsData = {
  metrics: { total_classes: number; total_streams: number; total_students: number; avg_class_size: number };
  classes: ClassRecord[];
};

export function ClassesStreamsWorkspace() {
  const { data, isLoading, refetch } = useSchoolQuery<ClassesStreamsData>('/admin-command/principal/classes-streams');
  const [isCreating, setIsCreating] = useState(false);

  const classes = data?.classes || [];

  const handleCreateClass = async () => {
    setIsCreating(true);
    try {
      await createClass({ name: "New Class" });
      await refetch();
      toast.success("Class created successfully.");
    } catch {
      toast.error("Failed to create class.");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Panel
      title="Classes & Streams"
      description="Manage class levels, streams, and student distribution."
      icon={Layers}
      actions={
        <button disabled={isCreating} onClick={handleCreateClass} className="inline-flex items-center gap-2 rounded-lg bg-[#071D49] px-4 py-2 text-sm font-black text-white hover:bg-blue-900 transition disabled:opacity-50">
          <Plus className="h-4 w-4" />
          {isCreating ? "Creating…" : "Add Class"}
        </button>
      }
    >
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <MetricCard label="Total Classes" value={isLoading ? "…" : data?.metrics?.total_classes ?? 0} icon={Layers} />
        <MetricCard label="Total Streams" value={isLoading ? "…" : data?.metrics?.total_streams ?? 0} icon={Layers} tone="info" />
        <MetricCard label="Total Students" value={isLoading ? "…" : data?.metrics?.total_students ?? 0} icon={Users} />
        <MetricCard label="Avg Class Size" value={isLoading ? "…" : data?.metrics?.avg_class_size ?? 0} icon={Users} tone="info" />
      </div>

      <div className="overflow-x-auto rounded-xl border border-[#D8E0EC]">
        <table className="w-full text-sm text-left whitespace-nowrap">
          <thead className="bg-[#F8FAFC] text-[#071D49]">
            <tr>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Class</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Level</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Class Teacher</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Students</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Streams</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Status</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC] text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D8E0EC]">
            {isLoading ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-[#64748B]">Loading classes…</td></tr>
            ) : classes.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-[#64748B]">No classes configured. Add the first class to begin organizing your school structure.</td></tr>
            ) : (
              classes.map((cls) => (
                <tr key={cls.id} className="hover:bg-[#F8FAFC]">
                  <td className="px-4 py-3 font-semibold text-[#071D49]">{cls.name}</td>
                  <td className="px-4 py-3 text-[#64748B]">{cls.level}</td>
                  <td className="px-4 py-3 text-[#64748B]">{cls.class_teacher || "—"}</td>
                  <td className="px-4 py-3 text-[#64748B]">{cls.total_students}</td>
                  <td className="px-4 py-3 text-[#64748B]">{cls.streams.length > 0 ? cls.streams.map(s => `${s.name} (${s.students_count})`).join(", ") : "No streams"}</td>
                  <td className="px-4 py-3"><StatusChip label={cls.status || "Active"} tone={cls.status === "Active" ? "success" : "neutral"} /></td>
                  <td className="px-4 py-3 text-right">
                    <button className="text-blue-600 hover:underline font-semibold text-xs">Manage</button>
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
