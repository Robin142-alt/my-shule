"use client";
import { UserCog } from "lucide-react";
import { Panel, StatusChip, Tone } from "./shared";
import { useSchoolQuery } from "@/lib/data/school-hooks";
import { useState } from "react";
import { toast } from "sonner";
import { assignRole } from "./api-client";

export type StaffRole = {
  id: string;
  name: string;
  role: string;
  department: string;
  status: "Active" | "On Leave";
};

type StaffData = {
  metrics: {
    active_staff: number;
  };
  staffList: StaffRole[];
};

export function DeputyStaffRolesWorkspace() {
  const { data, isLoading, refetch } = useSchoolQuery<StaffData>('/admin-command/deputy/staff');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showManageModal, setShowManageModal] = useState(false);
  const [roleData, setRoleData] = useState({ staffId: '', name: '', role: '', department: '' });

  const staff = data?.staffList || [];

  const handleAddRole = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      await assignRole({
        staffId: roleData.staffId || roleData.name,
        role: roleData.role,
        department: roleData.department,
      });
      toast.success("Role assigned successfully.");
      setShowManageModal(false);
      setRoleData({ staffId: '', name: '', role: '', department: '' });
      refetch();
    } catch (e) {
      toast.error("Failed to assign role.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getTone = (st: string): Tone => st === "Active" ? "success" : "warning";

  return (
    <>
      <Panel title="Staff & Roles" description="View teaching staff, assignments, and roles." icon={UserCog} actions={
        <button 
          onClick={() => setShowManageModal(true)} 
          className="rounded-lg bg-[#071D49] px-4 py-2 text-sm font-black text-white hover:bg-blue-900 transition"
        >
          Assign Role
        </button>
      }>
        <div className="grid gap-4 md:grid-cols-2 mb-6">
          <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
            <div className="text-sm font-semibold text-[#64748B]">Active Staff</div>
            <div className="mt-1 text-lg font-black text-[#071D49]">{isLoading ? "..." : data?.metrics?.active_staff || 0}</div>
          </div>
        </div>
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
              {staff.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-[#64748B]">No staff members found.</td>
                </tr>
              ) : (
                staff.map((st) => (
                  <tr key={st.id} className="hover:bg-[#F8FAFC]">
                    <td className="px-4 py-3 font-semibold text-[#071D49]">{st.name}</td>
                    <td className="px-4 py-3 text-[#64748B]">{st.role}</td>
                    <td className="px-4 py-3 text-[#64748B]">{st.department}</td>
                    <td className="px-4 py-3"><StatusChip label={st.status} tone={getTone(st.status)} /></td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => {
                        setRoleData({ staffId: st.id, name: st.name, role: st.role, department: st.department });
                        setShowManageModal(true);
                      }} className="text-blue-600 hover:underline font-semibold text-xs">Manage</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Panel>

      {showManageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-xl font-bold text-[#071D49]">Assign Staff Role</h2>
            <form onSubmit={handleAddRole} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-semibold text-[#64748B]">Staff Name</label>
                <input required type="text" value={roleData.name} onChange={e => setRoleData({ ...roleData, staffId: '', name: e.target.value })} className="w-full rounded-lg border border-[#D8E0EC] px-3 py-2 outline-none focus:border-[#071D49]" placeholder="e.g. Mrs. Omondi" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-[#64748B]">Role</label>
                <select value={roleData.role} onChange={e => setRoleData({ ...roleData, role: e.target.value })} className="w-full rounded-lg border border-[#D8E0EC] px-3 py-2 outline-none focus:border-[#071D49]">
                  <option value="">Select Role</option>
                  <option value="Head of Department">Head of Department</option>
                  <option value="Senior Teacher">Senior Teacher</option>
                  <option value="Class Teacher">Class Teacher</option>
                  <option value="Teacher">Teacher</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-[#64748B]">Department</label>
                <input required type="text" value={roleData.department} onChange={e => setRoleData({ ...roleData, department: e.target.value })} className="w-full rounded-lg border border-[#D8E0EC] px-3 py-2 outline-none focus:border-[#071D49]" placeholder="e.g. Sciences" />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-[#D8E0EC]">
                <button type="button" onClick={() => setShowManageModal(false)} className="rounded-lg px-4 py-2 text-sm font-bold text-[#64748B] hover:bg-[#F8FAFC]">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="rounded-lg bg-[#071D49] px-4 py-2 text-sm font-bold text-white hover:bg-blue-900 disabled:opacity-50">
                  {isSubmitting ? "Saving..." : "Save Role"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
