"use client";

import { useMemo, useRef, useState } from "react";
import { usePermissions } from "@/components/providers/permission-context";
import { useOptionalSchoolTenantId } from "@/lib/data/school-tenant-scope";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Plus,
  Receipt,
  RefreshCw,
  Search,
  WalletCards,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { formatActivityDate, formatMinorKes, toMinorUnits } from "@/lib/billing/billing-utils";
import { requestDashboardApi } from "@/lib/dashboard/api-client";
import { useSchoolQuery } from "@/lib/data/school-hooks";

type ExpenseStatus = "pending" | "pending_approval" | "approved" | "rejected";

type ExpenseRow = {
  id: string;
  date: string;
  category: string;
  description: string;
  amount_minor: string;
  status: ExpenseStatus | string;
};

type ExpensesData = {
  metrics: {
    total_this_month_minor: string;
    pending_approval: number;
    approved: number;
    total_count: number;
  };
  items: ExpenseRow[];
};

const EXPENSE_CATEGORIES = [
  ["academics", "Academics"],
  ["administration", "Administration"],
  ["boarding", "Boarding"],
  ["maintenance", "Maintenance"],
  ["transport", "Transport"],
  ["utilities", "Utilities"],
  ["other", "Other"],
] as const;

function statusClasses(status: string) {
  if (status.toLowerCase() === "approved") {
    return "border-success-border bg-success-soft text-success";
  }
  if (status.toLowerCase() === "rejected") {
    return "border-danger-border bg-danger-soft text-danger";
  }
  return "border-warning-border bg-warning-soft text-warning";
}

function emptyDraft() {
  return { category: "administration", description: "", amount: "" };
}

