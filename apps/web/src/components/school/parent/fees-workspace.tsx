"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { AlertTriangle, CheckCircle, CreditCard, FileText } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { requestDashboardApi } from "@/lib/dashboard/api-client";
import { openPrintDocument } from "@/lib/dashboard/export";
import { useSchoolQuery } from "@/lib/data/school-hooks";

type FeeAccount = {
  student_id: string;
  admission_number?: string | null;
  student_name: string;
  class_name?: string | null;
  balance_minor: number;
  open_invoices: number;
};

type FeeInvoice = {
  id: string;
  student_id: string;
  student_name: string;
  invoice_number?: string | null;
  term?: string | null;
  academic_year?: string | null;
  amount_minor: number;
  balance_minor: number;
  status: string;
  created_at: string;
};

type FeeTransaction = {
  id: string;
  student_id: string;
  student_name: string;
  receipt_number?: string | null;
  payment_method?: string | null;
  amount_minor: number;
  status: string;
  created_at: string;
};

type ParentFeesData = {
  metrics: {
    balance_minor: number;
    open_invoices: number;
    payments: number;
  };
  accounts: FeeAccount[];
  invoices: FeeInvoice[];
  transactions: FeeTransaction[];
};

export function FeesWorkspace() {
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [isPaying, setIsPaying] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [paymentPhone, setPaymentPhone] = useState("");
  const [paymentError, setPaymentError] = useState<string | null>(null);

  const {
    data,
    isLoading,
    error,
    refetch,
  } = useSchoolQuery<ParentFeesData>("/admin-command/parent/fees");

  const accounts = data?.accounts ?? [];

  useEffect(() => {
    if (!selectedStudentId && accounts[0]?.student_id) {
      setSelectedStudentId(accounts[0].student_id);
    }
  }, [accounts, selectedStudentId]);

  const account = accounts.find((row) => row.student_id === selectedStudentId) ?? accounts[0];
  const invoices = useMemo(
    () => (data?.invoices ?? []).filter((row) => !account || row.student_id === account.student_id),
    [account, data?.invoices],
  );
  const transactions = useMemo(
    () => (data?.transactions ?? []).filter((row) => !account || row.student_id === account.student_id),
    [account, data?.transactions],
  );
  const balanceMinor = Number(account?.balance_minor ?? 0);
  const balanceLabel = formatMoney(balanceMinor);
  const primaryInvoice = invoices.find((invoice) => !["paid", "cancelled", "waived"].includes(invoice.status));
  const accountReference = String(
    account?.admission_number
      || account?.student_id
      || primaryInvoice?.invoice_number
      || "school-fees",
  ).slice(0, 64);

  const submitMpesaPayment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedPhone = paymentPhone.replace(/\s+/g, "");

    if (!/^\+?254[17]\d{8}$|^0[17]\d{8}$/.test(normalizedPhone)) {
      setPaymentError("Enter a valid Safaricom phone number, for example 0712345678 or 254712345678.");
      return;
    }
    if (!account || balanceMinor <= 0) {
      setPaymentError("This learner has no outstanding balance to pay.");
      return;
    }

    setIsPaying(true);
    setPaymentError(null);
    try {
      const response = await requestDashboardApi<{
        customer_message?: string | null;
      }>("/api/payments/mpesa/payment-intents", {
        method: "POST",
        body: {
          idempotency_key: `parent-fees-${account.student_id}-${balanceMinor}-${Date.now()}`,
          amount_minor: String(balanceMinor),
          phone_number: normalizedPhone,
          student_id: isUuid(account.student_id) ? account.student_id : undefined,
          account_reference: accountReference,
          transaction_desc: `School fees payment for ${account.student_name}`,
          external_reference: primaryInvoice?.id,
          metadata: {
            source: "parent-portal",
            student_id: account.student_id,
            invoice_id: primaryInvoice?.id ?? null,
            invoice_number: primaryInvoice?.invoice_number ?? null,
          },
        },
      });

      toast.success("M-Pesa STK request sent.", {
        description: response.customer_message
          || "Confirm the prompt on the phone. The receipt appears after M-Pesa confirms payment.",
      });
      setPaymentDialogOpen(false);
      await refetch();
    } catch (paymentRequestError) {
      const message = paymentRequestError instanceof Error
        ? paymentRequestError.message
        : "Failed to start M-Pesa payment.";
      setPaymentError(message);
      toast.error(message);
    } finally {
      setIsPaying(false);
    }
  };

  const previewFeeStatement = () => {
    openPrintDocument({
      eyebrow: "Fee statement",
      title: account ? `${account.student_name} Fee Statement` : "Student Fee Statement",
      subtitle: "Live school-scoped invoices and confirmed payments",
      rows: [
        { label: "Current balance", value: balanceLabel, tone: balanceMinor > 0 ? "danger" : "default" },
        { label: "Open invoices", value: String(account?.open_invoices ?? 0) },
        { label: "Recent payments", value: String(transactions.length) },
        ...invoices.slice(0, 6).map((invoice) => ({
          label: `Invoice ${invoice.invoice_number || invoice.id}`,
          value: `${formatMoney(invoice.balance_minor)} balance (${invoice.status})`,
          tone: invoice.balance_minor > 0 ? "danger" as const : "default" as const,
        })),
        ...transactions.slice(0, 6).map((transaction) => ({
          label: `Receipt ${transaction.receipt_number || transaction.id}`,
          value: `${formatMoney(transaction.amount_minor)} (${transaction.status})`,
        })),
      ],
      footer: "Generated from live MyShule records for the selected learner.",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900">Fees & Payments</h2>
          <p className="mt-1 text-sm text-slate-500">
            View each linked learner&apos;s invoices, balance, and confirmed payments.
          </p>
        </div>
        {accounts.length > 1 ? (
          <label className="text-sm font-semibold text-slate-700">
            Learner
            <select
              value={account?.student_id ?? ""}
              onChange={(event) => setSelectedStudentId(event.currentTarget.value)}
              className="mt-1 block min-h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900"
            >
              {accounts.map((row) => (
                <option key={row.student_id} value={row.student_id}>
                  {row.student_name}{row.class_name ? ` - ${row.class_name}` : ""}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>

      {error ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-800">
          Fee records could not be loaded: {error.message}
        </div>
      ) : null}

      {!isLoading && !error && accounts.length === 0 ? (
        <Card className="border border-dashed border-slate-300 p-8 text-center">
          <h3 className="font-semibold text-slate-900">No linked learner fee account</h3>
          <p className="mt-2 text-sm text-slate-500">
            Ask the school to link your guardian account to an admitted learner before viewing fees.
          </p>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <Card className="border border-slate-200 bg-gradient-to-r from-blue-50 to-white p-6 md:col-span-2">
              <h3 className="font-semibold text-slate-900">
                {account?.student_name ? `${account.student_name}'s balance` : "Current balance"}
              </h3>
              <div className="mt-4 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div>
                  {isLoading ? (
                    <div className="h-10 w-32 animate-pulse rounded bg-slate-200" />
                  ) : (
                    <div className="text-4xl font-bold text-slate-900">{balanceLabel}</div>
                  )}
                  <p className="mt-1 text-sm text-slate-600">
                    {account?.open_invoices ?? 0} open invoice{account?.open_invoices === 1 ? "" : "s"}
                  </p>
                </div>
                <Button
                  className="gap-2 bg-blue-600 hover:bg-blue-700"
                  onClick={() => {
                    setPaymentError(null);
                    setPaymentDialogOpen(true);
                  }}
                  disabled={isLoading || isPaying || balanceMinor <= 0 || !account}
                >
                  <CreditCard className="h-4 w-4" />
                  Pay by M-Pesa
                </Button>
              </div>
            </Card>

            <Card className="flex flex-col justify-center border border-slate-200 p-6">
              <h3 className="font-medium text-slate-900">Fee statement</h3>
              <p className="mb-4 mt-2 text-sm text-slate-500">
                Preview, print, or download the selected learner&apos;s live fee statement.
              </p>
              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={previewFeeStatement}
                disabled={isLoading || !account}
              >
                <FileText className="h-4 w-4" />
                Preview statement
              </Button>
            </Card>
          </div>

          <Card className="overflow-hidden border border-slate-200">
            <div className="border-b border-slate-100 bg-slate-50/50 p-4">
              <h3 className="font-medium text-slate-900">Invoices and payments</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="border-b border-slate-200 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">Date</th>
                    <th className="px-4 py-3 font-medium">Record</th>
                    <th className="px-4 py-3 font-medium">Reference</th>
                    <th className="px-4 py-3 text-right font-medium">Amount</th>
                    <th className="px-4 py-3 text-center font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {isLoading ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                        Loading financial records...
                      </td>
                    </tr>
                  ) : (
                    <>
                      {invoices.map((invoice) => (
                        <tr key={`invoice-${invoice.id}`} className="hover:bg-slate-50/50">
                          <td className="px-4 py-3 text-slate-500">{formatDate(invoice.created_at)}</td>
                          <td className="px-4 py-3 font-medium text-slate-900">
                            {[invoice.term, invoice.academic_year].filter(Boolean).join(" - ") || "Fee invoice"}
                          </td>
                          <td className="px-4 py-3 text-slate-500">{invoice.invoice_number || invoice.id}</td>
                          <td className="px-4 py-3 text-right font-medium text-slate-900">
                            {formatMoney(invoice.amount_minor)}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <StatusBadge status={invoice.status} />
                          </td>
                        </tr>
                      ))}
                      {transactions.map((transaction) => (
                        <tr key={`transaction-${transaction.id}`} className="hover:bg-slate-50/50">
                          <td className="px-4 py-3 text-slate-500">{formatDate(transaction.created_at)}</td>
                          <td className="px-4 py-3 font-medium text-slate-900">
                            Fee payment{transaction.payment_method ? ` (${transaction.payment_method})` : ""}
                          </td>
                          <td className="px-4 py-3 text-slate-500">
                            {transaction.receipt_number || transaction.id}
                          </td>
                          <td className="px-4 py-3 text-right font-medium text-emerald-700">
                            {formatMoney(transaction.amount_minor)}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <StatusBadge status={transaction.status} />
                          </td>
                        </tr>
                      ))}
                      {invoices.length === 0 && transactions.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                            No invoices or confirmed payments exist for this learner yet.
                          </td>
                        </tr>
                      ) : null}
                    </>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      <Modal
        open={paymentDialogOpen}
        onClose={() => {
          if (!isPaying) setPaymentDialogOpen(false);
        }}
        title="Pay school fees by M-Pesa"
        description="Payment is posted only after M-Pesa confirms the callback."
        footer={(
          <>
            <Button type="button" variant="outline" onClick={() => setPaymentDialogOpen(false)} disabled={isPaying}>
              Cancel
            </Button>
            <Button type="submit" form="parent-mpesa-payment-form" disabled={isPaying || balanceMinor <= 0}>
              {isPaying ? "Sending STK..." : "Send STK request"}
            </Button>
          </>
        )}
      >
        <form id="parent-mpesa-payment-form" onSubmit={submitMpesaPayment} className="space-y-4">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-slate-500">Learner</span>
              <span className="font-semibold text-slate-900">{account?.student_name ?? "Not selected"}</span>
            </div>
            <div className="mt-2 flex justify-between gap-4">
              <span className="text-slate-500">Amount</span>
              <span className="font-semibold text-slate-900">{balanceLabel}</span>
            </div>
            <div className="mt-2 flex justify-between gap-4">
              <span className="text-slate-500">Account reference</span>
              <span className="font-semibold text-slate-900">{accountReference}</span>
            </div>
          </div>
          <label className="block text-sm font-medium text-slate-700">
            M-Pesa phone number
            <input
              value={paymentPhone}
              onChange={(event) => setPaymentPhone(event.target.value)}
              placeholder="0712345678"
              inputMode="tel"
              autoComplete="tel"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              required
            />
          </label>
          {paymentError ? (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {paymentError}
            </div>
          ) : null}
        </form>
      </Modal>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const normalized = status.toLowerCase();
  const positive = ["paid", "completed", "confirmed", "success"].includes(normalized);

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium ${
        positive ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
      }`}
    >
      {positive
        ? <CheckCircle className="h-3 w-3" />
        : <AlertTriangle className="h-3 w-3" />}
      {status || "Unknown"}
    </span>
  );
}

function formatMoney(value: number) {
  return (Number(value || 0) / 100).toLocaleString("en-KE", {
    style: "currency",
    currency: "KES",
  });
}

function formatDate(value?: string | null) {
  if (!value) return "Date not recorded";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Date not recorded" : date.toLocaleDateString("en-KE");
}

function isUuid(value: unknown): value is string {
  return typeof value === "string"
    && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
