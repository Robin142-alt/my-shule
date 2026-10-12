"use client";

import { useState } from "react";
import { CheckCircle2, Download, FileChartColumn, Printer } from "lucide-react";

import { SchoolPageHeader } from "@/components/school/school-page-header";
import { Button } from "@/components/ui/button";
import { buildBillingApiPath, unwrapBillingApiData } from "@/lib/billing/billing-utils";
import { getMonthStartInputValue, getTodayInputValue } from "@/lib/date-utils";
import { requestDashboardApi } from "@/lib/dashboard/api-client";
import { useSchoolCommandIdentity } from "@/components/school/integrated-school-command-header";
import { useOptionalSchoolTenantId } from "@/lib/data/school-tenant-scope";
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
    description: "School invoices with their status, amount and issue date.",
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
  const tenantId = useOptionalSchoolTenantId();
  const identity = useSchoolCommandIdentity();
  const [busy, setBusy] = useState<Record<string, "preview" | "download" | undefined>>({});
  const [error, setError] = useState<string | null>(null);
  const [lastArtifact, setLastArtifact] = useState<FinanceReportArtifact | null>(null);
  const [from, setFrom] = useState(getMonthStartInputValue);
  const [to, setTo] = useState(getTodayInputValue);
  const [method, setMethod] = useState("");
  const invalidPeriod = !from || !to || from > to;

  async function fetchArtifact(report: FinanceReport) {
    if (report.id === "finance-reconciliation" && invalidPeriod) throw new Error("Choose a start and end date, with the end on or after the start.");
    const params = new URLSearchParams({ from, to });
    if (method) params.set("method", method);
    const path = report.id === "finance-reconciliation" ? `${report.apiPath}?${params}` : report.apiPath;
    const response = await fetch(buildBillingApiPath(path, tenantSlug), {
      cache: "no-store", signal: AbortSignal.timeout(30_000),
    });
    const payload = (await response.json().catch(() => null)) as
      | FinanceReportArtifact
      | { message?: string }
      | null;

    const artifact = unwrapBillingApiData<FinanceReportArtifact>(payload);
    if (!response.ok || !artifact || typeof artifact.csv !== "string") {
      throw new Error(
        payload && "message" in payload && payload.message
          ? payload.message
          : `${report.title} could not be generated.`,
      );
    }
    return artifact;
  }

  async function auditReportAction(report: FinanceReport, artifact: FinanceReportArtifact, action: string) {
    await requestDashboardApi("/admin-command/accountant/actions", {
      method: "POST",
      tenantId: tenantId ?? undefined,
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
    }).catch(() => setError("The report was generated, but its activity record could not be saved. Retry the report when the finance service recovers."));
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
        eyebrow: identity.schoolName,
        title: report.title,
        subtitle: `${artifact.row_count ?? records.length} record${(artifact.row_count ?? records.length) === 1 ? "" : "s"}. Generated ${artifact.generated_at ? new Date(artifact.generated_at).toLocaleString("en-KE") : "from live finance data"}.`,
        rows: previewRecords.length > 0
          ? previewRecords.map((record, index) => ({
              label: record[0] || `Record ${index + 1}`,
              value: headers.slice(1).map((header, column) => `${header}: ${record[column + 1] || "—"}`).join(" · "),
            }))
          : [{ label: "Report status", value: "No records for the selected period" }],
        footer: records.length > previewRecords.length
          ? `Preview shows the first ${previewRecords.length} records. Download CSV for the complete report.`
          : `Generated by ${identity.userLabel}. School finance records.`,
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
    <div className="space-y-5 text-foreground">
      <div className="rounded-xl border border-white/12 bg-white p-5 shadow-sm">
        <SchoolPageHeader
          eyebrow="Accountant"
          title="Finance reports"
          description="Preview, print, and download reports from your school’s finance records."
        />
      </div>

      {error ? (
        <div className="rounded-xl border border-danger-border bg-danger-soft p-4 text-sm font-semibold text-danger" role="alert">
          {error}
        </div>
      ) : null}

      {lastArtifact ? (
        <div className="flex items-start gap-3 rounded-xl border border-success-border bg-success-soft p-4 text-success" role="status">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
          <div>
            <p className="font-semibold">Your report is ready</p>
            <p className="mt-1 text-sm font-semibold">
              {lastArtifact.filename} · {lastArtifact.row_count ?? parseCsv(lastArtifact.csv).slice(1).length} record{(lastArtifact.row_count ?? parseCsv(lastArtifact.csv).slice(1).length) === 1 ? "" : "s"}
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
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-info-soft text-info">
                  <FileChartColumn className="h-5 w-5" aria-hidden="true" />
                </span>
                <h3 className="mt-4 text-lg font-black">{report.title}</h3>
                <p className="mt-2 text-sm font-semibold leading-6 text-muted">{report.description}</p>
                {report.id === "finance-reconciliation" && <fieldset disabled={Boolean(currentAction)} className="mt-4 space-y-3">
                  <legend className="mb-2 text-sm font-medium">Collection period</legend>
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2"><label className="text-sm">From<input type="date" className="input-base mt-1 w-full" value={from} onChange={event => setFrom(event.target.value)} /></label><label className="text-sm">To<input type="date" className="input-base mt-1 w-full" value={to} onChange={event => setTo(event.target.value)} /></label></div>
                  <label className="block text-sm">Payment method<select className="input-base mt-1 w-full" value={method} onChange={event => setMethod(event.target.value)}><option value="">All methods</option><option value="cash">Cash</option><option value="cheque">Cheque</option><option value="mpesa_c2b">M-Pesa</option><option value="bank_deposit">Bank deposit</option><option value="eft">Bank transfer</option></select></label>
                  <div className="flex flex-wrap gap-2"><Button variant="ghost" onClick={() => { setFrom(getTodayInputValue()); setTo(getTodayInputValue()); }}>Today</Button><Button variant="ghost" onClick={() => { setFrom(getMonthStartInputValue()); setTo(getTodayInputValue()); }}>This month</Button></div>
                  {invalidPeriod && <p role="alert" className="text-sm text-danger">Choose a valid start and end date.</p>}
                </fieldset>}
              </div>
              <div className="mt-6 grid gap-2 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                <Button variant="secondary" onClick={() => void handlePreview(report)} disabled={Boolean(currentAction) || (report.id === "finance-reconciliation" && invalidPeriod)}>
                  <Printer className="h-4 w-4" aria-hidden="true" />
                  {currentAction === "preview" ? "Preparing…" : "Preview & print"}
                </Button>
                <Button onClick={() => void handleDownload(report)} disabled={Boolean(currentAction) || (report.id === "finance-reconciliation" && invalidPeriod)}>
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
