"use client";

import { useState, useEffect } from "react";
import { getCsrfToken } from "@/lib/auth/csrf-client";
import { SchoolPageHeader } from "@/components/school/school-page-header";
import { MetricGrid } from "@/components/experience/metric-grid";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import { getMissingFieldError, getApiResponseMessage } from "@/lib/forms/validation";
import { formatMinorKes, toMinorUnits } from "@/lib/billing/billing-utils";
import { buildBillingApiPath, buildPaymentsApiPath, unwrapApiData } from "@/lib/data/school-api-config";
er-picker";
import type { SchoolExperienceRole } from "@/lib/experiences/school-data";
import type { LearnerLookupItem } from "@/lib/students/student-lookup";
import { mpesaC2bStatusTone, manualReceiptSelectableMethods, manualReceiptMethodLabels, manualReceiptStatusTone, type ManualReceiptResponse, type MpesaC2bPaymentResponse, type ManualReceiptMethod } from "@/components/school/school-pages";
ction MPesaReconciliationWorkspace({
  role,
  tenantSlug,
}: {
  role: SchoolExperienceRole;
  tenantSlug?: string | null;
}) {
  const [rows, setRows] = useState<MpesaC2bPaymentResponse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadTransactions() {
      try {
        const response = await fetch(
          buildPaymentsApiPath("/api/payments/mpesa/c2b/payments", tenantSlug),
          { cache: "no-store" }
        );
        if (!response.ok) return;
        const payload = await response.json();
        const payments = unwrapApiData<MpesaC2bPaymentResponse[]>(payload);
        if (active && Array.isArray(payments)) {
          setRows(payments);
        }
      } catch (err) {
        // ignore
      } finally {
        if (active) setLoading(false);
      }
    }

    loadTransactions();
    return () => {
      active = false;
    };
  }, [tenantSlug]);

  const metrics = [
    { id: "received", label: "Total Transactions", value: rows.length.toString(), helper: "All time" },
    { id: "pending", label: "Pending Review", value: rows.filter((r) => r.status === "pending_review").length.toString(), helper: "Needs action" },
    { id: "matched", label: "Matched", value: rows.filter((r) => r.status === "matched").length.toString(), helper: "Fully cleared" },
  ];

  return (
    <div className="space-y-6">
      <SchoolPageHeader
        eyebrow="MPESA"
        title="Mobile money reconciliation"
        description="Handle auto-matching, manual review, callback confidence, and duplicate detection from one focused page."
      />
      <MetricGrid items={metrics} />
      <DataTable
        title="MPESA transactions"
        subtitle={loading ? "Loading transactions..." : "Phone, amount, receipt code, status, and matched learner."}
        columns={[
          { id: "phone", header: "Phone", render: (row) => row.phone_number || "-" },
          { id: "amount", header: "Amount", render: (row) => row.amount_minor, className: "text-right font-semibold", headerClassName: "text-right" },
          { id: "code", header: "Code", render: (row) => row.trans_id },
          { id: "status", header: "Status", render: (row) => <StatusPill label={row.status.replace("_", " ")} tone={row.status === "matched" ? "ok" : "warning"} /> },
          { id: "matchedStudent", header: "Matched Student", render: (row) => row.matched_student_id || "-" },
          { id: "receivedAt", header: "Received", render: (row) => new Date(row.received_at).toLocaleString() },
        ]}
        rows={rows}
        getRowKey={(row) => row.id}
      />
      <MpesaC2bReviewPanel tenantSlug={tenantSlug} />
      <ManualReceiptsPanel tenantSlug={tenantSlug} />
    </div>
  );
}
function MpesaC2bReviewPanel({ tenantSlug }: { tenantSlug?: string | null }) {
  const [payments, setPayments] = useState<MpesaC2bPaymentResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [reconciling, setReconciling] = useState(false);
  const [selectedPaymentId, setSelectedPaymentId] = useState("");
  const [invoiceId, setInvoiceId] = useState("");
  const [studentId, setStudentId] = useState("");
  const [selectedReviewLearner, setSelectedReviewLearner] = useState<LearnerLookupItem | null>(null);
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadPendingPayments() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(
          buildPaymentsApiPath("/api/payments/mpesa/c2b/payments?status=pending_review", tenantSlug),
          { cache: "no-store" },
        );

        if (!response.ok) {
          throw new Error("Pending Paybill deposits could not be loaded.");
        }

        const payload = (await response.json().catch(() => null)) as
          | MpesaC2bPaymentResponse[]
          | { data?: MpesaC2bPaymentResponse[]; message?: string }
          | null;
        const pendingPayments = unwrapApiData<MpesaC2bPaymentResponse[]>(payload);

        if (!Array.isArray(pendingPayments)) {
          throw new Error(getApiResponseMessage(payload) ?? "Pending Paybill deposits could not be loaded.");
        }

        if (active) {
          setPayments(pendingPayments);
          setSelectedPaymentId((current) => current || pendingPayments[0]?.id || "");
        }
      } catch (caught) {
        if (active) {
          setError(caught instanceof Error ? caught.message : "Pending Paybill deposits could not be loaded.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadPendingPayments();

    return () => {
      active = false;
    };
  }, [tenantSlug]);

  async function reconcilePayment() {
    const validationError = getMissingFieldError([
      { label: "Payment", value: selectedPaymentId },
      { label: "Invoice or student", value: invoiceId || studentId },
    ]);

    if (validationError) {
      setError(validationError);
      return;
    }

    setReconciling(true);
    setError(null);
    setMessage(null);

    try {
      const csrfToken = await getCsrfToken();
      const response = await fetch(
        buildPaymentsApiPath(`/api/payments/mpesa/c2b/payments/${selectedPaymentId}/reconcile`, tenantSlug),
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-myshule-csrf": csrfToken,
          },
          body: JSON.stringify({
            invoice_id: invoiceId.trim() || undefined,
            student_id: studentId.trim() || undefined,
            notes: notes.trim() || undefined,
          }),
        },
      );
      const payload = (await response.json().catch(() => null)) as
        | MpesaC2bPaymentResponse
        | { data?: MpesaC2bPaymentResponse; message?: string }
        | { message?: string }
        | null;
      const reconciledPayment = unwrapApiData<MpesaC2bPaymentResponse>(payload);

      if (!response.ok || !reconciledPayment?.id) {
        const responseMessage = getApiResponseMessage(payload);

        throw new Error(
          responseMessage ?? "Paybill deposit could not be reconciled.",
        );
      }

      setPayments((current) => current.filter((payment) => payment.id !== reconciledPayment.id));
      setMessage(`${reconciledPayment.trans_id} reconciled and posted to the fee ledger.`);
      setSelectedPaymentId("");
      setInvoiceId("");
      setStudentId("");
      setSelectedReviewLearner(null);
      setNotes("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Paybill deposit could not be reconciled.");
    } finally {
      setReconciling(false);
    }
  }

  return (
    <section className="space-y-5 rounded-xl border border-border bg-surface px-5 py-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Paybill review</p>
          <h3 className="mt-1 text-lg font-semibold text-foreground">Unmatched direct M-PESA deposits</h3>
        </div>
        <div className="grid gap-2 sm:grid-cols-4">
          <select
            aria-label="Pending Paybill payment"
            className="input-base sm:col-span-2"
            value={selectedPaymentId}
            onChange={(event) => setSelectedPaymentId(event.target.value)}
          >
            <option value="">Select deposit</option>
            {payments.map((payment) => (
              <option key={payment.id} value={payment.id}>
                {payment.trans_id} - {formatMinorKes(payment.amount_minor)}
              </option>
            ))}
          </select>
          <input
            aria-label="Invoice reference"
            className="input-base"
            placeholder="Invoice number"
            value={invoiceId}
            onChange={(event) => setInvoiceId(event.target.value)}
          />
          <div className="sm:col-span-2">
            <LearnerPicker
              label="Learner name or admission number"
              tenantSlug={tenantSlug ?? ""}
              value={selectedReviewLearner}
              onChange={(learner) => {
                setSelectedReviewLearner(learner);
                setStudentId(learner?.id ?? "");
              }}
            />
          </div>
          <input
            aria-label="Reconciliation notes"
            className="input-base sm:col-span-3"
            placeholder="Review note"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
          />
          <Button onClick={reconcilePayment} disabled={reconciling}>
            {reconciling ? "Posting..." : "Reconcile"}
          </Button>
        </div>
      </div>
      {message ? (
        <div aria-live="polite" className="rounded-xl border border-success/20 bg-success/10 px-4 py-3 text-sm text-foreground">
          {message}
        </div>
      ) : null}
      {error ? (
        <div role="alert" className="rounded-xl border border-danger/20 bg-danger/10 px-4 py-3 text-sm text-foreground">
          {error}
        </div>
      ) : null}
      <DataTable
        title="Pending Paybill deposits"
        subtitle={loading ? "Loading unmatched deposits..." : "Direct customer-to-business payments waiting for accountant review."}
        columns={[
          { id: "code", header: "Code", render: (row) => row.trans_id },
          { id: "amount", header: "Amount", render: (row) => formatMinorKes(row.amount_minor), className: "text-right font-semibold", headerClassName: "text-right" },
          { id: "phone", header: "Phone", render: (row) => row.phone_number ?? "Unknown" },
          { id: "reference", header: "Reference", render: (row) => row.bill_ref_number ?? row.invoice_number ?? "Missing" },
          { id: "status", header: "Status", render: (row) => <StatusPill label={row.status.replace("_", " ")} tone={mpesaC2bStatusTone[row.status]} /> },
        ]}
        rows={payments}
        getRowKey={(row) => row.id}
        emptyMessage={loading ? "Loading pending Paybill deposits..." : "No unmatched Paybill deposits need review."}
      />
    </section>
  );
}

