"use client";

import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { usePermissions } from "@/components/providers/permission-context";
import { useSchoolQuery } from "@/lib/data/school-hooks";
import { useOptionalSchoolTenantId } from "@/lib/data/school-tenant-scope";
import { requestDashboardApi } from "@/lib/dashboard/api-client";
import { formatMinorKes } from "@/lib/billing/billing-utils";

type LegacyInvoice = {
  legacy_id: string; invoice_number: string; student_name: string; amount_minor: string;
  paid_minor: string; balance_minor: string; fingerprint: string;
  status: "ready" | "adopted" | "exception"; message: string;
};
type Preview = { items: LegacyInvoice[]; has_more: boolean };

export function LegacyInvoicesReview({ principal = false }: { principal?: boolean }) {
  const tenantId = useOptionalSchoolTenantId();
  const { hasPermission } = usePermissions();
  const client = useQueryClient();
  const [open, setOpen] = useState(false);
  const [offset, setOffset] = useState(0);
  const [selected, setSelected] = useState<string[]>([]);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const canAdopt = principal && hasPermission("billing:write");
  const preview = useSchoolQuery<Preview>(open ? `/billing/legacy-invoices?limit=50&offset=${offset}` : null);
  const rows = preview.data?.items ?? [];
  const chosen = rows.filter(row => selected.includes(row.legacy_id) && row.status === "ready");
  const blocked = busy || preview.isFetching;
  function refresh() { setSelected([]); void preview.refetch(); }
  function page(next: number) { setSelected([]); setOffset(next); }
  async function adopt() {
    if (!tenantId || !canAdopt || !chosen.length || reason.trim().length < 10 || inFlight.current || preview.isFetching) return;
    inFlight.current = true; setBusy(true); setError(""); setNotice("");
    try {
      const result = await requestDashboardApi<{ adopted: number }>("/billing/legacy-invoices/adopt", {
        tenantId, method: "POST", body: { invoices: chosen.map(row => ({ legacy_id: row.legacy_id, fingerprint: row.fingerprint })), reason: reason.trim() },
      });
      setNotice(`${result.adopted} historical invoices adopted. Original totals and paid balances are preserved.`);
      setSelected([]); setReason("");
      await client.invalidateQueries({ queryKey: ["school", tenantId] });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Historical invoices could not be adopted. Refresh and review the balances before retrying.");
    } finally { inFlight.current = false; setBusy(false); }
  }
  return <>
    <Button variant="secondary" disabled={!hasPermission("billing:read")} onClick={() => { setOpen(true); setError(""); }}>Historical invoices</Button>
    <Modal open={open} size="xl" mobileFullScreen title="Review historical invoices" onClose={() => { if (!busy) setOpen(false); }}
      footer={<><Button variant="secondary" disabled={busy} onClick={() => setOpen(false)}>Close</Button>
        {canAdopt && <Button disabled={blocked || !chosen.length || reason.trim().length < 10} onClick={() => void adopt()}>{busy ? "Adopting…" : `Confirm adoption (${chosen.length})`}</Button>}</>}>
      <div className="space-y-4">
        <p className="text-sm text-muted">Move reviewed historical invoices into the current register. Original records remain available, and historical payments are not recorded again.</p>
        {!principal && <p className="text-sm">The Principal can approve adoption from Fees → Historical invoices after reviewing these balances.</p>}
        {notice && <p role="status" className="rounded-lg bg-success-soft p-3 text-sm">{notice}</p>}
        {(error || preview.error) && <p role="alert" className="rounded-lg bg-danger-soft p-3 text-sm">{error || preview.error?.message} Use Refresh to load a current preview.</p>}
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="ghost" disabled={blocked} onClick={refresh}>Refresh preview</Button>
          {canAdopt && <Button variant="ghost" disabled={blocked || !rows.some(row => row.status === "ready")} onClick={() => setSelected(rows.filter(row => row.status === "ready").map(row => row.legacy_id))}>Select ready invoices</Button>}
          <span className="text-sm text-muted">Page {offset / 50 + 1}</span>
        </div>
        {preview.isLoading && <p role="status">Loading historical invoices…</p>}
        {!preview.isLoading && !preview.error && !rows.length && <p className="rounded-lg border border-border p-4 text-sm">No historical invoices to review. Continue billing through the invoice register.</p>}
        <div className="grid gap-3 md:grid-cols-2">{rows.map(row => <article key={row.legacy_id} className="min-w-0 rounded-xl border border-border p-4">
          <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="break-words font-semibold">{row.invoice_number}</p><p className="text-sm text-muted">{row.student_name || "Learner requires review"}</p></div>
            {canAdopt && <input type="checkbox" className="h-5 w-5 shrink-0" aria-label={`Select ${row.invoice_number}`} disabled={blocked || row.status !== "ready"} checked={selected.includes(row.legacy_id)} onChange={event => setSelected(current => event.target.checked ? [...current, row.legacy_id] : current.filter(id => id !== row.legacy_id))} />}</div>
          <dl className="mt-3 grid grid-cols-3 gap-2 text-sm"><div><dt className="text-muted">Total</dt><dd className="break-words font-medium">{formatMinorKes(row.amount_minor)}</dd></div><div><dt className="text-muted">Paid</dt><dd className="break-words font-medium">{formatMinorKes(row.paid_minor)}</dd></div><div><dt className="text-muted">Balance</dt><dd className="break-words font-medium">{formatMinorKes(row.balance_minor)}</dd></div></dl>
          <p className="mt-3 text-sm font-medium">{row.status === "ready" ? "Ready for review" : row.status === "adopted" ? "Adopted" : "Needs attention"}</p><p className="mt-1 text-sm text-muted">{row.message}</p>
        </article>)}</div>
        <div className="flex justify-end gap-2"><Button variant="secondary" disabled={!offset || blocked} onClick={() => page(offset - 50)}>Previous page</Button><Button variant="secondary" disabled={!preview.data?.has_more || blocked} onClick={() => page(offset + 50)}>Next page</Button></div>
        {canAdopt && <label className="block text-sm">Review notes<textarea className="input-base mt-1 w-full" value={reason} disabled={busy} maxLength={1000} placeholder="Explain how the original totals and paid balances were checked" onChange={event => setReason(event.target.value)} /></label>}
      </div>
    </Modal>
  </>;
}
