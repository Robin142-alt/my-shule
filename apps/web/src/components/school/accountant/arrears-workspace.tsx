"use client";

import { useCallback, useMemo, useState, useEffect } from "react";
import { BellRing, CircleDollarSign, Download, FileText, Search } from "lucide-react";
import { toast } from "sonner";

import {
  type StudentFeeBalanceResponse,
  type StudentFeeStatementResponse,
} from "@/components/school/school-pages";
import { SchoolPageHeader } from "@/components/school/school-page-header";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { Modal } from "@/components/ui/modal";
import { buildBillingApiPath, formatActivityDate, formatMinorKes } from "@/lib/billing/billing-utils";
import { requestDashboardApi } from "@/lib/dashboard/api-client";
import {
  type CsvReportArtifactResponse,
  downloadTextFile,
  openPrintDocument,
} from "@/lib/dashboard/export";
import type { SchoolExperienceRole } from "@/lib/experiences/school-data";

type SchoolRouteMode = "hosted" | "public";

function positiveMinor(value: string) {
  try {
    return BigInt(value || "0") > BigInt(0);
  } catch {
    return false;
  }
}

function addMinor(values: string[]) {
  return values.reduce((sum, value) => {
    try {
      return sum + BigInt(value || "0");
    } catch {
      return sum;
    }
  }, BigInt(0)).toString();
}

