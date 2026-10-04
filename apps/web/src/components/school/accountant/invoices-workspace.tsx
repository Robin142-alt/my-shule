"use client";

import { useRef, useState, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { Modal } from "@/components/ui/modal";
import { LearnerPicker } from "@/components/common/learner-picker";
import { usePermissions } from "@/components/providers/permission-context";
import { useSchoolCommandIdentity } from "@/components/school/integrated-school-command-header";
import { useSchoolQuery } from "@/lib/data/school-hooks";
import { useOptionalSchoolTenantId } from "@/lib/data/school-tenant-scope";
import { requestDashboardApi } from "@/lib/dashboard/api-client";
import { formatMinorKes, formatActivityDate, toMinorUnits } from "@/lib/billing/billing-utils";
import { openPrintDocument, downloadTextFile, type CsvReportArtifactResponse } from "@/lib/dashboard/export";
import type { LearnerLookupItem } from "@/lib/students/student-lookup";
import type { SchoolExperienceRole } from "@/lib/experiences/school-data";
import type { StudentFeeBalanceResponse, StudentFeeStatementResponse, FeeStructureResponse, BillableFeeStudentResponse, BulkFeeInvoiceGenerationResponse } from "@/components/school/school-pages";

type Invoice = { id: string; invoice_number: string; description: string; status: string; total_amount_minor: string; amount_paid_minor: string; due_at: string; issued_at: string; metadata: { student_id: string; student_name: string; admission_number?: string } };
const pageSize = 50;

export function InvoicesWorkspace({ tenantSlug, onNavigate }: {
  role: SchoolExperienceRole; tenantSlug?: string | null; routeMode: "hosted" | "public"; activeSection?: string; onNavigate?: (section: string) => void;
}) {
  const tenantId = useOptionalSchoolTenantId();
  const identity = useSchoolCommandIdentity();
  const { hasPermission } = usePermissions();
  const canWrite = hasPermission("billing:write");
  const client = useQueryClient();
  const [tab, setTab] = useState<"invoices" | "balances">("invoices");
  const [offset, setOffset] = useState(0);
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const invoices = useSchoolQuery<Invoice[]>(`/billing/invoices?student_only=true&limit=${pageSize}&offset=${offset}${status ? `&status=${status}` : ""}`, { enabled: tab === "invoices", refetchInterval: 30_000 });
  const balances = useSchoolQuery<StudentFeeBalanceResponse[]>(`/billing/student-balances?limit=${pageSize}&offset=${offset}`, { enabled: tab === "balances", refetchInterval: 30_000 });
  const [dialog, setDialog] = useState<"single" | "bulk" | null>(null);
  const [learner, setLearner] = useState<LearnerLookupItem | null>(null);
  const [structureId, setStructureId] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const structures = useSchoolQuery<FeeStructureResponse[]>("/billing/fee-structures", { enabled: dialog === "bulk" });
  const roster = useSchoolQuery<BillableFeeStudentResponse[]>(structureId ? `/billing/fee-structures/${structureId}/billable-students` : null, { enabled: dialog === "bulk" });
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const submission = useRef<{ key: string; body?: string }>({ key: "" });
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [statementId, setStatementId] = useState<string | null>(null);
  const statement = useSchoolQuery<StudentFeeStatementResponse>(statementId ? `/billing/student-balances/${statementId}/statement` : null);
  const [exporting, setExporting] = useState(false);
  const [documentError, setDocumentError] = useState("");
  const invoiceRows = (Array.isArray(invoices.data) ? invoices.data : []).filter(row => `${row.invoice_number} ${row.metadata.student_name} ${row.metadata.admission_number || ""}`.toLowerCase().includes(search.toLowerCase()));
  const balanceRows = (Array.isArray(balances.data) ? balances.data : []).filter(row => (row.student_name || row.student_id).toLowerCase().includes(search.toLowerCase()));
  const activeQuery = tab === "invoices" ? invoices : balances;
  const structure = structures.data?.find(row => row.id === structureId);

  function openDialog(kind: "single" | "bulk") {
    submission.current = { key: `fee-invoice-${crypto.randomUUID()}` };
    setLearner(null); setStructureId(""); setSelectedIds(new Set()); setError(""); setDialog(kind);
  }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!tenantId || !canWrite || inFlight.current) return;
    const form = new FormData(event.currentTarget);
    const amount = toMinorUnits(String(form.get("amount") || ""));
    const due = String(form.get("due") || "");
    if (dialog === "single" && (!learner || !amount)) { setError("Choose a learner and enter a positive amount with up to two decimal places."); return; }
    const selected = (roster.data ?? []).filter(row => selectedIds.has(row.student_id));
    if (dialog === "bulk" && (!structureId || !selected.length)) { setError("Choose a fee structure and at least one learner."); return; }
    const body = { idempotency_key: submission.current.key, due_at: due ? new Date(`${due}T23:59:59+03:00`).toISOString() : undefined,
      ...(dialog === "single" ? { description: `Fees for ${learner!.name}`, total_amount_minor: amount,
        metadata: { student_id: learner!.id } } : { target_students: selected.map(row => ({ student_id: row.student_id, student_name: row.student_name })) }) };
    const serialized = JSON.stringify(body);
    if (submission.current.body && submission.current.body !== serialized) {
      setError("A submission was already attempted. Retry the same details or check the invoice register before starting a new submission."); return;
    }
    submission.current.body = serialized;
    inFlight.current = true; setBusy(true); setError("");
    try {
      if (dialog === "bulk") {
        const result = await requestDashboardApi<BulkFeeInvoiceGenerationResponse>(`/billing/fee-structures/${structureId}/generate-invoices`, { tenantId, method: "POST", body });
        setNotice(`${result.generated_count} invoices created. ${result.skipped_count} learners already had an invoice for this fee structure and were skipped.`);
      } else {
        const result = await requestDashboardApi<Invoice>("/billing/invoices", { tenantId, method: "POST", body });
        setNotice(`${result.invoice_number} created. The learner’s statement and balance now include this invoice.`);
      }
      setDialog(null); await client.invalidateQueries({ queryKey: ["school", tenantId] });
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Invoices could not be saved. Retry the same submission."); }
    finally { inFlight.current = false; setBusy(false); }
  }
  function viewStatement(id: string) { setDocumentError(""); setStatementId(id); }
  function previewInvoice(row: Invoice) {
    openPrintDocument({ eyebrow: identity.schoolName, logoUrl: identity.logoUrl, title: `Invoice ${row.invoice_number}`,
      subtitle: row.metadata.student_name || row.description, rows: [
        { label: "Admission number", value: row.metadata.admission_number || "See learner record" },
        { label: "Description", value: row.description }, { label: "Issued", value: formatActivityDate(row.issued_at) },
        { label: "Due", value: formatActivityDate(row.due_at) }, { label: "Status", value: row.status },
        { label: "Invoiced", value: formatMinorKes(row.total_amount_minor) }, { label: "Paid", value: formatMinorKes(row.amount_paid_minor) },
        { label: "Generated by", value: identity.userLabel }, { label: "Generated", value: formatActivityDate(new Date().toISOString()) },
      ], footer: "Check the current learner statement for unapplied credits and the full account balance." });
  }
  function previewStatement() {
    if (!statement.data) return;
    const { summary, entries } = statement.data;
    openPrintDocument({ eyebrow: identity.schoolName, logoUrl: identity.logoUrl, title: `Fee statement · ${summary.student_name || "Learner"}`,
      subtitle: `Statement ${summary.student_id} · ${formatActivityDate(new Date().toISOString())}`, rows: [
        { label: "Outstanding balance", value: formatMinorKes(summary.balance_amount_minor) },
        { label: "Unapplied credit", value: formatMinorKes(summary.credit_amount_minor) },
        ...entries.map(row => ({ label: `${formatActivityDate(row.occurred_at)} · ${row.reference} · ${row.status}`,
          value: `Debit ${formatMinorKes(row.debit_amount_minor)} · Credit ${formatMinorKes(row.credit_amount_minor)} · Balance ${formatMinorKes(row.balance_after_minor)}` })),
        { label: "Generated by", value: identity.userLabel },
      ], footer: "Generated from persisted invoices and payment allocations. Pending payments are not cleared fee credits." });
  }
  async function exportStatement() {
    if (!tenantId || !statementId || exporting) return;
    setExporting(true); setDocumentError("");
    try {
      const artifact = await requestDashboardApi<CsvReportArtifactResponse>(`/billing/student-balances/${statementId}/statement/export`, { tenantId });
      downloadTextFile({ filename: artifact.filename, content: artifact.csv, mimeType: artifact.content_type });
    } catch (cause) { setDocumentError(cause instanceof Error ? cause.message : "Statement export failed. Retry."); }
    finally { setExporting(false); }
  }
  return <div className="space-y-4">
    <section className="rounded-xl border border-border bg-surface p-5">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="text-lg font-semibold">Invoices & statements</h3><p className="mt-1 text-sm text-muted">Bill a learner or a class, then follow each account from invoice to cleared payment.</p></div>
        <div className="flex flex-wrap gap-2"><Button variant="secondary" disabled={!canWrite} onClick={() => openDialog("bulk")}>Bill a class</Button><Button disabled={!canWrite} onClick={() => openDialog("single")}>Create invoice</Button></div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">{(["invoices", "balances"] as const).map(value => <Button key={value} variant={tab === value ? "primary" : "ghost"} aria-pressed={tab === value} onClick={() => { setTab(value); setOffset(0); setSearch(""); }}>{value === "invoices" ? "Invoice register" : "Learner balances"}</Button>)}
        {onNavigate && <Button variant="ghost" onClick={() => onNavigate("fee-structures")}>Manage fee structures</Button>}
        <Button variant="ghost" disabled={activeQuery.isFetching} onClick={() => void activeQuery.refetch()}>Refresh</Button>
      </div>
    </section>
    {notice && <p role="status" className="rounded-lg bg-success-soft p-3 text-sm">{notice}</p>}
    {activeQuery.error && <p role="alert" className="rounded-lg bg-danger-soft p-3">{activeQuery.error.message} Use Refresh to retry.</p>}
    <div className="flex flex-col gap-3 sm:flex-row"><label className="flex-1 text-sm">Search this page<input type="search" className="input-base mt-1 w-full" value={search} onChange={e => setSearch(e.target.value)} placeholder="Learner or invoice number" /></label>
      {tab === "invoices" && <label className="text-sm">Invoice status<select className="input-base mt-1 w-full" value={status} onChange={e => { setStatus(e.target.value); setOffset(0); }}><option value="">All statuses</option>{["open", "pending_payment", "paid", "void", "uncollectible", "draft"].map(value => <option key={value} value={value}>{value.replaceAll("_", " ")}</option>)}</select></label>}
    </div>
    {tab === "invoices" ? <DataTable title="Invoice register" rows={invoiceRows} getRowKey={row => row.id} emptyMessage={invoices.isLoading ? "Loading invoices…" : invoices.error ? "Invoice records unavailable. Retry above." : "No matching invoices. Create an invoice or bill a class to start."} columns={[
      { id: "invoice", header: "Invoice / learner", render: row => <div><p className="font-semibold">{row.invoice_number}</p><p className="text-muted">{row.metadata.student_name || row.description}</p></div> },
      { id: "total", header: "Invoiced", render: row => formatMinorKes(row.total_amount_minor) },
      { id: "paid", header: "Paid", render: row => formatMinorKes(row.amount_paid_minor) },
      { id: "status", header: "Status", render: row => row.status.replaceAll("_", " ") },
      { id: "due", header: "Due", render: row => formatActivityDate(row.due_at) },
      { id: "actions", header: "Actions", render: row => <div className="flex flex-wrap gap-2"><Button size="sm" variant="secondary" onClick={() => previewInvoice(row)}>Preview / print</Button><Button size="sm" variant="ghost" onClick={() => viewStatement(row.metadata.student_id)}>Statement</Button></div> },
    ]} /> : <DataTable title="Learner balances" rows={balanceRows} getRowKey={row => row.student_id} emptyMessage={balances.isLoading ? "Loading balances…" : balances.error ? "Balance records unavailable. Retry above." : "No matching learner accounts. Create a learner invoice to start."} columns={[
      { id: "student", header: "Learner", render: row => row.student_name || "Learner account" },
      { id: "invoiced", header: "Invoiced", render: row => formatMinorKes(row.invoiced_amount_minor) },
      { id: "paid", header: "Paid", render: row => formatMinorKes(row.paid_amount_minor) },
      { id: "credit", header: "Credit", render: row => formatMinorKes(row.credit_amount_minor) },
      { id: "balance", header: "Balance", render: row => <strong className="tabular-nums">{formatMinorKes(row.balance_amount_minor)}</strong> },
      { id: "actions", header: "Actions", render: row => <Button size="sm" variant="secondary" onClick={() => viewStatement(row.student_id)}>View statement</Button> },
    ]} />}
    <div className="flex flex-wrap items-center justify-end gap-3 text-sm"><span>Page {offset / pageSize + 1}</span><Button variant="secondary" disabled={!offset || activeQuery.isFetching} onClick={() => setOffset(offset - pageSize)}>Previous page</Button><Button variant="secondary" disabled={(activeQuery.data?.length ?? 0) < pageSize || activeQuery.isFetching} onClick={() => setOffset(offset + pageSize)}>Next page</Button></div>
    <Modal open={Boolean(dialog)} title={dialog === "bulk" ? "Bill a class" : "Create learner invoice"} onClose={() => { if (!busy) setDialog(null); }}
      footer={<><Button type="button" variant="secondary" disabled={busy} onClick={() => setDialog(null)}>Cancel</Button><Button form="learner-invoice-form" type="submit" disabled={busy || !canWrite || (dialog === "bulk" && (!selectedIds.size || roster.isFetching))}>{busy ? "Creating invoices…" : dialog === "bulk" ? `Create ${selectedIds.size} invoices` : "Create invoice"}</Button></>}>
      <form id="learner-invoice-form" onSubmit={save} className="space-y-4"><fieldset disabled={busy} className="space-y-4">
        {error && <p role="alert" className="rounded-lg bg-danger-soft p-3 text-sm">{error}</p>}
        {dialog === "single" ? <><LearnerPicker label="Learner name or admission number" tenantSlug={tenantSlug || ""} value={learner} onChange={setLearner} /><label className="block">Amount (KES)<input required name="amount" inputMode="decimal" className="input-base mt-1 w-full" /></label></> : <>
          <label className="block">Fee structure<select required className="input-base mt-1 w-full" value={structureId} onChange={e => { setStructureId(e.target.value); setSelectedIds(new Set()); }}><option value="">Choose a fee structure</option>{structures.data?.filter(row => row.status === "active").map(row => <option key={row.id} value={row.id}>{row.name} · {formatMinorKes(row.total_amount_minor)}</option>)}</select></label>
          {structures.isLoading && <p role="status">Loading fee structures…</p>}
          {structures.error && <p role="alert">{structures.error.message} <Button type="button" variant="ghost" onClick={() => void structures.refetch()}>Retry fee structures</Button></p>}
          {!structures.isLoading && !structures.error && !structures.data?.some(row => row.status === "active") && <p>No active fee structure. Create one in Fee structures before billing a class.</p>}
          {roster.isLoading && <p role="status">Loading class roster…</p>}
          {roster.error && <p role="alert">{roster.error.message} <Button type="button" variant="ghost" onClick={() => void roster.refetch()}>Retry roster</Button></p>}
          {structureId && !roster.isLoading && !roster.error && !roster.data?.length && <p>No eligible learners match this structure. Check the grade and class on the fee structure.</p>}
          {!!roster.data?.length && <><div className="flex flex-wrap items-center justify-between gap-2"><span>{selectedIds.size} of {roster.data.length} selected</span><Button type="button" variant="ghost" onClick={() => setSelectedIds(selectedIds.size === roster.data!.length ? new Set() : new Set(roster.data!.map(row => row.student_id)))}>{selectedIds.size === roster.data.length ? "Clear selection" : "Select all"}</Button></div>
            <div className="max-h-64 overflow-y-auto rounded-lg border border-border">{roster.data.map(row => <label key={row.student_id} className="flex min-h-11 cursor-pointer items-center gap-3 border-b border-border px-3 py-2 last:border-0"><input type="checkbox" checked={selectedIds.has(row.student_id)} onChange={() => setSelectedIds(current => { const next = new Set(current); if (next.has(row.student_id)) next.delete(row.student_id); else next.add(row.student_id); return next; })} /><span>{row.student_name}<span className="ml-2 text-muted">{row.admission_number}</span></span></label>)}</div>
            {structure && <p className="text-sm">Maximum to issue: <strong>{formatMinorKes((BigInt(structure.total_amount_minor) * BigInt(selectedIds.size)).toString())}</strong>. Existing invoices for this structure are skipped.</p>}</>}
        </>}
        <label className="block">Due date (optional)<input name="due" type="date" className="input-base mt-1 w-full" /></label>
      </fieldset></form>
    </Modal>
    <Modal open={Boolean(statementId)} title={statement.data ? `${statement.data.summary.student_name || "Learner"} · fee statement` : "Fee statement"} onClose={() => setStatementId(null)}>
      <div className="space-y-4">{statement.isLoading && <p role="status">Loading statement…</p>}{statement.error && <p role="alert">{statement.error.message} <Button onClick={() => void statement.refetch()}>Retry statement</Button></p>}
        {documentError && <p role="alert">{documentError}</p>}
        {statement.data && <><div className="flex flex-wrap items-center justify-between gap-3"><p>Balance <strong>{formatMinorKes(statement.data.summary.balance_amount_minor)}</strong> · Credit {formatMinorKes(statement.data.summary.credit_amount_minor)}</p><div className="flex gap-2"><Button variant="secondary" onClick={previewStatement}>Preview / print</Button><Button disabled={exporting} onClick={() => void exportStatement()}>{exporting ? "Preparing…" : "Download CSV"}</Button></div></div>
          <DataTable title="Account activity" rows={statement.data.entries} getRowKey={row => row.id} emptyMessage="No account activity yet." columns={[
            { id: "reference", header: "Reference / date", render: row => <div>{row.reference}<p className="text-muted">{formatActivityDate(row.occurred_at)}</p></div> },
            { id: "status", header: "Status", render: row => row.status },
            { id: "debit", header: "Debit", render: row => formatMinorKes(row.debit_amount_minor) },
            { id: "credit", header: "Credit", render: row => formatMinorKes(row.credit_amount_minor) },
            { id: "balance", header: "Balance", render: row => formatMinorKes(row.balance_after_minor) },
          ]} /></>}
      </div>
    </Modal>
  </div>;
}
