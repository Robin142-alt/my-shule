"use client";

import { Wallet, AlertTriangle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useSchoolQuery } from "@/lib/data/school-hooks";

export function FeesWorkspace() {
  // Fetch real data from the finance endpoints
  const { data: accountsOverview, isLoading } = useSchoolQuery('/api/finance/accounts-overview');
  
  // As a student, we just view the top-level balance
  const balanceMinor = accountsOverview?.[0]?.balance_minor || 0;
  const balanceStr = (balanceMinor / 100).toLocaleString('en-US', { style: 'currency', currency: 'KES' });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900 tracking-tight">Fee Status</h2>
          <p className="text-sm text-slate-500 mt-1">View your current tuition fee balance.</p>
        </div>
      </div>

      <Card className="p-6 border border-slate-200 max-w-md bg-white">
        <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
          <div className="p-2 bg-blue-50 rounded-lg">
            <Wallet className="w-5 h-5 text-blue-600" />
          </div>
          <h3 className="font-semibold text-slate-900">Current Balance</h3>
        </div>
        
        <div className="mb-6">
          {isLoading ? (
            <div className="h-10 w-32 bg-slate-200 animate-pulse rounded mb-1"></div>
          ) : (
            <div className="text-4xl font-bold text-slate-900 mb-1">{balanceStr}</div>
          )}
          
          <p className={`text-sm font-medium flex items-center gap-2 ${balanceMinor > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
            {balanceMinor > 0 ? 'Balance due for Term 2' : 'Fully Paid for Term 2'}
          </p>
        </div>

        <div className="bg-slate-50 p-4 rounded-lg text-sm text-slate-600">
          <AlertTriangle className="w-4 h-4 text-slate-400 inline mb-0.5 mr-1" />
          Fee payments are handled by your parent/guardian. If you have questions about your balance, please contact the finance office.
        </div>
      </Card>
    </div>
  );
}

