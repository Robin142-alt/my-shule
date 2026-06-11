"use client";
import { useState, useEffect } from "react";
import { UserCog } from "lucide-react";
import { Panel, StatusChip, Tone } from "./shared";
import { readSchoolData, addSchoolRecord, subscribeToSchoolDataUpdates, createAuditLog } from "@/lib/school/school-operational-store";

export type StaffRole = {
  id: string;
  name: string;
  role: string;
  department: string;
  status: "Active" | "On Leave";
};

export function DeputyStaffRolesWorkspace() {
  const [staff, setStaff] = useState<StaffRole[]>([]);

  const loadData = () => {
    const data = readSchoolData<StaffRole>("deputyStaff");
    setStaff(data.length > 0 ? data : [
      { id: "1", name: "Mr. Omondi", role: "Class Teacher", department: "Mathematics", status: "Active" }
    ]);
  };

  useEffect(() => {
    loadData();
    const unsub = subscribeToSchoolDataUpdates(({ moduleName }) => {
      if (moduleName === "deputyStaff") loadData();
    });
    return unsub;
  }, []);

  const handleAddRole = () => {
    const newStaff: StaffRole = {
      id: Math.random().toString(36).slice(2, 9),
      name: "New Teacher",
      role: "Assigned Role",
      department: "General",
      status: "Active"
    };
    addSchoolRecord("deputyStaff", newStaff);
    createAuditLog({ module: "staff", action: "Assign Role", title: "Role Assigned", body: "A new role was assigned by the Deputy Principal.", actorRole: "deputy_principal" });
    alert("Role assigned successfully.");
  };

  const getTone = (st: string): Tone => st === "Active" ? "success" : "warning";

  return (
    <Panel title="Staff & Roles" description="View teaching staff, assignments, and roles." icon={UserCog} actions={
      <button onClick={handleAddRole} className="rounded-lg bg-[#071D49] px-4 py-2 text-sm font-black text-white hover:bg-blue-900 transition">Assign Role</button>
    }>
      <div className="overflow-x-auto rounded-xl border border-[#D8E0EC]">
        <table className="w-full text-sm text-left whitespace-nowrap">
          <thead className="bg-[#F8FAFC] text-[#071D49]">
            <tr>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Staff Name</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Role</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Department</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Status</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC] text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D8E0EC]">
            {staff.map((st) => (
              <tr key={st.id} className="hover:bg-[#F8FAFC]">
                <td className="px-4 py-3 font-semibold text-[#071D49]">{st.name}</td>
                <td className="px-4 py-3 text-[#64748B]">{st.role}</td>
                <td className="px-4 py-3 text-[#64748B]">{st.department}</td>
                <td className="px-4 py-3"><StatusChip label={st.status} tone={getTone(st.status)} /></td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => alert("Managing roles...")} className="text-blue-600 hover:underline font-semibold text-xs">Manage</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}