"use client";

import { Award, AlertTriangle, MessageSquare, TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useSchoolQuery } from "@/lib/data/school-hooks";

type DisciplineIncident = {
  id: string;
  title: string;
  description?: string | null;
  severity?: string;
  created_at?: string;
  occurred_at?: string;
  awarded_at?: string;
  points_delta?: number;
};

type StudentBehaviorData = {
  metrics: {
    open_incidents: number;
    behavior_points: number;
    commendations: number;
  };
  incidents: DisciplineIncident[];
  commendations: DisciplineIncident[];
};

export function BehaviorWorkspace() {
  const {
    data,
    isLoading,
    error,
  } = useSchoolQuery<StudentBehaviorData>("/admin-command/student/behavior");

  const commendations = data?.commendations ?? [];
  const infractions = data?.incidents ?? [];
  const behaviorPoints = data?.metrics.behavior_points ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900 tracking-tight">My Records</h2>
          <p className="text-sm text-slate-500 mt-1">View your merit points, commendations, and behavioral notes.</p>
        </div>
      </div>

      {error ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-800">
          Conduct records could not be loaded: {error.message}
        </div>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 border border-slate-200 col-span-1 md:col-span-2 bg-gradient-to-r from-emerald-50 to-white flex flex-col justify-center">
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
            Net total from entries recorded by authorized school staff.
          </p>
        </Card>

        <Card className="p-6 border border-slate-200 bg-white flex flex-col justify-center">
          <h3 className="font-medium text-slate-900 flex items-center gap-2 mb-2">
            <Award className="w-5 h-5 text-amber-500" /> Commendations
          </h3>
          <p className="text-3xl font-bold text-slate-900 mb-1">{commendations.length}</p>
          <p className="text-sm text-slate-500">Recorded commendations</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center gap-2 bg-slate-50/50">
            <Award className="w-4 h-4 text-amber-500" />
            <h3 className="font-medium text-slate-900">Merits & Commendations</h3>
          </div>
          <div className="p-4 space-y-4">
            {isLoading ? (
              <div className="animate-pulse space-y-3">
                <div className="h-12 bg-slate-100 rounded"></div>
                <div className="h-12 bg-slate-100 rounded"></div>
              </div>
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
                      {formatDate(item.awarded_at || item.created_at)}
                    </p>
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
            {isLoading ? (
              <div className="animate-pulse space-y-3">
                <div className="h-12 bg-slate-100 rounded"></div>
              </div>
            ) : infractions.length > 0 ? (
              infractions.map((item) => (
                <div key={item.id} className="flex gap-4 items-start pb-4 border-b border-slate-100 last:border-0 last:pb-0">
                  <div className="w-8 h-8 rounded bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 mt-0.5">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-medium text-slate-900 text-sm">{item.title}</h4>
                    <p className="text-xs text-slate-500 mt-0.5">{item.description}</p>
                    <p className="text-xs text-slate-400 font-medium mt-1">
                      {formatDate(item.occurred_at || item.created_at)}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500 text-center py-4 border border-dashed border-slate-200 rounded">
                No disciplinary notes have been recorded for your student account.
              </p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

function formatDate(value?: string | null) {
  if (!value) return "Date not recorded";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Date not recorded" : date.toLocaleDateString("en-KE");
}

