"use client";

import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { Modal } from "@/components/ui/modal";
import { StatusPill } from "@/components/ui/status-pill";
import { usePermissions } from "@/components/providers/permission-context";
import { useSchoolQuery } from "@/lib/data/school-hooks";
import { useOptionalSchoolTenantId } from "@/lib/data/school-tenant-scope";
import { requestDashboardApi } from "@/lib/dashboard/api-client";
import { formatMinorKes } from "@/lib/billing/billing-utils";
import type { SchoolExperienceRole } from "@/lib/experiences/school-data";
import type { FeeStructureResponse } from "@/components/school/school-pages";
import { BulkFeeBillingDialog } from "./bulk-fee-billing-dialog";
import { FeeStructureForm } from "./fee-structure-form";

export function FeeStructuresWorkspace({ onNavigate }: {
  role: SchoolExperienceRole; tenantSlug?: string | null; routeMode: "hosted" | "public";
  activeSection?: string; onNavigate?: (section: string) => void;
}) {
  const tenantId = useOptionalSchoolTenantId();
  const { hasPermission } = usePermissions();
  const canWrite = hasPermission("billing:write");
  const client = useQueryClient();
  const query = useSchoolQuery<FeeStructureResponse[]>("/billing/fee-structures");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("active");
  const [creating, setCreating] = useState(false);
  const [billing, setBilling] = useState<string | null>(null);
  const [detail, setDetail] = useState<FeeStructureResponse | null>(null);
  const [archive, setArchive] = useState<FeeStructureResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [savedId, setSavedId] = useState<string | null>(null);
  const rows = (query.data ?? []).filter(row => (!status || row.status === status) && `${row.name} ${row.academic_year} ${row.term} ${(row.grade_levels ?? [row.grade_level]).join(" ")} ${row.class_name || ""}`.toLowerCase().includes(search.toLowerCase()));

  async function archivePlan() {
    if (!tenantId || !archive || !canWrite || inFlight.current) return;
    inFlight.current = true; setBusy(true); setError("");
    try {
      await requestDashboardApi(`/billing/fee-structures/${archive.id}/archive`, { tenantId, method: "POST", body: {} });
      setNotice(`${archive.name} archived. Existing invoices and payments remain on learner accounts.`);
      setSavedId(null); setArchive(null);
      await client.invalidateQueries({ queryKey: ["school", tenantId] });
    } catch (cause) { setError(cause instanceof Error ? cause.message : "The fee structure could not be archived. Please retry."); }
    finally { inFlight.current = false; setBusy(false); }
  }
  return <div className="space-y-4">
    <section className="rounded-xl border border-border bg-surface p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-lg font-semibold">Fee structures</h2><p className="mt-1 max-w-2xl text-sm text-muted">Set charges for the term, then assign them to grades, classes or individual learners.</p></div><Button disabled={!canWrite} onClick={() => setCreating(true)}>Create fee structure</Button></div>
      <ol className="mt-4 grid gap-2 text-sm sm:grid-cols-3"><li className="rounded-lg bg-surface-strong p-3">1. Set the charges</li><li className="rounded-lg bg-surface-strong p-3">2. Choose learners</li><li className="rounded-lg bg-surface-strong p-3">3. Review and issue invoices</li></ol>
      {onNavigate && <Button variant="ghost" className="mt-3" onClick={() => onNavigate("invoices")}>Open invoices & statements</Button>}
    </section>
    {notice && <div role="status" className="rounded-lg bg-success-soft p-3 text-sm"><p>{notice}</p>{savedId && <Button className="mt-2" disabled={!canWrite} onClick={() => setBilling(savedId)}>Choose learners to bill</Button>}</div>}
    {query.error && <p role="alert" className="rounded-lg bg-danger-soft p-3 text-sm">{query.error.message} <Button variant="secondary" disabled={query.isFetching} onClick={() => void query.refetch()}>Retry fee structures</Button></p>}
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end"><label className="flex-1 text-sm">Search fee structures<input type="search" value={search} onChange={event => setSearch(event.target.value)} className="input-base mt-1 w-full" placeholder="Fee name, grade, term or year" /></label><label className="text-sm">Status<select value={status} onChange={event => setStatus(event.target.value)} className="input-base mt-1 w-full"><option value="active">Active</option><option value="">All statuses</option><option value="draft">Draft</option><option value="archived">Archived</option></select></label><Button variant="secondary" disabled={query.isFetching} onClick={() => void query.refetch()}>Refresh</Button></div>
    <DataTable title="School fee plans" rows={rows} getRowKey={row => row.id}
      emptyMessage={query.isLoading ? "Loading fee structures…" : query.error ? "Fee structures are unavailable. Retry above." : "No matching fee structures. Create a fee structure to start, or change the search and status filters."}
      columns={[
        { id: "name", header: "Fee plan", render: row => <div><p className="font-semibold">{row.name}</p><p className="text-xs text-muted">{row.academic_year} · {row.term}</p></div> },
        { id: "scope", header: "Eligible learners", render: row => `${(row.grade_levels ?? [row.grade_level]).join(", ")}${row.class_name ? ` · ${row.class_name}` : " · all streams"}` },
        { id: "amount", header: "Per learner", render: row => <strong className="tabular-nums">{formatMinorKes(row.total_amount_minor)}</strong> },
        { id: "status", header: "Status", render: row => <StatusPill label={row.status} tone={row.status === "active" ? "ok" : "warning"} /> },
        { id: "actions", header: "Actions", render: row => <div className="flex flex-wrap gap-2">{row.status === "active" && <Button size="sm" disabled={!canWrite} onClick={() => setBilling(row.id)}>Bill learners</Button>}<Button variant="secondary" size="sm" onClick={() => setDetail(row)}>View charges</Button>{row.status !== "archived" && <Button variant="ghost" size="sm" disabled={!canWrite} onClick={() => { setError(""); setArchive(row); }}>Archive</Button>}</div> },
      ]} />
    {creating && <FeeStructureForm onClose={() => setCreating(false)} onSaved={row => { setCreating(false); setSavedId(row.id); setStatus("active"); setSearch(""); setNotice(`${row.name} saved. Choose learners to issue invoices when you are ready.`); void client.invalidateQueries({ queryKey: ["school", tenantId] }); }} />}
    {billing !== null && <BulkFeeBillingDialog initialStructureId={billing} onClose={() => setBilling(null)} onComplete={result => { setBilling(null); setSavedId(null); setNotice(`${result.generated_count} invoices issued. ${result.skipped_count} learners already had invoices for this fee structure and were skipped. View invoices and statements to see the updated accounts.`); }} />}
    <Modal open={Boolean(detail)} title={detail?.name || "Fee charges"} onClose={() => setDetail(null)} footer={<Button variant="secondary" onClick={() => setDetail(null)}>Close</Button>}>
      {detail && <div className="space-y-4"><p className="text-sm text-muted">{detail.academic_year} · {detail.term} · {(detail.grade_levels ?? [detail.grade_level]).join(", ")}</p><dl className="divide-y divide-border">{detail.line_items.map(item => <div key={item.code} className="flex justify-between gap-4 py-3 text-sm"><dt>{item.label}</dt><dd className="font-semibold">{formatMinorKes(item.amount_minor)}</dd></div>)}</dl><p className="text-sm">Total per learner <strong>{formatMinorKes(detail.total_amount_minor)}</strong> · Due in {detail.due_days} days</p></div>}
    </Modal>
    <Modal open={Boolean(archive)} title="Archive fee structure?" onClose={() => { if (!busy) setArchive(null); }} footer={<><Button variant="secondary" disabled={busy} onClick={() => setArchive(null)}>Cancel</Button><Button disabled={busy || !canWrite} onClick={() => void archivePlan()}>{busy ? "Archiving…" : "Archive fee structure"}</Button></>}>
      <p className="text-sm">{archive?.name} will no longer be available for new invoices. All existing invoices, receipts and balances are preserved.</p>{error && <p role="alert" className="mt-3 rounded-lg bg-danger-soft p-3 text-sm">{error}</p>}
    </Modal>
  </div>;
}
