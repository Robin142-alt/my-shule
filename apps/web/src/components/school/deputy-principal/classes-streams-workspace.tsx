"use client";
import { useState, useEffect } from "react";
import { School } from "lucide-react";
import { Panel, StatusChip, Tone } from "./shared";
import { readSchoolData, subscribeToSchoolDataUpdates } from "@/lib/school/school-operational-store";

export type ClassRecord = {
  id: string;
  name: string;
  classTeacher: string;
  studentCount: number;
  status: "Active" | "Merged" | "Inactive";
};

export function DeputyClassesStreamsWorkspace() {
  const [classes, setClasses] = useState<ClassRecord[]>([]);

  const loadData = () => {
    const data = readSchoolData<ClassRecord>("deputyClasses");
    setClasses(data.length > 0 ? data : [
      { id: "1", name: "Form 1 East", classTeacher: "Ms. Wanjiku", studentCount: 45, status: "Active" },
      { id: "2", name: "Form 1 West", classTeacher: "Mr. Omondi", studentCount: 42, status: "Active" }
    ]);
  };

  useEffect(() => {
    loadData();
    const unsub = subscribeToSchoolDataUpdates(({ moduleName }) => {
      if (moduleName === "deputyClasses") loadData();
    });
    return unsub;
  }, []);

  const getTone = (st: string): Tone => {
    if (st === "Active") return "success";
    if (st === "Merged") return "warning";
    return "danger";
  };

  return (
    <Panel title="Classes & Streams" description="View and manage class configurations and stream sizes." icon={School} actions={
      <button onClick={() => alert("Launching Class Configuration...")} className="rounded-lg bg-[#071D49] px-4 py-2 text-sm font-black text-white hover:bg-blue-900 transition">Manage Streams</button>
    }>
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
            {classes.map((cls) => (
              <tr key={cls.id} className="hover:bg-[#F8FAFC]">
                <td className="px-4 py-3 font-semibold text-[#071D49]">{cls.name}</td>
                <td className="px-4 py-3 text-[#64748B]">{cls.classTeacher}</td>
                <td className="px-4 py-3 text-[#64748B]">{cls.studentCount}</td>
                <td className="px-4 py-3"><StatusChip label={cls.status} tone={getTone(cls.status)} /></td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => alert(`Opening overview for ${cls.name}`)} className="text-blue-600 hover:underline font-semibold text-xs">View Register</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}