"use client";
import { useState, useEffect } from "react";
import { CheckCircle2 } from "lucide-react";
import { Panel, StatusChip, Tone } from "./shared";
import { readSchoolData, updateSchoolRecord, subscribeToSchoolDataUpdates, createNotification } from "@/lib/school/school-operational-store";

export type ApprovalRequest = {
  id: string;
  type: string;
  raisedBy: string;
  affectedPerson: string;
  status: "Pending Approval" | "Approved" | "Rejected";
};

export function DeputyApprovalsWorkspace() {
  const [approvals, setApprovals] = useState<ApprovalRequest[]>([]);

  const loadData = () => {
    const data = readSchoolData<ApprovalRequest>("deputyApprovals");
    setApprovals(data.length > 0 ? data : [
      { id: "1", type: "Suspension Recommend", raisedBy: "Discipline Master", affectedPerson: "Brian Otieno", status: "Pending Approval" }
    ]);
  };

  useEffect(() => {
    loadData();
    const unsub = subscribeToSchoolDataUpdates(({ moduleName }) => {
      if (moduleName === "deputyApprovals") loadData();
    });
    return unsub;
  }, []);

  const handleAction = (id: string, action: "Approve" | "Reject") => {
    const newStatus = action === "Approve" ? "Approved" : "Rejected";
    updateSchoolRecord("deputyApprovals", id, { status: newStatus });
    
    createNotification({
      audienceRoles: ["discipline_master", "principal"],
      sourceModule: "approvals",
      title: `Approval ${newStatus}`,
      body: `The recommendation has been ${newStatus.toLowerCase()} by the Deputy Principal.`,
      severity: action === "Approve" ? "success" : "warning",
    });
    alert(`Request has been ${newStatus}.`);
  };

  const getStatusTone = (st: string): Tone => {
    if (st === "Pending Approval") return "warning";
    if (st === "Approved") return "success";
    return "danger";
  };

  return (
    <Panel title="Approvals & Escalations" description="Handle operational approvals and escalations." icon={CheckCircle2}>
      <div className="overflow-x-auto rounded-xl border border-[#D8E0EC]">
        <table className="w-full text-sm text-left whitespace-nowrap">
          <thead className="bg-[#F8FAFC] text-[#071D49]">
            <tr>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Type</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Raised By</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Affected Person</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Status</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC] text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D8E0EC]">
            {approvals.map((req) => (
              <tr key={req.id} className="hover:bg-[#F8FAFC]">
                <td className="px-4 py-3 font-semibold text-[#071D49]">{req.type}</td>
                <td className="px-4 py-3 text-[#64748B]">{req.raisedBy}</td>
                <td className="px-4 py-3 text-[#64748B]">{req.affectedPerson}</td>
                <td className="px-4 py-3"><StatusChip label={req.status} tone={getStatusTone(req.status)} /></td>
                <td className="px-4 py-3 text-right">
                  {req.status === "Pending Approval" ? (
                    <>
                      <button onClick={() => handleAction(req.id, "Approve")} className="text-emerald-600 hover:underline font-semibold text-xs mr-3">Approve</button>
                      <button onClick={() => handleAction(req.id, "Reject")} className="text-rose-600 hover:underline font-semibold text-xs mr-3">Reject</button>
                    </>
                  ) : (
                    <span className="text-[#64748B] text-xs font-semibold">Processed</span>
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