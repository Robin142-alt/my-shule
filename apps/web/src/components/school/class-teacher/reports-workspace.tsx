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
            className="rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select report type...</option>
            {(data?.available_types || ["Attendance Summary", "Academic Analysis", "Discipline Report", "Class Register", "Welfare Report"]).map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <button
            disabled={generating || !selectedType}
            onClick={handleGenerate}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-black text-white hover:bg-blue-900 disabled:opacity-50"
          >
            {generating ? "Generating..." : "Generate"}
          </button>
        </div>
      }
    >
      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <div className="rounded-xl border border-border bg-surface-muted p-4">
          <div className="text-sm font-semibold text-muted">Total Reports</div>
          <div className="mt-1 text-2xl font-black text-foreground">{isLoading ? "..." : metrics?.total_reports ?? 0}</div>
        </div>
        <div className="rounded-xl border border-success-border bg-success-soft p-4">
          <div className="text-sm font-semibold text-success">Generated (Term)</div>
          <div className="mt-1 text-2xl font-black text-success">{isLoading ? "..." : metrics?.generated_this_term ?? 0}</div>
        </div>
        <div className="rounded-xl border border-warning-border bg-warning-soft p-4">
          <div className="text-sm font-semibold text-warning">Pending</div>
          <div className="mt-1 text-2xl font-black text-warning">{isLoading ? "..." : metrics?.pending ?? 0}</div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm text-left whitespace-nowrap">
          <thead className="bg-surface-muted text-foreground">
            <tr>
              <th className="px-4 py-3 font-bold border-b border-border">Report Name</th>
              <th className="px-4 py-3 font-bold border-b border-border">Type</th>
              <th className="px-4 py-3 font-bold border-b border-border">Term</th>
              <th className="px-4 py-3 font-bold border-b border-border">Generated</th>
              <th className="px-4 py-3 font-bold border-b border-border">Status</th>
              <th className="px-4 py-3 font-bold border-b border-border text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-muted">Loading reports...</td></tr>
            ) : reports.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-muted">No reports generated yet. Select a report type above and generate your first report.</td></tr>
            ) : (
              reports.map((r) => (
                <tr key={r.id} className="hover:bg-surface-muted">
                  <td className="px-4 py-3 font-semibold text-foreground">{r.report_name}</td>
                  <td className="px-4 py-3 text-muted">{r.type}</td>
                  <td className="px-4 py-3 text-muted">{r.term}</td>
                  <td className="px-4 py-3 text-muted">{r.generated_at}</td>
                  <td className="px-4 py-3"><StatusChip label={r.status} tone={getStatusTone(r.status)} /></td>
                  <td className="px-4 py-3 text-right">
                    {r.status === "Ready" && r.download_url && (
                      <a
                        href={r.download_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded-lg border border-success-border bg-success-soft px-3 py-1.5 text-xs font-bold text-success hover:bg-emerald-100"
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
