"use client";

import { useMemo, useState } from "react";
import { Download, FileCheck2, FileText, Printer } from "lucide-react";

import { downloadCsvFile, openPrintDocument, type PrintableRow } from "@/lib/dashboard/export";
import { useSchoolQuery } from "@/lib/data/school-hooks";

import { LabQuickActions, Panel, SaveState, WorkspaceEmpty } from "./shared";
import type { LaboratoryActionResponse, LabStorageLocation } from "./types";
import { formatKenyanDate } from "./types";
import { isPendingSync, useLaboratoryMutation } from "./use-laboratory-mutation";

type RegisterType =
  | "stock_book"
  | "chemicals_register"
  | "apparatus_register"
  | "consumables_register"
  | "issue_return_register"
  | "breakage_loss_register"
  | "expired_chemicals_register"
  | "stocktake_sheet"
  | "practical_preparation_checklist"
  | "low_stock_list";

type RegisterDefinition = {
  type: RegisterType;
  title: string;
  description: string;
  filename: string;
};

type LabRegisterReport = {
  document_number: string;
  school_name: string;
  school_logo: string | null;
  laboratory: string;
  location_filter: string | null;
  report_type: RegisterType;
  date_from: string | null;
  date_to: string | null;
  generated_at: string;
  generated_by: string;
  rows: Array<Record<string, unknown>>;
};

type RegisterResponse = LaboratoryActionResponse<{ report: LabRegisterReport }>;
type RegisterVariables = { report_type: RegisterType; laboratory?: string; location_filter?: string; date_from?: string; date_to?: string };

const registers: RegisterDefinition[] = [
  { type: "stock_book", title: "Current Stock Book", description: "All laboratory items and current available quantities.", filename: "laboratory-current-stock-book.csv" },
  { type: "chemicals_register", title: "Chemicals Register", description: "Chemicals, quantities, safety details and expiry dates.", filename: "laboratory-chemicals-register.csv" },
  { type: "apparatus_register", title: "Apparatus Register", description: "Apparatus, equipment and safety equipment records.", filename: "laboratory-apparatus-register.csv" },
  { type: "consumables_register", title: "Consumables Register", description: "Gloves, filter paper and other consumable stock.", filename: "laboratory-consumables-register.csv" },
  { type: "issue_return_register", title: "Issue and Return Register", description: "Items issued for practicals and how returns were accounted for.", filename: "laboratory-issue-return-register.csv" },
  { type: "breakage_loss_register", title: "Breakage and Loss Register", description: "Broken, damaged, spilled or missing laboratory items.", filename: "laboratory-breakage-loss-register.csv" },
  { type: "expired_chemicals_register", title: "Expired Chemicals Register", description: "Chemicals whose recorded expiry date has passed.", filename: "laboratory-expired-chemicals-register.csv" },
  { type: "stocktake_sheet", title: "Stocktake Sheet", description: "Expected counts, physical counts and differences by location.", filename: "laboratory-stocktake-sheet.csv" },
  { type: "practical_preparation_checklist", title: "Practical Preparation Checklist", description: "Requested and prepared items for practical lessons.", filename: "laboratory-practical-preparation-checklist.csv" },
  { type: "low_stock_list", title: "Low-Stock List", description: "Items at or below their minimum quantity.", filename: "laboratory-low-stock-list.csv" },
];

const fieldClass =
  "min-h-12 w-full rounded-xl border border-[#C8D5EA] bg-white px-3 text-base text-[#071D49] outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100";

const omittedSummaryKeys = new Set([
  "id", "tenant_id", "school_id", "created_by", "updated_by",
  "practical_request_id", "request_item_id", "item_id", "location_id",
]);

