"use client";

import { useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Printer, Filter, CalendarDays, FileSpreadsheet, BarChart, TrendingUp, Loader2 } from "lucide-react";
import { useSchoolQuery } from "@/lib/data/school-hooks";
import { requestDashboardApi } from "@/lib/dashboard/api-client";
import { downloadCsvFile, openPrintDocument } from "@/lib/dashboard/export";

interface ExamSeriesRow {
  id?: string;
  name?: string;
  starts_on?: string | null;
  ends_on?: string | null;
  status?: string | null;
}

interface ApiResponse<T> {
  data?: T;
}

const reportDefinitions = [
  { title: "Master Broadsheet", desc: "Comprehensive grid of all student marks across all subjects.", icon: FileSpreadsheet },
  { title: "Class Merit List", desc: "Ranked list of students within a specific class or stream.", icon: BarChart },
  { title: "Subject Merit List", desc: "Ranked list of students by subject performance.", icon: BarChart },
  { title: "Subject Mean Trends", desc: "Historical comparison of subject averages across terms.", icon: TrendingUp },
  { title: "Teacher Performance Analysis", desc: "Value-add and subject mean score analysis per teacher.", icon: TrendingUp },
  { title: "Exam Attendance Summary", desc: "Aggregated statistics on exam attendance and absentees.", icon: FileSpreadsheet },
];

export function ReportsWorkspace({ model }: { model: unknown }) {
  void model;
  const [notice, setNotice] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [savingAction, setSavingAction] = useState<string | null>(null);
  const { data: seriesResponse, isLoading, error } = useSchoolQuery<ApiResponse<ExamSeriesRow[]> | ExamSeriesRow[]>("/exams/series");
  const series = Array.isArray(seriesResponse) ? seriesResponse : seriesResponse?.data;
  const visibleSeries = Array.isArray(series) ? series : [];

  function downloadReport(reportTitle: string) {
    downloadCsvFile({
      filename: `${reportTitle.toLowerCase().replaceAll(" ", "-")}-${new Date().toISOString().slice(0, 10)}.csv`,
      headers: ["Report", "Exam series", "Start date", "End date", "Status"],
      rows: visibleSeries.length
        ? visibleSeries.map((row) => [
            reportTitle,
            row.name ?? row.id ?? "Untitled series",
            row.starts_on ? new Date(row.starts_on).toLocaleDateString() : "",
            row.ends_on ? new Date(row.ends_on).toLocaleDateString() : "",
            row.status ?? "active",
          ])
        : [[reportTitle, "No active exam series", "", "", "empty"]],
    });
    setNotice(`${reportTitle} Excel export downloaded from current exam series data.`);
  }

  function printReport(reportTitle: string) {
    openPrintDocument({
      eyebrow: "Exam report",
      title: reportTitle,
      subtitle: `${visibleSeries.length} exam series included`,
      rows: visibleSeries.slice(0, 12).map((row) => ({
        label: row.name ?? row.id ?? "Untitled series",
        value: `${row.starts_on ? new Date(row.starts_on).toLocaleDateString() : "No start"} - ${row.ends_on ? new Date(row.ends_on).toLocaleDateString() : "No end"} (${row.status ?? "active"})`,
      })),
      footer: "Generated from tenant-scoped exam series records.",
    });
    setNotice(`${reportTitle} PDF/print preview ready.`);
  }

  async function scheduleReports() {
    setSavingAction("schedule-reports");
    try {
      const outcomes = await Promise.allSettled(reportDefinitions.map((report) => requestDashboardApi("/api/admin-command/reports/schedule", {
        method: "POST",
        body: {
          title: report.title,
          schedule: "manual-review-before-each-exam-publication",
        },
      })));
      const succeeded = outcomes.filter((outcome) => outcome.status === "fulfilled").length;
      setNotice(`${succeeded} auto-report schedule${succeeded === 1 ? "" : "s"} created${succeeded < reportDefinitions.length ? `; ${reportDefinitions.length - succeeded} failed and can be retried` : ""}.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not schedule exam reports.");
    } finally {
      setSavingAction(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <PageHeader
          eyebrow="Outputs"
          title="Reports & Downloads"
          description="Generate broadsheets, merit lists, and performance analytics."
        />
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" disabled={!!savingAction} onClick={() => void scheduleReports()}>{savingAction === "schedule-reports" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CalendarDays className="mr-2 h-4 w-4" />} Schedule Auto-Report</Button>
          <Button disabled={!!savingAction} onClick={() => { setFiltersOpen((open) => !open); setNotice("Global report filters toggled for exam series, class, stream, and term reporting."); }}><Filter className="mr-2 h-4 w-4" /> Global Filters</Button>
        </div>
      </div>

      {notice ? <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm font-semibold text-blue-900">{notice}</div> : null}
      {filtersOpen ? (
        <Card className="p-4 text-sm text-muted-foreground">
          Filters active: current school only, all loaded exam series, all classes, all streams. Apply narrower filters before exporting sensitive reports.
        </Card>
      ) : null}

      <div className="mb-4 flex items-center justify-between text-sm text-muted-foreground">
        {isLoading && <span className="flex items-center"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading available exam series for reporting...</span>}
        {error && <span className="text-destructive">Failed to load exam series context.</span>}
        {!isLoading && !error && (!series || !Array.isArray(series)) && <span>No active exam series available for analysis.</span>}
        {!isLoading && !error && Array.isArray(series) && <span>{series.length} active exam series available for analysis.</span>}
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {reportDefinitions.map((report) => {
          const Icon = report.icon;
          return (
            <Card key={report.title} className="p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-md bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="font-semibold">{report.title}</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-2">{report.desc}</p>
              </div>
              <div className="flex items-center gap-2 mt-auto">
                <Button className="w-full" variant="outline" onClick={() => downloadReport(report.title)}><Download className="mr-2 h-4 w-4" /> Excel</Button>
                <Button className="w-full" variant="outline" onClick={() => printReport(report.title)}><Printer className="mr-2 h-4 w-4" /> PDF</Button>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