function ManualReceiptsPanel({ tenantSlug }: { tenantSlug?: string | null }) {
  const [receipts, setReceipts] = useState<ManualReceiptResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState({
    payment_method: "cheque" as ManualReceiptMethod,
    amount: "",
    student_id: "",
    invoice_id: "",
    payer_name: "",
    cheque_number: "",
    drawer_bank: "",
    deposit_reference: "",
    asset_account_code: "1120-BANK-CLEARING",
    fee_control_account_code: "1100-AR-FEES",
    notes: "",
  });
  const [selectedReceiptLearner, setSelectedReceiptLearner] = useState<LearnerLookupItem | null>(null);

  useEffect(() => {
    let active = true;

    async function loadReceipts() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(buildBillingApiPath("/api/billing/manual-fee-payments", tenantSlug), {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Manual receipts could not be loaded.");
        }

        const payload = (await response.json()) as ManualReceiptResponse[];

        if (active) {
          setReceipts(payload);
        }
      } catch (caught) {
        if (active) {
          setError(caught instanceof Error ? caught.message : "Manual receipts could not be loaded.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadReceipts();

    return () => {
      active = false;
    };
  }, [tenantSlug]);

  async function submitReceipt() {
    const amountMinor = toMinorUnits(draft.amount);
    const validationError = getMissingFieldError([
      { label: "Amount", value: draft.amount },
      { label: "Student or invoice", value: draft.student_id || draft.invoice_id },
      ...(draft.payment_method === "cheque"
        ? [
            { label: "Cheque number", value: draft.cheque_number },
            { label: "Drawer bank", value: draft.drawer_bank },
          ]
        : []),
    ]);

    if (validationError) {
      setError(validationError);
      return;
    }

    if (!amountMinor) {
      setError("Enter a valid amount.");
      return;
    }

    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const csrfToken = await getCsrfToken();
      const response = await fetch(buildBillingApiPath("/api/billing/manual-fee-payments", tenantSlug), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-myshule-csrf": csrfToken,
        },
        body: JSON.stringify({
          idempotency_key: `manual-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          payment_method: draft.payment_method,
          amount_minor: amountMinor,
          student_id: draft.student_id.trim() || undefined,
          invoice_id: draft.invoice_id.trim() || undefined,
          payer_name: draft.payer_name.trim() || undefined,
          cheque_number: draft.cheque_number.trim() || undefined,
          drawer_bank: draft.drawer_bank.trim() || undefined,
          deposit_reference: draft.deposit_reference.trim() || undefined,
          asset_account_code: draft.asset_account_code.trim() || undefined,
          fee_control_account_code: draft.fee_control_account_code.trim() || undefined,
          notes: draft.notes.trim() || undefined,
        }),
      });
      const payload = (await response.json().catch(() => null)) as
        | ManualReceiptResponse
        | { message?: string }
        | null;

      if (!response.ok || !payload || !("id" in payload)) {
        throw new Error(
          payload && "message" in payload && payload.message
            ? payload.message
            : "Manual receipt could not be saved.",
        );
      }

      setReceipts((current) => [payload, ...current.filter((row) => row.id !== payload.id)]);
      setMessage(
        payload.status === "cleared"
          ? `${payload.receipt_number} cleared and posted.`
          : `${payload.receipt_number} recorded pending clearance.`,
      );
      setDraft((current) => ({
        ...current,
        student_id: "",
        invoice_id: "",
        amount: "",
        payer_name: "",
        cheque_number: "",
        drawer_bank: "",
        deposit_reference: "",
        notes: "",
      }));
      setSelectedReceiptLearner(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Manual receipt could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  async function runReceiptAction(receipt: ManualReceiptResponse, action: "deposit" | "clear" | "bounce" | "reverse") {
    setError(null);
    setMessage(null);

    try {
      const csrfToken = await getCsrfToken();
      const response = await fetch(
        buildBillingApiPath(`/api/billing/manual-fee-payments/${receipt.id}/${action}`, tenantSlug),
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-myshule-csrf": csrfToken,
          },
          body: JSON.stringify({
            occurred_at: new Date().toISOString(),
            notes:
              action === "bounce"
                ? "Cheque returned unpaid"
                : action === "reverse"
                  ? "Manual receipt reversed by accountant"
                  : undefined,
          }),
        },
      );
      const payload = (await response.json().catch(() => null)) as
        | ManualReceiptResponse
        | { message?: string }
        | null;

      if (!response.ok || !payload || !("id" in payload)) {
        throw new Error(
          payload && "message" in payload && payload.message
            ? payload.message
            : "Receipt action failed.",
        );
      }

      setReceipts((current) => current.map((row) => (row.id === payload.id ? payload : row)));
      setMessage(`${payload.receipt_number} is now ${payload.status.replace("_", " ")}.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Receipt action failed.");
    }
  }

  return (
    <section className="space-y-5 rounded-xl border border-border bg-surface px-5 py-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Manual receipts</p>
          <h3 className="mt-1 text-lg font-semibold text-foreground">Cheque, cash, bank deposit, and EFT</h3>
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          <select
            aria-label="Payment method"
            className="input-base"
            value={draft.payment_method}
            onChange={(event) => {
              const method = event.target.value as ManualReceiptMethod;
              setDraft((current) => ({
                ...current,
                payment_method: method,
                asset_account_code: method === "cash" ? "1010-CASH-ON-HAND" : "1120-BANK-CLEARING",
              }));
            }}
          >
            {manualReceiptSelectableMethods.map((method) => (
              <option key={method} value={method}>
                {manualReceiptMethodLabels[method]}
              </option>
            ))}
          </select>
          <input
            aria-label="Manual receipt amount"
            className="input-base"
            inputMode="decimal"
            placeholder="Amount"
            value={draft.amount}
            onChange={(event) => setDraft((current) => ({ ...current, amount: event.target.value }))}
          />
          <Button onClick={submitReceipt} disabled={saving}>
            {saving ? "Saving..." : "Record receipt"}
          </Button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <input
          aria-label="Invoice reference"
          className="input-base"
          placeholder="Invoice number or receipt reference"
          value={draft.invoice_id}
          onChange={(event) => setDraft((current) => ({ ...current, invoice_id: event.target.value }))}
        />
        <div className="lg:col-span-2">
          <LearnerPicker
            label="Learner name or admission number"
            tenantSlug={tenantSlug ?? ""}
            value={selectedReceiptLearner}
            onChange={(learner) => {
              setSelectedReceiptLearner(learner);
              setDraft((current) => ({
                ...current,
                student_id: learner?.id ?? "",
                payer_name: learner?.name ?? current.payer_name,
              }));
            }}
          />
        </div>
        <input
          aria-label="Payer name"
          className="input-base"
          placeholder="Payer name"
          value={draft.payer_name}
          onChange={(event) => setDraft((current) => ({ ...current, payer_name: event.target.value }))}
        />
        <input
          aria-label="Deposit reference"
          className="input-base"
          placeholder="Deposit/reference"
          value={draft.deposit_reference}
          onChange={(event) => setDraft((current) => ({ ...current, deposit_reference: event.target.value }))}
        />
        {draft.payment_method === "cheque" ? (
          <>
            <input
              aria-label="Cheque number"
              className="input-base"
              placeholder="Cheque number"
              value={draft.cheque_number}
              onChange={(event) => setDraft((current) => ({ ...current, cheque_number: event.target.value }))}
            />
            <input
              aria-label="Drawer bank"
              className="input-base"
              placeholder="Drawer bank"
              value={draft.drawer_bank}
              onChange={(event) => setDraft((current) => ({ ...current, drawer_bank: event.target.value }))}
            />
          </>
        ) : null}
        <input
          aria-label="Asset account code"
          className="input-base"
          placeholder="Asset account"
          value={draft.asset_account_code}
          onChange={(event) => setDraft((current) => ({ ...current, asset_account_code: event.target.value }))}
        />
        <input
          aria-label="Fee control account code"
          className="input-base"
          placeholder="Fee control account"
          value={draft.fee_control_account_code}
          onChange={(event) => setDraft((current) => ({ ...current, fee_control_account_code: event.target.value }))}
        />
      </div>

      {message ? (
        <div aria-live="polite" className="mt-4 rounded-xl border border-success/20 bg-success/10 px-4 py-3 text-sm text-foreground">
          {message}
        </div>
      ) : null}
      {error ? (
        <div role="alert" className="mt-4 rounded-xl border border-danger/20 bg-danger/10 px-4 py-3 text-sm text-foreground">
          {error}
        </div>
      ) : null}

      <div>
        <DataTable
          title="Manual receipt register"
          subtitle={loading ? "Loading accountant receipts..." : "Receipts, clearance state, and ledger posting references."}
          columns={[
            { id: "receipt", header: "Receipt", render: (row) => row.receipt_number },
            { id: "method", header: "Method", render: (row) => manualReceiptMethodLabels[row.payment_method] },
            { id: "amount", header: "Amount", render: (row) => formatMinorKes(row.amount_minor), className: "text-right font-semibold", headerClassName: "text-right" },
            { id: "status", header: "Status", render: (row) => <StatusPill label={row.status.replace("_", " ")} tone={manualReceiptStatusTone[row.status]} /> },
            { id: "target", header: "Target", render: (row) => row.invoice_id ?? row.student_id ?? "Unassigned" },
            { id: "reference", header: "Reference", render: (row) => row.cheque_number ?? row.deposit_reference ?? row.ledger_transaction_id ?? "Pending" },
            {
              id: "actions",
              header: "Actions",
              render: (row) => (
                <div className="flex flex-wrap gap-2">
                  {row.payment_method === "cheque" && row.status === "received" ? (
                    <Button variant="secondary" onClick={() => void runReceiptAction(row, "deposit")}>
                      Deposit
                    </Button>
                  ) : null}
                  {["received", "deposited"].includes(row.status) ? (
                    <Button variant="secondary" onClick={() => void runReceiptAction(row, "clear")}>
                      Clear
                    </Button>
                  ) : null}
                  {row.payment_method === "cheque" && ["received", "deposited"].includes(row.status) ? (
                    <Button variant="secondary" onClick={() => void runReceiptAction(row, "bounce")}>
                      Bounce
                    </Button>
                  ) : null}
                  {row.status === "cleared" ? (
                    <Button variant="secondary" onClick={() => void runReceiptAction(row, "reverse")}>
                      Reverse
                    </Button>
                  ) : null}
                </div>
              ),
            },
          ]}
          rows={receipts}
          getRowKey={(row) => row.id}
          emptyMessage={loading ? "Loading manual receipts..." : "No manual receipts have been recorded yet."}
        />
      </div>
    </section>
  );
}









