"use client";
import { useState, useEffect } from "react";
import { LayoutDashboard, Users, UserX, UserCheck, AlertTriangle, ShieldAlert } from "lucide-react";
import { Panel, StatusChip, Tone } from "./shared";
import { readSchoolData, subscribeToSchoolDataUpdates, updateSchoolRecord, createNotification } from "@/lib/school/school-operational-store";

type PriorityQueueItem = {
  id: string;
  priority: "Critical" | "High";
  type: string;
  subject: string;
  context: string;
  status: "New" | "Not Marked" | "In Progress";
  moduleName: string;
};

export function DeputyOverviewWorkspace() {
  const [queue, setQueue] = useState<PriorityQueueItem[]>([]);

  const loadData = () => {
    const data = readSchoolData<PriorityQueueItem>("deputyPriorityQueue");
    setQueue(data.length > 0 ? data : [
      { id: "1", priority: "Critical", type: "Discipline", subject: "Brian Otieno", context: "Form 2 East", status: "New", moduleName: "deputyDiscipline" },
      { id: "2", priority: "High", type: "Attendance", subject: "Form 3 West", context: "Mr. Kiptoo", status: "Not Marked", moduleName: "deputyAttendance" }
    ]);
  };

  useEffect(() => {
    loadData();
    const unsub = subscribeToSchoolDataUpdates(({ moduleName }) => {
      if (moduleName === "deputyPriorityQueue") loadData();
    });
    return unsub;
  }, []);

  const handleOpen = (id: string) => {
    updateSchoolRecord("deputyPriorityQueue", id, { status: "In Progress" });
    createNotification({
      audienceRoles: ["principal"],
      sourceModule: "overview",
      title: "Priority Item Opened",
      body: `A priority item has been picked up by the Deputy Principal.`,
      severity: "info"
    });
  };

  const getPriorityTone = (pr: string): Tone => pr === "Critical" ? "danger" : "warning";

  return (
    <Panel title="Overview" description="Today's Priority Queue and school state." icon={LayoutDashboard} actions={
      <button onClick={() => alert("Starting Morning Review Workflow...")} className="rounded-lg bg-[#071D49] px-4 py-2 text-sm font-black text-white hover:bg-blue-900 transition">Start Morning Review</button>
    }>
      <div className="grid gap-4 md:grid-cols-4 lg:grid-cols-4 mb-6">
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4 flex flex-col justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold text-[#64748B]"><UserCheck className="w-4 h-4"/> Present Today</div>
          <div className="mt-2 text-3xl font-black text-emerald-600">842</div>
        </div>
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 flex flex-col justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold text-rose-700"><UserX className="w-4 h-4"/> Absent Today</div>
          <div className="mt-2 text-3xl font-black text-rose-700">14</div>
        </div>
        <div className="rounded-xl border border-orange-200 bg-orange-50 p-4 flex flex-col justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold text-orange-700"><ShieldAlert className="w-4 h-4"/> Discipline Alerts</div>
          <div className="mt-2 text-3xl font-black text-orange-700">3</div>
        </div>
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4 flex flex-col justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold text-[#64748B]"><Users className="w-4 h-4"/> Missing Duty</div>
          <div className="mt-2 text-3xl font-black text-[#071D49]">1</div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-[#D8E0EC]">
        <table className="w-full text-sm text-left whitespace-nowrap">
          <thead className="bg-[#F8FAFC] text-[#071D49]">
            <tr>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Priority</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Type</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Student/Staff</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Class/Dept</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Status</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC] text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D8E0EC]">
            {queue.map((item) => (
              <tr key={item.id} className="hover:bg-[#F8FAFC]">
                <td className="px-4 py-3"><StatusChip label={item.priority} tone={getPriorityTone(item.priority)} /></td>
                <td className="px-4 py-3 font-semibold text-[#071D49]">{item.type}</td>
                <td className="px-4 py-3 text-[#64748B]">{item.subject}</td>
                <td className="px-4 py-3 text-[#64748B]">{item.context}</td>
                <td className="px-4 py-3 text-[#64748B]">{item.status}</td>
                <td className="px-4 py-3 text-right">
                  {item.status !== "In Progress" && (
                    <button onClick={() => handleOpen(item.id)} className="text-blue-600 hover:underline font-semibold text-xs">Open Task</button>
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