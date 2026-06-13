"use client";

import { CreditCard, Download, FileText, CheckCircle, Clock, AlertTriangle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useSchoolQuery, useSchoolMutation } from "@/lib/data/school-hooks";
import { useState } from "react";

export function FeesWorkspace() {
  const [isPaying, setIsPaying] = useState(false);

  // Fetch real data from the finance endpoints
  const { data: accountsOverview, isLoading: accountsLoading } = useSchoolQuery<any>('/api/finance/accounts-overview');
  const { data: transactions, isLoading: txLoading, refetch: refetchTx } = useSchoolQuery<any>('/api/finance/collections');
  const { data: invoices, isLoading: invLoading, refetch: refetchInv } = useSchoolQuery<any>('/api/finance/invoices');

  const recordPayment = useSchoolMutation(
    '/api/finance/payment',
    'POST',
    {
      onSuccess: () => {
        refetchTx();
        refetchInv();
        setIsPaying(false);
        alert('Payment recorded successfully!');
      }
    }
  );

  const handlePayNow = () => {
    setIsPaying(true);
    // Simulating a mock payment to the backend
    recordPayment.mutate({
      id: `PAY-${Date.now()}`,
      student: "Alice Kamau", 
      amount: 150.00,
      method: "M-Pesa",
      voteHead: "Tuition",
      term: "Term 2",
      receiptNo: `MPESA-${Date.now().toString().slice(-6)}`,
      reference: "Mobile Checkout",
      parentSmsSent: true,
      status: "completed"
    });
  };

  const balanceMinor = accountsOverview?.[0]?.balance_minor || 0;
  const balanceStr = (balanceMinor / 100).toLocaleString('en-US', { style: 'currency', currency: 'KES' });

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
              <CreditCard className="w-4 h-4" /> {isPaying ? 'Processing...' : 'Pay Now'}
            </Button>
          </div>
        </Card>

        <Card className="p-6 border border-slate-200 flex flex-col justify-center">
          <h3 className="font-medium text-slate-900 flex items-center gap-2 mb-4">
            <Download className="w-4 h-4 text-slate-500" /> Statement
          </h3>
          <p className="text-sm text-slate-500 mb-4">Download a full statement of account for tax or record purposes.</p>
          <Button variant="outline" className="w-full gap-2">
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
    </div>
  );
}

