"use client";

import { CreditCard, Download, FileText, CheckCircle, Clock, AlertTriangle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { useSchoolQuery } from "@/lib/data/school-hooks";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { requestDashboardApi } from "@/lib/dashboard/api-client";
import { openPrintDocument } from "@/lib/dashboard/export";

export function FeesWorkspace() {
  const [isPaying, setIsPaying] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [paymentPhone, setPaymentPhone] = useState("");
  const [paymentError, setPaymentError] = useState<string | null>(null);

  // Fetch real data from the finance endpoints
  const { data: accountsOverview, isLoading: accountsLoading } = useSchoolQuery<any>('/api/finance/accounts-overview');
  const { data: transactions, isLoading: txLoading, refetch: refetchTx } = useSchoolQuery<any>('/api/finance/collections');
  const { data: invoices, isLoading: invLoading, refetch: refetchInv } = useSchoolQuery<any>('/api/finance/invoices');

  const account = Array.isArray(accountsOverview) ? accountsOverview[0] : accountsOverview;
  const balanceMinor = Number(account?.balance_minor || 0);
  const balanceStr = (balanceMinor / 100).toLocaleString('en-US', { style: 'currency', currency: 'KES' });
  const primaryInvoice = Array.isArray(invoices) ? invoices[0] : null;
  const accountReference = String(
    account?.account_reference ||
      account?.admission_number ||
      account?.student_number ||
      account?.student_id ||
      primaryInvoice?.invoice_number ||
      "school-fees",
  ).slice(0, 64);

  const handlePayNow = () => {
    setPaymentError(null);
    setPaymentDialogOpen(true);
  };

  const submitMpesaPayment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedPhone = paymentPhone.replace(/\s+/g, "");
    if (!/^\+?254[17]\d{8}$|^0[17]\d{8}$/.test(normalizedPhone)) {
      setPaymentError("Enter a valid Safaricom phone number, for example 0712345678 or 254712345678.");
      return;
    }
    if (balanceMinor <= 0) {
      setPaymentError("There is no outstanding balance to pay.");
      return;
    }

    setIsPaying(true);
    setPaymentError(null);
    try {
      const response = await requestDashboardApi<{ checkout_request_id?: string | null; status?: string; customer_message?: string | null }>("/api/payments/mpesa/payment-intents", {
        method: "POST",
        body: {
          idempotency_key: `parent-fees-${accountReference}-${balanceMinor}-${Date.now()}`,
          amount_minor: String(balanceMinor),
          phone_number: normalizedPhone,
          student_id: isUuid(account?.student_id) ? account.student_id : undefined,
          account_reference: accountReference,
          transaction_desc: "School fees payment",
          external_reference: primaryInvoice?.id ? String(primaryInvoice.id) : undefined,
          metadata: {
            source: "parent-portal",
            invoice_id: primaryInvoice?.id ?? null,
            invoice_number: primaryInvoice?.invoice_number ?? null,
          },
        },
      });
      toast.success("M-Pesa STK request sent.", {
        description: response?.customer_message || "Confirm the prompt on the phone. The receipt posts after M-Pesa callback confirmation.",
      });
      setPaymentDialogOpen(false);
      refetchTx();
      refetchInv();
    } catch (error: any) {
      const message = error?.message || "Failed to start M-Pesa payment.";
      setPaymentError(message);
      toast.error(message);
    } finally {
      setIsPaying(false);
    }
  };

  const downloadFeeStatement = () => {
    openPrintDocument({
      eyebrow: "Fee statement",
      title: "Student Fee Statement",
      subtitle: "Live parent portal balance, invoices, and payments",
      rows: [
        { label: "Current balance", value: balanceStr, tone: balanceMinor > 0 ? "danger" : "default" },
        { label: "Open invoices", value: String((invoices || []).length) },
        { label: "Recent payments", value: String((transactions || []).length) },
        ...((invoices || []).slice(0, 4).map((invoice: any) => ({
          label: `Invoice ${invoice.invoice_number || invoice.id || ""}`.trim(),
          value: ((invoice.amount_minor || 0) / 100).toLocaleString("en-US", { style: "currency", currency: "KES" }),
          tone: "danger" as const,
        }))),
        ...((transactions || []).slice(0, 4).map((tx: any) => ({
          label: `Receipt ${tx.receipt_number || tx.id || ""}`.trim(),
          value: ((tx.amount_minor || 0) / 100).toLocaleString("en-US", { style: "currency", currency: "KES" }),
        }))),
      ],
      footer: "fee-statement generated from live MyShule parent portal records.",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900 tracking-tight">Fees & Payments</h2>
          <p className="text-sm text-slate-500 mt-1">Manage tuition fees, view invoices, and make secure payments.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 border border-slate-200 col-span-1 md:col-span-2 bg-gradient-to-r from-blue-50 to-white">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="font-semibold text-slate-900">Current Balance</h3>
          </div>
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              {accountsLoading ? (
                <div className="h-10 w-32 bg-slate-200 animate-pulse rounded mb-1"></div>
              ) : (
                <div className="text-4xl font-bold text-slate-900 mb-1">{balanceStr}</div>
              )}
              <p className="text-sm text-slate-600">Due by June 15, 2026</p>
            </div>
            <Button 
              className="gap-2 bg-blue-600 hover:bg-blue-700" 
              onClick={handlePayNow}
              disabled={isPaying || balanceMinor <= 0}
            >
              <CreditCard className="w-4 h-4" /> Pay Now
            </Button>
          </div>
        </Card>

        <Card className="p-6 border border-slate-200 flex flex-col justify-center">
          <h3 className="font-medium text-slate-900 flex items-center gap-2 mb-4">
            <Download className="w-4 h-4 text-slate-500" /> Statement
          </h3>
          <p className="text-sm text-slate-500 mb-4">Download a full statement of account for tax or record purposes.</p>
          <Button variant="outline" className="w-full gap-2" onClick={downloadFeeStatement} disabled={accountsLoading || txLoading || invLoading}>
            <FileText className="w-4 h-4" /> Download PDF
          </Button>
        </Card>
      </div>

      <Card className="border border-slate-200 overflow-hidden mt-6">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <h3 className="font-medium text-slate-900">Recent Transactions</h3>
        </div>
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-slate-500 uppercase border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Description</th>
              <th className="px-4 py-3 font-medium">Ref / Type</th>
              <th className="px-4 py-3 font-medium text-right">Amount</th>
              <th className="px-4 py-3 font-medium text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {txLoading || invLoading ? (
               <tr>
                 <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                   <div className="animate-pulse">Loading financial records...</div>
                 </td>
               </tr>
            ) : (
              <>
                {/* Render Invoices as Unpaid/Open */}
                {(invoices || []).slice(0, 2).map((inv: any, idx: number) => (
                  <tr key={`inv-${idx}`} className="hover:bg-slate-50/50 transition-colors bg-red-50/30">
                    <td className="px-4 py-3 text-slate-500">{new Date(inv.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3 font-medium text-slate-900">Tuition Invoice - {inv.term}</td>
                    <td className="px-4 py-3 text-slate-500">{inv.invoice_number}</td>
                    <td className="px-4 py-3 text-right font-medium text-slate-900">
                      {((inv.amount_minor || 0) / 100).toLocaleString('en-US', { style: 'currency', currency: 'KES' })}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium bg-rose-50 text-rose-700">
                        <AlertTriangle className="w-3 h-3" /> Unpaid
                      </span>
                    </td>
                  </tr>
                ))}
                
                {/* Render Collections as Completed Payments */}
                {(transactions || []).map((tx: any, idx: number) => (
                  <tr key={`tx-${idx}`} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3 text-slate-500">{new Date(tx.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3 font-medium text-slate-900">Fee Payment ({tx.payment_method})</td>
                    <td className="px-4 py-3 text-slate-500">{tx.receipt_number || 'N/A'}</td>
                    <td className="px-4 py-3 text-right font-medium text-emerald-600">
                      -{((tx.amount_minor || 0) / 100).toLocaleString('en-US', { style: 'currency', currency: 'KES' })}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium bg-emerald-50 text-emerald-700">
                        <CheckCircle className="w-3 h-3" /> Completed
                      </span>
                    </td>
                  </tr>
                ))}

                {!transactions?.length && !invoices?.length && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                      No recent transactions found.
                    </td>
                  </tr>
                )}
              </>
            )}
          </tbody>
        </table>
      </Card>

      <Modal
        open={paymentDialogOpen}
        onClose={() => {
          if (!isPaying) setPaymentDialogOpen(false);
        }}
        title="Pay school fees by M-Pesa"
        description="A real STK request will be created. Payment is posted only after M-Pesa confirms the callback."
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => setPaymentDialogOpen(false)} disabled={isPaying}>
              Cancel
            </Button>
            <Button type="submit" form="parent-mpesa-payment-form" disabled={isPaying || balanceMinor <= 0}>
              {isPaying ? "Sending STK..." : "Send STK request"}
            </Button>
          </>
        }
      >
        <form id="parent-mpesa-payment-form" onSubmit={submitMpesaPayment} className="space-y-4">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-slate-500">Amount</span>
              <span className="font-semibold text-slate-900">{balanceStr}</span>
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

function isUuid(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

