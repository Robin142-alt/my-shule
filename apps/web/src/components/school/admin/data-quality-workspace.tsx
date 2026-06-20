"use client";

import { AlertTriangle, CheckCircle, Search, Settings2, Users, FileText, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useSchoolQuery } from "@/lib/data/school-hooks";

export function DataQualityWorkspace() {
  const { data: insightsData, isLoading } = useSchoolQuery<any>("/api/ai-insights/dashboard");

  const anomalies = insightsData?.items || [];
  const criticalCount = anomalies.filter((a: any) => a.severity === 'critical').length;
  const warningCount = anomalies.filter((a: any) => a.severity === 'warning').length;
  const score = Math.max(0, 100 - (criticalCount * 2) - (warningCount * 0.5));

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900 tracking-tight">Data Quality & Audit</h2>
          <p className="text-sm text-slate-500 mt-1">Identify and resolve missing information and operational anomalies.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="gap-2">
            <Search className="w-4 h-4" />
            Run Full Scan
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 border border-slate-200">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-medium text-slate-900">Overall Health</h3>
            <CheckCircle className="w-5 h-5 text-emerald-500" />
          </div>
          <div className="text-3xl font-semibold text-slate-900 mb-1">
            {isLoading ? <span className="animate-pulse bg-slate-200 h-8 w-16 block rounded"></span> : `${score}%`}
          </div>
          <p className="text-sm text-slate-500">Data completeness score</p>
        </Card>
        
        <Card className="p-6 border border-slate-200 bg-rose-50/50">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-medium text-slate-900">Critical Issues</h3>
            <AlertTriangle className="w-5 h-5 text-rose-500" />
          </div>
          <div className="text-3xl font-semibold text-rose-600 mb-1">
             {isLoading ? <span className="animate-pulse bg-rose-200 h-8 w-16 block rounded"></span> : criticalCount}
          </div>
          <p className="text-sm text-rose-600/80">Requires immediate attention</p>
        </Card>

        <Card className="p-6 border border-slate-200 bg-orange-50/50">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-medium text-slate-900">Warnings</h3>
            <AlertTriangle className="w-5 h-5 text-orange-500" />
          </div>
          <div className="text-3xl font-semibold text-orange-600 mb-1">
             {isLoading ? <span className="animate-pulse bg-orange-200 h-8 w-16 block rounded"></span> : warningCount}
          </div>
          <p className="text-sm text-orange-600/80">Recommended to fix</p>
        </Card>
      </div>

      <Card className="border border-slate-200 overflow-hidden mt-6">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <h3 className="font-medium text-slate-900">Detected Anomalies</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-500 uppercase border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 font-medium min-w-[200px]">Issue</th>
                <th className="px-4 py-3 font-medium">Module</th>
                <th className="px-4 py-3 font-medium">Affected Records</th>
                <th className="px-4 py-3 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-slate-500 animate-pulse">Loading anomalies...</td>
                </tr>
              ) : anomalies.length > 0 ? anomalies.map((anomaly: any) => (
                <tr key={anomaly.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className={`w-4 h-4 shrink-0 ${anomaly.severity === 'critical' ? 'text-rose-500' : 'text-orange-500'}`} />
                      <span className="font-medium text-slate-900">{anomaly.title}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                      {anomaly.module || 'System'}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-900">{anomaly.count || 1}</td>
                  <td className="px-4 py-3 text-right">
                    <Button variant="ghost" size="sm" className="h-8 gap-1 text-slate-600 hover:text-slate-900">
                      Fix Now <ArrowRight className="w-3 h-3" />
                    </Button>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-emerald-600 font-medium">
                    <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                    No anomalies found!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

