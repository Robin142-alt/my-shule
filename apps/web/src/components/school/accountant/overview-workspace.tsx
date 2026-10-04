"use client";

import { ArrowRight, Banknote, CheckCircle2, Clock3, RefreshCw, WalletCards } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { useSchoolQuery } from "@/lib/data/school-hooks";
import { formatMinorKes } from "@/lib/billing/billing-utils";

export type AccountantOverviewResponse = {
  generated_at: string;
  metrics: {
    collected_today_minor: string; receipts_today_count: number;
    outstanding_balance_minor: string; balances_above_threshold_count: number;
    open_invoice_count: number; mpesa_review_count: number; active_fee_structure_count: number;
  };
  collection_methods?: Array<{ method: string; amount_minor: string; count: number }>;
  pending_actions?: Record<string, number>;
  recent_activity: Array<{
    id: string; entity_type: "payment" | "invoice"; reference: string; description: string;
    amount_minor: string; status: string; occurred_at: string;
  }>;
};

const methodNames: Record<string, string> = {
  cash: "Cash", cheque: "Cleared cheques", bank_deposit: "Bank", eft: "Bank transfer",
  mpesa_c2b: "M-Pesa",
};
const queueDefinitions = [
  ["unmatched_collections", "Match a learner", "Confirmed collections with an unknown learner reference.", "collections"],
  ["provider_exceptions", "Check payment verification", "Conflicting evidence, failed checks or verification taking over 15 minutes.", "collections"],
  ["statement_reviews", "Statement entries awaiting approval", "The Principal must confirm these before they affect fees.", "collections"],
  ["pending_cheques", "Follow up cheques", "Record deposit, clearing or a bounced cheque.", "payments"],
  ["reversal_approvals", "Reversals awaiting approval", "The Principal must approve before balances change.", "collections"],
  ["expense_approvals", "Expenses awaiting approval", "Submitted spending requests waiting for a decision.", "expenses"],
  ["waiver_approvals", "Fee waivers awaiting approval", "Track requested adjustments and decisions.", "waivers-discounts"],
] as const;

function activityTime(value: string) {
  return new Date(value).toLocaleString("en-KE", {
    timeZone: "Africa/Nairobi", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
  });
}

