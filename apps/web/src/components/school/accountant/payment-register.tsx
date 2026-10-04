"use client";

import { useRef, useState, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { DataTable } from "@/components/ui/data-table";
import { LearnerPicker } from "@/components/common/learner-picker";
import { usePermissions } from "@/components/providers/permission-context";
import { useSchoolCommandIdentity } from "@/components/school/integrated-school-command-header";
import { useSchoolQuery } from "@/lib/data/school-hooks";
import { useOptionalSchoolTenantId } from "@/lib/data/school-tenant-scope";
import { requestDashboardApi } from "@/lib/dashboard/api-client";
import { formatMinorKes, formatActivityDate, toMinorUnits } from "@/lib/billing/billing-utils";
import { openPrintDocument, downloadCsvFile } from "@/lib/dashboard/export";
import type { LearnerLookupItem } from "@/lib/students/student-lookup";
import { ManualReversalQueue } from "./manual-reversal-queue";

type Receipt = {
  id: string; receipt_number: string; payment_method: string; status: string;
  student_id: string | null; student_name: string | null; admission_number: string | null;
  amount_minor: string; payer_name: string | null; received_at: string;
  external_reference: string | null; deposit_reference: string | null;
  metadata?: { source?: string };
};
type ChequeAction = { receipt: Receipt; action: "deposit" | "clear" | "bounce" };
const methodNames: Record<string, string> = { cash: "Cash", cheque: "Cheque", mpesa_c2b: "M-Pesa", eft: "Bank transfer", bank_deposit: "Bank" };

export function PaymentRegister({ tenantSlug, receiptsOnly = false, onNavigate }: {
  tenantSlug?: string | null; receiptsOnly?: boolean; onNavigate?: (section: string) => void;
}) {
  const tenantId = useOptionalSchoolTenantId();
  const identity = useSchoolCommandIdentity();
  const { hasPermission } = usePermissions();
  const canWrite = hasPermission("billing:write");
  const client = useQueryClient();
  const [offset, setOffset] = useState(0);
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const query = useSchoolQuery<Receipt[]>(`/billing/manual-fee-payments?limit=50&offset=${offset}${status ? `&status=${status}` : ""}`, { refetchInterval: 30_000 });
  const [open, setOpen] = useState(false);
  const [method, setMethod] = useState("cash");
  const [learner, setLearner] = useState<LearnerLookupItem | null>(null);
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const submission = useRef<{ key: string; body?: Record<string, unknown> }>({ key: "" });
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [cheque, setCheque] = useState<ChequeAction | null>(null);
  const [reversal, setReversal] = useState<Receipt | null>(null);
  const rows = (Array.isArray(query.data) ? query.data : []).filter(row => [row.receipt_number, row.student_name, row.admission_number, row.payer_name, row.external_reference]
    .some(value => value?.toLowerCase().includes(search.trim().toLowerCase())));

  function record() {
    submission.current = { key: `finance-receipt-${crypto.randomUUID()}` };
    setLearner(null); setMethod("cash"); setError(""); setNotice(""); setOpen(true);
  }
  async function refreshFinance() {
    await client.invalidateQueries({ queryKey: ["school", tenantId] });
  }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current || !tenantId || !canWrite) return;
    const form = new FormData(event.currentTarget);
    const amount = toMinorUnits(String(form.get("amount")));
    if (!amount || !learner) { setError("Choose a learner and enter a positive amount with at most two decimal places."); return; }
    const body = {
      idempotency_key: submission.current.key, payment_method: method, amount_minor: amount, student_id: learner.id,
      payer_name: String(form.get("payer") ?? "").trim() || undefined,
      ...(method === "cheque" ? { cheque_number: String(form.get("cheque")), drawer_bank: String(form.get("bank")) } : {}),
      notes: String(form.get("notes") ?? "").trim() || undefined,
      metadata: { source_dashboard: "accountant-payments", student_name: learner.name },
    };
    // Freeze the first attempted command: an uncertain network result may already have committed.
    if (submission.current.body && JSON.stringify(submission.current.body) !== JSON.stringify(body)) {
      setError("This payment was already submitted. Retry the original details, or check the register before starting a new receipt."); return;
    }
    submission.current.body = body;
    inFlight.current = true; setBusy(true); setError("");
    try {
      const saved = await requestDashboardApi<Receipt>("/billing/manual-fee-payments", { tenantId, method: "POST", body });
      setOpen(false);
      setNotice(saved.status === "cleared" ? `${saved.receipt_number} posted. The learner’s account is updated.` : `${saved.receipt_number} saved. The cheque will affect fees only after clearing.`);
      await refreshFinance();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Receipt could not be saved. Retry the same details."); }
    finally { inFlight.current = false; setBusy(false); }
  }
  async function updateCheque(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!cheque || !tenantId || inFlight.current || !canWrite) return;
    const form = new FormData(event.currentTarget);
    inFlight.current = true; setBusy(true); setError("");
    try {
      const saved = await requestDashboardApi<Receipt>(`/billing/manual-fee-payments/${cheque.receipt.id}/${cheque.action}`, {
        tenantId, method: "POST", body: { notes: String(form.get("notes")), deposit_reference: String(form.get("reference") || "") || undefined },
      });
      setCheque(null); setNotice(`${saved.receipt_number} is now ${saved.status}.`); await refreshFinance();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "The cheque could not be updated."); }
    finally { inFlight.current = false; setBusy(false); }
  }
  async function requestReversal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!reversal || !tenantId || inFlight.current || !canWrite) return;
    const notes = String(new FormData(event.currentTarget).get("reason") || "").trim();
    inFlight.current = true; setBusy(true); setError("");
    try {
      const result = await requestDashboardApi<{ message: string }>(`/billing/manual-fee-payments/${reversal.id}/reversal-requests`, { tenantId, method: "POST", body: { notes } });
      setNotice(result.message); setReversal(null); await refreshFinance();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "The reversal request failed. Retry."); }
    finally { inFlight.current = false; setBusy(false); }
  }
  function preview(row: Receipt) {
    openPrintDocument({
      eyebrow: identity.schoolName, logoUrl: identity.logoUrl, title: `Receipt ${row.receipt_number}`,
      subtitle: row.status === "cleared" ? "Cleared school fee payment" : `Payment acknowledgement · ${row.status}`,
      rows: [
        { label: "Learner", value: row.student_name || "See learner fee account" },
        { label: "Admission number", value: row.admission_number || "Not recorded" },
        { label: "Amount", value: formatMinorKes(row.amount_minor) },
        { label: "Method", value: methodNames[row.payment_method] ?? row.payment_method },
        { label: "Received", value: formatActivityDate(row.received_at) },
        { label: "Payer", value: row.payer_name || "Not recorded" },
        { label: "Provider / bank reference", value: row.external_reference || row.deposit_reference || "Not applicable" },
        { label: "Status", value: row.status },
        { label: "Generated by", value: identity.userLabel },
        { label: "Generated", value: new Date().toLocaleString("en-KE", { timeZone: "Africa/Nairobi" }) },
      ],
      footer: row.status === "cleared" ? "Generated from the school’s persisted fee receipt." : "This acknowledgement does not confirm cleared funds. Refer to the current student statement for the balance.",
    });
  }
  return <div className="space-y-4">
    <section className="rounded-xl border border-border bg-surface p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><h3 className="text-lg font-semibold">{receiptsOnly ? "Receipt register" : "Payments & cheque clearing"}</h3>
          <p className="mt-1 max-w-2xl text-sm text-muted">Verified M-Pesa and bank collections appear automatically. Record cash received at school and track cheques until cleared.</p></div>
        <Button disabled={!canWrite} onClick={record}>Record {receiptsOnly ? "manual receipt" : "cash or cheque"}</Button>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {onNavigate && <><Button variant="secondary" onClick={() => onNavigate("collections")}>Bank / M-Pesa exceptions</Button><Button variant="ghost" onClick={() => onNavigate("invoices")}>Create invoice or view statement</Button></>}
        <Button variant="secondary" disabled={query.isFetching} onClick={() => void query.refetch()}>Refresh receipts</Button>
        <Button variant="ghost" disabled={!rows.length} onClick={() => downloadCsvFile({
          filename: "fee-receipts.csv", headers: ["Receipt", "Learner", "Amount (KES)", "Method", "Status", "Received"],
          rows: rows.map(row => [row.receipt_number, row.student_name || "", formatMinorKes(row.amount_minor), row.payment_method, row.status, row.received_at]),
        })}>Download this page</Button>
      </div>
    </section>
    {notice && <p role="status" className="rounded-lg bg-success-soft p-3 text-sm">{notice}</p>}
    {query.error && <p role="alert" className="rounded-lg bg-danger-soft p-3">{query.error.message} Use Refresh receipts to retry.</p>}
    <div className="flex flex-col gap-3 sm:flex-row">
      <label className="flex-1 text-sm">Search this page<input className="input-base mt-1 w-full" type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Learner, admission number or receipt" /></label>
      <label className="text-sm">Receipt status<select className="input-base mt-1 w-full" value={status} onChange={e => { setStatus(e.target.value); setOffset(0); }}>
        <option value="">All statuses</option>{["received", "deposited", "cleared", "bounced", "reversed"].map(s => <option key={s} value={s}>{s === "received" ? "Awaiting clearance" : s}</option>)}
      </select></label>
    </div>
    <DataTable title={receiptsOnly ? "Receipts" : "Payment history"} rows={rows} getRowKey={row => row.id}
      emptyMessage={query.isLoading ? "Loading receipts…" : query.error ? "Receipt records are unavailable. Retry above." : "No matching receipts. Record cash or a cheque, or check your collection channels."}
      columns={[
        { id: "receipt", header: "Receipt / learner", render: row => <div><p className="font-semibold">{row.receipt_number}</p><p className="mt-1 text-muted">{row.student_name || "Learner fee account"} {row.admission_number && `· ${row.admission_number}`}</p></div> },
        { id: "amount", header: "Amount", render: row => <span className="font-semibold tabular-nums">{formatMinorKes(row.amount_minor)}</span> },
        { id: "method", header: "Method", render: row => methodNames[row.payment_method] ?? row.payment_method },
        { id: "status", header: "Status", render: row => <span className="capitalize">{row.status}</span> },
        { id: "date", header: "Received", render: row => formatActivityDate(row.received_at) },
        { id: "actions", header: "Actions", render: row => <div className="flex flex-wrap gap-2"><Button size="sm" variant="secondary" onClick={() => preview(row)}>Preview / print</Button>
          {canWrite && row.status === "cleared" && row.metadata?.source !== "stk_payment" && <Button size="sm" variant="ghost" onClick={() => { setError(""); if (row.metadata?.source === "collection_payment" && onNavigate) onNavigate("collections"); else setReversal(row); }}>Request reversal</Button>}
          {row.metadata?.source === "stk_payment" && <span className="text-xs text-muted">Legacy STK receipt. Contact the school finance administrator for reversal review.</span>}
          {!receiptsOnly && canWrite && row.payment_method === "cheque" && ["received", "deposited"].includes(row.status) && (row.status === "received" ? ["deposit", "clear", "bounce"] as const : ["clear", "bounce"] as const).map(action =>
            <Button key={action} size="sm" variant="ghost" onClick={() => { setError(""); setCheque({ receipt: row, action }); }}>{action === "clear" ? "Confirm cleared" : action === "bounce" ? "Mark bounced" : "Mark deposited"}</Button>)}
        </div> },
      ]} />
    <div className="flex flex-wrap items-center justify-end gap-3 text-sm"><span>Page {offset / 50 + 1}</span>
      <Button variant="secondary" disabled={!offset || query.isFetching} onClick={() => setOffset(offset - 50)}>Previous page</Button>
      <Button variant="secondary" disabled={(query.data?.length ?? 0) < 50 || query.isFetching} onClick={() => setOffset(offset + 50)}>Next page</Button></div>
    <ManualReversalQueue />
    <Modal open={Boolean(reversal)} title={`Request reversal · ${reversal?.receipt_number || ""}`} onClose={() => { if (!busy) setReversal(null); }}>
      <form onSubmit={requestReversal} className="space-y-4"><p>A different Principal must approve. This request does not change the learner’s balance.</p>{error && <p role="alert">{error}</p>}
        <label className="block">Reason<textarea name="reason" required minLength={5} maxLength={512} className="input-base mt-1 w-full" /></label>
        <div className="flex justify-end gap-2"><Button type="button" variant="secondary" disabled={busy} onClick={() => setReversal(null)}>Cancel</Button><Button type="submit" disabled={busy}>{busy ? "Submitting…" : "Request approval"}</Button></div>
      </form>
    </Modal>
    <Modal open={open} title="Record cash or cheque" onClose={() => { if (!busy) setOpen(false); }}
      footer={<><Button type="button" variant="secondary" disabled={busy} onClick={() => setOpen(false)}>Cancel</Button><Button form="finance-receipt-form" type="submit" disabled={busy || !learner || !canWrite}>{busy ? "Saving…" : "Save receipt"}</Button></>}>
      <form id="finance-receipt-form" onSubmit={save} className="space-y-4">
        {error && <p role="alert" className="text-danger">{error}</p>}
        <LearnerPicker label="Learner name or admission number" tenantSlug={tenantSlug ?? ""} value={learner} onChange={setLearner} />
        <div className="grid gap-4 sm:grid-cols-2"><label>Method<select className="input-base mt-1 w-full" value={method} onChange={e => setMethod(e.target.value)}><option value="cash">Cash</option><option value="cheque">Cheque</option></select></label>
          <label>Amount (KES)<input name="amount" required inputMode="decimal" className="input-base mt-1 w-full" /></label></div>
        <label className="block">Payer name<input name="payer" maxLength={96} className="input-base mt-1 w-full" /></label>
        {method === "cheque" && <div className="grid gap-4 sm:grid-cols-2"><label>Cheque number<input name="cheque" required minLength={2} maxLength={48} className="input-base mt-1 w-full" /></label><label>Drawer bank<input name="bank" required minLength={2} maxLength={96} className="input-base mt-1 w-full" /></label></div>}
        <label className="block">Notes (optional)<textarea name="notes" maxLength={512} className="input-base mt-1 w-full" /></label>
        <p className="text-sm text-muted">{method === "cash" ? "Cash posts to the learner’s outstanding invoices, with any remainder held as credit." : "The cheque is recorded now. Fees update only when clearing is confirmed."}</p>
      </form>
    </Modal>
    <Modal open={Boolean(cheque)} title={`${cheque?.receipt.receipt_number ?? "Cheque"} · ${cheque?.action ?? ""}`} onClose={() => { if (!busy) setCheque(null); }}>
      <form onSubmit={updateCheque} className="space-y-4">
        {error && <p role="alert" className="text-danger">{error}</p>}
        <p className="text-sm">{cheque?.action === "clear" ? "Confirm the bank has cleared this cheque. This will update the learner’s fees." : "Record the bank’s confirmation and keep the reference for audit."}</p>
        <label className="block">Bank reference<input name="reference" required maxLength={96} className="input-base mt-1 w-full" /></label>
        <label className="block">Decision notes<textarea name="notes" required minLength={5} maxLength={512} className="input-base mt-1 w-full" /></label>
        <Button type="submit" disabled={busy}>{busy ? "Saving…" : "Confirm cheque status"}</Button>
      </form>
    </Modal>
  </div>;
}