export function ArrearsWorkspace({
  tenantSlug,
}: {
  role: SchoolExperienceRole;
  tenantSlug?: string | null;
  routeMode?: SchoolRouteMode;
  activeSection?: string;
}) {
  const [balances, setBalances] = useState<StudentFeeBalanceResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [balanceFilter, setBalanceFilter] = useState("all");
  const [sendingReminderFor, setSendingReminderFor] = useState<string | null>(null);
  const [statement, setStatement] = useState<StudentFeeStatementResponse | null>(null);
  const [statementLoading, setStatementLoading] = useState(false);
  const [statementError, setStatementError] = useState<string | null>(null);
  const [exportingStatement, setExportingStatement] = useState(false);

  const loadArrears = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        buildBillingApiPath("/api/billing/student-balances?limit=50", tenantSlug),
        { cache: "no-store" },
      );
      const data = (await response.json().catch(() => null)) as
        | StudentFeeBalanceResponse[]
        | { message?: string }
        | null;
      if (!response.ok || !Array.isArray(data)) {
        throw new Error(data && "message" in data && data.message ? data.message : "Failed to load student balances.");
      }
      setBalances(data);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Student balances could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [tenantSlug]);

  useEffect(() => {
    void loadArrears();
  }, [loadArrears]);

  const arrears = useMemo(() => balances.filter((balance) => positiveMinor(balance.balance_amount_minor)), [balances]);
  const filteredArrears = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return arrears.filter((balance) => {
      const searchable = `${balance.student_name ?? ""} ${balance.student_id}`.toLowerCase();
      const matchesQuery = !normalizedQuery || searchable.includes(normalizedQuery);
      let matchesBand = true;
      try {
        const amount = BigInt(balance.balance_amount_minor);
        if (balanceFilter === "above-10000") matchesBand = amount >= BigInt(1_000_000);
        if (balanceFilter === "below-10000") matchesBand = amount < BigInt(1_000_000);
      } catch {
        matchesBand = false;
      }
      return matchesQuery && matchesBand;
    });
  }, [arrears, balanceFilter, query]);

  const totalArrearsMinor = useMemo(
    () => addMinor(arrears.map((balance) => balance.balance_amount_minor)),
    [arrears],
  );
  const aboveThresholdCount = useMemo(
    () => arrears.filter((balance) => {
      try {
        return BigInt(balance.balance_amount_minor) >= BigInt(1_000_000);
      } catch {
        return false;
      }
    }).length,
    [arrears],
  );

  async function sendArrearsReminders(targets: StudentFeeBalanceResponse[]) {
    const reminderKey = targets.length === 1 ? targets[0].student_id : "bulk";
    setSendingReminderFor(reminderKey);
    try {
      const result = await requestDashboardApi<{ message?: string }>("/admin-command/accountant/fee-follow-up", {
        method: "POST",
        body: {
          action: targets.length === 1 ? "student_arrears_reminder_requested" : "arrears_reminders_requested",
          title: targets.length === 1 ? "Student fee reminder queued" : "Fee arrears reminders queued",
          message: `${targets.length} arrears reminder${targets.length === 1 ? "" : "s"} queued for linked guardian and parent-portal follow-up.`,
          entity_type: "student_arrears",
          entity_id: targets.length === 1 ? targets[0].student_id : undefined,
          source_dashboard: "accountant-arrears-workspace",
          payload: {
            recipient_scope: "linked_guardians",
            arrears_count: targets.length,
            total_balance_minor: addMinor(targets.map((row) => row.balance_amount_minor)),
            students: targets.map((row) => ({
              student_id: row.student_id,
              student_name: row.student_name,
              balance_amount_minor: row.balance_amount_minor,
            })),
          },
        },
      });
      toast.success(result.message || (targets.length === 1 ? "Guardian reminder queued." : "Arrears reminders queued."));
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : "Failed to queue arrears reminders.");
    } finally {
      setSendingReminderFor(null);
    }
  }

  async function openStudentStatement(balance: StudentFeeBalanceResponse) {
    setStatement(null);
    setStatementError(null);
    setStatementLoading(true);
    try {
      const response = await fetch(
        buildBillingApiPath(
          `/api/billing/student-balances/${encodeURIComponent(balance.student_id)}/statement`,
          tenantSlug,
        ),
        { cache: "no-store" },
      );
      const payload = (await response.json().catch(() => null)) as
        | StudentFeeStatementResponse
        | { message?: string }
        | null;
      if (!response.ok || !payload || !("entries" in payload)) {
        throw new Error(payload && "message" in payload && payload.message ? payload.message : "Statement could not be loaded.");
      }
      setStatement(payload);
    } catch (caught) {
      setStatementError(caught instanceof Error ? caught.message : "Statement could not be loaded.");
    } finally {
      setStatementLoading(false);
    }
  }

  function printStatement() {
    if (!statement) return;
    openPrintDocument({
      eyebrow: "Student fee statement",
      title: statement.summary.student_name ?? "Student fee statement",
      subtitle: `Outstanding balance ${formatMinorKes(statement.summary.balance_amount_minor)} · ${statement.summary.invoice_count} invoice${statement.summary.invoice_count === 1 ? "" : "s"}`,
      rows: statement.entries.map((entry) => ({
        label: `${formatActivityDate(entry.occurred_at)} · ${entry.reference}`,
        value: entry.kind === "invoice"
          ? `Debit ${formatMinorKes(entry.debit_amount_minor)} · Balance ${formatMinorKes(entry.balance_after_minor)}`
          : `Credit ${formatMinorKes(entry.credit_amount_minor)} · Balance ${formatMinorKes(entry.balance_after_minor)}`,
      })),
      footer: "Generated from the current school's live invoice and receipt ledger.",
    });
  }

  async function exportStatement() {
    if (!statement) return;
    setExportingStatement(true);
    setStatementError(null);
    try {
      const response = await fetch(
        buildBillingApiPath(
          `/api/billing/student-balances/${encodeURIComponent(statement.summary.student_id)}/statement/export`,
          tenantSlug,
        ),
        { cache: "no-store" },
      );
      const payload = (await response.json().catch(() => null)) as
        | CsvReportArtifactResponse
        | { message?: string }
        | null;
      if (!response.ok || !payload || !("csv" in payload)) {
        throw new Error(payload && "message" in payload && payload.message ? payload.message : "Statement export could not be prepared.");
      }
      downloadTextFile({ filename: payload.filename, content: payload.csv, mimeType: payload.content_type });
    } catch (caught) {
      setStatementError(caught instanceof Error ? caught.message : "Statement export could not be prepared.");
    } finally {
      setExportingStatement(false);
    }
  }

  return (
    <div className="space-y-5 text-[#071D49]">
      <div className="rounded-xl border border-white/12 bg-white p-5 shadow-sm">
        <SchoolPageHeader
          eyebrow="Accountant"
          title="Student arrears"
          description="Prioritize outstanding balances, open exact statements, and queue guardian follow-up."
          actions={(
            <Button
              disabled={loading || arrears.length === 0 || sendingReminderFor !== null}
              onClick={() => void sendArrearsReminders(arrears)}
            >
              <BellRing className="h-4 w-4" aria-hidden="true" />
              {sendingReminderFor === "bulk" ? "Queuing…" : "Remind all guardians"}
            </Button>
          )}
        />
      </div>

      <section className="grid gap-3 md:grid-cols-3" aria-label="Arrears summary">
        {[
          ["Outstanding fees", formatMinorKes(totalArrearsMinor), "Across learners with open balances"],
          ["Learners in arrears", String(arrears.length), "Student accounts needing follow-up"],
          ["Above KES 10,000", String(aboveThresholdCount), "Higher-priority collection cases"],
        ].map(([label, value, helper]) => (
          <div key={label} className="rounded-xl border border-white/12 bg-white p-4 shadow-sm">
            <CircleDollarSign className="h-5 w-5 text-[#1D4ED8]" aria-hidden="true" />
            <p className="mt-3 text-xs font-black uppercase tracking-[0.12em] text-[#64748B]">{label}</p>
            <p className="mt-1 text-2xl font-black">{loading ? "…" : value}</p>
            <p className="mt-1 text-xs font-semibold text-[#64748B]">{helper}</p>
          </div>
        ))}
      </section>

      <section className="rounded-xl border border-white/12 bg-white p-4 shadow-sm">
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="font-black">Collection worklist</h3>
            <p className="mt-1 text-sm font-semibold text-[#64748B]">Search by learner name and focus follow-up by balance band.</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <label className="relative">
              <span className="sr-only">Search student arrears</span>
              <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-[#94A3B8]" aria-hidden="true" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search learner"
                className="h-10 rounded-lg border border-[#C8D5EA] pl-9 pr-3 text-sm outline-none focus:border-blue-400"
              />
            </label>
            <label>
              <span className="sr-only">Filter by arrears balance</span>
              <select
                value={balanceFilter}
                onChange={(event) => setBalanceFilter(event.target.value)}
                className="h-10 rounded-lg border border-[#C8D5EA] bg-white px-3 text-sm font-semibold outline-none focus:border-blue-400"
              >
                <option value="all">All balances</option>
                <option value="above-10000">KES 10,000 and above</option>
                <option value="below-10000">Below KES 10,000</option>
              </select>
            </label>
          </div>
        </div>

        {error ? (
          <div className="rounded-lg bg-rose-50 p-4 text-sm font-semibold text-rose-700" role="alert">
            <p>{error}</p>
            <Button className="mt-3" variant="secondary" onClick={() => void loadArrears()}>Retry</Button>
          </div>
        ) : loading ? (
          <div className="p-8 text-center text-sm font-semibold text-[#64748B]" aria-busy="true">Loading live student balances…</div>
        ) : (
          <DataTable
            rows={filteredArrears}
            getRowKey={(row) => row.student_id}
            columns={[
              { id: "student_name", header: "Student", render: (row) => <span className="font-bold">{row.student_name || "Unnamed student"}</span> },
              { id: "invoiced_amount_minor", header: "Invoiced", render: (row) => formatMinorKes(row.invoiced_amount_minor) },
              { id: "paid_amount_minor", header: "Paid", render: (row) => formatMinorKes(row.paid_amount_minor) },
              { id: "balance_amount_minor", header: "Arrears", render: (row) => <span className="font-black text-rose-600">{formatMinorKes(row.balance_amount_minor)}</span> },
              { id: "last_activity_at", header: "Last activity", render: (row) => row.last_activity_at ? formatActivityDate(row.last_activity_at) : "No activity date" },
              {
                id: "actions",
                header: "Actions",
                render: (row) => (
                  <div className="flex flex-wrap gap-1">
                    <Button size="sm" variant="secondary" onClick={() => void openStudentStatement(row)}>
                      <FileText className="h-3.5 w-3.5" aria-hidden="true" /> Statement
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={sendingReminderFor !== null}
                      onClick={() => void sendArrearsReminders([row])}
                    >
                      <BellRing className="h-3.5 w-3.5" aria-hidden="true" />
                      {sendingReminderFor === row.student_id ? "Queuing…" : "Remind"}
                    </Button>
                  </div>
                ),
              },
            ]}
            emptyMessage={arrears.length === 0
              ? "No learners currently have an outstanding fee balance."
              : "No arrears records match the current search and balance filter."}
          />
        )}
      </section>

      <Modal
        open={statementLoading || Boolean(statement) || Boolean(statementError)}
        onClose={() => { setStatement(null); setStatementError(null); setStatementLoading(false); }}
        title={statement?.summary.student_name ?? "Student fee statement"}
        description="Live invoices, receipts, and running fee balance."
        size="xl"
        footer={statement ? (
          <>
            <Button variant="secondary" onClick={printStatement}><FileText className="h-4 w-4" aria-hidden="true" /> Preview & print</Button>
            <Button onClick={() => void exportStatement()} disabled={exportingStatement}>
              <Download className="h-4 w-4" aria-hidden="true" />
              {exportingStatement ? "Exporting…" : "Download CSV"}
            </Button>
          </>
        ) : undefined}
      >
        {statementLoading ? (
          <div className="p-8 text-center text-sm font-semibold text-[#64748B]" aria-busy="true">Loading statement…</div>
        ) : statementError ? (
          <div className="rounded-lg bg-rose-50 p-4 text-sm font-semibold text-rose-700" role="alert">{statementError}</div>
        ) : statement ? (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg bg-[#F8FAFC] p-3"><p className="text-xs font-bold text-[#64748B]">Invoiced</p><p className="mt-1 font-black">{formatMinorKes(statement.summary.invoiced_amount_minor)}</p></div>
              <div className="rounded-lg bg-[#F8FAFC] p-3"><p className="text-xs font-bold text-[#64748B]">Paid / credited</p><p className="mt-1 font-black">{formatMinorKes(addMinor([statement.summary.paid_amount_minor, statement.summary.credit_amount_minor]))}</p></div>
              <div className="rounded-lg bg-rose-50 p-3"><p className="text-xs font-bold text-rose-600">Outstanding</p><p className="mt-1 font-black text-rose-700">{formatMinorKes(statement.summary.balance_amount_minor)}</p></div>
            </div>
            <div className="overflow-x-auto rounded-lg border border-[#D8E0EC]">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-[#F8FAFC] text-xs font-black uppercase tracking-[0.08em] text-[#64748B]"><tr><th className="px-3 py-2">Date</th><th className="px-3 py-2">Reference</th><th className="px-3 py-2">Description</th><th className="px-3 py-2">Debit</th><th className="px-3 py-2">Credit</th><th className="px-3 py-2">Balance</th></tr></thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {statement.entries.map((entry) => (
                    <tr key={entry.id}>
                      <td className="whitespace-nowrap px-3 py-2">{formatActivityDate(entry.occurred_at)}</td>
                      <td className="px-3 py-2 font-bold">{entry.reference}</td>
                      <td className="px-3 py-2">{entry.description}</td>
                      <td className="whitespace-nowrap px-3 py-2">{positiveMinor(entry.debit_amount_minor) ? formatMinorKes(entry.debit_amount_minor) : "—"}</td>
                      <td className="whitespace-nowrap px-3 py-2">{positiveMinor(entry.credit_amount_minor) ? formatMinorKes(entry.credit_amount_minor) : "—"}</td>
                      <td className="whitespace-nowrap px-3 py-2 font-black">{formatMinorKes(entry.balance_after_minor)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
