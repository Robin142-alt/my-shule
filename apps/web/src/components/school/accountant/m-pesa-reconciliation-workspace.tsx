"use client";

import { useState, useEffect } from "react";
import { getCsrfToken } from "@/lib/auth/csrf-client";
import { SchoolPageHeader } from "@/components/school/school-page-header";
import { MetricGrid } from "@/components/experience/metric-grid";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import { getMissingFieldError, getApiResponseMessage } from "@/lib/forms/validation";
import { formatMinorKes } from "@/lib/billing/billing-utils";
import { buildPaymentsApiPath, unwrapApiData } from "@/lib/data/school-api-config";
import { LearnerPicker } from "@/components/common/learner-picker";
import { usePermissions } from "@/components/providers/permission-context";
import type { SchoolExperienceRole } from "@/lib/experiences/school-data";
import type { LearnerLookupItem } from "@/lib/students/student-lookup";
import { mpesaC2bStatusTone, type MpesaC2bPaymentResponse } from "@/components/school/school-pages";

export function MPesaReconciliationWorkspace({
  tenantSlug,
  onNavigate,
}: {
  role: SchoolExperienceRole;
  tenantSlug?: string | null;
  onNavigate?: (section: string) => void;
}) {
  const [rows, setRows] = useState<MpesaC2bPaymentResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  const [page, setPage] = useState(0);

  useEffect(() => {
    let active = true;

    async function loadTransactions() {
      try {
        const response = await fetch(
          buildPaymentsApiPath(`/api/payments/mpesa/c2b/payments?limit=50&offset=${page * 50}`, tenantSlug),
          { cache: "no-store" }
        );
        if (!response.ok) throw new Error("M-Pesa transactions could not be loaded.");
        const payload = await response.json();
        const payments = unwrapApiData<MpesaC2bPaymentResponse[]>(payload);
        if (active && Array.isArray(payments)) {
          setRows(payments);
        }
      } catch (err) {
        if (active) setLoadError(err instanceof Error ? err.message : "M-Pesa transactions could not be loaded.");
      } finally {
        if (active) setLoading(false);
      }
    }

    loadTransactions();
    return () => {
      active = false;
    };
  }, [tenantSlug, reload, page]);

  const metrics = [
    { id: "received", label: "Transactions on this page", value: rows.length.toString(), helper: `Page ${page + 1}` },
    { id: "pending", label: "Needs attention", value: rows.filter((r) => !["matched", "rejected", "reversed"].includes(r.status)).length.toString(), helper: "On this page" },
    { id: "matched", label: "Posted", value: rows.filter((r) => r.status === "matched").length.toString(), helper: "Cleared on this page" },
  ];

  return (
    <div className="space-y-6">
      <SchoolPageHeader
        eyebrow="MPESA"
        title="Mobile money reconciliation"
        description="Handle auto-matching, manual review, callback confidence, and duplicate detection from one focused page."
      />
      {loadError && <p role="alert" className="text-danger">{loadError}</p>}
      <Button variant="secondary" onClick={() => { setLoadError(null); setLoading(true); setReload(value => value + 1); }}>Refresh M-Pesa transactions</Button>
      <MetricGrid items={metrics} />
      <DataTable
        title="MPESA transactions"
        subtitle={loading ? "Loading transactions..." : "Phone, amount, receipt code, status, and matched learner."}
        columns={[
          { id: "phone", header: "Phone", render: (row) => row.phone_number || "-" },
          { id: "amount", header: "Amount", render: (row) => formatMinorKes(row.amount_minor), className: "text-right font-semibold", headerClassName: "text-right" },
          { id: "code", header: "Code", render: (row) => row.trans_id },
          { id: "status", header: "Status", render: (row) => <StatusPill label={row.status.replace("_", " ")} tone={row.status === "matched" ? "ok" : "warning"} /> },
          { id: "matchedStudent", header: "Matched Student", render: (row) => row.matched_student_id || "-" },
          { id: "receivedAt", header: "Received", render: (row) => new Date(row.received_at).toLocaleString() },
        ]}
        rows={rows}
        getRowKey={(row) => row.id}
      />
      <div className="flex items-center justify-end gap-3"><Button variant="secondary" disabled={!page || loading} onClick={() => { setLoading(true); setPage(value => value - 1); }}>Previous page</Button><span>Page {page + 1}</span><Button variant="secondary" disabled={rows.length < 50 || loading} onClick={() => { setLoading(true); setPage(value => value + 1); }}>Next page</Button></div>
      <MpesaC2bReviewPanel tenantSlug={tenantSlug} reload={reload} onReconciled={() => setReload(value => value + 1)} />
      <p className="text-sm text-muted">Cash and cheque receipts are managed in Payments. Bank statement entries and new provider exceptions are managed in Collections.</p>
      {onNavigate && <div className="flex flex-wrap gap-2"><Button variant="secondary" onClick={() => onNavigate("payments")}>Cash &amp; cheques</Button><Button variant="secondary" onClick={() => onNavigate("collections")}>Bank / M-Pesa collections</Button></div>}
    </div>
  );
}
function MpesaC2bReviewPanel({ tenantSlug, reload, onReconciled }: { tenantSlug?: string | null; reload: number; onReconciled: () => void }) {
  const { hasPermission } = usePermissions();
  const [payments, setPayments] = useState<MpesaC2bPaymentResponse[]>([]);
  const [reviewPage, setReviewPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [reconciling, setReconciling] = useState(false);
  const [selectedPaymentId, setSelectedPaymentId] = useState("");
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
          buildPaymentsApiPath(`/api/payments/mpesa/c2b/payments?status=verified_unmatched&limit=50&offset=${reviewPage * 50}`, tenantSlug),
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
          setSelectedPaymentId(current => pendingPayments.some(payment => payment.id === current) ? current : pendingPayments[0]?.id || "");
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
  }, [tenantSlug, reload, reviewPage]);

  async function reconcilePayment() {
    if (reconciling || !hasPermission("finance:write")) return;
    const validationError = getMissingFieldError([
      { label: "Payment", value: selectedPaymentId },
      { label: "Learner", value: studentId },
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
      setStudentId("");
      setSelectedReviewLearner(null);
      setNotes("");
      onReconciled();
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
          <p className="mt-1 text-sm text-muted">Only provider-verified deposits can be assigned. Select the learner; existing invoice balances are allocated automatically. Verification failures remain in Collections &amp; exceptions.</p>
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
          <Button onClick={reconcilePayment} disabled={reconciling || loading || !hasPermission("finance:write") || !selectedPaymentId || !studentId}>
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
      <div className="flex items-center justify-end gap-3"><Button variant="secondary" disabled={!reviewPage || loading} onClick={() => setReviewPage(value => value - 1)}>Previous verified deposits</Button><Button variant="secondary" disabled={payments.length < 50 || loading} onClick={() => setReviewPage(value => value + 1)}>More verified deposits</Button></div>
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
