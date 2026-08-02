"use client";

import { useState } from "react";
import { CheckCircle2, Download, FileChartColumn, Printer } from "lucide-react";

import { SchoolPageHeader } from "@/components/school/school-page-header";
import { Button } from "@/components/ui/button";
import { buildBillingApiPath } from "@/lib/billing/billing-utils";
import { requestDashboardApi } from "@/lib/dashboard/api-client";
import {
  type CsvReportArtifactResponse,
  downloadTextFile,
  openPrintDocument,
} from "@/lib/dashboard/export";
import type { SchoolExperienceRole } from "@/lib/experiences/school-data";

type SchoolRouteMode = "hosted" | "public";

type FinanceReport = {
  id: string;
  title: string;
  description: string;
  apiPath: string;
};

type FinanceReportArtifact = CsvReportArtifactResponse & {
  report_id?: string;
  title?: string;
  generated_at?: string;
  row_count?: number;
  checksum_sha256?: string;
};

const FINANCE_REPORTS: FinanceReport[] = [
  {
    id: "student-balances",
    title: "Student balances report",
    description: "Invoiced, paid, credited, and outstanding amounts for learners in this school.",
    apiPath: "/api/billing/student-balances/csv",
  },
  {
    id: "finance-reconciliation",
    title: "Finance reconciliation",
    description: "Cleared, pending, and exception receipts for the current reconciliation period.",
    apiPath: "/api/billing/reconciliation/csv",
  },
  {
    id: "invoice-register",
    title: "Invoice register",
    description: "A tenant-scoped audit register of invoices, statuses, totals, and issue dates.",
    apiPath: "/api/billing/reports/invoices/export",
  },
];

function parseCsv(csv: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let value = "";
  let quoted = false;

  for (let index = 0; index < csv.length; index += 1) {
    const character = csv[index];
    if (character === '"') {
      if (quoted && csv[index + 1] === '"') {
        value += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
      continue;
    }
    if (character === "," && !quoted) {
      row.push(value);
      value = "";
      continue;
    }
    if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && csv[index + 1] === "\n") index += 1;
      row.push(value);
      if (row.some((cell) => cell.length > 0)) rows.push(row);
      row = [];
      value = "";
      continue;
    }
    value += character;
  }

  if (value.length > 0 || row.length > 0) {
    row.push(value);
    if (row.some((cell) => cell.length > 0)) rows.push(row);
  }
  return rows;
}