function humanizeKey(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function cellValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (Array.isArray(value) || typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function nestedRows(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.map((entry, index) => {
    if (!entry || typeof entry !== "object") return String(entry);
    const row = entry as Record<string, unknown>;
    const label = row.item_name ?? row.label ?? row.name ?? `Item ${index + 1}`;
    const details = Object.entries(row)
      .filter(([key, detail]) => !omittedSummaryKeys.has(key) && !["item_name", "label", "name"].includes(key) && detail !== null && detail !== undefined && detail !== "")
      .map(([key, detail]) => `${humanizeKey(key)} ${cellValue(detail)}`)
      .join(", ");
    return details ? `${String(label)} (${details})` : String(label);
  });
}

function primaryLabel(row: Record<string, unknown>, index: number) {
  const candidate = row.item_name ?? row.practical_title ?? row.location_name ?? row.name ?? row.title ?? row.subject;
  return candidate ? `${index + 1}. ${String(candidate)}` : `Record ${index + 1}`;
}

function rowSummary(row: Record<string, unknown>) {
  const entries = Object.entries(row)
    .filter(([key, value]) => !omittedSummaryKeys.has(key) && value !== null && value !== undefined && value !== "");
  const scalarDetails = entries
    .filter(([, value]) => !Array.isArray(value) && typeof value !== "object")
    .slice(0, 12)
    .map(([key, value]) => `${humanizeKey(key)}: ${cellValue(value)}`);
  const listDetails = entries.flatMap(([key, value]) => {
    const summaries = nestedRows(value);
    return summaries.length ? [`${humanizeKey(key)}: ${summaries.join("; ")}`] : [];
  });
  const details = [...scalarDetails, ...listDetails];
  return details.length
    ? details.join(" · ")
    : "No further details recorded";
}

function printRows(report: LabRegisterReport): PrintableRow[] {
  const metadata: PrintableRow[] = [
    { label: "School", value: report.school_name },
    { label: "Laboratory", value: report.laboratory },
    { label: "Location Scope", value: report.location_filter || "All laboratory locations" },
    { label: "Document Number", value: report.document_number },
    { label: "Date Range", value: report.date_from || report.date_to ? `${formatKenyanDate(report.date_from)} to ${formatKenyanDate(report.date_to)}` : "Current records" },
    { label: "Generated", value: formatKenyanDate(report.generated_at) },
    { label: "Generated By", value: report.generated_by },
  ];
  if (report.rows.length === 0) return [...metadata, { label: "Records", value: "No laboratory records matched this report." }];
  return [...metadata, ...report.rows.map((row, index) => ({ label: primaryLabel(row, index), value: rowSummary(row) }))];
}

function openRegister(report: LabRegisterReport, definition: RegisterDefinition) {
  openPrintDocument({
    eyebrow: `${report.school_name} · ${report.laboratory}`,
    title: definition.title,
    subtitle: `Document ${report.document_number} · Generated ${formatKenyanDate(report.generated_at)} from confirmed school laboratory records.`,
    rows: printRows(report),
    footer: "Laboratory Technician: ____________________  Date: __________  Reviewed by: ____________________  Signature: ____________________  Page numbers are generated by the print layout where supported; otherwise enable browser print headers and footers.",
    logoUrl: report.school_logo,
  });
}

function downloadRegister(report: LabRegisterReport, definition: RegisterDefinition) {
  const dataKeys = Array.from(new Set(report.rows.flatMap((row) => Object.keys(row)))).filter((key) => !["tenant_id", "school_id"].includes(key));
  const headers = ["School", "Laboratory", "Location Scope", "Report Title", "Document Number", "Date From", "Date To", "Generated Date", "Generated By", ...dataKeys.map(humanizeKey)];
  const metadata = [
    report.school_name,
    report.laboratory,
    report.location_filter || "All laboratory locations",
    definition.title,
    report.document_number,
    report.date_from ? formatKenyanDate(report.date_from) : "",
    report.date_to ? formatKenyanDate(report.date_to) : "",
    formatKenyanDate(report.generated_at),
    report.generated_by,
  ];
  const rows = report.rows.length
    ? report.rows.map((row) => [...metadata, ...dataKeys.map((key) => cellValue(row[key]))])
    : [[...metadata, ...dataKeys.map(() => "")]];
  downloadCsvFile({ filename: definition.filename, headers, rows });
}

export function ReportsWorkspace() {
  const [laboratory, setLaboratory] = useState("School Laboratory");
  const [locationFilter, setLocationFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [generated, setGenerated] = useState<{ report: LabRegisterReport; definition: RegisterDefinition } | null>(null);
  const [saveState, setSaveState] = useState<"saved" | "saving" | "failed" | "pending_sync" | null>(null);
  const [notice, setNotice] = useState("");
  const locationsQuery = useSchoolQuery<LabStorageLocation[]>("/labs/locations");

  const mutation = useLaboratoryMutation<RegisterResponse, RegisterVariables>({
    action: "generate-register",
    path: "/labs/registers",
    onMutate: () => {
      setSaveState("saving");
      setNotice("");
    },
    onSuccess: (response, variables) => {
      if (isPendingSync(response)) {
        setSaveState("pending_sync");
        setNotice("The register request is pending sync. No report has been generated or downloaded yet.");
        return;
      }
      const definition = registers.find((entry) => entry.type === variables.report_type) ?? registers[0];
      setGenerated({ report: response.report, definition });
      setSaveState("saved");
      setNotice(response.message);
      openRegister(response.report, definition);
    },
    onError: () => setSaveState("failed"),
  });

  const activeType = mutation.isPending ? mutation.variables?.report_type : null;
  const dateRangeError = useMemo(() => {
    if (!dateFrom || !dateTo) return "";
    const parts = (value: string) => value.split("/").reverse().join("-");
    return parts(dateFrom) > parts(dateTo) ? "The start date must be on or before the end date." : "";
  }, [dateFrom, dateTo]);

  function generate(definition: RegisterDefinition) {
    if (dateRangeError) return;
    mutation.mutate({
      report_type: definition.type,
      laboratory: laboratory.trim() || undefined,
      location_filter: locationFilter.trim() || undefined,
      date_from: dateFrom.trim() || undefined,
      date_to: dateTo.trim() || undefined,
    });
  }

  return (
    <div className="space-y-5">
      <LabQuickActions compact />
      {notice ? <div role="status" className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-bold text-blue-950">{notice}</div> : null}
      <SaveState state={saveState} />

      <Panel title="Laboratory Registers and Reports" description="Prepare live school records for preview, PDF printing or CSV download." icon={FileText}>
        <div className="mb-5 grid gap-4 rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4 md:grid-cols-2 xl:grid-cols-4">
          <label className="text-sm font-bold text-[#071D49]">Report Heading<input value={laboratory} onChange={(event) => setLaboratory(event.target.value)} className={`${fieldClass} mt-2`} placeholder="School Laboratory" /><span className="mt-1 block font-normal text-[#64748B]">This appears on the printed register; it does not filter records.</span></label>
          <label className="text-sm font-bold text-[#071D49]">Filter by Storage Location (optional)<input list="laboratory-report-locations" value={locationFilter} onChange={(event) => setLocationFilter(event.target.value)} className={`${fieldClass} mt-2`} placeholder="All laboratory locations" /><datalist id="laboratory-report-locations">{(locationsQuery.data ?? []).map((location) => <option key={location.id} value={location.full_path} />)}</datalist><span className="mt-1 block font-normal text-[#64748B]">Leave blank to include records from every laboratory location.</span></label>
          <label className="text-sm font-bold text-[#071D49]">Start Date (optional)<input inputMode="numeric" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} className={`${fieldClass} mt-2`} placeholder="DD/MM/YYYY" /></label>
          <label className="text-sm font-bold text-[#071D49]">End Date (optional)<input inputMode="numeric" value={dateTo} onChange={(event) => setDateTo(event.target.value)} className={`${fieldClass} mt-2`} placeholder="DD/MM/YYYY" /></label>
          {dateRangeError ? <p role="alert" className="text-sm font-bold text-rose-700 md:col-span-3">{dateRangeError}</p> : null}
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          {registers.map((definition) => (
            <article key={definition.type} className="flex flex-col rounded-xl border border-[#D8E0EC] bg-white p-4">
              <div className="flex items-start gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#EEF5FF] text-[#1D4ED8]"><FileCheck2 className="h-5 w-5" aria-hidden="true" /></span><div><h3 className="font-black text-[#071D49]">{definition.title}</h3><p className="mt-1 text-sm leading-6 text-[#64748B]">{definition.description}</p></div></div>
              <button type="button" disabled={mutation.isPending || Boolean(dateRangeError)} onClick={() => generate(definition)} className="mt-4 min-h-11 rounded-xl border border-blue-300 bg-blue-50 px-4 text-sm font-black text-blue-900 disabled:opacity-50">
                {activeType === definition.type ? "Preparing from Live Records…" : "Generate and Preview"}
              </button>
            </article>
          ))}
        </div>
      </Panel>

      {generated ? (
        <Panel title="Prepared Register" description="The server confirmed and audited this report. You can now preview, print or download it." icon={FileCheck2}>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex min-w-0 items-start gap-3">
                {generated.report.school_logo ? <img src={generated.report.school_logo} alt={`${generated.report.school_name} logo`} className="h-14 w-14 rounded-lg border border-emerald-200 bg-white object-contain p-1" /> : null}
                <div><p className="font-black text-emerald-950">{generated.report.school_name}</p><h3 className="mt-1 text-lg font-black text-[#071D49]">{generated.definition.title}</h3><p className="mt-1 break-all text-sm text-[#334155]">{generated.report.document_number} · {generated.report.rows.length} records</p></div>
              </div>
              <div className="grid gap-2 sm:min-w-48">
                <button type="button" onClick={() => openRegister(generated.report, generated.definition)} className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#0F3F8A] px-4 font-black text-white"><Printer className="h-4 w-4" aria-hidden="true" /> Preview / Print PDF</button>
                <button type="button" onClick={() => downloadRegister(generated.report, generated.definition)} className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-emerald-300 bg-white px-4 font-black text-emerald-900"><Download className="h-4 w-4" aria-hidden="true" /> Download CSV</button>
              </div>
            </div>
            <dl className="mt-4 grid gap-3 border-t border-emerald-200 pt-4 text-sm sm:grid-cols-3"><div><dt className="text-emerald-800">Laboratory</dt><dd className="font-bold text-emerald-950">{generated.report.laboratory}</dd></div><div><dt className="text-emerald-800">Generated Date</dt><dd className="font-bold text-emerald-950">{formatKenyanDate(generated.report.generated_at)}</dd></div><div><dt className="text-emerald-800">Generated By</dt><dd className="break-all font-bold text-emerald-950">{generated.report.generated_by}</dd></div></dl>
          </div>
        </Panel>
      ) : (
        <WorkspaceEmpty title="No register has been prepared in this session" description="Choose a register above. Preview and download actions appear only after MyShule confirms the live report generation." />
      )}
    </div>
  );
}
