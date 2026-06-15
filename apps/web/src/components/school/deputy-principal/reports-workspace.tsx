"use client";
import { FileText } from "lucide-react";
import { Panel, StatusChip, Tone } from "./shared";
import { useSchoolQuery, useSchoolMutation } from "@/lib/data/school-hooks";
import { useQueryClient } from "@tanstack/react-query";

export type GeneratedReport = {
  id: string;
  reportName: string;
  generatedDate: string;
  type: "PDF" | "Excel";
  status: "Ready" | "Generating";
};

type ReportsData = {
  metrics: {
    generated_reports: number;
  };
  reportsList: GeneratedReport[];
};

export function DeputyReportsDownloadsWorkspace() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useSchoolQuery<ReportsData>('/admin-command/deputy/reports');

  const generateMutation = useSchoolMutation<{ name: string, format: string }>('/admin-command/deputy/reports/generate', 'POST', {
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["school", "session", '/admin-command/deputy/reports'] })
  });

  const reports = data?.reportsList || [];

  const handleGenerate = async () => {
    try {
      await fetch(`/api/v1/admin-command/deputy/reports/generate`, { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: "Custom Operational Extract", format: "Excel" })
      });
      queryClient.invalidateQueries({ queryKey: ["school", "session", '/admin-command/deputy/reports'] });
      alert("Report generated successfully.");
    } catch (e) {
      alert("Failed to generate report.");
    }
  };

  const getTone = (st: string): Tone => st === "Ready" ? "success" : "warning";

  return (
    <Panel title="Reports & Downloads" description="Generate operational reports for attendance, discipline, and duty." icon={FileText} actions={
      <button onClick={handleGenerate} className="rounded-lg bg-[#071D49] px-4 py-2 text-sm font-black text-white hover:bg-blue-900 transition">Generate New Report</button>
    }>
      <div className="grid gap-4 md:grid-cols-2 mb-6">
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
          <div className="text-sm font-semibold text-[#64748B]">Reports Generated</div>
          <div className="mt-1 text-lg font-black text-[#071D49]">{isLoading ? "..." : data?.metrics?.generated_reports || 0}</div>
        </div>
      </div>
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
            {reports.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-[#64748B]">No reports generated yet.</td>
              </tr>
            ) : (
              reports.map((rep) => (
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
              ))
            )}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}