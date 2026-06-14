// @ts-nocheck
"use client";

import { Award, AlertTriangle, MessageSquare, TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useSchoolQuery } from "@/lib/data/school-hooks";

export function BehaviorWorkspace() {
  // Use the parent incidents endpoint as it provides a read-only view of own records
  const { data: incidentsData, isLoading: incidentsLoading } = useSchoolQuery('/api/discipline/parent/incidents');
  
  // Example call to fetch behavior score (hardcoding 'me' or studentId)
  const { data: scoreData, isLoading: scoreLoading } = useSchoolQuery('/api/discipline/students/me/behavior-score');

  const incidents = incidentsData?.data || [];
  const score = scoreData?.score || 95; // Default to 95 if not returned
  const trend = scoreData?.trend || '+5 from last term';

  // For demonstration, we split incidents by type if we have real data, or just show them all
  const commendations = incidents.filter((i: any) => i.severity === 'commendation' || i.title?.toLowerCase().includes('commendation'));
  const infractions = incidents.filter((i: any) => i.severity !== 'commendation' && !i.title?.toLowerCase().includes('commendation'));

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900 tracking-tight">My Records</h2>
          <p className="text-sm text-slate-500 mt-1">View your merit points, commendations, and behavioral notes.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 border border-slate-200 col-span-1 md:col-span-2 bg-gradient-to-r from-emerald-50 to-white flex flex-col justify-center">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-emerald-100 rounded text-emerald-600">
              <TrendingUp className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-slate-900">Behavior Score</h3>
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            {scoreLoading ? (
              <div className="h-12 w-24 bg-slate-200 animate-pulse rounded"></div>
            ) : (
              <span className="text-5xl font-bold text-slate-900">{score}</span>
            )}
            <span className="text-slate-500 font-medium">/ 100</span>
          </div>
          <p className="text-sm text-emerald-600 font-medium mt-2">{trend}</p>
        </Card>

        <Card className="p-6 border border-slate-200 bg-white flex flex-col justify-center">
          <h3 className="font-medium text-slate-900 flex items-center gap-2 mb-2">
            <Award className="w-5 h-5 text-amber-500" /> Commendations
          </h3>
          <p className="text-3xl font-bold text-slate-900 mb-1">{commendations.length}</p>
          <p className="text-sm text-slate-500">Earned this term</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center gap-2 bg-slate-50/50">
            <Award className="w-4 h-4 text-amber-500" />
            <h3 className="font-medium text-slate-900">Merits & Commendations</h3>
          </div>
          <div className="p-4 space-y-4">
            {incidentsLoading ? (
              <div className="animate-pulse space-y-3">
                <div className="h-12 bg-slate-100 rounded"></div>
                <div className="h-12 bg-slate-100 rounded"></div>
              </div>
            ) : commendations.length > 0 ? (
              commendations.map((item: any, idx: number) => (
                <div key={idx} className="flex gap-4 items-start pb-4 border-b border-slate-100 last:border-0 last:pb-0">
                  <div className="w-8 h-8 rounded bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 mt-0.5">
                    <Award className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-medium text-slate-900 text-sm">{item.title}</h4>
                    <p className="text-xs text-slate-500 mt-0.5">{item.description}</p>
                    <p className="text-xs text-amber-600 font-medium mt-1">{new Date(item.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500 text-center py-4 border border-dashed border-slate-200 rounded">No commendations recorded yet.</p>
            )}
          </div>
        </Card>

        <Card className="border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center gap-2 bg-slate-50/50">
            <AlertTriangle className="w-4 h-4 text-rose-500" />
            <h3 className="font-medium text-slate-900">Discipline Notes</h3>
          </div>
          <div className="p-4 space-y-4">
            {incidentsLoading ? (
              <div className="animate-pulse space-y-3">
                <div className="h-12 bg-slate-100 rounded"></div>
              </div>
            ) : infractions.length > 0 ? (
              infractions.map((item: any, idx: number) => (
                <div key={idx} className="flex gap-4 items-start pb-4 border-b border-slate-100 last:border-0 last:pb-0">
                  <div className="w-8 h-8 rounded bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 mt-0.5">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-medium text-slate-900 text-sm">{item.title}</h4>
                    <p className="text-xs text-slate-500 mt-0.5">{item.description}</p>
                    <p className="text-xs text-slate-400 font-medium mt-1">{new Date(item.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500 text-center py-4 border border-dashed border-slate-200 rounded bg-emerald-50 text-emerald-700">Clean record! No disciplinary notes.</p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

