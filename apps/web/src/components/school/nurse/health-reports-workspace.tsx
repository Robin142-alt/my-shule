"use client";
import { useState } from "react";
import { FileBarChart, Download, RefreshCw } from "lucide-react";
import { Panel, StatusChip, Tone } from "./shared";
import { useSchoolQuery } from "@/lib/data/school-hooks";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { generateHealthReport } from "./api-client";

type ReportRecord = {
  id: string;
  title: string;
  report_type: string;
  period: string;
  generated_at: string;
  status: string;
  total_visits: number;
  total_dispensed: number;
};

type ReportsData = {
  metrics: { total_reports: number; generated_this_term: number };
  reports: ReportRecord[];
};

export function HealthReportsWorkspace() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useSchoolQuery<ReportsData>('/admin-command/nurse/health-reports');
  const [isGenerating, setIsGenerating] = useState(false);
  const [reportType, setReportType] = useState("weekly");

  const reports = data?.reports || [];

  const getStatusTone = (st: string): Tone => {
    if (st === "Ready") return "success";
    if (st === "Generating") return "info";
    if (st === "Failed") return "danger";
    return "neutral";
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      await generateHealthReport({ report_type: reportType });
      queryClient.invalidateQueries({ queryKey: ["school", "session", "/admin-command/nurse/health-reports"] });
      toast.success(`${reportType.charAt(0).toUpperCase() + reportType.slice(1)} health report generated.`);
    } catch (e: any) { toast.error(e.message || "Failed to generate report."); }
    finally { setIsGenerating(false); }
  };

  return (
    <Panel title="Health Reports" description="Generate and download health summaries for the school." icon={FileBarChart} actions={
      <div className="flex items-center gap-2">
        <select value={reportType} onChange={e => setReportType(e.target.value)} className="rounded-lg border border-[#D8E0EC] px-3 py-2 text-sm focus:border-[#071D49] focus:outline-none">
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
          <option value="term">Term</option>
          <option value="annual">Annual</option>
        </select>
        <button disabled={isGenerating} onClick={handleGenerate} className="flex items-center gap-2 rounded-lg bg-[#071D49] px-4 py-2 text-sm font-black text-white hover:bg-blue-900 transition disabled:opacity-50">
          <RefreshCw className={`w-4 h-4 ${isGenerating ? "animate-spin" : ""}`} />
          {isGenerating ? "Generating..." : "Generate Report"}
        </button>
      </div>
    }>
      <div className="grid gap-4 md:grid-cols-2 mb-6">
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
          <div className="text-sm font-semibold text-[#64748B]">Total Reports</div>
          <div className="mt-1 text-lg font-black text-[#071D49]">{isLoading ? "..." : data?.metrics?.total_reports ?? 0}</div>
        </div>
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
          <div className="text-sm font-semibold text-[#64748B]">Generated This Term</div>
          <div className="mt-1 text-lg font-black text-[#071D49]">{isLoading ? "..." : data?.metrics?.generated_this_term ?? 0}</div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-[#D8E0EC]">
        <table className="w-full text-sm text-left whitespace-nowrap">
          <thead className="bg-[#F8FAFC] text-[#071D49]">
            <tr>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Report</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Type</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Period</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Visits</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Dispensed</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Generated</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Status</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC] text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D8E0EC]">
            {isLoading ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-[#64748B]">Loading reports...</td></tr>
            ) : reports.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-[#64748B]">No reports generated yet. Select a report type and click &quot;Generate Report&quot; to create a health summary.</td></tr>
            ) : (
              reports.map(r => (
                <tr key={r.id} className="hover:bg-[#F8FAFC]">
                  <td className="px-4 py-3 font-semibold text-[#071D49]">{r.title}</td>
                  <td className="px-4 py-3 text-[#64748B] capitalize">{r.report_type}</td>
                  <td className="px-4 py-3 text-[#64748B]">{r.period}</td>
                  <td className="px-4 py-3 font-bold text-[#071D49]">{r.total_visits}</td>
                  <td className="px-4 py-3 text-[#64748B]">{r.total_dispensed}</td>
                  <td className="px-4 py-3 text-[#64748B]">{r.generated_at}</td>
                  <td className="px-4 py-3"><StatusChip label={r.status} tone={getStatusTone(r.status)} /></td>
                  <td className="px-4 py-3 text-right">
                    {r.status === "Ready" && (
                      <button className="inline-flex items-center gap-1 text-blue-600 hover:underline font-semibold text-xs">
                        <Download className="w-3 h-3" /> Download
                      </button>
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
