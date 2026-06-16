"use client";
import { UsersRound } from "lucide-react";
import { Panel, StatusChip, Tone } from "./shared";
import { useSchoolQuery, useSchoolMutation } from "@/lib/data/school-hooks";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { requestDutyReport } from "./api-client";

export type StaffDutyRecord = {
  id: string;
  staffName: string;
  dutyArea: string;
  time: string;
  status: "Present" | "Missing" | "Requested";
  reportStatus: "Pending" | "Submitted";
};

type StaffDutyData = {
  metrics: {
    total_staff: number;
  };
  duties: StaffDutyRecord[];
};

export function DeputyStaffDutyWorkspace() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useSchoolQuery<StaffDutyData>('/admin-command/deputy/staff-duty');

  const requestMutation = useSchoolMutation<{ id: string }, { id: string }>(
    ({ id }) => `/admin-command/deputy/staff-duty/${id}/request-report`,
    'POST',
    {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ["school", "session", '/admin-command/deputy/staff-duty'] })
    }
  );

  const duties = data?.duties || [];

  const handleRequestReport = async (id: string, staffName: string) => {
    try {
      await requestDutyReport(id);
      queryClient.invalidateQueries({ queryKey: ["school", "session", '/admin-command/deputy/staff-duty'] });
      toast.success(`Report requested from ${staffName}.`);
    } catch (e: any) {
      toast.error(e.message || "Failed to request report.");
    }
  };

  const getStatusTone = (st: string): Tone => {
    if (st === "Present") return "success";
    if (st === "Requested") return "warning";
    return "danger";
  };

  return (
    <Panel title="Staff Duty & Supervision" description="Staff duty rosters, supervision zones, and presence." icon={UsersRound} actions={
      <button onClick={() => toast.info("Duty roster module coming soon")} className="rounded-lg bg-[#071D49] px-4 py-2 text-sm font-black text-white hover:bg-blue-900 transition">Manage Roster</button>
    }>
      <div className="grid gap-4 md:grid-cols-2 mb-6">
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
          <div className="text-sm font-semibold text-[#64748B]">Total Staff</div>
          <div className="mt-1 text-lg font-black text-[#071D49]">{isLoading ? "..." : data?.metrics?.total_staff || 0}</div>
        </div>
      </div>
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
            {duties.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-[#64748B]">No staff duties currently assigned.</td>
              </tr>
            ) : (
              duties.map((duty) => (
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
              ))
            )}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
