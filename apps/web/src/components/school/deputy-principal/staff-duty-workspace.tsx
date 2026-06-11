"use client";
import { useState, useEffect } from "react";
import { UsersRound } from "lucide-react";
import { Panel, StatusChip, Tone } from "./shared";
import { readSchoolData, updateSchoolRecord, subscribeToSchoolDataUpdates, createNotification } from "@/lib/school/school-operational-store";

export type StaffDutyRecord = {
  id: string;
  staffName: string;
  dutyArea: string;
  time: string;
  status: "Present" | "Missing" | "Requested";
  reportStatus: "Pending" | "Submitted";
};

export function DeputyStaffDutyWorkspace() {
  const [duties, setDuties] = useState<StaffDutyRecord[]>([]);

  const loadData = () => {
    const data = readSchoolData<StaffDutyRecord>("deputyStaffDuty");
    setDuties(data.length > 0 ? data : [
      { id: "1", staffName: "Mr. Kiptoo", dutyArea: "Dining Hall", time: "Lunch Time", status: "Missing", reportStatus: "Pending" }
    ]);
  };

  useEffect(() => {
    loadData();
    const unsub = subscribeToSchoolDataUpdates(({ moduleName }) => {
      if (moduleName === "deputyStaffDuty") loadData();
    });
    return unsub;
  }, []);

  const handleRequestReport = (id: string, staffName: string) => {
    updateSchoolRecord("deputyStaffDuty", id, { status: "Requested" });
    createNotification({
      audienceRoles: ["teacher"],
      recipientRole: "teacher", 
      sourceModule: "staff_duty",
      title: "Duty Report Required",
      body: `The Deputy Principal has requested your duty report for your recent shift.`,
      severity: "warning",
    });
    alert(`Report requested from ${staffName}.`);
  };

  const getStatusTone = (st: string): Tone => {
    if (st === "Present") return "success";
    if (st === "Requested") return "warning";
    return "danger";
  };

  return (
    <Panel title="Staff Duty & Supervision" description="Staff duty rosters, supervision zones, and presence." icon={UsersRound} actions={
      <button onClick={() => alert("Duty roster module opening...")} className="rounded-lg bg-[#071D49] px-4 py-2 text-sm font-black text-white hover:bg-blue-900 transition">Manage Roster</button>
    }>
      <div className="overflow-x-auto rounded-xl border border-[#D8E0EC]">
        <table className="w-full text-sm text-left whitespace-nowrap">
          <thead className="bg-[#F8FAFC] text-[#071D49]">
            <tr>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Staff</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Duty Area</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Time</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Status</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Report</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC] text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D8E0EC]">
            {duties.map((duty) => (
              <tr key={duty.id} className="hover:bg-[#F8FAFC]">
                <td className="px-4 py-3 font-semibold text-[#071D49]">{duty.staffName}</td>
                <td className="px-4 py-3 text-[#64748B]">{duty.dutyArea}</td>
                <td className="px-4 py-3 text-[#64748B]">{duty.time}</td>
                <td className="px-4 py-3"><StatusChip label={duty.status} tone={getStatusTone(duty.status)} /></td>
                <td className="px-4 py-3"><StatusChip label={duty.reportStatus} tone={duty.reportStatus === "Submitted" ? "success" : "warning"} /></td>
                <td className="px-4 py-3 text-right">
                  {duty.status !== "Requested" && (
                    <button onClick={() => handleRequestReport(duty.id, duty.staffName)} className="text-blue-600 hover:underline font-semibold text-xs">Request Report</button>
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