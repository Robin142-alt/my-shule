"use client";

import { AlertTriangle, CheckCircle, ReceiptText, Wallet } from "lucide-react";

import { Card } from "@/components/ui/card";
import { useSchoolQuery } from "@/lib/data/school-hooks";

type StudentFeesData = {
  metrics: {
    balance_minor: number;
    open_invoices: number;
    payments: number;
  };
  account: {
    student_id: string;
    admission_number?: string | null;
    student_name: string;
    balance_minor: number;
    open_invoices: number;
  } | null;
  invoices: Array<{
    id: string;
    invoice_number?: string | null;
    term?: string | null;
    academic_year?: string | null;
    amount_minor: number;
    balance_minor: number;
    status: string;
    created_at: string;
  }>;
  transactions: Array<{
    id: string;
    receipt_number?: string | null;
    payment_method?: string | null;
    amount_minor: number;
    status: string;
    created_at: string;
  }>;
};

export function FeesWorkspace() {
  const {
    data,
    isLoading,
    error,
  } = useSchoolQuery<StudentFeesData>("/admin-command/student/fees");

  const account = data?.account;
  const invoices = data?.invoices ?? [];
  const transactions = data?.transactions ?? [];
  const balanceMinor = Number(account?.balance_minor ?? 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-slate-900">Fee Status</h2>
        <p className="mt-1 text-sm text-slate-500">
          View your live school fee balance, invoices, and confirmed receipts.
        </p>
      </div>

      {error ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-800">
          Fee records could not be loaded: {error.message}
        </div>
      ) : null}

      {!isLoading && !error && !account ? (
        <Card className="border border-dashed border-slate-300 p-8 text-center">
          <h3 className="font-semibold text-slate-900">No active student fee account</h3>
          <p className="mt-2 text-sm text-slate-500">
            Ask the school to activate your student portal and admission record.
          </p>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="border border-slate-200 bg-white p-6 md:col-span-2">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <div className="rounded-lg bg-blue-50 p-2">
                <Wallet className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">Current Balance</h3>
                <p className="text-xs text-slate-500">{account?.admission_number || "Student account"}</p>
              </div>
            </div>
            <div className="mt-6">
              {isLoading ? (
                <div className="h-10 w-32 animate-pulse rounded bg-slate-200" />
              ) : (
                <div className="text-4xl font-bold text-slate-900">{formatMoney(balanceMinor)}</div>
              )}
              <p className={`mt-2 flex items-center gap-2 text-sm font-medium ${
                balanceMinor > 0 ? "text-amber-700" : "text-emerald-700"
              }`}>
                {balanceMinor > 0
                  ? <AlertTriangle className="h-4 w-4" />
                  : <CheckCircle className="h-4 w-4" />}
                {balanceMinor > 0
                  ? `${account?.open_invoices ?? 0} open invoice${account?.open_invoices === 1 ? "" : "s"}`
                  : "No outstanding invoice balance"}
              </p>
            </div>
          </Card>

          <Card className="border border-slate-200 p-6">
            <ReceiptText className="h-5 w-5 text-emerald-600" />
            <p className="mt-4 text-3xl font-bold text-slate-900">{data?.metrics.payments ?? 0}</p>
            <p className="text-sm font-medium text-slate-600">Confirmed payment records</p>
            <p className="mt-4 text-xs text-slate-500">
              Payments are handled by your parent or guardian and posted after finance confirmation.
            </p>
          </Card>
        </div>
      )}

      {account ? (
        <Card className="overflow-hidden border border-slate-200">
          <div className="border-b border-slate-100 bg-slate-50/50 p-4">
            <h3 className="font-medium text-slate-900">Invoices and receipts</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-slate-200 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Record</th>
                  <th className="px-4 py-3 font-medium">Reference</th>
                  <th className="px-4 py-3 text-right font-medium">Amount</th>
                  <th className="px-4 py-3 text-right font-medium">Balance / Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoices.map((invoice) => (
                  <tr key={`invoice-${invoice.id}`}>
                    <td className="px-4 py-3 text-slate-500">{formatDate(invoice.created_at)}</td>
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {[invoice.term, invoice.academic_year].filter(Boolean).join(" - ") || "Fee invoice"}
                    </td>
                    <td className="px-4 py-3 text-slate-500">{invoice.invoice_number || invoice.id}</td>
                    <td className="px-4 py-3 text-right text-slate-900">{formatMoney(invoice.amount_minor)}</td>
                    <td className="px-4 py-3 text-right text-slate-600">
                      {formatMoney(invoice.balance_minor)} / {invoice.status}
                    </td>
                  </tr>
                ))}
                {transactions.map((transaction) => (
                  <tr key={`transaction-${transaction.id}`}>
                    <td className="px-4 py-3 text-slate-500">{formatDate(transaction.created_at)}</td>
                    <td className="px-4 py-3 font-medium text-slate-900">
                      Payment{transaction.payment_method ? ` (${transaction.payment_method})` : ""}
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {transaction.receipt_number || transaction.id}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-emerald-700">
                      {formatMoney(transaction.amount_minor)}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600">{transaction.status}</td>
                  </tr>
                ))}
                {!isLoading && invoices.length === 0 && transactions.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                      No invoices or confirmed payments have been recorded for your account yet.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </Card>
      ) : null}
    </div>
  );
}

function formatMoney(value: number) {
  return (Number(value || 0) / 100).toLocaleString("en-KE", {
    style: "currency",
    currency: "KES",
  });
}

function formatDate(value?: string | null) {
  if (!value) return "Not recorded";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Not recorded" : date.toLocaleDateString("en-KE");
}
