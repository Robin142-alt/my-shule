"use client";
import { useState, useEffect } from "react";
import { UserRoundCheck, Search } from "lucide-react";
import { Panel, StatusChip, Tone } from "./shared";
import { readSchoolData, addSchoolRecord, updateSchoolRecord, subscribeToSchoolDataUpdates, createNotification } from "@/lib/school/school-operational-store";

export type AttendanceRecord = {
  id: string;
  studentName: string;
  className: string;
  status: "Absent" | "Late" | "Present";
  reason: string;
  parentNotified: "Pending" | "Notified" | "Followed Up";
};

export function DeputyAttendanceWorkspace() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);

  const loadData = () => {
    const data = readSchoolData<AttendanceRecord>("deputyAttendance");
    setRecords(data.length > 0 ? data : [
      { id: "1", studentName: "John Mutua", className: "Form 1 West", status: "Absent", reason: "Unexplained", parentNotified: "Pending" }
    ]);
  };

  useEffect(() => {
    loadData();
    const unsub = subscribeToSchoolDataUpdates(({ moduleName }) => {
      if (moduleName === "deputyAttendance") loadData();
    });
    return unsub;
  }, []);

  const handleNotifyParent = (id: string, studentName: string) => {
    updateSchoolRecord("deputyAttendance", id, { parentNotified: "Notified" });
    createNotification({
      audienceRoles: ["class_teacher", "deputy_principal"],
      sourceModule: "attendance",
      title: "Parent Notified",
      body: `Parent of ${studentName} notified regarding absence.`,
      severity: "info",
    });
    alert(`Parent of ${studentName} has been notified via SMS.`);
  };

  const getStatusTone = (st: string): Tone => {
    if (st === "Absent") return "danger";
    if (st === "Late") return "warning";
    return "success";
  };

  const getNotifiedTone = (st: string): Tone => {
    if (st === "Pending") return "warning";
    if (st === "Notified") return "info";
    return "success";
  };

  return (
    <Panel title="Attendance & Punctuality" description="Follow up missing records, repeated absenteeism, and lateness." icon={UserRoundCheck} actions={
      <div className="flex gap-2">
        <button className="rounded-lg border border-[#D8E0EC] px-4 py-2 text-sm font-bold text-[#071D49]">Remind Unmarked</button>
        <button onClick={() => alert("Creating custom follow-up list...")} className="rounded-lg bg-[#071D49] px-4 py-2 text-sm font-black text-white hover:bg-blue-900 transition">Create Follow-Up</button>
      </div>
    }>
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#64748B]" />
          <input type="text" placeholder="Search student or admission no..." className="w-full rounded-xl border border-[#D8E0EC] py-2 pl-9 pr-3 text-sm focus:border-[#071D49] focus:outline-none" />
        </div>
      </div>
      <div className="overflow-x-auto rounded-xl border border-[#D8E0EC]">
        <table className="w-full text-sm text-left whitespace-nowrap">
          <thead className="bg-[#F8FAFC] text-[#071D49]">
            <tr>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Student</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Class</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Status</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Reason</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Parent Notified</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC] text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D8E0EC]">
            {records.map((rec) => (
              <tr key={rec.id} className="hover:bg-[#F8FAFC]">
                <td className="px-4 py-3 font-semibold text-[#071D49]">{rec.studentName}</td>
                <td className="px-4 py-3 text-[#64748B]">{rec.className}</td>
                <td className="px-4 py-3"><StatusChip label={rec.status} tone={getStatusTone(rec.status)} /></td>
                <td className="px-4 py-3 text-[#64748B]">{rec.reason}</td>
                <td className="px-4 py-3"><StatusChip label={rec.parentNotified} tone={getNotifiedTone(rec.parentNotified)} /></td>
                <td className="px-4 py-3 text-right">
                  {rec.parentNotified === "Pending" && (
                    <button onClick={() => handleNotifyParent(rec.id, rec.studentName)} className="text-blue-600 hover:underline font-semibold text-xs mr-3">Contact Parent</button>
                  )}
                  <button className="text-blue-600 hover:underline font-semibold text-xs">Follow Up</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}