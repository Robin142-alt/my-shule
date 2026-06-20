
// @ts-nocheck
"use client";

Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SchoolPageHeader } from "@/components/school/school-page-header";
import { MetricGrid } from "@/components/experience/metric-grid";
import { getSchoolWorkspace, type SchoolExperienceRole } from "@/lib/experiences/school-data";

export function SchoolReportsPage({
  role,
  tenantSlug,
}: {
  role: SchoolExperienceRole;
  tenantSlug?: string | null;
}) {
  const { model } = getSchoolWorkspace(role, tenantSlug);

  function exportReportCatalog() {
    downloadCsvFile({
      filename: "school-reports.csv",
      headers: ["Report", "Description"],
      rows: model.reports.reports.map((report) => [report.title, report.description]),
    });
  }

  function printReportSummary(title: string, description: string) {
    openPrintDocument({
      eyebrow: "School reports",
      title,
      subtitle: description,
      rows: model.reports.summary.map((item) => ({
        label: item.label,
        value: item.value,
      })),
      footer: "Print this summary or save it as PDF from your browser print dialog.",
    });
  }

  return (
    <div className="space-y-6">
      <SchoolPageHeader
        eyebrow="Reports"
        title="Reports and exports"
        description="Print fee statements, payment summaries, report cards, and operational exports without hunting through the system."
        actions={
          <>
            <Button variant="secondary" onClick={exportReportCatalog}>
              Export Excel
            </Button>
            <Button onClick={() => printReportSummary("School reports overview", "Operational reporting summary for the current section.")}>
              Print report
            </Button>
          </>
        }
      />
      <MetricGrid
        items={model.reports.summary.map((item) => ({
          id: item.id,
          label: item.label,
          value: item.value,
          helper: item.helper,
        }))}
      />
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {model.reports.reports.map((report) => {
          const Icon = report.icon;
          return (
            <Card key={report.id} className="p-5">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-soft text-foreground">
                <Icon className="h-5 w-5" />
              </span>
              <h3 className="mt-4 text-lg font-semibold text-foreground">{report.title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted">{report.description}</p>
              <div className="mt-5 flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => printReportSummary(report.title, report.description)}
                >
                  Print
                </Button>
                <Button
                  size="sm"
                  onClick={() =>
                    downloadTextFile({
                      filename: `${report.id}.txt`,
                      content: `${report.title}\n\n${report.description}`,
                    })
                  }
                >
                  Export PDF
                </Button>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
