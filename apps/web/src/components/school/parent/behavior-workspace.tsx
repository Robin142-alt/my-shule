"use client";

import { Award, AlertTriangle, TrendingUp, User, ShieldAlert, CheckCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useSchoolQuery } from "@/lib/data/school-hooks";
import { useState } from "react";
import { toast } from "sonner";
import { requestDashboardApi } from "@/lib/dashboard/api-client";

export function BehaviorWorkspace() {
  // Use the parent incidents endpoint 
  const { data: incidentsData, isLoading: incidentsLoading, refetch } = useSchoolQuery<{ data?: any[] }>('/api/discipline/parent/incidents');
  
  // Example call to fetch behavior score (hardcoding student ID or getting it from a selector)
  const { data: scoreData, isLoading: scoreLoading } = useSchoolQuery<{ score?: number }>('/api/discipline/students/me/behavior-score');

  const incidents = incidentsData?.data || [];
  const score = scoreData?.score;
  
  // We can filter by severity
  const commendations = incidents.filter((i: any) => i.severity === 'commendation' || i.title?.toLowerCase().includes('commendation'));
  const infractions = incidents.filter((i: any) => i.severity !== 'commendation' && !i.title?.toLowerCase().includes('commendation'));

  const [isSubmitting, setIsSubmitting] = useState<string | null>(null);

  const handleAcknowledge = async (id: string) => {
    setIsSubmitting(id);
    try {
      await requestDashboardApi(`/api/parent-portal/behavior/acknowledge`, {
        method: "POST",
        body: JSON.stringify({ incidentId: id }),
      });
      toast.success('Incident Acknowledged');
      refetch();
    } catch (error) {
      toast.error('Failed to acknowledge incident');
    } finally {
      setIsSubmitting(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900 tracking-tight">Behavior & Discipline</h2>
          <p className="text-sm text-slate-500 mt-1">Track merit points, commendations, and behavioral incidents.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="p-6 border border-slate-200 col-span-1 lg:col-span-2 bg-gradient-to-r from-emerald-50 to-white flex flex-col justify-center">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-emerald-100 rounded text-emerald-600">
              <TrendingUp className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-slate-900">Current Behavior Score</h3>
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            {scoreLoading ? (
               <div className="h-12 w-24 bg-slate-200 animate-pulse rounded"></div>
            ) : (
               <span className="text-5xl font-bold text-slate-900">{score ?? '--'}</span>
            )}
            <span className="text-slate-500 font-medium">/ 100</span>
          </div>
          <p className="text-sm text-emerald-600 font-medium mt-2">Excellent standing</p>
        </Card>

        <Card className="p-6 border border-slate-200 flex flex-col justify-center">
          <h3 className="font-medium text-slate-900 flex items-center gap-2 mb-4">
            <Award className="w-5 h-5 text-amber-500" /> Commendations
          </h3>
          <p className="text-3xl font-bold text-slate-900 mb-1">{commendations.length}</p>
          <p className="text-sm text-slate-500">Earned this term</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <h3 className="font-medium text-slate-900 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-500" /> Action Required
            </h3>
          </div>
          <div className="p-4 space-y-4">
            {incidentsLoading ? (
               <div className="animate-pulse h-16 bg-slate-100 rounded"></div>
            ) : infractions.length > 0 ? (
               infractions.map((item: any, idx: number) => (
                  <div key={idx} className="flex flex-col gap-3 pb-4 border-b border-slate-100 last:border-0 last:pb-0">
                    <div>
                      <h4 className="font-medium text-slate-900 text-sm">{item.title}</h4>
                      <p className="text-xs text-slate-500 mt-1">{item.description}</p>
                      <p className="text-xs text-rose-600 font-medium mt-2 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> Reported {new Date(item.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="w-full gap-2 mt-2" 
                      onClick={() => handleAcknowledge(item.id)}
                      disabled={isSubmitting === item.id}
                    >
                      <CheckCircle className="w-4 h-4" /> {isSubmitting === item.id ? 'Acknowledging...' : 'Acknowledge Notice'}
                    </Button>
                  </div>
               ))
            ) : (
               <div className="text-center p-6 bg-emerald-50 rounded-lg border border-dashed border-emerald-200">
                  <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                  <p className="text-sm font-medium text-emerald-800">Clean Record</p>
                  <p className="text-xs text-emerald-600 mt-1">No pending disciplinary notices.</p>
               </div>
            )}
          </div>
        </Card>

        <Card className="border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center gap-2 bg-slate-50/50">
            <Award className="w-4 h-4 text-amber-500" />
            <h3 className="font-medium text-slate-900">Recent Commendations</h3>
          </div>
          <div className="p-4 space-y-4">
            {incidentsLoading ? (
               <div className="animate-pulse h-16 bg-slate-100 rounded"></div>
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
               <div className="text-center p-6 text-slate-500">
                  <p className="text-sm">No commendations recorded yet.</p>
               </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