export function AccountantOverviewWorkspace({ onNavigate }: { onNavigate: (workspace: string) => void }) {
  const query = useSchoolQuery<AccountantOverviewResponse>("/admin-command/accountant/overview", {
    refetchInterval: 30_000,
  });
  const { data } = query;
  if (query.isLoading) return <div aria-busy="true" aria-label="Loading finance overview" className="space-y-4">
    <div className="grid gap-4 sm:grid-cols-3">{[0, 1, 2].map(i => <div key={i} className="h-32 animate-pulse rounded-xl bg-surface-muted" />)}</div>
    <div className="h-64 animate-pulse rounded-xl bg-surface-muted" />
  </div>;
  if (query.isError || !data?.metrics || !Array.isArray(data.recent_activity)) return (
    <div role="alert" className="rounded-xl border border-danger-border bg-danger-soft p-5">
      <h3 className="font-semibold">Finance overview could not be loaded</h3>
      <p className="my-2 text-sm">{query.error?.message || "Live finance figures are unavailable."}</p>
      <Button variant="secondary" onClick={() => void query.refetch()}>Retry live finance data</Button>
    </div>
  );
  const { metrics } = data;
  const queues: Array<{ key: string; label: string; hint: string; target: string; count: number }> = queueDefinitions.map(([key, label, hint, target]) => ({
    key, label, hint, target, count: data.pending_actions?.[key] ?? 0,
  }));
  if (metrics.mpesa_review_count > 0) queues.push({
    key: "legacy_mpesa", label: "M-Pesa reconciliation", hint: "Review exceptions from existing M-Pesa connections.",
    target: "m-pesa-reconciliation", count: metrics.mpesa_review_count,
  });
  const pending = queues.reduce((total, queue) => total + queue.count, 0);
  const empty = !metrics.active_fee_structure_count && !metrics.open_invoice_count && !data.recent_activity.length && !pending;
  const cards = [
    { label: "Collected today", value: formatMinorKes(metrics.collected_today_minor), detail: `${metrics.receipts_today_count} cleared receipts · Nairobi time`, target: "receipts", icon: Banknote },
    { label: "Outstanding fees", value: formatMinorKes(metrics.outstanding_balance_minor), detail: `${metrics.open_invoice_count} open invoices · credits included`, target: "arrears", icon: WalletCards },
    { label: "Pending actions", value: String(pending), detail: pending ? "Payment exceptions and approvals" : "No pending finance actions", target: "#actions", icon: Clock3 },
  ];
  return <div className="space-y-5 text-foreground">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h3 className="text-lg font-semibold">Today’s finance desk</h3>
        <p className="text-sm text-muted">Updated {activityTime(data.generated_at)} · refreshes automatically</p>
      </div>
      <Button variant="secondary" disabled={query.isFetching} onClick={() => void query.refetch()}>
        <RefreshCw className={`mr-2 h-4 w-4 ${query.isFetching ? "animate-spin" : ""}`} aria-hidden="true" />Refresh
      </Button>
    </div>
    <section className="grid gap-3 sm:grid-cols-3" aria-label="Live finance metrics">
      {cards.map(({ label, value, detail, target, icon: Icon }) => <button key={label} type="button"
        onClick={() => target === "#actions" ? document.getElementById("finance-actions")?.focus() : onNavigate(target)}
        className="group rounded-xl border border-border bg-surface p-5 text-left transition hover:border-primary focus-visible:outline-2 focus-visible:outline-primary">
        <div className="flex items-center justify-between text-muted"><span className="text-sm font-medium">{label}</span><Icon className="h-4 w-4" aria-hidden="true" /></div>
        <p className="mt-3 break-words text-2xl font-semibold tracking-tight tabular-nums lg:text-3xl">{value}</p>
        <p className="mt-2 text-xs text-muted">{detail}</p>
      </button>)}
    </section>
    {empty && <section className="rounded-xl border border-info-border bg-info-soft p-5">
      <h3 className="font-semibold">No school finance records yet</h3>
      <p className="mt-2 text-sm">Set up school payment accounts and fee structures, then generate invoices for admitted learners.</p>
      <div className="mt-4 flex flex-wrap gap-2"><Button onClick={() => onNavigate("payment-setup")}>Set up collections</Button>
        <Button variant="secondary" onClick={() => onNavigate("fee-structures")}>Create first fee structure</Button>
        <Button variant="ghost" onClick={() => onNavigate("invoices")}>Open student invoicing</Button></div>
    </section>}
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
      <section id="finance-actions" tabIndex={-1} className="overflow-hidden rounded-xl border border-border bg-surface focus-visible:outline-2 focus-visible:outline-primary">
        <div className="border-b border-border px-5 py-4"><h3 className="font-semibold">Needs attention</h3><p className="mt-1 text-sm text-muted">Start here. Each item opens the workspace that can resolve it.</p></div>
        {pending === 0 ? <div className="flex gap-3 p-5"><CheckCircle2 className="h-5 w-5 shrink-0 text-success" aria-hidden="true" /><div><p className="font-medium">You’re up to date</p><p className="mt-1 text-sm text-muted">Verified, matched payments update student fees and receipts automatically.</p></div></div>
          : <ul className="divide-y divide-border">{queues.filter(q => q.count > 0).map(q => <li key={q.key}>
            <button type="button" onClick={() => onNavigate(q.target)} className="flex min-h-16 w-full items-center gap-3 px-5 py-4 text-left hover:bg-surface-muted">
              <span className="min-w-8 rounded-md bg-warning-soft px-2 py-1 text-center text-sm font-semibold text-warning">{q.count}</span>
              <span className="min-w-0 flex-1"><span className="block text-sm font-semibold">{q.label}</span><span className="mt-1 block text-xs text-muted">{q.hint}</span></span>
              <ArrowRight className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
            </button>
          </li>)}</ul>}
      </section>
      <section className="rounded-xl border border-border bg-surface p-5">
        <h3 className="font-semibold">Today’s collection breakdown</h3>
        <p className="mt-1 text-sm text-muted">Cleared receipts only. Pending cheques and reversed payments are excluded.</p>
        <dl className="mt-4 divide-y divide-border">
          {(data.collection_methods ?? []).map(row => <div key={row.method} className="flex items-center justify-between gap-3 py-3">
            <dt className="text-sm">{methodNames[row.method] ?? row.method}<span className="ml-2 text-xs text-muted">({row.count})</span></dt>
            <dd className="font-semibold tabular-nums">{formatMinorKes(row.amount_minor)}</dd>
          </div>)}
        </dl>
        {!data.collection_methods?.length && <p className="my-5 text-sm text-muted">No cleared collections today. New confirmed receipts will appear here.</p>}
        <Button variant="secondary" className="mt-3 w-full" onClick={() => onNavigate("reports")}>Open collection reports <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" /></Button>
      </section>
    </div>
    <div className="flex flex-wrap gap-2" aria-label="Daily finance shortcuts">
      <Button variant="secondary" onClick={() => onNavigate("payments")}>Record cash or cheque</Button>
      <Button variant="secondary" onClick={() => onNavigate("invoices")}>Student invoices & statements</Button>
      <Button variant="secondary" onClick={() => onNavigate("arrears")}>Follow up arrears</Button>
      <Button variant="secondary" onClick={() => onNavigate("expenses")}>Submit an expense</Button>
    </div>
    <DataTable title="Recent finance records" subtitle="Open a record’s workspace to view its details."
      rows={data.recent_activity} getRowKey={row => `${row.entity_type}:${row.id}`}
      emptyMessage="No payments or invoices yet. Create a fee structure and invoice admitted learners to get started."
      columns={[
        { id: "reference", header: "Reference", render: row => <button type="button" className="min-h-11 font-semibold text-primary underline-offset-4 hover:underline" onClick={() => onNavigate(row.entity_type === "payment" ? "receipts" : "invoices")}>{row.reference}</button> },
        { id: "description", header: "Details", render: row => row.description },
        { id: "amount", header: "Amount", className: "tabular-nums font-semibold", render: row => formatMinorKes(row.amount_minor) },
        { id: "status", header: "Status", render: row => <span className="capitalize">{row.status.replaceAll("_", " ")}</span> },
        { id: "time", header: "Recorded", render: row => activityTime(row.occurred_at) },
      ]} />
  </div>;
}
