"use client";

import { useMemo, useState } from "react";
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
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (status.toLowerCase() === "rejected") {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }
  return "border-amber-200 bg-amber-50 text-amber-700";
}

function emptyDraft() {
  return { category: "administration", description: "", amount: "" };
}

export function ExpensesWorkspace() {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
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
  } = useSchoolQuery<ExpensesData>("/admin-command/accountant/expenses");

  const items = Array.isArray(data?.items) ? data.items : [];
  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return items.filter((item) => {
      const matchesStatus = statusFilter === "all" || item.status.toLowerCase() === statusFilter;
      const matchesQuery = !normalizedQuery
        || item.description.toLowerCase().includes(normalizedQuery)
        || item.category.toLowerCase().includes(normalizedQuery);
      return matchesStatus && matchesQuery;
    });
  }, [items, query, statusFilter]);

  const metrics = data?.metrics ?? {
    total_this_month_minor: "0",
    pending_approval: 0,
    approved: 0,
    total_count: 0,
  };

  function openExpenseModal() {
    setDraft(emptyDraft());
    setSubmitError(null);
    setShowExpenseModal(true);
  }

  async function submitExpense(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
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
          body: {
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

  return (
    <div className="space-y-5 text-[#071D49]">
      <section className="rounded-xl border border-white/12 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#EEF5FF] text-[#1D4ED8]">
              <Receipt className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.15em] text-[#1D4ED8]">Expenditure control</p>
              <h2 className="mt-1 text-xl font-black">School expenses</h2>
              <p className="mt-1 text-sm font-semibold text-[#64748B]">
                Capture real expenditure, route it for approval, and retain a school-scoped register.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => void refetch()} disabled={isFetching}>
              <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} aria-hidden="true" />
              Refresh
            </Button>
            <Button onClick={openExpenseModal}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              Submit expense
            </Button>
          </div>
        </div>
      </section>

      {notice ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700" role="status">
          {notice}
        </div>
      ) : null}

      {isError ? (
        <section className="rounded-xl border border-rose-200 bg-rose-50 p-5 text-rose-700" role="alert">
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
                label: "This month",
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
                  <Icon className="h-5 w-5 text-[#1D4ED8]" aria-hidden="true" />
                  <p className="mt-3 text-xs font-black uppercase tracking-[0.12em] text-[#64748B]">{card.label}</p>
                  <p className="mt-1 text-2xl font-black">{isLoading ? "…" : card.value}</p>
                  <p className="mt-1 text-xs font-semibold text-[#64748B]">{card.helper}</p>
                </div>
              );
            })}
          </section>

          <section className="overflow-hidden rounded-xl border border-white/12 bg-white shadow-sm">
            <div className="flex flex-col gap-3 border-b border-[#D8E0EC] p-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h3 className="font-black">Expense register</h3>
                <p className="mt-1 text-sm font-semibold text-[#64748B]">Every record remains visible while approval is pending.</p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <label className="relative">
                  <span className="sr-only">Search expenses</span>
                  <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-[#94A3B8]" aria-hidden="true" />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search description or category"
                    className="h-10 min-w-64 rounded-lg border border-[#C8D5EA] pl-9 pr-3 text-sm outline-none focus:border-blue-400"
                  />
                </label>
                <label>
                  <span className="sr-only">Filter expense status</span>
                  <select
                    value={statusFilter}
                    onChange={(event) => setStatusFilter(event.target.value)}
                    className="h-10 rounded-lg border border-[#C8D5EA] bg-white px-3 text-sm font-semibold outline-none focus:border-blue-400"
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
              <div className="p-8 text-center text-sm font-semibold text-[#64748B]" aria-busy="true">Loading live expenses…</div>
            ) : filteredItems.length === 0 ? (
              <div className="p-8 text-center">
                <Receipt className="mx-auto h-8 w-8 text-[#94A3B8]" aria-hidden="true" />
                <p className="mt-3 font-black">{items.length === 0 ? "No expenses have been submitted" : "No expenses match these filters"}</p>
                <p className="mt-1 text-sm font-semibold text-[#64748B]">
                  {items.length === 0
                    ? "Submit the first expense to start an approval-traceable register."
                    : "Change the search text or status filter to see more records."}
                </p>
                {items.length === 0 ? <Button className="mt-4" onClick={openExpenseModal}>Submit first expense</Button> : null}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-[#F8FAFC] text-xs font-black uppercase tracking-[0.08em] text-[#64748B]">
                    <tr>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Description</th>
                      <th className="px-4 py-3">Category</th>
                      <th className="px-4 py-3">Amount</th>
                      <th className="px-4 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0]">
                    {filteredItems.map((row) => (
                      <tr key={row.id} className="hover:bg-[#F8FAFC]">
                        <td className="whitespace-nowrap px-4 py-3 font-semibold text-[#64748B]">{formatActivityDate(row.date)}</td>
                        <td className="max-w-md px-4 py-3 font-bold">{row.description}</td>
                        <td className="px-4 py-3 font-semibold capitalize">{row.category.replaceAll("_", " ")}</td>
                        <td className="whitespace-nowrap px-4 py-3 font-black">{formatMinorKes(row.amount_minor)}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-black capitalize ${statusClasses(row.status)}`}>
                            {row.status.replaceAll("_", " ")}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}

      <Modal
        open={showExpenseModal}
        onClose={() => setShowExpenseModal(false)}
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
          {submitError ? <div className="rounded-lg bg-rose-50 p-3 text-sm font-semibold text-rose-700" role="alert">{submitError}</div> : null}
          <label className="block space-y-1.5 text-sm font-bold">
            <span>Category</span>
            <select
              value={draft.category}
              onChange={(event) => setDraft((current) => ({ ...current, category: event.target.value }))}
              className="h-11 w-full rounded-lg border border-[#C8D5EA] bg-white px-3 text-sm outline-none focus:border-blue-400"
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
              className="w-full rounded-lg border border-[#C8D5EA] px-3 py-2 text-sm outline-none focus:border-blue-400"
            />
          </label>
          <label className="block space-y-1.5 text-sm font-bold">
            <span>Amount (KES)</span>
            <input
              value={draft.amount}
              onChange={(event) => setDraft((current) => ({ ...current, amount: event.target.value }))}
              inputMode="decimal"
              placeholder="12500"
              className="h-11 w-full rounded-lg border border-[#C8D5EA] px-3 text-sm outline-none focus:border-blue-400"
            />
          </label>
        </form>
      </Modal>
    </div>
  );
}
