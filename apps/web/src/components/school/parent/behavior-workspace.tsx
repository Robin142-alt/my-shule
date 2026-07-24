"use client";

import { Award, AlertTriangle, TrendingUp, User, ShieldAlert, CheckCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useSchoolQuery } from "@/lib/data/school-hooks";
import { useState } from "react";
import { toast } from "sonner";
import { requestDashboardApi } from "@/lib/dashboard/api-client";

type BehaviorRecord = {
  id: string;
  student_name?: string;
  title: string;
  description?: string | null;
  severity?: string;
  status?: string;
  created_at?: string;
  occurred_at?: string;
  awarded_at?: string;
  points_delta?: number;
};

type ParentBehaviorData = {
  metrics: {
    open_incidents: number;
    behavior_points: number;
    commendations: number;
  };
  incidents: BehaviorRecord[];
  commendations: BehaviorRecord[];
};

export function BehaviorWorkspace() {
  const {
    data,
    isLoading,
    error,
    refetch,
  } = useSchoolQuery<ParentBehaviorData>("/admin-command/parent/behavior");

  const commendations = data?.commendations ?? [];
  const infractions = data?.incidents ?? [];
  const behaviorPoints = data?.metrics.behavior_points ?? 0;

  const [isSubmitting, setIsSubmitting] = useState<string | null>(null);

  const handleAcknowledge = async (id: string) => {
    setIsSubmitting(id);
    try {
      await requestDashboardApi(`/api/parent-portal/behavior/acknowledge`, {
        method: "POST",
        body: { incidentId: id },
      });
      toast.success('Incident acknowledged.');
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

      {error ? (
        <div className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-800">
          Conduct records could not be loaded: {error.message}
        </div>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="p-6 border border-slate-200 col-span-1 lg:col-span-2 bg-gradient-to-r from-emerald-50 to-white flex flex-col justify-center">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-emerald-100 rounded text-emerald-600">
              <TrendingUp className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-slate-900">Recorded Behavior Points</h3>
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            {isLoading ? (
               <div className="h-12 w-24 bg-slate-200 animate-pulse rounded"></div>
            ) : (
               <span className="text-5xl font-bold text-slate-900">{behaviorPoints}</span>
            )}
          </div>
          <p className="text-sm text-slate-500 font-medium mt-2">
            Net total from school-recorded behavior point entries.
          </p>
        </Card>

        <Card className="p-6 border border-slate-200 flex flex-col justify-center">
          <h3 className="font-medium text-slate-900 flex items-center gap-2 mb-4">
            <Award className="w-5 h-5 text-amber-500" /> Commendations
          </h3>
          <p className="text-3xl font-bold text-slate-900 mb-1">{commendations.length}</p>
          <p className="text-sm text-slate-500">Recorded for linked learners</p>
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
            {isLoading ? (
               <div className="animate-pulse h-16 bg-slate-100 rounded"></div>
            ) : infractions.length > 0 ? (
               infractions.map((item) => (
                  <div key={item.id} className="flex flex-col gap-3 pb-4 border-b border-slate-100 last:border-0 last:pb-0">
                    <div>
                      <h4 className="font-medium text-slate-900 text-sm">{item.title}</h4>
                      <p className="text-xs text-slate-500 mt-1">{item.description}</p>
                      {item.student_name ? (
                        <p className="mt-1 text-xs font-semibold text-slate-600">{item.student_name}</p>
                      ) : null}
                      <p className="text-xs text-rose-600 font-medium mt-2 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> Reported {formatDate(item.occurred_at || item.created_at)}
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
            {isLoading ? (
               <div className="animate-pulse h-16 bg-slate-100 rounded"></div>
            ) : commendations.length > 0 ? (
               commendations.map((item) => (
                 <div key={item.id} className="flex gap-4 items-start pb-4 border-b border-slate-100 last:border-0 last:pb-0">
                    <div className="w-8 h-8 rounded bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 mt-0.5">
                      <Award className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-medium text-slate-900 text-sm">{item.title}</h4>
                      <p className="text-xs text-slate-500 mt-0.5">{item.description}</p>
                      <p className="text-xs text-amber-600 font-medium mt-1">
                        {[item.student_name, formatDate(item.awarded_at || item.created_at)].filter(Boolean).join(" - ")}
                      </p>
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

function formatDate(value?: string | null) {
  if (!value) return "date not recorded";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "date not recorded" : date.toLocaleDateString("en-KE");
}
