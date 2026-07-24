"use client";

import {
  AlertTriangle,
  ArrowRight,
  Banknote,
  CircleDollarSign,
  FileText,
  Layers3,
  ReceiptText,
  RefreshCw,
  Smartphone,
} from "lucide-react";

import { useSchoolQuery } from "@/lib/data/school-hooks";

type AccountantOverviewResponse = {
  generated_at: string;
  metrics: {
    collected_today_minor: string;
    receipts_today_count: number;
    outstanding_balance_minor: string;
    balances_above_threshold_count: number;
    open_invoice_count: number;
    mpesa_review_count: number;
    active_fee_structure_count: number;
  };
  recent_activity: Array<{
    id: string;
    entity_type: "payment" | "invoice";
    reference: string;
    description: string;
    amount_minor: string;
    status: string;
    occurred_at: string;
  }>;
};

function isAccountantOverviewResponse(value: unknown): value is AccountantOverviewResponse {
  if (!value || typeof value !== "object") return false;

  const candidate = value as Partial<AccountantOverviewResponse>;
  const metrics = candidate.metrics as Partial<AccountantOverviewResponse["metrics"]> | undefined;

  return Boolean(
    metrics
      && typeof candidate.generated_at === "string"
      && typeof metrics.collected_today_minor === "string"
      && typeof metrics.receipts_today_count === "number"
      && typeof metrics.outstanding_balance_minor === "string"
      && typeof metrics.balances_above_threshold_count === "number"
      && typeof metrics.open_invoice_count === "number"
      && typeof metrics.mpesa_review_count === "number"
      && typeof metrics.active_fee_structure_count === "number"
      && Array.isArray(candidate.recent_activity),
  );
}

function formatMinorKes(value: string) {
  try {
    const amountMinor = BigInt(value || "0");
    const hundred = BigInt(100);
    const whole = amountMinor / hundred;
    const cents = amountMinor % hundred;
    const decimal = cents === BigInt(0) ? "" : `.${cents.toString().padStart(2, "0")}`;
    return `KES ${whole.toLocaleString("en-KE")}${decimal}`;
  } catch {
    return "KES 0";
  }
}

function formatActivityTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recorded recently";
  return date.toLocaleString("en-KE", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusClasses(status: string) {
  if (/paid|cleared|matched/i.test(status)) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (/failed|bounced|reversed|void/i.test(status)) {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }
  return "border-amber-200 bg-amber-50 text-amber-700";
}

export function AccountantOverviewWorkspace({
  onNavigate,
}: {
  onNavigate: (workspace: string) => void;
}) {
  const {
    data,
    error,
    isError,
    isFetching,
    isLoading,
    refetch,
  } = useSchoolQuery<AccountantOverviewResponse>("/admin-command/accountant/overview", {
    refetchInterval: 60_000,
  });

  if (isLoading) {
    return (
      <div className="space-y-4" aria-busy="true" aria-label="Loading finance overview">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((item) => (
            <div key={item} className="h-36 animate-pulse rounded-xl border border-white/10 bg-white/10" />
          ))}
        </div>
        <div className="h-56 animate-pulse rounded-xl border border-white/10 bg-white/10" />
      </div>
    );
  }

  if (isError || !isAccountantOverviewResponse(data)) {
    return (
      <section className="rounded-xl border border-rose-300/30 bg-rose-400/10 p-5 text-white" role="alert">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-rose-200" aria-hidden="true" />
          <div className="min-w-0">
            <h2 className="text-lg font-black">Finance overview could not be loaded</h2>
            <p className="mt-1 text-sm font-semibold text-white/70">
              {error?.message || "The live school finance read model is unavailable."}
            </p>
            <button
              type="button"
              onClick={() => void refetch()}
              className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-4 text-sm font-black text-white hover:bg-white/15"
            >
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              Retry live finance data
            </button>
          </div>
        </div>
      </section>
    );
  }

  const metrics = data.metrics;
  const isFreshFinanceWorkspace =
    metrics.receipts_today_count === 0
    && metrics.open_invoice_count === 0
    && metrics.mpesa_review_count === 0
    && metrics.active_fee_structure_count === 0
    && data.recent_activity.length === 0;
  const cards = [
    {
      label: "Collected today",
      value: formatMinorKes(metrics.collected_today_minor),
      helper: `${metrics.receipts_today_count} receipt${metrics.receipts_today_count === 1 ? "" : "s"} recorded today`,
      icon: Banknote,
      target: "payments",
    },
    {
      label: "Outstanding student fees",
      value: formatMinorKes(metrics.outstanding_balance_minor),
      helper: `${metrics.open_invoice_count} open invoice${metrics.open_invoice_count === 1 ? "" : "s"}`,
      icon: CircleDollarSign,
      target: "arrears",
    },
    {
      label: "M-Pesa needs review",
      value: String(metrics.mpesa_review_count),
      helper: "Unmatched or exception payments",
      icon: Smartphone,
      target: "m-pesa-reconciliation",
    },
    {
      label: "Active fee structures",
      value: String(metrics.active_fee_structure_count),
      helper: "School-owned billing configurations",
      icon: Layers3,
      target: "fee-structures",
    },
  ] as const;

  return (
    <div className="space-y-5">
      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4" aria-label="Live finance metrics">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <button
              key={card.label}
              type="button"
              onClick={() => onNavigate(card.target)}
              className="group rounded-xl border border-white/12 bg-white p-4 text-left text-[#071D49] shadow-sm transition hover:-translate-y-0.5 hover:border-cyan-300 hover:shadow-lg"
            >
              <div className="flex items-start justify-between gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-lg bg-[#EAF3FF] text-[#1D4ED8]">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <ArrowRight className="h-4 w-4 text-[#94A3B8] transition group-hover:translate-x-0.5 group-hover:text-[#1D4ED8]" aria-hidden="true" />
              </div>
              <p className="mt-4 text-xs font-black uppercase tracking-[0.12em] text-[#64748B]">{card.label}</p>
              <p className="mt-1 text-2xl font-black">{card.value}</p>
              <p className="mt-2 text-xs font-semibold text-[#64748B]">{card.helper}</p>
            </button>
          );
        })}
      </section>

      <section className="rounded-xl border border-white/12 bg-white p-5 text-[#071D49] shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#1D4ED8]">Finance operations</p>
            <h2 className="mt-1 text-xl font-black">Today&apos;s finance desk</h2>
            <p className="mt-1 text-sm font-semibold text-[#64748B]">
              Live records from this school only. No demo balances or synthetic collection totals are used.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onNavigate("payments")}
              className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-[#071D49] px-4 text-sm font-black text-white hover:bg-[#0B2D6F]"
            >
              <ReceiptText className="h-4 w-4" aria-hidden="true" />
              Record payment
            </button>
            <button
              type="button"
              onClick={() => onNavigate("fee-structures")}
              className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-[#C8D5EA] bg-white px-4 text-sm font-black text-[#071D49] hover:bg-[#F8FAFC]"
            >
              <Layers3 className="h-4 w-4" aria-hidden="true" />
              Set fee structure
            </button>
            <button
              type="button"
              onClick={() => void refetch()}
              disabled={isFetching}
              className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-[#C8D5EA] bg-white px-4 text-sm font-black text-[#071D49] hover:bg-[#F8FAFC] disabled:cursor-wait disabled:opacity-60"
            >
              <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} aria-hidden="true" />
              Refresh
            </button>
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <button
            type="button"
            onClick={() => onNavigate("arrears")}
            className="rounded-lg border border-[#D8E0EC] bg-[#F8FAFC] p-4 text-left hover:border-[#93C5FD]"
          >
            <p className="text-sm font-black">Arrears follow-up</p>
            <p className="mt-1 text-sm font-semibold text-[#64748B]">
              {metrics.balances_above_threshold_count} learner{metrics.balances_above_threshold_count === 1 ? "" : "s"} above KES 10,000
            </p>
          </button>
          <button
            type="button"
            onClick={() => onNavigate("invoices")}
            className="rounded-lg border border-[#D8E0EC] bg-[#F8FAFC] p-4 text-left hover:border-[#93C5FD]"
          >
            <p className="text-sm font-black">Student invoices</p>
            <p className="mt-1 text-sm font-semibold text-[#64748B]">
              {metrics.open_invoice_count} invoice{metrics.open_invoice_count === 1 ? "" : "s"} awaiting full payment
            </p>
          </button>
          <button
            type="button"
            onClick={() => onNavigate("reports")}
            className="rounded-lg border border-[#D8E0EC] bg-[#F8FAFC] p-4 text-left hover:border-[#93C5FD]"
          >
            <p className="text-sm font-black">Finance reports</p>
            <p className="mt-1 text-sm font-semibold text-[#64748B]">Preview, download, and print school-scoped records</p>
          </button>
        </div>
      </section>

      {isFreshFinanceWorkspace ? (
        <section className="rounded-xl border border-cyan-300/30 bg-cyan-300/10 p-5 text-white">
          <h2 className="text-xl font-black">No school finance records yet</h2>
          <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-white/72">
            Create the first fee structure, generate student invoices after learners are admitted, then record or reconcile payments. This school starts at zero by design.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onNavigate("fee-structures")}
              className="min-h-10 rounded-lg bg-cyan-300 px-4 text-sm font-black text-[#071D49] hover:bg-cyan-200"
            >
              Create first fee structure
            </button>
            <button
              type="button"
              onClick={() => onNavigate("invoices")}
              className="min-h-10 rounded-lg border border-white/20 bg-white/10 px-4 text-sm font-black text-white hover:bg-white/15"
            >
              Open student invoicing
            </button>
          </div>
        </section>
      ) : null}

      <section className="overflow-hidden rounded-xl border border-white/12 bg-white text-[#071D49] shadow-sm">
        <div className="flex items-center justify-between gap-3 border-b border-[#D8E0EC] px-5 py-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#1D4ED8]">Tenant activity</p>
            <h2 className="mt-1 text-xl font-black">Recent finance records</h2>
          </div>
          <FileText className="h-5 w-5 text-[#64748B]" aria-hidden="true" />
        </div>
        {data.recent_activity.length === 0 ? (
          <div className="p-8 text-center">
            <ReceiptText className="mx-auto h-8 w-8 text-[#94A3B8]" aria-hidden="true" />
            <p className="mt-3 font-black">No payments or student invoices have been recorded.</p>
            <p className="mt-1 text-sm font-semibold text-[#64748B]">The first real finance transaction will appear here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-[#F8FAFC] text-xs font-black uppercase tracking-[0.1em] text-[#64748B]">
                <tr>
                  <th className="px-5 py-3">Reference</th>
                  <th className="px-5 py-3">Record</th>
                  <th className="px-5 py-3">Amount</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {data.recent_activity.map((activity) => (
                  <tr key={`${activity.entity_type}:${activity.id}`} className="hover:bg-[#F8FAFC]">
                    <td className="px-5 py-4 font-black">{activity.reference}</td>
                    <td className="px-5 py-4">
                      <p className="font-bold capitalize">{activity.entity_type}</p>
                      <p className="mt-0.5 max-w-[280px] truncate text-xs font-semibold text-[#64748B]">{activity.description}</p>
                    </td>
                    <td className="px-5 py-4 font-black">{formatMinorKes(activity.amount_minor)}</td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-black capitalize ${statusClasses(activity.status)}`}>
                        {activity.status.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 font-semibold text-[#64748B]">{formatActivityTime(activity.occurred_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
