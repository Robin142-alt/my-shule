"use client";
import { useState } from "react";
import { FileText, Download } from "lucide-react";
import { toast } from "sonner";
import { Panel, StatusChip, Tone } from "./shared";
import { useSchoolQuery } from "@/lib/data/school-hooks";
import { generateClassReport } from "./api-client";

type ReportRecord = {
  id: string;
  report_name: string;
  type: string;
  term: string;
  generated_at: string;
  status: string;
  download_url: string | null;
};

type ReportsData = {
  metrics: {
    total_reports: number;
    generated_this_term: number;
    pending: number;
  };
  available_types: string[];
  reports: ReportRecord[];
};

export function ReportsWorkspace() {
  const { data, isLoading, refetch } = useSchoolQuery<ReportsData>('/admin-command/class-teacher/reports');
  const [generating, setGenerating] = useState(false);
  const [selectedType, setSelectedType] = useState("");

  const reports = data?.reports || [];
  const metrics = data?.metrics;

  const getStatusTone = (s: string): Tone => {
    if (s === "Ready") return "success";
    if (s === "Generating") return "info";
    if (s === "Failed") return "danger";
    return "neutral";
  };

  const handleGenerate = async () => {
    if (!selectedType) {
      toast.error("Select a report type first.");
      return;
    }
    setGenerating(true);
    try {
      await generateClassReport({ type: selectedType });
      toast.success("Report generation started.");
      refetch();
    } catch {
      toast.error("Failed to generate report.");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Panel
      title="Class Reports"
      description="Generate and download class reports — attendance summaries, academic analyses, and more."
      icon={FileText}
      actions={
        <div className="flex gap-2 items-center">
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="rounded-lg border border-[#D8E0EC] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select report type...</option>
            {(data?.available_types || ["Attendance Summary", "Academic Analysis", "Discipline Report", "Class Register", "Welfare Report"]).map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <button
            disabled={generating || !selectedType}
            onClick={handleGenerate}
            className="rounded-lg bg-[#071D49] px-4 py-2 text-sm font-black text-white hover:bg-blue-900 disabled:opacity-50"
          >
            {generating ? "Generating..." : "Generate"}
          </button>
        </div>
      }
    >
      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
          <div className="text-sm font-semibold text-[#64748B]">Total Reports</div>
          <div className="mt-1 text-2xl font-black text-[#071D49]">{isLoading ? "..." : metrics?.total_reports ?? 0}</div>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <div className="text-sm font-semibold text-emerald-700">Generated (Term)</div>
          <div className="mt-1 text-2xl font-black text-emerald-700">{isLoading ? "..." : metrics?.generated_this_term ?? 0}</div>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <div className="text-sm font-semibold text-amber-700">Pending</div>
          <div className="mt-1 text-2xl font-black text-amber-700">{isLoading ? "..." : metrics?.pending ?? 0}</div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-[#D8E0EC]">
        <table className="w-full text-sm text-left whitespace-nowrap">
          <thead className="bg-[#F8FAFC] text-[#071D49]">
            <tr>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Report Name</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Type</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Term</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Generated</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Status</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC] text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D8E0EC]">
            {isLoading ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-[#64748B]">Loading reports...</td></tr>
            ) : reports.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-[#64748B]">No reports generated yet. Select a report type above and generate your first report.</td></tr>
            ) : (
              reports.map((r) => (
                <tr key={r.id} className="hover:bg-[#F8FAFC]">
                  <td className="px-4 py-3 font-semibold text-[#071D49]">{r.report_name}</td>
                  <td className="px-4 py-3 text-[#64748B]">{r.type}</td>
                  <td className="px-4 py-3 text-[#64748B]">{r.term}</td>
                  <td className="px-4 py-3 text-[#64748B]">{r.generated_at}</td>
                  <td className="px-4 py-3"><StatusChip label={r.status} tone={getStatusTone(r.status)} /></td>
                  <td className="px-4 py-3 text-right">
                    {r.status === "Ready" && r.download_url && (
                      <a
                        href={r.download_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100"
                      >
                        <Download className="w-3 h-3" /> Download
                      </a>
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