export function ExpensesWorkspace({ review = false }: { review?: boolean }) {
  const tenantId = useOptionalSchoolTenantId();
  const { hasPermission } = usePermissions();
  const [decision, setDecision] = useState<{ row: ExpenseRow; decision: "approve" | "reject" } | null>(null);
  const commandKey = useRef("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(0);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [draft, setDraft] = useState(emptyDraft);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const {
    data,
    error,
    isError,
    isFetching,
    isLoading,
    refetch,
  } = useSchoolQuery<ExpensesData>(`/admin-command/accountant/expenses?limit=50&offset=${page * 50}${statusFilter === "all" ? "" : `&status=${statusFilter}`}`);

  const items = useMemo(() => Array.isArray(data?.items) ? data.items : [], [data]);
  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return items.filter((item) => {
      const matchesQuery = !normalizedQuery
        || item.description.toLowerCase().includes(normalizedQuery)
        || item.category.toLowerCase().includes(normalizedQuery);
      return matchesQuery;
    });
  }, [items, query]);

  const metrics = data?.metrics ?? {
    total_this_month_minor: "0",
    pending_approval: 0,
    approved: 0,
    total_count: 0,
  };

  function openExpenseModal() {
    commandKey.current = `expense-${crypto.randomUUID()}`;
    setDraft(emptyDraft());
    setSubmitError(null);
    setShowExpenseModal(true);
  }

  async function submitExpense(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting || !tenantId || !hasPermission("finance:write")) return;
    const amountMinor = toMinorUnits(draft.amount);
    const description = draft.description.trim();

    if (description.length < 3) {
      setSubmitError("Describe what the school is paying for.");
      return;
    }
    if (!amountMinor) {
      setSubmitError("Enter a valid expense amount greater than zero.");
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    try {
      const response = await requestDashboardApi<{ message?: string }>(
        "/admin-command/accountant/expenses",
        {
          method: "POST",
          tenantId,
          body: {
            idempotency_key: commandKey.current,
            category: draft.category,
            description,
            amount_minor: amountMinor,
          },
        },
      );
      setShowExpenseModal(false);
      setNotice(response.message ?? "Expense submitted for approval.");
      await refetch();
    } catch (caught) {
      setSubmitError(caught instanceof Error ? caught.message : "Expense could not be submitted.");
    } finally {
      setSubmitting(false);
    }
  }

  async function decide(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!decision || submitting || !tenantId) return;
    const reason = String(new FormData(event.currentTarget).get("reason") ?? "");
    setSubmitting(true); setSubmitError(null);
    try {
      const result = await requestDashboardApi<{ message: string }>(`/admin-command/accountant/expenses/${decision.row.id}/decision`, {
        tenantId, method: "POST", body: { decision: decision.decision, reason },
      });
      setDecision(null); setNotice(result.message); await refetch();
    } catch (cause) { setSubmitError(cause instanceof Error ? cause.message : "The decision could not be saved."); }
    finally { setSubmitting(false); }
  }

  return (
    <div className="space-y-5 text-foreground">
      <section className="rounded-xl border border-white/12 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-info-soft text-info">
              <Receipt className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.15em] text-info">Expenditure control</p>
              <h2 className="mt-1 text-xl font-black">School expenses</h2>
              <p className="mt-1 text-sm font-semibold text-muted">
                Capture real expenditure, route it for approval, and retain a school-scoped register.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => void refetch()} disabled={isFetching}>
              <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} aria-hidden="true" />
              Refresh
            </Button>
            <Button onClick={openExpenseModal} disabled={!hasPermission("finance:write")}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              Submit expense
            </Button>
          </div>
        </div>
      </section>

      {notice ? (
        <div className="rounded-xl border border-success-border bg-success-soft px-4 py-3 text-sm font-semibold text-success" role="status">
          {notice}
        </div>
      ) : null}

      {isError ? (
        <section className="rounded-xl border border-danger-border bg-danger-soft p-5 text-danger" role="alert">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
            <div>
              <h3 className="font-black">Expense register could not be loaded</h3>
              <p className="mt-1 text-sm font-semibold">{error?.message || "The live expense service is unavailable."}</p>
              <Button className="mt-3" variant="secondary" onClick={() => void refetch()}>Retry</Button>
            </div>
          </div>
        </section>
      ) : (
        <>
          <section className="grid gap-3 md:grid-cols-3" aria-label="Expense summary">
            {[
              {
                label: "Requested this month",
                value: formatMinorKes(metrics.total_this_month_minor),
                helper: `${metrics.total_count} total expense record${metrics.total_count === 1 ? "" : "s"}`,
                icon: WalletCards,
              },
              {
                label: "Pending approval",
                value: String(metrics.pending_approval),
                helper: "Awaiting an authorized decision",
                icon: Clock3,
              },
              {
                label: "Approved",
                value: String(metrics.approved),
                helper: "Approved expense records",
                icon: CheckCircle2,
              },
            ].map((card) => {
              const Icon = card.icon;
              return (
                <div key={card.label} className="rounded-xl border border-white/12 bg-white p-4 shadow-sm">
                  <Icon className="h-5 w-5 text-info" aria-hidden="true" />
                  <p className="mt-3 text-xs font-black uppercase tracking-[0.12em] text-muted">{card.label}</p>
                  <p className="mt-1 text-2xl font-black">{isLoading ? "…" : card.value}</p>
                  <p className="mt-1 text-xs font-semibold text-muted">{card.helper}</p>
                </div>
              );
            })}
          </section>

          <section className="overflow-hidden rounded-xl border border-white/12 bg-white shadow-sm">
            <div className="flex flex-col gap-3 border-b border-border p-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h3 className="font-black">Expense register</h3>
                <p className="mt-1 text-sm font-semibold text-muted">Every record remains visible while approval is pending.</p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <label className="relative">
                  <span className="sr-only">Search expenses</span>
                  <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted" aria-hidden="true" />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search this page"
                    className="h-10 w-full rounded-lg border border-border-strong pl-9 pr-3 text-sm outline-none focus:border-blue-400"
                  />
                </label>
                <label>
                  <span className="sr-only">Filter expense status</span>
                  <select
                    value={statusFilter}
                    onChange={(event) => { setStatusFilter(event.target.value); setPage(0); }}
                    className="h-10 rounded-lg border border-border-strong bg-white px-3 text-sm font-semibold outline-none focus:border-blue-400"
                  >
                    <option value="all">All statuses</option>
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </label>
              </div>
            </div>

            {isLoading ? (
              <div className="p-8 text-center text-sm font-semibold text-muted" aria-busy="true">Loading live expenses…</div>
            ) : filteredItems.length === 0 ? (
              <div className="p-8 text-center">
                <Receipt className="mx-auto h-8 w-8 text-muted" aria-hidden="true" />
                <p className="mt-3 font-black">{metrics.total_count === 0 ? "No expenses have been submitted" : "No expenses on this page match these filters"}</p>
                <p className="mt-1 text-sm font-semibold text-muted">
                  {metrics.total_count === 0
                    ? "Submit the first expense to start an approval-traceable register."
                    : "Change the search text or status filter to see more records."}
                </p>
                {metrics.total_count === 0 ? <Button className="mt-4" onClick={openExpenseModal} disabled={!hasPermission("finance:write")}>Submit first expense</Button> : null}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-surface-muted text-xs font-black uppercase tracking-[0.08em] text-muted">
                    <tr>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Description</th>
                      <th className="px-4 py-3">Category</th>
                      <th className="px-4 py-3">Amount</th>
                      <th className="px-4 py-3">Status</th>
                      {review && <th className="px-4 py-3">Decision</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredItems.map((row) => (
                      <tr key={row.id} className="hover:bg-surface-muted">
                        <td className="whitespace-nowrap px-4 py-3 font-semibold text-muted">{formatActivityDate(row.date)}</td>
                        <td className="max-w-md px-4 py-3 font-bold">{row.description}</td>
                        <td className="px-4 py-3 font-semibold capitalize">{row.category.replaceAll("_", " ")}</td>
                        <td className="whitespace-nowrap px-4 py-3 font-black">{formatMinorKes(row.amount_minor)}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-black capitalize ${statusClasses(row.status)}`}>
                            {row.status.replaceAll("_", " ")}
                          </span>
                        </td>
                        {review && <td className="px-4 py-3">{["pending", "pending_approval"].includes(row.status.toLowerCase()) && <div className="flex gap-2">
                          {(["approve", "reject"] as const).map(choice => <Button key={choice} variant="secondary" size="sm" disabled={!hasPermission("principal:write")}
                            onClick={() => { setSubmitError(null); setDecision({ row, decision: choice }); }}>{choice === "approve" ? "Approve" : "Reject"}</Button>)}
                        </div>}</td>}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="flex items-center justify-between gap-2 border-t border-border p-4 text-sm">
              <Button variant="secondary" disabled={page === 0 || isFetching} onClick={() => setPage(value => value - 1)}>Previous</Button>
              <span>Page {page + 1} · {items.length} records</span>
              <Button variant="secondary" disabled={items.length < 50 || isFetching} onClick={() => setPage(value => value + 1)}>Next</Button>
            </div>
          </section>
        </>
      )}

      <Modal open={Boolean(decision)} onClose={() => { if (!submitting) setDecision(null); }} title={`${decision?.decision === "approve" ? "Approve" : "Reject"} expense`}>
        <form onSubmit={decide} className="space-y-4">
          <p>{decision?.row.description} · {decision && formatMinorKes(decision.row.amount_minor)}</p>
          <p className="text-sm text-muted">This saves an approval decision. It does not confirm that money has been paid out.</p>
          {submitError && <p role="alert" className="text-danger">{submitError}</p>}
          <label className="block">Decision notes<textarea name="reason" required minLength={5} maxLength={500} className="input-base mt-1 w-full" /></label>
          <Button type="submit" disabled={submitting}>{submitting ? "Saving…" : "Save decision"}</Button>
        </form>
      </Modal>
      <Modal
        open={showExpenseModal}
        onClose={() => { if (!submitting) setShowExpenseModal(false); }}
        title="Submit school expense"
        description="The expense is saved as pending and sent to the Principal approval queue."
        footer={(
          <>
            <Button variant="secondary" onClick={() => setShowExpenseModal(false)} disabled={submitting}>Cancel</Button>
            <Button type="submit" form="accountant-expense-form" disabled={submitting}>
              {submitting ? "Submitting…" : "Submit for approval"}
            </Button>
          </>
        )}
      >
        <form id="accountant-expense-form" className="space-y-4" onSubmit={submitExpense}>
          {submitError ? <div className="rounded-lg bg-danger-soft p-3 text-sm font-semibold text-danger" role="alert">{submitError}</div> : null}
          <label className="block space-y-1.5 text-sm font-bold">
            <span>Category</span>
            <select
              value={draft.category}
              onChange={(event) => setDraft((current) => ({ ...current, category: event.target.value }))}
              className="h-11 w-full rounded-lg border border-border-strong bg-white px-3 text-sm outline-none focus:border-blue-400"
            >
              {EXPENSE_CATEGORIES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <label className="block space-y-1.5 text-sm font-bold">
            <span>Description</span>
            <textarea
              value={draft.description}
              onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))}
              rows={3}
              maxLength={240}
              placeholder="What is being paid for, and why?"
              className="w-full rounded-lg border border-border-strong px-3 py-2 text-sm outline-none focus:border-blue-400"
            />
          </label>
          <label className="block space-y-1.5 text-sm font-bold">
            <span>Amount (KES)</span>
            <input
              value={draft.amount}
              onChange={(event) => setDraft((current) => ({ ...current, amount: event.target.value }))}
              inputMode="decimal"
              placeholder="12500"
              className="h-11 w-full rounded-lg border border-border-strong px-3 text-sm outline-none focus:border-blue-400"
            />
          </label>
        </form>
      </Modal>
    </div>
  );
}