export function ReportsWorkspace({
  tenantSlug,
}: {
  role: SchoolExperienceRole;
  tenantSlug?: string | null;
  routeMode?: SchoolRouteMode;
  activeSection?: string;
}) {
  const [busy, setBusy] = useState<Record<string, "preview" | "download" | undefined>>({});
  const [error, setError] = useState<string | null>(null);
  const [lastArtifact, setLastArtifact] = useState<FinanceReportArtifact | null>(null);

  async function fetchArtifact(report: FinanceReport) {
    const response = await fetch(buildBillingApiPath(report.apiPath, tenantSlug), {
      cache: "no-store",
    });
    const payload = (await response.json().catch(() => null)) as
      | FinanceReportArtifact
      | { message?: string }
      | null;

    if (!response.ok || !payload || !("csv" in payload)) {
      throw new Error(
        payload && "message" in payload && payload.message
          ? payload.message
          : `${report.title} could not be generated.`,
      );
    }
    return payload;
  }

  async function auditReportAction(report: FinanceReport, artifact: FinanceReportArtifact, action: string) {
    await requestDashboardApi("/admin-command/accountant/actions", {
      method: "POST",
      body: {
        action: `finance_report_${action}`,
        title: `Finance report ${action}`,
        message: `${report.title} was ${action} from live school finance data.`,
        entity_type: "finance_report",
        entity_id: artifact.report_id ?? report.id,
        source_dashboard: "accountant-reports-workspace",
        target_roles: ["accountant", "principal"],
        payload: {
          filename: artifact.filename,
          generated_at: artifact.generated_at,
          row_count: artifact.row_count,
          checksum_sha256: artifact.checksum_sha256,
        },
      },
    }).catch(() => undefined);
  }

  async function handleDownload(report: FinanceReport) {
    setBusy((current) => ({ ...current, [report.id]: "download" }));
    setError(null);
    try {
      const artifact = await fetchArtifact(report);
      downloadTextFile({
        filename: artifact.filename,
        content: artifact.csv,
        mimeType: artifact.content_type,
      });
      setLastArtifact(artifact);
      await auditReportAction(report, artifact, "downloaded");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The finance report could not be downloaded.");
    } finally {
      setBusy((current) => ({ ...current, [report.id]: undefined }));
    }
  }

  async function handlePreview(report: FinanceReport) {
    setBusy((current) => ({ ...current, [report.id]: "preview" }));
    setError(null);
    try {
      const artifact = await fetchArtifact(report);
      const [headers = [], ...records] = parseCsv(artifact.csv);
      const previewRecords = records.slice(0, 30);
      openPrintDocument({
        eyebrow: "School finance report",
        title: report.title,
        subtitle: `${artifact.row_count ?? records.length} record${(artifact.row_count ?? records.length) === 1 ? "" : "s"}. Generated ${artifact.generated_at ? new Date(artifact.generated_at).toLocaleString("en-KE") : "from live finance data"}.`,
        rows: previewRecords.length > 0
          ? previewRecords.map((record, index) => ({
              label: record[0] || `Record ${index + 1}`,
              value: headers.slice(1).map((header, column) => `${header}: ${record[column + 1] || "—"}`).join(" · "),
            }))
          : [{ label: "Report status", value: "No records for the selected period" }],
        footer: records.length > previewRecords.length
          ? `Preview shows the first ${previewRecords.length} records. Download CSV for the complete audit artifact.`
          : `Verification checksum: ${artifact.checksum_sha256 ?? "available in the downloaded artifact"}`,
      });
      setLastArtifact(artifact);
      await auditReportAction(report, artifact, "previewed");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The finance report could not be previewed.");
    } finally {
      setBusy((current) => ({ ...current, [report.id]: undefined }));
    }
  }

  return (
    <div className="space-y-5 text-[#071D49]">
      <div className="rounded-xl border border-white/12 bg-white p-5 shadow-sm">
        <SchoolPageHeader
          eyebrow="Accountant"
          title="Finance reports"
          description="Preview, print, and download tenant-scoped finance artifacts generated from live records."
        />
      </div>

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700" role="alert">
          {error}
        </div>
      ) : null}

      {lastArtifact ? (
        <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800" role="status">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
          <div>
            <p className="font-black">Latest artifact is ready</p>
            <p className="mt-1 text-sm font-semibold">
              {lastArtifact.filename} · {lastArtifact.row_count ?? parseCsv(lastArtifact.csv).slice(1).length} records
              {lastArtifact.generated_at ? ` · ${new Date(lastArtifact.generated_at).toLocaleString("en-KE")}` : ""}
            </p>
          </div>
        </div>
      ) : null}

      <section className="grid gap-4 xl:grid-cols-3" aria-label="Available finance reports">
        {FINANCE_REPORTS.map((report) => {
          const currentAction = busy[report.id];
          return (
            <article key={report.id} className="flex min-h-64 flex-col justify-between rounded-xl border border-white/12 bg-white p-5 shadow-sm">
              <div>
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#EEF5FF] text-[#1D4ED8]">
                  <FileChartColumn className="h-5 w-5" aria-hidden="true" />
                </span>
                <h3 className="mt-4 text-lg font-black">{report.title}</h3>
                <p className="mt-2 text-sm font-semibold leading-6 text-[#64748B]">{report.description}</p>
                <p className="mt-3 text-xs font-bold uppercase tracking-[0.1em] text-[#1D4ED8]">Live school records · CSV audit artifact</p>
              </div>
              <div className="mt-6 grid gap-2 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                <Button variant="secondary" onClick={() => void handlePreview(report)} disabled={Boolean(currentAction)}>
                  <Printer className="h-4 w-4" aria-hidden="true" />
                  {currentAction === "preview" ? "Preparing…" : "Preview & print"}
                </Button>
                <Button onClick={() => void handleDownload(report)} disabled={Boolean(currentAction)}>
                  <Download className="h-4 w-4" aria-hidden="true" />
                  {currentAction === "download" ? "Generating…" : "Download CSV"}
                </Button>
              </div>
            </article>
          );
        })}
      </section>
    </div>
  );
}
