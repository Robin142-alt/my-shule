"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { SchoolExperienceRole } from "@/lib/experiences/school-data";
import { SchoolPageHeader } from "@/components/school/school-page-header";
import { DataTable } from "@/components/ui/data-table";
import { buildBillingApiPath, formatActivityDate, formatMinorKes, toMinorUnits } from "@/lib/billing/billing-utils";
import { StatusPill } from "@/components/ui/status-pill";
import { FinanceActivityResponse, FinanceActivityRow } from "@/components/school/school-pages";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { getCsrfToken } from "@/lib/auth/csrf-client";
import { openPrintDocument } from "@/lib/dashboard/export";
import { requestDashboardApi } from "@/lib/dashboard/api-client";
import { toast } from "sonner";

type SchoolRouteMode = "hosted" | "public";

export function ReceiptsWorkspace({
  role,
  tenantSlug,
}: {
  role: SchoolExperienceRole;
  tenantSlug?: string | null;
  routeMode?: SchoolRouteMode;
  activeSection?: string;
}) {
  const [activities, setActivities] = useState<FinanceActivityResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentDraft, setPaymentDraft] = useState({
    payment_method: "cash",
    amount: "",
    payer_name: "",
    student_id: "",
    reference: "",
  });
  const [submittingPayment, setSubmittingPayment] = useState(false);

  const loadReceipts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        buildBillingApiPath("/api/billing/finance-activity?limit=100&offset=0", tenantSlug),
        { cache: "no-store" }
      );

      if (!response.ok) {
        throw new Error("Failed to load receipts.");
      }

      const data = (await response.json()) as FinanceActivityResponse[];
      setActivities(data);
    } catch (e: any) {
      setError(e.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  }, [tenantSlug]);

  useEffect(() => {
    void loadReceipts();
  }, [loadReceipts]);

  const rows = useMemo(() => {
    return activities
      .filter((activity) => activity.kind === "receipt")
      .map((activity) => ({
        id: activity.id,
        student: activity.student_name ?? activity.student_id ?? "Unknown",
        amount: formatMinorKes(activity.amount_minor),
        method: activity.method,
        date: formatActivityDate(activity.occurred_at),
        reference: activity.reference,
        status: activity.status,
        statusTone: activity.status === "completed" || activity.status === "cleared" ? "ok" : "warning",
      } as FinanceActivityRow));
  }, [activities]);

  function openPaymentModal() {
    setPaymentDraft({
      payment_method: "cash",
      amount: "",
      payer_name: "",
      student_id: "",
      reference: "",
    });
    setShowPaymentModal(true);
  }

  async function savePayment() {
    const amountMinor = toMinorUnits(paymentDraft.amount);
    if (!amountMinor) {
      toast.error("Enter a valid receipt amount.");
      return;
    }

    setSubmittingPayment(true);
    try {
      const csrfToken = await getCsrfToken();
      const response = await fetch(buildBillingApiPath("/api/billing/manual-fee-payments", tenantSlug), {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "content-type": "application/json",
          "x-myshule-csrf": csrfToken,
        },
        body: JSON.stringify({
          idempotency_key: `manual-receipt-${Date.now()}`,
          payment_method: paymentDraft.payment_method,
          amount_minor: amountMinor,
          payer_name: paymentDraft.payer_name || undefined,
          student_id: paymentDraft.student_id || undefined,
          deposit_reference: paymentDraft.reference || undefined,
          external_reference: paymentDraft.reference || undefined,
          received_at: new Date().toISOString(),
          metadata: { source_dashboard: "accountant-receipts-workspace" },
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.message || "Manual receipt could not be recorded.");
      }

      await requestDashboardApi("/admin-command/accountant/actions", {
        method: "POST",
        body: {
          action: "manual_receipt_recorded",
          title: "Manual receipt recorded",
          message: `Manual receipt ${payload?.receipt_number || paymentDraft.reference || ""} was recorded.`,
          entity_type: "manual_fee_payment",
          entity_id: payload?.id,
          source_dashboard: "accountant-receipts-workspace",
          payload,
        },
      });

      toast.success("Manual receipt recorded and added to finance activity.");
      setShowPaymentModal(false);
      await loadReceipts();
    } catch (e: any) {
      toast.error(e?.message || "Manual receipt could not be recorded.");
    } finally {
      setSubmittingPayment(false);
    }
  }

  async function openReceiptPreview(row: FinanceActivityRow) {
    openPrintDocument({
      eyebrow: "Fee receipt",
      title: `Receipt ${row.reference}`,
      subtitle: `Receipt preview for ${row.student}`,
      rows: [
        { label: "Student", value: row.student },
        { label: "Amount", value: row.amount },
        { label: "Method", value: row.method },
        { label: "Date", value: row.date },
        { label: "Reference", value: row.reference },
        { label: "Status", value: row.status },
      ],
      footer: "Generated from live MyShule finance activity.",
    });

    await requestDashboardApi("/admin-command/accountant/actions", {
      method: "POST",
      body: {
        action: "receipt_previewed",
        title: "Receipt print preview generated",
        message: `Receipt ${row.reference} print preview was generated from live finance activity.`,
        entity_type: "finance_receipt",
        entity_id: row.id,
        source_dashboard: "accountant-receipts-workspace",
        payload: row as unknown as Record<string, unknown>,
      },
    }).catch(() => undefined);
  }

  return (
    <div className="space-y-6">
      <SchoolPageHeader
        eyebrow="Accountant"
        title="Receipts"
        description="View and manage all payment receipts."
        actions={
          <Button variant="default" onClick={openPaymentModal}>
            Record Manual Receipt
          </Button>
        }
      />

      <div className="rounded-md border border-slate-200 bg-white p-6 shadow-sm">
        {error ? (
          <div className="rounded-md bg-red-50 p-4 text-sm text-red-600">
            {error}
          </div>
        ) : (
          <DataTable
            rows={rows}
            getRowKey={(row: any) => row.id || row.reference || `${row.date}-${row.student}-${row.amount}`}
            columns={[
              { id: "date", header: "Date", render: (row: any) => row.date },
              { id: "student", header: "Student", render: (row: any) => row.student },
              { id: "amount", header: "Amount", render: (row: any) => row.amount },
              { id: "method", header: "Method", render: (row: any) => row.method },
              { id: "reference", header: "Reference", render: (row: any) => row.reference },
              {
                id: "status",
                header: "Status",
                render: (row: any) => <StatusPill tone={row.statusTone} label={row.status} />,
              },
              {
                id: "actions",
                header: "",
                render: (row: any) => (
                  <Button variant="ghost" size="sm" onClick={() => openReceiptPreview(row)}>
                    View
                  </Button>
                )
              }
            ]}
            emptyMessage="No receipts found."
          />
        )}
      </div>

      <Modal
        open={showPaymentModal}
        title="Record manual receipt"
        description="Record a cash, cheque, bank deposit, or EFT receipt in the live finance ledger."
        onClose={() => setShowPaymentModal(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowPaymentModal(false)}>Cancel</Button>
            <Button onClick={savePayment} disabled={submittingPayment}>{submittingPayment ? "Saving..." : "Save receipt"}</Button>
          </>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1 text-sm">
            <span className="font-medium">Method</span>
            <select
              className="w-full rounded-md border px-3 py-2 text-sm"
              value={paymentDraft.payment_method}
              onChange={(event) => setPaymentDraft((current) => ({ ...current, payment_method: event.target.value }))}
            >
              <option value="cash">Cash</option>
              <option value="cheque">Cheque</option>
              <option value="bank_deposit">Bank deposit</option>
              <option value="eft">EFT</option>
            </select>
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium">Amount (KES)</span>
            <input
              className="w-full rounded-md border px-3 py-2 text-sm"
              value={paymentDraft.amount}
              onChange={(event) => setPaymentDraft((current) => ({ ...current, amount: event.target.value }))}
              placeholder="2500"
              inputMode="decimal"
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium">Payer name</span>
            <input
              className="w-full rounded-md border px-3 py-2 text-sm"
              value={paymentDraft.payer_name}
              onChange={(event) => setPaymentDraft((current) => ({ ...current, payer_name: event.target.value }))}
              placeholder="Guardian or sponsor"
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium">Student ID (optional)</span>
            <input
              className="w-full rounded-md border px-3 py-2 text-sm"
              value={paymentDraft.student_id}
              onChange={(event) => setPaymentDraft((current) => ({ ...current, student_id: event.target.value }))}
              placeholder="UUID if linking directly"
            />
          </label>
          <label className="space-y-1 text-sm sm:col-span-2">
            <span className="font-medium">Reference</span>
            <input
              className="w-full rounded-md border px-3 py-2 text-sm"
              value={paymentDraft.reference}
              onChange={(event) => setPaymentDraft((current) => ({ ...current, reference: event.target.value }))}
              placeholder="Bank slip, cheque, or office reference"
            />
          </label>
        </div>
      </Modal>
    </div>
  );
}
