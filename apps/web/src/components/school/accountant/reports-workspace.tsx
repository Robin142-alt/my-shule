"use client";

import { useState } from "react";
import { SchoolExperienceRole } from "@/lib/experiences/school-data";
import { SchoolPageHeader } from "@/components/school/school-page-header";
import { buildBillingApiPath } from "@/lib/billing/billing-utils";
import { downloadTextFile, CsvReportArtifactResponse } from "@/lib/dashboard/export";
import { Button } from "@/components/ui/button";

type SchoolRouteMode = "hosted" | "public";

export function ReportsWorkspace({
  role,
  tenantSlug,
}: {
  role: SchoolExperienceRole;
  tenantSlug?: string | null;
  routeMode?: SchoolRouteMode;
  activeSection?: string;
}) {
  const [downloading, setDownloading] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);

  const handleDownload = async (reportId: string, apiPath: string) => {
    setDownloading(prev => ({ ...prev, [reportId]: true }));
    setError(null);
    try {
      const response = await fetch(buildBillingApiPath(apiPath, tenantSlug || "demo"), {
        cache: "no-store"
      });

      if (!response.ok) {
        throw new Error(`Failed to generate ${reportId} report`);
      }

      const payload = (await response.json()) as CsvReportArtifactResponse;
      downloadTextFile({
        filename: payload.filename,
        content: payload.csv,
        mimeType: payload.content_type,
      });
    } catch (e: any) {
      setError(e.message || "An error occurred during report generation");
    } finally {
      setDownloading(prev => ({ ...prev, [reportId]: false }));
    }
  };

  const reports = [
    {
      id: "student-balances",
      title: "Student Balances Report",
      description: "A complete CSV export of all student fee balances and total amounts invoiced.",
      apiPath: "/api/billing/student-balances/csv"
    },
    {
      id: "finance-reconciliation",
      title: "Finance Reconciliation",
      description: "A detailed reconciliation of expected vs collected payments over the current period.",
      apiPath: "/api/billing/reconciliation/csv"
    }
  ];

  return (
    <div className="space-y-6">
      <SchoolPageHeader
        eyebrow="Accountant"
        title="Finance Reports"
        description="Generate and download standard financial reports for auditing and record-keeping."
      />

      {error && (
        <div className="rounded-md bg-red-50 p-4 text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {reports.map(report => (
          <div key={report.id} className="flex flex-col justify-between rounded-md border border-slate-200 bg-white p-6 shadow-sm">
            <div>
              <h3 className="text-lg font-medium text-slate-900">{report.title}</h3>
              <p className="mt-2 text-sm text-slate-500">{report.description}</p>
            </div>
            <div className="mt-6">
              <Button 
                onClick={() => handleDownload(report.id, report.apiPath)}
                disabled={downloading[report.id]}
              >
                {downloading[report.id] ? "Generating..." : "Download CSV"}
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
