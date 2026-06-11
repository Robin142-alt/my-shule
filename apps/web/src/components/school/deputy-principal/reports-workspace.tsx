"use client";
import { useState, useEffect } from "react";
import { FileText } from "lucide-react";
import { Panel, StatusChip, Tone } from "./shared";
import { readSchoolData, addSchoolRecord, subscribeToSchoolDataUpdates, createAuditLog } from "@/lib/school/school-operational-store";

export type GeneratedReport = {
  id: string;
  reportName: string;
  generatedDate: string;
  type: "PDF" | "Excel";
  status: "Ready" | "Generating";
};

export function DeputyReportsDownloadsWorkspace() {
  const [reports, setReports] = useState<GeneratedReport[]>([]);

  const loadData = () => {
    const data = readSchoolData<GeneratedReport>("deputyReports");
    setReports(data.length > 0 ? data : [
      { id: "1", reportName: "Weekly Attendance Summary", generatedDate: "Today", type: "PDF", status: "Ready" }
    ]);
  };

  useEffect(() => {
    loadData();
    const unsub = subscribeToSchoolDataUpdates(({ moduleName }) => {
      if (moduleName === "deputyReports") loadData();
    });
    return unsub;
  }, []);

  const handleGenerate = () => {
    const newReport: GeneratedReport = {
      id: Math.random().toString(36).slice(2, 9),
      reportName: "Custom Operational Extract",
      generatedDate: "Just Now",
      type: "Excel",
      status: "Ready"
    };
    addSchoolRecord("deputyReports", newReport);
    createAuditLog({ module: "reports", action: "Generate Report", title: "Report Exported", body: "Deputy Principal generated a custom operational extract.", actorRole: "deputy_principal" });
    alert("Report generated successfully.");
  };

  const getTone = (st: string): Tone => st === "Ready" ? "success" : "warning";

  return (
    <Panel title="Reports & Downloads" description="Generate operational reports for attendance, discipline, and duty." icon={FileText} actions={
      <button onClick={handleGenerate} className="rounded-lg bg-[#071D49] px-4 py-2 text-sm font-black text-white hover:bg-blue-900 transition">Generate New Report</button>
    }>
      <div className="overflow-x-auto rounded-xl border border-[#D8E0EC]">
        <table className="w-full text-sm text-left whitespace-nowrap">
          <thead className="bg-[#F8FAFC] text-[#071D49]">
            <tr>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Report Name</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Date</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Format</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Status</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC] text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D8E0EC]">
            {reports.map((rep) => (
              <tr key={rep.id} className="hover:bg-[#F8FAFC]">
                <td className="px-4 py-3 font-semibold text-[#071D49]">{rep.reportName}</td>
                <td className="px-4 py-3 text-[#64748B]">{rep.generatedDate}</td>
                <td className="px-4 py-3 text-[#64748B]">{rep.type}</td>
                <td className="px-4 py-3"><StatusChip label={rep.status} tone={getTone(rep.status)} /></td>
                <td className="px-4 py-3 text-right">
                  {rep.status === "Ready" && (
                    <button onClick={() => alert("Downloading file...")} className="text-blue-600 hover:underline font-semibold text-xs">Download</button>
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